
import React, { useState } from 'react';
import { runSixHats } from '../services/geminiService';
import { Layers, Play, RefreshCw, AlertCircle } from 'lucide-react';
import { SixHatsResult, Language } from '../types';

interface SixHatsProps {
    language: Language;
}

const SixHats: React.FC<SixHatsProps> = ({ language }) => {
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState<SixHatsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const text = {
      en: {
          title: "360° Analysis",
          subtitle: "Apply the Six Thinking Hats method to explore a project or idea from every angle.",
          label: "What are we analyzing?",
          placeholder: "e.g., Launching a new mobile app for pet owners...",
          btn: "Analyze 360°",
          loading: "Putting on hats...",
          reset: "Analyze New Topic"
      },
      vi: {
          title: "Phân tích 360°",
          subtitle: "Áp dụng phương pháp 6 chiếc mũ tư duy để đánh giá dự án từ mọi góc độ.",
          label: "Bạn muốn phân tích gì?",
          placeholder: "ví dụ: Ra mắt ứng dụng mới cho người nuôi thú cưng...",
          btn: "Phân tích 360°",
          loading: "Đang đội mũ...",
          reset: "Phân tích vấn đề khác"
      }
  };
  const t = text[language];

  const handleAnalyze = async () => {
    if (!topic.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const analysis = await runSixHats(topic, language);
      if (analysis) {
          setResult(analysis);
      } else {
          setError("Failed to parse AI response. Please try again.");
      }
    } catch (e) {
      setError("Failed to generate analysis. Check API Key.");
    } finally {
      setLoading(false);
    }
  };

  const HatCard = ({ color, title, content, icon }: { color: string, title: string, content: string, icon: string }) => {
     const colorMap: {[key: string]: string} = {
         'white': 'bg-white border-gray-200 text-gray-800',
         'red': 'bg-red-50 border-red-200 text-red-900',
         'black': 'bg-gray-800 border-gray-900 text-gray-100',
         'yellow': 'bg-yellow-50 border-yellow-200 text-yellow-900',
         'green': 'bg-green-50 border-green-200 text-green-900',
         'blue': 'bg-blue-50 border-blue-200 text-blue-900',
     };

     return (
         <div className={`p-6 rounded-xl border shadow-sm flex flex-col h-full ${colorMap[color]}`}>
             <div className="flex items-center gap-3 mb-3 border-b border-black/5 pb-3">
                 <span className="text-2xl">{icon}</span>
                 <h3 className="font-bold uppercase tracking-wider text-sm opacity-90">{title}</h3>
             </div>
             <p className="text-sm leading-relaxed opacity-90">{content}</p>
         </div>
     );
  };

  return (
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto p-6 overflow-y-auto">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-xl mb-4 shadow-lg">
           <Layers className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">{t.title}</h1>
        <p className="text-gray-500 max-w-lg mx-auto">
            {t.subtitle}
        </p>
      </div>

      {!result && (
        <div className="bg-white rounded-xl shadow-sm border border-notion-border p-6 md:p-8 space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t.label}
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t.placeholder}
              className="w-full bg-notion-bg border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all min-h-[100px]"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !topic.trim()}
            className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-all
              ${loading || !topic.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
              }`}
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {loading ? t.loading : t.btn}
          </button>
          
          {error && (
            <div className="text-red-500 text-sm flex items-center gap-2 justify-center bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-12">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <HatCard color="white" title={result.white_hat.title} content={result.white_hat.content} icon="📄" />
              <HatCard color="red" title={result.red_hat.title} content={result.red_hat.content} icon="❤️" />
              <HatCard color="black" title={result.black_hat.title} content={result.black_hat.content} icon="⚠️" />
              <HatCard color="yellow" title={result.yellow_hat.title} content={result.yellow_hat.content} icon="☀️" />
              <HatCard color="green" title={result.green_hat.title} content={result.green_hat.content} icon="🌱" />
              <HatCard color="blue" title={result.blue_hat.title} content={result.blue_hat.content} icon="📘" />
           </div>
           
           <div className="flex justify-center">
              <button 
                onClick={() => setResult(null)}
                className="text-gray-500 hover:text-gray-900 underline text-sm"
              >
                {t.reset}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default SixHats;
