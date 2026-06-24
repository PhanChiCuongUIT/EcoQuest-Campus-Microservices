package com.ecoquest.recognition;

import com.ecoquest.common.security.RoleAuthorizer;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
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
    private final MinioClient minio;
    private final String bucket;
    private final RewardClaimRepository rewardClaims;

    RecognitionController(CertificateRepository certificates, MinioClient minio,
                          @Value("${minio.bucket}") String bucket, RewardClaimRepository rewardClaims) {
        this.certificates = certificates;
        this.minio = minio;
        this.bucket = bucket;
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
    ResponseEntity<InputStreamResource> download(@PathVariable String id) throws Exception {
        CertificateRecord certificate = certificates.findById(id).orElseThrow();
        InputStreamResource resource = new InputStreamResource(minio.getObject(GetObjectArgs.builder()
                .bucket(bucket)
                .object(certificate.objectKey)
                .build()));
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"ecoquest-%s.pdf\"".formatted(certificate.id))
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .body(resource);
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
