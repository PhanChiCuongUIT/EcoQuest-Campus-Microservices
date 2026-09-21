package com.ecoquest.catalog;

import com.ecoquest.common.security.RoleAuthorizer;
import jakarta.persistence.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;
import static org.springframework.http.HttpStatus.*;

@Entity
class StationScanReceipt {
    @Id public String id;
    public String userId;
    public String stationId;
    public String missionId;
    public Instant expiresAt;
    public String submissionKey;
}

interface StationScanRepository extends JpaRepository<StationScanReceipt, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from StationScanReceipt r where r.id = :id")
    Optional<StationScanReceipt> lockById(@org.springframework.data.repository.query.Param("id") String id);
}

@Service
class StationQrService {
    private final GreenStationRepository stations;
    private final MissionRepository missions;
    private final StationScanRepository receipts;
    StationQrService(GreenStationRepository stations, MissionRepository missions, StationScanRepository receipts) {
        this.stations = stations; this.missions = missions; this.receipts = receipts;
    }

    void validateMission(Mission mission) {
        if (mission.allowedStationIds == null) mission.allowedStationIds = new HashSet<>();
        if (Boolean.TRUE.equals(mission.stationRequired) && mission.allowedStationIds.isEmpty())
            throw new ResponseStatusException(BAD_REQUEST, "Select at least one allowed station for this mission.");
        for (String id : mission.allowedStationIds) {
            var station = stations.findById(id).orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Station does not exist: " + id));
            if (!station.active) throw new ResponseStatusException(CONFLICT, "Selected station is inactive: " + station.name);
        }
        mission.stationConfigVersion = 1;
    }

    @Transactional
    public void verify(Mission mission, String stationId, String receiptId, String userId, String submissionKey) {
        if (!Boolean.TRUE.equals(mission.stationRequired)) return;
        requireAllowed(mission, stationId);
        if (receiptId == null || receiptId.isBlank() || submissionKey == null || submissionKey.isBlank())
            throw new ResponseStatusException(BAD_REQUEST, "Scan the station QR before submitting.");
        var receipt = receipts.lockById(receiptId).orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Station scan is invalid."));
        if (!userId.equals(receipt.userId) || !mission.id.equals(receipt.missionId) || !stationId.equals(receipt.stationId))
            throw new ResponseStatusException(FORBIDDEN, "Station scan belongs to another user, mission or station.");
        if (receipt.expiresAt.isBefore(Instant.now())) throw new ResponseStatusException(CONFLICT, "Station scan expired. Please scan again.");
        if (receipt.submissionKey != null && !receipt.submissionKey.equals(submissionKey))
            throw new ResponseStatusException(CONFLICT, "Station scan has already been used. Please scan again.");
        receipt.submissionKey = submissionKey;
        receipts.save(receipt);
    }

    void requireAllowed(Mission mission, String stationId) {
        if (stationId == null || !mission.allowedStationIds.contains(stationId))
            throw new ResponseStatusException(BAD_REQUEST, "This station is not assigned to the mission.");
        if (!stations.findById(stationId).map(s -> s.active).orElse(false))
            throw new ResponseStatusException(CONFLICT, "This station is unavailable.");
    }

    @Transactional
    public ScanResponse scan(String qrToken, String missionId, String userId) {
        var station = stations.findAll().stream().filter(s -> s.qrToken != null && s.qrToken.equals(qrToken)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Unrecognized station QR."));
        var available = missions.findByStatusIn(List.of(MissionStatus.ACTIVE)).stream()
                .filter(m -> m.allowedStationIds.contains(station.id)).toList();
        StationScanReceipt receipt = null;
        if (missionId != null && !missionId.isBlank()) {
            var mission = missions.findById(missionId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Mission not found."));
            if (mission.status != MissionStatus.ACTIVE) throw new ResponseStatusException(CONFLICT, "Mission is not active.");
            requireAllowed(mission, station.id);
            receipt = new StationScanReceipt();
            receipt.id = UUID.randomUUID().toString(); receipt.userId = userId;
            receipt.missionId = missionId; receipt.stationId = station.id;
            receipt.expiresAt = Instant.now().plusSeconds(600);
            receipts.save(receipt);
        }
        return new ScanResponse(station, available, receipt == null ? null : receipt.id, receipt == null ? null : receipt.expiresAt);
    }
    record ScanResponse(GreenStation station, List<Mission> missions, String scanReceipt, Instant expiresAt) {}
}

@RestController
@RequestMapping("/catalog/stations")
class StationQrController {
    private final StationQrService service;
    private final GreenStationRepository stations;
    StationQrController(StationQrService service, GreenStationRepository stations) { this.service = service; this.stations = stations; }
    @GetMapping("/{id}/qr")
    Map<String, String> qr(@PathVariable String id, HttpServletRequest request) {
        RoleAuthorizer.requireRole(request, "ADMIN");
        var station = stations.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Station not found."));
        return Map.of("stationId", station.id, "name", station.name, "qrToken", station.qrToken);
    }
    @PostMapping("/scan")
    StationQrService.ScanResponse scan(@RequestBody ScanRequest body, HttpServletRequest request) {
        var user = RoleAuthorizer.requireAnyRole(request, "STUDENT", "MODERATOR", "ADMIN");
        return service.scan(body.qrToken(), body.missionId(), user.userId());
    }
    record ScanRequest(String qrToken, String missionId) {}
}
