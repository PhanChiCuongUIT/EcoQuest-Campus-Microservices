package com.ecoquest.leaderboard;

import com.ecoquest.common.security.RoleAuthorizer;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/leaderboards")
class LeaderboardController {
    private final LeaderboardService leaderboard;
    private final LeaderboardSnapshotRepository snapshots;

    LeaderboardController(LeaderboardService leaderboard, LeaderboardSnapshotRepository snapshots) {
        this.leaderboard = leaderboard;
        this.snapshots = snapshots;
    }

    @GetMapping("/weekly")
    List<LeaderboardEntry> weekly(@RequestParam(defaultValue = "10") int limit) {
        return leaderboard.top("weekly", limit);
    }

    @GetMapping("/monthly")
    List<LeaderboardEntry> monthly(@RequestParam(defaultValue = "10") int limit) {
        return leaderboard.top("monthly", limit);
    }

    @GetMapping("/users/{studentId}/rank")
    RankResponse rank(@PathVariable String studentId, @RequestParam(defaultValue = "weekly") String type) {
        return leaderboard.rank(type, studentId);
    }

    @PostMapping("/seasons/{id}/close")
    List<LeaderboardEntry> close(@PathVariable String id,
                                 @RequestParam(defaultValue = "weekly") String type,
                                 @RequestParam(defaultValue = "10") int winners,
                                 HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        return leaderboard.closeSeason(id, type, winners);
    }

    @GetMapping("/seasons/{id}/snapshots")
    List<LeaderboardSnapshot> snapshots(@PathVariable String id) {
        return snapshots.findBySeasonIdOrderByRankNumberAsc(id);
    }
}
