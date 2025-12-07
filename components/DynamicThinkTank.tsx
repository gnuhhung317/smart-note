
import React, { useState, useRef, useEffect } from 'react';
import { Bot, BrainCircuit, Play, Sparkles, User, StopCircle, RefreshCw, Zap, PauseCircle, Send, PlayCircle } from 'lucide-react';
import { getThinkTankPersonas, runThinkTankTurn, synthesizeThinkTank } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { ThinkTankPersonas, Language } from '../types';

interface DynamicThinkTankProps {
    language: Language;
}

type TurnRole = 'A' | 'B';

interface ChatMessage {
    role: string; // The Persona Role Name
    content: string;
}

const DynamicThinkTank: React.FC<DynamicThinkTankProps> = ({ language }) => {
    // Phases: 'INPUT' | 'DISPATCHING' | 'LOOP' | 'SYNTHESIZING' | 'DONE'
    const [phase, setPhase] = useState<'INPUT' | 'DISPATCHING' | 'LOOP' | 'SYNTHESIZING' | 'DONE'>('INPUT');
    
    // Config
    const [userIdea, setUserIdea] = useState('');
    const [maxRounds, setMaxRounds] = useState(6);
    
    // State
    const [personas, setPersonas] = useState<ThinkTankPersonas | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentTurn, setCurrentTurn] = useState<TurnRole>('A');
    const [roundsPlayed, setRoundsPlayed] = useState(0);
    const [finalSynthesis, setFinalSynthesis] = useState('');
    const [isPaused, setIsPaused] = useState(false);
    
    // Intervention State
    const [interventionInput, setInterventionInput] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Translations
    const text = {
        en: {
            title: "Dynamic Think-Tank",
            subtitle: "An automated brainstorming session between two AI experts tailored to your idea.",
            labelIdea: "What's your raw idea?",
            placeholder: "e.g. A sci-fi novel set in Hanoi 2077 where street food vendors deal data chips.",
            labelRounds: "Max Rounds",
            btnStart: "Assemble Think-Tank",
            dispatching: "Analyzing idea & Recruiting experts...",
            phaseLoop: "Brainstorming in progress...",
            phaseSynth: "Synthesizing Final Plan...",
            personaA: "Expert A",
            personaB: "Expert B",
            goal: "Goal",
            done: "Session Concluded",
            stop: "Stop & Synthesize",
            restart: "New Session",
            intervenePlaceholder: "Intervene... (Pauses Loop)",
            resume: "Resume",
            manager: "Manager",
            paused: "LOOP PAUSED"
        },
        vi: {
            title: "Bể Tư Duy Động",
            subtitle: "Phiên thảo luận tự động giữa 2 chuyên gia AI được tuyển chọn riêng cho ý tưởng của bạn.",
            labelIdea: "Ý tưởng thô của bạn là gì?",
            placeholder: "ví dụ: Viết tiểu thuyết trinh thám bối cảnh Hà Nội năm 1990.",
            labelRounds: "Số vòng tối đa",
            btnStart: "Triệu tập Chuyên gia",
            dispatching: "Đang phân tích & Tuyển dụng chuyên gia...",
            phaseLoop: "Đang thảo luận...",
            phaseSynth: "Đang tổng hợp kế hoạch...",
            personaA: "Chuyên gia A",
            personaB: "Chuyên gia B",
            goal: "Mục tiêu",
            done: "Hoàn tất",
            stop: "Dừng & Tổng hợp",
            restart: "Phiên mới",
            intervenePlaceholder: "Can thiệp... (Sẽ tạm dừng)",
            resume: "Tiếp tục",
            manager: "Quản lý",
            paused: "ĐANG TẠM DỪNG"
        }
    };
    const t = text[language];

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, phase, isPaused]);

    const handleStart = async () => {
        if (!userIdea.trim()) return;
        setPhase('DISPATCHING');
        
        try {
            const result = await getThinkTankPersonas(userIdea, language);
            if (result && result.persona_a && result.persona_b) {
                setPersonas(result);
                // Start Loop
                setTimeout(() => setPhase('LOOP'), 1500);
            } else {
                alert("Could not generate personas. Try again.");
                setPhase('INPUT');
            }
        } catch (e) {
            console.error(e);
            setPhase('INPUT');
        }
    };

    // The Game Loop
    useEffect(() => {
        if (phase !== 'LOOP' || !personas || isPaused) return;

        const runTurn = async () => {
            // Check Stop Conditions
            if (roundsPlayed >= maxRounds) {
                setPhase('SYNTHESIZING');
                return;
            }

            const activePersona = currentTurn === 'A' ? personas.persona_a : personas.persona_b;
            const partnerPersona = currentTurn === 'A' ? personas.persona_b : personas.persona_a;

            try {
                // Pass roundsPlayed + 1 as the current round index (1-based for the prompt)
                const response = await runThinkTankTurn(
                    messages, 
                    userIdea, 
                    activePersona, 
                    partnerPersona, 
                    roundsPlayed + 1, 
                    maxRounds,
                    language
                );

                // Check for [[DONE]] token
                let isDone = response.includes('[[DONE]]');
                const cleanContent = response.replace('[[DONE]]', '').trim();

                // FORCE LOOP: Ignore [[DONE]] if we haven't reached at least half the rounds
                // This prevents premature endings
                if (isDone && roundsPlayed < Math.max(2, Math.floor(maxRounds / 2))) {
                    isDone = false;
                }

                setMessages(prev => [...prev, { role: activePersona.role, content: cleanContent }]);
                
                if (isDone) {
                    setPhase('SYNTHESIZING');
                } else {
                    // Switch Turn
                    setCurrentTurn(prev => prev === 'A' ? 'B' : 'A');
                    setRoundsPlayed(prev => prev + 1);
                }

            } catch (e) {
                console.error("Turn failed", e);
                setIsPaused(true);
            }
        };

        // Artificial delay for UX
        const timer = setTimeout(runTurn, 2500);
        return () => clearTimeout(timer);

    }, [phase, roundsPlayed, currentTurn, personas, messages, userIdea, maxRounds, isPaused, language]);

    // Synthesis Effect
    useEffect(() => {
        if (phase === 'SYNTHESIZING' && messages.length > 0) {
            const runSynth = async () => {
                try {
                    const result = await synthesizeThinkTank(messages, userIdea, language);
                    setFinalSynthesis(result);
                    setPhase('DONE');
                } catch (e) {
                    console.error("Synthesis failed", e);
                }
            };
            runSynth();
        }
    }, [phase, messages, userIdea, language]);

    const handleInterventionSend = () => {
        if (!interventionInput.trim()) return;
        
        // Add Manager message
        setMessages(prev => [...prev, { role: 'Manager', content: interventionInput }]);
        setInterventionInput('');
        
        // Resume Loop (The logic in useEffect will pick up the 'Manager' message in history and adapt)
        setIsPaused(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleInterventionSend();
        }
    };


    // RENDERERS

    if (phase === 'INPUT') {
        return (
            <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-6 overflow-y-auto items-center justify-center min-h-[500px]">
                <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="inline-flex items-center justify-center p-4 bg-purple-600 rounded-full mb-4 shadow-xl ring-4 ring-purple-100">
                        <BrainCircuit className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">{t.title}</h1>
                    <p className="text-gray-500 text-lg">{t.subtitle}</p>
                </div>

                <div className="w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-200 space-y-6 animate-in zoom-in-95 duration-500">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            {t.labelIdea}
                        </label>
                        <textarea 
                            value={userIdea}
                            onChange={(e) => setUserIdea(e.target.value)}
                            placeholder={t.placeholder}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all min-h-[120px] text-lg"
                        />
                    </div>

                    <div>
                         <label className="block text-sm font-bold text-gray-700 mb-2">
                            {t.labelRounds} ({maxRounds})
                        </label>
                        <input 
                            type="range" 
                            min="4" 
                            max="20" 
                            step="2"
                            value={maxRounds}
                            onChange={(e) => setMaxRounds(parseInt(e.target.value))}
                            className="w-full accent-purple-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>Short (4)</span>
                            <span>Deep (12)</span>
                            <span>Exhaustive (20)</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleStart}
                        disabled={!userIdea.trim()}
                        className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2
                            ${!userIdea.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}
                        `}
                    >
                        <Sparkles className="w-5 h-5" /> {t.btnStart}
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'DISPATCHING') {
         return (
             <div className="flex flex-col h-full w-full items-center justify-center p-8">
                 <div className="relative">
                    <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                    <RefreshCw className="w-16 h-16 text-purple-600 animate-spin relative z-10" />
                 </div>
                 <h2 className="mt-8 text-xl font-bold text-gray-800 animate-pulse">{t.dispatching}</h2>
             </div>
         );
    }

    return (
        <div className="flex flex-col h-full bg-[#F7F7F5] relative">
            {/* Header / Persona Cards */}
            <div className="bg-white border-b border-gray-200 p-4 shadow-sm z-10 shrink-0">
                <div className="flex flex-col md:flex-row gap-4 max-w-5xl mx-auto">
                    {personas && (
                        <>
                             {/* Persona A */}
                            <div className={`flex-1 p-3 rounded-xl border-2 transition-all ${currentTurn === 'A' && phase === 'LOOP' && !isPaused ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-400 uppercase">{t.personaA}</div>
                                        <div className="font-bold text-sm text-gray-800">{personas.persona_a.role}</div>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 truncate pl-10">
                                    <span className="font-semibold">{t.goal}:</span> {personas.persona_a.goal}
                                </div>
                            </div>

                             {/* Center Status */}
                             <div className="flex items-center justify-center">
                                 {phase === 'LOOP' ? (
                                     isPaused ? (
                                         <PauseCircle className="w-6 h-6 text-red-500 animate-pulse" />
                                     ) : (
                                         <div className="w-8 h-1 bg-gray-300 rounded-full animate-pulse"></div>
                                     )
                                 ) : (
                                     <Zap className="w-6 h-6 text-yellow-500 fill-current" />
                                 )}
                             </div>

                             {/* Persona B */}
                             <div className={`flex-1 p-3 rounded-xl border-2 transition-all ${currentTurn === 'B' && phase === 'LOOP' && !isPaused ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-100' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-400 uppercase">{t.personaB}</div>
                                        <div className="font-bold text-sm text-gray-800">{personas.persona_b.role}</div>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 truncate pl-10">
                                    <span className="font-semibold">{t.goal}:</span> {personas.persona_b.goal}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full pb-32">
                {/* Initial Idea */}
                <div className="flex justify-center mb-8">
                     <div className="bg-gray-100 text-gray-600 px-6 py-3 rounded-full text-sm font-medium border border-gray-200 shadow-sm max-w-2xl text-center italic">
                        "{userIdea}"
                     </div>
                </div>

                {/* Conversation */}
                {messages.map((msg, idx) => {
                    const isPersonaA = personas && msg.role === personas.persona_a.role;
                    const isManager = msg.role === 'Manager';
                    
                    return (
                        <div key={idx} className={`flex w-full ${isManager ? 'justify-center' : isPersonaA ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            {isManager ? (
                                <div className="bg-gray-800 text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg scale-95 hover:scale-100 transition-transform">
                                    <User className="w-4 h-4" /> {t.manager}: {msg.content}
                                </div>
                            ) : (
                                <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-5 shadow-sm border relative
                                    ${isPersonaA
                                        ? 'bg-white text-gray-800 border-gray-200 rounded-tl-none' 
                                        : 'bg-white text-gray-800 border-gray-200 rounded-tr-none'
                                    }
                                `}>
                                    <div className={`mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isPersonaA ? 'text-blue-600' : 'text-orange-600 flex-row-reverse'}`}>
                                        <Bot className="w-3 h-3" />
                                        <span>{msg.role}</span>
                                    </div>
                                    <div className="markdown-body">
                                        <MarkdownRenderer content={msg.content} />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Loading Indicator */}
                {phase === 'LOOP' && !isPaused && (
                    <div className={`flex w-full ${currentTurn === 'A' ? 'justify-start' : 'justify-end'}`}>
                         <div className="bg-gray-50 text-gray-400 border border-gray-100 px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-mono animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" /> {currentTurn === 'A' ? personas?.persona_a.role : personas?.persona_b.role} is thinking...
                         </div>
                    </div>
                )}
                
                {/* Synthesis Result */}
                {(phase === 'SYNTHESIZING' || phase === 'DONE') && (
                     <div className="animate-in zoom-in-95 duration-700 pt-8 border-t border-gray-200 mt-8">
                         <div className="flex items-center gap-3 mb-6 justify-center">
                            <div className="bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> {phase === 'SYNTHESIZING' ? t.phaseSynth : t.done}
                            </div>
                        </div>

                        {phase === 'DONE' && (
                            <div className="bg-white rounded-xl shadow-lg border-2 border-purple-100 p-8 md:p-10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-32 bg-purple-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                                <div className="relative z-10">
                                    <MarkdownRenderer content={finalSynthesis} />
                                </div>
                            </div>
                        )}
                        
                        {phase === 'SYNTHESIZING' && (
                            <div className="h-48 flex items-center justify-center">
                                <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
                            </div>
                        )}
                     </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Footer / Controls */}
            {phase !== 'INPUT' && (
                <div className="p-4 bg-white border-t border-gray-200 shrink-0 z-20">
                     
                     {/* Loop Controls & Intervention */}
                     {phase === 'LOOP' && (
                        <div className="max-w-4xl mx-auto flex items-end gap-2">
                             {/* Pause/Resume Toggle */}
                             <button
                                onClick={() => setIsPaused(!isPaused)}
                                className={`p-3 rounded-full shrink-0 transition-colors ${isPaused ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                                title={isPaused ? t.resume : "Pause"}
                             >
                                 {isPaused ? <PlayCircle className="w-6 h-6" /> : <PauseCircle className="w-6 h-6" />}
                             </button>

                             {/* Input Box */}
                             <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={interventionInput}
                                    onChange={(e) => setInterventionInput(e.target.value)}
                                    onFocus={() => setIsPaused(true)} // Auto-pause on focus
                                    onKeyDown={handleKeyDown}
                                    placeholder={t.intervenePlaceholder}
                                    className={`w-full bg-gray-50 border rounded-xl py-3 px-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all
                                        ${isPaused ? 'border-purple-300 ring-2 ring-purple-100' : 'border-gray-200'}
                                    `}
                                />
                                {isPaused && !interventionInput && (
                                    <span className="absolute right-3 top-3.5 text-xs font-bold text-red-400 animate-pulse tracking-wider">
                                        {t.paused}
                                    </span>
                                )}
                             </div>

                             {/* Send Intervention */}
                             <button
                                onClick={handleInterventionSend}
                                disabled={!interventionInput.trim()}
                                className={`p-3 rounded-full shrink-0 transition-all ${
                                    interventionInput.trim() 
                                    ? 'bg-purple-600 text-white shadow-lg hover:bg-purple-700' 
                                    : 'bg-gray-100 text-gray-300'
                                }`}
                             >
                                 <Send className="w-5 h-5" />
                             </button>

                              {/* Stop & Synthesize */}
                             <button 
                                onClick={() => setPhase('SYNTHESIZING')}
                                className="ml-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                                title={t.stop}
                             >
                                 <StopCircle className="w-5 h-5" />
                             </button>
                        </div>
                     )}

                     {/* Done State Controls */}
                     {(phase === 'DONE' || phase === 'SYNTHESIZING') && (
                        <div className="flex justify-between items-center max-w-4xl mx-auto">
                            <div className="text-xs text-gray-400 font-mono">
                                Rounds Played: {roundsPlayed}
                            </div>
                             {phase === 'DONE' && (
                                <button 
                                    onClick={() => {
                                        setPhase('INPUT');
                                        setMessages([]);
                                        setRoundsPlayed(0);
                                        setUserIdea('');
                                        setFinalSynthesis('');
                                        setIsPaused(false);
                                    }}
                                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg"
                                >
                                    <Play className="w-4 h-4" /> {t.restart}
                                </button>
                             )}
                        </div>
                     )}
                </div>
            )}
        </div>
    );
};

export default DynamicThinkTank;
