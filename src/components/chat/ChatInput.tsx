import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendIcon } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";

export const ChatInput: React.FC = () => {
  const { sendMessage, isLoading, currentChat } = useChat();
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || isLoading || !currentChat) return;

    const messageToSend = message;
    setMessage("");

    await sendMessage(messageToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-border">
      <div className="max-w-3xl mx-auto">
        <div className="relative">
          <Textarea
            placeholder="Ask a question or type '/' for commands..."
            className={cn("resize-none pr-12 min-h-[60px] max-h-[200px]", !currentChat && "opacity-50")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!currentChat || isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-2 bottom-2"
            disabled={!message.trim() || isLoading || !currentChat}
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          The AI assistant is powered by LLaMA and provides answers based on uploaded documents and websites.
        </p>
      </div>
    </form>
  );
};
