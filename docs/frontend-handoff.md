# EcoQuest Campus Frontend Handoff

Updated: 2026-06-24

Tài liệu này là source-of-truth cho agent frontend. Agent có thể đọc file này cùng các file được liệt kê bên dưới để code/review/test UI mà không cần quét backend source hoặc database.

## Project Status

Backend hiện có **9 microservices**:

| Service | Prefix/API | Data store | Ghi chú |
| --- | --- | --- | --- |
| Identity Access | `/auth/**` | PostgreSQL `identity_db`, MinIO | Auth, profile, avatar, role/status/user management |
| Green Catalog | `/catalog/**` | PostgreSQL `catalog_db`, MinIO | Mission workflow, stations, station images, badges |
| Eco Action | `/actions/**` | MongoDB `action_db`, Redis, MinIO | Draft, evidence, submit, moderation, outbox |
| Verification Policy | direct `:8090`, gRPC `:9090` | PostgreSQL `policy_db` | Policy admin direct local; Action gọi gRPC nội bộ |
| Reward Ledger | `/rewards/**` | PostgreSQL `reward_db` | Wallet, transactions, badges, adjustment |
| Leaderboard | `/leaderboards/**` | Redis, PostgreSQL `leaderboard_db` | Weekly/monthly rank, season snapshots |
| Recognition | `/recognitions/**` | PostgreSQL `recognition_db`, MinIO | Certificates, reward claim |
| Report | `/reports/**` | PostgreSQL `report_db`, MinIO | User reports, moderation, evidence upload, analytics |
| Notification | `/notifications/**` | PostgreSQL `notification_db` | Inbox, read state, SSE, event consumers |

Infra: Spring Cloud Gateway, PostgreSQL per service, MongoDB, Redis, RabbitMQ, MinIO, Docker Compose.

Gateway local thường dùng `http://localhost:18080` nếu host port `8080` bận. Web container chạy tại `http://localhost:3000` và dùng same-origin nginx proxy, nên frontend gọi relative paths như `/auth/login`, `/catalog/missions`, `/actions/submit`.

## Files To Send Frontend Agent

Gửi các file này:

- `docs/frontend-handoff.md`
- `docs/frontend-test-scenarios.md`
- `docs/implementation_plan.md`
- `docs/backend-review-summary.md`
- `docs/note-se361-implementation-report.md`
- `README.md`
- `docker-compose.yml`
- `.env.example`
- `web-apps/ecoquest-web/package.json`
- `web-apps/ecoquest-web/vite.config.js`
- `web-apps/ecoquest-web/nginx.conf`
- `web-apps/ecoquest-web/src/api/ecoquestApi.js`
- `web-apps/ecoquest-web/src/context/AuthContext.jsx`
- `web-apps/ecoquest-web/src/utils/accessRules.js`
- `web-apps/ecoquest-web/test/accessRules.test.js`
- `scripts/backend-smoke-test.ps1`

Không cần gửi backend source trừ khi agent frontend cần debug API implementation.

## Auth And Roles

Demo accounts, password `EcoQuest@123`:

| Email | Role | Student ID |
| --- | --- | --- |
| `student@ecoquest.local` | `STUDENT` | `SV001` |
| `moderator@ecoquest.local` | `MODERATOR` | `SVMOD001` |
| `admin@ecoquest.local` | `ADMIN` | `null` |

Register tạo user `STUDENT` chưa verify. Login trước verify bị chặn. Local mode trả `verificationToken` trong response để test; SMTP mode gửi email thật nếu `.env` bật Gmail SMTP.

Role inheritance cho UI:

- Backend `STUDENT`: chỉ cho UI role `Student`.
- Backend `MODERATOR`: cho UI role `Student`, `Moderator`.
- Backend `ADMIN`: cho UI role `Moderator`, `Admin`.

UI role switcher chỉ đổi navigation/view; backend token vẫn là authority. Forbidden action phải hiển thị lỗi `403`, không fake success.

## Seed Data

Missions:

| ID | Action type | Points | Evidence | Station | Status |
| --- | --- | ---: | --- | --- | --- |
| `MISSION-RECYCLE-01` | `RECYCLE_BOTTLE` | 10 | required | required | `ACTIVE` |
| `MISSION-CLEANUP-01` | `CLEANUP_EVENT` | 30 | required | optional | `ACTIVE` |
| `MISSION-CHECKIN-01` | `GREEN_CHECKIN` | 5 | optional | required | `ACTIVE` |
| `MISSION-TRASH-01` | `REPORT_TRASH` | 15 | required | optional | `ACTIVE` |
| `MISSION-ENERGY-01` | `ENERGY_SAVING` | 20 | required | optional | `ACTIVE` |
| `MISSION-TREE-01` | `TREE_CARE` | 25 | required | required | `ACTIVE` |
| `MISSION-BIKE-01` | `BIKE_TO_CAMPUS` | 12 | required | optional | `ACTIVE` |
| `MISSION-REFILL-01` | `WATER_REFILL` | 8 | optional | required | `ACTIVE` |

Stations: `STATION-A1`, `STATION-B2`, `STATION-C3`, `STATION-D4`, `STATION-E5`. Mỗi station có `imageUrl`.

Badges:

- `GREEN_STARTER`: điểm đầu tiên.
- `RECYCLING_HERO`: 10 accepted `RECYCLE_BOTTLE`.
- `CLEANUP_CHAMPION`: 3 accepted `CLEANUP_EVENT`.
- `ZERO_WASTE_ADVOCATE`: 250 điểm.
- `GREEN_AMBASSADOR`: 300 điểm.
- `CAMPUS_GUARDIAN`: 500 điểm.

Action status enum: `ACCEPTED`, `PENDING_REVIEW`, `REJECTED`.

Mission status enum: `PENDING`, `ACTIVE`, `REJECTED`, `CANCELLED`, `COMPLETED`.

User status enum: `ACTIVE`, `INACTIVE`, `BANNED`.

## API Base

Container/web same-origin:

```text
/auth/...
/catalog/...
/actions/...
/rewards/...
/leaderboards/...
/recognitions/...
/reports/...
/notifications/...
```

Local dev outside container:

```text
VITE_API_BASE_URL=http://localhost:18080
```

Policy Admin remains direct local-only:

```text
http://localhost:8090/policies/rules
```

All protected calls need:

```text
Authorization: Bearer <accessToken>
```

## Identity API

### `POST /auth/register`

Request:

```json
{
  "email": "new.student@ecoquest.local",
  "password": "EcoQuest@123",
  "displayName": "New Student",
  "studentId": "SV123"
}
```

Response local mode:

```json
{
  "accessToken": null,
  "verificationToken": "VERIFY-...",
  "user": {
    "id": "...",
    "email": "new.student@ecoquest.local",
    "displayName": "New Student",
    "role": "STUDENT",
    "studentId": "SV123",
    "status": "INACTIVE",
    "emailVerified": false,
    "avatarUrl": null
  }
}
```

Frontend behavior: show verification step. Do not treat register as logged in.

### `POST /auth/verify-email`

```json
{ "verificationToken": "VERIFY-..." }
```

Response:

```json
{ "verified": true, "message": "Email verified." }
```

### `POST /auth/login`

```json
{ "email": "student@ecoquest.local", "password": "EcoQuest@123" }
```

Response:

```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": "...",
    "email": "student@ecoquest.local",
    "displayName": "EcoQuest Student",
    "role": "STUDENT",
    "studentId": "SV001",
    "status": "ACTIVE",
    "emailVerified": true,
    "avatarUrl": null
  }
}
```

### Other Identity endpoints

- `GET /auth/me`
- `PUT /auth/me/profile`
- `POST /auth/me/avatar`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/resend-verification`
- `GET /auth/users` - Admin
- `PUT /auth/users/{id}/role` - Admin
- `PUT /auth/users/{id}/status` - Admin
- `DELETE /auth/users/{id}` - Admin, banned users only

Avatar upload request:

```json
{
  "fileName": "avatar.png",
  "contentType": "image/png",
  "base64": "iVBORw0KGgo..."
}
```

## Catalog API

- `GET /catalog/missions`
- `GET /catalog/missions?management=true` - Moderator/Admin management view
- `POST /catalog/missions` - Moderator/Admin, created as `PENDING`
- `PUT /catalog/missions/{id}` - Moderator own pending or Admin
- `PUT /catalog/missions/{id}/status?status=ACTIVE` - Admin
- `DELETE /catalog/missions/{id}` - Admin
- `GET /catalog/stations`
- `POST /catalog/stations` - Admin
- `PUT /catalog/stations/{id}` - Admin
- `POST /catalog/stations/{id}/image` - Admin, upload image data URL; Catalog stores the file in MinIO and returns a `/catalog/stations/images/...` URL in station `imageUrl`
- `DELETE /catalog/stations/{id}` - Admin
- `GET /catalog/badges`
- `POST /catalog/badges` - Admin
- `DELETE /catalog/badges/{code}` - Admin

Mission object:

```json
{
  "id": "MISSION-RECYCLE-01",
  "title": "Recycle Bottle",
  "actionType": "RECYCLE_BOTTLE",
  "basePoints": 10,
  "evidenceRequired": true,
  "stationRequired": true,
  "description": "Scan a campus green station and submit bottle recycling evidence.",
  "status": "ACTIVE",
  "createdByUserId": null
}
```

Station object:

```json
{
  "id": "STATION-A1",
  "name": "Library Recycling Point",
  "code": "QR-A1",
  "stationType": "RECYCLING",
  "location": "Main Library",
  "active": true,
  "imageUrl": "/logo.png"
}
```

Station image upload request:

```json
{
  "fileName": "station-a1.png",
  "dataUrl": "data:image/png;base64,iVBORw0KGgo..."
}
```

Badge definition object:

```json
{
  "code": "RECYCLING_HERO",
  "name": "Recycling Hero",
  "description": "Complete 10 accepted bottle recycling actions.",
  "requiredPoints": 0,
  "criteriaType": "ACTION_COUNT",
  "actionType": "RECYCLE_BOTTLE",
  "requiredCount": 10
}
```

## Action API

- `POST /actions/drafts`
- `POST /actions/evidence`
- `GET /actions/evidence/{objectKey}` - public preview/download
- `POST /actions/submit`
- `GET /actions/user/{studentId}`
- `GET /actions/review`
- `GET /actions/review?status=PENDING_REVIEW`
- `PUT /actions/{id}/approve`
- `PUT /actions/{id}/reject`

Draft request:

```json
{
  "studentId": "SV001",
  "missionId": "MISSION-RECYCLE-01",
  "stationId": "STATION-A1",
  "actionType": "RECYCLE_BOTTLE",
  "evidenceUrl": "/actions/evidence/evidence.png"
}
```

Evidence upload request:

```json
{
  "fileName": "evidence.png",
  "dataUrl": "data:image/png;base64,iVBORw0KGgo..."
}
```

Evidence response:

```json
{ "evidenceUrl": "/actions/evidence/..." }
```

Submit request:

```json
{
  "idempotencyKey": "client-generated-uuid",
  "studentId": "SV001",
  "missionId": "MISSION-RECYCLE-01",
  "stationId": "STATION-A1",
  "actionType": "RECYCLE_BOTTLE",
  "evidenceUrl": "/actions/evidence/..."
}
```

Submit accepted:

```json
{
  "id": "ACT-...",
  "studentId": "SV001",
  "missionId": "MISSION-RECYCLE-01",
  "stationId": "STATION-A1",
  "actionType": "RECYCLE_BOTTLE",
  "evidenceUrl": "/actions/evidence/...",
  "status": "ACCEPTED",
  "points": 10,
  "policyReason": "Accepted.",
  "moderationNote": null,
  "reviewedByUserId": null,
  "submittedAt": "2026-06-24T06:00:00Z",
  "reviewedAt": null
}
```

Important errors:

- `401`: missing/invalid token.
- `403`: wrong role or wrong studentId.
- `409`: duplicate idempotency key or non-active mission.
- `400`: action type does not match mission.

## Reward API

- `GET /rewards/wallets/{studentId}`
- `GET /rewards/wallets/{studentId}/transactions`
- `GET /rewards/wallets/{studentId}/badges`
- `POST /rewards/adjust` - Admin

Wallet:

```json
{ "studentId": "SV001", "totalPoints": 120, "updatedAt": "2026-06-24T06:00:00Z" }
```

Transaction:

```json
{
  "id": "...",
  "studentId": "SV001",
  "missionId": "MISSION-RECYCLE-01",
  "actionType": "RECYCLE_BOTTLE",
  "points": 10,
  "sourceActionId": "ACT-...",
  "createdAt": "2026-06-24T06:00:00Z"
}
```

## Leaderboard API

- `GET /leaderboards/weekly?limit=10`
- `GET /leaderboards/monthly?limit=10`
- `GET /leaderboards/users/{studentId}/rank?type=weekly`
- `POST /leaderboards/seasons/{id}/close?type=weekly&winners=10` - Admin
- `GET /leaderboards/seasons/{id}/snapshots`

Leaderboard entry:

```json
{ "studentId": "SV001", "points": 120, "rank": 1 }
```

## Recognition API

- `GET /recognitions/certificates/user/{studentId}`
- `GET /recognitions/certificates/{id}`
- `GET /recognitions/certificates/{id}/download` - public PDF
- `POST /recognitions/rewards/{id}/claim`

Certificate:

```json
{
  "id": "...",
  "studentId": "SV001",
  "seasonId": "WEEK-2026-06-22",
  "certificateType": "WEEKLY",
  "rankNumber": 1,
  "points": 120,
  "issuedOn": "2026-06-24T06:00:00Z",
  "pdfObjectKey": "certificates/..."
}
```

Download returns `application/pdf` and opens inline.

## Report API

- `POST /reports` - Student/Moderator
- `GET /reports/mine` - Student/Moderator
- `GET /reports` - Moderator/Admin
- `GET /reports?status=OPEN`
- `PUT /reports/{id}/review` - Moderator/Admin
- `GET /reports/analytics/summary?period=weekly` - Admin
- `GET /reports/analytics/students/{studentId}` - Admin

Create report:

```json
{
  "targetType": "MISSION",
  "targetId": "MISSION-TRASH-01",
  "reason": "Inappropriate content or campus issue",
  "evidenceUrl": "/actions/evidence/..."
}
```

Review:

```json
{ "status": "ACCEPTED", "note": "Handled by campus staff." }
```

Analytics summary response:

```json
{
  "period": "weekly",
  "submittedActions": 24,
  "acceptedActions": 20,
  "rejectedActions": 4,
  "totalPoints": 320,
  "openReports": 2,
  "acceptedReports": 5,
  "rejectedReports": 1,
  "actionTypes": [
    { "actionType": "RECYCLE_BOTTLE", "actionCount": 12, "points": 120 }
  ],
  "topStudents": [
    { "studentId": "SV001", "actionCount": 8, "points": 90 }
  ]
}
```

## Notification API

- `GET /notifications`
- `GET /notifications/stream?accessToken=<JWT>` - SSE for native `EventSource`
- `POST /notifications` - Admin
- `PUT /notifications/{id}/read`
- `PUT /notifications/read-all`

Notification object:

```json
{
  "id": "...",
  "studentId": "SV001",
  "role": null,
  "type": "ACTION_ACCEPTED",
  "title": "Action accepted",
  "message": "You earned 10 points.",
  "read": false,
  "createdAt": "2026-06-24T06:00:00Z",
  "readAt": null
}
```

Backend currently creates notifications for action accepted/rejected, badge unlocked, certificate issued, mission status changed, report created/reviewed, user reported, and user status changed. Frontend can poll `GET /notifications` and may also open native `EventSource('/notifications/stream?accessToken=...')`.

## Policy Admin API

Policy is intentionally not routed through Gateway.

- `GET http://localhost:8090/policies/rules`
- `PUT http://localhost:8090/policies/rules/{actionType}`

Request:

```json
{
  "actionType": "RECYCLE_BOTTLE",
  "basePoints": 10,
  "evidenceRequired": true,
  "stationRequired": true,
  "dailyLimit": 5,
  "active": true
}
```

Requires Admin bearer token in the `Authorization` header. Mark UI as "Local only".

## Required UI Views

Already expected or implemented:

1. Auth Gate: login, register, verify email, forgot/reset password.
2. Student Dashboard: points, rank, badges, certificates, active missions, recent actions.
3. Submit Action Modal/Drawer: mission/station/evidence validation, upload to MinIO, result states.
4. Wallet & Badges: total points, transactions, point badges, count badges.
5. Leaderboard: weekly/monthly tabs, rank lookup, close season for Admin.
6. Moderator Review: queue/history, search/filter, evidence preview, approve/reject, own-action disabled.
7. Certificates: cards, preview, PDF download, reward claim.
8. Admin Catalog: mission CRUD/status workflow, station image upload/preview, badge CRUD.
9. Admin Policy: direct local policy rules.
10. Profile: display name/avatar upload.
11. Reports: create report, mine, review queue, Admin analytics weekly/monthly/yearly/all.
12. Admin Users: role/status/delete.
13. Notifications: unread count/inbox/read/read-all; SSE via `accessToken` query optional.
14. Admin Adjust Points.

## Frontend Rules

- Do not submit non-active mission. Backend will also reject with `409`.
- Do not show pending/rejected missions to Student normal mission list.
- For Moderator, allow Student self view only for their own `studentId`.
- For Admin, do not show Student submit view unless a future impersonation feature is explicitly added.
- Treat async event flows as eventually consistent; refetch/poll after submit, approve, adjust, close season.
- Evidence should be uploaded first via `/actions/evidence`; submit should send the returned URL.
- Do not store raw evidence base64 in action submit payload.
- Show clear messages for `401`, `403`, `409`, and validation `400`.

## Verification Status

Last verified on 2026-06-24:

- Full Maven reactor 14/14 modules: pass.
- `docker compose config --quiet`: pass.
- Backend smoke test: pass.
- RabbitMQ after smoke: all queues drained to 0 messages and have consumers.
- Frontend unit tests after latest UI/API changes: 6/6 pass.
- Frontend production build after latest UI/API changes: pass.
