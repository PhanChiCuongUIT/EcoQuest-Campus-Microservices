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
        int points,
        String missionTitle
) implements IntegrationEvent {
    public EcoActionAcceptedEvent(String eventId, Instant occurredOn, String actionId, String studentId,
                                  String missionId, String stationId, String actionType, int points) {
        this(eventId, occurredOn, actionId, studentId, missionId, stationId, actionType, points, null);
    }
}
