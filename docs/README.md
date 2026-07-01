# EcoQuest Campus Docs Index

Cap nhat: 2026-07-01

Day la muc luc tai lieu hien tai cua project. Khi can doc nhanh trang thai moi nhat, uu tien cac file trong nhom "nguon su that hien tai".

## Nguon Su That Hien Tai

| File | Dung de lam gi |
| --- | --- |
| `bao-cao-hien-trang-project.md` | Tong hop hien trang project, use case, seed data, cong nghe va test da chay. |
| `note-se361-implementation-report.md` | Doi chieu 83 y trong note SE361, trang thai da lam/chua lam va ly do. |
| `frontend-handoff.md` | API contract va du lieu can thiet cho frontend agent/code reviewer. |
| `frontend-test-scenarios.md` | Checklist test frontend theo role, workflow, upload, notification, analytics, certificate/coupon. |
| `luong-nghiep-vu-database.md` | Luong nghiep vu, khi nao tao badge/certificate/coupon, bang DB va rang buoc logic. |
| `cong-nghe-microservices.md` | Cong nghe microservices dang dung va cach giai thich khi bao cao. |
| `huong-dan-su-dung-cong-nghe-microservices.md` | Huong dan chay, demo va trinh bay cac cong nghe microservices. |
| `backend-review-summary.md` | Ket luan review backend, kien truc service va cac gioi han production-hardening. |

## Tai Lieu Lich Su / Tham Khao

| File | Ly do giu lai |
| --- | --- |
| `implementation_plan.md` | Ban ke hoach UI/UX cu cua frontend agent. Dung tham khao design, khong dung lam API source-of-truth. |
| `frontend-summary.md` | Tong hop frontend lich su; dau file da cap nhat current alignment, phan duoi co the co encoding artifact. |
| `ECOQUEST_FRONTEND_CHANGELOG.md` | Nhat ky thay doi frontend qua nhieu phien, khong thay the handoff/test docs hien tai. |

## Lenh Kiem Tra Nhanh

```powershell
$env:API_GATEWAY_PORT='18080'
docker compose ps
docker compose config --quiet
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090
cd web-apps\ecoquest-web
npm.cmd test
npm.cmd run build
```

Sau khi chay smoke test, neu muon xoa du lieu E2E tam va quay ve seed sach:

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361
$env:API_GATEWAY_PORT='18080'
docker compose down -v
docker compose up -d
```
