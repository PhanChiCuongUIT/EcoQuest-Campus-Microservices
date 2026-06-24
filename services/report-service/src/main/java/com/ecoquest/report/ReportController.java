package com.ecoquest.report;

import com.ecoquest.common.security.RoleAuthorizer;
import com.ecoquest.messaging.events.UserReportCreatedEvent;
import com.ecoquest.messaging.events.UserReportReviewedEvent;
import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/reports")
class ReportController {
    private final ReportRepository reports;
    private final RabbitTemplate rabbit;
    private final ReportEvidenceStorage evidenceStorage;

    ReportController(ReportRepository reports, RabbitTemplate rabbit, ReportEvidenceStorage evidenceStorage) {
        this.reports = reports;
        this.rabbit = rabbit;
        this.evidenceStorage = evidenceStorage;
    }

    @PostMapping
    UserReport create(@Valid @RequestBody CreateReportRequest request, HttpServletRequest httpRequest) {
        var principal = RoleAuthorizer.requireAnyRole(httpRequest, "STUDENT", "MODERATOR");
        var report = new UserReport();
        report.id = "REP-" + UUID.randomUUID();
        report.reporterUserId = principal.userId();
        report.reporterStudentId = principal.studentId();
        report.reporterRole = principal.role();
        report.targetType = parseTarget(request.targetType());
        if ("STUDENT".equals(principal.role())
                && report.targetType != ReportTargetType.USER
                && report.targetType != ReportTargetType.MISSION) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Students can report users or missions.");
        }
        if ("MODERATOR".equals(principal.role())
                && report.targetType != ReportTargetType.USER
                && report.targetType != ReportTargetType.ACTION) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Moderators can report users or student actions.");
        }
        report.targetId = request.targetId().trim();
        report.reason = request.reason().trim();
        report.evidenceUrl = request.evidenceUrl();
        report.status = ReportStatus.OPEN;
        report.createdAt = Instant.now();
        var saved = reports.save(report);
        rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, EcoQuestRabbit.USER_REPORT_CREATED,
                new UserReportCreatedEvent(UUID.randomUUID().toString(), Instant.now(), saved.id,
                        saved.reporterUserId, saved.reporterStudentId, saved.reporterRole,
                        saved.targetType.name(), saved.targetId, saved.reason));
        return saved;
    }

    @GetMapping("/mine")
    List<UserReport> mine(HttpServletRequest httpRequest) {
        var principal = RoleAuthorizer.requireAnyRole(httpRequest, "STUDENT", "MODERATOR");
        return reports.findByReporterUserIdOrderByCreatedAtDesc(principal.userId());
    }

    @PostMapping("/evidence")
    ReportEvidenceUploadResponse uploadEvidence(@RequestBody Map<String, String> request,
                                                HttpServletRequest httpRequest) {
        RoleAuthorizer.requireAnyRole(httpRequest, "STUDENT", "MODERATOR");
        return evidenceStorage.upload(new ReportEvidenceUploadRequest(
                request.get("fileName"),
                request.get("dataUrl")
        ));
    }

    @GetMapping("/evidence/{objectKey}")
    ResponseEntity<InputStreamResource> downloadEvidence(@PathVariable String objectKey) {
        return evidenceStorage.download(objectKey);
    }

    @GetMapping
    List<UserReport> all(@RequestParam(required = false) ReportStatus status, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireAnyRole(httpRequest, "MODERATOR", "ADMIN");
        return status == null ? reports.findAllByOrderByCreatedAtDesc() : reports.findByStatusOrderByCreatedAtDesc(status);
    }

    @PutMapping("/{id}/review")
    UserReport review(@PathVariable String id, @Valid @RequestBody ReviewReportRequest request, HttpServletRequest httpRequest) {
        var principal = RoleAuthorizer.requireAnyRole(httpRequest, "MODERATOR", "ADMIN");
        var report = reports.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found."));
        if (!"ADMIN".equals(principal.role()) && principal.userId().equals(report.reporterUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Moderators cannot review their own reports.");
        }
        var status = parseStatus(request.status());
        if (status == ReportStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Review status must be ACCEPTED or REJECTED.");
        }
        report.status = status;
        report.moderationNote = request.note();
        report.reviewedByUserId = principal.userId();
        report.reviewedAt = Instant.now();
        var saved = reports.save(report);
        rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, EcoQuestRabbit.USER_REPORT_REVIEWED,
                new UserReportReviewedEvent(UUID.randomUUID().toString(), Instant.now(), saved.id,
                        saved.reporterUserId, saved.reporterStudentId, saved.targetType.name(), saved.targetId,
                        saved.status.name(), saved.moderationNote, saved.reviewedByUserId));
        return saved;
    }

    private ReportTargetType parseTarget(String value) {
        try {
            return ReportTargetType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid report target type.");
        }
    }

    private ReportStatus parseStatus(String value) {
        try {
            return ReportStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid report status.");
        }
    }
}
