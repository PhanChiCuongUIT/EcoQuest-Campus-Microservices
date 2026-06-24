package com.ecoquest.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnClass(FilterRegistrationBean.class)
public class JwtResourceServerAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean
    JwtAccessTokenVerifier jwtAccessTokenVerifier(
            ObjectMapper objectMapper,
            @Value("${identity.jwt-secret:ecoquest-dev-secret-change-me}") String secret
    ) {
        return new JwtAccessTokenVerifier(objectMapper, secret);
    }

    @Bean
    @ConditionalOnMissingBean(name = "ecoQuestJwtResourceServerFilter")
    FilterRegistrationBean<JwtResourceServerFilter> ecoQuestJwtResourceServerFilter(JwtAccessTokenVerifier verifier) {
        var registration = new FilterRegistrationBean<>(new JwtResourceServerFilter(verifier));
        registration.setName("ecoQuestJwtResourceServerFilter");
        registration.addUrlPatterns("/*");
        registration.setOrder(10);
        return registration;
    }
}
