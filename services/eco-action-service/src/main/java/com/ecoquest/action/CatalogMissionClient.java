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

    void requireActive(String missionId, String actionType, String authorization) {
        try {
            client.get()
                    .uri(uri -> uri.path("/catalog/missions/{id}/submission-eligibility")
                            .queryParam("actionType", actionType)
                            .build(missionId))
                    .header(HttpHeaders.AUTHORIZATION, authorization)
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException ex) {
            throw new ResponseStatusException(
                    HttpStatus.valueOf(ex.getStatusCode().value()),
                    ex.getResponseBodyAsString(),
                    ex);
        } catch (RestClientException ex) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Catalog mission eligibility is temporarily unavailable.",
                    ex);
        }
    }
}
