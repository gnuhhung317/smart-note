
import React, { useState, useRef, useEffect } from 'react';
import { Swords, Send, Shield, Zap, Skull, Trophy, AlertTriangle, RefreshCw, Download, Mic, MicOff, Bot, Key, X } from 'lucide-react';
import { DebateDifficulty, DebateScorecard, Language } from '../types';
import { initiateDebate, continueDebate, gradeDebate, runAutoDebateTurn } from '../services/geminiService';
import { getSecondaryApiKey, saveSecondaryApiKey, getEnvApiKey } from '../services/storageService';
import MarkdownRenderer from './MarkdownRenderer';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface DebateArenaProps {
    language: Language;
}

const DebateArena: React.FC<DebateArenaProps> = ({ language }) => {
  // Phase: 'SETUP' | 'BATTLE' | 'VERDICT'
  const [phase, setPhase] = useState<'SETUP' | 'BATTLE' | 'VERDICT'>('SETUP');
  
  // Setup Data
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<DebateDifficulty>('EASY');
  
  // Battle Data
  const [messages, setMessages] = useState<{role: 'USER' | 'AI', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false); // Opponent typing
  const [isAllyTyping, setIsAllyTyping] = useState(false); // Ally typing
  
  // Auto Debate State
  const [isAutoDebating, setIsAutoDebating] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [secondaryKeyInput, setSecondaryKeyInput] = useState('');
  
  // Verdict Data
  const [scorecard, setScorecard] = useState<DebateScorecard | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Speech Recognition Hook
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript,
    hasSupport: hasSpeechSupport 
  } = useSpeechRecognition(language);

  // Sync speech transcript to input
  useEffect(() => {
    if (transcript) {
        setInput(transcript);
    }
  }, [transcript]);

  const toggleListening = () => {
      if (isListening) {
          stopListening();
      } else {
          startListening();
      }
  };

  // Translations
  const text = {
      en: {
          title: "Debate Arena",
          subtitle: "Defend your worldview. The AI will oppose you.",
          labelTopic: "I believe that...",
          placeholderTopic: "e.g., AI will eventually replace all creative jobs.",
          labelDifficulty: "Select Opponent Intensity",
          btnStart: "Enter The Arena",
          btnEnd: "End Match",
          btnNew: "New Debate",
          btnExport: "Export JSON",
          modeEasy: "Easy",
          modeHard: "Hard",
          modeExtreme: "God Mode",
          typing: "Opponent is formulating an attack...",
          allyTyping: "Ally Bot is arguing for you...",
          verdictTitle: "Match Results",
          judgesVoting: "The Judges are voting...",
          scoreLogic: "Logic Score",
          bestArg: "Best Argument",
          commentary: "Judges' Commentary",
          weakness: "Critical Weakness",
          victory: "VICTORY",
          defeat: "DEFEAT",
          draw: "DRAW",
          defender: "Defender",
          opponent: "Opponent",
          placeholderInput: "Type your rebuttal...",
          autoTitle: "Auto-Debate Mode",
          autoDesc: "Enable a secondary AI to argue on your behalf.",
          keyRequired: "Secondary API Key Required",
          keyDesc: "To use Auto-Debate, you need a separate API Key for the 'Ally' bot. This prevents rate-limiting issues and separates usage.",
          saveKey: "Save Key & Enable",
          cancel: "Cancel"
      },
      vi: {
          title: "Đấu trường Tranh biện",
          subtitle: "Bảo vệ quan điểm của bạn. AI sẽ phản biện lại.",
          labelTopic: "Tôi tin rằng...",
          placeholderTopic: "ví dụ: AI sẽ thay thế các công việc sáng tạo.",
          labelDifficulty: "Chọn độ gắt của đối thủ",
          btnStart: "Vào Sàn đấu",
          btnEnd: "Kết thúc",
          btnNew: "Trận mới",
          btnExport: "Lưu JSON",
          modeEasy: "Dễ",
          modeHard: "Khó",
          modeExtreme: "Cực gắt",
          typing: "Đối thủ đang soạn đòn tấn công...",
          allyTyping: "Bot đồng minh đang phản biện...",
          verdictTitle: "Kết quả Trận đấu",
          judgesVoting: "Ban giám khảo đang chấm điểm...",
          scoreLogic: "Điểm Logic",
          bestArg: "Luận điểm Tốt nhất",
          commentary: "Nhận xét của Giám khảo",
          weakness: "Điểm yếu Chí mạng",
          victory: "CHIẾN THẮNG",
          defeat: "THẤT BẠI",
          draw: "HÒA",
          defender: "Người bảo vệ",
          opponent: "Đối thủ",
          placeholderInput: "Nhập luận điểm phản bác...",
          autoTitle: "Chế độ Tự động",
          autoDesc: "Bật AI phụ để tranh biện thay bạn.",
          keyRequired: "Cần API Key Phụ",
          keyDesc: "Để dùng chế độ Tự động, bạn cần một API Key riêng cho Bot 'Đồng minh'. Việc này giúp tránh lỗi giới hạn tốc độ (rate-limit).",
          saveKey: "Lưu Key & Bật",
          cancel: "Hủy"
      }
  };
  const t = text[language];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isAllyTyping]);

  // --- AUTO DEBATE LOGIC ---

  const handleToggleAuto = () => {
    if (isAutoDebating) {
        setIsAutoDebating(false);
        return;
    }

    // Priority 1: Use Env Key if available
    if (getEnvApiKey()) {
        setIsAutoDebating(true);
        return;
    }

    // Priority 2: Use Secondary Key from storage
    const secondaryKey = getSecondaryApiKey();
    if (!secondaryKey) {
        setShowKeyModal(true);
    } else {
        setIsAutoDebating(true);
    }
  };

  const handleSaveSecondaryKey = () => {
      if (secondaryKeyInput.trim()) {
          saveSecondaryApiKey(secondaryKeyInput.trim());
          setShowKeyModal(false);
          setIsAutoDebating(true);
      }
  };

  // The Main Loop for Auto Debate
  useEffect(() => {
    const runAutoLoop = async () => {
        // Condition: Auto is ON, It is NOT currently typing, and the last message was from AI (so it's User/Ally turn)
        if (isAutoDebating && !isTyping && !isAllyTyping && messages.length > 0 && messages[messages.length - 1].role === 'AI') {
            
            // Determine which key to use
            const envKey = getEnvApiKey();
            const secKey = getSecondaryApiKey();
            const apiKeyToUse = envKey || secKey;

            if (!apiKeyToUse) {
                // Should not happen if logic in toggle is correct, but safe guard
                setIsAutoDebating(false);
                return;
            }

            setIsAllyTyping(true);
            try {
                // 1. Ally Generates Reply
                const allyReply = await runAutoDebateTurn(messages, topic, apiKeyToUse, language);
                
                // 2. Update History with USER role (Ally acts as User)
                const newHistory = [...messages, { role: 'USER' as const, content: allyReply }];
                setMessages(newHistory);
                setIsAllyTyping(false);

                // 3. Trigger Opponent Response immediately
                setIsTyping(true);
                const opponentReply = await continueDebate(newHistory, difficulty, language);
                setMessages(prev => [...prev, { role: 'AI', content: opponentReply }]);

            } catch (e) {
                console.error("Auto Debate Error", e);
                setIsAutoDebating(false);
            } finally {
                setIsAllyTyping(false);
                setIsTyping(false);
            }
        }
    };

    runAutoLoop();
  }, [isAutoDebating, messages, isTyping, isAllyTyping, topic, difficulty, language]);


  // --- STANDARD GAME LOGIC ---

  const handleStart = async () => {
    if (!topic.trim()) return;
    
    if (isListening) stopListening();
    
    setPhase('BATTLE');
    setIsTyping(true);
    setMessages([]); // Reset

    try {
        const opening = await initiateDebate(topic, difficulty, language);
        setMessages([{ role: 'AI', content: opening }]);
    } catch (e) {
        setMessages([{ role: 'AI', content: "Referee Error: Could not start debate." }]);
    } finally {
        setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // If user manually sends, we pause auto mode to let them intervene
    if (isAutoDebating) setIsAutoDebating(false);
    if (isListening) stopListening();
    
    const userMsg = input;
    setInput('');
    resetTranscript();

    const newHistory = [...messages, { role: 'USER' as const, content: userMsg }];
    setMessages(newHistory);
    setIsTyping(true);

    try {
        const reply = await continueDebate(newHistory, difficulty, language);
        setMessages(prev => [...prev, { role: 'AI', content: reply }]);
    } catch (e) {
        console.error(e);
    } finally {
        setIsTyping(false);
    }
  };

  const handleConcede = async () => {
    setPhase('VERDICT');
    setIsAutoDebating(false);
    setIsTyping(true);
    try {
        const result = await gradeDebate(messages, topic, language);
        setScorecard(result);
    } catch (e) {
        console.error(e);
    } finally {
        setIsTyping(false);
    }
  };

  const resetGame = () => {
      setPhase('SETUP');
      setTopic('');
      setMessages([]);
      setScorecard(null);
      setIsAutoDebating(false);
  }
  
  const handleExportJSON = () => {
      const data = {
          topic,
          difficulty,
          language,
          messages,
          scorecard,
          timestamp: new Date().toISOString()
      };
      
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = href;
      link.download = `debate-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- RENDERERS ---

  if (phase === 'SETUP') {
      return (
        <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-6 overflow-y-auto items-center justify-center min-h-[500px]">
            <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="inline-flex items-center justify-center p-4 bg-red-900 rounded-full mb-4 shadow-xl ring-4 ring-red-100">
                    <Swords className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">{t.title}</h1>
                <p className="text-gray-500 text-lg">{t.subtitle}</p>
            </div>

            <div className="w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-200 space-y-8 animate-in zoom-in-95 duration-500">
                <div className="relative">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        {t.labelTopic}
                    </label>
                    <textarea 
                        value={input || topic} // Use input if available (from speech), else topic
                        onChange={(e) => {
                            setTopic(e.target.value);
                            setInput(e.target.value);
                        }}
                        placeholder={isListening ? (language === 'vi' ? 'Đang nghe...' : 'Listening...') : t.placeholderTopic}
                        className={`w-full bg-gray-50 border rounded-xl p-4 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all min-h-[100px] text-lg
                        ${isListening ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200'}`}
                    />
                     {/* Mic Button Absolute */}
                     {hasSpeechSupport && (
                        <button
                            onClick={toggleListening}
                            className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${
                                isListening
                                    ? 'bg-red-500 text-white animate-pulse shadow-md' 
                                    : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200 shadow-sm'
                            }`}
                        >
                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-4">
                        {t.labelDifficulty}
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                        <button 
                            onClick={() => setDifficulty('EASY')}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${difficulty === 'EASY' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-200 text-gray-500'}`}
                        >
                            <Shield className="w-6 h-6" />
                            <span className="font-bold">{t.modeEasy}</span>
                        </button>
                        <button 
                            onClick={() => setDifficulty('HARD')}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${difficulty === 'HARD' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 hover:border-orange-200 text-gray-500'}`}
                        >
                            <Zap className="w-6 h-6" />
                            <span className="font-bold">{t.modeHard}</span>
                        </button>
                        <button 
                            onClick={() => setDifficulty('EXTREME')}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${difficulty === 'EXTREME' ? 'border-red-600 bg-red-50 text-red-800' : 'border-gray-200 hover:border-red-200 text-gray-500'}`}
                        >
                            <Skull className="w-6 h-6" />
                            <span className="font-bold">{t.modeExtreme}</span>
                        </button>
                    </div>
                </div>

                <button 
                    onClick={handleStart}
                    disabled={!topic.trim() && !input.trim()}
                    className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2
                        ${!topic.trim() && !input.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
                    `}
                >
                    <Swords className="w-5 h-5" /> {t.btnStart}
                </button>
            </div>
        </div>
      );
  }

  if (phase === 'VERDICT') {
      return (
        <div className="flex flex-col h-full w-full max-w-3xl mx-auto p-6 overflow-y-auto items-center justify-center">
            {!scorecard ? (
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-12 h-12 text-gray-400 animate-spin" />
                    <p className="text-xl font-bold text-gray-600">{t.judgesVoting}</p>
                </div>
            ) : (
                <div className="w-full animate-in zoom-in-95 duration-500">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">{t.verdictTitle}</h2>
                        <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full font-bold text-white text-lg shadow-md
                            ${scorecard.winner === 'USER' ? 'bg-green-600' : scorecard.winner === 'AI' ? 'bg-red-600' : 'bg-gray-600'}
                        `}>
                            {scorecard.winner === 'USER' ? '🏆 ' + t.victory : scorecard.winner === 'AI' ? '💀 ' + t.defeat : '🤝 ' + t.draw}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                         {/* Score Card */}
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{t.scoreLogic}</span>
                            <span className={`text-6xl font-black ${scorecard.score > 70 ? 'text-green-500' : scorecard.score < 40 ? 'text-red-500' : 'text-yellow-500'}`}>
                                {scorecard.score}
                            </span>
                         </div>

                         {/* Best Point */}
                         <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                             <div className="flex items-center gap-2 mb-3 text-green-600">
                                 <Trophy className="w-5 h-5" />
                                 <span className="font-bold uppercase tracking-wider text-sm">{t.bestArg}</span>
                             </div>
                             <p className="text-gray-700 italic">"{scorecard.best_point}"</p>
                         </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                         <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 font-bold text-gray-700">
                             {t.commentary}
                         </div>
                         <div className="p-6 space-y-6">
                             <p className="text-lg leading-relaxed text-gray-800">
                                 {scorecard.commentary}
                             </p>
                             <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <div className="flex items-center gap-2 mb-2 text-red-700 font-bold text-sm">
                                    <AlertTriangle className="w-4 h-4" /> {t.weakness}
                                </div>
                                <p className="text-red-900">{scorecard.critical_feedback}</p>
                             </div>
                         </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <button
                            onClick={handleExportJSON}
                            className="flex-1 py-4 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" /> {t.btnExport}
                        </button>
                        <button 
                            onClick={resetGame}
                            className="flex-1 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                        >
                            {t.btnNew}
                        </button>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // BATTLE PHASE
  return (
    <div className="flex flex-col h-full bg-gray-100 relative">
        
        {/* Secondary Key Modal */}
        {showKeyModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                         <div className="flex items-center gap-2 text-indigo-600 font-bold">
                             <Key className="w-5 h-5" /> {t.keyRequired}
                         </div>
                         <button onClick={() => setShowKeyModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{t.keyDesc}</p>
                    <input 
                        type="password"
                        value={secondaryKeyInput}
                        onChange={(e) => setSecondaryKeyInput(e.target.value)}
                        placeholder="AIzaSy... (Secondary Key)"
                        className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowKeyModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">{t.cancel}</button>
                        <button 
                            onClick={handleSaveSecondaryKey}
                            disabled={!secondaryKeyInput.trim()}
                            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {t.saveKey}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${difficulty === 'EXTREME' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Swords className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="font-bold text-gray-800 leading-tight max-w-md truncate">{topic}</h2>
                    <p className="text-xs text-gray-500 font-mono">MODE: {difficulty}</p>
                </div>
            </div>
            <button 
                onClick={handleConcede}
                className="text-sm font-medium text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
            >
                {t.btnEnd}
            </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex w-full ${msg.role === 'USER' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-5 shadow-sm border relative
                        ${msg.role === 'USER' 
                            ? 'bg-blue-600 text-white border-blue-700 rounded-br-none' 
                            : 'bg-white text-gray-800 border-gray-200 rounded-bl-none'
                        }
                    `}>
                        <div className="mb-2 flex items-center justify-between opacity-80 text-xs font-bold uppercase tracking-wider">
                            <span>{msg.role === 'USER' ? t.defender : t.opponent}</span>
                        </div>
                        <div className={`markdown-body ${msg.role === 'USER' ? 'text-white [&_*]:text-white' : ''}`}>
                            <MarkdownRenderer content={msg.content} />
                        </div>
                    </div>
                </div>
            ))}
            
            {/* Status Indicators */}
            {isTyping && (
                <div className="flex justify-start w-full">
                     <div className="bg-white text-gray-500 border border-gray-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2 text-sm font-mono">
                        <RefreshCw className="w-4 h-4 animate-spin" /> {t.typing}
                     </div>
                </div>
            )}
            
            {isAllyTyping && (
                <div className="flex justify-end w-full">
                     <div className="bg-indigo-50 text-indigo-600 border border-indigo-200 p-4 rounded-2xl rounded-br-none shadow-sm flex items-center gap-2 text-sm font-mono">
                        <Bot className="w-4 h-4 animate-bounce" /> {t.allyTyping}
                     </div>
                </div>
            )}
            
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white p-4 border-t border-gray-200">
             <div className="max-w-4xl mx-auto relative flex items-end gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? (language === 'vi' ? 'Đang nghe...' : 'Listening...') : t.placeholderInput}
                    className={`w-full bg-gray-100 border rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none max-h-32 min-h-[60px]
                    ${isListening ? 'border-red-400 ring-2 ring-red-100 bg-red-50' : 'border-0'}`}
                />
                
                {/* Tools Container */}
                <div className="absolute bottom-3 right-[4.5rem] flex gap-2">
                    {/* Auto Debate Toggle */}
                    <button
                        onClick={handleToggleAuto}
                        className={`p-2 rounded-full transition-all border shadow-sm flex items-center gap-1 ${
                            isAutoDebating 
                            ? 'bg-indigo-100 text-indigo-600 border-indigo-300 ring-1 ring-indigo-200' 
                            : 'bg-white text-gray-500 hover:bg-gray-100 border-gray-200'
                        }`}
                        title={isAutoDebating ? "Stop Auto-Debate" : "Start Auto-Debate (Ally Bot)"}
                    >
                         <Bot className="w-5 h-5" />
                         {isAutoDebating && <span className="text-xs font-bold px-1 animate-pulse">ON</span>}
                    </button>

                    {hasSpeechSupport && (
                        <button
                            onClick={toggleListening}
                            className={`p-2 rounded-full transition-all ${
                                isListening
                                    ? 'bg-red-500 text-white animate-pulse shadow-md' 
                                    : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200 shadow-sm'
                            }`}
                        >
                            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                    )}
                </div>

                <button
                    onClick={handleSend}
                    disabled={(!input.trim() && !isAutoDebating) || isTyping || isAllyTyping}
                    className={`p-4 rounded-xl transition-all h-[60px] w-[60px] flex items-center justify-center shrink-0
                        ${(input.trim() || isAutoDebating) && !isTyping && !isAllyTyping ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                    `}
                >
                    <Send className="w-6 h-6" />
                </button>
             </div>
        </div>
    </div>
  );
};

export default DebateArena;
