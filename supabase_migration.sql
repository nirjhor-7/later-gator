-- ============================================================
-- LATER GATORS — GATOR TAG AUTH SYSTEM MIGRATION
-- Run this once in your Supabase SQL Editor
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

-- 4. Author identity on tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS author_gator_id UUID REFERENCES gator_tags(gator_id);

-- 5. Gator identity on reactions
ALTER TABLE user_reactions ADD COLUMN IF NOT EXISTS gator_id UUID REFERENCES gator_tags(gator_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_reactions_gator_task
    ON user_reactions (gator_id, task_id)
    WHERE gator_id IS NOT NULL;
