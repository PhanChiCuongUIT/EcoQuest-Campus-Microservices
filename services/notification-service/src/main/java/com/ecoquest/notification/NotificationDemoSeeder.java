package com.ecoquest.notification;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
class NotificationDemoSeeder implements CommandLineRunner {
    private final NotificationRepository notifications;

    NotificationDemoSeeder(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    @Override
    public void run(String... args) {
        seed("DEMO-NOTI-STUDENT-WELCOME", null, null, "STUDENT", "WELCOME",
                "Welcome to EcoQuest Campus",
                "Explore active missions, submit evidence, and follow your points from the student dashboard.",
                "/missions", false, 2);
        seed("DEMO-NOTI-STUDENT-REMINDER", null, null, "STUDENT", "MISSION_REMINDER",
                "New missions are available",
                "This week's Green Check-in and Paperless Notes missions are open for submissions.",
                "/missions", false, 7);
        seed("DEMO-NOTI-SV001-BADGE", null, "SV001", null, "BADGE_UNLOCKED",
                "Starter badge unlocked",
                "SV001 unlocked the Green Starter badge from recent accepted actions.",
                "/wallet", false, 18);
        seed("DEMO-NOTI-SV001-CERT", null, "SV001", null, "CERTIFICATE_ISSUED",
                "Certificate ready",
                "A sustainability certificate is ready to preview and download.",
                "/certificates", true, 30);
        seed("DEMO-NOTI-SV009-LEADERBOARD", null, "SV009", null, "LEADERBOARD_PROGRESS",
                "Leaderboard progress",
                "You moved into the top group for this week after recent accepted actions.",
                "/leaderboard", false, 11);

        seed("DEMO-NOTI-MOD-REVIEW", null, null, "MODERATOR", "REVIEW_QUEUE_READY",
                "Review queue needs attention",
                "Several submitted actions are waiting for moderator review.",
                "/review", false, 1);
        seed("DEMO-NOTI-MOD-REPORT", null, null, "MODERATOR", "REPORT_CREATED",
                "New campus report",
                "A student report was submitted and needs a moderation decision.",
                "/reports", false, 4);
        seed("DEMO-NOTI-MOD-MISSION", null, "SVMOD001", null, "MISSION_STATUS_CHANGED",
                "Mission status updated",
                "Your Water Refill mission draft is pending admin approval.",
                "/admin-catalog", true, 26);

        seed("DEMO-NOTI-ADMIN-DIGEST", null, null, "ADMIN", "ADMIN_DAILY_DIGEST",
                "Daily campus digest",
                "New actions, reports, and reward claims are ready in the admin panels.",
                "/reports/analytics", false, 3);
        seed("DEMO-NOTI-ADMIN-POLICY", null, null, "ADMIN", "POLICY_REVIEW",
                "Policy rules review",
                "Review active policy rules before opening the next campaign period.",
                "/policies", false, 20);
        seed("DEMO-NOTI-ADMIN-USER", null, null, "ADMIN", "USER_STATUS_CHANGED",
                "User status audit",
                "Recent user status changes are recorded and can be reviewed in User Management.",
                "/users", true, 40);
    }

    private void seed(String id, String userId, String studentId, String role, String type,
                      String title, String message, String link, boolean read, long hoursAgo) {
        if (notifications.existsById(id)) {
            return;
        }
        var notification = new UserNotification();
        notification.id = id;
        notification.userId = userId;
        notification.studentId = studentId;
        notification.role = role;
        notification.type = type;
        notification.title = title;
        notification.message = message;
        notification.link = link;
        notification.read = read;
        notification.createdAt = Instant.now().minus(hoursAgo, ChronoUnit.HOURS);
        if (read) {
            notification.readAt = notification.createdAt.plus(30, ChronoUnit.MINUTES);
        }
        notifications.save(notification);
    }
}
