import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import {
  StateGraph,
  MessagesAnnotation,
  START,
} from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { configDotenv } from "dotenv";
configDotenv();

// --------------------------------
// 1. Create a tool
// --------------------------------

const getWeather = tool(
  async ({ city }) => {
    console.log(`Tool called for: ${city}`);

    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Weather API request failed: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current_condition?.[0];

    if (!current) {
      throw new Error(`No weather data found for ${city}`);
    }

    return JSON.stringify({
      city,
      temperatureC: current.temp_C,
      feelsLikeC: current.FeelsLikeC,
      condition: current.weatherDesc?.[0]?.value,
      humidity: current.humidity,
      windSpeedKph: current.windspeedKmph,
    });
  },
  {
    name: "get_weather",
    description: "Get the current weather for a city",

    schema: {
      type: "object",

      properties: {
        city: {
          type: "string",
          description: "The city name",
        },
      },

      required: ["city"],
    },
  }
);


// --------------------------------
// 2. Create LLM
// --------------------------------

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash-lite",
  temperature: 0,
  apiKey:process.env.GEMINI_API_KEY
});


// --------------------------------
// 3. Give tools to LLM
// --------------------------------

const llmWithTools = llm.bindTools([
  getWeather,
]);


// --------------------------------
// 4. Create chatbot node
// --------------------------------

async function chatbot(state) {

  const response = await llmWithTools.invoke(
    state.messages
  );

  return {
    messages: [response],
  };
}


// --------------------------------
// 5. Create ToolNode
// --------------------------------

const toolNode = new ToolNode([
  getWeather,
]);


// --------------------------------
// 6. Create graph
// --------------------------------

const graphBuilder =
  new StateGraph(MessagesAnnotation);


// --------------------------------
// 7. Add nodes
// --------------------------------

graphBuilder.addNode(
  "chatbot",
  chatbot
);

graphBuilder.addNode(
  "tools",
  toolNode
);


// --------------------------------
// 8. Start → chatbot
// --------------------------------

graphBuilder.addEdge(
  START,
  "chatbot"
);


// --------------------------------
// 9. chatbot → tools OR END
// --------------------------------

graphBuilder.addConditionalEdges(
  "chatbot",
  toolsCondition
);


// --------------------------------
// 10. tools → chatbot
// --------------------------------

graphBuilder.addEdge(
  "tools",
  "chatbot"
);


// --------------------------------
// 11. Compile graph
// --------------------------------

const graph =
  graphBuilder.compile();


// --------------------------------
// 12. Run graph
// --------------------------------

const result = await graph.invoke({

  messages: [
    new HumanMessage(
      "What is the weather in Delhi?"
    ),
  ],

});


// --------------------------------
// 13. Print result
// --------------------------------

for (const message of result.messages) {

  console.log(
    message.constructor.name,
    message.content
  );

}
