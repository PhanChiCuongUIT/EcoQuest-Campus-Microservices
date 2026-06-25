package com.ecoquest.recognition;

import com.ecoquest.common.security.RoleAuthorizer;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/recognitions")
class RecognitionController {
    private final CertificateRepository certificates;
    private final CertificateService certificateService;
    private final RewardClaimRepository rewardClaims;

    RecognitionController(CertificateRepository certificates, CertificateService certificateService,
                          RewardClaimRepository rewardClaims) {
        this.certificates = certificates;
        this.certificateService = certificateService;
        this.rewardClaims = rewardClaims;
    }

    @GetMapping("/certificates/user/{studentId}")
    List<CertificateRecord> byStudent(@PathVariable String studentId, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireSelfOrAnyRole(httpRequest, studentId, "ADMIN");
        return certificates.findByStudentIdOrderByIssuedOnDesc(studentId);
    }

    @GetMapping("/certificates/{id}")
    CertificateRecord byId(@PathVariable String id, HttpServletRequest httpRequest) {
        CertificateRecord certificate = certificates.findById(id).orElseThrow();
        RoleAuthorizer.requireSelfOrAnyRole(httpRequest, certificate.studentId, "ADMIN");
        return certificate;
    }

    @GetMapping("/certificates/{id}/download")
    ResponseEntity<ByteArrayResource> download(@PathVariable String id, HttpServletRequest httpRequest) {
        CertificateRecord certificate = certificates.findById(id).orElseThrow();
        RoleAuthorizer.requireSelfOrAnyRole(httpRequest, certificate.studentId, "ADMIN");
        byte[] pdf = certificateService.renderCertificatePdf(certificate);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"ecoquest-%s.pdf\"".formatted(certificate.id))
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .contentLength(pdf.length)
                .body(new ByteArrayResource(pdf));
    }

    @PostMapping("/rewards/{id}/claim")
    RewardClaim claim(@PathVariable String id, @RequestBody RewardClaimRequest request, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireStudentSelf(httpRequest, request.studentId());
        if (request.rewardName() == null || request.rewardName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rewardName is required.");
        }
        var claim = new RewardClaim();
        claim.id = "CLAIM-" + UUID.randomUUID();
        claim.rewardId = id;
        claim.studentId = request.studentId();
        claim.rewardName = request.rewardName().trim();
        claim.status = "ISSUED";
        claim.voucherCode = "ECO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        claim.claimedOn = Instant.now();
        return rewardClaims.save(claim);
    }

    @GetMapping("/rewards/claims/user/{studentId}")
    List<RewardClaim> claims(@PathVariable String studentId, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireSelfOrAnyRole(httpRequest, studentId, "ADMIN");
        return rewardClaims.findByStudentIdOrderByClaimedOnDesc(studentId);
    }
}
