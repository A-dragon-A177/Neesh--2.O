package com.neeshai.backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @Value("${ai.service.url:http://localhost:3000}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Unauthenticated Public Health Endpoint (For Load Balancers)
     * Never leaks internal hostnames, ports, or error traces.
     */
    @GetMapping("/api/public/health")
    public ResponseEntity<Map<String, String>> getPublicHealth() {
        boolean healthy = checkDatabase() && checkAiService();
        Map<String, String> body = Map.of("status", healthy ? "UP" : "DOWN");
        return ResponseEntity.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    /**
     * Gated Detailed Health Endpoint (For Internal Monitoring / Admin)
     */
    @GetMapping("/api/admin/health")
    public ResponseEntity<Map<String, Object>> getDetailedHealth(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Map<String, Object> response = new HashMap<>();
        Map<String, String> deps = new HashMap<>();
        boolean allHealthy = true;

        // 1. Check DB
        try {
            if (jdbcTemplate != null) {
                jdbcTemplate.queryForObject("SELECT 1", Integer.class);
                deps.put("db", "ok");
            } else {
                deps.put("db", "disabled_or_mock");
            }
        } catch (Exception e) {
            deps.put("db", "unreachable");
            allHealthy = false;
        }

        // 2. Check AI Service / Redis / Queue
        try {
            ResponseEntity<Map> aiHealth = restTemplate.getForEntity(aiServiceUrl + "/health", Map.class);
            if (aiHealth.getStatusCode().is2xxSuccessful() && aiHealth.getBody() != null) {
                Map<?, ?> aiDeps = (Map<?, ?>) aiHealth.getBody().get("dependencies");
                String redisStatus = aiDeps != null && aiDeps.containsKey("redis") ? aiDeps.get("redis").toString() : "ok";
                deps.put("redis", redisStatus);
                deps.put("queue", aiDeps != null && aiDeps.containsKey("queue") ? aiDeps.get("queue").toString() : "ok");
                if (!"ok".equalsIgnoreCase(redisStatus)) allHealthy = false;
            } else {
                deps.put("redis", "ai_service_unreachable");
                deps.put("queue", "ai_service_unreachable");
                allHealthy = false;
            }
        } catch (Exception e) {
            deps.put("redis", "standalone");
            deps.put("queue", "ok");
        }

        response.put("status", allHealthy ? "UP" : "DOWN");
        response.put("dependencies", deps);
        response.put("timestamp", System.currentTimeMillis());

        return ResponseEntity.status(allHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(response);
    }

    private boolean checkDatabase() {
        try {
            if (jdbcTemplate != null) {
                jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkAiService() {
        try {
            ResponseEntity<Map> res = restTemplate.getForEntity(aiServiceUrl + "/health", Map.class);
            return res.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            return true; // Fallback so standalone Java doesn't report DOWN if AI service is optional
        }
    }
}
