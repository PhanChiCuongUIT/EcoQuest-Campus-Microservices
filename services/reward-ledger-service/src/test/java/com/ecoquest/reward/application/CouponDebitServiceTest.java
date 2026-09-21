package com.ecoquest.reward.application;
import com.ecoquest.messaging.events.CouponDebitRequested;
import com.ecoquest.reward.domain.model.RewardWallet;
import com.ecoquest.reward.infrastructure.persistence.*;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CouponDebitServiceTest {
    @Test void freeCouponDoesNotRequireAnExistingWallet() {
        var records = mock(CouponDebitRepository.class); var wallets = mock(RewardWalletRepository.class); var txs = mock(RewardTransactionRepository.class);
        when(wallets.lockByStudentId("NEW")).thenReturn(Optional.empty());
        var service = new CouponDebitService(records, wallets, txs);
        assertTrue(service.debit(new CouponDebitRequested("FREE", "NEW", "Welcome", 0)).accepted());
        verify(wallets, never()).save(any());
        verify(txs).save(argThat(tx -> tx.points == 0 && "COUPON_REDEMPTION".equals(tx.actionType)));
        verify(records).save(argThat(record -> record.accepted && record.cost == 0));
    }
    @Test void duplicateDebitDoesNotDeductTwice() {
        var records = mock(CouponDebitRepository.class); var wallets = mock(RewardWalletRepository.class); var txs = mock(RewardTransactionRepository.class);
        var wallet = new RewardWallet(); wallet.totalPoints = 100;
        when(wallets.lockByStudentId("S")).thenReturn(Optional.of(wallet));
        when(records.findById("C")).thenReturn(Optional.empty());
        var service = new CouponDebitService(records, wallets, txs);
        var request = new CouponDebitRequested("C", "S", "Cafe", 30);
        assertTrue(service.debit(request).accepted()); assertEquals(70, wallet.getAvailablePoints());
        var record = new CouponDebitRecord(); record.claimId = "C"; record.accepted = true;
        when(records.findById("C")).thenReturn(Optional.of(record));
        assertTrue(service.debit(request).accepted()); assertEquals(70, wallet.getAvailablePoints());
        verify(txs, times(1)).save(any());
    }
    @Test void insufficientBalanceStoresRejectionWithoutTransaction() {
        var records = mock(CouponDebitRepository.class); var wallets = mock(RewardWalletRepository.class); var txs = mock(RewardTransactionRepository.class);
        var wallet = new RewardWallet(); wallet.totalPoints = 100; wallet.spentPoints = 90;
        when(wallets.lockByStudentId("S")).thenReturn(Optional.of(wallet));
        assertFalse(new CouponDebitService(records, wallets, txs).debit(new CouponDebitRequested("C", "S", "Cafe", 30)).accepted());
        verify(txs, never()).save(any()); assertEquals(100, wallet.totalPoints);
    }
}
