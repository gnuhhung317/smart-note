import React, { useState } from 'react';
import { Key, ExternalLink, Check } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onClose }) => {
  const [apiKey, setApiKey] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-notion-border overflow-hidden">
        
        {/* Header */}
        <div className="bg-notion-sidebar px-6 py-4 border-b border-notion-border flex items-center gap-3">
            <div className="bg-white p-2 rounded-full border border-notion-border">
                <Key className="w-5 h-5 text-gray-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Enter API Key</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Socratic Notes requires a Google Gemini API Key to function. 
            Your key is stored <strong>locally in your browser</strong> and is never sent to our servers.
          </p>
          
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Gemini API Key
            </label>
            <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-notion-bg border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all"
            />
          </div>

          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline w-fit"
          >
            Get an API key from Google AI Studio <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-notion-border flex justify-end gap-3">
             {/* Only show cancel if we are just editing, not mandatory. But for simplicity, we assume mandatory first time. */}
             {apiKey.length === 0 && (
                 <button 
                 onClick={onClose}
                 className="text-gray-500 text-sm hover:text-gray-800 px-3 py-2"
                >
                 Cancel
                </button>
             )}
            <button
                onClick={() => {
                    if (apiKey.trim()) onSave(apiKey.trim());
                }}
                disabled={!apiKey.trim()}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${apiKey.trim() 
                        ? 'bg-gray-900 text-white hover:bg-gray-700 shadow-sm' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                `}
            >
                <Check className="w-4 h-4" /> Save Key
            </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;