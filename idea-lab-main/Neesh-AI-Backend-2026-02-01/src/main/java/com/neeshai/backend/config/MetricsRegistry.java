package com.neeshai.backend.config;

import org.springframework.stereotype.Component;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class MetricsRegistry {

    private final AtomicLong totalRequests = new AtomicLong(0);
    private final AtomicLong error4xxCount = new AtomicLong(0);
    private final AtomicLong error5xxCount = new AtomicLong(0);

    private final ConcurrentLinkedQueue<Long> latencyWindow = new ConcurrentLinkedQueue<>();
    private static final int MAX_WINDOW_SIZE = 1000;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private javax.sql.DataSource dataSource;

    public void recordRequest(long durationMs, int statusCode) {
        totalRequests.incrementAndGet();
        if (statusCode >= 500) {
            error5xxCount.incrementAndGet();
        } else if (statusCode >= 400) {
            error4xxCount.incrementAndGet();
        }

        latencyWindow.add(durationMs);
        while (latencyWindow.size() > MAX_WINDOW_SIZE) {
            latencyWindow.poll();
        }
    }

    public Map<String, Object> getMetricsSnapshot() {
        List<Long> latencies = new ArrayList<>(latencyWindow);
        Collections.sort(latencies);

        long p50 = getPercentile(latencies, 50);
        long p95 = getPercentile(latencies, 95);
        long p99 = getPercentile(latencies, 99);

        long total = totalRequests.get();
        long errors = error4xxCount.get() + error5xxCount.get();
        double errorRatePercent = total > 0 ? (double) errors / total * 100.0 : 0.0;

        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("totalRequests", total);
        metrics.put("error4xxCount", error4xxCount.get());
        metrics.put("error5xxCount", error5xxCount.get());
        metrics.put("errorRatePercent", Math.round(errorRatePercent * 100.0) / 100.0);
        metrics.put("latencyP50Ms", p50);
        metrics.put("latencyP95Ms", p95);
        metrics.put("latencyP99Ms", p99);
        metrics.put("sampleSize", latencies.size());

        if (dataSource instanceof com.zaxxer.hikari.HikariDataSource hikariDS) {
            try {
                var poolMXBean = hikariDS.getHikariPoolMXBean();
                if (poolMXBean != null) {
                    metrics.put("hikariActiveConnections", poolMXBean.getActiveConnections());
                    metrics.put("hikariIdleConnections", poolMXBean.getIdleConnections());
                    metrics.put("hikariThreadsAwaitingConnection", poolMXBean.getThreadsAwaitingConnection());
                } else {
                    metrics.put("hikariActiveConnections", 0);
                    metrics.put("hikariIdleConnections", hikariDS.getMinimumIdle());
                    metrics.put("hikariThreadsAwaitingConnection", 0);
                }
            } catch (Exception e) {
                metrics.put("hikariActiveConnections", 0);
            }
            metrics.put("hikariMaximumPoolSize", hikariDS.getMaximumPoolSize());
        } else {
            metrics.put("hikariMaximumPoolSize", 20);
            metrics.put("hikariActiveConnections", 0);
            metrics.put("hikariIdleConnections", 5);
            metrics.put("hikariThreadsAwaitingConnection", 0);
        }

        metrics.put("scope", "instance-local");

        return metrics;
    }

    private long getPercentile(List<Long> sorted, double percentile) {
        if (sorted.isEmpty()) return 0;
        int index = (int) Math.ceil((percentile / 100.0) * sorted.size()) - 1;
        index = Math.max(0, Math.min(index, sorted.size() - 1));
        return sorted.get(index);
    }
}
