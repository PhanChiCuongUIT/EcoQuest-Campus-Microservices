# Tài Liệu Nguồn Viết Báo Cáo DOCX - EcoQuest Campus

Cập nhật: 2026-07-01

Tài liệu này là nguồn nội dung tiếng Việt có dấu để viết báo cáo DOCX cho project **EcoQuest Campus**. Nội dung đã được đối chiếu lại với source code backend, frontend, các entity/controller hiện có và trạng thái kiểm thử gần nhất.

## 1. Tóm Tắt Project

EcoQuest Campus là hệ thống gamification cho các hoạt động xanh trong trường học. Sinh viên tham gia mission, nộp minh chứng, nhận điểm, mở khóa huy hiệu, nhận chứng nhận PDF và đổi coupon khi đủ điều kiện. Moderator duyệt minh chứng, xử lý report và tạo mission ở trạng thái chờ duyệt. Admin quản trị toàn hệ thống: catalog, user, policy rule, điểm, report, analytics, coupon và close season để phát certificate.

Hiện trạng tổng quát:

- Backend có **9 microservice** độc lập: Identity, Catalog, Action, Policy, Reward, Leaderboard, Recognition, Report, Notification.
- Mỗi microservice có database hoặc storage riêng theo nguyên tắc **database-per-service**.
- Gateway chỉ route request, không chứa nghiệp vụ.
- RabbitMQ dùng cho event-driven communication.
- gRPC dùng cho luồng kiểm policy nội bộ từ Action sang Policy.
- Redis dùng cho draft action, idempotency và leaderboard realtime.
- MinIO dùng cho avatar, ảnh station, evidence action, evidence report và certificate PDF.
- Frontend React/Vite có 3 panel rõ ràng: Student, Moderator, Admin.
- Backend smoke test gần nhất PASS; frontend unit test/build gần nhất PASS.
- Seed sạch sau reset có 15 mission, 12 user demo, nhiều action mẫu theo nhiều mốc thời gian, leaderboard tuần/tháng hiện tại và quá khứ, report, notification, certificate, coupon.

## 2. Mục Tiêu Và Phạm Vi

### 2.1. Mục Tiêu Nghiệp Vụ

- Khuyến khích sinh viên tham gia hoạt động bền vững trong campus.
- Số hóa quá trình nộp minh chứng, duyệt minh chứng, cộng điểm và xếp hạng.
- Tạo động lực bằng điểm thưởng, huy hiệu, chứng nhận và coupon.
- Giúp nhà trường theo dõi báo cáo tuần/tháng/năm.
- Đảm bảo mỗi vai trò chỉ thao tác đúng quyền.

### 2.2. Phạm Vi Chức Năng Chính

- Đăng ký, xác minh email, đăng nhập, quên mật khẩu, reset mật khẩu.
- Phân quyền Student, Moderator, Admin.
- Quản lý profile và upload avatar.
- Quản lý mission, station, badge definition.
- Nộp eco action theo mission, upload evidence, lưu draft, chống submit trùng bằng idempotency.
- Kiểm policy: required evidence, required station, daily limit, base points.
- Moderator approve/reject action cần duyệt.
- Reward wallet, transaction ledger, badge unlock, manual point adjustment.
- Leaderboard weekly/monthly, xem kỳ hiện tại và kỳ cũ, close season.
- Certificate PDF, preview/download/print.
- Coupon thật: reward offer, eligibility, stock, hạn dùng, voucher claim.
- Report user/mission/action, upload evidence report, review report.
- Admin analytics, student outcome report và export PDF theo khoảng tuần/tháng/năm hợp lệ.
- Notification inbox, mark read/read all và SSE realtime.

## 3. Kiến Trúc Tổng Thể

```text
React/Vite Web App
    |
    v
Spring Cloud Gateway :18080
    |
    +-- Identity Access ------ PostgreSQL identity_db + MinIO avatars + SMTP
    +-- Green Catalog -------- PostgreSQL catalog_db + MinIO station images
    +-- Eco Action ----------- MongoDB action_db + Redis + MinIO evidence
    +-- Verification Policy -- PostgreSQL policy_db + gRPC :9090 + REST admin :8090
    +-- Reward Ledger -------- PostgreSQL reward_db
    +-- Leaderboard ---------- Redis + PostgreSQL leaderboard_db
    +-- Recognition ---------- PostgreSQL recognition_db + MinIO certificates
    +-- Report --------------- PostgreSQL report_db + MinIO report evidence
    +-- Notification --------- PostgreSQL notification_db + SSE

RabbitMQ event bus:
Identity/Catalog/Action/Reward/Leaderboard/Recognition/Report
    -> Reward, Leaderboard, Recognition, Report, Notification
```

### 3.1. Nguyên Tắc Microservices Đang Áp Dụng

- **Single responsibility**: mỗi service sở hữu một bounded context riêng.
- **Database-per-service**: không có service nào đọc trực tiếp database của service khác.
- **Không foreign key vật lý xuyên service**: các ID như `studentId`, `missionId`, `sourceActionId` chỉ là tham chiếu logic.
- **Gateway mỏng**: Gateway chỉ xác thực/route theo path, không xử lý nghiệp vụ.
- **Eventual consistency**: Reward, Leaderboard, Report, Notification và Recognition cập nhật bằng RabbitMQ event.
- **Sync call có kiểm soát**:
  - Action gọi Catalog để validate mission.
  - Action gọi Policy bằng gRPC để evaluate rule.
- **File ownership rõ ràng**: service nào sở hữu nghiệp vụ thì service đó upload/download file qua MinIO bucket riêng.

## 4. Danh Sách Microservices

| Service | Port | Trách nhiệm chính | Storage chính | API chính |
| --- | ---: | --- | --- | --- |
| Identity Access | 8086 | Auth, email verification, forgot/reset password, profile/avatar, user management | PostgreSQL `identity_db`, MinIO avatar, SMTP | `/auth/**` |
| Green Catalog | 8081 | Mission, station, badge definition, mission workflow, station image | PostgreSQL `catalog_db`, MinIO station image | `/catalog/**` |
| Eco Action | 8082 | Draft, evidence upload, submit action, moderation, idempotency, outbox | MongoDB `action_db`, Redis, MinIO evidence | `/actions/**` |
| Verification Policy | 8090 REST, 9090 gRPC | Policy rule, required evidence/station, daily limit, point decision | PostgreSQL `policy_db` | `/policies/rules`, gRPC internal |
| Reward Ledger | 8083 | Wallet, transaction ledger, badge achievement, manual adjustment | PostgreSQL `reward_db` | `/rewards/**` |
| Leaderboard | 8084 | Weekly/monthly rank, historical lookup, close season, snapshot | Redis, PostgreSQL `leaderboard_db` | `/leaderboards/**` |
| Recognition | 8085 | Certificate PDF, reward offer, coupon/voucher claim | PostgreSQL `recognition_db`, MinIO certificates | `/recognitions/**` |
| Report | 8087 | Report workflow, evidence report, analytics read model, PDF export | PostgreSQL `report_db`, MinIO report evidence | `/reports/**` |
| Notification | 8088 | Inbox, read/read-all, SSE realtime, event notifications | PostgreSQL `notification_db` | `/notifications/**` |

## 5. Database, Storage Và Ràng Buộc Chi Tiết

### 5.1. Identity Access Service - PostgreSQL `identity_db`

Identity là service sở hữu tài khoản, thông tin sinh viên ở mức đăng nhập và phân quyền. Project **không có bảng `students` riêng**. Sinh viên được biểu diễn bằng bản ghi `user_accounts` có `role = STUDENT` hoặc tài khoản Moderator có `studentId` khi cần dùng luồng sinh viên.

| Bảng | Khóa chính | Trường quan trọng | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `user_accounts` | `id` | `email`, `passwordHash`, `displayName`, `role`, `status`, `studentId`, `active`, `emailVerified`, `avatarUrl`, `statusReason`, `createdAt`, `updatedAt` | unique `email`, unique `studentId`, enum `role`, enum `status` | Tài khoản người dùng. `displayName` là họ tên hiển thị, `studentId` là MSSV/mã sinh viên |
| `password_reset_tokens` | `id` | `userId`, `tokenHash`, `expiresAt`, `usedAt`, `createdAt` | unique `tokenHash` | Token quên mật khẩu, chỉ lưu hash |
| `email_verification_tokens` | `id` | `userId`, `tokenHash`, `expiresAt`, `usedAt`, `createdAt` | unique `tokenHash` | Token xác minh email, chỉ lưu hash |

Enum:

- `UserRole`: `STUDENT`, `MODERATOR`, `ADMIN`.
- `UserStatus`: `ACTIVE`, `INACTIVE`, `BANNED`.

Ràng buộc nghiệp vụ:

- Đăng nhập chỉ thành công khi user đã verify email và `status = ACTIVE`.
- Admin không được đổi role/status/delete chính mình.
- Khi status đổi sang inactive/banned, hệ thống gửi email thông báo lý do và email hỗ trợ.
- Avatar upload qua Identity và lưu ở MinIO bucket avatar, DB chỉ lưu `avatarUrl`.

### 5.2. Green Catalog Service - PostgreSQL `catalog_db`

Catalog sở hữu mission, station và badge definition. Đây là nguồn sự thật cho dữ liệu nhiệm vụ và địa điểm xanh.

| Bảng | Khóa chính | Trường quan trọng | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `Mission` | `id` | `title`, `actionType`, `basePoints`, `evidenceRequired`, `stationRequired`, `description`, `createdByUserId`, `status` | `title` not blank, `basePoints` positive, default `status = PENDING` | Mission sinh viên có thể tham gia |
| `GreenStation` | `id` | `name`, `code`, `stationType`, `location`, `active`, `imageUrl` | `active` boolean | Trạm xanh, nơi recycle/check-in/cleanup |
| `BadgeDefinition` | `code` | `name`, `description`, `requiredPoints`, `criteriaType`, `actionType`, `requiredCount` | default `criteriaType = POINTS`, default `requiredCount = 0` | Định nghĩa huy hiệu theo điểm hoặc số lần action |

Mission status:

- `PENDING`: mission do Moderator tạo, chờ Admin duyệt.
- `ACTIVE`: mission đã được duyệt, Student có thể submit.
- `REJECTED`: mission bị từ chối.
- `CANCELLED`: mission bị hủy.
- `COMPLETED`: mission đã hoàn tất.

Ràng buộc nghiệp vụ:

- Moderator chỉ quản lý mission do chính mình tạo.
- Admin có thể CRUD mission/station/badge và duyệt trạng thái mission.
- Station image upload qua Catalog và lưu MinIO, không lưu base64 trong database.

### 5.3. Eco Action Service - MongoDB `action_db`

Action dùng MongoDB vì action submission là dữ liệu event/document có thể mở rộng evidence và metadata linh hoạt.

| Collection | Khóa chính | Trường quan trọng | Ràng buộc/logic | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `eco_actions` | `id` | `studentId`, `missionId`, `stationId`, `actionType`, `evidenceUrl`, `status`, `points`, `policyReason`, `moderationNote`, `reviewedByUserId`, `submittedAt`, `reviewedAt` | status enum `ACCEPTED`, `PENDING_REVIEW`, `REJECTED` | Action do student submit |
| `action_outbox` | `id` | `routingKey`, `payload`, `createdAt`, `publishedAt`, `lastError` | outbox publish RabbitMQ và lưu lỗi publish nếu có | Chống mất event khi lưu action rồi publish event |

Redis trong Action:

| Key/nhóm key | Ý nghĩa |
| --- | --- |
| Draft action | Lưu nháp action trước khi submit |
| Idempotency key | Chống submit trùng cùng request |
| Daily limit support | Phối hợp kiểm daily limit theo rule policy |

Ràng buộc nghiệp vụ:

- Student chỉ submit mission `ACTIVE`.
- Evidence upload qua Action, lưu MinIO bucket evidence.
- Submit accepted/rejected/pending do Policy quyết định qua gRPC.
- Nếu thiếu evidence nhưng mission/policy yêu cầu review, action thành `PENDING_REVIEW`.
- Duplicate idempotency key trả `409`.
- Action không cộng điểm trực tiếp; chỉ publish event cho Reward.

### 5.4. Verification Policy Service - PostgreSQL `policy_db`

Policy là service chuyên xử lý rule xác minh.

| Bảng | Khóa chính | Trường quan trọng | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `PolicyRule` | `actionType` | `basePoints`, `evidenceRequired`, `stationRequired`, `dailyLimit`, `active` | không delete rule active; dailyLimit >= 0 theo validation nghiệp vụ | Rule cho từng loại hành động |

Luồng sử dụng:

- Action gọi gRPC `EvaluateAction` tới Policy.
- Admin quản lý rule qua REST direct `http://localhost:8090/policies/rules`.
- Gateway không public Policy Admin API để giữ đúng mô hình internal/admin service.

### 5.5. Reward Ledger Service - PostgreSQL `reward_db`

Reward sở hữu điểm, ledger giao dịch và badge đã đạt.

| Bảng | Khóa chính | Trường quan trọng | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `RewardWallet` | `studentId` | `totalPoints` | không cho grant <= 0; adjust không được làm ví âm | Tổng điểm hiện tại của student |
| `RewardTransaction` | `id` | `studentId`, `sourceActionId`, `missionId`, `actionType`, `reason`, `adjustedByUserId`, `points`, `occurredOn` | unique `sourceActionId` | Ledger điểm, chống cộng điểm trùng action |
| `BadgeAchievement` | `id` | `studentId`, `badgeCode`, `badgeName`, `unlockedOn` | unique `studentId + badgeCode` | Badge student đã mở khóa |

Ràng buộc nghiệp vụ:

- Chỉ cộng điểm khi nhận `ActionAcceptedEvent`.
- Rejected action không cộng điểm.
- Manual adjust có audit `adjustedByUserId`.
- Badge có thể dựa trên tổng điểm hoặc số lần action theo `actionType`.
- Reward không đọc database của Catalog/Action/Identity.

### 5.6. Leaderboard Service - PostgreSQL `leaderboard_db` + Redis

Leaderboard dùng Redis sorted set cho rank realtime và PostgreSQL cho snapshot lịch sử.

| Storage | Key/Bảng | Trường quan trọng | Ý nghĩa |
| --- | --- | --- | --- |
| Redis sorted set | weekly key | member `studentId`, score `points` | Bảng xếp hạng tuần hiện tại và tuần cũ |
| Redis sorted set | monthly key | member `studentId`, score `points` | Bảng xếp hạng tháng hiện tại và tháng cũ |
| `LeaderboardSnapshot` | `id` | `seasonId`, `seasonType`, `studentId`, `rankNumber`, `points`, `closedOn` | Snapshot khi Admin close season |

Ràng buộc nghiệp vụ:

- Nhận `PointsGrantedEvent` để update rank.
- Có API xem weekly/monthly theo kỳ hiện tại hoặc kỳ cũ trong năm.
- Close season idempotent: close lại cùng `seasonId` không tạo snapshot trùng.
- Khi close season, Leaderboard publish `LeaderboardSeasonClosedEvent` cho Recognition.

### 5.7. Recognition Service - PostgreSQL `recognition_db` + MinIO

Recognition sở hữu certificate và coupon.

| Bảng | Khóa chính | Trường quan trọng | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `CertificateRecord` | `id` | `studentId`, `seasonId`, `certificateType`, `rankNumber`, `points`, `objectKey`, `issuedOn` | unique `studentId + seasonId` | Metadata chứng nhận PDF |
| `RewardOffer` | `id` | `name`, `description`, `icon`, `color`, `requiredPoints`, `requiredBadges`, `requiredCertificates`, `remainingStock`, `active`, `validUntil`, `terms` | delete bị chặn nếu offer active hoặc đã có voucher issued | Catalog coupon thật |
| `RewardClaim` | `id` | `rewardId`, `studentId`, `rewardName`, `status`, `voucherCode`, `claimedOn`, `expiresAt` | logic idempotent theo `studentId + rewardId` | Voucher/coupon đã phát |
| `StudentRecognitionProfile` | `studentId` | `totalPoints`, `badgeCount`, `certificateCount`, `updatedOn` | cập nhật bằng event | Read model kiểm eligibility coupon |

Ràng buộc nghiệp vụ:

- Certificate tạo khi Leaderboard close season và Recognition nhận event.
- Certificate PDF lưu ở MinIO, DB chỉ lưu `objectKey`.
- Chữ ký certificate hiện gồm `University Representative` và `Phan Chi Cuong - EcoQuest Application Representative`.
- Coupon chỉ claim khi student đủ điểm, badge, certificate, offer còn active, còn stock và chưa hết hạn.
- Claim lại cùng offer trả voucher cũ, không trừ stock lần hai.

### 5.8. Report Service - PostgreSQL `report_db` + MinIO

Report vừa sở hữu workflow report, vừa có analytics read model phục vụ dashboard/báo cáo.

| Bảng | Khóa chính | Trường quan trọng | Ràng buộc/logic | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `UserReport` | `id` | `reporterUserId`, `reporterStudentId`, `reporterRole`, `targetType`, `targetId`, `reason`, `evidenceUrl`, `status`, `moderationNote`, `reviewedByUserId`, `createdAt`, `reviewedAt` | `targetType` enum `USER/MISSION/ACTION`, `status` enum `OPEN/ACCEPTED/REJECTED` | Report do user tạo |
| `ActionAnalyticsRecord` | `sourceActionId` | `studentId`, `missionId`, `stationId`, `actionType`, `status`, `points`, `occurredOn` | consume action event idempotent | Read model action |
| `StudentRewardSnapshot` | `studentId` | `currentPoints`, `updatedOn` | cập nhật từ reward event | Điểm hiện tại theo student |
| `BadgeAnalyticsRecord` | `eventId` | `studentId`, `badgeCode`, `badgeName`, `occurredOn` | event idempotent | Badge analytics |
| `CertificateAnalyticsRecord` | `eventId` | `certificateId`, `studentId`, `certificateType`, `occurredOn` | event idempotent | Certificate analytics |
| `MissionAnalyticsRecord` | `missionId` | `title`, `status`, `createdByUserId`, `createdOn`, `updatedOn` | cập nhật từ mission event | Mission analytics |
| `UserAnalyticsRecord` | `userId` | `role`, `studentId`, `registeredOn` | cập nhật từ user event | User analytics |

Ràng buộc nghiệp vụ:

- Người dùng không cần nhập raw target ID nếu frontend có target picker; UI lấy danh sách user/mission/action để chọn.
- Evidence report upload qua Report và lưu MinIO.
- Analytics export không cho chọn mốc thời gian tương lai.
- Weekly report chọn `year + fromWeek + toWeek`, monthly chọn `year + fromMonth + toMonth`, yearly chọn `fromYear + toYear`.

### 5.9. Notification Service - PostgreSQL `notification_db`

Notification sở hữu inbox và realtime notification.

| Bảng | Khóa chính | Trường quan trọng | Ràng buộc/logic | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `UserNotification` | `id` | `userId`, `studentId`, `role`, `type`, `title`, `message`, `link`, `read`, `createdAt`, `readAt` | chỉ recipient hợp lệ được mark read/read-all | Thông báo trong app |

Luồng:

- Consume event: action accepted/rejected, badge unlocked, certificate issued, mission status changed, report created/reviewed, user status changed.
- Frontend có dropdown notification dưới icon chuông, mark all read và navigate theo `link`.
- Có SSE `/notifications/stream?accessToken=...` để cập nhật unread count realtime, đồng thời có polling fallback.

### 5.10. Redis

Redis được dùng cho dữ liệu tốc độ cao và tạm thời:

| Nhóm dữ liệu | Service dùng | Ý nghĩa |
| --- | --- | --- |
| Draft action | Action | Lưu nháp submit trước khi gửi chính thức |
| Idempotency key | Action | Chống submit trùng request |
| Leaderboard sorted set | Leaderboard | Rank weekly/monthly hiện tại và quá khứ |
| Cache trạng thái ngắn hạn | Một số flow phụ | Hỗ trợ workflow nhanh, không thay database chính |

### 5.11. MongoDB

MongoDB hiện chỉ dùng cho Eco Action:

- `eco_actions`: lưu action submission.
- `action_outbox`: lưu event pending/published theo Outbox Pattern.

Lý do chọn MongoDB: action evidence và trạng thái submit là document linh hoạt, dễ mở rộng metadata.

### 5.12. MinIO Buckets

| Bucket/nhóm file | Service sở hữu | Nội dung |
| --- | --- | --- |
| Avatar | Identity | Ảnh đại diện user |
| Station images | Catalog | Ảnh trạm xanh |
| Action evidence | Action | Ảnh minh chứng submit action |
| Report evidence | Report | Ảnh minh chứng report |
| Certificates | Recognition | PDF certificate |

Frontend không upload trực tiếp vào MinIO. Frontend gọi API của service sở hữu, service validate rồi upload vào bucket riêng.

### 5.13. RabbitMQ Queues Và Event Chính

Các event chính:

- `ActionAcceptedEvent`, `ActionRejectedEvent`, `ActionPendingReviewEvent`.
- `PointsGrantedEvent`.
- `BadgeUnlockedEvent`.
- `LeaderboardSeasonClosedEvent`.
- `CertificateIssuedEvent`.
- `MissionCreated/Updated/StatusChanged`.
- `UserRegistered/UserStatusChanged`.
- `ReportCreated/ReportReviewed`.
- `NotificationCreated`.

Consumer chính:

- Reward consume action accepted để cộng điểm.
- Leaderboard consume points granted để cập nhật rank.
- Recognition consume points/badge/certificate/season events để cập nhật profile và phát certificate.
- Report consume nhiều event để dựng analytics read model.
- Notification consume event để tạo inbox.

## 6. Use Case Hiện Có

### UC-01 - Đăng Ký, Xác Minh Email Và Đăng Nhập

Actor: Student.

Tiền điều kiện: email chưa tồn tại.

Luồng:

1. Student nhập email, mật khẩu, họ tên hiển thị và MSSV.
2. Frontend gọi `POST /auth/register`.
3. Identity tạo `user_accounts` với `role = STUDENT`, `status = ACTIVE`, `emailVerified = false`.
4. Identity tạo `email_verification_tokens`.
5. Identity gửi email xác minh qua SMTP.
6. Student bấm link verify hoặc nhập token.
7. Frontend gọi `POST /auth/verify-email`.
8. Student đăng nhập bằng `POST /auth/login`.
9. Identity trả JWT và `UserProfile`.

Kết quả: user đăng nhập được nếu email đã verify và status còn active.

### UC-02 - Quên Mật Khẩu Và Reset Password

Actor: user bất kỳ.

Luồng:

1. User nhập email ở màn hình quên mật khẩu.
2. Frontend gọi `POST /auth/forgot-password`.
3. Identity tạo `password_reset_tokens` và gửi email reset.
4. User bấm link reset.
5. Frontend gọi `POST /auth/reset-password` với token và mật khẩu mới.
6. Identity kiểm token chưa hết hạn/chưa dùng, đổi password hash và đánh dấu token used.

Kết quả: user dùng mật khẩu mới để đăng nhập.

### UC-03 - Student Xem Mission Và Submit Action Accepted

Actor: Student.

Tiền điều kiện: mission `ACTIVE`, policy rule active.

Luồng:

1. Student mở trang Missions.
2. Frontend gọi `GET /catalog/missions`.
3. Student chọn một mission và upload evidence nếu cần.
4. Frontend upload evidence qua `POST /actions/evidence`.
5. Frontend gửi `POST /actions/submit` kèm `idempotencyKey`.
6. Action validate mission qua Catalog.
7. Action gọi Policy gRPC để evaluate rule.
8. Nếu hợp lệ, Action lưu `eco_actions` status `ACCEPTED`.
9. Action ghi outbox và publish event qua RabbitMQ.
10. Reward cộng điểm, ghi transaction và có thể unlock badge.
11. Leaderboard cập nhật Redis sorted set.
12. Report analytics và Notification cập nhật qua event.

Kết quả: điểm, badge, leaderboard, notification và báo cáo được cập nhật theo eventual consistency.

### UC-04 - Submit Action Cần Moderator Review

Actor: Student, Moderator.

Luồng:

1. Student submit action thiếu evidence hoặc action cần review.
2. Action lưu status `PENDING_REVIEW`.
3. Moderator mở Review Queue.
4. Moderator xem evidence preview.
5. Moderator approve hoặc reject.
6. Nếu approve, Action publish accepted event để Reward cộng điểm.
7. Nếu reject, Action lưu `policyReason/moderationNote`, không cộng điểm.

Ràng buộc: Moderator không được review action của chính mình.

### UC-05 - Lưu Draft Và Chống Submit Trùng

Actor: Student.

Luồng:

1. Student nhập form submit nhưng chưa gửi.
2. Frontend gọi `POST /actions/drafts`.
3. Action lưu draft vào Redis.
4. Khi submit chính thức, frontend tạo `idempotencyKey`.
5. Action kiểm Redis idempotency key.
6. Nếu key đã dùng, backend trả `409`.

Kết quả: tránh mất dữ liệu nháp và tránh cộng điểm trùng do double-click/retry.

### UC-06 - Reward Wallet, Transaction Và Badge

Actor: Student, Reward service.

Luồng:

1. Reward nhận `ActionAcceptedEvent`.
2. Reward tạo `RewardTransaction` với unique `sourceActionId`.
3. Reward cập nhật `RewardWallet.totalPoints`.
4. Reward kiểm `BadgeDefinition` theo điểm hoặc số lần action.
5. Nếu đủ điều kiện, tạo `BadgeAchievement`.
6. Reward publish `PointsGrantedEvent` và `BadgeUnlockedEvent`.

Kết quả: Student thấy ví điểm, lịch sử giao dịch và badge mới.

### UC-07 - Leaderboard Và Close Season

Actor: Student, Admin.

Luồng xem rank:

1. Student mở Leaderboard.
2. Frontend gọi `GET /leaderboards/weekly` hoặc `GET /leaderboards/monthly`.
3. Leaderboard lấy dữ liệu từ Redis sorted set.
4. Student có thể xem kỳ hiện tại, tuần trước, tháng trước trong năm.

Luồng close season:

1. Admin gọi `POST /leaderboards/seasons/{id}/close?type=weekly|monthly&winners=...`.
2. Leaderboard lấy top winners từ Redis.
3. Leaderboard ghi `LeaderboardSnapshot`.
4. Leaderboard publish `LeaderboardSeasonClosedEvent`.

Kết quả: Recognition tạo certificate cho winners.

### UC-08 - Certificate PDF

Actor: Admin, Student, Recognition service.

Luồng:

1. Admin close season ở Leaderboard.
2. Recognition nhận event close season.
3. Recognition kiểm unique `studentId + seasonId`.
4. Recognition render certificate PDF A4 ngang.
5. Recognition upload PDF vào MinIO.
6. Recognition lưu `CertificateRecord`.
7. Student mở Certificates, preview/print/download PDF.

Kết quả: PDF trả về `application/pdf` qua endpoint có JWT, không mở trực tiếp URL protected.

### UC-09 - Coupon / Redeem Sustainability Rewards

Actor: Student, Admin.

Luồng Admin:

1. Admin tạo/sửa reward offer trong Recognition.
2. Offer có điều kiện: điểm, số badge, số certificate, stock, hạn dùng, terms.

Luồng Student:

1. Student mở Certificates.
2. Frontend gọi `GET /recognitions/rewards?studentId=...`.
3. Recognition trả danh sách offer kèm `eligible` và `eligibilityReason`.
4. Student bấm Redeem.
5. Recognition kiểm điều kiện và stock.
6. Recognition tạo `RewardClaim`, phát `voucherCode`, trừ stock.
7. Nếu claim lại cùng offer, backend trả voucher cũ, không trừ stock lần hai.

Kết quả: coupon là workflow thật trong Recognition service, không còn chỉ là UI demo.

### UC-10 - Report Workflow

Actor: Student, Moderator, Admin.

Luồng:

1. User mở Reports.
2. Frontend hiển thị target picker user/mission/action thay vì bắt nhập ID thô.
3. User chọn target, nhập reason, upload evidence nếu có.
4. Frontend gọi `POST /reports`.
5. Report tạo `UserReport` status `OPEN`.
6. Moderator/Admin mở Campus Reports.
7. Reviewer accept/reject report, nhập note.
8. Report cập nhật status và publish event.
9. Notification gửi thông báo cho bên liên quan.

Kết quả: report có workflow và audit reviewer.

### UC-11 - Admin Analytics Và Export PDF

Actor: Admin.

Luồng:

1. Admin mở Analytics.
2. Chọn loại kỳ:
   - Weekly: `year + fromWeek + toWeek`.
   - Monthly: `year + fromMonth + toMonth`.
   - Yearly: `fromYear + toYear`.
3. Frontend không cho chọn mốc tương lai hoặc range ngược.
4. Backend vẫn validate server-side và trả `400` nếu kỳ không hợp lệ.
5. Admin xem KPI, biểu đồ và bảng student outcome.
6. Admin export PDF báo cáo đúng kỳ đã chọn.

Kết quả: báo cáo có lượng mission, submit action, user, điểm, badge, certificate, report theo kỳ.

### UC-12 - Notification Inbox Và Realtime SSE

Actor: Student, Moderator, Admin.

Luồng:

1. Event nghiệp vụ xảy ra: action accepted, badge unlocked, certificate issued, report created/reviewed, user status changed.
2. Notification service consume event.
3. Notification tạo `UserNotification`.
4. Frontend poll `GET /notifications` và mở SSE `/notifications/stream?accessToken=...`.
5. User bấm chuông để xem dropdown.
6. User mark read hoặc mark all read.
7. Khi bấm từng notification, frontend điều hướng theo `link`.

Kết quả: user nhận thông báo trong app gần realtime.

### UC-13 - Catalog CRUD Và Mission Workflow

Actor: Moderator, Admin.

Luồng Moderator:

1. Moderator mở My Mission Catalog.
2. Tạo mission mới.
3. Catalog lưu mission `PENDING` với `createdByUserId`.
4. Moderator chỉ thấy/quản lý mission của chính mình.

Luồng Admin:

1. Admin mở Catalog.
2. Admin CRUD mission/station/badge.
3. Admin approve/reject/cancel mission.
4. Catalog publish mission event cho Report/Notification.

Kết quả: workflow tách đúng quyền giữa Moderator và Admin.

### UC-14 - User Management

Actor: Admin.

Luồng:

1. Admin mở Users.
2. Xem danh sách user có email, họ tên, role, MSSV, status.
3. Admin đổi role hoặc status người khác.
4. Identity chặn thao tác tự đổi role/status/ban/delete chính mình.
5. Khi status đổi, Identity gửi email thông báo lý do và contact support.

Kết quả: quản trị user có ràng buộc an toàn.

### UC-15 - Policy Rule CRUD

Actor: Admin.

Luồng:

1. Admin mở Policy Rules.
2. Frontend gọi trực tiếp Policy Admin API tại `8090`.
3. Admin thêm rule bằng modal overlay.
4. Admin sửa base points, evidence/station requirement, daily limit, active.
5. Delete rule active bị chặn; muốn delete phải deactivate trước.
6. Action service dùng gRPC để áp dụng rule mới khi submit action.

Kết quả: policy là service riêng, không nhét rule vào Action hay Gateway.

### UC-16 - Profile Và Upload Avatar

Actor: user bất kỳ.

Luồng:

1. User mở Profile.
2. Sửa họ tên hiển thị.
3. Upload avatar.
4. Identity validate file, upload MinIO, cập nhật `avatarUrl`.
5. Frontend cập nhật profile tức thời.

Kết quả: avatar lưu bền vững qua object storage.

## 7. Phân Quyền Theo Vai Trò

| Chức năng | Student | Moderator | Admin |
| --- | --- | --- | --- |
| Đăng ký/đăng nhập/profile/avatar | Có | Có | Có |
| Student dashboard | Có | Có khi chuyển Student panel | Không trong Admin panel |
| Missions/submit action | Có | Có khi chuyển Student panel | Không trong Admin panel |
| Wallet & Badges | Có | Có khi chuyển Student panel | Không trong Admin panel |
| Certificates/coupon | Có | Có khi chuyển Student panel | Không trong Admin panel |
| Review Queue | Không | Có | Có qua quyền cao hơn nếu vào luồng moderator/admin phù hợp |
| My Mission Catalog | Không | Có | Admin dùng Catalog riêng |
| Catalog management toàn hệ thống | Không | Không | Có |
| Users | Không | Không | Có |
| Policy Rules | Không | Không | Có |
| Adjust Points | Không | Không | Có |
| Reports | Tạo/xem của mình | Review theo quyền | Quản lý toàn hệ thống |
| Analytics/export report | Không | Không | Có |

## 8. Frontend Giao Diện Hiện Có

Frontend nằm trong `web-apps/ecoquest-web`, dùng React + Vite + CSS thuần, hỗ trợ light/dark theme và responsive mobile.

### 8.1. App Shell Chung

- Sidebar desktop theo role.
- Bottom nav mobile cho Student/Moderator.
- Top bar có theme toggle, notification dropdown, account/profile, policy/help content.
- Auth gate cho login/register/verify/reset password.
- Toast và confirmation dialog custom, không dùng `window.confirm` mặc định.

### 8.2. Student Panel

- **Dashboard**: KPI điểm, mission, badge, certificate, biểu đồ submit/action status.
- **Missions**: danh sách mission active, lọc/tìm kiếm, submit theo từng mission.
- **Submit Action Modal**: upload evidence, chọn station, xem kết quả accepted/pending/rejected.
- **Wallet & Badges**: wallet total, transaction history, badge unlocked.
- **Leaderboard**: weekly/monthly, kỳ hiện tại và kỳ cũ.
- **Certificates**: certificate cards, preview, print, download PDF, redeem coupon.
- **Reports**: tạo report bằng target picker, upload evidence.
- **Profile**: sửa display name, avatar, thông tin tài khoản.

### 8.3. Moderator Panel

- **Moderator Dashboard**: số action chờ duyệt, report, mission của moderator, biểu đồ trạng thái.
- **Review Queue**: xem action pending, preview evidence, approve/reject.
- **My Mission Catalog**: tạo/sửa mission của chính moderator, mission chờ Admin duyệt.
- **Reports**: xử lý report theo quyền.
- **Leaderboard**: xem rank.
- **Profile**.

### 8.4. Admin Panel

- **Admin Dashboard**: KPI hệ thống user/mission/action/report, biểu đồ tổng quan.
- **Analytics**: báo cáo tuần/tháng/năm, student outcome, export PDF.
- **Reports**: quản lý Campus Reports.
- **Catalog**: CRUD mission/station/badge, approve mission, upload station image.
- **Users**: role/status/delete user, self-protection.
- **Policy Rules**: CRUD policy qua direct API `8090`, add rule bằng modal.
- **Adjust Points**: cộng/trừ điểm student có audit và không cho ví âm.
- **Profile**.

### 8.5. Responsive/Mobile

- Sidebar thành overlay trên mobile.
- Notification dropdown căn theo viewport.
- Certificate preview co giãn theo màn hình dọc/ngang.
- Bảng analytics dài có horizontal scroll.
- Search/input/select có dark theme token riêng.

## 9. API Chính Cho Báo Cáo

### Identity

- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/resend-verification`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`
- `PUT /auth/me/profile`
- `POST /auth/me/avatar`
- `GET /auth/users`
- `GET /auth/report-targets/users`
- `PUT /auth/users/{id}/role`
- `PUT /auth/users/{id}/status`
- `DELETE /auth/users/{id}`

### Catalog

- `GET /catalog/missions`
- `GET /catalog/missions/{id}/submission-eligibility`
- `POST /catalog/missions`
- `PUT /catalog/missions/{id}`
- `PUT /catalog/missions/{id}/status`
- `DELETE /catalog/missions/{id}`
- `GET /catalog/stations`
- `POST /catalog/stations`
- `PUT /catalog/stations/{id}`
- `POST /catalog/stations/{id}/image`
- `DELETE /catalog/stations/{id}`
- `GET /catalog/badges`
- `POST /catalog/badges`
- `PUT /catalog/badges/{code}`
- `DELETE /catalog/badges/{code}`

### Action

- `POST /actions/drafts`
- `POST /actions/evidence`
- `POST /actions/submit`
- `GET /actions/user/{studentId}`
- `GET /actions/review`
- `PUT /actions/{id}/approve`
- `PUT /actions/{id}/reject`

### Policy

- Internal gRPC: Action -> Policy.
- Admin REST direct:
  - `GET /policies/rules`
  - `POST /policies/rules`
  - `PUT /policies/rules/{actionType}`
  - `DELETE /policies/rules/{actionType}`

### Reward

- `GET /rewards/wallets/{studentId}`
- `GET /rewards/wallets/{studentId}/transactions`
- `GET /rewards/wallets/{studentId}/badges`
- `POST /rewards/adjust`

### Leaderboard

- `GET /leaderboards/weekly`
- `GET /leaderboards/monthly`
- `GET /leaderboards/users/{studentId}/rank`
- `POST /leaderboards/seasons/{id}/close`
- `GET /leaderboards/seasons/{id}/snapshots`

### Recognition

- `GET /recognitions/certificates/user/{studentId}`
- `GET /recognitions/certificates/{id}`
- `GET /recognitions/certificates/{id}/download`
- `GET /recognitions/rewards`
- `POST /recognitions/rewards`
- `PUT /recognitions/rewards/{id}`
- `DELETE /recognitions/rewards/{id}`
- `POST /recognitions/rewards/{id}/claim`
- `GET /recognitions/rewards/claims/user/{studentId}`

### Report

- `POST /reports`
- `GET /reports/mine`
- `POST /reports/evidence`
- `GET /reports`
- `PUT /reports/{id}/review`
- `GET /reports/analytics/summary`
- `GET /reports/analytics/series`
- `GET /reports/analytics/students`
- `GET /reports/analytics/students/{studentId}`
- `GET /reports/analytics/export`

### Notification

- `GET /notifications`
- `GET /notifications/stream`
- `POST /notifications`
- `PUT /notifications/{id}/read`
- `PUT /notifications/read-all`

## 10. Công Nghệ Sử Dụng

| Công nghệ | Vai trò trong project |
| --- | --- |
| Java 21 + Spring Boot 3 | Framework backend cho các microservice |
| Spring Cloud Gateway | API Gateway route các path public |
| Spring Security + JWT | Xác thực, phân quyền theo role |
| PostgreSQL | Database riêng cho Identity, Catalog, Policy, Reward, Leaderboard snapshot, Recognition, Report, Notification |
| MongoDB | Lưu action document và outbox của Action |
| Redis | Draft, idempotency, leaderboard sorted set |
| RabbitMQ | Event bus giữa các service |
| gRPC | Kiểm policy nội bộ Action -> Policy |
| MinIO | Object storage local cho file upload/PDF |
| SMTP/Gmail App Password | Gửi email verify/reset/status |
| iText/OpenHTML/PDF renderer | Render certificate/report PDF |
| React + Vite | Frontend web app |
| Nginx | Serve frontend container và same-origin proxy |
| Docker Compose | Chạy toàn bộ stack local |
| PowerShell smoke test | Kiểm thử end-to-end backend |
| Vitest/Vite build | Kiểm thử và build frontend |

## 11. Seed Data Hiện Tại

Seed được thiết kế để demo đầy đủ use case:

- User demo:
  - Student có MSSV/họ tên/điểm/huy hiệu/chứng nhận.
  - Moderator có quyền review và tạo mission.
  - Admin có quyền quản trị.
- Mission:
  - Ít nhất 15 mission, gồm recycle, cleanup, bike commute, refill bottle, energy saving, campus garden, e-waste, tree planting.
  - Có mission active, pending, rejected/cancelled để demo workflow.
- Action:
  - Nhiều action mẫu theo tuần này, tháng này, tuần/tháng trước và một số kỳ cũ.
  - Có accepted, rejected, pending review.
- Reward:
  - Wallet có điểm khác nhau.
  - Transaction gắn `sourceActionId`.
  - Badge theo điểm và theo số lần action.
- Leaderboard:
  - Có dữ liệu weekly/monthly hiện tại.
  - Có dữ liệu tuần trước/tháng trước trong năm để chọn kỳ cũ.
- Recognition:
  - Có certificate demo.
  - Có reward offer/coupon đủ điều kiện và chưa đủ điều kiện.
- Report:
  - Có report mở/accepted/rejected.
  - Có analytics read model cho mission/action/user/badge/certificate.
- Notification:
  - Student/Moderator/Admin đều có inbox seed.
  - Có notification unread/read để demo dropdown và mark all read.

## 12. Kiểm Thử Và Chất Lượng

### 12.1. Backend Smoke Test

File chính:

```powershell
scripts\backend-smoke-test.ps1
```

Lệnh chạy:

```powershell
$env:API_GATEWAY_PORT='18080'
docker compose up -d --build
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090
```

Smoke test đang bao phủ:

- Gateway health.
- Auth register/verify/login/reset/profile/avatar/user management.
- Admin self-protection.
- Catalog CRUD và mission workflow.
- Policy CRUD, active delete guard.
- Draft, idempotency, submit accepted/pending/rejected.
- Upload action evidence/report evidence/station image/avatar.
- Reward wallet, transaction, badge, adjust points.
- Leaderboard weekly/monthly, historical period, close season.
- Certificate PDF authenticated download.
- Coupon eligibility/claim/stock/idempotency.
- Report workflow và analytics/export PDF.
- Notification seed, mark read, read all, SSE/polling contract.
- RabbitMQ queue drain.

### 12.2. Frontend Test/Build

```powershell
cd web-apps\ecoquest-web
npm.cmd test
npm.cmd run build
```

Trạng thái gần nhất:

- Frontend unit test: 12/12 PASS.
- Frontend production build: PASS.

### 12.3. Audit Sau Reset Sạch

Sau khi reset bằng `docker compose down -v` rồi `docker compose up -d`, audit gần nhất ghi nhận:

- Gateway `UP`.
- 15 mission.
- 12 user demo.
- 0 user E2E test còn sót.
- Notification seed theo 3 role có dữ liệu.
- RabbitMQ queue drained.

## 13. Hướng Dẫn Chạy Project

### 13.1. Chạy Bằng Docker Compose

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361
$env:API_GATEWAY_PORT='18080'
docker compose up -d --build
```

Truy cập:

- Frontend: `http://localhost:3000`
- Gateway: `http://localhost:18080`
- Policy Admin direct: `http://localhost:8090`
- RabbitMQ Management: `http://localhost:15672`
- MinIO Console: `http://localhost:9001`

### 13.2. Chạy Frontend Dev

```powershell
cd web-apps\ecoquest-web
npm.cmd install
npm.cmd run dev
```

Frontend gọi API relative path qua proxy, không hardcode port service.

### 13.3. Reset Dữ Liệu Sạch

```powershell
$env:API_GATEWAY_PORT='18080'
docker compose down -v
docker compose up -d --build
```

Lưu ý: `down -v` xóa volume database hiện tại và seed lại dữ liệu demo sạch.

## 14. Nội Dung Nên Đưa Vào Báo Cáo DOCX

Gợi ý bố cục:

1. Bìa báo cáo.
2. Mục lục.
3. Giới thiệu đề tài:
   - Lý do chọn EcoQuest Campus.
   - Vấn đề cần giải quyết trong campus sustainability.
4. Mục tiêu và phạm vi:
   - Gamification.
   - Submit evidence.
   - Reward/leaderboard/certificate/coupon.
   - Admin analytics.
5. Kiến trúc tổng thể:
   - Sơ đồ microservices.
   - Gateway.
   - Database per service.
   - RabbitMQ, Redis, gRPC, MinIO.
6. Thiết kế database:
   - Trình bày từng service.
   - Giải thích vì sao không dùng foreign key xuyên service.
   - Ghi rõ `user_accounts` chứa MSSV (`studentId`) và họ tên (`displayName`).
7. Use case:
   - Auth.
   - Submit action.
   - Review.
   - Reward/badge.
   - Leaderboard/close season.
   - Certificate/coupon.
   - Report/analytics.
   - Notification.
8. Frontend:
   - 3 panel role.
   - Các màn hình chính.
   - Light/dark theme, responsive, notification dropdown, certificate preview.
9. Kiểm thử:
   - Backend smoke test.
   - Frontend unit/build.
   - RabbitMQ queue drain.
10. Kết quả đạt được.
11. Hạn chế và hướng phát triển.
12. Kết luận.

## 15. Điểm Mạnh Nên Nhấn Mạnh Trong Báo Cáo

- Có đủ nhiều công nghệ microservices thực tế: Gateway, RabbitMQ, Redis, gRPC, MinIO, database per service, JWT, Docker Compose.
- Service ownership rõ ràng, không đọc DB chéo.
- Event-driven flow đầy đủ từ submit action đến reward, leaderboard, report, notification, certificate.
- Có Outbox Pattern trong Action để giảm rủi ro mất event.
- Có admin analytics và export PDF theo kỳ.
- Có coupon thật với eligibility, stock, expiry và idempotent claim.
- Có upload file bền vững qua MinIO.
- Có test tự động bằng smoke test và frontend unit/build.

## 16. Hạn Chế Và Hướng Phát Triển

Hạn chế hiện tại:

- Auth/JWT phù hợp demo học phần, chưa phải production IAM đầy đủ.
- Chưa có distributed tracing/OpenTelemetry hoàn chỉnh.
- Chưa có Kubernetes deployment.
- Chưa có CI/CD chính thức.
- Consistency giữa các service là eventual consistency nên UI cần refetch/poll sau event.
- Coupon hiện chưa trừ điểm; nếu muốn coupon như đổi điểm thật, cần bổ sung debit transaction ở Reward Ledger.

Hướng phát triển:

- Thêm OpenTelemetry + Grafana/Prometheus.
- Thêm Kubernetes manifest hoặc Helm chart.
- Thêm API documentation bằng OpenAPI public cho Gateway routes.
- Thêm contract test giữa service/event schema.
- Thêm frontend E2E Playwright.
- Thêm cơ chế retry/dead-letter queue chi tiết hơn cho event lỗi.
- Mở rộng mobile PWA.

## 17. Kịch Bản Demo Báo Cáo

1. Mở Docker Desktop, chạy stack.
2. Mở RabbitMQ Management, MinIO Console để giới thiệu hạ tầng.
3. Đăng nhập Student.
4. Xem Dashboard, Missions, submit action có evidence.
5. Xem Wallet & Badges, Leaderboard, Certificates, coupon.
6. Đăng nhập Moderator, mở Review Queue, My Mission Catalog và Reports.
7. Đăng nhập Admin, mở Catalog, Users, Policy Rules, Adjust Points.
8. Mở Analytics, chọn kỳ tuần/tháng/năm, export PDF.
9. Close season để tạo snapshot và certificate.
10. Mở notification dropdown để xem realtime/inbox.
11. Chạy smoke test hoặc show kết quả PASS.
12. Show RabbitMQ queues drained.

## 18. Câu Kết Luận Gợi Ý

EcoQuest Campus đã triển khai được một hệ thống microservices tương đối đầy đủ cho bài toán gamification hoạt động xanh trong trường học. Hệ thống tách rõ các bounded context, áp dụng database-per-service, event-driven communication, gRPC, Redis, MinIO và JWT. Các luồng nghiệp vụ chính từ đăng ký, submit action, duyệt, cộng điểm, mở khóa badge, xếp hạng, phát certificate, đổi coupon, báo cáo và notification đều đã có backend, frontend và kiểm thử tương ứng. Đây là nền tảng tốt để tiếp tục mở rộng lên môi trường production với observability, CI/CD và Kubernetes.
