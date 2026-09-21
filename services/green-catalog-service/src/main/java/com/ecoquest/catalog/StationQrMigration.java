package com.ecoquest.catalog;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Component
@Order(10)
class StationQrMigration implements ApplicationRunner {
    private final GreenStationRepository stations;
    private final MissionRepository missions;
    StationQrMigration(GreenStationRepository stations, MissionRepository missions) { this.stations = stations; this.missions = missions; }
    @Transactional
    public void run(ApplicationArguments args) {
        var all = stations.findAll();
        for (var station : all) if (station.qrToken == null) { station.qrToken = UUID.randomUUID().toString(); stations.save(station); }
        // Only upgrade legacy missions once. Admin-managed assignments are never reset.
        for (var mission : missions.findAll()) if (mission.stationConfigVersion == null) {
            if (Boolean.TRUE.equals(mission.stationRequired)) {
                String type = switch (mission.actionType) {
                    case "RECYCLE_BOTTLE" -> "RECYCLING";
                    case "WATER_REFILL" -> "REFILL";
                    case "TREE_CARE" -> "TREE_CARE";
                    case "EWASTE_DROPOFF" -> "EWASTE";
                    case "COMPOST_WASTE" -> "COMPOST";
                    default -> "RECYCLING";
                };
                all.stream().filter(s -> s.active && type.equals(s.stationType)).forEach(s -> mission.allowedStationIds.add(s.id));
                if (mission.allowedStationIds.isEmpty()) mission.status = MissionStatus.PENDING;
            }
            mission.stationConfigVersion = 1;
            missions.save(mission);
        }
    }
}
