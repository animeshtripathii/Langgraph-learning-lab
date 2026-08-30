import { configDotenv } from "dotenv";

import {
  Annotation,
  END,
  START,
  StateGraph,
  messagesStateReducer,
  MemorySaver
} from "@langchain/langgraph";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

configDotenv();

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash-lite",
  temperature: 0.1,
  apiKey: process.env.GEMINI_API_KEY
});


// State
const chatState = Annotation.Root({
  messages: Annotation({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});


// Node
async function chat_node(state) {

  const response = await llm.invoke(state.messages);

  return {
    messages: [response]
  };
}


// Graph
const graph = new StateGraph(chatState);

graph.addNode("chat_node", chat_node);

graph.addEdge(START, "chat_node");
graph.addEdge("chat_node", END);


// Memory
const memory = new MemorySaver();


// Compile
const chatbot = graph.compile({
  checkpointer: memory
});


// CLI
const rl = readline.createInterface({
  input,
  output
});


// Conversation ID
const config = {
  configurable: {
    thread_id: "user-1"
  }
};


console.log("🤖 Chatbot started");
console.log("Type exit, bye, or quit to stop.\n");


while (true) {

  const userInput = await rl.question("You: ");

  const command = userInput.toLowerCase().trim();

  if (
    command === "exit" ||
    command === "bye" ||
    command === "quit"
  ) {
    console.log("Bot: Goodbye!");
    break;
  }


  const stream = await chatbot.stream(
    {
      messages: [
        new HumanMessage(userInput)
      ]
    },
    {
      ...config,
      streamMode: "messages"
    }
  );


  process.stdout.write("Bot: ");

  for await (const [messageChunk, metadata] of stream) {
    process.stdout.write(messageChunk.content);
  }

  console.log();
}


rl.close();
