package com.ecoquest.leaderboard;

import com.ecoquest.common.security.RoleAuthorizer;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
    List<LeaderboardEntry> weekly(@RequestParam(defaultValue = "10") int limit,
                                  @RequestParam(required = false) Integer year,
                                  @RequestParam(required = false) Integer week) {
        try {
            return leaderboard.top("weekly", limit, year, week, null);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @GetMapping("/monthly")
    List<LeaderboardEntry> monthly(@RequestParam(defaultValue = "10") int limit,
                                   @RequestParam(required = false) Integer year,
                                   @RequestParam(required = false) Integer month) {
        try {
            return leaderboard.top("monthly", limit, year, null, month);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @GetMapping("/users/{studentId}/rank")
    RankResponse rank(@PathVariable String studentId,
                      @RequestParam(defaultValue = "weekly") String type,
                      @RequestParam(required = false) Integer year,
                      @RequestParam(required = false) Integer week,
                      @RequestParam(required = false) Integer month) {
        try {
            return leaderboard.rank(type, studentId, year, week, month);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
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
