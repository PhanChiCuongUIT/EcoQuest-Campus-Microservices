package com.ecoquest.reward.application;

import com.ecoquest.messaging.events.BadgeCatalogSnapshot;
import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import jakarta.persistence.*;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;

@Entity
class BadgeRuleProjection {
    @Id public String code;
    public String name;
    public String criteriaType;
    public int requiredPoints;
    public String actionType;
    public int requiredCount;
    public boolean active;
    public String imageUrl;
    public Instant updatedAt;
}
interface BadgeRuleProjectionRepository extends JpaRepository<BadgeRuleProjection, String> {}

@Configuration
class BadgeProjectionConfig {
    @Bean Declarables badgeBindings() {
        var queue = new Queue("reward.badge-catalog", true);
        return new Declarables(queue, BindingBuilder.bind(queue).to(new TopicExchange(EcoQuestRabbit.EXCHANGE)).with("catalog.badges.snapshot.v1"));
    }
}

@Service
class BadgeCatalogProjection {
    private final BadgeRuleProjectionRepository rules;
    private final RewardLedgerService ledger;
    BadgeCatalogProjection(BadgeRuleProjectionRepository rules, RewardLedgerService ledger) { this.rules = rules; this.ledger = ledger; }
    @RabbitListener(queues = "reward.badge-catalog")
    @Transactional
    public void update(BadgeCatalogSnapshot snapshot) {
        boolean changed = false;
        for (var d : snapshot.definitions()) {
            var r = rules.findById(d.code()).orElseGet(BadgeRuleProjection::new);
            if (r.updatedAt != null && !r.updatedAt.isBefore(snapshot.occurredOn())) continue;
            changed |= r.code == null || !java.util.Objects.equals(r.name, d.name()) || !java.util.Objects.equals(r.criteriaType, d.criteriaType())
                    || r.requiredPoints != d.requiredPoints() || r.requiredCount != d.requiredCount()
                    || !java.util.Objects.equals(r.actionType, d.actionType()) || r.active != d.active();
            r.code = d.code(); r.name = d.name(); r.criteriaType = d.criteriaType(); r.requiredPoints = d.requiredPoints();
            r.actionType = d.actionType(); r.requiredCount = d.requiredCount(); r.active = d.active(); r.imageUrl = d.imageUrl(); r.updatedAt = snapshot.occurredOn();
            rules.save(r);
        }
        if (changed) ledger.reevaluateBadges();
    }
}
