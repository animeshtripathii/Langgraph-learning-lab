import { configDotenv } from "dotenv";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

configDotenv();

// ← Weaker model so tweets are bad enough to force iterations
const generator_llm = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",       // ← basic, weaker output
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.9                  // ← higher temp = more varied (worse) output
});

const evaluation_llm = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.1                  // ← low temp = stricter, more consistent judging
});

const optimizer_llm = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.7
});

// ✅ Added tweet_history and feedback_history
const TweetState = Annotation.Root({
    topic: Annotation,
    tweet: Annotation,
    evaluation: Annotation,
    feedback: Annotation,
    iteration: Annotation,
    max_iteration: Annotation,
    tweet_history: Annotation,       // ← new
    feedback_history: Annotation,    // ← new
});

const graph = new StateGraph(TweetState);

async function generate_tweet(state) {
    const topic = state.topic;

    const prompt = [
        new SystemMessage({ content: "You are a Twitter/X user. Write a short tweet." }),
        new HumanMessage({
            content: `
Write a short tweet on: "${topic}"
Max 300 characters. This is version ${state.iteration + 1}.
            `
        })
    ];

    const ans = (await generator_llm.invoke(prompt)).content;

    return {
        tweet: ans,
        tweet_history: [...(state.tweet_history || []), ans],
        feedback_history: [...(state.feedback_history || []), null],
    };
}

async function evaluate_tweet(state) {
    const evaluator = evaluation_llm.withStructuredOutput(
        z.object({
            evaluation: z.enum(["approve", "need_improvement"]),
            feedback: z.string()
        })
    );

    const prompt = [
        new SystemMessage({
            content: "Evaluate tweets strictly for humor, originality, clarity, topic relevance, and format compliance."
        }),
        new HumanMessage({
            content: `
Evaluate this tweet:
"${state.tweet}"

Topic: "${state.topic}"

Criteria:
1. Topic relevance
2. Humor (genuinely funny)
3. Originality (not generic)
4. Clarity (simple English)
5. Format (≤300 chars, no Q&A)
6. Safety

Approve ONLY if ALL pass. Otherwise use need_improvement with specific feedback.
            `
        })
    ];

    const result = await evaluator.invoke(prompt);

    return {
        evaluation: result.evaluation,
        feedback: result.feedback,
        feedback_history: [...(state.feedback_history || []), result.feedback],
    };
}

async function optimize_tweet(state) {
    const prompt = [
        new SystemMessage({
            content: "Improve the tweet based on feedback. Return ONLY the improved tweet, no explanation."
        }),
        new HumanMessage({
            content: `
Topic: "${state.topic}"
Current tweet: "${state.tweet}"
Feedback: "${state.feedback}"

Rules:
- Return only the improved tweet (≤300 chars)
- Simple English, observational humor
- No Q&A format
            `
        })
    ];

    const result = (await optimizer_llm.invoke(prompt)).content;

    return {
        tweet: result,
        iteration: state.iteration + 1,
        tweet_history: [...(state.tweet_history || []), result],
        feedback_history: [...(state.feedback_history || []), null],
    };
}

function should_optimize(state) {
    if (state.evaluation === "need_improvement" && state.iteration < state.max_iteration) {
        return "optimize";
    }
    return END;
}

graph.addNode("generate_tweet", generate_tweet);
graph.addNode("evaluate", evaluate_tweet);
graph.addNode("optimize", optimize_tweet);

graph.addEdge(START, "generate_tweet");
graph.addEdge("generate_tweet", "evaluate");
graph.addConditionalEdges("evaluate", should_optimize, {
    "optimize": "optimize",
    [END]: END
});
graph.addEdge("optimize", "evaluate");

const workflow = graph.compile();

const initial_state = {
    topic: "Indian Railways",
    iteration: 1,
    max_iteration: 5,
    tweet_history: [],
    feedback_history: [],
};

(async () => {
    try {
        const result = await workflow.invoke(initial_state);

        console.log("\n========== FINAL RESULT ==========\n");
        console.log("Final Tweet:", result.tweet);
        console.log("Final Evaluation:", result.evaluation);
        console.log("Iterations Used:", result.iteration);

        console.log("\n========== FULL HISTORY ==========\n");
        result.tweet_history.forEach((tweet, i) => {
            console.log(`\n--- Version ${i + 1} ---`);
            console.log(`Tweet:    ${tweet}`);
            console.log(`Feedback: ${result.feedback_history[i] || "(n/a)"}`);
        });

    } catch (err) {
        console.error(err);
    }
})();   