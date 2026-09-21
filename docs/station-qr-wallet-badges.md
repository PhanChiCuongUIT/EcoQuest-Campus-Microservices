# Station QR, Huy Hiệu Và Điểm Tiêu Dùng

Cập nhật: 20/09/2026. Tài liệu mô tả phần mở rộng trên chín service hiện có, không thêm service chỉ để xử lý QR hoặc coupon.

## 1. Phân Chia Trách Nhiệm

| Service | Dữ liệu và nghiệp vụ sở hữu |
| --- | --- |
| Catalog | Station, mã QR, mission và danh sách station được phép, biên nhận quét, định nghĩa/ảnh badge |
| Action | Kiểm tra mission qua API Catalog, xác minh Policy qua gRPC, lưu submission và quy trình duyệt |
| Reward Ledger | Điểm tích lũy, điểm đã tiêu, giao dịch, quyết định trừ điểm coupon, quy tắc badge được đồng bộ và thành tích đã đạt |
| Recognition | Offer, tồn kho, yêu cầu đổi coupon, voucher và chứng chỉ |
| Notification | Thông báo sự kiện; tên mission thay cho ID kỹ thuật khi duyệt action mới |

Không có service nghiệp vụ nào đọc hoặc ghi trực tiếp database của service khác. Các bảng mới nằm trong database của service sở hữu; thư viện messaging chỉ bổ sung event contract, không chia sẻ entity domain.

## 2. Tạo Và Quét QR Station

1. Admin vào **Catalog > Stations**, tạo station có tên, vị trí, loại và trạng thái.
2. Catalog sinh `qrToken` duy nhất. Token không xuất hiện trong API danh sách station thông thường.
3. Nút QR mở nhãn có tên station, mã QR, tải PNG và in. QR chứa URL web dạng `https://host/#station=<token>`.
4. Student, Moderator và Admin đều có **Stations / Scan QR**. Có thể quét camera hoặc chọn ảnh chụp QR để xem thông tin station và các mission `ACTIVE` đã gán.
5. Mở URL QR trên điện thoại chưa đăng nhập sẽ qua đăng nhập trước khi tra cứu. Việc tra cứu không tạo action và không cộng điểm.

QR được tạo theo origin của trang đang mở. Nếu in từ `localhost`, điện thoại khác không thể dùng URL đó để mở ứng dụng trên máy chủ. Hãy mở web bằng tên miền/địa chỉ LAN phù hợp trước khi in nhãn.

Camera trình duyệt yêu cầu HTTPS hoặc localhost và quyền camera. Truy cập `http://<IP-LAN>:3000` có thể dùng chọn ảnh QR nhưng không bảo đảm dùng được camera trực tiếp. Cần HTTPS để triển khai quét camera thực tế trên điện thoại.

## 3. Mission Bắt Buộc Station

- Form tạo/sửa mission có `stationRequired` và `allowedStationIds`.
- Mission yêu cầu station phải chọn ít nhất một station tồn tại và đang hoạt động. Kích hoạt mission cũng kiểm tra điều kiện này.
- Admin sửa mission mà không gửi `status` giữ nguyên trạng thái hiện có. Nếu đổi trạng thái qua API sửa, Catalog phát `MissionStatusChangedEvent` giống API duyệt riêng để các consumer nhận cập nhật. Moderator sửa mission bị từ chối sẽ gửi lại về `PENDING`, không được tự đặt `ACTIVE`.
- Không xóa station còn được mission tham chiếu; sửa lại các mission liên quan trước. Station ngừng hoạt động không được dùng để xác nhận submission mới.
- Với dữ liệu cũ chưa có cấu hình station, migration chạy một lần gán station theo loại hoạt động. Nếu không tìm được station phù hợp, mission bắt buộc station chuyển về chờ duyệt. Admin cần kiểm tra lại danh sách này theo vị trí thực tế trước khi sử dụng.

Luồng submit:

1. Student chọn mission. Ô station chỉ đọc, không còn dropdown chọn tùy ý.
2. Quét QR của một station được mission cho phép.
3. Catalog tạo `scanReceipt`, gắn `userId + missionId + stationId`, hiệu lực 10 phút.
4. Frontend gửi `stationScanReceipt` cùng `stationId` và idempotency key khi submit.
5. Action chuyển các thông tin này cùng danh tính đã xác thực đến Catalog. Catalog khóa receipt trong transaction, kiểm tra chủ sở hữu, station, mission, thời hạn và submission key.
6. Cùng receipt/cùng submission key được kiểm tra lại an toàn; không được dùng receipt cho submission key mới. Chỉ gửi station ID, dùng receipt của người khác hoặc station ngoài danh sách đều bị chặn.
7. Submission hợp lệ vẫn là `PENDING_REVIEW`. Moderator/Admin phải approve mới phát event cộng điểm; QR không thay thế xét duyệt minh chứng.

**Giới hạn:** QR tĩnh có thể được chụp hoặc sao chép. Hệ thống xác minh mã station và lượt quét, không chứng minh tuyệt đối người dùng đang có mặt tại đó. Chống gian lận vị trí mạnh hơn cần một giải pháp bổ sung như QR động hoặc thiết bị xác nhận tại trạm.

## 4. Wallet Và Coupon

| Giá trị | Ý nghĩa |
| --- | --- |
| `totalPoints` | Điểm thành tích tích lũy, có thể thay đổi bởi điều chỉnh có audit của Admin |
| `spentPoints` | Tổng điểm đã trừ cho coupon được chấp thuận |
| `availablePoints` | Giá trị tính toán `totalPoints - spentPoints`, dùng để đổi coupon |

Ví dụ: có 100 điểm, đổi coupon giá 30 thì còn 70 điểm tiêu dùng, tổng thành tích vẫn 100, đã tiêu 30. Không phát `PointsGrantedEvent` âm khi đổi coupon, vì vậy không giảm điểm leaderboard hoặc thu hồi badge đã đạt.

Quy trình phối hợp bất đồng bộ:

```text
Student -> Recognition: claim offer
  Recognition transaction: khóa offer, kiểm badge/certificate/active/expiry/stock,
                           giữ một đơn vị stock, lưu claim PENDING
  PENDING publisher -> RabbitMQ: coupon.debit.requested.v1
  Reward transaction: khóa wallet, kiểm availablePoints, lưu quyết định theo claimId,
                      trừ điểm và ghi giao dịch nếu đủ số dư
  Reward -> RabbitMQ: coupon.debit.decided.v1
  Recognition transaction: ISSUED + voucher, hoặc FAILED + hoàn stock
```

- `requiredPoints` của offer hiện là **giá đổi**, không chỉ là mốc điểm thành tích.
- Recognition không tự sửa wallet. Read model của Recognition chỉ phục vụ điều kiện và hiển thị; quyết định số dư cuối cùng luôn ở Reward.
- Hai offer có thể được claim gần nhau, nhưng khóa wallet bảo vệ việc tiêu quá số dư. Quyết định debit được lưu theo `claimId`; event lặp không trừ hai lần.
- Claim `PENDING` được lưu bền vững và gửi lại mỗi 3 giây đến khi nhận kết quả. Khi broker/service gián đoạn, UI có thể còn pending; không hiển thị voucher trước khi debit thành công.
- Kết quả `FAILED` hoàn stock một lần; người dùng có thể thử lại sau khi đủ điều kiện. Claim pending/issued lặp trả lại claim hiện có.
- Không sửa offer khi còn claim pending. Giao dịch coupon có lý do `Coupon: <tên offer>` và số điểm âm.
- Coupon đã phát theo phiên bản cũ không bị trừ điểm hồi tố. Voucher là mã do ứng dụng quản lý, chưa tích hợp hệ thống POS/đối tác bên ngoài hoặc quy trình xác nhận sử dụng tại cửa hàng.
- Admin điều chỉnh giảm điểm không được làm số dư tiêu dùng âm.

## 5. Badge CRUD Và Xét Thành Tích

Catalog hỗ trợ hai tiêu chí:

- `POINTS`: ngưỡng `requiredPoints > 0`, xét trên điểm tích lũy, không dùng số dư sau đổi coupon.
- `ACTION_COUNT`: `actionType` và `requiredCount > 0`, xét số action đã được duyệt và ghi nhận trong ledger.

Ảnh badge không bắt buộc. Admin có thể upload ảnh; Catalog kiểm tra và lưu MinIO, database chỉ giữ URL. Chưa có ảnh vẫn hiển thị biểu tượng dự phòng.

Catalog phát snapshot `catalog.badges.snapshot.v1` mỗi 15 giây. Reward lưu `badge_rule_projection` riêng, bỏ qua bản cũ hơn và xét lại các ví khi quy tắc thay đổi. Vì vậy rule mới/sửa có thể cần một khoảng ngắn mới có tác dụng. Unique `studentId + badgeCode` ngăn cấp trùng.

Delete badge là **retire** (`active=false`), không xóa thành tích đã cấp. Badge inactive không được cấp mới sau khi Reward nhận cập nhật. Sửa tên/ngưỡng không tự thu hồi hoặc đổi tên lịch sử thành tích cũ. Code badge giữ nguyên khi sửa; tạo code trùng trả 409.

## 6. API Bổ Sung

Tất cả đường dẫn dưới đây đi qua Gateway hoặc same-origin proxy, có bearer token.

| API | Quyền và nội dung |
| --- | --- |
| `GET /catalog/stations/{id}/qr` | Admin: `stationId`, `name`, `qrToken` để tạo nhãn |
| `POST /catalog/stations/scan` | Mọi role: `{ "qrToken": "...", "missionId": "..." }`; bỏ `missionId` nếu chỉ tra cứu |
| Kết quả scan | `{ "station": {...}, "missions": [...], "scanReceipt": "...", "expiresAt": "..." }`; hai trường cuối null khi chỉ tra cứu |
| `POST/PUT /catalog/missions[/{id}]` | Bổ sung `allowedStationIds: ["STATION-A1"]` khi yêu cầu station |
| `POST /actions/submit` | Bổ sung `stationScanReceipt`; vẫn dùng request/idempotency contract hiện có |
| `POST /catalog/badges/{code}/image` | Admin: `{ "fileName": "badge.png", "dataUrl": "data:image/png;base64,..." }` |
| `GET /rewards/wallets/{studentId}` | Bổ sung `spentPoints`, `availablePoints`; giữ `totalPoints` |
| `POST /recognitions/rewards/{id}/claim` | Có thể trả claim `PENDING`, không mặc định thành công là đã phát voucher |

Claim trả thêm `pointsCost`, `failureReason`; frontend đọc danh sách claim theo API hiện có đến khi `ISSUED` hoặc `FAILED`. `sourceActionId` vẫn giữ trong transaction API cho audit, giao diện ưu tiên `reason` hoặc tên mission.

## 7. Dữ Liệu Và Ràng Buộc Mới

| Database | Bảng/thay đổi | Ràng buộc |
| --- | --- | --- |
| Catalog PostgreSQL | `green_station.qr_token` | Unique, không hiển thị trong danh sách station thông thường |
| Catalog PostgreSQL | `mission_allowed_station_ids` | Collection của mission; FK về mission trong cùng database, station được kiểm tra qua nghiệp vụ Catalog |
| Catalog PostgreSQL | `station_scan_receipt` | PK `id`; user/mission/station, hạn sử dụng, submission key; khóa pessimistic khi xác nhận |
| Catalog PostgreSQL | `badge_definition` | `active`, `image_url`; validation tiêu chí trong Catalog |
| Action MongoDB | `eco_actions.missionTitle` | Snapshot tên mission, bổ sung vào accepted event; dữ liệu cũ có thể chưa có tên |
| Reward PostgreSQL | `reward_wallet` | `spent_points` mặc định 0, `version` optimistic lock; available tính toán, không lưu cột riêng |
| Reward PostgreSQL | `coupon_debit_record` | PK `claim_id`; lưu cả quyết định thành công và từ chối |
| Reward PostgreSQL | `badge_rule_projection` | PK `code`, timestamp snapshot; chỉ Reward sử dụng để xét thành tích |
| Recognition PostgreSQL | `reward_claim` | `points_cost`, `failure_reason`, status `PENDING/ISSUED/FAILED`; khóa offer và kiểm claim để bảo vệ stock/idempotency |

Các thay đổi này vẫn dùng cơ chế Hibernate schema update của các service tương ứng; không có tuyên bố đã chuyển toàn bộ service sang Flyway. Trước khi nâng cấp trên dữ liệu quan trọng cần sao lưu volume/database.

## 8. Chạy Và Kiểm Thử

```powershell
# Tại thư mục gốc; Docker Desktop phải đang chạy Linux engine.
powershell -ExecutionPolicy Bypass -File scripts\start-project.ps1 -Build
# http://localhost:3000

# Chỉ dùng môi trường phát triển: bật token email local cho test.
powershell -ExecutionPolicy Bypass -File scripts\start-project.ps1 -LocalMail
powershell -ExecutionPolicy Bypass -File scripts\backend-smoke-test.ps1 -Gateway http://localhost:18080 -Policy http://localhost:8090 -Web http://localhost:3000

cd web-apps\ecoquest-web
npm.cmd ci
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:browser
cd ..\..

# Sau khi TẤT CẢ các test đã chạy xong:
powershell -ExecutionPolicy Bypass -File scripts\cleanup-smoke-test-data.ps1
powershell -ExecutionPolicy Bypass -File scripts\start-project.ps1
```

Cleanup chỉ nhắm dữ liệu E2E nhận diện được, không reset seed hoặc xóa toàn bộ dữ liệu thao tác trên UI. Script bảo trì có quyền database riêng, không phải đường truy cập database của service nghiệp vụ. Không chạy cleanup đồng thời với test.

Lượt mới ngày 21/09/2026: reactor 14 module / 28 Java test, frontend 26 test, Playwright 8/8 và full smoke PASS. Đã bổ sung kiểm tra thông báo rõ ràng khi quét sai station, thiếu receipt truyền qua Action, Policy CRUD qua proxy cùng origin và kỳ leaderboard UTC. [Kết quả hiện tại](chay-lai-project.md#7-kết-quả-xác-minh).

Kết quả lịch sử đã kiểm chứng ngày 20/09/2026:

- Maven: lượt reactor toàn bộ 14 module build thành công, 17 unit test PASS. Sau rà CRUD, thêm 3 test `CatalogMissionUpdateTest`; build Catalog cùng các module phụ thuộc và 10/10 test Catalog PASS. Tổng hiện có 20 Java unit test, nhưng lượt chạy cuối chỉ chạy lại Catalog; không ghi nhận một lượt reactor toàn bộ 20 test mới. Gateway được build lại riêng sau bản sửa DNS bên dưới.
- Full smoke được chạy lại sau bản sửa CRUD mission và PASS, gồm giữ trạng thái khi Admin sửa mission không gửi `status`, các luồng QR/badge/coupon và RabbitMQ drained.
- Frontend: 20 unit test PASS; production build thành công.
- Backend smoke đầy đủ PASS, gồm extension `scripts/qr-reward-smoke-cases.ps1`: quyền QR, station sai/thiếu, receipt người khác/dùng lại, badge động và ảnh, coupon không tiêu quá số dư, không debit lặp, hoàn stock khi thất bại, coupon miễn phí không cần ví có điểm; queue drained.
- Playwright: 6/6 PASS trên desktop 1440x1000 và mobile 390x844, có ảnh chụp light/dark, QR PNG decode, submit pending, approve và hiển thị lý do giao dịch.
- Restart: 11 nhóm snapshot API giữ nguyên sau restart sáu service, gồm mã QR, station, cấu hình mission, ví và lịch sử. Lượt đầu phát hiện DNS cache cũ; đã sửa Gateway/Nginx và chạy lại PASS. Script chuẩn hóa thứ tự property JSON để không coi đổi thứ tự key của Java Map là đổi dữ liệu.
- Camera vật lý trên điện thoại, in nhãn bằng máy in thực và đối tác chấp nhận voucher chưa được kiểm thử. Test email chạy LocalMail, không xác nhận lại khả năng gửi SMTP thật.
- Kiểm chứng cuối sau bản chỉnh bố cục station và bộ đếm badge: Playwright chạy lại 6/6 PASS trong 35,2 giây. Một lượt trước đó có timeout kéo dài bất thường ở QR mobile; lỗi không tái hiện trong lượt chạy lại, chưa khẳng định nguyên nhân gián đoạn.
- Cleanup cuối: 0 tài khoản/ví E2E nhận diện được, 0 dòng E2E trong leaderboard tuần/tháng; giữ dữ liệu seed và dữ liệu thường. Cả 23 queue có 0 message, mỗi queue 1 consumer tại thời điểm kiểm tra. Đã khôi phục email theo `.env`, Gateway và chín service health UP; đăng nhập qua Nginx và tra cứu QR thành công.

RabbitMQ bổ sung ba queue: `reward.badge-catalog`, `reward.coupon-debit`, `recognition.coupon-debit-result`, tổng 23 queue nghiệp vụ. Khi demo có thể mở Management > Queues and Streams, xem bindings, consumers, Ready/Unacked; không dùng Get messages để lấy mất message của service. Quy trình coupon và badge là eventual consistency, không phải transaction xuyên hai database hay bảo đảm exactly-once của broker.

## 9. DNS Khi Restart Service

Kiểm thử restart đã phát hiện Gateway còn cache địa chỉ cũ trong khi Docker cấp IP mới cho service: `/actuator/health` vẫn UP nhưng API trả 500/Connection refused. `GatewayHttpClientConfiguration` giới hạn DNS cache 5 giây qua `HttpClientCustomizer`; Nginx web cũng dùng Docker DNS resolver với `valid=5s` và upstream dạng biến để không giữ IP Gateway từ lúc khởi động. Không retry tự động các POST có thể gây ghi lặp.

Tham chiếu API cấu hình: [Spring Cloud Gateway HttpClientCustomizer](https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway-server-webflux/http-client.html), [Reactor Netty DNS cache](https://projectreactor.io/docs/netty/release/api/reactor/netty/transport/NameResolverProvider.NameResolverSpec.html). Cấu hình đã compile với dependency hiện có của repository; không nâng phiên bản framework trong lượt này.
