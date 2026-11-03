-- ============================================================================
-- NEESH V20 MIGRATION: SCOUT PIONEER GRADE
-- Adds unpaid entry tier below SEED for new Explorer quality gating.
--
-- Note: pioneer_grade is VARCHAR(20), not an enum.
-- No ALTER TYPE needed.
-- ============================================================================

-- Change DB default to SCOUT for new Explorer profiles.
-- Application layer sets SCOUT for new registrations.
-- Senior Fast-Track and Founding Explorer override to PRO/SEED at app layer.
ALTER TABLE explorer_profiles
  ALTER COLUMN pioneer_grade SET DEFAULT 'SCOUT';

-- Backfill: demote existing SEED Explorers who have ZERO completed paid
-- interactions to SCOUT. These are new signups who haven't done anything yet.
-- Existing active Explorers with at least one completed interaction keep SEED.
UPDATE explorer_profiles ep
SET pioneer_grade = 'SCOUT'
WHERE ep.pioneer_grade = 'SEED'
  AND ep.verified_interaction_count = 0
  AND ep.is_founding_explorer = false
  AND ep.senior_fast_track = false;

-- Record the backfill in grade history for audit trail.
INSERT INTO pioneer_grade_history (
  explorer_id,
  from_grade,
  to_grade,
  reason,
  pioneer_points_at_change
)
SELECT
  id,
  'SEED',
  'SCOUT',
  'V20_BACKFILL',
  COALESCE(pioneer_points, 0)
FROM explorer_profiles
WHERE pioneer_grade = 'SCOUT'
  AND id NOT IN (
    SELECT explorer_id FROM pioneer_grade_history WHERE reason = 'V20_BACKFILL'
  );

-- Comment documenting V20 Scout Grade behavior
COMMENT ON COLUMN explorer_profiles.pioneer_grade IS 'Pioneer Grade: SCOUT (unpaid entry), SEED, RISING, PRO, MASTER, ELITE. SCOUT interactions are free (0 paise) and require N>=3, WAR>=3.50 to graduate to SEED.';
