package com.ecoquest.notification;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.List;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class NotificationStreamTest {
    @SuppressWarnings("unchecked")
    private Map<String, List<SseEmitter>> streams(NotificationService service) {
        return (Map<String, List<SseEmitter>>) ReflectionTestUtils.getField(service, "streams");
    }

    private NotificationService service() {
        var repository = mock(NotificationRepository.class);
        when(repository.save(any(UserNotification.class))).thenAnswer(call -> call.getArgument(0));
        return new NotificationService(repository);
    }

    @Test void oneConnectionGetsOnlyOneDeliveryForMultipleMatchingRecipients() throws Exception {
        var service = service();
        var emitter = mock(SseEmitter.class);
        streams(service).put("user1", new CopyOnWriteArrayList<>(List.of(emitter)));
        streams(service).put("student1", new CopyOnWriteArrayList<>(List.of(emitter)));
        service.create(new CreateNotificationRequest("user1", "student1", null, "TEST", "Title", "Body", "/profile"));
        verify(emitter, times(1)).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test void closedConnectionCannotPreventOtherRecipientsOrPersistence() throws Exception {
        var service = service();
        var closed = mock(SseEmitter.class);
        var open = mock(SseEmitter.class);
        doThrow(new IllegalStateException("ResponseBodyEmitter has already completed"))
                .when(closed).send(any(SseEmitter.SseEventBuilder.class));
        streams(service).put("student1", new CopyOnWriteArrayList<>(List.of(closed, open)));
        streams(service).put("user1", new CopyOnWriteArrayList<>(List.of(closed)));
        var saved = service.create(new CreateNotificationRequest("user1", "student1", null, "TEST", "Title", "Body", "/profile"));
        assertNotNull(saved.id);
        verify(open).send(any(SseEmitter.SseEventBuilder.class));
        assertFalse(streams(service).containsKey("user1"));
        assertEquals(List.of(open), streams(service).get("student1"));
    }

    @Test void streamsHaveBoundedLifetimeAndDistinctRecipientKeys() {
        var service = service();
        var emitter = service.stream(List.of("user1", "user1", ""));
        assertEquals(300_000L, emitter.getTimeout());
        assertEquals(1, streams(service).size());
        assertEquals(List.of(emitter), streams(service).get("user1"));
    }

    @Test void browserDisconnectIsHandledWithoutHidingOtherIoFailures() {
        var controller = new NotificationController(null, null);
        assertDoesNotThrow(() -> controller.disconnectedClient(new IOException("Broken pipe"), null));
        var unexpected = new IOException("Storage unavailable");
        assertSame(unexpected, assertThrows(IOException.class, () -> controller.disconnectedClient(unexpected, null)));
    }
}
