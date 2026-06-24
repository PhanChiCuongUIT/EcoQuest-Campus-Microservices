package com.ecoquest.reward;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.ecoquest")
public class RewardLedgerApplication {
    public static void main(String[] args) {
        SpringApplication.run(RewardLedgerApplication.class, args);
    }
}
