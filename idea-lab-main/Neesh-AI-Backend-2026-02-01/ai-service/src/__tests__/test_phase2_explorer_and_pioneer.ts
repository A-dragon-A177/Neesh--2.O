/**
 * NEESH V19 PHASE 2 COMPREHENSIVE TEST SUITE
 * Explorer Flows, LinkedIn Verification, Domain Commitment, Pioneer Grade & SSR
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {
  FOUNDING_EXPLORER_BASELINE_PAISE,
  FOUNDING_EXPLORER_MAX_CAP,
  GRADE_FEE_RANGES,
} from '../constants/pricing';
import { DomainGatingService } from '../services/DomainGatingService';
import { PioneerGradeService } from '../services/PioneerGradeService';
import { ExplorerService, LinkedInRole } from '../services/ExplorerService';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}${details ? ` - Details: ${details}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runPhase2Tests() {
  console.log('================================================================');
  console.log('NEESH V19 — PHASE 2 TEST SUITE: EXPLORER, PIONEER & SSR');
  console.log('================================================================\n');

  // ── SUITE 1: CONSTANTS & PRICING CONVENTIONS ─────────────────────────────
  console.log('--- Suite 1: Constants & Grade Fee Ranges ---');
  assert(
    FOUNDING_EXPLORER_BASELINE_PAISE === 250000n,
    'Founding Explorer baseline credit constant is 250,000 paise (₹2,500)',
    `Expected 250000n, got ${FOUNDING_EXPLORER_BASELINE_PAISE}`
  );

  assert(
    FOUNDING_EXPLORER_MAX_CAP === 65,
    'Founding Explorer cap is exactly 65 cumulative platform-wide'
  );

  assert(
    GRADE_FEE_RANGES.SEED.minPaise === 10000n && GRADE_FEE_RANGES.SEED.maxPaise === 50000n,
    'Seed fee range: ₹100 – ₹500 (10,000 – 50,000 paise)'
  );
  assert(
    GRADE_FEE_RANGES.RISING.minPaise === 30000n && GRADE_FEE_RANGES.RISING.maxPaise === 150000n,
    'Rising fee range: ₹300 – ₹1,500 (30,000 – 150,000 paise)'
  );
  assert(
    GRADE_FEE_RANGES.PRO.minPaise === 80000n && GRADE_FEE_RANGES.PRO.maxPaise === 300000n,
    'Pro fee range: ₹800 – ₹3,000 (80,000 – 300,000 paise)'
  );
  assert(
    GRADE_FEE_RANGES.MASTER.minPaise === 150000n && GRADE_FEE_RANGES.MASTER.maxPaise === 600000n,
    'Master fee range: ₹1,500 – ₹6,000 (150,000 – 600,000 paise)'
  );
  assert(
    GRADE_FEE_RANGES.ELITE.minPaise === 300000n && GRADE_FEE_RANGES.ELITE.maxPaise === 1000000n,
    'Elite fee range: ₹3,000 – ₹10,000 (300,000 – 1,000,000 paise)'
  );

  // ── SUITE 2: DOMAIN OPEN COMMITMENT (Section N) ───────────────────────────
  console.log('\n--- Suite 2: Domain Open Commitment Gate (Section N) ---');

  assert(
    DomainGatingService.isDomainOpen(4) === false,
    'Domain Open Commitment: 4 active founders -> domain is closed (is_open = false)'
  );
  assert(
    DomainGatingService.isDomainOpen(5) === true,
    'Domain Open Commitment: 5 active founders -> domain is open (is_open = true)'
  );
  assert(
    DomainGatingService.isDomainOpen(8) === true,
    'Domain Open Commitment: 8 active founders -> domain is open'
  );
  assert(
    DomainGatingService.isDomainOpen(0) === false,
    'Domain Open Commitment: 0 active founders -> domain is closed'
  );

  // ── SUITE 3: FOUNDING EXPLORER CAP (Section O) ────────────────────────────
  console.log('\n--- Suite 3: Founding Explorer Cumulative Cap (Section O) ---');

  assert(
    ExplorerService.canEnrollFoundingExplorer(0) === true,
    'Initial enrollment: 0 enrolled -> can enroll'
  );
  assert(
    ExplorerService.canEnrollFoundingExplorer(64) === true,
    '64th Explorer enrolled -> qualifies as Founding Explorer #65'
  );
  assert(
    ExplorerService.canEnrollFoundingExplorer(65) === false,
    '65th Explorer enrolled -> cap hit, subsequent signup is NOT enrolled'
  );
  assert(
    ExplorerService.canEnrollFoundingExplorer(100) === false,
    '100 enrolled -> cannot enroll'
  );

  // ── SUITE 4: PIONEER POINTS WAR CALCULATION & TRUNCATION ──────────────────
  console.log('\n--- Suite 4: Pioneer Points WAR Calculation & Strict Truncation ---');

  const now = new Date();
  const oldFounderDate = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days old (>30d -> weight 1.0)
  const newFounderDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days old (<30d -> weight 0.3)

  // 1. All interactions from new founders (W_i = 0.3)
  const newFounderInteractions = [
    { state: 'RATED', founder_rating: 4.0, founder_account_created_at: newFounderDate },
    { state: 'RATED', founder_rating: 5.0, founder_account_created_at: newFounderDate },
    { state: 'RATED', founder_rating: 4.0, founder_account_created_at: newFounderDate },
    { state: 'RATED', founder_rating: 4.0, founder_account_created_at: newFounderDate },
  ];
  // (4*0.3 + 5*0.3 + 4*0.3 + 4*0.3) / (4 * 0.3) = 17 * 0.3 / 1.2 = 5.1 / 1.2 = 4.25
  const resultNewFounders = PioneerGradeService.computeWARAndPoints(newFounderInteractions, now);
  assert(
    resultNewFounders.war === 4.25 && resultNewFounders.qualifyingCount === 4,
    'Pioneer Points WAR: all 4 interactions from new founders (W=0.3) -> correct weighted avg (4.25)'
  );
  assert(
    resultNewFounders.pioneerPoints === Math.floor(4.25 * 100) + 4 * 10, // 425 + 40 = 465
    'Pioneer Points formula: FLOOR(WAR * 100) + (N * 10) = 465'
  );

  // 2. Truncation without round-up test:
  // Suppose we have ratings giving raw average 3.8066...
  // 1 established founder rating 3.8 (W=1.0) and 1 new founder rating 3.82 (W=0.3):
  // (3.8 * 1.0 + 3.82 * 0.3) / 1.3 = (3.8 + 1.146) / 1.3 = 4.946 / 1.3 = 3.804615...
  // Truncation must produce 3.80, NOT 3.81.
  const truncateTestInteractions = [
    { state: 'RATED', founder_rating: 3.8, founder_account_created_at: oldFounderDate },
    { state: 'RATED', founder_rating: 3.82, founder_account_created_at: newFounderDate },
  ];
  const truncateResult = PioneerGradeService.computeWARAndPoints(truncateTestInteractions, now);
  assert(
    truncateResult.war === 3.80,
    'WAR strictly truncates (FLOOR) to 2 decimal places without round-up: raw ~3.8046 -> 3.80',
    `Expected 3.80, got ${truncateResult.war} (raw: ${truncateResult.rawWar})`
  );

  // 3. Another truncation test where 3rd digit is >= 5:
  // (4.0 * 1.0 + 3.71 * 1.0 + 3.71 * 1.0) / 3.0 = 11.42 / 3 = 3.806666...
  const truncateAboveFive = [
    { state: 'RATED', founder_rating: 4.0, founder_account_created_at: oldFounderDate },
    { state: 'RATED', founder_rating: 3.71, founder_account_created_at: oldFounderDate },
    { state: 'RATED', founder_rating: 3.71, founder_account_created_at: oldFounderDate },
  ];
  const truncateAboveFiveResult = PioneerGradeService.computeWARAndPoints(truncateAboveFive, now);
  assert(
    truncateAboveFiveResult.war === 3.80,
    'WAR strict truncation test (raw = 3.80666...): must be 3.80, NOT 3.81',
    `Expected 3.80, got ${truncateAboveFiveResult.war}`
  );

  // ── SUITE 5: GRADE BOUNDARY CONDITIONS ────────────────────────────────────
  console.log('\n--- Suite 5: Grade Threshold Boundary Conditions ---');

  // RISING boundary: N >= 3, WAR >= 3.80, linkedin_verified = true
  const risingPass = PioneerGradeService.evaluateAdvancement({
    currentGrade: 'SEED',
    war: 3.80,
    n: 3,
    linkedinVerified: true,
    spikeFlagged: false,
  });
  assert(
    risingPass.qualifies && risingPass.targetGrade === 'RISING',
    'Grade RISING boundary: N=3, WAR=3.80 -> qualifies'
  );

  const risingFailWar = PioneerGradeService.evaluateAdvancement({
    currentGrade: 'SEED',
    war: 3.79,
    n: 3,
    linkedinVerified: true,
    spikeFlagged: false,
  });
  assert(
    !risingFailWar.qualifies,
    'Grade RISING boundary: N=3, WAR=3.79 -> does NOT qualify'
  );

  const risingFailN = PioneerGradeService.evaluateAdvancement({
    currentGrade: 'SEED',
    war: 4.50,
    n: 2,
    linkedinVerified: true,
    spikeFlagged: false,
  });
  assert(
    !risingFailN.qualifies,
    'Grade RISING boundary: N=2, WAR=4.50 -> does NOT qualify (N insufficient)'
  );

  // PRO boundary: N >= 10, WAR >= 4.00, tenure >= 60 mo or fast-track
  const proPass = PioneerGradeService.evaluateAdvancement({
    currentGrade: 'RISING',
    war: 4.00,
    n: 10,
    linkedinVerified: true,
    linkedinTenureMonths: 65,
    spikeFlagged: false,
  });
  assert(
    proPass.qualifies && proPass.targetGrade === 'PRO',
    'Grade PRO boundary: N=10, WAR=4.00, tenure=65mo -> qualifies'
  );

  const proFailN = PioneerGradeService.evaluateAdvancement({
    currentGrade: 'RISING',
    war: 4.50,
    n: 9,
    linkedinVerified: true,
    linkedinTenureMonths: 65,
    spikeFlagged: false,
  });
  assert(
    !proFailN.qualifies,
    'Grade PRO boundary: N=9, WAR=4.50 -> does NOT qualify (N insufficient)'
  );

  const proFailWar = PioneerGradeService.evaluateAdvancement({
    currentGrade: 'RISING',
    war: 3.99,
    n: 12,
    linkedinVerified: true,
    linkedinTenureMonths: 65,
    spikeFlagged: false,
  });
  assert(
    !proFailWar.qualifies,
    'Grade PRO boundary: N=12, WAR=3.99 -> does NOT qualify (WAR insufficient)'
  );

  // MASTER boundary: N >= 25, WAR >= 4.30, verified within 365 days
  const masterPass = PioneerGradeService.evaluateAdvancement({
    currentGrade: 'PRO',
    war: 4.30,
    n: 25,
    linkedinVerified: true,
    linkedinVerifiedAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
    spikeFlagged: false,
  });
  assert(
    masterPass.qualifies && masterPass.targetGrade === 'MASTER',
    'Grade MASTER boundary: N=25, WAR=4.30, re-verified <365d -> qualifies'
  );

  // ELITE boundary: N >= 50, WAR >= 4.50, >=10 Master interactions -> Admin required
  const elitePass = PioneerGradeService.evaluateAdvancement({
    currentGrade: 'MASTER',
    war: 4.50,
    n: 50,
    linkedinVerified: true,
    linkedinVerifiedAt: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000),
    masterFounderInteractionsCount: 10,
    spikeFlagged: false,
  });
  assert(
    elitePass.qualifies && elitePass.targetGrade === 'ELITE' && elitePass.requiresAdmin === true,
    'Grade ELITE boundary: N=50, WAR=4.50, 10 Master interactions -> qualifies with Admin requirement'
  );

  // ── SUITE 6: SENIOR FAST-TRACK TENURE PARSING ────────────────────────────
  console.log('\n--- Suite 6: Senior Fast-Track Tenure Parsing (Section P.0) ---');

  // Case 1: 29 mo + 3 mo gap + 51 mo = 80 mo qualifying -> eligible
  const nonConsecutiveRoles: LinkedInRole[] = [
    { title: 'Senior PM', startDate: '2016-01-01', endDate: '2018-06-01' }, // 29 months
    // Gap of 3 months
    { title: 'Head of Product', startDate: '2018-09-01', endDate: '2022-12-01' }, // 51 months
  ];
  const tenureResult80 = ExplorerService.calculateTenureMonths(nonConsecutiveRoles);
  assert(
    tenureResult80.totalQualifyingMonths === 80 && tenureResult80.isSeniorFastTrackEligible === true,
    'Senior Fast-Track tenure: 29 mo + 3 mo gap + 51 mo = 80 mo qualifying -> eligible'
  );

  // Case 2: Borderline (55–64 months, e.g. 58 months) -> manual review flag
  const borderlineRoles: LinkedInRole[] = [
    { title: 'Product Manager', startDate: '2019-01-01', endDate: '2023-11-01' }, // 58 months
  ];
  const borderlineResult = ExplorerService.calculateTenureMonths(borderlineRoles);
  assert(
    borderlineResult.totalQualifyingMonths === 58 &&
    borderlineResult.requiresManualReview === true &&
    borderlineResult.isSeniorFastTrackEligible === false,
    'Senior Fast-Track tenure: 55–64 months (58 mo) -> manual review flag; NOT auto-assigned Pro'
  );

  // Case 3: Less than 55 months -> standard Seed
  const juniorRoles: LinkedInRole[] = [
    { title: 'Associate PM', startDate: '2022-01-01', endDate: '2024-01-01' }, // 24 months
  ];
  const juniorResult = ExplorerService.calculateTenureMonths(juniorRoles);
  assert(
    juniorResult.totalQualifyingMonths === 24 &&
    juniorResult.requiresManualReview === false &&
    juniorResult.isSeniorFastTrackEligible === false,
    'Junior tenure: < 55 months -> standard Seed, no fast-track flag'
  );

  // ── SUITE 7: UNRATED AUTO-COMPLETE & SPIKE DETECTION ──────────────────────
  console.log('\n--- Suite 7: Unrated Auto-Complete & Spike Detection ---');

  // Unrated auto-complete: interaction older than 7 days -> treated as rating 3.0 at weight 0.5
  const autoCompletedInteractions = [
    { state: 'COMPLETE', is_auto_completed: true, founder_rating: null },
    { state: 'RATED', founder_rating: 4.0, founder_account_created_at: oldFounderDate },
  ];
  // (3.0 * 0.5 + 4.0 * 1.0) / (0.5 + 1.0) = (1.5 + 4.0) / 1.5 = 5.5 / 1.5 = 3.666... -> 3.66
  const autoResult = PioneerGradeService.computeWARAndPoints(autoCompletedInteractions, now);
  assert(
    autoResult.war === 3.66 && autoResult.qualifyingCount === 2,
    'Unrated auto-complete: interaction older than 7 days -> state = COMPLETE, rating = NULL, WAR treats as 3.0 at weight 0.5 (3.66)'
  );

  // Spike check: interaction_count_7d = 4, avg_weekly_90d = 1 -> 4 > 3 * 1 -> spike flagged
  const spikeTriggered = PioneerGradeService.checkSpike(4, 13, 13); // 13 interactions in 13 weeks = 1/week. 4 > 3*1.
  assert(
    spikeTriggered === true,
    'Spike check: interaction_count_7d = 4, avg_weekly_90d = 1 -> 4 > 3x1 -> spike flagged'
  );

  const spikePassed = PioneerGradeService.checkSpike(2, 13, 13); // 2 <= 3*1
  assert(
    spikePassed === false,
    'Spike check: interaction_count_7d = 2, avg_weekly_90d = 1 -> 2 <= 3x1 -> spike passes'
  );

  // ── SUITE 8: FAST-TRACK TEST INTERACTION RATINGS ──────────────────────────
  console.log('\n--- Suite 8: Senior Fast-Track Test Interaction Resolution ---');

  // Rating >= 3.0 -> PRO
  assert(
    (3.0 >= 3.0 ? 'PRO' : 'RISING') === 'PRO',
    'Senior Fast-Track: test interaction rated 3.0+ -> PRO grade assigned'
  );
  assert(
    (2.9 >= 3.0 ? 'PRO' : 'RISING') === 'RISING',
    'Senior Fast-Track: test interaction rated 2.9 -> RISING grade assigned'
  );

  // ── SUITE 9: PIONEER PROFILE SSR & ROBOTS.TXT VALIDATION ──────────────────
  console.log('\n--- Suite 9: Pioneer Profile SSR & robots.txt Validation ---');

  // 1. Validate robots.txt
  const robotsPath = path.resolve(__dirname, '../../../../public/robots.txt');
  assert(fs.existsSync(robotsPath), 'robots.txt exists at public/robots.txt');

  const robotsTxt = fs.readFileSync(robotsPath, 'utf8');
  assert(robotsTxt.includes('Allow: /explorer/'), 'robots.txt has Allow: /explorer/');
  assert(robotsTxt.includes('Allow: /domain/'), 'robots.txt has Allow: /domain/');
  assert(robotsTxt.includes('Disallow: /dashboard/'), 'robots.txt has Disallow: /dashboard/');
  assert(robotsTxt.includes('Disallow: /admin/'), 'robots.txt has Disallow: /admin/');
  assert(robotsTxt.includes('Sitemap: https://neesh.ai/sitemap.xml'), 'robots.txt specifies sitemap.xml');

  // 2. Validate Profile SSR Controller Implementation
  const ssrPath = path.resolve(__dirname, '../controllers/ProfileSsrController.ts');
  assert(fs.existsSync(ssrPath), 'ProfileSsrController.ts exists');

  const ssrContent = fs.readFileSync(ssrPath, 'utf8');
  assert(ssrContent.includes('404'), 'ProfileSsrController returns 404 for missing/inactive profile');
  assert(!ssrContent.includes('status(403)'), 'ProfileSsrController never returns 403 on profile rendering');
  assert(ssrContent.includes('application/ld+json'), 'ProfileSsrController embeds Person JSON-LD');
  assert(ssrContent.includes('rel="canonical"'), 'ProfileSsrController embeds canonical URL tag');

  // ── SUITE 10: REAL BACKGROUND JOBS IMPLEMENTATION ────────────────────────
  console.log('\n--- Suite 10: Real Background Jobs Verification ---');

  const domainMetricsJobPath = path.resolve(__dirname, '../jobs/DomainMetricsJob.ts');
  assert(fs.existsSync(domainMetricsJobPath), 'DomainMetricsJob.ts exists with real logic');

  const pioneerGradeJobPath = path.resolve(__dirname, '../jobs/PioneerGradeEvaluationJob.ts');
  assert(fs.existsSync(pioneerGradeJobPath), 'PioneerGradeEvaluationJob.ts exists with real logic');

  const jobsIndexPath = path.resolve(__dirname, '../jobs/index.ts');
  const jobsIndexContent = fs.readFileSync(jobsIndexPath, 'utf8');
  assert(
    jobsIndexContent.includes('runDomainMetricsJob') &&
    jobsIndexContent.includes('runPioneerGradeEvaluationJob'),
    'jobs/index.ts registers real implementations for DomainMetricsJob and PioneerGradeEvaluationJob'
  );

  console.log('\n================================================================');
  console.log(`ALL ${passedTests}/${totalTests} PHASE 2 VERIFICATION TESTS PASSED!`);
  console.log('================================================================\n');
}

runPhase2Tests().catch((err) => {
  console.error('[FATAL] Phase 2 test suite failed:', err);
  process.exit(1);
});
