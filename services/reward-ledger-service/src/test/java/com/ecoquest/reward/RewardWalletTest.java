package com.ecoquest.reward;
import com.ecoquest.reward.domain.model.RewardWallet;
import com.ecoquest.reward.domain.valueobject.Points;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RewardWalletTest {
    @Test void spendingKeepsCumulativePoints() {
        var wallet = new RewardWallet(); wallet.grant(new Points(100)); wallet.spend(30);
        assertEquals(100, wallet.totalPoints); assertEquals(70, wallet.getAvailablePoints());
    }
    @Test void overspendingAndNegativeCostAreRejected() {
        var wallet = new RewardWallet(); wallet.totalPoints = 100; wallet.spend(80);
        assertThrows(IllegalArgumentException.class, () -> wallet.spend(21));
        assertThrows(IllegalArgumentException.class, () -> wallet.spend(-1));
        assertEquals(20, wallet.getAvailablePoints());
    }
    @Test void adminDeductionCannotSpendAlreadyRedeemedPoints() {
        var wallet = new RewardWallet(); wallet.totalPoints = 100; wallet.spend(80);
        assertThrows(IllegalArgumentException.class, () -> wallet.adjust(new Points(-21)));
        wallet.adjust(new Points(-20)); assertEquals(0, wallet.getAvailablePoints());
    }
}
