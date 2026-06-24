package com.ecoquest.reward.domain.model;

import com.ecoquest.reward.domain.valueobject.Points;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class RewardWallet {
    @Id
    public String studentId;
    public int totalPoints;

    public void grant(Points points) {
        if (points.value() <= 0) {
            throw new IllegalArgumentException("Points must be positive.");
        }
        totalPoints += points.value();
    }

    public void adjust(Points points) {
        if (points.value() == 0) {
            throw new IllegalArgumentException("Adjustment cannot be zero.");
        }
        if (totalPoints + points.value() < 0) {
            throw new IllegalArgumentException("Adjustment cannot make the wallet balance negative.");
        }
        totalPoints += points.value();
    }
}
