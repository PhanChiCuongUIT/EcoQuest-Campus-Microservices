# EcoQuest Campus Microservices

EcoQuest Campus la he thong gamification cho hoat dong xanh trong truong hoc. Student thuc hien mission, upload minh chung, nhan diem va badge; Moderator duyet action/report; Admin quan tri user, catalog, policy, reward adjustment, analytics va season certificate.

## Current Architecture

```text
React/Vite Web
      |
Spring Cloud Gateway (routing, CORS, correlation ID)
      |
      +-- Identity Access ------ PostgreSQL identity_db + MinIO avatars
      +-- Green Catalog -------- PostgreSQL catalog_db + MinIO station images
      +-- Eco Action ----------- MongoDB action_db + Redis + MinIO evidence
      |       +-- gRPC --------- Verification Policy + PostgreSQL policy_db
      +-- Reward Ledger -------- PostgreSQL reward_db
      +-- Leaderboard ---------- Redis + PostgreSQL leaderboard_db
      +-- Recognition ---------- PostgreSQL recognition_db + MinIO certificates/coupons
      +-- Report --------------- PostgreSQL report_db + MinIO report evidence
      +-- Notification --------- PostgreSQL notification_db

RabbitMQ:
Action -> Reward -> Leaderboard -> Recognition
Action/Catalog/Identity/Report/Reward/Recognition -> Notification
Action/Catalog/Identity/Reward/Recognition -> Report analytics read model
```

The system currently has **9 microservices**. Each service owns its own data and business rules. The Gateway only routes traffic and does not contain domain logic. No service reads another service database directly.

| Service | Responsibility | Port |
| --- | --- | --- |
| Identity Access | Register, verify email, login, forgot/reset password, profile/avatar, role/status/user management | `8086` |
| Green Catalog | Mission workflow, stations, station image upload, badge definitions | `8081` |
| Eco Action | Draft, evidence upload, submit, idempotency, moderation, outbox | `8082` |
| Verification Policy | Internal gRPC rule evaluation; direct admin REST | `9090` gRPC, `8090` REST |
| Reward Ledger | Wallet, transaction ledger, badge achievement, manual point adjustment | `8083` |
| Leaderboard | Weekly/monthly rank read model, season snapshots | `8084` |
| Recognition | Certificate PDF/MinIO, reward offer catalog, coupon eligibility and idempotent voucher claims | `8085` |
| Report | Student/Moderator reports, moderation queue, analytics read model | `8087` |
| Notification | Inbox, read/read-all, SSE, event consumers | `8088` |

## Main Flows

1. User registers, verifies email, then logs in.
2. Student, or Moderator in Student panel for their own `studentId`, selects an `ACTIVE` mission.
3. Action service calls Catalog to validate mission status and `actionType`, then calls Policy by gRPC.
4. Draft/idempotency use Redis; accepted/rejected actions are persisted in MongoDB.
5. Action outbox publishes RabbitMQ events.
6. Reward Ledger grants points by `sourceActionId`, records transactions, and unlocks point/action-count badges.
7. Leaderboard consumes point events and updates Redis sorted sets.
8. Admin closes a season; Recognition creates a PDF certificate in MinIO and publishes notification.
9. Missing evidence/station can create `PENDING_REVIEW`; Moderator/Admin approve or reject. Moderators cannot review their own actions.
10. Report service consumes action, mission, user registration, points, badge, and certificate events into its own analytics read model and handles report create/review without reading other DBs.
11. Admin analytics can show bounded week/month/year ranges without future periods; export downloads the selected week/month/year as the polished single-period PDF report.
12. Policy Admin on direct port `8090` supports create/update/delete; deleting requires the rule to be inactive first so active mission action types are not accidentally made unsupported. The Admin UI creates rules through a modal overlay while the backend keeps all rule ownership inside the Policy service.
13. Student coupon redemption is handled by Recognition: active reward offers define points/badge/certificate/stock/expiry requirements; claiming the same reward twice returns the existing voucher instead of issuing a duplicate code.

Mission statuses: `PENDING`, `ACTIVE`, `REJECTED`, `CANCELLED`, `COMPLETED`. New missions are `PENDING`; only Admin changes mission status; only `ACTIVE` missions can be submitted.

## Auth And Roles

Demo accounts use password `EcoQuest@123`:

| Role | Email | Student ID |
| --- | --- | --- |
| Student | `student@ecoquest.local` | `SV001` |
| Moderator | `moderator@ecoquest.local` | `SVMOD001` |
| Admin | `admin@ecoquest.local` | none |

Role inheritance:

- `STUDENT`: Student panel only, self-owned data only.
- `MODERATOR`: may switch to Student panel for self, but Moderator panel contains only Dashboard, Review, Reports, Leaderboard, own Mission Catalog, and Profile.
- `ADMIN`: Admin + Moderator panels only. Admin panel contains Dashboard, Catalog, Users, Reports, a separate weekly/monthly/yearly Analytics page, Policy, Adjust Points, and Profile; Admin cannot submit student actions.

JWT is enforced by each owning service. The frontend role switcher only changes allowed panels and cannot elevate backend permissions.
Identity also blocks admin self-mutation: an Admin cannot change their own role, inactive/ban themselves, or delete their own account. Demoting another Moderator to Student is allowed when that account has a `studentId`; the new role applies on the next login token.

Email is local-token mode by default. To test real Gmail SMTP, copy `.env.example` to `.env` and set:

```env
IDENTITY_MAIL_ENABLED=true
IDENTITY_MAIL_HEALTH_ENABLED=true
IDENTITY_MAIL_FROM=your-account@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-account@gmail.com
SMTP_PASSWORD=your-google-app-password
SMTP_AUTH=true
SMTP_STARTTLS=true
IDENTITY_SUPPORT_EMAIL=cuong26.16.8@gmail.com
FRONTEND_BASE_URL=http://localhost:3000
```

Use a Google App Password, not the normal Gmail password.
Keep `IDENTITY_MAIL_HEALTH_ENABLED=false` when you only want local-token mode; set it to `true` with valid Gmail SMTP credentials when you want Actuator to verify the mail connection too.
For Gmail, `IDENTITY_MAIL_FROM` should normally match `SMTP_USERNAME`. If the recipient opens email on a phone, set `FRONTEND_BASE_URL=http://<YOUR-PC-IPV4>:3000` so verify/reset links are reachable from that phone.
Verification, password reset, and status-change emails use the real EcoQuest logo packaged inside Identity and attached inline with CID, so they do not depend on a `localhost` image URL.

## Seed Data

- 12 missions: recycle, cleanup, green check-in, trash report, energy saving, tree care, bike to campus, bottle refill, compost waste, e-waste drop-off, plastic-free lunch, and campus carpool.
- 7 stations with `imageUrl`; Admin can upload station images.
- 6 badges; `RECYCLING_HERO` and `CLEANUP_CHAMPION` use action-count rules.
- 12 policy rules, one for each seeded action type.
- 10 demo users: 8 students, 1 moderator, 1 admin. Demo password is `EcoQuest@123`.
- 24 seeded submit actions across weekly/monthly/yearly windows, with accepted, pending-review, and rejected states.
- Seeded Reward wallets/transactions/badges and Recognition certificates/coupon offers so dashboards and student pages are not empty after a fresh run.
- Seeded Report analytics read-model data for weekly/monthly/yearly reports, including missions, submit actions, users, points, badges, certificates, and reports.

To delete old local test data and reseed a clean demo dataset, run this from the repository root. This removes only this Compose project's containers/volumes, then recreates them:

```powershell
$env:API_GATEWAY_PORT='18080'
docker compose down -v
docker compose up -d --build
```

## Run On Desktop

Requirements: Docker Desktop.

```powershell
Copy-Item .env.example .env
$env:API_GATEWAY_PORT='18080'
docker compose up -d --build
docker compose ps
```

For normal later starts, do not rebuild unchanged images:

```powershell
docker compose up -d
```

When only one service changed, rebuild only that service:

```powershell
docker compose build report-service
docker compose up -d --no-deps report-service
```

Open:

- Web: http://localhost:3000
- Gateway: http://localhost:18080
- RabbitMQ UI: http://localhost:15672 (`guest/guest`)
- MinIO Console: http://localhost:9001 (`minioadmin/minioadmin`)
- Policy Admin API: http://localhost:8090/policies/rules

If host port `8080` is free, you can omit `API_GATEWAY_PORT` and use Gateway `http://localhost:8080`.

## Run Frontend Dev

Keep backend Docker running:

```powershell
cd web-apps\ecoquest-web
npm install
npm.cmd run dev
```

The Vite dev server binds `0.0.0.0:3000` and proxies `/auth`, `/catalog`, `/actions`, `/rewards`, `/leaderboards`, `/recognitions`, `/reports`, and `/notifications` to the Gateway.

## Run On Mobile

Phone and computer must be on the same Wi-Fi.

1. Find computer IPv4:

```powershell
ipconfig
```

2. Allow Windows Firewall for port `3000` if prompted.
3. Open this URL on the phone:

```text
http://<YOUR-PC-IPV4>:3000
```

Example: `http://192.168.1.11:3000`. The web container uses same-origin Nginx proxy, so the phone does not need to call `localhost:18080` directly.

## Build And Test

Backend Maven:

```powershell
docker run --rm -v ${PWD}:/workspace -v ${PWD}/.m2:/root/.m2 -w /workspace maven:3.9.9-eclipse-temurin-21 mvn package -DskipTests
```

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

Latest verification on 2026-07-01 after real Recognition coupon offers, reward offer CRUD, Recognition profile race fix, clean seed reset, certificate signature/mobile UI fixes, Policy modal, email logo, dashboard resilience, and Student outcome layout fixes:

- Targeted Maven reactor for Recognition and dependencies: PASS.
- `docker compose config --quiet`: PASS.
- Backend smoke test: PASS.
- RabbitMQ queues after smoke: 20 queues, 0 pending messages, 1 consumer each.
- Post-smoke logs: no Recognition duplicate profile errors after the race fix. A few Gateway `Connection refused` lines can appear during initial startup while Identity is still opening port `8086`; they disappear once services are healthy.
- Frontend unit tests: 9/9 PASS.
- Frontend production build: PASS.

Smoke currently covers auth/verify/reset/profile/user management, admin self-protection, Moderator -> Student demotion, report target lookup, RBAC, moderator mission ownership, Catalog CRUD/workflow including badge update, station image upload, seeded mission/policy counts, Policy Admin create/update/delete guard, seeded demo action visibility, mission eligibility, Redis draft/idempotency, MinIO uploads, gRPC Policy, Action outbox/RabbitMQ, Reward/badges, Leaderboard, moderation, Report workflow, Report analytics including mission/user/badge/certificate events, Admin analytics range guards + student outcome report + selected weekly/monthly/yearly PDF export, Notification, daily limit, season close idempotency, authenticated certificate PDF attachment, Recognition reward offer CRUD, real coupon eligibility, locked coupon rejection, coupon stock decrement, duplicate reward claim idempotency, and queue drain. Frontend build verifies dashboard partial-loading code and the Policy add-rule modal.

## Docker Storage Maintenance

The backend Dockerfiles use shared BuildKit caches named `ecoquest-maven` and `ecoquest-npm`. This avoids downloading the same dependency repository independently for every service build.

After replacing images with a newer build, remove resources that are no longer referenced by any container:

```powershell
docker builder prune -af
docker container prune -f
docker image prune -af
docker volume prune -af
docker network prune -f
docker system df
```

These commands keep images, networks, and volumes still referenced by running containers. Always check `docker ps` first so EcoQuest and FreshTrace are running before pruning.

Recommended routine:

1. Use `docker compose up -d` for ordinary starts.
2. Build only changed services with `docker compose build <service>`.
3. Recreate only that service with `docker compose up -d --no-deps <service>`.
4. After a stable release, run `docker builder prune -af` and `docker image prune -af`.
5. Compact Docker Desktop's VHDX occasionally after pruning; pruning frees space inside Linux, while compaction returns it to Windows.

To compact the VHDX on Windows, open **PowerShell as Administrator** after pruning. This temporarily stops Docker Desktop, compacts the file, then you can start Docker again:

```powershell
& "$env:ProgramFiles\Docker\Docker\DockerCli.exe" -Shutdown
wsl --shutdown

$script = @"
select vdisk file="$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx"
attach vdisk readonly
compact vdisk
detach vdisk
exit
"@
$script | Set-Content "$env:TEMP\docker-compact.diskpart" -Encoding ASCII
diskpart /s "$env:TEMP\docker-compact.diskpart"
Remove-Item "$env:TEMP\docker-compact.diskpart"

Start-Process -FilePath "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe" -WindowStyle Hidden
```

After Docker is back, start EcoQuest again from this repository:

```powershell
$env:API_GATEWAY_PORT='18080'
docker compose up -d
```

## Hardening Notes

- Swagger/OpenAPI is available on direct REST service ports at `/swagger-ui/index.html`.
- Resilience4j protects Action -> Policy gRPC.
- Action uses outbox for accepted/rejected events.
- Identity uses Flyway and MapStruct.
- Older PostgreSQL services still use schema bootstrap/`ddl-auto:update`; full Flyway migration for every service is a production hardening backlog.
- Avatar, station image, action evidence, report evidence, and certificate files are stored by owning services in MinIO buckets.

More docs:

- [Backend review](docs/backend-review-summary.md)
- [Note SE361 implementation report](docs/note-se361-implementation-report.md)
- [Project state report](docs/bao-cao-hien-trang-project.md)
- [Microservice technology usage guide](docs/huong-dan-su-dung-cong-nghe-microservices.md)
- [Business flows and database](docs/luong-nghiep-vu-database.md)
- [Microservice technologies](docs/cong-nghe-microservices.md)
- [Frontend handoff](docs/frontend-handoff.md)
- [Frontend test scenarios](docs/frontend-test-scenarios.md)
