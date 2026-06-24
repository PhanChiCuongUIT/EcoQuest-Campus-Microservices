package com.ecoquest.identity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
class JwtTokenService {
    private final ObjectMapper objectMapper;
    private final byte[] secret;
    private final long ttlSeconds;

    JwtTokenService(
            ObjectMapper objectMapper,
            @Value("${identity.jwt-secret}") String secret,
            @Value("${identity.access-token-ttl-seconds}") long ttlSeconds
    ) {
        this.objectMapper = objectMapper;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.ttlSeconds = ttlSeconds;
    }

    long ttlSeconds() {
        return ttlSeconds;
    }

    String createAccessToken(UserAccount user) {
        try {
            var now = Instant.now().getEpochSecond();
            var header = new LinkedHashMap<String, Object>();
            header.put("alg", "HS256");
            header.put("typ", "JWT");

            var payload = new LinkedHashMap<String, Object>();
            payload.put("sub", user.id);
            payload.put("email", user.email);
            payload.put("name", user.displayName);
            payload.put("role", user.role.name());
            payload.put("studentId", user.studentId);
            payload.put("iat", now);
            payload.put("exp", now + ttlSeconds);

            var encodedHeader = encodeJson(header);
            var encodedPayload = encodeJson(payload);
            var signingInput = encodedHeader + "." + encodedPayload;
            return signingInput + "." + sign(signingInput);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not create access token.", ex);
        }
    }

    String readSubject(String bearerToken) {
        if (bearerToken == null || !bearerToken.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing bearer token.");
        }
        var token = bearerToken.substring("Bearer ".length()).trim();
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
            return (String) payload.get("sub");
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token.", ex);
        }
    }

    private String encodeJson(Map<String, Object> value) throws Exception {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(objectMapper.writeValueAsBytes(value));
    }

    private String sign(String signingInput) throws Exception {
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret, "HmacSHA256"));
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));
    }
}
