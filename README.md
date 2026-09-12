# LangGraph Learning Journey

![Node.js](https://img.shields.io/badge/Node.js-Project-43853D?logo=node.js&logoColor=white)
![Focus](https://img.shields.io/badge/Focus-LangGraph%20%26%20Agentic%20AI-1F6FEB)
![Status](https://img.shields.io/badge/Status-Learning%20in%20Public-F59E0B)

This repository documents my practical learning journey in **LangGraph.js** and **Agentic AI**—tracking my progression from foundational sequential chains to autonomous, self-healing agents.

## Project Purpose

I am using this repo to:
- Understand graph-based orchestration for LLM applications using LangGraph.js
- Learn workflow design patterns (linear chains, branching, cycles, and conditional edges)
- Explore agentic patterns: planning, reflection, self-correction, and tool execution
- Build real-world, reusable JavaScript agent implementations and developer tooling

## Learning Roadmap

- [x] **Foundation:** Sequential workflows, prompt chaining, and token streaming
- [x] **Intermediate (Cycles & State):** State management (`Annotation.Root`), conditional branching, and self-healing loops
- [x] **Practical Agent Building:** Building autonomous execution agents with sandboxed runtime verification (**Codemon**)
- [ ] **Advanced:** Context retrieval (RAG / AST repo analysis), session memory (`MemorySaver`), and multi-agent coordination
- [ ] **Production Mindset:** Evaluation, observability, tracing, and sandboxed container execution (Docker)

## Repository Structure

- `Workflows/` - Foundational workflow patterns and linear prompt chains
  - `sequential.js` - Basic sequential node orchestration
  - `LLM_Squential_workflow.js` - Multi-step LLM pipeline
- `Agents/` - Autonomous agent implementations built on LangGraph
  - `Codemon/` - Self-healing code-writing agent featuring a dark-mode Web UI and a global CLI executable
- `package.json` - Project metadata, dependencies, and root scripts
- `.github/workflows/ci.yml` - CI pipeline for push and pull request checks
- `COMMIT_CONVENTION.md` - Commit message style guide

---

## Featured Milestone: Codemon Agent (`Agents/Codemon`)

As part of the intermediate milestone, I built **Codemon**—an autonomous coding daemon powered by LangGraph and Google Gemini (`gemini-2.5-flash`).

### What It Does:
- **Self-Healing Loop:** Implements a closed cyclic graph (`Coder -> Tester -> (Error? Coder : Writer)`).
- **Sandbox Execution:** Tests generated code inside an isolated child-process runtime (`python`, `node`, `g++`). If execution throws an error, the traceback routes back to the model for automatic repair.
- **File System Commits:** Recursively creates missing directories and writes verified code directly to disk.
- **Dual Interface:** Operates via a dark-mode Web IDE UI and a global terminal CLI command (`codemon`).

```bash
# Run Codemon CLI globally
cd Agents/Codemon
npm install
npm link
codemon "Write an LRU cache implementation in JavaScript" -f src/lru.mjs
