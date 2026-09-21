package com.ecoquest.recognition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

interface CertificateRepository extends JpaRepository<CertificateRecord, String> {
    List<CertificateRecord> findByStudentIdOrderByIssuedOnDesc(String studentId);
    boolean existsBySeasonIdAndStudentId(String seasonId, String studentId);
}

interface RewardClaimRepository extends JpaRepository<RewardClaim, String> {
    List<RewardClaim> findByStatus(String status);
    boolean existsByRewardIdAndStatus(String rewardId, String status);
    List<RewardClaim> findByStudentIdOrderByClaimedOnDesc(String studentId);
    Optional<RewardClaim> findFirstByStudentIdAndRewardIdOrderByClaimedOnDesc(String studentId, String rewardId);
    long countByRewardId(String rewardId);
}

interface RewardOfferRepository extends JpaRepository<RewardOffer, String> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select o from RewardOffer o where o.id = :id")
    Optional<RewardOffer> lockById(@org.springframework.data.repository.query.Param("id") String id);
    List<RewardOffer> findByActiveTrueOrderByRequiredPointsAscNameAsc();
}

interface StudentRecognitionProfileRepository extends JpaRepository<StudentRecognitionProfile, String> {
}
