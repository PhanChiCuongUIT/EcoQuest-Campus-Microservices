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
      +-- Recognition ---------- PostgreSQL recognition_db + MinIO certificates
      +-- Report --------------- PostgreSQL report_db + MinIO report evidence
      +-- Notification --------- PostgreSQL notification_db

RabbitMQ:
Action -> Reward -> Leaderboard -> Recognition
Action/Catalog/Identity/Report/Reward/Recognition -> Notification
Action -> Report analytics read model
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
| Recognition | Certificate PDF/MinIO and reward claim vouchers | `8085` |
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
10. Report service consumes action events into its own analytics read model and handles report create/review without reading other DBs.

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
- `MODERATOR`: Student panel for self + Moderator panel. Cannot self-review own action/report.
- `ADMIN`: Admin + Moderator panels. Admin is not treated as Student and cannot submit student actions.

JWT is enforced by each owning service. The frontend role switcher only changes allowed panels and cannot elevate backend permissions.

Email is local-token mode by default. To test real Gmail SMTP, copy `.env.example` to `.env` and set:

```env
IDENTITY_MAIL_ENABLED=true
IDENTITY_MAIL_FROM=your-account@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-account@gmail.com
SMTP_PASSWORD=your-google-app-password
SMTP_AUTH=true
SMTP_STARTTLS=true
```

Use a Google App Password, not the normal Gmail password.

## Seed Data

- 8 missions: recycle, cleanup, green check-in, trash report, energy saving, tree care, bike to campus, bottle refill.
- 5 stations with `imageUrl`; Admin can upload station images.
- 6 badges; `RECYCLING_HERO` and `CLEANUP_CHAMPION` use action-count rules.
- 8 policy rules.

## Run On Desktop

Requirements: Docker Desktop.

```powershell
Copy-Item .env.example .env
$env:API_GATEWAY_PORT='18080'
docker compose up -d --build
docker compose ps
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

Latest verification on 2026-06-24:

- Full Maven reactor 14/14 modules: PASS.
- `docker compose config --quiet`: PASS.
- Backend smoke test: PASS.
- RabbitMQ queues after smoke: 13 queues, 0 pending messages, 1 consumer each.
- Post-smoke logs checked for `ERROR|Exception|Assertion failed|Timed out`: no matches.
- Frontend unit tests: 6/6 PASS.
- Frontend production build: PASS.

Smoke currently covers auth/verify/reset/profile/user management, RBAC, Catalog CRUD/workflow, station image upload, mission eligibility, Redis draft/idempotency, MinIO uploads, gRPC Policy, Action outbox/RabbitMQ, Reward/badges, Leaderboard, moderation, Report workflow, Report analytics, Notification, daily limit, season close idempotency, certificate PDF, reward claim voucher, and queue drain.

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
- [Frontend handoff](docs/frontend-handoff.md)
- [Frontend test scenarios](docs/frontend-test-scenarios.md)
