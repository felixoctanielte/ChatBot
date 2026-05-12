import { agentProfileContext } from "../src/data/agentProfile.js";

const MAX_MESSAGES = 14;
const MAX_TOTAL_CHARS = 7000;
const MAX_MESSAGE_CHARS = 1400;
const MAX_MEMORY_CHARS = 1600;
const MODEL_REQUEST_TIMEOUT_MS = 25000;
const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash-lite";

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
      role: message.role === "model" ? "model" : "user",
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

const buildGeminiContents = (messages, memory) => [
  {
    role: "user",
    parts: [
      {
        text: [
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
        ].join("\n"),
      },
    ],
  },
  {
    role: "model",
    parts: [
      {
        text: "Understood. I will act as a grounded personal AI agent and avoid unsupported claims.",
      },
    ],
  },
  ...messages.map((message) => ({
    role: message.role,
    parts: [{ text: message.text }],
  })),
];

const extractModelText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();
};

const getProviderErrorMessage = (statusCode, data) => {
  const providerStatus = data?.error?.status;
  const providerMessage = data?.error?.message || "";

  if (statusCode === 429 || providerStatus === "RESOURCE_EXHAUSTED") {
    return "Gemini quota or rate limit was reached for this API key. Check Google AI Studio usage, billing, or try a different key/project.";
  }

  if (/api key not valid/i.test(providerMessage)) {
    return "Gemini says the API key is not valid. Copy a fresh key directly from Google AI Studio and update GEMINI_API_KEY.";
  }

  if (statusCode === 403 || providerStatus === "PERMISSION_DENIED") {
    return "Gemini rejected this API key or project permissions. Check that the key is active and allowed to use the selected model.";
  }

  if (statusCode === 404 || providerStatus === "NOT_FOUND") {
    return "Gemini could not find the selected model endpoint. Check GEMINI_MODEL or GEMINI_API_URL.";
  }

  if (statusCode === 400 || providerStatus === "INVALID_ARGUMENT") {
    return "Gemini rejected the request payload. Please try a shorter message or check the model configuration.";
  }

  return "The model service could not complete this request. Please try again.";
};

const getGeminiEndpoint = () => {
  const configuredUrl = process.env.GEMINI_API_URL?.trim();

  if (configuredUrl?.startsWith("http")) {
    return configuredUrl;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim() || configuredUrl;
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  if (!apiKey) {
    return "";
  }

  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { error: "Only POST requests are allowed." });
  }

  const endpoint = getGeminiEndpoint();

  if (!endpoint) {
    return sendJson(response, 500, {
      error:
        "Server configuration is missing. Add GEMINI_API_KEY or GEMINI_API_URL in environment variables.",
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

    const modelResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ contents: buildGeminiContents(messages, memory) }),
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
          "Gemini took too long to respond. Please try again or check the model/API key configuration.",
      });
    }

    return sendJson(response, 502, {
      error:
        "The assistant is temporarily unavailable. Please check the server configuration and try again.",
    });
  }
}
