# EcoQuest Campus – Frontend Changelog

> **Historical changelog.** File này giữ lịch sử thay đổi frontend từ nhiều phiên. Trạng thái hiện tại và API contract mới nhất nằm ở `docs/frontend-handoff.md`, checklist test nằm ở `docs/frontend-test-scenarios.md`, báo cáo tổng hợp nằm ở `docs/bao-cao-hien-trang-project.md`.

**Ngày cập nhật:** 2026-06-23  
**Môi trường:** React + Vite + Vanilla CSS  
**API Gateway:** `http://localhost:18080` (local dev) | `/auth /catalog /actions /rewards /leaderboards /recognitions` (container nginx)

---

## Cập Nhật Mới Nhất: 2026-06-23 (Cải Tiến Giao Diện & Trải Nghiệm Người Dùng)

### 📊 1. Leaderboard (Bảng Xếp Hạng)
- Thiết kế **Bục vinh quang 3D** cho Top 1, 2, 3 với màu kim loại sang trọng, đổ bóng nổi bật, tự động sinh initials avatar.
- Tô màu xanh lá chủ đạo nổi bật dòng sinh viên hiện tại kèm nhãn hiệu **"YOU"** đặc trưng.
- Bo tròn thiết kế khung tra cứu thứ hạng và hiển thị huy chương tìm kiếm tương ứng.

### 📄 2. Certificates (Chứng Nhận Thành Tích)
- Thêm **Con dấu vàng SVG chuyên nghiệp (Golden Seal)** với ruy băng xanh và các chữ ký viết tay nghệ thuật.
- Sử dụng font chữ calligraphy `Alex Brush` và font chữ học thuật `Cinzel` / `Cormorant Garamond` để hiển thị tên và danh hiệu chuẩn chỉ.
- Tích hợp in ấn khổ ngang A4 (`@page { size: A4 landscape; margin: 0; }`) giúp căn chuẩn vừa khít một mặt giấy khi in hoặc xuất file PDF từ trình duyệt.
- Tái cấu trúc thẻ chứng nhận ngoài trang chính với hiệu ứng đổ bóng mạ vàng/xám bạc theo thứ hạng.

### 💰 3. Wallet & Badges (Ví Điểm & Huy Hiệu)
- Thiết kế huy hiệu dạng huân chương tròn bóng bẩy, viền vàng rực rỡ đối với huy hiệu đã mở khóa.
- Click vào huy hiệu sẽ mở hộp thoại thông tin chi tiết: cốt truyện (lore), độ hiếm (Common, Rare, Epic, Legendary), thời gian mở khóa chính xác.
- Thêm thanh tiến trình mượt mà chỉ dẫn điểm số còn lại để mở khóa mốc tiếp theo.

### 📤 4. Upload & Duyệt Minh Chứng (Evidence Upload & Moderator Lightbox)
- Đổi trường nộp minh chứng thành kéo thả file thực tế (Drag & Drop). Frontend preview bằng data URL, sau đó gọi `POST /actions/evidence` để backend lưu file vào MinIO và trả về URL minh chứng dùng cho submit.
- Bổ sung bộ lọc kích thước giới hạn **tối đa 5MB** cho file nộp.
- Tự động hiển thị ảnh thumbnail minh chứng cho Moderator, hỗ trợ click mở hộp thoại thu phóng ảnh (Lightbox Modal) để kiểm tra tại chỗ cực kỳ tiện lợi.

---

## Tổng quan

Frontend EcoQuest Campus đã được hoàn thiện đầy đủ theo đặc tả `docs/frontend-handoff.md` và `docs/implementation_plan.md`. Đây là tổng hợp những gì đã được bộ phận trước và sau cải tiến phát triển.

---

## 1. Hệ thống Authentication (Mới)

### Files mới:
- **`src/context/AuthContext.jsx`** — React Context quản lý phiên đăng nhập
- **`src/views/AuthGate.jsx`** — Trang login/register/forgot password

### Tính năng:
- **Login** (`POST /auth/login`): Gửi email + password, nhận JWT access token
- **Register** (`POST /auth/register`): Tạo tài khoản STUDENT mới với email, password, displayName, studentId
- **Forgot Password** (`POST /auth/forgot-password`): Nhận reset token (hiển thị luôn cho demo)
- **Reset Password** (`POST /auth/reset-password`): Đặt lại mật khẩu bằng reset token
- **Session Restore** (`GET /auth/me`): Tự động phục hồi phiên từ token lưu trong `localStorage`
- **Logout**: Xóa token, về màn hình login

### Luồng xác thực:
```
App loads → AuthContext checks localStorage token
  → token found → GET /auth/me → user loaded → Dashboard
  → token missing/invalid → AuthGate (Login form)

Login → POST /auth/login → token + user → Dashboard
```

### Demo accounts:
| Email | Password | Role | Student ID |
|-------|----------|------|-----------|
| `student@ecoquest.local` | `EcoQuest@123` | STUDENT | SV001 |
| `moderator@ecoquest.local` | `EcoQuest@123` | MODERATOR | - |
| `admin@ecoquest.local` | `EcoQuest@123` | ADMIN | - |

---

## 2. Logo Ứng Dụng

- **Logo gốc:** `resources/EcoQuest Logo.png` (975KB)
- **Copy đến:** `web-apps/ecoquest-web/public/logo.png`
- **Sử dụng tại:**
  - `index.html` — favicon (`<link rel="icon">`) + apple-touch-icon
  - `AuthGate.jsx` — logo center trên trang đăng nhập
  - `Sidebar.jsx` — logo trong sidebar (desktop)
  - `TopBar.jsx` — logo nhỏ hiển thị trên mobile (bên trái hamburger menu)

---

## 3. API Client (`src/api/ecoquestApi.js`)

### Thay đổi:
- Thêm **Auth Interceptor** tự động đính `Authorization: Bearer <token>` vào mọi request
- Thêm đầy đủ **Auth API**: `authRegister`, `authLogin`, `authForgotPassword`, `authResetPassword`, `authMe`
- Proxy config: Thêm `/auth` vào `vite.config.js`

### Đường dẫn API theo service:

| Service | Prefix | Qua |
|---------|--------|-----|
| Identity Access | `/auth/**` | Gateway → port 8086 |
| Green Catalog | `/catalog/**` | Gateway → port 8081 |
| Eco Action | `/actions/**` | Gateway → port 8082 |
| Reward Ledger | `/rewards/**` | Gateway → port 8083 |
| Leaderboard | `/leaderboards/**` | Gateway → port 8084 |
| Recognition | `/recognitions/**` | Gateway → port 8085 |
| Policy (local-only) | `${VITE_POLICY_BASE_URL || current-host:8090}/policies/rules` | Direct |

---

## 4. App.jsx — Central Router

### Thay đổi lớn:
- Wrap toàn app trong `AuthProvider`
- **Loading screen** khi đang restore session từ localStorage
- **Auth gate**: Chưa login → hiển thị `AuthGate`, đã login → hiển thị app shell
- Role tự động sync từ `user.role` khi login (`STUDENT → Student`, `MODERATOR → Moderator`, `ADMIN → Admin`)
- StudentId lấy từ `user.studentId` (đồng bộ thật sự từ backend)
- Role switcher vẫn giữ cho mục đích demo

---

## 5. Sidebar (`src/components/Sidebar.jsx`)

### Thay đổi:
- **Logo image** thay thế icon Leaf thuần
- **User info panel**: Hiển thị displayName, email, studentId của người dùng đang đăng nhập
- **Sign Out button**: Gọi `logout()` từ AuthContext
- Import `useAuth` hook

---

## 6. StudentDashboard (`src/views/StudentDashboard.jsx`)

### Thay đổi:
- **Mission title** hiển thị thay vì `missionId` thô (load missions song song và build lookup map)
- Thêm cột **"Reason"** (`policyReason`) trong bảng action history
- Thêm nút **Refresh** button trong phần Recent Actions
- Cả desktop table và mobile cards đều hiển thị mission title
- Loading skeleton cải thiện (4 stat cards + 2 card skeletons)

---

## 7. WalletBadges (`src/views/WalletBadges.jsx`)

### Thay đổi:
- **Progress bar** tiến độ đến badge tiếp theo (gradient primary → gold)
- **Emoji icons** cho từng badge (GREEN_STARTER=🌱, RECYCLING_HERO=♻️, ...)
- Badge grid sắp xếp theo `requiredPoints` ascending
- Hiển thị badge description nhỏ bên dưới mỗi badge
- "All badges unlocked" state khi đã đạt hết

---

## 8. CSS System (`src/styles.css`)

### Thêm mới (Sections 32-34):
- `.topbar-logo-mobile` — logo nhỏ hiển thị trên mobile topbar (ẩn ở desktop)
- Auth card styles (`.auth-page`, `.auth-card`)
- Extra utilities: `.w-full`, `.text-center`, `.cursor-pointer`
- `.progress-bar-track`, `.progress-bar-fill` — progress component

---

## 9. index.html

### Thay đổi:
- `<link rel="icon">` → `/logo.png`
- `<link rel="apple-touch-icon">` → `/logo.png`
- `<meta name="theme-color" content="#1c7c54">` cho mobile browsers

---

## 10. vite.config.js

### Thay đổi:
- Thêm `/auth` proxy entry với `changeOrigin: true`
- Tất cả proxy dùng object syntax (`{ target, changeOrigin }`) nhất quán

---

## Các Views Đã Có Sẵn (Không Đổi Logic)

| View | File | Trạng thái |
|------|------|-----------|
| Submit Action Modal | `SubmitActionModal.jsx` | ✅ Đầy đủ — mission select, station select, evidence URL, draft save, submit + idempotency key |
| Leaderboard | `Leaderboard.jsx` | ✅ Đầy đủ — weekly/monthly tabs, top-3 podium, rank lookup, admin close season |
| Moderator Review | `ModeratorReview.jsx` | ✅ Đầy đủ — queue hiển thị, approve/reject với reason |
| Certificates | `Certificates.jsx` | ✅ Đầy đủ — cert cards, PDF download, reward claims |
| Admin Catalog | `AdminCatalog.jsx` | ✅ Đầy đủ — CRUD Missions, Stations, Badges với search và toggle |
| Admin Policy | `AdminPolicy.jsx` | ✅ Đầy đủ — inline edit policy rules (local-only direct HTTP) |
| Admin Adjust | `AdminAdjust.jsx` | ✅ Đầy đủ — điều chỉnh điểm thủ công cho student |

---

## Các Components Đã Có Sẵn

| Component | Chức năng |
|-----------|-----------|
| `Sidebar.jsx` | Navigation sidebar với role switcher (updated: logo + user info + logout) |
| `TopBar.jsx` | Header với mobile menu, student ID selector, theme toggle (updated: mobile logo) |
| `BottomNav.jsx` | Mobile bottom navigation |
| `Modal.jsx` | Accessible dialog với focus trap, Escape close, mobile bottom drawer |
| `MissionCard.jsx` | Mission card với badges evidence/station requirements |
| `StatCard.jsx` | Dashboard stat card với icon + value + sub |
| `StatusBadge.jsx` | ACCEPTED/PENDING_REVIEW/REJECTED badge |
| `EmptyState.jsx` | Empty state với icon, title, description |
| `AsyncBanner.jsx` | Info/warning/success inline banner |
| `Toast.jsx` | Toast notification system (ToastProvider + useToast hook) |

---

## Luồng Business Logic Đã Test

```
[Student Login] → Dashboard load wallet/rank/badges/missions/actions
     ↓
[Submit Mission] → POST /actions/submit với idempotency key
     ↓
  ACCEPTED → +points → Dashboard refresh (3s delay) → wallet/leaderboard update
  PENDING_REVIEW → Moderator queue hiển thị
     ↓
[Moderator Approve] → PUT /actions/{id}/approve → RabbitMQ → Reward → Leaderboard
     ↓
[Close Season] (Admin) → POST /leaderboards/seasons/{id}/close → Recognition → PDF
     ↓
[Download Certificate] → GET /recognitions/certificates/{id}/download → MinIO PDF
```

---

## Cách Chạy

### Local Dev (Vite proxy đến Gateway):
```bash
# 1. Start backend stack
$env:API_GATEWAY_PORT='18080'
docker compose up -d

# 2. Start frontend dev server
cd web-apps/ecoquest-web
npm install
npm run dev
# → http://localhost:3000 (hoặc port tiếp theo nếu busy)
```

### Container (nginx proxy):
```bash
docker compose up -d ecoquest-web
# → http://localhost:3000
```

### Build kiểm tra:
```bash
npm run build  # ✅ Build thành công, 0 errors
```

---

## Lưu Ý Quan Trọng

1. **Gateway port**: Docker Compose mặc định port 8080, nhưng local demo thường dùng `API_GATEWAY_PORT=18080`. `vite.config.js` hiện đọc `VITE_API_BASE_URL` và mặc định proxy đến `http://localhost:18080`.

2. **Eventual Consistency**: Sau khi submit action, điểm/leaderboard không cập nhật ngay — cần đợi vài giây (RabbitMQ event flow). Dashboard tự refresh sau 3s.

3. **Policy Admin** (`AdminPolicy.jsx`): Gọi thẳng Policy service (không qua Gateway). Mặc định dùng hostname hiện tại với port `8090`, hoặc cấu hình `VITE_POLICY_BASE_URL`; vẫn là local-only/direct service.

4. **Auth JWT/RBAC**: Backend hiện enforce bearer token và role checks trên Catalog, Action, Reward, Leaderboard, Recognition, và Policy Admin. UI không được dùng role switcher để bypass role của token; nếu giữ role switcher thì chỉ dùng như chế độ preview.

5. **Evidence Upload**: Backend đã có `POST /actions/evidence` lưu file vào MinIO; certificate PDF vẫn dùng MinIO riêng trong Recognition.
# Update 2026-06-24 - Backend Alignment And QA Notes

- Backend now exposes 9 microservices: Identity, Catalog, Action, Policy, Reward, Leaderboard, Recognition, Report, Notification.
- Auth flow now includes email verification and resend verification. Register should show verification flow instead of treating the user as logged in.
- Role switch rules are enforced in both frontend utilities and backend RBAC: Student only Student; Moderator Student+Moderator; Admin Moderator+Admin.
- Mission workflow is active-only for submission. Management views can show `PENDING`, `REJECTED`, `CANCELLED`, `COMPLETED`.
- Latest backend alignment adds Catalog station image upload, Report evidence upload, Report analytics APIs, notification SSE with `accessToken` query, and dynamic Policy Admin base URL.
- Frontend `Reports` gained report evidence upload; Admin analytics was later moved into its own sidebar page. `TopBar` opens SSE for unread count; `AdminCatalog` can upload station image files without changing existing CRUD flow.
- Frontend API client includes Report, Notification, Profile, Admin Users and mission status endpoints.
- Added frontend unit tests in `web-apps/ecoquest-web/test/accessRules.test.js` and `web-apps/ecoquest-web/test/workflowRules.test.js`; `npm.cmd test` passes 6/6.
- Production build verified with `npm.cmd run build`; backend smoke and queue drain also pass after the latest backend alignment.
- For the current API contract and handoff, use `docs/frontend-handoff.md`; for QA, use `docs/frontend-test-scenarios.md`.

# Update 2026-06-25 - Role Panels, PDF, Email Links, Notifications, Dashboards

- Isolated navigation for Student, Moderator, and Admin panels; Moderator/Admin panels no longer duplicate Student-only pages.
- Added Moderator own-mission catalog workflow: create as `PENDING`, list only missions created by that moderator, Admin approves status.
- Fixed certificate download to use an authenticated blob request; backend returns a PDF attachment instead of opening a protected URL and producing Whitelabel 401.
- Added frontend deep-link handling for `/verify-email?token=...` and `/reset-password?token=...`.
- Replaced the notification modal with a dropdown under the bell, including toggle, outside-click close, mark-all-read, SSE updates, and role-safe navigation.
- Added distinct charts/metrics for Student, Moderator, and Admin dashboards.
- Admin Analytics displays points, badge and certificate event read models from Report service.
- Latest verification: frontend tests 12/12, Vite build pass, backend full smoke pass, 20 RabbitMQ queues drained.

# Update 2026-06-25 - Admin Analytics, Login Feedback, Help Content, Rich Charts

- Split Policy & Privacy and Application Guide into two genuinely different information flows.
- Added precise login feedback for invalid credentials, unverified email, inactive account, banned account, rate limit, network failure, and backend outage.
- Added a standalone Admin `Analytics` sidebar page; `Reports` remains the moderation workflow for reported content/users/actions.
- Added weekly/monthly/yearly system analytics for actions, missions created, users registered, points, badges, certificates, top students, action types, and per-student outcomes.
- Added reusable donut, column, and area chart components and applied varied visualizations to Student, Moderator, and Admin dashboards.
- Report analytics now consumes Catalog mission and Identity registration events through RabbitMQ; no frontend or reporting service reads another service database.

# Update 2026-06-25 - Analytics Export, CRUD Fixes, Rich Seed Data

- Admin Analytics now exports a polished PDF report through `GET /reports/analytics/export?period=...`; frontend downloads it as an authenticated blob.
- Catalog badge management now has true REST update support via `PUT /catalog/badges/{code}` and the admin UI uses it when editing badges.
- Seed data expanded to 15 missions, 7 stations, 15 policy rules, 10 student demo accounts, 36 seeded submit actions, reward wallets/badges, certificates, reports, leaderboard historical periods, and report analytics records across current week/month plus weekly/monthly/yearly windows.
- Backend smoke now verifies seeded mission/policy counts, badge update, seeded SV001 actions, analytics PDF `application/pdf` attachment, and the existing full microservice flow.

### 2026-06-25 - Report target and analytics series alignment

- Removed the Student ID selector from Student-panel topbar pages so Dashboard, Wallet & Badges, and Certificates use the same topbar pattern as the rest of the app.
- Reports now use searchable target pickers for users, missions, and review actions instead of asking users to type raw target IDs.
- Admin User Management disables current-admin role/status/delete actions; backend also rejects self-mutation.
- Admin Analytics now includes official period series: every week in a selected year, all twelve months in a selected year, and each year in a selected range. The table is used to choose a period; authenticated export downloads the selected week/month/year with the polished single-period PDF layout.
- Sidebar order updated: Moderator keeps Review Queue and My Mission Catalog directly under Dashboard; Admin surfaces Analytics directly under Dashboard.

### 2026-06-25 - Analytics Range Guards, Student Outcomes, Policy CRUD

- Admin Analytics range picker now blocks future weeks/months/years and reversed year ranges; weekly/monthly reports use explicit from/to controls.
- Student outcome report no longer overlaps controls, supports All students and One student modes, and follows the selected reporting range.
- Moderator Review evidence thumbnails now fall back to an Open evidence link if a media URL cannot render inline.
- Admin Policy Rules gained Add rule and guarded Delete rule UI; delete is enabled only after a rule is inactive.

### 2026-06-26 - Policy Modal, Email Logo, Dashboard Resilience

- Admin Policy Rules now creates new rules through a modal overlay instead of a cramped inline row.
- Student outcome One Student lookup uses a dedicated responsive picker so long display names/student IDs no longer overlap the View student button.
- Student, Moderator, and Admin dashboards render partial data when one backend endpoint is still warming up instead of failing the whole screen.
- Identity branded emails now use the real EcoQuest PNG logo attached inline by CID.

### 2026-07-01 - Notification Seed And Microservice Demo Readiness

- Notification service now seeds role/person inbox data for Student, Moderator, and Admin, so the bell dropdown has realistic data after a clean reset.
- Backend smoke verifies seeded notification role inbox, read-all, recipient guard, event-created notifications, and RabbitMQ drain.
- RabbitMQ healthcheck is stricter (`ping`, `check_running`, `check_port_connectivity`) so event consumers start after the broker application is actually ready.
- Documentation now includes a microservices demo script covering Gateway, JWT, database-per-service, gRPC, RabbitMQ, Redis, MinIO, Notification, Report Analytics, coupon claims, and smoke tests.
