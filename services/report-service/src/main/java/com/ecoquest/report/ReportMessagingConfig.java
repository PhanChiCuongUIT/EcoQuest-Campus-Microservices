package com.ecoquest.report;

import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class ReportMessagingConfig {
    static final String ACTION_ACCEPTED_QUEUE = "report.eco-action-accepted";
    static final String ACTION_REJECTED_QUEUE = "report.eco-action-rejected";

    @Bean
    Queue reportActionAcceptedQueue() {
        return new Queue(ACTION_ACCEPTED_QUEUE, true);
    }

    @Bean
    Queue reportActionRejectedQueue() {
        return new Queue(ACTION_REJECTED_QUEUE, true);
    }

    @Bean
    Binding bindReportActionAccepted(Queue reportActionAcceptedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(reportActionAcceptedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.ACTION_ACCEPTED);
    }

    @Bean
    Binding bindReportActionRejected(Queue reportActionRejectedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(reportActionRejectedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.ACTION_REJECTED);
    }
}
