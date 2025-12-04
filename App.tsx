import React, { useState, useEffect, useRef } from 'react';
import { Send, Copy, Layers, BookOpen, RefreshCw, Zap, Lightbulb, BrainCircuit, Menu } from 'lucide-react';
import { initializeChat, sendMessageStream, synthesizeNote, generateSessionTitle } from './services/geminiService';
import { loadSessions, saveSession, createNewSession, deleteSession, getApiKey, saveApiKey } from './services/storageService';
import { Message, MessageType, Sender, AppState, ChatSession } from './types';
import { WELCOME_MESSAGE } from './constants';
import MarkdownRenderer from './components/MarkdownRenderer';
import Sidebar from './components/Sidebar';
import ApiKeyModal from './components/ApiKeyModal';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Computed current session derived from list
  const currentSession = sessions.find(s => s.id === currentSessionId) || null;
  const messages = currentSession ? currentSession.messages : [];

  const [input, setInput] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [streamingContent, setStreamingContent] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize: Check for API Key
  useEffect(() => {
    const key = getApiKey();
    if (!key) {
        setIsKeyModalOpen(true);
    }
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

  // Initialize Chat Service when session changes
  useEffect(() => {
    const init = async () => {
        const key = getApiKey();
        if (key) {
            // Only initialize if we have a key
            await initializeChat(); 
        }
    };
    init();
  }, [currentSessionId, isKeyModalOpen]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

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
    initializeChat(); // Reset AI context
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

  const handleSaveApiKey = (key: string) => {
      saveApiKey(key);
      setIsKeyModalOpen(false);
      initializeChat(); // Re-initialize with new key
  };

  const handleAnalogy = async () => {
    if (appState !== AppState.IDLE || messages.length <= 1) return;

    const userMsg = "Explain the core concept we are discussing using a simple, everyday analogy (Explain like I'm 5).";
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

  const handleChallenge = async () => {
    if (appState !== AppState.IDLE || messages.length <= 1) return;

    const userMsg = "Challenge my current understanding with a critical, probing question. Identify potential flaws in my logic or edge cases I missed.";
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
        generateSessionTitle(userMsg).then(title => {
            updateCurrentSession({ title });
        });
    }

    try {
      // Check if user is asking to synthesize
      const lowerMsg = userMsg.toLowerCase();
      const isSynthesizeRequest = lowerMsg.includes('synthesize') || lowerMsg.includes('finalize') || lowerMsg.includes('create note');

      if (isSynthesizeRequest) {
        setAppState(AppState.SYNTHESIZING);
        const history = messages.map(m => `${m.sender}: ${m.content}`).join('\n') + `\nUSER: ${userMsg}`;
        
        setStreamingContent("Synthesizing your note with structural analysis...");
        
        const noteContent = await synthesizeNote(history);
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
    alert("Copied to clipboard! Ready to paste into Notion.");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
        onSelectSession={(id) => {
            setCurrentSessionId(id);
            setStreamingContent('');
            setAppState(AppState.IDLE);
        }}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsKeyModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full w-full relative">
        
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
                className={`flex w-full ${msg.sender === Sender.USER ? 'justify-end' : 'justify-start'}`}
                >
                <div 
                    className={`max-w-[95%] md:max-w-[85%] rounded-lg p-4 shadow-sm border 
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
                    {msg.type === MessageType.NOTE && (
                        <button 
                        onClick={() => copyToClipboard(msg.content)}
                        className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors bg-gray-50 px-2 py-1 rounded"
                        >
                        <Copy className="w-3 h-3" /> Copy Markdown
                        </button>
                    )}
                    </div>

                    {/* Content */}
                    <div className="markdown-body">
                    <MarkdownRenderer content={msg.content} />
                    </div>
                </div>
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
                placeholder="Type an idea, a concept, or 'Synthesize' to finish..."
                className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[50px] py-3 px-2 text-gray-800 placeholder-gray-400"
                rows={1}
                style={{ minHeight: '52px' }}
                />
                <div className="flex items-center gap-2 pb-2 pr-1">
                <button
                    onClick={handleAnalogy}
                    disabled={messages.length <= 1 || appState !== AppState.IDLE}
                    className={`p-2 rounded-full transition-all ${
                    messages.length > 1 && appState === AppState.IDLE
                        ? 'bg-white text-yellow-600 hover:bg-yellow-50 border border-yellow-200 shadow-sm' 
                        : 'bg-transparent text-gray-300 cursor-not-allowed'
                    }`}
                    title="Generate Analogy (ELI5)"
                >
                    <Lightbulb className="w-5 h-5" />
                </button>

                <button
                    onClick={handleChallenge}
                    disabled={messages.length <= 1 || appState !== AppState.IDLE}
                    className={`p-2 rounded-full transition-all ${
                    messages.length > 1 && appState === AppState.IDLE
                        ? 'bg-white text-purple-600 hover:bg-purple-50 border border-purple-200 shadow-sm' 
                        : 'bg-transparent text-gray-300 cursor-not-allowed'
                    }`}
                    title="Challenge Me (Socratic Question)"
                >
                    <BrainCircuit className="w-5 h-5" />
                </button>

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
            <div className="text-center mt-2">
                <p className="text-xs text-gray-400">
                Pro-tip: Ask AI to "Challenge me" on a topic, or type "Finalize" to create the Notion note.
                </p>
            </div>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default App;