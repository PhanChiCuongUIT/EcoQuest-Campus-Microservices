package com.ecoquest.report;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

interface ReportAnalyticsRepository extends JpaRepository<ActionAnalyticsRecord, String> {
    Optional<ActionAnalyticsRecord> findBySourceActionId(String sourceActionId);

    List<ActionAnalyticsRecord> findByOccurredOnBetweenOrderByOccurredOnDesc(Instant from, Instant to);

    List<ActionAnalyticsRecord> findByStudentIdOrderByOccurredOnDesc(String studentId);
}
