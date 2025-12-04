import React from 'react';
import { ChatSession } from '../types';
import { MessageSquare, Plus, Trash2, X, Settings } from 'lucide-react';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onNewChat, 
  onDeleteSession,
  onOpenSettings,
  isOpen,
  onClose
}) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString();
  };

  // Group sessions
  const groupedSessions: { [key: string]: ChatSession[] } = {};
  sessions.forEach(session => {
    const group = formatDate(session.updatedAt);
    if (!groupedSessions[group]) groupedSessions[group] = [];
    groupedSessions[group].push(session);
  });

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-notion-sidebar border-r border-notion-border transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-notion-border flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-gray-700">
               <span className="text-sm">My Notes</span>
            </div>
            <button onClick={onClose} className="md:hidden text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full flex items-center gap-2 bg-white hover:bg-gray-50 border border-notion-border text-gray-700 px-3 py-2 rounded-md shadow-sm transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Note
            </button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
            {Object.entries(groupedSessions).map(([group, groupSessions]) => (
              <div key={group}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                  {group}
                </h3>
                <div className="space-y-0.5">
                  {groupSessions.map(session => (
                    <div
                      key={session.id}
                      className={`
                        group relative flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors text-sm
                        ${currentSessionId === session.id 
                          ? 'bg-gray-200 text-gray-900 font-medium' 
                          : 'text-gray-600 hover:bg-gray-100'}
                      `}
                      onClick={() => {
                        onSelectSession(session.id);
                        if (window.innerWidth < 768) onClose();
                      }}
                    >
                      <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate pr-6">{session.title}</span>
                      
                      <button
                        onClick={(e) => onDeleteSession(e, session.id)}
                        className="absolute right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete session"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {sessions.length === 0 && (
               <div className="text-center text-xs text-gray-400 mt-8">
                  No history yet.
               </div>
            )}
          </div>
          
          {/* Footer / Settings */}
          <div className="p-4 border-t border-notion-border">
            <button 
                onClick={onOpenSettings}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-900 w-full transition-colors"
            >
                <Settings className="w-3.5 h-3.5" />
                <span>API Settings</span>
            </button>
            <div className="mt-2 text-[10px] text-gray-300">
                Socratic Notes v1.2
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;