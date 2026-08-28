# LangGraph Chatbot

This folder contains a command-line chatbot and a simple browser frontend built with **LangGraph** and **Google Gemini**.

## What It Demonstrates

- Creating a LangGraph state with a `messages` history
- Sending conversation messages to an LLM node
- Using `MemorySaver` for checkpoint-based conversation persistence
- Reusing a `thread_id` to maintain one conversation thread
- Building an interactive Node.js CLI with `readline`

The browser version is deployment-ready for Vercel. The API key stays on the serverless function and is never exposed in frontend code.

## My LangGraph Learning Journey

I am building this chatbot to learn LangGraph concepts through practice instead of only reading about them.

### August 28, 2026 - Started Persistence

Today I started learning **persistence in LangGraph**. I am learning how a graph saves its state and continues a conversation using checkpoints and a `thread_id`.

This chatbot uses `MemorySaver` to practice the concept. The current checkpoints are stored in memory while the application is running.

### Topics I Plan To Learn Next

- Memory and long-term conversation history
- RAG (Retrieval-Augmented Generation)
- Human-in-the-loop workflows
- Streaming responses
- Conditional routing and branching graphs
- Tool calling and external API integration
- Multi-agent workflows
- Durable database-backed persistence
- Graph debugging, tracing, and evaluation

## Web App Files

- `public/index.html` - Browser chat interface
- `public/styles.css` - Responsive styling
- `public/app.js` - Browser message handling
- `api/chat.js` - Vercel serverless LangGraph API
- `vercel.json` - Vercel configuration
- `package.json` - Web app dependencies

## Setup

From the project root, install dependencies:

```bash
npm install
```

Create a `.env` file in the project root and add your Gemini API key:

```env
GEMINI_API_KEY=your_api_key_here
```

Keep the `.env` file private. It is excluded from git.

For the web app, create `.env` inside this `Chatbot` folder when running locally:

```env
GEMINI_API_KEY=your_api_key_here
```

## Run

From the project root:

```bash
node Chatbot/LLM_chatbot.js
```

Then type a message at the `You:` prompt. The chatbot responds through the LangGraph workflow.

### Run the browser version locally

From the project root:

```bash
cd Chatbot
npm install
npx vercel dev
```

Open the local URL shown by Vercel.

## Exit

Type any of these commands to stop the chatbot:

```text
exit
bye
quit
```

## Implementation Flow

```text
User input -> HumanMessage -> chat_node -> Gemini response -> MemorySaver checkpoint
```

The current configuration uses the `user-1` thread. A different `thread_id` can be used to keep separate conversation histories.

## File

- `LLM_chatbot.js` - Interactive LangGraph chatbot with Gemini and checkpoint memory

## Future Improvements

- Accept a thread ID from the user or command line
- Add streaming responses
- Add error handling for missing API keys and failed requests
- Add persistent storage beyond in-memory checkpoints

## Deploy On Vercel

1. Import this GitHub repository into Vercel.
2. Set the Vercel **Root Directory** to `Chatbot`.
3. Keep the framework preset as **Other**.
4. Add `GEMINI_API_KEY` in Vercel Project Settings > Environment Variables.
5. Deploy. Vercel serves `public/index.html` and the `/api/chat` function.

The root directory setting is required because `Chatbot/` contains the complete deployment: frontend, serverless API, Vercel config, and package manifest.
