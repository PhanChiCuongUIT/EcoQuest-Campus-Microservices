# Hướng Dẫn Smoke Test Backend EcoQuest

Cập nhật: 2026-07-10

File này giải thích lệnh test backend, nội dung script đang kiểm thử, kết quả mong đợi và cách xóa dữ liệu E2E sau khi test.

## Lệnh Smoke Test Chuẩn

Lệnh sau dùng để chạy backend smoke test qua API Gateway và Policy Admin API:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090
```

Ý nghĩa:

- `-Gateway http://localhost:18080`: gọi toàn bộ domain API qua API Gateway.
- `-Policy http://localhost:8090`: gọi Policy Admin API trực tiếp vì Policy Admin không public qua Gateway.
- Không truyền `-Web`: script vẫn test backend đầy đủ, nhưng bỏ qua riêng case upload file lớn qua frontend Nginx proxy `http://localhost:3000`.

Nếu muốn test cả web proxy upload lớn, dùng bản đầy đủ hơn:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090 -Web http://localhost:3000
```

Nếu chỉ muốn kiểm API mà bỏ qua kiểm Docker nội bộ như Redis/RabbitMQ queue, thêm:

```powershell
-SkipDockerChecks
```

## Điều Kiện Trước Khi Test

Chạy stack trước:

```powershell
$env:API_GATEWAY_PORT='18080'
docker compose up -d
docker compose ps
```

Các service cần đang `Up`:

- `api-gateway`
- `identity-access-service`
- `green-catalog-service`
- `eco-action-service`
- `verification-policy-grpc-service`
- `reward-ledger-service`
- `leaderboard-service`
- `recognition-service`
- `report-service`
- `notification-service`
- PostgreSQL/MongoDB/Redis/RabbitMQ/MinIO

## Script Đang Test Những Gì?

Script chính: `scripts/backend-smoke-test.ps1`.

Các nhóm kiểm thử:

1. Gateway health
   - `GET /actuator/health` phải trả `UP`.

2. Identity/Auth
   - Admin login.
   - Moderator login.
   - Register student E2E.
   - Login trước verify bị chặn.
   - Verify email.
   - Duplicate email trả `409`.
   - Forgot password trả reset token local.
   - Reset password.
   - Old password bị chặn.
   - Login bằng password mới.
   - Profile update.
   - Avatar upload/download qua MinIO.
   - Admin list users.
   - Admin không được tự đổi role/status chính mình.
   - Admin promote/demote/status user.

3. Catalog
   - Seed missions/stations/badges đủ số lượng.
   - Mission seed có status đúng.
   - Station có image URL.
   - Upload station image.
   - Catalog API yêu cầu JWT.
   - Admin create/update/delete mission.
   - Admin create/update/delete station.
   - Admin create/update/delete badge.

4. Policy
   - `/policies/rules` không route qua Gateway.
   - Policy direct port `8090` yêu cầu bearer token.
   - Seed policy rules đủ.
   - Create rule.
   - Không delete rule active.
   - Deactivate rule.
   - Delete inactive rule.

5. Notification
   - Seeded inbox cho Moderator/Admin.
   - Student/Moderator/Admin recipient guards.
   - Mark read / mark all read.
   - Notification từ event action/badge/certificate/report.

6. RBAC
   - Student không gọi được admin APIs.
   - Moderator không thao tác ngoài quyền.
   - Admin quyền cao nhưng vẫn bị chặn self-mutation.
   - Moderator không duyệt action/report của chính mình.

7. Redis Draft Và Idempotency
   - `POST /actions/drafts` tạo key Redis.
   - Duplicate submit với cùng `idempotencyKey` trả `409`.

8. Action Evidence Upload
   - Upload ảnh evidence.
   - Upload ảnh thứ hai.
   - Upload video evidence.
   - Download preview ảnh/video.
   - Nếu có `-Web`, test upload payload lớn qua frontend Nginx proxy.
   - Submit nhiều ảnh hợp lệ.
   - Submit một video hợp lệ.
   - Trộn ảnh và video bị reject.

9. Submit Action Và Review Gate
   - Submit hợp lệ không cộng điểm ngay.
   - Action lưu `PENDING_REVIEW`.
   - Action xuất hiện trong Moderator Review Queue.
   - Moderator/Admin approve mới chuyển `ACCEPTED`.
   - Sau approve mới publish event để Reward/Leaderboard/Report/Notification cập nhật.
   - Reject không cộng điểm.

10. Reward Ledger
   - Wallet trước approve vẫn là `0`.
   - Sau approve có transaction theo `sourceActionId`.
   - Badge unlock theo rule.
   - Manual adjust điểm dương/âm có audit.
   - Không cho ví âm.

11. Leaderboard
   - Weekly/monthly leaderboard hiện tại.
   - Previous week/month trong năm.
   - User rank.
   - Invalid week trả `400`.
   - Close season tạo snapshot.
   - Close season lặp không duplicate snapshot.

12. Recognition
   - Consume season close event.
   - Tạo certificate.
   - Download certificate PDF trả `application/pdf` và `Content-Disposition: attachment`.
   - Reward offer CRUD.
   - Coupon eligibility thật theo points/badge/certificate/stock/expiry.
   - Claim coupon hợp lệ phát voucher.
   - Claim locked coupon trả `409`.
   - Claim trùng trả lại voucher cũ, không trừ stock lần hai.

13. Report
   - Create report.
   - List my reports.
   - Moderator/Admin review reports.
   - Upload report evidence.
   - Analytics summary tuần/tháng/năm/all.
   - Series report theo tuần/tháng/năm.
   - Reject future/reversed reporting range.
   - Student outcome report.
   - Export PDF analytics.

14. RabbitMQ
   - Các queue liên quan event phải có consumer.
   - Sau test, `messages = 0`.

## Kết Quả PASS Mong Đợi

Cuối script phải thấy:

```text
EcoQuest backend smoke test PASSED
Gateway: http://localhost:18080
Students: ...
Season: ...
```

Nếu dùng Docker checks, RabbitMQ cuối test phải có dạng:

```text
name    messages    consumers
...
reward.eco-action-accepted      0      1
leaderboard.points-granted      0      1
recognition.season-closed       0      1
notification.eco-action-accepted 0     1
report.eco-action-accepted      0      1
```

## Kết Quả Kiểm Sau Cleanup

Sau khi chạy smoke test, có thể chạy cleanup và kiểm lại dữ liệu E2E theo các nhóm sau:

| Khu vực | Kết quả |
| --- | --- |
| Identity E2E users | `0` |
| Catalog E2E missions/stations/badges | `0` |
| Policy E2E rules | `0` |
| Action E2E actions | `0` |
| Action E2E outbox | `0` |
| Reward E2E wallets/transactions/badges | `0` |
| Leaderboard E2E snapshots | `0` |
| Recognition E2E certificates/claims/profiles | `0` |
| Report E2E reports/analytics/users | `0` |
| Notification E2E rows | `0` |
| Redis E2E keys | `0` |
| Redis leaderboard E2E members | `0` |
| RabbitMQ queues | 20 queue, `0` pending messages, mỗi queue có 1 consumer |

Khi tất cả nhóm trên về `0`, dữ liệu test E2E do smoke sinh ra đã được dọn. Seed/demo data và dữ liệu thao tác UI không dùng tiền tố `E2E`, `SV_E2E`, `SV_AUTH` vẫn được giữ.

## Cách Xóa Dữ Liệu Test Sau Khi Chạy Smoke

Không nên dùng `docker compose down -v` nếu muốn giữ dữ liệu thao tác trên giao diện. Lệnh đó xóa toàn bộ volume và chỉ seed lại từ đầu.

Dùng cleanup chọn lọc:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\cleanup-smoke-test-data.ps1
```

Script cleanup xóa các pattern:

- User/email test: `e2e-*@ecoquest.local`
- Student ID test: `SV_E2E*`, `SV_AUTH*`
- Mission/station/badge test: `MISSION-E2E*`, `STATION-E2E*`, `BADGE-E2E*`
- Policy rule test: `E2E_*`
- Season test: `E2E-SEASON*`
- Reward offer test: `reward-e2e*`
- Redis key chứa `E2E`
- Member leaderboard Redis có `studentId` bắt đầu bằng `SV_E2E` hoặc `SV_AUTH` trong tất cả sorted set `ecoquest:leaderboard:*`
- Outbox/event/read-model liên quan các ID trên

Nếu muốn bỏ qua phần kiểm RabbitMQ khi cleanup:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\cleanup-smoke-test-data.ps1 -SkipRabbitMqCheck
```

## Khi Nào Mới Cần Reset Volume?

Chỉ dùng reset volume khi cần quay về seed sạch hoàn toàn và chấp nhận mất dữ liệu thao tác UI:

```powershell
$env:API_GATEWAY_PORT='18080'
docker compose down -v
docker compose up -d --build
```

Với nhu cầu bình thường sau smoke test, dùng `scripts\cleanup-smoke-test-data.ps1` là đủ.
