
import React from 'react';
import { ChatSession, Language } from '../types';
import { MessageSquare, Plus, Trash2, X, Settings, Scale, Layers, Box, Swords, Globe } from 'lucide-react';
import { ViewMode } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  currentView: ViewMode;
  onSelectSession: (id: string) => void;
  onChangeView: (view: ViewMode) => void;
  onNewChat: () => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  currentSessionId, 
  currentView,
  onSelectSession, 
  onChangeView,
  onNewChat, 
  onDeleteSession,
  onOpenSettings,
  isOpen,
  onClose,
  language,
  onToggleLanguage
}) => {
  
  const text = {
      en: {
          thinkingTools: "Thinking Tools",
          decisionLab: "Decision Lab",
          sixHats: "360° Analysis",
          firstPrinciples: "First Principles",
          debateArena: "Debate Arena",
          myNotes: "My Notes",
          settings: "API Settings",
          today: "Today",
          yesterday: "Yesterday",
          noHistory: "No history yet."
      },
      vi: {
          thinkingTools: "Công cụ Tư duy",
          decisionLab: "Decision Lab",
          sixHats: "Phân tích 360°",
          firstPrinciples: "Nguyên lý Gốc",
          debateArena: "Đấu trường Tranh biện",
          myNotes: "Ghi chú của tôi",
          settings: "Cài đặt API",
          today: "Hôm nay",
          yesterday: "Hôm qua",
          noHistory: "Chưa có lịch sử."
      }
  };
  
  const t = text[language];

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return t.today;
    if (date.toDateString() === yesterday.toDateString()) return t.yesterday;
    return date.toLocaleDateString();
  };

  // Group sessions
  const groupedSessions: { [key: string]: ChatSession[] } = {};
  sessions.forEach(session => {
    const group = formatDate(session.updatedAt);
    if (!groupedSessions[group]) groupedSessions[group] = [];
    groupedSessions[group].push(session);
  });

  const handleToolClick = (view: ViewMode) => {
    onChangeView(view);
    if (window.innerWidth < 768) onClose();
  }

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
        md:translate-x-0 md:static flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b border-notion-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 font-medium text-gray-700">
                <span className="text-sm">Socratic Notes</span>
            </div>
            <button onClick={onClose} className="md:hidden text-gray-500">
                <X className="w-5 h-5" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto">
            {/* Thinking Tools Section */}
            <div className="p-3 pb-0">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                  {t.thinkingTools}
                </h3>
                <div className="space-y-1">
                    <button
                        onClick={() => handleToolClick(ViewMode.DECISION_LAB)}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors
                            ${currentView === ViewMode.DECISION_LAB ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}
                        `}
                    >
                        <Scale className="w-4 h-4" /> {t.decisionLab}
                    </button>
                    <button
                        onClick={() => handleToolClick(ViewMode.SIX_HATS)}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors
                            ${currentView === ViewMode.SIX_HATS ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}
                        `}
                    >
                        <Layers className="w-4 h-4" /> {t.sixHats}
                    </button>
                     <button
                        onClick={() => handleToolClick(ViewMode.FIRST_PRINCIPLES)}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors
                            ${currentView === ViewMode.FIRST_PRINCIPLES ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}
                        `}
                    >
                        <Box className="w-4 h-4" /> {t.firstPrinciples}
                    </button>
                     <button
                        onClick={() => handleToolClick(ViewMode.DEBATE_ARENA)}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors
                            ${currentView === ViewMode.DEBATE_ARENA ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}
                        `}
                    >
                        <Swords className="w-4 h-4" /> {t.debateArena}
                    </button>
                </div>
            </div>

            <div className="my-4 border-t border-notion-border mx-3" />

            {/* Chat/Notes Section */}
            <div className="px-3">
                <div className="flex items-center justify-between mb-2 px-2">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {t.myNotes}
                    </h3>
                    <button onClick={onNewChat} className="text-gray-500 hover:text-gray-900" title="New Note">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-0.5">
                    {Object.entries(groupedSessions).map(([group, groupSessions]) => (
                    <div key={group} className="mb-4">
                        <div className="text-[10px] text-gray-400 font-medium px-2 mb-1">{group}</div>
                        {groupSessions.map(session => (
                            <div
                            key={session.id}
                            className={`
                                group relative flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm
                                ${currentView === ViewMode.CHAT && currentSessionId === session.id 
                                ? 'bg-gray-200 text-gray-900 font-medium' 
                                : 'text-gray-600 hover:bg-gray-100'}
                            `}
                            onClick={() => {
                                onSelectSession(session.id);
                                handleToolClick(ViewMode.CHAT);
                            }}
                            >
                            <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate pr-5">{session.title}</span>
                            
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
                    ))}
                    {sessions.length === 0 && (
                        <div className="text-center text-xs text-gray-400 mt-4">{t.noHistory}</div>
                    )}
                </div>
            </div>
        </div>
        
        {/* Footer / Settings */}
        <div className="p-4 border-t border-notion-border shrink-0 space-y-2">
             <button 
                onClick={onToggleLanguage}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-900 w-full transition-colors px-1"
            >
                <Globe className="w-3.5 h-3.5" />
                <span>Language: <span className="font-semibold">{language === 'en' ? 'English' : 'Tiếng Việt'}</span></span>
            </button>

            <button 
                onClick={onOpenSettings}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-900 w-full transition-colors px-1"
            >
                <Settings className="w-3.5 h-3.5" />
                <span>{t.settings}</span>
            </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
