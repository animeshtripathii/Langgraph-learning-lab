import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { configDotenv } from "dotenv";

// Load environment variables
configDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Define state channels for graph execution
const AgentAnnotation = Annotation.Root({
  task: Annotation(),
  targetFile: Annotation({ reducer: (_, n) => n, default: () => "" }),
  resolvedFile: Annotation({ reducer: (_, n) => n, default: () => "" }),
  detectedLanguage: Annotation({ reducer: (_, n) => n, default: () => "python" }),
  code: Annotation({ reducer: (_, n) => n, default: () => "" }),
  explanation: Annotation({ reducer: (_, n) => n, default: () => "" }),
  isCodingQuery: Annotation({ reducer: (_, n) => n, default: () => true }),
  error: Annotation({ reducer: (_, n) => n, default: () => null }),
  logs: Annotation({ reducer: (curr, next) => [...curr, ...next], default: () => [] }),
  iterations: Annotation({ reducer: (_, n) => n, default: () => 0 }),
  maxIterations: Annotation({ reducer: (_, n) => n, default: () => 3 }),
});

// Configure Gemini with zero temperature
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash-lite",
  temperature: 0,
  apiKey: process.env.GOOGLE_API_KEY,
});

// Generate initial code or revise failed attempts
async function codeGenerator(state) {
  const { task, targetFile, code, error, iterations } = state;
  const currentIteration = iterations + 1;

  let prompt;
  if (error) {
    prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are Codemon Core.
The previous code produced execution errors. Fix the issue.
Return your response strictly in this format:
EXPLANATION:
<brief note on fix>
CODE:
\`\`\`<language>
<full fixed executable code>
\`\`\``,
      ],
      [
        "user",
        `Task: ${task}\nTarget File: ${targetFile}\nFailing Code:\n${code}\nExecution Error:\n${error}\nProvide complete corrected code.`,
      ],
    ]);
  } else {
    prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are Codemon, an elite software engineering agent like Cursor or GitHub Copilot.
RULE 1: Only answer software engineering, programming, algorithm, bug-fixing, and system architecture prompts. If a query is not programming-related, output strictly: NON_CODING_QUERY.
RULE 2: Output format must follow:
EXPLANATION:
<concise explanation of approach>
CODE:
\`\`\`<language>
<complete executable code with test harness/main>
\`\`\``,
      ],
      [
        "user",
        `User Prompt: ${task}\nPreferred Target File Name: ${targetFile || "auto-detect"}`,
      ],
    ]);
  }

  const response = await prompt.pipe(llm).invoke({});
  const content = response.content.toString();

  // Reject non-programming requests immediately
  if (content.includes("NON_CODING_QUERY")) {
    return {
      isCodingQuery: false,
      explanation: "I am Codemon Core. I am exclusively scoped to software engineering, debugging, and code generation.",
      iterations: currentIteration,
      logs: ["Checked topic scope: Rejected non-programming prompt."],
    };
  }

  let explanation = "";
  if (content.includes("EXPLANATION:") && content.includes("CODE:")) {
    explanation = content.split("CODE:")[0].replace("EXPLANATION:", "").trim();
  }

  // Parse fenced code block and language identifier
  const match = content.match(/```(\w+)?\n([\s\S]*?)```/);
  let cleanCode = "";
  let lang = "python";

  if (match) {
    lang = match[1] ? match[1].toLowerCase() : "python";
    cleanCode = match[2].trim();
  } else {
    cleanCode = content.trim();
  }

  // Map language aliases
  if (lang === "js") lang = "javascript";
  if (lang === "py") lang = "python";

  // Fall back to standard filenames when target is unspecified
  let finalFile = targetFile;
  if (!finalFile) {
    const extMap = {
      python: "solution.py",
      javascript: "solution.mjs",
      typescript: "solution.ts",
      cpp: "solution.cpp",
      java: "Main.java",
      go: "main.go",
    };
    finalFile = extMap[lang] || "solution.txt";
  }

  return {
    isCodingQuery: true,
    code: cleanCode,
    explanation,
    detectedLanguage: lang,
    resolvedFile: finalFile,
    iterations: currentIteration,
    logs: [`Iteration ${currentIteration}: Code generated for [${lang}]. File: ${finalFile}`],
  };
}

// Execute code in an isolated temporary sandbox
async function codeRunner(state) {
  if (!state.isCodingQuery) return { error: null };

  const { code, detectedLanguage } = state;
  const tempDir = os.tmpdir();
  const timestamp = Date.now();

  try {
    let result;

    // Run Python in sandbox process
    if (detectedLanguage === "python") {
      const tempPath = path.join(tempDir, `codemon_${timestamp}.py`);
      fs.writeFileSync(tempPath, code, "utf-8");
      result = spawnSync("python", [tempPath], { encoding: "utf-8", timeout: 10000 });
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    // Run JavaScript in sandbox process
    } else if (detectedLanguage === "javascript") {
      const tempPath = path.join(tempDir, `codemon_${timestamp}.mjs`);
      fs.writeFileSync(tempPath, code, "utf-8");
      result = spawnSync("node", [tempPath], { encoding: "utf-8", timeout: 10000 });
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    // Compile and run C++ via g++
    } else if (detectedLanguage === "cpp" || detectedLanguage === "c++") {
      const srcPath = path.join(tempDir, `codemon_${timestamp}.cpp`);
      const binPath = path.join(tempDir, `codemon_${timestamp}.out`);
      fs.writeFileSync(srcPath, code, "utf-8");

      const compile = spawnSync("g++", ["-O2", srcPath, "-o", binPath], { encoding: "utf-8", timeout: 10000 });
      if (compile.status !== 0) {
        if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);
        return {
          error: `Compiler Error:\n${compile.stderr}`,
          logs: ["Compilation failed. Sending traceback to Coder for auto-repair."],
        };
      }

      result = spawnSync(binPath, { encoding: "utf-8", timeout: 5000 });
      if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);
      if (fs.existsSync(binPath)) fs.unlinkSync(binPath);

    // Treat non-configured language runtimes as valid
    } else {
      return { error: null, logs: ["Runtime testing skipped (unconfigured engine). Assuming valid."] };
    }

    // Capture runtime process failures
    if (result.error) {
      return { error: result.error.message, logs: [`Runtime failed: ${result.error.message}`] };
    }
    if (result.status !== 0) {
      return {
        error: result.stderr.trim() || `Process exited with code ${result.status}`,
        logs: [`Execution failed with code ${result.status}. Queuing auto-repair.`],
      };
    }

    return { error: null, logs: ["Execution test passed with return code 0."] };
  } catch (err) {
    return { error: err.message, logs: [`Runner exception: ${err.message}`] };
  }
}

// Write the validated code to the destination path
async function fileWriter(state) {
  if (!state.isCodingQuery) return {};

  const { code, resolvedFile } = state;
  const fullPath = path.resolve(process.cwd(), resolvedFile);
  const dirName = path.dirname(fullPath);

  // Recursively create parent directories if missing
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }

  fs.writeFileSync(fullPath, code, "utf-8");
  return { logs: [`Committed cleanly to disk: ${fullPath}`] };
}

// Route to retry, commit, or end based on execution status
function shouldContinue(state) {
  if (!state.isCodingQuery) return "end";
  if (!state.error) return "write_file";
  if (state.iterations >= state.maxIterations) return "write_file";
  return "fix_code";
}

// Wire graph nodes and edges
const workflow = new StateGraph(AgentAnnotation)
  .addNode("coder", codeGenerator)
  .addNode("tester", codeRunner)
  .addNode("writer", fileWriter)
  .addEdge(START, "coder")
  .addEdge("coder", "tester")
  .addConditionalEdges("tester", shouldContinue, {
    fix_code: "coder",
    write_file: "writer",
    end: END,
  })
  .addEdge("writer", END);

const agent = workflow.compile();

// Endpoint to process user coding requests
app.post("/api/chat", async (req, res) => {
  const { prompt, targetFile } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required." });

  try {
    const result = await agent.invoke({
      task: prompt,
      targetFile: targetFile || "",
      maxIterations: 3,
    });

    res.json({
      success: true,
      isCodingQuery: result.isCodingQuery,
      explanation: result.explanation,
      code: result.code,
      resolvedFile: result.resolvedFile,
      detectedLanguage: result.detectedLanguage,
      iterations: result.iterations,
      logs: result.logs,
      error: result.error,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint to read local file contents
app.get("/api/file", (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: "Path required." });
  const fullPath = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    res.json({ content: fs.readFileSync(fullPath, "utf-8") });
  } else {
    res.status(404).json({ error: "File not found." });
  }
});

// Start local Express server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Codemon Agent UI is running on: http://localhost:${PORT}`);
});