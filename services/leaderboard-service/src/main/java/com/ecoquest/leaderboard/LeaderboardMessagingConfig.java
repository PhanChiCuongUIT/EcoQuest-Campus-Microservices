package com.ecoquest.leaderboard;

import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class LeaderboardMessagingConfig {
    static final String POINTS_GRANTED_QUEUE = "leaderboard.points-granted";

    @Bean
    Queue leaderboardPointsGrantedQueue() {
        return new Queue(POINTS_GRANTED_QUEUE, true);
    }

    @Bean
    Binding bindLeaderboardPointsGranted(Queue leaderboardPointsGrantedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(leaderboardPointsGrantedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.POINTS_GRANTED);
    }
}
