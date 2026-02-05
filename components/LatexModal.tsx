// components/LatexModal.tsx
import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface LatexModalProps {
  isOpen: boolean;
  onClose: () => void;
  latexCode: string;
  title?: string;
}

export const LatexModal: React.FC<LatexModalProps> = ({ isOpen, onClose, latexCode, title = "Generated Resume" }) => {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(latexCode);
    setCopied(true);
    toast.success('Copied!', 'LaTeX code has been copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">
            {title} <span className="text-zinc-500 font-normal ml-2">(LaTeX)</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors border border-zinc-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Code'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-0 overflow-hidden relative group">
          <textarea
            readOnly
            value={latexCode}
            className="w-full h-full bg-zinc-950 p-4 font-mono text-sm text-zinc-300 resize-none outline-none selection:bg-emerald-900/50 custom-scrollbar"
            spellCheck={false}
          />
        </div>

        <div className="p-3 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-500 flex justify-between">
           <span>Paste this code into Overleaf or a LaTeX compiler.</span>
           <span>{latexCode.length.toLocaleString()} characters</span>
        </div>
      </div>
    </div>
  );
};