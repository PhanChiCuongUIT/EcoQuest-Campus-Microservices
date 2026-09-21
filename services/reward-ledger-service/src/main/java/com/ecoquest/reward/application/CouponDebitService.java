package com.ecoquest.reward.application;

import com.ecoquest.messaging.events.CouponDebitRequested;
import com.ecoquest.messaging.events.CouponDebitDecided;
import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import com.ecoquest.reward.infrastructure.persistence.*;
import com.ecoquest.reward.domain.model.RewardTransaction;
import jakarta.persistence.*;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;

@Entity
class CouponDebitRecord {
    @Id public String claimId;
    public String studentId;
    public int cost;
    public boolean accepted;
    public String reason;
    public Instant occurredOn;
}
interface CouponDebitRepository extends JpaRepository<CouponDebitRecord, String> {}

@Configuration
class CouponDebitConfig {
    @Bean Declarables couponRequestBinding() {
        var q = new Queue("reward.coupon-debit", true);
        return new Declarables(q, BindingBuilder.bind(q).to(new TopicExchange(EcoQuestRabbit.EXCHANGE)).with("coupon.debit.requested.v1"));
    }
}

@Service
class CouponDebitService {
    private final CouponDebitRepository debits;
    private final RewardWalletRepository wallets;
    private final RewardTransactionRepository transactions;
    CouponDebitService(CouponDebitRepository debits, RewardWalletRepository wallets, RewardTransactionRepository transactions) {
        this.debits = debits; this.wallets = wallets; this.transactions = transactions;
    }
    @Transactional
    public CouponDebitDecided debit(CouponDebitRequested request) {
        var wallet = wallets.lockByStudentId(request.studentId()).orElse(null);
        var previous = debits.findById(request.claimId());
        if (previous.isPresent()) return result(previous.get());
        var d = new CouponDebitRecord(); d.claimId = request.claimId(); d.studentId = request.studentId(); d.cost = request.cost(); d.occurredOn = Instant.now();
        int available = wallet == null ? 0 : wallet.getAvailablePoints();
        d.accepted = request.cost() >= 0 && available >= request.cost();
        d.reason = d.accepted ? null : "Insufficient available points.";
        if (d.accepted) {
            if (wallet != null) { wallet.spend(request.cost()); wallets.save(wallet); }
            var tx = new RewardTransaction(); tx.id = request.claimId(); tx.studentId = request.studentId();
            tx.sourceActionId = request.claimId(); tx.actionType = "COUPON_REDEMPTION";
            tx.points = -request.cost(); tx.reason = "Coupon: " + request.rewardName(); tx.occurredOn = Instant.now();
            transactions.save(tx);
        }
        debits.save(d);
        return result(d);
    }
    private CouponDebitDecided result(CouponDebitRecord d) { return new CouponDebitDecided(d.claimId, d.accepted, d.reason); }
}

@Service
class CouponDebitListener {
    private final CouponDebitService service;
    private final RabbitTemplate rabbit;
    CouponDebitListener(CouponDebitService service, RabbitTemplate rabbit) { this.service = service; this.rabbit = rabbit; }
    @RabbitListener(queues = "reward.coupon-debit")
    public void consume(CouponDebitRequested request) {
        // Commit debit before publishing. Redelivery reads the same persisted decision.
        var result = service.debit(request);
        rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, "coupon.debit.decided.v1", result);
    }
}
