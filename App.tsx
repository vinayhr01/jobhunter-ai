import React, { useState } from 'react';
import { ResumeSection } from './components/ResumeSection';
import { JobSearchSection } from './components/JobSearchSection';
import { Resume, TrackedJob, JobWithAnalysis, ApplicationStatus } from './types';

// Default mock resume for better UX on first load
const INITIAL_RESUMES: Resume[] = [
  {
    id: 'default-1',
    name: 'Frontend Developer',
    content: `Experienced Frontend Engineer with 5 years in React, TypeScript, and Tailwind CSS. 
    Proficient in building responsive web applications, performance optimization, and accessible UI. 
    History of working in agile teams and delivering high-quality code.`
  }
];

const App: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>(INITIAL_RESUMES);
  const [trackedJobs, setTrackedJobs] = useState<TrackedJob[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleTrackJob = (job: JobWithAnalysis, status: ApplicationStatus) => {
    setTrackedJobs(prev => {
      const existingIndex = prev.findIndex(j => j.id === job.id);
      const now = new Date().toISOString();
      
      if (existingIndex >= 0) {
        // Update existing
        const updated = [...prev];
        const updatedJob = { ...updated[existingIndex], status };
        
        // Update appliedDate if status changes to 'applied'
        if (status === 'applied') {
           updatedJob.appliedDate = now;
        }
        
        updated[existingIndex] = updatedJob;
        return updated;
      } else {
        // Add new
        const newTrackedJob: TrackedJob = {
          ...job,
          status,
          appliedDate: status === 'applied' ? now : undefined
        };
        return [...prev, newTrackedJob];
      }
    });
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans selection:bg-emerald-500/30 relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container - Mobile: Drawer, Desktop: Static */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-full sm:w-80 
        transform transition-transform duration-300 ease-in-out 
        md:relative md:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <ResumeSection 
          resumes={resumes} 
          setResumes={setResumes} 
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 w-full min-w-0">
        <JobSearchSection 
          resumes={resumes} 
          trackedJobs={trackedJobs}
          onTrackJob={handleTrackJob}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
      </div>
    </div>
  );
};

export default App;