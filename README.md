# EcoQuest Campus Microservices

EcoQuest Campus is a sustainability activity platform for university communities. Students complete missions, submit evidence, and earn points after moderator approval. The platform includes badges, weekly and monthly leaderboards, certificates, reward coupons, campus reports, and notifications.

## Architecture

The backend consists of nine business services behind Spring Cloud Gateway. Each service owns its database and business rules. Services communicate through HTTP APIs, gRPC, and RabbitMQ integration events.

```text
React / Vite Web -> Nginx API proxy -> Spring Cloud Gateway
                                        |
    +-- Identity Access ------ PostgreSQL + MinIO avatars
    +-- Green Catalog -------- PostgreSQL + MinIO station images
    +-- Eco Action ----------- MongoDB + Redis + MinIO evidence
    |       +-- gRPC --------- Verification Policy + PostgreSQL
    +-- Reward Ledger -------- PostgreSQL
    +-- Leaderboard ---------- Redis + PostgreSQL snapshots
    +-- Recognition ---------- PostgreSQL + MinIO certificates
    +-- Report --------------- PostgreSQL analytics + MinIO evidence
    +-- Notification --------- PostgreSQL inbox + SSE

Approved action -> Action outbox -> RabbitMQ -> Reward Ledger
Points granted -> RabbitMQ -> Leaderboard, Recognition, Report, Notification
Season closed -> RabbitMQ -> Recognition -> Certificate issued
```

| Service | Responsibilities | Host port |
| --- | --- | --- |
| Identity Access | Registration, email verification, login, password reset, profiles, roles and account status | 8086 |
| Green Catalog | Mission approval workflow, stations, badge definitions and station images | 8081 |
| Eco Action | Drafts, image/video evidence, submissions, idempotency and moderation | 8082 |
| Verification Policy | Action rules, evidence requirements and daily limits | 8090 HTTP, 9090 gRPC |
| Reward Ledger | Wallets, point transactions, badge achievements and audited adjustments | 8083 |
| Leaderboard | Current and historical weekly/monthly rankings and season snapshots | 8084 |
| Recognition | Certificate PDFs, reward offers, eligibility, stock and coupon claims | 8085 |
| Report | Campus report workflow, period analytics, student outcomes and PDF exports | 8087 |
| Notification | Event-driven inbox, read state and server-sent events | 8088 |

The Gateway handles routing and cross-cutting request concerns. Authorization and business validation remain in the owning services. The Policy administration API is accessed directly rather than routed through the Gateway.

## Technology Stack

- Java 21, Spring Boot 3.3.5 and Spring Cloud Gateway.
- Spring Data JPA, PostgreSQL 16, MongoDB 7 and Redis 7.
- gRPC and Protocol Buffers for Action-to-Policy verification.
- RabbitMQ with Spring AMQP for asynchronous integration events.
- MinIO for evidence, profile images, station images and certificate PDFs.
- JWT-based API authorization and role/ownership checks.
- React, Vite, Axios and Lucide icons; Nginx for the web container.
- Docker Compose and named volumes for persistent data.
- Spring Boot Actuator health checks, Docker logs and correlation IDs.

Identity uses Flyway and MapStruct. Action uses an outbox publisher and Resilience4j for Policy calls. Other relational services still use schema bootstrap and Hibernate schema updates. The project does not include a Prometheus/Grafana stack or a distributed tracing backend.

## Main Workflow

1. A user registers, verifies their email and signs in.
2. A student selects an active mission and uploads up to five images or one video as evidence.
3. Action validates mission eligibility through Catalog and evaluates rules through Policy gRPC.
4. Valid submissions enter `PENDING_REVIEW`; policy failures can produce `REJECTED` submissions.
5. A Moderator or Admin approves or rejects the submission. Moderators cannot review their own actions.
6. Approval changes the action to `ACCEPTED` and queues an integration event in the Action outbox.
7. Reward records a transaction identified by `sourceActionId`, grants points and evaluates badges.
8. Downstream consumers update rankings, recognition progress, analytics and notifications asynchronously.
9. Closing a season creates leaderboard snapshots and triggers certificate generation.
10. Eligible students claim active reward offers. Recognition checks eligibility and stock and returns the existing voucher for a repeated claim.

Points are not awarded at submission time. Cross-service read models may take a short time to reflect an approved action.

## Quick Start

Install Docker Desktop with the Linux container engine running. Docker builds the applications; host installations of Maven and Java are not required.

From the repository root in PowerShell:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
powershell -ExecutionPolicy Bypass -File scripts\start-project.ps1 -Build
```

The startup script waits for the Gateway and all nine services to report `UP`, checks the web endpoint, and prints the configured URLs. Subsequent starts do not require a rebuild:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-project.ps1
```

| Component | Default URL | Development credentials |
| --- | --- | --- |
| Web application | http://localhost:3000 | Application accounts below |
| Gateway health | http://localhost:18080/actuator/health | None |
| RabbitMQ Management | http://localhost:25673 | `guest` / `guest` |
| MinIO Console | http://localhost:9001 | `minioadmin` / `minioadmin` |
| Policy administration | http://localhost:8090/policies/rules | Admin bearer token |

Host ports are configurable in `.env`. Container connections use Compose service names and internal ports. Development credentials and exposed infrastructure ports are intended for local use.

## Accounts And Roles

New demo installations use the password `EcoQuest@123`:

| Role | Email | Student ID |
| --- | --- | --- |
| Student | `student@ecoquest.local` | `SV001` |
| Moderator | `moderator@ecoquest.local` | `SVMOD001` |
| Admin | `admin@ecoquest.local` | None |

Additional student accounts range from `student2@ecoquest.local` to `student10@ecoquest.local`.

- Students access their own activity, rewards and certificates.
- Moderators access moderation features and may switch to their own Student panel.
- Admins access Admin and Moderator panels, but cannot submit student actions.
- Admins cannot change their own role, disable, ban or delete their own account.

Changing a frontend panel does not grant backend permissions. Existing account changes are preserved on restart.

## Demo Data

A new installation includes 15 missions, 7 stations, 6 badge definitions, 15 policy rules, 12 accounts and 36 sample actions, plus wallets, historical records, certificates, reward offers, reports and role-specific notifications.

Add activity for the current date without deleting existing data:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\refresh-demo-data.ps1 -Gateway http://localhost:18080
```

The script creates three monthly campaign missions and up to 30 daily sample actions for ten students. It approves 20 actions through the moderation API, leaves 10 pending, and verifies point transactions. Running it again on the same UTC date does not create duplicate submissions. Generated evidence uses the project logo and is sample data.

## Email Configuration

Local mode returns verification/reset tokens for development. To enable SMTP, configure `.env`:

```dotenv
IDENTITY_MAIL_ENABLED=true
IDENTITY_MAIL_HEALTH_ENABLED=true
IDENTITY_MAIL_FROM=your-account@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-account@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_AUTH=true
SMTP_STARTTLS=true
FRONTEND_BASE_URL=http://localhost:3000
```

Use a Gmail App Password for Gmail SMTP. Email templates embed the project logo as an inline CID attachment. Never commit `.env`.

## Testing

Build all backend modules and run Java unit tests:

```powershell
docker run --rm -v "${PWD}:/workspace" -v "${PWD}/.m2:/root/.m2" -w /workspace maven:3.9.9-eclipse-temurin-21 mvn -B package
```

Run the integration smoke suite with local email tokens:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-project.ps1 -LocalMail
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090 -Web http://localhost:3000
powershell -ExecutionPolicy Bypass -File scripts\cleanup-smoke-test-data.ps1
```

The suite covers authentication, authorization, catalog and policy operations, evidence uploads, moderation, point grants, badges, ranking, certificates, coupons, reports, notifications and RabbitMQ consumption. It creates E2E records and exercises shared demo state; use a development environment. Cleanup removes identifiable E2E data but is not a complete rollback of all test activity.

After testing, run `scripts/start-project.ps1` without `-LocalMail` to restore the email configuration from `.env`.

Verify that application state survives service restarts:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-restart-persistence.ps1
```

Frontend tests and production build require Node.js 24:

```powershell
cd web-apps\ecoquest-web
npm.cmd ci
npm.cmd test
npm.cmd run build
```

## Development And Operations

To run Vite against the containerized backend, stop the web container to free port 3000:

```powershell
docker compose stop ecoquest-web
cd web-apps\ecoquest-web
npm.cmd ci
npm.cmd run dev
```

Vite proxies API paths to `http://localhost:18080`. Set `VITE_API_BASE_URL` when using a different Gateway address.

For mobile access, connect the phone to the same network and open `http://<computer-ipv4>:3000`. Set `FRONTEND_BASE_URL` to this address when email links must work on the phone.

```powershell
docker compose ps
docker compose logs --tail=100 eco-action-service reward-ledger-service
docker compose exec -T rabbitmq rabbitmqctl list_queues name messages consumers
docker compose exec -T redis redis-cli INFO persistence
docker compose stop
```

PostgreSQL, MongoDB, Redis, RabbitMQ and MinIO use named volumes. Redis has AOF enabled. Use `stop` or `down` without `-v` to preserve data; `docker compose down -v` deletes project volumes. Back up existing anonymous volumes before migrating an older installation to named volumes.

To rebuild only a changed service:

```powershell
docker compose build report-service
docker compose up -d --no-deps report-service
```

Docker builds share dependency caches. Review disk usage with `docker system df`; remove old build cache and dangling images when needed without pruning data volumes.

## Documentation

See the [documentation index](docs/README.md) for database schemas, business workflows, technology explanations, test procedures and operational guidance. Detailed project reports are available in Vietnamese.
