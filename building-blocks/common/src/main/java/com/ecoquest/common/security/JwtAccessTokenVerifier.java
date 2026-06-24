package com.ecoquest.common.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

public class JwtAccessTokenVerifier {
    private final ObjectMapper objectMapper;
    private final byte[] secret;

    public JwtAccessTokenVerifier(ObjectMapper objectMapper, String secret) {
        this.objectMapper = objectMapper;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    public JwtPrincipal verifyBearer(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing bearer token.");
        }
        return verify(authorizationHeader.substring("Bearer ".length()).trim());
    }

    private JwtPrincipal verify(String token) {
        try {
            var parts = token.split("\\.");
            if (parts.length != 3) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token.");
            }
            var signingInput = parts[0] + "." + parts[1];
            var expectedSignature = sign(signingInput);
            if (!MessageDigest.isEqual(expectedSignature.getBytes(StandardCharsets.UTF_8), parts[2].getBytes(StandardCharsets.UTF_8))) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token signature.");
            }
            var payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            Map<String, Object> payload = objectMapper.readValue(payloadJson, new TypeReference<>() {
            });
            var exp = ((Number) payload.get("exp")).longValue();
            if (Instant.now().getEpochSecond() >= exp) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Access token expired.");
            }
            return new JwtPrincipal(
                    (String) payload.get("sub"),
                    (String) payload.get("email"),
                    (String) payload.get("name"),
                    (String) payload.get("role"),
                    (String) payload.get("studentId")
            );
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token.", ex);
        }
    }

    private String sign(String signingInput) throws Exception {
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret, "HmacSHA256"));
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));
    }
}
