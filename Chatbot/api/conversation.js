import { getConversation } from "./_db.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const id = String(request.query?.id || "");
  if (!id) {
    response.status(400).json({ error: "Conversation id is required." });
    return;
  }

  try {
    const conversation = await getConversation(id);
    if (!conversation) {
      response.status(404).json({ error: "Conversation not found." });
      return;
    }
    response.status(200).json({ conversation });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Could not load the conversation." });
  }
}