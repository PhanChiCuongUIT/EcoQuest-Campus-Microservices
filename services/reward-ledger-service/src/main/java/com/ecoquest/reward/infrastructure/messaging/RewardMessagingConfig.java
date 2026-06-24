package com.ecoquest.reward.infrastructure.messaging;

import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RewardMessagingConfig {
    public static final String ACTION_ACCEPTED_QUEUE = "reward.eco-action-accepted";

    @Bean
    Queue rewardActionAcceptedQueue() {
        return new Queue(ACTION_ACCEPTED_QUEUE, true);
    }

    @Bean
    Binding bindRewardActionAccepted(Queue rewardActionAcceptedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(rewardActionAcceptedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.ACTION_ACCEPTED);
    }
}
