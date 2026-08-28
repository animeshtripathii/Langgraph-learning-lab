import { Annotation, END, START, StateGraph, messagesStateReducer, MemorySaver } from "@langchain/langgraph";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const chatState = Annotation.Root({
  messages: Annotation({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

const memory = new MemorySaver();
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
  .compile({ checkpointer: memory });

function toMessage(message) {
  if (message.role === "assistant") return new AIMessage(message.content);
  if (message.role === "system") return new SystemMessage(message.content);
  return new HumanMessage(message.content);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return response.status(500).json({ error: "GEMINI_API_KEY is not configured." });
  }

  const { messages, threadId = "web-user-1" } = request.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return response.status(400).json({ error: "At least one message is required." });
  }

  try {
    const result = await workflow.invoke(
      { messages: messages.map(toMessage) },
      { configurable: { thread_id: String(threadId) } },
    );
    const lastMessage = result.messages[result.messages.length - 1];
    return response.status(200).json({ message: lastMessage.content });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "The chatbot could not process that message." });
  }
}
