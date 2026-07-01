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
    private final RewardOfferRepository rewardOffers;
    private final StudentRecognitionProfileRepository profiles;

    RecognitionController(CertificateRepository certificates, CertificateService certificateService,
                          RewardClaimRepository rewardClaims, RewardOfferRepository rewardOffers,
                          StudentRecognitionProfileRepository profiles) {
        this.certificates = certificates;
        this.certificateService = certificateService;
        this.rewardClaims = rewardClaims;
        this.rewardOffers = rewardOffers;
        this.profiles = profiles;
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
        RewardOffer offer = rewardOffers.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reward offer not found."));
        var existing = rewardClaims.findFirstByStudentIdAndRewardIdOrderByClaimedOnDesc(request.studentId(), id);
        if (existing.isPresent()) {
            return existing.get();
        }
        assertClaimable(request.studentId(), offer);
        var claim = new RewardClaim();
        claim.id = "CLAIM-" + UUID.randomUUID();
        claim.rewardId = id;
        claim.studentId = request.studentId();
        claim.rewardName = offer.name;
        claim.status = "ISSUED";
        claim.voucherCode = "ECO-" + voucherPrefix(offer.id) + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        claim.claimedOn = Instant.now();
        claim.expiresAt = offer.validUntil;
        offer.remainingStock = Math.max(0, offer.remainingStock - 1);
        rewardOffers.save(offer);
        return rewardClaims.save(claim);
    }

    @GetMapping("/rewards/claims/user/{studentId}")
    List<RewardClaim> claims(@PathVariable String studentId, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireSelfOrAnyRole(httpRequest, studentId, "ADMIN");
        return rewardClaims.findByStudentIdOrderByClaimedOnDesc(studentId);
    }

    @GetMapping("/rewards")
    List<RewardOfferResponse> rewards(@RequestParam String studentId, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireSelfOrAnyRole(httpRequest, studentId, "ADMIN");
        var profile = profiles.findById(studentId).orElseGet(() -> emptyProfile(studentId));
        return rewardOffers.findByActiveTrueOrderByRequiredPointsAscNameAsc()
                .stream()
                .map(offer -> toResponse(offer, profile))
                .toList();
    }

    @PostMapping("/rewards")
    RewardOffer createReward(@RequestBody RewardOffer offer, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        validateOffer(offer);
        return rewardOffers.save(offer);
    }

    @PutMapping("/rewards/{id}")
    RewardOffer updateReward(@PathVariable String id, @RequestBody RewardOffer offer, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        RewardOffer existing = rewardOffers.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reward offer not found."));
        existing.name = offer.name;
        existing.description = offer.description;
        existing.icon = offer.icon;
        existing.color = offer.color;
        existing.requiredPoints = offer.requiredPoints;
        existing.requiredBadges = offer.requiredBadges;
        existing.requiredCertificates = offer.requiredCertificates;
        existing.remainingStock = offer.remainingStock;
        existing.active = offer.active;
        existing.validUntil = offer.validUntil;
        existing.terms = offer.terms;
        validateOffer(existing);
        return rewardOffers.save(existing);
    }

    @DeleteMapping("/rewards/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteReward(@PathVariable String id, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        RewardOffer existing = rewardOffers.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reward offer not found."));
        if (existing.active) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Deactivate a reward offer before deleting it.");
        }
        if (rewardClaims.countByRewardId(id) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Reward offer has issued vouchers and cannot be deleted.");
        }
        rewardOffers.delete(existing);
    }

    private void assertClaimable(String studentId, RewardOffer offer) {
        if (!offer.active) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Reward offer is inactive.");
        }
        String reason = eligibilityReason(offer, profiles.findById(studentId).orElseGet(() -> emptyProfile(studentId)));
        if (reason != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, reason);
        }
    }

    private RewardOfferResponse toResponse(RewardOffer offer, StudentRecognitionProfile profile) {
        String reason = eligibilityReason(offer, profile);
        return new RewardOfferResponse(offer.id, offer.name, offer.description, offer.icon, offer.color,
                offer.requiredPoints, offer.requiredBadges, offer.requiredCertificates, offer.remainingStock,
                offer.active, offer.validUntil, offer.terms, reason == null, reason);
    }

    private String eligibilityReason(RewardOffer offer, StudentRecognitionProfile profile) {
        if (!offer.active) {
            return "Reward offer is inactive.";
        }
        if (offer.validUntil != null && offer.validUntil.isBefore(Instant.now())) {
            return "Reward offer has expired.";
        }
        if (offer.remainingStock <= 0) {
            return "Reward offer is out of stock.";
        }
        if (profile.totalPoints < offer.requiredPoints) {
            return "Requires at least %d points.".formatted(offer.requiredPoints);
        }
        if (profile.badgeCount < offer.requiredBadges) {
            return "Requires at least %d badges.".formatted(offer.requiredBadges);
        }
        if (profile.certificateCount < offer.requiredCertificates) {
            return "Requires at least %d certificates.".formatted(offer.requiredCertificates);
        }
        return null;
    }

    private StudentRecognitionProfile emptyProfile(String studentId) {
        var profile = new StudentRecognitionProfile();
        profile.studentId = studentId;
        profile.updatedOn = Instant.now();
        return profile;
    }

    private void validateOffer(RewardOffer offer) {
        if (offer.id == null || offer.id.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reward id is required.");
        }
        if (offer.name == null || offer.name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reward name is required.");
        }
        if (offer.requiredPoints < 0 || offer.requiredBadges < 0 || offer.requiredCertificates < 0 || offer.remainingStock < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reward requirements and stock cannot be negative.");
        }
    }

    private String voucherPrefix(String rewardId) {
        String cleaned = rewardId == null ? "VCHR" : rewardId.toUpperCase().replaceAll("[^A-Z0-9]", "");
        if (cleaned.isBlank()) {
            return "VCHR";
        }
        return cleaned.substring(0, Math.min(5, cleaned.length()));
    }
}
