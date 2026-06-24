package com.ecoquest.notification;

import com.ecoquest.messaging.events.BadgeUnlockedEvent;
import com.ecoquest.messaging.events.CertificateIssuedEvent;
import com.ecoquest.messaging.events.EcoActionAcceptedEvent;
import com.ecoquest.messaging.events.EcoActionRejectedEvent;
import com.ecoquest.messaging.events.MissionStatusChangedEvent;
import com.ecoquest.messaging.events.UserReportCreatedEvent;
import com.ecoquest.messaging.events.UserReportReviewedEvent;
import com.ecoquest.messaging.events.UserStatusChangedEvent;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
class NotificationService {
    private final NotificationRepository notifications;
    private final Map<String, List<SseEmitter>> streams = new ConcurrentHashMap<>();

    NotificationService(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    UserNotification create(CreateNotificationRequest request) {
        var notification = new UserNotification();
        notification.id = "NOTI-" + UUID.randomUUID();
        notification.userId = request.userId();
        notification.studentId = request.studentId();
        notification.role = request.role();
        notification.type = request.type();
        notification.title = request.title();
        notification.message = request.message();
        notification.link = request.link();
        notification.createdAt = Instant.now();
        var saved = notifications.save(notification);
        emit(saved);
        return saved;
    }

    SseEmitter stream(List<String> keys) {
        var emitter = new SseEmitter(0L);
        var cleanKeys = keys.stream()
                .filter(key -> key != null && !key.isBlank())
                .distinct()
                .toList();
        for (var key : cleanKeys) {
            streams.computeIfAbsent(key, ignored -> new CopyOnWriteArrayList<>()).add(emitter);
        }
        emitter.onCompletion(() -> remove(cleanKeys, emitter));
        emitter.onTimeout(() -> remove(cleanKeys, emitter));
        return emitter;
    }

    @RabbitListener(queues = NotificationMessagingConfig.ACTION_ACCEPTED_QUEUE)
    void onActionAccepted(EcoActionAcceptedEvent event) {
        create(new CreateNotificationRequest(null, event.studentId(), null, "ACTION_ACCEPTED",
                "Action accepted", "Your action %s was accepted and earned %d points."
                .formatted(event.actionId(), event.points()), "/actions"));
    }

    @RabbitListener(queues = NotificationMessagingConfig.ACTION_REJECTED_QUEUE)
    void onActionRejected(EcoActionRejectedEvent event) {
        create(new CreateNotificationRequest(null, event.studentId(), null, "ACTION_REJECTED",
                "Action rejected", "Your action %s was rejected: %s."
                .formatted(event.actionId(), event.reason()), "/actions"));
    }

    @RabbitListener(queues = NotificationMessagingConfig.BADGE_UNLOCKED_QUEUE)
    void onBadgeUnlocked(BadgeUnlockedEvent event) {
        create(new CreateNotificationRequest(null, event.studentId(), null, "BADGE_UNLOCKED",
                "New badge unlocked", "You unlocked %s.".formatted(event.badgeName()), "/wallet"));
    }

    @RabbitListener(queues = NotificationMessagingConfig.CERTIFICATE_ISSUED_QUEUE)
    void onCertificateIssued(CertificateIssuedEvent event) {
        create(new CreateNotificationRequest(null, event.studentId(), null, "CERTIFICATE_ISSUED",
                "New certificate issued", "A new %s certificate is ready.".formatted(event.certificateType()),
                "/certificates"));
    }

    @RabbitListener(queues = NotificationMessagingConfig.MISSION_STATUS_CHANGED_QUEUE)
    void onMissionStatusChanged(MissionStatusChangedEvent event) {
        if (event.createdByUserId() != null && !event.createdByUserId().isBlank()) {
            create(new CreateNotificationRequest(event.createdByUserId(), null, null, "MISSION_STATUS_CHANGED",
                    "Mission status updated",
                    "Mission %s is now %s.".formatted(event.title(), event.status()), "/admin-catalog"));
        }
    }

    @RabbitListener(queues = NotificationMessagingConfig.USER_REPORT_CREATED_QUEUE)
    void onReportCreated(UserReportCreatedEvent event) {
        create(new CreateNotificationRequest(null, null, "ADMIN", "REPORT_CREATED",
                "New report submitted",
                "%s reported %s %s.".formatted(event.reporterRole(), event.targetType(), event.targetId()), "/reports"));
        create(new CreateNotificationRequest(null, null, "MODERATOR", "REPORT_CREATED",
                "New report submitted",
                "%s reported %s %s.".formatted(event.reporterRole(), event.targetType(), event.targetId()), "/reports"));
        if ("USER".equals(event.targetType()) && event.targetId() != null && !event.targetId().isBlank()) {
            create(new CreateNotificationRequest(null, event.targetId(), null, "USER_REPORTED",
                    "You were mentioned in a report",
                    "A report was submitted and will be reviewed by the campus team.", "/reports"));
        }
    }

    @RabbitListener(queues = NotificationMessagingConfig.USER_REPORT_REVIEWED_QUEUE)
    void onReportReviewed(UserReportReviewedEvent event) {
        create(new CreateNotificationRequest(event.reporterUserId(), event.reporterStudentId(), null, "REPORT_REVIEWED",
                "Report reviewed",
                "Your report for %s %s was %s.".formatted(event.targetType(), event.targetId(), event.status()),
                "/reports"));
        if ("USER".equals(event.targetType()) && event.targetId() != null && !event.targetId().isBlank()) {
            create(new CreateNotificationRequest(null, event.targetId(), null, "REPORT_REVIEWED_FOR_USER",
                    "Report decision updated",
                    "A report involving your account was %s.".formatted(event.status()), "/reports"));
        }
    }

    @RabbitListener(queues = NotificationMessagingConfig.USER_STATUS_CHANGED_QUEUE)
    void onUserStatusChanged(UserStatusChangedEvent event) {
        create(new CreateNotificationRequest(event.userId(), event.studentId(), null, "USER_STATUS_CHANGED",
                "Account status changed",
                "Your account status is now %s%s.".formatted(event.status(),
                        event.reason() == null || event.reason().isBlank() ? "" : ": " + event.reason()),
                "/profile"));
    }

    private void emit(UserNotification notification) {
        emitTo(notification.studentId, notification);
        emitTo(notification.userId, notification);
        emitTo(notification.role, notification);
    }

    private void emitTo(String key, UserNotification notification) {
        if (key == null || key.isBlank()) {
            return;
        }
        for (SseEmitter emitter : streams.getOrDefault(key, List.of())) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(notification));
            } catch (IOException ex) {
                remove(key, emitter);
            }
        }
    }

    private void remove(String key, SseEmitter emitter) {
        var list = streams.get(key);
        if (list != null) {
            list.remove(emitter);
        }
    }

    private void remove(List<String> keys, SseEmitter emitter) {
        for (var key : keys) {
            remove(key, emitter);
        }
    }
}
