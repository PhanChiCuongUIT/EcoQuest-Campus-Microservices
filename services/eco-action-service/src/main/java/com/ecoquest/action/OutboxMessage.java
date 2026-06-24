package com.ecoquest.action;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("action_outbox")
class OutboxMessage {
    @Id
    public String id;
    public String routingKey;
    public Object payload;
    public Instant createdAt;
    public Instant publishedAt;
    public String lastError;
}
