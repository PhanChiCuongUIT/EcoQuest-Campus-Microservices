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
        List<ActionTypeMetric> actionTypes,
        List<StudentMetric> topStudents
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
        long reportsSubmitted,
        List<ActionTypeMetric> actionTypes
) {
}
