


import React, { useState } from 'react';
import { ChatSession, Language } from '../types';
import { MessageSquare, Plus, Trash2, X, Settings, Scale, Layers, Box, Swords, Globe, BrainCircuit, Ghost, Target, ChevronDown, ChevronUp, Flame } from 'lucide-react';
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
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  
  const text = {
      en: {
          thinkingTools: "Thinking Tools",
          decisionLab: "Decision Lab",
          sixHats: "360° Analysis",
          firstPrinciples: "First Principles",
          debateArena: "Debate Arena",
          thinkTank: "Dynamic Think-Tank",
          shadowWork: "Shadow Work",
          fiveWhys: "5 Whys Master",
          devilsDictionary: "Devil's Dictionary",
          myNotes: "My Notes",
          settings: "API Settings",
          today: "Today",
          yesterday: "Yesterday",
          noHistory: "No history yet.",
          showMore: "Show more tools",
          showLess: "Show less"
      },
      vi: {
          thinkingTools: "Công cụ Tư duy",
          decisionLab: "Decision Lab",
          sixHats: "Phân tích 360°",
          firstPrinciples: "Nguyên lý Gốc",
          debateArena: "Đấu trường Tranh biện",
          thinkTank: "Bể Tư Duy Động",
          shadowWork: "Bạn Đồng Hành Tâm Lý",
          fiveWhys: "Bậc Thầy 5 Whys",
          devilsDictionary: "Từ Điển Của Quỷ",
          myNotes: "Ghi chú của tôi",
          settings: "Cài đặt API",
          today: "Hôm nay",
          yesterday: "Hôm qua",
          noHistory: "Chưa có lịch sử.",
          showMore: "Xem thêm công cụ",
          showLess: "Thu gọn"
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

  // Tools Configuration
  const tools = [
      { id: ViewMode.DECISION_LAB, icon: Scale, label: t.decisionLab },
      { id: ViewMode.SIX_HATS, icon: Layers, label: t.sixHats },
      { id: ViewMode.FIRST_PRINCIPLES, icon: Box, label: t.firstPrinciples },
      { id: ViewMode.DEBATE_ARENA, icon: Swords, label: t.debateArena },
      { id: ViewMode.DYNAMIC_THINK_TANK, icon: BrainCircuit, label: t.thinkTank },
      { id: ViewMode.SHADOW_WORK, icon: Ghost, label: t.shadowWork, color: 'text-indigo-900', bg: 'bg-indigo-100' },
      { id: ViewMode.FIVE_WHYS, icon: Target, label: t.fiveWhys, color: 'text-teal-900', bg: 'bg-teal-100' },
      { id: ViewMode.DEVILS_DICTIONARY, icon: Flame, label: t.devilsDictionary, color: 'text-red-900', bg: 'bg-red-100' },
  ];

  const visibleTools = isToolsExpanded ? tools : tools.slice(0, 6);

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
                    {visibleTools.map(tool => (
                        <button
                            key={tool.id}
                            onClick={() => handleToolClick(tool.id)}
                            className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors
                                ${currentView === tool.id 
                                    ? (tool.bg ? `${tool.bg} ${tool.color} font-medium` : 'bg-gray-200 text-gray-900 font-medium') 
                                    : 'text-gray-600 hover:bg-gray-100'}
                            `}
                        >
                            <tool.icon className="w-4 h-4" /> {tool.label}
                        </button>
                    ))}
                    
                    {/* Expand/Collapse Button */}
                    {tools.length > 6 && (
                        <button 
                            onClick={() => setIsToolsExpanded(!isToolsExpanded)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors mt-1"
                        >
                            {isToolsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {isToolsExpanded ? t.showLess : t.showMore}
                        </button>
                    )}
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
