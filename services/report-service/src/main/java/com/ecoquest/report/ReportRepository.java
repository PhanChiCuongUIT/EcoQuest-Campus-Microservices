package com.ecoquest.report;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface ReportRepository extends JpaRepository<UserReport, String> {
    List<UserReport> findByReporterUserIdOrderByCreatedAtDesc(String reporterUserId);

    List<UserReport> findAllByOrderByCreatedAtDesc();

    List<UserReport> findByStatusOrderByCreatedAtDesc(ReportStatus status);
}
