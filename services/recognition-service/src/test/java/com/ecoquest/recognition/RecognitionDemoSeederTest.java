package com.ecoquest.recognition;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RecognitionDemoSeederTest {
    @Test
    void restartDoesNotRefillStockOrOverwriteAdminOfferChanges() {
        var certificates = mock(CertificateRepository.class);
        var offers = mock(RewardOfferRepository.class);
        var profiles = mock(StudentRecognitionProfileRepository.class);
        when(certificates.existsById(anyString())).thenReturn(true);
        when(offers.existsById(anyString())).thenReturn(true);
        when(profiles.existsById(anyString())).thenReturn(true);

        new RecognitionDemoSeeder(certificates, offers, profiles).run();

        verify(offers, times(4)).existsById(anyString());
        verifyNoMoreInteractions(offers);
        verify(certificates, never()).save(any());
        verify(profiles, never()).save(any());
    }
}
