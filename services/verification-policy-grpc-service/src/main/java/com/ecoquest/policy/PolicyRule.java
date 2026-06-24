package com.ecoquest.policy;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
class PolicyRule {
    @Id
    public String actionType;
    public int basePoints;
    public boolean evidenceRequired;
    public boolean stationRequired;
    public int dailyLimit;
    public boolean active;
}
