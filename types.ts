
export interface Resume {
  id: string;
  name: string;
  content: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  summary: string;
  url?: string;
  postedAt?: string;
  source?: string;
}

export interface JobAnalysis {
  jobId: string;
  bestResumeId: string;
  matchScore: number;
  reasoning: string;
  missingKeywords: string[];
}

export interface JobWithAnalysis extends Job {
  analysis?: JobAnalysis;
  isAnalyzing?: boolean;
}

export type ApplicationStatus = 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected';

export interface TrackedJob extends JobWithAnalysis {
  status: ApplicationStatus;
  appliedDate?: string;
  notes?: string;
}

export type LLMProvider = 'google' | 'openai' | 'anthropic' | 'groq' | 'deepseek' | 'openrouter' | 'custom';

export type TaskType = 'parsing' | 'tailoring' | 'matching' | 'search';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  modelName: string;
  baseUrl?: string; // For custom/openrouter
  siteUrl?: string; // For OpenRouter rankings
  siteName?: string; // For OpenRouter rankings
  supportsVision: boolean;
  supportsSearch: boolean; // Usually only Google
}

export interface LLMSettings extends LLMConfig {
  // Optional overrides for specific tasks
  overrides?: Partial<Record<TaskType, LLMConfig>>;
}
