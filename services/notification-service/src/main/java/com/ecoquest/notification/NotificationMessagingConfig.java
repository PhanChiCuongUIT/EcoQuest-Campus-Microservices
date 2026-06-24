package com.ecoquest.notification;

import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class NotificationMessagingConfig {
    static final String ACTION_ACCEPTED_QUEUE = "notification.eco-action-accepted";
    static final String ACTION_REJECTED_QUEUE = "notification.eco-action-rejected";
    static final String BADGE_UNLOCKED_QUEUE = "notification.badge-unlocked";
    static final String CERTIFICATE_ISSUED_QUEUE = "notification.certificate-issued";
    static final String MISSION_STATUS_CHANGED_QUEUE = "notification.mission-status-changed";
    static final String USER_REPORT_CREATED_QUEUE = "notification.user-report-created";
    static final String USER_REPORT_REVIEWED_QUEUE = "notification.user-report-reviewed";
    static final String USER_STATUS_CHANGED_QUEUE = "notification.user-status-changed";

    @Bean
    Queue notificationActionAcceptedQueue() {
        return new Queue(ACTION_ACCEPTED_QUEUE, true);
    }

    @Bean
    Queue notificationActionRejectedQueue() {
        return new Queue(ACTION_REJECTED_QUEUE, true);
    }

    @Bean
    Queue notificationBadgeUnlockedQueue() {
        return new Queue(BADGE_UNLOCKED_QUEUE, true);
    }

    @Bean
    Queue notificationCertificateIssuedQueue() {
        return new Queue(CERTIFICATE_ISSUED_QUEUE, true);
    }

    @Bean
    Queue notificationMissionStatusChangedQueue() {
        return new Queue(MISSION_STATUS_CHANGED_QUEUE, true);
    }

    @Bean
    Queue notificationUserReportCreatedQueue() {
        return new Queue(USER_REPORT_CREATED_QUEUE, true);
    }

    @Bean
    Queue notificationUserReportReviewedQueue() {
        return new Queue(USER_REPORT_REVIEWED_QUEUE, true);
    }

    @Bean
    Queue notificationUserStatusChangedQueue() {
        return new Queue(USER_STATUS_CHANGED_QUEUE, true);
    }

    @Bean
    Binding bindNotificationActionAccepted(Queue notificationActionAcceptedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(notificationActionAcceptedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.ACTION_ACCEPTED);
    }

    @Bean
    Binding bindNotificationActionRejected(Queue notificationActionRejectedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(notificationActionRejectedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.ACTION_REJECTED);
    }

    @Bean
    Binding bindNotificationBadgeUnlocked(Queue notificationBadgeUnlockedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(notificationBadgeUnlockedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.BADGE_UNLOCKED);
    }

    @Bean
    Binding bindNotificationCertificateIssued(Queue notificationCertificateIssuedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(notificationCertificateIssuedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.CERTIFICATE_ISSUED);
    }

    @Bean
    Binding bindNotificationMissionStatusChanged(Queue notificationMissionStatusChangedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(notificationMissionStatusChangedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.MISSION_STATUS_CHANGED);
    }

    @Bean
    Binding bindNotificationUserReportCreated(Queue notificationUserReportCreatedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(notificationUserReportCreatedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.USER_REPORT_CREATED);
    }

    @Bean
    Binding bindNotificationUserReportReviewed(Queue notificationUserReportReviewedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(notificationUserReportReviewedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.USER_REPORT_REVIEWED);
    }

    @Bean
    Binding bindNotificationUserStatusChanged(Queue notificationUserStatusChangedQueue, TopicExchange ecoQuestExchange) {
        return BindingBuilder.bind(notificationUserStatusChangedQueue).to(ecoQuestExchange).with(EcoQuestRabbit.USER_STATUS_CHANGED);
    }
}
