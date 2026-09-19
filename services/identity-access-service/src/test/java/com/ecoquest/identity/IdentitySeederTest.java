package com.ecoquest.identity;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class IdentitySeederTest {
    @Test
    void restartDoesNotChangeExistingAccountsOrTheirRoles() {
        var users = mock(UserAccountRepository.class);
        var encoder = mock(PasswordEncoder.class);
        when(users.existsByEmailIgnoreCase(anyString())).thenReturn(true);
        new IdentitySeeder(users, encoder).run();
        verify(users, times(12)).existsByEmailIgnoreCase(anyString());
        verifyNoMoreInteractions(users);
        verifyNoInteractions(encoder);
    }
}
