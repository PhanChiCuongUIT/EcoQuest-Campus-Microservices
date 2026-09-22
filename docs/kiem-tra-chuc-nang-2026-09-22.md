# Rà Soát Chức Năng Ngày 22/09/2026

## Các Lỗi Đã Sửa

| Khu vực | Trước khi sửa | Hiện tại |
| --- | --- | --- |
| Users | Lỗi tải dữ liệu có thể thành danh sách trống; đổi quyền/trạng thái lỗi không có phản hồi rõ | Hiển thị lỗi API và nút thử lại; thao tác thất bại giữ dữ liệu cũ và báo lý do |
| Campus Reports | Lỗi danh sách/target bị coi là không có dữ liệu | Phân biệt đang tải, lỗi và danh sách rỗng; Student không gọi API review chỉ dành cho người duyệt |
| Analytics | Promise tải KPI thiếu xử lý lỗi; kết quả truy vấn cũ có thể ghi đè kỳ mới | Báo lỗi và cho thử lại; bỏ kết quả bất đồng bộ của lựa chọn đã thay đổi |
| Adjust Points | Đổi sinh viên nhưng tải ví lỗi có thể còn số dư người trước | Xóa số dư cũ khi tải; bỏ phản hồi cũ; chỉ cho điều chỉnh khi ví khớp sinh viên đang chọn |
| Leaderboard UI | API tra hạng lỗi bị coi là chưa có hạng | Giữ thông báo lỗi API, không tạo kết quả “chưa xếp hạng” giả |
| Coupon | Claim `FAILED` vẫn có thể báo pending; trừ stock lạc quan cả khi API trả claim cũ | Thông báo theo `PENDING`, `ISSUED`, `REDEEMED`, `FAILED`; đọc lại stock/ví từ service |
| Notification UI | Lỗi đánh dấu đọc không báo; SSE nhận trùng tăng số unread; chưa có polling đúng nghĩa | Gộp theo ID, không hủy trạng thái đã đọc khi nhận lại event; báo lỗi thao tác; polling dự phòng 30 giây |
| Request chậm | Không có giới hạn chờ rõ, thông báo 403 submit có thể quy nhầm lỗi MSSV | Timeout API chính 120 giây, Policy 30 giây; thông báo kiểm lịch sử trước khi gửi lại; giữ lý do 403 thực tế |
| Leaderboard consumer | Cùng grant nhận lại có thể tăng điểm lần hai | Redis Lua kiểm grant và cập nhật bảng điểm tuần/tháng cùng thao tác |
| Notification SSE | Kết nối không hết hạn; emitter đã đóng có thể ảnh hưởng vòng gửi; cùng kết nối nhận hai lần khi trùng user/student | Thời hạn 5 phút, dọn khi complete/timeout/error, gửi một lần mỗi emitter, cô lập emitter đã đóng |
| Dọn E2E | Quét tất cả khóa leaderboard bằng lệnh sorted-set | Chỉ duyệt khóa weekly/monthly, dọn cả khóa chống trùng của sinh viên test; giữ khóa người dùng thật |

Không thêm service mới. Leaderboard chỉ thao tác Redis thuộc projection của mình; Notification chỉ lưu database riêng và quản lý SSE. Không chuyển nghiệp vụ vào Gateway, không truy vấn database Reward từ Leaderboard.

## Các Lớp Kiểm Thử

Kết quả cuối: 34 Java test riêng biệt, 28 unit test frontend, 22 Playwright case, production build, full backend smoke và Redis integration đều PASS. Build Java được xác nhận qua reactor 13 module rồi build lại Notification cùng dependency sau khi bổ sung bộ test mới, không tuyên bố reactor đầu đã PASS toàn bộ. 23 queue đều 0 message và có consumer; không có ERROR mới ở lượt runtime cuối, có một WARN tại Report do client hủy kết nối. Dữ liệu E2E được dọn sau khi tất cả test hoàn tất.

- Java unit test: rule Catalog, JWT/JSON lỗi, Policy CRUD, ví/coupon, seed; thêm hai test cho định danh grant và bốn test cho kết nối Notification.
- Redis integration: `scripts/test-leaderboard-dedup.ps1` chạy Lua thật, kiểm grant đầu tiên, gửi lặp, grant mới và khóa sai kiểu không ghi dở. Script xóa ba khóa tạm trong `finally`.
- Backend smoke: auth/role/status, Catalog/Policy, draft, upload lớn qua Nginx, nhiều ảnh/video, QR receipt, submit chờ duyệt, approve/reject, điểm/badge, coupon debit và hoàn stock, bảng xếp hạng, PDF certificate, report/analytics/export, inbox và RabbitMQ drained.
- Playwright nghiệp vụ: QR trên ảnh, station/badge/mission UI, Policy CRUD qua proxy, submit → duyệt → ví; desktop 1440×1000 và mobile 390×844.
- Playwright lỗi mô phỏng: API Users/Reports/Analytics/coupon/rank trả lỗi, đổi quyền bị từ chối, đánh dấu đọc thất bại, đổi sinh viên khi ví mới lỗi. Đây là kiểm chứng UI bằng response giả lập, không phải thử cắt mạng database/broker thật.
- Playwright SSE: mở kết nối thật, tạo notification có cả user ID và student ID, kiểm không nhận hai lần; đóng kết nối và xác nhận notification tiếp theo vẫn được lưu trong inbox.

Lệnh chạy và kết quả cuối được ghi tại [hướng dẫn khởi động, mục 7](chay-lai-project.md#7-kết-quả-xác-minh) và [hướng dẫn smoke](backend-smoke-test-guide.md).

## Giới Hạn Cần Hiểu Đúng

- Chống trùng Leaderboard áp dụng cho grant xử lý từ khi triển khai bản sửa. Không tự backfill grant lịch sử; xóa Redis hoặc replay dữ liệu cũ cần quy trình dựng lại projection. Lua đang thiết kế cho Redis standalone, chưa cho Cluster nhiều hash slot.
- Gộp SSE cùng notification ID không có nghĩa mọi consumer RabbitMQ đã có inbox chống trùng bền vững. Notification hiện vẫn có thể tạo bản ghi mới nếu broker giao lại integration event; đây là phần hardening tiếp theo, không tuyên bố exactly-once.
- SSE có thể ngắt khi người dùng đóng tab hoặc mạng mất. Chỉ lỗi được Spring nhận diện là client disconnected được ghi DEBUG/TRACE; I/O không liên quan vẫn được ném lại. Tham khảo [Spring DisconnectedClientHelper](https://docs.spring.io/spring-framework/docs/6.1.14/javadoc-api/org/springframework/web/util/DisconnectedClientHelper.html). Browser tự reconnect, polling/inbox là phương án đồng bộ lại.
- Các test không chứng minh mọi chức năng không còn bug; chưa thay thế stress/load test, thử mất broker/database kéo dài, camera vật lý hoặc gửi/nhận Gmail thực tế. Smoke chạy bằng token email local để không gửi thư test ra ngoài.
- Cleanup loại dữ liệu nhận diện E2E, không phải transaction rollback cho toàn bộ phiên test; không chạy `down -v` hay xóa dữ liệu thao tác thông thường.
