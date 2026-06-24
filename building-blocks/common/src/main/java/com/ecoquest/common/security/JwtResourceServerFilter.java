package com.ecoquest.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

public class JwtResourceServerFilter extends OncePerRequestFilter {
    public static final String PRINCIPAL_ATTRIBUTE = "ecoquest.jwtPrincipal";

    private final JwtAccessTokenVerifier verifier;

    public JwtResourceServerFilter(JwtAccessTokenVerifier verifier) {
        this.verifier = verifier;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        var path = request.getRequestURI();
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }
        return path.startsWith("/actuator/")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.equals("/error")
                || isPublicEvidenceDownload(request, path)
                || isPublicMediaDownload(request, path)
                || isPublicCertificateDownload(request, path);
    }

    private boolean isPublicEvidenceDownload(HttpServletRequest request, String path) {
        return HttpMethod.GET.matches(request.getMethod()) && path.startsWith("/actions/evidence/");
    }

    private boolean isPublicMediaDownload(HttpServletRequest request, String path) {
        return HttpMethod.GET.matches(request.getMethod())
                && (path.startsWith("/auth/media/avatars/")
                || path.startsWith("/catalog/stations/images/")
                || path.startsWith("/reports/evidence/"));
    }

    private boolean isPublicCertificateDownload(HttpServletRequest request, String path) {
        return HttpMethod.GET.matches(request.getMethod())
                && path.startsWith("/recognitions/certificates/")
                && path.endsWith("/download");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            var authorization = request.getHeader("Authorization");
            if ((authorization == null || authorization.isBlank()) && request.getParameter("accessToken") != null) {
                authorization = "Bearer " + request.getParameter("accessToken");
            }
            var principal = verifier.verifyBearer(authorization);
            request.setAttribute(PRINCIPAL_ATTRIBUTE, principal);
            filterChain.doFilter(request, response);
        } catch (ResponseStatusException ex) {
            response.sendError(ex.getStatusCode().value(), ex.getReason());
        } catch (Exception ex) {
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Invalid access token.");
        }
    }
}
