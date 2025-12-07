
import React, { useState, useEffect, useRef } from 'react';
import { Send, Copy, Layers, BookOpen, RefreshCw, Zap, Lightbulb, BrainCircuit, Menu, Wrench, Scale, Trash2, Check } from 'lucide-react';
import { initializeChat, sendMessageStream, synthesizeNote, generateSessionTitle } from './services/geminiService';
import { loadSessions, saveSession, createNewSession, deleteSession, getApiKey, saveApiKey, getStoredLanguage, saveStoredLanguage } from './services/storageService';
import { Message, MessageType, Sender, AppState, ChatSession, ViewMode, Language } from './types';
import { WELCOME_MESSAGE } from './constants';
import MarkdownRenderer from './components/MarkdownRenderer';
import Sidebar from './components/Sidebar';
import ApiKeyModal from './components/ApiKeyModal';
import DecisionLab from './components/DecisionLab';
import SixHats from './components/SixHats';
import FirstPrinciples from './components/FirstPrinciples';
import DebateArena from './components/DebateArena';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // New State for View Mode and Language
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.CHAT);
  const [language, setLanguage] = useState<Language>('vi');
  
  // Computed current session derived from list
  const currentSession = sessions.find(s => s.id === currentSessionId) || null;
  const messages = currentSession ? currentSession.messages : [];

  const [input, setInput] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [streamingContent, setStreamingContent] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  
  // Track message deletion confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize: Check for API Key
  useEffect(() => {
    const key = getApiKey();
    if (!key) {
        setIsKeyModalOpen(true);
    }
    setLanguage(getStoredLanguage());
  }, []);

  // Initialize: Load sessions
  useEffect(() => {
    const loadedSessions = loadSessions();
    setSessions(loadedSessions);
    
    // Auto-select most recent or create new if empty
    if (loadedSessions.length > 0) {
      setCurrentSessionId(loadedSessions[0].id);
    } else {
      handleNewChat();
    }
  }, []);

  // Initialize Chat Service when session changes or Language Changes
  useEffect(() => {
    const init = async () => {
        const key = getApiKey();
        if (key && currentView === ViewMode.CHAT) {
            // Re-init with new language
            await initializeChat(language); 
        }
    };
    init();
  }, [currentSessionId, isKeyModalOpen, currentView, language]);

  // Auto-scroll
  useEffect(() => {
    if (currentView === ViewMode.CHAT) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent, currentView]);

  const updateCurrentSession = (updatedFields: Partial<ChatSession>) => {
    if (!currentSessionId) return;
    
    setSessions(prev => {
        const idx = prev.findIndex(s => s.id === currentSessionId);
        if (idx === -1) return prev;
        
        const updatedSession = { ...prev[idx], ...updatedFields, updatedAt: Date.now() };
        const newSessions = [...prev];
        newSessions[idx] = updatedSession;
        
        // Also persist to storage
        saveSession(updatedSession);
        
        return newSessions;
    });
  };

  const addMessageToSession = (sender: Sender, content: string, type: MessageType = MessageType.CHAT) => {
    if (!currentSessionId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender,
      content,
      type,
      timestamp: Date.now(),
    };

    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === currentSessionId);
      if (idx === -1) return prev;
      
      const updatedSession = {
        ...prev[idx],
        messages: [...prev[idx].messages, newMessage],
        updatedAt: Date.now()
      };
      saveSession(updatedSession);
      
      const newSessions = [...prev];
      newSessions[idx] = updatedSession;
      return newSessions;
    });
  };

  const handleNewChat = () => {
    const newSession = createNewSession();
    // Add Welcome message
    newSession.messages.push({
      id: 'welcome',
      sender: Sender.AI,
      content: WELCOME_MESSAGE,
      type: MessageType.CHAT,
      timestamp: Date.now()
    });
    
    setSessions(prev => [newSession, ...prev]);
    saveSession(newSession);
    setCurrentSessionId(newSession.id);
    setAppState(AppState.IDLE);
    setStreamingContent('');
    setCurrentView(ViewMode.CHAT);
    initializeChat(language); // Reset AI context
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this note?")) {
        const newSessions = deleteSession(id);
        setSessions(newSessions);
        if (currentSessionId === id) {
            if (newSessions.length > 0) {
                setCurrentSessionId(newSessions[0].id);
            } else {
                handleNewChat();
            }
        }
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!currentSessionId) return;
    
    setSessions(prev => {
        const idx = prev.findIndex(s => s.id === currentSessionId);
        if (idx === -1) return prev;
        
        const session = prev[idx];
        const updatedMessages = session.messages.filter(m => m.id !== messageId);
        
        const updatedSession = {
            ...session,
            messages: updatedMessages,
            updatedAt: Date.now()
        };
        
        saveSession(updatedSession);
        
        const newSessions = [...prev];
        newSessions[idx] = updatedSession;
        return newSessions;
    });
    setDeleteConfirmId(null);
  };

  const onDeleteClick = (id: string) => {
    if (deleteConfirmId === id) {
        handleDeleteMessage(id);
    } else {
        setDeleteConfirmId(id);
        setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleSaveApiKey = (key: string) => {
      saveApiKey(key);
      setIsKeyModalOpen(false);
      initializeChat(language); 
  };
  
  const handleToggleLanguage = () => {
      const newLang = language === 'vi' ? 'en' : 'vi';
      setLanguage(newLang);
      saveStoredLanguage(newLang);
  };

  // --- Helper Functions for "Spectrum of Understanding" ---

  const triggerAiResponse = async (userMsg: string) => {
    if (appState !== AppState.IDLE || messages.length <= 1) return;
    
    addMessageToSession(Sender.USER, userMsg);
    setAppState(AppState.CHATTING);
    setStreamingContent('');

    try {
      let accumulatedText = "";
      await sendMessageStream(userMsg, (chunk) => {
        accumulatedText += chunk;
        setStreamingContent(accumulatedText);
      });
      
      addMessageToSession(Sender.AI, accumulatedText);
    } catch (error) {
      console.error(error);
      addMessageToSession(Sender.AI, "I encountered an error. Please check your API Key in settings.");
    } finally {
      setStreamingContent('');
      setAppState(AppState.IDLE);
    }
  };

  const handleAnalogy = () => {
    triggerAiResponse("Explain the core concept we are discussing using a simple, everyday analogy (Explain like I'm 5).");
  };

  const handleDeepDive = () => {
    triggerAiResponse("Let's go to Level 2: The Engineer. Explain the 'Under the hood' implementation details, architecture, and data flow. Use precise technical terminology.");
  };

  const handleArchitect = () => {
    triggerAiResponse("Let's go to Level 3: The Architect. Analyze the Trade-offs (Pros/Cons), Constraints, and Alternatives. When should I NOT use this solution?");
  };

  const handleChallenge = () => {
    triggerAiResponse("Challenge my current understanding with a critical, probing question. Identify potential flaws in my logic or edge cases I missed.");
  };

  const handleSend = async () => {
    if (!input.trim() || appState === AppState.SYNTHESIZING || !currentSessionId) return;

    const userMsg = input;
    setInput('');
    addMessageToSession(Sender.USER, userMsg);
    setAppState(AppState.CHATTING);
    setStreamingContent('');

    // Generate Title if it's the first real user message
    const realUserMessages = messages.filter(m => m.sender === Sender.USER && m.id !== 'welcome');
    if (realUserMessages.length === 0) {
        // Fire and forget title generation
        generateSessionTitle(userMsg, language).then(title => {
            updateCurrentSession({ title });
        });
    }

    try {
      // Check if user is asking to synthesize
      const lowerMsg = userMsg.toLowerCase();
      const isSynthesizeRequest = lowerMsg.includes('synthesize') || lowerMsg.includes('finalize') || lowerMsg.includes('create note') || lowerMsg.includes('tạo ghi chú');

      if (isSynthesizeRequest) {
        setAppState(AppState.SYNTHESIZING);
        const history = messages.map(m => `${m.sender}: ${m.content}`).join('\n') + `\nUSER: ${userMsg}`;
        
        setStreamingContent(language === 'vi' ? "Đang tổng hợp ghi chú chuyên sâu..." : "Synthesizing your note with Technical Deep Dive...");
        
        const noteContent = await synthesizeNote(history, language);
        setStreamingContent('');
        addMessageToSession(Sender.AI, noteContent, MessageType.NOTE);
        setAppState(AppState.IDLE);
      } else {
        let accumulatedText = "";
        await sendMessageStream(userMsg, (chunk) => {
          accumulatedText += chunk;
          setStreamingContent(accumulatedText);
        });
        
        addMessageToSession(Sender.AI, accumulatedText);
        setStreamingContent('');
        setAppState(AppState.IDLE);
      }

    } catch (error) {
      console.error(error);
      addMessageToSession(Sender.AI, "I encountered an error. Please check your API Key in settings.");
      setAppState(AppState.IDLE);
      setStreamingContent('');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isToolsDisabled = messages.length <= 1 || appState !== AppState.IDLE;

  // --- Render View Content ---
  const renderContent = () => {
    switch(currentView) {
        case ViewMode.DECISION_LAB:
            return <DecisionLab language={language} />;
        case ViewMode.SIX_HATS:
            return <SixHats language={language} />;
        case ViewMode.FIRST_PRINCIPLES:
            return <FirstPrinciples language={language} />;
        case ViewMode.DEBATE_ARENA:
            return <DebateArena language={language} />;
        case ViewMode.CHAT:
        default:
            return (
                <>
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-notion-border bg-white z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden text-gray-500 hover:text-gray-800"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <BookOpen className="w-5 h-5 text-gray-700 hidden md:block" />
                        <div className="flex flex-col">
                            <h1 className="text-lg font-semibold tracking-tight text-gray-800 leading-tight">
                                {currentSession?.title || "Socratic Notes"}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="hidden md:inline-flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Powered by Gemini
                        </span>
                    </div>
                </header>

                {/* Chat Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full max-w-5xl mx-auto">
                    <div className="space-y-6 pb-24">
                    {messages.map((msg) => (
                        <div 
                        key={msg.id} 
                        className={`flex w-full ${msg.sender === Sender.USER ? 'justify-end' : 'justify-start'} group items-start gap-2 mb-2`}
                        >
                        
                        {/* Delete Action for User (Left Side) */}
                        {msg.sender === Sender.USER && (
                            <div className={`mt-4 transition-opacity duration-200 ${deleteConfirmId === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <button
                                    onClick={() => onDeleteClick(msg.id)}
                                    className={`p-1.5 rounded-full transition-all ${
                                        deleteConfirmId === msg.id 
                                        ? 'bg-red-100 text-red-600 ring-2 ring-red-200' 
                                        : 'text-gray-300 hover:text-red-500 hover:bg-gray-100'
                                    }`}
                                    title={deleteConfirmId === msg.id ? "Confirm Delete" : "Delete Message"}
                                >
                                    {deleteConfirmId === msg.id ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </div>
                        )}

                        <div 
                            className={`max-w-[95%] md:max-w-[85%] rounded-lg p-4 shadow-sm border relative
                            ${msg.type === MessageType.NOTE 
                            ? 'w-full border-gray-200 bg-white ring-1 ring-gray-100' // Note Style
                            : msg.sender === Sender.USER 
                                ? 'bg-notion-sidebar border-transparent text-gray-800' // User Style
                                : 'bg-white border-notion-border text-gray-800' // AI Chat Style
                            }`}
                        >
                            {/* Header for Messages */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    {msg.sender === Sender.AI && msg.type === MessageType.NOTE ? 'Synthesized Note' : msg.sender}
                                </span>
                                
                                {/* Copy Button (Only for Notes) */}
                                {msg.type === MessageType.NOTE && (
                                    <button 
                                    onClick={() => copyToClipboard(msg.content)}
                                    className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors bg-gray-50 px-2 py-1 rounded"
                                    title="Copy Markdown"
                                    >
                                    <Copy className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Content */}
                            <div className="markdown-body">
                                <MarkdownRenderer content={msg.content} />
                            </div>
                        </div>

                        {/* Delete Action for AI (Right Side) */}
                        {msg.sender === Sender.AI && (
                            <div className={`mt-4 transition-opacity duration-200 ${deleteConfirmId === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <button
                                    onClick={() => onDeleteClick(msg.id)}
                                    className={`p-1.5 rounded-full transition-all ${
                                        deleteConfirmId === msg.id 
                                        ? 'bg-red-100 text-red-600 ring-2 ring-red-200' 
                                        : 'text-gray-300 hover:text-red-500 hover:bg-gray-100'
                                    }`}
                                    title={deleteConfirmId === msg.id ? "Confirm Delete" : "Delete Message"}
                                >
                                    {deleteConfirmId === msg.id ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </div>
                        )}

                        </div>
                    ))}

                    {/* Streaming Indicator/Content */}
                    {streamingContent && (
                        <div className="flex w-full justify-start">
                        <div className="max-w-[95%] md:max-w-[85%] rounded-lg p-4 shadow-sm border bg-white border-notion-border">
                            <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI</span>
                            {appState === AppState.SYNTHESIZING && <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />}
                            </div>
                            <div className="markdown-body">
                            <MarkdownRenderer content={streamingContent} />
                            <span className="inline-block w-2 h-4 ml-1 align-middle bg-gray-400 animate-pulse"></span>
                            </div>
                        </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                    </div>
                </main>

                {/* Footer Input */}
                <footer className="p-4 bg-white border-t border-notion-border shrink-0">
                    <div className="max-w-4xl mx-auto relative">
                    <div className="relative flex items-end gap-2 bg-notion-sidebar rounded-xl p-2 border border-notion-border focus-within:ring-2 focus-within:ring-gray-200 focus-within:border-gray-400 transition-all">
                        <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={language === 'vi' ? "Nhập ý tưởng, khái niệm hoặc 'Tổng hợp' để tạo ghi chú..." : "Type an idea, a concept, or 'Synthesize' to finish..."}
                        className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[50px] py-3 px-2 text-gray-800 placeholder-gray-400"
                        rows={1}
                        style={{ minHeight: '52px' }}
                        />
                        
                        {/* Tools / Actions */}
                        <div className="flex items-center gap-1.5 pb-2 pr-1">
                            
                        <button
                            onClick={handleAnalogy}
                            disabled={isToolsDisabled}
                            className={`p-2 rounded-full transition-all ${
                            !isToolsDisabled
                                ? 'bg-white text-yellow-600 hover:bg-yellow-50 border border-yellow-200 shadow-sm' 
                                : 'bg-transparent text-gray-300 cursor-not-allowed'
                            }`}
                            title="ELI5 Analogy (Level 1)"
                        >
                            <Lightbulb className="w-5 h-5" />
                        </button>

                        <button
                            onClick={handleDeepDive}
                            disabled={isToolsDisabled}
                            className={`p-2 rounded-full transition-all ${
                            !isToolsDisabled
                                ? 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 shadow-sm' 
                                : 'bg-transparent text-gray-300 cursor-not-allowed'
                            }`}
                            title="Under the Hood / Deep Dive (Level 2)"
                        >
                            <Wrench className="w-5 h-5" />
                        </button>

                        <button
                            onClick={handleArchitect}
                            disabled={isToolsDisabled}
                            className={`p-2 rounded-full transition-all ${
                            !isToolsDisabled
                                ? 'bg-white text-orange-600 hover:bg-orange-50 border border-orange-200 shadow-sm' 
                                : 'bg-transparent text-gray-300 cursor-not-allowed'
                            }`}
                            title="Architect / Trade-offs (Level 3)"
                        >
                            <Scale className="w-5 h-5" />
                        </button>

                        <button
                            onClick={handleChallenge}
                            disabled={isToolsDisabled}
                            className={`p-2 rounded-full transition-all ${
                            !isToolsDisabled
                                ? 'bg-white text-purple-600 hover:bg-purple-50 border border-purple-200 shadow-sm' 
                                : 'bg-transparent text-gray-300 cursor-not-allowed'
                            }`}
                            title="Challenge Me"
                        >
                            <BrainCircuit className="w-5 h-5" />
                        </button>

                        <div className="w-px h-6 bg-gray-300 mx-1"></div>

                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || appState !== AppState.IDLE}
                            className={`p-2 rounded-full transition-all ${
                            input.trim() && appState === AppState.IDLE
                                ? 'bg-gray-900 text-white hover:bg-gray-700 shadow-sm' 
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {appState === AppState.SYNTHESIZING ? (
                            <Layers className="w-5 h-5 animate-pulse" />
                            ) : (
                            <Send className="w-5 h-5" />
                            )}
                        </button>
                        </div>
                    </div>
                    </div>
                </footer>
                </>
            );
    }
  };

  return (
    <div className="flex h-screen bg-notion-bg text-notion-text font-sans overflow-hidden">
      
      <ApiKeyModal 
        isOpen={isKeyModalOpen} 
        onSave={handleSaveApiKey} 
        onClose={() => setIsKeyModalOpen(false)} 
      />

      {/* Sidebar */}
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        currentView={currentView}
        onSelectSession={(id) => {
            setCurrentSessionId(id);
            setStreamingContent('');
            setAppState(AppState.IDLE);
        }}
        onChangeView={setCurrentView}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsKeyModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        language={language}
        onToggleLanguage={handleToggleLanguage}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full w-full relative">
        {/* Mobile Toggle (Visible only in non-chat views or when sidebar is needed) */}
        {currentView !== ViewMode.CHAT && (
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden absolute top-4 left-4 z-20 text-gray-500 hover:text-gray-800"
            >
                <Menu className="w-6 h-6" />
            </button>
        )}
        
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
