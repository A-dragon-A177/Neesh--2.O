-- ============================================================================
-- NEESH V19 MASTER SCHEMA MIGRATION
-- Reference: NEESH_V19_MASTER_PRD.md (Sections X.1, X.2, X.3, X.4, AT, W.5)
--
-- Corrections Applied:
-- 1. explorer_profiles.fee_min_paise, fee_max_paise -> BIGINT NOT NULL
-- 2. founding_explorer_registrations.baseline_credit_amount_paise -> BIGINT NOT NULL
-- 3. Two critical webhook performance indexes:
--    - idx_sprint_sessions_cashfree_order_id
--    - idx_direct_requests_cashfree_order_id
-- 4. Single canonical trigger name: no_update_or_delete_ledger
-- 5. Three-layer defense-in-depth immutability for ledger_entries
-- ============================================================================

-- Ensure auth.users has role in user_metadata or profiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. domains
CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  active_sprint_founder_count INT DEFAULT 0,
  explorer_signup_open BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. explorer_profiles (Correction A: fee_min_paise & fee_max_paise are BIGINT NOT NULL)
CREATE TABLE IF NOT EXISTS explorer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  username VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL DEFAULT '',
  domain_id UUID REFERENCES domains(id),
  pioneer_grade VARCHAR(20) NOT NULL DEFAULT 'SEED',
  pioneer_points INT DEFAULT 0,
  verified_interaction_count INT DEFAULT 0,
  avg_founder_rating DECIMAL(3,2) DEFAULT 0.00,
  linkedin_profile_url TEXT,
  linkedin_verified BOOLEAN DEFAULT false,
  linkedin_verified_at TIMESTAMPTZ,
  linkedin_domain_tenure_years DECIMAL(4,1),
  linkedin_tenure_months INT,
  is_founding_explorer BOOLEAN DEFAULT false,
  founding_explorer_enrolled_at TIMESTAMPTZ,
  commission_free_until TIMESTAMPTZ,
  senior_fast_track BOOLEAN DEFAULT false,
  fee_min_paise BIGINT NOT NULL DEFAULT 10000,
  fee_max_paise BIGINT NOT NULL DEFAULT 300000,
  bio TEXT,
  show_employer_name BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. sparks
CREATE TABLE IF NOT EXISTS sparks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES auth.users(id),
  domain_id UUID NOT NULL REFERENCES domains(id),
  startup_name VARCHAR(100) NOT NULL,
  one_sentence_pitch TEXT NOT NULL,
  problem_solving TEXT NOT NULL,
  current_traction TEXT NOT NULL,
  biggest_unknown TEXT NOT NULL,
  state VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  interaction_count INT DEFAULT 0,
  ignition_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. spotlights
CREATE TABLE IF NOT EXISTS spotlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spark_id UUID NOT NULL REFERENCES sparks(id),
  founder_id UUID NOT NULL REFERENCES auth.users(id),
  domain_id UUID NOT NULL REFERENCES domains(id),
  elevator_pitch_text TEXT,
  elevator_pitch_video_url TEXT,
  pitch_deck_url TEXT,
  key_metrics TEXT,
  image_urls TEXT[],
  state VARCHAR(20) NOT NULL DEFAULT 'CREATED',
  free_period_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. pioneer_grade_history
CREATE TABLE IF NOT EXISTS pioneer_grade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  explorer_id UUID NOT NULL REFERENCES explorer_profiles(id),
  from_grade VARCHAR(20) NOT NULL,
  to_grade VARCHAR(20) NOT NULL,
  reason VARCHAR(50) NOT NULL,
  admin_user_id UUID REFERENCES auth.users(id),
  pioneer_points_at_change INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. interactions
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spark_id UUID REFERENCES sparks(id),
  spotlight_id UUID REFERENCES spotlights(id),
  explorer_id UUID NOT NULL REFERENCES explorer_profiles(id),
  founder_id UUID NOT NULL REFERENCES auth.users(id),
  interaction_type VARCHAR(20) DEFAULT 'ORGANIC',
  content TEXT NOT NULL,
  founder_response TEXT,
  state VARCHAR(20) DEFAULT 'PENDING',
  founder_rating INT,
  quality_flag BOOLEAN DEFAULT false,
  depth_score DECIMAL(4,3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 7. sprint_sessions
CREATE TABLE IF NOT EXISTS sprint_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotlight_id UUID NOT NULL REFERENCES spotlights(id),
  founder_id UUID NOT NULL REFERENCES auth.users(id),
  days_purchased INT NOT NULL CHECK (days_purchased >= 1),
  amount_paise BIGINT NOT NULL,
  cashfree_order_id VARCHAR(128) NOT NULL,
  state VARCHAR(32) NOT NULL DEFAULT 'PAYMENT_PENDING',
  pioneer_grade_interaction_count INT DEFAULT 0,
  guarantee_eligible BOOLEAN DEFAULT false,
  guarantee_claim_window_opens_at TIMESTAMPTZ,
  guarantee_claim_window_closes_at TIMESTAMPTZ,
  guarantee_claimed_at TIMESTAMPTZ,
  ineligibility_reason VARCHAR(128),
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ledger_entries (append-only)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type VARCHAR(64) NOT NULL,
  direction VARCHAR(8) NOT NULL CHECK (direction IN ('CREDIT', 'DEBIT')),
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  reference_type VARCHAR(32),
  reference_id UUID,
  source_entry_id UUID REFERENCES ledger_entries(id),
  idempotency_key VARCHAR(256) UNIQUE,
  status VARCHAR(20) DEFAULT 'COMPLETED',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. founding_explorer_registrations (Correction A: baseline_credit_amount_paise is BIGINT NOT NULL)
CREATE TABLE IF NOT EXISTS founding_explorer_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  explorer_id UUID NOT NULL UNIQUE REFERENCES explorer_profiles(id),
  enrollment_number INT NOT NULL,
  commission_free_until TIMESTAMPTZ NOT NULL,
  earnings_baseline_credited BOOLEAN DEFAULT false,
  baseline_credit_amount_paise BIGINT NOT NULL DEFAULT 250000,
  enrolled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. spark_ignition_invites
CREATE TABLE IF NOT EXISTS spark_ignition_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spark_id UUID NOT NULL REFERENCES sparks(id),
  explorer_id UUID NOT NULL REFERENCES explorer_profiles(id),
  attempt_number INT NOT NULL DEFAULT 1 CHECK (attempt_number IN (1, 2)),
  state VARCHAR(16) NOT NULL DEFAULT 'SENT',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  CONSTRAINT unique_spark_explorer UNIQUE (spark_id, explorer_id)
);

-- 11. direct_requests
CREATE TABLE IF NOT EXISTS direct_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES auth.users(id),
  explorer_id UUID NOT NULL REFERENCES explorer_profiles(id),
  spotlight_id UUID NOT NULL REFERENCES spotlights(id),
  message TEXT NOT NULL CHECK (char_length(message) <= 500),
  fee_paise BIGINT NOT NULL,
  cashfree_order_id VARCHAR(128),
  state VARCHAR(32) NOT NULL DEFAULT 'PAYMENT_PENDING',
  interaction_id UUID REFERENCES interactions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours')
);

-- 12. domain_explorer_waitlist
CREATE TABLE IF NOT EXISTS domain_explorer_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  domain_id UUID NOT NULL REFERENCES domains(id),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_waitlist_email_domain UNIQUE (email, domain_id)
);

-- 13. guarantee_claims
CREATE TABLE IF NOT EXISTS guarantee_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_session_id UUID NOT NULL UNIQUE REFERENCES sprint_sessions(id),
  founder_id UUID NOT NULL REFERENCES auth.users(id),
  pioneer_grade_count_at_claim INT NOT NULL,
  credit_amount_paise BIGINT NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. security_audit_log
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(64) NOT NULL,
  source_ip INET,
  order_id_attempted VARCHAR(128),
  reason VARCHAR(256),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. domain_stats
CREATE TABLE IF NOT EXISTS domain_stats (
  domain VARCHAR(64) PRIMARY KEY,
  active_sprint_founder_count INT DEFAULT 0,
  active_explorer_count INT DEFAULT 0,
  interaction_count_7d INT DEFAULT 0,
  is_open BOOLEAN DEFAULT false,
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES (Section X.3 + Step 1.B Corrections)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sparks_domain_state ON sparks(domain_id, state);
CREATE INDEX IF NOT EXISTS idx_sparks_founder_id ON sparks(founder_id);
CREATE INDEX IF NOT EXISTS idx_spotlights_state ON spotlights(state);
CREATE INDEX IF NOT EXISTS idx_interactions_spotlight_id ON interactions(spotlight_id);
CREATE INDEX IF NOT EXISTS idx_interactions_explorer_id ON interactions(explorer_id);
CREATE INDEX IF NOT EXISTS idx_explorer_profiles_domain_grade ON explorer_profiles(domain_id, pioneer_grade);
CREATE INDEX IF NOT EXISTS idx_sprint_sessions_spotlight ON sprint_sessions(spotlight_id, state);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_requests_explorer_state ON direct_requests(explorer_id, state);

-- Critical Webhook Lookups (Step 1.B)
CREATE INDEX IF NOT EXISTS idx_sprint_sessions_cashfree_order_id ON sprint_sessions(cashfree_order_id);
CREATE INDEX IF NOT EXISTS idx_direct_requests_cashfree_order_id ON direct_requests(cashfree_order_id);

-- ============================================================================
-- LEDGER IMMUTABILITY — THREE-LAYER DEFENSE-IN-DEPTH (Section W.5 + X.4.5)
-- ============================================================================

-- Layer 1: RLS
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_ledger" ON ledger_entries;
CREATE POLICY "own_ledger" ON ledger_entries FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "system_insert_ledger" ON ledger_entries;
CREATE POLICY "system_insert_ledger" ON ledger_entries FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "no_update_ledger" ON ledger_entries;
CREATE POLICY "no_update_ledger" ON ledger_entries FOR UPDATE USING (false);

DROP POLICY IF EXISTS "no_delete_ledger" ON ledger_entries;
CREATE POLICY "no_delete_ledger" ON ledger_entries FOR DELETE USING (false);

-- Layer 2: Privilege-level REVOKE (blocks service_role which has BYPASSRLS)
REVOKE UPDATE, DELETE ON ledger_entries FROM service_role, authenticated, anon;

-- Layer 3: Immutability Trigger (fires for ALL roles, non-superusers cannot disable)
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only. Financial corrections must INSERT a new REVERSAL/CORRECTION entry with source_entry_id referencing the original. UPDATE and DELETE are forbidden.';
END;
$$;

DROP TRIGGER IF EXISTS no_update_or_delete_ledger ON ledger_entries;
DROP TRIGGER IF EXISTS no_update_or_delete_ledger_at ON ledger_entries; -- Clean any typo trigger

CREATE TRIGGER no_update_or_delete_ledger
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES FOR OTHER V19 TABLES (Section X.4.5)
-- ============================================================================

ALTER TABLE sparks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder_own_sparks" ON sparks;
CREATE POLICY "founder_own_sparks" ON sparks FOR ALL USING (founder_id = auth.uid());

DROP POLICY IF EXISTS "explorer_view_sparks" ON sparks;
CREATE POLICY "explorer_view_sparks" ON sparks FOR SELECT
  USING (state IN ('ACTIVE', 'SPOTLIGHT_ELIGIBLE') AND 
         domain_id = (SELECT domain_id FROM explorer_profiles WHERE user_id = auth.uid()));

ALTER TABLE spotlights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder_own_spotlights" ON spotlights;
CREATE POLICY "founder_own_spotlights" ON spotlights FOR ALL USING (founder_id = auth.uid());

DROP POLICY IF EXISTS "public_view_spotlights" ON spotlights;
CREATE POLICY "public_view_spotlights" ON spotlights FOR SELECT USING (state IN ('FREE_PERIOD', 'SPRINT_ACTIVE', 'PAUSED'));

ALTER TABLE sprint_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder_own_sprint_sessions" ON sprint_sessions;
CREATE POLICY "founder_own_sprint_sessions" ON sprint_sessions FOR ALL USING (founder_id = auth.uid());

ALTER TABLE explorer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "explorer_own_profile" ON explorer_profiles;
CREATE POLICY "explorer_own_profile" ON explorer_profiles FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "public_view_explorer_profile" ON explorer_profiles;
CREATE POLICY "public_view_explorer_profile" ON explorer_profiles FOR SELECT USING (true);

ALTER TABLE direct_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder_explorer_direct_requests" ON direct_requests;
CREATE POLICY "founder_explorer_direct_requests" ON direct_requests FOR ALL
  USING (founder_id = auth.uid() OR explorer_id = (SELECT id FROM explorer_profiles WHERE user_id = auth.uid()));

ALTER TABLE guarantee_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder_own_guarantee_claims" ON guarantee_claims;
CREATE POLICY "founder_own_guarantee_claims" ON guarantee_claims FOR ALL USING (founder_id = auth.uid());

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_view_security_audit_log" ON security_audit_log;
CREATE POLICY "admin_view_security_audit_log" ON security_audit_log FOR SELECT
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'ADMIN');

-- 16. interaction_events (Section AC)
CREATE TABLE IF NOT EXISTS interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interaction_events_interaction_id ON interaction_events(interaction_id);
ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;


