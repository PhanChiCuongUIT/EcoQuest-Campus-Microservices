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
    static final String POINTS_GRANTED_QUEUE = "report.points-granted";
    static final String BADGE_UNLOCKED_QUEUE = "report.badge-unlocked";
    static final String CERTIFICATE_ISSUED_QUEUE = "report.certificate-issued";
    static final String MISSION_STATUS_CHANGED_QUEUE = "report.mission-status-changed";
    static final String USER_REGISTERED_QUEUE = "report.user-registered";

    @Bean
    Queue reportActionAcceptedQueue() {
        return new Queue(ACTION_ACCEPTED_QUEUE, true);
    }

    @Bean
    Queue reportActionRejectedQueue() {
        return new Queue(ACTION_REJECTED_QUEUE, true);
    }

    @Bean
    Queue reportPointsGrantedQueue() {
        return new Queue(POINTS_GRANTED_QUEUE, true);
    }

    @Bean
    Queue reportBadgeUnlockedQueue() {
        return new Queue(BADGE_UNLOCKED_QUEUE, true);
    }

    @Bean
    Queue reportCertificateIssuedQueue() {
        return new Queue(CERTIFICATE_ISSUED_QUEUE, true);
    }

    @Bean
    Queue reportMissionStatusChangedQueue() {
        return new Queue(MISSION_STATUS_CHANGED_QUEUE, true);
    }

    @Bean
    Queue reportUserRegisteredQueue() {
        return new Queue(USER_REGISTERED_QUEUE, true);
    }

    @Bean
    Binding bindReportActionAccepted(Queue reportActionAcceptedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(reportActionAcceptedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.ACTION_ACCEPTED);
    }

    @Bean
    Binding bindReportActionRejected(Queue reportActionRejectedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(reportActionRejectedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.ACTION_REJECTED);
    }

    @Bean
    Binding bindReportPointsGranted(Queue reportPointsGrantedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(reportPointsGrantedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.POINTS_GRANTED);
    }

    @Bean
    Binding bindReportBadgeUnlocked(Queue reportBadgeUnlockedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(reportBadgeUnlockedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.BADGE_UNLOCKED);
    }

    @Bean
    Binding bindReportCertificateIssued(Queue reportCertificateIssuedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(reportCertificateIssuedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.CERTIFICATE_ISSUED);
    }

    @Bean
    Binding bindReportMissionStatusChanged(Queue reportMissionStatusChangedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(reportMissionStatusChangedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.MISSION_STATUS_CHANGED);
    }

    @Bean
    Binding bindReportUserRegistered(Queue reportUserRegisteredQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(reportUserRegisteredQueue).to(ecoQuestExchange).with(EcoQuestRabbit.USER_REGISTERED);
    }
}
