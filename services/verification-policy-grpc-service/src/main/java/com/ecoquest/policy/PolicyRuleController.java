package com.ecoquest.policy;

import com.ecoquest.common.security.RoleAuthorizer;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

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
        request.actionType = actionType;
        return rules.save(request);
    }
}
