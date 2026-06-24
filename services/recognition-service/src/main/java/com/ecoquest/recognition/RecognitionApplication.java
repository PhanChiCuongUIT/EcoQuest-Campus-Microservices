package com.ecoquest.recognition;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.ecoquest")
public class RecognitionApplication {
    public static void main(String[] args) {
        SpringApplication.run(RecognitionApplication.class, args);
    }
}
