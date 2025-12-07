
import React, { useState, useEffect, useRef } from 'react';
import { runDecisionLab } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { Scale, RefreshCw, AlertCircle, Terminal, Bot, Zap, ShieldAlert, Rocket, CheckCircle2, Lightbulb, Eye, MessageCircle, ArrowRight } from 'lucide-react';
import { DecisionResult, Phase1Reaction, Phase2Discussion, AgentRole, Language } from '../types';

interface DecisionLabProps {
    language: Language;
}

const DecisionLab: React.FC<DecisionLabProps> = ({ language }) => {
  const [problem, setProblem] = useState('');
  const [options, setOptions] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data States
  const [fullResult, setFullResult] = useState<DecisionResult | null>(null);
  
  // Progressive Reveal States
  const [currentPhase, setCurrentPhase] = useState<0 | 1 | 2 | 3>(0); // 0=Idle, 1=Reactions, 2=Debate, 3=Verdict
  const [visibleReactions, setVisibleReactions] = useState<Phase1Reaction[]>([]);
  const [visibleDebate, setVisibleDebate] = useState<Phase2Discussion[]>([]);
  
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Translations
  const text = {
      en: {
          title: "Decision Engine",
          subtitle: "Initiate a 3-phase board meeting: Reaction, Conflict, and Consensus.",
          labelDilemma: "The Dilemma",
          placeholderDilemma: "e.g., Should we pivot the product strategy?",
          labelOptions: "The Options",
          placeholderOptions: "e.g., Option A: Pivot now. Option B: Wait for Q4 results.",
          btnStart: "Start Simulation",
          consoleInit: "Initializing Board of Directors Engine v3.0...",
          consoleLoad: "Loading Personas: [Skeptic, Visionary, Pragmatist, Innovator, Critic]...",
          consolePhase1: "Data received. Entering Phase 1: Initial Reactions.",
          consolePhase2: "Phase 1 Complete. Initiating Phase 2: Open Floor Debate.",
          consolePhase3: "Debate Concluded. Calculating Consensus...",
          phase1: "Phase 1",
          phase1Title: "Initial Reactions",
          phase2: "Phase 2",
          phase2Title: "The Conflict",
          deliberating: "Board is deliberating...",
          finalDecision: "Final Decision",
          voteCount: "Vote Count:",
          preMortem: "Pre-Mortem",
          reset: "Reset Simulation",
          replyTo: "replying to"
      },
      vi: {
          title: "Bộ máy Quyết định",
          subtitle: "Khởi tạo cuộc họp hội đồng 3 giai đoạn: Phản ứng, Xung đột, và Đồng thuận.",
          labelDilemma: "Vấn đề cần quyết định",
          placeholderDilemma: "ví dụ: Có nên thay đổi chiến lược sản phẩm không?",
          labelOptions: "Các lựa chọn",
          placeholderOptions: "ví dụ: A: Đổi ngay. B: Chờ kết quả Quý 4.",
          btnStart: "Bắt đầu Giả lập",
          consoleInit: "Đang khởi động Board of Directors Engine v3.0...",
          consoleLoad: "Đang tải nhân cách: [Skeptic, Visionary, Pragmatist, Innovator, Critic]...",
          consolePhase1: "Đã nhận dữ liệu. Vào Giai đoạn 1: Phản ứng ban đầu.",
          consolePhase2: "Giai đoạn 1 hoàn tất. Bắt đầu Giai đoạn 2: Tranh luận mở.",
          consolePhase3: "Tranh luận kết thúc. Đang tính toán đồng thuận...",
          phase1: "Giai đoạn 1",
          phase1Title: "Phản ứng Ban đầu",
          phase2: "Giai đoạn 2",
          phase2Title: "Xung đột",
          deliberating: "Hội đồng đang thảo luận...",
          finalDecision: "Quyết định Cuối cùng",
          voteCount: "Kết quả bỏ phiếu:",
          preMortem: "Dự báo Thất bại (Pre-Mortem)",
          reset: "Thử lại",
          replyTo: "trả lời"
      }
  };
  const t = text[language];

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleReactions, visibleDebate, currentPhase, systemLogs]);

  const addLog = (log: string) => {
    setSystemLogs(prev => [...prev, `> ${log}`]);
  };

  const handleAnalyze = async () => {
    if (!problem.trim() || !options.trim()) return;
    
    // Reset Everything
    setLoading(true);
    setError(null);
    setFullResult(null);
    setCurrentPhase(0);
    setVisibleReactions([]);
    setVisibleDebate([]);
    setSystemLogs([]);
    
    // Start Sequence
    addLog(t.consoleInit);
    await new Promise(r => setTimeout(r, 600));
    addLog(t.consoleLoad);
    
    try {
      const analysis = await runDecisionLab(problem, options, language);
      
      if (analysis && analysis.phase_1) {
        setFullResult(analysis);
        addLog(t.consolePhase1);
        setLoading(false);
        runSimulation(analysis);
      } else {
        setError("System Failure: Could not generate simulation.");
        setLoading(false);
      }
    } catch (e) {
      setError("Connection Error: Check API Key.");
      setLoading(false);
    }
  };

  const runSimulation = async (data: DecisionResult) => {
    // PHASE 1: REVEAL INITIAL REACTIONS
    setCurrentPhase(1);
    for (const reaction of data.phase_1) {
        await new Promise(r => setTimeout(r, 800)); // Delay between cards
        setVisibleReactions(prev => [...prev, reaction]);
    }

    await new Promise(r => setTimeout(r, 1500));
    addLog(t.consolePhase2);
    setCurrentPhase(2);

    // PHASE 2: REVEAL DEBATE
    for (const turn of data.phase_2) {
        await new Promise(r => setTimeout(r, 1500)); // Delay between chat bubbles
        setVisibleDebate(prev => [...prev, turn]);
    }

    await new Promise(r => setTimeout(r, 1500));
    addLog(t.consolePhase3);
    await new Promise(r => setTimeout(r, 1000));
    
    // PHASE 3: VERDICT
    setCurrentPhase(3);
  };

  // Helper to get Agent Styles
  const getAgentStyle = (role: AgentRole) => {
    switch(role) {
        case 'Skeptic':
            return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: <ShieldAlert className="w-4 h-4" />, name: 'The Skeptic' };
        case 'Visionary':
            return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: <Rocket className="w-4 h-4" />, name: 'The Visionary' };
        case 'Pragmatist':
            return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: <Scale className="w-4 h-4" />, name: 'The Pragmatist' };
        case 'Innovator':
            return { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: <Lightbulb className="w-4 h-4" />, name: 'The Innovator' };
        case 'Critic':
            return { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: <Eye className="w-4 h-4" />, name: 'The Critic' };
        default:
            return { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', icon: <Bot className="w-4 h-4" />, name: 'Agent' };
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto p-4 md:p-8 overflow-y-auto bg-[#F7F7F5]">
      
      {/* Header */}
      {!fullResult && !loading && (
        <div className="mb-8 text-center animate-in fade-in slide-in-from-top-4">
            <div className="inline-flex items-center justify-center p-4 bg-gray-900 rounded-2xl mb-4 shadow-xl ring-4 ring-gray-100">
                <Bot className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">{t.title}</h1>
            <p className="text-gray-500 max-w-lg mx-auto text-lg">
                {t.subtitle}
            </p>
        </div>
      )}

      {/* Input Form */}
      {!fullResult && !loading && !systemLogs.length && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t.labelDilemma}
            </label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder={t.placeholderDilemma}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all min-h-[80px]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t.labelOptions}
            </label>
            <textarea
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder={t.placeholderOptions}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all min-h-[80px]"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !problem.trim() || !options.trim()}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all
              ${loading || !problem.trim() || !options.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-black hover:scale-[1.02] shadow-xl'
              }`}
          >
            <Zap className="w-6 h-6 fill-current" />
            {t.btnStart}
          </button>
          
          {error && (
            <div className="text-red-600 bg-red-50 p-4 rounded-xl flex items-center gap-3 font-medium border border-red-100">
                <AlertCircle className="w-5 h-5" /> {error}
            </div>
          )}
        </div>
      )}

      {/* LOADING / LOGS STATE */}
      {(loading || (systemLogs.length > 0 && !fullResult)) && (
         <div className="max-w-2xl mx-auto w-full mt-10">
             <div className="bg-gray-900 text-green-400 font-mono text-xs p-6 rounded-xl shadow-2xl border border-gray-800">
                <div className="flex items-center gap-2 text-gray-500 mb-4 border-b border-gray-800 pb-2">
                    <Terminal className="w-4 h-4" /> SYSTEM CONSOLE
                </div>
                {systemLogs.map((log, i) => (
                    <div key={i} className="animate-in fade-in duration-300 mb-1">{log}</div>
                ))}
                <span className="animate-pulse inline-block w-2 h-4 bg-green-500 align-middle ml-1"/>
            </div>
         </div>
      )}

      {/* SIMULATION ACTIVE VIEW */}
      {fullResult && (
        <div className="space-y-12 pb-24">
            
            {/* PHASE 1: INITIAL REACTIONS (GRID) */}
            {currentPhase >= 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{t.phase1}</div>
                        <h2 className="text-xl font-bold text-gray-800">{t.phase1Title}</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {visibleReactions.map((reaction, idx) => {
                            const style = getAgentStyle(reaction.role);
                            return (
                                <div key={idx} className={`p-5 rounded-xl border-l-4 shadow-sm bg-white animate-in zoom-in-95 duration-500 border-gray-200 ${style.border.replace('border', 'border-l')}`}>
                                    <div className={`flex items-center gap-2 mb-2 ${style.color}`}>
                                        {style.icon}
                                        <span className="font-bold text-sm uppercase">{style.name}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        "{reaction.initial_thought}"
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* PHASE 2: DEBATE (THREAD) */}
            {currentPhase >= 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 border-t border-gray-200 pt-8">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{t.phase2}</div>
                        <h2 className="text-xl font-bold text-gray-800">{t.phase2Title}</h2>
                    </div>

                    <div className="space-y-6 max-w-3xl mx-auto">
                        {visibleDebate.map((turn, idx) => {
                            const style = getAgentStyle(turn.role);
                            const targetStyle = turn.target_role !== 'Group' ? getAgentStyle(turn.target_role as AgentRole) : null;
                            
                            return (
                                <div key={idx} className="flex gap-4 animate-in slide-in-from-left-4 duration-500">
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm border ${style.border} ${style.bg} ${style.color}`}>
                                        {style.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`font-bold text-sm ${style.color}`}>{style.name}</span>
                                            {targetStyle && (
                                                <div className="flex items-center text-xs text-gray-400 gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                                                    <ArrowRight className="w-3 h-3" /> 
                                                    <span>{t.replyTo} {targetStyle.name}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-200 text-gray-800 leading-relaxed">
                                            <MarkdownRenderer content={turn.argument} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                         {currentPhase === 2 && (
                            <div className="flex justify-center py-4">
                                <div className="flex items-center gap-2 text-gray-400 text-sm animate-pulse">
                                    <MessageCircle className="w-4 h-4" /> {t.deliberating}
                                </div>
                            </div>
                         )}
                    </div>
                </div>
            )}

            {/* PHASE 3: VERDICT */}
            {currentPhase === 3 && fullResult.phase_3 && (
                 <div className="animate-in zoom-in-95 slide-in-from-bottom-8 duration-700 border-t border-gray-200 pt-8">
                     <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto border border-gray-700 relative overflow-hidden">
                        
                        {/* Background Effect */}
                        <div className="absolute top-0 right-0 p-40 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                        <div className="relative z-10 grid md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-6">
                                <div className="flex items-center gap-3 text-yellow-400">
                                    <CheckCircle2 className="w-8 h-8" />
                                    <h2 className="text-2xl font-bold tracking-tight">{t.finalDecision}</h2>
                                </div>
                                
                                <div className="space-y-4">
                                    <p className="text-lg leading-relaxed font-light text-white/90">
                                        {fullResult.phase_3.winner}
                                    </p>
                                    <div className="bg-white/10 rounded-lg p-3 inline-block text-sm font-mono text-gray-300 border border-white/10">
                                        {t.voteCount} {fullResult.phase_3.vote_summary}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
                                <h3 className="text-xs font-bold text-red-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <ShieldAlert className="w-3 h-3" /> {t.preMortem}
                                </h3>
                                <p className="text-sm text-red-100/80 italic leading-relaxed">
                                    "{fullResult.phase_3.critical_warning}"
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-12">
                        <button 
                            onClick={() => {
                                setFullResult(null);
                                setSystemLogs([]);
                            }}
                            className="text-gray-500 hover:text-gray-900 underline text-sm transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className="w-3 h-3" /> {t.reset}
                        </button>
                    </div>
                 </div>
            )}
            
            <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
};

export default DecisionLab;
