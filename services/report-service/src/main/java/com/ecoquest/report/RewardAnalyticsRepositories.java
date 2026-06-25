package com.ecoquest.report;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;

interface StudentRewardSnapshotRepository extends JpaRepository<StudentRewardSnapshot, String> {
}

interface BadgeAnalyticsRepository extends JpaRepository<BadgeAnalyticsRecord, String> {
    long countByOccurredOnBetween(Instant from, Instant to);

    long countByStudentId(String studentId);
}

interface CertificateAnalyticsRepository extends JpaRepository<CertificateAnalyticsRecord, String> {
    long countByOccurredOnBetween(Instant from, Instant to);

    long countByStudentId(String studentId);
}

interface MissionAnalyticsRepository extends JpaRepository<MissionAnalyticsRecord, String> {
    long countByCreatedOnBetween(Instant from, Instant to);
}

interface UserAnalyticsRepository extends JpaRepository<UserAnalyticsRecord, String> {
    long countByRegisteredOnBetween(Instant from, Instant to);
}
