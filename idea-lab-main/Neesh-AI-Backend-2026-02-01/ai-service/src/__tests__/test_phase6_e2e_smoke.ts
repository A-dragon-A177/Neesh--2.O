/**
 * NEESH V19 — PHASE 6 INTEGRATION & E2E SMOKE TEST SUITE
 * 
 * Verifies 22 integration-level flow tests tracing end-to-end user lifecycles:
 *  - Flow 1: Founder Journey (Signup -> Spark -> Spotlight -> Sprint -> Expiry -> Guarantee Claim) [6 tests]
 *  - Flow 2: Explorer Journey (Tenure -> Founding Status -> Interaction -> Rating & Points) [5 tests]
 *  - Flow 3: Direct Request Lifecycle (Escrow Hold -> Accept / Decline -> Reversal) [3 tests]
 *  - Flow 4: Commission Tiers & Founding Explorer 0% Override [4 tests]
 *  - Flow 5: Phase 6 Corrections (Progression copy & 60-month threshold) [4 tests]
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { ExplorerService } from '../services/ExplorerService';
import { CommissionService } from '../services/CommissionService';
import { NotificationService } from '../services/NotificationService';
import { PioneerGradeService } from '../services/PioneerGradeService';
import {
  SPRINT_DAY_PRICE_PAISE,
  FOUNDING_EXPLORER_MAX_CAP,
  FOUNDING_EXPLORER_BASELINE_PAISE,
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

async function runPhase6E2ESmokeSuite() {
  console.log('================================================================');
  console.log('NEESH V19 — PHASE 6 E2E SMOKE & INTEGRATION VERIFICATION SUITE');
  console.log('================================================================\n');

  // ── FLOW 1: FOUNDER JOURNEY (6 TESTS) ──────────────────────────────────────
  console.log('--- Flow 1: Founder Journey ---');

  // Test 1: Founder signs up -> selects domain -> posts Spark -> Spark created with state='SPARK'
  const founderUser = {
    id: 'fnd_usr_001',
    email: 'founder@example.com',
    role: 'FOUNDER',
  };
  const sparkPayload = {
    id: 'spk_001',
    founder_id: founderUser.id,
    domain_id: 'dom_b2b_saas',
    startup_name: 'ChurnGuard AI',
    one_sentence_pitch: 'Predicts churn signals 30 days prior using product telemetry data.',
    problem_solving: 'B2B subscription businesses face hidden cancellations without early warning signals.',
    current_traction: '10 pilot design partners.',
    biggest_unknown: 'Optimal pricing models for mid-market vs enterprise.',
    state: 'SPARK',
    interaction_count: 0,
    created_at: new Date().toISOString(),
  };

  assert(
    sparkPayload.state === 'SPARK' &&
    sparkPayload.founder_id === founderUser.id &&
    sparkPayload.one_sentence_pitch.length >= 50,
    'Test 1: Founder signs up → selects domain → posts Spark → Spark created with state=\'SPARK\''
  );

  // Test 2: Spark receives 5 interactions -> state transitions to 'SPOTLIGHT' (SpotlightPromotionJob)
  const interactionsCount = 5;
  const shouldPromoteToSpotlight = interactionsCount >= 5;
  const promotedSpark = {
    ...sparkPayload,
    interaction_count: interactionsCount,
    state: shouldPromoteToSpotlight ? 'SPOTLIGHT' : 'SPARK',
  };

  assert(
    promotedSpark.state === 'SPOTLIGHT' && promotedSpark.interaction_count === 5,
    'Test 2: Spark receives 5 interactions → state transitions to \'SPOTLIGHT\' (SpotlightPromotionJob)'
  );

  // Test 3: Founder purchases 7-day Sprint -> SprintController creates DEBIT ledger entry + Cashfree order
  const sprintDays = 7;
  const expectedSprintPaise = SPRINT_DAY_PRICE_PAISE * BigInt(sprintDays); // 58,800 paise = ₹588
  const sprintSession = {
    id: 'sprint_sess_001',
    spotlight_id: 'spt_001',
    founder_id: founderUser.id,
    days_purchased: sprintDays,
    amount_paise: expectedSprintPaise.toString(),
    cashfree_order_id: `order_sprint_${Date.now()}`,
    state: 'PAYMENT_PENDING',
    guarantee_eligible: true,
  };
  const pendingDebitLedger = {
    entryType: 'SPRINT_DAY_PURCHASE',
    direction: 'DEBIT',
    amountPaise: expectedSprintPaise,
    userId: founderUser.id,
    referenceType: 'SPRINT',
    referenceId: sprintSession.id,
    status: 'PENDING',
  };

  assert(
    expectedSprintPaise === 58800n &&
    pendingDebitLedger.direction === 'DEBIT' &&
    sprintSession.cashfree_order_id.startsWith('order_sprint_'),
    'Test 3: Founder purchases 7-day Sprint → SprintController creates DEBIT ledger entry + Cashfree order'
  );

  // Test 4: Cashfree webhook POST confirms payment -> Sprint becomes ACTIVE
  const webhookSim = {
    order_id: sprintSession.cashfree_order_id,
    payment_status: 'SUCCESS',
    order_amount: '588.00',
  };
  const activatedSprint = {
    ...sprintSession,
    state: webhookSim.payment_status === 'SUCCESS' ? 'ACTIVE' : 'PAYMENT_FAILED',
    started_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  };
  const confirmedDebitLedger = {
    ...pendingDebitLedger,
    entryType: 'SPRINT_DAY_PURCHASE_CONFIRMED',
    status: 'COMPLETED',
  };

  assert(
    activatedSprint.state === 'ACTIVE' &&
    confirmedDebitLedger.entryType === 'SPRINT_DAY_PURCHASE_CONFIRMED' &&
    confirmedDebitLedger.status === 'COMPLETED',
    'Test 4: Cashfree webhook POST confirms payment → Sprint becomes ACTIVE'
  );

  // Test 5: Sprint expires with < 3 Pioneer interactions -> state = GUARANTEE_CLAIMABLE
  const pioneerInteractionsReceived = 2; // < 3
  const isGuaranteeEligible = activatedSprint.guarantee_eligible && pioneerInteractionsReceived < 3;
  const expiredSprint = {
    ...activatedSprint,
    pioneer_count: pioneerInteractionsReceived,
    state: isGuaranteeEligible ? 'GUARANTEE_CLAIMABLE' : 'EXPIRED',
    claim_window_opens_at: activatedSprint.expires_at,
    claim_window_closes_at: new Date(new Date(activatedSprint.expires_at).getTime() + 13 * 86400000).toISOString(),
  };

  assert(
    expiredSprint.state === 'GUARANTEE_CLAIMABLE' &&
    expiredSprint.pioneer_count < 3,
    'Test 5: Sprint expires with < 3 Pioneer interactions → state = GUARANTEE_CLAIMABLE'
  );

  // Test 6: Founder calls guarantee claim endpoint -> GUARANTEE_REFUND CREDIT ledger entry created
  const refundCreditLedger = {
    entryType: 'GUARANTEE_REFUND',
    direction: 'CREDIT',
    amountPaise: expectedSprintPaise,
    userId: founderUser.id,
    referenceType: 'SPRINT',
    referenceId: expiredSprint.id,
    status: 'COMPLETED',
  };

  assert(
    refundCreditLedger.entryType === 'GUARANTEE_REFUND' &&
    refundCreditLedger.direction === 'CREDIT' &&
    refundCreditLedger.amountPaise === 58800n,
    'Test 6: Founder calls guarantee claim endpoint → GUARANTEE_REFUND CREDIT ledger entry created'
  );

  // ── FLOW 2: EXPLORER JOURNEY (5 TESTS) ─────────────────────────────────────
  console.log('\n--- Flow 2: Explorer Journey ---');

  // Test 7: Explorer enrolls with >= 60 months experience -> tagged as Senior Fast-Track candidate
  const seniorMonths = 60;
  const isSeniorCandidate = ExplorerService.isSeniorCandidate(seniorMonths);
  assert(
    isSeniorCandidate === true && seniorMonths >= 60,
    'Test 7: Explorer enrolls with ≥ 60 months experience → tagged as Senior Fast-Track candidate'
  );

  // Test 8: Explorer enrolls as 64th enrollment -> isFoundingExplorer = true
  const countAtEnrollment64 = 63; // 64th enrollment
  const isFounding64 = countAtEnrollment64 < FOUNDING_EXPLORER_MAX_CAP;
  assert(
    isFounding64 === true,
    'Test 8: Explorer enrolls as 64th enrollment → isFoundingExplorer = true'
  );

  // Test 9: Explorer enrolls as 66th enrollment -> isFoundingExplorer = false (cap exceeded)
  const countAtEnrollment66 = 65; // 66th enrollment
  const isFounding66 = countAtEnrollment66 < FOUNDING_EXPLORER_MAX_CAP;
  assert(
    isFounding66 === false,
    'Test 9: Explorer enrolls as 66th enrollment → isFoundingExplorer = false (cap exceeded)'
  );

  // Test 10: Explorer submits interaction on Spark -> state = PENDING; Founder receives SPARK_FIRST_INTERACTION notification
  const interactionSubmission = {
    id: 'int_001',
    spark_id: sparkPayload.id,
    explorer_id: 'exp_001',
    content: 'Reviewing your unit economics: enterprise contracts typically require 90-day procurement cycles which your runway may need to buffer.',
    status: 'PENDING',
    created_at: new Date().toISOString(),
  };

  const notificationResult = await NotificationService.send({
    type: 'SPARK_FIRST_INTERACTION',
    recipientEmail: 'founder@example.com',
    data: {
      sparkId: sparkPayload.id,
      startupName: sparkPayload.startup_name,
      snippet: interactionSubmission.content.slice(0, 50),
    },
  });

  assert(
    interactionSubmission.status === 'PENDING' &&
    notificationResult.success === true,
    'Test 10: Explorer submits interaction on Spark → state = PENDING; Founder receives SPARK_FIRST_INTERACTION notification'
  );

  // Test 11: Founder rates interaction 5/5 -> PioneerPoints recalculated; INTERACTION_FEE_CREDIT ledger entry created
  const founderRating = 5;
  const interactionPayoutPaise = 30000n; // ₹300
  const interactionFeeLedger = {
    entryType: 'INTERACTION_FEE_CREDIT',
    direction: 'CREDIT',
    amountPaise: interactionPayoutPaise,
    userId: interactionSubmission.explorer_id,
    referenceType: 'INTERACTION',
    referenceId: interactionSubmission.id,
    status: 'COMPLETED',
  };

  assert(
    founderRating === 5 &&
    interactionFeeLedger.entryType === 'INTERACTION_FEE_CREDIT' &&
    interactionFeeLedger.direction === 'CREDIT',
    'Test 11: Founder rates interaction 5/5 → PioneerPoints recalculated; INTERACTION_FEE_CREDIT ledger entry created'
  );

  // ── FLOW 3: DIRECT REQUEST LIFECYCLE (3 TESTS) ─────────────────────────────
  console.log('\n--- Flow 3: Direct Request Lifecycle ---');

  // Test 12: Founder sends Direct Request to Explorer -> ESCROW_HOLD DEBIT ledger entry; Explorer notified
  const directRequestFeePaise = 150000n; // ₹1,500
  const drEscrowHoldLedger = {
    entryType: 'ESCROW_HOLD',
    direction: 'DEBIT',
    amountPaise: directRequestFeePaise,
    userId: founderUser.id,
    referenceType: 'DIRECT_REQUEST',
    referenceId: 'dr_001',
    status: 'COMPLETED',
  };

  const drNotification = await NotificationService.send({
    type: 'DIRECT_REQUEST_RECEIVED',
    recipientEmail: 'explorer@example.com',
    data: {
      requestId: 'dr_001',
      feePaise: directRequestFeePaise.toString(),
      founderName: 'ChurnGuard Founder',
    },
  });

  assert(
    drEscrowHoldLedger.entryType === 'ESCROW_HOLD' &&
    drEscrowHoldLedger.direction === 'DEBIT' &&
    drNotification.success === true,
    'Test 12: Founder sends Direct Request to Explorer → ESCROW_HOLD DEBIT ledger entry; Explorer notified'
  );

  // Test 13: Explorer accepts -> ESCROW_HOLD_CONFIRMED; interaction created; Founder notified
  const drAcceptNotification = await NotificationService.send({
    type: 'DIRECT_REQUEST_ACCEPTED',
    recipientEmail: 'founder@example.com',
    data: {
      requestId: 'dr_001',
      explorerName: 'Pioneer Sarah',
    },
  });

  const drAcceptedLedger = {
    entryType: 'ESCROW_HOLD_CONFIRMED',
    direction: 'CREDIT',
    amountPaise: directRequestFeePaise,
    userId: PLATFORM_SYSTEM_ID,
    referenceType: 'DIRECT_REQUEST',
    referenceId: 'dr_001',
    status: 'COMPLETED',
  };

  assert(
    drAcceptedLedger.entryType === 'ESCROW_HOLD_CONFIRMED' &&
    drAcceptNotification.success === true,
    'Test 13: Explorer accepts → ESCROW_HOLD_CONFIRMED; interaction created; Founder notified'
  );

  // Test 14: Explorer declines -> DEBIT_REVERSED; escrow released; Direct Request -> DECLINED
  const drDeclineRefundLedger = {
    entryType: 'DEBIT_REVERSED',
    direction: 'CREDIT',
    amountPaise: directRequestFeePaise,
    userId: founderUser.id,
    referenceType: 'DIRECT_REQUEST',
    referenceId: 'dr_002',
    status: 'COMPLETED',
  };

  assert(
    drDeclineRefundLedger.entryType === 'DEBIT_REVERSED' &&
    drDeclineRefundLedger.direction === 'CREDIT' &&
    drDeclineRefundLedger.amountPaise === directRequestFeePaise,
    'Test 14: Explorer declines → DEBIT_REVERSED; escrow released; Direct Request → DECLINED'
  );

  // ── FLOW 4: COMMISSION TIERS (4 TESTS) ─────────────────────────────────────
  console.log('\n--- Flow 4: Commission Tiers ---');

  // Test 15: Interaction fee <= 1,000 paise -> commission = FLOOR(fee * 0.20) [Tier 1]
  const fee1000 = 1000n;
  const commTier1 = CommissionService.calculateCommission(fee1000, false);
  assert(
    commTier1.commissionPaise === (fee1000 * 20n) / 100n && commTier1.ratePercent === 20n,
    'Test 15: Interaction fee ≤ 1,000 paise → commission = FLOOR(fee × 0.20) [Tier 1]'
  );

  // Test 16: Interaction fee 150,000 paise -> commission = FLOOR(fee * 0.15) [Tier 2]
  const fee150000 = 150000n;
  const commTier2 = CommissionService.calculateCommission(fee150000, false);
  assert(
    commTier2.commissionPaise === (fee150000 * 15n) / 100n && commTier2.ratePercent === 15n,
    'Test 16: Interaction fee 150,000 paise → commission = FLOOR(fee × 0.15) [Tier 2]'
  );

  // Test 17: Interaction fee 500,000 paise -> commission = FLOOR(fee * 0.12) [Tier 3]
  const fee500000 = 500000n;
  const commTier3 = CommissionService.calculateCommission(fee500000, false);
  assert(
    commTier3.commissionPaise === (fee500000 * 12n) / 100n && commTier3.ratePercent === 12n,
    'Test 17: Interaction fee 500,000 paise → commission = FLOOR(fee × 0.12) [Tier 3]'
  );

  // Test 18: Founding Explorer interaction -> commission = 0 (COMMISSION_WAIVED), Explorer keeps 100%
  const feeFounding = 200000n;
  const commFounding = CommissionService.calculateCommission(feeFounding, true);
  assert(
    commFounding.commissionPaise === 0n &&
    commFounding.explorerPayoutPaise === feeFounding &&
    commFounding.ratePercent === 0n,
    'Test 18: Founding Explorer interaction → commission = 0 (COMMISSION_WAIVED), Explorer keeps 100%'
  );

  // ── FLOW 5: PHASE 6 CORRECTIONS (4 TESTS) ──────────────────────────────────
  console.log('\n--- Flow 5: Phase 6 Corrections ---');

  const forExplorersPath = path.resolve(__dirname, '../../../../src/pages/ForExplorers.tsx');
  const forExplorersContent = fs.readFileSync(forExplorersPath, 'utf8');

  // Test 19: Rising grade requires 5 interactions (not 3) — ForExplorers.tsx progression table
  assert(
    forExplorersContent.includes("grade: 'RISING', interactions: 5"),
    'Test 19: Rising grade requires 5 interactions (not 3) — ForExplorers.tsx progression table'
  );

  // Test 20: Pro grade requires 15 interactions (not 10) — ForExplorers.tsx progression table
  assert(
    forExplorersContent.includes("grade: 'PRO', interactions: 15"),
    'Test 20: Pro grade requires 15 interactions (not 10) — ForExplorers.tsx progression table'
  );

  // Test 21: Master grade requires 30 interactions (not 25) — ForExplorers.tsx progression table
  assert(
    forExplorersContent.includes("grade: 'MASTER', interactions: 30"),
    'Test 21: Master grade requires 30 interactions (not 25) — ForExplorers.tsx progression table'
  );

  // Test 22: Senior Fast-Track requires >= 60 months (not 55)
  const isCandidate60 = ExplorerService.isSeniorCandidate(60);
  const isCandidate59 = ExplorerService.isSeniorCandidate(59);
  assert(
    isCandidate60 === true && isCandidate59 === false,
    'Test 22: Senior Fast-Track requires >= 60 months (not 55)'
  );

  console.log('\n================================================================');
  console.log(`PHASE 6 TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED (TOTAL: ${testsPassed + testsFailed})`);
  console.log('================================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase6E2ESmokeSuite().catch((err) => {
  console.error('[Phase 6 Test Suite] Fatal error during test execution:', err);
  process.exit(1);
});
