# Mục Lục Tài Liệu EcoQuest Campus

Cập nhật: 2026-07-01

Đây là mục lục tài liệu hiện tại của project. Khi cần đọc nhanh trạng thái mới nhất, ưu tiên các file trong nhóm **nguồn sự thật hiện tại**.

## Nguồn Sự Thật Hiện Tại

| File | Dùng để làm gì |
| --- | --- |
| `bao-cao-hien-trang-project.md` | Tổng hợp hiện trạng project, use case, seed data, công nghệ và test đã chạy. |
| `tai-lieu-nguon-bao-cao-docx.md` | Bản tổng hợp đầy đủ để viết/copy vào báo cáo DOCX: database, use case, microservices, frontend, test, demo, hạn chế. |
| `note-se361-implementation-report.md` | Đối chiếu 83 ý trong note SE361, trạng thái đã làm/chưa làm và lý do. |
| `frontend-handoff.md` | API contract và dữ liệu cần thiết cho frontend agent/code reviewer. |
| `frontend-test-scenarios.md` | Checklist test frontend theo role, workflow, upload, notification, analytics, certificate/coupon. |
| `luong-nghiep-vu-database.md` | Luồng nghiệp vụ, khi nào tạo badge/certificate/coupon, database chi tiết và ràng buộc logic. |
| `cong-nghe-microservices.md` | Công nghệ microservices đang dùng và cách giải thích khi báo cáo. |
| `huong-dan-su-dung-cong-nghe-microservices.md` | Hướng dẫn chạy, demo và trình bày các công nghệ microservices. |
| `backend-review-summary.md` | Kết luận review backend, kiến trúc service và các giới hạn production-hardening. |

## Tài Liệu Lịch Sử / Tham Khảo

| File | Lý do giữ lại |
| --- | --- |
| `implementation_plan.md` | Bản kế hoạch UI/UX cũ của frontend agent. Dùng tham khảo design, không dùng làm API source-of-truth. |
| `frontend-summary.md` | Tổng hợp frontend lịch sử; phần đầu đã cập nhật current alignment, một số phần dưới có thể là ghi chú cũ. |
| `ECOQUEST_FRONTEND_CHANGELOG.md` | Nhật ký thay đổi frontend qua nhiều phiên, không thay thế handoff/test docs hiện tại. |

## Lệnh Kiểm Tra Nhanh

```powershell
$env:API_GATEWAY_PORT='18080'
docker compose ps
docker compose config --quiet
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090
cd web-apps\ecoquest-web
npm.cmd test
npm.cmd run build
```

Sau khi chạy smoke test, nếu muốn xóa dữ liệu E2E tạm và quay về seed sạch:

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361
$env:API_GATEWAY_PORT='18080'
docker compose down -v
docker compose up -d
```
