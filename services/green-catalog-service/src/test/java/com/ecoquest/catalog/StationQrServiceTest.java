package com.ecoquest.catalog;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StationQrServiceTest {
    final GreenStationRepository stations = mock(GreenStationRepository.class);
    final MissionRepository missions = mock(MissionRepository.class);
    final StationScanRepository receipts = mock(StationScanRepository.class);
    final StationQrService service = new StationQrService(stations, missions, receipts);
    Mission mission() {
        var m = new Mission(); m.id = "M"; m.stationRequired = true; m.status = MissionStatus.ACTIVE; m.allowedStationIds.add("S");
        var s = new GreenStation(); s.id = "S"; s.active = true;
        when(stations.findById("S")).thenReturn(Optional.of(s)); return m;
    }
    StationScanReceipt receipt() {
        var r = new StationScanReceipt(); r.id = "R"; r.missionId = "M"; r.stationId = "S"; r.userId = "U"; r.expiresAt = Instant.now().plusSeconds(60);
        when(receipts.lockById("R")).thenReturn(Optional.of(r)); return r;
    }
    @Test void stationRequiredNeedsAnAssignment() {
        var m = mission(); m.allowedStationIds.clear(); assertThrows(ResponseStatusException.class, () -> service.validateMission(m));
    }
    @Test void rejectsStationOutsideMission() { assertThrows(ResponseStatusException.class, () -> service.verify(mission(), "OTHER", "R", "U", "K")); }
    @Test void rejectsMissingReceiptEvenWithCorrectStationId() { assertThrows(ResponseStatusException.class, () -> service.verify(mission(), "S", null, "U", "K")); }
    @Test void rejectsReceiptForAnotherUser() { receipt(); assertThrows(ResponseStatusException.class, () -> service.verify(mission(), "S", "R", "OTHER", "K")); }
    @Test void rejectsExpiredReceipt() { receipt().expiresAt = Instant.now().minusSeconds(1); assertThrows(ResponseStatusException.class, () -> service.verify(mission(), "S", "R", "U", "K")); }
    @Test void receiptCanRetrySameSubmissionButCannotBeReused() {
        var r = receipt(); var m = mission(); service.verify(m, "S", "R", "U", "K");
        assertEquals("K", r.submissionKey); service.verify(m, "S", "R", "U", "K");
        assertThrows(ResponseStatusException.class, () -> service.verify(m, "S", "R", "U", "OTHER"));
    }
    @Test void inactiveStationCannotBeUsed() {
        var m = mission(); stations.findById("S").orElseThrow().active = false;
        assertThrows(ResponseStatusException.class, () -> service.verify(m, "S", "R", "U", "K"));
    }
}
