package com.ecoquest.action;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Document("eco_actions")
class EcoAction {
    @Id
    public String id;
    public String studentId;
    public String missionId;
    public String stationId;
    public String actionType;
    public String evidenceUrl;
    public List<String> evidenceUrls = new ArrayList<>();
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

record DraftActionRequest(String studentId, String missionId, String stationId, String actionType, String evidenceUrl,
                          List<String> evidenceUrls) {
}

record SubmitActionRequest(String idempotencyKey, String studentId, String missionId, String stationId, String actionType,
                           String evidenceUrl, List<String> evidenceUrls) {
    String primaryEvidenceUrl() {
        var normalized = EvidenceUrls.normalize(evidenceUrl, evidenceUrls);
        return normalized.isEmpty() ? "" : normalized.getFirst();
    }
}

record RejectActionRequest(String reason) {
}

record UploadEvidenceRequest(String fileName, String contentType, String dataUrl, String base64) {
}

record UploadEvidenceResponse(String evidenceUrl, String objectKey, String contentType, long sizeBytes) {
}

final class EvidenceUrls {
    private EvidenceUrls() {
    }

    static List<String> normalize(String legacyUrl, List<String> urls) {
        var normalized = new ArrayList<String>();
        if (urls != null) {
            for (String url : urls) {
                add(normalized, url);
            }
        }
        add(normalized, legacyUrl);
        return List.copyOf(normalized);
    }

    private static void add(List<String> target, String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        var trimmed = url.trim();
        if (!target.contains(trimmed)) {
            target.add(trimmed);
        }
    }

    static boolean isVideoUrl(String url) {
        var normalized = normalizePath(url);
        return normalized.endsWith(".mp4") || normalized.endsWith(".webm") || normalized.endsWith(".mov");
    }

    static boolean isDocumentUrl(String url) {
        return normalizePath(url).endsWith(".pdf");
    }

    private static String normalizePath(String url) {
        if (url == null) {
            return "";
        }
        var path = url.trim().toLowerCase(Locale.ROOT);
        int queryIndex = path.indexOf('?');
        return queryIndex >= 0 ? path.substring(0, queryIndex) : path;
    }
}
