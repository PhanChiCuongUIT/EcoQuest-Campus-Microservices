package com.ecoquest.common.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;

public final class RoleAuthorizer {
    private RoleAuthorizer() {
    }

    public static JwtPrincipal principal(HttpServletRequest request) {
        Object value = request.getAttribute(JwtResourceServerFilter.PRINCIPAL_ATTRIBUTE);
        if (value instanceof JwtPrincipal principal) {
            return principal;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required.");
    }

    public static JwtPrincipal requireRole(HttpServletRequest request, String role) {
        return requireAnyRole(request, role);
    }

    public static JwtPrincipal requireAnyRole(HttpServletRequest request, String... roles) {
        JwtPrincipal principal = principal(request);
        if (Arrays.stream(roles).noneMatch(role -> role.equals(principal.role()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Role is not allowed for this action.");
        }
        return principal;
    }

    public static JwtPrincipal requireStudentSelf(HttpServletRequest request, String studentId) {
        JwtPrincipal principal = requireAnyRole(request, "STUDENT", "MODERATOR");
        if (studentId == null || studentId.isBlank() || !studentId.equals(principal.studentId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Users can only access their own student data.");
        }
        return principal;
    }

    public static JwtPrincipal requireSelfOrAnyRole(HttpServletRequest request, String studentId, String... roles) {
        JwtPrincipal principal = principal(request);
        if (studentId != null && studentId.equals(principal.studentId())) {
            return principal;
        }
        if (Arrays.stream(roles).anyMatch(role -> role.equals(principal.role()))) {
            return principal;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Role is not allowed for this resource.");
    }
}
