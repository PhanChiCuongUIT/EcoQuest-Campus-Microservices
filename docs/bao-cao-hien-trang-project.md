# Báo Cáo Hiện Trạng Project EcoQuest Campus

Cập nhật: 2026-09-21. [Chi tiết chạy và kiểm thử](chay-lai-project.md).

Bản mới sửa Policy Rules sang proxy cùng origin, bỏ ghi chú kỹ thuật khỏi UI và bổ sung validation CRUD. Lỗi nghiệp vụ được trả bằng JSON có `detail`/`message`; quét sai station hiển thị lý do cụ thể. Bộ lọc JWT không còn đổi lỗi xử lý backend thành lỗi đăng nhập 401. Catalog yêu cầu `actionType` khi tạo/sửa mission. Các thay đổi giữ nguyên 9 microservice và quyền sở hữu database; xem [phạm vi test mới](backend-smoke-test-guide.md#phạm-vi-bổ-sung-ngày-21092026).

Lượt rà soát tiếp theo sửa trạng thái lỗi tải Users/Reports/Analytics, tra hạng và coupon; không hiển thị lỗi thành danh sách trống hoặc redemption đang chờ. Notification có polling dự phòng 30 giây, gộp SSE trùng theo ID và báo lỗi khi đánh dấu đọc thất bại. Adjust Points không cho dùng số dư của sinh viên trước nếu tải ví mới lỗi. Leaderboard chống nhận trùng grant bằng Redis Lua, cập nhật điểm tuần/tháng cùng thao tác; xem [cơ chế và giới hạn](cong-nghe-microservices.md#7-redis).

Hệ thống vẫn có 9 microservice. Bản cập nhật bổ sung named volume cho các kho dữ liệu, Redis AOF, sửa seed ghi đè dữ liệu khi restart và thêm `refresh-demo-data.ps1` để tạo hoạt động trong ngày qua API. Các số liệu kiểm thử tháng 7 bên dưới là lịch sử, không đại diện cho lần chạy mới.

Chi tiết database, use case, frontend và nội dung dùng để viết báo cáo DOCX nằm ở `tai-lieu-nguon-bao-cao-docx.md`; phần luồng nghiệp vụ và bảng/collection theo từng service nằm ở `luong-nghiep-vu-database.md`; phần công nghệ microservices, cách chạy, cách show khi báo cáo và câu hỏi phản biện nằm ở `cam-nang-bao-cao-microservices.md`.

## 1. Mục Tiêu Hệ Thống

EcoQuest Campus là hệ thống gamification cho hoạt động xanh trong trường học. Student tham gia mission, submit hành động xanh, upload minh chứng bằng nhiều ảnh hoặc một video, nhận điểm, badge, certificate và coupon. Moderator duyệt action/report và tạo mission ở trạng thái pending. Admin quản trị hệ thống, duyệt catalog, quản lý user/policy/điểm, đóng season và xem báo cáo tuần/tháng/năm.

## 2. Hiện Trạng Microservices

Backend hiện có 9 microservice, mỗi service có database hoặc storage riêng, không đọc database của service khác:

| Service | Trách nhiệm | Storage chính |
| --- | --- | --- |
| Identity Access | Đăng ký, xác minh email, đăng nhập, quên/reset mật khẩu, profile/avatar, user role/status | PostgreSQL `identity_db`, MinIO avatar |
| Green Catalog | Mission, station, badge definition, ảnh station, workflow mission pending/active/rejected | PostgreSQL `catalog_db`, MinIO station image |
| Eco Action | Draft Redis, evidence upload nhiều ảnh/một video, submit action, idempotency, moderator review, outbox | MongoDB `action_db`, Redis, MinIO evidence |
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
4. Action lưu MongoDB với trạng thái `PENDING_REVIEW`, dùng Redis chống duplicate idempotency; chưa cộng điểm.
5. Moderator/Admin approve trong Review Queue thì Action chuyển `ACCEPTED` và publish accepted event qua RabbitMQ; reject thì không publish accepted event.
6. Reward cộng điểm, unlock badge; Leaderboard update rank; Report update analytics; Notification tạo thông báo sau event accepted/rejected tương ứng.

### Badge, Certificate, Coupon

- Badge được Reward Ledger phát khi đủ điểm hoặc đủ số lần action theo `BadgeDefinition`.
- Certificate được Recognition tạo khi Admin close season ở Leaderboard. Recognition render PDF A4 ngang và lưu MinIO.
- Coupon là luồng thật trong Recognition:
  - Admin quản trị `RewardOffer`.
  - Student xem offer qua `GET /recognitions/rewards?studentId=...`.
  - Recognition xét badge, certificate, stock, expiry, giữ stock và lưu claim pending.
  - Reward kiểm và debit điểm tiêu dùng qua yêu cầu RabbitMQ; tổng thành tích và leaderboard không giảm.
  - Debit thành công mới tạo voucher `ECO-...`; thất bại chuyển claim failed và hoàn stock. Claim pending/issued lặp không trừ stock hoặc điểm lần hai.

### Report Và Analytics

1. Student/Moderator tạo report cho user, mission hoặc action.
2. Report service lưu DB riêng và evidence trong MinIO riêng.
3. Moderator/Admin review report.
4. Report analytics không đọc DB chéo; nó consume event từ Identity, Catalog, Action, Reward, Recognition.
5. Admin xem dashboard/báo cáo tuần/tháng/năm, chọn range hợp lệ, không chọn kỳ tương lai.
6. Admin export PDF cho một tuần/tháng/năm được chọn.

## 4. Dữ Liệu Seed Hiện Tại

Trên bộ volume mới, hệ thống khởi tạo dữ liệu mẫu dưới đây. Không cần xóa volume để cập nhật hoạt động hiện tại; dùng `scripts/refresh-demo-data.ps1` để bổ sung qua API và giữ dữ liệu đã thao tác.

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

Audit ngày 19/09/2026 sau cleanup và refresh: **12 tài khoản, 18 mission, 66 action** (50 đã duyệt, 13 chờ duyệt, 3 từ chối). Leaderboard tuần/tháng hiện tại có 10 sinh viên và không còn dòng E2E. Seed khi restart không đặt lại role, điểm đã điều chỉnh, cấu hình badge/mission hoặc stock reward.

## 5. Công Nghệ Chính

- Java 21, Spring Boot 3, Spring Security JWT.
- Spring Cloud Gateway.
- PostgreSQL database-per-service.
- MongoDB cho action document/outbox.
- Redis cho draft, idempotency và leaderboard sorted set theo kỳ `weekly:YYYY-Www`, `monthly:YYYY-MM`.
- RabbitMQ event-driven architecture với 23 queue: bổ sung đồng bộ badge, yêu cầu debit coupon và kết quả debit.
- MinIO object storage cho avatar, station image, action evidence nhiều ảnh/một video, report evidence, certificate PDF.
- gRPC cho Action -> Policy.
- Resilience4j cho Policy gRPC client.
- Flyway và MapStruct ở Identity; một số service cũ còn dùng Hibernate schema bootstrap.
- React/Vite frontend, Nginx same-origin proxy. Nginx/Gateway cho phép evidence body 100MB để upload ảnh/video base64 qua `localhost:3000` không bị HTTP 413.
- Docker Compose chạy toàn bộ local stack.

## 6. Kiểm Thử Đã Chạy

Ngày 22/09/2026: 34 Java test riêng biệt PASS (30 ở reactor và 4 Notification mới sau khi build lại module), 28 unit test frontend, production build, 22 Playwright case desktop/mobile và integration Redis chống trùng PASS. Browser gồm cả lỗi API giả lập lẫn SSE thật; không thay thế thử tải hoặc fault-injection broker/database. [Kết quả và cách chạy](chay-lai-project.md#7-kết-quả-xác-minh).

Ngày 20/09/2026: bổ sung QR station và receipt bắt buộc cho mission cần station; Catalog badge CRUD/ảnh/quy tắc động; coupon debit bất đồng bộ từ điểm tiêu dùng; ledger hiển thị lý do/tên mission. Maven 14 module, 17 unit test PASS; frontend 20 unit test và 6 Playwright case desktop/mobile PASS; production build và full backend smoke PASS. Gateway được build lại riêng để sửa DNS cache sau kiểm thử restart. Xem [contract, dữ liệu, luồng nghiệp vụ và giới hạn kiểm chứng](station-qr-wallet-badges.md).

Lượt rà CRUD sau đó: sửa trạng thái mission khi Admin chỉnh nội dung và bổ sung integration event khi đổi trạng thái qua form. Có thêm 3 test Java, tổng 20; Catalog được build/test lại 10/10 PASS và full smoke PASS. Không thay đổi frontend hay database ownership trong bản sửa này.

Mốc lịch sử 19/09/2026: Maven 14/14 module và 4 unit test seed PASS; frontend 16/16 test và build PASS; full backend smoke qua Gateway/web proxy PASS; refresh cùng ngày không tạo trùng; restart 6 service giữ nguyên 9 nhóm snapshot API; 20 queue drained. Các kết quả dưới đây thuộc mốc kiểm thử cũ, không phải số lượng test/queue hiện tại. Xem [phạm vi và giới hạn kiểm chứng](chay-lai-project.md#7-kết-quả-xác-minh).

Ngày 02/07/2026:

- Maven targeted reactor Action + dependencies: PASS.
- Backend smoke test `scripts/backend-smoke-test.ps1`: PASS.
- Frontend unit test: 16/16 PASS.
- Frontend production build: PASS.
- RabbitMQ: 20 queue, 0 pending message, mỗi queue có 1 consumer.
- Smoke test đã kiểm auth, role boundary, upload media, upload lớn qua Nginx web proxy, Catalog CRUD, Policy CRUD, Action submit/review với nhiều ảnh hoặc một video, valid submit -> `PENDING_REVIEW` -> approve mới cộng điểm, reject batch trộn ảnh/video, Reward/badge, Leaderboard hiện tại và kỳ cũ, Report/analytics/export, Notification seeded inbox/recipient guard/read-all/event notification, Recognition certificate PDF, RewardOffer CRUD và coupon claim thật.
- Final audit sau reset sạch: Gateway `UP`, 15 mission, 12 user demo, 36 action demo, 0 user/action E2E, Student/Moderator/Admin notification seed có dữ liệu, RabbitMQ 20 queue đều drained.

## 7. Giới Hạn Còn Lại

- Gmail thật phụ thuộc SMTP/App Password trong `.env` và deliverability của Gmail; code SMTP đã sẵn.
- Cloudinary chưa dùng vì MinIO đã đủ cho local microservice ownership.
- Full Flyway cho mọi service cũ là production hardening backlog.
- Analytics hiện là read model nội bộ, chưa phải data warehouse/BI riêng.
