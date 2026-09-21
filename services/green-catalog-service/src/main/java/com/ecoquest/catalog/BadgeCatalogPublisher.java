package com.ecoquest.catalog;

import com.ecoquest.messaging.events.BadgeCatalogSnapshot;
import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import java.time.Instant;

@Configuration
@EnableScheduling
class BadgeCatalogPublisher {
    private final BadgeDefinitionRepository badges;
    private final RabbitTemplate rabbit;
    BadgeCatalogPublisher(BadgeDefinitionRepository badges, RabbitTemplate rabbit) { this.badges = badges; this.rabbit = rabbit; }
    // Repeated full snapshots also recover missed publishes and fresh consumers.
    @Scheduled(initialDelay = 15000, fixedDelay = 15000)
    void publish() {
        rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, "catalog.badges.snapshot.v1", new BadgeCatalogSnapshot(Instant.now(),
                badges.findAll().stream().map(b -> new BadgeCatalogSnapshot.Definition(b.code, b.name, b.criteriaType,
                        b.requiredPoints, b.actionType, b.requiredCount == null ? 0 : b.requiredCount,
                        !Boolean.FALSE.equals(b.active), b.imageUrl)).toList()));
    }
}
