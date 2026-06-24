package com.ecoquest.reward.domain.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"studentId", "badgeCode"}))
public class BadgeAchievement {
    @Id
    public String id;
    public String studentId;
    public String badgeCode;
    public String badgeName;
    public Instant unlockedOn;
}
