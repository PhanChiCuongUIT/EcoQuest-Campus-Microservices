# Báo Cáo Đối Chiếu Note SE361

Cập nhật: 2026-06-25

Tài liệu này đối chiếu project với file `Note SE361 - Microservices (2).docx`. File note có 46 gạch đầu dòng, trong đó 2 dòng là ảnh minh họa, nên bảng dưới theo dõi 44 ý chức năng cần xử lý. Trạng thái hiện tại: backend có 9 microservice tách ownership rõ ràng, frontend đã có các màn hình chính theo vai trò, upload ảnh dùng MinIO theo từng service, SMTP đã có code và cấu hình nhưng `.env` hiện đang để `IDENTITY_MAIL_ENABLED=false`.

## Tổng Quan Hiện Trạng

- Microservices backend: đạt. Gồm Identity, Catalog, Action, Policy gRPC, Reward Ledger, Leaderboard, Recognition, Report, Notification.
- Auth và phân quyền: đạt. Student chỉ có chức năng Student; Moderator có Student + Moderator; Admin có Moderator + Admin, không có quyền tự submit action như Student.
- Upload ảnh: đạt ở môi trường local. Avatar, ảnh station, evidence action, evidence report và certificate đều được lưu bởi service sở hữu dữ liệu qua MinIO.
- Certificate PDF: đã sửa và đã render kiểm tra lại. Download PDF giờ render theo layout certificate preview dạng A4 ngang, có nền giấy, viền kép, metric strip, seal và chữ ký.
- Email thật: code SMTP đã sẵn, nhưng `.env` hiện đang để `IDENTITY_MAIL_ENABLED=false` nên hệ thống đang chạy local-token mode. Muốn gửi Gmail thật cần đổi biến này thành `true`, đặt `IDENTITY_MAIL_FROM`/`SMTP_USERNAME` là Gmail gửi thật, dùng Gmail App Password hợp lệ, và có thể bật `IDENTITY_MAIL_HEALTH_ENABLED=true` để Actuator kiểm tra SMTP.
- Cloudinary: chưa cần cho bản local microservices. Project đang dùng MinIO để đảm bảo mỗi service sở hữu file của mình; chỉ cần Cloudinary khi deploy public và muốn CDN ngoài.

## 44 Ý Chức Năng Trong Note

| # | Yêu cầu trong note | Trạng thái | Ghi chú triển khai |
| --- | --- | --- | --- |
| 1 | Notification realtime | Đã có | `notification-service` có inbox, mark read/read all, SSE stream và consumer RabbitMQ cho action, badge, certificate, mission, report, user events. |
| 2 | Report | Đã có | `report-service` sở hữu DB report, API tạo report, report của tôi, queue review, duyệt/từ chối và upload evidence. |
| 3 | Profile | Đã có | Identity sở hữu cập nhật profile và upload avatar; frontend Profile có preview, validation và cập nhật session ngay. |
| 4 | Báo cáo/analytics | Đã có | Report service có read model analytics từ RabbitMQ, hỗ trợ weekly/monthly/yearly/all. |
| 5 | Download PDF đúng như preview | Đã sửa | Recognition render PDF landscape mới khi download: nền giấy, viền kép, tiêu đề, người nhận, metric strip, seal và chữ ký. |
| 6 | Phân auth Student/Moderator/Admin rõ ràng | Đã có | JWT enforced ở các service; role inheritance theo đúng note. |
| 7 | Đăng ký phải xác nhận email | Đã có | Register tạo user chưa verify; verify/resend có API. SMTP thật chỉ gửi khi bật `IDENTITY_MAIL_ENABLED=true`. |
| 8 | Quên mật khẩu gửi link reset | Đã có | Forgot/reset token flow đã triển khai, token dùng một lần. |
| 9 | Policy rules admin bị lỗi không reach `8090` | Đã xử lý theo kiến trúc | Policy admin API là direct admin tool tại `http://localhost:8090`, không public qua Gateway. Frontend hiển thị cảnh báo khi service local chưa chạy. |
| 10 | User có avatar URL/upload avatar | Đã có | `POST /auth/me/avatar` lưu vào Identity-owned MinIO bucket và trả `/auth/media/avatars/...`. |
| 11 | User status active/inactive/banned | Đã có | Identity hỗ trợ status; inactive/banned không đăng nhập được; Admin UI quản lý status. |
| 12 | Upload ảnh có bền không khi đăng nhập máy khác | Đã có | Ảnh là URL backend qua Gateway, không còn base64 trong browser state; máy khác cùng truy cập hệ thống sẽ xem được. |
| 13 | Thêm phần reports | Đã có | Student/Moderator tạo report; Moderator/Admin review; Admin xem analytics. |
| 14 | Notification theo vai trò | Đã có | Student nhận action/badge/certificate/report; Moderator nhận thêm queue liên quan; Admin nhận thông báo hệ thống/user/report. |
| 15 | Mission status pending/active/rejected/cancelled/completed | Đã có | Catalog hỗ trợ đủ enum và workflow duyệt. |
| 16 | Station có ảnh/upload ảnh | Đã có | `POST /catalog/stations/{id}/image` lưu vào Catalog-owned MinIO bucket. |
| 17 | Dashboard từng role khác nhau | Đã có | Frontend tách dashboard Student, Moderator, Admin. |
| 18 | Moderator có Student + Moderator | Đã có | Moderator có thể làm nhiệm vụ Student và có thêm review/report moderator. |
| 19 | Admin có Moderator + Admin | Đã có | Admin có panel Admin và Moderator; không có luồng Student submit. |
| 20 | Trang submit action phải là danh sách mission | Đã có | `Missions.jsx` có danh sách mission, tìm kiếm/lọc, chi tiết và submit theo từng mission. |
| 21 | Catalog Management có search/lọc | Đã có | Admin Catalog có tab Missions/Stations/Badges, search/lọc và form quản lý. |
| 22 | Avatar và thông tin người dùng ở top bar | Đã có | TopBar hiển thị avatar, tên, role và account menu. |
| 23 | Account dropdown profile/chính sách/hướng dẫn/logout đỏ | Đã có | TopBar có menu tài khoản và xác nhận logout bằng dialog riêng. |
| 24 | Notification bell realtime | Đã có | TopBar có chuông notification, inbox và SSE/read APIs. |
| 25 | Nút đổi theme biểu thị đúng light/dark hiện tại | Đã có | Theme toggle đã nối với light/dark mode. |
| 26 | Top bar chưa đồng nhất | Đã sửa | TopBar tập trung user, notification, theme, account actions. |
| 27 | Sidebar footer có đổi role và logout đỏ | Đã có | Sidebar footer có role switch theo quyền và nút đăng xuất có confirm. |
| 28 | Hành động hệ thống cần custom confirm | Đã có | Thêm `ConfirmProvider`/`ConfirmDialog`, bỏ confirm/prompt mặc định ở các flow chính. |
| 29 | Student/Moderator có desktop và mobile web | Đã có | Responsive shell dùng sidebar desktop và bottom nav mobile cho Student/Moderator. |
| 30 | Admin chỉ cần desktop web | Đã có | Admin dùng desktop/admin shell, không ép bottom nav mobile. |
| 31 | User Management search/lọc/phân quyền/status/delete | Đã có | `AdminUsers.jsx` hỗ trợ search/filter, role, status, delete theo rule. |
| 32 | Redeem Sustainability Rewards bị lỗi | Đã sửa | Recognition lưu reward claim và frontend hiển thị voucher/claim history. |
| 33 | Moderator thêm/edit mission của mình, pending chờ admin | Đã có | Catalog workflow để mission mới ở `PENDING`; Admin duyệt active/reject/cancel/complete. |
| 34 | Admin có trang báo cáo tuần/tháng/năm | Đã có | `Reports.jsx` hiển thị summary, top students, action type metrics và student lookup. |
| 35 | Student/Moderator có trang report | Đã có | Reports page cho Student/Moderator tạo report và xem mine/queue theo vai trò. |
| 36 | Detail/add/edit nên dùng modal overlay/drawer | Đã có ở các luồng chính | Mission detail/submit, reports, profile confirm, catalog edit/detail và review dùng modal/dialog của app. |
| 37 | Moderator review queue UI chưa hợp lý, cần search/lọc/history | Đã sửa | Review queue có pending/history/search/filter; action đã review vẫn xem được. |
| 38 | Logo sidebar to hơn | Đã sửa | Sidebar logo/container đã phóng lớn. |
| 39 | Profile UI chưa ổn | Đã sửa | Profile có account card, status, avatar preview/upload và validation. |
| 40 | User Management UI chưa ổn | Đã sửa | User Management được dựng lại thành surface quản trị có filter/action rõ. |
| 41 | Adjust Student Points sơ sài/chưa rõ tác dụng | Đã sửa | Admin Adjust có wallet lookup, projected balance, preset cộng/trừ, reason và audit transaction; backend không cho ví âm. |
| 42 | Report còn lỗi | Đã sửa | Đã sửa role rules, evidence upload, analytics contract và UX report. |
| 43 | Upload evidence/station/avatar lỗi | Đã sửa | Ba nhóm upload lưu bằng MinIO theo service sở hữu và có smoke test download lại. |
| 44 | Admin chưa có báo cáo | Đã có | Admin Reports & Analytics đã triển khai và được document. |

## Các Điểm Còn Phụ Thuộc Môi Trường

| Hạng mục | Hiện trạng | Lý do / cách bật |
| --- | --- | --- |
| Gmail thật | Code SMTP đã có, `.env` có SMTP host/user/password nhưng đang tắt gửi thật | Đổi `IDENTITY_MAIL_ENABLED=true`, `IDENTITY_MAIL_FROM` nên là Gmail gửi thật, `SMTP_PASSWORD` phải là Google App Password. Nếu Gmail trả `535 Username and Password not accepted` thì cần tạo lại App Password hoặc kiểm tra đúng tài khoản gửi. |
| Cloudinary | Chưa dùng | MinIO đã đủ cho bản local và đúng ownership microservice. Dùng Cloudinary khi cần public CDN ngoài Docker/local network. |
| Full data warehouse/BI | Có analytics read model nội bộ | Warehouse/BI riêng là mở rộng sản phẩm, vượt phạm vi demo microservices local. |
| Full Flyway cho mọi service cũ | Identity có Flyway; một số service cũ vẫn bootstrap/`ddl-auto:update` | Muốn chuẩn production cần baseline migration riêng cho từng DB. |
| Playwright E2E browser | Có kịch bản test frontend, unit/build đã pass | Repo chưa cài Playwright spec suite đầy đủ. |

## Kiểm Thử Liên Quan Note

Các luồng đã/đang được kiểm bởi `scripts/backend-smoke-test.ps1`:

- Auth register, verify email token, login, forgot/reset password.
- Role boundary Student/Moderator/Admin.
- Avatar upload/download qua Identity media.
- Station image upload/download qua Catalog media.
- Action evidence upload/download qua Action media.
- Report evidence upload/download qua Report media.
- Action submit, pending review, approve/reject, idempotency, policy rules, daily limit.
- Reward ledger, badge, leaderboard weekly/monthly, close season.
- Recognition certificate generation và PDF download `application/pdf`.
- Reward claim/voucher.
- Notification inbox/SSE-backed read model.
- RabbitMQ queue drain.

Frontend đã có:

- Unit tests cho workflow rules.
- Production build Vite.
- Kịch bản manual test trong `docs/frontend-test-scenarios.md`.

## File Chính Đã Cập Nhật

- Backend/infra:
  - `docker-compose.yml`
  - `services/recognition-service/src/main/java/com/ecoquest/recognition/CertificateService.java`
  - `services/recognition-service/src/main/java/com/ecoquest/recognition/RecognitionController.java`
  - `services/report-service/src/main/java/com/ecoquest/report/ReportController.java`
  - `services/report-service/src/main/java/com/ecoquest/report/ReportEvidenceStorage.java`
  - `services/identity-access-service/src/main/java/com/ecoquest/identity/IdentityMediaStorage.java`
  - `services/green-catalog-service/src/main/java/com/ecoquest/catalog/StationImageStorage.java`
  - `scripts/backend-smoke-test.ps1`
- Frontend:
  - `web-apps/ecoquest-web/src/App.jsx`
  - `web-apps/ecoquest-web/src/components/Sidebar.jsx`
  - `web-apps/ecoquest-web/src/components/TopBar.jsx`
  - `web-apps/ecoquest-web/src/components/ConfirmDialog.jsx`
  - `web-apps/ecoquest-web/src/views/Missions.jsx`
  - `web-apps/ecoquest-web/src/views/Profile.jsx`
  - `web-apps/ecoquest-web/src/views/AdminUsers.jsx`
  - `web-apps/ecoquest-web/src/views/AdminAdjust.jsx`
  - `web-apps/ecoquest-web/src/views/Reports.jsx`
  - `web-apps/ecoquest-web/src/views/Certificates.jsx`
  - `web-apps/ecoquest-web/src/utils/workflowRules.js`
  - `web-apps/ecoquest-web/test/workflowRules.test.js`
- Docs:
  - `README.md`
  - `docs/frontend-handoff.md`
  - `docs/frontend-summary.md`
  - `docs/frontend-test-scenarios.md`
  - `docs/backend-review-summary.md`
  - `docs/ECOQUEST_FRONTEND_CHANGELOG.md`
  - `docs/note-se361-implementation-report.md`
