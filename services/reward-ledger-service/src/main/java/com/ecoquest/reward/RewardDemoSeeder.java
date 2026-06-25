package com.ecoquest.reward;

import com.ecoquest.reward.domain.model.BadgeAchievement;
import com.ecoquest.reward.domain.model.RewardTransaction;
import com.ecoquest.reward.domain.model.RewardWallet;
import com.ecoquest.reward.infrastructure.persistence.BadgeAchievementRepository;
import com.ecoquest.reward.infrastructure.persistence.RewardTransactionRepository;
import com.ecoquest.reward.infrastructure.persistence.RewardWalletRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

@Component
class RewardDemoSeeder implements CommandLineRunner {
    private final RewardWalletRepository wallets;
    private final RewardTransactionRepository transactions;
    private final BadgeAchievementRepository badges;

    RewardDemoSeeder(RewardWalletRepository wallets, RewardTransactionRepository transactions,
                     BadgeAchievementRepository badges) {
        this.wallets = wallets;
        this.transactions = transactions;
        this.badges = badges;
    }

    @Override
    public void run(String... args) {
        DemoTx[] txs = {
                new DemoTx("DEMO-TX-001", "SV001", "DEMO-ACTION-001", "MISSION-RECYCLE-01", "RECYCLE_BOTTLE", 10, 1),
                new DemoTx("DEMO-TX-002", "SV003", "DEMO-ACTION-003", "MISSION-CHECKIN-01", "GREEN_CHECKIN", 5, 3),
                new DemoTx("DEMO-TX-003", "SV005", "DEMO-ACTION-005", "MISSION-ENERGY-01", "ENERGY_SAVING", 20, 5),
                new DemoTx("DEMO-TX-004", "SV006", "DEMO-ACTION-006", "MISSION-TREE-01", "TREE_CARE", 25, 6),
                new DemoTx("DEMO-TX-005", "SV007", "DEMO-ACTION-007", "MISSION-BIKE-01", "BIKE_TO_CAMPUS", 12, 8),
                new DemoTx("DEMO-TX-006", "SV008", "DEMO-ACTION-008", "MISSION-REFILL-01", "WATER_REFILL", 8, 10),
                new DemoTx("DEMO-TX-007", "SV001", "DEMO-ACTION-009", "MISSION-COMPOST-01", "COMPOST_WASTE", 14, 12),
                new DemoTx("DEMO-TX-008", "SV002", "DEMO-ACTION-010", "MISSION-EWASTE-01", "EWASTE_DROPOFF", 22, 14),
                new DemoTx("DEMO-TX-009", "SV003", "DEMO-ACTION-011", "MISSION-PLASTIC-01", "PLASTIC_FREE_LUNCH", 16, 18),
                new DemoTx("DEMO-TX-010", "SV004", "DEMO-ACTION-012", "MISSION-CARPOOL-01", "CARPOOL_TO_CAMPUS", 18, 21),
                new DemoTx("DEMO-TX-011", "SV005", "DEMO-ACTION-013", "MISSION-RECYCLE-01", "RECYCLE_BOTTLE", 10, 27),
                new DemoTx("DEMO-TX-012", "SV006", "DEMO-ACTION-014", "MISSION-CLEANUP-01", "CLEANUP_EVENT", 30, 35),
                new DemoTx("DEMO-TX-013", "SV008", "DEMO-ACTION-016", "MISSION-ENERGY-01", "ENERGY_SAVING", 20, 53),
                new DemoTx("DEMO-TX-014", "SV001", "DEMO-ACTION-017", "MISSION-REFILL-01", "WATER_REFILL", 8, 66),
                new DemoTx("DEMO-TX-015", "SV002", "DEMO-ACTION-018", "MISSION-BIKE-01", "BIKE_TO_CAMPUS", 12, 76),
                new DemoTx("DEMO-TX-016", "SV004", "DEMO-ACTION-020", "MISSION-COMPOST-01", "COMPOST_WASTE", 14, 110),
                new DemoTx("DEMO-TX-017", "SV005", "DEMO-ACTION-021", "MISSION-EWASTE-01", "EWASTE_DROPOFF", 22, 145),
                new DemoTx("DEMO-TX-018", "SV006", "DEMO-ACTION-022", "MISSION-PLASTIC-01", "PLASTIC_FREE_LUNCH", 16, 180),
                new DemoTx("DEMO-TX-019", "SV007", "DEMO-ACTION-023", "MISSION-CARPOOL-01", "CARPOOL_TO_CAMPUS", 18, 220),
                new DemoTx("DEMO-TX-020", "SV008", "DEMO-ACTION-024", "MISSION-RECYCLE-01", "RECYCLE_BOTTLE", 10, 300)
        };
        Map<String, Integer> totals = new HashMap<>();
        for (DemoTx tx : txs) {
            totals.merge(tx.studentId(), tx.points(), Integer::sum);
            if (!transactions.existsBySourceActionId(tx.sourceActionId())) {
                RewardTransaction record = new RewardTransaction();
                record.id = tx.id();
                record.studentId = tx.studentId();
                record.sourceActionId = tx.sourceActionId();
                record.missionId = tx.missionId();
                record.actionType = tx.actionType();
                record.reason = "Demo seed accepted action.";
                record.points = tx.points();
                record.occurredOn = Instant.now().minus(tx.daysAgo(), ChronoUnit.DAYS);
                transactions.save(record);
            }
        }
        totals.forEach((studentId, points) -> {
            RewardWallet wallet = wallets.findById(studentId).orElseGet(() -> {
                RewardWallet created = new RewardWallet();
                created.studentId = studentId;
                return created;
            });
            wallet.totalPoints = Math.max(wallet.totalPoints, points);
            wallets.save(wallet);
        });
        badge("DEMO-BADGE-SV001-STARTER", "SV001", "GREEN_STARTER", "Green Starter", 12);
        badge("DEMO-BADGE-SV002-STARTER", "SV002", "GREEN_STARTER", "Green Starter", 14);
        badge("DEMO-BADGE-SV005-ZERO", "SV005", "ZERO_WASTE_ADVOCATE", "Zero Waste Advocate", 27);
        badge("DEMO-BADGE-SV006-TREE", "SV006", "CLEANUP_CHAMPION", "Cleanup Champion", 35);
        badge("DEMO-BADGE-SV008-REFILL", "SV008", "GREEN_STARTER", "Green Starter", 53);
    }

    private void badge(String id, String studentId, String code, String name, long daysAgo) {
        if (badges.existsById(id) || badges.existsByStudentIdAndBadgeCode(studentId, code)) {
            return;
        }
        BadgeAchievement badge = new BadgeAchievement();
        badge.id = id;
        badge.studentId = studentId;
        badge.badgeCode = code;
        badge.badgeName = name;
        badge.unlockedOn = Instant.now().minus(daysAgo, ChronoUnit.DAYS);
        badges.save(badge);
    }

    private record DemoTx(String id, String studentId, String sourceActionId, String missionId, String actionType,
                          int points, long daysAgo) {
    }
}
