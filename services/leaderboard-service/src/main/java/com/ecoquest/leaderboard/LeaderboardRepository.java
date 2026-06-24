package com.ecoquest.leaderboard;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface LeaderboardSnapshotRepository extends JpaRepository<LeaderboardSnapshot, String> {
    List<LeaderboardSnapshot> findBySeasonIdOrderByRankNumberAsc(String seasonId);
    boolean existsBySeasonId(String seasonId);
}
