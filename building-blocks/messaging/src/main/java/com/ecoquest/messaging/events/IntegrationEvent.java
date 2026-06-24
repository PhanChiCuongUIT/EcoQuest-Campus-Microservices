package com.ecoquest.messaging.events;

import java.time.Instant;

public interface IntegrationEvent {
    String eventId();
    Instant occurredOn();
}
