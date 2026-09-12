# LangGraph Learning Lab & Agentic AI

![Node.js](https://img.shields.io/badge/Node.js-18%2B-43853D?logo=node.js&logoColor=white)
![LangGraph.js](https://img.shields.io/badge/LangGraph.js-Orchestration-1F6FEB)
![Gemini API](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-8E75B2?logo=google&logoColor=white)
![Status](https://img.shields.io/badge/Status-Active%20Development-F59E0B)

This repository documents my hands-on journey exploring **LangGraph.js**, state machines, and **Agentic AI** design patterns—moving from foundational sequential prompt chains to autonomous, self-healing coding agents.

---

## Featured Project: Codemon (Autonomous Coding Daemon)

An autonomous software engineering agent inspired by Cursor and GitHub Copilot Workspace. It synthesizes code, validates runtime execution in an isolated sandbox, automatically resolves errors via feedback loops, and writes clean files to your workspace.

- **Self-Correction Loop:** Uses conditional edges to cycle `Coder -> Tester -> (Error? Coder : Writer)`.
- **Sandbox Testing:** Evaluates scripts locally using isolated child processes (`python`, `node`, `g++`).
- **Workspace File Commits:** Automatically creates nested directory structures (e.g., `src/algorithms/solver.py`) and writes validated code.
- **Dual Interface:** Accessible via a dark-mode Web IDE UI or a global terminal CLI command.

[Explore Codemon Source Code](./Agents/Codemon)

---

## Learning Roadmap

- [x] **Foundation:** Sequential workflows, prompt chaining, and token streaming
- [x] **Full-Stack Agent UI:** Connecting LangGraph execution nodes to real-time browser interfaces
- [x] **Self-Healing Loops:** State management with `Annotation.Root`, child-process sandboxing, and conditional retries
- [x] **Tooling & CLI:** Packaging agents into globally executable developer CLI binaries
- [ ] **Context & Retrieval (RAG):** AST parsing, directory tree ingestion, and repository-wide context
- [ ] **Persistence & Memory:** Thread management, checkpointing, and session retention via `MemorySaver`
- [ ] **Multi-Agent Coordination:** Supervisor and worker patterns for complex refactoring

---

## Repository Structure

```text
├── Agents/
│   └── Codemon/            # Autonomous code-writing & self-healing agent (CLI + Web UI)
│       ├── cli.mjs         # Global executable CLI entry point
│       ├── server.js       # Backend Express API & LangGraph runner
│       ├── public/         # Dark-mode IDE frontend (index.html)
│       └── package.json
├── Workflows/              # Foundational LangGraph workflow experiments
│   ├── sequential.js       # Basic node-to-node sequential flow
│   └── LLM_Squential_workflow.js
├── .github/workflows/ci.yml# CI pipeline
├── COMMIT_CONVENTION.md    # Commit message standards
└── package.json            # Root configuration
