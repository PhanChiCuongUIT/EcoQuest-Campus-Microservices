package com.ecoquest.reward;

import com.ecoquest.reward.domain.model.RewardWallet;
import com.ecoquest.reward.infrastructure.persistence.*;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RewardDemoSeederTest {
    @Test
    void restartDoesNotRestorePointsRemovedByAnAdmin() {
        var wallets = mock(RewardWalletRepository.class);
        var transactions = mock(RewardTransactionRepository.class);
        var badges = mock(BadgeAchievementRepository.class);
        when(transactions.existsBySourceActionId(anyString())).thenReturn(true);
        when(badges.existsById(anyString())).thenReturn(true);

        new RewardDemoSeeder(wallets, transactions, badges).run();

        verifyNoInteractions(wallets);
        verify(transactions, never()).save(any());
    }

    @Test
    void onlyMissingTransactionAddsItsPointsToExistingWallet() {
        var wallets = mock(RewardWalletRepository.class);
        var transactions = mock(RewardTransactionRepository.class);
        var badges = mock(BadgeAchievementRepository.class);
        when(transactions.existsBySourceActionId(anyString())).thenReturn(true);
        when(transactions.existsBySourceActionId("DEMO-ACTION-001")).thenReturn(false);
        when(badges.existsById(anyString())).thenReturn(true);
        var wallet = new RewardWallet();
        wallet.studentId = "SV001";
        wallet.totalPoints = 7;
        when(wallets.findById("SV001")).thenReturn(Optional.of(wallet));

        new RewardDemoSeeder(wallets, transactions, badges).run();

        assertEquals(17, wallet.totalPoints);
        verify(transactions, times(1)).save(any());
        verify(wallets).save(wallet);
    }
}
