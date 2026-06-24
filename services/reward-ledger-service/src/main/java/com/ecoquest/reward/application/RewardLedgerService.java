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

    public RewardLedgerService(RewardWalletRepository wallets, RewardTransactionRepository transactions,
                               BadgeAchievementRepository badges, RabbitTemplate rabbit) {
        this.wallets = wallets;
        this.transactions = transactions;
        this.badges = badges;
        this.rabbit = rabbit;
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
        List<BadgeRule> rules = List.of(
                BadgeRule.points("GREEN_STARTER", "Green Starter", 10),
                BadgeRule.actionCount("RECYCLING_HERO", "Recycling Hero", "RECYCLE_BOTTLE", 10),
                BadgeRule.actionCount("CLEANUP_CHAMPION", "Cleanup Champion", "CLEANUP_EVENT", 3),
                BadgeRule.points("ZERO_WASTE_ADVOCATE", "Zero Waste Advocate", 250),
                BadgeRule.points("GREEN_AMBASSADOR", "Green Ambassador", 300),
                BadgeRule.points("CAMPUS_GUARDIAN", "Campus Guardian", 500)
        );
        for (BadgeRule rule : rules) {
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

    private boolean isRuleMet(RewardWallet wallet, BadgeRule rule) {
        if (rule.requiredPoints != null && wallet.totalPoints < rule.requiredPoints) {
            return false;
        }
        if (rule.actionType != null) {
            return transactions.countByStudentIdAndActionType(wallet.studentId, rule.actionType) >= rule.requiredActionCount;
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
