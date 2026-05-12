export const agentProfile = {
  name: "Felix",
  role: "Personal AI Agent Builder",
  headline:
    "A private AI workspace for planning projects, saving context, and preparing stronger agent demos for future competitions.",
  status: "Local memory and chat history enabled",
  location: "Indonesia",
  summary:
    "This project is a personal AI agent dashboard. It combines a chat interface, saved local memory, persistent conversation history, quick task actions, server-side model access, and a dashboard that can later be refined into a competition-ready demo.",
  stats: [
    { label: "Workspace", value: "Personal agent" },
    { label: "Storage", value: "Local history" },
    { label: "Model", value: "Gemini proxy" },
  ],
  capabilities: [
    {
      icon: "database",
      title: "Saved Context",
      detail:
        "Memory notes are saved locally and included with every request so the agent can use your current goals and project details.",
    },
    {
      icon: "task_alt",
      title: "Task Actions",
      detail:
        "Quick actions turn common workflows into one-click prompts for planning, summarizing, drafting, and competition preparation.",
    },
    {
      icon: "history",
      title: "Conversation Memory",
      detail:
        "Chat sessions are saved in the browser, searchable from the sidebar, and reusable across work sessions.",
    },
    {
      icon: "shield_lock",
      title: "Backend Proxy",
      detail:
        "The browser calls a local/Vercel API route so the Gemini key stays out of client-side code.",
    },
    {
      icon: "error",
      title: "Failure Handling",
      detail:
        "The app validates input, shows loading/error states, and explains model or API configuration problems clearly.",
    },
    {
      icon: "workspace_premium",
      title: "Competition Ready",
      detail:
        "The same workspace can be used to prepare a pitch, polish an agent project, and demonstrate prior AI agent experience.",
    },
  ],
  evidence: [
    "Built a React/Vite agent dashboard with responsive desktop and mobile states.",
    "Added persistent chat sessions using browser localStorage.",
    "Added local memory notes that are sent to the server-side agent proxy.",
    "Moved Gemini access behind a local/Vercel API route for safer deployment.",
  ],
  architecture: [
    {
      title: "Workspace Input",
      detail: "Felix writes a message, opens a saved chat, or runs a quick action.",
    },
    {
      title: "React Chat UI",
      detail:
        "The interface manages sessions, local memory, loading status, and message rendering.",
    },
    {
      title: "Local/Vercel API Route",
      detail:
        "The frontend sends normalized messages and saved memory to /api/chat, keeping secret configuration server-side.",
    },
    {
      title: "Grounded Model Call",
      detail:
        "The API injects profile context and forwards a Gemini-compatible request to the configured model endpoint.",
    },
  ],
  tools: [
    "React 19",
    "Vite",
    "Vercel Serverless Functions",
    "Gemini-compatible API payloads",
    "localStorage",
    "ESLint",
    "Responsive CSS",
  ],
  evaluationPrompts: [
    "Turn my current idea into a 3-step project plan.",
    "Summarize this chat into next actions.",
    "Draft a short competition pitch for this AI agent project.",
    "Review the current limitations of this dashboard.",
    "Suggest what I should build next to make this feel more agentic.",
  ],
  limitations: [
    "Saved chat history and memory are local to the browser, not synced across devices.",
    "The current version does not include authentication, file upload, vector retrieval, or external tool calling.",
    "The assistant should not invent achievements that are not present in the profile or saved memory.",
  ],
  pitch:
    "This project gives Felix a practical AI agent workspace: a dashboard for saved context, persistent chat sessions, planning workflows, and a secure Gemini proxy that can later become a competition demo.",
};

export const quickPrompts = [
  {
    icon: "route",
    label: "Plan",
    hint: "Break an idea into milestones",
    prompt: "Turn my current idea into a 3-step project plan with clear next actions.",
  },
  {
    icon: "summarize",
    label: "Summarize",
    hint: "Capture the active thread",
    prompt: "Summarize this chat into decisions, open questions, and next actions.",
  },
  {
    icon: "campaign",
    label: "Pitch",
    hint: "Shape it for a future competition",
    prompt: "Draft a short competition pitch for this personal AI agent dashboard.",
  },
  {
    icon: "psychology_alt",
    label: "Improve",
    hint: "Find the strongest next upgrade",
    prompt: "Review this dashboard like an AI agent project and suggest the highest-impact next improvement.",
  },
];

export const buildAgentProfileContext = (profile = agentProfile) => `
Name: ${profile.name}
Role: ${profile.role}
Location: ${profile.location}
Status: ${profile.status}
Headline: ${profile.headline}

Summary:
${profile.summary}

Evidence:
${profile.evidence.map((item) => `- ${item}`).join("\n")}

Agentic Capabilities:
${profile.capabilities
  .map((item) => `- ${item.title}: ${item.detail}`)
  .join("\n")}

Architecture:
${profile.architecture
  .map((item, index) => `${index + 1}. ${item.title}: ${item.detail}`)
  .join("\n")}

Tools:
${profile.tools.map((item) => `- ${item}`).join("\n")}

Evaluation Prompts:
${profile.evaluationPrompts.map((item) => `- ${item}`).join("\n")}

Known Limitations:
${profile.limitations.map((item) => `- ${item}`).join("\n")}

Reviewer Pitch:
${profile.pitch}
`.trim();

export const agentProfileContext = buildAgentProfileContext();
