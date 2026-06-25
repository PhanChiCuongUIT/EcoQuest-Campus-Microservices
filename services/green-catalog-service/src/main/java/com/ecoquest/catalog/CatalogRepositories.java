package com.ecoquest.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface MissionRepository extends JpaRepository<Mission, String> {
    List<Mission> findByStatusIn(List<MissionStatus> statuses);

    List<Mission> findByCreatedByUserId(String createdByUserId);
}

interface GreenStationRepository extends JpaRepository<GreenStation, String> {
}

interface BadgeDefinitionRepository extends JpaRepository<BadgeDefinition, String> {
}
