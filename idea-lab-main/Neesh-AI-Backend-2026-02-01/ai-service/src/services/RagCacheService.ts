class RagCacheService {
    private versionCounters: Map<string, number> = new Map();
    private cache: Map<string, { data: any; expiresAt: number }> = new Map();

    private TTL_MS = 15 * 60 * 1000; // 15-minute TTL

    public getVersion(projectId: string): number {
        return this.versionCounters.get(projectId) || 1;
    }

    public invalidateProject(projectId: string): void {
        const currentVersion = this.getVersion(projectId);
        this.versionCounters.set(projectId, currentVersion + 1);
        console.log(`[RagCacheService] Incremented cache_version for project ${projectId}: v${currentVersion} -> v${currentVersion + 1}`);
    }

    public get(projectId: string, queryHash: string): any | null {
        const version = this.getVersion(projectId);
        const cacheKey = `rag:project:${projectId}:v${version}:${queryHash}`;
        const record = this.cache.get(cacheKey);

        if (!record) {
            console.log(`[RagCacheService] CACHE MISS: ${cacheKey}`);
            return null;
        }

        if (Date.now() > record.expiresAt) {
            console.log(`[RagCacheService] CACHE EXPIRED: ${cacheKey}`);
            this.cache.delete(cacheKey);
            return null;
        }

        console.log(`[RagCacheService] CACHE HIT: ${cacheKey}`);
        return record.data;
    }

    public set(projectId: string, queryHash: string, data: any): void {
        const version = this.getVersion(projectId);
        const cacheKey = `rag:project:${projectId}:v${version}:${queryHash}`;
        this.cache.set(cacheKey, {
            data,
            expiresAt: Date.now() + this.TTL_MS
        });
        console.log(`[RagCacheService] CACHE STORED: ${cacheKey}`);
    }
}

export const ragCacheService = new RagCacheService();
