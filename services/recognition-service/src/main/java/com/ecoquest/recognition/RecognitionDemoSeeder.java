package com.ecoquest.recognition;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
class RecognitionDemoSeeder implements CommandLineRunner {
    private final CertificateRepository certificates;

    RecognitionDemoSeeder(CertificateRepository certificates) {
        this.certificates = certificates;
    }

    @Override
    public void run(String... args) {
        certificate("DEMO-CERT-001", "SV001", "2026-W25", "Top Green Student", 1, 32, 2);
        certificate("DEMO-CERT-002", "SV006", "2026-06", "Green Ambassador", 2, 71, 18);
        certificate("DEMO-CERT-003", "SV008", "2026-Q1", "Green Ambassador", 3, 46, 80);
        certificate("DEMO-CERT-004", "SV005", "2025-YEAR", "Campus Sustainability Champion", 1, 52, 160);
    }

    private void certificate(String id, String studentId, String seasonId, String type, int rank, int points,
                             long daysAgo) {
        if (certificates.existsById(id) || certificates.existsBySeasonIdAndStudentId(seasonId, studentId)) {
            return;
        }
        CertificateRecord record = new CertificateRecord();
        record.id = id;
        record.studentId = studentId;
        record.seasonId = seasonId;
        record.certificateType = type;
        record.rankNumber = rank;
        record.points = points;
        record.objectKey = "demo/" + id + ".pdf";
        record.issuedOn = Instant.now().minus(daysAgo, ChronoUnit.DAYS);
        certificates.save(record);
    }
}
