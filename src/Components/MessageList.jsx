/* eslint-disable react/prop-types */
import { useEffect } from "react";
import MessageItem from "./MessageItem";

function MessageList({ messages = [], messagesEndRef, isLoading }) {
  useEffect(() => {
    messagesEndRef?.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messagesEndRef]);

  return (
    <div className="flex-1 overflow-y-auto overscroll-y-contain bg-[#F8FAFD] p-4 md:p-6">
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-20 w-2/3 animate-pulse rounded-2xl bg-[#E5EAF2]" />
          ))}
        </div>
      ) : messages.length ? (
        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageItem key={msg.id || msg._id} msg={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-center text-sm text-[#667085]">
          No messages in this conversation yet.
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}

export default MessageList;
