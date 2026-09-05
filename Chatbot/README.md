# LangGraph Chatbot

This folder contains a command-line chatbot and a simple browser frontend built with **LangGraph** and **Google Gemini**.

## What It Demonstrates

- Creating a LangGraph state with a `messages` history
- Sending conversation messages to an LLM node
- Using SQLite-compatible Turso/libSQL for durable conversation persistence
- Browsing previous conversations grouped by date
- Tracing requests with LangSmith
- Building an interactive Node.js CLI with `readline`

The browser version is deployment-ready for Vercel. Gemini, Turso, and LangSmith credentials stay on the serverless function and are never exposed in frontend code.

## My LangGraph Learning Journey

I am building this chatbot to learn LangGraph concepts through practice instead of only reading about them.

### August 28, 2026 - Started Persistence

Today I started learning **persistence in LangGraph**. I am learning how a graph saves its state and continues a conversation using checkpoints and a `thread_id`.

Conversation messages are stored in a persistent SQLite-compatible Turso database, so they survive Vercel function restarts and can be reopened from the history sidebar.

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
- `api/conversations.js` - Conversation history API
- `api/conversation.js` - Single conversation API
- `api/_db.js` - Turso/libSQL schema and persistence
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

For the Vercel-ready web app, also configure a Turso database and LangSmith project:

```env
GEMINI_API_KEY=your_api_key_here
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_api_key
LANGCHAIN_PROJECT=langgraph-chatbot
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
```

The application creates its tables automatically on the first API request.

Keep the `.env` file private. It is excluded from git.

For the web app, create `.env` inside this `Chatbot` folder when running locally:

```env
GEMINI_API_KEY=your_api_key_here
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_api_key
LANGCHAIN_PROJECT=langgraph-chatbot
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
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
User input -> LangGraph stream -> Gemini response -> Turso conversation record -> LangSmith trace
```

Each browser conversation receives a UUID and can be reopened from the dated history sidebar.

## File

- `LLM_chatbot.js` - Interactive LangGraph chatbot with Gemini and checkpoint memory

## Deploy On Vercel

1. Import this GitHub repository into Vercel.
2. Set the Vercel **Root Directory** to `Chatbot`.
3. Keep the framework preset as **Other**.
4. Add `GEMINI_API_KEY`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`, and `LANGCHAIN_ENDPOINT` in Vercel Project Settings > Environment Variables.
5. Deploy. Vercel serves `public/index.html` and the API functions under `/api`.

The root directory setting is required because `Chatbot/` contains the complete deployment: frontend, serverless API, Vercel config, and package manifest.
