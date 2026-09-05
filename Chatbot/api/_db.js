import { neon } from "@neondatabase/serverless";

let schemaPromise;

export function assertDatabaseConfigured() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Neon PostgreSQL.");
  }
}

function getSql() {
  assertDatabaseConfigured();
  return neon(process.env.DATABASE_URL);
}

async function ensureSchema() {
  if (!schemaPromise) {
    const sql = getSql();
    schemaPromise = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )`;
      await sql`CREATE TABLE IF NOT EXISTS messages (
        id BIGSERIAL PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )`;
      await sql`CREATE INDEX IF NOT EXISTS messages_conversation_idx
        ON messages (conversation_id, id)`;
      await sql`CREATE INDEX IF NOT EXISTS conversations_updated_idx
        ON conversations (updated_at DESC)`;
    })();
  }

  await schemaPromise;
}

export async function listConversations() {
  await ensureSchema();
  return getSql()`SELECT id, title, created_at, updated_at
    FROM conversations
    ORDER BY updated_at DESC`;
}

export async function getConversation(id) {
  await ensureSchema();
  const sql = getSql();
  const conversation = await sql`SELECT id, title, created_at, updated_at
    FROM conversations
    WHERE id = ${id}`;

  if (conversation.length === 0) return null;

  const messages = await sql`SELECT role, content, created_at
    FROM messages
    WHERE conversation_id = ${id}
    ORDER BY id ASC`;

  return {
    ...conversation[0],
    messages,
  };
}

export async function saveConversation({ id, title, messages, createdAt }) {
  await ensureSchema();
  const now = new Date().toISOString();
  const sql = getSql();
  await sql`INSERT INTO conversations (id, title, created_at, updated_at)
    VALUES (${id}, ${title}, ${createdAt || now}, ${now})
    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, updated_at = EXCLUDED.updated_at`;
  await sql`DELETE FROM messages WHERE conversation_id = ${id}`;
  for (const message of messages) {
    await sql`INSERT INTO messages (conversation_id, role, content, created_at)
      VALUES (${id}, ${message.role}, ${message.content}, ${message.createdAt || now})`;
  }
}
