
import React, { useState, useRef, useEffect } from 'react';
import { Target, ArrowDown, HelpCircle, Play, RefreshCw, CheckCircle2, ChevronDown, RotateCcw } from 'lucide-react';
import { getFiveWhysQuestion, getFiveWhysAnalysis } from '../services/geminiService';
import { Language, FiveWhysResult } from '../types';

interface FiveWhysProps {
    language: Language;
}

interface Step {
    question: string;
    answer: string;
}

const FiveWhys: React.FC<FiveWhysProps> = ({ language }) => {
    // 0 = Input Problem, 1-5 = Whys, 6 = Result
    const [phase, setPhase] = useState<number>(0);
    const [problem, setProblem] = useState('');
    
    const [steps, setSteps] = useState<Step[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [result, setResult] = useState<FiveWhysResult | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);

    const text = {
        en: {
            title: "5 Whys Master",
            subtitle: "Drill down to the Root Cause (Toyota Method).",
            labelProblem: "What is the surface problem?",
            placeholderProblem: "e.g. I missed the project deadline again.",
            btnStart: "Start Investigation",
            btnNext: "Next Cause",
            btnAnalyze: "Analyze Root Cause",
            rootCause: "ROOT CAUSE",
            solution: "PROPOSED SOLUTION",
            advice: "Wisdom",
            reset: "New Analysis",
            why: "Why?",
            cause: "Because..."
        },
        vi: {
            title: "Bậc Thầy 5 Whys",
            subtitle: "Tìm nguyên nhân gốc rễ (Phương pháp Toyota).",
            labelProblem: "Vấn đề bề mặt là gì?",
            placeholderProblem: "ví dụ: Tôi lại trễ deadline dự án.",
            btnStart: "Bắt đầu Điều tra",
            btnNext: "Nguyên nhân tiếp theo",
            btnAnalyze: "Tìm gốc rễ",
            rootCause: "NGUYÊN NHÂN GỐC RỄ",
            solution: "GIẢI PHÁP ĐỀ XUẤT",
            advice: "Lời khuyên",
            reset: "Phân tích mới",
            why: "Tại sao?",
            cause: "Bởi vì..."
        }
    };
    const t = text[language];

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [phase, steps, currentQuestion]);

    const handleStart = async () => {
        if (!problem.trim()) return;
        setLoading(true);
        try {
            // Generate first "Why" based on problem
            const q = await getFiveWhysQuestion([], problem, language);
            setCurrentQuestion(q);
            setPhase(1);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleNextStep = async () => {
        if (!currentInput.trim()) return;
        
        const newStep: Step = {
            question: currentQuestion,
            answer: currentInput
        };
        
        const newSteps = [...steps, newStep];
        setSteps(newSteps);
        setCurrentInput('');
        setLoading(true);

        // If we hit 5 steps, go to analysis
        if (newSteps.length >= 5) {
            await finishAnalysis(newSteps);
        } else {
            // Generate next question
            try {
                const q = await getFiveWhysQuestion(newSteps, problem, language);
                setCurrentQuestion(q);
                setPhase(prev => prev + 1);
            } catch (e) {
                console.error(e);
                setLoading(false);
            } finally {
                setLoading(false);
            }
        }
    };

    const finishAnalysis = async (finalSteps: Step[]) => {
        setLoading(true);
        try {
            const analysis = await getFiveWhysAnalysis(finalSteps, problem, language);
            if (analysis) {
                setResult(analysis);
                setPhase(6); // Done
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setPhase(0);
        setProblem('');
        setSteps([]);
        setResult(null);
        setCurrentInput('');
    };

    return (
        <div className="flex flex-col h-full w-full max-w-3xl mx-auto p-6 overflow-y-auto">
            {/* Header */}
            <div className="mb-8 text-center shrink-0">
                <div className="inline-flex items-center justify-center p-3 bg-teal-600 rounded-xl mb-4 shadow-lg">
                    <Target className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">{t.title}</h1>
                <p className="text-gray-500 max-w-lg mx-auto">{t.subtitle}</p>
            </div>

            {/* Input Phase */}
            {phase === 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-notion-border p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        {t.labelProblem}
                    </label>
                    <textarea
                        value={problem}
                        onChange={(e) => setProblem(e.target.value)}
                        placeholder={t.placeholderProblem}
                        className="w-full bg-teal-50 border border-teal-100 rounded-xl p-4 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all min-h-[100px] text-lg text-gray-800"
                    />
                    <button
                        onClick={handleStart}
                        disabled={loading || !problem.trim()}
                        className={`w-full mt-6 py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all
                            ${loading || !problem.trim()
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-teal-600 text-white hover:bg-teal-700 shadow-md'
                            }`}
                    >
                         {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                         {t.btnStart}
                    </button>
                </div>
            )}

            {/* Investigation Chain */}
            {phase > 0 && (
                <div className="space-y-0 relative pb-32">
                    {/* The Original Problem Card */}
                    <div className="relative z-10 bg-gray-100 p-4 rounded-lg border border-gray-300 shadow-sm mb-8 text-center font-medium text-gray-700">
                         {problem}
                    </div>

                    {/* Connecting Line */}
                    <div className="absolute left-1/2 top-10 bottom-0 w-0.5 bg-gray-200 -z-0 transform -translate-x-1/2"></div>

                    {/* History Steps */}
                    {steps.map((step, idx) => (
                        <div key={idx} className="relative z-10 mb-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                             <div className="flex flex-col items-center">
                                 {/* Question Bubble */}
                                 <div className="bg-white border-2 border-teal-500 text-teal-700 px-4 py-2 rounded-full font-bold text-sm shadow-sm mb-3 flex items-center gap-2">
                                     <HelpCircle className="w-4 h-4" /> {step.question}
                                 </div>
                                 <ArrowDown className="w-4 h-4 text-gray-300 mb-3" />
                                 {/* Answer Card */}
                                 <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm w-full max-w-lg text-center text-gray-800">
                                     {step.answer}
                                 </div>
                                 <ArrowDown className="w-4 h-4 text-gray-300 mt-3" />
                             </div>
                        </div>
                    ))}

                    {/* Current Input Step (Only if not done) */}
                    {phase <= 5 && phase > 0 && (
                        <div className="relative z-10 animate-in zoom-in-95 duration-300">
                            <div className="flex flex-col items-center">
                                 {/* Current AI Question */}
                                 <div className="bg-teal-600 text-white px-6 py-3 rounded-full font-bold shadow-lg mb-6 flex items-center gap-2 text-lg">
                                     <HelpCircle className="w-5 h-5" /> {loading ? "..." : currentQuestion}
                                 </div>
                                 
                                 {/* Input Box */}
                                 <div className="w-full max-w-xl bg-white p-6 rounded-2xl shadow-xl border border-teal-100">
                                     <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">
                                         {t.cause}
                                     </label>
                                     <input 
                                        type="text"
                                        value={currentInput}
                                        onChange={(e) => setCurrentInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                                        autoFocus
                                        className="w-full text-lg border-b-2 border-gray-200 focus:border-teal-500 outline-none py-2 px-1 bg-transparent transition-colors"
                                        placeholder="..."
                                     />
                                     <div className="flex gap-3 mt-6">
                                         {steps.length >= 2 && (
                                             <button 
                                                onClick={() => finishAnalysis(steps)}
                                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-bold text-sm transition-colors"
                                             >
                                                 {t.btnAnalyze} (Early)
                                             </button>
                                         )}
                                         <button 
                                            onClick={handleNextStep}
                                            disabled={loading || !currentInput.trim()}
                                            className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md transition-colors disabled:opacity-50"
                                         >
                                             {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : (steps.length === 4 ? t.btnAnalyze : t.btnNext)}
                                         </button>
                                     </div>
                                 </div>
                            </div>
                        </div>
                    )}
                    
                    {/* RESULT CARD */}
                    {phase === 6 && result && (
                        <div className="relative z-10 animate-in zoom-in-95 slide-in-from-bottom-8 duration-700 mt-8">
                            <div className="bg-gray-900 text-white rounded-2xl p-8 shadow-2xl max-w-2xl mx-auto border border-gray-700">
                                <div className="flex items-start gap-4 mb-6 border-b border-gray-700 pb-6">
                                    <div className="p-3 bg-teal-500 rounded-full shrink-0">
                                        <CheckCircle2 className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-teal-400 font-bold text-sm tracking-widest uppercase mb-1">{t.rootCause}</h3>
                                        <p className="text-2xl font-bold leading-tight">{result.root_cause}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="bg-white/10 p-5 rounded-xl border border-white/5">
                                        <h4 className="text-gray-400 font-bold text-xs uppercase mb-2">{t.solution}</h4>
                                        <p className="text-lg">{result.solution}</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 text-sm text-gray-400 italic">
                                        <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                                        "{result.advice}"
                                    </div>
                                </div>

                                <button 
                                    onClick={reset}
                                    className="w-full mt-8 py-3 bg-white text-gray-900 hover:bg-gray-100 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    <RotateCcw className="w-4 h-4" /> {t.reset}
                                </button>
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>
            )}
        </div>
    );
};

export default FiveWhys;
