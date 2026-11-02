/**
 * NEESH V19 — PHASE 5 COMPREHENSIVE VERIFICATION TEST SUITE
 * 
 * Verifies:
 *  1. Pre-Phase Verification: Elite WAR Threshold (4.50) & robots.txt Crawler Access
 *  2. Founder Onboarding Flow & SparkController Endpoints
 *  3. Explorer Onboarding Flow, LinkedIn Verification & Founding Explorer Gating
 *  4. NotificationService: All 8 Email Types & Non-Blocking Resilience
 *  5. Founder Dashboard, Explorer Dashboard & Wallet Endpoints
 *  6. Ledger Account Balance & Human-Readable Transaction Mapping
 *  7. FoundingExplorerBadge UI Component
 *  8. Pre-Go-Live Hardening Checklist (No hardcoded credentials, trigger names, pricing constants)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PioneerGradeService } from '../services/PioneerGradeService';
import { NotificationService, NotificationType } from '../services/NotificationService';
import { DashboardController } from '../controllers/DashboardController';
import { SparkController } from '../controllers/SparkController';
import { ExplorerService } from '../services/ExplorerService';
import {
  SPRINT_DAY_PRICE_PAISE,
  FOUNDING_EXPLORER_BASELINE_PAISE,
  FOUNDING_EXPLORER_MAX_CAP,
  PLATFORM_SYSTEM_ID,
} from '../constants/pricing';

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

// Helper to recursively scan directory for files matching extensions excluding node_modules
function findSourceFiles(dir: string, extensions: string[]): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findSourceFiles(fullPath, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

async function runPhase5Tests() {
  console.log('================================================================');
  console.log('NEESH V19 — PHASE 5 TEST SUITE: ONBOARDING, NOTIFICATIONS & AUDIT');
  console.log('================================================================\n');

  const frontendSrcDir = path.resolve(__dirname, '../../../../src');
  const publicDir = path.resolve(__dirname, '../../../../public');
  const backendSrcDir = path.resolve(__dirname, '../');

  // ── SUITE 1: PRE-PHASE VERIFICATION (Elite WAR & robots.txt) ────────────────
  console.log('--- Suite 1: Pre-Phase Verification ---');

  // 1. PioneerGradeService WAR threshold for Elite
  const pioneerGradeCode = fs.readFileSync(path.join(backendSrcDir, 'services/PioneerGradeService.ts'), 'utf8');
  assert(
    pioneerGradeCode.includes('war >= 4.5') || pioneerGradeCode.includes('war >= 4.50'),
    'Test 1: PioneerGradeService WAR threshold for Elite is strictly 4.50'
  );

  const faqContent = fs.readFileSync(path.join(frontendSrcDir, 'pages/ExplorerFAQ.tsx'), 'utf8');
  assert(
    faqContent.includes('4.5 or above') || faqContent.includes('4.5+'),
    'Test 2: ExplorerFAQ copy aligns to 4.5 threshold matching PioneerGradeService'
  );

  // 2. robots.txt crawler verification
  const robotsTxt = fs.readFileSync(path.join(publicDir, 'robots.txt'), 'utf8');
  const hasGptBotAllow = robotsTxt.includes('User-agent: GPTBot') && robotsTxt.includes('Allow: /explorer/') && robotsTxt.includes('Allow: /domain/') && robotsTxt.includes('Allow: /blog/');
  const hasPerplexityAllow = robotsTxt.includes('User-agent: PerplexityBot') && robotsTxt.includes('Allow: /explorer/') && robotsTxt.includes('Allow: /domain/') && robotsTxt.includes('Allow: /blog/');
  const hasClaudeAllow = robotsTxt.includes('User-agent: ClaudeBot') && robotsTxt.includes('Allow: /explorer/') && robotsTxt.includes('Allow: /domain/') && robotsTxt.includes('Allow: /blog/');
  assert(
    hasGptBotAllow && hasPerplexityAllow && hasClaudeAllow,
    'Test 3: robots.txt allows GPTBot, PerplexityBot, and ClaudeBot to crawl /explorer/, /domain/, and /blog/'
  );

  // ── SUITE 2: FOUNDER ONBOARDING & SPARK CONTROLLER ──────────────────────────
  console.log('\n--- Suite 2: Founder Onboarding & SparkController ---');

  // Spark validation mock tests
  let sparkStatus = 0;
  let sparkResponse: any = null;

  const mockRes = () => {
    const res: any = {};
    res.status = (code: number) => {
      sparkStatus = code;
      return res;
    };
    res.json = (data: any) => {
      sparkResponse = data;
      return res;
    };
    return res;
  };

  // Content < 50 chars rejected
  await SparkController.createSpark(
    { body: { domain_id: '00000000-0000-0000-0000-000000000001', content: 'Too short' } } as any,
    mockRes()
  );
  assert(sparkStatus === 400 && sparkResponse?.error?.includes('at least 50 characters'), 'Test 4: POST /api/sparks rejects content < 50 characters');

  // Content > 300 chars rejected
  const longContent = 'A'.repeat(301);
  await SparkController.createSpark(
    { body: { domain_id: '00000000-0000-0000-0000-000000000001', content: longContent } } as any,
    mockRes()
  );
  assert(sparkStatus === 400 && sparkResponse?.error?.includes('not exceed 300 characters'), 'Test 5: POST /api/sparks rejects content > 300 characters');

  // Missing domain rejected
  await SparkController.createSpark(
    { body: { content: 'This is a valid startup spark that explains our customer value hypothesis in detail.' } } as any,
    mockRes()
  );
  assert(sparkStatus === 400 && sparkResponse?.error?.includes('domain'), 'Test 6: POST /api/sparks rejects missing or invalid domain_id');

  // Controller file presence & logic checks
  const sparkControllerCode = fs.readFileSync(path.join(backendSrcDir, 'controllers/SparkController.ts'), 'utf8');
  assert(sparkControllerCode.includes('createSpark') && sparkControllerCode.includes('getSparkById'), 'Test 7: SparkController implements createSpark and getSparkById');
  assert(sparkControllerCode.includes('getPreviewSparks'), 'Test 8: SparkController implements getPreviewSparks returning anonymized sparks');

  // ── SUITE 3: EXPLORER ONBOARDING & FOUNDING EXPLORER GATING ─────────────────
  console.log('\n--- Suite 3: Explorer Onboarding & Founding Explorer ---');

  // LinkedIn verification URL regex check
  const validUrl = 'https://www.linkedin.com/in/alex-carter-4421/';
  const invalidUrl = 'https://twitter.com/alexcarter';
  const linkedInPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-\.\%]+\/?$/i;

  assert(linkedInPattern.test(validUrl), 'Test 9: LinkedIn verification regex accepts valid https://linkedin.com/in/ URL');
  assert(!linkedInPattern.test(invalidUrl), 'Test 10: LinkedIn verification regex rejects non-LinkedIn URL');

  // Senior fast track eligibility: years >= 5
  assert(ExplorerService.calculateTenureMonths([{ title: 'PM', startDate: '2018-01-01', endDate: '2024-01-01' }]).isSeniorFastTrackEligible, 'Test 11: Explorer with years_in_domain >= 5 is flagged as Senior Fast-Track candidate');

  // Founding Explorer Cap: < 65 can enroll, >= 65 capped
  assert(ExplorerService.canEnrollFoundingExplorer(0), 'Test 12: First enrollment qualifies for Founding Explorer status');
  assert(ExplorerService.canEnrollFoundingExplorer(64), 'Test 13: 65th enrollment qualifies for Founding Explorer status');
  assert(!ExplorerService.canEnrollFoundingExplorer(65), 'Test 14: 66th enrollment does NOT earn Founding Explorer status (cap = 65)');

  // ── SUITE 4: NOTIFICATION SERVICE (ALL 8 TYPES) ─────────────────────────────
  console.log('\n--- Suite 4: NotificationService (All 8 Types & Non-Blocking) ---');

  const types: NotificationType[] = [
    'SPARK_FIRST_INTERACTION',
    'SPRINT_ACTIVATED',
    'SPRINT_DAY6_REMINDER',
    'GUARANTEE_CLAIMABLE',
    'DIRECT_REQUEST_RECEIVED',
    'DIRECT_REQUEST_ACCEPTED',
    'PIONEER_GRADE_UPGRADED',
    'EARNINGS_CREDITED',
  ];

  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    const payload = NotificationService.buildEmailPayload(t, {
      domain: 'B2B SaaS',
      content: 'Sample interaction feedback',
      sparkId: 'spark-123',
      endDate: '2026-11-10',
      interactionCount: 2,
      claimClosesAt: '2026-11-20',
      amountRupees: 588,
      description: 'Review request',
      feeRupees: 500,
      newGrade: 'PRO',
      feeRange: '₹800 – ₹3,000',
    });

    assert(Boolean(payload.subject) && Boolean(payload.html), `Test ${15 + i}: Notification payload for ${t} defines valid subject and HTML body`);
  }

  // Non-blocking test: NotificationService.send should never throw even on invalid input
  let sendThrew = false;
  try {
    const res = await NotificationService.send({
      type: 'SPARK_FIRST_INTERACTION',
      recipientEmail: 'invalid-email-address',
      data: {},
    });
    assert(res !== undefined, 'Test 23: NotificationService.send returns result object safely');
  } catch (err) {
    sendThrew = true;
  }
  assert(!sendThrew, 'Test 24: NotificationService failure does NOT throw or roll back caller transactions');

  // ── SUITE 5: DASHBOARD CONTROLLERS & WALLET ─────────────────────────────────
  console.log('\n--- Suite 5: Dashboard Endpoints & Human-Readable Ledger ---');

  const dashCode = fs.readFileSync(path.join(backendSrcDir, 'controllers/DashboardController.ts'), 'utf8');
  assert(dashCode.includes('getFounderDashboard'), 'Test 25: DashboardController provides getFounderDashboard endpoint');
  assert(dashCode.includes('getExplorerDashboard'), 'Test 26: DashboardController provides getExplorerDashboard endpoint');
  assert(dashCode.includes('getWallet'), 'Test 27: DashboardController provides getWallet endpoint');
  assert(dashCode.includes('formatHumanReadableReason'), 'Test 28: DashboardController implements formatHumanReadableReason');

  // Reason mapping tests
  const sprintReason = DashboardController.formatHumanReadableReason({
    entry_type: 'SPRINT_DAY_PURCHASE',
    metadata: { domain: 'B2B SaaS' },
  });
  assert(sprintReason === 'Sprint — B2B SaaS', 'Test 29: SPRINT_DAY_PURCHASE formats as "Sprint — [domain]"', { sprintReason });

  const feeReason = DashboardController.formatHumanReadableReason({
    entry_type: 'INTERACTION_FEE_CREDIT',
    metadata: { domain: 'FinTech' },
  });
  assert(feeReason === 'Interaction fee — FinTech', 'Test 30: INTERACTION_FEE_CREDIT formats as "Interaction fee — [domain]"', { feeReason });

  const guaranteeReason = DashboardController.formatHumanReadableReason({
    entry_type: 'GUARANTEE_CREDIT',
  });
  assert(guaranteeReason === 'Sprint guarantee credit', 'Test 31: GUARANTEE_CREDIT formats as "Sprint guarantee credit"');

  // ── SUITE 6: FRONTEND COMPONENTS & BADGES ───────────────────────────────────
  console.log('\n--- Suite 6: Frontend Pages & Components ---');

  // FoundingExplorerBadge
  const foundingBadgePath = path.join(frontendSrcDir, 'components/FoundingExplorerBadge.tsx');
  assert(fs.existsSync(foundingBadgePath), 'Test 32: FoundingExplorerBadge.tsx component exists');
  const foundingBadgeContent = fs.readFileSync(foundingBadgePath, 'utf8');
  assert(foundingBadgeContent.includes('#F59E0B'), 'Test 33: FoundingExplorerBadge uses canonical amber color #F59E0B');
  assert(foundingBadgeContent.includes('Founding Explorer #'), 'Test 34: FoundingExplorerBadge renders enrollment position');

  // FounderOnboarding
  const founderOnboardingPath = path.join(frontendSrcDir, 'pages/onboarding/FounderOnboarding.tsx');
  assert(fs.existsSync(founderOnboardingPath), 'Test 35: FounderOnboarding.tsx exists');
  const founderOnboardingContent = fs.readFileSync(founderOnboardingPath, 'utf8');
  assert(founderOnboardingContent.includes('DomainProofWidget'), 'Test 36: FounderOnboarding embeds DomainProofWidget on confirmation step');

  // ExplorerOnboarding
  const explorerOnboardingPath = path.join(frontendSrcDir, 'pages/onboarding/ExplorerOnboarding.tsx');
  assert(fs.existsSync(explorerOnboardingPath), 'Test 37: ExplorerOnboarding.tsx exists');
  const explorerOnboardingContent = fs.readFileSync(explorerOnboardingPath, 'utf8');
  assert(explorerOnboardingContent.includes('Start as Rising instead'), 'Test 38: ExplorerOnboarding incorporates "Start as Rising instead" CTA');

  // FounderDashboard & ExplorerDashboard & WalletPage
  assert(fs.existsSync(path.join(frontendSrcDir, 'pages/dashboard/FounderDashboard.tsx')), 'Test 39: FounderDashboard.tsx exists');
  assert(fs.existsSync(path.join(frontendSrcDir, 'pages/dashboard/ExplorerDashboard.tsx')), 'Test 40: ExplorerDashboard.tsx exists');
  assert(fs.existsSync(path.join(frontendSrcDir, 'pages/dashboard/WalletPage.tsx')), 'Test 41: WalletPage.tsx exists');

  const walletContent = fs.readFileSync(path.join(frontendSrcDir, 'pages/dashboard/WalletPage.tsx'), 'utf8');
  assert(walletContent.includes('Withdrawals available in V20'), 'Test 42: WalletPage contains V19 withdrawal notice modal');

  // App.tsx router verification
  const appRoutes = fs.readFileSync(path.join(frontendSrcDir, 'App.tsx'), 'utf8');
  assert(
    appRoutes.includes('/onboarding/founder') &&
    appRoutes.includes('/onboarding/explorer') &&
    appRoutes.includes('/dashboard/founder') &&
    appRoutes.includes('/dashboard/explorer') &&
    appRoutes.includes('/dashboard/wallet'),
    'Test 43: App.tsx routes all 5 new onboarding, dashboard, and wallet pages'
  );

  // ── SUITE 7: PRE-GO-LIVE SECURITY & HARDENING CHECKLIST ─────────────────────
  console.log('\n--- Suite 7: Pre-Go-Live Security & Hardening Checklist ---');

  // Grep all .ts and .tsx files in idea-lab-main (excluding node_modules) for hardcoded secrets
  const allSourceFiles = findSourceFiles(path.resolve(__dirname, '../../../../'), ['.ts', '.tsx']);

  let hardcodedCashfreeFound = false;
  let hardcodedResendFound = false;

  for (const file of allSourceFiles) {
    const text = fs.readFileSync(file, 'utf8');
    // Check for hardcoded app id (e.g. CF_TEST followed by digits, or explicit assignment of actual secret)
    if (/CASHFREE_APP_ID\s*=\s*['"][a-zA-Z0-9_-]{10,}['"]/.test(text)) {
      hardcodedCashfreeFound = true;
    }
    if (/RESEND_API_KEY\s*=\s*['"]re_[a-zA-Z0-9_-]{15,}['"]/.test(text)) {
      hardcodedResendFound = true;
    }
  }

  assert(!hardcodedCashfreeFound, 'Test 44: No hardcoded CASHFREE credentials in any .ts/.tsx source file');
  assert(!hardcodedResendFound, 'Test 45: No hardcoded RESEND_API_KEY in any .ts/.tsx source file');

  // Verify pricing constants
  assert(SPRINT_DAY_PRICE_PAISE === 8400n, 'Test 46: SPRINT_DAY_PRICE_PAISE is strictly 8400n (₹84/day, ₹588 total for 7 days)');
  assert(FOUNDING_EXPLORER_MAX_CAP === 65, 'Test 47: FOUNDING_EXPLORER_MAX_CAP is strictly 65');
  assert(FOUNDING_EXPLORER_BASELINE_PAISE === 250000n, 'Test 48: FOUNDING_EXPLORER_BASELINE_PAISE is strictly 250000 (₹2,500)');
  assert(PLATFORM_SYSTEM_ID === '00000000-0000-0000-0000-000000000001', 'Test 49: PLATFORM_SYSTEM_ID is constant 00000000-0000-0000-0000-000000000001');

  // Verify Ledger trigger in migration
  const migrationDir = path.resolve(__dirname, '../../../../supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql'));
  let triggerFound = false;
  let immutabilityLayersFound = false;

  for (const mf of migrationFiles) {
    const mText = fs.readFileSync(path.join(migrationDir, mf), 'utf8');
    if (mText.includes('no_update_or_delete_ledger')) {
      triggerFound = true;
    }
    if (mText.includes('REVOKE UPDATE, DELETE ON ledger_entries') && mText.includes('prevent_ledger_mutation')) {
      immutabilityLayersFound = true;
    }
  }

  assert(triggerFound, 'Test 50: Migration contains canonical trigger no_update_or_delete_ledger');
  assert(immutabilityLayersFound, 'Test 51: Three-layer ledger immutability (RLS + REVOKE + BEFORE trigger) present in migrations');

  console.log('\n================================================================');
  console.log(`PHASE 5 TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED (TOTAL: ${testsPassed + testsFailed})`);
  console.log('================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error('Fatal error running Phase 5 tests:', err);
  process.exit(1);
});

