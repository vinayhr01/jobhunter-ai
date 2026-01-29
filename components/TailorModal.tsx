import React, { useState } from 'react';
import { X, Sparkles, Loader2, FileText } from 'lucide-react';
import { Resume } from '../types';
import { generateLatexResume } from '../services/gemini';
import { ResumePreviewModal } from './ResumePreviewModal';

interface TailorModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumes: Resume[];
}

export const TailorModal: React.FC<TailorModalProps> = ({ isOpen, onClose, resumes }) => {
  const [selectedResumeId, setSelectedResumeId] = useState<string>(resumes[0]?.id || '');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [latexCode, setLatexCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    const resume = resumes.find(r => r.id === selectedResumeId);
    if (!resume || !jobTitle || !jobDescription) return;

    setIsGenerating(true);
    try {
      const code = await generateLatexResume(resume, {
        id: 'manual',
        title: jobTitle,
        company: company || 'Potential Employer',
        location: 'Unknown',
        summary: jobDescription
      });
      setLatexCode(code);
    } catch (e) {
      console.error(e);
      alert("Failed to generate tailored resume");
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedResume = resumes.find(r => r.id === selectedResumeId);

  return (
    <>
      <ResumePreviewModal 
        isOpen={!!latexCode} 
        onClose={() => setLatexCode(null)} 
        latexCode={latexCode || ''} 
        resume={selectedResume || null}
        job={{ 
            id: 'external', 
            title: jobTitle, 
            company: company, 
            location: 'External', 
            summary: jobDescription 
        }}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900 z-10">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Tailor for External Job
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
             <div>
               <label className="block text-xs font-medium text-zinc-400 mb-1.5">Select Resume</label>
               <select 
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
               >
                 {resumes.map(r => (
                   <option key={r.id} value={r.id}>{r.name}</option>
                 ))}
               </select>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-medium text-zinc-400 mb-1.5">Job Title</label>
                 <input 
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Product Designer"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                 />
               </div>
               <div>
                 <label className="block text-xs font-medium text-zinc-400 mb-1.5">Company</label>
                 <input 
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                 />
               </div>
             </div>

             <div>
               <label className="block text-xs font-medium text-zinc-400 mb-1.5">Job Description</label>
               <textarea 
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                  className="w-full h-40 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm resize-none"
               />
             </div>
          </div>
          
          <div className="p-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900 z-10 flex-shrink-0">
             <button
               onClick={onClose}
               className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
             >
               Cancel
             </button>
             <button
               onClick={handleGenerate}
               disabled={isGenerating || !jobTitle || !jobDescription}
               className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
               Generate Resume
             </button>
          </div>
        </div>
      </div>
    </>
  );
};