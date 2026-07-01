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
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
class LeaderboardService {
    private static final String WEEKLY_KEY = "ecoquest:leaderboard:weekly";
    private static final String MONTHLY_KEY = "ecoquest:leaderboard:monthly";
    private static final WeekFields ISO_WEEK = WeekFields.ISO;

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
        Instant occurredOn = event.occurredOn() == null ? Instant.now() : event.occurredOn();
        increment(event.studentId(), event.points(), occurredOn);
    }

    List<LeaderboardEntry> top(String type, int limit) {
        return top(type, limit, null, null, null);
    }

    List<LeaderboardEntry> top(String type, int limit, Integer year, Integer week, Integer month) {
        String key = key(type, year, week, month);
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
        return rank(type, studentId, null, null, null);
    }

    RankResponse rank(String type, String studentId, Integer year, Integer week, Integer month) {
        String key = key(type, year, week, month);
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
        return key(type, null, null, null);
    }

    private String key(String type, Integer year, Integer week, Integer month) {
        if ("monthly".equalsIgnoreCase(type)) {
            return month == null || year == null ? monthlyKey(Instant.now()) : monthlyKey(year, month);
        }
        return week == null || year == null ? weeklyKey(Instant.now()) : weeklyKey(year, week);
    }

    void increment(String studentId, int points, Instant occurredOn) {
        redis.opsForZSet().incrementScore(weeklyKey(occurredOn), studentId, points);
        redis.opsForZSet().incrementScore(monthlyKey(occurredOn), studentId, points);
    }

    static String weeklyKey(Instant instant) {
        var date = instant.atZone(ZoneOffset.UTC).toLocalDate();
        int weekBasedYear = date.get(ISO_WEEK.weekBasedYear());
        int week = date.get(ISO_WEEK.weekOfWeekBasedYear());
        return weeklyKey(weekBasedYear, week);
    }

    static String weeklyKey(int year, int week) {
        if (week < 1 || week > 53) {
            throw new IllegalArgumentException("Week must be between 1 and 53.");
        }
        return "%s:%d-W%02d".formatted(WEEKLY_KEY, year, week);
    }

    static String monthlyKey(Instant instant) {
        YearMonth month = YearMonth.from(instant.atZone(ZoneOffset.UTC));
        return monthlyKey(month.getYear(), month.getMonthValue());
    }

    static String monthlyKey(int year, int month) {
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("Month must be between 1 and 12.");
        }
        return "%s:%d-%02d".formatted(MONTHLY_KEY, year, month);
    }
}
