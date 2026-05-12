import { useEffect, useMemo, useRef, useState } from "react";
import ChatBotIcon from "./components/ChatBotIcon";
import ChatForm from "./components/ChatForm";
import ChatMessage from "./components/ChatMessage";
import { agentProfile, quickPrompts } from "./data/agentProfile";

const STORAGE_KEYS = {
  sessions: "felix-agent-sessions",
  activeSessionId: "felix-agent-active-session",
  memory: "felix-agent-memory",
};

const FRONTEND_REQUEST_TIMEOUT_MS = 20000;

const welcomeMessage = {
  role: "model",
  text: "Hi Felix, I am your personal AI agent workspace. Start a chat, save context in memory, or use a quick action to plan the next move.",
  localOnly: true,
};

const nowIso = () => new Date().toISOString();

const createSessionTitle = (message = "") => {
  const cleaned = message.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "New conversation";
  }

  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}...` : cleaned;
};

const createSession = (title = "New conversation") => ({
  id: `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title,
  createdAt: nowIso(),
  updatedAt: nowIso(),
  messages: [welcomeMessage],
});

const loadJson = (key, fallback) => {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const saveJson = (key, value) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
};

const sanitizeSession = (session) => {
  const messages = Array.isArray(session.messages)
    ? session.messages.filter((message) => message && !message.isLoading)
    : [];

  return {
    id: session.id || `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: session.title || "New conversation",
    createdAt: session.createdAt || nowIso(),
    updatedAt: session.updatedAt || session.createdAt || nowIso(),
    messages: messages.length > 0 ? messages : [welcomeMessage],
  };
};

const sanitizeSessions = (sessions, fallbackSession) => {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return [fallbackSession];
  }

  const sanitizedSessions = sessions
    .filter((session) => session && typeof session === "object")
    .map(sanitizeSession);

  return sanitizedSessions.length > 0 ? sanitizedSessions : [fallbackSession];
};

const formatSessionTime = (value) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const getApiMessages = (messages) =>
  messages
    .filter((message) => !message.localOnly && !message.isLoading)
    .map(({ role, text }) => ({ role, text }));

const getSessionPreview = (session) => {
  const lastUserMessage = [...session.messages]
    .reverse()
    .find((message) => message.role === "user");

  return lastUserMessage?.text || "Ready for a new task";
};

const getSessionMessageCount = (session) =>
  session.messages.filter((message) => !message.localOnly && !message.isLoading)
    .length;

const App = () => {
  const initialSession = useMemo(() => createSession(), []);
  const fallbackMessages = useMemo(() => [welcomeMessage], []);
  const [sessions, setSessions] = useState(() => {
    const storedSessions = loadJson(STORAGE_KEYS.sessions, null);
    return sanitizeSessions(storedSessions, initialSession);
  });
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const storedId =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEYS.activeSessionId)
        : null;
    return storedId || initialSession.id;
  });
  const [memoryNotes, setMemoryNotes] = useState(() =>
    typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_KEYS.memory) ||
        "Felix is building a personal AI agent dashboard that can later be used as proof for AI agent competitions."
      : ""
  );
  const [sessionSearch, setSessionSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatBodyRef = useRef(null);

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) || sessions[0];
  const chatHistory = activeSession?.messages || fallbackMessages;

  useEffect(() => {
    setSessions((currentSessions) => sanitizeSessions(currentSessions, initialSession));
  }, [initialSession]);

  const dashboardStats = useMemo(() => {
    const messageCount = sessions.reduce(
      (total, session) => total + getSessionMessageCount(session),
      0
    );

    return [
      { label: "Saved chats", value: sessions.length },
      { label: "Messages", value: messageCount },
      { label: "Memory chars", value: memoryNotes.trim().length },
    ];
  }, [memoryNotes, sessions]);

  const filteredSessions = useMemo(() => {
    const search = sessionSearch.trim().toLowerCase();

    return [...sessions]
      .sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt))
      .filter((session) => {
        if (!search) {
          return true;
        }

        return `${session.title} ${getSessionPreview(session)}`
          .toLowerCase()
          .includes(search);
      });
  }, [sessionSearch, sessions]);

  const recentSessions = filteredSessions.slice(0, 5);

  const updateActiveSession = (updater) => {
    setSessions((currentSessions) =>
      currentSessions.map((session) => {
        if (session.id !== activeSession.id) {
          return session;
        }

        const nextSession = updater(session);

        return {
          ...nextSession,
          updatedAt: nowIso(),
        };
      })
    );
  };

  const createNewSession = () => {
    if (isLoading) {
      return;
    }

    const session = createSession();
    setSessions((currentSessions) => [session, ...currentSessions]);
    setActiveSessionId(session.id);
    setIsChatOpen(true);
  };

  const deleteSession = (sessionId) => {
    if (isLoading) {
      return;
    }

    setSessions((currentSessions) => {
      const remainingSessions = currentSessions.filter(
        (session) => session.id !== sessionId
      );

      if (remainingSessions.length === 0) {
        const session = createSession();
        setActiveSessionId(session.id);
        return [session];
      }

      if (sessionId === activeSessionId) {
        setActiveSessionId(remainingSessions[0].id);
      }

      return remainingSessions;
    });
  };

  const resetActiveSession = () => {
    if (isLoading) {
      return;
    }

    updateActiveSession((session) => ({
      ...session,
      title: "New conversation",
      messages: [welcomeMessage],
    }));
  };

  const submitMessage = async (message) => {
    const userMessage = message.trim();

    if (!userMessage || isLoading || !activeSession) {
      return;
    }

    const nextMessages = [...chatHistory, { role: "user", text: userMessage }];
    const loadingMessages = [
      ...nextMessages,
      {
        role: "model",
        text: "Thinking with your saved workspace context...",
        isLoading: true,
      },
    ];

    updateActiveSession((session) => ({
      ...session,
      title:
        session.title === "New conversation"
          ? createSessionTitle(userMessage)
          : session.title,
      messages: loadingMessages,
    }));
    setIsLoading(true);
    setIsChatOpen(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, FRONTEND_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          memory: memoryNotes,
          messages: getApiMessages(nextMessages),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "The assistant could not respond.");
      }

      updateActiveSession((session) => ({
        ...session,
        messages: [
          ...nextMessages,
          {
            role: "model",
            text:
              data.text ||
              "I did not receive a usable response. Please try a shorter question.",
          },
        ],
      }));
    } catch (error) {
      const errorText =
        error.name === "AbortError"
          ? "The assistant took too long to respond. Please try again with a shorter message or check the Gemini API status."
          : error.message ||
            "The assistant is unavailable. Please check the server setup.";

      updateActiveSession((session) => ({
        ...session,
        messages: [
          ...nextMessages,
          {
            role: "model",
            text: errorText,
            isError: true,
          },
        ],
      }));
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const copyTranscript = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    const transcript = chatHistory
      .filter((message) => !message.localOnly && !message.isLoading)
      .map((message) => `${message.role === "model" ? "Assistant" : "You"}: ${message.text}`)
      .join("\n\n");

    await navigator.clipboard.writeText(transcript || "No saved messages yet.");
  };

  useEffect(() => {
    saveJson(
      STORAGE_KEYS.sessions,
      sessions.map((session) => ({
        ...session,
        messages: session.messages.filter((message) => !message.isLoading),
      }))
    );
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.activeSessionId, activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.memory, memoryNotes);
    }
  }, [memoryNotes]);

  useEffect(() => {
    chatBodyRef.current?.scrollTo({
      top: chatBodyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatHistory]);

  return (
    <main className={`agent-dashboard ${isChatOpen ? "chat-open" : ""}`}>
      <aside className="history-sidebar" aria-label="Saved chat history">
        <div className="brand-block">
          <div className="brand-mark">
            <ChatBotIcon />
          </div>
          <div>
            <p className="brand-kicker">Personal workspace</p>
            <h1>Agent OS</h1>
          </div>
        </div>

        <button className="new-chat-button" onClick={createNewSession} type="button">
          <span className="material-symbols-rounded">add</span>
          New chat
        </button>

        <label className="session-search">
          <span className="material-symbols-rounded">search</span>
          <input
            aria-label="Search saved chats"
            onChange={(event) => setSessionSearch(event.target.value)}
            placeholder="Search history"
            type="search"
            value={sessionSearch}
          />
        </label>

        <div className="session-list" role="list">
          {filteredSessions.map((session) => (
            <article
              className={`session-item ${
                session.id === activeSession.id ? "active" : ""
              }`}
              key={session.id}
              role="listitem"
            >
              <button
                className="session-main"
                onClick={() => {
                  setActiveSessionId(session.id);
                  setIsChatOpen(true);
                }}
                type="button"
              >
                <strong>{session.title}</strong>
                <span>{getSessionPreview(session)}</span>
                <small>
                  {formatSessionTime(session.updatedAt)} -{" "}
                  {getSessionMessageCount(session)} messages
                </small>
              </button>
              <button
                aria-label={`Delete ${session.title}`}
                className="session-delete material-symbols-rounded"
                disabled={isLoading}
                onClick={() => deleteSession(session.id)}
                title="Delete chat"
                type="button"
              >
                delete
              </button>
            </article>
          ))}
        </div>
      </aside>

      <section className="workspace-panel" aria-label="Agent dashboard">
        <header className="workspace-header">
          <div>
            <p className="eyebrow-row">
              <span className="status-dot" />
              {agentProfile.status}
            </p>
            <h2>Personal AI Agent Dashboard</h2>
            <p>{agentProfile.headline}</p>
          </div>
          <div className="workspace-actions">
            <button className="secondary-button" onClick={copyTranscript} type="button">
              <span className="material-symbols-rounded">content_copy</span>
              Copy transcript
            </button>
            <button className="primary-button" onClick={createNewSession} type="button">
              <span className="material-symbols-rounded">forum</span>
              Start task
            </button>
          </div>
        </header>

        <section className="metric-grid" aria-label="Workspace metrics">
          {dashboardStats.map((stat) => (
            <article className="metric-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </section>

        <section className="workspace-grid">
          <article className="memory-card">
            <div className="section-heading">
              <p className="kicker">Memory</p>
              <h3>Saved Context</h3>
            </div>
            <textarea
              aria-label="Saved memory"
              maxLength={1600}
              onChange={(event) => setMemoryNotes(event.target.value)}
              placeholder="Save your goals, preferences, project details, or competition notes here."
              value={memoryNotes}
            />
            <div className="memory-footer">
              <span>{memoryNotes.trim().length}/1600 chars</span>
              <button
                className="text-button"
                onClick={() => setMemoryNotes("")}
                type="button"
              >
                Clear
              </button>
            </div>
          </article>

          <article className="quick-actions-card">
            <div className="section-heading">
              <p className="kicker">Actions</p>
              <h3>Agent Tasks</h3>
            </div>
            <div className="action-list">
              {quickPrompts.map((item) => (
                <button
                  className="action-button"
                  disabled={isLoading}
                  key={item.label}
                  onClick={() => submitMessage(item.prompt)}
                  type="button"
                >
                  <span className="material-symbols-rounded">{item.icon}</span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          </article>
        </section>

        <section className="workspace-grid lower-grid">
          <article className="capabilities-card">
            <div className="section-heading">
              <p className="kicker">System</p>
              <h3>Agent Capabilities</h3>
            </div>
            <div className="capability-list">
              {agentProfile.capabilities.map((capability) => (
                <div className="capability-row" key={capability.title}>
                  <span className="material-symbols-rounded">{capability.icon}</span>
                  <div>
                    <strong>{capability.title}</strong>
                    <p>{capability.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="recent-card">
            <div className="section-heading">
              <p className="kicker">Activity</p>
              <h3>Recent Chats</h3>
            </div>
            <div className="recent-list">
              {recentSessions.map((session) => (
                <button
                  className="recent-item"
                  key={session.id}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    setIsChatOpen(true);
                  }}
                  type="button"
                >
                  <strong>{session.title}</strong>
                  <span>{formatSessionTime(session.updatedAt)}</span>
                </button>
              ))}
            </div>
          </article>
        </section>
      </section>

      <aside className="chat-panel" aria-label="Personal AI agent chat">
        <div className="chat-header">
          <div className="header-info">
            <ChatBotIcon />
            <div>
              <p>{activeSession?.title || "New conversation"}</p>
              <span>Memory-aware - saved locally</span>
            </div>
          </div>
          <div className="chat-controls">
            <button
              aria-label="Reset active chat"
              className="material-symbols-rounded icon-button"
              disabled={isLoading}
              onClick={resetActiveSession}
              title="Reset chat"
              type="button"
            >
              refresh
            </button>
            <button
              aria-label="Close chat"
              className="material-symbols-rounded icon-button mobile-only"
              onClick={() => setIsChatOpen(false)}
              title="Close chat"
              type="button"
            >
              close
            </button>
          </div>
        </div>

        <div className="quick-prompt-row" aria-label="Quick prompts">
          {quickPrompts.map((item) => (
            <button
              disabled={isLoading}
              key={item.label}
              onClick={() => submitMessage(item.prompt)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div ref={chatBodyRef} className="chat-body">
          {chatHistory.map((chat, index) => (
            <ChatMessage chat={chat} key={`${activeSession?.id}-${index}`} />
          ))}
        </div>

        <div className="chat-footer">
          <ChatForm isLoading={isLoading} onSubmit={submitMessage} />
          <p className="footer-note">
            Active memory is included with each request. Chat history is saved in
            this browser.
          </p>
        </div>
      </aside>

      <button
        aria-label="Open chat"
        className="mobile-chat-toggle material-symbols-rounded"
        onClick={() => setIsChatOpen(true)}
        title="Open chat"
        type="button"
      >
        forum
      </button>
    </main>
  );
};

export default App;
