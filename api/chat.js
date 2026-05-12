import { agentProfileContext } from "../src/data/agentProfile.js";

const MAX_MESSAGES = 14;
const MAX_TOTAL_CHARS = 7000;
const MAX_MESSAGE_CHARS = 1400;
const MAX_MEMORY_CHARS = 1600;
const MODEL_REQUEST_TIMEOUT_MS = 25000;
const DEFAULT_MODEL = "meta-llama/llama-3.3-8b-instruct:free";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const sendJson = (response, statusCode, payload) => {
  response.status(statusCode).json(payload);
};

const readBody = (request) => {
  if (!request.body) {
    return {};
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }

  return request.body;
};

const cleanMessages = (messages) => {
  if (!Array.isArray(messages)) {
    throw new Error("Messages must be an array.");
  }

  const cleaned = messages
    .slice(-MAX_MESSAGES)
    .map((message) => ({
      role: message.role === "model" ? "assistant" : "user",
      text: String(message.text || "").trim().slice(0, MAX_MESSAGE_CHARS),
    }))
    .filter((message) => message.text.length > 0);

  const totalChars = cleaned.reduce(
    (total, message) => total + message.text.length,
    0
  );

  if (!cleaned.some((message) => message.role === "user")) {
    throw new Error("At least one user message is required.");
  }

  if (totalChars > MAX_TOTAL_CHARS) {
    throw new Error("Conversation is too long. Please start a shorter chat.");
  }

  return cleaned;
};

const cleanMemory = (memory) =>
  String(memory || "").trim().slice(0, MAX_MEMORY_CHARS);

const buildSystemPrompt = (memory) =>
  [
    "You are Felix's personal AI agent workspace.",
    "Answer in the same language the user uses unless they ask otherwise.",
    "Use the profile context, saved memory, and current conversation.",
    "Help with planning, project thinking, summaries, drafts, and competition preparation.",
    "Do not invent personal achievements. If details are missing, ask for the missing detail or state the assumption.",
    "Keep answers practical, concise, and action-oriented.",
    "",
    "PROFILE CONTEXT:",
    agentProfileContext,
    "",
    "USER-SAVED LOCAL MEMORY:",
    memory || "No saved memory yet.",
  ].join("\n");

const buildOpenRouterMessages = (messages, memory) => [
  { role: "system", content: buildSystemPrompt(memory) },
  ...messages.map((message) => ({
    role: message.role,
    content: message.text,
  })),
];

const extractModelText = (data) => {
  return data?.choices?.[0]?.message?.content?.trim() || "";
};

const getProviderErrorMessage = (statusCode, data) => {
  const providerMessage = data?.error?.message || "";

  if (statusCode === 429) {
    return "Rate limit reached for this API key. Check your OpenRouter usage or upgrade your plan at openrouter.ai.";
  }

  if (statusCode === 401 || /invalid api key/i.test(providerMessage)) {
    return "OpenRouter API key is not valid. Copy a fresh key from openrouter.ai/settings/keys and update OPENROUTER_API_KEY.";
  }

  if (statusCode === 403) {
    return "OpenRouter rejected this API key or you don't have access to the selected model.";
  }

  if (statusCode === 404) {
    return "OpenRouter could not find the selected model. Check OPENROUTER_MODEL environment variable.";
  }

  if (statusCode === 400) {
    return "OpenRouter rejected the request payload. Please try a shorter message or check the model configuration.";
  }

  return "The model service could not complete this request. Please try again.";
};

const getApiKey = () => process.env.OPENROUTER_API_KEY?.trim() || "";

const getModel = () =>
  process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { error: "Only POST requests are allowed." });
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    return sendJson(response, 500, {
      error:
        "Server configuration is missing. Add OPENROUTER_API_KEY in environment variables.",
    });
  }

  let messages;
  let memory;

  try {
    const body = readBody(request);
    messages = cleanMessages(body.messages);
    memory = cleanMemory(body.memory);
  } catch (error) {
    return sendJson(response, 400, {
      error: error.message || "Invalid chat request.",
    });
  }

  let timeoutId;

  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => {
      controller.abort();
    }, MODEL_REQUEST_TIMEOUT_MS);

    const modelResponse = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.SITE_URL || "https://localhost",
        "X-Title": "Felix AI Agent",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: getModel(),
        messages: buildOpenRouterMessages(messages, memory),
      }),
    });

    clearTimeout(timeoutId);

    const data = await modelResponse.json().catch(() => ({}));

    if (!modelResponse.ok) {
      return sendJson(response, modelResponse.status === 429 ? 429 : 502, {
        error: getProviderErrorMessage(modelResponse.status, data),
      });
    }

    const text = extractModelText(data);

    if (!text) {
      return sendJson(response, 502, {
        error: "The model returned an empty response. Please try again.",
      });
    }

    return sendJson(response, 200, { text });
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (error.name === "AbortError") {
      return sendJson(response, 504, {
        error:
          "OpenRouter took too long to respond. Please try again or check the model/API key configuration.",
      });
    }

    return sendJson(response, 502, {
      error:
        "The assistant is temporarily unavailable. Please check the server configuration and try again.",
    });
  }
}
