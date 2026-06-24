package com.ecoquest.messaging.events;

import java.time.Instant;

public record MissionStatusChangedEvent(
        String eventId,
        Instant occurredOn,
        String missionId,
        String title,
        String status,
        String changedByUserId,
        String createdByUserId
) implements IntegrationEvent {
}
