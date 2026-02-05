// components/TailorModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, FileText } from 'lucide-react';
import { Resume } from '../types';
import { generateLatexResumeSafe } from '../services/gemini';
import { ResumePreviewModal } from './ResumePreviewModal';
import { useToast } from '../contexts/ToastContext';

interface TailorModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumes: Resume[];
}

export const TailorModal: React.FC<TailorModalProps> = ({ isOpen, onClose, resumes }) => {
  const toast = useToast();
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [latexCode, setLatexCode] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedResumeId(resumes[0]?.id || '');
      setJobTitle('');
      setCompany('');
      setJobDescription('');
      setLatexCode(null);
    }
  }, [isOpen, resumes]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    // Validation
    if (resumes.length === 0) {
      toast.error('No Resumes', 'Please add a resume first before tailoring.');
      return;
    }
    
    const resume = resumes.find(r => r.id === selectedResumeId);
    
    if (!resume) {
      toast.warning('No Resume Selected', 'Please select a resume first.');
      return;
    }
    
    if (!jobTitle.trim()) {
      toast.warning('Missing Job Title', 'Please enter a job title.');
      return;
    }
    
    if (!jobDescription.trim()) {
      toast.warning('Missing Description', 'Please enter a job description for better tailoring.');
      return;
    }

    setIsGenerating(true);
    
    const code = await generateLatexResumeSafe(resume, {
      id: 'manual',
      title: jobTitle.trim(),
      company: company.trim() || 'Potential Employer',
      location: 'Unknown',
      summary: jobDescription.trim()
    }, toast);
    
    if (code) {
      setLatexCode(code);
    }
    // Error handling is done inside generateLatexResumeSafe with toast
    
    setIsGenerating(false);
  };

  const handleClose = () => {
    if (isGenerating) {
      toast.warning('Generation in Progress', 'Please wait for the resume to finish generating.');
      return;
    }
    onClose();
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
            company: company || 'Potential Employer', 
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
              onClick={handleClose}
              disabled={isGenerating}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  disabled={isGenerating || resumes.length === 0}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
               >
                 {resumes.length === 0 ? (
                   <option value="">No resumes available - Add one first</option>
                 ) : (
                   resumes.map(r => (
                     <option key={r.id} value={r.id}>{r.name}</option>
                   ))
                 )}
               </select>
               {resumes.length === 0 && (
                 <p className="text-xs text-red-400 mt-1">Please add a resume first.</p>
               )}
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                   Job Title <span className="text-red-400">*</span>
                 </label>
                 <input 
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Product Designer"
                    disabled={isGenerating}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm disabled:opacity-50 transition-all"
                 />
               </div>
               <div>
                 <label className="block text-xs font-medium text-zinc-400 mb-1.5">Company</label>
                 <input 
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    disabled={isGenerating}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm disabled:opacity-50 transition-all"
                 />
               </div>
             </div>

             <div>
               <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                 Job Description <span className="text-red-400">*</span>
               </label>
               <textarea 
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here for better tailoring..."
                  disabled={isGenerating}
                  className="w-full h-40 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm resize-none disabled:opacity-50 transition-all custom-scrollbar"
               />
               <p className="text-[10px] text-zinc-500 mt-1">
                 The more detailed the description, the better the resume tailoring.
               </p>
             </div>
          </div>

          <div className="p-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900 z-10 flex-shrink-0">
             <button
               onClick={handleClose}
               disabled={isGenerating}
               className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             >
               Cancel
             </button>
             <button
               onClick={handleGenerate}
               disabled={isGenerating || !jobTitle.trim() || !jobDescription.trim() || resumes.length === 0}
               className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/20"
             >
               {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
               {isGenerating ? 'Generating...' : 'Generate Resume'}
             </button>
          </div>
        </div>
      </div>
    </>
  );
};