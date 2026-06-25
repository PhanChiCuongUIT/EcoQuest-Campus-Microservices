package com.ecoquest.report;

import com.ecoquest.messaging.events.BadgeUnlockedEvent;
import com.ecoquest.messaging.events.CertificateIssuedEvent;
import com.ecoquest.messaging.events.EcoActionAcceptedEvent;
import com.ecoquest.messaging.events.EcoActionRejectedEvent;
import com.ecoquest.messaging.events.PointsGrantedEvent;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
class ReportAnalyticsService {
    private final ReportAnalyticsRepository analytics;
    private final ReportRepository reports;
    private final StudentRewardSnapshotRepository rewardSnapshots;
    private final BadgeAnalyticsRepository badgeAnalytics;
    private final CertificateAnalyticsRepository certificateAnalytics;

    ReportAnalyticsService(ReportAnalyticsRepository analytics, ReportRepository reports,
                           StudentRewardSnapshotRepository rewardSnapshots,
                           BadgeAnalyticsRepository badgeAnalytics,
                           CertificateAnalyticsRepository certificateAnalytics) {
        this.analytics = analytics;
        this.reports = reports;
        this.rewardSnapshots = rewardSnapshots;
        this.badgeAnalytics = badgeAnalytics;
        this.certificateAnalytics = certificateAnalytics;
    }

    @RabbitListener(queues = ReportMessagingConfig.ACTION_ACCEPTED_QUEUE)
    void onActionAccepted(EcoActionAcceptedEvent event) {
        if (analytics.existsById(event.actionId())) {
            return;
        }
        var record = new ActionAnalyticsRecord();
        record.sourceActionId = event.actionId();
        record.studentId = event.studentId();
        record.missionId = event.missionId();
        record.stationId = event.stationId();
        record.actionType = event.actionType();
        record.status = "ACCEPTED";
        record.points = event.points();
        record.occurredOn = event.occurredOn();
        analytics.save(record);
    }

    @RabbitListener(queues = ReportMessagingConfig.ACTION_REJECTED_QUEUE)
    void onActionRejected(EcoActionRejectedEvent event) {
        if (analytics.existsById(event.actionId())) {
            return;
        }
        var record = new ActionAnalyticsRecord();
        record.sourceActionId = event.actionId();
        record.studentId = event.studentId();
        record.missionId = event.missionId();
        record.actionType = event.actionType();
        record.status = "REJECTED";
        record.points = 0;
        record.occurredOn = event.occurredOn();
        analytics.save(record);
    }

    @RabbitListener(queues = ReportMessagingConfig.POINTS_GRANTED_QUEUE)
    void onPointsGranted(PointsGrantedEvent event) {
        var snapshot = rewardSnapshots.findById(event.studentId()).orElseGet(() -> {
            var created = new StudentRewardSnapshot();
            created.studentId = event.studentId();
            return created;
        });
        if (snapshot.updatedOn != null && snapshot.updatedOn.isAfter(event.occurredOn())) {
            return;
        }
        snapshot.currentPoints = event.totalPoints();
        snapshot.updatedOn = event.occurredOn();
        rewardSnapshots.save(snapshot);
    }

    @RabbitListener(queues = ReportMessagingConfig.BADGE_UNLOCKED_QUEUE)
    void onBadgeUnlocked(BadgeUnlockedEvent event) {
        if (badgeAnalytics.existsById(event.eventId())) {
            return;
        }
        var record = new BadgeAnalyticsRecord();
        record.eventId = event.eventId();
        record.studentId = event.studentId();
        record.badgeCode = event.badgeCode();
        record.badgeName = event.badgeName();
        record.occurredOn = event.occurredOn();
        badgeAnalytics.save(record);
    }

    @RabbitListener(queues = ReportMessagingConfig.CERTIFICATE_ISSUED_QUEUE)
    void onCertificateIssued(CertificateIssuedEvent event) {
        if (certificateAnalytics.existsById(event.eventId())) {
            return;
        }
        var record = new CertificateAnalyticsRecord();
        record.eventId = event.eventId();
        record.certificateId = event.certificateId();
        record.studentId = event.studentId();
        record.certificateType = event.certificateType();
        record.occurredOn = event.occurredOn();
        certificateAnalytics.save(record);
    }

    AnalyticsSummary summary(String period) {
        var range = range(period);
        var records = analytics.findByOccurredOnBetweenOrderByOccurredOnDesc(range.from(), range.to());
        var allReports = reports.findAll();
        return new AnalyticsSummary(
                range.period(),
                range.from(),
                range.to(),
                records.size(),
                records.stream().filter(this::accepted).count(),
                records.stream().filter(this::rejected).count(),
                records.stream().mapToInt(record -> record.points).sum(),
                allReports.stream().filter(report -> report.status == ReportStatus.OPEN).count(),
                allReports.stream().filter(report -> report.status == ReportStatus.ACCEPTED).count(),
                allReports.stream().filter(report -> report.status == ReportStatus.REJECTED).count(),
                badgeAnalytics.countByOccurredOnBetween(range.from(), range.to()),
                certificateAnalytics.countByOccurredOnBetween(range.from(), range.to()),
                actionTypeMetrics(records),
                studentMetrics(records)
        );
    }

    StudentAnalytics student(String studentId) {
        var records = analytics.findByStudentIdOrderByOccurredOnDesc(studentId);
        return new StudentAnalytics(
                studentId,
                records.size(),
                records.stream().filter(this::accepted).count(),
                records.stream().filter(this::rejected).count(),
                rewardSnapshots.findById(studentId).map(snapshot -> snapshot.currentPoints)
                        .orElseGet(() -> records.stream().mapToInt(record -> record.points).sum()),
                badgeAnalytics.countByStudentId(studentId),
                certificateAnalytics.countByStudentId(studentId),
                reports.findAll().stream().filter(report -> studentId.equals(report.reporterStudentId)).count(),
                actionTypeMetrics(records)
        );
    }

    private List<ActionTypeMetric> actionTypeMetrics(List<ActionAnalyticsRecord> records) {
        return records.stream()
                .filter(this::accepted)
                .collect(Collectors.groupingBy(record -> record.actionType, LinkedHashMap::new, Collectors.toList()))
                .entrySet()
                .stream()
                .map(entry -> new ActionTypeMetric(entry.getKey(), entry.getValue().size(),
                        entry.getValue().stream().mapToInt(record -> record.points).sum()))
                .sorted(Comparator.comparing(ActionTypeMetric::points).reversed())
                .toList();
    }

    private List<StudentMetric> studentMetrics(List<ActionAnalyticsRecord> records) {
        return records.stream()
                .filter(this::accepted)
                .collect(Collectors.groupingBy(record -> record.studentId, LinkedHashMap::new, Collectors.toList()))
                .entrySet()
                .stream()
                .map(entry -> new StudentMetric(entry.getKey(), entry.getValue().size(),
                        entry.getValue().stream().mapToInt(record -> record.points).sum()))
                .sorted(Comparator.comparing(StudentMetric::points).reversed())
                .limit(20)
                .toList();
    }

    private boolean accepted(ActionAnalyticsRecord record) {
        return "ACCEPTED".equals(record.status);
    }

    private boolean rejected(ActionAnalyticsRecord record) {
        return "REJECTED".equals(record.status);
    }

    private PeriodRange range(String requestedPeriod) {
        var period = requestedPeriod == null ? "weekly" : requestedPeriod.toLowerCase(Locale.ROOT);
        var now = Instant.now();
        Instant from = switch (period) {
            case "monthly" -> LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1).atStartOfDay().toInstant(ZoneOffset.UTC);
            case "yearly", "year" -> LocalDate.now(ZoneOffset.UTC).withDayOfYear(1).atStartOfDay().toInstant(ZoneOffset.UTC);
            case "all" -> Instant.EPOCH;
            default -> now.minus(7, ChronoUnit.DAYS);
        };
        var normalized = switch (period) {
            case "year" -> "yearly";
            case "monthly", "yearly", "all" -> period;
            default -> "weekly";
        };
        return new PeriodRange(normalized, from, now.plus(1, ChronoUnit.SECONDS));
    }

    private record PeriodRange(String period, Instant from, Instant to) {
    }
}
