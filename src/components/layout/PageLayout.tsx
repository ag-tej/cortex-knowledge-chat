
import React from "react";
import { useAuth } from "@/contexts/AuthContext";

interface PageLayoutProps {
  children: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {children}
    </div>
  );
};

export default PageLayout;
