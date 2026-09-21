package com.ecoquest.catalog;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

enum MissionStatus {
    PENDING,
    ACTIVE,
    REJECTED,
    CANCELLED,
    COMPLETED
}

@Entity
class Mission {
    @Id
    public String id;
    @NotBlank
    public String title;
    @NotBlank
    public String actionType;
    @Positive
    public int basePoints;
    public boolean evidenceRequired;
    public Boolean stationRequired;
    @jakarta.persistence.ElementCollection(fetch = jakarta.persistence.FetchType.EAGER)
    public java.util.Set<String> allowedStationIds = new java.util.HashSet<>();
    public Integer stationConfigVersion;
    public String description;
    public String createdByUserId;
    @Enumerated(EnumType.STRING)
    public MissionStatus status;

    @PrePersist
    @PreUpdate
    void applyMissionDefaults() {
        if (status == null) {
            status = MissionStatus.PENDING;
        }
        if (stationRequired == null) {
            stationRequired = false;
        }
    }
}

@Entity
class GreenStation {
    @Id
    public String id;
    public String name;
    public String code;
    public String stationType;
    public String location;
    public boolean active;
    public String imageUrl;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @jakarta.persistence.Column(unique = true)
    public String qrToken;
}

@Entity
class BadgeDefinition {
    @Id
    public String code;
    public String name;
    public String description;
    public int requiredPoints;
    public String criteriaType;
    public String actionType;
    public Integer requiredCount;
    public String imageUrl;
    public Boolean active = true;

    @PrePersist
    @PreUpdate
    void applyDefaults() {
        if (criteriaType == null || criteriaType.isBlank()) {
            criteriaType = "POINTS";
        }
        if (requiredCount == null) {
            requiredCount = 0;
        }
    }
}
