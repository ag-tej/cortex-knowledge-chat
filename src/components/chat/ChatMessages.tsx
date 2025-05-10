
import React, { useEffect, useRef } from "react";
import { useChat, Message } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

export const ChatMessages: React.FC = () => {
  const { currentChat, isLoading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scroll to bottom when messages change or when loading state changes
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages, isLoading]);
  
  if (!currentChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <h3 className="text-2xl font-semibold mb-2">Welcome to RAG Chatbot</h3>
        <p className="text-muted-foreground max-w-md">
          Start by creating a new chat. You can ask questions and upload documents or websites for context-aware responses.
        </p>
      </div>
    );
  }
  
  return (
    <ScrollArea className="flex-1 p-4 chat-container">
      <div className="max-w-3xl mx-auto">
        {currentChat.messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p>No messages yet. Start by sending a message or uploading documents.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {currentChat.messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>
        )}
        
        {isLoading && (
          <div className="flex items-start gap-3 animate-pulse mt-6">
            <Avatar className="h-8 w-8 bg-primary/80">
              <span className="text-xs font-bold">AI</span>
            </Avatar>
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-1/6 mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3 mb-1"></div>
              <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  
  if (isSystem) {
    return (
      <div className="bg-muted/50 border border-border rounded-md p-3 text-sm text-muted-foreground max-w-2xl mx-auto">
        {message.content}
      </div>
    );
  }
  
  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <Avatar className={cn(
        "h-8 w-8", 
        isUser ? "bg-secondary" : "bg-primary"
      )}>
        <span className="text-xs font-bold">{isUser ? "You" : "AI"}</span>
      </Avatar>
      
      <div className={cn(
        "rounded-lg p-3 max-w-[85%]",
        isUser ? "bg-secondary text-secondary-foreground" : "bg-card border border-border"
      )}>
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
};
