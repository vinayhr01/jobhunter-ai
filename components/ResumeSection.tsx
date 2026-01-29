import React, { useState, useRef } from 'react';
import { Plus, Trash2, FileText, X, FileCode2, Loader2, Upload, AlertTriangle, User } from 'lucide-react';
import { Resume } from '../types';
import { generateLatexResume, parseResumeFromFile } from '../services/gemini';
import { ResumePreviewModal } from './ResumePreviewModal';

interface ResumeSectionProps {
  resumes: Resume[];
  setResumes: React.Dispatch<React.SetStateAction<Resume[]>>;
  onClose?: () => void;
}

export const ResumeSection: React.FC<ResumeSectionProps> = ({ resumes, setResumes, onClose }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  
  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Latex/Preview State
  const [isGeneratingLatex, setIsGeneratingLatex] = useState<string | null>(null);
  const [latexCode, setLatexCode] = useState<string | null>(null);
  const [selectedResumeForPreview, setSelectedResumeForPreview] = useState<Resume | null>(null);

  const handleAddResume = () => {
    if (!newName.trim() || !newContent.trim()) return;
    
    const newResume: Resume = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      content: newContent
    };
    
    setResumes([...resumes, newResume]);
    setNewName('');
    setNewContent('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setResumes(resumes.filter(r => r.id !== id));
  };

  const handleGeneratePreview = async (resume: Resume) => {
    try {
      setIsGeneratingLatex(resume.id);
      const code = await generateLatexResume(resume);
      setLatexCode(code);
      setSelectedResumeForPreview(resume);
    } catch (e) {
      console.error(e);
      alert("Failed to generate content");
    } finally {
      setIsGeneratingLatex(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadWarning(null);

    // Validate file type
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a PDF or Image (PNG/JPG) file.");
      return;
    }

    setIsUploading(true);
    try {
      const parsedData = await parseResumeFromFile(file);
      
      if (parsedData.confidenceScore < 60) {
        setUploadWarning(`Parsing quality was low (${parsedData.confidenceScore}%). Please check the extracted text.`);
      }

      const newResume: Resume = {
        id: Math.random().toString(36).substr(2, 9),
        name: parsedData.name || file.name,
        content: parsedData.content
      };

      setResumes(prev => [...prev, newResume]);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error(error);
      alert("Failed to parse the file. Please try copying the text manually.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <ResumePreviewModal 
        isOpen={!!latexCode} 
        onClose={() => { setLatexCode(null); setSelectedResumeForPreview(null); }} 
        latexCode={latexCode || ''} 
        resume={selectedResumeForPreview}
      />

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf, .png, .jpg, .jpeg"
      />

      <div className="flex flex-col h-full bg-zinc-950/95 backdrop-blur border-r border-zinc-800 w-full md:w-80 flex-shrink-0 shadow-2xl md:shadow-none">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-start bg-zinc-950 z-10 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Profiles
            </h2>
            <p className="text-zinc-500 text-xs mt-1">
              Manage your diverse resumes.
            </p>
          </div>
          
          {/* Mobile Close Button */}
          <button 
            onClick={onClose} 
            className="md:hidden text-zinc-400 hover:text-white p-2 bg-zinc-900 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {/* Loading State for Upload */}
          {isUploading && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 flex flex-col items-center justify-center gap-3 animate-pulse">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <div className="text-center">
                 <p className="text-sm font-medium text-white">Parsing Resume</p>
                 <p className="text-xs text-zinc-500">Extracting text via AI Vision...</p>
              </div>
            </div>
          )}
          
          {uploadWarning && (
            <div className="bg-yellow-900/10 border border-yellow-700/30 rounded-lg p-3 flex gap-2 items-start text-xs text-yellow-500 mb-2">
               <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
               <span className="flex-1">{uploadWarning}</span>
               <button onClick={() => setUploadWarning(null)} className="hover:text-white"><X className="w-3 h-3"/></button>
            </div>
          )}

          {resumes.map(resume => (
            <div key={resume.id} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-all group relative shadow-sm hover:shadow-md">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-900/20 group-hover:text-emerald-400 transition-colors">
                      <User className="w-4 h-4" />
                   </div>
                   <h3 className="font-medium text-zinc-200 text-sm group-hover:text-white transition-colors">{resume.name}</h3>
                </div>
                
                <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={() => handleGeneratePreview(resume)}
                    disabled={!!isGeneratingLatex}
                    className="text-zinc-500 hover:text-emerald-400 p-2 hover:bg-zinc-700/50 rounded-lg transition-colors"
                    title="Generate PDF/LaTeX"
                  >
                    {isGeneratingLatex === resume.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode2 className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => handleDelete(resume.id)}
                    className="text-zinc-500 hover:text-red-400 p-2 hover:bg-zinc-700/50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-500 line-clamp-2 pl-10">{resume.content}</p>
            </div>
          ))}

          {resumes.length === 0 && !isAdding && !isUploading && (
            <div className="text-center py-10 text-zinc-600 text-sm flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
                 <FileText className="w-6 h-6 opacity-50" />
              </div>
              No resumes added yet. <br/> Upload or paste one to start.
            </div>
          )}

          {isAdding && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 shadow-lg mb-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">New Resume</h3>
              <input
                type="text"
                placeholder="Profile Name (e.g. React Dev)"
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <textarea
                placeholder="Paste resume text here..."
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none h-32 resize-none custom-scrollbar"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddResume}
                  disabled={!newName || !newContent}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs px-4 py-1.5 rounded-lg font-medium shadow-lg shadow-emerald-900/20 transition-all"
                >
                  Save Profile
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 space-y-3 bg-zinc-950 flex-shrink-0">
          {/* Add Resume Button */}
          <button
            onClick={() => setIsAdding(true)}
            disabled={isAdding || isUploading}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            Paste Text
          </button>
          
          {/* Upload Resume Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAdding || isUploading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40"
          >
            <Upload className="w-4 h-4" />
            Upload PDF / Image
          </button>
        </div>
      </div>
    </>
  );
};