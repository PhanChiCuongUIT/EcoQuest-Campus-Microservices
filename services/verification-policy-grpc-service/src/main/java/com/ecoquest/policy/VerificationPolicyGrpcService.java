package com.ecoquest.policy;

import com.ecoquest.grpc.policy.EvaluateActionRequest;
import com.ecoquest.grpc.policy.EvaluateActionResponse;
import com.ecoquest.grpc.policy.VerificationPolicyServiceGrpc;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

@GrpcService
class VerificationPolicyGrpcService extends VerificationPolicyServiceGrpc.VerificationPolicyServiceImplBase {
    private final PolicyRuleRepository rules;

    VerificationPolicyGrpcService(PolicyRuleRepository rules) {
        this.rules = rules;
    }

    @Override
    public void evaluateAction(EvaluateActionRequest request, StreamObserver<EvaluateActionResponse> responseObserver) {
        if (request.getUserId().isBlank() || request.getMissionId().isBlank()) {
            respond(responseObserver, false, false, 0, "Missing student or mission.");
            return;
        }
        PolicyRule rule = rules.findByActionTypeAndActiveTrue(request.getActionType()).orElse(null);
        if (rule == null) {
            respond(responseObserver, false, false, 0, "Unsupported action type.");
            return;
        }
        if (rule.dailyLimit > 0 && request.getSubmittedToday() >= rule.dailyLimit) {
            respond(responseObserver, false, false, 0, "Daily limit reached for this action type.");
            return;
        }
        if (rule.evidenceRequired && request.getEvidenceUrl().isBlank()) {
            respond(responseObserver, false, true, rule.basePoints, "Evidence is required, send to moderator.");
            return;
        }
        if (rule.stationRequired && request.getStationId().isBlank()) {
            respond(responseObserver, false, true, rule.basePoints, "Station is missing, manual review required.");
            return;
        }
        respond(responseObserver, true, false, rule.basePoints, "Accepted by policy.");
    }

    private void respond(StreamObserver<EvaluateActionResponse> observer, boolean accepted, boolean manual, int points, String reason) {
        observer.onNext(EvaluateActionResponse.newBuilder()
                .setAccepted(accepted)
                .setRequiresManualReview(manual)
                .setSuggestedPoints(points)
                .setReason(reason)
                .build());
        observer.onCompleted();
    }
}
