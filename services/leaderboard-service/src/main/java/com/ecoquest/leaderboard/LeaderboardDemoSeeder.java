package com.ecoquest.leaderboard;

import org.springframework.boot.CommandLineRunner;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

@Component
class LeaderboardDemoSeeder implements CommandLineRunner {
    private final StringRedisTemplate redis;

    LeaderboardDemoSeeder(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public void run(String... args) {
        DemoScore[] scores = {
                new DemoScore("SV001", 10, 0),
                new DemoScore("SV002", 18, 0),
                new DemoScore("SV003", 16, 1),
                new DemoScore("SV004", 24, 1),
                new DemoScore("SV005", 20, 2),
                new DemoScore("SV006", 25, 2),
                new DemoScore("SV007", 12, 3),
                new DemoScore("SV008", 8, 3),
                new DemoScore("SV009", 30, 4),
                new DemoScore("SV010", 14, 5),
                new DemoScore("SV001", 14, 8),
                new DemoScore("SV002", 22, 9),
                new DemoScore("SV003", 5, 10),
                new DemoScore("SV004", 18, 12),
                new DemoScore("SV005", 10, 13),
                new DemoScore("SV006", 30, 16),
                new DemoScore("SV007", 25, 22),
                new DemoScore("SV008", 20, 28),
                new DemoScore("SV009", 16, 35),
                new DemoScore("SV010", 18, 45),
                new DemoScore("SV001", 8, 66),
                new DemoScore("SV002", 12, 76),
                new DemoScore("SV004", 14, 110),
                new DemoScore("SV005", 22, 145),
                new DemoScore("SV006", 16, 180),
                new DemoScore("SV007", 18, 220),
                new DemoScore("SV008", 10, 300)
        };

        Map<String, Map<String, Integer>> totalsByKey = new HashMap<>();
        for (DemoScore score : scores) {
            Instant occurredOn = Instant.now().minus(score.daysAgo(), ChronoUnit.DAYS);
            merge(totalsByKey, LeaderboardService.weeklyKey(occurredOn), score.studentId(), score.points());
            merge(totalsByKey, LeaderboardService.monthlyKey(occurredOn), score.studentId(), score.points());
        }

        totalsByKey.forEach((key, totals) ->
                totals.forEach((studentId, points) ->
                        redis.opsForZSet().add(key, studentId, points.doubleValue())));
    }

    private void merge(Map<String, Map<String, Integer>> totalsByKey, String key, String studentId, int points) {
        totalsByKey.computeIfAbsent(key, ignored -> new HashMap<>()).merge(studentId, points, Integer::sum);
    }

    private record DemoScore(String studentId, int points, long daysAgo) {
    }
}
