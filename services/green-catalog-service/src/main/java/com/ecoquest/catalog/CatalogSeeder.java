package com.ecoquest.catalog;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
class CatalogSeeder {
    @Bean
    @Order(0)
    CommandLineRunner ensureBadgeCriteriaColumns(JdbcTemplate jdbc) {
        return args -> {
            jdbc.execute("ALTER TABLE badge_definition ADD COLUMN IF NOT EXISTS criteria_type varchar(255)");
            jdbc.execute("ALTER TABLE badge_definition ADD COLUMN IF NOT EXISTS action_type varchar(255)");
            jdbc.execute("ALTER TABLE badge_definition ADD COLUMN IF NOT EXISTS required_count integer NOT NULL DEFAULT 0");
            jdbc.execute("ALTER TABLE mission ADD COLUMN IF NOT EXISTS status varchar(255)");
            jdbc.execute("ALTER TABLE mission ADD COLUMN IF NOT EXISTS created_by_user_id varchar(255)");
            jdbc.execute("ALTER TABLE mission ADD COLUMN IF NOT EXISTS station_required boolean DEFAULT false");
            jdbc.execute("UPDATE mission SET station_required = false WHERE station_required IS NULL");
            jdbc.execute("ALTER TABLE mission ALTER COLUMN station_required SET DEFAULT false");
            jdbc.execute("ALTER TABLE mission ALTER COLUMN station_required SET NOT NULL");
            jdbc.execute("UPDATE mission SET status = 'ACTIVE' WHERE status IS NULL");
            jdbc.execute("""
                    UPDATE mission SET station_required = true
                    WHERE action_type IN ('RECYCLE_BOTTLE', 'GREEN_CHECKIN', 'TREE_CARE', 'WATER_REFILL')
                    """);
            jdbc.execute("ALTER TABLE green_station ADD COLUMN IF NOT EXISTS image_url text");
            jdbc.execute("UPDATE green_station SET image_url = '/logo.png' WHERE image_url IS NULL OR image_url = ''");
        };
    }

    @Bean
    @Order(1)
    CommandLineRunner seedCatalog(MissionRepository missions, GreenStationRepository stations, BadgeDefinitionRepository badges) {
        return args -> {
            saveMissionIfMissing(missions, mission("MISSION-RECYCLE-01", "Recycle Bottle", "RECYCLE_BOTTLE", 10, true, true,
                    "Scan a campus green station and submit bottle recycling evidence."));
            saveMissionIfMissing(missions, mission("MISSION-CLEANUP-01", "Join Cleanup Event", "CLEANUP_EVENT", 30, true, false,
                    "Participate in an approved cleanup event."));
            saveMissionIfMissing(missions, mission("MISSION-CHECKIN-01", "Green Station Check-in", "GREEN_CHECKIN", 5, false, true,
                    "Check in at an active green station on campus."));
            saveMissionIfMissing(missions, mission("MISSION-TRASH-01", "Report Trash Spot", "REPORT_TRASH", 15, true, false,
                    "Report a trash spot with evidence so campus staff can handle it."));
            saveMissionIfMissing(missions, mission("MISSION-ENERGY-01", "Energy Saving Proof", "ENERGY_SAVING", 20, true, false,
                    "Submit proof of switching off unused classroom equipment."));
            saveMissionIfMissing(missions, mission("MISSION-TREE-01", "Tree Care Activity", "TREE_CARE", 25, true, true,
                    "Water, mulch, or document care for a campus tree zone."));
            saveMissionIfMissing(missions, mission("MISSION-BIKE-01", "Bike to Campus", "BIKE_TO_CAMPUS", 12, true, false,
                    "Submit evidence of biking to campus instead of motorized transport."));
            saveMissionIfMissing(missions, mission("MISSION-REFILL-01", "Bottle Refill", "WATER_REFILL", 8, false, true,
                    "Check in at a refill station using a reusable bottle."));
            saveMissionIfMissing(missions, mission("MISSION-COMPOST-01", "Compost Organic Waste", "COMPOST_WASTE", 14, true, true,
                    "Use the compost collection point for food scraps or organic waste."));
            saveMissionIfMissing(missions, mission("MISSION-EWASTE-01", "E-waste Drop-off", "EWASTE_DROPOFF", 22, true, true,
                    "Submit evidence after dropping small electronics at an approved e-waste station."));
            saveMissionIfMissing(missions, mission("MISSION-PLASTIC-01", "Plastic-free Lunch", "PLASTIC_FREE_LUNCH", 16, true, false,
                    "Document a lunch using reusable containers and no single-use plastic."));
            saveMissionIfMissing(missions, mission("MISSION-CARPOOL-01", "Campus Carpool", "CARPOOL_TO_CAMPUS", 18, true, false,
                    "Share a ride with classmates and submit transport evidence."));
            saveMissionIfMissing(missions, mission("MISSION-SOLAR-01", "Solar Awareness Booth", "SOLAR_AWARENESS", 18, true, false,
                    "Visit or support a campus solar awareness booth and submit participation evidence."));
            saveMissionIfMissing(missions, mission("MISSION-WORKSHOP-01", "Green Workshop Attendance", "GREEN_WORKSHOP", 20, true, false,
                    "Attend a sustainability workshop and upload attendance evidence."));
            saveMissionIfMissing(missions, mission("MISSION-PAPERLESS-01", "Paperless Study Week", "PAPERLESS_NOTE", 12, true, false,
                    "Use digital notes and submit proof of a paperless study session."));

            saveStationIfMissing(stations, station("STATION-A1", "Library Recycling Point", "QR-A1", "RECYCLING",
                    "Main Library", true, "/logo.png"));
            saveStationIfMissing(stations, station("STATION-B2", "Canteen Refill Station", "QR-B2", "REFILL",
                    "Student Canteen", true, "/logo.png"));
            saveStationIfMissing(stations, station("STATION-C3", "Dormitory Green Bin", "QR-C3", "RECYCLING",
                    "Dormitory C", true, "/logo.png"));
            saveStationIfMissing(stations, station("STATION-D4", "Engineering Bike Rack", "QR-D4", "MOBILITY",
                    "Engineering Building", true, "/logo.png"));
            saveStationIfMissing(stations, station("STATION-E5", "Botanical Care Zone", "QR-E5", "TREE_CARE",
                    "Campus Garden", true, "/logo.png"));
            saveStationIfMissing(stations, station("STATION-F6", "Cafeteria Compost Point", "QR-F6", "COMPOST",
                    "Cafeteria Exit", true, "/logo.png"));
            saveStationIfMissing(stations, station("STATION-G7", "E-waste Collection Box", "QR-G7", "EWASTE",
                    "IT Helpdesk", true, "/logo.png"));

            saveBadge(badges, badge("GREEN_STARTER", "Green Starter", "Complete the first accepted eco action.", 10,
                    "POINTS", null, 0));
            saveBadge(badges, badge("RECYCLING_HERO", "Recycling Hero", "Complete 10 accepted bottle recycling actions.", 0,
                    "ACTION_COUNT", "RECYCLE_BOTTLE", 10));
            saveBadge(badges, badge("CLEANUP_CHAMPION", "Cleanup Champion", "Complete 3 accepted cleanup events.", 0,
                    "ACTION_COUNT", "CLEANUP_EVENT", 3));
            saveBadge(badges, badge("ZERO_WASTE_ADVOCATE", "Zero Waste Advocate", "Reach 250 green points.", 250,
                    "POINTS", null, 0));
            saveBadge(badges, badge("GREEN_AMBASSADOR", "Green Ambassador", "Reach 300 green points.", 300,
                    "POINTS", null, 0));
            saveBadge(badges, badge("CAMPUS_GUARDIAN", "Campus Guardian", "Reach 500 green points.", 500,
                    "POINTS", null, 0));
        };
    }

    private void saveMissionIfMissing(MissionRepository missions, Mission mission) {
        if (!missions.existsById(mission.id)) {
            missions.save(mission);
        }
    }

    private void saveStationIfMissing(GreenStationRepository stations, GreenStation station) {
        if (!stations.existsById(station.id)) {
            stations.save(station);
            return;
        }
        stations.findById(station.id)
                .filter(existing -> existing.imageUrl == null || existing.imageUrl.isBlank())
                .ifPresent(existing -> {
                    existing.imageUrl = station.imageUrl;
                    stations.save(existing);
                });
        }

    private void saveBadgeIfMissing(BadgeDefinitionRepository badges, BadgeDefinition badge) {
        if (!badges.existsById(badge.code)) {
            badges.save(badge);
        }
    }

    private void saveBadge(BadgeDefinitionRepository badges, BadgeDefinition badge) {
        badges.save(badge);
    }

    private Mission mission(String id, String title, String actionType, int basePoints, boolean evidenceRequired,
                            boolean stationRequired, String description) {
        Mission mission = new Mission();
        mission.id = id;
        mission.title = title;
        mission.actionType = actionType;
        mission.basePoints = basePoints;
        mission.evidenceRequired = evidenceRequired;
        mission.stationRequired = stationRequired;
        mission.description = description;
        mission.status = MissionStatus.ACTIVE;
        return mission;
    }

    private GreenStation station(String id, String name, String code, String stationType, String location, boolean active,
                                 String imageUrl) {
        GreenStation station = new GreenStation();
        station.id = id;
        station.name = name;
        station.code = code;
        station.stationType = stationType;
        station.location = location;
        station.active = active;
        station.imageUrl = imageUrl;
        return station;
    }

    private BadgeDefinition badge(String code, String name, String description, int requiredPoints,
                                  String criteriaType, String actionType, int requiredCount) {
        BadgeDefinition badge = new BadgeDefinition();
        badge.code = code;
        badge.name = name;
        badge.description = description;
        badge.requiredPoints = requiredPoints;
        badge.criteriaType = criteriaType;
        badge.actionType = actionType;
        badge.requiredCount = requiredCount;
        return badge;
    }
}
