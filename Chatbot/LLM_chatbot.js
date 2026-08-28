// import { configDotenv } from "dotenv";
// import {
//   Annotation,
//   END,
//   START,
//   StateGraph,
//   messagesStateReducer
// } from "@langchain/langgraph";

// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// import { HumanMessage } from "@langchain/core/messages";
// import readline from "node:readline/promises";
// import { stdin as input, stdout as output } from "node:process";

// configDotenv();

// const llm = new ChatGoogleGenerativeAI({
//   model: "gemini-3.5-flash-lite",
//   temperature: 0.1,
//   apiKey: process.env.GEMINI_API_KEY
// });

// const chatState = Annotation.Root({
//   messages: Annotation({
//     reducer: messagesStateReducer,
//     default: () => [],
//   }),
// });

// async function chat_node(state) {
//   const response = await llm.invoke(state.messages);

//   return {
//     messages: response
//   };
// }

// const graph = new StateGraph(chatState);

// graph.addNode("chat_node", chat_node);
// graph.addEdge(START, "chat_node");
// graph.addEdge("chat_node", END);

// const chatbot = graph.compile();


// // Chat history

// let messages = [];
// const rl = readline.createInterface({
//   input,
//   output
// });

// console.log("🤖 Chatbot started");
// console.log("Type exit, bye, or quit to stop.\n");

// while (true) {

//   const userInput = await rl.question("You: ");

//   // Stop chatbot
//   if (
//     userInput.toLowerCase() === "exit" ||
//     userInput.toLowerCase() === "bye" ||
//     userInput.toLowerCase() === "quit"
//   ) {
//     console.log("Bot: Goodbye!");
//     break;
//   }

//   // Add user message
//   messages.push(
//     new HumanMessage(userInput)
//   );

//   // Run LangGraph
//   const result = await chatbot.invoke({
//     messages: messages
//   });

// //   // Save updated history
//    messages = result.messages;

//   // Get AI response
//   const lastMessage = messages[messages.length - 1];

//   console.log("Bot:", lastMessage.content);
// }

// rl.close();




// Above, we saved memory manually; now we are using persistence.
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
    messages: response
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


  const result = await chatbot.invoke(
    {
      messages: [
        new HumanMessage(userInput)
      ]
    },
    config
  );


  const lastMessage =
    result.messages[result.messages.length - 1];

  console.log("Bot:", lastMessage.content);
}


rl.close();
