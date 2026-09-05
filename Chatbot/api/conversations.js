import { listConversations } from "./_db.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    response.status(200).json({ conversations: await listConversations() });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Could not load conversations." });
  }
}