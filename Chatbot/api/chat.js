import { Annotation, END, START, StateGraph, messagesStateReducer } from "@langchain/langgraph";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { assertDatabaseConfigured, saveConversation } from "./_db.js";

const chatState = Annotation.Root({
  messages: Annotation({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

const workflow = new StateGraph(chatState)
  .addNode("chat", async (state) => {
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-3.5-flash-lite",
      temperature: 0.1,
      apiKey: process.env.GEMINI_API_KEY,
    });
    const response = await llm.invoke(state.messages);
    return { messages: response };
  })
  .addEdge(START, "chat")
  .addEdge("chat", END)
  .compile();

function toMessage(message) {
  if (message.role === "assistant") return new AIMessage(message.content);
  if (message.role === "system") return new SystemMessage(message.content);
  return new HumanMessage(message.content);
}

function normalizeText(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("");
  }

  return String(content ?? "");
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    response.status(500).json({ error: "GEMINI_API_KEY is not configured." });
    return;
  }

  try {
    assertDatabaseConfigured();
  } catch (error) {
    response.status(503).json({ error: error.message });
    return;
  }

  const body = request.body || {};
  const { messages, conversationId, title } = body;

  if (!conversationId || !Array.isArray(messages) || messages.length === 0) {
    response.status(400).json({ error: "conversationId and at least one message are required." });
    return;
  }

  try {
    const stream = await workflow.stream(
      { messages: messages.map(toMessage) },
      { streamMode: "messages" },
    );

    response.status(200);
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");

    let assistantMessage = "";
    for await (const [messageChunk] of stream) {
      const chunkText = normalizeText(messageChunk.content);
      if (chunkText) {
        assistantMessage += chunkText;
        response.write(chunkText);
      }
    }

    await saveConversation({
      id: String(conversationId),
      title: String(title || messages.find((message) => message.role === "user")?.content || "New conversation").slice(0, 80),
      messages: [
        ...messages,
        { role: "assistant", content: assistantMessage },
      ],
    });
    response.end();
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "The chatbot could not process that message." });
  }
}
