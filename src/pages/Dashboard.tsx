
import React, { useEffect } from "react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { UploadPanel } from "@/components/chat/UploadPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // If auth loading is complete and user is not logged in, redirect to landing
    if (!isLoading && !user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Don't render dashboard content if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <ChatSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatMessages />
        <UploadPanel />
        <ChatInput />
      </div>
    </div>
  );
};

export default Dashboard;
