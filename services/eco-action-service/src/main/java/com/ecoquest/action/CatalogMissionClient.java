package com.ecoquest.action;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@Service
class CatalogMissionClient {
    private final RestClient client;

    CatalogMissionClient(@Value("${catalog.base-url}") String baseUrl) {
        this.client = RestClient.builder().baseUrl(baseUrl).build();
    }

    String requireActive(String missionId, String actionType, String stationId, String scanReceipt, String submissionKey, String authorization) {
        try {
            var result = client.get()
                    .uri(uri -> uri.path("/catalog/missions/{id}/submission-eligibility")
                            .queryParam("actionType", actionType)
                            .queryParam("stationId", stationId == null ? "" : stationId)
                            .queryParam("scanReceipt", scanReceipt == null ? "" : scanReceipt)
                            .queryParam("submissionKey", submissionKey)
                            .build(missionId))
                    .header(HttpHeaders.AUTHORIZATION, authorization)
                    .retrieve()
                    .body(java.util.Map.class);
            return result == null ? null : (String) result.get("missionTitle");
        } catch (HttpClientErrorException ex) {
            throw new ResponseStatusException(
                    HttpStatus.valueOf(ex.getStatusCode().value()),
                    catalogErrorMessage(ex),
                    ex);
        } catch (RestClientException ex) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Catalog mission eligibility is temporarily unavailable.",
                    ex);
        }
    }

    private String catalogErrorMessage(HttpClientErrorException error) {
        try {
            var body = new com.fasterxml.jackson.databind.ObjectMapper().readTree(error.getResponseBodyAsString());
            for (String field : java.util.List.of("detail", "message")) {
                var value = body.get(field);
                if (value != null && value.isTextual() && !value.asText().isBlank()) return value.asText();
            }
        } catch (java.io.IOException ignored) {
            // Do not expose HTML error pages or internal transport details to students.
        }
        return "Mission or station eligibility could not be confirmed. Refresh the mission and scan again.";
    }
}
