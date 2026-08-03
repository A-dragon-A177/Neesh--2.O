import crypto from 'crypto';

class ValidationCacheService {
    private cache: Map<string, { report: any; expiresAt: number }> = new Map();
    private TTL_MS = 6 * 60 * 60 * 1000; // 6 Hours TTL

    public getReport(projectId: string, answersJson: string): any | null {
        // Hash only core validation answers (cvp, market, acq, def, buildability inputs)
        const answersHash = crypto.createHash('md5').update((answersJson || '').trim()).digest('hex');
        const key = `val:project:${projectId}:${answersHash}`;
        const record = this.cache.get(key);

        if (!record) {
            console.log(`[ValidationCacheService] CACHE MISS: ${key}`);
            return null;
        }

        if (Date.now() > record.expiresAt) {
            console.log(`[ValidationCacheService] CACHE EXPIRED: ${key}`);
            this.cache.delete(key);
            return null;
        }

        console.log(`[ValidationCacheService] CACHE HIT: ${key}`);
        return record.report;
    }

    public setReport(projectId: string, answersJson: string, report: any): void {
        const answersHash = crypto.createHash('md5').update((answersJson || '').trim()).digest('hex');
        const key = `val:project:${projectId}:${answersHash}`;
        this.cache.set(key, {
            report,
            expiresAt: Date.now() + this.TTL_MS
        });
        console.log(`[ValidationCacheService] CACHE STORED: ${key} (TTL: 6 hours)`);
    }
}

export const validationCacheService = new ValidationCacheService();
