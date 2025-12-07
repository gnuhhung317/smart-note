
import React, { useState } from 'react';
import { runDevilsDictionary } from '../services/geminiService';
import { Flame, RefreshCw, Copy, Search, Feather } from 'lucide-react';
import { Language, DevilsDictionaryResult } from '../types';

interface DevilsDictionaryProps {
    language: Language;
}

const DevilsDictionary: React.FC<DevilsDictionaryProps> = ({ language }) => {
    const [word, setWord] = useState('');
    const [result, setResult] = useState<DevilsDictionaryResult | null>(null);
    const [loading, setLoading] = useState(false);

    const text = {
        en: {
            title: "The Devil's Dictionary",
            subtitle: "Redefining the world with cynicism, wit, and dark truth.",
            placeholder: "Enter a word (e.g. Happiness, Politics)...",
            btn: "Redefine",
            loading: "Consulting the dark spirits...",
            usage: "Usage",
            copy: "Copied"
        },
        vi: {
            title: "Từ Điển Của Quỷ",
            subtitle: "Định nghĩa lại thế giới bằng sự châm biếm, cay độc và sự thật trần trụi.",
            placeholder: "Nhập một từ (vd: Hạnh phúc, Deadline)...",
            btn: "Định nghĩa lại",
            loading: "Đang triệu hồi sự cay độc...",
            usage: "Ví dụ",
            copy: "Đã sao chép"
        }
    };
    const t = text[language];

    const handleSearch = async () => {
        if (!word.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const data = await runDevilsDictionary(word, language);
            setResult(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast here
    };

    return (
        <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-6 overflow-y-auto">
            <div className="text-center mb-8 shrink-0">
                <div className="inline-flex items-center justify-center p-3 bg-red-950 text-red-500 rounded-full mb-4 shadow-xl ring-4 ring-red-900/20">
                    <Flame className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-serif font-bold text-gray-900 tracking-tight mb-2">{t.title}</h1>
                <p className="text-gray-500 italic font-serif">
                    "{t.subtitle}"
                </p>
            </div>

            {/* Input */}
            <div className="bg-white p-2 rounded-full border-2 border-gray-200 shadow-sm flex items-center mb-10 transition-all focus-within:ring-4 focus-within:ring-red-100 focus-within:border-red-400">
                <input 
                    type="text"
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={t.placeholder}
                    className="flex-1 bg-transparent px-6 py-3 outline-none text-lg font-serif placeholder-gray-400"
                />
                <button
                    onClick={handleSearch}
                    disabled={loading || !word.trim()}
                    className="p-3 bg-gray-900 text-white rounded-full hover:bg-black transition-colors disabled:bg-gray-300"
                >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
            </div>

            {/* Result Card */}
            {result && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="bg-[#fffbf0] text-gray-900 p-8 md:p-12 rounded-xl shadow-xl border border-[#eaddcf] relative overflow-hidden group">
                        
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 p-24 opacity-5 pointer-events-none">
                            <Feather className="w-40 h-40 text-black transform rotate-45" />
                        </div>

                        {/* Word */}
                        <div className="flex justify-between items-start mb-6 border-b-2 border-gray-900 pb-4">
                            <h2 className="text-3xl font-serif font-black uppercase tracking-widest">{result.word}</h2>
                            <button 
                                onClick={() => copyToClipboard(`${result.word}: ${result.definition}`)}
                                className="text-gray-400 hover:text-gray-900 transition-colors"
                                title="Copy definition"
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Definition */}
                        <div className="mb-8">
                             <p className="text-2xl font-serif leading-relaxed font-medium">
                                 {result.definition}
                             </p>
                        </div>

                        {/* Context */}
                        <div className="bg-black/5 p-4 rounded-lg italic font-serif text-gray-600 text-sm border-l-2 border-gray-400">
                            <span className="font-bold not-italic text-gray-900 text-xs uppercase tracking-wider block mb-1">{t.usage}</span>
                            "{result.usage}"
                        </div>
                    </div>
                </div>
            )}
            
            {/* Empty State / Loading Placeholder */}
            {loading && !result && (
                <div className="text-center text-gray-400 italic font-serif animate-pulse mt-10">
                    {t.loading}
                </div>
            )}
        </div>
    );
};

export default DevilsDictionary;
