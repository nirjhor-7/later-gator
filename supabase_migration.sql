-- ============================================================
-- LATER GATORS — GATOR TAG AUTH & REACTIONS SCHEMA MIGRATION
-- Run this once in your Supabase SQL Editor (Full with RLS)
-- ============================================================

-- 1. Gator identity table
CREATE TABLE IF NOT EXISTS gator_tags (
    tag             TEXT PRIMARY KEY,
    display_tag     TEXT NOT NULL,
    gator_id        UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    notify_email    TEXT,
    claimed_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sessions (token-based, 90-day expiry)
CREATE TABLE IF NOT EXISTS gator_sessions (
    token       TEXT PRIMARY KEY,
    gator_id    UUID NOT NULL REFERENCES gator_tags(gator_id) ON DELETE CASCADE,
    tag         TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);
CREATE INDEX IF NOT EXISTS idx_gator_sessions_expires ON gator_sessions(expires_at);

-- 3. Dispatch notification milestone tracking
CREATE TABLE IF NOT EXISTS dispatch_notifications (
    task_id         TEXT PRIMARY KEY,
    gator_id        UUID REFERENCES gator_tags(gator_id),
    notify_email    TEXT,
    last_milestone  INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Author identity on tasks (if tasks table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS author_gator_id UUID REFERENCES gator_tags(gator_id);
    END IF;
END $$;

-- 5. User reactions table (creates table if not exists)
CREATE TABLE IF NOT EXISTS user_reactions (
    id              BIGSERIAL PRIMARY KEY,
    session_id      TEXT,
    task_id         TEXT NOT NULL,
    reaction_type   TEXT NOT NULL,
    gator_id        UUID REFERENCES gator_tags(gator_id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was already created
DO $$
BEGIN
    ALTER TABLE user_reactions ADD COLUMN IF NOT EXISTS gator_id UUID REFERENCES gator_tags(gator_id);
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Constraints & Indexes for fast lookups and upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_reactions_session_task
    ON user_reactions (session_id, task_id)
    WHERE session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_reactions_gator_task
    ON user_reactions (gator_id, task_id)
    WHERE gator_id IS NOT NULL;

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all auth & reaction tables
ALTER TABLE gator_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE gator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for gator_tags
DROP POLICY IF EXISTS "Allow API select on gator_tags" ON gator_tags;
CREATE POLICY "Allow API select on gator_tags" ON gator_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow API insert on gator_tags" ON gator_tags;
CREATE POLICY "Allow API insert on gator_tags" ON gator_tags FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow API update on gator_tags" ON gator_tags;
CREATE POLICY "Allow API update on gator_tags" ON gator_tags FOR UPDATE USING (true) WITH CHECK (true);

-- Policies for gator_sessions
DROP POLICY IF EXISTS "Allow API all on gator_sessions" ON gator_sessions;
CREATE POLICY "Allow API all on gator_sessions" ON gator_sessions FOR ALL USING (true) WITH CHECK (true);

-- Policies for dispatch_notifications
DROP POLICY IF EXISTS "Allow API all on dispatch_notifications" ON dispatch_notifications;
CREATE POLICY "Allow API all on dispatch_notifications" ON dispatch_notifications FOR ALL USING (true) WITH CHECK (true);

-- Policies for user_reactions
DROP POLICY IF EXISTS "Allow API all on user_reactions" ON user_reactions;
CREATE POLICY "Allow API all on user_reactions" ON user_reactions FOR ALL USING (true) WITH CHECK (true);
