"use client";
import { Input } from "./ui/input";
import { useChat } from "ai/react";
import { Button } from "./ui/button";
import { Send } from "lucide-react";
import MessageList from "./MessageList";
import React from "react";

type Props = { chatId: number };

const ChatComponent = ({ chatId }: Props) => {
  const { input, handleInputChange, handleSubmit, messages } = useChat({
    api: "/api/chat",
    body: {
      chatId,
    },
  });

  // React.useEffect(() => {
  //   const messageContainer = document.getElementById("message_container");
  //   if (messageContainer) {
  //     messageContainer.scrollTo({
  //       top: messageContainer.scrollHeight,
  //       behavior: "smooth",
  //     });
  //   }
  // }, [messages]);

  return (
    <div
      className="relative max-h-screen overflow-scroll"
      id="message_container"
    >
      <div className="sticky top-0 inset-x-0 p-2 bg-white h-fit">
        <h3 className="text-xl font-bold">Chat</h3>
      </div>

      {/*chat messages*/}
      <MessageList messages={messages} />

      <form onSubmit={handleSubmit} className="sticky inset-x-0 px-2 bg-white">
        <div className="flex">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question..."
            className="w-full"
          />
          <Button className="bg-blue-800 ml-2">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatComponent;
