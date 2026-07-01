package com.ecoquest.action;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
class ActionDemoSeeder implements CommandLineRunner {
    private final EcoActionRepository actions;

    ActionDemoSeeder(EcoActionRepository actions) {
        this.actions = actions;
    }

    @Override
    public void run(String... args) {
        DemoAction[] seed = {
                new DemoAction("DEMO-ACTION-001", "SV001", "MISSION-RECYCLE-01", "STATION-A1", "RECYCLE_BOTTLE", ActionStatus.ACCEPTED, 10, 1),
                new DemoAction("DEMO-ACTION-002", "SV002", "MISSION-CLEANUP-01", null, "CLEANUP_EVENT", ActionStatus.PENDING_REVIEW, 30, 2),
                new DemoAction("DEMO-ACTION-003", "SV003", "MISSION-CHECKIN-01", "STATION-B2", "GREEN_CHECKIN", ActionStatus.ACCEPTED, 5, 3),
                new DemoAction("DEMO-ACTION-004", "SV004", "MISSION-TRASH-01", null, "REPORT_TRASH", ActionStatus.REJECTED, 0, 4),
                new DemoAction("DEMO-ACTION-005", "SV005", "MISSION-ENERGY-01", null, "ENERGY_SAVING", ActionStatus.ACCEPTED, 20, 5),
                new DemoAction("DEMO-ACTION-006", "SV006", "MISSION-TREE-01", "STATION-E5", "TREE_CARE", ActionStatus.ACCEPTED, 25, 6),
                new DemoAction("DEMO-ACTION-007", "SV007", "MISSION-BIKE-01", null, "BIKE_TO_CAMPUS", ActionStatus.ACCEPTED, 12, 8),
                new DemoAction("DEMO-ACTION-008", "SV008", "MISSION-REFILL-01", "STATION-B2", "WATER_REFILL", ActionStatus.ACCEPTED, 8, 10),
                new DemoAction("DEMO-ACTION-009", "SV001", "MISSION-COMPOST-01", "STATION-F6", "COMPOST_WASTE", ActionStatus.ACCEPTED, 14, 12),
                new DemoAction("DEMO-ACTION-010", "SV002", "MISSION-EWASTE-01", "STATION-G7", "EWASTE_DROPOFF", ActionStatus.ACCEPTED, 22, 14),
                new DemoAction("DEMO-ACTION-011", "SV003", "MISSION-PLASTIC-01", null, "PLASTIC_FREE_LUNCH", ActionStatus.ACCEPTED, 16, 18),
                new DemoAction("DEMO-ACTION-012", "SV004", "MISSION-CARPOOL-01", null, "CARPOOL_TO_CAMPUS", ActionStatus.ACCEPTED, 18, 21),
                new DemoAction("DEMO-ACTION-013", "SV005", "MISSION-RECYCLE-01", "STATION-C3", "RECYCLE_BOTTLE", ActionStatus.ACCEPTED, 10, 27),
                new DemoAction("DEMO-ACTION-014", "SV006", "MISSION-CLEANUP-01", null, "CLEANUP_EVENT", ActionStatus.ACCEPTED, 30, 35),
                new DemoAction("DEMO-ACTION-015", "SV007", "MISSION-TREE-01", "STATION-E5", "TREE_CARE", ActionStatus.PENDING_REVIEW, 25, 44),
                new DemoAction("DEMO-ACTION-016", "SV008", "MISSION-ENERGY-01", null, "ENERGY_SAVING", ActionStatus.ACCEPTED, 20, 53),
                new DemoAction("DEMO-ACTION-017", "SV001", "MISSION-REFILL-01", "STATION-B2", "WATER_REFILL", ActionStatus.ACCEPTED, 8, 66),
                new DemoAction("DEMO-ACTION-018", "SV002", "MISSION-BIKE-01", null, "BIKE_TO_CAMPUS", ActionStatus.ACCEPTED, 12, 76),
                new DemoAction("DEMO-ACTION-019", "SV003", "MISSION-TRASH-01", null, "REPORT_TRASH", ActionStatus.REJECTED, 0, 90),
                new DemoAction("DEMO-ACTION-020", "SV004", "MISSION-COMPOST-01", "STATION-F6", "COMPOST_WASTE", ActionStatus.ACCEPTED, 14, 110),
                new DemoAction("DEMO-ACTION-021", "SV005", "MISSION-EWASTE-01", "STATION-G7", "EWASTE_DROPOFF", ActionStatus.ACCEPTED, 22, 145),
                new DemoAction("DEMO-ACTION-022", "SV006", "MISSION-PLASTIC-01", null, "PLASTIC_FREE_LUNCH", ActionStatus.ACCEPTED, 16, 180),
                new DemoAction("DEMO-ACTION-023", "SV007", "MISSION-CARPOOL-01", null, "CARPOOL_TO_CAMPUS", ActionStatus.ACCEPTED, 18, 220),
                new DemoAction("DEMO-ACTION-024", "SV008", "MISSION-RECYCLE-01", "STATION-A1", "RECYCLE_BOTTLE", ActionStatus.ACCEPTED, 10, 300),
                new DemoAction("DEMO-ACTION-025", "SV009", "MISSION-SOLAR-01", null, "SOLAR_AWARENESS", ActionStatus.ACCEPTED, 18, 0),
                new DemoAction("DEMO-ACTION-026", "SV010", "MISSION-WORKSHOP-01", null, "GREEN_WORKSHOP", ActionStatus.ACCEPTED, 20, 0),
                new DemoAction("DEMO-ACTION-027", "SV001", "MISSION-PAPERLESS-01", null, "PAPERLESS_NOTE", ActionStatus.ACCEPTED, 12, 0),
                new DemoAction("DEMO-ACTION-028", "SV002", "MISSION-SOLAR-01", null, "SOLAR_AWARENESS", ActionStatus.ACCEPTED, 18, 1),
                new DemoAction("DEMO-ACTION-029", "SV003", "MISSION-WORKSHOP-01", null, "GREEN_WORKSHOP", ActionStatus.ACCEPTED, 20, 1),
                new DemoAction("DEMO-ACTION-030", "SV004", "MISSION-PAPERLESS-01", null, "PAPERLESS_NOTE", ActionStatus.PENDING_REVIEW, 12, 2),
                new DemoAction("DEMO-ACTION-031", "SV005", "MISSION-CLEANUP-01", null, "CLEANUP_EVENT", ActionStatus.ACCEPTED, 30, 2),
                new DemoAction("DEMO-ACTION-032", "SV006", "MISSION-ENERGY-01", null, "ENERGY_SAVING", ActionStatus.ACCEPTED, 20, 3),
                new DemoAction("DEMO-ACTION-033", "SV007", "MISSION-BIKE-01", null, "BIKE_TO_CAMPUS", ActionStatus.ACCEPTED, 12, 4),
                new DemoAction("DEMO-ACTION-034", "SV008", "MISSION-REFILL-01", "STATION-B2", "WATER_REFILL", ActionStatus.ACCEPTED, 8, 5),
                new DemoAction("DEMO-ACTION-035", "SV009", "MISSION-PLASTIC-01", null, "PLASTIC_FREE_LUNCH", ActionStatus.REJECTED, 0, 6),
                new DemoAction("DEMO-ACTION-036", "SV010", "MISSION-COMPOST-01", "STATION-F6", "COMPOST_WASTE", ActionStatus.ACCEPTED, 14, 9)
        };
        for (DemoAction item : seed) {
            if (actions.existsById(item.id())) {
                continue;
            }
            EcoAction action = new EcoAction();
            action.id = item.id();
            action.studentId = item.studentId();
            action.missionId = item.missionId();
            action.stationId = item.stationId();
            action.actionType = item.actionType();
            action.evidenceUrl = "/logo.png";
            action.status = item.status();
            action.points = item.points();
            action.policyReason = item.status() == ActionStatus.REJECTED ? "Demo rejected evidence." : "Demo seed.";
            action.submittedAt = Instant.now().minus(item.daysAgo(), ChronoUnit.DAYS);
            if (item.status() != ActionStatus.PENDING_REVIEW) {
                action.reviewedAt = action.submittedAt.plus(6, ChronoUnit.HOURS);
                action.reviewedByUserId = "demo-seeder";
            }
            actions.save(action);
        }
    }

    private record DemoAction(String id, String studentId, String missionId, String stationId, String actionType,
                              ActionStatus status, int points, long daysAgo) {
    }
}
