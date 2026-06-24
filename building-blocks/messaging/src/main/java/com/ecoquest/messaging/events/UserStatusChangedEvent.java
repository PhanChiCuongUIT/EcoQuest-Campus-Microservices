package com.ecoquest.messaging.events;

import java.time.Instant;

public record UserStatusChangedEvent(
        String eventId,
        Instant occurredOn,
        String userId,
        String email,
        String displayName,
        String role,
        String studentId,
        String status,
        String reason
) implements IntegrationEvent {
}
