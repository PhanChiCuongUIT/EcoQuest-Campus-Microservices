package com.ecoquest.messaging.events;

import java.time.Instant;

public record EcoActionAcceptedEvent(
        String eventId,
        Instant occurredOn,
        String actionId,
        String studentId,
        String missionId,
        String stationId,
        String actionType,
        int points
) implements IntegrationEvent {
}
