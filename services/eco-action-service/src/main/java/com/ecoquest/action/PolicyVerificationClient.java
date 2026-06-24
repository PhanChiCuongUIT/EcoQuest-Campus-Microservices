package com.ecoquest.action;

import com.ecoquest.grpc.policy.EvaluateActionRequest;
import com.ecoquest.grpc.policy.EvaluateActionResponse;
import com.ecoquest.grpc.policy.VerificationPolicyServiceGrpc;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

@Service
class PolicyVerificationClient {
    @GrpcClient("policy")
    private VerificationPolicyServiceGrpc.VerificationPolicyServiceBlockingStub policyClient;

    @CircuitBreaker(name = "policyService", fallbackMethod = "fallback")
    EvaluateActionResponse evaluate(SubmitActionRequest request, long submittedToday) {
        return policyClient.evaluateAction(EvaluateActionRequest.newBuilder()
                .setUserId(request.studentId())
                .setMissionId(request.missionId())
                .setStationId(request.stationId() == null ? "" : request.stationId())
                .setActionType(request.actionType())
                .setEvidenceUrl(request.evidenceUrl() == null ? "" : request.evidenceUrl())
                .setSubmittedToday(Math.toIntExact(Math.min(submittedToday, Integer.MAX_VALUE)))
                .build());
    }

    EvaluateActionResponse fallback(SubmitActionRequest request, long submittedToday, Throwable error) {
        return EvaluateActionResponse.newBuilder()
                .setAccepted(false)
                .setRequiresManualReview(true)
                .setSuggestedPoints(0)
                .setReason("Policy service is temporarily unavailable; action requires moderator review.")
                .build();
    }
}
