
import React, { useState, useRef, useEffect } from 'react';
import { Swords, Send, Shield, Zap, Skull, Trophy, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { DebateDifficulty, DebateScorecard, Language } from '../types';
import { initiateDebate, continueDebate, gradeDebate } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';

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
  const [isTyping, setIsTyping] = useState(false);
  
  // Verdict Data
  const [scorecard, setScorecard] = useState<DebateScorecard | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          placeholderInput: "Type your rebuttal..."
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
          placeholderInput: "Nhập luận điểm phản bác..."
      }
  };
  const t = text[language];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleStart = async () => {
    if (!topic.trim()) return;
    
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
    
    const userMsg = input;
    setInput('');
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
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        {t.labelTopic}
                    </label>
                    <textarea 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={t.placeholderTopic}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all min-h-[100px] text-lg"
                    />
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
                    disabled={!topic.trim()}
                    className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2
                        ${!topic.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
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
    <div className="flex flex-col h-full bg-gray-100">
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
            {isTyping && (
                <div className="flex justify-start w-full">
                     <div className="bg-white text-gray-500 border border-gray-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2 text-sm font-mono">
                        <RefreshCw className="w-4 h-4 animate-spin" /> {t.typing}
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
                    placeholder={t.placeholderInput}
                    className="w-full bg-gray-100 border-0 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none max-h-32 min-h-[60px]"
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className={`p-4 rounded-xl transition-all h-[60px] w-[60px] flex items-center justify-center shrink-0
                        ${input.trim() && !isTyping ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
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
