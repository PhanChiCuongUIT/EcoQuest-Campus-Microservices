# Công Nghệ Microservices Trong EcoQuest Campus

Cập nhật: 2026-09-21

Tài liệu này tổng hợp các công nghệ microservices đang có trong project EcoQuest Campus và chúng được dùng ở đâu, dùng như thế nào.

Nếu cần một file để cầm đi thuyết trình, xem `cam-nang-bao-cao-microservices.md`. File hiện tại thiên về mô tả công nghệ; cẩm nang mới có thêm kịch bản demo và câu hỏi phản biện.

## 1. Kiến Trúc Tổng Thể

Project hiện có 9 microservice backend:

| Service | Vai trò | Port |
| --- | --- | --- |
| Identity Access | Auth, register, verify email, forgot/reset, profile, avatar, user management | `8086` |
| Green Catalog | Mission, station, badge definition, station image | `8081` |
| Eco Action | Draft, submit action, evidence nhiều ảnh/một video, moderation, outbox | `8082` |
| Verification Policy | Rule policy, gRPC evaluation, direct admin REST | `8090` REST, `9090` gRPC |
| Reward Ledger | Wallet, transaction, badge achievement, adjust points | `8083` |
| Leaderboard | Weekly/monthly rank, season snapshot | `8084` |
| Recognition | Certificate PDF, reward offer catalog, coupon/voucher eligibility and claim | `8085` |
| Report | User report workflow, analytics read model, report PDF export | `8087` |
| Notification | Inbox, read/read-all, SSE realtime notification | `8088` |

Frontend React/Vite chạy sau Nginx container tại `http://localhost:3000`. Backend đi qua Spring Cloud Gateway tại `http://localhost:18080`.

## 2. Spring Boot 3 Và Java 21

Tất cả service backend là Spring Boot 3, build bằng Java 21. Mỗi service có runtime riêng, Docker image riêng và lifecycle riêng trong Docker Compose.

Cách dùng trong project:

- Controller REST cho API public/internal.
- Spring Data JPA cho PostgreSQL.
- Spring Data MongoDB cho Action service.
- Spring AMQP cho RabbitMQ event.
- Spring Security/JWT ở các service cần protected API.
- Actuator health để kiểm tra service sống/chết.

## 3. Spring Cloud Gateway

Gateway là cửa vào HTTP chính cho frontend:

- `/auth/**` -> Identity.
- `/catalog/**` -> Catalog.
- `/actions/**` -> Action.
- `/rewards/**` -> Reward.
- `/leaderboards/**` -> Leaderboard.
- `/recognitions/**` -> Recognition.
- `/reports/**` -> Report.
- `/notifications/**` -> Notification.

Nguyên tắc:

- Gateway chỉ route, CORS/correlation ID, không chứa nghiệp vụ.
- Không đặt logic cộng điểm, xét policy, tạo certificate trong Gateway.
- Policy Admin REST không route qua Gateway. Giao diện gọi `/policies/` cùng origin; Nginx/Vite proxy trực tiếp tới Policy. Service vẫn kiểm JWT và quyền Admin. Cổng `8090` phục vụ quản trị/kiểm thử trực tiếp, không phải endpoint công khai miễn xác thực.

## 4. Database Per Service

Mỗi service sở hữu database riêng:

| Service | Database |
| --- | --- |
| Identity | PostgreSQL `identity_db` |
| Catalog | PostgreSQL `catalog_db` |
| Action | MongoDB `action_db` |
| Policy | PostgreSQL `policy_db` |
| Reward | PostgreSQL `reward_db` |
| Leaderboard | PostgreSQL `leaderboard_db` + Redis |
| Recognition | PostgreSQL `recognition_db` |
| Report | PostgreSQL `report_db` |
| Notification | PostgreSQL `notification_db` |

Quy tắc microservice:

- Service không đọc database của service khác.
- ID giữa service là tham chiếu logic, không dùng foreign key vật lý xuyên DB.
- Dữ liệu tổng hợp dùng event/read model, ví dụ Report analytics.

## 5. RabbitMQ Event-Driven Architecture

RabbitMQ dùng cho giao tiếp bất đồng bộ giữa service. Exchange chung nằm trong building block messaging.

Các event chính:

| Event | Nơi phát | Nơi consume |
| --- | --- | --- |
| `ActionAcceptedEvent` | Action | Reward, Report, Notification |
| `ActionRejectedEvent` | Action | Report, Notification |
| `PointsGrantedEvent` | Reward | Leaderboard, Report, Recognition |
| `BadgeUnlockedEvent` | Reward | Report, Notification, Recognition |
| `LeaderboardSeasonClosedEvent` | Leaderboard | Recognition |
| `CertificateIssuedEvent` | Recognition | Report, Notification |
| `MissionStatusChangedEvent` | Catalog | Report, Notification |
| `UserRegisteredEvent` | Identity | Report |
| `UserStatusChangedEvent` | Identity | Notification |
| `UserReportCreatedEvent` | Report | Notification |
| `UserReportReviewedEvent` | Report | Notification |

Cách kiểm tra RabbitMQ:

- UI: `http://localhost:25673` (cổng host; container vẫn dùng `15672`)
- User/pass: `guest/guest`
- Smoke test kiểm queue còn `0` pending message và có consumer.

Ý nghĩa:

- Reward không cần Action gọi trực tiếp để cộng điểm.
- Report không cần đọc DB Action/Reward/Catalog/Identity.
- Notification không cần service khác gọi sync.

Ở phía trình duyệt, Notification dùng SSE và inbox polling 30 giây. Mỗi kết nối SSE có thời hạn 5 phút rồi EventSource kết nối lại; server dọn emitter khi đóng/lỗi/hết hạn. Cùng một kết nối khớp nhiều recipient key chỉ nhận một bản notification, UI cũng gộp theo ID. Cơ chế này không thay thế inbox chống trùng integration event bền vững; broker redelivery vẫn là giới hạn cần xử lý thêm. Xem [báo cáo kiểm thử chức năng](kiem-tra-chuc-nang-2026-09-22.md).
- Hệ thống chấp nhận eventual consistency, nên UI cần refetch/poll sau event.

## 6. gRPC Giữa Action Và Policy

Action service gọi Verification Policy service bằng gRPC để evaluate action:

- Input: `actionType`, `evidenceUrl` đầu tiên trong `evidenceUrls`, `stationId`, số lần submit trong ngày.
- Output: accepted/requires manual review/suggested points/reason.

Vì sao dùng gRPC:

- Policy là rule evaluation nội bộ, cần nhanh và strongly typed.
- Action không copy rule policy vào code của mình.
- Policy có direct admin REST riêng để quản trị rule, nhưng flow nghiệp vụ dùng gRPC.

Resilience:

- Action có circuit breaker/fallback cho policy client để tránh sập dây chuyền khi Policy lỗi.

## 7. Redis

Redis đang dùng cho hai nhóm việc:

1. Action service:
   - Lưu draft action tạm thời.
   - Kiểm idempotency key để double submit không tạo trùng action.

2. Leaderboard service:
   - Sorted set cho weekly/monthly ranking.
   - Score là điểm student.
   - Truy vấn rank nhanh cho dashboard/leaderboard.
   - Set `ecoquest:leaderboard:processed:{studentId}` lưu `sourceActionId` đã xử lý; dùng `eventId` khi contract cũ không có source action. Lua kiểm trùng và cập nhật hai bảng điểm tuần/tháng trong một thao tác trên Redis độc lập hiện tại.
   - Service không đọc database Reward để chống trùng. Set chưa có dữ liệu các grant trước khi triển khai bản sửa; không được xóa set rồi replay event cũ mà không có kế hoạch dựng lại toàn bộ projection. Cấu hình này chưa hỗ trợ Redis Cluster nhiều hash slot và không phải cam kết exactly-once toàn hệ thống.

Cách kiểm tra nhanh:

```powershell
docker compose exec -T redis redis-cli --scan --pattern "ecoquest:leaderboard:*"
powershell -ExecutionPolicy Bypass -File scripts\test-leaderboard-dedup.ps1
```

## 8. MinIO Object Storage

MinIO dùng thay vì lưu file base64 trong DB.

| Loại file | Service sở hữu | Bucket cấu hình |
| --- | --- | --- |
| Avatar | Identity | `ecoquest-avatars` |
| Station image | Catalog | `ecoquest-stations` |
| Action evidence | Action | `ecoquest-evidence` |
| Report evidence | Report | `ecoquest-report-evidence` |
| Certificate PDF | Recognition | `ecoquest-certificates` |

Nguyên tắc:

- Service nào sở hữu nghiệp vụ thì sở hữu file.
- DB chỉ lưu URL/object key.
- Frontend upload file qua API của owning service, không upload trực tiếp vào bucket.
- Với action evidence, Action hỗ trợ nhiều ảnh hoặc một video. MongoDB lưu danh sách `evidenceUrls`; `evidenceUrl` là URL đầu tiên để Policy/client cũ vẫn hoạt động. Backend cũng reject batch trộn ảnh/video hoặc PDF với media khác.

MinIO console:

- URL: `http://localhost:9001`
- User/pass: `minioadmin/minioadmin`

## 9. MongoDB Cho Action Service

Action dùng MongoDB vì action document có tính event/log và payload linh hoạt:

- `eco_actions`: dữ liệu submit action.
- `action_outbox`: outbox message cần publish RabbitMQ.

Outbox giúp hạn chế mất event:

1. Action lưu action và outbox message.
2. Outbox publisher publish RabbitMQ.
3. Sau khi publish thành công, cập nhật `publishedAt`.
4. Nếu lỗi, lưu `lastError` để retry/kiểm tra.

## 10. PostgreSQL Cho Các Service Còn Lại

PostgreSQL dùng cho dữ liệu quan hệ ổn định:

- Identity: user/token.
- Catalog: mission/station/badge.
- Policy: rule.
- Reward: wallet/transaction/badge.
- Leaderboard: snapshot.
- Recognition: certificate/coupon metadata.
- Report: report workflow và analytics read model.
- Notification: inbox/read state.

Một số ràng buộc quan trọng:

- Identity unique email/studentId.
- RewardTransaction unique sourceActionId.
- BadgeAchievement unique studentId/badgeCode.
- CertificateRecord unique studentId/seasonId.
- Token hash unique trong Identity.

## 11. JWT Và Role-Based Access Control

Identity phát JWT sau khi user login thành công.

Role:

- `STUDENT`: Student panel/self data.
- `MODERATOR`: Student self panel + Moderator panel.
- `ADMIN`: Moderator/Admin panel, không có Student submit panel.

Các service tự kiểm JWT/role, frontend role switch không thể nâng quyền backend.

Ràng buộc đáng chú ý:

- User inactive/banned không đăng nhập được.
- Admin không được tự đổi role/status/ban/delete chính mình.
- Moderator không được review action của chính mình.
- Student không được xem/submit thay student khác.

## 12. SMTP Email

Identity gửi email thật khi bật SMTP trong `.env`:

- Xác nhận đăng ký.
- Quên mật khẩu/reset password.
- Thông báo user bị active/inactive/banned kèm lý do và email hỗ trợ.

Email dùng template HTML branded và logo EcoQuest inline CID, tránh phụ thuộc ảnh `localhost`.

## 13. PDF Generation

Recognition tạo certificate PDF bằng Java/iText:

- A4 landscape.
- Có registry ID, issued date.
- Có hai chữ ký: đại diện trường đại học và đại diện ứng dụng EcoQuest.
- Download qua endpoint protected, frontend tải bằng blob kèm bearer token.

Report service cũng xuất PDF báo cáo:

- Theo tuần/tháng/năm được chọn.
- Không cho chọn kỳ tương lai.
- PDF có KPI, bảng metric, action type, top students và footer nguồn dữ liệu.

## 14. Docker Compose

Docker Compose dựng toàn bộ hệ thống local:

```powershell
$env:API_GATEWAY_PORT='18080'
docker compose up -d --build
```

Các cổng quan trọng:

| Thành phần | URL |
| --- | --- |
| Web | `http://localhost:3000` |
| Gateway | `http://localhost:18080` |
| RabbitMQ UI | `http://localhost:25673` |
| MinIO Console | `http://localhost:9001` |
| Policy Admin | `http://localhost:8090/policies/rules` |

Khi chỉ sửa một service:

```powershell
docker compose build recognition-service
docker compose up -d --no-deps recognition-service
```

## 15. Testing Và Smoke Test

Smoke test chính:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090 -Web http://localhost:3000
```

Smoke test kiểm:

- Gateway health.
- Auth register/verify/login/reset.
- Role boundary.
- Catalog CRUD.
- Policy direct API CRUD.
- Action draft/idempotency/evidence nhiều ảnh hoặc một video/submit.
- gRPC Policy evaluation.
- RabbitMQ event pipeline.
- Reward wallet/badge.
- Leaderboard rank/snapshot.
- Recognition certificate PDF và coupon idempotency.
- Report workflow và analytics.
- Notification inbox.
- RabbitMQ queue drain.

Frontend:

```powershell
cd web-apps\ecoquest-web
npm.cmd test
npm.cmd run build
```

## 16. Những Điểm Đúng Tính Microservice

- Có Gateway nhưng Gateway không chứa nghiệp vụ.
- Mỗi service có database riêng.
- Không đọc DB chéo.
- Giao tiếp sync chỉ dùng ở điểm cần thiết: Action -> Catalog validate, Action -> Policy gRPC.
- Luồng còn lại dùng RabbitMQ event.
- File upload lưu ở object storage theo owning service.
- Report analytics là read model riêng, không query trực tiếp DB service khác.
- Notification là service riêng consume event, không nhúng vào từng service.
- Các ràng buộc chống duplicate nằm ở service sở hữu nghiệp vụ.

## 17. Nên Show Gì Khi Báo Cáo Microservices

Khi thuyết trình, nên demo theo thứ tự sau để người nghe thấy rõ kiến trúc chứ không chỉ thấy UI:

| Cần show | Mở ở đâu / chạy gì | Ý nghĩa cần nói |
| --- | --- | --- |
| Toàn bộ container | `docker compose ps` | Một project chạy nhiều service độc lập: Gateway, 9 backend service, DB riêng, RabbitMQ, Redis, MinIO. |
| Gateway health | `Invoke-RestMethod http://localhost:18080/actuator/health` | Frontend chỉ gọi Gateway; Gateway route, không chứa nghiệp vụ. |
| Database per service | Mở các container `identity-db`, `catalog-db`, `reward-db`, `notification-db` | Mỗi service sở hữu dữ liệu riêng; không dùng foreign key vật lý xuyên service. |
| Auth/JWT | Đăng nhập Student/Admin trên web | JWT giúp mỗi microservice tự kiểm quyền; role switcher frontend không thay được quyền backend. |
| gRPC Policy | Submit một mission | Action gọi Policy qua gRPC để xét điểm/evidence/station/daily limit, không copy rule vào Action. Policy chỉ cần biết có evidence chính; danh sách ảnh/video vẫn thuộc Action. |
| RabbitMQ | `docker exec microservices-se361-rabbitmq-1 rabbitmqctl list_queues name messages consumers` | Event-driven: Action publish event, Reward/Leaderboard/Report/Notification tự consume. Queue cuối cùng 0 message nghĩa là event đã xử lý xong. |
| Redis | `docker exec microservices-se361-redis-1 redis-cli --scan --pattern "ecoquest:*"` | Redis giữ draft/idempotency và leaderboard sorted set theo tuần/tháng để rank nhanh. |
| MinIO | `http://localhost:9001` | File avatar/station/evidence ảnh-video/certificate không nhét base64 vào DB; service nào sở hữu nghiệp vụ thì sở hữu bucket/file. |
| Notification | Mở chuông ở Student/Moderator/Admin | Notification là microservice riêng có inbox seed, read/read-all và SSE realtime; các service khác không tự nhúng logic thông báo. |
| Report Analytics | Admin -> Analytics -> export PDF | Report service dựng read model từ event, không đọc DB chéo nhưng vẫn tổng hợp được mission/action/user/points/badge/certificate. |
| Coupon debit | Student -> Certificates -> Redeem | Recognition giữ stock và claim pending; Reward kiểm số dư, debit idempotent theo claim ID; kết quả qua RabbitMQ để Recognition phát voucher hoặc hoàn stock. Không đọc DB chéo, không giảm điểm leaderboard. |
| Smoke test | `powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090 -Web http://localhost:3000` | Đây là bằng chứng tích hợp: auth, CRUD, upload nhiều ảnh/video, upload lớn qua Nginx web proxy, reject batch media sai, event, notification, certificate, coupon và queue drain đều pass. |

Câu chốt nên nói: “EcoQuest dùng microservices không chỉ để tách thư mục code, mà tách ownership thật: mỗi service có API, database/storage, test và nghiệp vụ riêng. Dữ liệu tổng hợp đi qua event/read model, còn Gateway chỉ định tuyến.”
