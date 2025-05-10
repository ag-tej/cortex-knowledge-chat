
import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  // For demo purposes, we'll simulate authentication
  // In a real app, this would call your backend API
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Basic validation
      if (!email.includes('@') || password.length < 6) {
        throw new Error("Invalid credentials");
      }
      
      // Simple mock user - in real app, this would come from your backend
      const mockUser = {
        id: "user-" + Math.random().toString(36).substr(2, 9),
        email,
        name: email.split('@')[0],
      };
      
      // Save to localStorage
      localStorage.setItem("user", JSON.stringify(mockUser));
      setUser(mockUser);
      toast.success("Logged in successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Basic validation
      if (!email.includes('@') || password.length < 6) {
        throw new Error("Invalid credentials");
      }
      
      // Simple mock user - in real app, this would be created in your backend
      const mockUser = {
        id: "user-" + Math.random().toString(36).substr(2, 9),
        email,
        name: name || email.split('@')[0],
      };
      
      // Save to localStorage
      localStorage.setItem("user", JSON.stringify(mockUser));
      setUser(mockUser);
      toast.success("Account created successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
