package com.ecoquest.common;

import java.time.Instant;

public record ApiResponse<T>(T data, String message, Instant occurredOn) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(data, "OK", Instant.now());
    }
}
