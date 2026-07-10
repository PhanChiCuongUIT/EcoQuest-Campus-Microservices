# Cẩm Nang Báo Cáo Microservices EcoQuest Campus

Cập nhật: 2026-07-10

File này là tài liệu chính để chuẩn bị thuyết trình phần microservices của EcoQuest Campus. Nếu cần viết báo cáo DOCX chi tiết về toàn project thì đọc thêm `tai-lieu-nguon-bao-cao-docx.md`; nếu cần kịch bản thao tác demo thì đọc `kich-ban-demo-microservices.md`; nếu cần checklist frontend thì đọc `frontend-test-scenarios.md`.

## 1. Tóm Tắt Nói Nhanh

EcoQuest Campus là hệ thống gamification cho hoạt động xanh trong trường học. Backend được tách thành 9 microservice, mỗi service sở hữu database riêng và giao tiếp qua REST, gRPC, RabbitMQ event, Redis và MinIO.

Thông điệp chính khi báo cáo:

- Gateway chỉ route API, không chứa business logic.
- Mỗi service có database riêng, không đọc DB chéo.
- Luồng cộng điểm là event-driven: Student submit action -> Action lưu `PENDING_REVIEW` -> Moderator/Admin approve -> RabbitMQ -> Reward cộng điểm -> Leaderboard/Report/Notification cập nhật.
- File upload được lưu ở MinIO theo service sở hữu: avatar ở Identity, station image ở Catalog, action evidence ở Action, report evidence ở Report, certificate PDF ở Recognition.
- Hệ thống có kiểm thử tích hợp bằng `scripts/backend-smoke-test.ps1`, kiểm RabbitMQ queue drained và frontend unit/build.

## 2. Kiến Trúc Service Hiện Tại

| Service | Port | Database/Storage | Vai trò |
| --- | --- | --- | --- |
| API Gateway | `18080` host -> `8080` container | Không có DB nghiệp vụ | Route `/auth`, `/catalog`, `/actions`, `/rewards`, `/leaderboards`, `/recognitions`, `/reports`, `/notifications` |
| Identity Access | `8086` | PostgreSQL `identity_db`, MinIO avatar | Register, verify email, login, forgot/reset password, profile, role/status/user management |
| Green Catalog | `8081` | PostgreSQL `catalog_db`, MinIO station image | Mission, station, badge definition, mission workflow |
| Eco Action | `8082` | MongoDB `action_db`, Redis, MinIO evidence | Draft, submit action, evidence nhiều ảnh/một video, Review Queue, outbox event |
| Verification Policy | `8090` REST, `9090` gRPC | PostgreSQL `policy_db` | Rule xác minh action, gRPC evaluation, admin policy CRUD direct |
| Reward Ledger | `8083` | PostgreSQL `reward_db` | Wallet, transaction ledger, badge achievement, admin adjust points |
| Leaderboard | `8084` | PostgreSQL `leaderboard_db`, Redis sorted set | Weekly/monthly rank, historical period, season close, snapshot |
| Recognition | `8085` | PostgreSQL `recognition_db`, MinIO certificate | Certificate PDF, reward offer, coupon/voucher claim |
| Report | `8087` | PostgreSQL `report_db`, MinIO report evidence | User report workflow, analytics read model, PDF export |
| Notification | `8088` | PostgreSQL `notification_db`, SSE | Inbox notification, mark read/read all, realtime stream |

Frontend React/Vite chạy qua Nginx tại `http://localhost:3000`, gọi API bằng same-origin proxy nên không hardcode từng port service.

## 3. Công Nghệ Microservices Và Cách Dùng

### Spring Boot 3 + Java 21

Dùng để xây dựng từng service độc lập. Mỗi service có controller, service/domain logic, repository và cấu hình riêng.

Cách show khi báo cáo:

- Mở `docker compose ps` để thấy mỗi service là một container riêng.
- Nói: "Mỗi service có lifecycle riêng, có thể rebuild/restart service đơn lẻ mà không cần rebuild toàn hệ thống."

### Spring Cloud Gateway

Gateway là cửa vào HTTP chính cho frontend.

Cách show:

```powershell
Invoke-RestMethod http://localhost:18080/actuator/health
```

Ý nghĩa:

- Frontend chỉ gọi Gateway hoặc Nginx same-origin.
- Gateway không cộng điểm, không xét policy, không tạo certificate.
- Business logic nằm trong service sở hữu nghiệp vụ.

### JWT + Role-Based Access Control

Identity phát JWT sau login. Các service kiểm JWT và role ở backend.

Cách show:

- Login bằng Admin/Moderator/Student.
- Thử Student gọi API admin như `/rewards/adjust` hoặc close season sẽ bị `403`.
- Nói: "Role switcher/frontend không phải bảo mật chính; backend enforce quyền."

Role chính:

- Student: xem mission, submit action, wallet, badges, certificates, coupon, report.
- Moderator: dashboard moderator, Review Queue, Reports, Leaderboard, Profile, My Mission Catalog.
- Admin: dashboard admin, Catalog, Users, Reports, Policy Rules, Adjust Points, Analytics, Profile.

### Database Per Service

Mỗi microservice sở hữu database riêng:

- Identity -> `identity_db`
- Catalog -> `catalog_db`
- Action -> MongoDB `action_db`
- Policy -> `policy_db`
- Reward -> `reward_db`
- Leaderboard -> `leaderboard_db` + Redis
- Recognition -> `recognition_db`
- Report -> `report_db`
- Notification -> `notification_db`

Cách show:

```powershell
docker compose ps
docker exec -it microservices-se361-identity-db-1 psql -U ecoquest -d identity_db
docker exec -it microservices-se361-action-db-1 mongosh action_db
```

Điểm cần nói:

- Không có foreign key vật lý xuyên database.
- Service khác chỉ giữ ID logic như `studentId`, `missionId`, `sourceActionId`.
- Báo cáo tổng hợp không đọc DB chéo, mà dùng event để tạo read model trong Report service.

### RabbitMQ Event-Driven Communication

RabbitMQ dùng cho luồng bất đồng bộ giữa service.

Các event chính:

- `ActionAcceptedEvent`: Action -> Reward, Report, Notification.
- `ActionRejectedEvent`: Action -> Report, Notification.
- `PointsGrantedEvent`: Reward -> Leaderboard, Report, Recognition.
- `BadgeUnlockedEvent`: Reward -> Notification, Report, Recognition.
- `LeaderboardSeasonClosedEvent`: Leaderboard -> Recognition.
- `CertificateIssuedEvent`: Recognition -> Notification, Report.
- `MissionStatusChangedEvent`: Catalog -> Notification, Report.
- `UserRegisteredEvent`, `UserStatusChangedEvent`: Identity -> Report/Notification.
- `UserReportCreatedEvent`, `UserReportReviewedEvent`: Report -> Notification.

Cách show:

```powershell
docker exec microservices-se361-rabbitmq-1 rabbitmqctl list_queues name messages consumers
```

Kỳ vọng sau smoke test:

- Có 20 queue nghiệp vụ.
- `messages = 0`.
- `consumers >= 1`.

Nói khi demo:

"Khi action được approve, Action không gọi trực tiếp Reward. Action publish event vào RabbitMQ. Reward consume event để cộng điểm, Leaderboard consume points event để cập nhật rank, Report consume để cập nhật analytics, Notification consume để tạo inbox. Đây là eventual consistency."

### Outbox Pattern

Eco Action có collection `action_outbox`.

Ý nghĩa:

- Khi approve/reject action, Action lưu trạng thái và enqueue event vào outbox.
- Worker publish event ra RabbitMQ.
- Giảm rủi ro "DB đã lưu nhưng event chưa publish".

Cách show:

```powershell
docker exec -it microservices-se361-action-db-1 mongosh action_db
db.action_outbox.find().limit(5)
```

### gRPC Action -> Policy

Action gọi Policy bằng gRPC để evaluate rule.

Tại sao dùng gRPC:

- Giao tiếp service-to-service nhanh, schema rõ ràng bằng protobuf.
- Policy không public qua Gateway.
- Admin vẫn có REST direct `http://localhost:8090/policies/rules` để quản lý rule.

Cách show:

```powershell
Invoke-RestMethod http://localhost:8090/policies/rules
```

Nói khi demo:

"Policy là internal decision service. Frontend không đi qua Gateway để gọi policy theo luồng student; Action mới là service gọi Policy bằng gRPC."

### Redis

Redis dùng cho:

- Action draft.
- Idempotency key chống double submit.
- Leaderboard sorted set cho rank realtime theo weekly/monthly period.

Cách show:

```powershell
docker exec -it microservices-se361-redis-1 redis-cli keys "*"
```

Điểm cần nói:

- Redis không thay thế database chính.
- Redis là storage tốc độ cao cho dữ liệu tạm/rank.
- Rank vẫn có snapshot lịch sử trong PostgreSQL khi close season.

### MinIO Object Storage

MinIO dùng thay vì lưu base64 trong DB.

Bucket theo ownership:

- Identity: avatar.
- Catalog: station image.
- Action: evidence nhiều ảnh hoặc một video.
- Report: report evidence.
- Recognition: certificate PDF.

Cách show:

- Mở `http://localhost:9001`
- Login `minioadmin / minioadmin`
- Xem object trong các bucket.

Điểm cần nói:

"DB chỉ lưu URL/object key. File nhị phân nằm ở object storage, đúng hơn cho microservice và dễ thay bằng S3/Cloudinary/CDN khi deploy thật."

### Nginx Frontend Proxy

`ecoquest-web` dùng Nginx để:

- Serve React production build.
- Proxy `/auth`, `/catalog`, `/actions`, ... về Gateway.
- Cho phép upload body 100MB để tránh HTTP 413 khi gửi base64 evidence.
- Giữ SSE notification stream lâu hơn.

Cách show:

- Mở `http://localhost:3000`.
- Dùng mobile cùng Wi-Fi mở `http://<IP-MAY-TINH>:3000`.

### Notification SSE

Notification service có inbox và SSE stream.

Frontend hiện có dropdown notification, mark read/read all và link điều hướng.

Nói khi demo:

"Notification không được tạo bằng frontend fake. Notification service consume event nghiệp vụ rồi lưu inbox riêng."

### Report Analytics Read Model

Report service không đọc DB các service khác. Nó consume event và lưu read model để:

- Dashboard admin.
- Báo cáo tuần/tháng/năm.
- Student outcome report.
- Export PDF báo cáo.

Điểm cần nhấn mạnh:

"Báo cáo tổng hợp trong microservices không join trực tiếp DB các service. Report service tự xây read model qua events."

### Recognition Certificate Và Coupon

Recognition service sở hữu:

- `CertificateRecord`: metadata certificate.
- PDF certificate trong MinIO.
- `RewardOffer`: coupon/reward catalog.
- `RewardClaim`: voucher đã phát.
- `StudentRecognitionProfile`: profile eligibility lấy từ event points/badge/certificate.

Luồng:

1. Admin close season ở Leaderboard.
2. Leaderboard publish season closed.
3. Recognition tạo certificate PDF.
4. Student xem/download certificate.
5. Student claim coupon nếu đủ points/badge/certificate/stock/expiry.
6. Claim lại cùng reward trả voucher cũ, không trừ stock lần hai.

### Flyway, MapStruct, Resilience4j, OpenAPI

Hiện trạng:

- Identity có Flyway migration và MapStruct mapper.
- Các service cũ còn dùng Hibernate schema bootstrap/idempotent seed, đây là production hardening backlog nếu cần chuẩn deploy thật.
- Action -> Policy có Resilience4j để bảo vệ gRPC call.
- Swagger/OpenAPI có trên các REST service direct ports ở `/swagger-ui/index.html`.

Khi bị hỏi vì sao chưa full Flyway mọi service:

"Trong scope coursework/demo, Identity đã minh họa Flyway/MapStruct. Các service còn lại vẫn ổn với local schema bootstrap idempotent. Nếu production, bước tiếp theo là baseline Flyway cho toàn bộ PostgreSQL service."

## 4. Cách Chạy Project

Yêu cầu:

- Docker Desktop đang chạy.
- File `.env` có thể copy từ `.env.example`.

Chạy từ đầu:

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361
Copy-Item .env.example .env
$env:API_GATEWAY_PORT='18080'
docker compose up -d --build
docker compose ps
```

Chạy lại bình thường khi image đã build:

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361
$env:API_GATEWAY_PORT='18080'
docker compose up -d
```

Reset database sạch và seed lại:

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361
$env:API_GATEWAY_PORT='18080'
docker compose down -v
docker compose up -d
```

Build/test:

```powershell
docker run --rm -v ${PWD}:/workspace -v ${PWD}/.m2:/root/.m2 -w /workspace maven:3.9.9-eclipse-temurin-21 mvn package -DskipTests
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090 -Web http://localhost:3000
cd web-apps\ecoquest-web
npm.cmd test
npm.cmd run build
```

Mở các màn hình:

- Web app: `http://localhost:3000`
- Gateway health: `http://localhost:18080/actuator/health`
- RabbitMQ UI: `http://localhost:15672` với `guest / guest`
- MinIO Console: `http://localhost:9001` với `minioadmin / minioadmin`
- Policy Admin REST: `http://localhost:8090/policies/rules`

Tài khoản demo:

- Student: `student@ecoquest.local` / `EcoQuest@123`
- Moderator: `moderator@ecoquest.local` / `EcoQuest@123`
- Admin: `admin@ecoquest.local` / `EcoQuest@123`

## 5. Cách Show Khi Báo Cáo

### Demo 1 - Chứng minh hệ thống có nhiều service

Chạy:

```powershell
docker compose ps
```

Nói:

"Đây là toàn bộ stack local. Mỗi dòng service backend là một microservice/container riêng, có port và database riêng."

### Demo 2 - Chứng minh Gateway chỉ route

Mở:

```text
http://localhost:18080/actuator/health
```

Nói:

"Gateway là entry point HTTP. Business logic nằm trong service như Action, Reward, Recognition. Policy admin REST còn cố ý không route qua Gateway."

### Demo 3 - Chứng minh RabbitMQ event-driven

Mở RabbitMQ UI hoặc chạy:

```powershell
docker exec microservices-se361-rabbitmq-1 rabbitmqctl list_queues name messages consumers
```

Nói:

"Các queue có consumer và sau smoke test messages về 0, nghĩa là event đã được xử lý hết."

### Demo 4 - Luồng submit action chuẩn

Các bước:

1. Login Student.
2. Vào Missions.
3. Submit một mission có evidence.
4. Kết quả hiện `Pending Review`.
5. Login Moderator/Admin.
6. Vào Review Queue.
7. Approve action.
8. Quay lại Student wallet/leaderboard để thấy điểm cập nhật sau event.

Nói:

"Submit thành công không cộng điểm ngay. Điểm chỉ được công nhận sau khi Moderator/Admin approve."

### Demo 5 - Database per service

Mở một DB bất kỳ:

```powershell
docker exec -it microservices-se361-identity-db-1 psql -U ecoquest -d identity_db
docker exec -it microservices-se361-action-db-1 mongosh action_db
```

Nói:

"Identity lưu user riêng, Action lưu action riêng. Không có service nào join trực tiếp DB của service khác."

### Demo 6 - MinIO upload ownership

Mở `http://localhost:9001`, xem bucket/object.

Nói:

"File upload không nằm trong DB; service sở hữu file tự lưu ở bucket của mình."

### Demo 7 - Policy gRPC

Mở:

```text
http://localhost:8090/policies/rules
```

Nói:

"Admin quản lý policy qua REST direct local. Runtime submit thì Action gọi Policy bằng gRPC."

### Demo 8 - Báo cáo analytics

Login Admin, mở Analytics:

- Xem weekly/monthly/yearly.
- Chọn kỳ quá khứ.
- Export PDF.

Nói:

"Report analytics là read model từ event, không join DB chéo."

## 6. Kịch Bản Thuyết Trình 7-10 Phút

1. Giới thiệu bài toán: quản lý hoạt động xanh, cộng điểm, badge, leaderboard, certificate, coupon.
2. Nêu kiến trúc: 9 microservices, Gateway, database-per-service, RabbitMQ, Redis, gRPC, MinIO.
3. Mở `docker compose ps` để show service/container.
4. Trình bày luồng submit action: Student -> Action -> Policy gRPC -> pending review -> approve -> RabbitMQ -> Reward/Leaderboard/Notification/Report.
5. Mở RabbitMQ queue để chứng minh event-driven.
6. Mở MinIO để chứng minh file storage đúng ownership.
7. Mở Admin Analytics/export PDF để chứng minh read model/reporting.
8. Nêu kiểm thử: Maven build, smoke test, frontend tests, queue drained.
9. Nêu giới hạn production: full Flyway mọi service, tracing/monitoring sâu hơn, Kubernetes/CI/CD.

## 7. Câu Hỏi Có Thể Bị Hỏi Và Cách Trả Lời

### Vì sao gọi là microservices chứ không phải monolith?

Vì hệ thống tách thành 9 service độc lập theo bounded context: Identity, Catalog, Action, Policy, Reward, Leaderboard, Recognition, Report, Notification. Mỗi service có database riêng, container riêng, port riêng và ownership nghiệp vụ riêng.

### Gateway có chứa business logic không?

Không. Gateway chỉ route, CORS/correlation ID và giới hạn request. Logic cộng điểm nằm ở Reward, logic policy nằm ở Policy, logic certificate/coupon nằm ở Recognition.

### Service có đọc database của service khác không?

Không. Service chỉ giữ ID logic và giao tiếp bằng REST/gRPC/event. Ví dụ Report analytics không join DB Reward/Action/Catalog mà consume event để build read model.

### Vì sao Action dùng MongoDB?

Action lưu submission/evidence/status có cấu trúc linh hoạt, danh sách `evidenceUrls`, moderation metadata và outbox. MongoDB phù hợp cho document action và mở rộng evidence metadata.

### Vì sao các service khác dùng PostgreSQL?

Identity, Catalog, Policy, Reward, Leaderboard snapshot, Recognition, Report, Notification có dữ liệu quan hệ rõ hơn như user, transaction, badge, policy rule, certificate, report, notification nên PostgreSQL phù hợp.

### Vì sao cần RabbitMQ?

Để giảm coupling và xử lý bất đồng bộ. Action không gọi sync Reward/Leaderboard/Report/Notification. Nó publish event; các service liên quan tự consume và cập nhật DB/read model riêng.

### Eventual consistency là gì trong project này?

Sau khi Moderator/Admin approve action, điểm/rank/notification không nhất thiết cập nhật trong cùng một request. Event qua RabbitMQ được consumer xử lý trong vài giây. Smoke test kiểm queue về 0 và dữ liệu cập nhật đúng.

### Vì sao submit action không cộng điểm ngay?

Để đúng nghiệp vụ kiểm duyệt. Student submit chỉ tạo `PENDING_REVIEW`. Moderator/Admin xem evidence, approve thì mới publish `ActionAcceptedEvent` và Reward mới cộng điểm. Reject thì không cộng điểm.

### Daily limit hoạt động như nào?

Action đếm số action cùng student/actionType trong ngày rồi gửi count sang Policy gRPC. Policy rule có `dailyLimit`; nếu vượt limit thì trả reject. Smoke test kiểm action thứ hai trong ngày bị reject.

### Idempotency dùng để làm gì?

Chống double click/retry tạo action trùng. Frontend gửi `idempotencyKey`; Action lưu key trong Redis. Gửi lại cùng key sẽ trả `409`.

### Outbox Pattern giúp gì?

Giảm rủi ro mất event. Action lưu state và outbox message trong DB, worker publish ra RabbitMQ sau. Nếu publish lỗi có thể retry từ outbox.

### Vì sao Policy Admin không đi qua Gateway?

Policy là service nội bộ/direct admin mode. Runtime student không gọi Policy trực tiếp; Action gọi bằng gRPC. Việc không route Policy qua Gateway giúp nhấn mạnh policy không phải public API đại trà.

### Redis dùng cho gì?

Redis dùng cho draft/idempotency và leaderboard realtime sorted set. Redis không thay thế database chính, chỉ dùng cho dữ liệu tạm hoặc cần truy vấn rank nhanh.

### MinIO dùng cho gì?

MinIO lưu file object như avatar, station image, action evidence, report evidence, certificate PDF. Database chỉ lưu URL/object key.

### Nếu đổi sang Cloudinary/S3 thì sao?

Có thể thay storage adapter theo từng service. Vì service đã sở hữu file của mình, việc đổi MinIO sang S3/Cloudinary không cần service khác đọc DB hay đổi kiến trúc tổng thể.

### Coupon có phải demo fake không?

Không còn là fake frontend. Recognition sở hữu `RewardOffer`, `RewardClaim`, `StudentRecognitionProfile`. Backend kiểm điều kiện points/badge/certificate/stock/expiry trước khi phát voucher và claim trùng trả lại voucher cũ.

### Certificate được tạo khi nào?

Admin close season ở Leaderboard. Leaderboard tạo snapshot và publish season closed event. Recognition consume event, tạo certificate PDF, lưu MinIO và metadata DB. Close cùng season không tạo duplicate certificate.

### Report analytics lấy dữ liệu ở đâu?

Từ event read model trong Report service. Report consume action accepted/rejected, points granted, badge unlocked, certificate issued, mission status, user registered... rồi lưu summary để dashboard/export báo cáo.

### Notification realtime hoạt động thế nào?

Notification service consume event nghiệp vụ, lưu inbox và cung cấp API/SSE. Frontend hiển thị dropdown chuông, mark read/read all và điều hướng theo notification link.

### Auth có production-ready chưa?

Đủ cho demo/coursework: JWT, register/verify/reset, role/status, self-protection. Production cần hardening thêm như refresh token, key rotation, audit logs đầy đủ, rate limit sâu hơn.

### Vì sao chưa dùng Kubernetes?

Docker Compose đủ cho demo local và coursework. Kiến trúc container/service/database tách sẵn nên có thể nâng lên Kubernetes sau, nhưng scope hiện tại tập trung vào microservice logic và integration test.

### Vì sao chưa full Flyway mọi service?

Identity đã có Flyway/MapStruct để minh họa. Các service còn lại đang dùng schema bootstrap/Hibernate update idempotent cho tốc độ demo. Production hardening nên baseline Flyway cho tất cả PostgreSQL service.

### Làm sao chứng minh test đã đủ?

Chạy:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090 -Web http://localhost:3000
```

Smoke test kiểm auth, RBAC, Catalog CRUD, Policy CRUD, Action evidence, submit review gate, Reward/badge, Leaderboard, Report analytics, Notification, Recognition certificate/coupon và RabbitMQ queue drain.

## 8. Checklist Trước Khi Báo Cáo

- Docker Desktop đang chạy.
- `docker compose ps` thấy 23 container/service running.
- `http://localhost:3000` mở được web.
- `http://localhost:18080/actuator/health` trả `UP`.
- RabbitMQ UI mở được.
- MinIO Console mở được.
- Login được Student/Moderator/Admin demo.
- Có ít nhất một action pending để demo Review Queue, hoặc submit mới trong lúc demo.
- Chạy smoke test trước buổi báo cáo nếu muốn có bằng chứng mới nhất.

## 9. File Nên Đọc Khi Viết Báo Cáo

- `docs/cam-nang-bao-cao-microservices.md`: file này, dùng để thuyết trình microservices.
- `docs/tai-lieu-nguon-bao-cao-docx.md`: nguồn nội dung đầy đủ cho báo cáo DOCX.
- `docs/bao-cao-hien-trang-project.md`: tổng quan hiện trạng project.
- `docs/luong-nghiep-vu-database.md`: luồng nghiệp vụ và database chi tiết.
- `docs/frontend-test-scenarios.md`: checklist kiểm thử frontend theo role và workflow.
- `README.md`: cách chạy nhanh và trạng thái verification.
