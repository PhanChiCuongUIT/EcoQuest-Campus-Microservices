package com.ecoquest.policy;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class PolicyRuleSeeder {
    @Bean
    CommandLineRunner seedPolicyRules(PolicyRuleRepository rules) {
        return args -> {
            saveIfMissing(rules, rule("RECYCLE_BOTTLE", 10, true, true, 5));
            saveIfMissing(rules, rule("CLEANUP_EVENT", 30, true, true, 2));
            saveIfMissing(rules, rule("GREEN_CHECKIN", 5, false, true, 10));
            saveIfMissing(rules, rule("REPORT_TRASH", 15, true, false, 3));
            saveIfMissing(rules, rule("ENERGY_SAVING", 20, true, false, 4));
            saveIfMissing(rules, rule("TREE_CARE", 25, true, true, 3));
            saveIfMissing(rules, rule("BIKE_TO_CAMPUS", 12, true, false, 2));
            saveIfMissing(rules, rule("WATER_REFILL", 8, false, true, 8));
        };
    }

    private void saveIfMissing(PolicyRuleRepository rules, PolicyRule rule) {
        if (!rules.existsById(rule.actionType)) {
            rules.save(rule);
        }
    }

    private PolicyRule rule(String actionType, int points, boolean evidenceRequired, boolean stationRequired, int dailyLimit) {
        PolicyRule rule = new PolicyRule();
        rule.actionType = actionType;
        rule.basePoints = points;
        rule.evidenceRequired = evidenceRequired;
        rule.stationRequired = stationRequired;
        rule.dailyLimit = dailyLimit;
        rule.active = true;
        return rule;
    }
}
