package com.ecoquest.reward.infrastructure.persistence;

import com.ecoquest.reward.domain.model.RewardWallet;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RewardWalletRepository extends JpaRepository<RewardWallet, String> {
}
