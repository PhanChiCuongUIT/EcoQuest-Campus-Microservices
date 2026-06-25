package com.ecoquest.catalog;

import com.ecoquest.common.security.RoleAuthorizer;
import com.ecoquest.messaging.events.MissionStatusChangedEvent;
import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/catalog")
class CatalogController {
    private final MissionRepository missions;
    private final GreenStationRepository stations;
    private final BadgeDefinitionRepository badges;
    private final RabbitTemplate rabbit;
    private final StationImageStorage stationImageStorage;

    CatalogController(MissionRepository missions, GreenStationRepository stations, BadgeDefinitionRepository badges,
                      RabbitTemplate rabbit, StationImageStorage stationImageStorage) {
        this.missions = missions;
        this.stations = stations;
        this.badges = badges;
        this.rabbit = rabbit;
        this.stationImageStorage = stationImageStorage;
    }

    @GetMapping("/missions")
    List<Mission> getMissions(@RequestParam(defaultValue = "false") boolean management,
                              HttpServletRequest httpRequest) {
        var principal = RoleAuthorizer.requireAnyRole(httpRequest, "STUDENT", "MODERATOR", "ADMIN");
        if ("ADMIN".equals(principal.role())) {
            return missions.findAll();
        }
        if (management) {
            RoleAuthorizer.requireAnyRole(httpRequest, "MODERATOR", "ADMIN");
            return missions.findByCreatedByUserId(principal.userId());
        }
        return missions.findByStatusIn(List.of(
                MissionStatus.ACTIVE,
                MissionStatus.CANCELLED,
                MissionStatus.COMPLETED));
    }

    @GetMapping("/missions/{id}/submission-eligibility")
    void requireSubmissionEligibility(@PathVariable String id,
                                      @RequestParam String actionType,
                                      HttpServletRequest httpRequest) {
        RoleAuthorizer.requireAnyRole(httpRequest, "STUDENT", "MODERATOR");
        Mission mission = missions.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mission not found."));
        if (mission.status != MissionStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only ACTIVE missions accept submissions.");
        }
        if (mission.actionType == null || !mission.actionType.equals(actionType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Action type does not match mission.");
        }
    }

    @PostMapping("/missions")
    Mission createMission(@Valid @RequestBody Mission mission, HttpServletRequest httpRequest) {
        var principal = RoleAuthorizer.requireAnyRole(httpRequest, "MODERATOR", "ADMIN");
        mission.createdByUserId = principal.userId();
        mission.status = MissionStatus.PENDING;
        var saved = missions.save(mission);
        rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, EcoQuestRabbit.MISSION_STATUS_CHANGED,
                new MissionStatusChangedEvent(UUID.randomUUID().toString(), Instant.now(), saved.id, saved.title,
                        saved.status.name(), principal.userId(), saved.createdByUserId));
        return saved;
    }

    @PutMapping("/missions/{id}")
    Mission updateMission(@PathVariable String id, @Valid @RequestBody Mission mission, HttpServletRequest httpRequest) {
        var principal = RoleAuthorizer.requireAnyRole(httpRequest, "MODERATOR", "ADMIN");
        Mission existing = missions.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mission not found."));
        if ("MODERATOR".equals(principal.role()) && !principal.userId().equals(existing.createdByUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Moderators can only edit missions they created.");
        }
        if (existing.status == MissionStatus.ACTIVE || existing.status == MissionStatus.CANCELLED || existing.status == MissionStatus.COMPLETED) {
            RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        }
        existing.title = mission.title;
        existing.actionType = mission.actionType;
        existing.basePoints = mission.basePoints;
        existing.evidenceRequired = mission.evidenceRequired;
        existing.stationRequired = mission.stationRequired;
        existing.description = mission.description;
        existing.status = "ADMIN".equals(principal.role()) && mission.status != null ? mission.status : MissionStatus.PENDING;
        return missions.save(existing);
    }

    @PutMapping("/missions/{id}/status")
    Mission updateMissionStatus(@PathVariable String id, @RequestParam MissionStatus status, HttpServletRequest httpRequest) {
        var principal = RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        Mission mission = missions.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mission not found."));
        mission.status = status;
        var saved = missions.save(mission);
        rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, EcoQuestRabbit.MISSION_STATUS_CHANGED,
                new MissionStatusChangedEvent(UUID.randomUUID().toString(), Instant.now(), saved.id, saved.title,
                        saved.status.name(), principal.userId(), saved.createdByUserId));
        return saved;
    }

    @DeleteMapping("/missions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteMission(@PathVariable String id, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        if (!missions.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mission not found.");
        }
        missions.deleteById(id);
    }

    @GetMapping("/stations")
    List<GreenStation> getStations() {
        return stations.findAll();
    }

    @PostMapping("/stations")
    GreenStation createStation(@RequestBody GreenStation station, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        return stations.save(station);
    }

    @PutMapping("/stations/{id}")
    GreenStation updateStation(@PathVariable String id, @RequestBody GreenStation station, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        GreenStation existing = stations.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Station not found."));
        existing.name = station.name;
        existing.code = station.code;
        existing.stationType = station.stationType;
        existing.location = station.location;
        existing.active = station.active;
        existing.imageUrl = station.imageUrl;
        return stations.save(existing);
    }

    @PostMapping("/stations/{id}/image")
    GreenStation uploadStationImage(@PathVariable String id, @Valid @RequestBody UploadStationImageRequest request,
                                    HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        GreenStation station = stations.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Station not found."));
        station.imageUrl = stationImageStorage.upload(request.dataUrl());
        return stations.save(station);
    }

    @GetMapping("/stations/images/{objectKey}")
    ResponseEntity<InputStreamResource> stationImage(@PathVariable String objectKey) {
        return stationImageStorage.download(objectKey);
    }

    @DeleteMapping("/stations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteStation(@PathVariable String id, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        if (!stations.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Station not found.");
        }
        stations.deleteById(id);
    }

    @GetMapping("/badges")
    List<BadgeDefinition> getBadges() {
        return badges.findAll();
    }

    @PostMapping("/badges")
    BadgeDefinition createBadge(@RequestBody BadgeDefinition badge, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        return badges.save(badge);
    }

    @PutMapping("/badges/{code}")
    BadgeDefinition updateBadge(@PathVariable String code, @RequestBody BadgeDefinition badge,
                                HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        BadgeDefinition existing = badges.findById(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Badge not found."));
        existing.name = badge.name;
        existing.description = badge.description;
        existing.requiredPoints = badge.requiredPoints;
        existing.criteriaType = badge.criteriaType;
        existing.actionType = badge.actionType;
        existing.requiredCount = badge.requiredCount;
        return badges.save(existing);
    }

    @DeleteMapping("/badges/{code}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteBadge(@PathVariable String code, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        if (!badges.existsById(code)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Badge not found.");
        }
        badges.deleteById(code);
    }
}

record UploadStationImageRequest(String fileName, @NotBlank String dataUrl) {
}
