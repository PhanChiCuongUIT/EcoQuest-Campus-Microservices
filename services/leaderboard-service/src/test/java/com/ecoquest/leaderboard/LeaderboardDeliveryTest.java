package com.ecoquest.leaderboard;

import com.ecoquest.messaging.events.PointsGrantedEvent;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import java.time.Instant;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class LeaderboardDeliveryTest {
    @Test void deliveriesUseStableGrantIdAndAtomicWeekMonthUpdate() {
        var redis = mock(StringRedisTemplate.class);
        var service = new LeaderboardService(redis, null, null);
        var time = Instant.parse("2026-09-20T17:30:00Z");
        service.onPointsGranted(new PointsGrantedEvent("event1", time, "SV001", "action1", 10, 10));
        service.onPointsGranted(new PointsGrantedEvent("event2", time, "SV001", "action1", 10, 10));
        verify(redis, times(2)).execute(any(RedisScript.class), eq(List.of("ecoquest:leaderboard:processed:SV001",
                "ecoquest:leaderboard:weekly:2026-W38", "ecoquest:leaderboard:monthly:2026-09")), eq("action1"), eq("10"), eq("SV001"));
        verify(redis, never()).opsForZSet();
    }
    @Test void unidentifiableEventIsNotApplied() {
        var redis = mock(StringRedisTemplate.class);
        assertThrows(IllegalArgumentException.class, () -> new LeaderboardService(redis, null, null)
                .onPointsGranted(new PointsGrantedEvent(null, Instant.now(), "SV001", null, 10, 10)));
        verifyNoInteractions(redis);
    }
}
