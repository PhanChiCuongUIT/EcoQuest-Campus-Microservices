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
}

record RewardClaimRequest(String studentId, String rewardName) {
}
