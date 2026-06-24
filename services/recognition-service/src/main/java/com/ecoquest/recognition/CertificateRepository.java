package com.ecoquest.recognition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface CertificateRepository extends JpaRepository<CertificateRecord, String> {
    List<CertificateRecord> findByStudentIdOrderByIssuedOnDesc(String studentId);
    boolean existsBySeasonIdAndStudentId(String seasonId, String studentId);
}

interface RewardClaimRepository extends JpaRepository<RewardClaim, String> {
    List<RewardClaim> findByStudentIdOrderByClaimedOnDesc(String studentId);
}
