# Luồng Nghiệp Vụ, Use Case Và Database EcoQuest Campus

Cập nhật: 2026-07-01

Tài liệu này mô tả bằng tiếng Việt cách ứng dụng EcoQuest Campus hoạt động ở mức nghiệp vụ, khi nào certificate/badge/coupon được tạo, các use case chính và database của từng microservice. Project dùng kiến trúc database-per-service, nên các "khóa ngoại" giữa service được quản lý bằng ID tham chiếu và event, không tạo foreign key vật lý xuyên database.

## 1. Tổng Quan Luồng Chính

EcoQuest Campus là hệ thống gamification cho hoạt động xanh trong trường học:

1. Student đăng ký tài khoản, xác nhận email, đăng nhập.
2. Student xem mission đang `ACTIVE`, chọn mission, upload minh chứng nếu cần và submit action.
3. Action service kiểm tra mission qua Catalog, kiểm policy bằng gRPC sang Policy service.
4. Nếu hợp lệ, action được lưu và event được phát qua RabbitMQ.
5. Reward Ledger nhận event action accepted, cộng điểm, ghi transaction và unlock badge nếu đủ điều kiện.
6. Leaderboard nhận event điểm, cập nhật bảng xếp hạng tuần/tháng bằng Redis.
7. Admin close season ở Leaderboard, Leaderboard tạo snapshot và phát event season closed.
8. Recognition nhận event close season, tạo certificate PDF, lưu MinIO và metadata trong DB riêng.
9. Report service nhận event để tạo analytics read model phục vụ báo cáo tuần/tháng/năm.
10. Notification service nhận event để tạo thông báo realtime/inbox cho user liên quan.

## 2. Khi Nào Badge Được Đạt

Badge không được tạo trực tiếp từ frontend. Badge thuộc Reward Ledger service.

- Khi action có trạng thái `ACCEPTED`, Reward Ledger cộng điểm và kiểm điều kiện badge.
- Badge theo điểm: đạt khi tổng điểm ví của student vượt ngưỡng của badge definition.
- Badge theo số lần action: đạt khi student có đủ số transaction accepted theo `actionType` tương ứng.
- Ràng buộc chống trùng: bảng `BadgeAchievement` có unique theo `studentId + badgeCode`, nên một student không nhận cùng badge nhiều lần.
- Khi badge mới được unlock, Reward Ledger publish `BadgeUnlockedEvent`; Notification và Report analytics sẽ consume event này.

Ví dụ seed hiện tại:

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
4. Recognition consume event này, với mỗi winner sẽ:
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

Coupon là luồng đổi thành tích thành voucher thật trong phạm vi demo local, thuộc Recognition service. Nó không phải đổi certificate thành tiền và không trừ điểm ở bản hiện tại, nhưng backend có catalog coupon, điều kiện nhận, stock, hạn dùng và idempotency.

1. Student mở trang Certificates.
2. UI gọi `GET /recognitions/rewards?studentId=...` để lấy danh sách reward offer đang active.
3. Student bấm redeem, frontend gọi `POST /recognitions/rewards/{rewardId}/claim`.
4. Recognition kiểm quyền self/admin và kiểm điều kiện của offer:
   - student có đủ `requiredPoints`;
   - có đủ `requiredBadges`;
   - có đủ `requiredCertificates`;
   - offer còn `remainingStock`;
   - offer chưa hết `validUntil`.
5. Nếu student đủ điều kiện và chưa claim reward đó, backend tạo `RewardClaim` với:
   - `status = ISSUED`;
   - `voucherCode = ECO-...`;
   - `claimedOn = now`;
   - `expiresAt = offer.validUntil`.
6. Backend trừ `remainingStock` của `RewardOffer`.
7. Nếu student bấm claim lại cùng `studentId + rewardId`, backend trả lại claim cũ, không phát thêm voucher mới và không trừ stock lần hai.

Ràng buộc nghiệp vụ hiện tại:

- Recognition sở hữu `RewardOffer`, `RewardClaim` và `StudentRecognitionProfile`.
- `StudentRecognitionProfile` được cập nhật bằng `PointsGrantedEvent`, `BadgeUnlockedEvent` và lúc phát certificate; Recognition không đọc Reward DB.
- Một student chỉ nhận một voucher cho mỗi `rewardId`.
- Admin có thể CRUD reward offer trong Recognition. Delete bị chặn nếu offer còn active hoặc đã có voucher issued.
- Coupon không trừ điểm trong bản hiện tại; nếu muốn redemption có trừ điểm thì nên thêm transaction debit có audit ở Reward Ledger hoặc event phối hợp giữa Reward và Recognition.

## 5. Use Case Theo Vai Trò

### Student

- Đăng ký, xác nhận email, đăng nhập.
- Xem dashboard cá nhân: điểm, rank, badge, certificate, trạng thái submit.
- Xem mission active.
- Submit action theo từng mission.
- Upload evidence nếu mission yêu cầu.
- Lưu draft action.
- Xem lịch sử action của mình.
- Xem ví điểm, transaction và badge.
- Xem leaderboard tuần/tháng.
- Xem certificate và download PDF.
- Redeem coupon thật theo offer đủ điều kiện.
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
- Xem Reports, review report theo quyền.
- Xem Leaderboard.
- Cập nhật profile.

### Admin

- Có Admin dashboard riêng.
- Quản lý Catalog: mission, station, badge.
- Duyệt trạng thái mission của moderator.
- Quản lý user: role, status, delete theo ràng buộc.
- Không được đổi role/status/ban/delete chính mình.
- Quản lý Policy Rules qua direct port `8090`.
- Adjust điểm student có audit và không cho ví âm.
- Xem Reports và Analytics.
- Xuất báo cáo PDF theo tuần/tháng/năm trong quá khứ hoặc hiện tại.
- Close season để tạo snapshot và certificate.

## 6. Database Theo Microservice

### Identity Access Service - PostgreSQL `identity_db`

| Bảng/entity | Khóa chính | Ràng buộc chính | Ý nghĩa |
| --- | --- | --- | --- |
| `user_accounts` | `id` | unique `email`, unique `studentId`; role/status enum | Tài khoản, role, status, profile, avatar URL |
| `password_reset_tokens` | `id` | unique `tokenHash`; `userId` tham chiếu logic tới `user_accounts.id` | Token quên mật khẩu, có `expiresAt`, `usedAt` |
| `email_verification_tokens` | `id` | unique `tokenHash`; `userId` tham chiếu logic tới `user_accounts.id` | Token xác nhận email |

Ghi chú: token chỉ lưu hash, không lưu token thô. Admin self-protection nằm ở service này.

### Green Catalog Service - PostgreSQL `catalog_db`

| Bảng/entity | Khóa chính | Ràng buộc chính | Ý nghĩa |
| --- | --- | --- | --- |
| `Mission` | `id` | `title` not blank, `basePoints` positive, `status` enum | Mission, action type, điểm cơ bản, yêu cầu evidence/station |
| `GreenStation` | `id` | `active` boolean | Trạm xanh, vị trí, ảnh station |
| `BadgeDefinition` | `code` | default `criteriaType=POINTS`, `requiredCount=0` | Định nghĩa badge theo điểm hoặc số lần action |

Ghi chú: Catalog không đọc Reward DB để biết student đã có badge hay chưa; Reward tự dùng definition/logic và event.

### Eco Action Service - MongoDB `action_db`

| Collection | Khóa chính | Ràng buộc/logic | Ý nghĩa |
| --- | --- | --- | --- |
| `eco_actions` | `id` | `status` enum `ACCEPTED/PENDING_REVIEW/REJECTED`; idempotency bằng Redis | Action student submit |
| `action_outbox` | `id` | `publishedAt`, `lastError` | Outbox message để publish RabbitMQ |

Ghi chú:

- Draft action lưu ở Redis, không lưu bảng SQL.
- Evidence file lưu MinIO; action chỉ giữ `evidenceUrl`.
- Action gọi Policy bằng gRPC, không tự chứa rule policy.

### Verification Policy Service - PostgreSQL `policy_db`

| Bảng/entity | Khóa chính | Ràng buộc chính | Ý nghĩa |
| --- | --- | --- | --- |
| `PolicyRule` | `actionType` | `active`, `basePoints`, `evidenceRequired`, `stationRequired`, `dailyLimit` | Rule xác minh action |

Ghi chú: REST admin chạy direct `8090`, không public qua Gateway. Action dùng gRPC `9090`.

### Reward Ledger Service - PostgreSQL `reward_db`

| Bảng/entity | Khóa chính | Ràng buộc chính | Ý nghĩa |
| --- | --- | --- | --- |
| `RewardWallet` | `studentId` | không cho cộng điểm <= 0 trong grant, không cho adjust làm ví âm | Tổng điểm hiện tại |
| `RewardTransaction` | `id` | unique `sourceActionId` | Ledger giao dịch điểm, chống cộng điểm trùng cho một action |
| `BadgeAchievement` | `id` | unique `studentId + badgeCode` | Badge đã unlock |

Ghi chú: `studentId`, `sourceActionId`, `badgeCode` là tham chiếu logic, không FK vật lý qua service khác.

### Leaderboard Service - PostgreSQL `leaderboard_db` + Redis

| Storage | Khóa | Ràng buộc/logic | Ý nghĩa |
| --- | --- | --- | --- |
| Redis sorted set | theo weekly/monthly key | score là điểm | Rank realtime |
| `LeaderboardSnapshot` | `id` | chứa `seasonId`, `seasonType`, `studentId`, `rankNumber`, `points` | Snapshot khi admin close season |

Ghi chú: Redis phục vụ rank nhanh; PostgreSQL giữ snapshot lịch sử.

### Recognition Service - PostgreSQL `recognition_db` + MinIO

| Bảng/entity | Khóa chính | Ràng buộc chính | Ý nghĩa |
| --- | --- | --- | --- |
| `CertificateRecord` | `id` | unique `studentId + seasonId` | Metadata certificate PDF |
| `RewardOffer` | `id` | `active`, `requiredPoints`, `requiredBadges`, `requiredCertificates`, `remainingStock`, `validUntil` | Catalog coupon do Recognition sở hữu |
| `RewardClaim` | `id` | logic idempotent theo `studentId + rewardId` | Coupon/voucher đã phát |
| `StudentRecognitionProfile` | `studentId` | cập nhật từ event điểm/badge/certificate | Read model eligibility cho coupon |

Ghi chú: PDF lưu MinIO; DB chỉ lưu metadata và `objectKey`. Recognition không đọc Reward DB để xét coupon mà dùng read model từ event.

### Report Service - PostgreSQL `report_db` + MinIO

| Bảng/entity | Khóa chính | Ràng buộc/logic | Ý nghĩa |
| --- | --- | --- | --- |
| `UserReport` | `id` | `targetType` enum `USER/MISSION/ACTION`, `status` enum `OPEN/ACCEPTED/REJECTED` | Report do user tạo |
| `ActionAnalyticsRecord` | `sourceActionId` | consume action events | Read model action cho báo cáo |
| `StudentRewardSnapshot` | `studentId` | latest points snapshot | Điểm hiện tại theo student |
| `BadgeAnalyticsRecord` | `eventId` | consume badge event | Badge analytics |
| `CertificateAnalyticsRecord` | `eventId` | consume certificate event | Certificate analytics |
| `MissionAnalyticsRecord` | `missionId` | consume mission event | Mission analytics |
| `UserAnalyticsRecord` | `userId` | consume user event | User analytics |

Ghi chú: Report analytics không đọc DB của service khác, chỉ dựng read model từ RabbitMQ event.

### Notification Service - PostgreSQL `notification_db`

| Bảng/entity | Khóa chính | Ràng buộc/logic | Ý nghĩa |
| --- | --- | --- | --- |
| `UserNotification` | `id` | user/student/role recipient, `read`, `readAt` | Inbox và realtime notification |

Ghi chú: Notification consume event từ nhiều service và expose polling/SSE cho frontend.

## 7. Ràng Buộc Quan Trọng Không Dùng Foreign Key Xuyên Service

Vì đây là microservices, các ràng buộc giữa service không dùng FK vật lý:

- `studentId` trong Action/Reward/Leaderboard/Recognition/Report là ID logic từ Identity.
- `missionId`, `stationId`, `actionType` trong Action là ID logic từ Catalog/Policy.
- `sourceActionId` trong RewardTransaction tham chiếu action, chống duplicate bằng unique nội bộ.
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
