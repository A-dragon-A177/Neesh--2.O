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

-- Comment documenting V20 Scout Grade behavior
COMMENT ON COLUMN explorer_profiles.pioneer_grade IS 'Pioneer Grade: SCOUT (unpaid entry), SEED, RISING, PRO, MASTER, ELITE. SCOUT interactions are free (0 paise) and require N>=3, WAR>=3.50 to graduate to SEED.';

