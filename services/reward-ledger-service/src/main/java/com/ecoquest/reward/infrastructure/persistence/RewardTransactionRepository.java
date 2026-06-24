package com.ecoquest.reward.infrastructure.persistence;

import com.ecoquest.reward.domain.model.RewardTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RewardTransactionRepository extends JpaRepository<RewardTransaction, String> {
    List<RewardTransaction> findByStudentIdOrderByOccurredOnDesc(String studentId);
    boolean existsBySourceActionId(String sourceActionId);
    long countByStudentIdAndActionType(String studentId, String actionType);
}
