package com.ecoquest.messaging.events;
public record CouponDebitRequested(String claimId, String studentId, String rewardName, int cost) {}
