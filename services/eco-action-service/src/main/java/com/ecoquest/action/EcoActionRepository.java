package com.ecoquest.action;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

interface EcoActionRepository extends MongoRepository<EcoAction, String> {
    List<EcoAction> findByStudentIdOrderBySubmittedAtDesc(String studentId);
    List<EcoAction> findByStatusOrderBySubmittedAtDesc(ActionStatus status);
    List<EcoAction> findAllByOrderBySubmittedAtDesc();
    long countByStudentIdAndActionTypeAndSubmittedAtBetween(String studentId, String actionType, Instant start, Instant end);
}
