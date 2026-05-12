import { useState } from "react";

const ChatForm = ({ isLoading, onSubmit }) => {
  const [message, setMessage] = useState("");
  const canSubmit = message.trim().length > 0 && !isLoading;

  const handleFormSubmit = (event) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit(message);
    setMessage("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleFormSubmit(event);
    }
  };

  return (
    <form className="chat-form" onSubmit={handleFormSubmit}>
      <textarea
        aria-label="Ask the personal AI agent"
        className="message-input"
        disabled={isLoading}
        maxLength={1200}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask the agent to plan, summarize, draft, or remember..."
        rows={1}
        value={message}
      />
      <button
        aria-label="Send message"
        className="material-symbols-rounded"
        disabled={!canSubmit}
        title="Send message"
        type="submit"
      >
        arrow_upward
      </button>
    </form>
  );
};

export default ChatForm;
