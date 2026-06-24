package com.ecoquest.recognition;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class MinioConfig {
    @Bean
    MinioClient minioClient(@Value("${minio.endpoint}") String endpoint,
                            @Value("${minio.access-key}") String accessKey,
                            @Value("${minio.secret-key}") String secretKey) {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }
}
