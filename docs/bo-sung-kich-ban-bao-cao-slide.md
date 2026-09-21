# Bổ sung kịch bản báo cáo slide EcoQuest Campus

Cập nhật: 2026-07-10

Tài liệu này dùng để bổ sung cho file `Kịch bản báo cáo slide.docx` và phần vấn đáp khi trình bày đồ án SE361. Nội dung bám theo bản slide `Slide_SE361_EcoQuest_Campus (1)` gồm 23 slide.

## Nhận xét nhanh về slide hiện tại

Bản slide hiện tại đã ổn để trình bày cho giảng viên: bố cục sạch, tập trung đúng trọng tâm microservices, có đủ các phần bối cảnh, bounded context, database-per-service, gRPC, RabbitMQ, Outbox, CQRS, kiểm thử và hướng phát triển.

Các điểm mạnh:

- Slide 5 đã thể hiện rõ 9 service theo bounded context.
- Slide 6, 10, 12, 13 đã làm rõ luồng chính từ submit, review, reward, leaderboard đến recognition.
- Slide 7, 8 giải thích tốt data ownership và vì sao dùng nhiều loại storage khác nhau.
- Slide 11 đưa được Transactional Outbox vào đúng vấn đề dual-write.
- Slide 14 giải thích Report Service theo hướng CQRS/read model, rất phù hợp để bảo vệ tính microservices.
- Slide 19, 20 có số liệu kiểm thử cụ thể, giúp phần demo có cơ sở.

Các điểm nên chỉnh hoặc nhấn mạnh khi nói:

- Ở kịch bản slide 6 và slide 10, nên tránh nói Recognition nhận trực tiếp mọi `ActionAcceptedEvent` để tạo certificate. Nói chính xác hơn: `ActionAcceptedEvent` chủ yếu kích hoạt Reward/Report/Notification; Reward phát `PointsGrantedEvent` để Leaderboard/Report/Notification cập nhật; khi close season thì Leaderboard phát `SeasonClosedEvent`, Recognition mới tạo certificate.
- Ở slide 12, dòng “Leaderboard/Recognition cập nhật” nên nói rõ bằng lời: Leaderboard cập nhật sau `PointsGrantedEvent`, còn Recognition tạo certificate sau `SeasonClosedEvent` và quản lý coupon eligibility.
- Số 20 queue trên slide thuộc phiên bản cũ. Từ 20/09/2026 có 23 queue nghiệp vụ, gồm đồng bộ rule badge và hai chiều debit coupon. Khi trình bày, nêu số queue và Ready/Unacked quan sát được của lần chạy hiện tại, không suy ra hệ thống không lỗi chỉ từ queue rỗng.
- Một số sơ đồ như slide 6, 9, 14 hơi nhỏ nếu chiếu xa. Khi thuyết trình nên dùng laser/mouse chỉ theo luồng chính, không cần đọc hết chữ trong sơ đồ.

## Câu nên thay trong kịch bản

### Slide 6 - Kiến trúc tổng thể

Câu hiện tại nên chỉnh:

> Sau khi action được approve, Action publish event qua RabbitMQ để các service như Reward, Report, Notification, Recognition và Leaderboard xử lý tiếp.

Câu đề xuất:

> Sau khi action được approve, Action ghi outbox và publish `ActionAcceptedEvent` qua RabbitMQ. Reward, Report và Notification consume event này. Reward sau đó phát `PointsGrantedEvent` để Leaderboard cập nhật rank. Còn Recognition tạo certificate khi Leaderboard close season và phát `SeasonClosedEvent`.

### Slide 10 - Async communication

Câu hiện tại nên chỉnh:

> Event này được các service như Reward, Report, Notification và Recognition consume.

Câu đề xuất:

> `ActionAcceptedEvent` được Reward, Report và Notification consume. Sau khi Reward cấp điểm, service này phát `PointsGrantedEvent` để Leaderboard và Report cập nhật. Certificate không được tạo ngay khi submit hoặc approve, mà được tạo khi một season được đóng và Recognition nhận `SeasonClosedEvent`.

### Slide 13 - Reward, Leaderboard, Recognition

Câu bổ sung:

> Reward Ledger là nguồn sự thật của điểm, Leaderboard là read model tối ưu cho xếp hạng, còn Recognition sở hữu certificate và coupon. Ba phần này không gọi đồng bộ dây chuyền, mà liên kết bằng event để tránh coupling.

### Slide 19 - Kiểm thử

Câu bổ sung:

> Smoke test của em không chỉ gọi từng endpoint riêng lẻ, mà kiểm tra một chuỗi nghiệp vụ thật: đăng nhập, submit minh chứng, review, approve, cộng điểm, cập nhật leaderboard, tạo certificate/coupon, notification và kiểm tra RabbitMQ không còn message tồn đọng.

## Giải thích thuật ngữ nên biết khi trình bày

### Monolith

Monolith là kiểu hệ thống gom nhiều chức năng vào một ứng dụng triển khai chung. Ban đầu dễ làm, nhưng khi nghiệp vụ lớn lên thì code dễ rối, khó scale riêng từng phần và khó thay đổi mà không ảnh hưởng toàn hệ thống.

### Big Ball of Mud

Big Ball of Mud là trạng thái code bị rối, module phụ thuộc lẫn nhau, không còn ranh giới rõ. Đây là rủi ro thường gặp nếu monolith phát triển lâu nhưng không có kiến trúc tốt.

### Modular Monolith

Modular Monolith vẫn là một ứng dụng deploy chung, nhưng bên trong chia module rõ theo nghiệp vụ. Đây có thể là bước trung gian trước khi tách thành microservices.

### Microservices

Microservices là kiến trúc chia hệ thống thành nhiều service nhỏ, mỗi service sở hữu một nghiệp vụ, dữ liệu và API riêng. Ưu điểm là dễ scale, bảo trì và thay đổi độc lập hơn, nhưng vận hành phức tạp hơn monolith.

### Distributed Monolith

Distributed Monolith là trường hợp nhìn bên ngoài giống microservices nhưng thực chất vẫn coupling chặt: dùng chung database, service gọi sync dây chuyền, deploy hoặc thay đổi một service kéo theo nhiều service khác. EcoQuest tránh lỗi này bằng database-per-service, event-driven và Gateway không chứa business logic.

### DDD và Bounded Context

DDD là Domain-Driven Design, tức thiết kế hệ thống xoay quanh nghiệp vụ. Bounded Context là ranh giới nghiệp vụ rõ ràng, trong đó mỗi khái niệm có ý nghĩa nhất quán. EcoQuest tách thành các bounded context như Identity, Catalog, Action, Policy, Reward, Leaderboard, Recognition, Report và Notification.

### Database-per-Service

Database-per-service nghĩa là mỗi service sở hữu database hoặc storage riêng. Service khác không được join trực tiếp database này, mà phải trao đổi qua API hoặc event.

### API Gateway

API Gateway là cửa vào duy nhất cho frontend. Gateway định tuyến request đến service phù hợp, xử lý CORS/correlation ID, nhưng không chứa business logic.

### gRPC

gRPC là giao tiếp đồng bộ hiệu năng cao giữa service với service. Trong EcoQuest, Action gọi Policy bằng gRPC vì cần kết quả kiểm rule ngay trước khi lưu action vào review queue.

### RabbitMQ

RabbitMQ là message broker dùng cho giao tiếp bất đồng bộ. Service publish event lên RabbitMQ, service khác consume event để xử lý tiếp. Cách này giảm coupling và hỗ trợ eventual consistency.

### Integration Event

Integration Event là event dùng để giao tiếp giữa các service. Ví dụ `ActionAcceptedEvent`, `PointsGrantedEvent`, `SeasonClosedEvent`.

### Domain Event

Domain Event thường là sự kiện phát sinh bên trong một domain/service. Integration Event là phiên bản dùng để công bố ra ngoài service.

### Eventual Consistency

Eventual consistency nghĩa là dữ liệu giữa các service không nhất thiết cập nhật cùng một thời điểm, nhưng sau khi event được xử lý xong thì hệ thống sẽ nhất quán. Ví dụ action được approve trước, sau đó Reward cộng điểm, rồi Leaderboard cập nhật rank.

### Transactional Outbox

Transactional Outbox giải quyết lỗi dual-write: cập nhật database thành công nhưng publish message thất bại. Service ghi event vào bảng/outbox cùng transaction với nghiệp vụ, sau đó worker publish message lên RabbitMQ và retry nếu lỗi.

### CQRS

CQRS là tách command path và query path. Trong EcoQuest, các service nghiệp vụ xử lý command, còn Report Service tự xây read model để phục vụ dashboard/export PDF mà không join database chéo.

### Idempotency

Idempotency giúp cùng một request/event nếu bị gửi lại nhiều lần thì kết quả vẫn không bị nhân đôi. Ví dụ không cộng điểm hai lần cho cùng một `sourceActionId`.

### MinIO/Object Storage

MinIO là object storage tương tự S3, dùng để lưu file như avatar, ảnh/video minh chứng, ảnh station, evidence report và certificate PDF. Database chỉ lưu key/URL, không lưu file lớn trực tiếp.

### JWT và RBAC

JWT là token xác thực người dùng. RBAC là phân quyền theo vai trò. Trong EcoQuest có Student, Moderator và Admin; frontend chỉ hỗ trợ điều hướng, còn backend mới là nơi enforce quyền thật.

### Smoke Test

Smoke test là kiểm thử nhanh nhưng bao phủ các luồng sống còn của hệ thống. Với EcoQuest, smoke test kiểm tra end-to-end qua Gateway, Policy gRPC, RabbitMQ event, database, MinIO, notification, leaderboard và certificate.

### Queue Drain

Queue drain nghĩa là sau khi chạy test, các queue RabbitMQ không còn message pending. Điều này chứng minh consumer đã xử lý hết event, không bị kẹt message.

## Câu hỏi vấn đáp có thể gặp và trả lời gợi ý

### 1. Vì sao đề tài này phù hợp với microservices?

Vì hệ thống có nhiều nhóm nghiệp vụ tách biệt: Identity, Catalog, Action, Policy, Reward, Leaderboard, Recognition, Report và Notification. Mỗi nhóm có dữ liệu, lifecycle và logic riêng. Nếu gom vào một service/database chung thì dễ coupling mạnh và khó mở rộng.

### 2. Vì sao gọi đây là microservices chứ không phải monolith?

Vì project tách thành 9 service riêng theo bounded context, có data ownership riêng, frontend đi qua API Gateway, service giao tiếp bằng gRPC/RabbitMQ, không join database chéo và Gateway không chứa business logic.

### 3. Project tránh distributed monolith như thế nào?

Project tránh shared database, tránh để Gateway xử lý nghiệp vụ, tránh service đọc database của service khác. Các dữ liệu liên service được trao đổi qua API hoặc integration event.

### 4. Vì sao không dùng một database chung cho toàn hệ thống?

Nếu dùng một database chung thì các service dễ phụ thuộc schema của nhau, thay đổi một bảng có thể ảnh hưởng nhiều service. Database-per-service giúp mỗi service tự quản lý dữ liệu và triển khai độc lập hơn.

### 5. Nếu không join database chéo thì Report lấy dữ liệu từ đâu?

Report Service consume integration events từ RabbitMQ và tự xây analytics read model trong `report_db`. Dashboard và export PDF chỉ đọc từ `report_db`, không join sang database khác.

### 6. Vì sao Action gọi Policy bằng gRPC mà không dùng RabbitMQ?

Vì khi submit action, Action cần biết ngay rule có hợp lệ hay không để quyết định lưu vào `PENDING_REVIEW` hoặc reject. Đây là giao tiếp đồng bộ, nên gRPC phù hợp hơn RabbitMQ.

### 7. Vì sao Reward/Leaderboard/Notification dùng event bất đồng bộ?

Vì đây là hậu xử lý sau khi action được duyệt. Action không cần chờ toàn bộ service phía sau xử lý xong. Publish event qua RabbitMQ giúp giảm coupling và tăng khả năng mở rộng.

### 8. Submit action có cộng điểm ngay không?

Không. Student submit thành công thì action vào `PENDING_REVIEW`. Chỉ khi Moderator hoặc Admin approve thì Action mới publish event, Reward mới cộng điểm.

### 9. Vì sao cần Moderator/Admin review?

Vì minh chứng có thể sai, trùng hoặc không hợp lệ. Review giúp đảm bảo điểm thưởng phản ánh hành động thật.

### 10. Transactional Outbox giải quyết vấn đề gì?

Nó giải quyết dual-write problem: nếu cập nhật action thành accepted nhưng publish RabbitMQ thất bại thì các service sau không nhận được event. Outbox lưu event cùng persistence boundary để worker publish sau và retry nếu lỗi.

### 11. Nếu RabbitMQ gửi trùng event thì sao?

Consumer phải idempotent. Ví dụ Reward dùng `sourceActionId` để tránh cộng điểm trùng cho cùng một action.

### 12. Eventual consistency có làm hệ thống sai không?

Không, nhưng dữ liệu có thể trễ trong thời gian ngắn. Ví dụ action vừa approve thì vài giây sau wallet/leaderboard/report mới cập nhật. Đây là đánh đổi bình thường trong microservices.

### 13. Certificate được tạo khi nào?

Certificate không tạo ngay khi submit hoặc approve. Certificate được tạo khi Admin đóng season, Leaderboard tạo snapshot và phát `SeasonClosedEvent`; Recognition nhận event đó để tạo PDF certificate.

### 14. Coupon hoạt động như thế nào?

Recognition sở hữu coupon/reward offer. Student chỉ claim được coupon khi thỏa điều kiện như đủ điểm, có badge/certificate liên quan, coupon còn hiệu lực và còn số lượng.

### 15. Badge đạt được khi nào?

Badge do Reward Ledger xét dựa trên điểm hoặc điều kiện nghiệp vụ đã cấu hình. Khi action được approve và điểm được cấp, Reward kiểm tra điều kiện badge rồi cập nhật badge của student.

### 16. Leaderboard dùng Redis để làm gì?

Leaderboard dùng Redis sorted set để cập nhật và truy vấn rank nhanh theo điểm. PostgreSQL vẫn có thể lưu snapshot/season, còn Redis tối ưu cho dữ liệu xếp hạng realtime.

### 17. MinIO dùng để làm gì?

MinIO lưu file lớn như avatar, ảnh/video minh chứng, ảnh station, report evidence và certificate PDF. Service sở hữu nghiệp vụ sẽ quản lý bucket/file tương ứng.

### 18. Vì sao không để frontend upload trực tiếp vào MinIO?

Vì như vậy frontend sẽ vượt qua service ownership. Trong project, frontend upload qua API của service chủ quản để service kiểm quyền, validate và lưu metadata đúng nghiệp vụ.

### 19. Gateway có xử lý nghiệp vụ không?

Không. Gateway chỉ route request, CORS và correlation ID. Business logic nằm ở service sở hữu domain.

### 20. Frontend có quyết định quyền thật không?

Không. Frontend chỉ hiển thị menu và điều hướng theo role. Backend mới enforce quyền thật bằng JWT/RBAC ở từng service.

### 21. Admin có quyền làm gì?

Admin quản lý user, catalog, policy rules, adjust points, reports/analytics, reward offers và close season. Admin cũng bị chặn các thao tác nguy hiểm như tự ban hoặc tự đổi role không hợp lệ.

### 22. Moderator khác Admin ở đâu?

Moderator tập trung review action/report và tạo mission ở trạng thái pending. Admin có quyền quản trị hệ thống rộng hơn như user, policy, catalog approval, analytics và reward offers.

### 23. Vì sao có service Policy riêng?

Policy tách rule evaluation ra khỏi Action. Nhờ vậy daily limit, rule điểm, action type hoặc mission rule có thể thay đổi mà không nhồi toàn bộ logic vào Action Service.

### 24. Vì sao có service Notification riêng?

Notification là bounded context riêng cho inbox, read/unread và SSE realtime. Các service khác chỉ publish event, Notification tự biến event thành thông báo cho người dùng.

### 25. Vì sao có service Report riêng?

Report cần dashboard, analytics và export PDF. Nếu để Admin query trực tiếp nhiều database thì vi phạm microservices. Report service xây read model riêng để phục vụ truy vấn báo cáo.

### 26. Smoke test hiện kiểm những gì?

Smoke test kiểm Gateway health, auth, Catalog CRUD, Policy rules, submit action, review approve/reject, Reward Ledger, badge, Leaderboard, certificate/coupon, Notification, Report và RabbitMQ queue drain.

### 27. Vì sao cần kiểm RabbitMQ queue còn 0 pending messages?

Vì test API pass chưa đủ. Queue còn message pending nghĩa là consumer chưa xử lý hết event. Queue drain về 0 chứng minh event pipeline hoạt động.

### 28. CI/CD đã có chưa?

Project hiện có build/test script và Docker Compose để kiểm chứng local. CI/CD đầy đủ có thể bổ sung ở hướng phát triển bằng GitHub Actions/GitLab CI để tự động build, test, scan và publish image.

### 29. Nếu deploy production thì cần thêm gì?

Cần Kubernetes hoặc nền tảng orchestration, secrets manager, centralized logging, metrics, distributed tracing, DLQ, retry/backoff rõ ràng, backup/restore và CI/CD.

### 30. MassTransit/EF Core trong note SE361 có dùng không?

Không, vì project này dùng Java/Spring chứ không phải .NET. Thành phần tương đương là Spring AMQP/RabbitMQ cho messaging, Spring Data JPA/Hibernate cho PostgreSQL và Mongo repository cho MongoDB.

### 31. Saga có dùng trong project chưa?

Project hiện chủ yếu dùng event choreography và Outbox cho luồng reward/report/notification. Saga đầy đủ có thể là hướng phát triển nếu có luồng transaction phân tán phức tạp hơn, ví dụ hoàn điểm, hoàn coupon hoặc nhiều bước cần compensation.

### 32. CQRS trong project nằm ở đâu rõ nhất?

Rõ nhất ở Report Service. Command path nằm ở các service nghiệp vụ như Action/Reward/Recognition, còn query path cho dashboard/export được phục vụ từ read model của Report.

### 33. Nếu Policy Service bị lỗi thì Action xử lý thế nào?

Action dùng Resilience4j circuit breaker để cô lập lỗi. Trong demo, request có thể trả lỗi phù hợp thay vì làm sập toàn bộ hệ thống.

### 34. Vì sao Action dùng MongoDB?

Action/evidence có cấu trúc linh hoạt, có thể nhiều ảnh hoặc video, metadata thay đổi theo loại mission. MongoDB phù hợp với dữ liệu document linh hoạt này.

### 35. Vì sao Identity, Catalog, Reward dùng PostgreSQL?

Các service này có dữ liệu quan hệ và transaction rõ hơn, ví dụ user, role, mission, wallet, transaction, coupon. PostgreSQL phù hợp hơn cho ràng buộc và truy vấn quan hệ.

### 36. Nếu thầy hỏi “đâu là nguồn sự thật của điểm?” thì trả lời sao?

Reward Ledger là nguồn sự thật của điểm và transaction. Leaderboard chỉ là read model tối ưu cho xếp hạng.

### 37. Nếu thầy hỏi “đâu là nguồn sự thật của certificate/coupon?” thì trả lời sao?

Recognition Service là nguồn sự thật của certificate, coupon catalog, coupon claim và eligibility.

### 38. Nếu thầy hỏi “đâu là nguồn sự thật của action?” thì trả lời sao?

Eco Action Service là nguồn sự thật của action submission, evidence, trạng thái review và outbox event liên quan đến action.

### 39. Nếu thầy hỏi “hệ thống có điểm yếu gì?” thì trả lời sao?

Hiện project phù hợp demo/local bằng Docker Compose. Nếu triển khai production cần bổ sung observability, CI/CD đầy đủ, Kubernetes, secret management, DLQ/retry policy nâng cao, backup/restore và load test.

### 40. Nếu thầy hỏi “microservices có làm hệ thống phức tạp hơn không?” thì trả lời sao?

Có. Microservices tăng độ phức tạp vận hành, debug và consistency. Nhưng với EcoQuest, nghiệp vụ có ranh giới rõ và cần nhiều luồng hậu xử lý độc lập, nên microservices là lựa chọn hợp lý trong phạm vi đồ án.

## Gợi ý cách nói ngắn khi demo

1. Đầu tiên mở frontend, đăng nhập theo từng role để chứng minh RBAC.
2. Với Student, submit mission và nhấn mạnh action vào `PENDING_REVIEW`.
3. Với Moderator/Admin, approve action trong review queue.
4. Quay lại Student để thấy wallet/leaderboard/notification cập nhật sau event.
5. Mở RabbitMQ dashboard để chỉ queue, exchange và pending messages.
6. Mở MinIO để chỉ bucket evidence/certificate.
7. Mở Admin Report để chỉ CQRS read model và export PDF.
8. Nếu có thời gian, chạy smoke test và giải thích queue drain.

## Câu kết thúc phần microservices

> Tóm lại, điểm chính của EcoQuest không chỉ là có nhiều service, mà là mỗi service có bounded context, data ownership và cách giao tiếp rõ ràng. Gateway không chứa nghiệp vụ, database không dùng chung, các luồng hậu xử lý đi qua RabbitMQ, còn các luồng cần phản hồi ngay dùng gRPC. Đây là những điểm giúp hệ thống tránh distributed monolith và thể hiện đúng tinh thần microservices trong phạm vi đồ án.
