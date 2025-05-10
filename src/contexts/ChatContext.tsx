
import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  isLoading: boolean;
  uploadingFiles: boolean;
  processingFiles: boolean;
  setCurrentChat: (chat: Chat) => void;
  createChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, newTitle: string) => void;
  uploadDocuments: (files: File[]) => Promise<void>;
  addWebsites: (urls: string[]) => Promise<void>;
}

const ChatContext = createContext<ChatContextType>({
  chats: [],
  currentChat: null,
  isLoading: false,
  uploadingFiles: false,
  processingFiles: false,
  setCurrentChat: () => {},
  createChat: () => {},
  sendMessage: async () => {},
  deleteChat: () => {},
  renameChat: () => {},
  uploadDocuments: async () => {},
  addWebsites: async () => {},
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);

  // Load chats from localStorage on component mount and when user changes
  useEffect(() => {
    if (user) {
      const storedChats = localStorage.getItem(`chats-${user.id}`);
      if (storedChats) {
        try {
          const parsedChats = JSON.parse(storedChats) as Chat[];
          setChats(parsedChats);
          
          // Set most recent chat as current if none is selected
          if (!currentChat && parsedChats.length > 0) {
            setCurrentChat(parsedChats[0]);
          }
        } catch (error) {
          console.error("Failed to parse stored chats:", error);
          localStorage.removeItem(`chats-${user.id}`);
        }
      }
    } else {
      // If no user, reset everything
      setChats([]);
      setCurrentChat(null);
    }
  }, [user]);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (user && chats.length > 0) {
      localStorage.setItem(`chats-${user.id}`, JSON.stringify(chats));
    }
  }, [chats, user]);

  const createChat = () => {
    if (!user) return;
    
    const newChat: Chat = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setChats(prevChats => [newChat, ...prevChats]);
    setCurrentChat(newChat);
  };

  const sendMessage = async (content: string) => {
    if (!user || !currentChat) {
      toast.error("Please create a new chat first");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create a copy of the current chat to work with
      const chatCopy = { ...currentChat };
      
      // Add user message
      const userMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: "user",
        content,
        timestamp: Date.now(),
      };
      
      chatCopy.messages = [...chatCopy.messages, userMessage];
      chatCopy.updatedAt = Date.now();
      
      // Update the current chat immediately to show user message
      setCurrentChat(chatCopy);
      
      // Update the chats list
      setChats(prevChats =>
        prevChats.map(chat => (chat.id === chatCopy.id ? chatCopy : chat))
      );
      
      // Generate a title for the chat if this is the first message
      if (chatCopy.messages.length === 1 && chatCopy.title === "New Chat") {
        const shortenedTitle = content.slice(0, 30) + (content.length > 30 ? "..." : "");
        chatCopy.title = shortenedTitle;
        
        // Update again with the new title
        setCurrentChat({ ...chatCopy });
        setChats(prevChats =>
          prevChats.map(chat => (chat.id === chatCopy.id ? { ...chatCopy } : chat))
        );
      }
      
      // Simulate AI response delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Add AI response
      const aiMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: "assistant",
        content: "This is a simulated response from the RAG-based chatbot. In a full implementation, this would query relevant documents and generate a contextually appropriate response using Meta LLaMA via LangChain.",
        timestamp: Date.now(),
      };
      
      chatCopy.messages = [...chatCopy.messages, aiMessage];
      chatCopy.updatedAt = Date.now();
      
      // Update the current chat and chats list with AI response
      setCurrentChat({ ...chatCopy });
      setChats(prevChats =>
        prevChats.map(chat => (chat.id === chatCopy.id ? { ...chatCopy } : chat))
      );
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = (chatId: string) => {
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    
    if (currentChat?.id === chatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      setCurrentChat(remainingChats.length > 0 ? remainingChats[0] : null);
    }
  };

  const renameChat = (chatId: string, newTitle: string) => {
    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      )
    );
    
    if (currentChat?.id === chatId) {
      setCurrentChat({ ...currentChat, title: newTitle });
    }
  };

  const uploadDocuments = async (files: File[]) => {
    if (!user || !currentChat) {
      toast.error("Please create a new chat first");
      return;
    }
    
    setUploadingFiles(true);
    
    try {
      // Simulate file upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success(`${files.length} file(s) uploaded successfully`);
      
      setProcessingFiles(true);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add system message about the processed files
      const fileNames = files.map(file => file.name).join(", ");
      const systemMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: "system",
        content: `Processed ${files.length} document(s): ${fileNames}`,
        timestamp: Date.now(),
      };
      
      const updatedChat = { 
        ...currentChat,
        messages: [...currentChat.messages, systemMessage],
        updatedAt: Date.now()
      };
      
      setCurrentChat(updatedChat);
      setChats(prevChats =>
        prevChats.map(chat => (chat.id === updatedChat.id ? updatedChat : chat))
      );
      
      toast.success("Documents processed and ready for querying");
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast.error("Failed to upload documents. Please try again.");
    } finally {
      setUploadingFiles(false);
      setProcessingFiles(false);
    }
  };

  const addWebsites = async (urls: string[]) => {
    if (!user || !currentChat) {
      toast.error("Please create a new chat first");
      return;
    }
    
    setProcessingFiles(true);
    
    try {
      // Simulate web scraping delay
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Add system message about the processed websites
      const systemMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: "system",
        content: `Processed ${urls.length} website(s): ${urls.join(", ")}`,
        timestamp: Date.now(),
      };
      
      const updatedChat = { 
        ...currentChat,
        messages: [...currentChat.messages, systemMessage],
        updatedAt: Date.now()
      };
      
      setCurrentChat(updatedChat);
      setChats(prevChats =>
        prevChats.map(chat => (chat.id === updatedChat.id ? updatedChat : chat))
      );
      
      toast.success("Websites processed and ready for querying");
    } catch (error) {
      console.error("Error processing websites:", error);
      toast.error("Failed to process websites. Please try again.");
    } finally {
      setProcessingFiles(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        currentChat,
        isLoading,
        uploadingFiles,
        processingFiles,
        setCurrentChat,
        createChat,
        sendMessage,
        deleteChat,
        renameChat,
        uploadDocuments,
        addWebsites,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
