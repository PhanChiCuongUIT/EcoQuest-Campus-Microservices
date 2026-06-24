package com.ecoquest.messaging.events;

import java.time.Instant;

public record BadgeUnlockedEvent(
        String eventId,
        Instant occurredOn,
        String studentId,
        String badgeCode,
        String badgeName
) implements IntegrationEvent {
}
