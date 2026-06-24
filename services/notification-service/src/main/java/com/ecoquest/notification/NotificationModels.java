package com.ecoquest.notification;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

@Entity
class UserNotification {
    @Id
    public String id;
    public String userId;
    public String studentId;
    public String role;
    public String type;
    public String title;
    public String message;
    public String link;
    public boolean read;
    public Instant createdAt;
    public Instant readAt;
}

record CreateNotificationRequest(
        String userId,
        String studentId,
        String role,
        @NotBlank String type,
        @NotBlank String title,
        @NotBlank String message,
        String link
) {
}
