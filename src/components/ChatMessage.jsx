import ChatBotIcon from "./ChatBotIcon";

const ChatMessage = ({chat}) => {
  const isBot = chat.role === "model";

  return (
    !chat.hideInChat && (
    <div
      className={`message ${isBot ? "bot" : "user"}-message ${
        chat.isError ? "error" : ""
      } ${chat.isLoading ? "loading" : ""}`}
    >
      {isBot && <ChatBotIcon />}
      <div className="message-content">
        <span className="message-author">{isBot ? "Assistant" : "You"}</span>
        <p className="message-text">{chat.text}</p>
        {chat.isLoading && (
          <span aria-label="Assistant is thinking" className="typing-dots">
            <span />
            <span />
            <span />
          </span>
        )}
      </div>
    </div>
    )
  );
};

export default ChatMessage;
