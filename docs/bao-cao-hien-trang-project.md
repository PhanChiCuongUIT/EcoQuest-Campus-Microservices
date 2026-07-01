# Báo Cáo Hiện Trạng Project EcoQuest Campus

Cập nhật: 2026-07-01

## 1. Mục Tiêu Hệ Thống

EcoQuest Campus là hệ thống gamification cho hoạt động xanh trong trường học. Student tham gia mission, submit hành động xanh, upload minh chứng, nhận điểm, badge, certificate và coupon. Moderator duyệt action/report và tạo mission ở trạng thái pending. Admin quản trị hệ thống, duyệt catalog, quản lý user/policy/điểm, đóng season và xem báo cáo tuần/tháng/năm.

## 2. Hiện Trạng Microservices

Backend hiện có 9 microservice, mỗi service có database hoặc storage riêng, không đọc database của service khác:

| Service | Trách nhiệm | Storage chính |
| --- | --- | --- |
| Identity Access | Đăng ký, xác minh email, đăng nhập, quên/reset mật khẩu, profile/avatar, user role/status | PostgreSQL `identity_db`, MinIO avatar |
| Green Catalog | Mission, station, badge definition, ảnh station, workflow mission pending/active/rejected | PostgreSQL `catalog_db`, MinIO station image |
| Eco Action | Draft Redis, evidence upload, submit action, idempotency, moderator review, outbox | MongoDB `action_db`, Redis, MinIO evidence |
| Verification Policy | Rule policy, daily limit, evidence/station requirement, gRPC evaluation | PostgreSQL `policy_db` |
| Reward Ledger | Wallet, transaction, badge achievement, adjust points có audit | PostgreSQL `reward_db` |
| Leaderboard | Weekly/monthly ranking theo kỳ, xem tuần/tháng cũ trong năm, close season, snapshot winner | Redis, PostgreSQL `leaderboard_db` |
| Recognition | Certificate PDF, reward offer catalog, coupon eligibility/claim voucher | PostgreSQL `recognition_db`, MinIO certificate |
| Report | User/mission/action report, report evidence, analytics read model, PDF export | PostgreSQL `report_db`, MinIO report evidence |
| Notification | Inbox, mark read/read all, SSE realtime, event notification | PostgreSQL `notification_db` |

Gateway chỉ route API, CORS và correlation ID. Gateway không chứa nghiệp vụ cộng điểm, xét policy, tạo certificate hay phát coupon.

## 3. Luồng Use Case Chính

### Auth Và Role

1. User đăng ký tài khoản student.
2. Identity gửi email xác minh hoặc trả token local khi chạy demo.
3. User xác minh email rồi đăng nhập để nhận JWT.
4. Backend enforce JWT ở từng service.
5. Role:
   - Student chỉ thao tác dữ liệu của chính mình.
   - Moderator có panel riêng, duyệt action/report và tạo mission pending; không được duyệt action của chính mình.
   - Admin quản trị hệ thống; không được đổi role/status/delete chính mình.

### Submit Action

1. Student chọn mission `ACTIVE`.
2. Action service kiểm tra mission với Catalog.
3. Action gọi Policy service bằng gRPC để xét evidence/station/daily limit/points.
4. Action lưu MongoDB, dùng Redis chống duplicate idempotency.
5. Action publish event qua RabbitMQ.
6. Reward cộng điểm, unlock badge; Leaderboard update rank; Report update analytics; Notification tạo thông báo.

### Badge, Certificate, Coupon

- Badge được Reward Ledger phát khi đủ điểm hoặc đủ số lần action theo `BadgeDefinition`.
- Certificate được Recognition tạo khi Admin close season ở Leaderboard. Recognition render PDF A4 ngang và lưu MinIO.
- Coupon là luồng thật trong Recognition:
  - Admin quản trị `RewardOffer`.
  - Student xem offer qua `GET /recognitions/rewards?studentId=...`.
  - Backend xét điểm, badge, certificate, stock, expiry.
  - Claim thành công tạo `RewardClaim` với voucher code `ECO-...`.
  - Claim lại cùng reward trả voucher cũ, không trừ stock lần hai.

### Report Và Analytics

1. Student/Moderator tạo report cho user, mission hoặc action.
2. Report service lưu DB riêng và evidence trong MinIO riêng.
3. Moderator/Admin review report.
4. Report analytics không đọc DB chéo; nó consume event từ Identity, Catalog, Action, Reward, Recognition.
5. Admin xem dashboard/báo cáo tuần/tháng/năm, chọn range hợp lệ, không chọn kỳ tương lai.
6. Admin export PDF cho một tuần/tháng/năm được chọn.

## 4. Dữ Liệu Seed Hiện Tại

Sau `docker compose down -v` và `docker compose up -d --build`, hệ thống seed dữ liệu demo sạch:

- 12 demo users: 10 student, 1 moderator, 1 admin.
- 15 mission, 7 station, 6 badge definition.
- 15 policy rule.
- Ít nhất 36 submit action ở tuần/tháng hiện tại và nhiều mốc tuần/tháng/năm.
- Wallet, transaction, badge achievement, leaderboard, certificate, report và analytics read model.
- Reward offer/coupon: cafe voucher, library extension, eco kit, merch coupon với điều kiện và stock khác nhau.
- Notification inbox: Student có 4 thông báo mẫu, Moderator có 3 thông báo mẫu, Admin có 3 thông báo mẫu; notification mới vẫn được tạo thật từ RabbitMQ events khi submit action, unlock badge, issue certificate, tạo/review report, đổi mission/user status.

Demo accounts:

| Role | Email | Password | Student ID |
| --- | --- | --- | --- |
| Student | `student@ecoquest.local` | `EcoQuest@123` | `SV001` |
| Moderator | `moderator@ecoquest.local` | `EcoQuest@123` | `SVMOD001` |
| Admin | `admin@ecoquest.local` | `EcoQuest@123` | none |

## 5. Công Nghệ Chính

- Java 21, Spring Boot 3, Spring Security JWT.
- Spring Cloud Gateway.
- PostgreSQL database-per-service.
- MongoDB cho action document/outbox.
- Redis cho draft, idempotency và leaderboard sorted set theo kỳ `weekly:YYYY-Www`, `monthly:YYYY-MM`.
- RabbitMQ event-driven architecture với 20 queue.
- MinIO object storage cho avatar, station image, action evidence, report evidence, certificate PDF.
- gRPC cho Action -> Policy.
- Resilience4j cho Policy gRPC client.
- Flyway và MapStruct ở Identity; một số service cũ còn dùng Hibernate schema bootstrap.
- React/Vite frontend, Nginx same-origin proxy.
- Docker Compose chạy toàn bộ local stack.

## 6. Kiểm Thử Đã Chạy

Ngày 01/07/2026:

- Maven targeted reactor Recognition + dependencies: PASS.
- Backend smoke test `scripts/backend-smoke-test.ps1`: PASS.
- Frontend unit test: 12/12 PASS.
- Frontend production build: PASS.
- RabbitMQ: 20 queue, 0 pending message, mỗi queue có 1 consumer.
- Smoke test đã kiểm auth, role boundary, upload media, Catalog CRUD, Policy CRUD, Action submit/review, Reward/badge, Leaderboard hiện tại và kỳ cũ, Report/analytics/export, Notification seeded inbox/recipient guard/read-all/event notification, Recognition certificate PDF, RewardOffer CRUD và coupon claim thật.
- Final audit sau reset sạch: Gateway `UP`, 15 mission, 12 user demo, 0 user/action E2E, Student/Moderator/Admin notification seed có dữ liệu, RabbitMQ 20 queue đều drained.

## 7. Giới Hạn Còn Lại

- Gmail thật phụ thuộc SMTP/App Password trong `.env` và deliverability của Gmail; code SMTP đã sẵn.
- Cloudinary chưa dùng vì MinIO đã đủ cho local microservice ownership.
- Full Flyway cho mọi service cũ là production hardening backlog.
- Analytics hiện là read model nội bộ, chưa phải data warehouse/BI riêng.
