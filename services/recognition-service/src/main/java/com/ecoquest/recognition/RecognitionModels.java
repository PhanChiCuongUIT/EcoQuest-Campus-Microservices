package com.ecoquest.recognition;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"studentId", "seasonId"}))
class CertificateRecord {
    @Id
    public String id;
    public String studentId;
    public String seasonId;
    public String certificateType;
    public int rankNumber;
    public int points;
    public String objectKey;
    public Instant issuedOn;
}

@Entity
class RewardClaim {
    @Id
    public String id;
    public String rewardId;
    public String studentId;
    public String rewardName;
    public String status;
    public String voucherCode;
    public Instant claimedOn;
    public Instant expiresAt;
}

record RewardClaimRequest(String studentId, String rewardName) {
}

@Entity
class RewardOffer {
    @Id
    public String id;
    public String name;
    public String description;
    public String icon;
    public String color;
    public int requiredPoints;
    public int requiredBadges;
    public int requiredCertificates;
    public int remainingStock;
    public boolean active;
    public Instant validUntil;
    public String terms;
}

@Entity
class StudentRecognitionProfile {
    @Id
    public String studentId;
    public int totalPoints;
    public int badgeCount;
    public int certificateCount;
    public Instant updatedOn;
}

record RewardOfferResponse(
        String id,
        String name,
        String description,
        String icon,
        String color,
        int requiredPoints,
        int requiredBadges,
        int requiredCertificates,
        int remainingStock,
        boolean active,
        Instant validUntil,
        String terms,
        boolean eligible,
        String eligibilityReason
) {
}
