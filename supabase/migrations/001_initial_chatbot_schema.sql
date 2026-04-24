-- Migration: 001_initial_chatbot_schema
-- Created: 2026-04-23
-- Project: pilot-suite-chatbot (hfclviunhyghvqjbyltt)
-- Purpose: digital twin chatbot Phase 1 schema with pgvector RAG, conversation logging,
--          rate limiting, admin-tunable config. All tables RLS-enabled (service_role only).

-- Enable pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents: KB source content with embeddings
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  source_path TEXT NOT NULL,
  section_heading TEXT,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  token_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_source_path ON documents(source_path);

-- Conversations: session metadata
CREATE TABLE conversations (
  session_id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  optional_email TEXT,
  user_agent TEXT,
  ip_hash TEXT
);

CREATE INDEX idx_conversations_last_active ON conversations(last_active_at DESC);

-- Messages: individual message history
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES conversations(session_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  retrieved_source_ids BIGINT[],
  cited_source_ids BIGINT[],
  refuse_flag BOOLEAN NOT NULL DEFAULT FALSE,
  tokens_in INT,
  tokens_out INT,
  model TEXT,
  tier TEXT,
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_session_created ON messages(session_id, created_at);
CREATE INDEX idx_messages_refuse ON messages(created_at DESC) WHERE refuse_flag = TRUE;
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Rate limits: per-session request tracking
CREATE TABLE rate_limits (
  session_id UUID PRIMARY KEY REFERENCES conversations(session_id) ON DELETE CASCADE,
  message_count INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

-- Config: admin-tunable settings
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default config values
INSERT INTO config (key, value) VALUES
  ('chatbot_enabled', 'true'::jsonb),
  ('active_model', '"claude-sonnet-4-6"'::jsonb),
  ('refuse_template', '"I don''t have that in Milan''s knowledge base yet. Want me to pass your question along?"'::jsonb),
  ('system_prompt_additions', '""'::jsonb),
  ('max_messages_per_hour', '20'::jsonb),
  ('similarity_threshold', '0.75'::jsonb),
  ('top_k', '5'::jsonb);

-- Retrieval function: cosine similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id BIGINT,
  source_path TEXT,
  section_heading TEXT,
  content TEXT,
  chunk_index INT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.source_path,
    documents.section_heading,
    documents.content,
    documents.chunk_index,
    1 - (documents.embedding <=> query_embedding) as similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Enable Row Level Security on all tables
-- No public policies = only service_role can read/write
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
