package com.ecoquest.messaging.events;

import java.time.Instant;
import java.util.List;

public record BadgeCatalogSnapshot(Instant occurredOn, List<Definition> definitions) {
    public record Definition(String code, String name, String criteriaType, int requiredPoints,
                             String actionType, int requiredCount, boolean active, String imageUrl) {}
}
