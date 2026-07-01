package com.ecoquest.recognition;

import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class RecognitionMessagingConfig {
    static final String SEASON_CLOSED_QUEUE = "recognition.season-closed";
    static final String POINTS_GRANTED_QUEUE = "recognition.points-granted";
    static final String BADGE_UNLOCKED_QUEUE = "recognition.badge-unlocked";

    @Bean
    Queue recognitionSeasonClosedQueue() {
        return new Queue(SEASON_CLOSED_QUEUE, true);
    }

    @Bean
    Binding bindRecognitionSeasonClosed(Queue recognitionSeasonClosedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(recognitionSeasonClosedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.SEASON_CLOSED);
    }

    @Bean
    Queue recognitionPointsGrantedQueue() {
        return new Queue(POINTS_GRANTED_QUEUE, true);
    }

    @Bean
    Binding bindRecognitionPointsGranted(Queue recognitionPointsGrantedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(recognitionPointsGrantedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.POINTS_GRANTED);
    }

    @Bean
    Queue recognitionBadgeUnlockedQueue() {
        return new Queue(BADGE_UNLOCKED_QUEUE, true);
    }

    @Bean
    Binding bindRecognitionBadgeUnlocked(Queue recognitionBadgeUnlockedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(recognitionBadgeUnlockedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.BADGE_UNLOCKED);
    }
}
