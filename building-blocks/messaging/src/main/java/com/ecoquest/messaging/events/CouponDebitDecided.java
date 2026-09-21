package com.ecoquest.messaging.events;
public record CouponDebitDecided(String claimId, boolean accepted, String reason) {}
