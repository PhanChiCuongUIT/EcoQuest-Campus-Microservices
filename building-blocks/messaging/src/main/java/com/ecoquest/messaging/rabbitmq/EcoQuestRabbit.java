package com.ecoquest.messaging.rabbitmq;

public final class EcoQuestRabbit {
    public static final String EXCHANGE = "ecoquest.events";
    public static final String ACTION_ACCEPTED = "eco.action.accepted";
    public static final String ACTION_REJECTED = "eco.action.rejected";
    public static final String POINTS_GRANTED = "reward.points.granted";
    public static final String BADGE_UNLOCKED = "reward.badge.unlocked";
    public static final String SEASON_CLOSED = "leaderboard.season.closed";
    public static final String CERTIFICATE_ISSUED = "recognition.certificate.issued";
    public static final String MISSION_STATUS_CHANGED = "catalog.mission.status-changed";
    public static final String USER_REPORT_CREATED = "report.user-report.created";
    public static final String USER_REPORT_REVIEWED = "report.user-report.reviewed";
    public static final String USER_STATUS_CHANGED = "identity.user.status-changed";

    private EcoQuestRabbit() {
    }
}
