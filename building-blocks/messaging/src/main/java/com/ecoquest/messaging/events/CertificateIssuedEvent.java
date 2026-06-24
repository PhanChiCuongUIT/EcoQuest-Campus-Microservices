package com.ecoquest.messaging.events;

import java.time.Instant;

public record CertificateIssuedEvent(
        String eventId,
        Instant occurredOn,
        String certificateId,
        String studentId,
        String certificateType,
        String objectKey
) implements IntegrationEvent {
}
