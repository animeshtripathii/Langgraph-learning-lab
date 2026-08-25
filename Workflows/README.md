# Workflows

This folder contains workflow implementations from my LangGraph and Agentic AI learning practice.

## Available Files

| File | Purpose | Level |
|---|---|---|
| `LLM_parallel_workflow.js` | Parallel LLM essay review pipeline with clarity, depth, language scoring, and final summary | Intermediate |
| `LLM_Squential_workflow.js` | Sequential flow driven by LLM reasoning steps | Intermediate |
| `paralleWorkflow.js` | Non-LLM parallel stats workflow (strike rate, boundary metrics, combined summary) | Beginner |
| `sequential.js` | Basic sequential execution flow for core understanding | Beginner |

## How To Run

From the project root:

```bash
node Workflows/sequential.js
```

```bash
node Workflows/LLM_Squential_workflow.js
```

```bash
node Workflows/paralleWorkflow.js
```

```bash
node Workflows/LLM_parallel_workflow.js
```

For LLM-based workflows, set `GOOGLE_API_KEY` in your `.env` file before running.

## What These Workflows Demonstrate

- Ordered, step-by-step orchestration
- Separation of flow logic from execution intent
- Early foundations for agentic pipeline design

## Workflow Upgrade Plan

- Add branching paths based on runtime conditions
- Add state tracking between nodes/steps
- Add error handling and fallback steps
- Add reusable utility helpers across workflows

## Workflow Learning Log Template

### Entry
- File worked on:
- Objective:
- Changes made:
- Output observed:
- What I learned:
- What to improve next:
