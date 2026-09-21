package com.ecoquest.catalog;

import com.ecoquest.common.security.JwtPrincipal;
import com.ecoquest.common.security.JwtResourceServerFilter;
import com.ecoquest.messaging.events.MissionStatusChangedEvent;
import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CatalogMissionUpdateTest {
    private final MissionRepository missions = mock(MissionRepository.class);
    private final RabbitTemplate rabbit = mock(RabbitTemplate.class);
    private final CatalogController controller = new CatalogController(missions,
            mock(GreenStationRepository.class), mock(BadgeDefinitionRepository.class), rabbit,
            mock(StationImageStorage.class), mock(StationQrService.class));

    private Mission existing(MissionStatus status) {
        var mission = new Mission();
        mission.id = "M"; mission.title = "Original"; mission.status = status; mission.createdByUserId = "OWNER";
        when(missions.findById("M")).thenReturn(Optional.of(mission));
        when(missions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        return mission;
    }

    private MockHttpServletRequest request(String role) {
        var request = new MockHttpServletRequest();
        request.setAttribute(JwtResourceServerFilter.PRINCIPAL_ATTRIBUTE,
                new JwtPrincipal("OWNER", "owner@ecoquest.local", "Owner", role, null));
        return request;
    }

    @Test void adminEditWithoutStatusPreservesActiveMission() {
        existing(MissionStatus.ACTIVE);
        var update = new Mission(); update.title = "Updated";
        assertEquals(MissionStatus.ACTIVE, controller.updateMission("M", update, request("ADMIN")).status);
        verifyNoInteractions(rabbit);
    }

    @Test void adminStatusChangeThroughUpdatePublishesIntegrationEvent() {
        existing(MissionStatus.PENDING);
        var update = new Mission(); update.title = "Approved"; update.status = MissionStatus.ACTIVE;
        controller.updateMission("M", update, request("ADMIN"));
        verify(rabbit).convertAndSend(eq(EcoQuestRabbit.EXCHANGE), eq(EcoQuestRabbit.MISSION_STATUS_CHANGED),
                argThat((MissionStatusChangedEvent e) -> e.missionId().equals("M") && e.status().equals("ACTIVE")));
    }

    @Test void moderatorCannotActivateTheirMissionThroughEdit() {
        existing(MissionStatus.REJECTED);
        var update = new Mission(); update.title = "Resubmitted"; update.status = MissionStatus.ACTIVE;
        assertEquals(MissionStatus.PENDING, controller.updateMission("M", update, request("MODERATOR")).status);
        verify(rabbit).convertAndSend(eq(EcoQuestRabbit.EXCHANGE), eq(EcoQuestRabbit.MISSION_STATUS_CHANGED),
                argThat((MissionStatusChangedEvent e) -> e.status().equals("PENDING")));
    }
}
