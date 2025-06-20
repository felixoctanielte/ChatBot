import React, { useRef } from "react";

const ChatForm = ({chatHistory, setChatHistory, generateBotResponse}) => {
    const inputRef = useRef();

    const handleFormSubmit = (e) => {
        e.preventDefault(); // perbaikan di sini
        const userMessage = inputRef.current.value.trim();
        if (!userMessage) return;

        inputRef.current.value = "";
        //Update chat history with the  user's message
        setChatHistory((history) => [...history, { role: "user", text: userMessage }]);
        //Add a "Thinking..."  placeholder for the  bot's response
        setTimeout(() =>  setChatHistory((history) => [...history, { role: "model", text: "Thinking..." }]), 600);
        //call the function to generate the bot's response with connect companyinfo
      //  generateBotResponse([...chatHistory,{ role: "user", text: `Using  the details  provided above, please address this query:  ${userMessage}` }]);
        generateBotResponse([...chatHistory,{ role: "user", text: userMessage }]);
    };

    return (
        <form action="#" className="chat-form" onSubmit={handleFormSubmit}>
            <input
                ref={inputRef}
                type="text"
                placeholder="Message... "
                className="message-input"
                minLength={1}
                required
            />
            <button type="submit" className="material-symbols-rounded">
                arrow_upward
            </button>
        </form>
    );
};

export default ChatForm;
