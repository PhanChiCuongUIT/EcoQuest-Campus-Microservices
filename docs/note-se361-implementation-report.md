# Báo Cáo Đối Chiếu Note SE361

Cập nhật: 2026-06-26

Tài liệu này đối chiếu project với file `Note SE361 - Microservices (2).docx`. File note ban đầu có 46 gạch đầu dòng, trong đó 2 dòng là ảnh minh họa, tương ứng 44 ý chức năng. Ngày 25/06/2026 bổ sung 7 yêu cầu, sau đó bổ sung 4 yêu cầu, tiếp theo bổ sung 4 yêu cầu về export báo cáo/CRUD/audit/seed data, tiếp theo bổ sung 9 yêu cầu về topbar, report target, self-management, admin analytics theo toàn bộ tuần/tháng/năm, sidebar và reset seed sạch, tiếp theo bổ sung 4 yêu cầu về ràng buộc kỳ báo cáo, Student outcome report, evidence preview và Policy Rules CRUD, và phiên mới nhất bổ sung 4 yêu cầu về Policy modal, Student outcome one-student layout, logo email thật và dashboard resilient loading. Bảng dưới theo dõi tổng cộng **76 ý**. Backend hiện có 9 microservice tách ownership rõ ràng; upload dùng MinIO theo service sở hữu; SMTP thật đang bật và Actuator mail health trả `UP`.

## Tổng Quan Hiện Trạng

- Microservices backend: đạt. Gồm Identity, Catalog, Action, Policy gRPC, Reward Ledger, Leaderboard, Recognition, Report, Notification.
- Auth và phân quyền: đạt. Từng panel có menu độc lập. Moderator account có thể chuyển Student/Moderator nhưng Moderator panel không lặp Missions/Wallet/Certificates; Admin chỉ chuyển Moderator/Admin và không có Student panel.
- Upload ảnh: đạt ở môi trường local. Avatar, ảnh station, evidence action, evidence report và certificate đều được lưu bởi service sở hữu dữ liệu qua MinIO.
- Certificate PDF: đã sửa luồng tải bằng Axios blob có bearer token và backend trả `attachment`. PDF A4 ngang đã được render thành PNG để kiểm tra bố cục; renderer co chữ dài, wrap mô tả và giữ chữ ký trong vùng an toàn.
- Email thật: SMTP đang bật, có Gmail/App Password và mail health `UP`. Email xác nhận, reset mật khẩu và đổi trạng thái dùng HTML branded, logo PNG thật attach inline bằng CID, CTA, link dự phòng, lý do và địa chỉ hỗ trợ.
- Cloudinary: chưa cần cho bản local microservices. Project đang dùng MinIO để đảm bảo mỗi service sở hữu file của mình; chỉ cần Cloudinary khi deploy public và muốn CDN ngoài.

## 76 Ý Chức Năng Trong Note

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
| 19 | Admin có Moderator + Admin | Đã có, đã tách panel | Admin chỉ có Moderator/Admin panels, không có Student panel; Admin panel gồm Dashboard, Catalog, Users, Reports, Analytics, Policy, Adjust Points, Profile. |
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
| 32 | Redeem Sustainability Rewards bị lỗi | Đã sửa | Đây là luồng đổi thành tích thành voucher demo. Recognition lưu claim/voucher và frontend hiển thị mã/trạng thái/lịch sử. Claim cùng `studentId + rewardId` là idempotent: bấm lại trả về voucher cũ, không phát mã mới. |
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
| 44 | Admin chưa có báo cáo | Đã có | Admin có trang Reports cho workflow vi phạm/nội dung và trang Analytics riêng cho báo cáo hệ thống. |
| 45 | PDF bị Whitelabel 401, cần tải đúng định dạng | Đã sửa | Frontend gọi Axios blob kèm bearer token, backend trả attachment; smoke kiểm HTTP 200, `application/pdf`, disposition và PDF A4 ngang. |
| 46 | Email xác nhận/reset/status cần UI đẹp, logo và link hoạt động | Đã sửa | HTML mail branded cho verify/reset/ACTIVE/INACTIVE/BANNED; có reason, support, CTA và fallback URL. Frontend deep-link verify/reset đã hoạt động. |
| 47 | Giải thích Redeem Sustainability Rewards | Đã làm rõ | Đây là demo redemption: Student dùng Recognition để nhận voucher/coupon; claim lưu ở Recognition DB, không phải đổi certificate thành tiền. Fixed reward chỉ phát một voucher cho mỗi student/reward; custom reward có thể dùng rewardId riêng nếu muốn tạo quyền lợi khác. |
| 48 | Tách menu Student/Moderator/Admin và ownership mission Moderator | Đã sửa | Menu panel không trùng chức năng Student; Moderator chỉ quản lý mission của mình; mission chờ Admin duyệt; backend smoke kiểm boundary. |
| 49 | Submit Action và Catalog CRUD | Đã kiểm chứng | Smoke kiểm draft, upload, accepted/pending/rejected, idempotency, daily limit; Catalog mission/station/badge create-update-delete và status workflow. |
| 50 | Notification realtime phải là dropdown và điều hướng đúng | Đã sửa | Popover dưới chuông, toggle, outside-click, mark all read; map action/wallet/certificate/catalog/report/profile theo panel hợp lệ. |
| 51 | Dashboard 3 role cần biểu đồ/số liệu | Đã sửa | Student có trạng thái submit/mission participation; Moderator có review/my missions; Admin có users, missions, action outcomes/types, points, badges, certificates và reports. |
| 52 | Chính sách và hướng dẫn đang hiện nội dung giống nhau | Đã sửa | Account menu mở hai nội dung độc lập: Policy & Privacy mô tả integrity, privacy, ownership, moderation; Application Guide mô tả workflow riêng cho Student, Moderator và Admin. |
| 53 | Lỗi đăng nhập phải phản ánh đúng nguyên nhân | Đã sửa | Identity trả thông báo riêng cho sai thông tin, chưa xác minh email, inactive và banned kèm lý do; frontend phân loại `401`, `403`, `429`, lỗi mạng và lỗi server, không còn gom thành “check backend”. |
| 54 | Admin cần mục Analytics riêng theo tuần/tháng/năm | Đã sửa | Sidebar Admin có mục `Analytics` riêng. `report-service` nhận event action, reward, badge, certificate, mission creation và user registration để tạo read model; không đọc DB chéo và không cần tạo microservice thứ 10. |
| 55 | Dashboard ba role cần biểu đồ tròn, cột và miền | Đã sửa | Student có donut outcome, cột theo mission và miền 7 ngày; Moderator có donut review, cột lifecycle mission cá nhân và miền workload; Admin có donut action, cột user/mission và miền activity. |
| 56 | Admin Analytics cần xuất file báo cáo đẹp, đúng chuẩn | Đã làm | `report-service` thêm `GET /reports/analytics/export?period=weekly|monthly|yearly`, trả `application/pdf` attachment. PDF có tiêu đề, thời gian báo cáo, bảng metric, action types, top students và footer nguồn dữ liệu read model. Frontend có nút `Export PDF` tải blob kèm JWT. |
| 57 | Check CRUD tất cả project, thiếu thì fix | Đã kiểm chứng và sửa | Catalog mission/station/badge đã có create/read/update/delete; badge thiếu `PUT /catalog/badges/{code}` nên đã thêm backend, API client và UI edit. Smoke test kiểm create/update/delete mission, station, badge; user management, report review, policy update, reward adjust và notification workflow cũng được kiểm theo nghiệp vụ tương ứng. |
| 58 | Re-audit project đúng và đủ microservices, kể cả service mới | Đã đạt theo scope hiện tại | Hệ thống giữ 9 microservice: Identity, Catalog, Action, Policy gRPC, Reward, Leaderboard, Recognition, Report, Notification. Gateway chỉ route, không chứa nghiệp vụ; service không đọc DB chéo; Report analytics dùng event/read model riêng nên không cần tạo service thứ 10 cho báo cáo. |
| 59 | Seed thêm dữ liệu phong phú: mission >=10, submit action >=20, điểm/badge/certificate/report nhiều mốc thời gian | Đã làm | Seed hiện có 12 mission, 7 station, 12 policy rule, 8 student demo, 24 submit action ở weekly/monthly/yearly, reward wallets/transactions/badges, recognition certificates, reports và report analytics read-model records để dashboard/báo cáo có dữ liệu ngay sau khi chạy stack. |
| 60 | Student panel topbar còn hiện `Student: SVMOD001` ở Dashboard/Wallet/Certificates | Đã sửa | TopBar không còn hiển thị selector Student ID ở Student panel; các trang dùng student context từ tài khoản đăng nhập nên header đồng nhất với các trang khác. |
| 61 | New report không nên bắt nhập Target ID thủ công | Đã sửa | `Reports.jsx` đổi sang target picker có search. USER lấy từ endpoint Identity tối giản `/auth/report-targets/users`, MISSION lấy từ Catalog, ACTION lấy từ Action review queue. |
| 62 | UI Student/Moderator còn chỗ hiển thị ID thay vì tên khi có thể hiển thị tên | Đã cải thiện | Recent actions đã map mission ID sang title; report queue ưu tiên tên user/mission/action summary và chỉ giữ ID ở dòng phụ để truy vết. Admin Adjust và Admin Analytics đổi lookup student sang danh sách tên/student ID. |
| 63 | Admin không được đổi role/status/ban chính mình | Đã khóa backend và UI | Identity trả `409` khi admin tự đổi role, inactive/ban hoặc delete chính mình. AdminUsers disable action của current admin. Smoke test kiểm self-protection. |
| 64 | Giảm cấp Moderator xuống Student cần kiểm tra ràng buộc | Đã kiểm chứng | Backend cho phép demote Moderator -> Student nếu account có `studentId`; login token mới nhận role `STUDENT`. Smoke test kiểm luồng này và không phá role boundary. |
| 65 | Quản lý Campus Reports ở Admin cần kiểm tra lỗi | Đã sửa/cải thiện | Admin/Moderator report queue dùng target label map, search theo tên/tiêu đề/ID, evidence link, review note bằng custom confirm; backend report create/list/review/upload evidence vẫn được smoke test. |
| 66 | Email đổi status cần liên hệ admin thao tác hoặc support; logo email bị lỗi | Đã sửa | `IdentityMailService` thêm email/tên admin thay đổi status vào nội dung hỗ trợ; support mặc định `cuong26.16.8@gmail.com`. Logo mail dùng file PNG thật của project attach inline bằng CID, không phụ thuộc ảnh `localhost` bị Gmail chặn. |
| 67 | Admin analytics phải có báo cáo/xuất báo cáo cho tất cả tuần trong năm, tất cả tháng trong năm và từng năm | Đã làm, đã chỉnh lại đúng ý export | Report service giữ `GET /reports/analytics/series?period=weekly|monthly|yearly` để hiển thị bảng chọn mọi tuần/tháng/năm. Export mặc định đã quay về PDF một kỳ theo layout đẹp trước đó: `period=weekly&year=2026&week=18`, `period=monthly&year=2026&month=2`, hoặc `period=yearly&year=2025`; frontend chọn một dòng trong bảng rồi tải đúng PDF của kỳ đó. `scope=series` chỉ còn là API phụ nếu cần xuất toàn bộ series. |
| 68 | Reset dữ liệu test cũ và seed lại phong phú theo nhiều mốc thời gian | Đã làm | Đã chạy `docker compose down -v` để xóa volume EcoQuest, sau đó `docker compose up -d --build` để seed lại dữ liệu sạch. Smoke test sau reset PASS, xác nhận mission/action/report/analytics/rabbit queue hoạt động. |
| 69 | Admin analytics không được chọn mốc thời gian tương lai; weekly/monthly/yearly phải chọn range hợp lệ | Đã sửa | Report service reject `400` cho future year/month/week và reversed range. Frontend đổi Official reporting periods thành range picker: weekly `year/fromWeek/toWeek`, monthly `year/fromMonth/toMonth`, yearly `fromYear/toYear`; các lựa chọn bị giới hạn theo ngày hiện tại. |
| 70 | Student outcome report bị đè UI và cần xem tất cả student theo tuần/tháng/năm | Đã sửa | Frontend tách header/controls để không overlap, thêm chế độ `All students` và `One student`. Report service thêm `GET /reports/analytics/students?...` trả danh sách outcome toàn bộ student theo cùng reporting range; endpoint student cụ thể cũng nhận range params. |
| 71 | Review queue moderator bị lỗi thumbnail evidence | Đã sửa | Moderator Review nhận diện media URL nội bộ `/actions/evidence/...` là ảnh kể cả không có extension; nếu ảnh load fail thì chuyển sang fallback `Open evidence` thay vì hiển thị thumbnail vỡ. |
| 72 | Policy Rules cần thêm và delete, vẫn đảm bảo ràng buộc microservice | Đã sửa | Policy service thêm `POST /policies/rules` và `DELETE /policies/rules/{actionType}` trên direct local admin port `8090`. Delete chỉ cho rule đã inactive để tránh làm action type active trở thành unsupported ngoài ý muốn; frontend có form Add rule và nút Delete inactive rule. |
| 73 | Policy Rules CRUD cần kiểm lại và Add rule nên dùng modal overlay | Đã sửa | Backend Policy CRUD đã được smoke test: create rule, active delete trả `409`, deactivate rồi delete thành công. Frontend đổi Add rule từ form ngang khó dùng sang modal overlay có validation, toggle evidence/station/active và cảnh báo ràng buộc ownership. |
| 74 | Student outcome report chế độ One Student vẫn bị đè UI | Đã sửa | `AdminAnalytics.jsx` bỏ dùng `.search-field` chung cho select dài, thay bằng `.student-picker-field` có grid riêng, select co giãn đúng và nút `View student` không bị chồng lên nhau ở desktop/mobile. |
| 75 | Email hệ thống chưa hiển thị logo project thật | Đã sửa | Copy `resources/EcoQuest Logo.png` vào classpath Identity và attach vào mail bằng CID `ecoquestLogo`. Template verify/reset/status dùng `<img src="cid:ecoquestLogo">`; nếu mail client chặn ảnh thì vẫn có text fallback EcoQuest Campus. |
| 76 | Dashboard các role đôi khi mới đăng nhập không load được dữ liệu | Đã sửa | Student, Moderator và Admin dashboard đổi sang `Promise.allSettled`/partial fallback. Nếu một service tạm chậm/lỗi, dashboard vẫn render phần dữ liệu đã load và hiện banner cảnh báo thay vì trắng hoặc chỉ báo lỗi chung. |

## Các Điểm Còn Phụ Thuộc Môi Trường

| Hạng mục | Hiện trạng | Lý do / cách bật |
| --- | --- | --- |
| Gmail thật | SMTP đang bật, `/actuator/health` trả `UP`; người dùng đã quan sát mail được gửi | Agent không thể tự đọc inbox người nhận để xác nhận deliverability cuối. Nên đặt `IDENTITY_MAIL_FROM=SMTP_USERNAME`; dùng `FRONTEND_BASE_URL=http://<LAN-IP>:3000` nếu mở link từ điện thoại. |
| Cloudinary | Chưa dùng | MinIO đã đủ cho bản local và đúng ownership microservice. Dùng Cloudinary khi cần public CDN ngoài Docker/local network. |
| Full data warehouse/BI | Có analytics read model nội bộ | Warehouse/BI riêng là mở rộng sản phẩm, vượt phạm vi demo microservices local. |
| Full Flyway cho mọi service cũ | Identity có Flyway; một số service cũ vẫn bootstrap/`ddl-auto:update` | Muốn chuẩn production cần baseline migration riêng cho từng DB. |
| Playwright E2E browser | Có kịch bản test frontend, unit/build đã pass | Repo chưa cài Playwright spec suite đầy đủ; phiên này browser automation tích hợp không kết nối được nên dùng API/deep-link/static build verification. |

## Dọn Dung Lượng Docker

Ngày 25/06/2026 đã dọn Docker theo nguyên tắc chỉ giữ tài nguyên đang được container chạy của EcoQuest và FreshTrace tham chiếu:

- Trước khi dọn: images khoảng 75.83GB, local volumes 2.80GB, build cache 59.25GB.
- Sau khi dọn ban đầu: images 10.07GB, local volumes 859MB, build cache 0B, Docker báo 0B reclaimable.
- Sau lần reset seed và rebuild mới nhất: images 14.41GB, local volumes 796MB, build cache 5.236GB. Build cache tăng lại vì Docker phải tải dependency Maven/NPM sau prune; có thể dọn bằng `docker builder prune -af` khi không cần build tiếp.
- Đã giữ lại 31 container đang chạy: 23 container EcoQuest và 8 container FreshTrace.
- `docker_data.vhdx` vẫn khoảng 81.31GB vì Windows/WSL chưa compact file đĩa ảo. Lệnh `diskpart compact vdisk` cần chạy trong PowerShell Administrator, nên đã ghi hướng dẫn compact vào `README.md`.
- Đã cập nhật các Dockerfile backend/frontend dùng BuildKit cache dùng chung (`ecoquest-maven`, `ecoquest-npm`) để lần build sau không tải lại dependency cache riêng cho từng service nhiều lần.

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
- Reward claim/voucher và duplicate claim idempotency.
- Notification inbox/SSE-backed read model.
- Report analytics nhận action, points snapshot, badge, certificate, mission và user registration events mà không đọc DB chéo.
- Admin analytics export PDF `application/pdf` attachment cho kỳ hiện tại hoặc kỳ được chọn trong quá khứ.
- Admin analytics series API cho toàn bộ tuần trong năm, đủ 12 tháng trong năm và từng năm trong range; frontend dùng bảng này để chọn kỳ trước khi export PDF một kỳ.
- Admin analytics reject future/reversed reporting ranges; smoke test kiểm `400` cho future year/month và reversed year.
- Student outcome report theo range cho toàn bộ student và từng student.
- Policy admin CRUD: create rule, active delete bị `409`, deactivate rồi delete thành công.
- Dashboard resilient loading: lỗi một API không làm sập toàn bộ dashboard.
- Identity email logo: build xác nhận logo PNG thật được đóng gói vào classpath mail template.
- Identity self-protection: admin không tự đổi role/status/delete chính mình; demote Moderator -> Student hoạt động khi có `studentId`.
- Report target lookup: frontend không cần nhập Target ID thủ công cho USER/MISSION/ACTION.
- Seed data: mission >=10, submit action >=20, policy rule >=12, demo SV001 actions.
- RabbitMQ queue drain.

## Kiểm Tra Bổ Sung Certificate Và Coupon Ngày 26/06/2026

- Certificate: Recognition service consume `LeaderboardSeasonClosedEvent`, tạo metadata trong `recognition_db`, render PDF A4 ngang, upload MinIO và trả download `application/pdf` qua endpoint có JWT. Close cùng `seasonId` không tạo trùng certificate vì backend kiểm `seasonId + studentId`.
- Coupon/voucher: Recognition service sở hữu bảng `reward_claims`. `POST /recognitions/rewards/{id}/claim` kiểm quyền self/admin, validate `studentId` và `rewardName`, sau đó trả claim `ISSUED` với mã `ECO-...`.
- Bug đã sửa: trước đây bấm lại cùng reward có thể phát thêm voucher mới. Hiện backend trả lại claim cũ theo `studentId + rewardId`; frontend disable reward đã claim và hiển thị `Issued: <voucherCode>`.
- Kiểm chứng: `scripts/backend-smoke-test.ps1` đã thêm assertion duplicate claim giữ nguyên `id` và `voucherCode`; smoke full stack PASS ngày 26/06/2026.

Frontend đã có:

- Unit tests cho workflow rules, panel navigation, phân loại lỗi đăng nhập và reporting range guard: 9/9.
- Production build Vite.
- Kịch bản manual test trong `docs/frontend-test-scenarios.md`.

Kết quả cuối ngày 26/06/2026:

- Backend full smoke sau khi patch Policy modal/email logo/dashboard resilient loading: PASS.
- RabbitMQ: 18 queue, 0 pending message, mỗi queue có 1 consumer.
- Log sau smoke: không có `ERROR|Exception|Assertion failed|Timed out` sau giai đoạn warm-up. Một vài lỗi Gateway `Connection refused` trước smoke là startup race khi Identity chưa mở port và không còn lặp lại sau khi service sẵn sàng.
- Frontend unit: 9/9 PASS; Vite production build PASS.
- PDF được tải qua bearer token và render trực quan thành A4 landscape một trang.

## File Chính Đã Cập Nhật

- Backend/infra:
  - `docker-compose.yml`
  - `services/recognition-service/src/main/java/com/ecoquest/recognition/CertificateService.java`
  - `services/recognition-service/src/main/java/com/ecoquest/recognition/RecognitionController.java`
  - `services/report-service/src/main/java/com/ecoquest/report/ReportController.java`
  - `services/report-service/src/main/java/com/ecoquest/report/ReportEvidenceStorage.java`
  - `services/report-service/src/main/java/com/ecoquest/report/ReportAnalyticsService.java`
  - `services/report-service/src/main/java/com/ecoquest/report/ReportMessagingConfig.java`
  - `services/identity-access-service/src/main/java/com/ecoquest/identity/IdentityMediaStorage.java`
  - `services/identity-access-service/src/main/java/com/ecoquest/identity/IdentityMailService.java`
  - `services/identity-access-service/src/main/resources/email/ecoquest-logo.png`
  - `services/green-catalog-service/src/main/java/com/ecoquest/catalog/StationImageStorage.java`
  - `scripts/backend-smoke-test.ps1`
- Frontend:
  - `web-apps/ecoquest-web/src/App.jsx`
  - `web-apps/ecoquest-web/src/components/Sidebar.jsx`
  - `web-apps/ecoquest-web/src/components/TopBar.jsx`
  - `web-apps/ecoquest-web/src/components/DashboardCharts.jsx`
  - `web-apps/ecoquest-web/src/components/ConfirmDialog.jsx`
  - `web-apps/ecoquest-web/src/views/Missions.jsx`
  - `web-apps/ecoquest-web/src/views/Profile.jsx`
  - `web-apps/ecoquest-web/src/views/AdminUsers.jsx`
  - `web-apps/ecoquest-web/src/views/AdminAdjust.jsx`
  - `web-apps/ecoquest-web/src/views/Reports.jsx`
  - `web-apps/ecoquest-web/src/views/AdminAnalytics.jsx`
  - `web-apps/ecoquest-web/src/views/RoleDashboard.jsx`
  - `web-apps/ecoquest-web/src/views/StudentDashboard.jsx`
  - `web-apps/ecoquest-web/src/views/Certificates.jsx`
  - `web-apps/ecoquest-web/src/utils/workflowRules.js`
  - `web-apps/ecoquest-web/src/utils/authErrors.js`
  - `web-apps/ecoquest-web/test/workflowRules.test.js`
- Docs:
  - `README.md`
  - `docs/frontend-handoff.md`
  - `docs/frontend-summary.md`
  - `docs/frontend-test-scenarios.md`
  - `docs/backend-review-summary.md`
  - `docs/ECOQUEST_FRONTEND_CHANGELOG.md`
  - `docs/note-se361-implementation-report.md`
