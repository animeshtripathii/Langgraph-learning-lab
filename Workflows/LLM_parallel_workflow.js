// Parallel LLM workflow for essay review
// It starts from START and fans out to 3 review nodes:
// - clarity of thought
// - depth of analysis
// - language quality
// Each node returns feedback + a 10-point score.
// The summary node combines all three and calculates average score.

import { configDotenv } from "dotenv";
import { Annotation, START, StateGraph } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

configDotenv();

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash-lite",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.2,
});

const reviewSchema = z.object({
  feedback: z.string(),
  score: z.number().min(0).max(10),
});

const reviewLlm = llm.withStructuredOutput(reviewSchema, {
  method: "json_schema",
});

const summarySchema = z.object({
  summary: z.string(),
  averageScore: z.number().min(0).max(10),
});

const summaryLlm = llm.withStructuredOutput(summarySchema, {
  method: "json_schema",
});

const WorkflowState = Annotation.Root({
  essay: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => "",
  }),
  clarity: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => "",
  }),
  clarityScore: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => 0,
  }),
  depth: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => "",
  }),
  depthScore: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => 0,
  }),
  language: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => "",
  }),
  languageScore: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => 0,
  }),
  summary: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => "",
  }),
  averageScore: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => 0,
  }),
});

async function reviewEssay(criterion, essayText) {
  const prompt = `You are an essay evaluator. Review the essay for ${criterion}. Provide a concise feedback paragraph and a numeric score out of 10.

Essay:
${essayText}`;

  const response = await reviewLlm.invoke(prompt);

  return {
    feedback: response.feedback.trim(),
    score: Number(response.score),
  };
}

async function clarityNode(state) {
  const result = await reviewEssay("clarity of thought", state.essay);
  return {
    clarity: result.feedback,
    clarityScore: result.score,
  };
}

async function depthNode(state) {
  const result = await reviewEssay("depth of analysis", state.essay);
  return {
    depth: result.feedback,
    depthScore: result.score,
  };
}

async function languageNode(state) {
  const result = await reviewEssay("language quality and style", state.essay);
  return {
    language: result.feedback,
    languageScore: result.score,
  };
}

async function summaryNode(state) {
  const averageScore = (
    (state.clarityScore + state.depthScore + state.languageScore) /
    3
  ).toFixed(1);

  const prompt = `You are an expert academic editor. Summarize the feedback from the following three essay reviews and give a final overall verdict. Mention the strengths and weaknesses and provide one final score out of 10.

Clarity review:
${state.clarity}

Depth review:
${state.depth}

Language review:
${state.language}

Overall score should reflect the average of the three scores: ${averageScore}/10.`;

  const response = await summaryLlm.invoke(prompt);

  return {
    summary: response.summary.trim(),
    averageScore: Number(response.averageScore),
  };
}

const workflow = new StateGraph(WorkflowState)
  .addNode("clarityReview", clarityNode)
  .addNode("depthReview", depthNode)
  .addNode("languageReview", languageNode)
  .addNode("finalSummary", summaryNode)
  .addEdge(START, "clarityReview")
  .addEdge(START, "depthReview")
  .addEdge(START, "languageReview")
  .addEdge("clarityReview", "finalSummary")
  .addEdge("depthReview", "finalSummary")
  .addEdge("languageReview", "finalSummary");

const app = workflow.compile();

const essay = `Artificial intelligence is transforming the world at an astonishing speed. It helps doctors diagnose diseases faster, enables students to learn new skills, and improves business productivity. However, AI also raises important concerns about privacy, ethics, and job displacement. As a result, society must balance innovation with responsibility. If AI is used carefully and guided by clear rules, it can become a powerful force for progress.`;

const result = await app.invoke({ essay });

console.log("Clarity:", result.clarity);
console.log("Clarity Score:", result.clarityScore);
console.log("\n");
console.log("Depth:", result.depth);
console.log("Depth Score:", result.depthScore);
console.log("\n");
console.log("Language:", result.language);
console.log("Language Score:", result.languageScore);
console.log("\n");
console.log("Summary:", result.summary);
console.log("\n");
console.log("Average Score:", result.averageScore);
