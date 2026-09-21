package com.ecoquest.policy;

import com.ecoquest.common.security.*;
import com.ecoquest.common.web.ApiExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PolicyRuleControllerTest {
    private final PolicyRuleRepository rules = mock(PolicyRuleRepository.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new PolicyRuleController(rules))
            .setControllerAdvice(new ApiExceptionHandler()).build();
    private final JwtPrincipal admin = new JwtPrincipal("A", "a@example.com", "Admin", "ADMIN", null);
    private static final String BODY = "{\"actionType\":\"E2E_RULE\",\"basePoints\":10,\"dailyLimit\":1,\"active\":true}";

    @Test void createAndUpdateRetainThePolicyContract() throws Exception {
        when(rules.save(any())).thenAnswer(call -> call.getArgument(0));
        mvc.perform(post("/policies/rules").requestAttr(JwtResourceServerFilter.PRINCIPAL_ATTRIBUTE, admin)
                .contentType("application/json").content(BODY)).andExpect(status().isOk())
                .andExpect(jsonPath("$.actionType").value("E2E_RULE"));
        mvc.perform(put("/policies/rules/E2E_RULE").requestAttr(JwtResourceServerFilter.PRINCIPAL_ATTRIBUTE, admin)
                .contentType("application/json").content(BODY.replace("10", "20")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.basePoints").value(20));
    }
    @Test void duplicateAndActiveDeleteReturnSpecificConflict() throws Exception {
        when(rules.existsById("E2E_RULE")).thenReturn(true);
        mvc.perform(post("/policies/rules").requestAttr(JwtResourceServerFilter.PRINCIPAL_ATTRIBUTE, admin)
                .contentType("application/json").content(BODY)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Policy rule already exists."));
        var rule = new PolicyRule(); rule.actionType = "E2E_RULE"; rule.active = true;
        when(rules.findById("E2E_RULE")).thenReturn(Optional.of(rule));
        mvc.perform(delete("/policies/rules/E2E_RULE").requestAttr(JwtResourceServerFilter.PRINCIPAL_ATTRIBUTE, admin))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value("Deactivate the policy rule before deleting it."));
        rule.active = false;
        mvc.perform(delete("/policies/rules/E2E_RULE").requestAttr(JwtResourceServerFilter.PRINCIPAL_ATTRIBUTE, admin)).andExpect(status().isOk());
        verify(rules).delete(rule);
    }
    @Test void invalidRulesNeverReachPersistence() throws Exception {
        for (String body : java.util.List.of(BODY.replace("10", "-1"), BODY.replace("E2E_RULE", "BAD/TYPE"))) {
            mvc.perform(post("/policies/rules").requestAttr(JwtResourceServerFilter.PRINCIPAL_ATTRIBUTE, admin)
                    .contentType("application/json").content(body)).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail").isNotEmpty());
        }
        verify(rules, never()).save(any());
    }
    @Test void studentCannotReadOrWritePolicyRules() throws Exception {
        var student = new JwtPrincipal("S", "s@example.com", "Student", "STUDENT", "SV001");
        mvc.perform(get("/policies/rules").requestAttr(JwtResourceServerFilter.PRINCIPAL_ATTRIBUTE, student)).andExpect(status().isForbidden());
        mvc.perform(post("/policies/rules").requestAttr(JwtResourceServerFilter.PRINCIPAL_ATTRIBUTE, student)
                .contentType("application/json").content(BODY)).andExpect(status().isForbidden());
        verifyNoInteractions(rules);
    }
}
