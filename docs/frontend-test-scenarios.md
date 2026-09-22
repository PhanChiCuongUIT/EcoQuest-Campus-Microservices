# Kịch Bản Kiểm Thử Frontend EcoQuest

Cập nhật: 2026-09-22

## QR, Badge Và Coupon

Suite `web-apps/ecoquest-web/e2e/station-rewards.spec.js` chạy trên Chromium desktop 1440x1000 và mobile 390x844, tổng 8 case. Chạy sau khi khởi động stack bằng `scripts/start-project.ps1 -LocalMail`; trong thư mục frontend dùng `npm.cmd ci`, `npx.cmd playwright install chromium`, `npm.cmd run test:browser`.

- Admin: mở QR station, kiểm ảnh có pixel, tải PNG; chọn tiêu chí badge và station mission; kiểm light/dark và không tràn chiều ngang.
- Student mới: quét ảnh QR trong modal, station tự điền và readonly, upload minh chứng, submit pending, kiểm chưa có điểm, approve qua API, chờ event rồi kiểm điểm và tên mission trong ledger.
- Moderator: quét ảnh QR, xem thông tin station và mission được gán; kiểm giao diện dark ở hai kích thước.

Kiểm thủ công bổ sung: camera thật và quyền truy cập trên HTTPS; QR hỏng/sai station/hết hạn; label in trên giấy; badge có/không ảnh; coupon pending/failed/issued, giảm số dư nhưng không giảm tổng thành tích; lịch sử badge sau retire. Không coi test decode PNG là đã kiểm camera vật lý.

Kết quả 20/09/2026: 20 unit test, 6 Playwright case và production build PASS. Ảnh chụp/trace nằm trong `test-results` (không commit); các kịch bản còn lại bên dưới là checklist hồi quy, không mặc định mọi mục đã được Playwright tự động hóa.

## Chuẩn bị

```powershell
$env:API_GATEWAY_PORT='18080'
docker compose up -d --build
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090 -Web http://localhost:3000
```

Web container: `http://localhost:3000`.

Demo accounts, password `EcoQuest@123`:

| Role | Email | Student ID |
| --- | --- | --- |
| Student | `student@ecoquest.local` | `SV001` |
| Moderator | `moderator@ecoquest.local` | `SVMOD001` |
| Admin | `admin@ecoquest.local` | không có |

## Kiểm Thử Tự Động

```powershell
cd web-apps\ecoquest-web
npm.cmd test
npm.cmd run build
```

Kết quả kỳ vọng của bộ unit test hiện tại: 28/28 pass. Kết quả kiểm chứng mới nhất xem mục cuối tài liệu.

- student không thấy pending/rejected mission;
- chỉ active mission được submit;
- UI role switch tuân theo role inheritance;
- panel Moderator/Admin không lộ các trang Student;
- report target options follow Student/Moderator rules;
- manual point adjustment supports deductions but never a negative wallet;
- upload validation enforces file type, size, non-empty content, multiple images, one video, and no mixed image/video batch.
- reporting ranges are ordered and cannot include future periods.

## Kịch bản E2E bắt buộc

### 1. Register và email verification

1. Register email/student ID mới.
2. Xác nhận app không tự coi user là đã login.
3. Login trước verify phải bị từ chối.
4. Local mode: dùng `verificationToken` trả về để verify.
5. SMTP mode: mở link/token trong email.
6. Login sau verify thành công.
7. Resend verification tạo token mới hợp lệ.

### 2. Forgot/reset password

1. Gửi forgot password.
2. Reset bằng token và password mới.
3. Token đã dùng không dùng lại được.
4. Password cũ login thất bại; password mới thành công.

### 3. Session, profile và theme

1. Refresh trang vẫn restore session qua `/auth/me`.
2. Update display name/avatar, refresh vẫn còn.
3. Logout xóa token và quay về auth.
4. Light/dark mode hoạt động và persist.
5. Không có request protected thiếu bearer token.

### 4. Role matrix

Student:

- chỉ thấy Student view;
- không vào review/admin;
- không đọc/submit dữ liệu student khác.

Moderator:

- có thể chủ động chuyển sang Student self panel, nhưng Moderator panel không lặp Missions/Wallet/Certificates;
- Moderator panel chỉ có Dashboard, Review Queue, Reports, Leaderboard, My Mission Catalog, Profile;
- submit action với `SVMOD001`;
- không submit thay `SV001`;
- không approve/reject action của `SVMOD001`;
- không thấy Admin-only actions.

Admin:

- thấy Admin và Moderator management view;
- không có Student submit view;
- Admin panel chỉ có Dashboard, Catalog, Users, Reports, Analytics, Policy, Adjust Points, Profile;
- quản lý users/catalog/policy/reward/season;
- mọi forbidden API phải hiển thị feedback `403`, không giả success.

### 5. Mission workflow

1. Moderator tạo mission: status phải là `PENDING`.
2. Student không thấy và không submit pending mission.
3. Admin đổi sang `ACTIVE`.
4. Student thấy mission và mở submit form.
5. Admin đổi `CANCELLED` hoặc `COMPLETED`: form phải disable/ẩn.
6. Gọi submit thủ công cho non-active mission phải nhận `409`.
7. Edit mission phải dùng `PUT`, không tạo duplicate.
8. Station edit giữ `imageUrl`.
9. Admin upload station image bằng file input; API gọi `POST /catalog/stations/{id}/image` và reload vẫn thấy ảnh.

### 6. Submit action và evidence

1. Chọn mission active.
2. Mission `stationRequired=true` bắt buộc station.
3. Mission `evidenceRequired=true` bắt buộc file/evidence.
4. Upload nhiều ảnh hợp lệ:
   - preview xuất hiện;
   - gọi `/actions/evidence` cho từng ảnh;
   - nhận các URL `/actions/evidence/{objectKey}`;
   - các URL mở được ảnh;
   - submit dùng `evidenceUrls` và giữ `evidenceUrl` là URL đầu tiên, không lưu raw base64 trong Action.
5. Upload một video hợp lệ:
   - chấp nhận `mp4`, `webm`, `mov`;
   - preview bằng video player;
   - submit một video riêng, không trộn với ảnh.
6. Batch trộn ảnh và video, quá số lượng ảnh, quá giới hạn dung lượng hoặc type sai bị chặn rõ.
7. Recycle hợp lệ trả `PENDING_REVIEW`, hiển thị thông báo chờ Moderator/Admin duyệt, chưa cộng điểm.
8. Cleanup thiếu evidence trả `PENDING_REVIEW`.
9. Double click/reuse idempotency key trả `409`.
10. Save draft trả Redis key và UI báo thành công.

### 7. Reward, badge và leaderboard

1. Sau Moderator/Admin approve action, poll/refetch đến khi wallet tăng.
2. Transaction có `sourceActionId`.
3. `GREEN_STARTER` unlock.
4. Sau 10 recycle accepted, `RECYCLING_HERO` xuất hiện.
5. Weekly/monthly tabs tải đúng.
6. Current user row/rank lookup đúng.
7. Chọn reporting period của weekly/monthly: current week/month có dữ liệu, previous week/month trong cùng năm cũng có dữ liệu; không cần nhập key thủ công.
8. Rank lookup dùng đúng kỳ đang chọn, không luôn luôn lấy kỳ hiện tại.
9. Admin close cùng `seasonId` hai lần không duplicate snapshot.

### 8. Moderator review

1. Review page hiển thị pending và history.
2. Search theo student/mission/action.
3. Filter `PENDING_REVIEW`, `ACCEPTED`, `REJECTED`.
4. Evidence lightbox mở được MinIO URL.
5. Reject yêu cầu reason và không cộng điểm.
6. Approve cộng điểm/event đúng một lần.
7. Own action của Moderator disable; backend `403` nếu gọi thủ công.
8. Sau review, record vẫn còn trong history thay vì biến mất hoàn toàn.

### 9. Reports

1. Student/Moderator tạo report cho target hợp lệ.
2. `mine` chỉ trả report của user hiện tại.
3. Moderator/Admin xem queue và filter status.
4. Review thành `ACCEPTED` hoặc `REJECTED`.
5. Student không được đọc queue toàn hệ thống.
6. Admin mở analytics weekly/monthly/yearly/all; số accepted/rejected/points/top students cập nhật sau accepted/rejected action.
7. Analytics không được lấy dữ liệu bằng cách gọi trực tiếp DB hay service port khác; UI chỉ dùng `/reports/analytics/...`.

### 10. Notifications

1. Sau reset seed sạch, Student thấy `WELCOME`, `MISSION_REMINDER`, `BADGE_UNLOCKED`, `CERTIFICATE_ISSUED`.
2. Moderator thấy `REVIEW_QUEUE_READY`, `REPORT_CREATED`, `MISSION_STATUS_CHANGED`.
3. Admin thấy `ADMIN_DAILY_DIGEST`, `POLICY_REVIEW`, `USER_STATUS_CHANGED`.
4. Mark one read và read-all cập nhật count.
5. User không mark-read notification của người khác.
6. Accepted/rejected action tạo notification đúng student.
7. Badge/certificate event tạo notification.
8. SSE dùng native `EventSource('/notifications/stream?accessToken=...')`; khi có notification mới, unread count tăng mà không cần refresh.
9. Mission status changed, report created/reviewed, user reported và user status changed đều tạo notification đúng recipient/role.

### 11. Certificates và coupon claim

1. Sau close season, certificate card xuất hiện.
2. Download gọi API bằng bearer token, lưu file PDF attachment; không mở URL protected trực tiếp và không còn Whitelabel `401`.
3. Render PDF A4 landscape một trang; tên/ID dài không tràn, mô tả và chữ ký không bị cắt.
4. Close cùng season không duplicate certificate.
5. UI lấy coupon cards từ `GET /recognitions/rewards?studentId=...`, không hardcode reward demo.
6. Offer đủ điều kiện hiển thị `Redeem`; offer thiếu điểm/badge/certificate/stock/expiry hiển thị locked và `eligibilityReason`.
7. Reward claim thành công và UI hiển thị voucher/history, expiry và terms.
8. Bấm lại cùng reward không phát thêm voucher mới; backend trả lại claim cũ, stock không giảm thêm và UI hiển thị `Issued: <voucherCode>`.
9. Admin coupon offer CRUD: tạo offer mới, không delete khi active, deactivate rồi delete nếu chưa có issued voucher.

### 12. Notification dropdown và deep navigation

1. Bấm chuông mở danh sách ngay dưới chuông; bấm lần hai hoặc outside-click để đóng.
2. Mark all read đưa unread count về 0.
3. Event SSE mới xuất hiện mà không refresh.
4. Click action notification về Dashboard; badge/wallet/certificate chỉ mở trang Student khi đang ở Student panel.
5. Mission status notification `/admin-catalog` mở My Mission Catalog/Catalog theo panel.
6. Report và profile notification mở đúng trang, không rơi vào view bị role guard chặn.

### 13. Admin user management

1. List/search users.
2. Promote Student -> Moderator, login lại để nhận token role mới.
3. Set `INACTIVE`/`BANNED`: login bị chặn.
4. Reactivate: login lại được.
5. Chỉ user banned mới được delete theo contract hiện tại.

### 14. Dashboard và analytics

1. Student: points, rank, badges, certificates, missions joined; donut trạng thái submit, cột theo mission và miền hoạt động 7 ngày.
2. Moderator: pending/accepted/rejected review, open reports, own mission; donut review, cột mission lifecycle và miền workload 7 ngày.
3. Admin Dashboard: users theo role, mission lifecycle, action outcomes, points và workload bằng biểu đồ tròn/cột/miền.
4. Admin sidebar có mục `Analytics` riêng, không gộp trong trang xử lý Reports.
5. Analytics weekly/monthly/yearly hiển thị `submittedActions`, `missionsCreated`, `usersRegistered`, `totalPoints`, `badgesGranted`, `certificatesIssued`.
6. Student lookup hiển thị action, accepted/rejected, points hiện tại, badge count và certificate count.
7. Tạo user/mission mới rồi chờ event; Analytics tăng số tương ứng mà không đọc DB service khác.
8. Mở phần official reporting periods:
   - `weekly`: chọn năm, chọn `fromWeek/toWeek`; không chọn được tuần tương lai.
   - `monthly`: chọn năm, chọn `fromMonth/toMonth`; không chọn được tháng tương lai.
   - `yearly`: nhập `fromYear/toYear`; `fromYear <= toYear` và `toYear` không vượt năm hiện tại.
9. Chọn một dòng kỳ báo cáo trong bảng, ví dụ `W01 2026`, `FEB 2026` hoặc `2025`; bấm `Export ... PDF` và trình duyệt tải PDF một kỳ cụ thể như `ecoquest-analytics-w01-2026.pdf`, backend trả `application/pdf` và `Content-Disposition: attachment`.
10. Student outcome report:
   - Chế độ `All students` hiển thị bảng toàn bộ student theo cùng reporting range.
   - Chế độ `One student` chọn student từ danh sách, select dài không đè lên nút `View student`, số action/points/badge/certificate đổi theo range.
11. Gọi API thủ công với future year/month/week hoặc `fromYear > toYear` phải trả `400`.

### 15. Login feedback và trợ giúp

1. Sai email hoặc mật khẩu hiển thị `Invalid email or password`, không hiển thị lỗi backend chung.
2. Tài khoản chưa verify hướng dẫn mở hoặc gửi lại email xác minh.
3. Tài khoản `INACTIVE`/`BANNED` hiển thị đúng trạng thái và lý do từ Admin.
4. Tắt Gateway để kiểm tra lỗi kết nối; bật lại để kiểm tra lỗi server không bị nhầm với sai mật khẩu.
5. Mở `Policy & privacy` và `Application guide`; tiêu đề và nội dung phải khác nhau, đóng/mở độc lập.

### Kết Quả Lịch Sử: 21/09/2026

26 unit test PASS, production build PASS và 8/8 Playwright case PASS trên desktop/mobile. Bổ sung `apiErrors.test.js` cho thông báo nghiệp vụ/Blob/HTTP/network, validation Policy và `leaderboardPeriods.test.js` cho UTC qua giao tuần/tháng. Browser kiểm Policy CRUD, hostname LAN, quét QR sai rồi quét đúng và submit → duyệt → ví hiển thị giao dịch. Camera điện thoại vật lý và mọi trình duyệt chưa nằm trong phạm vi chạy này. Xem `chay-lai-project.md`, mục 7, để biết kết quả backend và cleanup.

### Bổ Sung Ngày 22/09/2026

Kết quả cuối: 28/28 unit test, production build và **22/22 Playwright case PASS**. Trước đó có lượt thất bại vì stack Docker đã dừng; kết quả PASS là sau khi startup xác nhận toàn bộ health UP.

- `failure-feedback.spec.js`: sáu case ở mỗi viewport. API Users/Reports/Analytics/coupon/rank lỗi không được hiển thị thành rỗng hoặc không có hạng. Đổi quyền và đánh dấu notification lỗi phải có thông báo. Đổi sinh viên nhưng tải ví thất bại phải vô hiệu hóa Adjust Points.
- `notification-stream.spec.js`: một case mỗi viewport, dùng SSE/API thật. Một notification có hai recipient key khớp vẫn chỉ tới một lần trên kết nối; đóng stream không làm mất bản ghi inbox tiếp theo.
- `feedback.test.js`: trạng thái coupon thật và gộp SSE theo ID; `apiErrors.test.js` có tình huống timeout, hướng dẫn kiểm lịch sử trước khi thử lại.
- Ảnh chụp trong `test-results` kiểm tra bố cục lỗi Users desktop và Adjust Points mobile; nút bị vô hiệu hóa, số dư chưa tải không hiển thị số dư sinh viên trước.
- Các bài giả lập HTTP lỗi là kiểm thử UI, không chứng minh backend chịu được mất mạng/đứt broker. Không đổi assertion nghiệp vụ để cho qua lỗi.

### 17. Policy Rules CRUD

1. Admin mở Policy Rules; request `/policies/rules` dùng cùng origin của web, không phụ thuộc địa chỉ localhost trên điện thoại.
2. Bấm `Add rule`, modal overlay mở ra và focus vào form.
3. Thêm rule mới trong modal; rule xuất hiện trong bảng.
4. Edit points/evidence/station/daily limit/active bằng `PUT`.
5. Delete rule đang active phải bị chặn hoặc trả `409`.
6. Set `active=false`, sau đó delete rule thành công.
7. Gateway `/policies/rules` vẫn trả 404. Web proxy `/policies/rules` trả 401 khi thiếu token, 403 với Student/Moderator và dữ liệu rule với Admin.
8. Nhập điểm âm hoặc số lẻ: form báo validation và không ghi dữ liệu. Tạo trùng rule: hiển thị `Policy rule already exists.`. Xóa rule đang active: backend trả 409 và yêu cầu vô hiệu hóa trước.
9. Quét QR station không thuộc mission: hiển thị `This station is not assigned to the mission.`, ô station vẫn rỗng. Sau đó quét đúng station và gửi để vào hàng đợi duyệt.
10. Lỗi API tải PDF dạng Blob, lỗi mạng, 413 và 5xx phải có thông báo đọc được, không hiển thị HTML hoặc `Request failed with status code ...`.

### 18. Dashboard resilient loading

1. Đăng nhập Student/Moderator/Admin ngay sau khi stack vừa start.
2. Nếu một endpoint chậm hoặc lỗi tạm thời, dashboard vẫn hiển thị các metric/chart load được và chỉ hiện warning banner.
3. Refresh thủ công sau vài giây phải cập nhật dữ liệu còn thiếu, không hiện màn trắng.

### 16. Report target picker và admin self-protection

1. Student mở Reports -> New report -> Target type USER: danh sách user hiện theo tên/email/student ID, không nhập raw ID.
2. Target type MISSION: danh sách mission hiện theo title/action/status, chọn một mission rồi submit report.
3. Moderator mở Reports -> New report -> Target type ACTION: danh sách action review hiện theo student/mission/status.
4. Admin mở Campus Reports: hàng report hiển thị tên/tiêu đề target, ID chỉ nằm ở dòng phụ.
5. Admin mở User Management: account đang đăng nhập có badge `Current admin`, không đổi role/status/delete được.
6. Admin đổi role một Moderator khác xuống Student, đăng nhập lại account đó và kiểm tra chỉ còn Student panel.

## Responsive/mobile

Test tối thiểu ở `390x844`, `768x1024`, `1440x900`:

- không overflow ngang;
- mobile bottom nav không che content;
- modal/drawer scroll được và nút action luôn tiếp cận được;
- bảng review/catalog chuyển layout phù hợp;
- text/button không bị cắt;
- light/dark đều đạt tương phản, đặc biệt các search bar, select, student picker, target picker và form input không còn nền trắng/chữ nhạt trong dark theme;
- evidence/certificate mở được trên mobile thật qua `http://<LAN-IP>:3000`.

## Playwright nên bổ sung

1. Register -> verify -> login -> profile.
2. Student upload nhiều ảnh hoặc một video evidence -> pending review -> Moderator/Admin approve -> wallet/badge/leaderboard.
3. Moderator own submit -> self-review forbidden.
4. Student pending cleanup -> Moderator approve -> reward update.
5. Moderator create mission -> Admin activate -> Student submit.
6. Report create -> Moderator review.
7. Admin close season -> certificate preview.
8. Role-route guards, light/dark và mobile navigation.

## Pass criteria

- `npm.cmd test` pass.
- `npm.cmd run build` pass.
- Không có console error ở core flows.
- Không có UI action nâng quyền vượt token.
- Backend `401/403/409` được trình bày đúng, không nuốt lỗi.
- Async views refetch/poll đúng sau RabbitMQ event.
- Mobile thật truy cập và thao tác được.
