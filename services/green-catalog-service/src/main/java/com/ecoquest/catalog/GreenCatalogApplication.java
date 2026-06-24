package com.ecoquest.catalog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.ecoquest")
public class GreenCatalogApplication {
    public static void main(String[] args) {
        SpringApplication.run(GreenCatalogApplication.class, args);
    }
}
