package com.ecoquest.messaging.events;

import java.time.Instant;

public record EcoActionRejectedEvent(
        String eventId,
        Instant occurredOn,
        String actionId,
        String studentId,
        String missionId,
        String actionType,
        String reason
) implements IntegrationEvent {
}
