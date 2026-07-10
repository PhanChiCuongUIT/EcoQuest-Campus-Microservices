# Kịch bản demo Microservices EcoQuest Campus

Cập nhật: 2026-07-10

Tài liệu này dùng khi demo đồ án trước giảng viên. Trọng tâm là chứng minh hệ thống không chỉ là web app, mà có kiến trúc microservices thật: tách service theo nghiệp vụ, database ownership, API Gateway, gRPC, RabbitMQ, MinIO, Redis, healthcheck, idempotency và eventual consistency.

## 1. Chuẩn bị trước khi demo

### 1.1. Chạy hệ thống

Nếu máy đang có image mới nhất và chỉ muốn chạy:

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361
$env:API_GATEWAY_PORT='18080'
docker compose up -d
docker compose ps
```

Nếu vừa sửa code hoặc muốn build lại toàn bộ:

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361
$env:API_GATEWAY_PORT='18080'
docker compose up -d --build
docker compose ps
```

Kết quả mong muốn:

- Các container backend, frontend, database, RabbitMQ, Redis, MinIO đều ở trạng thái `running`.
- Các database container có healthcheck `healthy`.
- Web mở được ở `http://localhost:3000`.

### 1.2. Các tab nên mở sẵn

| Tab | URL/Lệnh | Dùng để show gì |
| --- | --- | --- |
| Frontend | `http://localhost:3000` | Demo theo role Student, Moderator, Admin |
| Gateway health | `http://localhost:18080/actuator/health` | Chứng minh API Gateway đang sống |
| Gateway routes | `http://localhost:18080/actuator/gateway/routes` | Chứng minh Gateway route request đến từng service |
| RabbitMQ UI | `http://localhost:15672` - `guest/guest` | Show exchange, queue, consumer, pending message |
| MinIO Console | `http://localhost:9001` - `minioadmin/minioadmin` | Show bucket và file upload/PDF |
| Policy Admin API | `http://localhost:8090/policies/rules` | Show Policy service có cổng admin riêng, không public qua Gateway |
| Docker status | `docker compose ps` | Show các service/database đang chạy |
| RabbitMQ queue CLI | `docker exec microservices-se361-rabbitmq-1 rabbitmqctl list_queues name messages consumers` | Show queue pending = 0 và có consumer |
| Backend logs | `docker compose logs --tail=80 api-gateway eco-action-service reward-ledger-service leaderboard-service notification-service` | Show request/event không lỗi |

### 1.3. Tài khoản demo

Mật khẩu chung:

```text
EcoQuest@123
```

| Role | Email | Mục đích demo |
| --- | --- | --- |
| Student | `student@ecoquest.local` | Submit action, xem wallet, badge, leaderboard, certificate, coupon |
| Moderator | `moderator@ecoquest.local` | Review Queue, Reports, My Mission Catalog |
| Admin | `admin@ecoquest.local` | Users, Catalog, Policy Rules, Analytics, Adjust Points, Reward Offers |

## 2. Kịch bản demo tổng quan 5-7 phút

### Bước 1 - Show hệ thống đang chạy

Mở terminal:

```powershell
docker compose ps
```

Nói:

> Đây là toàn bộ runtime local của hệ thống. Project không chạy như một monolith đơn lẻ, mà gồm nhiều container: 9 backend microservices, frontend, PostgreSQL theo từng service, MongoDB, Redis, RabbitMQ và MinIO.

Mở Gateway health:

```text
http://localhost:18080/actuator/health
```

Kết quả mong muốn:

```json
{
  "status": "UP"
}
```

Nói:

> Gateway health đang UP. Frontend đi qua Gateway, còn Gateway chỉ route request và gắn correlation ID, không chứa business logic.

Nếu muốn show health từng service, mở trực tiếp:

```text
http://localhost:8086/actuator/health  Identity
http://localhost:8081/actuator/health  Catalog
http://localhost:8082/actuator/health  Action
http://localhost:8090/actuator/health  Policy REST
http://localhost:8083/actuator/health  Reward
http://localhost:8084/actuator/health  Leaderboard
http://localhost:8085/actuator/health  Recognition
http://localhost:8087/actuator/health  Report
http://localhost:8088/actuator/health  Notification
```

### Bước 2 - Show RabbitMQ trước khi chạy luồng

Mở `http://localhost:15672`, đăng nhập `guest/guest`.

Vào:

- `Exchanges` -> tìm `ecoquest.events`.
- `Queues and Streams` -> xem các queue bắt đầu bằng `reward.`, `leaderboard.`, `recognition.`, `report.`, `notification.`.

Các routing key chính:

| Routing key | Ý nghĩa |
| --- | --- |
| `eco.action.accepted` | Action đã được duyệt |
| `eco.action.rejected` | Action bị reject |
| `reward.points.granted` | Reward đã cộng điểm |
| `reward.badge.unlocked` | Student mở khóa badge |
| `leaderboard.season.closed` | Đóng mùa/season để cấp certificate |
| `recognition.certificate.issued` | Certificate đã được phát |
| `catalog.mission.status-changed` | Trạng thái mission thay đổi |
| `identity.user.registered` | User mới đăng ký |
| `identity.user.status-changed` | User bị active/inactive/banned |
| `report.user-report.created` | User tạo report |
| `report.user-report.reviewed` | Report đã được review |

Nói:

> Đây là event backbone của hệ thống. Các service không gọi đồng bộ dây chuyền sau khi approve, mà publish/consume event qua RabbitMQ. Mục tiêu là giảm coupling và chấp nhận eventual consistency.

Có thể chạy terminal:

```powershell
docker exec microservices-se361-rabbitmq-1 rabbitmqctl list_queues name messages consumers
```

Khi demo ổn, các queue nên có:

- `messages = 0`: không có message bị kẹt.
- `consumers >= 1`: service consumer đang lắng nghe queue.

### Bước 3 - Show MinIO object storage

Mở `http://localhost:9001`, đăng nhập:

```text
minioadmin / minioadmin
```

Vào `Object Browser`, show các bucket:

| Bucket | Service sở hữu | Nội dung |
| --- | --- | --- |
| `ecoquest-avatars` | Identity | Avatar user |
| `ecoquest-stations` | Catalog | Ảnh station |
| `ecoquest-evidence` | Action | Ảnh/video minh chứng submit action |
| `ecoquest-report-evidence` | Report | Minh chứng report |
| `ecoquest-certificates` | Recognition | PDF certificate |

Nói:

> Frontend không upload trực tiếp lên MinIO. Mỗi file đi qua API của service sở hữu nghiệp vụ. Ví dụ evidence action phải đi qua Action Service, certificate PDF do Recognition Service tạo. Đây là file ownership trong microservices.

### Bước 4 - Show frontend theo role

Mở `http://localhost:3000`.

Nói:

> Frontend chỉ điều hướng theo role, còn quyền thật được kiểm ở backend bằng JWT/RBAC. Student, Moderator và Admin có panel khác nhau.

Demo nhanh:

- Student: Missions, Wallet & Badges, Certificates, Leaderboard, Notifications.
- Moderator: Review Queue, Reports, My Mission Catalog.
- Admin: Users, Catalog, Reports, Analytics, Policy Rules, Adjust Points, Reward Offers.

## 3. Demo luồng cụ thể: Submit Action -> Approve -> Cộng điểm

Đây là luồng nên demo chính vì nó chạm nhiều service nhất.

### 3.1. Mục tiêu kỹ thuật cần chứng minh

Luồng này chứng minh:

1. Student submit evidence qua Action Service và MinIO.
2. Action gọi Catalog và Policy để validate.
3. Action lưu MongoDB ở trạng thái `PENDING_REVIEW`.
4. Submit thành công chưa cộng điểm ngay.
5. Moderator/Admin approve trong Review Queue.
6. Action ghi Outbox và publish `ActionAcceptedEvent`.
7. Reward Ledger consume event, cộng điểm và phát `PointsGrantedEvent`.
8. Leaderboard consume points event, cập nhật rank bằng Redis sorted set.
9. Report và Notification cập nhật qua RabbitMQ.
10. RabbitMQ queue sau đó drain về 0 pending message.

### 3.2. Thực hiện trên UI

#### Bước A - Đăng nhập Student

Login:

```text
student@ecoquest.local
EcoQuest@123
```

Vào `Wallet & Badges`, ghi nhớ hoặc chụp nhanh:

- Total points hiện tại.
- Số badge hiện tại.

Vào `Missions`.

Chọn một mission `ACTIVE`, ví dụ:

- Recycle.
- Bottle Refill.
- Bike to Campus.
- Campus Cleanup.

Nhấn submit trên mission đó.

Upload minh chứng:

- Nhiều ảnh, hoặc
- Một video.

Submit action.

Kết quả mong muốn:

- UI báo submit thành công hoặc pending review.
- Action vào trạng thái `PENDING_REVIEW`.
- Wallet chưa tăng điểm ngay.

Nói:

> Submit thành công chỉ có nghĩa là action được đưa vào review queue. Hệ thống không cộng điểm ngay để tránh gian lận minh chứng.

#### Bước B - Show MinIO sau upload evidence

Mở MinIO -> bucket `ecoquest-evidence`.

Tìm object vừa được upload, hoặc chỉ folder/object mới nhất.

Nói:

> File minh chứng không lưu base64 trong database. Action Service upload file vào bucket `ecoquest-evidence`, database chỉ lưu URL hoặc object key.

#### Bước C - Đăng nhập Moderator/Admin để approve

Logout hoặc mở tab ẩn danh, login Moderator:

```text
moderator@ecoquest.local
EcoQuest@123
```

Vào `Review Queue`.

Tìm action vừa submit.

Kiểm tra:

- Student.
- Mission.
- Evidence thumbnail/link.
- Status `PENDING_REVIEW`.

Nhấn `Approve`.

Kết quả mong muốn:

- Action chuyển sang `ACCEPTED`.
- Student mới được cộng điểm sau bước này.

Nói:

> Moderator/Admin approve là điểm ranh giới nghiệp vụ. Từ đây Action Service mới ghi outbox và phát event.

#### Bước D - Show RabbitMQ event sau approve

Mở RabbitMQ UI.

Vào `Queues and Streams`, quan sát các queue:

- `reward.eco-action-accepted`
- `report.eco-action-accepted`
- `notification.eco-action-accepted`
- `leaderboard.points-granted`
- `report.points-granted`
- `notification.badge-unlocked` nếu action làm unlock badge

Nếu event đã xử lý nhanh, `Ready`/`messages` thường là `0`. Đây không phải lỗi, mà là consumer đã xử lý xong.

Chạy terminal:

```powershell
docker exec microservices-se361-rabbitmq-1 rabbitmqctl list_queues name messages consumers
```

Nói:

> Sau khi approve, event đi qua RabbitMQ. Các queue còn 0 pending messages nghĩa là event đã được consumer xử lý hết. Đây là bằng chứng cho queue drain và event pipeline hoạt động.

#### Bước E - Show Reward Ledger cộng điểm

Quay lại Student -> `Wallet & Badges`.

Kiểm tra:

- Total points tăng.
- Transaction mới xuất hiện.
- Transaction có action/mission/reason tương ứng.
- Nếu đủ điều kiện, badge mới được unlock.

Nói:

> Reward Ledger là nguồn sự thật của điểm. Leaderboard chỉ đọc rank, không phải nguồn sự thật điểm. Reward dùng `sourceActionId` để tránh cộng điểm trùng nếu event bị gửi lại.

#### Bước F - Show Leaderboard cập nhật

Vào `Leaderboard`.

Kiểm tra:

- Student có điểm mới.
- Rank tuần/tháng thay đổi nếu đủ điểm.

Nói:

> Leaderboard consume `PointsGrantedEvent` và cập nhật Redis sorted set để truy vấn rank nhanh. Đây là read model tối ưu cho xếp hạng, không thay thế Reward Ledger.

#### Bước G - Show Notification

Nhấn chuông notification.

Kiểm tra có notification liên quan:

- Action accepted.
- Points granted/badge unlocked nếu có.

Nói:

> Notification Service consume event để tạo inbox riêng. Các service khác không ghi thẳng vào database notification.

#### Bước H - Show Report/Analytics nếu có thời gian

Login Admin:

```text
admin@ecoquest.local
EcoQuest@123
```

Vào `Analytics` hoặc `Reports`.

Chọn weekly/monthly report.

Nói:

> Report Service không join database của Action, Reward hay Recognition. Nó consume event để tự xây read model trong `report_db`, rồi dashboard/export PDF chỉ đọc từ read model này.

## 4. Demo certificate/coupon nếu còn thời gian

### Certificate

Vào Admin hoặc Leaderboard:

1. Close season.
2. Recognition nhận `leaderboard.season.closed`.
3. Recognition tạo certificate PDF.
4. PDF được lưu ở MinIO bucket `ecoquest-certificates`.
5. Student vào `Certificates` để xem preview/download.

Nói:

> Certificate không tạo ngay khi approve action. Nó được tạo theo season, sau khi Leaderboard đóng season và phát event cho Recognition.

### Coupon

Vào Student -> `Certificates` hoặc `Redeem Sustainability Rewards`.

Claim coupon đủ điều kiện.

Nói:

> Coupon là nghiệp vụ của Recognition. Recognition sở hữu reward offer, điều kiện nhận, stock, expiry và voucher claim. Claim trùng sẽ trả lại voucher cũ để đảm bảo idempotency.

## 5. Demo healthcheck, logs và observability

### Healthcheck

Show:

```text
http://localhost:18080/actuator/health
```

Nếu muốn show từng service:

```text
http://localhost:8081/actuator/health
http://localhost:8082/actuator/health
http://localhost:8083/actuator/health
...
```

Nói:

> Mỗi service có Actuator health/info endpoint. Docker Compose cũng có healthcheck cho PostgreSQL, MongoDB, Redis và RabbitMQ để đảm bảo dependency sẵn sàng.

### Logs

Chạy:

```powershell
docker compose logs --tail=80 api-gateway eco-action-service reward-ledger-service leaderboard-service notification-service
```

Nếu muốn theo dõi realtime:

```powershell
docker compose logs -f api-gateway eco-action-service reward-ledger-service
```

Nói:

> Hệ thống có log theo từng container. Gateway và common module có `X-Correlation-Id` để liên kết request khi debug. Production nên bổ sung OpenTelemetry, tracing, metrics và centralized logging.

## 6. Demo Redis nếu muốn show thêm công nghệ

Redis dùng cho:

- Draft action.
- Idempotency key chống double submit.
- Leaderboard sorted set theo tuần/tháng.

Lệnh tham khảo:

```powershell
docker exec microservices-se361-redis-1 redis-cli --scan --pattern "*"
```

Nếu muốn nói gọn:

> Redis không phải database chính. Nó dùng cho dữ liệu tạm, chống submit trùng và rank realtime để truy vấn nhanh.

## 7. Demo database ownership

Không nhất thiết phải mở database khi demo, nhưng nếu bị hỏi thì nói:

> Mỗi service có database riêng. Ví dụ Identity có `identity_db`, Catalog có `catalog_db`, Reward có `reward_db`, Report có `report_db`. Action dùng MongoDB `action_db`. Service khác không đọc trực tiếp database của service còn lại, chỉ dùng API hoặc event.

Các database PostgreSQL trong compose:

| Database | Service sở hữu |
| --- | --- |
| `identity_db` | Identity |
| `catalog_db` | Catalog |
| `policy_db` | Policy |
| `reward_db` | Reward |
| `leaderboard_db` | Leaderboard |
| `recognition_db` | Recognition |
| `report_db` | Report |
| `notification_db` | Notification |

Action dùng MongoDB:

| Database | Service sở hữu |
| --- | --- |
| `action_db` | Eco Action |

## 8. Demo kiểm thử Backend, Frontend và RabbitMQ

Phần này nên demo sau luồng submit -> approve -> cộng điểm, vì khi đó giảng viên đã thấy nghiệp vụ chạy thật. Test sẽ chứng minh hệ thống không chỉ thao tác tay được, mà có kiểm thử tự động bao phủ các luồng chính.

### 8.1. Backend smoke test chạy như thế nào?

Điều kiện trước khi chạy:

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361
$env:API_GATEWAY_PORT='18080'
docker compose up -d
docker compose ps
```

Lệnh backend smoke test đầy đủ:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090 -Web http://localhost:3000
```

Nếu muốn chạy nhanh hơn và bỏ qua riêng case upload payload lớn qua web Nginx proxy:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090
```

Nói khi chạy:

> Đây là smoke test tích hợp end-to-end. Script không chỉ test một endpoint riêng lẻ, mà gọi qua Gateway và kiểm tra nhiều service phối hợp với nhau: Auth, Catalog, Policy gRPC, Action, Reward, Leaderboard, Recognition, Report, Notification, MinIO, Redis và RabbitMQ.

Các nhóm test backend đang bao phủ:

| Nhóm | Nội dung kiểm |
| --- | --- |
| Gateway | `/actuator/health` phải `UP` |
| Identity/Auth | login, verify email, forgot/reset password, profile/avatar, user role/status |
| Catalog | mission/station/badge seed và CRUD |
| Policy | direct admin API `8090`, create/update/delete rule, Gateway không public Policy Admin |
| Action | draft Redis, idempotency, upload nhiều ảnh/một video, submit vào `PENDING_REVIEW` |
| Review Gate | submit chưa cộng điểm, approve mới `ACCEPTED`, reject không cộng điểm |
| Reward | wallet, transaction theo `sourceActionId`, badge, adjust points |
| Leaderboard | weekly/monthly rank, previous periods, close season idempotent |
| Recognition | certificate PDF, reward offer CRUD, coupon eligibility, claim voucher idempotent |
| Report | create/review report, analytics tuần/tháng/năm, export PDF |
| Notification | seeded inbox, mark read/read-all, notification từ event |
| RabbitMQ | queue có consumer và sau test pending messages = 0 |

Kết quả mong muốn cuối script:

```text
EcoQuest backend smoke test PASSED
```

Nếu giảng viên hỏi “test này chứng minh điều gì?”, trả lời:

> Test này chứng minh luồng tích hợp giữa nhiều microservices hoạt động đúng. Đặc biệt, submit hợp lệ chỉ vào review queue; approve mới publish event; Reward mới cộng điểm; Leaderboard, Report và Notification cập nhật qua RabbitMQ; certificate/coupon cũng được kiểm qua Recognition.

### 8.2. Show kết quả backend smoke test ở đâu?

Có ba cách show:

1. Show trực tiếp output terminal sau khi chạy script.
2. Mở file hướng dẫn test: `docs/backend-smoke-test-guide.md`.
3. Mở README phần `Build And Test` và `Verification snapshot`.

Nên show terminal là chính. Khi thấy `PASSED`, kéo lên một ít để chỉ các đoạn:

- `Checking Gateway health`.
- `Checking evidence upload to MinIO through Action service`.
- `Checking submit queues action for review before Reward, badges, and Leaderboard`.
- `Checking RabbitMQ queues are drained`.

Nói:

> Em ưu tiên test qua Gateway để giống đường đi thật của frontend. Riêng Policy Admin API được gọi trực tiếp qua `8090` vì đây là API admin nội bộ, không public qua Gateway.

### 8.3. Cleanup dữ liệu test sau khi chạy

Sau smoke test, script có thể tạo dữ liệu E2E. Muốn dọn dữ liệu test nhưng giữ seed/demo data:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\cleanup-smoke-test-data.ps1
```

Nói:

> Dữ liệu test có tiền tố E2E/SV_E2E sẽ được dọn bằng cleanup script để database trở về trạng thái demo sạch. Seed data và dữ liệu thao tác UI thông thường vẫn được giữ.

### 8.4. Frontend test chạy như thế nào?

Chạy:

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361\web-apps\ecoquest-web
npm.cmd test
```

Build production:

```powershell
npm.cmd run build
```

Nói khi chạy:

> Frontend test hiện tập trung vào logic UI quan trọng: role panel, dashboard partial loading, login error message, reporting range guard, leaderboard period selector, evidence validation nhiều ảnh/một video, Policy modal và idempotency key fallback.

Kết quả mong muốn:

```text
tests 16
pass 16
fail 0
```

Với build production, kết quả mong muốn:

```text
vite v...
✓ built in ...
```

Nếu không muốn chạy live vì mất thời gian, có thể mở README và nói:

> Lần kiểm gần nhất frontend unit test đạt 16/16 PASS và production build pass. Khi demo trực tiếp, em có thể chạy lại `npm.cmd test` để xác nhận.

### 8.5. Show RabbitMQ test như thế nào?

Sau khi chạy backend smoke test hoặc sau khi demo approve action, chạy:

```powershell
docker exec microservices-se361-rabbitmq-1 rabbitmqctl list_queues name messages consumers
```

Kết quả cần chỉ:

```text
reward.eco-action-accepted       0    1
leaderboard.points-granted       0    1
recognition.season-closed        0    1
report.eco-action-accepted       0    1
notification.eco-action-accepted 0    1
```

Ý nghĩa:

- Cột `messages = 0`: không có event bị kẹt.
- Cột `consumers >= 1`: có service đang lắng nghe queue.

Mở RabbitMQ UI:

```text
http://localhost:15672
guest / guest
```

Show:

1. `Exchanges` -> `ecoquest.events`.
2. `Bindings` để thấy routing key như `eco.action.accepted`, `reward.points.granted`, `leaderboard.season.closed`.
3. `Queues and Streams` để thấy các queue `reward.*`, `leaderboard.*`, `recognition.*`, `report.*`, `notification.*`.
4. Cột `Ready`/`Unacked` bằng 0 sau khi consumer xử lý xong.

Nói:

> RabbitMQ queue drain là bằng chứng event pipeline chạy xong. Nếu queue còn pending message, nghĩa là có consumer chưa xử lý hoặc service bị lỗi. Trong smoke test, các queue chính đều có consumer và pending message về 0.

### 8.6. Show backend health và log sau test

Health:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:18080/actuator/health
```

Hoặc mở browser:

```text
http://localhost:18080/actuator/health
```

Log:

```powershell
docker compose logs --tail=120 api-gateway eco-action-service reward-ledger-service leaderboard-service recognition-service report-service notification-service
```

Nếu muốn lọc lỗi:

```powershell
docker compose logs --tail=200 api-gateway eco-action-service reward-ledger-service leaderboard-service recognition-service report-service notification-service | Select-String -Pattern "ERROR|Exception|Failed"
```

Nói:

> Sau test, em kiểm health và log để đảm bảo service không chỉ trả kết quả đúng mà runtime cũng không phát sinh lỗi nghiêm trọng.

### 8.7. Thứ tự demo test gợi ý

Nếu chỉ có 3-5 phút cho phần test:

1. Chạy hoặc show `backend-smoke-test.ps1`.
2. Chỉ dòng `EcoQuest backend smoke test PASSED`.
3. Chạy `rabbitmqctl list_queues name messages consumers`.
4. Chỉ `messages = 0`, `consumers = 1`.
5. Chạy `npm.cmd test` hoặc show kết quả frontend `16/16 PASS`.
6. Nói kết luận:

> Backend smoke test kiểm luồng tích hợp giữa các service. Frontend test kiểm logic UI/role/upload/report. RabbitMQ queue drain chứng minh event không bị kẹt. Ba phần này kết hợp lại xác nhận hệ thống chạy đúng từ UI đến backend và messaging.

## 9. Đánh giá theo các nguyên tắc microservices

### 9.1. Tách theo business capability, không tách theo technical layer

Trạng thái: **Đáp ứng tốt trong phạm vi project.**

Project không tách kiểu `DatabaseService`, `EmailService`, `FileService`. Các service hiện tại là business capability:

- Identity Access: xác thực, phân quyền, profile.
- Green Catalog: mission, station, badge definition.
- Eco Action: submit action, evidence, review queue.
- Verification Policy: rule evaluation.
- Reward Ledger: wallet, transaction, badge.
- Leaderboard: rank và season snapshot.
- Recognition: certificate, coupon/reward offer.
- Report: workflow report và analytics read model.
- Notification: inbox, notification realtime.

Câu nói khi vấn đáp:

> Em tách service theo năng lực nghiệp vụ, không tách theo layer kỹ thuật. Ví dụ upload file không thành một FileService chung, mà service nào sở hữu nghiệp vụ thì service đó sở hữu file tương ứng trong MinIO.

### 9.2. Database ownership

Trạng thái: **Đáp ứng.**

Mỗi service có database/storage riêng. Service khác không ghi trực tiếp vào database của service còn lại.

Ví dụ:

- Action không ghi thẳng vào `reward_db`; Action publish event, Reward tự cộng điểm.
- Report không join database của Action/Reward; Report consume event và tự dựng read model.
- Recognition không đọc trực tiếp leaderboard DB để tạo certificate; Recognition nhận event close season.

Câu nói khi vấn đáp:

> Các ID như `studentId`, `missionId`, `sourceActionId` chỉ là tham chiếu logic. Hệ thống không dùng foreign key vật lý xuyên service.

### 9.3. Không share domain model giữa services

Trạng thái: **Đáp ứng ở mức kiến trúc project.**

Các service không dùng chung entity domain của nhau. Mỗi service có model/entity riêng trong module của chính nó.

Phần được share có chủ ý:

- `building-blocks/messaging`: event contract dùng chung như `EcoActionAcceptedEvent`, `PointsGrantedEvent`.
- `building-blocks/security/common`: helper chung cho JWT/correlation/common concern.

Đây không phải share domain entity. Đây là share contract/infrastructure nhỏ để các service giao tiếp thống nhất.

Câu nói khi vấn đáp:

> Project không share domain model như `EcoActionEntity` hoặc `RewardTransactionEntity` giữa service. Chỉ share event contract và helper hạ tầng, còn domain model vẫn thuộc service sở hữu.

### 9.4. Contract phải ổn định

Trạng thái: **Đáp ứng ở mức demo/coursework, nhưng production nên nâng cấp thêm versioning/OpenAPI.**

Hiện project có:

- API contract cố định qua Gateway.
- Event routing key cố định trong `EcoQuestRabbit`.
- Event record dùng chung trong `building-blocks/messaging`.
- Có backward compatibility cho evidence: `evidenceUrl` vẫn giữ URL đầu tiên cho client cũ, còn client mới dùng `evidenceUrls`.

Điểm cần nói trung thực:

- Chưa có API versioning kiểu `/v1`, `/v2` cho toàn bộ endpoint.
- Chưa có contract test/OpenAPI đầy đủ cho mọi service.

Câu nói khi vấn đáp:

> Trong phạm vi đồ án, contract đã được giữ ổn định bằng event contract và endpoint cố định. Nếu production, em sẽ bổ sung OpenAPI, contract test và versioning để tránh breaking changes.

### 9.5. Chấp nhận eventual consistency

Trạng thái: **Đáp ứng.**

Project không dùng distributed transaction/2PC. Các service đồng bộ dần qua event:

1. Action approve trước.
2. Reward cộng điểm sau khi consume `ActionAcceptedEvent`.
3. Reward phát `PointsGrantedEvent`.
4. Leaderboard cập nhật rank.
5. Report/Notification cập nhật read model/inbox.
6. Recognition tạo certificate khi close season.

Câu nói khi vấn đáp:

> Sau approve, ví điểm, leaderboard, report và notification có thể cập nhật lệch nhau một khoảng rất ngắn. Đây là eventual consistency, đổi lại hệ thống giảm coupling và không cần transaction phân tán.

### 9.6. Mỗi service phải observable

Trạng thái: **Đáp ứng mức demo, chưa đầy đủ production observability.**

Đã có:

- Spring Boot Actuator `/actuator/health`, `/actuator/info`.
- Docker Compose healthcheck cho PostgreSQL, MongoDB, Redis, RabbitMQ.
- Docker logs theo từng service.
- `X-Correlation-Id` ở Gateway và common filter.
- RabbitMQ Management UI quan sát queue, consumer, pending messages.
- MinIO Console quan sát object storage.

Chưa production-grade:

- Chưa có OpenTelemetry distributed tracing.
- Chưa có Prometheus/Grafana metrics.
- Chưa có centralized logging như ELK/Loki.

Câu nói khi vấn đáp:

> Project đã có healthcheck, log, correlation ID và dashboard hạ tầng để demo/kiểm thử. Nếu triển khai production, em sẽ bổ sung OpenTelemetry, metrics và centralized logging.

### 9.7. Idempotency

Trạng thái: **Đáp ứng.**

Các điểm idempotency chính:

- Action dùng Redis idempotency key để chống double submit. Gửi lại cùng key trả `409`.
- Reward dùng unique `sourceActionId` để tránh cộng điểm trùng.
- Leaderboard close season idempotent theo `seasonId`.
- Recognition coupon claim idempotent theo `studentId + rewardId`, bấm lại không phát voucher mới.
- Smoke test có kiểm duplicate idempotency key và queue drain.

Câu nói khi vấn đáp:

> Vì RabbitMQ là at-least-once delivery, consumer phải xử lý an toàn khi event bị gửi lại. Reward dùng `sourceActionId` để đảm bảo một action chỉ được cộng điểm một lần.

## 10. Kết luận ngắn để nói sau demo

Có thể kết bằng đoạn này:

> Luồng demo vừa rồi cho thấy hệ thống đáp ứng các nguyên tắc microservices chính: tách theo business capability, database-per-service, không share domain model, giao tiếp qua contract, chấp nhận eventual consistency, có healthcheck/log/queue monitoring và có idempotency. Submit action không cộng điểm ngay, mà phải qua review; sau approve, RabbitMQ event kích hoạt Reward, Leaderboard, Report và Notification. File minh chứng được lưu qua MinIO bởi service sở hữu. Vì vậy EcoQuest không chỉ là giao diện CRUD, mà là một hệ thống microservices có luồng nghiệp vụ và hạ tầng phân tán rõ ràng.

## 11. Checklist trước khi vào phòng báo cáo

- [ ] `docker compose ps` thấy container chạy ổn.
- [ ] `http://localhost:3000` mở được.
- [ ] `http://localhost:18080/actuator/health` trả `UP`.
- [ ] Backend smoke test `PASSED` hoặc có ảnh/output gần nhất để show.
- [ ] Frontend `npm.cmd test` đạt 16/16 PASS và `npm.cmd run build` pass.
- [ ] RabbitMQ UI đăng nhập được bằng `guest/guest`.
- [ ] MinIO Console đăng nhập được bằng `minioadmin/minioadmin`.
- [ ] Student/Moderator/Admin login được bằng `EcoQuest@123`.
- [ ] Student có ít nhất một mission `ACTIVE` để submit.
- [ ] Moderator/Admin thấy Review Queue.
- [ ] Sau approve, Wallet/Leaderboard/Notification cập nhật.
- [ ] RabbitMQ queue có consumer và pending message về 0.
- [ ] Nếu demo certificate/coupon, Student có certificate/reward offer để show.
