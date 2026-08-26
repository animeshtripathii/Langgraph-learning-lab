import { configDotenv } from "dotenv";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

configDotenv();

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    apiKey: process.env.GEMINI_API_KEY
});


const sentimentSchema = z.object({
    sentiment: z.enum(["positive", "negative"]).describe("Sentiment classification")
});
const sentimentLlm = model.withStructuredOutput(sentimentSchema);

const diagnosisSchema = z.object({
    problem: z.string().describe("What went wrong and which feature is not working"),
    message: z.string().describe("A clear, helpful message to send to the user")
});
const diagnosisLlm = model.withStructuredOutput(diagnosisSchema);

const sentimentState = Annotation.Root({
    review: Annotation,
    sentiment: Annotation({
        reducer: (_, value) => sentimentSchema.shape.sentiment.parse(value),
        default: () => ""
    }),
    response: Annotation({
        reducer: (_, value) => value,
        default: () => ""
    })
});

const classifyReview = async (state) => {
    const result = await sentimentLlm.invoke(
        `Classify this user review as positive or negative:\n${state.review}`
    );
    return { sentiment: result.sentiment };
};

const sendThankYou = (state) => ({
    response: `Thank you for your positive review! We are glad you had a good experience.`
});

const diagnoseProblem = async (state) => {
    const result = await diagnosisLlm.invoke(
        `Analyze this negative user review. Identify what went wrong and which feature is not working, then write a helpful response:\n${state.review}`
    );
    return {
        response: `We are sorry about the problem. ${result.problem}\n\n${result.message}`
    };
};

const workflow = new StateGraph(sentimentState)
    .addNode("classify", classifyReview)
    .addNode("thankYou", sendThankYou)
    .addNode("diagnose", diagnoseProblem)
    .addEdge(START, "classify")
    .addConditionalEdges("classify", (state) => state.sentiment, {
        positive: "thankYou",
        negative: "diagnose"
    })
    .addEdge("thankYou", END)
    .addEdge("diagnose", END)
    .compile();

const review = "The software is working properly";
const result = await workflow.invoke({ review });
console.log(result.response);
