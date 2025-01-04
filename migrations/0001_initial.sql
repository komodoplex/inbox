-- 0001_initial.sql
-- Core relational tables for Komodoplex message ingestion

CREATE TABLE IF NOT EXISTS ventures (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    venture_id TEXT NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    channel TEXT NOT NULL,
    domain TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
    type TEXT NOT NULL DEFAULT 'inquiry',
    status TEXT NOT NULL DEFAULT 'open',
    subject TEXT,
    requester_name TEXT,
    requester_email TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    direction TEXT NOT NULL,
    body TEXT NOT NULL,
    sender_name TEXT,
    sender_email TEXT,
    metadata TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_source_id ON conversations(source_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sources_venture_id ON sources(venture_id);
