package com.ecoquest.policy;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

interface PolicyRuleRepository extends JpaRepository<PolicyRule, String> {
    Optional<PolicyRule> findByActionTypeAndActiveTrue(String actionType);
}
