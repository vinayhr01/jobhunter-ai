// components/JobCard.tsx
import React, { useState } from 'react';
import { ExternalLink, Briefcase, Building2, MapPin, CheckCircle2, AlertCircle, Sparkles, FileCode2, Loader2, Clock, SearchCode } from 'lucide-react';
import { JobWithAnalysis, Resume, TrackedJob, ApplicationStatus } from '../types';
import { generateLatexResumeSafe, generateJobDork } from '../services/gemini';
import { ResumePreviewModal } from './ResumePreviewModal';
import { useToast } from '../contexts/ToastContext';

interface JobCardProps {
  job: JobWithAnalysis | TrackedJob;
  resumes: Resume[];
  onTrackJob?: (job: JobWithAnalysis, status: ApplicationStatus) => void;
  isTracked?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({ job, resumes, onTrackJob, isTracked }) => {
  const toast = useToast();
  const matchedResume = resumes.find(r => r.id === job.analysis?.bestResumeId);
  const score = job.analysis?.matchScore || 0;
  const trackedJob = job as TrackedJob;
  
  const [isGeneratingLatex, setIsGeneratingLatex] = useState(false);
  const [latexCode, setLatexCode] = useState<string | null>(null);
  const [showDork, setShowDork] = useState(false);

  const handleGenerateTailoredResume = async () => {
    if (!matchedResume) {
      toast.warning('No Resume Match', 'No matching resume found for this job. Please ensure you have resumes added.');
      return;
    }
    
    setIsGeneratingLatex(true);
    
    const code = await generateLatexResumeSafe(matchedResume, job, toast);
    
    if (code) {
      setLatexCode(code);
    }
    // Error handling is done inside generateLatexResumeSafe with toast
    
    setIsGeneratingLatex(false);
  };

  const handleApplyClick = () => {
    if (job.url && job.url.startsWith('http')) {
      window.open(job.url, '_blank');
    } else {
      // Fallback to a smart Google Search (Dork) if URL is missing or looks fake
      const dork = generateJobDork(job.title, job.company);
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(dork)}`;
      window.open(searchUrl, '_blank');
      toast.info('Search Opened', 'No direct link found. Opening Google search for this job.');
    }
    
    // If not already tracked, track it as 'applied'
    if (onTrackJob && !isTracked) {
      onTrackJob(job, 'applied');
      toast.success('Job Tracked', `"${job.title}" has been added to your applications.`);
    }
  };

  const handleShowDork = () => {
    setShowDork(!showDork);
  };

  const handleStatusChange = (status: ApplicationStatus) => {
    if (onTrackJob) {
      onTrackJob(job, status);
      toast.info('Status Updated', `Job status changed to "${status}".`);
    }
  };

  // Dynamic color for score
  let scoreColor = "text-zinc-500";
  let scoreBg = "bg-zinc-800";
  let scoreBorder = "border-zinc-700";

  if (job.analysis) {
    if (score >= 90) {
      scoreColor = "text-emerald-400";
      scoreBg = "bg-emerald-950/40";
      scoreBorder = "border-emerald-500/30";
    } else if (score >= 70) {
      scoreColor = "text-yellow-400";
      scoreBg = "bg-yellow-950/40";
      scoreBorder = "border-yellow-500/30";
    } else {
      scoreColor = "text-red-400";
      scoreBg = "bg-red-950/40";
      scoreBorder = "border-red-500/30";
    }
  }

  const dorkQuery = generateJobDork(job.title, job.company);

  return (
    <>
      <ResumePreviewModal 
        isOpen={!!latexCode} 
        onClose={() => setLatexCode(null)} 
        latexCode={latexCode || ''} 
        resume={matchedResume || null}
        job={job}
      />

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 hover:shadow-xl hover:bg-zinc-900/80 transition-all duration-300 group relative overflow-hidden">
        {/* Top Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4 relative z-10">
          <div className="flex-1 w-full min-w-0">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg md:text-xl font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors line-clamp-2 pr-4 leading-tight">
                {job.title}
              </h3>
              {/* Mobile Score Badge (Top Right) */}
              <div className="sm:hidden flex-shrink-0 ml-2">
                  {job.isAnalyzing ? (
                    <div className="w-8 h-8 rounded-full bg-blue-900/20 border border-blue-500/30 flex items-center justify-center animate-pulse">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                    </div>
                  ) : job.analysis && (
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${scoreBg} ${scoreBorder}`}>
                        <span className={`text-sm font-bold ${scoreColor}`}>{score}</span>
                    </div>
                  )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm text-zinc-400 mb-3">
              <span className="flex items-center gap-1.5 bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800">
                <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500" />
                <span className="truncate max-w-[150px] font-medium">{job.company}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate max-w-[150px]">{job.location}</span>
              </span>
              {job.postedAt && (
                <span className="flex items-center gap-1.5 text-zinc-500 text-xs">
                  <Clock className="w-3 h-3" />
                  {job.postedAt}
                </span>
              )}
            </div>
          </div>

          {/* Desktop Score Badge */}
          <div className="hidden sm:flex flex-col items-center justify-center flex-shrink-0">
            {job.isAnalyzing ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/30 border border-blue-900/50 text-blue-400 text-xs font-medium animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                Matching...
              </div>
            ) : job.analysis ? (
              <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border ${scoreBg} ${scoreBorder} shadow-lg shadow-black/20`}>
                  <span className={`text-xl font-bold ${scoreColor}`}>{score}%</span>
                  <span className="text-[9px] text-zinc-500 uppercase font-semibold tracking-wider">Match</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 text-xs">
                Pending
              </div>
            )}
            {isTracked && (
                 <span className={`mt-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                   trackedJob.status === 'offer' ? 'bg-green-900/40 text-green-400 border-green-800' :
                   trackedJob.status === 'rejected' ? 'bg-red-900/40 text-red-400 border-red-800' :
                   trackedJob.status === 'interviewing' ? 'bg-purple-900/40 text-purple-400 border-purple-800' :
                   'bg-blue-900/40 text-blue-400 border-blue-800'
                 }`}>
                   {trackedJob.status}
                 </span>
            )}
          </div>
        </div>

        {/* Description / Summary */}
        <p className="text-zinc-400 text-sm leading-relaxed mb-4 line-clamp-3 md:line-clamp-none border-l-2 border-zinc-800 pl-3">
            {job.summary}
        </p>

        {/* Dork Query Display */}
        {showDork && (
            <div className="mb-4 p-3 bg-black/50 border border-zinc-800 rounded-lg animate-in fade-in slide-in-from-top-1 backdrop-blur-sm">
                <div className="text-xs text-zinc-500 mb-1 font-medium flex justify-between">
                    <span>Google Dork Query</span>
                    <span className="text-[10px] bg-zinc-800 px-1.5 rounded text-zinc-400">Advanced Search</span>
                </div>
                <code className="block text-xs text-emerald-400 font-mono break-all bg-black p-2 rounded border border-zinc-800 select-all">
                    {dorkQuery}
                </code>
            </div>
        )}

        {/* Analysis Details */}
        {job.analysis && (
          <div className="mt-4 pt-4 border-t border-zinc-800/50 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Recommended Resume</div>
              <div className="flex items-center gap-2 text-sm text-zinc-200 bg-zinc-950/50 px-3 py-2 rounded-lg border border-zinc-800">
                <Briefcase className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="truncate font-medium">{matchedResume ? matchedResume.name : 'Unknown'}</span>
              </div>
              <p className="mt-2 text-xs text-zinc-500 italic">
                "{job.analysis.reasoning}"
              </p>
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Missing Skills</div>
              {job.analysis.missingKeywords.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {job.analysis.missingKeywords.slice(0, 5).map((kw, idx) => (
                    <span key={idx} className="flex items-center gap-1 text-[11px] bg-red-950/20 text-red-300 px-2 py-1 rounded border border-red-900/20">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" /> {kw}
                    </span>
                  ))}
                  {job.analysis.missingKeywords.length > 5 && (
                      <span className="text-[10px] text-zinc-600 px-1">+{job.analysis.missingKeywords.length - 5} more</span>
                  )}
                </div>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-emerald-500 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/20 w-fit">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Perfect Match
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-4 border-t border-zinc-800">
           {/* Status Toggles (Only if tracked) */}
           {isTracked && onTrackJob ? (
             <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
               {(['applied', 'interviewing', 'offer', 'rejected'] as ApplicationStatus[]).map(s => (
                 <button 
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize border transition-colors whitespace-nowrap ${trackedJob.status === s ? 'bg-zinc-700 text-white border-zinc-600 shadow-sm' : 'bg-transparent text-zinc-500 border-transparent hover:bg-zinc-800'}`}
                 >
                  {s}
                 </button>
               ))}
             </div>
           ) : (
             <button 
                onClick={handleShowDork}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center justify-center sm:justify-start gap-1.5 transition-colors py-2 sm:py-0"
             >
                <SearchCode className="w-3.5 h-3.5" />
                {showDork ? 'Hide Query' : 'Debug Search'}
             </button>
           )}

           <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              {job.analysis && (
                 <button 
                   onClick={handleGenerateTailoredResume}
                   disabled={isGeneratingLatex}
                   className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition-all border border-zinc-700 disabled:opacity-50 hover:shadow-md"
                 >
                   {isGeneratingLatex ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode2 className="w-4 h-4 text-blue-400" />}
                   Preview/PDF
                 </button>
              )}
              <button 
                onClick={handleApplyClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40"
              >
                {isTracked ? 'View Listing' : 'Apply & Track'}
                <ExternalLink className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>
    </>
  );
};