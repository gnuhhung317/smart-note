
import React, { useState, useRef, useEffect } from 'react';
import { Moon, Send, RefreshCw, Ghost } from 'lucide-react';
import { runShadowWorkChat } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { Language } from '../types';

interface ShadowWorkProps {
    language: Language;
}

const ShadowWork: React.FC<ShadowWorkProps> = ({ language }) => {
    const [messages, setMessages] = useState<{role: 'USER' | 'AI', content: string}[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const text = {
        en: {
            title: "Shadow Work",
            subtitle: "A safe space to explore the unconscious. No advice, just reflection.",
            placeholder: "What is heavy on your heart right now?",
            welcome: "I am here to hold the mirror. Tell me, what emotion is surfacing for you today?",
            loading: "Reflecting..."
        },
        vi: {
            title: "Bạn Đồng Hành Tâm Lý",
            subtitle: "Không gian an toàn để khám phá tiềm thức. Không khuyên nhủ, chỉ phản chiếu.",
            placeholder: "Điều gì đang đè nặng lên lòng bạn?",
            welcome: "Tôi ở đây để giữ tấm gương soi chiếu. Hãy kể tôi nghe, cảm xúc nào đang trỗi dậy trong bạn hôm nay?",
            loading: "Đang suy ngẫm..."
        }
    };
    const t = text[language];

    // Initial Welcome Message
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{ role: 'AI', content: t.welcome }]);
        }
    }, [language]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'USER', content: userMsg }]);
        setLoading(true);

        try {
            // Pass history excluding the very last user message we just added locally
            // (The service reconstructs the full context)
            const response = await runShadowWorkChat(messages, userMsg, language);
            setMessages(prev => [...prev, { role: 'AI', content: response }]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#1a1a1a] text-gray-200 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] bg-purple-900/20 rounded-full blur-[100px]"></div>
            </div>

            {/* Header */}
            <div className="flex flex-col items-center justify-center pt-8 pb-4 shrink-0 z-10 relative">
                 <div className="bg-white/5 p-3 rounded-full mb-3 backdrop-blur-sm border border-white/10 shadow-lg">
                    <Ghost className="w-6 h-6 text-indigo-300" />
                 </div>
                 <h1 className="text-2xl font-serif tracking-widest text-indigo-100">{t.title}</h1>
                 <p className="text-xs text-indigo-300/60 font-medium uppercase tracking-[0.2em] mt-1">{t.subtitle}</p>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-4 py-6 z-10">
                <div className="max-w-2xl mx-auto space-y-8">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex w-full ${msg.role === 'USER' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                            <div className={`max-w-[85%] p-6 rounded-2xl leading-relaxed font-serif text-lg tracking-wide shadow-sm
                                ${msg.role === 'USER' 
                                    ? 'bg-indigo-900/40 border border-indigo-500/30 text-indigo-100 rounded-br-sm' 
                                    : 'bg-white/5 border border-white/10 text-gray-300 rounded-bl-sm'
                                }
                            `}>
                                <MarkdownRenderer content={msg.content} />
                            </div>
                        </div>
                    ))}
                    
                    {loading && (
                        <div className="flex justify-start w-full">
                            <div className="flex items-center gap-2 text-indigo-400/50 text-sm font-serif italic pl-4">
                                <Moon className="w-3 h-3 animate-pulse" /> {t.loading}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="p-6 shrink-0 z-20">
                <div className="max-w-2xl mx-auto relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t.placeholder}
                        className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-6 pr-14 text-indigo-100 placeholder-indigo-400/30 focus:outline-none focus:bg-white/10 focus:border-indigo-500/50 transition-all font-serif"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className={`absolute right-2 top-2 p-2 rounded-full transition-all
                            ${input.trim() && !loading ? 'text-indigo-300 hover:text-white hover:bg-white/10' : 'text-gray-600 cursor-not-allowed'}
                        `}
                    >
                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShadowWork;
