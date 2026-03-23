package com.operator.nl2sql;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class Nl2SqlApplication {

    public static void main(String[] args) {
        SpringApplication.run(Nl2SqlApplication.class, args);
    }
}
