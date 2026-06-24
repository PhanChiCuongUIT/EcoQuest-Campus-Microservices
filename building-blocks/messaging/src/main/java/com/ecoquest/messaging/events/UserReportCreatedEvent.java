package com.ecoquest.messaging.events;

import java.time.Instant;

public record UserReportCreatedEvent(
        String eventId,
        Instant occurredOn,
        String reportId,
        String reporterUserId,
        String reporterStudentId,
        String reporterRole,
        String targetType,
        String targetId,
        String reason
) implements IntegrationEvent {
}
