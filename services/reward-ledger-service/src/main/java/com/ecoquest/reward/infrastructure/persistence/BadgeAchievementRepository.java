package com.ecoquest.reward.infrastructure.persistence;

import com.ecoquest.reward.domain.model.BadgeAchievement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BadgeAchievementRepository extends JpaRepository<BadgeAchievement, String> {
    boolean existsByStudentIdAndBadgeCode(String studentId, String badgeCode);
    List<BadgeAchievement> findByStudentId(String studentId);
}
