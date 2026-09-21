package com.ecoquest.reward.domain.model;

import com.ecoquest.reward.domain.valueobject.Points;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class RewardWallet {
    @Id
    public String studentId;
    public int totalPoints;
    @jakarta.persistence.Column(nullable = false, columnDefinition = "integer default 0")
    public int spentPoints;
    @jakarta.persistence.Version
    @jakarta.persistence.Column(nullable = false, columnDefinition = "bigint default 0")
    public long version;

    public int getAvailablePoints() { return totalPoints - spentPoints; }

    public void spend(int cost) {
        if (cost < 0 || cost > getAvailablePoints()) throw new IllegalArgumentException("Insufficient available points.");
        spentPoints += cost;
    }

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
        if (getAvailablePoints() + points.value() < 0) {
            throw new IllegalArgumentException("Adjustment cannot make the wallet balance negative.");
        }
        totalPoints += points.value();
    }
}
