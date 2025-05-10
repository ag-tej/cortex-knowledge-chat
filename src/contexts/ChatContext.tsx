
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
  const { user, backendUrl } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);

  // Fetch chats from API when user is authenticated
  useEffect(() => {
    if (user) {
      fetchChats();
    } else {
      // If no user, reset everything
      setChats([]);
      setCurrentChat(null);
    }
  }, [user]);

  const fetchChats = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    try {
      const response = await fetch(`${backendUrl}/api/chats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const fetchedChats = await response.json();
        setChats(fetchedChats);
        
        // Set most recent chat as current if none is selected
        if (!currentChat && fetchedChats.length > 0) {
          setCurrentChat(fetchedChats[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch chats:", error);
      toast.error("Failed to load chat history");
    }
  };

  const createChat = async () => {
    if (!user) {
      toast.error("Please log in to create a chat");
      return;
    }
    
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    
    try {
      const response = await fetch(`${backendUrl}/api/chats`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: "New Chat" })
      });
      
      if (response.ok) {
        const newChat = await response.json();
        setChats(prevChats => [newChat, ...prevChats]);
        setCurrentChat(newChat);
      } else {
        throw new Error("Failed to create chat");
      }
    } catch (error) {
      console.error("Error creating chat:", error);
      toast.error("Failed to create new chat");
    }
  };

  const sendMessage = async (content: string) => {
    if (!user || !currentChat) {
      toast.error("Please create a new chat first");
      return;
    }
    
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    
    setIsLoading(true);
    
    try {
      // Create a copy of the current chat to work with
      const chatCopy = { ...currentChat };
      
      // Add user message locally first for immediate feedback
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        timestamp: Date.now(),
      };
      
      chatCopy.messages = [...chatCopy.messages, userMessage];
      chatCopy.updatedAt = Date.now();
      
      // Update the current chat immediately to show user message
      setCurrentChat(chatCopy);
      
      // Send message to the backend
      const response = await fetch(`${backendUrl}/api/chats/${currentChat.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      // Get updated chat with AI response
      const updatedChat = await response.json();
      
      // Update the current chat and chats list with response from backend
      setCurrentChat(updatedChat);
      setChats(prevChats =>
        prevChats.map(chat => (chat.id === updatedChat.id ? updatedChat : chat))
      );
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    
    try {
      const response = await fetch(`${backendUrl}/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
        
        if (currentChat?.id === chatId) {
          const remainingChats = chats.filter(chat => chat.id !== chatId);
          setCurrentChat(remainingChats.length > 0 ? remainingChats[0] : null);
        }
      } else {
        throw new Error("Failed to delete chat");
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast.error("Failed to delete chat");
    }
  };

  const renameChat = async (chatId: string, newTitle: string) => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    
    try {
      const response = await fetch(`${backendUrl}/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });
      
      if (response.ok) {
        const updatedChat = await response.json();
        
        setChats(prevChats =>
          prevChats.map(chat => chat.id === chatId ? updatedChat : chat)
        );
        
        if (currentChat?.id === chatId) {
          setCurrentChat(updatedChat);
        }
      } else {
        throw new Error("Failed to rename chat");
      }
    } catch (error) {
      console.error("Error renaming chat:", error);
      toast.error("Failed to rename chat");
    }
  };

  const uploadDocuments = async (files: File[]) => {
    if (!user || !currentChat) {
      toast.error("Please create a new chat first");
      return;
    }
    
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    
    setUploadingFiles(true);
    
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      
      const response = await fetch(`${backendUrl}/api/chats/${currentChat.id}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload documents");
      }
      
      const result = await response.json();
      
      setProcessingFiles(true);
      
      // We need to poll for status or receive a webhook when processing is complete
      // For now, we'll just simulate a delay and then fetch the updated chat
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Fetch the updated chat with the system message about processed files
      const chatResponse = await fetch(`${backendUrl}/api/chats/${currentChat.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (chatResponse.ok) {
        const updatedChat = await chatResponse.json();
        setCurrentChat(updatedChat);
        setChats(prevChats =>
          prevChats.map(chat => (chat.id === updatedChat.id ? updatedChat : chat))
        );
      }
      
      toast.success(`${files.length} document(s) processed and ready for querying`);
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
    
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    
    setProcessingFiles(true);
    
    try {
      const response = await fetch(`${backendUrl}/api/chats/${currentChat.id}/websites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ urls })
      });
      
      if (!response.ok) {
        throw new Error("Failed to process websites");
      }
      
      // Similar to document upload, we'd need to poll for status or receive a webhook
      // For now, simulate a delay
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Fetch the updated chat
      const chatResponse = await fetch(`${backendUrl}/api/chats/${currentChat.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (chatResponse.ok) {
        const updatedChat = await chatResponse.json();
        setCurrentChat(updatedChat);
        setChats(prevChats =>
          prevChats.map(chat => (chat.id === updatedChat.id ? updatedChat : chat))
        );
      }
      
      toast.success(`${urls.length} website(s) processed and ready for querying`);
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
