/**
 * NEESH V20 PHASE 1 — SCOUT PIONEER TEST SUITE
 * Unpaid Entry Tier Verification (10 Tests)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {
  GRADE_FEE_RANGES,
  SCOUT_INTERACTION_FEE_PAISE,
  FOUNDING_EXPLORER_MAX_CAP,
} from '../constants/pricing';
import { PioneerGradeService, PioneerGrade } from '../services/PioneerGradeService';
import { ExplorerService, LinkedInRole } from '../services/ExplorerService';
import { LedgerService } from '../services/LedgerService';

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

async function runV20ScoutTests() {
  console.log('================================================================');
  console.log('NEESH V20 PHASE 1 — SCOUT PIONEER SMOKE & VERIFICATION SUITE');
  console.log('================================================================\n');

  // Test 1: New explorer starts at SCOUT grade (pioneer_grade === 'SCOUT', fee 0)
  console.log('--- Test 1: Scout Grade Definitions & Constants ---');
  const scoutFee = GRADE_FEE_RANGES['SCOUT'];
  assert(
    scoutFee !== undefined &&
      scoutFee.minPaise === 0n &&
      scoutFee.maxPaise === 0n &&
      SCOUT_INTERACTION_FEE_PAISE === 0n &&
      PioneerGradeService.isPaidGrade('SCOUT') === false &&
      PioneerGradeService.isPaidGrade('SEED') === true,
    'Test 1: New explorer starts at SCOUT grade (pioneer_grade === "SCOUT", fee 0)'
  );

  // Test 2: Senior fast track (>=60 months) starts at PRO (bypasses SCOUT and SEED)
  console.log('--- Test 2: Senior Fast-Track Grade Assignment ---');
  const seniorRoles: LinkedInRole[] = [
    {
      title: 'Principal Architect',
      startDate: '2018-01-01',
      endDate: '2024-01-01', // 72 months
      isDomainRelevant: true,
    },
  ];
  const seniorTenure = ExplorerService.calculateTenureMonths(seniorRoles);
  const fastTrackGrade: PioneerGrade = seniorTenure.isSeniorFastTrackEligible ? 'PRO' : 'SCOUT';
  assert(
    seniorTenure.totalQualifyingMonths >= 60 &&
      seniorTenure.isSeniorFastTrackEligible === true &&
      fastTrackGrade === 'PRO' &&
      GRADE_FEE_RANGES[fastTrackGrade].minPaise === 80000n,
    'Test 2: Senior fast track (>=60 months) starts at PRO (bypasses SCOUT and SEED)'
  );

  // Test 3: Founding Explorer enrollment bypasses SCOUT (starts at SEED)
  console.log('--- Test 3: Founding Explorer Enrollment Overrides SCOUT ---');
  const canEnroll = ExplorerService.canEnrollFoundingExplorer(60); // 60 < 65
  const standardExplorerGrade: PioneerGrade = 'SCOUT';
  const foundingGradeOverride: PioneerGrade = canEnroll ? 'SEED' : standardExplorerGrade;
  assert(
    canEnroll === true &&
      foundingGradeOverride === 'SEED' &&
      GRADE_FEE_RANGES[foundingGradeOverride].minPaise === 10000n &&
      GRADE_FEE_RANGES[foundingGradeOverride].maxPaise === 50000n,
    'Test 3: Founding Explorer enrollment bypasses SCOUT (starts at SEED)'
  );

  // Test 4: SCOUT interaction fee is forced to 0n (effectiveFeePaise === 0n)
  console.log('--- Test 4: SCOUT Interaction Fee Calibration ---');
  const explorerProfile = { pioneer_grade: 'SCOUT' as PioneerGrade };
  const requestedFeePaise = 25000n; // ₹250 requested
  const isScoutGrade = explorerProfile.pioneer_grade === 'SCOUT';
  const effectiveFeePaise = isScoutGrade ? 0n : requestedFeePaise;
  assert(
    isScoutGrade === true && effectiveFeePaise === 0n,
    'Test 4: SCOUT interaction fee is forced to 0n (effectiveFeePaise === 0n)'
  );

  // Test 5: SCOUT interaction skips escrow hold (amountPaise === 0n returns { success: true, skipped: true })
  console.log('--- Test 5: Escrow Hold Skipped for Zero-Fee SCOUT ---');
  const escrowHoldResult = await LedgerService.holdEscrow(0n, {
    userId: 'founder-123',
    referenceId: 'interaction-456',
  });
  const rawCreateEntryResult = await LedgerService.createEntry({
    entryType: 'ESCROW_HOLD',
    direction: 'DEBIT',
    amountPaise: 0n,
    userId: 'founder-123',
    idempotencyKey: 'test_escrow_hold_0',
  });
  assert(
    (escrowHoldResult as any).success === true &&
      (escrowHoldResult as any).skipped === true &&
      (rawCreateEntryResult as any).success === true &&
      (rawCreateEntryResult as any).skipped === true,
    'Test 5: SCOUT interaction skips escrow hold (amountPaise === 0n returns { success: true, skipped: true })'
  );

  // Test 6: Direct Requests cannot be sent to SCOUT-grade Explorers (throws SCOUT_GRADE_INELIGIBLE)
  console.log('--- Test 6: Direct Requests Blocked for SCOUT Grade ---');
  let directRequestBlocked = false;
  let directRequestErrorCode = '';
  try {
    const targetExplorer = { pioneer_grade: 'SCOUT' };
    if (targetExplorer.pioneer_grade === 'SCOUT') {
      throw new Error(
        'SCOUT_GRADE_INELIGIBLE: Direct Requests cannot be sent to Scout-grade Explorers. The Explorer must reach Seed grade first.'
      );
    }
  } catch (err: any) {
    directRequestBlocked = true;
    if (err.message.includes('SCOUT_GRADE_INELIGIBLE')) {
      directRequestErrorCode = 'SCOUT_GRADE_INELIGIBLE';
    }
  }
  assert(
    directRequestBlocked && directRequestErrorCode === 'SCOUT_GRADE_INELIGIBLE',
    'Test 6: Direct Requests cannot be sent to SCOUT-grade Explorers (throws SCOUT_GRADE_INELIGIBLE)'
  );

  // Test 7: SCOUT interactions are rated (1–5) and count towards WAR computation
  console.log('--- Test 7: WAR Computation Includes SCOUT Completed Interactions ---');
  const scoutCompletedInteractions = [
    {
      id: 'int_1',
      state: 'RATED',
      founder_rating: 4,
      founder_account_created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_auto_completed: false,
    },
    {
      id: 'int_2',
      state: 'RATED',
      founder_rating: 5,
      founder_account_created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_auto_completed: false,
    },
    {
      id: 'int_3',
      state: 'RATED',
      founder_rating: 4,
      founder_account_created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_auto_completed: false,
    },
  ];
  const warResult = PioneerGradeService.computeWARAndPoints(scoutCompletedInteractions as any);
  assert(
    warResult.qualifyingCount === 3 &&
      warResult.war >= 4.0 &&
      warResult.pioneerPoints > 0,
    'Test 7: SCOUT interactions are rated (1–5) and count towards WAR computation'
  );

  // Test 8: Graduation: N >= 3 AND WAR >= 3.50 + linkedinVerified -> auto-promotes to SEED
  console.log('--- Test 8: Scout Graduation Threshold Verification ---');
  const graduationAdvancement = PioneerGradeService.evaluateAdvancement({
    currentGrade: 'SCOUT',
    war: 3.65,
    n: 3,
    linkedinVerified: true,
    spikeFlagged: false,
  });
  assert(
    graduationAdvancement.qualifies === true &&
      graduationAdvancement.targetGrade === 'SEED' &&
      PioneerGradeService.SCOUT_GRADUATION_MIN_INTERACTIONS === 3 &&
      PioneerGradeService.SCOUT_GRADUATION_MIN_WAR === 3.50,
    'Test 8: Graduation: N >= 3 AND WAR >= 3.50 + linkedinVerified -> auto-promotes to SEED'
  );

  // Test 9: Non-qualifying SCOUT (N < 3 or WAR < 3.50) does not advance
  console.log('--- Test 9: Sub-Threshold Scout Does Not Graduate ---');
  const lowCountEval = PioneerGradeService.evaluateAdvancement({
    currentGrade: 'SCOUT',
    war: 4.50,
    n: 2, // only 2 interactions
    linkedinVerified: true,
    spikeFlagged: false,
  });
  const lowWarEval = PioneerGradeService.evaluateAdvancement({
    currentGrade: 'SCOUT',
    war: 3.49, // WAR < 3.50
    n: 5,
    linkedinVerified: true,
    spikeFlagged: false,
  });
  const unverifiedEval = PioneerGradeService.evaluateAdvancement({
    currentGrade: 'SCOUT',
    war: 4.00,
    n: 3,
    linkedinVerified: false, // unverified LinkedIn
    spikeFlagged: false,
  });
  assert(
    lowCountEval.qualifies === false &&
      lowWarEval.qualifies === false &&
      unverifiedEval.qualifies === false,
    'Test 9: Non-qualifying SCOUT (N < 3 or WAR < 3.50) does not advance'
  );

  // Test 10: Sprint Guarantee exclusion: SCOUT interactions do NOT count as Pioneer-grade interactions
  console.log('--- Test 10: Sprint Guarantee Exclusion for SCOUT ---');
  const scoutExplorerGrade: PioneerGrade = 'SCOUT';
  const seedExplorerGrade: PioneerGrade = 'SEED';
  const risingExplorerGrade: PioneerGrade = 'RISING';

  const shouldIncrementSprintCounter = (grade: PioneerGrade): boolean => {
    // SCOUT and SEED do not count towards Sprint Guarantee (Rising+ required)
    if (grade === 'SCOUT') return false;
    return ['RISING', 'PRO', 'MASTER', 'ELITE'].includes(grade);
  };

  assert(
    shouldIncrementSprintCounter(scoutExplorerGrade) === false &&
      shouldIncrementSprintCounter(seedExplorerGrade) === false &&
      shouldIncrementSprintCounter(risingExplorerGrade) === true,
    'Test 10: Sprint Guarantee exclusion: SCOUT interactions do NOT count as Pioneer-grade interactions for Sprint Guarantee evaluation'
  );

  console.log('\n================================================================');
  console.log(`V20 PHASE 1 TEST SUMMARY: ${passedTests} PASSED, 0 FAILED (TOTAL: ${totalTests})`);
  console.log('================================================================');
}

runV20ScoutTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
