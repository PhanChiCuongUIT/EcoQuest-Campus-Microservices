package com.ecoquest.report;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import java.time.Instant;
import java.util.List;

@Entity
class ActionAnalyticsRecord {
    @Id
    public String sourceActionId;
    public String studentId;
    public String missionId;
    public String stationId;
    public String actionType;
    public String status;
    public int points;
    public Instant occurredOn;
}

@Entity
class StudentRewardSnapshot {
    @Id
    public String studentId;
    public int currentPoints;
    public Instant updatedOn;
}

@Entity
class BadgeAnalyticsRecord {
    @Id
    public String eventId;
    public String studentId;
    public String badgeCode;
    public String badgeName;
    public Instant occurredOn;
}

@Entity
class CertificateAnalyticsRecord {
    @Id
    public String eventId;
    public String certificateId;
    public String studentId;
    public String certificateType;
    public Instant occurredOn;
}

@Entity
class MissionAnalyticsRecord {
    @Id
    public String missionId;
    public String title;
    public String status;
    public String createdByUserId;
    public Instant createdOn;
    public Instant updatedOn;
}

@Entity
class UserAnalyticsRecord {
    @Id
    public String userId;
    public String role;
    public String studentId;
    public Instant registeredOn;
}

record AnalyticsSummary(
        String period,
        Instant from,
        Instant to,
        long submittedActions,
        long acceptedActions,
        long rejectedActions,
        int totalPoints,
        long openReports,
        long acceptedReports,
        long rejectedReports,
        long badgesGranted,
        long certificatesIssued,
        long missionsCreated,
        long usersRegistered,
        List<ActionTypeMetric> actionTypes,
        List<StudentMetric> topStudents
) {
}

record AnalyticsSeries(
        String period,
        int year,
        Integer fromYear,
        Integer toYear,
        List<AnalyticsBucket> buckets
) {
}

record AnalyticsBucket(
        String label,
        Instant from,
        Instant to,
        long submittedActions,
        long acceptedActions,
        long rejectedActions,
        int totalPoints,
        long openReports,
        long acceptedReports,
        long rejectedReports,
        long badgesGranted,
        long certificatesIssued,
        long missionsCreated,
        long usersRegistered
) {
}

record ActionTypeMetric(String actionType, long actionCount, int points) {
}

record StudentMetric(String studentId, long actionCount, int points) {
}

record StudentAnalytics(
        String studentId,
        long actionCount,
        long acceptedActions,
        long rejectedActions,
        int totalPoints,
        long badgeCount,
        long certificateCount,
        long reportsSubmitted,
        List<ActionTypeMetric> actionTypes
) {
}

record StudentOutcome(
        String studentId,
        long actionCount,
        long acceptedActions,
        long rejectedActions,
        int totalPoints,
        long badgeCount,
        long certificateCount,
        long reportsSubmitted
) {
}
