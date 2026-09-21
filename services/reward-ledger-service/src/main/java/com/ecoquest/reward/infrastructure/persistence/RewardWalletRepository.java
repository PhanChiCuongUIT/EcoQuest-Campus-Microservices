package com.ecoquest.reward.infrastructure.persistence;

import com.ecoquest.reward.domain.model.RewardWallet;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RewardWalletRepository extends JpaRepository<RewardWallet, String> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select w from RewardWallet w where w.studentId = :studentId")
    java.util.Optional<RewardWallet> lockByStudentId(@org.springframework.data.repository.query.Param("studentId") String studentId);
}
