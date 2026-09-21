package com.ecoquest.reward.application;

import com.ecoquest.messaging.events.BadgeUnlockedEvent;
import com.ecoquest.messaging.events.EcoActionAcceptedEvent;
import com.ecoquest.messaging.events.PointsGrantedEvent;
import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import com.ecoquest.reward.domain.model.BadgeAchievement;
import com.ecoquest.reward.domain.model.RewardTransaction;
import com.ecoquest.reward.domain.model.RewardWallet;
import com.ecoquest.reward.domain.valueobject.Points;
import com.ecoquest.reward.infrastructure.messaging.RewardMessagingConfig;
import com.ecoquest.reward.infrastructure.persistence.BadgeAchievementRepository;
import com.ecoquest.reward.infrastructure.persistence.RewardTransactionRepository;
import com.ecoquest.reward.infrastructure.persistence.RewardWalletRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class RewardLedgerService {
    private final RewardWalletRepository wallets;
    private final RewardTransactionRepository transactions;
    private final BadgeAchievementRepository badges;
    private final RabbitTemplate rabbit;
    private final BadgeRuleProjectionRepository rules;

    public RewardLedgerService(RewardWalletRepository wallets, RewardTransactionRepository transactions,
                               BadgeAchievementRepository badges, RabbitTemplate rabbit, BadgeRuleProjectionRepository rules) {
        this.wallets = wallets;
        this.transactions = transactions;
        this.badges = badges;
        this.rabbit = rabbit;
        this.rules = rules;
    }

    @RabbitListener(queues = RewardMessagingConfig.ACTION_ACCEPTED_QUEUE)
    @Transactional
    public void onActionAccepted(EcoActionAcceptedEvent event) {
        if (transactions.existsBySourceActionId(event.actionId())) {
            return;
        }
        RewardWallet wallet = wallets.findById(event.studentId()).orElseGet(() -> {
            RewardWallet created = new RewardWallet();
            created.studentId = event.studentId();
            return created;
        });
        wallet.grant(new Points(event.points()));
        wallets.save(wallet);

        RewardTransaction tx = new RewardTransaction();
        tx.id = UUID.randomUUID().toString();
        tx.studentId = event.studentId();
        tx.sourceActionId = event.actionId();
        tx.missionId = event.missionId();
        tx.actionType = event.actionType();
        tx.reason = "Approved mission: " + (event.missionTitle() == null ? event.actionType().replace('_', ' ') : event.missionTitle());
        tx.points = event.points();
        tx.occurredOn = Instant.now();
        transactions.save(tx);

        rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, EcoQuestRabbit.POINTS_GRANTED,
                new PointsGrantedEvent(UUID.randomUUID().toString(), Instant.now(), wallet.studentId, event.actionId(),
                        event.points(), wallet.totalPoints));
        unlockBadges(wallet);
    }

    @Transactional
    public RewardTransaction grantManualAdjustment(String studentId, int points, String reason, String adjustedByUserId) {
        if (studentId == null || studentId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "studentId is required.");
        }
        if (points == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Adjustment cannot be zero.");
        }
        if (reason == null || reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Adjustment reason is required.");
        }
        RewardWallet wallet = wallets.findById(studentId).orElseGet(() -> {
            RewardWallet created = new RewardWallet();
            created.studentId = studentId;
            return created;
        });
        try {
            wallet.adjust(new Points(points));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage());
        }
        wallets.save(wallet);

        RewardTransaction tx = new RewardTransaction();
        tx.id = UUID.randomUUID().toString();
        tx.studentId = studentId;
        tx.sourceActionId = "ADMIN-ADJUSTMENT-" + tx.id;
        tx.actionType = "ADMIN_ADJUSTMENT";
        tx.reason = reason.trim();
        tx.adjustedByUserId = adjustedByUserId;
        tx.points = points;
        tx.occurredOn = Instant.now();
        transactions.save(tx);

        rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, EcoQuestRabbit.POINTS_GRANTED,
                new PointsGrantedEvent(UUID.randomUUID().toString(), Instant.now(), wallet.studentId, tx.sourceActionId,
                        points, wallet.totalPoints));
        unlockBadges(wallet);
        return tx;
    }

    private void unlockBadges(RewardWallet wallet) {
        for (BadgeRuleProjection rule : rules.findAll()) {
            if (!rule.active) continue;
            if (isRuleMet(wallet, rule) && !badges.existsByStudentIdAndBadgeCode(wallet.studentId, rule.code)) {
                BadgeAchievement badge = new BadgeAchievement();
                badge.id = UUID.randomUUID().toString();
                badge.studentId = wallet.studentId;
                badge.badgeCode = rule.code;
                badge.badgeName = rule.name;
                badge.unlockedOn = Instant.now();
                badges.save(badge);
                rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, EcoQuestRabbit.BADGE_UNLOCKED,
                        new BadgeUnlockedEvent(UUID.randomUUID().toString(), Instant.now(), wallet.studentId, rule.code, rule.name));
            }
        }
    }

    @Transactional
    public void reevaluateBadges() { wallets.findAll().forEach(this::unlockBadges); }

    private boolean isRuleMet(RewardWallet wallet, BadgeRuleProjection rule) {
        if ("POINTS".equals(rule.criteriaType) && wallet.totalPoints < rule.requiredPoints) {
            return false;
        }
        if ("ACTION_COUNT".equals(rule.criteriaType)) {
            return transactions.countByStudentIdAndActionType(wallet.studentId, rule.actionType) >= rule.requiredCount;
        }
        return true;
    }

    private record BadgeRule(String code, String name, Integer requiredPoints, String actionType, long requiredActionCount) {
        static BadgeRule points(String code, String name, int points) {
            return new BadgeRule(code, name, points, null, 0);
        }

        static BadgeRule actionCount(String code, String name, String actionType, long count) {
            return new BadgeRule(code, name, null, actionType, count);
        }
    }
}
