
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useChat, Chat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { PlusIcon, MessageCircle, Trash, Edit, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export const ChatSidebar: React.FC = () => {
  const { chats, currentChat, setCurrentChat, createChat, deleteChat, renameChat } = useChat();
  const { user, logout } = useAuth();
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const handleCreateNewChat = () => {
    createChat();
  };

  const handleChatSelect = (chat: Chat) => {
    setCurrentChat(chat);
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    deleteChat(chatId);
  };

  const startEditing = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleSaveTitle = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      renameChat(chatId, editingTitle);
    }
    setEditingChatId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
  };

  return (
    <div className="w-64 min-w-64 bg-slate-50 dark:bg-gray-900 border-r border-border h-screen flex flex-col">
      <div className="p-4 flex flex-col gap-4">
        <Button onClick={handleCreateNewChat} className="w-full flex items-center gap-2">
          <PlusIcon size={16} />
          New Chat
        </Button>

        <Separator />
      </div>

      <ScrollArea className="flex-1 chat-sidebar">
        <div className="p-2 flex flex-col gap-1">
          {chats.length > 0 ? (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "p-2 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-gray-800 flex items-center justify-between gap-2",
                  currentChat?.id === chat.id && "bg-slate-100 dark:bg-gray-800"
                )}
                onClick={() => handleChatSelect(chat)}
              >
                {editingChatId === chat.id ? (
                  <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => handleSaveTitle(e, chat.id)}>
                      <Save size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEditing}>
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MessageCircle size={16} className="flex-shrink-0 text-muted-foreground" />
                      <span className="text-sm truncate">{chat.title}</span>
                    </div>

                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={(e) => startEditing(e, chat)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-4">
              No chats yet. Create a new one!
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{user?.name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
};
