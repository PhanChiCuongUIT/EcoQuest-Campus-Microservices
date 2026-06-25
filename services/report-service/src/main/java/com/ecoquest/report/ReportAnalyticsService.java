package com.ecoquest.report;

import com.ecoquest.messaging.events.BadgeUnlockedEvent;
import com.ecoquest.messaging.events.CertificateIssuedEvent;
import com.ecoquest.messaging.events.EcoActionAcceptedEvent;
import com.ecoquest.messaging.events.EcoActionRejectedEvent;
import com.ecoquest.messaging.events.PointsGrantedEvent;
import com.ecoquest.messaging.events.MissionStatusChangedEvent;
import com.ecoquest.messaging.events.UserRegisteredEvent;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.WeekFields;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
class ReportAnalyticsService {
    private final ReportAnalyticsRepository analytics;
    private final ReportRepository reports;
    private final StudentRewardSnapshotRepository rewardSnapshots;
    private final BadgeAnalyticsRepository badgeAnalytics;
    private final CertificateAnalyticsRepository certificateAnalytics;
    private final MissionAnalyticsRepository missionAnalytics;
    private final UserAnalyticsRepository userAnalytics;

    ReportAnalyticsService(ReportAnalyticsRepository analytics, ReportRepository reports,
                           StudentRewardSnapshotRepository rewardSnapshots,
                           BadgeAnalyticsRepository badgeAnalytics,
                           CertificateAnalyticsRepository certificateAnalytics,
                           MissionAnalyticsRepository missionAnalytics,
                           UserAnalyticsRepository userAnalytics) {
        this.analytics = analytics;
        this.reports = reports;
        this.rewardSnapshots = rewardSnapshots;
        this.badgeAnalytics = badgeAnalytics;
        this.certificateAnalytics = certificateAnalytics;
        this.missionAnalytics = missionAnalytics;
        this.userAnalytics = userAnalytics;
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

    @RabbitListener(queues = ReportMessagingConfig.MISSION_STATUS_CHANGED_QUEUE)
    void onMissionStatusChanged(MissionStatusChangedEvent event) {
        var record = missionAnalytics.findById(event.missionId()).orElseGet(() -> {
            var created = new MissionAnalyticsRecord();
            created.missionId = event.missionId();
            created.createdOn = event.occurredOn();
            return created;
        });
        record.title = event.title();
        record.status = event.status();
        record.createdByUserId = event.createdByUserId();
        record.updatedOn = event.occurredOn();
        missionAnalytics.save(record);
    }

    @RabbitListener(queues = ReportMessagingConfig.USER_REGISTERED_QUEUE)
    void onUserRegistered(UserRegisteredEvent event) {
        if (userAnalytics.existsById(event.userId())) {
            return;
        }
        var record = new UserAnalyticsRecord();
        record.userId = event.userId();
        record.role = event.role();
        record.studentId = event.studentId();
        record.registeredOn = event.occurredOn();
        userAnalytics.save(record);
    }

    AnalyticsSummary summary(String period) {
        var range = range(period);
        return summary(range);
    }

    AnalyticsSummary summary(String period, Integer year, Integer week, Integer month) {
        return summary(selectedRange(period, year, week, month));
    }

    private AnalyticsSummary summary(PeriodRange range) {
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
                countReports(allReports, range, ReportStatus.OPEN),
                countReports(allReports, range, ReportStatus.ACCEPTED),
                countReports(allReports, range, ReportStatus.REJECTED),
                badgeAnalytics.countByOccurredOnBetween(range.from(), range.to()),
                certificateAnalytics.countByOccurredOnBetween(range.from(), range.to()),
                missionAnalytics.countByCreatedOnBetween(range.from(), range.to()),
                userAnalytics.countByRegisteredOnBetween(range.from(), range.to()),
                actionTypeMetrics(records),
                studentMetrics(records)
        );
    }

    AnalyticsSeries series(String requestedPeriod, Integer requestedYear, Integer requestedFromYear, Integer requestedToYear,
                           Integer requestedFromWeek, Integer requestedToWeek,
                           Integer requestedFromMonth, Integer requestedToMonth) {
        var period = normalizePeriod(requestedPeriod);
        var nowYear = LocalDate.now(ZoneOffset.UTC).getYear();
        var year = requestedYear == null ? nowYear : requestedYear;
        if (!period.equals("yearly") && year > nowYear) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected year cannot be in the future.");
        }
        List<PeriodRange> ranges = switch (period) {
            case "monthly" -> monthlyRanges(year, requestedFromMonth, requestedToMonth);
            case "yearly" -> yearlyRanges(requestedFromYear, requestedToYear, nowYear);
            default -> weeklyRanges(year, requestedFromWeek, requestedToWeek);
        };
        return new AnalyticsSeries(period, year,
                period.equals("yearly") ? ranges.getFirst().from().atZone(ZoneOffset.UTC).getYear() : null,
                period.equals("yearly") ? ranges.getLast().from().atZone(ZoneOffset.UTC).getYear() : null,
                ranges.stream().map(this::bucket).toList());
    }

    StudentAnalytics student(String studentId) {
        return student(studentId, Optional.empty());
    }

    StudentAnalytics student(String studentId, String requestedPeriod, Integer year, Integer week, Integer month,
                             Integer fromWeek, Integer toWeek, Integer fromMonth, Integer toMonth,
                             Integer fromYear, Integer toYear) {
        return student(studentId, Optional.of(reportRange(requestedPeriod, year, week, month, fromWeek, toWeek, fromMonth, toMonth, fromYear, toYear)));
    }

    List<StudentOutcome> studentOutcomes(String requestedPeriod, Integer year, Integer week, Integer month,
                                         Integer fromWeek, Integer toWeek, Integer fromMonth, Integer toMonth,
                                         Integer fromYear, Integer toYear) {
        var range = reportRange(requestedPeriod, year, week, month, fromWeek, toWeek, fromMonth, toMonth, fromYear, toYear);
        var studentIds = new LinkedHashSet<String>();
        userAnalytics.findAll().stream()
                .filter(user -> user.studentId != null && !user.studentId.isBlank())
                .map(user -> user.studentId)
                .forEach(studentIds::add);
        analytics.findAll().stream()
                .map(record -> record.studentId)
                .filter(id -> id != null && !id.isBlank())
                .forEach(studentIds::add);
        rewardSnapshots.findAll().stream()
                .map(snapshot -> snapshot.studentId)
                .filter(id -> id != null && !id.isBlank())
                .forEach(studentIds::add);
        return studentIds.stream()
                .map(studentId -> studentOutcome(student(studentId, Optional.of(range))))
                .sorted(Comparator.comparing(StudentOutcome::totalPoints).reversed())
                .toList();
    }

    private StudentAnalytics student(String studentId, Optional<PeriodRange> range) {
        var records = range
                .map(value -> analytics.findByOccurredOnBetweenOrderByOccurredOnDesc(value.from(), value.to()).stream()
                        .filter(record -> studentId.equals(record.studentId))
                        .toList())
                .orElseGet(() -> analytics.findByStudentIdOrderByOccurredOnDesc(studentId));
        var from = range.map(PeriodRange::from).orElse(Instant.EPOCH);
        var to = range.map(PeriodRange::to).orElse(Instant.now().plus(1, ChronoUnit.SECONDS));
        return new StudentAnalytics(
                studentId,
                records.size(),
                records.stream().filter(this::accepted).count(),
                records.stream().filter(this::rejected).count(),
                range.isPresent()
                        ? records.stream().mapToInt(record -> record.points).sum()
                        : rewardSnapshots.findById(studentId).map(snapshot -> snapshot.currentPoints)
                            .orElseGet(() -> records.stream().mapToInt(record -> record.points).sum()),
                range.isPresent()
                        ? badgeAnalytics.findAll().stream().filter(record -> studentId.equals(record.studentId))
                            .filter(record -> isInRange(record.occurredOn, from, to)).count()
                        : badgeAnalytics.countByStudentId(studentId),
                range.isPresent()
                        ? certificateAnalytics.findAll().stream().filter(record -> studentId.equals(record.studentId))
                            .filter(record -> isInRange(record.occurredOn, from, to)).count()
                        : certificateAnalytics.countByStudentId(studentId),
                reports.findAll().stream()
                        .filter(report -> studentId.equals(report.reporterStudentId))
                        .filter(report -> range.isEmpty() || isInRange(report.createdAt, from, to))
                        .count(),
                actionTypeMetrics(records)
        );
    }

    private StudentOutcome studentOutcome(StudentAnalytics student) {
        return new StudentOutcome(
                student.studentId(),
                student.actionCount(),
                student.acceptedActions(),
                student.rejectedActions(),
                student.totalPoints(),
                student.badgeCount(),
                student.certificateCount(),
                student.reportsSubmitted()
        );
    }

    private AnalyticsBucket bucket(PeriodRange range) {
        var records = analytics.findByOccurredOnBetweenOrderByOccurredOnDesc(range.from(), range.to());
        var allReports = reports.findAll();
        return new AnalyticsBucket(
                range.period(),
                range.from(),
                range.to(),
                records.size(),
                records.stream().filter(this::accepted).count(),
                records.stream().filter(this::rejected).count(),
                records.stream().mapToInt(record -> record.points).sum(),
                countReports(allReports, range, ReportStatus.OPEN),
                countReports(allReports, range, ReportStatus.ACCEPTED),
                countReports(allReports, range, ReportStatus.REJECTED),
                badgeAnalytics.countByOccurredOnBetween(range.from(), range.to()),
                certificateAnalytics.countByOccurredOnBetween(range.from(), range.to()),
                missionAnalytics.countByCreatedOnBetween(range.from(), range.to()),
                userAnalytics.countByRegisteredOnBetween(range.from(), range.to())
        );
    }

    private long countReports(List<UserReport> allReports, PeriodRange range, ReportStatus status) {
        return allReports.stream()
                .filter(report -> report.status == status)
                .filter(report -> report.createdAt != null
                        && !report.createdAt.isBefore(range.from())
                        && report.createdAt.isBefore(range.to()))
                .count();
    }

    private boolean isInRange(Instant value, Instant from, Instant to) {
        return value != null && !value.isBefore(from) && value.isBefore(to);
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

    private String normalizePeriod(String requestedPeriod) {
        var period = requestedPeriod == null ? "weekly" : requestedPeriod.toLowerCase(Locale.ROOT);
        return switch (period) {
            case "monthly" -> "monthly";
            case "yearly", "year" -> "yearly";
            default -> "weekly";
        };
    }

    private PeriodRange selectedRange(String requestedPeriod, Integer year, Integer week, Integer month) {
        var period = normalizePeriod(requestedPeriod);
        var currentYear = LocalDate.now(ZoneOffset.UTC).getYear();
        if (year != null && year > currentYear) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected year cannot be in the future.");
        }
        return switch (period) {
            case "monthly" -> month == null ? range(period) : monthlyRange(year == null ? currentYear : year, month);
            case "yearly" -> year == null ? range(period) : yearlyRange(year);
            default -> week == null ? range(period) : weeklyRange(year == null ? currentYear : year, week);
        };
    }

    private PeriodRange reportRange(String requestedPeriod, Integer year, Integer week, Integer month,
                                    Integer fromWeek, Integer toWeek, Integer fromMonth, Integer toMonth,
                                    Integer fromYear, Integer toYear) {
        var period = normalizePeriod(requestedPeriod);
        var nowYear = LocalDate.now(ZoneOffset.UTC).getYear();
        return switch (period) {
            case "monthly" -> {
                if (fromMonth != null || toMonth != null) {
                    var selectedYear = year == null ? nowYear : year;
                    yield combine(monthlyRange(selectedYear, fromMonth == null ? 1 : fromMonth),
                            monthlyRange(selectedYear, toMonth == null ? allowedMonthEnd(selectedYear) : toMonth));
                }
                yield selectedRange(period, year, null, month);
            }
            case "yearly" -> {
                if (fromYear != null || toYear != null) {
                    var startYear = fromYear == null ? (toYear == null ? nowYear : toYear) : fromYear;
                    var endYear = toYear == null ? nowYear : toYear;
                    validateYearRange(startYear, endYear, nowYear);
                    yield combine(yearlyRange(startYear), yearlyRange(endYear));
                }
                yield selectedRange(period, year, null, null);
            }
            default -> {
                if (fromWeek != null || toWeek != null) {
                    var selectedYear = year == null ? nowYear : year;
                    var startWeek = fromWeek == null ? 1 : fromWeek;
                    var endWeek = toWeek == null ? allowedWeekEnd(selectedYear) : toWeek;
                    validateOrderedRange(startWeek, endWeek, "From week cannot be after to week.");
                    yield combine(weeklyRange(selectedYear, startWeek), weeklyRange(selectedYear, endWeek));
                }
                yield selectedRange(period, year, week, null);
            }
        };
    }

    private PeriodRange combine(PeriodRange start, PeriodRange end) {
        if (start.from().isAfter(end.from())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start period cannot be after end period.");
        }
        if (end.from().isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected range cannot be in the future.");
        }
        return new PeriodRange(start.period() + " - " + end.period(), start.from(), end.to());
    }

    private PeriodRange weeklyRange(int weekBasedYear, int week) {
        if (week < 1 || week > 53) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Week must be between 1 and 53.");
        }
        var start = LocalDate.of(weekBasedYear, 1, 4)
                .with(WeekFields.ISO.weekBasedYear(), weekBasedYear)
                .with(WeekFields.ISO.weekOfWeekBasedYear(), week)
                .with(TemporalAdjusters.previousOrSame(WeekFields.ISO.getFirstDayOfWeek()));
        if (start.get(WeekFields.ISO.weekOfWeekBasedYear()) != week) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid ISO week for selected year.");
        }
        if (start.isAfter(LocalDate.now(ZoneOffset.UTC))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected week cannot be in the future.");
        }
        return new PeriodRange(
                "W%02d %d".formatted(week, weekBasedYear),
                start.atStartOfDay().toInstant(ZoneOffset.UTC),
                start.plusWeeks(1).atStartOfDay().toInstant(ZoneOffset.UTC));
    }

    private PeriodRange monthlyRange(int year, int month) {
        if (month < 1 || month > 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Month must be between 1 and 12.");
        }
        var start = LocalDate.of(year, month, 1);
        if (start.isAfter(LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected month cannot be in the future.");
        }
        return new PeriodRange(
                start.getMonth().name().substring(0, 3) + " " + year,
                start.atStartOfDay().toInstant(ZoneOffset.UTC),
                start.plusMonths(1).atStartOfDay().toInstant(ZoneOffset.UTC));
    }

    private PeriodRange yearlyRange(int year) {
        var currentYear = LocalDate.now(ZoneOffset.UTC).getYear();
        if (year > currentYear) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected year cannot be in the future.");
        }
        return new PeriodRange(
                String.valueOf(year),
                LocalDateTime.of(year, 1, 1, 0, 0).toInstant(ZoneOffset.UTC),
                LocalDateTime.of(year + 1, 1, 1, 0, 0).toInstant(ZoneOffset.UTC));
    }

    private List<PeriodRange> weeklyRanges(int year, Integer requestedFromWeek, Integer requestedToWeek) {
        var fromWeek = requestedFromWeek == null ? 1 : requestedFromWeek;
        var toWeek = requestedToWeek == null ? allowedWeekEnd(year) : requestedToWeek;
        validateOrderedRange(fromWeek, toWeek, "From week cannot be after to week.");
        if (toWeek > allowedWeekEnd(year)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected week range cannot include the future.");
        }
        var first = LocalDate.of(year, 1, 1)
                .with(TemporalAdjusters.previousOrSame(WeekFields.ISO.getFirstDayOfWeek()));
        var lastExclusive = LocalDate.of(year + 1, 1, 1)
                .with(TemporalAdjusters.next(WeekFields.ISO.getFirstDayOfWeek()));
        return first.datesUntil(lastExclusive, java.time.Period.ofWeeks(1))
                .filter(start -> start.getYear() == year || start.plusDays(6).getYear() == year)
                .filter(start -> start.get(WeekFields.ISO.weekOfWeekBasedYear()) >= fromWeek
                        && start.get(WeekFields.ISO.weekOfWeekBasedYear()) <= toWeek)
                .filter(start -> !start.isAfter(LocalDate.now(ZoneOffset.UTC)))
                .map(start -> new PeriodRange(
                        "W%02d %d".formatted(start.get(WeekFields.ISO.weekOfWeekBasedYear()), start.get(WeekFields.ISO.weekBasedYear())),
                        start.atStartOfDay().toInstant(ZoneOffset.UTC),
                        start.plusWeeks(1).atStartOfDay().toInstant(ZoneOffset.UTC)))
                .toList();
    }

    private List<PeriodRange> monthlyRanges(int year, Integer requestedFromMonth, Integer requestedToMonth) {
        var fromMonth = requestedFromMonth == null ? 1 : requestedFromMonth;
        var toMonth = requestedToMonth == null ? allowedMonthEnd(year) : requestedToMonth;
        validateOrderedRange(fromMonth, toMonth, "From month cannot be after to month.");
        if (toMonth > allowedMonthEnd(year)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected month range cannot include the future.");
        }
        return LocalDate.of(year, 1, 1)
                .datesUntil(LocalDate.of(year + 1, 1, 1), java.time.Period.ofMonths(1))
                .filter(start -> start.getMonthValue() >= fromMonth && start.getMonthValue() <= toMonth)
                .filter(start -> !start.isAfter(LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1)))
                .map(start -> new PeriodRange(
                        start.getMonth().name().substring(0, 3) + " " + year,
                        start.atStartOfDay().toInstant(ZoneOffset.UTC),
                        start.plusMonths(1).atStartOfDay().toInstant(ZoneOffset.UTC)))
                .toList();
    }

    private List<PeriodRange> yearlyRanges(Integer requestedFromYear, Integer requestedToYear, int nowYear) {
        var minDataYear = analytics.findAll().stream()
                .map(record -> record.occurredOn)
                .filter(java.util.Objects::nonNull)
                .map(instant -> instant.atZone(ZoneOffset.UTC).getYear())
                .min(Integer::compareTo)
                .orElse(nowYear - 2);
        var fromYear = requestedFromYear == null ? Math.min(minDataYear, nowYear - 2) : requestedFromYear;
        var toYear = requestedToYear == null ? nowYear : requestedToYear;
        validateYearRange(fromYear, toYear, nowYear);
        var start = fromYear;
        var end = toYear;
        return java.util.stream.IntStream.rangeClosed(start, end)
                .mapToObj(year -> new PeriodRange(
                        String.valueOf(year),
                        LocalDateTime.of(year, 1, 1, 0, 0).toInstant(ZoneOffset.UTC),
                        LocalDateTime.of(year + 1, 1, 1, 0, 0).toInstant(ZoneOffset.UTC)))
                .toList();
    }

    private int allowedWeekEnd(int year) {
        var now = LocalDate.now(ZoneOffset.UTC);
        if (year < now.get(WeekFields.ISO.weekBasedYear())) {
            return maxIsoWeek(year);
        }
        if (year > now.get(WeekFields.ISO.weekBasedYear())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected year cannot be in the future.");
        }
        return Math.min(now.get(WeekFields.ISO.weekOfWeekBasedYear()), maxIsoWeek(year));
    }

    private int allowedMonthEnd(int year) {
        var now = LocalDate.now(ZoneOffset.UTC);
        if (year < now.getYear()) {
            return 12;
        }
        if (year > now.getYear()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected year cannot be in the future.");
        }
        return now.getMonthValue();
    }

    private int maxIsoWeek(int year) {
        return LocalDate.of(year, 12, 28).get(WeekFields.ISO.weekOfWeekBasedYear());
    }

    private void validateOrderedRange(int from, int to, String message) {
        if (from > to) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private void validateYearRange(int fromYear, int toYear, int nowYear) {
        if (fromYear > toYear) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "From year cannot be after to year.");
        }
        if (toYear > nowYear) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected year cannot be in the future.");
        }
    }

    private record PeriodRange(String period, Instant from, Instant to) {
    }
}
