package com.ecoquest.gateway;

import java.time.Duration;
import org.springframework.cloud.gateway.config.HttpClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class GatewayHttpClientConfiguration {
    @Bean
    HttpClientCustomizer serviceDnsCache() {
        // Compose may assign a new IP when services restart or are recreated.
        return client -> client.resolver(resolver -> resolver
                .cacheMinTimeToLive(Duration.ZERO)
                .cacheMaxTimeToLive(Duration.ofSeconds(5))
                .cacheNegativeTimeToLive(Duration.ZERO));
    }
}
