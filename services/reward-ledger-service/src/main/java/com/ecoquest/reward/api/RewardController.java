package com.ecoquest.reward.api;

import com.ecoquest.common.security.RoleAuthorizer;
import com.ecoquest.reward.domain.model.BadgeAchievement;
import com.ecoquest.reward.domain.model.RewardTransaction;
import com.ecoquest.reward.domain.model.RewardWallet;
import com.ecoquest.reward.application.RewardLedgerService;
import com.ecoquest.reward.infrastructure.persistence.BadgeAchievementRepository;
import com.ecoquest.reward.infrastructure.persistence.RewardTransactionRepository;
import com.ecoquest.reward.infrastructure.persistence.RewardWalletRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/rewards")
public class RewardController {
    private final RewardWalletRepository wallets;
    private final RewardTransactionRepository transactions;
    private final BadgeAchievementRepository badges;
    private final RewardLedgerService ledgerService;

    public RewardController(RewardWalletRepository wallets, RewardTransactionRepository transactions,
                            BadgeAchievementRepository badges, RewardLedgerService ledgerService) {
        this.wallets = wallets;
        this.transactions = transactions;
        this.badges = badges;
        this.ledgerService = ledgerService;
    }

    @GetMapping("/wallets/{studentId}")
    RewardWallet wallet(@PathVariable String studentId, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireSelfOrAnyRole(httpRequest, studentId, "ADMIN");
        return wallets.findById(studentId).orElseGet(() -> {
            RewardWallet empty = new RewardWallet();
            empty.studentId = studentId;
            return empty;
        });
    }

    @GetMapping("/wallets/{studentId}/transactions")
    List<RewardTransaction> transactions(@PathVariable String studentId, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireSelfOrAnyRole(httpRequest, studentId, "ADMIN");
        return this.transactions.findByStudentIdOrderByOccurredOnDesc(studentId);
    }

    @GetMapping("/wallets/{studentId}/badges")
    List<BadgeAchievement> badges(@PathVariable String studentId, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireSelfOrAnyRole(httpRequest, studentId, "ADMIN");
        return this.badges.findByStudentId(studentId);
    }

    @PostMapping("/adjust")
    RewardTransaction adjust(@RequestBody ManualAdjustment adjustment, HttpServletRequest httpRequest) {
        var admin = RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        return ledgerService.grantManualAdjustment(
                adjustment.studentId(),
                adjustment.points(),
                adjustment.reason(),
                admin.userId());
    }

    record ManualAdjustment(String studentId, int points, String reason) {
    }
}
