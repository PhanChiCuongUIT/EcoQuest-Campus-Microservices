package com.ecoquest.policy;

import com.ecoquest.common.security.RoleAuthorizer;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/policies/rules")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowedHeaders = "*")
class PolicyRuleController {
    private final PolicyRuleRepository rules;

    PolicyRuleController(PolicyRuleRepository rules) {
        this.rules = rules;
    }

    @GetMapping
    List<PolicyRule> getRules(HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        return rules.findAll();
    }

    @PutMapping("/{actionType}")
    PolicyRule upsertRule(@PathVariable String actionType, @RequestBody PolicyRule request,
                          HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        return saveRule(actionType, request);
    }

    @PostMapping
    PolicyRule createRule(@RequestBody PolicyRule request, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        String actionType = normalizeActionType(request.actionType);
        if (rules.existsById(actionType)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Policy rule already exists.");
        }
        return saveRule(actionType, request);
    }

    @DeleteMapping("/{actionType}")
    void deleteRule(@PathVariable String actionType, HttpServletRequest httpRequest) {
        RoleAuthorizer.requireRole(httpRequest, "ADMIN");
        String normalized = normalizeActionType(actionType);
        PolicyRule rule = rules.findById(normalized)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy rule not found."));
        if (rule.active) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Deactivate the policy rule before deleting it.");
        }
        rules.delete(rule);
    }

    private PolicyRule saveRule(String actionType, PolicyRule request) {
        request.actionType = normalizeActionType(actionType);
        if (request.basePoints < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Base points cannot be negative.");
        }
        if (request.dailyLimit < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Daily limit cannot be negative.");
        }
        return rules.save(request);
    }

    private String normalizeActionType(String actionType) {
        if (actionType == null || actionType.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Action type is required.");
        }
        return actionType.trim().toUpperCase();
    }
}
