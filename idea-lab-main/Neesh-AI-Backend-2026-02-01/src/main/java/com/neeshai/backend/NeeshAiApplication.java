package com.neeshai.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@org.springframework.scheduling.annotation.EnableScheduling
@SpringBootApplication
public class NeeshAiApplication {

	public static void main(String[] args) {
		SpringApplication.run(NeeshAiApplication.class, args);
	}

}
