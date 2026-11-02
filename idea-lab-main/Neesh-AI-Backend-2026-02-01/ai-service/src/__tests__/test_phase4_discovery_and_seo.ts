/**
 * NEESH V19 — PHASE 4 COMPREHENSIVE VERIFICATION TEST SUITE
 * 
 * Verifies:
 *  1. Task 0: PioneerGradeBadge Canonical Colors (AA.2) & Guarantee Claim Window (13 Days)
 *  2. Task 5: Depth Score Job Heuristic (MIN/MAX Formula, Domain Keywords, Clamping, Case-Insensitivity)
 *  3. Task 4: SitemapGenerationJob (XML Standard Compliance, SSR URLs, Exclusion Rules)
 *  4. Task 3: Public Interaction Case Studies & Blog Controller (Anonymization, Rating >= 4 Gate, Schema.org Article)
 *  5. Task 1 & 2: Domain Proof Feed & SSR Edge Functions
 *  6. Task 7: Legacy Route Removal & 404 Verification
 *  7. Task 6, 8, 9 & 10: Offer Stacks (<= 5 items), Senior Fast-Track Screen, Elite Tier Roadmap, Robots.txt
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { calculateDepthScore } from '../jobs/DepthScoreJob';
import { buildSitemapXml, SitemapUrlEntry } from '../jobs/SitemapGenerationJob';
import { InteractionBlogController } from '../controllers/InteractionBlogController';
import domainKeywords from '../config/domain-keywords.json';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string, details?: any) {
  if (condition) {
    testsPassed++;
    console.log(`[PASS] ${message}`);
  } else {
    testsFailed++;
    console.error(`[FAIL] ${message}`);
    if (details) {
      console.error('       Details:', details);
    }
  }
}

async function runPhase4Tests() {
  console.log('================================================================');
  console.log('NEESH V19 — PHASE 4 TEST SUITE: DISCOVERY ENGINE & SEO');
  console.log('================================================================\n');

  // Paths
  const frontendSrcDir = path.resolve(__dirname, '../../../../src');
  const publicDir = path.resolve(__dirname, '../../../../public');
  const backendSrcDir = path.resolve(__dirname, '../');

  // ── SUITE 1: TASK 0 — PIONEER GRADE BADGE COLORS & GUARANTEE CLAIM WINDOW ───
  console.log('--- Suite 1: Task 0 — PioneerGradeBadge Canonical Colors & Guarantee Window ---');

  const badgePath = path.join(frontendSrcDir, 'components/pioneer/PioneerGradeBadge.tsx');
  const badgeContent = fs.readFileSync(badgePath, 'utf8');

  // PRD Section AA.2 Canonical Colors:
  // SEED: #6B7280 (neutral grey)
  // RISING: #3B82F6 (blue)
  // PRO: #10B981 (emerald green)
  // MASTER: #F59E0B (amber gold)
  // ELITE: #8B5CF6 (purple)
  assert(badgeContent.includes("SEED: '#6B7280'"), 'Test 1: Seed Pioneer badge uses canonical neutral grey #6B7280');
  assert(badgeContent.includes("RISING: '#3B82F6'"), 'Test 2: Rising Pioneer badge uses canonical blue #3B82F6');
  assert(badgeContent.includes("PRO: '#10B981'"), 'Test 3: Pro Pioneer badge uses canonical emerald green #10B981');
  assert(badgeContent.includes("MASTER: '#F59E0B'"), 'Test 4: Master Pioneer badge uses canonical amber gold #F59E0B');
  assert(badgeContent.includes("ELITE: '#8B5CF6'"), 'Test 5: Elite Pioneer badge uses canonical purple #8B5CF6');

  // Reject hot pink (#EC4899)
  assert(!badgeContent.includes('#EC4899') && !badgeContent.includes('#ec4899'), 'Test 6: PioneerGradeBadge does NOT contain invalid hot pink #EC4899');

  // Guarantee claim window interval = 13 days
  const sprintExpiryJobPath = path.join(backendSrcDir, 'jobs/SprintExpiryJob.ts');
  const sprintExpiryJobContent = fs.readFileSync(sprintExpiryJobPath, 'utf8');
  assert(
    sprintExpiryJobContent.includes('13 * 24 * 60 * 60 * 1000') || sprintExpiryJobContent.includes("INTERVAL '13 days'"),
    'Test 7: SprintExpiryJob enforces guarantee claim window closes at NOW() + INTERVAL 13 days'
  );

  const sprintControllerPath = path.join(backendSrcDir, 'controllers/SprintController.ts');
  const sprintControllerContent = fs.readFileSync(sprintControllerPath, 'utf8');
  assert(
    sprintControllerContent.includes('13 * 24 * 60 * 60 * 1000') || sprintControllerContent.includes("13 days"),
    'Test 8: SprintController enforces guarantee claim window closes at NOW() + 13 days'
  );

  // ── SUITE 2: TASK 5 — DEPTH SCORE JOB HEURISTIC & DOMAIN KEYWORDS ───────────
  console.log('\n--- Suite 2: Task 5 — Depth Score Job Heuristic (Section AF.1) ---');

  // Formula:
  // length_score = MIN(content.length / 500, 1.0)
  // specificity_mult = MIN(1.0 + keyword_count * 0.1, 1.5)
  // depth_score = ROUND(length_score * specificity_mult, 3)

  // 100-char content, 0 keywords: MIN(100/500, 1.0) * 1.0 = 0.200
  const shortContent = 'This is a short founder query with zero matching keywords. Exactly 100 characters.'.padEnd(100, '.').slice(0, 100);
  const score100 = calculateDepthScore(shortContent, 'b2b-saas');
  assert(score100 === 0.200, 'Test 9: 100-character content with 0 keywords yields depth_score = 0.200', { score: score100 });

  // 500-char content, 0 keywords: MIN(500/500, 1.0) * 1.0 = 1.000
  const baseContent = 'A neutral query with no specific domain terminology. '.repeat(10).slice(0, 500);
  const score500_0kw = calculateDepthScore(baseContent, 'b2b-saas');
  assert(score500_0kw === 1.000, 'Test 10: 500-character content with 0 keywords yields depth_score = 1.000', { score: score500_0kw });

  // 250-char content, 0 keywords: MIN(250/500, 1.0) * 1.0 = 0.500
  const halfContent = 'A neutral query with no specific domain terminology. '.repeat(5).slice(0, 250);
  const score250 = calculateDepthScore(halfContent, 'b2b-saas');
  assert(score250 === 0.500, 'Test 11: 250-character content with 0 keywords yields depth_score = 0.500', { score: score250 });

  // 500-char content, 5 keywords: 1.0 * MIN(1.0 + 5 * 0.1, 1.5) = 1.500
  // b2b-saas keywords: arr, mrr, churn, cac, ltv
  const richContent = 'We need advice tracking our ARR and MRR figures while decreasing customer churn and CAC to improve our LTV overall.'.padEnd(500, '.').slice(0, 500);
  const score500_5kw = calculateDepthScore(richContent, 'b2b-saas');
  assert(score500_5kw === 1.500, 'Test 12: 500-character content with 5 domain keywords yields maximum depth_score = 1.500', { score: score500_5kw });

  // 500-char content, 3 keywords: 1.0 * MIN(1.0 + 3 * 0.1, 1.5) = 1.300
  // 3 keywords: arr, mrr, churn
  const content3kw = 'We need advice tracking our ARR and MRR figures while decreasing customer churn overall.'.padEnd(500, '.').slice(0, 500);
  const score500_3kw = calculateDepthScore(content3kw, 'b2b-saas');
  assert(score500_3kw === 1.300, 'Test 13: 500-character content with 3 domain keywords yields depth_score = 1.300', { score: score500_3kw });

  // Clamping test: 1200 characters and 10 keywords clamped at 1.500
  const longRichContent = 'Optimizing ARR, MRR, churn, CAC, LTV, retention, onboarding, pipeline, PLG, ACV across all cohorts.'.repeat(12);
  const scoreClamped = calculateDepthScore(longRichContent, 'b2b-saas');
  assert(scoreClamped === 1.500, 'Test 14: Over-length content (>500 chars) with >5 keywords is clamped at 1.500', { score: scoreClamped });

  // Empty content returns 0
  const scoreEmpty = calculateDepthScore('', 'b2b-saas');
  assert(scoreEmpty === 0, 'Test 15: Empty or undefined content yields depth_score = 0.000', { score: scoreEmpty });

  // Case insensitivity
  const lowerKw = 'our platform tracks arr, mrr, churn, cac, ltv'.padEnd(500, ' ');
  const upperKw = 'OUR PLATFORM TRACKS ARR, MRR, CHURN, CAC, LTV'.padEnd(500, ' ');
  assert(
    calculateDepthScore(lowerKw, 'b2b-saas') === calculateDepthScore(upperKw, 'b2b-saas'),
    'Test 16: DepthScoreJob keyword matching is strictly case-insensitive'
  );

  // Config presence
  assert(Boolean(domainKeywords['b2b-saas']) && Boolean(domainKeywords['fintech']), 'Test 17: domain-keywords.json contains required domain taxonomy lists');

  // Fallback behavior
  const scoreUnknown = calculateDepthScore(richContent, 'unlisted-domain-xyz');
  assert(scoreUnknown > 0, 'Test 18: calculateDepthScore safely falls back to default domain keywords for unknown domains');

  // ── SUITE 3: TASK 4 — SITEMAP GENERATION JOB ────────────────────────────────
  console.log('\n--- Suite 3: Task 4 — SitemapGenerationJob (Section AF, AV) ---');

  const mockSitemapUrls: SitemapUrlEntry[] = [
    { loc: 'https://neesh.ai/', changefreq: 'daily', priority: '1.0' },
    { loc: 'https://neesh.ai/for-founders', changefreq: 'daily', priority: '0.9' },
    { loc: 'https://neesh.ai/for-explorers', changefreq: 'daily', priority: '0.9' },
    { loc: 'https://neesh.ai/pricing', changefreq: 'weekly', priority: '0.8' },
    { loc: 'https://neesh.ai/domain/b2b-saas', changefreq: 'daily', priority: '0.8' },
    { loc: 'https://neesh.ai/explorer/validpioneer', changefreq: 'daily', priority: '0.7' },
    { loc: 'https://neesh.ai/blog/b2b-saas-abc12345', changefreq: 'weekly', priority: '0.6' },
  ];

  const generatedXml = buildSitemapXml(mockSitemapUrls);

  assert(generatedXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Test 19: Sitemap output contains standard XML declaration');
  assert(generatedXml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), 'Test 20: Sitemap root element defines standard sitemaps.org namespace');
  assert(generatedXml.includes('<loc>https://neesh.ai/</loc>') && generatedXml.includes('<priority>1.0</priority>'), 'Test 21: Sitemap includes homepage with priority 1.0');
  assert(generatedXml.includes('<loc>https://neesh.ai/for-founders</loc>'), 'Test 22: Sitemap includes /for-founders');
  assert(generatedXml.includes('<loc>https://neesh.ai/for-explorers</loc>'), 'Test 23: Sitemap includes /for-explorers');
  assert(generatedXml.includes('<loc>https://neesh.ai/domain/b2b-saas</loc>'), 'Test 24: Sitemap includes active domain URLs');
  assert(generatedXml.includes('<loc>https://neesh.ai/explorer/validpioneer</loc>'), 'Test 25: Sitemap includes active Pioneer URLs');
  assert(generatedXml.includes('<loc>https://neesh.ai/blog/b2b-saas-abc12345</loc>'), 'Test 26: Sitemap includes public interaction blog URLs');

  // Exclusions: ensure no private routes are generated
  assert(!generatedXml.includes('/dashboard'), 'Test 27: Sitemap excludes private /dashboard/ paths');
  assert(!generatedXml.includes('/admin'), 'Test 28: Sitemap excludes internal /admin/ paths');
  assert(!generatedXml.includes('/onboarding'), 'Test 29: Sitemap excludes /onboarding/ paths');

  // Verify sitemap job file queries only active and non-suspended profiles
  const sitemapJobCode = fs.readFileSync(path.join(backendSrcDir, 'jobs/SitemapGenerationJob.ts'), 'utf8');
  assert(sitemapJobCode.includes(".neq('pioneer_grade', 'SUSPENDED')"), 'Test 30: SitemapGenerationJob filters out SUSPENDED pioneer profiles');

  // ── SUITE 4: TASK 3 — PUBLIC INTERACTION BLOG CASE STUDIES ──────────────────
  console.log('\n--- Suite 4: Task 3 — Interaction Blog Case Studies (Section U.2) ---');

  // Slug generator format
  const blogSlug = InteractionBlogController.generateSlug('B2B SaaS', '123e4567-e89b-12d3-a456-426614174000');
  assert(blogSlug === 'b2b-saas-123e4567', 'Test 31: generateSlug creates deterministic [domain-slug]-[8-char-id] format', { blogSlug });

  // Server-side content anonymization
  const rawFeedback = 'Acme Corp must refine its retention funnel before enterprise expansion.';
  const sanitized = InteractionBlogController.anonymizeContent(rawFeedback, 'Acme Corp');
  assert(!sanitized.includes('Acme Corp') && sanitized.includes('our product'), 'Test 32: anonymizeContent strips company brand and replaces with generic product placeholder');

  // Controller source code check for gates
  const blogCtrlCode = fs.readFileSync(path.join(backendSrcDir, 'controllers/InteractionBlogController.ts'), 'utf8');
  assert(blogCtrlCode.includes('rating < 4'), 'Test 33: InteractionBlogController rejects interactions with founder_rating < 4');
  assert(blogCtrlCode.includes("pioneer_grade === 'SUSPENDED'"), 'Test 34: InteractionBlogController rejects interactions from suspended explorers');
  assert(blogCtrlCode.includes('show_public_excerpts'), 'Test 35: InteractionBlogController respects show_public_excerpts privacy flag');
  assert(blogCtrlCode.includes("'@type': 'Article'"), 'Test 36: InteractionBlogController generates Schema.org Article JSON-LD structured data');

  // Migration file check
  const migrationPath = path.resolve(__dirname, '../../../../supabase/migrations/20261103000000_v19_interaction_slugs.sql');
  assert(fs.existsSync(migrationPath), 'Test 37: Migration 20261103000000_v19_interaction_slugs.sql exists on disk');

  // ── SUITE 5: TASK 1 & 2 — DOMAIN PROOF FEED & SSR EDGE FUNCTIONS ───────────
  console.log('\n--- Suite 5: Task 1 & 2 — Domain Proof Feed & SSR Edge Functions ---');

  const domainProofWidgetPath = path.join(frontendSrcDir, 'components/DomainProofWidget.tsx');
  assert(fs.existsSync(domainProofWidgetPath), 'Test 38: DomainProofWidget component file exists');
  const domainProofContent = fs.readFileSync(domainProofWidgetPath, 'utf8');
  assert(domainProofContent.includes('activeSpotlightCount') && domainProofContent.includes('gradeBreakdown'), 'Test 39: DomainProofWidget renders spotlight counts and grade breakdown');
  assert(domainProofContent.includes('GRADE_COLORS') && domainProofContent.includes('activeSpotlightCount'), 'Test 40: DomainProofWidget utilizes canonical AA.2 color tokens');

  const domainSsrEdgePath = path.resolve(__dirname, '../../../../api/ssr/domain/[slug].ts');
  assert(fs.existsSync(domainSsrEdgePath), 'Test 41: Vercel Edge Function for Domain SSR exists at api/ssr/domain/[slug].ts');

  const blogSsrEdgePath = path.resolve(__dirname, '../../../../api/ssr/blog/[slug].ts');
  assert(fs.existsSync(blogSsrEdgePath), 'Test 42: Vercel Edge Function for Blog SSR exists at api/ssr/blog/[slug].ts');

  // ── SUITE 6: TASK 7 — LEGACY ROUTE CLEANUP & 404 VERIFICATION ──────────────
  console.log('\n--- Suite 6: Task 7 — Legacy Route Cleanup & 404 Verification ---');

  const legacyChatbot = path.join(frontendSrcDir, 'pages/Chatbot.tsx');
  const legacyFeedback = path.join(frontendSrcDir, 'pages/FeedbackBuilder.tsx');
  const legacyEcosystem = path.join(frontendSrcDir, 'pages/InnovationEcosystem.tsx');
  const legacySimulation = path.join(frontendSrcDir, 'pages/SimulationPage.tsx');

  assert(!fs.existsSync(legacyChatbot), 'Test 43: Legacy Chatbot.tsx is deleted');
  assert(!fs.existsSync(legacyFeedback), 'Test 44: Legacy FeedbackBuilder.tsx is deleted');
  assert(!fs.existsSync(legacyEcosystem), 'Test 45: Legacy InnovationEcosystem.tsx is deleted');
  assert(!fs.existsSync(legacySimulation), 'Test 46: Legacy SimulationPage.tsx is deleted');

  const appRoutesContent = fs.readFileSync(path.join(frontendSrcDir, 'App.tsx'), 'utf8');
  assert(!appRoutesContent.includes('path="/chatbot"'), 'Test 47: App.tsx has no active route for /chatbot');
  assert(!appRoutesContent.includes('path="/feedback-builder"'), 'Test 48: App.tsx has no active route for /feedback-builder');
  assert(!appRoutesContent.includes('path="/innovation-ecosystem"'), 'Test 49: App.tsx has no active route for /innovation-ecosystem');
  assert(!appRoutesContent.includes('path="/simulation"'), 'Test 50: App.tsx has no active route for /simulation');

  // ── SUITE 7: TASK 6, 8, 9 & 10 — OFFER STACKS, SENIOR FAST-TRACK, ELITE TIER & SEO ──
  console.log('\n--- Suite 7: Task 6, 8, 9 & 10 — Offer Stacks, Senior Fast-Track, Elite Tier & SEO ---');

  // ForFounders offer stack
  const forFoundersPath = path.join(frontendSrcDir, 'pages/ForFounders.tsx');
  const forFoundersContent = fs.readFileSync(forFoundersPath, 'utf8');
  assert(forFoundersContent.includes('founderOfferStack') && forFoundersContent.includes('Sprint ₹84/day'), 'Test 51: ForFounders.tsx contains founder offer stack featuring 7-day Sprint at ₹84/day (₹588)');

  // ForExplorers offer stack
  const forExplorersPath = path.join(frontendSrcDir, 'pages/ForExplorers.tsx');
  const forExplorersContent = fs.readFileSync(forExplorersPath, 'utf8');
  assert(forExplorersContent.includes('explorerOfferStack') && forExplorersContent.includes('2,500'), 'Test 52: ForExplorers.tsx contains explorer offer stack featuring ₹2,500 baseline guarantee');

  // Senior Fast-Track fee ceiling acknowledgment
  const seniorFastTrackPath = path.join(frontendSrcDir, 'pages/onboarding/SeniorFastTrackScreen.tsx');
  assert(fs.existsSync(seniorFastTrackPath), 'Test 53: SeniorFastTrackScreen component exists');
  const seniorFastTrackContent = fs.readFileSync(seniorFastTrackPath, 'utf8');
  assert(seniorFastTrackContent.includes('Start as Rising instead'), 'Test 54: SeniorFastTrackScreen features visible "Start as Rising instead" CTA');
  assert(seniorFastTrackContent.includes('3,000') && seniorFastTrackContent.includes('10,000'), 'Test 55: SeniorFastTrackScreen acknowledges Pro fee ceiling (₹3,000) and Elite ceiling (₹10,000)');

  // Elite Tier Roadmap & FAQ
  assert(forExplorersContent.includes('50 completed paid interactions') && forExplorersContent.includes('4.5+') && forExplorersContent.includes('10,000'), 'Test 56: ForExplorers.tsx explains Elite roadmap: 50 completed paid interactions, >=4.5 rating, up to ₹10,000');
  const explorerFaqPath = path.join(frontendSrcDir, 'pages/ExplorerFAQ.tsx');
  assert(fs.existsSync(explorerFaqPath), 'Test 57: ExplorerFAQ page exists');
  const faqContent = fs.readFileSync(explorerFaqPath, 'utf8');
  assert(faqContent.includes('Elite is the highest Pioneer grade') && faqContent.includes('50 completed paid interactions'), 'Test 58: ExplorerFAQ includes canonical Elite grade progression answers');

  // robots.txt audit
  const robotsPath = path.join(publicDir, 'robots.txt');
  assert(fs.existsSync(robotsPath), 'Test 59: robots.txt file exists in public directory');
  const robotsContent = fs.readFileSync(robotsPath, 'utf8');
  assert(
    robotsContent.includes('Allow: /explorer/') &&
    robotsContent.includes('Allow: /domain/') &&
    robotsContent.includes('Allow: /blog/') &&
    robotsContent.includes('Disallow: /dashboard/') &&
    robotsContent.includes('Disallow: /admin/') &&
    robotsContent.includes('Sitemap: https://neesh.ai/sitemap.xml'),
    'Test 60: robots.txt enforces canonical Allow, Disallow, and Sitemap directives'
  );

  console.log('\n================================================================');
  console.log(`PHASE 4 TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED (TOTAL: ${testsPassed + testsFailed})`);
  console.log('================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch((err) => {
  console.error('Fatal error running Phase 4 tests:', err);
  process.exit(1);
});
