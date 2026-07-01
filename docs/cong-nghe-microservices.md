# Công Nghệ Microservices Trong EcoQuest Campus

Cập nhật: 2026-07-01

Tài liệu này tổng hợp các công nghệ microservices đang có trong project EcoQuest Campus và chúng được dùng ở đâu, dùng như thế nào.

## 1. Kiến Trúc Tổng Thể

Project hiện có 9 microservice backend:

| Service | Vai trò | Port |
| --- | --- | --- |
| Identity Access | Auth, register, verify email, forgot/reset, profile, avatar, user management | `8086` |
| Green Catalog | Mission, station, badge definition, station image | `8081` |
| Eco Action | Draft, submit action, evidence, moderation, outbox | `8082` |
| Verification Policy | Rule policy, gRPC evaluation, direct admin REST | `8090` REST, `9090` gRPC |
| Reward Ledger | Wallet, transaction, badge achievement, adjust points | `8083` |
| Leaderboard | Weekly/monthly rank, season snapshot | `8084` |
| Recognition | Certificate PDF, reward offer catalog, coupon/voucher eligibility and claim | `8085` |
| Report | User report workflow, analytics read model, report PDF export | `8087` |
| Notification | Inbox, read/read-all, SSE realtime notification | `8088` |

Frontend React/Vite chạy sau Nginx container tại `http://localhost:3000`. Backend đi qua Spring Cloud Gateway tại `http://localhost:18080`.

## 2. Spring Boot 3 Và Java 21

Tất cả service backend là Spring Boot 3, build bằng Java 21. Mỗi service có runtime riêng, Docker image riêng và lifecycle riêng trong Docker Compose.

Cách dùng trong project:

- Controller REST cho API public/internal.
- Spring Data JPA cho PostgreSQL.
- Spring Data MongoDB cho Action service.
- Spring AMQP cho RabbitMQ event.
- Spring Security/JWT ở các service cần protected API.
- Actuator health để kiểm tra service sống/chết.

## 3. Spring Cloud Gateway

Gateway là cửa vào HTTP chính cho frontend:

- `/auth/**` -> Identity.
- `/catalog/**` -> Catalog.
- `/actions/**` -> Action.
- `/rewards/**` -> Reward.
- `/leaderboards/**` -> Leaderboard.
- `/recognitions/**` -> Recognition.
- `/reports/**` -> Report.
- `/notifications/**` -> Notification.

Nguyên tắc:

- Gateway chỉ route, CORS/correlation ID, không chứa nghiệp vụ.
- Không đặt logic cộng điểm, xét policy, tạo certificate trong Gateway.
- Policy Admin REST không route qua Gateway, cố ý chạy direct `http://localhost:8090`.

## 4. Database Per Service

Mỗi service sở hữu database riêng:

| Service | Database |
| --- | --- |
| Identity | PostgreSQL `identity_db` |
| Catalog | PostgreSQL `catalog_db` |
| Action | MongoDB `action_db` |
| Policy | PostgreSQL `policy_db` |
| Reward | PostgreSQL `reward_db` |
| Leaderboard | PostgreSQL `leaderboard_db` + Redis |
| Recognition | PostgreSQL `recognition_db` |
| Report | PostgreSQL `report_db` |
| Notification | PostgreSQL `notification_db` |

Quy tắc microservice:

- Service không đọc database của service khác.
- ID giữa service là tham chiếu logic, không dùng foreign key vật lý xuyên DB.
- Dữ liệu tổng hợp dùng event/read model, ví dụ Report analytics.

## 5. RabbitMQ Event-Driven Architecture

RabbitMQ dùng cho giao tiếp bất đồng bộ giữa service. Exchange chung nằm trong building block messaging.

Các event chính:

| Event | Nơi phát | Nơi consume |
| --- | --- | --- |
| `ActionAcceptedEvent` | Action | Reward, Report, Notification |
| `ActionRejectedEvent` | Action | Report, Notification |
| `PointsGrantedEvent` | Reward | Leaderboard, Report, Recognition |
| `BadgeUnlockedEvent` | Reward | Report, Notification, Recognition |
| `LeaderboardSeasonClosedEvent` | Leaderboard | Recognition |
| `CertificateIssuedEvent` | Recognition | Report, Notification |
| `MissionStatusChangedEvent` | Catalog | Report, Notification |
| `UserRegisteredEvent` | Identity | Report |
| `UserStatusChangedEvent` | Identity | Notification |
| `UserReportCreatedEvent` | Report | Notification |
| `UserReportReviewedEvent` | Report | Notification |

Cách kiểm tra RabbitMQ:

- UI: `http://localhost:15672`
- User/pass: `guest/guest`
- Smoke test kiểm queue còn `0` pending message và có consumer.

Ý nghĩa:

- Reward không cần Action gọi trực tiếp để cộng điểm.
- Report không cần đọc DB Action/Reward/Catalog/Identity.
- Notification không cần service khác gọi sync.
- Hệ thống chấp nhận eventual consistency, nên UI cần refetch/poll sau event.

## 6. gRPC Giữa Action Và Policy

Action service gọi Verification Policy service bằng gRPC để evaluate action:

- Input: `actionType`, `evidenceUrl`, `stationId`, số lần submit trong ngày.
- Output: accepted/requires manual review/suggested points/reason.

Vì sao dùng gRPC:

- Policy là rule evaluation nội bộ, cần nhanh và strongly typed.
- Action không copy rule policy vào code của mình.
- Policy có direct admin REST riêng để quản trị rule, nhưng flow nghiệp vụ dùng gRPC.

Resilience:

- Action có circuit breaker/fallback cho policy client để tránh sập dây chuyền khi Policy lỗi.

## 7. Redis

Redis đang dùng cho hai nhóm việc:

1. Action service:
   - Lưu draft action tạm thời.
   - Kiểm idempotency key để double submit không tạo trùng action.

2. Leaderboard service:
   - Sorted set cho weekly/monthly ranking.
   - Score là điểm student.
   - Truy vấn rank nhanh cho dashboard/leaderboard.

Cách kiểm tra nhanh:

```powershell
docker exec -it microservices-se361-redis-1 redis-cli keys *
```

## 8. MinIO Object Storage

MinIO dùng thay vì lưu file base64 trong DB.

| Loại file | Service sở hữu | Bucket cấu hình |
| --- | --- | --- |
| Avatar | Identity | `ecoquest-avatars` |
| Station image | Catalog | `ecoquest-stations` |
| Action evidence | Action | `ecoquest-evidence` |
| Report evidence | Report | `ecoquest-report-evidence` |
| Certificate PDF | Recognition | `ecoquest-certificates` |

Nguyên tắc:

- Service nào sở hữu nghiệp vụ thì sở hữu file.
- DB chỉ lưu URL/object key.
- Frontend upload file qua API của owning service, không upload trực tiếp vào bucket.

MinIO console:

- URL: `http://localhost:9001`
- User/pass: `minioadmin/minioadmin`

## 9. MongoDB Cho Action Service

Action dùng MongoDB vì action document có tính event/log và payload linh hoạt:

- `eco_actions`: dữ liệu submit action.
- `action_outbox`: outbox message cần publish RabbitMQ.

Outbox giúp hạn chế mất event:

1. Action lưu action và outbox message.
2. Outbox publisher publish RabbitMQ.
3. Sau khi publish thành công, cập nhật `publishedAt`.
4. Nếu lỗi, lưu `lastError` để retry/kiểm tra.

## 10. PostgreSQL Cho Các Service Còn Lại

PostgreSQL dùng cho dữ liệu quan hệ ổn định:

- Identity: user/token.
- Catalog: mission/station/badge.
- Policy: rule.
- Reward: wallet/transaction/badge.
- Leaderboard: snapshot.
- Recognition: certificate/coupon metadata.
- Report: report workflow và analytics read model.
- Notification: inbox/read state.

Một số ràng buộc quan trọng:

- Identity unique email/studentId.
- RewardTransaction unique sourceActionId.
- BadgeAchievement unique studentId/badgeCode.
- CertificateRecord unique studentId/seasonId.
- Token hash unique trong Identity.

## 11. JWT Và Role-Based Access Control

Identity phát JWT sau khi user login thành công.

Role:

- `STUDENT`: Student panel/self data.
- `MODERATOR`: Student self panel + Moderator panel.
- `ADMIN`: Moderator/Admin panel, không có Student submit panel.

Các service tự kiểm JWT/role, frontend role switch không thể nâng quyền backend.

Ràng buộc đáng chú ý:

- User inactive/banned không đăng nhập được.
- Admin không được tự đổi role/status/ban/delete chính mình.
- Moderator không được review action của chính mình.
- Student không được xem/submit thay student khác.

## 12. SMTP Email

Identity gửi email thật khi bật SMTP trong `.env`:

- Xác nhận đăng ký.
- Quên mật khẩu/reset password.
- Thông báo user bị active/inactive/banned kèm lý do và email hỗ trợ.

Email dùng template HTML branded và logo EcoQuest inline CID, tránh phụ thuộc ảnh `localhost`.

## 13. PDF Generation

Recognition tạo certificate PDF bằng Java/iText:

- A4 landscape.
- Có registry ID, issued date.
- Có hai chữ ký: đại diện trường đại học và đại diện ứng dụng EcoQuest.
- Download qua endpoint protected, frontend tải bằng blob kèm bearer token.

Report service cũng xuất PDF báo cáo:

- Theo tuần/tháng/năm được chọn.
- Không cho chọn kỳ tương lai.
- PDF có KPI, bảng metric, action type, top students và footer nguồn dữ liệu.

## 14. Docker Compose

Docker Compose dựng toàn bộ hệ thống local:

```powershell
$env:API_GATEWAY_PORT='18080'
docker compose up -d --build
```

Các cổng quan trọng:

| Thành phần | URL |
| --- | --- |
| Web | `http://localhost:3000` |
| Gateway | `http://localhost:18080` |
| RabbitMQ UI | `http://localhost:15672` |
| MinIO Console | `http://localhost:9001` |
| Policy Admin | `http://localhost:8090/policies/rules` |

Khi chỉ sửa một service:

```powershell
docker compose build recognition-service
docker compose up -d --no-deps recognition-service
```

## 15. Testing Và Smoke Test

Smoke test chính:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090
```

Smoke test kiểm:

- Gateway health.
- Auth register/verify/login/reset.
- Role boundary.
- Catalog CRUD.
- Policy direct API CRUD.
- Action draft/idempotency/evidence/submit.
- gRPC Policy evaluation.
- RabbitMQ event pipeline.
- Reward wallet/badge.
- Leaderboard rank/snapshot.
- Recognition certificate PDF và coupon idempotency.
- Report workflow và analytics.
- Notification inbox.
- RabbitMQ queue drain.

Frontend:

```powershell
cd web-apps\ecoquest-web
npm.cmd test
npm.cmd run build
```

## 16. Những Điểm Đúng Tính Microservice

- Có Gateway nhưng Gateway không chứa nghiệp vụ.
- Mỗi service có database riêng.
- Không đọc DB chéo.
- Giao tiếp sync chỉ dùng ở điểm cần thiết: Action -> Catalog validate, Action -> Policy gRPC.
- Luồng còn lại dùng RabbitMQ event.
- File upload lưu ở object storage theo owning service.
- Report analytics là read model riêng, không query trực tiếp DB service khác.
- Notification là service riêng consume event, không nhúng vào từng service.
- Các ràng buộc chống duplicate nằm ở service sở hữu nghiệp vụ.
