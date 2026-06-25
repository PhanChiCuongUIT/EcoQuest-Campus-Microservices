# EcoQuest Frontend Test Scenarios

Updated: 2026-06-25

## Chuẩn bị

```powershell
$env:API_GATEWAY_PORT='18080'
docker compose up -d --build
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090
```

Web container: `http://localhost:3000`.

Demo accounts, password `EcoQuest@123`:

| Role | Email | Student ID |
| --- | --- | --- |
| Student | `student@ecoquest.local` | `SV001` |
| Moderator | `moderator@ecoquest.local` | `SVMOD001` |
| Admin | `admin@ecoquest.local` | không có |

## Automated baseline

```powershell
cd web-apps\ecoquest-web
npm.cmd test
npm.cmd run build
```

Current automated unit tests: 7/7 pass.

- student không thấy pending/rejected mission;
- chỉ active mission được submit;
- UI role switch tuân theo role inheritance;
- panel Moderator/Admin không lộ các trang Student;
- report target options follow Student/Moderator rules;
- manual point adjustment supports deductions but never a negative wallet;
- upload validation enforces file type, size, and non-empty content.

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
- Admin panel chỉ có Dashboard, Catalog, Users, Reports/Analytics, Policy, Adjust Points, Profile;
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
4. Upload ảnh hợp lệ:
   - preview xuất hiện;
   - gọi `/actions/evidence`;
   - nhận `/actions/evidence/{objectKey}`;
   - URL mở được ảnh;
   - submit dùng URL đó, không lưu raw base64 trong Action.
5. File quá giới hạn/type sai bị chặn rõ.
6. Recycle hợp lệ trả `ACCEPTED`, 10 điểm.
7. Cleanup thiếu evidence trả `PENDING_REVIEW`.
8. Double click/reuse idempotency key trả `409`.
9. Save draft trả Redis key và UI báo thành công.

### 7. Reward, badge và leaderboard

1. Sau accepted action, poll/refetch đến khi wallet tăng.
2. Transaction có `sourceActionId`.
3. `GREEN_STARTER` unlock.
4. Sau 10 recycle accepted, `RECYCLING_HERO` xuất hiện.
5. Weekly/monthly tabs tải đúng.
6. Current user row/rank lookup đúng.
7. Admin close cùng `seasonId` hai lần không duplicate snapshot.

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

1. Accepted/rejected action tạo notification đúng student.
2. Badge/certificate event tạo notification.
3. Mark one read và read-all cập nhật count.
4. User không mark-read notification của người khác.
5. SSE dùng native `EventSource('/notifications/stream?accessToken=...')`; khi có notification mới, unread count tăng mà không cần refresh.
6. Mission status changed, report created/reviewed, user reported và user status changed đều tạo notification đúng recipient/role.

### 11. Certificates và reward claim

1. Sau close season, certificate card xuất hiện.
2. Download gọi API bằng bearer token, lưu file PDF attachment; không mở URL protected trực tiếp và không còn Whitelabel `401`.
3. Render PDF A4 landscape một trang; tên/ID dài không tràn, mô tả và chữ ký không bị cắt.
4. Close cùng season không duplicate certificate.
5. Reward claim thành công một lần và UI hiển thị voucher/history.

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

1. Student: points, rank, badges, certificates, missions joined; chart trạng thái submit và submit theo mission.
2. Moderator: pending/accepted/rejected review, open reports, own mission và chart status.
3. Admin: users theo role, mission lifecycle, action outcomes/types, points, badges, certificates, reports.
4. Reports weekly/monthly/yearly/all hiển thị `badgesGranted`, `certificatesIssued`.
5. Student lookup hiển thị points hiện tại, badge count, certificate count.

## Responsive/mobile

Test tối thiểu ở `390x844`, `768x1024`, `1440x900`:

- không overflow ngang;
- mobile bottom nav không che content;
- modal/drawer scroll được và nút action luôn tiếp cận được;
- bảng review/catalog chuyển layout phù hợp;
- text/button không bị cắt;
- light/dark đều đạt tương phản;
- evidence/certificate mở được trên mobile thật qua `http://<LAN-IP>:3000`.

## Playwright nên bổ sung

1. Register -> verify -> login -> profile.
2. Student upload evidence -> accepted -> wallet/badge/leaderboard.
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
