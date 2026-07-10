# Mục Lục Tài Liệu EcoQuest Campus

Cập nhật: 2026-07-10

Thư mục này chỉ giữ các tài liệu cần thiết để người đọc, giảng viên hoặc thành viên mới hiểu hiện trạng project EcoQuest Campus. Các file lịch sử, changelog nội bộ, handoff triển khai và kế hoạch UI cũ đã được loại bỏ để tránh nhầm lẫn.

## Tài Liệu Nên Đọc

| File | Nội dung |
| --- | --- |
| `tai-lieu-nguon-bao-cao-docx.md` | Tài liệu nguồn đầy đủ để viết báo cáo DOCX: mục tiêu, kiến trúc, microservices, database, use case, frontend, test, demo và giới hạn. |
| `bao-cao-hien-trang-project.md` | Bản tóm tắt hiện trạng project: 9 microservices, dữ liệu seed, công nghệ, kiểm thử và giới hạn còn lại. |
| `luong-nghiep-vu-database.md` | Luồng nghiệp vụ chi tiết, khi nào tạo điểm/badge/certificate/coupon, database theo từng service và các ràng buộc logic. |
| `cong-nghe-microservices.md` | Giải thích công nghệ microservices đang dùng: Gateway, gRPC, RabbitMQ, Redis, MinIO, database-per-service, JWT/RBAC, Actuator. |
| `cam-nang-bao-cao-microservices.md` | Cẩm nang thuyết trình phần microservices, gồm cách nói, cách show công nghệ và câu hỏi phản biện thường gặp. |
| `kich-ban-demo-microservices.md` | Kịch bản demo thao tác thực tế: mở link nào, chạy lệnh nào, show RabbitMQ/MinIO/health/log/test ra sao. |
| `bo-sung-kich-ban-bao-cao-slide.md` | Phần bổ sung cho kịch bản slide: câu nên nói chính xác hơn, thuật ngữ cần giải thích và bộ câu hỏi vấn đáp. |
| `backend-smoke-test-guide.md` | Hướng dẫn chạy backend smoke test, nội dung test, kết quả PASS kỳ vọng và cách dọn dữ liệu test E2E. |
| `frontend-test-scenarios.md` | Checklist kiểm thử frontend theo role, upload, notification, analytics, certificate/coupon và responsive UI. |

## Lệnh Kiểm Tra Nhanh

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361
$env:API_GATEWAY_PORT='18080'
docker compose ps
docker compose config --quiet
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090 -Web http://localhost:3000
powershell -ExecutionPolicy Bypass -File scripts\cleanup-smoke-test-data.ps1
cd web-apps\ecoquest-web
npm.cmd test
npm.cmd run build
```

## Link Demo Chính

| Mục | URL/Tài khoản |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Gateway health | `http://localhost:18080/actuator/health` |
| RabbitMQ UI | `http://localhost:15672` - `guest/guest` |
| MinIO Console | `http://localhost:9001` - `minioadmin/minioadmin` |
| Policy Admin API | `http://localhost:8090/policies/rules` |

Tài khoản demo trong ứng dụng dùng mật khẩu `EcoQuest@123`:

| Role | Email |
| --- | --- |
| Student | `student@ecoquest.local` |
| Moderator | `moderator@ecoquest.local` |
| Admin | `admin@ecoquest.local` |

## Dọn Dữ Liệu Test

Sau khi chạy smoke test, nếu muốn xóa dữ liệu E2E tạm nhưng giữ seed/demo data và dữ liệu thao tác UI:

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361
powershell -ExecutionPolicy Bypass -File scripts\cleanup-smoke-test-data.ps1
```

Chỉ dùng `docker compose down -v` khi muốn xóa toàn bộ volume và quay về seed sạch hoàn toàn.
