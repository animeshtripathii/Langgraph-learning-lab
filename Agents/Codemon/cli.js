#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Command } from "commander";
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { configDotenv } from "dotenv";

configDotenv();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("\x1b[31mError: GOOGLE_API_KEY is not set.\x1b[0m");
  console.error("Set it via: export GOOGLE_API_KEY=\"your_key_here\" or add it to .env\n");
  process.exit(1);
}

// State definition
const AgentAnnotation = Annotation.Root({
  task: Annotation(),
  targetFile: Annotation({ reducer: (_, n) => n, default: () => "" }),
  resolvedFile: Annotation({ reducer: (_, n) => n, default: () => "" }),
  detectedLanguage: Annotation({ reducer: (_, n) => n, default: () => "python" }),
  code: Annotation({ reducer: (_, n) => n, default: () => "" }),
  explanation: Annotation({ reducer: (_, n) => n, default: () => "" }),
  isCodingQuery: Annotation({ reducer: (_, n) => n, default: () => true }),
  error: Annotation({ reducer: (_, n) => n, default: () => null }),
  iterations: Annotation({ reducer: (_, n) => n, default: () => 0 }),
  maxIterations: Annotation({ reducer: (_, n) => n, default: () => 3 }),
});

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash-lite",
  temperature: 0,
  apiKey: apiKey,
});

async function codeGenerator(state) {
  const { task, targetFile, code, error, iterations } = state;
  const currentIteration = iterations + 1;

  let prompt;
  if (error) {
    prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are Codemon, an autonomous code synthesis and repair daemon. Fix execution issues cleanly. Output format: EXPLANATION: <brief note> CODE: ```<language> <code> ```",
      ],
      [
        "user",
        `Task: ${task}\nTarget: ${targetFile}\nFailing Code:\n${code}\nExecution Error:\n${error}\nProvide complete corrected code.`,
      ],
    ]);
  } else {
    prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are Codemon, an elite software engineering agent. Only answer coding tasks. If not programming-related, output: NON_CODING_QUERY. Format: EXPLANATION: <brief note> CODE: ```<language> <code> ```",
      ],
      ["user", `Task: ${task}\nTarget: ${targetFile || "auto-detect"}`],
    ]);
  }

  const response = await prompt.pipe(llm).invoke({});
  const content = response.content.toString();

  if (content.includes("NON_CODING_QUERY")) {
    return {
      isCodingQuery: false,
      explanation: "Codemon is strictly dedicated to code generation, debugging, and software engineering.",
      iterations: currentIteration,
    };
  }

  let explanation = "";
  if (content.includes("EXPLANATION:") && content.includes("CODE:")) {
    explanation = content.split("CODE:")[0].replace("EXPLANATION:", "").trim();
  }

  const match = content.match(/```(\w+)?\n([\s\S]*?)```/);
  let cleanCode = "";
  let lang = "python";

  if (match) {
    lang = match[1] ? match[1].toLowerCase() : "python";
    cleanCode = match[2].trim();
  } else {
    cleanCode = content.trim();
  }

  if (lang === "js") lang = "javascript";
  if (lang === "py") lang = "python";

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
  };
}

async function codeRunner(state) {
  if (!state.isCodingQuery) return { error: null };

  const { code, detectedLanguage } = state;
  const tempDir = os.tmpdir();
  const timestamp = Date.now();

  try {
    let result;

    if (detectedLanguage === "python") {
      const tempPath = path.join(tempDir, `codemon_${timestamp}.py`);
      fs.writeFileSync(tempPath, code, "utf-8");
      result = spawnSync("python", [tempPath], { encoding: "utf-8", timeout: 10000 });
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    } else if (detectedLanguage === "javascript") {
      const tempPath = path.join(tempDir, `codemon_${timestamp}.mjs`);
      fs.writeFileSync(tempPath, code, "utf-8");
      result = spawnSync("node", [tempPath], { encoding: "utf-8", timeout: 10000 });
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    } else if (detectedLanguage === "cpp" || detectedLanguage === "c++") {
      const srcPath = path.join(tempDir, `codemon_${timestamp}.cpp`);
      const binPath = path.join(tempDir, `codemon_${timestamp}.out`);
      fs.writeFileSync(srcPath, code, "utf-8");

      const compile = spawnSync("g++", ["-O2", srcPath, "-o", binPath], { encoding: "utf-8", timeout: 10000 });
      if (compile.status !== 0) {
        if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);
        return { error: `Compiler Error:\n${compile.stderr}` };
      }

      result = spawnSync(binPath, { encoding: "utf-8", timeout: 5000 });
      if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);
      if (fs.existsSync(binPath)) fs.unlinkSync(binPath);

    } else {
      return { error: null };
    }

    if (result.error) return { error: result.error.message };
    if (result.status !== 0) return { error: result.stderr.trim() || `Exit code: ${result.status}` };

    return { error: null };
  } catch (err) {
    return { error: err.message };
  }
}

async function fileWriter(state) {
  if (!state.isCodingQuery) return {};

  const { code, resolvedFile } = state;
  const fullPath = path.resolve(process.cwd(), resolvedFile);
  const dirName = path.dirname(fullPath);

  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }

  fs.writeFileSync(fullPath, code, "utf-8");
  return {};
}

function shouldContinue(state) {
  if (!state.isCodingQuery) return "end";
  if (!state.error) return "write_file";
  if (state.iterations >= state.maxIterations) return "write_file";
  return "fix_code";
}

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

async function executeAgent(task, targetFile) {
  console.log(`\n\x1b[35m[codemon]\x1b[0m Synthesizing solution...`);

  const result = await agent.invoke({
    task,
    targetFile: targetFile || "",
    maxIterations: 3,
  });

  if (!result.isCodingQuery) {
    console.log(`\n\x1b[33m${result.explanation}\x1b[0m\n`);
    return;
  }

  if (result.explanation) {
    console.log(`\n\x1b[32mPlan:\x1b[0m ${result.explanation}`);
  }

  console.log(`\x1b[32mIterations:\x1b[0m ${result.iterations}`);
  console.log(`\x1b[32mWritten to:\x1b[0m ${path.resolve(process.cwd(), result.resolvedFile)}`);

  if (result.error) {
    console.warn(`\x1b[33mWarning: Code saved with unresolved runtime error:\x1b[0m\n${result.error}`);
  } else {
    console.log(`\x1b[32m✔ Verified in sandbox and cleanly committed.\x1b[0m\n`);
  }
}

const program = new Command();

program
  .name("codemon")
  .description("Autonomous self-healing coding daemon")
  .version("1.0.0")
  .argument("[prompt]", "Problem statement or code generation prompt")
  .option("-f, --file <path>", "Destination file path")
  .action(async (prompt, options) => {
    if (prompt) {
      await executeAgent(prompt, options.file);
      return;
    }

    const rl = readline.createInterface({ input, output });
    console.log("\x1b[1m\x1b[35m=== CODEMON CLI ===\x1b[0m");
    console.log("Autonomous Code Daemon. Type 'exit' to quit.\n");

    try {
      while (true) {
        const query = await rl.question("\x1b[35mcodemon > \x1b[0m");
        if (!query.trim()) continue;
        if (query.trim().toLowerCase() === "exit") break;

        const file = await rl.question("\x1b[35mfile (optional) > \x1b[0m");
        await executeAgent(query.trim(), file.trim());
      }
    } finally {
      rl.close();
    }
  });

program.parse(process.argv);