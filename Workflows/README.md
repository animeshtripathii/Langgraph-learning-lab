# Workflows

This folder contains workflow implementations from my LangGraph and Agentic AI learning practice.

## Available Files

| File | Purpose | Level |
|---|---|---|
| `LLM_conditionalWorkflow.js` | Classifies a review as positive or negative, then sends thanks or diagnoses the problem | Intermediate |
| `LLM_parallel_workflow.js` | Parallel LLM essay review pipeline with clarity, depth, language scoring, and final summary | Intermediate |
| `LLM_Squential_workflow.js` | Sequential flow driven by LLM reasoning steps | Intermediate |
| `conditionalWorkflow.js` | Calculates a quadratic discriminant and routes to two roots, one root, or no real roots | Beginner |
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

```bash
node Workflows/conditionalWorkflow.js
```

```bash
node Workflows/LLM_conditionalWorkflow.js
```

For LLM-based workflows, set `GOOGLE_API_KEY` in your `.env` file before running.

## What These Workflows Demonstrate

- Ordered, step-by-step orchestration
- Conditional routing based on calculated values or LLM classification
- Multiple possible paths that converge at workflow completion
- Separation of flow logic from execution intent
- Early foundations for agentic pipeline design

## Workflow Upgrade Plan

- Add more branching paths based on runtime conditions
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
