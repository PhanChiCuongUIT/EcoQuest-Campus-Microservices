# EcoQuest Campus — Frontend System Documentation & Summary

Tài liệu này tổng hợp toàn bộ hiện trạng hệ thống Frontend của dự án **EcoQuest Campus** (sử dụng React + Vite + Vanilla CSS), bao gồm tất cả các tính năng đã phát triển trong phiên làm việc trước và các cải tiến giao diện (Leaderboard, Certificates, Wallet & Badges, và cơ chế Upload minh chứng) trong phiên làm việc này.

---

## Current Alignment Update - 2026-06-26

Backend alignment has changed since the earlier frontend notes:

- Backend has 9 microservices, not 7: Identity, Catalog, Action, Policy, Reward, Leaderboard, Recognition, Report, Notification.
- Register now requires email verification before login. Local mode exposes a verification token for testing; SMTP mode can send real Gmail messages when configured.
- Role switching is limited by backend role: Student only Student; Moderator Student+Moderator; Admin Moderator+Admin. Each panel has isolated navigation, so Moderator/Admin panels do not duplicate Student pages.
- Only `ACTIVE` missions can be submitted. Frontend must hide/disable non-active missions for Student flows.
- Report, Report analytics, Notification SSE, Profile, Admin Users, mission status workflow, station `imageUrl`/image upload, evidence MinIO upload, and Moderator own-action protection are part of the current scope.
- Latest alignment also includes report target pickers instead of raw Target ID input, Admin self-protection in User Management, and Admin Analytics period series for choosing any week/month/year before exporting that selected period.
- Certificate download uses an authenticated blob request and saves a PDF attachment; email verify/reset links have dedicated frontend routes.
- Notification is a dropdown under the bell with SSE, read-all, toggle and role-safe navigation.
- Current verification: `npm.cmd test` passes 9/9, `npm.cmd run build` passes, full backend smoke passes, Maven builds pass, and all 18 RabbitMQ queues drain to 0 messages after the smoke run.
- Admin now has separate `Reports` and `Analytics` sidebar pages. Analytics supports weekly/monthly/yearly summaries, student outcome lookup, period series tables, and authenticated selected-period PDF export from the Report-service event read model.
- Policy & Privacy and Application Guide now have distinct content. Login errors distinguish credentials, email verification, inactive, banned, network, rate-limit, and server cases.
- Student, Moderator, and Admin dashboards use reusable donut, column, and area charts with role-specific metrics.
- Admin Analytics now blocks future/reversed reporting ranges, exposes all-student outcome reports by selected period, and Policy Rules supports guarded create/update/delete through the Policy service direct admin API.
- Latest UI fixes move Policy rule creation into a modal overlay, prevent One Student analytics controls from overlapping, and make dashboards render partial data if one backend service is still warming up.

For clean API contracts and test scenarios, use `docs/frontend-handoff.md` and `docs/frontend-test-scenarios.md`. Older text below is kept as historical frontend summary and may contain encoding artifacts from prior generation.

## 1. Kiến Trúc & Cấu Trúc Thư Mục

Thư mục nguồn frontend nằm tại `web-apps/ecoquest-web/src` với cấu trúc như sau:

- **`src/context/`**
  - `AuthContext.jsx`: Quản lý phiên đăng nhập của người dùng qua JWT. Hỗ trợ tự phục hồi session bằng `/auth/me` trên local storage.
- **`src/api/`**
  - `ecoquestApi.js`: API Client sử dụng Axios. Có interceptor tự động đính kèm `Authorization: Bearer <token>` vào mọi yêu cầu.
- **`src/components/`**
  - `AppShell.jsx`: Khung sườn layout (Sidebar + TopBar trên desktop; BottomNav trên mobile).
  - `Sidebar.jsx`: Thanh menu bên trái chứa logo, thông tin tài khoản đăng nhập và nút Sign Out.
  - `TopBar.jsx`: Thanh trên cùng, tích hợp bộ chuyển đổi Student ID để test nhanh dữ liệu.
  - `BottomNav.jsx`: Menu điều hướng phía dưới dành cho thiết bị di động.
  - `Modal.jsx`: Hộp thoại modal hỗ trợ phím Escape, giữ focus (focus trap), tự động thu gọn thành Bottom Drawer trên mobile.
  - `Toast.jsx`: Hệ thống thông báo toast (Success/Warning/Error).
  - `StatCard.jsx` & `StatusBadge.jsx` & `EmptyState.jsx` & `AsyncBanner.jsx`: Các component giao diện dùng chung.
- **`src/views/`**
  - `AuthGate.jsx`: Màn hình Login, Register, Forgot Password và Reset Password (tích hợp phím điền tài khoản demo).
  - `StudentDashboard.jsx`: Bảng điều khiển chính hiển thị điểm số, tiến độ, danh sách nhiệm vụ và lịch sử Eco Actions.
  - `SubmitActionModal.jsx`: Modal điền và nộp minh chứng hoạt động môi trường (tích hợp kéo thả file).
  - `WalletBadges.jsx`: Xem số dư ví điểm, lịch sử giao dịch và bộ sưu tập huy hiệu.
  - `Leaderboard.jsx`: Bảng xếp hạng Tuần/Tháng với bục vinh quang 3D và tìm kiếm nhanh thứ hạng.
  - `Certificates.jsx`: Xem chứng nhận thành tích và đổi phần thưởng coupon.
  - `ModeratorReview.jsx`: Hàng đợi duyệt minh chứng của Moderator.
  - `AdminCatalog.jsx` & `AdminPolicy.jsx` & `AdminAdjust.jsx`: Các trang quản trị hệ thống.
- **`src/utils/`**
  - `printCertificate.js`: Hàm xuất/in chứng nhận đẹp chuẩn A4 landscape trực tiếp từ trình duyệt.

---

## 2. Các Tính Năng Đã Thực Hiện

### 🔐 2.1 Hệ Thống Authentication & Quản Lý Phiên (Auth)
- **Đăng ký / Đăng nhập** (`POST /auth/register`, `POST /auth/login`): Liên kết trực tiếp tới `identity-access-service`.
- **Tự động phục hồi phiên** (`GET /auth/me`): Khi tải trang, nếu phát hiện JWT token trong `localStorage`, client sẽ gọi API `/auth/me` để lấy thông tin tài khoản (DisplayName, Email, Role, StudentID) và tự động đăng nhập.
- **Quên mật khẩu**: Trả về trực tiếp mã reset token dùng cho môi trường thử nghiệm và đặt lại mật khẩu thành công.
- **Tài khoản Demo sẵn có** (mật khẩu mặc định: `EcoQuest@123`):
  - Student: `student@ecoquest.local` (MSSV: `SV001`)
  - Moderator: `moderator@ecoquest.local`
  - Admin: `admin@ecoquest.local`

### 📤 2.2 Nộp Minh Chứng Hành Động (Eco Action Submission)
- **Tải lên từ thiết bị (Upload từ máy)**: Thay thế hoàn toàn ô nhập URL văn bản thô bằng một widget Kéo & Thả (Drag & Drop) thông minh.
- **Upload MinIO qua backend**: File hình ảnh/PDF vẫn được preview bằng data URL ở phía client, sau đó frontend gọi `POST /actions/evidence`; backend lưu file vào MinIO và trả về `evidenceUrl` dạng `/actions/evidence/{objectKey}` để gửi tiếp trong `POST /actions/submit`.
- **Giới hạn kích thước file**: Đã bổ sung bộ kiểm tra kích thước, giới hạn file dưới **5MB** và đưa ra cảnh báo đỏ ngay trên widget nếu người dùng cố nộp file quá lớn.
- **Xem trước ảnh**: Hiển thị ảnh thumbnail thu nhỏ ngay khi chọn file thành công kèm theo nút xóa để chọn lại file khác.

### 📋 2.3 Duyệt Minh Chứng (Moderator Review Queue)
- **Xem ảnh trực tiếp**: Đối với các minh chứng dạng `/actions/evidence/{objectKey}` hoặc link ảnh, Moderator sẽ thấy thumbnail **120x90px** trực tiếp trong thẻ duyệt thay vì đường dẫn text.
- **Click-to-Zoom (Lightbox Modal)**: Moderator có thể click vào ảnh thumbnail để phóng to ảnh trên toàn màn hình qua một modal tối chuyên nghiệp, giúp duyệt nhanh hơn mà không cần rời tab.

### 📊 2.4 Bảng Xếp Hạng Cao Cấp (Premium Leaderboard)
- **Bục vinh quang 3D (3D Podium)**: Vị trí Top 1, 2, 3 được xếp theo đúng thứ tự trực quan (2 - 1 - 3). Các bệ bục được thiết kế hiệu ứng đổ bóng và dải chuyển màu kim loại sang trọng (Vàng, Bạc, Đồng), kèm theo vương miện và huy hiệu riêng.
- **Avatar viết tắt**: Tự động lấy các ký tự đầu tiên của mã sinh viên tạo thành avatar tròn đẹp mắt.
- **Nổi bật dòng sinh viên hiện tại**: Khi tài khoản sinh viên đang đăng nhập nằm trong bảng xếp hạng, dòng đó sẽ tự động được tô nền xanh nhạt, viền trái nổi bật và gắn nhãn **"YOU"** viết hoa.
- **Tra cứu thứ hạng**: Hộp tìm kiếm kết quả tra cứu được bo tròn, đổ bóng sang trọng và hiển thị kết quả tìm kiếm kèm theo các huy hiệu thứ hạng tương ứng.

### 💰 2.5 Ví Điểm & Huy Hiệu (Wallet & Badges)
- **Tiến độ nâng cấp**: Khung tiến trình (Progress Bar) được thiết kế bo tròn mượt mà, hiển thị rõ ràng số điểm hiện tại và số điểm cần đạt để mở khóa huy hiệu tiếp theo.
- **Huy hiệu dạng Huân chương**: Các huy hiệu được vẽ khung tròn viền kim loại nổi bật (viền vàng cho huy hiệu đã mở khóa, viền xám khóa cho huy hiệu chưa mở khóa).
- **Hộp thoại thông tin chi tiết huy hiệu**: Khi click vào bất kỳ huy hiệu nào, một modal chi tiết sẽ hiện lên hiển thị tên huy hiệu, độ hiếm (Common, Rare, Epic, Legendary), lịch sử mở khóa chi tiết (ngày giờ) và cốt truyện (lore) của huy hiệu đó.
- **Lịch sử giao dịch**: Bảng lịch sử được định dạng sạch sẽ, hiển thị lượng điểm cộng với màu xanh lá đặc trưng của ứng dụng.

### 📄 2.6 Chứng Nhận Thành Tích (Certificates & A4 Landscape PDF)
- **Bản xem trước trực quan (WYSIWYG)**: Modal xem trước chứng nhận được thiết kế khớp hoàn toàn với bản in thật.
- **Giao diện chứng nhận chuẩn chỉ**:
  - Tông màu cổ điển ấm áp (nền màu kem `#FAF7F0`, họa tiết nhạt chìm làm nền).
  - Viền kép hoa văn cổ điển mạ vàng và xanh ngọc bảo.
  - Tích hợp **Con dấu vàng nổi (SVG Golden Seal)** góc dưới bên trái cực kỳ sang trọng với dải ruy băng xanh lá/vàng.
  - Font chữ đa dạng: Chữ tiêu đề học thuật có chân (`Cinzel`, `Cormorant Garamond`), chữ viết tay bay bướm nghệ thuật (`Alex Brush`) cho tên người nhận và chữ ký giám đốc.
- **Xuất file PDF chuyên nghiệp**:
  - Sử dụng CSS Media `@page { size: A4 landscape; margin: 0; }` để ép trình duyệt in theo hướng ngang A4 chuẩn.
  - Sử dụng thuộc tính `print-color-adjust: exact` để đảm bảo màu nền và con dấu vàng được in nguyên vẹn.
  - Căn chỉnh kích thước container `297mm x 210mm` vừa khít 1 trang A4 duy nhất, không bị tràn hay cắt lề.

---

## 3. Bản Đồ Proxy API (Vite Config & Nginx Gateway)

Mọi yêu cầu API từ frontend sử dụng relative path để đảm bảo tương thích khi chạy trực tiếp qua Gateway ở môi trường local hoặc chạy qua container Nginx:

| Microservice | Endpoint | Proxy Target |
|---|---|---|
| **Identity Access** | `/auth/**` | `http://localhost:18080/auth` (Gateway port) |
| **Green Catalog** | `/catalog/**` | `http://localhost:18080/catalog` |
| **Eco Action** | `/actions/**` | `http://localhost:18080/actions` |
| **Reward Ledger** | `/rewards/**` | `http://localhost:18080/rewards` |
| **Leaderboard** | `/leaderboards/**` | `http://localhost:18080/leaderboards` |
| **Recognition** | `/recognitions/**` | `http://localhost:18080/recognitions` |
| **Verification Policy** | `${VITE_POLICY_BASE_URL || current-host:8090}/policies/rules` | Gọi trực tiếp (Local Only Admin) |

---

## 4. Hướng Dẫn Vận Hành

### Chạy ở môi trường Local Development (Vite):
1. Khởi động backend stack qua cổng gateway `18080` hoặc `8080`.
2. Truy cập thư mục frontend: `cd web-apps/ecoquest-web`
3. Cài đặt thư viện: `npm install`
4. Chạy dev server: `npm run dev`
5. Truy cập ứng dụng tại địa chỉ: `http://localhost:3000` (hoặc cổng tiếp theo nếu bận).

### Kiểm tra build sản phẩm:
Chạy lệnh `npm run build` để xác thực biên dịch sạch 100%, không cảnh báo. Kết quả build sẽ nằm tại thư mục `dist/`.
