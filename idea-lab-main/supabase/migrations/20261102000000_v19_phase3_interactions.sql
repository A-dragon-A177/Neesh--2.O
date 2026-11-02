-- ==============================================================================
-- NEESH V19 — PHASE 3 DATABASE MIGRATION: INTERACTIONS & DIRECT REQUEST LIFECYCLE
-- Reference: NEESH_V19_MASTER_PRD.md (Section AC, Section U, Section W, Section Y)
-- ==============================================================================

-- 1. interaction_events Table (PRD Section AC)
CREATE TABLE IF NOT EXISTS interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for high-performance lookup of interaction timeline events
CREATE INDEX IF NOT EXISTS idx_interaction_events_interaction_id ON interaction_events(interaction_id);

-- Ensure sprint_sessions.ineligibility_reason exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sprint_sessions' AND column_name = 'ineligibility_reason'
  ) THEN
    ALTER TABLE sprint_sessions ADD COLUMN ineligibility_reason VARCHAR(128);
  END IF;
END $$;

-- Enable RLS on interaction_events
ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;

-- RLS: Service role has full access
CREATE POLICY service_role_all_interaction_events 
  ON interaction_events 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- RLS: Authenticated users can view events for interactions they are party to
CREATE POLICY auth_select_interaction_events 
  ON interaction_events 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM interactions i 
      WHERE i.id = interaction_events.interaction_id 
      AND (i.founder_id = auth.uid() OR i.explorer_id IN (
        SELECT id FROM explorer_profiles WHERE user_id = auth.uid()
      ))
    )
  );

-- RLS: System / authenticated participants can append interaction events
CREATE POLICY auth_insert_interaction_events 
  ON interaction_events 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interactions i 
      WHERE i.id = interaction_events.interaction_id 
      AND (i.founder_id = auth.uid() OR i.explorer_id IN (
        SELECT id FROM explorer_profiles WHERE user_id = auth.uid()
      ))
    )
  );

