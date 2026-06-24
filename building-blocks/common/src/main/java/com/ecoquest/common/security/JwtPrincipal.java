package com.ecoquest.common.security;

public record JwtPrincipal(
        String userId,
        String email,
        String displayName,
        String role,
        String studentId
) {
}
