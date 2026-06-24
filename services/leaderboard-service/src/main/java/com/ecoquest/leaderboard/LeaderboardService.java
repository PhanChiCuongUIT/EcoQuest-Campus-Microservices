package com.ecoquest.leaderboard;

import com.ecoquest.messaging.events.LeaderboardSeasonClosedEvent;
import com.ecoquest.messaging.events.PointsGrantedEvent;
import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
class LeaderboardService {
    private static final String WEEKLY_KEY = "ecoquest:leaderboard:weekly";
    private static final String MONTHLY_KEY = "ecoquest:leaderboard:monthly";

    private final StringRedisTemplate redis;
    private final LeaderboardSnapshotRepository snapshots;
    private final RabbitTemplate rabbit;

    LeaderboardService(StringRedisTemplate redis, LeaderboardSnapshotRepository snapshots, RabbitTemplate rabbit) {
        this.redis = redis;
        this.snapshots = snapshots;
        this.rabbit = rabbit;
    }

    @RabbitListener(queues = LeaderboardMessagingConfig.POINTS_GRANTED_QUEUE)
    public void onPointsGranted(PointsGrantedEvent event) {
        redis.opsForZSet().incrementScore(WEEKLY_KEY, event.studentId(), event.points());
        redis.opsForZSet().incrementScore(MONTHLY_KEY, event.studentId(), event.points());
    }

    List<LeaderboardEntry> top(String type, int limit) {
        String key = key(type);
        Set<ZSetOperations.TypedTuple<String>> rows = redis.opsForZSet().reverseRangeWithScores(key, 0, limit - 1);
        List<LeaderboardEntry> result = new ArrayList<>();
        int rank = 1;
        if (rows != null) {
            for (ZSetOperations.TypedTuple<String> row : rows) {
                result.add(new LeaderboardEntry(row.getValue(), rank++, row.getScore() == null ? 0 : row.getScore().intValue()));
            }
        }
        return result;
    }

    RankResponse rank(String type, String studentId) {
        String key = key(type);
        Long zeroBased = redis.opsForZSet().reverseRank(key, studentId);
        Double score = redis.opsForZSet().score(key, studentId);
        return new RankResponse(studentId, zeroBased == null ? null : zeroBased + 1, score);
    }

    @Transactional
    List<LeaderboardEntry> closeSeason(String seasonId, String type, int winners) {
        if (snapshots.existsBySeasonId(seasonId)) {
            return snapshots.findBySeasonIdOrderByRankNumberAsc(seasonId).stream()
                    .map(snapshot -> new LeaderboardEntry(snapshot.studentId, snapshot.rankNumber, snapshot.points))
                    .toList();
        }
        List<LeaderboardEntry> top = top(type, winners);
        List<LeaderboardSeasonClosedEvent.Winner> eventWinners = new ArrayList<>();
        for (LeaderboardEntry entry : top) {
            LeaderboardSnapshot snapshot = new LeaderboardSnapshot();
            snapshot.id = UUID.randomUUID().toString();
            snapshot.seasonId = seasonId;
            snapshot.seasonType = type;
            snapshot.studentId = entry.studentId();
            snapshot.rankNumber = entry.rank();
            snapshot.points = entry.points();
            snapshot.closedOn = Instant.now();
            snapshots.save(snapshot);
            eventWinners.add(new LeaderboardSeasonClosedEvent.Winner(entry.studentId(), entry.rank(), entry.points()));
        }
        rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, EcoQuestRabbit.SEASON_CLOSED,
                new LeaderboardSeasonClosedEvent(UUID.randomUUID().toString(), Instant.now(), seasonId, type, eventWinners));
        return top;
    }

    private String key(String type) {
        return "monthly".equalsIgnoreCase(type) ? MONTHLY_KEY : WEEKLY_KEY;
    }
}
