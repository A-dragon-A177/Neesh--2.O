class MetricsRegistry {
    private totalRequests = 0;
    private error4xxCount = 0;
    private error5xxCount = 0;
    private externalApiFailures: Record<string, number> = {};

    private latencyWindow: number[] = [];
    private MAX_WINDOW_SIZE = 1000;

    public recordRequest(durationMs: number, statusCode: number): void {
        this.totalRequests++;
        if (statusCode >= 500) {
            this.error5xxCount++;
        } else if (statusCode >= 400) {
            this.error4xxCount++;
        }

        this.latencyWindow.push(durationMs);
        if (this.latencyWindow.length > this.MAX_WINDOW_SIZE) {
            this.latencyWindow.shift();
        }
    }

    public recordExternalApiFailure(provider: string): void {
        const key = provider.toLowerCase();
        this.externalApiFailures[key] = (this.externalApiFailures[key] || 0) + 1;
    }

    public getMetricsSnapshot() {
        const sorted = [...this.latencyWindow].sort((a, b) => a - b);
        const p50 = this.getPercentile(sorted, 50);
        const p95 = this.getPercentile(sorted, 95);
        const p99 = this.getPercentile(sorted, 99);

        const errors = this.error4xxCount + this.error5xxCount;
        const errorRatePercent = this.totalRequests > 0 ? (errors / this.totalRequests) * 100 : 0;

        return {
            totalRequests: this.totalRequests,
            error4xxCount: this.error4xxCount,
            error5xxCount: this.error5xxCount,
            errorRatePercent: Math.round(errorRatePercent * 100) / 100,
            latencyP50Ms: p50,
            latencyP95Ms: p95,
            latencyP99Ms: p99,
            sampleSize: sorted.length,
            externalApiFailures: this.externalApiFailures,
            scope: "instance-local"
        };
    }

    private getPercentile(sorted: number[], percentile: number): number {
        if (sorted.length === 0) return 0;
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        const clamped = Math.max(0, Math.min(index, sorted.length - 1));
        return sorted[clamped];
    }
}

export const metricsRegistry = new MetricsRegistry();
