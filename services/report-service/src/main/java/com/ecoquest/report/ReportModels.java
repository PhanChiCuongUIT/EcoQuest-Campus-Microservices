package com.ecoquest.report;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

enum ReportTargetType {
    USER,
    MISSION,
    ACTION
}

enum ReportStatus {
    OPEN,
    ACCEPTED,
    REJECTED
}

@Entity
class UserReport {
    @Id
    public String id;
    public String reporterUserId;
    public String reporterStudentId;
    public String reporterRole;
    @Enumerated(EnumType.STRING)
    public ReportTargetType targetType;
    public String targetId;
    public String reason;
    public String evidenceUrl;
    @Enumerated(EnumType.STRING)
    public ReportStatus status;
    public String moderationNote;
    public String reviewedByUserId;
    public Instant createdAt;
    public Instant reviewedAt;
}

record CreateReportRequest(
        @NotBlank String targetType,
        @NotBlank String targetId,
        @NotBlank String reason,
        String evidenceUrl
) {
}

record ReviewReportRequest(@NotBlank String status, String note) {
}
