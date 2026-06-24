package com.ecoquest.leaderboard;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import java.time.Instant;

@Entity
class LeaderboardSnapshot {
    @Id
    public String id;
    public String seasonId;
    public String seasonType;
    public String studentId;
    public int rankNumber;
    public int points;
    public Instant closedOn;
}

record LeaderboardEntry(String studentId, int rank, int points) {
}

record RankResponse(String studentId, Long rank, Double score) {
}
