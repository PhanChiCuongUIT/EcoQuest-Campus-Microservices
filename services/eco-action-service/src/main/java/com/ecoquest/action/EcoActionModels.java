package com.ecoquest.action;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("eco_actions")
class EcoAction {
    @Id
    public String id;
    public String studentId;
    public String missionId;
    public String stationId;
    public String actionType;
    public String evidenceUrl;
    public ActionStatus status;
    public int points;
    public String policyReason;
    public String moderationNote;
    public String reviewedByUserId;
    public Instant submittedAt;
    public Instant reviewedAt;
}

enum ActionStatus {
    ACCEPTED,
    PENDING_REVIEW,
    REJECTED
}

record DraftActionRequest(String studentId, String missionId, String stationId, String actionType, String evidenceUrl) {
}

record SubmitActionRequest(String idempotencyKey, String studentId, String missionId, String stationId, String actionType, String evidenceUrl) {
}

record RejectActionRequest(String reason) {
}

record UploadEvidenceRequest(String fileName, String contentType, String dataUrl, String base64) {
}

record UploadEvidenceResponse(String evidenceUrl, String objectKey, String contentType, long sizeBytes) {
}
