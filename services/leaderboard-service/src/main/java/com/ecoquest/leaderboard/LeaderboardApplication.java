package com.ecoquest.leaderboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.ecoquest")
public class LeaderboardApplication {
    public static void main(String[] args) {
        SpringApplication.run(LeaderboardApplication.class, args);
    }
}
