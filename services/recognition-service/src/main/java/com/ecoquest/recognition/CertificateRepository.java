package com.ecoquest.recognition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

interface CertificateRepository extends JpaRepository<CertificateRecord, String> {
    List<CertificateRecord> findByStudentIdOrderByIssuedOnDesc(String studentId);
    boolean existsBySeasonIdAndStudentId(String seasonId, String studentId);
}

interface RewardClaimRepository extends JpaRepository<RewardClaim, String> {
    List<RewardClaim> findByStudentIdOrderByClaimedOnDesc(String studentId);
    Optional<RewardClaim> findFirstByStudentIdAndRewardIdOrderByClaimedOnDesc(String studentId, String rewardId);
    long countByRewardId(String rewardId);
}

interface RewardOfferRepository extends JpaRepository<RewardOffer, String> {
    List<RewardOffer> findByActiveTrueOrderByRequiredPointsAscNameAsc();
}

interface StudentRecognitionProfileRepository extends JpaRepository<StudentRecognitionProfile, String> {
}
