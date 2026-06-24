package com.ecoquest.action;

import com.ecoquest.common.security.RoleAuthorizer;
import com.ecoquest.grpc.policy.EvaluateActionResponse;
import com.ecoquest.messaging.events.EcoActionAcceptedEvent;
import com.ecoquest.messaging.events.EcoActionRejectedEvent;
import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/actions")
class EcoActionController {
    private final EcoActionRepository actions;
    private final StringRedisTemplate redis;
    private final PolicyVerificationClient policyClient;
    private final CatalogMissionClient catalogMissionClient;
    private final ActionOutboxService outbox;
    private final EvidenceStorageService evidenceStorage;

    EcoActionController(EcoActionRepository actions, StringRedisTemplate redis, PolicyVerificationClient policyClient,
                        CatalogMissionClient catalogMissionClient, ActionOutboxService outbox,
                        EvidenceStorageService evidenceStorage) {
        this.actions = actions;
        this.redis = redis;
        this.policyClient = policyClient;
        this.catalogMissionClient = catalogMissionClient;
        this.outbox = outbox;
        this.evidenceStorage = evidenceStorage;
    }

    @PostMapping("/drafts")
    String saveDraft(@RequestBody DraftActionRequest request, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireStudentSelf(httpRequest, request.studentId());
        String draftKey = "ecoquest:draft:%s:%s".formatted(request.studentId(), request.missionId());
        redis.opsForValue().set(draftKey, request.toString(), Duration.ofHours(2));
        return draftKey;
    }

    @PostMapping("/submit")
    EcoAction submit(@RequestBody SubmitActionRequest request, HttpServletRequest httpRequest) {
        requireText(request.idempotencyKey(), "idempotencyKey is required.");
        requireText(request.studentId(), "studentId is required.");
        requireText(request.missionId(), "missionId is required.");
        requireText(request.actionType(), "actionType is required.");
        RoleAuthorizer.requireStudentSelf(httpRequest, request.studentId());
        catalogMissionClient.requireActive(
                request.missionId(),
                request.actionType(),
                httpRequest.getHeader("Authorization"));

        String idempotencyKey = "ecoquest:idempotency:" + request.idempotencyKey();
        Boolean firstSubmission = redis.opsForValue().setIfAbsent(idempotencyKey, "1", Duration.ofHours(6));
        if (Boolean.FALSE.equals(firstSubmission)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate submit ignored by idempotency key.");
        }

        Instant dayStart = LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant dayEnd = dayStart.plus(Duration.ofDays(1));
        long submittedToday = actions.countByStudentIdAndActionTypeAndSubmittedAtBetween(
                request.studentId(), request.actionType(), dayStart, dayEnd);

        EvaluateActionResponse policy = policyClient.evaluate(request, submittedToday);

        EcoAction action = new EcoAction();
        action.id = "ACT-" + UUID.randomUUID();
        action.studentId = request.studentId();
        action.missionId = request.missionId();
        action.stationId = request.stationId();
        action.actionType = request.actionType();
        action.evidenceUrl = request.evidenceUrl();
        action.points = policy.getSuggestedPoints();
        action.policyReason = policy.getReason();
        action.submittedAt = Instant.now();
        action.status = policy.getAccepted() ? ActionStatus.ACCEPTED
                : policy.getRequiresManualReview() ? ActionStatus.PENDING_REVIEW : ActionStatus.REJECTED;
        actions.save(action);

        if (action.status == ActionStatus.ACCEPTED) {
            publishAccepted(action);
        }
        return action;
    }

    @GetMapping("/user/{studentId}")
    List<EcoAction> byStudent(@PathVariable String studentId, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireSelfOrAnyRole(httpRequest, studentId, "MODERATOR", "ADMIN");
        return actions.findByStudentIdOrderBySubmittedAtDesc(studentId);
    }

    @GetMapping("/review")
    List<EcoAction> pendingReview(@RequestParam(required = false) ActionStatus status, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireAnyRole(httpRequest, "MODERATOR", "ADMIN");
        return status == null ? actions.findAllByOrderBySubmittedAtDesc() : actions.findByStatusOrderBySubmittedAtDesc(status);
    }

    @PutMapping("/{id}/approve")
    EcoAction approve(@PathVariable String id, HttpServletRequest httpRequest) {
        var reviewer = RoleAuthorizer.requireAnyRole(httpRequest, "MODERATOR", "ADMIN");
        EcoAction action = actions.findById(id).orElseThrow();
        ensureNotOwnModeration(action, reviewer.studentId(), reviewer.role());
        if (action.status == ActionStatus.ACCEPTED) {
            return action;
        }
        if (action.status != ActionStatus.PENDING_REVIEW) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending review actions can be approved.");
        }
        action.status = ActionStatus.ACCEPTED;
        action.reviewedByUserId = reviewer.userId();
        action.reviewedAt = Instant.now();
        actions.save(action);
        publishAccepted(action);
        return action;
    }

    @PutMapping("/{id}/reject")
    EcoAction reject(@PathVariable String id, @RequestBody(required = false) RejectActionRequest request,
                     HttpServletRequest httpRequest) {
        var reviewer = RoleAuthorizer.requireAnyRole(httpRequest, "MODERATOR", "ADMIN");
        EcoAction action = actions.findById(id).orElseThrow();
        ensureNotOwnModeration(action, reviewer.studentId(), reviewer.role());
        if (action.status == ActionStatus.REJECTED) {
            return action;
        }
        if (action.status != ActionStatus.PENDING_REVIEW) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending review actions can be rejected.");
        }
        action.status = ActionStatus.REJECTED;
        action.moderationNote = request == null || request.reason() == null || request.reason().isBlank()
                ? "Rejected by moderator."
                : request.reason();
        action.reviewedByUserId = reviewer.userId();
        action.reviewedAt = Instant.now();
        actions.save(action);
        publishRejected(action);
        return action;
    }

    @PostMapping("/evidence")
    UploadEvidenceResponse uploadEvidence(@RequestBody UploadEvidenceRequest request, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireAnyRole(httpRequest, "STUDENT", "MODERATOR");
        return evidenceStorage.upload(request);
    }

    @GetMapping("/evidence/{objectKey}")
    ResponseEntity<InputStreamResource> downloadEvidence(@PathVariable String objectKey) {
        return evidenceStorage.download(objectKey);
    }

    private void publishAccepted(EcoAction action) {
        outbox.enqueue(EcoQuestRabbit.ACTION_ACCEPTED,
                new EcoActionAcceptedEvent(UUID.randomUUID().toString(), Instant.now(), action.id, action.studentId,
                        action.missionId, action.stationId, action.actionType, action.points));
    }

    private void publishRejected(EcoAction action) {
        outbox.enqueue(EcoQuestRabbit.ACTION_REJECTED,
                new EcoActionRejectedEvent(UUID.randomUUID().toString(), Instant.now(), action.id, action.studentId,
                        action.missionId, action.actionType,
                        action.moderationNote == null ? action.policyReason : action.moderationNote));
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private void ensureNotOwnModeration(EcoAction action, String reviewerStudentId, String reviewerRole) {
        if ("ADMIN".equals(reviewerRole)) {
            return;
        }
        if (reviewerStudentId != null && reviewerStudentId.equals(action.studentId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Moderators cannot review their own actions.");
        }
    }
}
