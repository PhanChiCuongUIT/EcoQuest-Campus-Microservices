package com.ecoquest.leaderboard;

import org.springframework.boot.CommandLineRunner;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.ArrayList;
import java.util.List;

@Component
class LeaderboardDemoSeeder implements CommandLineRunner {
    // Seed once atomically; never replace scores produced by real point events.
    private static final DefaultRedisScript<Long> SEED = new DefaultRedisScript<>("""
            if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
            for i = 1, #ARGV, 3 do
                redis.call('ZADD', KEYS[tonumber(ARGV[i])], 'NX', ARGV[i + 2], ARGV[i + 1])
            end
            redis.call('SET', KEYS[1], '1')
            return 1
            """, Long.class);
    private final StringRedisTemplate redis;

    LeaderboardDemoSeeder(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public void run(String... args) {
        DemoScore[] scores = {
                new DemoScore("SV001", 10, 1),
                new DemoScore("SV003", 5, 3),
                new DemoScore("SV005", 20, 5),
                new DemoScore("SV006", 25, 6),
                new DemoScore("SV007", 12, 8),
                new DemoScore("SV008", 8, 10),
                new DemoScore("SV001", 14, 12),
                new DemoScore("SV002", 22, 14),
                new DemoScore("SV003", 16, 18),
                new DemoScore("SV004", 18, 21),
                new DemoScore("SV005", 10, 27),
                new DemoScore("SV006", 30, 35),
                new DemoScore("SV008", 20, 53),
                new DemoScore("SV001", 8, 66),
                new DemoScore("SV002", 12, 76),
                new DemoScore("SV004", 14, 110),
                new DemoScore("SV005", 22, 145),
                new DemoScore("SV006", 16, 180),
                new DemoScore("SV007", 18, 220),
                new DemoScore("SV008", 10, 300),
                new DemoScore("SV009", 18, 0),
                new DemoScore("SV010", 20, 0),
                new DemoScore("SV001", 12, 0),
                new DemoScore("SV002", 18, 1),
                new DemoScore("SV003", 20, 1),
                new DemoScore("SV005", 30, 2),
                new DemoScore("SV006", 20, 3),
                new DemoScore("SV007", 12, 4),
                new DemoScore("SV008", 8, 5),
                new DemoScore("SV010", 14, 9)
        };

        Map<String, Map<String, Integer>> totalsByKey = new HashMap<>();
        for (DemoScore score : scores) {
            Instant occurredOn = Instant.now().minus(score.daysAgo(), ChronoUnit.DAYS);
            merge(totalsByKey, LeaderboardService.weeklyKey(occurredOn), score.studentId(), score.points());
            merge(totalsByKey, LeaderboardService.monthlyKey(occurredOn), score.studentId(), score.points());
        }

        List<String> keys = new ArrayList<>();
        keys.add("ecoquest:seed:leaderboard:v1");
        List<String> arguments = new ArrayList<>();
        totalsByKey.forEach((key, totals) -> {
            keys.add(key);
            String keyIndex = Integer.toString(keys.size());
            totals.forEach((studentId, points) -> {
                arguments.add(keyIndex);
                arguments.add(studentId);
                arguments.add(points.toString());
            });
        });
        redis.execute(SEED, keys, arguments.toArray());
    }

    private void merge(Map<String, Map<String, Integer>> totalsByKey, String key, String studentId, int points) {
        totalsByKey.computeIfAbsent(key, ignored -> new HashMap<>()).merge(studentId, points, Integer::sum);
    }

    private record DemoScore(String studentId, int points, long daysAgo) {
    }
}
