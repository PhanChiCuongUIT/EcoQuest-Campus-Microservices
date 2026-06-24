package com.ecoquest.notification;

import com.ecoquest.common.security.RoleAuthorizer;
import com.ecoquest.common.security.JwtPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;

@RestController
@RequestMapping("/notifications")
class NotificationController {
    private final NotificationRepository notifications;
    private final NotificationService notificationService;

    NotificationController(NotificationRepository notifications, NotificationService notificationService) {
        this.notifications = notifications;
        this.notificationService = notificationService;
    }

    @GetMapping
    List<UserNotification> list(HttpServletRequest request) {
        var principal = RoleAuthorizer.principal(request);
        return notificationsFor(principal);
    }

    @GetMapping("/stream")
    SseEmitter stream(HttpServletRequest request) {
        var principal = RoleAuthorizer.principal(request);
        return notificationService.stream(keysFor(principal));
    }

    @PostMapping
    UserNotification create(@Valid @RequestBody CreateNotificationRequest request, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        return notificationService.create(request);
    }

    @PutMapping("/{id}/read")
    UserNotification markRead(@PathVariable String id, HttpServletRequest request) {
        var principal = RoleAuthorizer.principal(request);
        var notification = notifications.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found."));
        if (!isRecipient(notification, principal.studentId(), principal.userId(), principal.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Notification does not belong to this user.");
        }
        notification.read = true;
        notification.readAt = Instant.now();
        return notifications.save(notification);
    }

    @PutMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void markAllRead(HttpServletRequest request) {
        var principal = RoleAuthorizer.principal(request);
        var items = notificationsFor(principal);
        for (var item : items) {
            item.read = true;
            item.readAt = Instant.now();
        }
        notifications.saveAll(items);
    }

    private List<UserNotification> notificationsFor(JwtPrincipal principal) {
        var byId = new LinkedHashMap<String, UserNotification>();
        var items = new ArrayList<UserNotification>();
        if (principal.studentId() != null) {
            items.addAll(notifications.findByStudentIdOrderByCreatedAtDesc(principal.studentId()));
        }
        if (principal.userId() != null) {
            items.addAll(notifications.findByUserIdOrderByCreatedAtDesc(principal.userId()));
        }
        if (principal.role() != null) {
            items.addAll(notifications.findByRoleOrderByCreatedAtDesc(principal.role()));
        }
        for (var item : items) {
            byId.put(item.id, item);
        }
        return byId.values().stream()
                .sorted(Comparator.comparing((UserNotification item) -> item.createdAt).reversed())
                .toList();
    }

    private List<String> keysFor(JwtPrincipal principal) {
        var keys = new ArrayList<String>();
        if (principal.studentId() != null) {
            keys.add(principal.studentId());
        }
        if (principal.userId() != null) {
            keys.add(principal.userId());
        }
        if (principal.role() != null) {
            keys.add(principal.role());
        }
        return keys;
    }

    private boolean isRecipient(UserNotification notification, String studentId, String userId, String role) {
        return (notification.studentId != null && notification.studentId.equals(studentId))
                || (notification.userId != null && notification.userId.equals(userId))
                || (notification.role != null && notification.role.equals(role));
    }
}
