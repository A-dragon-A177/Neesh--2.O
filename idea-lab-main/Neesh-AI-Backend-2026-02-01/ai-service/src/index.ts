import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import compression from 'compression';
import { RagController } from './controllers/RagController';

// ── Production Hardening Imports ─────────────────────────────────────
import { validateEnvironment } from './config/validateEnv';
import { requireProjectOwnership } from './middleware/projectOwnership';
import { publicRateLimiter } from './middleware/publicRateLimit';
import { sanitizeChatInput } from './middleware/inputSanitizer';

// Validate required environment variables on startup (fail fast)
validateEnvironment();

const app = express();
const port = process.env.PORT || 3000;

app.use(compression());

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080,http://localhost:7000,http://localhost:7001')
    .split(',')
    .map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true
}));
app.use(bodyParser.json());

import { rateLimiter } from './middleware/rateLimit';
import { tracingMiddleware } from './middleware/tracing';
app.use(tracingMiddleware);
app.use(rateLimiter);

// Apply Security Middleware to all /internal routes
import { requireInternalAuth } from './middleware/auth';
app.use('/internal', requireInternalAuth);

import { jobQueue } from './jobs/jobQueue';

app.post('/internal/jobs/enqueue', (req, res) => {
    const { jobType, payload } = req.body;
    if (!jobType) {
        return res.status(400).json({ error: 'jobType is required' });
    }
    const job = jobQueue.enqueue(jobType, payload || {});
    return res.status(202).json({
        status: 'QUEUED',
        jobId: job.id,
        type: job.type,
        createdAt: job.createdAt
    });
});

app.get('/internal/jobs/:jobId', (req, res) => {
    const job = jobQueue.getJob(req.params.jobId);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    return res.json({
        jobId: job.id,
        type: job.type,
        status: job.status,
        attempts: job.attempts,
        error: job.error,
        updatedAt: job.updatedAt
    });
});

// Apply Supabase auth middleware to protected /api routes (exclude /api/public/*)
import { supabaseAuth } from './middleware/supabaseAuth';
app.use('/api', (req, res, next) => {
    // Skip auth for public endpoints
    if (req.path.startsWith('/public/')) {
        return next();
    }
    return supabaseAuth(req, res, next);
});

// ── Project Ownership Verification (Phase 1 Security Hardening) ──────
// Applies to all authenticated project-scoped routes.
// Runs AFTER supabaseAuth (so req.user is populated) but BEFORE controllers.
// Public routes are unaffected (they don't pass through supabaseAuth).
app.use('/api/projects/:id', (req, res, next) => {
    if (req.path.startsWith('/public/')) return next();
    return requireProjectOwnership(req, res, next);
});
app.use('/api/documents/project/:projectId', requireProjectOwnership);

const ragController = new RagController();

// Public API routes (user-facing)
import { ProjectController } from './controllers/ProjectController';
const projectController = new ProjectController();

app.get('/api/projects', (req, res) => projectController.getProjects(req, res));
app.post('/api/projects', (req, res) => projectController.createProject(req, res));
app.get('/api/projects/:id', (req, res) => projectController.getProject(req, res));
app.put('/api/projects/:id', (req, res) => projectController.updateProject(req, res));
app.delete('/api/projects/:id', (req, res) => projectController.deleteProject(req, res));

// Document API routes
import { DocumentController, uploadMiddleware } from './controllers/DocumentController';
const documentController = new DocumentController();

app.get('/api/documents/project/:projectId', (req, res) => documentController.getProjectDocuments(req, res));
app.post('/api/documents/project/:projectId', uploadMiddleware, (req, res) => documentController.uploadDocument(req, res));
app.put('/api/documents/:documentId/replace', uploadMiddleware, (req, res) => documentController.replaceDocument(req, res));
app.post('/api/documents/project/:projectId/refresh', (req, res) => documentController.refreshDocuments(req, res));

// Chat API routes
import { ChatController } from './controllers/ChatController';
const chatController = new ChatController();

app.post('/api/projects/:id/chat', sanitizeChatInput, (req, res) => chatController.chatWithProject(req, res));

// Public chat endpoint (no auth required) — with stricter rate limiting + input sanitization
app.post('/api/public/projects/:id/chat', publicRateLimiter, sanitizeChatInput, (req, res) => chatController.publicChatWithProject(req, res));

// Public project endpoints (no auth required)
app.get('/api/public/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));
app.get('/api/public/projects/id/:projectId', (req, res) => projectController.getPublicProjectById(req, res));
app.get('/api/public/projects/blog/:slug', (req, res) => blogController.getPublicBlog(req, res));
app.get('/api/public/projects/:projectId/blog', (req, res) => blogController.getPublicBlog(req, res));
app.get('/api/public/projects/:projectId/early-access-price', (req, res) => projectController.getEarlyAccessPrice(req, res));
app.get('/api/public/projects/:projectId/comments', (req, res) => projectController.getPublicComments(req, res));
app.get('/api/public/projects/:slug', (req, res) => projectController.getPublicProject(req, res));

// Blog API routes (authenticated)
import { BlogController } from './controllers/BlogController';
const blogController = new BlogController();

app.get('/api/projects/:projectId/blog', (req, res) => blogController.getBlog(req, res));
app.put('/api/projects/:projectId/blog', (req, res) => blogController.upsertBlog(req, res));

// Audience routes (authenticated)
import { AudienceController } from './controllers/AudienceController';
const audienceController = new AudienceController();

app.get('/api/projects/:projectId/audience', (req, res) => audienceController.getAudience(req, res));
app.post('/api/public/projects/:projectId/feedback', (req, res) => audienceController.submitPublicFeedback(req, res));
app.post('/api/public/projects/:projectId/comments', (req, res) => audienceController.submitPublicFeedback(req, res));
app.post('/api/public/projects/:projectId/interest', (req, res) => audienceController.recordInterest(req, res));
app.get('/api/public/projects/:projectId/interest-count', (req, res) => audienceController.getInterestCount(req, res));
app.get('/api/public/projects/:projectId/check-interest', (req, res) => audienceController.checkUserInterest(req, res));

// User / subscription routes (authenticated)
import { UserController } from './controllers/UserController';
const userController = new UserController();

app.get('/api/users/subscription', (req, res) => userController.getSubscription(req, res));
app.get('/api/users/me', (req, res) => {
    res.json({
        id: req.user?.id,
        email: req.user?.email,
        name: req.user?.email?.split('@')[0] || 'Founder',
        role: 'user'
    });
});
app.put('/api/users/subscription/upgrade', (req, res) => userController.upgradeToPro(req, res));
app.put('/api/users/branding', (req, res) => userController.updateBranding(req, res));

// API Key management routes
import { ApiKeyController } from './controllers/ApiKeyController';
const apiKeyController = new ApiKeyController();

app.get('/api/user/api-keys', (req, res) => apiKeyController.getUserApiKeys(req, res));
app.post('/api/user/api-keys', (req, res) => apiKeyController.saveApiKey(req, res));
app.delete('/api/user/api-keys/:provider', (req, res) => apiKeyController.deleteApiKey(req, res));

// Notifications stub routes (not yet implemented)
app.get('/api/projects/:projectId/notifications', (req, res) => {
    res.json({ clusters: [], count: 0, unansweredCount: 0 });
});
app.get('/api/projects/:projectId/notifications/count', (req, res) => {
    res.json({ count: 0 });
});
app.get('/api/notifications/clusters/:clusterId', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});
app.post('/api/notifications/clusters/:clusterId/reply', (req, res) => {
    res.json({ clusterId: req.params.clusterId, answeredCount: 0, totalCount: 0, clusterStatus: 'unanswered' });
});

// FAQ stub routes
app.get('/api/projects/:projectId/faqs', (req, res) => {
    res.json({ faqs: [], count: 0 });
});
app.post('/api/projects/:projectId/faqs', (req, res) => {
    res.status(501).json({ error: 'Not implemented' });
});
app.put('/api/faqs/:faqId', (req, res) => {
    res.status(501).json({ error: 'Not implemented' });
});
app.delete('/api/faqs/:faqId', (req, res) => {
    res.json({ success: true });
});

// Questions stub routes
app.get('/api/projects/:projectId/questions/unanswered', (req, res) => {
    res.json({ questions: [], count: 0 });
});
app.put('/api/questions/:questionId/resolve', (req, res) => {
    res.json({ success: true });
});

// Validated Buyers endpoint
app.get('/api/projects/:projectId/validated-buyers', (req, res) => audienceController.getValidatedBuyers(req, res));

// Audience member detail & question answering endpoints
app.get('/api/audience/:memberId', (req, res) => audienceController.getMemberDetail(req, res));
app.put('/api/audience/questions/:questionId/answer', (req, res) => audienceController.answerQuestion(req, res));

// Spotlight analytics endpoint (dynamic calculated from real audience interactions)
app.get('/api/projects/:projectId/spotlight-analytics', (req, res) => audienceController.getSpotlightAnalytics(req, res));

// Links stub routes
app.get('/api/projects/:projectId/links', (req, res) => {
    res.json([]);
});
app.post('/api/projects/:projectId/links', (req, res) => {
    res.status(501).json({ error: 'Not implemented' });
});
app.delete('/api/projects/:projectId/links/:linkId', (req, res) => {
    res.json({ success: true });
});

// Promotion & Pitches API routes
import { PromotionController } from './controllers/PromotionController';
const promotionController = new PromotionController();

// Public pitch and promotion endpoints (no auth required)
app.get('/api/public/pitches', (req, res) => promotionController.getPitchFeed(req, res));
app.get('/api/public/promotions/similar/:projectId', (req, res) => promotionController.getSimilarBlogs(req, res));
app.get('/api/public/projects/:id/interest-count', (req, res) => { (req.params as any).projectId = req.params.id; return audienceController.getInterestCount(req, res); });
app.post('/api/public/projects/:id/record-pitch-view', (req, res) => promotionController.recordPitchView(req, res));
app.get('/api/public/blog-branding/:projectId', (req, res) => promotionController.getBlogBranding(req, res));

// Public OTP and Password Reset endpoints (no auth required)
import { OtpController } from './controllers/OtpController';
const otpController = new OtpController();
app.post('/api/public/otp/send', (req, res) => otpController.sendOtp(req, res));
app.post('/api/public/otp/verify', (req, res) => otpController.verifyOtp(req, res));
app.post('/api/public/otp/reset-password', (req, res) => otpController.resetPassword(req, res));

// Authenticated promotions routes
app.get('/api/promotions', (req, res) => promotionController.getUserPromotions(req, res));
app.post('/api/promotions', (req, res) => promotionController.submitPromotion(req, res));
app.delete('/api/promotions/:id', (req, res) => promotionController.removePromotion(req, res));

// Public health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Neesh AI Service',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'ai-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Internal debug endpoint to test Gemini models
app.get('/internal/debug/gemini-models', async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'No GEMINI_API_KEY found' });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const data = await response.json();

        if (!response.ok) {
            return res.json({
                apiKeyStatus: 'invalid',
                error: data.error || 'API key validation failed'
            });
        }

        const availableModels = data.models?.map((model: any) => model.name) || [];

        res.json({
            apiKeyStatus: 'valid',
            availableModels,
            totalModels: availableModels.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : String(error),
            apiKeyStatus: 'unknown'
        });
    }
});

// Internal API routes
app.post('/internal/ingest/:projectId', (req, res) => ragController.ingestProject(req, res));
app.post('/internal/query', (req, res) => ragController.queryVectorStore(req, res));
app.post('/internal/chat', (req, res) => ragController.chatWithProject(req, res));

// RAG Analytics + Cache Management routes
app.get('/internal/projects/:projectId/rag-analytics', (req, res) => ragController.getProjectRagAnalytics(req, res));
app.get('/internal/rag-analytics/global', (req, res) => ragController.getGlobalRagAnalytics(req, res));
app.get('/internal/rag-analytics/cache', (req, res) => ragController.getCacheStats(req, res));
app.delete('/internal/projects/:projectId/cache', (req, res) => ragController.invalidateProjectCache(req, res));

// Learning Loop Routes
import { LearningController } from './controllers/LearningController';
const learningController = new LearningController();
app.post('/internal/feedback', (req, res) => learningController.submitFeedback(req, res));
app.post('/internal/manual-answer', (req, res) => learningController.submitManualAnswer(req, res));
app.get('/internal/notifications/:projectId', (req, res) => learningController.getNotifications(req, res));

// Insight Routes
import { InsightController } from './controllers/InsightController';
const insightController = new InsightController();
app.get('/internal/projects/:projectId/health', (req, res) => insightController.getProjectHealth(req, res));
app.get('/internal/projects/:projectId/readiness', (req, res) => insightController.getReadiness(req, res));
app.get('/internal/projects/:projectId/risks', (req, res) => insightController.getRisks(req, res));


// Metrics Endpoint (Internal Gated)
import { metricsRegistry } from './services/MetricsRegistry';
app.get('/internal/metrics', (req, res) => {
    return res.json(metricsRegistry.getMetricsSnapshot());
});

// ── Graceful Shutdown (Phase 2 Infrastructure Hardening) ─────────────
const server = app.listen(port, () => {
    console.log(`AI Service running on port ${port}`);
});

function gracefulShutdown(signal: string) {
    console.log(`[Shutdown] ${signal} received. Closing server gracefully...`);
    server.close(() => {
        console.log('[Shutdown] HTTP server closed. All in-flight requests completed.');
        process.exit(0);
    });
    // Force shutdown after 30 seconds if connections don't drain
    setTimeout(() => {
        console.error('[Shutdown] Forced shutdown after 30s timeout');
        process.exit(1);
    }, 30000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
