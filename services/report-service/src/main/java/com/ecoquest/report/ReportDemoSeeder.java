package com.ecoquest.report;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
class ReportDemoSeeder implements CommandLineRunner {
    private final ReportAnalyticsRepository actions;
    private final ReportRepository reports;
    private final StudentRewardSnapshotRepository rewards;
    private final BadgeAnalyticsRepository badges;
    private final CertificateAnalyticsRepository certificates;
    private final MissionAnalyticsRepository missions;
    private final UserAnalyticsRepository users;

    ReportDemoSeeder(ReportAnalyticsRepository actions, ReportRepository reports,
                     StudentRewardSnapshotRepository rewards, BadgeAnalyticsRepository badges,
                     CertificateAnalyticsRepository certificates, MissionAnalyticsRepository missions,
                     UserAnalyticsRepository users) {
        this.actions = actions;
        this.reports = reports;
        this.rewards = rewards;
        this.badges = badges;
        this.certificates = certificates;
        this.missions = missions;
        this.users = users;
    }

    @Override
    public void run(String... args) {
        seedUsers();
        seedMissions();
        seedActions();
        seedRewards();
        seedBadges();
        seedCertificates();
        seedReports();
    }

    private void seedUsers() {
        user("DEMO-USER-SV001", "STUDENT", "SV001", 180);
        user("DEMO-USER-SV002", "STUDENT", "SV002", 120);
        user("DEMO-USER-SV003", "STUDENT", "SV003", 90);
        user("DEMO-USER-SV004", "STUDENT", "SV004", 60);
        user("DEMO-USER-SV005", "STUDENT", "SV005", 40);
        user("DEMO-USER-SV006", "STUDENT", "SV006", 20);
        user("DEMO-USER-SV007", "STUDENT", "SV007", 10);
        user("DEMO-USER-SV008", "STUDENT", "SV008", 4);
        user("DEMO-USER-SV009", "STUDENT", "SV009", 1);
        user("DEMO-USER-SV010", "STUDENT", "SV010", 0);
        user("DEMO-USER-MOD", "MODERATOR", "SVMOD001", 200);
        user("DEMO-USER-ADMIN", "ADMIN", null, 240);
    }

    private void seedMissions() {
        mission("MISSION-RECYCLE-01", "Recycle Bottle", "ACTIVE", "DEMO-USER-ADMIN", 180);
        mission("MISSION-CLEANUP-01", "Join Cleanup Event", "ACTIVE", "DEMO-USER-ADMIN", 160);
        mission("MISSION-CHECKIN-01", "Green Station Check-in", "ACTIVE", "DEMO-USER-ADMIN", 130);
        mission("MISSION-TRASH-01", "Report Trash Spot", "ACTIVE", "DEMO-USER-MOD", 90);
        mission("MISSION-ENERGY-01", "Energy Saving Proof", "ACTIVE", "DEMO-USER-MOD", 60);
        mission("MISSION-TREE-01", "Tree Care Activity", "ACTIVE", "DEMO-USER-MOD", 38);
        mission("MISSION-BIKE-01", "Bike to Campus", "ACTIVE", "DEMO-USER-ADMIN", 22);
        mission("MISSION-REFILL-01", "Bottle Refill", "ACTIVE", "DEMO-USER-ADMIN", 15);
        mission("MISSION-COMPOST-01", "Compost Organic Waste", "ACTIVE", "DEMO-USER-MOD", 7);
        mission("MISSION-EWASTE-01", "E-waste Drop-off", "ACTIVE", "DEMO-USER-MOD", 5);
        mission("MISSION-PLASTIC-01", "Plastic-free Lunch", "PENDING", "DEMO-USER-MOD", 2);
        mission("MISSION-CARPOOL-01", "Campus Carpool", "ACTIVE", "DEMO-USER-ADMIN", 1);
        mission("MISSION-SOLAR-01", "Solar Awareness Booth", "ACTIVE", "DEMO-USER-MOD", 0);
        mission("MISSION-WORKSHOP-01", "Green Workshop Attendance", "ACTIVE", "DEMO-USER-ADMIN", 0);
        mission("MISSION-PAPERLESS-01", "Paperless Study Week", "ACTIVE", "DEMO-USER-MOD", 0);
    }

    private void seedActions() {
        action("DEMO-ACTION-001", "SV001", "MISSION-RECYCLE-01", "STATION-A1", "RECYCLE_BOTTLE", "ACCEPTED", 10, 1);
        action("DEMO-ACTION-002", "SV002", "MISSION-CLEANUP-01", null, "CLEANUP_EVENT", "PENDING_REVIEW", 30, 2);
        action("DEMO-ACTION-003", "SV003", "MISSION-CHECKIN-01", "STATION-B2", "GREEN_CHECKIN", "ACCEPTED", 5, 3);
        action("DEMO-ACTION-004", "SV004", "MISSION-TRASH-01", null, "REPORT_TRASH", "REJECTED", 0, 4);
        action("DEMO-ACTION-005", "SV005", "MISSION-ENERGY-01", null, "ENERGY_SAVING", "ACCEPTED", 20, 5);
        action("DEMO-ACTION-006", "SV006", "MISSION-TREE-01", "STATION-E5", "TREE_CARE", "ACCEPTED", 25, 6);
        action("DEMO-ACTION-007", "SV007", "MISSION-BIKE-01", null, "BIKE_TO_CAMPUS", "ACCEPTED", 12, 8);
        action("DEMO-ACTION-008", "SV008", "MISSION-REFILL-01", "STATION-B2", "WATER_REFILL", "ACCEPTED", 8, 10);
        action("DEMO-ACTION-009", "SV001", "MISSION-COMPOST-01", "STATION-F6", "COMPOST_WASTE", "ACCEPTED", 14, 12);
        action("DEMO-ACTION-010", "SV002", "MISSION-EWASTE-01", "STATION-G7", "EWASTE_DROPOFF", "ACCEPTED", 22, 14);
        action("DEMO-ACTION-011", "SV003", "MISSION-PLASTIC-01", null, "PLASTIC_FREE_LUNCH", "ACCEPTED", 16, 18);
        action("DEMO-ACTION-012", "SV004", "MISSION-CARPOOL-01", null, "CARPOOL_TO_CAMPUS", "ACCEPTED", 18, 21);
        action("DEMO-ACTION-013", "SV005", "MISSION-RECYCLE-01", "STATION-C3", "RECYCLE_BOTTLE", "ACCEPTED", 10, 27);
        action("DEMO-ACTION-014", "SV006", "MISSION-CLEANUP-01", null, "CLEANUP_EVENT", "ACCEPTED", 30, 35);
        action("DEMO-ACTION-015", "SV007", "MISSION-TREE-01", "STATION-E5", "TREE_CARE", "PENDING_REVIEW", 25, 44);
        action("DEMO-ACTION-016", "SV008", "MISSION-ENERGY-01", null, "ENERGY_SAVING", "ACCEPTED", 20, 53);
        action("DEMO-ACTION-017", "SV001", "MISSION-REFILL-01", "STATION-B2", "WATER_REFILL", "ACCEPTED", 8, 66);
        action("DEMO-ACTION-018", "SV002", "MISSION-BIKE-01", null, "BIKE_TO_CAMPUS", "ACCEPTED", 12, 76);
        action("DEMO-ACTION-019", "SV003", "MISSION-TRASH-01", null, "REPORT_TRASH", "REJECTED", 0, 90);
        action("DEMO-ACTION-020", "SV004", "MISSION-COMPOST-01", "STATION-F6", "COMPOST_WASTE", "ACCEPTED", 14, 110);
        action("DEMO-ACTION-021", "SV005", "MISSION-EWASTE-01", "STATION-G7", "EWASTE_DROPOFF", "ACCEPTED", 22, 145);
        action("DEMO-ACTION-022", "SV006", "MISSION-PLASTIC-01", null, "PLASTIC_FREE_LUNCH", "ACCEPTED", 16, 180);
        action("DEMO-ACTION-023", "SV007", "MISSION-CARPOOL-01", null, "CARPOOL_TO_CAMPUS", "ACCEPTED", 18, 220);
        action("DEMO-ACTION-024", "SV008", "MISSION-RECYCLE-01", "STATION-A1", "RECYCLE_BOTTLE", "ACCEPTED", 10, 300);
        action("DEMO-ACTION-025", "SV009", "MISSION-SOLAR-01", null, "SOLAR_AWARENESS", "ACCEPTED", 18, 0);
        action("DEMO-ACTION-026", "SV010", "MISSION-WORKSHOP-01", null, "GREEN_WORKSHOP", "ACCEPTED", 20, 0);
        action("DEMO-ACTION-027", "SV001", "MISSION-PAPERLESS-01", null, "PAPERLESS_NOTE", "ACCEPTED", 12, 0);
        action("DEMO-ACTION-028", "SV002", "MISSION-SOLAR-01", null, "SOLAR_AWARENESS", "ACCEPTED", 18, 1);
        action("DEMO-ACTION-029", "SV003", "MISSION-WORKSHOP-01", null, "GREEN_WORKSHOP", "ACCEPTED", 20, 1);
        action("DEMO-ACTION-030", "SV004", "MISSION-PAPERLESS-01", null, "PAPERLESS_NOTE", "PENDING_REVIEW", 12, 2);
        action("DEMO-ACTION-031", "SV005", "MISSION-CLEANUP-01", null, "CLEANUP_EVENT", "ACCEPTED", 30, 2);
        action("DEMO-ACTION-032", "SV006", "MISSION-ENERGY-01", null, "ENERGY_SAVING", "ACCEPTED", 20, 3);
        action("DEMO-ACTION-033", "SV007", "MISSION-BIKE-01", null, "BIKE_TO_CAMPUS", "ACCEPTED", 12, 4);
        action("DEMO-ACTION-034", "SV008", "MISSION-REFILL-01", "STATION-B2", "WATER_REFILL", "ACCEPTED", 8, 5);
        action("DEMO-ACTION-035", "SV009", "MISSION-PLASTIC-01", null, "PLASTIC_FREE_LUNCH", "REJECTED", 0, 6);
        action("DEMO-ACTION-036", "SV010", "MISSION-COMPOST-01", "STATION-F6", "COMPOST_WASTE", "ACCEPTED", 14, 9);
    }

    private void seedRewards() {
        reward("SV001", 32, 1);
        reward("SV002", 34, 14);
        reward("SV003", 21, 18);
        reward("SV004", 32, 21);
        reward("SV005", 52, 27);
        reward("SV006", 71, 35);
        reward("SV007", 30, 44);
        reward("SV008", 46, 53);
        reward("SV009", 18, 0);
        reward("SV010", 34, 0);
    }

    private void seedBadges() {
        badge("DEMO-BADGE-001", "SV001", "GREEN_STARTER", "Green Starter", 1);
        badge("DEMO-BADGE-002", "SV002", "GREEN_STARTER", "Green Starter", 14);
        badge("DEMO-BADGE-003", "SV005", "ZERO_WASTE_ADVOCATE", "Zero Waste Advocate", 27);
        badge("DEMO-BADGE-004", "SV006", "CLEANUP_CHAMPION", "Cleanup Champion", 35);
        badge("DEMO-BADGE-005", "SV008", "GREEN_STARTER", "Green Starter", 53);
        badge("DEMO-BADGE-006", "SV004", "GREEN_STARTER", "Green Starter", 110);
        badge("DEMO-BADGE-007", "SV009", "GREEN_STARTER", "Green Starter", 0);
        badge("DEMO-BADGE-008", "SV010", "GREEN_STARTER", "Green Starter", 0);
    }

    private void seedCertificates() {
        certificate("DEMO-CERT-EVENT-001", "DEMO-CERT-001", "SV001", "Top Green Student", 2);
        certificate("DEMO-CERT-EVENT-002", "DEMO-CERT-002", "SV006", "Green Ambassador", 18);
        certificate("DEMO-CERT-EVENT-003", "DEMO-CERT-003", "SV008", "Green Ambassador", 80);
        certificate("DEMO-CERT-EVENT-004", "DEMO-CERT-004", "SV005", "Campus Sustainability Champion", 160);
    }

    private void seedReports() {
        report("DEMO-REPORT-001", "DEMO-USER-SV001", "SV001", "STUDENT", ReportTargetType.MISSION, "MISSION-TRASH-01", ReportStatus.OPEN, 1);
        report("DEMO-REPORT-002", "DEMO-USER-SV002", "SV002", "STUDENT", ReportTargetType.USER, "SV004", ReportStatus.ACCEPTED, 9);
        report("DEMO-REPORT-003", "DEMO-USER-SV003", "SV003", "STUDENT", ReportTargetType.MISSION, "MISSION-CLEANUP-01", ReportStatus.REJECTED, 25);
        report("DEMO-REPORT-004", "DEMO-USER-MOD", "SVMOD001", "MODERATOR", ReportTargetType.ACTION, "DEMO-ACTION-004", ReportStatus.ACCEPTED, 55);
        report("DEMO-REPORT-005", "DEMO-USER-SV005", "SV005", "STUDENT", ReportTargetType.USER, "SV007", ReportStatus.OPEN, 120);
        report("DEMO-REPORT-006", "DEMO-USER-SV006", "SV006", "STUDENT", ReportTargetType.MISSION, "MISSION-EWASTE-01", ReportStatus.REJECTED, 210);
        report("DEMO-REPORT-007", "DEMO-USER-SV009", "SV009", "STUDENT", ReportTargetType.MISSION, "MISSION-SOLAR-01", ReportStatus.OPEN, 0);
        report("DEMO-REPORT-008", "DEMO-USER-SV010", "SV010", "STUDENT", ReportTargetType.USER, "SV004", ReportStatus.ACCEPTED, 3);
    }

    private void user(String id, String role, String studentId, long daysAgo) {
        if (users.existsById(id)) {
            return;
        }
        UserAnalyticsRecord record = new UserAnalyticsRecord();
        record.userId = id;
        record.role = role;
        record.studentId = studentId;
        record.registeredOn = ago(daysAgo);
        users.save(record);
    }

    private void mission(String id, String title, String status, String createdBy, long daysAgo) {
        MissionAnalyticsRecord record = missions.findById(id).orElseGet(MissionAnalyticsRecord::new);
        record.missionId = id;
        record.title = title;
        record.status = status;
        record.createdByUserId = createdBy;
        record.createdOn = record.createdOn == null ? ago(daysAgo) : record.createdOn;
        record.updatedOn = ago(Math.max(0, daysAgo - 1));
        missions.save(record);
    }

    private void action(String id, String studentId, String missionId, String stationId, String actionType,
                        String status, int points, long daysAgo) {
        if (actions.existsById(id)) {
            return;
        }
        ActionAnalyticsRecord record = new ActionAnalyticsRecord();
        record.sourceActionId = id;
        record.studentId = studentId;
        record.missionId = missionId;
        record.stationId = stationId;
        record.actionType = actionType;
        record.status = status;
        record.points = "ACCEPTED".equals(status) ? points : 0;
        record.occurredOn = ago(daysAgo);
        actions.save(record);
    }

    private void reward(String studentId, int points, long daysAgo) {
        StudentRewardSnapshot record = rewards.findById(studentId).orElseGet(StudentRewardSnapshot::new);
        record.studentId = studentId;
        record.currentPoints = Math.max(record.currentPoints, points);
        record.updatedOn = ago(daysAgo);
        rewards.save(record);
    }

    private void badge(String id, String studentId, String code, String name, long daysAgo) {
        if (badges.existsById(id)) {
            return;
        }
        BadgeAnalyticsRecord record = new BadgeAnalyticsRecord();
        record.eventId = id;
        record.studentId = studentId;
        record.badgeCode = code;
        record.badgeName = name;
        record.occurredOn = ago(daysAgo);
        badges.save(record);
    }

    private void certificate(String eventId, String certificateId, String studentId, String type, long daysAgo) {
        if (certificates.existsById(eventId)) {
            return;
        }
        CertificateAnalyticsRecord record = new CertificateAnalyticsRecord();
        record.eventId = eventId;
        record.certificateId = certificateId;
        record.studentId = studentId;
        record.certificateType = type;
        record.occurredOn = ago(daysAgo);
        certificates.save(record);
    }

    private void report(String id, String reporterUserId, String reporterStudentId, String reporterRole,
                        ReportTargetType targetType, String targetId, ReportStatus status, long daysAgo) {
        if (reports.existsById(id)) {
            return;
        }
        UserReport report = new UserReport();
        report.id = id;
        report.reporterUserId = reporterUserId;
        report.reporterStudentId = reporterStudentId;
        report.reporterRole = reporterRole;
        report.targetType = targetType;
        report.targetId = targetId;
        report.reason = "Demo report for analytics and moderation workflow.";
        report.evidenceUrl = "/logo.png";
        report.status = status;
        report.createdAt = ago(daysAgo);
        if (status != ReportStatus.OPEN) {
            report.reviewedAt = report.createdAt.plus(12, ChronoUnit.HOURS);
            report.reviewedByUserId = "DEMO-USER-ADMIN";
            report.moderationNote = "Demo review outcome.";
        }
        reports.save(report);
    }

    private Instant ago(long days) {
        return Instant.now().minus(days, ChronoUnit.DAYS);
    }
}
