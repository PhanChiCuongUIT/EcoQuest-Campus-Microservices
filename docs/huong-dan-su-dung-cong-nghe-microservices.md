# Hướng Dẫn Sử Dụng Công Nghệ Microservices Trong EcoQuest Campus

Cập nhật: 2026-07-01

## 1. Chạy Hệ Thống Từ Đầu

Yêu cầu: Docker Desktop đang chạy.

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361
Copy-Item .env.example .env
$env:API_GATEWAY_PORT='18080'
docker compose up -d --build
docker compose ps
```

Mở web:

- Desktop: `http://localhost:3000`
- Mobile cùng Wi-Fi: `http://<IP-MAY-TINH>:3000`

Tài khoản demo:

- Student: `student@ecoquest.local` / `EcoQuest@123`
- Moderator: `moderator@ecoquest.local` / `EcoQuest@123`
- Admin: `admin@ecoquest.local` / `EcoQuest@123`

## 2. Đăng Nhập Và Quan Sát JWT

1. Mở web và đăng nhập.
2. Frontend gọi `POST /auth/login` qua Gateway.
3. Identity trả JWT.
4. Frontend lưu token trong `localStorage`.
5. Các service khác tự validate JWT, không tin vào role switcher frontend.

Ý nghĩa công nghệ:

- JWT giúp mỗi microservice tự kiểm quyền mà không cần gọi Identity liên tục.
- Role boundary thật nằm ở backend: Student self, Moderator review, Admin quản trị.

## 3. Spring Cloud Gateway

Gateway là cửa vào HTTP:

```text
Frontend -> Gateway :18080 -> service nội bộ
```

Các route chính:

- `/auth/**` -> Identity.
- `/catalog/**` -> Catalog.
- `/actions/**` -> Action.
- `/rewards/**` -> Reward.
- `/leaderboards/**` -> Leaderboard.
- `/recognitions/**` -> Recognition.
- `/reports/**` -> Report.
- `/notifications/**` -> Notification.

Cách kiểm tra:

```powershell
Invoke-RestMethod http://localhost:18080/actuator/health
```

Gateway chỉ route, không chứa business logic.

## 4. Database Per Service

Mỗi service có DB riêng. Ví dụ:

- Identity dùng `identity_db`.
- Catalog dùng `catalog_db`.
- Action dùng MongoDB `action_db`.
- Reward dùng `reward_db`.
- Recognition dùng `recognition_db`.

Cách vào PostgreSQL container:

```powershell
docker exec -it microservices-se361-identity-db-1 psql -U ecoquest -d identity_db
```

Cách vào MongoDB action:

```powershell
docker exec -it microservices-se361-action-db-1 mongosh
```

Ý nghĩa công nghệ:

- Không có foreign key vật lý xuyên service.
- Service khác chỉ giữ ID tham chiếu logic.
- Dữ liệu tổng hợp dùng event/read model.

## 5. RabbitMQ Event-Driven

RabbitMQ dùng để service giao tiếp bất đồng bộ:

- Action accepted -> Reward cộng điểm.
- Reward points -> Leaderboard update rank.
- Leaderboard close season -> Recognition tạo certificate.
- Reward badge/certificate/action/report/user events -> Notification và Report analytics.
- Recognition consume points/badge events để tự cập nhật profile coupon eligibility.

Mở UI:

```text
http://localhost:15672
guest / guest
```

Kiểm tra queue:

```powershell
docker exec microservices-se361-rabbitmq-1 rabbitmqctl list_queues name messages consumers
```

Kỳ vọng sau smoke:

- 20 queue.
- `messages = 0`.
- `consumers >= 1`.

Ý nghĩa công nghệ:

- Action không gọi sync sang Reward/Leaderboard/Report/Notification.
- Hệ thống giảm coupling.
- UI nên refetch/poll nhẹ vì dữ liệu là eventual consistency.

## 6. gRPC Action -> Policy

Khi submit action:

1. Action nhận request submit.
2. Action gọi Catalog kiểm mission active.
3. Action gọi Policy bằng gRPC.
4. Policy trả decision: accepted, pending review hoặc rejected.

Policy admin REST chạy direct:

```text
http://localhost:8090/policies/rules
```

Lý do dùng gRPC:

- Contract strongly typed.
- Nhanh cho rule evaluation nội bộ.
- Action không copy rule policy vào code.

## 7. Redis

Redis dùng cho:

- Draft action tạm thời.
- Idempotency key chống double submit.
- Leaderboard sorted set cho rank nhanh.

Kiểm tra:

```powershell
docker exec -it microservices-se361-redis-1 redis-cli keys *
```

Ý nghĩa công nghệ:

- Redis phù hợp dữ liệu tạm và ranking cần tốc độ cao.
- Dữ liệu bền vững vẫn nằm ở MongoDB/PostgreSQL.

## 8. MinIO Object Storage

MinIO lưu file thay vì nhét base64 vào DB:

| File | Service sở hữu |
| --- | --- |
| Avatar | Identity |
| Station image | Catalog |
| Action evidence | Action |
| Report evidence | Report |
| Certificate PDF | Recognition |

Mở console:

```text
http://localhost:9001
minioadmin / minioadmin
```

Ý nghĩa công nghệ:

- DB chỉ lưu URL/object key.
- Service nào sở hữu nghiệp vụ thì sở hữu file.
- Dễ thay MinIO bằng S3/Cloudinary/CDN sau này nếu deploy public.

## 9. Coupon Thật Trong Recognition

Cách dùng:

1. Đăng nhập Student.
2. Vào Certificates.
3. UI gọi `GET /recognitions/rewards?studentId=SV001`.
4. Offer đủ điều kiện sẽ có `eligible=true`.
5. Bấm Redeem, frontend gọi `POST /recognitions/rewards/{id}/claim`.
6. Backend tạo `RewardClaim` và voucher code.

Admin quản trị coupon offer qua Recognition:

- `POST /recognitions/rewards`
- `PUT /recognitions/rewards/{id}`
- `DELETE /recognitions/rewards/{id}`

Ràng buộc:

- Không delete offer đang active.
- Không delete offer đã có issued voucher.
- Claim lại cùng reward trả voucher cũ, không trừ stock lần hai.

## 10. Report Analytics

Report service dùng read model riêng:

- Không đọc DB Action/Reward/Catalog/Identity.
- Consume event để tổng hợp action, mission, user, points, badges, certificates.
- Admin xem summary/series/student outcome.
- Admin export PDF tuần/tháng/năm.

Ví dụ API:

```text
GET /reports/analytics/summary?period=weekly
GET /reports/analytics/series?period=monthly&year=2026&fromMonth=1&toMonth=6
GET /reports/analytics/export?period=yearly&year=2025
```

## 11. Test Hệ Thống

Backend smoke:

```powershell
$env:API_GATEWAY_PORT='18080'
docker compose up -d --build
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090
```

Frontend:

```powershell
cd web-apps\ecoquest-web
npm.cmd test
npm.cmd run build
```

## 12. Reset Dữ Liệu Sạch

Khi DB có nhiều dữ liệu test E2E, reset riêng project EcoQuest:

```powershell
$env:API_GATEWAY_PORT='18080'
docker compose down -v
docker compose up -d
```

Nếu vừa sửa Dockerfile/service code:

```powershell
docker compose up -d --build
```

Nếu chỉ chạy lại bản mới nhất, không cần rebuild:

```powershell
docker compose up -d
```

## 13. Dọn Dung Lượng Docker

Sau nhiều lần build, xóa tài nguyên không còn được container nào dùng:

```powershell
docker builder prune -af
docker container prune -f
docker image prune -af
docker volume prune -af
```

Không chạy `docker compose down -v` nếu muốn giữ dữ liệu DB hiện tại.

Nếu file `docker_data.vhdx` vẫn lớn, cần compact VHDX bằng PowerShell Administrator theo mục Docker Storage Maintenance trong `README.md`.
