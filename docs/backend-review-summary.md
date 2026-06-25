# EcoQuest Backend Review Summary

Updated: 2026-06-26

## Kết luận

Backend hiện có **9 microservices**, đáp ứng kiến trúc cốt lõi trong `EcoQuest_Campus_Microservices_De_Xuat_Du_An.docx` và các yêu cầu bổ sung trong `Note SE361 - Microservices.docx`.

Hệ thống không phải distributed monolith:

- Database per service, không đọc DB chéo.
- Gateway chỉ route/CORS/correlation ID.
- Action -> Policy là gRPC nội bộ.
- Action -> Reward -> Leaderboard -> Recognition là event-driven qua RabbitMQ.
- Notification tạo read model riêng từ integration event.
- Shared modules chỉ chứa contract/hạ tầng, không chứa domain entity.

## Microservices

| Service | Data ownership | Trạng thái |
| --- | --- | --- |
| Identity Access | PostgreSQL `identity_db` | Hoàn thành |
| Green Catalog | PostgreSQL `catalog_db` | Hoàn thành |
| Eco Action | MongoDB `action_db`, Redis, MinIO | Hoàn thành |
| Verification Policy | PostgreSQL `policy_db` | Hoàn thành |
| Reward Ledger | PostgreSQL `reward_db` | Hoàn thành |
| Leaderboard | Redis, PostgreSQL `leaderboard_db` | Hoàn thành |
| Recognition | PostgreSQL `recognition_db`, MinIO | Hoàn thành |
| Report | PostgreSQL `report_db`, MinIO | Hoàn thành workflow report nội dung, evidence upload và analytics read model |
| Notification | PostgreSQL `notification_db` | Hoàn thành inbox/SSE và event consumers mở rộng |

Identity, Report và Notification là các bounded context bổ sung ngoài 6 service ban đầu. Việc tách này phù hợp microservice vì chúng có nghiệp vụ, API và database riêng.

## Use case đã có

### Identity và phân quyền

- Register, verify email, resend verification, login.
- Forgot/reset password với token one-time.
- Gmail SMTP thật khi cấu hình; local mode trả token để test.
- Profile, avatar, user list, update role/status, delete user bị banned.
- `ACTIVE`, `INACTIVE`, `BANNED`; login bị chặn nếu chưa verify hoặc không active.
- JWT resource guard tại owning services.
- Moderator account có thể dùng Student self panel, nhưng Moderator panel không lặp các trang Student.
- Moderator không được review action của chính mình.
- Admin có quyền quản trị/review nhưng không submit thay Student.

### Catalog và Action

- 12 missions, 7 stations có ảnh, 6 badge definitions.
- Mission workflow `PENDING -> ACTIVE/REJECTED/CANCELLED/COMPLETED`.
- Mission mới luôn pending; Admin quyết định status.
- Student chỉ thấy mission có trạng thái công khai; management view thấy toàn bộ.
- Action xác nhận mission đang `ACTIVE` và `actionType` khớp qua Catalog trước khi gọi Policy.
- Draft Redis, idempotency Redis, MongoDB persistence.
- Evidence upload/download qua Action-owned MinIO bucket.
- Policy gRPC, Resilience4j circuit breaker.
- Action outbox trước khi publish RabbitMQ.
- `ACCEPTED`, `PENDING_REVIEW`, `REJECTED`.
- Review queue/history, filter status, approve/reject, moderation metadata.

### Reward, Leaderboard, Recognition

- Wallet, immutable reward transaction, event idempotency theo `sourceActionId`.
- Badge theo điểm và theo số lần action.
- Weekly/monthly leaderboard và user rank.
- Close season idempotent, snapshot DB riêng.
- Recognition tạo certificate record, PDF MinIO và download attachment `application/pdf`; frontend tải blob có JWT nên không còn Whitelabel 401.
- Reward claim demo.

### Report và Notification

- Student/Moderator tạo report và xem report của mình.
- Moderator/Admin xem/filter/review report.
- Report analytics dùng read model riêng consume action accepted/rejected, points granted, badge unlocked, certificate issued, mission status và user registration; có API summary tuần/tháng/năm/all, series theo range tuần/tháng/năm không cho future period, all-student outcome report, student analytics và export PDF attachment cho kỳ hiện tại hoặc kỳ được chọn trong quá khứ.
- Identity email templates attach the real EcoQuest PNG logo inline by CID, so branded verification/reset/status emails do not depend on external or localhost image URLs.
- Policy service owns rule create/update/delete; delete remains guarded by inactive-only validation.
- Notification inbox, mark read, read-all và SSE endpoint.
- Notification từ action accepted/rejected, badge unlocked, certificate issued, mission status changed, report created/reviewed, user reported và user status changed.
- Admin có thể tạo notification theo user/student/role.

## So sánh với tài liệu gốc

Đã đáp ứng:

- Spring Boot/Java 21, Gateway, PostgreSQL, MongoDB, Redis, RabbitMQ, MinIO, Docker Compose.
- Database per service và bounded context rõ.
- gRPC verification.
- Event-driven reward/leaderboard/recognition.
- CQRS read model cho leaderboard; Reward Ledger có cấu trúc Clean Architecture rõ nhất.
- JWT/RBAC, upload evidence, Outbox, Resilience4j, OpenAPI.
- Badge theo action count thay vì chỉ theo điểm.

Khác hoặc còn giản lược:

- Tài liệu gốc đề xuất 6 service; hiện có 9 vì bổ sung Identity, Report, Notification theo yêu cầu sau.
- Identity dùng Flyway + MapStruct. Các database service cũ chưa chuyển toàn bộ sang Flyway; một số vẫn dùng Hibernate update hoặc bootstrap SQL idempotent.
- OpenAPI có ở direct service port, chưa aggregate thành một portal Gateway.
- JWT là implementation local ký bằng shared secret, chưa phải OAuth2/OIDC/Keycloak.
- Action Outbox đã có; các producer event khác chưa dùng outbox toàn diện.
- Evidence, certificate, avatar, station image và report evidence đều được lưu bởi owning service trong MinIO.
- Report service có analytics read model cho action, điểm hiện tại, badge và certificate; chưa phải analytics warehouse lớn với BI pipeline riêng.
- Frontend Notification đã có SSE unread count bằng `accessToken` query, ngoài inbox/polling fallback.

Các điểm trên không làm sai boundary microservice hiện tại, nhưng là backlog production-hardening.

## Bug/fix trong vòng review cuối

- Thêm Report và Notification vào component scan để RabbitMQ consumer/bean được load.
- Thêm mission `stationRequired`, station `imageUrl` và seed/backfill.
- Thêm Action -> Catalog eligibility check để không submit mission pending/cancelled/completed hoặc sai action type.
- Sửa Catalog schema migration tương thích database cũ, không còn lỗi add cột non-null.
- Sửa frontend Catalog edit để dùng `PUT` thay vì tạo duplicate bằng `POST`.
- Thêm mission status management, active-only submission, own-action moderation guard UI.
- Thêm Catalog station image upload endpoint.
- Thêm Report analytics event consumer/read model/API.
- Mở rộng Notification event consumers và hỗ trợ SSE bằng query token.
- Tách test Moderator self-service khỏi dữ liệu seed tích lũy để smoke test repeatable.
- Test unsupported/daily policy tự tạo mission active hợp lệ rồi dọn dữ liệu.

## Test đã xác minh

Ngày 25/06/2026:

```powershell
docker run --rm -v ${PWD}:/workspace -v ${PWD}/.m2:/root/.m2 -w /workspace maven:3.9.9-eclipse-temurin-21 mvn package -DskipTests
$env:API_GATEWAY_PORT='18080'
docker compose up -d --build
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090
cd web-apps\ecoquest-web
npm.cmd test
npm.cmd run build
```

Kết quả sau patch mới nhất:

- Maven full reactor 14/14 modules: **PASS**.
- `docker compose config --quiet`: **PASS**.
- Backend smoke test: **PASS**.
- RabbitMQ queue drain after smoke: **PASS**.
- Post-smoke log scan for `ERROR|Exception|Assertion failed|Timed out`: **PASS** after warm-up; earlier Gateway connection-refused logs only occurred while Identity was still starting.
- Frontend unit tests: **9/9 PASS**.
- Frontend production build after Policy modal, Student outcome layout, and dashboard partial-loading fixes: **PASS**.
- Frontend Vite build: **PASS**.

## Đánh giá mức hoàn thiện

Backend đạt yêu cầu coursework/demo microservices và đủ để frontend tích hợp. Không nên tuyên bố production-ready tuyệt đối cho đến khi:

- migrate toàn bộ PostgreSQL service sang versioned Flyway;
- dùng OAuth2/OIDC và secret management;
- áp dụng outbox/inbox cho toàn bộ producer/consumer quan trọng;
- mở rộng analytics thành warehouse/BI nếu yêu cầu production;
- baseline Flyway cho toàn bộ service cũ nếu cần hardening production;
- thêm integration/contract test tự động sâu hơn ngoài smoke test.
