package com.ecoquest.messaging.events;

import java.time.Instant;

public record UserRegisteredEvent(
        String eventId,
        Instant occurredOn,
        String userId,
        String email,
        String displayName,
        String role,
        String studentId
) implements IntegrationEvent {
}
