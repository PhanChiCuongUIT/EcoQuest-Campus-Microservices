# Mục Lục Tài Liệu EcoQuest Campus

Cập nhật: 2026-07-03

Đây là mục lục tài liệu hiện tại của project. Khi cần đọc nhanh trạng thái mới nhất, ưu tiên các file trong nhóm **nguồn sự thật hiện tại**.

## Nguồn Sự Thật Hiện Tại

| File | Dùng để làm gì |
| --- | --- |
| `cam-nang-bao-cao-microservices.md` | File chính để chuẩn bị thuyết trình microservices: công nghệ, cách chạy, cách show khi báo cáo và câu hỏi phản biện thường gặp. |
| `bao-cao-hien-trang-project.md` | Tổng hợp hiện trạng project, use case, seed data, công nghệ và test đã chạy. |
| `tai-lieu-nguon-bao-cao-docx.md` | Bản tổng hợp đầy đủ để viết/copy vào báo cáo DOCX: database, use case, microservices, frontend, test, demo, hạn chế. |
| `note-se361-implementation-report.md` | Đối chiếu các ý trong note SE361 và các yêu cầu bổ sung, trạng thái đã làm/chưa làm và lý do. |
| `backend-smoke-test-guide.md` | Hướng dẫn chạy backend smoke test, nội dung script kiểm thử, kết quả PASS và cách cleanup dữ liệu E2E sau test. |
| `frontend-handoff.md` | API contract và dữ liệu cần thiết cho frontend agent/code reviewer. |
| `frontend-test-scenarios.md` | Checklist test frontend theo role, workflow, upload, notification, analytics, certificate/coupon. |
| `luong-nghiep-vu-database.md` | Luồng nghiệp vụ, khi nào tạo badge/certificate/coupon, database chi tiết và ràng buộc logic. |
| `cong-nghe-microservices.md` | Công nghệ microservices đang dùng và cách giải thích khi báo cáo. |
| `huong-dan-su-dung-cong-nghe-microservices.md` | Hướng dẫn chạy, demo và trình bày các công nghệ microservices. |
| `backend-review-summary.md` | Kết luận review backend, kiến trúc service và các giới hạn production-hardening. |

## Tài Liệu Lịch Sử / Tham Khảo

Các file dưới đây không còn là nguồn sự thật hiện tại nhưng vẫn được giữ lại để truy vết quyết định thiết kế/frontend qua các phiên trước. Không nên dùng chúng làm tài liệu chính khi báo cáo.

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
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090 -Web http://localhost:3000
powershell -ExecutionPolicy Bypass -File scripts\cleanup-smoke-test-data.ps1
cd web-apps\ecoquest-web
npm.cmd test
npm.cmd run build
```

Sau khi chạy smoke test, nếu muốn xóa dữ liệu E2E tạm nhưng giữ seed/demo và dữ liệu thao tác UI:

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361
powershell -ExecutionPolicy Bypass -File scripts\cleanup-smoke-test-data.ps1
```

Chỉ dùng `docker compose down -v` khi muốn xóa toàn bộ volume và quay về seed sạch hoàn toàn.
