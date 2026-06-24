package com.ecoquest.action;

import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
class ActionOutboxService {
    private final OutboxRepository outbox;
    private final RabbitTemplate rabbit;

    ActionOutboxService(OutboxRepository outbox, RabbitTemplate rabbit) {
        this.outbox = outbox;
        this.rabbit = rabbit;
    }

    void enqueue(String routingKey, Object event) {
        var message = new OutboxMessage();
        message.id = UUID.randomUUID().toString();
        message.routingKey = routingKey;
        message.payload = event;
        message.createdAt = Instant.now();
        outbox.save(message);
    }

    @Scheduled(fixedDelayString = "${action.outbox.publish-delay-ms:1000}")
    void publishPending() {
        for (OutboxMessage message : outbox.findTop50ByPublishedAtIsNullOrderByCreatedAtAsc()) {
            try {
                rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, message.routingKey, message.payload);
                message.publishedAt = Instant.now();
                message.lastError = null;
            } catch (Exception ex) {
                message.lastError = ex.getMessage();
            }
            outbox.save(message);
        }
    }
}
