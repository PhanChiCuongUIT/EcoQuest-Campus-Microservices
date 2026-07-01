# Luồng Nghiệp Vụ, Use Case Và Database EcoQuest Campus

Cập nhật: 2026-07-01

Tài liệu này mô tả bằng tiếng Việt có dấu cách EcoQuest Campus hoạt động ở mức nghiệp vụ, khi nào badge/certificate/coupon được tạo, các use case chính và database của từng microservice. Project dùng kiến trúc **database-per-service**, vì vậy các quan hệ giữa service dùng ID logic và event, không dùng foreign key vật lý xuyên database.

## 1. Tổng Quan Luồng Chính

EcoQuest Campus là hệ thống gamification cho hoạt động xanh trong trường học:

1. Student đăng ký tài khoản, xác minh email và đăng nhập.
2. Student xem mission đang `ACTIVE`, chọn mission, upload minh chứng nếu cần và submit action.
3. Action service validate mission qua Catalog và kiểm policy bằng gRPC sang Policy service.
4. Nếu hợp lệ, Action lưu action và publish event qua RabbitMQ.
5. Reward Ledger nhận event accepted, cộng điểm, ghi transaction và unlock badge nếu đủ điều kiện.
6. Leaderboard nhận event điểm, cập nhật bảng xếp hạng tuần/tháng bằng Redis.
7. Admin close season ở Leaderboard, Leaderboard tạo snapshot và publish event season closed.
8. Recognition nhận event close season, tạo certificate PDF, lưu MinIO và metadata trong DB riêng.
9. Report service nhận event để tạo analytics read model cho báo cáo tuần/tháng/năm.
10. Notification service nhận event để tạo thông báo inbox/SSE cho user liên quan.

## 2. Khi Nào Badge Được Đạt

Badge không được tạo trực tiếp từ frontend. Badge thuộc Reward Ledger service.

- Khi action có trạng thái `ACCEPTED`, Reward Ledger cộng điểm và kiểm điều kiện badge.
- Badge theo điểm: đạt khi tổng điểm ví của student vượt ngưỡng trong badge definition.
- Badge theo số lần action: đạt khi student có đủ số transaction accepted theo `actionType`.
- Ràng buộc chống trùng: `BadgeAchievement` unique theo `studentId + badgeCode`.
- Khi badge mới được unlock, Reward Ledger publish `BadgeUnlockedEvent`; Notification, Recognition và Report analytics consume event này.

Ví dụ badge seed:

| Badge | Điều kiện |
| --- | --- |
| `GREEN_STARTER` | Có điểm đầu tiên |
| `RECYCLING_HERO` | Đủ số lần `RECYCLE_BOTTLE` accepted |
| `CLEANUP_CHAMPION` | Đủ số lần `CLEANUP_EVENT` accepted |
| `ZERO_WASTE_ADVOCATE` | Đạt mốc điểm |
| `GREEN_AMBASSADOR` | Đạt mốc điểm cao hơn |
| `CAMPUS_GUARDIAN` | Đạt mốc điểm cao nhất trong seed |

## 3. Khi Nào Certificate Được Tạo

Certificate thuộc Recognition service.

1. Admin đóng season bằng API Leaderboard: `POST /leaderboards/seasons/{id}/close?type=weekly|monthly&winners=...`.
2. Leaderboard lấy top student từ Redis sorted set, ghi snapshot vào PostgreSQL riêng của Leaderboard.
3. Leaderboard publish `LeaderboardSeasonClosedEvent` lên RabbitMQ.
4. Recognition consume event này và với mỗi winner sẽ:
   - kiểm tra đã có certificate cho `studentId + seasonId` chưa;
   - nếu chưa có, tạo `CertificateRecord`;
   - render PDF A4 ngang;
   - upload PDF vào MinIO bucket certificate;
   - publish `CertificateIssuedEvent`.
5. Frontend tải PDF bằng bearer token qua `/recognitions/certificates/{id}/download`.

Ràng buộc chống trùng:

- `CertificateRecord` có unique theo `studentId + seasonId`.
- Close cùng một season nhiều lần không tạo duplicate certificate cho cùng student.

## 4. Coupon / Redeem Sustainability Rewards Hoạt Động Như Nào

Coupon là luồng đổi thành tích thành voucher thật trong phạm vi demo local, thuộc Recognition service. Coupon hiện **không trừ điểm**, nhưng backend có catalog reward offer, điều kiện nhận, stock, hạn dùng và idempotency.

1. Student mở trang Certificates.
2. UI gọi `GET /recognitions/rewards?studentId=...` để lấy danh sách reward offer.
3. Student bấm redeem, frontend gọi `POST /recognitions/rewards/{rewardId}/claim`.
4. Recognition kiểm:
   - đủ `requiredPoints`;
   - đủ `requiredBadges`;
   - đủ `requiredCertificates`;
   - offer còn `remainingStock`;
   - offer còn active và chưa hết `validUntil`.
5. Nếu hợp lệ và chưa claim reward đó, backend tạo `RewardClaim` với `status = ISSUED`, `voucherCode`, `claimedOn`, `expiresAt`.
6. Backend trừ `remainingStock` của `RewardOffer`.
7. Nếu claim lại cùng `studentId + rewardId`, backend trả lại claim cũ, không phát voucher mới và không trừ stock lần hai.

Ràng buộc quan trọng:

- Recognition sở hữu `RewardOffer`, `RewardClaim` và `StudentRecognitionProfile`.
- `StudentRecognitionProfile` được cập nhật bằng event điểm, badge và certificate; Recognition không đọc Reward DB.
- Admin có thể CRUD reward offer; delete bị chặn nếu offer còn active hoặc đã có voucher issued.

## 5. Use Case Theo Vai Trò

### Student

- Đăng ký, xác minh email, đăng nhập.
- Xem dashboard cá nhân: điểm, rank, badge, certificate, trạng thái submit.
- Xem mission active và submit action theo từng mission.
- Upload evidence nếu mission yêu cầu.
- Lưu draft action.
- Xem lịch sử action của mình.
- Xem ví điểm, transaction và badge.
- Xem leaderboard tuần/tháng, kể cả kỳ cũ có seed.
- Xem certificate, preview/print/download PDF.
- Redeem coupon theo offer đủ điều kiện.
- Tạo report cho user/mission/action.
- Xem thông báo, mark read/read all.
- Cập nhật profile/avatar.

### Moderator

- Có thể vào Student panel cho dữ liệu cá nhân của chính mình.
- Moderator panel có dashboard riêng.
- Review queue: duyệt/reject action `PENDING_REVIEW`.
- Không được review action của chính mình.
- Tạo mission của mình; mission mới ở trạng thái `PENDING`.
- Chỉ quản lý mission do chính moderator đó tạo.
- Xem và xử lý Reports theo quyền.
- Xem Leaderboard.
- Cập nhật profile.

### Admin

- Có Admin dashboard riêng.
- Quản lý Catalog: mission, station, badge.
- Duyệt trạng thái mission do moderator tạo.
- Quản lý user: role, status, delete theo ràng buộc.
- Không được đổi role/status/ban/delete chính mình.
- Quản lý Policy Rules qua direct port `8090`.
- Adjust điểm student có audit và không cho ví âm.
- Xem Reports và Analytics.
- Xuất báo cáo PDF theo tuần/tháng/năm trong quá khứ hoặc hiện tại.
- Close season để tạo snapshot và certificate.
- Quản lý coupon/reward offer trong Recognition.

## 6. Database Theo Microservice

### 6.1. Identity Access Service - PostgreSQL `identity_db`

Không có bảng sinh viên riêng. Sinh viên là user trong `user_accounts` có `role = STUDENT` và có `studentId`.

| Bảng/entity | Khóa chính | Trường quan trọng | Ràng buộc chính | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `user_accounts` | `id` | `email`, `passwordHash`, `displayName`, `role`, `status`, `studentId`, `active`, `emailVerified`, `avatarUrl`, `statusReason`, `createdAt`, `updatedAt` | unique `email`, unique `studentId` | Tài khoản, họ tên hiển thị, MSSV, role, trạng thái, avatar |
| `password_reset_tokens` | `id` | `userId`, `tokenHash`, `expiresAt`, `usedAt`, `createdAt` | unique `tokenHash` | Token reset password đã hash |
| `email_verification_tokens` | `id` | `userId`, `tokenHash`, `expiresAt`, `usedAt`, `createdAt` | unique `tokenHash` | Token verify email đã hash |

### 6.2. Green Catalog Service - PostgreSQL `catalog_db`

| Bảng/entity | Khóa chính | Trường quan trọng | Ràng buộc chính | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `Mission` | `id` | `title`, `actionType`, `basePoints`, `evidenceRequired`, `stationRequired`, `description`, `createdByUserId`, `status` | `basePoints` positive, default `PENDING` | Mission và workflow duyệt |
| `GreenStation` | `id` | `name`, `code`, `stationType`, `location`, `active`, `imageUrl` | `active` boolean | Trạm xanh và ảnh station |
| `BadgeDefinition` | `code` | `name`, `description`, `requiredPoints`, `criteriaType`, `actionType`, `requiredCount` | default `POINTS`, `requiredCount = 0` | Định nghĩa badge |

### 6.3. Eco Action Service - MongoDB `action_db`

| Collection | Khóa chính | Trường quan trọng | Ràng buộc/logic | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `eco_actions` | `id` | `studentId`, `missionId`, `stationId`, `actionType`, `evidenceUrl`, `status`, `points`, `policyReason`, `moderationNote`, `reviewedByUserId`, `submittedAt`, `reviewedAt` | status enum `ACCEPTED/PENDING_REVIEW/REJECTED` | Action student submit |
| `action_outbox` | `id` | `routingKey`, `payload`, `createdAt`, `publishedAt`, `lastError` | Outbox Pattern | Event cần publish RabbitMQ |

Redis của Action lưu draft và idempotency key. MinIO của Action lưu evidence file.

### 6.4. Verification Policy Service - PostgreSQL `policy_db`

| Bảng/entity | Khóa chính | Trường quan trọng | Ràng buộc chính | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `PolicyRule` | `actionType` | `basePoints`, `evidenceRequired`, `stationRequired`, `dailyLimit`, `active` | active rule không delete trực tiếp | Rule xác minh action |

Action dùng gRPC để gọi Policy; Admin dùng REST direct `8090`.

### 6.5. Reward Ledger Service - PostgreSQL `reward_db`

| Bảng/entity | Khóa chính | Trường quan trọng | Ràng buộc chính | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `RewardWallet` | `studentId` | `totalPoints` | không cho ví âm | Tổng điểm hiện tại |
| `RewardTransaction` | `id` | `studentId`, `sourceActionId`, `missionId`, `actionType`, `reason`, `adjustedByUserId`, `points`, `occurredOn` | unique `sourceActionId` | Ledger điểm |
| `BadgeAchievement` | `id` | `studentId`, `badgeCode`, `badgeName`, `unlockedOn` | unique `studentId + badgeCode` | Badge đã đạt |

### 6.6. Leaderboard Service - PostgreSQL `leaderboard_db` + Redis

| Storage | Khóa/bảng | Trường quan trọng | Ý nghĩa |
| --- | --- | --- | --- |
| Redis sorted set | weekly key | member `studentId`, score `points` | Rank tuần |
| Redis sorted set | monthly key | member `studentId`, score `points` | Rank tháng |
| `LeaderboardSnapshot` | `id` | `seasonId`, `seasonType`, `studentId`, `rankNumber`, `points`, `closedOn` | Snapshot khi close season |

### 6.7. Recognition Service - PostgreSQL `recognition_db` + MinIO

| Bảng/entity | Khóa chính | Trường quan trọng | Ràng buộc chính | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `CertificateRecord` | `id` | `studentId`, `seasonId`, `certificateType`, `rankNumber`, `points`, `objectKey`, `issuedOn` | unique `studentId + seasonId` | Metadata certificate PDF |
| `RewardOffer` | `id` | `name`, `description`, `icon`, `color`, `requiredPoints`, `requiredBadges`, `requiredCertificates`, `remainingStock`, `active`, `validUntil`, `terms` | delete bị chặn nếu active/đã có claim | Catalog coupon |
| `RewardClaim` | `id` | `rewardId`, `studentId`, `rewardName`, `status`, `voucherCode`, `claimedOn`, `expiresAt` | idempotent theo `studentId + rewardId` | Voucher đã phát |
| `StudentRecognitionProfile` | `studentId` | `totalPoints`, `badgeCount`, `certificateCount`, `updatedOn` | cập nhật từ event | Eligibility coupon |

### 6.8. Report Service - PostgreSQL `report_db` + MinIO

| Bảng/entity | Khóa chính | Trường quan trọng | Ràng buộc/logic | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `UserReport` | `id` | `reporterUserId`, `reporterStudentId`, `reporterRole`, `targetType`, `targetId`, `reason`, `evidenceUrl`, `status`, `moderationNote`, `reviewedByUserId`, `createdAt`, `reviewedAt` | target/status enum | Report workflow |
| `ActionAnalyticsRecord` | `sourceActionId` | `studentId`, `missionId`, `stationId`, `actionType`, `status`, `points`, `occurredOn` | consume action event | Action analytics |
| `StudentRewardSnapshot` | `studentId` | `currentPoints`, `updatedOn` | consume reward event | Snapshot điểm |
| `BadgeAnalyticsRecord` | `eventId` | `studentId`, `badgeCode`, `badgeName`, `occurredOn` | event idempotent | Badge analytics |
| `CertificateAnalyticsRecord` | `eventId` | `certificateId`, `studentId`, `certificateType`, `occurredOn` | event idempotent | Certificate analytics |
| `MissionAnalyticsRecord` | `missionId` | `title`, `status`, `createdByUserId`, `createdOn`, `updatedOn` | consume mission event | Mission analytics |
| `UserAnalyticsRecord` | `userId` | `role`, `studentId`, `registeredOn` | consume user event | User analytics |

### 6.9. Notification Service - PostgreSQL `notification_db`

| Bảng/entity | Khóa chính | Trường quan trọng | Ràng buộc/logic | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `UserNotification` | `id` | `userId`, `studentId`, `role`, `type`, `title`, `message`, `link`, `read`, `createdAt`, `readAt` | recipient guard khi mark read/read-all | Inbox thông báo |

## 7. Ràng Buộc Không Dùng Foreign Key Xuyên Service

Vì đây là microservices, các ràng buộc giữa service không dùng FK vật lý:

- `studentId` trong Action/Reward/Leaderboard/Recognition/Report là ID logic từ Identity.
- `missionId`, `stationId`, `actionType` trong Action là ID logic từ Catalog/Policy.
- `sourceActionId` trong RewardTransaction tham chiếu action bằng ID logic và unique nội bộ.
- `seasonId` trong Certificate tham chiếu snapshot Leaderboard bằng convention.
- Report analytics dùng `eventId` hoặc source ID làm khóa để consume event idempotent.

Điểm mạnh: service độc lập DB, không đọc chéo database. Điểm cần nhớ: consistency là eventual consistency, frontend nên refetch/poll sau submit/approve/close season.

## 8. Các Luồng Cần Test Khi Demo

1. Register -> verify email -> login.
2. Student submit mission recycle có evidence/station -> accepted -> điểm tăng -> leaderboard tăng -> badge có thể unlock.
3. Submit mission thiếu evidence -> pending review -> moderator approve/reject.
4. Reuse idempotency key -> backend trả `409`.
5. Unsupported/daily limit action -> rejected, không cộng điểm.
6. Admin adjust điểm -> wallet và transaction thay đổi, không được làm ví âm.
7. Admin close season -> snapshot -> certificate -> PDF download.
8. Student redeem coupon -> nhận voucher; bấm lại không tạo voucher mới.
9. Student/Moderator tạo report -> Moderator/Admin review report.
10. Admin analytics xem/export tuần/tháng/năm; không chọn được kỳ tương lai.
11. Notification dropdown có dữ liệu seed, mark read/read all và điều hướng theo link.
