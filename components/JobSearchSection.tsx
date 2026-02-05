// components/JobSearchSection.tsx
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Sparkles, Menu, FileText, ClipboardList, BriefcaseIcon, Filter, Globe, ChevronDown, Check, Clock, Save, Trash2, RotateCcw, Settings, AlertTriangle, ExternalLink, ArrowRight, Link, PenTool } from 'lucide-react';
import { JobWithAnalysis, Resume, TrackedJob, ApplicationStatus, Job } from '../types';
import { 
  searchJobsSafe, 
  analyzeJobMatchSafe, 
  getSearchQueryFromResumeSafe, 
  SearchFilters, 
  generateDorkFromResumeSafe, 
  extractJobDetailsSafe,
  getLLMSettings
} from '../services/gemini';
import { JobCard } from './JobCard';
import { SettingsModal } from './SettingsModal';
import { InputModal } from './InputModal';
import { useToast } from '../contexts/ToastContext';

// LocalStorage key for saved filters
const SAVED_FILTERS_KEY = 'jobhunter_saved_filters';

interface JobSearchSectionProps {
  resumes: Resume[];
  trackedJobs: TrackedJob[];
  onTrackJob: (job: JobWithAnalysis, status: ApplicationStatus) => void;
  onMenuClick?: () => void;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: SearchFilters;
}

// Helper functions for localStorage
const loadSavedFilters = (): SavedFilter[] => {
  try {
    const stored = localStorage.getItem(SAVED_FILTERS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load saved filters:', e);
  }
  return [];
};

const persistSavedFilters = (filters: SavedFilter[]) => {
  try {
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(filters));
  } catch (e) {
    console.error('Failed to save filters:', e);
  }
};

const MultiSelectDropdown = ({ 
  label, 
  options, 
  selected, 
  onChange 
}: { 
  label: string; 
  options: string[]; 
  selected: string[]; 
  onChange: (val: string) => void; 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 w-full px-3 py-2 text-sm border rounded-lg transition-all outline-none ${selected.length > 0 ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-zinc-950 border-zinc-700 text-zinc-300 hover:border-zinc-600'}`}
      >
        <span className="truncate">
          {selected.length > 0 ? `${label} (${selected.length})` : label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)} 
        />
      )}
      
      {/* Dropdown Menu - Fixed z-index */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
           <div className="p-1 space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
             {options.map(opt => {
               const isSelected = selected.includes(opt);
               return (
                 <button
                   key={opt}
                   type="button"
                   onClick={(e) => {
                     e.stopPropagation();
                     onChange(opt);
                   }}
                   className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left rounded-md transition-colors ${isSelected ? 'bg-emerald-600/20 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800'}`}
                 >
                   <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-zinc-600'}`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                   </div>
                   {opt}
                 </button>
               )
             })}
           </div>
        </div>
      )}
    </div>
  );
};

export const JobSearchSection: React.FC<JobSearchSectionProps> = ({ resumes, trackedJobs, onTrackJob, onMenuClick }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'search' | 'tracked'>('search');
  
  // Search State
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'keyword' | 'resume' | 'manual'>('keyword');
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [jobs, setJobs] = useState<JobWithAnalysis[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeneratingQuery, setIsGeneratingQuery] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    locations: [],
    jobTypes: [],
    workModes: [],
    datePosted: 'any'
  });

  // Saved Filters State - Load from localStorage on mount
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => loadSavedFilters());
  const [isFilterNameModalOpen, setIsFilterNameModalOpen] = useState(false);

  // Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Tracking Filter State
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');

  // External / Manual Job State
  const [dorkResumeId, setDorkResumeId] = useState<string>('');
  const [generatedDork, setGeneratedDork] = useState('');
  const [isGeneratingDork, setIsGeneratingDork] = useState(false);

  // Application Details State
  const [entryMode, setEntryMode] = useState<'manual' | 'auto'>('manual');
  const [urlToExtract, setUrlToExtract] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [manualJob, setManualJob] = useState<{title: string, company: string, url: string, description: string}>({
      title: '', company: '', url: '', description: ''
  });
  const [isAnalyzingManual, setIsAnalyzingManual] = useState(false);

  // Persist saved filters whenever they change
  useEffect(() => {
    persistSavedFilters(savedFilters);
  }, [savedFilters]);

  // Update selected resume when resumes change
  useEffect(() => {
    if (resumes.length > 0) {
      if (!selectedResumeId || !resumes.find(r => r.id === selectedResumeId)) {
        setSelectedResumeId(resumes[0].id);
      }
      if (!dorkResumeId || !resumes.find(r => r.id === dorkResumeId)) {
        setDorkResumeId(resumes[0].id);
      }
    } else {
      setSelectedResumeId('');
      setDorkResumeId('');
    }
  }, [resumes, selectedResumeId, dorkResumeId]);

  const toggleFilterArray = (key: 'locations' | 'jobTypes' | 'workModes', value: string) => {
    setFilters(prev => {
      const current = prev[key];
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists ? current.filter(v => v !== value) : [...current, value]
      };
    });
  };

  const handleSaveFilter = () => {
    if (Object.values(filters).every(v => Array.isArray(v) ? v.length === 0 : v === 'any')) {
      toast.warning('Empty Filters', 'Please set some filters before saving.');
      return;
    }
    setIsFilterNameModalOpen(true);
  };

  const handleSaveFilterWithName = (name: string) => {
    const newSavedFilter: SavedFilter = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      filters: { ...filters }
    };
    setSavedFilters(prev => [...prev, newSavedFilter]);
    toast.success('Filter Saved', `"${name}" has been saved.`);
  };

  const handleApplySavedFilter = (sf: SavedFilter) => {
    setFilters(sf.filters);
    toast.info('Filter Applied', `"${sf.name}" filters have been applied.`);
  };

  const handleDeleteSavedFilter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filter = savedFilters.find(f => f.id === id);
    setSavedFilters(prev => prev.filter(f => f.id !== id));
    toast.info('Filter Deleted', filter ? `"${filter.name}" has been removed.` : 'Filter removed.');
  };

  const handleResetFilters = () => {
    setFilters({
      locations: [],
      jobTypes: [],
      workModes: [],
      datePosted: 'any'
    });
    toast.info('Filters Reset', 'All filters have been cleared.');
  };

  // Check if API is configured
  const checkApiConfiguration = (): boolean => {
    const settings = getLLMSettings();
    if (!settings.apiKey && settings.provider !== 'custom') {
      toast.error('API Key Required', 'Please configure your API key in Settings before searching.');
      setIsSettingsOpen(true);
      return false;
    }
    return true;
  };

  const performSearch = async (searchQuery: string) => {
    if (!checkApiConfiguration()) return;
    
    setIsSearching(true);
    setError(null);
    setJobs([]);
    
    toast.info('Searching Jobs', `Looking for "${searchQuery}"...`);
    
    const foundJobs = await searchJobsSafe(searchQuery, filters, toast);
    
    if (foundJobs.length === 0) {
      setError("No jobs found. Try a different query or loosen your filters.");
      setIsSearching(false);
      return;
    }
    
    const jobsWithState: JobWithAnalysis[] = foundJobs.map(j => ({ ...j, isAnalyzing: true }));
    setJobs(jobsWithState);
    setIsSearching(false);

    // Analyze sequentially
    for (const job of jobsWithState) {
      const analysis = await analyzeJobMatchSafe(job, resumes, toast);
      setJobs(currentJobs => 
        currentJobs.map(j => 
          j.id === job.id 
            ? { ...j, analysis: analysis || undefined, isAnalyzing: false } 
            : j
        )
      );
    }
  };

  const handleKeywordSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.warning('Empty Query', 'Please enter a search term.');
      return;
    }
    if (resumes.length === 0) {
      toast.error('No Resumes', 'Please add at least one resume before searching so we can match you!');
      setError("Please add at least one resume before searching so we can match you!");
      return;
    }
    performSearch(query);
  };

  const handleResumeSearch = async () => {
    // Check if resumes exist
    if (resumes.length === 0) {
      toast.error('No Resumes', 'Please add at least one resume before using Auto-Search.');
      return;
    }
    
    // Check if a resume is selected
    if (!selectedResumeId) {
      toast.warning('No Resume Selected', 'Please select a resume first.');
      return;
    }
    
    // Find the resume
    const resume = resumes.find(r => r.id === selectedResumeId);
    
    if (!resume) {
      toast.error('Resume Not Found', 'The selected resume could not be found. Please select another.');
      if (resumes.length > 0) {
        setSelectedResumeId(resumes[0].id);
      }
      return;
    }
    
    // Check API configuration
    if (!checkApiConfiguration()) {
      return;
    }
    
    setIsGeneratingQuery(true);
    setError(null);
    
    toast.info('Analyzing Resume', 'Generating optimal search query from your resume...');
    
    try {
      const suggestedQuery = await getSearchQueryFromResumeSafe(resume, toast);
      
      if (suggestedQuery && suggestedQuery.trim()) {
        setQuery(suggestedQuery);
        toast.success('Query Generated', `Searching for: "${suggestedQuery}"`);
        await performSearch(suggestedQuery);
      } else {
        toast.error('Query Generation Failed', 'Could not generate a search query. Please try keyword search instead.');
      }
    } catch (err) {
      console.error('Resume search error:', err);
      toast.error('Search Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsGeneratingQuery(false);
    }
  };

  const handleGoogleDorkSearch = () => {
    if (!query) {
      toast.warning('Empty Query', 'Please enter a search term first.');
      return;
    }
    
    let dorkQuery = `${query}`;
    if (filters.locations.length) {
      dorkQuery += ` (${filters.locations.map(l => `"${l}"`).join(' OR ')})`;
    }
    if (filters.workModes.length) {
      dorkQuery += ` (${filters.workModes.map(m => `"${m}"`).join(' OR ')})`;
    }
    if (filters.jobTypes.length) {
      dorkQuery += ` (${filters.jobTypes.map(t => `"${t}"`).join(' OR ')})`;
    }
    
    const sites = [
      'linkedin.com/jobs',
      'indeed.com/viewjob',
      'naukri.com/job-listings',
      'greenhouse.io',
      'lever.co',
      'wellfound.com/jobs',
      'ashbyhq.com'
    ];
    const siteQuery = `(${sites.map(s => `site:${s}`).join(' OR ')})`;
    const exclusion = `-intitle:profiles -inurl:dir`; 
    const finalUrl = `https://www.google.com/search?q=${encodeURIComponent(`${dorkQuery} ${siteQuery} ${exclusion}`)}`;
    
    window.open(finalUrl, '_blank');
    toast.info('Google Search Opened', 'Advanced search query opened in new tab.');
  };

  // --- External / Manual Mode Handlers ---
  const handleGenerateDork = async () => {
    if (resumes.length === 0) {
      toast.error('No Resumes', 'Please add at least one resume first.');
      return;
    }
    
    const resume = resumes.find(r => r.id === dorkResumeId);
    if (!resume) {
      toast.warning('No Resume Selected', 'Please select a resume first.');
      return;
    }
    
    if (!checkApiConfiguration()) {
      return;
    }
    
    setIsGeneratingDork(true);
    
    const dork = await generateDorkFromResumeSafe(resume, toast);
    
    if (dork) {
      setGeneratedDork(dork);
    }
    
    setIsGeneratingDork(false);
  };

  const handleOpenDork = () => {
    if (!generatedDork) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(generatedDork)}`, '_blank');
    toast.info('Search Opened', 'Google search opened in new tab.');
  };

  const handleExtractFromUrl = async () => {
    if (!urlToExtract.trim()) {
      toast.warning('No URL', 'Please enter a job posting URL.');
      return;
    }
    
    if (!checkApiConfiguration()) {
      return;
    }
    
    setIsExtracting(true);
    setExtractionError(null);
    
    const details = await extractJobDetailsSafe(urlToExtract, toast);
    
    if (details) {
      setManualJob({
        title: details.title,
        company: details.company,
        description: details.summary,
        url: urlToExtract
      });
      setEntryMode('manual');
    } else {
      setExtractionError('Failed to extract details. Try manual entry.');
    }
    
    setIsExtracting(false);
  };

  const handleAnalyzeAndListManualJob = async () => {
    if (!manualJob.title) {
      toast.warning('Missing Job Title', 'Please provide a job title.');
      return;
    }
    
    if (!manualJob.description) {
      toast.warning('Missing Description', 'Please provide a job description.');
      return;
    }
    
    if (resumes.length === 0) {
      toast.error('No Resumes', 'Please add at least one resume before analyzing.');
      return;
    }
    
    if (!checkApiConfiguration()) {
      return;
    }
    
    setIsAnalyzingManual(true);
    
    const tempJob: Job = {
      id: 'manual-' + Math.random().toString(36).substr(2, 5),
      title: manualJob.title,
      company: manualJob.company || 'Unknown',
      location: 'External',
      summary: manualJob.description,
      url: manualJob.url,
      source: 'Manual Entry'
    };
    
    setJobs([{ ...tempJob, isAnalyzing: true }]);
    
    const analysis = await analyzeJobMatchSafe(tempJob, resumes, toast);
    
    setJobs([{ ...tempJob, analysis: analysis || undefined, isAnalyzing: false }]);
    
    if (analysis) {
      toast.success('Job Analyzed', `Match score: ${analysis.matchScore}%`);
    }
    
    setIsAnalyzingManual(false);
  };

  const filteredTrackedJobs = trackedJobs.filter(job => 
    statusFilter === 'all' ? true : job.status === statusFilter
  );

  return (
    <>
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      
      <InputModal
        isOpen={isFilterNameModalOpen}
        onClose={() => setIsFilterNameModalOpen(false)}
        onSubmit={handleSaveFilterWithName}
        title="Save Filter Set"
        placeholder="Enter a name for this filter..."
        defaultValue="My Filter"
        submitLabel="Save Filter"
      />
      
      <div className="flex-1 h-full bg-black relative overflow-y-auto custom-scrollbar scroll-smooth">
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 p-4 md:p-8 border-b border-zinc-800 bg-black/85 backdrop-blur-xl transition-all shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {onMenuClick && (
                <button 
                  onClick={onMenuClick}
                  className="md:hidden text-zinc-400 hover:text-white p-2 -ml-2 rounded-full hover:bg-zinc-800 transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}
              <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                JobHunter AI
              </h1>
            </div>
            <div className="flex gap-3">
               <button
                 onClick={() => setIsSettingsOpen(true)}
                 className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all hover:scale-105"
                 title="AI Settings"
               >
                 <Settings className="w-5 h-5" />
               </button>
              <div className="flex bg-zinc-900/80 p-1 rounded-full border border-zinc-800/50 backdrop-blur-sm">
                 <button
                   onClick={() => setActiveTab('search')}
                   className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'search' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                 >
                   <Search className="w-4 h-4" />
                   <span className="hidden sm:inline">Search</span>
                 </button>
                 <button
                   onClick={() => setActiveTab('tracked')}
                   className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'tracked' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                 >
                   <ClipboardList className="w-4 h-4" />
                   <span className="hidden sm:inline">Tracked</span>
                   {trackedJobs.length > 0 && (
                     <span className="bg-emerald-600 text-white text-[10px] px-1.5 min-w-[1.2rem] h-[1.2rem] flex items-center justify-center rounded-full ml-1">{trackedJobs.length}</span>
                   )}
                 </button>
              </div>
            </div>
          </div>

          {activeTab === 'search' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              {/* Search Mode Toggles */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-4">
                <div className="flex p-1 bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-x-auto max-w-full no-scrollbar w-full sm:w-auto">
                   {[
                     { id: 'keyword', label: 'Keyword', icon: Search },
                     { id: 'resume', label: 'Resume Match', icon: Sparkles },
                     { id: 'manual', label: 'Manual/Link', icon: PenTool }
                   ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => { 
                            setSearchMode(mode.id as any); 
                            setJobs([]); 
                            setError(null); 
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-1 sm:flex-initial justify-center ${
                            searchMode === mode.id 
                            ? 'bg-zinc-800 text-white shadow-md' 
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                      >
                         <mode.icon className="w-3.5 h-3.5" />
                         {mode.label}
                      </button>
                   ))}
                </div>

                {searchMode !== 'manual' && (
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 text-xs font-medium px-4 py-2.5 rounded-lg border transition-all ${
                        showFilters 
                        ? 'bg-zinc-800 border-zinc-700 text-white' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Filters 
                    {(filters.locations.length > 0 || filters.jobTypes.length > 0 || filters.workModes.length > 0 || filters.datePosted !== 'any') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span>
                    )}
                  </button>
                )}
              </div>

              {/* Filters Panel - Fixed z-index for dropdowns */}
              {showFilters && searchMode !== 'manual' && (
                <div className="mb-4 animate-in fade-in slide-in-from-top-2 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 backdrop-blur-sm relative z-20">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {/* Location Input */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1.5">Locations</label>
                      <input
                          type="text"
                          placeholder="Add Location & press Enter..."
                          className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-300 mb-2 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = e.currentTarget.value.trim();
                              if (val && !filters.locations.includes(val)) {
                                toggleFilterArray('locations', val);
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                      />
                      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                          {filters.locations.map(loc => (
                            <span 
                              key={loc} 
                              onClick={() => toggleFilterArray('locations', loc)} 
                              className="cursor-pointer text-[10px] bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full text-zinc-300 hover:bg-red-900/30 hover:text-red-300 hover:border-red-900/30 transition-colors"
                            >
                              {loc} ✕
                            </span>
                          ))}
                      </div>
                    </div>

                    {/* Job Type Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1.5">Job Type</label>
                      <MultiSelectDropdown 
                        label="Select Types"
                        options={['Full-time', 'Contract', 'Part-time', 'Internship', 'Freelance']}
                        selected={filters.jobTypes}
                        onChange={(val) => toggleFilterArray('jobTypes', val)}
                      />
                    </div>

                    {/* Work Mode Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1.5">Work Mode</label>
                      <MultiSelectDropdown 
                        label="Select Modes"
                        options={['Remote', 'Hybrid', 'On-site']}
                        selected={filters.workModes}
                        onChange={(val) => toggleFilterArray('workModes', val)}
                      />
                    </div>

                    {/* Date Posted */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1.5">Date Posted</label>
                      <div className="relative">
                        <select
                          value={filters.datePosted}
                          onChange={(e) => setFilters({...filters, datePosted: e.target.value})}
                          className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-300 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none appearance-none transition-all cursor-pointer"
                        >
                          <option value="any">Any Time</option>
                          <option value="past_1_hr">Last 1 Hour</option>
                          <option value="past_3_hr">Last 3 Hours</option>
                          <option value="past_6_hr">Last 6 Hours</option>
                          <option value="past_12_hr">Last 12 Hours</option>
                          <option value="past_24_hr">Last 24 Hours</option>
                          <option value="past_3_days">Last 3 Days</option>
                          <option value="past_week">Last Week</option>
                          <option value="past_month">Last Month</option>
                        </select>
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Saved Filters & Actions */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-zinc-800/50">
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-zinc-500 font-medium mr-1">Saved:</span>
                        {savedFilters.length === 0 && <span className="text-xs text-zinc-600 italic">None</span>}
                        {savedFilters.map(sf => (
                           <button 
                             key={sf.id}
                             onClick={() => handleApplySavedFilter(sf)}
                             className="group flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 px-2 py-1 rounded transition-colors"
                           >
                              <span className="text-zinc-300">{sf.name}</span>
                              <span 
                                onClick={(e) => handleDeleteSavedFilter(sf.id, e)} 
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-900/50 hover:text-red-300 rounded transition-opacity"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </span>
                           </button>
                        ))}
                     </div>
                     <div className="flex gap-2">
                         <button 
                           onClick={handleResetFilters}
                           className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
                         >
                            <RotateCcw className="w-3 h-3" /> Reset
                         </button>
                         <button 
                           onClick={handleSaveFilter}
                           disabled={Object.values(filters).every(v => Array.isArray(v) ? v.length === 0 : v === 'any')}
                           className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            <Save className="w-3.5 h-3.5" /> Save
                         </button>
                     </div>
                  </div>
                </div>
              )}

              {/* Mode Specific Inputs - Lower z-index than filters */}
              <div className="relative z-10">
                {/* 1. Keyword Search */}
                {searchMode === 'keyword' && (
                  <form onSubmit={handleKeywordSearch} className="relative max-w-4xl animate-in fade-in slide-in-from-left-2">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-zinc-500" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-11 pr-32 py-3 md:py-4 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-base md:text-lg shadow-lg"
                      placeholder="e.g. Senior Frontend Engineer"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="absolute inset-y-1.5 md:inset-y-2 right-1.5 md:right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleGoogleDorkSearch}
                        disabled={!query.trim()}
                        title="Search on Google with Advanced Dorks"
                        className="h-full px-3 md:px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 rounded-lg transition-colors flex items-center justify-center hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Globe className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button
                        type="submit"
                        disabled={isSearching || !query.trim()}
                        className="h-full px-4 md:px-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center gap-2 text-sm md:text-base hover:shadow-lg shadow-emerald-900/20"
                      >
                        {isSearching ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Sparkles className="w-4 h-4 md:w-5 md:h-5" />}
                        <span className="hidden sm:inline">{isSearching ? 'Scanning...' : 'Find Jobs'}</span>
                        <span className="sm:hidden">{isSearching ? '...' : 'Search'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* 2. Resume Match */}
                {searchMode === 'resume' && (
                  <div className="max-w-4xl bg-zinc-900 border border-zinc-700 rounded-xl p-2 md:p-3 flex flex-col md:flex-row gap-3 animate-in fade-in slide-in-from-right-2 shadow-lg">
                    <div className="flex-1">
                      <select 
                        value={selectedResumeId}
                        onChange={(e) => setSelectedResumeId(e.target.value)}
                        disabled={isGeneratingQuery || resumes.length === 0}
                        className="w-full h-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-3 md:py-2 text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none hover:border-zinc-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resumes.length === 0 ? (
                          <option value="">No resumes available - Add one first</option>
                        ) : (
                          resumes.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))
                        )}
                      </select>
                    </div>
                    <button 
                      onClick={handleResumeSearch}
                      disabled={isGeneratingQuery || isSearching || resumes.length === 0 || !selectedResumeId}
                      className="px-6 py-3 md:py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg shadow-emerald-900/20 whitespace-nowrap"
                    >
                      {isGeneratingQuery || isSearching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {isGeneratingQuery ? 'Analyzing...' : 'Searching...'}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Auto-Search
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* 3. Manual Search */}
                {searchMode === 'manual' && (
                  <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 mb-8">
                    {/* Left Column: Dork Discovery */}
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 relative overflow-hidden flex flex-col shadow-xl backdrop-blur-sm group hover:border-zinc-700 transition-all">
                        <div className="absolute -top-6 -right-6 p-8 bg-emerald-500/5 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute top-4 right-4 text-zinc-800 group-hover:text-zinc-700 transition-colors">
                            <Search className="w-20 h-20 opacity-20" />
                        </div>
                        <div className="relative z-10">
                          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                              Discovery Helper
                              <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-2 py-0.5 rounded-full">AI Powered</span>
                          </h3>
                          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                              Not sure what to search for? Generate a powerful Google Dork query tailored to your specific resume skills to find hidden job listings.
                          </p>
                          <div className="space-y-4">
                              <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Target Resume</label>
                                  <select 
                                    value={dorkResumeId}
                                    onChange={(e) => setDorkResumeId(e.target.value)}
                                    disabled={isGeneratingDork || resumes.length === 0}
                                    className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none text-sm transition-all disabled:opacity-50"
                                  >
                                    {resumes.length === 0 ? (
                                      <option value="">No resumes available</option>
                                    ) : (
                                      resumes.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                      ))
                                    )}
                                  </select>
                              </div>
                              <button 
                                onClick={handleGenerateDork}
                                disabled={isGeneratingDork || !dorkResumeId || resumes.length === 0}
                                className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-white py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  {isGeneratingDork ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
                                  {isGeneratingDork ? 'Generating...' : 'Generate Search Query'}
                              </button>
                              {generatedDork && (
                                  <div className="bg-black/80 border border-zinc-800 rounded-lg p-3 animate-in fade-in slide-in-from-top-1 shadow-inner">
                                      <div className="flex justify-between items-center mb-2">
                                          <label className="text-[10px] uppercase font-bold text-zinc-500">Generated Query</label>
                                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                                      </div>
                                      <code className="block text-xs text-emerald-300 font-mono break-words mb-3 leading-relaxed bg-zinc-900/50 p-2 rounded border border-zinc-800/50">
                                          {generatedDork}
                                      </code>
                                      <button 
                                        onClick={handleOpenDork}
                                        className="w-full flex items-center justify-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-900/30 hover:border-emerald-900/50 py-2 rounded text-xs font-medium transition-all"
                                      >
                                          Open Google Search <ExternalLink className="w-3 h-3" />
                                      </button>
                                  </div>
                              )}
                          </div>
                        </div>
                    </div>

                    {/* Right Column: Manual Entry Form */}
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 shadow-xl backdrop-blur-sm flex flex-col h-full hover:border-zinc-700 transition-all">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                              <h3 className="text-lg font-semibold text-white">Application Details</h3>
                              <p className="text-xs text-zinc-500 mt-1">Add a job manually to track and tailor your resume.</p>
                          </div>
                          <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800 shadow-sm">
                            <button
                              onClick={() => setEntryMode('manual')}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${entryMode === 'manual' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                              Manual
                            </button>
                            <button
                              onClick={() => setEntryMode('auto')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${entryMode === 'auto' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                              <Link className="w-3 h-3" /> Auto
                            </button>
                          </div>
                        </div>

                        <div className="flex-1">
                            {entryMode === 'auto' ? (
                              <div className="animate-in fade-in space-y-4 h-full flex flex-col justify-center">
                                 <div className="p-6 bg-zinc-950/50 border border-dashed border-zinc-700 rounded-xl hover:border-emerald-500/50 transition-colors group">
                                    <label className="block text-sm font-medium text-zinc-400 mb-3 group-hover:text-emerald-400 transition-colors">Paste Job URL</label>
                                    <div className="flex gap-2">
                                      <input 
                                          type="text" 
                                          placeholder="https://linkedin.com/jobs/view/..."
                                          className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none text-sm transition-all"
                                          value={urlToExtract}
                                          onChange={e => setUrlToExtract(e.target.value)}
                                          disabled={isExtracting}
                                      />
                                      <button 
                                        onClick={handleExtractFromUrl}
                                        disabled={isExtracting || !urlToExtract.trim()}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 rounded-lg disabled:opacity-50 transition-all hover:shadow-lg shadow-emerald-900/20"
                                      >
                                        {isExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                                      </button>
                                    </div>
                                    <p className="text-[11px] text-zinc-500 mt-3 flex items-center gap-1.5">
                                      <Globe className="w-3 h-3" /> 
                                      Compatible with LinkedIn, Indeed, Greenhouse & more. Uses Google Grounding.
                                    </p>
                                    {extractionError && (
                                      <div className="mt-4 text-xs text-red-400 bg-red-950/20 p-3 rounded-lg border border-red-900/30 flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        {extractionError}
                                      </div>
                                    )}
                                 </div>
                              </div>
                            ) : (
                              <div className="animate-in fade-in space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">Job Link</label>
                                    <input 
                                        type="text" 
                                        placeholder="https://..."
                                        className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none text-sm transition-all"
                                        value={manualJob.url}
                                        onChange={e => setManualJob({...manualJob, url: e.target.value})}
                                        disabled={isAnalyzingManual}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">Job Title <span className="text-red-400">*</span></label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Senior Engineer"
                                            className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none text-sm transition-all"
                                            value={manualJob.title}
                                            onChange={e => setManualJob({...manualJob, title: e.target.value})}
                                            disabled={isAnalyzingManual}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">Company</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Acme Inc"
                                            className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none text-sm transition-all"
                                            value={manualJob.company}
                                            onChange={e => setManualJob({...manualJob, company: e.target.value})}
                                            disabled={isAnalyzingManual}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">Job Description <span className="text-red-400">*</span></label>
                                    <textarea 
                                        placeholder="Paste the full job description here..."
                                        className="w-full h-32 bg-black/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none text-sm resize-none transition-all custom-scrollbar"
                                        value={manualJob.description}
                                        onChange={e => setManualJob({...manualJob, description: e.target.value})}
                                        disabled={isAnalyzingManual}
                                    />
                                </div>
                                <div className="pt-2">
                                    <button 
                                      onClick={handleAnalyzeAndListManualJob}
                                      disabled={isAnalyzingManual || !manualJob.title || !manualJob.description || resumes.length === 0}
                                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg text-sm font-medium transition-all hover:shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isAnalyzingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        {isAnalyzingManual ? 'Analyzing...' : 'Analyze & List'}
                                    </button>
                                    {resumes.length === 0 && (
                                      <p className="text-xs text-red-400 mt-2 text-center">Please add a resume first to analyze jobs.</p>
                                    )}
                                </div>
                              </div>
                            )}
                        </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tracked' && (
            <div className="animate-in fade-in">
               <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {(['all', 'saved', 'applied', 'interviewing', 'offer', 'rejected'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2 rounded-full text-xs font-medium border whitespace-nowrap capitalize transition-all ${
                        statusFilter === status 
                        ? 'bg-white text-black border-white shadow-lg shadow-white/10' 
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
               </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
               <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
               <div className="flex-1">
                 <p className="font-medium mb-1">Search Error</p>
                 <p className="opacity-90">{error}</p>
                 {error.includes("Google Grounding") && (
                   <div className="mt-3">
                      <button 
                        onClick={handleGoogleDorkSearch}
                        className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-200 px-3 py-1.5 rounded-lg border border-red-800/50 transition-colors"
                      >
                         Try Google Dork (Manual Search) instead
                      </button>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>

        {/* Results / Content Area */}
        <div className="p-4 md:p-8 pb-24 md:pb-24">
          {/* Empty States */}
          {activeTab === 'search' && jobs.length === 0 && !isSearching && !error && searchMode !== 'manual' && (
            <div className="flex flex-col items-center justify-center text-zinc-600 opacity-60 mt-10 md:mt-20">
               <div className="bg-zinc-900/50 p-6 rounded-full mb-6 border border-zinc-800">
                  <FileText className="w-12 h-12 stroke-1" />
               </div>
               <p className="text-xl font-medium text-center text-zinc-400">Ready to hunt</p>
               <p className="text-sm text-center px-4 max-w-md mt-2 text-zinc-500">
                 {searchMode === 'keyword' 
                   ? "Enter a job title and use the filters or Google Search button to find opportunities." 
                   : "Select a resume and click Auto-Search to find matching jobs automatically."}
               </p>
               <div className="flex gap-2 mt-6">
                 <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-medium hover:text-white hover:border-zinc-700 transition-all"
                 >
                   <Settings className="w-4 h-4" /> Configure AI
                 </button>
               </div>
            </div>
          )}

          {activeTab === 'tracked' && filteredTrackedJobs.length === 0 && (
             <div className="flex flex-col items-center justify-center text-zinc-600 opacity-60 mt-10 md:mt-20">
               <div className="bg-zinc-900/50 p-6 rounded-full mb-6 border border-zinc-800">
                 <BriefcaseIcon className="w-12 h-12 stroke-1" />
               </div>
               <p className="text-xl font-medium text-center text-zinc-400">No jobs found</p>
               <p className="text-sm text-center px-4 max-w-md mt-2 text-zinc-500">
                 {trackedJobs.length === 0 
                   ? "Apply to jobs from the search tab to track them here." 
                   : `No jobs match the '${statusFilter}' filter.`}
               </p>
            </div>
          )}

          {/* Search Results List */}
          {activeTab === 'search' && jobs.length > 0 && (
            <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4">
               <div className="flex items-center justify-between pb-2">
                  <h2 className="text-lg md:text-xl font-semibold text-white flex items-center gap-2">
                    {searchMode === 'manual' ? 'Analyzed Job' : 'Found Opportunities'}
                  </h2>
                  <span className="text-xs font-medium px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-500">{jobs.length} results</span>
               </div>
               {jobs
                 .sort((a, b) => (b.analysis?.matchScore || 0) - (a.analysis?.matchScore || 0))
                 .map((job) => {
                   const isTracked = trackedJobs.some(tj => tj.id === job.id);
                   return (
                      <JobCard 
                        key={job.id} 
                        job={job} 
                        resumes={resumes} 
                        onTrackJob={onTrackJob}
                        isTracked={isTracked}
                      />
                   );
               })}
            </div>
          )}

          {/* Tracked Jobs List */}
          {activeTab === 'tracked' && filteredTrackedJobs.length > 0 && (
            <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
               {filteredTrackedJobs
                 .sort((a, b) => new Date(b.appliedDate || '').getTime() - new Date(a.appliedDate || '').getTime())
                 .map((job) => (
                   <JobCard 
                     key={job.id} 
                     job={job} 
                     resumes={resumes} 
                     onTrackJob={onTrackJob}
                     isTracked={true}
                   />
               ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};