
import React, { useState } from 'react';
import { runFirstPrinciples } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { Box, Play, RefreshCw, AlertCircle } from 'lucide-react';
import { Language } from '../types';

interface FirstPrinciplesProps {
    language: Language;
}

const FirstPrinciples: React.FC<FirstPrinciplesProps> = ({ language }) => {
  const [problem, setProblem] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text = {
      en: {
          title: "First Principles",
          subtitle: "Break down complex problems into basic elements and reassemble them from the ground up.",
          label: "The Hard Problem",
          placeholder: "e.g., Why do electric cars cost more than gas cars?",
          btn: "Deep Dive",
          loading: "Deconstructing...",
          reset: "Analyze Another Problem"
      },
      vi: {
          title: "Nguyên lý Gốc",
          subtitle: "Phân rã vấn đề phức tạp thành các yếu tố cơ bản nhất và xây dựng lại từ đầu.",
          label: "Vấn đề hóc búa",
          placeholder: "ví dụ: Tại sao xe điện đắt hơn xe xăng?",
          btn: "Đào sâu",
          loading: "Đang giải mã...",
          reset: "Phân tích vấn đề khác"
      }
  };
  const t = text[language];

  const handleAnalyze = async () => {
    if (!problem.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const analysis = await runFirstPrinciples(problem, language);
      setResult(analysis);
    } catch (e) {
      setError("Failed to generate analysis. Check API Key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-6 overflow-y-auto">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-orange-600 rounded-xl mb-4 shadow-lg">
           <Box className="w-8 h-8 text-white" />
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
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder={t.placeholder}
              className="w-full bg-notion-bg border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition-all min-h-[100px]"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !problem.trim()}
            className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-all
              ${loading || !problem.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg'
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
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
           <div className="bg-white rounded-xl shadow-lg border border-notion-border p-8 md:px-12">
              <MarkdownRenderer content={result} />
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

export default FirstPrinciples;
