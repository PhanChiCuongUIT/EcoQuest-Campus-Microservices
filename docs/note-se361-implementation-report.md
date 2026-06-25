# Báo Cáo Đối Chiếu Note SE361

Cập nhật: 2026-06-25

Tài liệu này đối chiếu project với file `Note SE361 - Microservices (2).docx`. File note ban đầu có 46 gạch đầu dòng, trong đó 2 dòng là ảnh minh họa, tương ứng 44 ý chức năng. Ngày 25/06/2026 bổ sung 7 yêu cầu mới, nên bảng dưới theo dõi tổng cộng **51 ý**. Backend hiện có 9 microservice tách ownership rõ ràng; upload dùng MinIO theo service sở hữu; SMTP thật đang bật và Actuator mail health trả `UP`.

## Tổng Quan Hiện Trạng

- Microservices backend: đạt. Gồm Identity, Catalog, Action, Policy gRPC, Reward Ledger, Leaderboard, Recognition, Report, Notification.
- Auth và phân quyền: đạt. Từng panel có menu độc lập. Moderator account có thể chuyển Student/Moderator nhưng Moderator panel không lặp Missions/Wallet/Certificates; Admin chỉ chuyển Moderator/Admin và không có Student panel.
- Upload ảnh: đạt ở môi trường local. Avatar, ảnh station, evidence action, evidence report và certificate đều được lưu bởi service sở hữu dữ liệu qua MinIO.
- Certificate PDF: đã sửa luồng tải bằng Axios blob có bearer token và backend trả `attachment`. PDF A4 ngang đã được render thành PNG để kiểm tra bố cục; renderer co chữ dài, wrap mô tả và giữ chữ ký trong vùng an toàn.
- Email thật: SMTP đang bật, có Gmail/App Password và mail health `UP`. Email xác nhận, reset mật khẩu và đổi trạng thái dùng HTML branded, logo, CTA, link dự phòng, lý do và địa chỉ hỗ trợ.
- Cloudinary: chưa cần cho bản local microservices. Project đang dùng MinIO để đảm bảo mỗi service sở hữu file của mình; chỉ cần Cloudinary khi deploy public và muốn CDN ngoài.

## 51 Ý Chức Năng Trong Note

| # | Yêu cầu trong note | Trạng thái | Ghi chú triển khai |
| --- | --- | --- | --- |
| 1 | Notification realtime | Đã có | `notification-service` có inbox, mark read/read all, SSE stream và consumer RabbitMQ cho action, badge, certificate, mission, report, user events. |
| 2 | Report | Đã có | `report-service` sở hữu DB report, API tạo report, report của tôi, queue review, duyệt/từ chối và upload evidence. |
| 3 | Profile | Đã có | Identity sở hữu cập nhật profile và upload avatar; frontend Profile có preview, validation và cập nhật session ngay. |
| 4 | Báo cáo/analytics | Đã có | Report service có read model analytics từ RabbitMQ, hỗ trợ weekly/monthly/yearly/all. |
| 5 | Download PDF đúng như preview | Đã sửa | Frontend tải blob có JWT nên không còn Whitelabel 401; backend trả `attachment; application/pdf`. PDF được render trực quan, co chữ dài/wrap và không cắt chữ ký. |
| 6 | Phân auth Student/Moderator/Admin rõ ràng | Đã có | JWT enforced ở các service; role inheritance theo đúng note. |
| 7 | Đăng ký phải xác nhận email | Đã có | Register tạo user chưa verify; SMTP gửi HTML mail; frontend nhận route `/verify-email?token=...`, gọi API xác nhận rồi mới cho đăng nhập. |
| 8 | Quên mật khẩu gửi link reset | Đã có | Token dùng một lần; frontend nhận `/reset-password?token=...` và mở đúng bước đặt mật khẩu mới. |
| 9 | Policy rules admin bị lỗi không reach `8090` | Đã xử lý theo kiến trúc | Policy admin API là direct admin tool tại `http://localhost:8090`, không public qua Gateway. Frontend hiển thị cảnh báo khi service local chưa chạy. |
| 10 | User có avatar URL/upload avatar | Đã có | `POST /auth/me/avatar` lưu vào Identity-owned MinIO bucket và trả `/auth/media/avatars/...`. |
| 11 | User status active/inactive/banned | Đã có | Identity hỗ trợ status; inactive/banned không đăng nhập được; Admin UI quản lý status. |
| 12 | Upload ảnh có bền không khi đăng nhập máy khác | Đã có | Ảnh là URL backend qua Gateway, không còn base64 trong browser state; máy khác cùng truy cập hệ thống sẽ xem được. |
| 13 | Thêm phần reports | Đã có | Student/Moderator tạo report; Moderator/Admin review; Admin xem analytics. |
| 14 | Notification theo vai trò | Đã có | Student nhận action/badge/certificate/report; Moderator nhận thêm queue liên quan; Admin nhận thông báo hệ thống/user/report. |
| 15 | Mission status pending/active/rejected/cancelled/completed | Đã có | Catalog hỗ trợ đủ enum và workflow duyệt. |
| 16 | Station có ảnh/upload ảnh | Đã có | `POST /catalog/stations/{id}/image` lưu vào Catalog-owned MinIO bucket. |
| 17 | Dashboard từng role khác nhau | Đã có | Student, Moderator và Admin có dashboard riêng cùng biểu đồ/số liệu đúng phạm vi nghiệp vụ. |
| 18 | Moderator có Student + Moderator | Đã có, đã tách panel | Moderator account có thể chuyển panel Student cho dữ liệu cá nhân; Moderator panel chỉ có Dashboard, Review Queue, Reports, Leaderboard, My Mission Catalog, Profile. |
| 19 | Admin có Moderator + Admin | Đã có, đã tách panel | Admin chỉ có Moderator/Admin panels, không có Student panel; Admin panel gồm Dashboard, Catalog, Users, Reports & Analytics, Policy, Adjust Points, Profile. |
| 20 | Trang submit action phải là danh sách mission | Đã có | `Missions.jsx` có danh sách mission, tìm kiếm/lọc, chi tiết và submit theo từng mission. |
| 21 | Catalog Management có search/lọc | Đã có | Admin Catalog có tab Missions/Stations/Badges, search/lọc và form quản lý. |
| 22 | Avatar và thông tin người dùng ở top bar | Đã có | TopBar hiển thị avatar, tên, role và account menu. |
| 23 | Account dropdown profile/chính sách/hướng dẫn/logout đỏ | Đã có | TopBar có menu tài khoản và xác nhận logout bằng dialog riêng. |
| 24 | Notification bell realtime | Đã có | Chuông mở dropdown ngay bên dưới, bấm lần hai để đóng, mark all read, SSE cập nhật và click item điều hướng theo panel hiện tại. |
| 25 | Nút đổi theme biểu thị đúng light/dark hiện tại | Đã có | Theme toggle đã nối với light/dark mode. |
| 26 | Top bar chưa đồng nhất | Đã sửa | TopBar tập trung user, notification, theme, account actions. |
| 27 | Sidebar footer có đổi role và logout đỏ | Đã có | Sidebar footer có role switch theo quyền và nút đăng xuất có confirm. |
| 28 | Hành động hệ thống cần custom confirm | Đã có | Thêm `ConfirmProvider`/`ConfirmDialog`, bỏ confirm/prompt mặc định ở các flow chính. |
| 29 | Student/Moderator có desktop và mobile web | Đã có | Responsive shell dùng sidebar desktop và bottom nav mobile cho Student/Moderator. |
| 30 | Admin chỉ cần desktop web | Đã có | Admin dùng desktop/admin shell, không ép bottom nav mobile. |
| 31 | User Management search/lọc/phân quyền/status/delete | Đã có | `AdminUsers.jsx` hỗ trợ search/filter, role, status, delete theo rule. |
| 32 | Redeem Sustainability Rewards bị lỗi | Đã sửa | Đây là luồng đổi thành tích thành voucher demo. Recognition lưu claim/voucher và frontend hiển thị mã/trạng thái/lịch sử. |
| 33 | Moderator thêm/edit mission của mình, pending chờ admin | Đã có | Mission mới luôn `PENDING`; management API của Moderator chỉ trả mission do chính user đó tạo; Admin mới được duyệt status. |
| 34 | Admin có trang báo cáo tuần/tháng/năm | Đã có | Summary, action types, top students, điểm, badge, certificate và student lookup được dựng từ read model RabbitMQ riêng của Report service. |
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
| 45 | PDF bị Whitelabel 401, cần tải đúng định dạng | Đã sửa | Frontend gọi Axios blob kèm bearer token, backend trả attachment; smoke kiểm HTTP 200, `application/pdf`, disposition và PDF A4 ngang. |
| 46 | Email xác nhận/reset/status cần UI đẹp, logo và link hoạt động | Đã sửa | HTML mail branded cho verify/reset/ACTIVE/INACTIVE/BANNED; có reason, support, CTA và fallback URL. Frontend deep-link verify/reset đã hoạt động. |
| 47 | Giải thích Redeem Sustainability Rewards | Đã làm rõ | Đây là demo redemption: Student dùng recognition để nhận voucher/coupon; claim lưu ở Recognition DB, không phải đổi certificate thành tiền. |
| 48 | Tách menu Student/Moderator/Admin và ownership mission Moderator | Đã sửa | Menu panel không trùng chức năng Student; Moderator chỉ quản lý mission của mình; mission chờ Admin duyệt; backend smoke kiểm boundary. |
| 49 | Submit Action và Catalog CRUD | Đã kiểm chứng | Smoke kiểm draft, upload, accepted/pending/rejected, idempotency, daily limit; Catalog mission/station/badge create-update-delete và status workflow. |
| 50 | Notification realtime phải là dropdown và điều hướng đúng | Đã sửa | Popover dưới chuông, toggle, outside-click, mark all read; map action/wallet/certificate/catalog/report/profile theo panel hợp lệ. |
| 51 | Dashboard 3 role cần biểu đồ/số liệu | Đã sửa | Student có trạng thái submit/mission participation; Moderator có review/my missions; Admin có users, missions, action outcomes/types, points, badges, certificates và reports. |

## Các Điểm Còn Phụ Thuộc Môi Trường

| Hạng mục | Hiện trạng | Lý do / cách bật |
| --- | --- | --- |
| Gmail thật | SMTP đang bật, `/actuator/health` trả `UP`; người dùng đã quan sát mail được gửi | Agent không thể tự đọc inbox người nhận để xác nhận deliverability cuối. Nên đặt `IDENTITY_MAIL_FROM=SMTP_USERNAME`; dùng `FRONTEND_BASE_URL=http://<LAN-IP>:3000` nếu mở link từ điện thoại. |
| Cloudinary | Chưa dùng | MinIO đã đủ cho bản local và đúng ownership microservice. Dùng Cloudinary khi cần public CDN ngoài Docker/local network. |
| Full data warehouse/BI | Có analytics read model nội bộ | Warehouse/BI riêng là mở rộng sản phẩm, vượt phạm vi demo microservices local. |
| Full Flyway cho mọi service cũ | Identity có Flyway; một số service cũ vẫn bootstrap/`ddl-auto:update` | Muốn chuẩn production cần baseline migration riêng cho từng DB. |
| Playwright E2E browser | Có kịch bản test frontend, unit/build đã pass | Repo chưa cài Playwright spec suite đầy đủ; phiên này browser automation tích hợp không kết nối được nên dùng API/deep-link/static build verification. |

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
- Certificate download bắt buộc JWT nhưng frontend tải blob đúng cách; response là attachment.
- Reward claim/voucher.
- Notification inbox/SSE-backed read model.
- Report analytics nhận points snapshot, badge và certificate events mà không đọc DB chéo.
- RabbitMQ queue drain.

Frontend đã có:

- Unit tests cho workflow rules và panel navigation: 7/7.
- Production build Vite.
- Kịch bản manual test trong `docs/frontend-test-scenarios.md`.

Kết quả cuối ngày 25/06/2026:

- Backend full smoke: PASS.
- RabbitMQ: 16 queue, 0 pending message, mỗi queue có 1 consumer.
- Log sau smoke: không có `ERROR|Exception|Assertion failed|Timed out`.
- Frontend unit: 7/7 PASS; Vite production build PASS.
- PDF được tải qua bearer token và render trực quan thành A4 landscape một trang.

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
