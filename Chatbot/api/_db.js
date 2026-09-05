import { createClient } from "@libsql/client";

let client;
let schemaPromise;

function getClient() {
  if (client) return client;

  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required.");
  }

  client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  return client;
}

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = getClient().batch([
      `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS messages_conversation_idx
       ON messages (conversation_id, id)`,
      `CREATE INDEX IF NOT EXISTS conversations_updated_idx
       ON conversations (updated_at DESC)`,
    ], "write");
  }

  await schemaPromise;
}

export async function listConversations() {
  await ensureSchema();
  const result = await getClient().execute({
    sql: `SELECT id, title, created_at, updated_at
          FROM conversations
          ORDER BY updated_at DESC`,
    args: [],
  });
  return result.rows;
}

export async function getConversation(id) {
  await ensureSchema();
  const conversation = await getClient().execute({
    sql: `SELECT id, title, created_at, updated_at
          FROM conversations
          WHERE id = ?`,
    args: [id],
  });

  if (conversation.rows.length === 0) return null;

  const messages = await getClient().execute({
    sql: `SELECT role, content, created_at
          FROM messages
          WHERE conversation_id = ?
          ORDER BY id ASC`,
    args: [id],
  });

  return {
    ...conversation.rows[0],
    messages: messages.rows,
  };
}

export async function saveConversation({ id, title, messages, createdAt }) {
  await ensureSchema();
  const now = new Date().toISOString();
  const db = getClient();
  const statements = [
    {
      sql: `INSERT INTO conversations (id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at`,
      args: [id, title, createdAt || now, now],
    },
    {
      sql: "DELETE FROM messages WHERE conversation_id = ?",
      args: [id],
    },
    ...messages.map((message) => ({
      sql: `INSERT INTO messages (conversation_id, role, content, created_at)
            VALUES (?, ?, ?, ?)`,
      args: [id, message.role, message.content, message.createdAt || now],
    })),
  ];

  await db.batch(statements, "write");
}
