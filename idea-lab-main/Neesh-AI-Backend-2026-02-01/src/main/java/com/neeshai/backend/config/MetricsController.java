package com.neeshai.backend.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/metrics")
public class MetricsController {

    private final MetricsRegistry metricsRegistry;

    public MetricsController(MetricsRegistry metricsRegistry) {
        this.metricsRegistry = metricsRegistry;
    }

    /**
     * Gated Admin Metrics Endpoint
     * Serves in-memory latency percentiles, error rates, and connection stats.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getMetrics(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Map<String, Object> metrics = metricsRegistry.getMetricsSnapshot();
        return ResponseEntity.ok(metrics);
    }
}
