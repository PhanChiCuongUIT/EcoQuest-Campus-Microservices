package com.ecoquest.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface NotificationRepository extends JpaRepository<UserNotification, String> {
    List<UserNotification> findByStudentIdOrderByCreatedAtDesc(String studentId);

    List<UserNotification> findByRoleOrderByCreatedAtDesc(String role);

    List<UserNotification> findByUserIdOrderByCreatedAtDesc(String userId);
}
