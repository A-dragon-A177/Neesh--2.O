-- ==============================================================================
-- NEESH V19 — PHASE 4 DATABASE MIGRATION: INTERACTION SLUGS & PUBLIC BLOG EXCERPTS
-- Reference: NEESH_V19_MASTER_PRD.md (Section U.2, Task 3)
-- ==============================================================================

-- 1. Add slug to interactions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'interactions' AND column_name = 'slug'
  ) THEN
    ALTER TABLE interactions ADD COLUMN slug VARCHAR(64) UNIQUE;
  END IF;
END $$;

-- 2. Add show_public_excerpts to explorer_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'explorer_profiles' AND column_name = 'show_public_excerpts'
  ) THEN
    ALTER TABLE explorer_profiles ADD COLUMN show_public_excerpts BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 3. Populate existing interactions with deterministic slugs: [domain_slug]-[first-8-chars-of-interaction-id]
UPDATE interactions
SET slug = CONCAT('general-', SUBSTRING(id::text, 1, 8))
WHERE slug IS NULL;

-- 4. Create index on slug for fast public lookups
CREATE INDEX IF NOT EXISTS idx_interactions_slug ON interactions(slug);

