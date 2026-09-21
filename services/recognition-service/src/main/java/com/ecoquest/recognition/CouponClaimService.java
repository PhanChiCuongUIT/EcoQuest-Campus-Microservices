package com.ecoquest.recognition;

import com.ecoquest.messaging.events.CouponDebitRequested;
import com.ecoquest.messaging.events.CouponDebitDecided;
import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.*;
import org.springframework.scheduling.annotation.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.UUID;
import static org.springframework.http.HttpStatus.*;

@Configuration
@EnableScheduling
class CouponClaimConfig {
    @Bean Declarables couponResultBinding() {
        var q = new Queue("recognition.coupon-debit-result", true);
        return new Declarables(q, BindingBuilder.bind(q).to(new TopicExchange(EcoQuestRabbit.EXCHANGE)).with("coupon.debit.decided.v1"));
    }
}

@Service
class CouponClaimService {
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    private final RewardClaimRepository claims;
    private final RewardOfferRepository offers;
    private final StudentRecognitionProfileRepository profiles;
    CouponClaimService(RewardClaimRepository claims, RewardOfferRepository offers, StudentRecognitionProfileRepository profiles) {
        this.claims = claims; this.offers = offers; this.profiles = profiles;
    }
    @Transactional
    public RewardClaim claim(String rewardId, String studentId) {
        var offer = offers.lockById(rewardId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Reward offer not found."));
        var existing = claims.findFirstByStudentIdAndRewardIdOrderByClaimedOnDesc(studentId, rewardId);
        if (existing.isPresent() && !"FAILED".equals(existing.get().status)) return existing.get();
        var profile = profiles.findById(studentId).orElseGet(StudentRecognitionProfile::new);
        if (!offer.active || offer.remainingStock <= 0 || (offer.validUntil != null && !offer.validUntil.isAfter(Instant.now())))
            throw new ResponseStatusException(CONFLICT, "Reward is inactive, expired or out of stock.");
        if (profile.badgeCount < offer.requiredBadges || profile.certificateCount < offer.requiredCertificates)
            throw new ResponseStatusException(CONFLICT, "Badge or certificate requirements are not met.");
        var claim = new RewardClaim();
        claim.id = "CLAIM-" + UUID.randomUUID(); claim.studentId = studentId; claim.rewardId = rewardId;
        claim.rewardName = offer.name; claim.pointsCost = offer.requiredPoints; claim.status = "PENDING";
        claim.claimedOn = Instant.now(); claim.expiresAt = offer.validUntil;
        offer.remainingStock--;
        offers.save(offer);
        return claims.save(claim);
    }

    @RabbitListener(queues = "recognition.coupon-debit-result")
    @Transactional
    public void complete(CouponDebitDecided event) {
        var initial = claims.findById(event.claimId()).orElse(null);
        if (initial == null) return;
        var offer = offers.lockById(initial.rewardId).orElseThrow();
        var claim = claims.findById(event.claimId()).orElseThrow();
        entityManager.refresh(claim);
        if (!"PENDING".equals(claim.status)) return;
        claim.status = event.accepted() ? "ISSUED" : "FAILED";
        if (event.accepted()) claim.voucherCode = "ECO-" + UUID.randomUUID().toString().toUpperCase();
        else { claim.failureReason = event.reason(); offer.remainingStock++; offers.save(offer); }
        claims.save(claim);
    }
}

@Service
class CouponRequestPublisher {
    private final RewardClaimRepository claims;
    private final RabbitTemplate rabbit;
    CouponRequestPublisher(RewardClaimRepository claims, RabbitTemplate rabbit) { this.claims = claims; this.rabbit = rabbit; }
    // PENDING rows are a durable command outbox: retry until the debit decision is applied.
    @Scheduled(initialDelay = 5000, fixedDelay = 3000)
    void publishPending() {
        for (var c : claims.findByStatus("PENDING"))
            rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, "coupon.debit.requested.v1", new CouponDebitRequested(c.id, c.studentId, c.rewardName, c.pointsCost));
    }
}
