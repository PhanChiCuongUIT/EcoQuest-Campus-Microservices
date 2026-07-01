package com.ecoquest.recognition;

import com.ecoquest.messaging.events.BadgeUnlockedEvent;
import com.ecoquest.messaging.events.PointsGrantedEvent;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
class RecognitionProgressService {
    private final StudentRecognitionProfileRepository profiles;

    RecognitionProgressService(StudentRecognitionProfileRepository profiles) {
        this.profiles = profiles;
    }

    @RabbitListener(queues = RecognitionMessagingConfig.POINTS_GRANTED_QUEUE)
    synchronized void onPointsGranted(PointsGrantedEvent event) {
        var profile = profile(event.studentId());
        profile.totalPoints = Math.max(profile.totalPoints, event.totalPoints());
        profile.updatedOn = event.occurredOn() == null ? Instant.now() : event.occurredOn();
        save(profile);
    }

    @RabbitListener(queues = RecognitionMessagingConfig.BADGE_UNLOCKED_QUEUE)
    synchronized void onBadgeUnlocked(BadgeUnlockedEvent event) {
        var profile = profile(event.studentId());
        profile.badgeCount = Math.max(profile.badgeCount + 1, 1);
        profile.updatedOn = event.occurredOn() == null ? Instant.now() : event.occurredOn();
        save(profile);
    }

    synchronized void recordCertificate(String studentId, Instant occurredOn) {
        var profile = profile(studentId);
        profile.certificateCount = Math.max(profile.certificateCount + 1, 1);
        profile.updatedOn = occurredOn == null ? Instant.now() : occurredOn;
        save(profile);
    }

    private StudentRecognitionProfile profile(String studentId) {
        return profiles.findById(studentId).orElseGet(() -> {
            var profile = new StudentRecognitionProfile();
            profile.studentId = studentId;
            profile.updatedOn = Instant.now();
            return profile;
        });
    }

    private void save(StudentRecognitionProfile profile) {
        try {
            profiles.saveAndFlush(profile);
        } catch (DataIntegrityViolationException duplicateCreate) {
            var existing = profiles.findById(profile.studentId).orElseThrow(() -> duplicateCreate);
            existing.totalPoints = Math.max(existing.totalPoints, profile.totalPoints);
            existing.badgeCount = Math.max(existing.badgeCount, profile.badgeCount);
            existing.certificateCount = Math.max(existing.certificateCount, profile.certificateCount);
            existing.updatedOn = profile.updatedOn;
            profiles.saveAndFlush(existing);
        }
    }
}
