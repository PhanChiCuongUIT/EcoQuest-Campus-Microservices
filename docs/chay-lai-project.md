# Chạy Lại EcoQuest Campus Và Cập Nhật Dữ Liệu

Ngày cập nhật: 22/09/2026.

## 1. Thay đổi trong lần cập nhật

- Giữ kiến trúc 9 microservice và quyền sở hữu dữ liệu hiện có.
- Thêm named volume riêng cho 8 PostgreSQL, MongoDB, Redis, RabbitMQ và MinIO. Redis bật AOF. RabbitMQ có hostname ổn định để sử dụng lại dữ liệu broker sau khi tạo lại container.
- MinIO dùng `quay.io/minio/minio:RELEASE.2024-10-13T13-34-11Z` vì địa chỉ Docker Hub cũ không tải được khi kiểm tra. Đây là thay đổi registry cùng phiên bản, chưa phải nâng cấp bảo mật MinIO lên phiên bản mới.
- Sửa seed: không ghi đè role/status người dùng, tiêu chí badge/cấu hình mission, điểm đã điều chỉnh, stock coupon và read model báo cáo mỗi lần restart. Leaderboard seed thực hiện một lần bằng Lua, giữ điểm đã có.
- Đồng bộ lại số điểm seed giữa Reward, Leaderboard, Recognition và Report; không cấp sẵn badge đếm hành động hoặc badge 250 điểm khi bộ action mẫu chưa đủ điều kiện.
- Frontend dùng các phiên bản đã có trong lockfile, thay `latest` bằng phiên bản cụ thể và build bằng `npm ci`.
- Thêm `scripts/start-project.ps1` để khởi động, chờ Gateway và 9 service báo health `UP`, kiểm tra web và in các cổng thực tế.
- Thêm `scripts/refresh-demo-data.ps1` để bổ sung hoạt động hiện tại qua API; không sửa thời gian của dữ liệu lịch sử và không xóa dữ liệu thao tác.

## 2. Chạy trên máy tính

Mở Docker Desktop, chờ Docker Engine hoạt động. Máy không cần cài Maven hoặc Java 21 nếu build trong Docker. Frontend development dùng Node.js 24; Java 17 trên host không đủ để build backend trực tiếp.

```powershell
cd C:\Users\ADMIN\Downloads\Microservices-SE361
docker version
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
powershell -ExecutionPolicy Bypass -File scripts\start-project.ps1 -Build
```

`-Build` dùng khi lấy code mới hoặc thay đổi code. Lần sau chỉ cần:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-project.ps1
```

Script đọc `.env` hiện có; không ghi đè thông tin SMTP, mật khẩu hoặc cấu hình riêng. Nếu báo không kết nối được Docker API, mở Docker Desktop trước. Nếu báo cổng bị chiếm, đổi cổng host tương ứng trong `.env`; giữ nguyên cổng nội bộ giữa các container.

| Mục | Địa chỉ hiện tại |
| --- | --- |
| Giao diện | http://localhost:3000 |
| Gateway health | http://localhost:18080/actuator/health |
| RabbitMQ Management | http://localhost:25673, `guest` / `guest` |
| MinIO Console | http://localhost:9001, `minioadmin` / `minioadmin` |
| Policy REST | http://localhost:8090, API yêu cầu token Admin |

Các cổng mặc định mới tránh xung đột với các project đang dùng 8080, 5432, 5433, 6379, 5672 và 15672 trên máy này.

| Kho dữ liệu | Cổng host → container | Database |
| --- | --- | --- |
| Catalog PostgreSQL | 15432 → 5432 | catalog_db |
| Policy PostgreSQL | 15433 → 5432 | policy_db |
| Reward PostgreSQL | 5434 → 5432 | reward_db |
| Leaderboard PostgreSQL | 5435 → 5432 | leaderboard_db |
| Recognition PostgreSQL | 5436 → 5432 | recognition_db |
| Identity PostgreSQL | 5437 → 5432 | identity_db |
| Report PostgreSQL | 5438 → 5432 | report_db |
| Notification PostgreSQL | 5439 → 5432 | notification_db |
| MongoDB | 27017 → 27017 | action_db |
| Redis | 16379 → 6379 | namespace theo Action/Leaderboard |
| RabbitMQ AMQP | 25672 → 5672 | broker riêng của EcoQuest |

PostgreSQL demo dùng `ecoquest` / `ecoquest`. Cổng hạ tầng này phục vụ phát triển cục bộ; không công khai ra Internet với mật khẩu demo.

## 3. Đăng nhập và bổ sung dữ liệu

Tài khoản mặc định dùng mật khẩu `EcoQuest@123`:

- Student: `student@ecoquest.local`, MSSV `SV001`.
- Các Student khác: `student2@ecoquest.local` đến `student10@ecoquest.local`.
- Moderator: `moderator@ecoquest.local`.
- Admin: `admin@ecoquest.local`.

Nếu đã đổi mật khẩu hoặc role trong dữ liệu cũ, hệ thống giữ thay đổi đó. Không tự đặt lại mật khẩu khi khởi động.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\refresh-demo-data.ps1 -Gateway http://localhost:18080
```

Mỗi tháng có 3 mission chiến dịch mới; mỗi lần chạy vào một ngày UTC mới bổ sung tối đa 30 action cho 10 sinh viên. Trong bộ 30 action có 20 action được Moderator duyệt qua API và 10 action để chờ duyệt. Logo project được upload làm **minh chứng mẫu**, không đại diện cho bằng chứng hoạt động thực tế. Mọi điểm mới đi qua Action → RabbitMQ → Reward; Leaderboard, Recognition, Report và Notification nhận event theo cấu hình hiện có.

Chạy lại trong cùng ngày không thêm action trùng. Script tìm action đã lưu trong MongoDB thông qua API, nên vẫn chống lặp sau khi idempotency key Redis hết TTL. Nếu lần trước dừng giữa chừng, có thể chạy lại để tiếp tục. Không chạy hai bản script đồng thời. Script tôn trọng mission đã bị Admin đóng và giới hạn ngày của Policy; nếu tài khoản đã hoạt động nhiều trong ngày, script có thể báo giới hạn để kiểm tra thay vì nới policy.

Dữ liệu seed lịch sử vẫn giữ nguyên thời gian. Các mùa giải/certificate cũ được giữ làm dữ liệu mẫu; cập nhật dữ liệu không tự phát thêm certificate. Muốn có certificate mới, Admin đóng mùa giải theo luồng hiện có.

## 4. Kiểm thử

Frontend:

```powershell
cd web-apps\ecoquest-web
npm.cmd ci
npm.cmd test
npm.cmd run build
cd ..\..
```

Backend build kèm unit test:

```powershell
docker run --rm -v "${PWD}:/workspace" -v "${PWD}/.m2:/root/.m2" -w /workspace maven:3.9.9-eclipse-temurin-21 mvn -B package
```

Smoke test dùng token email cục bộ. `-LocalMail` không sửa `.env` và không gửi thư test ra ngoài:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-project.ps1 -LocalMail
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090 -Web http://localhost:3000
powershell -ExecutionPolicy Bypass -File scripts\cleanup-smoke-test-data.ps1
powershell -ExecutionPolicy Bypass -File scripts\test-restart-persistence.ps1
```

Smoke test tạo dữ liệu E2E và có thao tác đánh dấu đọc notification, thay đổi rule mẫu tạm thời và đóng mùa giải test. Nên chạy trên môi trường demo. Cleanup chỉ dọn các dữ liệu nhận diện là E2E, không phải công cụ hoàn tác toàn bộ hành vi của một phiên test. Không dùng `down -v` để dọn E2E nếu cần giữ dữ liệu thao tác.

Chạy `scripts/start-project.ps1` không có `-LocalMail` sau kiểm thử để khôi phục cấu hình SMTP trong `.env`. Việc SMTP gửi thư ra ngoài phụ thuộc tài khoản/App Password, mạng và cấu hình Gmail; không suy ra từ kết quả smoke dùng token cục bộ.

## 5. Dữ liệu và vận hành lâu dài

```powershell
docker compose stop
# Khi cần chạy lại:
powershell -ExecutionPolicy Bypass -File scripts\start-project.ps1
# Kiểm tra:
docker compose ps
docker compose logs --tail=100 eco-action-service reward-ledger-service
docker compose exec -T rabbitmq rabbitmqctl list_queues name messages consumers
docker compose exec -T redis redis-cli INFO persistence
docker system df
```

Không chạy `docker compose down -v` hoặc `docker volume prune` khi muốn giữ dữ liệu. Named volume sống độc lập với container; `down` không có `-v` giữ named volume. Xem [tài liệu Docker về volumes](https://docs.docker.com/engine/storage/volumes/) và [hành vi Compose down](https://docs.docker.com/reference/cli/docker/compose/down/).

Nếu nâng từ bản cũ còn container với anonymous volume hoặc MinIO lưu ngay trong container: sao lưu database và file trước khi áp dụng cấu hình volume mới. Việc đổi sang named volume không tự chuyển dữ liệu từ anonymous volume. Trong lần kiểm tra máy này, không có container thuộc Compose EcoQuest đang tồn tại; các project khác được giữ nguyên.

Khi chỉ đổi một service, build và tạo lại riêng service đó:

```powershell
docker compose build report-service
docker compose up -d --no-deps report-service
```

## 6. Mở trên điện thoại

Điện thoại và máy tính cùng mạng Wi-Fi. Dùng `ipconfig` lấy IPv4 máy tính rồi mở `http://<IPv4>:3000`. Cho phép cổng 3000 trong Windows Firewall khi cần. Nếu mở link xác minh/reset email trên điện thoại, đặt `FRONTEND_BASE_URL=http://<IPv4>:3000` trong `.env` rồi chạy lại script khởi động. API từ frontend dùng proxy cùng origin.

Quét QR bằng camera trực tiếp cần HTTPS hoặc localhost. Trên HTTP qua IP LAN có thể chọn ảnh QR làm phương án dự phòng. In nhãn QR từ origin mà điện thoại truy cập được, không in URL localhost cho điện thoại khác. Xem [cách tạo station, gán mission và quét QR](station-qr-wallet-badges.md).

## 7. Kết quả xác minh

### Mốc 22/09/2026: Luồng Nghiệp Vụ Và Trạng Thái Lỗi

- Full backend smoke **PASS** trên bản Notification mới qua Gateway `18080`, Policy `8090` và web proxy `3000`; gồm QR receipt, submit chờ duyệt, approve/reject, điểm/badge/coupon, certificate PDF, report và notification. 23 queue đều 0 message, mỗi queue có 1 consumer sau test và cleanup.
- Cleanup hoàn thành: xóa 38 tài khoản test, 70 action test, 24 khóa Redis test và 48 thành viên E2E khỏi các leaderboard. Giữ dữ liệu seed và dữ liệu thao tác không mang marker test; cleanup không phải rollback toàn bộ trạng thái dùng chung.
- Sau cleanup: 0 tài khoản E2E trong Identity, 0 thành viên E2E trong bảng điểm tuần/tháng hiện tại. Tháng hiện tại có 10 sinh viên; tuần UTC hiện tại chưa có điểm của người dùng không phải test. Không tự tạo thêm điểm để lấp bảng tuần. Startup không có `-LocalMail` đã khôi phục cấu hình `.env`; Gateway/chín service UP, web HTTP 200 và đăng nhập Admin qua web proxy thành công. Không kiểm chứng gửi/nhận email thật trong lượt này.

- Java: **34 test riêng biệt PASS**, 0 failure/error trong Surefire. Lượt reactor build 13 module thành công; Notification được thêm dependency test trong lúc lượt đó đang chạy nên phải chạy lại bằng `mvn -B -ntp -pl services/notification-service -am package`, sau đó BUILD SUCCESS với 4 test Notification và 4 test common. Không ghi nhận lượt reactor đầu là 14/14 PASS.
- Frontend: **28/28 unit test PASS**, production build PASS; bundle chính khoảng 523 kB còn cảnh báo tối ưu dung lượng của Vite.
- Playwright: **22/22 PASS** trong khoảng 1,2 phút; 8 case nghiệp vụ QR/Policy, 12 case phản hồi lỗi giả lập và 2 case SSE thật, chia đều desktop/mobile. Có kiểm ô station sau response quét QR và kiểm lỗi HTTP thật, không bỏ assertion nghiệp vụ.
- Redis integration **PASS**: grant trùng không tăng điểm, grant mới cập nhật cả tuần/tháng; lỗi kiểu khóa không làm ghi dở điểm và marker. Script dọn ba khóa tạm.
- Sửa lỗi hiển thị tải dữ liệu, thao tác quyền/read notification, trạng thái coupon, số dư ví cũ khi đổi sinh viên; thêm dedup Leaderboard và quản lý vòng đời SSE. [Chi tiết thay đổi, file test và giới hạn](kiem-tra-chuc-nang-2026-09-22.md).
- Một lượt chạy lúc tiếp tục phiên thất bại do các container đã dừng: web `ECONNREFUSED`, Notification không tìm được database. Đã khởi động đủ stack và đợi Gateway/chín service UP trước lượt thành công; không đổi assertion để bỏ qua việc backend chưa sẵn sàng.
- Trong lượt trình duyệt cuối có WARN `AsyncRequestNotUsableException / Broken pipe` tại Report khi client hủy kết nối. Không coi đó là lỗi nghiệp vụ hoặc tuyên bố mọi log hoàn toàn không có cảnh báo. Bản Notification mới xử lý riêng disconnect và không che I/O khác.

### Mốc 21/09/2026: Policy, Thông Báo Lỗi Và CRUD

- Maven Java 21: toàn bộ 14 module BUILD SUCCESS; **28 test PASS**, không failure/error. Có 4 test common về JSON lỗi/JWT filter và 4 test Policy CRUD/phân quyền.
- Frontend: **26 test PASS**, production build PASS. Vite còn cảnh báo bundle chính lớn hơn 500 kB; đây là mục tối ưu tải trang, không phải lỗi build.
- Full backend smoke **PASS**, gồm CRUD Catalog/Policy/RewardOffer, auth/RBAC, evidence, submit/approve/reject, điểm/badge/coupon, leaderboard, report/export, notification, certificate PDF và RabbitMQ drained.
- Playwright **8/8 PASS** trong 37,5 giây, desktop 1440x1000 và mobile 390x844. Có test quét QR sai station rồi quét đúng để submit, thêm/sửa/xóa Policy qua UI và request dùng hostname LAN. Có ảnh chụp light/dark và kiểm tra overflow.
- Policy dùng web proxy cùng origin, không thêm route Gateway và không bỏ JWT Admin. API lỗi nghiệp vụ trả `detail`/`message`; filter JWT không đổi lỗi service thành 401. Catalog chặn mission thiếu `actionType`.
- Sửa lệch kỳ leaderboard: test và UI dùng UTC giống backend, có test giao tuần/tháng và ISO week-year. Lượt trước bị fail khi giờ Việt Nam đã sang thứ Hai nhưng UTC còn Chủ nhật; không bổ sung điểm giả để né assertion.
- Một lượt test đầu phải sửa cách đọc error body trên Windows PowerShell 5; lượt cuối vẫn kiểm mã HTTP và nội dung lỗi cụ thể. Không có ERROR/Exception mới trong log stack trong khoảng lượt smoke cuối.
- Kết quả trên không thay thế kiểm thử tải, lỗi broker/database kéo dài, mọi race condition hay xác minh SMTP/camera điện thoại vật lý. Không tuyên bố mọi thao tác CRUD đều không còn bất kỳ lỗi nào.
- Sau kiểm thử: cleanup hoàn thành, 0 tài khoản E2E nhận diện được; đã xóa 22 thành viên E2E khỏi các leaderboard Redis. 23 queue đều 0 message và 1 consumer. Khôi phục email theo `.env` bằng startup không có `-LocalMail`; Gateway và chín service health UP, web `http://localhost:3000` trả 200. Dữ liệu seed và dữ liệu UI không mang tiền tố test được giữ lại.

### Mốc 20/09/2026: QR, Badge Và Coupon

Rà CRUD bổ sung: đã sửa Admin edit mission bị reset trạng thái khi bỏ `status`, đồng thời phát event khi đổi trạng thái qua API sửa. Build Catalog và 10 test của service PASS; full smoke chạy lại PASS. Tổng test Java tăng từ 17 lên 20 nhờ 3 test mới; các số liệu reactor toàn bộ bên dưới là lượt trước bản sửa Catalog này.

Maven 14 module build thành công, 17 unit test PASS; frontend 20 unit test, 6 Playwright case desktop/mobile và production build PASS; backend smoke đầy đủ PASS, gồm QR receipt, badge rule/ảnh và coupon debit/hoàn stock/coupon miễn phí. Ba queue mới nâng tổng lên 23. Gateway được build riêng sau khi bổ sung giới hạn DNS cache 5 giây; Nginx proxy cũng phân giải lại Docker DNS, tránh giữ IP cũ sau restart/recreate service. Các thay đổi giữ nguyên chín service và ownership database. [Chi tiết kết quả và giới hạn](station-qr-wallet-badges.md#8-chạy-và-kiểm-thử).

Kết quả restart mới ngày 20/09: 11 nhóm snapshot giữ nguyên, thêm danh sách station và QR vào phạm vi kiểm tra. Gateway tự phục hồi sau đổi IP service với DNS cache mới; không cần restart Gateway giữa bài test. Cleanup E2E giữ lại dữ liệu seed và dữ liệu UI không mang tiền tố test.

Kiểm tra sau cùng: Playwright 6/6 PASS trên bản frontend cuối; 0 tài khoản/ví E2E và 0 dòng E2E trong leaderboard tuần/tháng. 23 queue có 0 message và 1 consumer mỗi queue. Đã chạy lại startup không có `-LocalMail`, khôi phục cấu hình email từ `.env`; Gateway và chín service UP, đăng nhập qua web thành công. Đây không phải kiểm chứng gửi email thật.

### Mốc Lịch Sử 19/09/2026

Kiểm tra ngày 19/09/2026 trên stack cục bộ:

| Hạng mục | Kết quả |
| --- | --- |
| Maven Java 21 | 14/14 module build thành công; 4 unit test mới về seed PASS |
| Frontend | 16/16 test PASS; production build PASS |
| Backend smoke qua Gateway và web proxy | PASS, gồm upload lớn, auth/RBAC, CRUD, submit → duyệt → điểm, badge, certificate/coupon, report và notification |
| Cleanup sau smoke | Hoàn thành; API audit không còn user/action E2E hoặc dòng E2E trong leaderboard tuần/tháng hiện tại |
| Bổ sung dữ liệu ngày hiện tại | Thêm 3 mission tháng, 30 action; 20 action được duyệt có transaction tương ứng trong Reward |
| Chạy lại refresh cùng ngày | PASS: 0 action mới, nhận diện 30 action đã tồn tại và kiểm tra lại 20 transaction |
| Restart 6 service có seed liên quan | PASS: 9 nhóm dữ liệu API trước/sau giống nhau, gồm user, mission, badge, ví/transaction SV001, leaderboard, reward offer và báo cáo SV001 |
| RabbitMQ sau cùng | 20 queue, mỗi queue 0 message và 1 consumer |
| Khởi động theo `.env` sau test | 23 container chạy; Gateway và 9 service health `UP`, web trả HTTP 200 |

Dữ liệu sau cleanup và refresh: **12 tài khoản, 18 mission, 66 action** (50 `ACCEPTED`, 13 `PENDING_REVIEW`, 3 `REJECTED`). Leaderboard tuần/tháng hiện tại đều có 10 sinh viên. Đây là số liệu tại thời điểm kiểm tra, sẽ thay đổi khi người dùng thao tác hoặc chạy refresh ngày khác.

Smoke chạy ở chế độ email cục bộ; sau đó đã khôi phục cấu hình SMTP từ `.env` và Identity health báo `UP`. Chưa kiểm chứng gửi/nhận email thật trong lượt này. Frontend được kiểm bằng test tự động và build, chưa có lượt kiểm tra trực quan trình duyệt mới.

Trong thử nghiệm restart chủ động, Gateway có log `Connection refused` khi service tạm dừng. Lần refresh đầu gặp lỗi ghép URL ví trong script; lỗi đã được sửa và chạy lại PASS. Không coi log lịch sử này là lỗi phát sinh của lượt kiểm tra cuối, cũng không dùng kết quả trên để khẳng định hệ thống không còn mọi lỗi hoặc đã chịu tải production.
