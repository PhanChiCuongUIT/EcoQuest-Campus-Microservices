package com.ecoquest.recognition;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
class RecognitionDemoSeeder implements CommandLineRunner {
    private final CertificateRepository certificates;
    private final RewardOfferRepository rewardOffers;
    private final StudentRecognitionProfileRepository profiles;

    RecognitionDemoSeeder(CertificateRepository certificates, RewardOfferRepository rewardOffers,
                           StudentRecognitionProfileRepository profiles) {
        this.certificates = certificates;
        this.rewardOffers = rewardOffers;
        this.profiles = profiles;
    }

    @Override
    public void run(String... args) {
        certificate("DEMO-CERT-001", "SV001", "2026-W27", "Top Green Student", 1, 32, 1);
        certificate("DEMO-CERT-002", "SV006", "2026-06", "Green Ambassador", 2, 71, 12);
        certificate("DEMO-CERT-003", "SV008", "2026-Q2", "Green Ambassador", 3, 46, 35);
        certificate("DEMO-CERT-004", "SV005", "2025-YEAR", "Campus Sustainability Champion", 1, 52, 160);

        profile("SV001", 32, 1, 1);
        profile("SV002", 18, 1, 0);
        profile("SV003", 44, 2, 0);
        profile("SV004", 27, 1, 0);
        profile("SV005", 52, 3, 1);
        profile("SV006", 71, 3, 1);
        profile("SV007", 25, 1, 0);
        profile("SV008", 46, 2, 1);
        profile("SV009", 18, 1, 0);
        profile("SV010", 34, 1, 0);

        reward("reward-cafe", "Campus Cafe Voucher", "10% off at the campus cafe for verified eco contributors.",
                "☕", "#16A34A", 10, 1, 0, 120,
                Instant.now().plus(90, ChronoUnit.DAYS), "Valid once at participating campus cafe counters.");
        reward("reward-library", "Library Priority Extension", "One priority book extension for active sustainability students.",
                "📚", "#0284C7", 30, 1, 0, 80,
                Instant.now().plus(120, ChronoUnit.DAYS), "Apply at the library desk with the issued voucher code.");
        reward("reward-eco-kit", "EcoQuest Starter Kit", "Reusable campus bottle and sticker pack for certificate holders.",
                "🌿", "#0D4736", 40, 2, 1, 35,
                Instant.now().plus(75, ChronoUnit.DAYS), "Requires at least one issued certificate.");
        reward("reward-merch", "Sustainability Merch Coupon", "15% off official EcoQuest sustainability merchandise.",
                "🎽", "#D97706", 60, 2, 1, 50,
                Instant.now().plus(100, ChronoUnit.DAYS), "Limited stock; one issued voucher per student.");

        normalizeReward("reward-cafe", "coffee", 10, 1, 0, 120,
                "Valid once at participating campus cafe counters.");
        normalizeReward("reward-library", "book", 30, 1, 0, 80,
                "Apply at the library desk with the issued voucher code.");
        normalizeReward("reward-eco-kit", "leaf", 90, 3, 2, 35,
                "Requires sustained points, badges, and at least two issued certificates.");
        normalizeReward("reward-merch", "shirt", 140, 4, 2, 50,
                "Limited stock for top campus sustainability contributors.");
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

    private void profile(String studentId, int points, int badgeCount, int certificateCount) {
        if (profiles.existsById(studentId)) {
            return;
        }
        var profile = new StudentRecognitionProfile();
        profile.studentId = studentId;
        profile.totalPoints = points;
        profile.badgeCount = badgeCount;
        profile.certificateCount = certificateCount;
        profile.updatedOn = Instant.now();
        profiles.save(profile);
    }

    private void reward(String id, String name, String description, String icon, String color, int requiredPoints,
                        int requiredBadges, int requiredCertificates, int remainingStock, Instant validUntil,
                        String terms) {
        if (rewardOffers.existsById(id)) {
            return;
        }
        var offer = new RewardOffer();
        offer.id = id;
        offer.name = name;
        offer.description = description;
        offer.icon = icon;
        offer.color = color;
        offer.requiredPoints = requiredPoints;
        offer.requiredBadges = requiredBadges;
        offer.requiredCertificates = requiredCertificates;
        offer.remainingStock = remainingStock;
        offer.active = true;
        offer.validUntil = validUntil;
        offer.terms = terms;
        rewardOffers.save(offer);
    }

    private void normalizeReward(String id, String icon, int requiredPoints, int requiredBadges,
                                 int requiredCertificates, int minimumStock, String terms) {
        rewardOffers.findById(id).ifPresent(offer -> {
            offer.icon = icon;
            offer.requiredPoints = requiredPoints;
            offer.requiredBadges = requiredBadges;
            offer.requiredCertificates = requiredCertificates;
            offer.remainingStock = Math.max(offer.remainingStock, minimumStock);
            offer.terms = terms;
            rewardOffers.save(offer);
        });
    }
}
