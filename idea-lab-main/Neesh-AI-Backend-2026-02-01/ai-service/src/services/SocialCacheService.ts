import crypto from 'crypto';

class SocialCacheService {
    private cache: Map<string, { data: any; expiresAt: number }> = new Map();
    private TTL_MS = 15 * 60 * 1000; // 15 Minutes TTL

    public getSocialData(platform: string, targetId: String): any | null {
        const key = `social:${platform.toLowerCase()}:${targetId}`;
        const record = this.cache.get(key);

        if (!record) {
            console.log(`[SocialCacheService] CACHE MISS: ${key}`);
            return null;
        }

        if (Date.now() > record.expiresAt) {
            console.log(`[SocialCacheService] CACHE EXPIRED: ${key}`);
            this.cache.delete(key);
            return null;
        }

        console.log(`[SocialCacheService] CACHE HIT: ${key}`);
        return record.data;
    }

    public setSocialData(platform: string, targetId: string, data: any): void {
        const key = `social:${platform.toLowerCase()}:${targetId}`;
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + this.TTL_MS
        });
        console.log(`[SocialCacheService] CACHE STORED: ${key} (TTL: 15 mins)`);
    }
}

export const socialCacheService = new SocialCacheService();
