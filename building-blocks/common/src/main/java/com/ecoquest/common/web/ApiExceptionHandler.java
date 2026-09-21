package com.ecoquest.common.web;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> domainError(ResponseStatusException error) {
        String detail = error.getReason() == null ? "The request could not be completed." : error.getReason();
        return ResponseEntity.status(error.getStatusCode()).headers(error.getHeaders())
                .body(Map.of("status", error.getStatusCode().value(), "detail", detail, "message", detail));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validationError(MethodArgumentNotValidException error) {
        String detail = error.getBindingResult().getFieldErrors().stream()
                .map(field -> field.getField() + ": " + field.getDefaultMessage())
                .distinct().sorted().collect(Collectors.joining("; "));
        if (detail.isBlank()) detail = "Please check the submitted fields.";
        return ResponseEntity.badRequest().body(Map.of("status", 400, "detail", detail, "message", detail));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> invalidBody() {
        String detail = "Invalid request data. Check field types and required values.";
        return ResponseEntity.badRequest().body(Map.of("status", 400, "detail", detail, "message", detail));
    }
}
