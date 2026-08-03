import { EventEmitter } from 'events';

export interface Job<T = any> {
    id: string;
    type: 'document-embeddings' | 'market-validation' | 'social-sync' | 'notifications-digest';
    payload: T;
    attempts: number;
    maxAttempts: number;
    backoffMs: number[];
    status: 'queued' | 'processing' | 'completed' | 'failed';
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

class JobQueueManager extends EventEmitter {
    private jobs: Map<string, Job> = new Map();
    private activeCounts: Map<string, number> = new Map();

    // Concurrency limits per job type
    private concurrencyLimits: Record<string, number> = {
        'document-embeddings': 5,
        'market-validation': 3,
        'social-sync': 2,
        'notifications-digest': 10
    };

    // Retry backoff schedule in ms
    private backoffSchedules: Record<string, number[]> = {
        'document-embeddings': [1000, 5000, 30000],
        'market-validation': [2000, 10000, 60000],
        'social-sync': [5000, 30000, 120000],
        'notifications-digest': [1000, 5000, 15000]
    };

    public enqueue<T>(type: Job['type'], payload: T): Job<T> {
        const jobId = `job_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const job: Job<T> = {
            id: jobId,
            type,
            payload,
            attempts: 0,
            maxAttempts: 3,
            backoffMs: this.backoffSchedules[type] || [1000, 5000, 15000],
            status: 'queued',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.jobs.set(jobId, job);
        console.log(`[JobQueue] Enqueued job ${jobId} (type: ${type})`);
        
        // Trigger queue processing asynchronously
        setImmediate(() => this.processNext(type));
        return job;
    }

    public getJob(jobId: string): Job | undefined {
        return this.jobs.get(jobId);
    }

    private async processNext(type: Job['type']) {
        const active = this.activeCounts.get(type) || 0;
        const limit = this.concurrencyLimits[type] || 5;

        if (active >= limit) {
            return; // Concurrency limit reached for this job type
        }

        // Find next queued job of this type
        const queuedJob = Array.from(this.jobs.values()).find(
            j => j.type === type && j.status === 'queued'
        );

        if (!queuedJob) {
            return; // No pending jobs for this type
        }

        queuedJob.status = 'processing';
        queuedJob.attempts++;
        queuedJob.updatedAt = new Date();
        this.activeCounts.set(type, active + 1);

        console.log(`[JobQueue] Executing job ${queuedJob.id} (Attempt ${queuedJob.attempts}/${queuedJob.maxAttempts})`);

        try {
            await this.executeJobHandler(queuedJob);
            queuedJob.status = 'completed';
            queuedJob.updatedAt = new Date();
            console.log(`[JobQueue] Job ${queuedJob.id} COMPLETED successfully`);
        } catch (err: any) {
            console.error(`[JobQueue] Job ${queuedJob.id} failed attempt ${queuedJob.attempts}:`, err?.message || err);
            
            if (queuedJob.attempts < queuedJob.maxAttempts) {
                const delay = queuedJob.backoffMs[queuedJob.attempts - 1] || 5000;
                queuedJob.status = 'queued';
                console.log(`[JobQueue] Scheduling retry for job ${queuedJob.id} in ${delay}ms`);
                setTimeout(() => this.processNext(type), delay);
            } else {
                queuedJob.status = 'failed';
                queuedJob.error = err?.message || String(err);
                queuedJob.updatedAt = new Date();
                console.error(`[JobQueue] Job ${queuedJob.id} EXHAUSTED all retries. Moved to DEAD-LETTER state.`);
            }
        } finally {
            const currentActive = this.activeCounts.get(type) || 1;
            this.activeCounts.set(type, Math.max(0, currentActive - 1));
            // Continue processing queue
            setImmediate(() => this.processNext(type));
        }
    }

    private async executeJobHandler(job: Job): Promise<void> {
        // Concrete job handler implementation
        switch (job.type) {
            case 'document-embeddings':
                console.log(`[JobHandler] Processing document embedding for project ${job.payload?.projectId}`);
                // Simulating chunk embedding processing
                await new Promise(resolve => setTimeout(resolve, 1500));
                break;
            case 'market-validation':
                console.log(`[JobHandler] Generating market validation report for project ${job.payload?.projectId}`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                break;
            case 'social-sync':
                console.log(`[JobHandler] Syncing social data platform ${job.payload?.platform}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                break;
            case 'notifications-digest':
                console.log(`[JobHandler] Formatting notification digest for user ${job.payload?.userId}`);
                await new Promise(resolve => setTimeout(resolve, 500));
                break;
        }
    }
}

export const jobQueue = new JobQueueManager();
