# Personal AI Agent Dashboard

A private AI workspace for planning projects, saving chat history, keeping local memory, and preparing stronger AI agent demos for future competitions.

## Highlights

- Dashboard layout with saved chats, quick actions, workspace metrics, and local memory.
- Persistent chat sessions stored in browser `localStorage`.
- Saved memory notes are sent with each `/api/chat` request.
- Gemini calls go through `api/chat.js`, so the API key is not exposed in browser code.
- The same app can be polished into a competition demo by editing `src/data/agentProfile.js`.

## Setup

Install dependencies:

```bash
npm.cmd install
```

Create `.env` from the example:

```bash
copy .env.example .env
```

Set your private key:

```env
GEMINI_API_KEY=your-google-ai-studio-key
GEMINI_MODEL=gemini-3.1-flash-lite
```

For Vercel, add `GEMINI_API_KEY` and `GEMINI_MODEL` in Project Settings -> Environment Variables.

## Local Development

```bash
npm.cmd run dev
```

Vite runs a local `/api/chat` middleware that uses the same handler as the Vercel function.

## What To Customize

- Edit `src/data/agentProfile.js` with your real background, goals, tools, and project notes.
- Use the dashboard memory box for temporary local context.
- Use saved chat sessions to keep project planning, competition prep, and drafts separated.

## Verification

```bash
npm.cmd run lint
npm.cmd run build
```

Keep `.env` private. Never commit real API keys in `.env.example`, README files, screenshots, or chat messages.
