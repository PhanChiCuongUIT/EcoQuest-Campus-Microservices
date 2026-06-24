package com.ecoquest.messaging.events;

import java.time.Instant;
import java.util.List;

public record LeaderboardSeasonClosedEvent(
        String eventId,
        Instant occurredOn,
        String seasonId,
        String seasonType,
        List<Winner> winners
) implements IntegrationEvent {
    public record Winner(String studentId, int rank, int points) {
    }
}
