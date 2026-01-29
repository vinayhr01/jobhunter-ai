import React, { useState, useEffect } from 'react';
import { X, Save, Settings, Key, Box, Globe, CheckCircle2, Eye, EyeOff, Loader2, FileText, Sparkles, Check, XCircle, Terminal, ChevronDown, RefreshCw, LayoutTemplate } from 'lucide-react';
import { LLMSettings, LLMProvider, TaskType, LLMConfig } from '../types';
import { getLLMSettings, saveLLMSettings, fetchProviderModels, ModelInfo } from '../services/gemini';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<LLMSettings>(getLLMSettings());
  const [activeTab, setActiveTab] = useState<'global' | TaskType>('global');
  const [isSaved, setIsSaved] = useState(false);
  
  // Model Fetching State for current active tab
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  
  // API Key Visibility
  const [showApiKey, setShowApiKey] = useState(false);

  // Derived state for the currently edited configuration
  const currentConfig: LLMConfig = activeTab === 'global' 
    ? settings 
    : (settings.overrides?.[activeTab] || settings); // Display global if no override, but handled by logic below

  const isOverridden = activeTab !== 'global' && !!settings.overrides?.[activeTab];

  // Initialize
  useEffect(() => {
    if (isOpen) {
      setSettings(getLLMSettings());
      setIsSaved(false);
      setShowApiKey(false);
      setActiveTab('global');
    }
  }, [isOpen]);

  // Fetch models when active config changes
  useEffect(() => {
    if (!isOpen) return;
    
    // Don't fetch if we are in override mode but it's not set yet (inheriting)
    if (activeTab !== 'global' && !isOverridden) {
        setAvailableModels([]);
        return;
    }

    const loadModels = async () => {
      setIsLoadingModels(true);
      setFetchError(null);
      try {
        const models = await fetchProviderModels(currentConfig.provider, currentConfig.apiKey, currentConfig.baseUrl);
        setAvailableModels(models);
        if (models.length > 0) {
            setIsManualMode(false);
        } else {
            setIsManualMode(true);
        }
      } catch (e) {
        setFetchError("Failed to load models.");
        setAvailableModels([]);
        setIsManualMode(true);
      } finally {
        setIsLoadingModels(false);
      }
    };

    const timeoutId = setTimeout(() => {
        loadModels();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [currentConfig.provider, currentConfig.apiKey, currentConfig.baseUrl, isOpen, activeTab, isOverridden]);

  const handleUpdateConfig = (updates: Partial<LLMConfig>) => {
    if (activeTab === 'global') {
        setSettings({ ...settings, ...updates });
    } else {
        // We are updating an override
        setSettings(prev => ({
            ...prev,
            overrides: {
                ...prev.overrides,
                [activeTab]: {
                    ...(prev.overrides?.[activeTab] || prev), // Copy global as base if creating new override
                    ...updates
                }
            }
        }));
    }
  };

  const handleCreateOverride = () => {
     // Clone global settings to specific override
     handleUpdateConfig({}); 
  };

  const handleRemoveOverride = () => {
      setSettings(prev => {
          const newOverrides = { ...prev.overrides };
          delete newOverrides[activeTab as TaskType];
          return { ...prev, overrides: newOverrides };
      });
  };

  const handleSave = () => {
    saveLLMSettings(settings);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };
  
  const handleModelSelect = (modelId: string) => {
      const selectedModel = availableModels.find(m => m.id === modelId);
      handleUpdateConfig({
          modelName: modelId,
          supportsVision: selectedModel ? selectedModel.supportsVision : currentConfig.supportsVision
      });
  };

  if (!isOpen) return null;

  const providers: { id: LLMProvider; name: string; icon: any; defaultModel: string; color: string }[] = [
    { id: 'google', name: 'Gemini', icon: '✦', defaultModel: 'gemini-2.0-flash-exp', color: 'text-blue-400' },
    { id: 'openai', name: 'OpenAI', icon: '◈', defaultModel: 'gpt-4o', color: 'text-green-400' },
    { id: 'anthropic', name: 'Anthropic', icon: '▲', defaultModel: 'claude-3-5-sonnet-20241022', color: 'text-orange-300' },
    { id: 'groq', name: 'Groq', icon: '⚡', defaultModel: 'llama-3.3-70b-versatile', color: 'text-orange-500' },
    { id: 'deepseek', name: 'DeepSeek', icon: '🐋', defaultModel: 'deepseek-chat', color: 'text-blue-500' },
    { id: 'openrouter', name: 'OpenRouter', icon: '🔗', defaultModel: 'google/gemini-2.0-flash-exp:free', color: 'text-purple-400' },
    { id: 'custom', name: 'Local / Custom', icon: <Terminal className="w-4 h-4" />, defaultModel: 'llama3', color: 'text-zinc-400' }
  ];

  const tabs = [
      { id: 'global', label: 'Global Default', icon: Settings, desc: "Fallback for all tasks" },
      { id: 'parsing', label: 'Resume Parsing', icon: Eye, desc: "OCR & Text Extraction" },
      { id: 'tailoring', label: 'Resume Tailoring', icon: FileText, desc: "Writing & Formatting" },
      { id: 'matching', label: 'Job Matching', icon: Sparkles, desc: "Reasoning & Analysis" },
      { id: 'search', label: 'Job Search', icon: Globe, desc: "Live Google Search" },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900 z-10 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-zinc-400" />
            Model Configuration
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
            
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-row md:flex-col overflow-x-auto p-2 gap-1 flex-shrink-0 custom-scrollbar">
               {tabs.map(tab => {
                   const isActive = activeTab === tab.id;
                   const isOverrideSet = tab.id !== 'global' && !!settings.overrides?.[tab.id as TaskType];
                   const TabIcon = tab.icon;
                   
                   return (
                       <button
                         key={tab.id}
                         onClick={() => setActiveTab(tab.id as any)}
                         className={`flex items-center gap-3 p-3 rounded-lg transition-all text-left group min-w-[160px] md:min-w-0 ${
                             isActive ? 'bg-zinc-800 text-white shadow-md' : 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                         }`}
                       >
                           <div className={`p-2 rounded-md ${isActive ? 'bg-zinc-700' : 'bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700'}`}>
                               <TabIcon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                           </div>
                           <div className="flex flex-col">
                               <span className="text-sm font-medium">{tab.label}</span>
                               <span className="text-[10px] opacity-60">{tab.desc}</span>
                           </div>
                           {isOverrideSet && (
                               <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-emerald-500/50" />
                           )}
                       </button>
                   );
               })}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900">
                
                {/* Override Header / Status */}
                {activeTab !== 'global' && (
                    <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center flex-shrink-0">
                        <div>
                            <h4 className="text-sm font-medium text-white">{tabs.find(t => t.id === activeTab)?.label} Settings</h4>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                {isOverridden ? "Custom configuration active for this task." : "Currently inheriting from Global Default."}
                            </p>
                        </div>
                        
                        {isOverridden ? (
                            <button 
                                onClick={handleRemoveOverride}
                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-red-900/20 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" /> Reset to Default
                            </button>
                        ) : (
                            <button 
                                onClick={handleCreateOverride}
                                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded border border-zinc-700 transition-colors"
                            >
                                Customize for this task
                            </button>
                        )}
                    </div>
                )}

                {/* Configuration Form */}
                <div className={`flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6 ${!isOverridden && activeTab !== 'global' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    
                    {/* Provider Grid */}
                    <div className="space-y-3">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">AI Provider</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {providers.map(p => (
                                <button
                                key={p.id}
                                onClick={() => {
                                    handleUpdateConfig({ 
                                        provider: p.id,
                                        modelName: p.defaultModel,
                                        supportsSearch: p.id === 'google',
                                        supportsVision: p.id === 'google' || p.id === 'openai' || p.id === 'anthropic' || p.id === 'groq',
                                        baseUrl: p.id === 'custom' && !currentConfig.baseUrl ? 'http://localhost:11434/v1' : currentConfig.baseUrl
                                    });
                                    setIsManualMode(false);
                                }}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                                    currentConfig.provider === p.id 
                                    ? `bg-emerald-950/30 border-emerald-500/50 ${p.color}`
                                    : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                                }`}
                                >
                                <span className="text-lg mb-2">{typeof p.icon === 'string' ? p.icon : p.icon}</span>
                                <span className="capitalize text-xs font-medium">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Key & URL */}
                    <div className="space-y-4">
                        <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1">
                            <Key className="w-3.5 h-3.5" /> API Key
                        </label>
                        <div className="relative">
                            <input 
                                type={showApiKey ? "text" : "password"}
                                value={currentConfig.apiKey}
                                onChange={(e) => handleUpdateConfig({ apiKey: e.target.value })}
                                placeholder={currentConfig.provider === 'custom' ? "Not required for Ollama" : currentConfig.provider === 'google' ? "AIza..." : "sk-..."}
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-mono pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 rounded-md hover:bg-zinc-800 transition-colors"
                            >
                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">
                            {activeTab !== 'global' && "Leave blank to use global key (logic not fully separate yet, copy key if needed)."}
                        </p>
                        </div>

                        {(currentConfig.provider === 'openrouter' || currentConfig.provider === 'custom') && (
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1">
                                <Globe className="w-3.5 h-3.5" /> Base URL
                            </label>
                            <input 
                                type="text"
                                value={currentConfig.baseUrl || ''}
                                onChange={(e) => handleUpdateConfig({ baseUrl: e.target.value })}
                                placeholder={currentConfig.provider === 'openrouter' ? "https://openrouter.ai/api/v1" : "http://localhost:11434/v1"}
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-mono"
                            />
                        </div>
                        )}

                        {/* Model Select */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center justify-between">
                                <div className="flex items-center gap-1"><Box className="w-3.5 h-3.5" /> Model</div>
                                <div className="flex items-center gap-3">
                                    {isLoadingModels && <span className="flex items-center gap-1 text-emerald-500 text-[10px]"><Loader2 className="w-3 h-3 animate-spin"/> Fetching...</span>}
                                    {availableModels.length > 0 && (
                                        <button 
                                            onClick={() => setIsManualMode(!isManualMode)}
                                            className="text-[10px] text-emerald-500 hover:text-emerald-400 underline transition-colors"
                                        >
                                            {isManualMode ? "Switch to List" : "Enter Manually"}
                                        </button>
                                    )}
                                </div>
                            </label>
                            
                            <div className="relative">
                                {!isManualMode && availableModels.length > 0 ? (
                                    <div className="relative">
                                        <select
                                            value={currentConfig.modelName}
                                            onChange={(e) => handleModelSelect(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm appearance-none cursor-pointer hover:bg-zinc-900 transition-colors"
                                        >
                                            <option value="" disabled>Select a model</option>
                                            {availableModels.map(model => (
                                                <option key={model.id} value={model.id}>
                                                    {model.name} {model.isFree ? '[Free]' : ''} {model.supportsVision ? '[Vision]' : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            value={currentConfig.modelName}
                                            onChange={(e) => handleUpdateConfig({ modelName: e.target.value })}
                                            placeholder="e.g. gpt-4o, llama3"
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-mono"
                                        />
                                        {fetchError && !isManualMode && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 text-[10px] pointer-events-none">Failed</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Capabilities */}
                    <div className="space-y-3 pt-4 border-t border-zinc-800">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                            Capabilities
                        </label>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <label className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer ${currentConfig.supportsVision ? 'bg-zinc-800 border-zinc-600 text-zinc-200' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                                <input 
                                    type="checkbox" 
                                    checked={currentConfig.supportsVision}
                                    onChange={(e) => handleUpdateConfig({ supportsVision: e.target.checked })}
                                    className="accent-emerald-500"
                                />
                                Supports Vision
                            </label>

                            <label className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer ${currentConfig.supportsSearch ? 'bg-zinc-800 border-zinc-600 text-zinc-200' : 'bg-zinc-950 border-zinc-800 text-zinc-500'} ${currentConfig.provider !== 'google' ? 'opacity-60' : ''}`}>
                                <input 
                                    type="checkbox" 
                                    checked={currentConfig.supportsSearch}
                                    onChange={(e) => handleUpdateConfig({ supportsSearch: e.target.checked })}
                                    disabled={currentConfig.provider !== 'google'}
                                    className="accent-emerald-500"
                                />
                                Supports Search
                            </label>
                        </div>
                         {activeTab === 'search' && currentConfig.provider !== 'google' && (
                            <div className="flex items-center gap-2 text-[10px] text-yellow-500 bg-yellow-900/10 p-2 rounded border border-yellow-900/30">
                                <CheckCircle2 className="w-3 h-3" />
                                Note: Job Search logic currently relies heavily on Google Grounding. Non-Google models might fail to return live results.
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900 flex-shrink-0">
           <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
             Cancel
           </button>
           <button 
             onClick={handleSave}
             className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-900/20"
           >
             {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
             {isSaved ? 'Saved!' : 'Save Configuration'}
           </button>
        </div>
      </div>
    </div>
  );
};