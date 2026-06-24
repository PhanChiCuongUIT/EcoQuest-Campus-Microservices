package com.ecoquest.reward.domain.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = "sourceActionId"))
public class RewardTransaction {
    @Id
    public String id;
    public String studentId;
    public String sourceActionId;
    public String missionId;
    public String actionType;
    public String reason;
    public String adjustedByUserId;
    public int points;
    public Instant occurredOn;
}
