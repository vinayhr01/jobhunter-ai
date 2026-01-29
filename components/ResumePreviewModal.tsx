import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, Code, Eye, Printer } from 'lucide-react';
import { generateHtmlResume } from '../services/gemini';
import { Resume, JobWithAnalysis } from '../types';

interface ResumePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  latexCode: string;
  resume: Resume | null;
  job?: JobWithAnalysis;
}

export const ResumePreviewModal: React.FC<ResumePreviewModalProps> = ({ isOpen, onClose, latexCode, resume, job }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'latex'>('preview');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && resume && activeTab === 'preview' && !htmlContent) {
      loadHtmlPreview();
    }
  }, [isOpen, activeTab]);

  const loadHtmlPreview = async () => {
    if (!resume) return;
    setIsLoadingPreview(true);
    try {
      const html = await generateHtmlResume(resume, job);
      setHtmlContent(html);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(latexCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900 z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-white">Resume Generator</h3>
            <div className="flex bg-zinc-800 rounded-lg p-1 border border-zinc-700">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'preview' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button
                onClick={() => setActiveTab('latex')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'latex' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <Code className="w-4 h-4" /> LaTeX Code
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {activeTab === 'preview' ? (
              <button
                onClick={handlePrint}
                disabled={isLoadingPreview || !htmlContent}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm transition-colors font-medium disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                Download PDF
              </button>
            ) : (
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors border border-zinc-700"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy Code'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 bg-zinc-950 overflow-hidden relative">
          {activeTab === 'preview' ? (
            <div className="w-full h-full overflow-y-auto p-8 flex justify-center bg-zinc-900/50 custom-scrollbar">
              {isLoadingPreview ? (
                <div className="flex flex-col items-center justify-center text-zinc-500 gap-3">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                   <p>Generating PDF Preview...</p>
                </div>
              ) : (
                <div 
                  className="bg-white text-black shadow-2xl w-[210mm] min-h-[297mm] p-[10mm] origin-top transform scale-[0.6] sm:scale-75 md:scale-100 transition-transform mb-20"
                  dangerouslySetInnerHTML={{ __html: htmlContent }} 
                />
              )}
            </div>
          ) : (
            <textarea
              readOnly
              value={latexCode}
              className="w-full h-full bg-zinc-950 p-6 font-mono text-sm text-zinc-300 resize-none outline-none selection:bg-emerald-900/50 custom-scrollbar"
              spellCheck={false}
            />
          )}
        </div>
        
        <div className="p-3 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-500 flex justify-between items-center flex-shrink-0">
           <span>{activeTab === 'preview' ? 'Use the print dialog to Save as PDF.' : 'Paste this code into Overleaf.'}</span>
           {job && <span className="text-zinc-400">Tailored for {job.company}</span>}
        </div>
      </div>
    </div>
  );
};