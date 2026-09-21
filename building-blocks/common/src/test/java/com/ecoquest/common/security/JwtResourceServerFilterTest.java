package com.ecoquest.common.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtResourceServerFilterTest {
    @Test void downstreamFailureIsNotRewrittenAsUnauthorized() {
        var verifier = mock(JwtAccessTokenVerifier.class);
        when(verifier.verifyBearer(null)).thenReturn(new JwtPrincipal("A", "a@example.com", "A", "ADMIN", null));
        var response = new MockHttpServletResponse();
        var failure = new jakarta.servlet.ServletException("Database unavailable");
        assertSame(failure, assertThrows(jakarta.servlet.ServletException.class,
                () -> new JwtResourceServerFilter(verifier).doFilter(new MockHttpServletRequest(), response,
                        (request, result) -> { throw failure; })));
        assertNotEquals(401, response.getStatus());
    }
    @Test void missingTokenReturnsJsonAndDoesNotInvokeController() throws Exception {
        var verifier = mock(JwtAccessTokenVerifier.class);
        when(verifier.verifyBearer(null)).thenThrow(new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.UNAUTHORIZED, "Missing access token."));
        var response = new MockHttpServletResponse();
        new JwtResourceServerFilter(verifier).doFilter(new MockHttpServletRequest(), response,
                (request, result) -> fail("Controller must not run"));
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Missing access token."));
        assertEquals("application/json", response.getContentType());
    }
}
