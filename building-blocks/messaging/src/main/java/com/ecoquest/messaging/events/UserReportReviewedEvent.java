package com.ecoquest.messaging.events;

import java.time.Instant;

public record UserReportReviewedEvent(
        String eventId,
        Instant occurredOn,
        String reportId,
        String reporterUserId,
        String reporterStudentId,
        String targetType,
        String targetId,
        String status,
        String note,
        String reviewedByUserId
) implements IntegrationEvent {
}
