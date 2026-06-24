package com.ecoquest.action;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication(scanBasePackages = "com.ecoquest")
public class EcoActionApplication {
    public static void main(String[] args) {
        SpringApplication.run(EcoActionApplication.class, args);
    }
}
