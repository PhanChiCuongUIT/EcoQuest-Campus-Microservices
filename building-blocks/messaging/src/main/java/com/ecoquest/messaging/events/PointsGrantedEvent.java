package com.ecoquest.messaging.events;

import java.time.Instant;

public record PointsGrantedEvent(
        String eventId,
        Instant occurredOn,
        String studentId,
        String sourceActionId,
        int points,
        int totalPoints
) implements IntegrationEvent {
}
