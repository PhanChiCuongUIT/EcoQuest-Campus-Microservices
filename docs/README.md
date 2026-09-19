# EcoQuest Campus Documentation

This directory describes the architecture, data model, business workflows, testing and operation of EcoQuest Campus. The reference documents are primarily written in Vietnamese.

## Documentation Index

| Document | Contents |
| --- | --- |
| [Startup and data refresh](chay-lai-project.md) | Startup checks, ports, persistent storage, sample data refresh, troubleshooting and dated verification results. |
| [Project report source](tai-lieu-nguon-bao-cao-docx.md) | Project scope, architecture, databases, use cases, frontend, testing and limitations. |
| [Project overview](bao-cao-hien-trang-project.md) | Business capabilities, technology stack and project status. |
| [Business workflows and databases](luong-nghiep-vu-database.md) | Point, badge, certificate and coupon workflows; tables, collections and constraints by service. |
| [Microservice technologies](cong-nghe-microservices.md) | Gateway, gRPC, RabbitMQ, Redis, MinIO, database ownership, JWT authorization and Actuator. |
| [Architecture presentation guide](cam-nang-bao-cao-microservices.md) | Architecture explanations, demonstrations and technical questions. |
| [System demonstration](kich-ban-demo-microservices.md) | End-to-end demonstrations with application screens, infrastructure tools and test commands. |
| [Presentation terminology and Q&A](bo-sung-kich-ban-bao-cao-slide.md) | Technical terminology, explanations and discussion questions. |
| [Backend smoke test guide](backend-smoke-test-guide.md) | Test commands, coverage, expected outcomes and E2E data cleanup. |
| [Frontend test scenarios](frontend-test-scenarios.md) | Role-specific UI workflows, uploads, notifications, analytics and responsive checks. |

## Running And Testing

Run these commands from the repository root with Docker Desktop running:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-project.ps1
docker compose ps
docker compose config --quiet
```

To test verification and password reset without sending external email:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-project.ps1 -LocalMail
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090 -Web http://localhost:3000
powershell -ExecutionPolicy Bypass -File scripts\cleanup-smoke-test-data.ps1
powershell -ExecutionPolicy Bypass -File scripts\test-restart-persistence.ps1
```

`-LocalMail` changes the running Identity container's email mode without editing `.env`. Run the startup script without this option to restore the email configuration from `.env`.

Test reports are dated snapshots. Consult the verification section in [Startup and data refresh](chay-lai-project.md) for the latest recorded run; older reports are historical evidence.

## Default Development Endpoints

| Component | URL |
| --- | --- |
| Web | http://localhost:3000 |
| Gateway health | http://localhost:18080/actuator/health |
| RabbitMQ Management | http://localhost:25673 |
| MinIO Console | http://localhost:9001 |
| Policy administration | http://localhost:8090/policies/rules |

Configured ports may differ when overridden in `.env`. The startup script prints the effective URLs. Application credentials and role behavior are documented in the [project README](../README.md).

## Data Maintenance

Use `scripts/refresh-demo-data.ps1` to add current sample activity through the application APIs. Use `scripts/cleanup-smoke-test-data.ps1` to remove identifiable E2E records after testing. These are separate operations; refreshing data does not delete existing records.

Do not use `docker compose down -v` when existing data must be preserved. It removes the project's data volumes. See the startup guide for storage migration and backup considerations.
