import { GoogleGenAI, Type } from "@google/genai";
import { Job, JobAnalysis, Resume, LLMSettings, LLMProvider, LLMConfig, TaskType } from "../types";
import { parseAPIError, ToastFunctions } from "../utils/errorHandler";

// Default Configuration (Google)
const DEFAULT_SETTINGS: LLMSettings = {
  provider: 'google',
  apiKey: process.env.API_KEY || '',
  modelName: 'gemini-2.0-flash-exp', 
  supportsVision: true,
  supportsSearch: true,
  overrides: {}
};

// Storage Key
const SETTINGS_KEY = 'jobhunter_llm_settings';

// Get Settings from LocalStorage or Default
export const getLLMSettings = (): LLMSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) return DEFAULT_SETTINGS;
  
  const parsed = JSON.parse(stored);
  // Ensure overrides object exists if loading from old version
  return { ...DEFAULT_SETTINGS, ...parsed, overrides: parsed.overrides || {} };
};

// Helper to get specific settings for a task (parsing, tailoring, etc.)
// Falls back to global settings if no override exists
export const getTaskSettings = (task?: TaskType): LLMConfig => {
  const settings = getLLMSettings();
  if (task && settings.overrides && settings.overrides[task]) {
    return settings.overrides[task]!;
  }
  return settings;
};

// Save Settings
export const saveLLMSettings = (settings: LLMSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export interface ModelInfo {
  id: string;
  name: string;
  supportsVision: boolean;
  contextLength?: number;
  isFree?: boolean;
}

// Fetch available models based on provider
export const fetchProviderModels = async (
  provider: LLMProvider, 
  apiKey: string, 
  baseUrl?: string
): Promise<ModelInfo[]> => {
  if (provider === 'google') {
    return [
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)', supportsVision: true, isFree: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', supportsVision: true, isFree: true }, // Has free tier
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', supportsVision: true, isFree: true }, // Has free tier
      { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', supportsVision: true, isFree: true },
    ];
  }

  if (provider === 'anthropic') {
    // Static list for Anthropic as their List Models API isn't always available via browser/CORS easily
    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', supportsVision: true },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', supportsVision: false }, // Text optimized
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', supportsVision: true },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', supportsVision: true },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', supportsVision: true },
    ];
  }

  // Common OpenAI-compatible Fetch Logic
  let fetchUrl = '';
  let headers: Record<string, string> = { 'Authorization': `Bearer ${apiKey}` };

  if (provider === 'openai') {
    fetchUrl = 'https://api.openai.com/v1/models';
  } else if (provider === 'deepseek') {
    fetchUrl = 'https://api.deepseek.com/models';
  } else if (provider === 'groq') {
    fetchUrl = 'https://api.groq.com/openai/v1/models';
  } else if (provider === 'openrouter') {
    fetchUrl = 'https://openrouter.ai/api/v1/models';
    headers = {}; // OpenRouter public models list doesn't strictly need auth, but we can pass it if we want user specific
  } else if (provider === 'custom' && baseUrl) {
    fetchUrl = `${baseUrl.replace(/\/$/, '')}/models`;
  }

  if (!fetchUrl) return [];

  try {
    const response = await fetch(fetchUrl, { headers });
    if (!response.ok) throw new Error(`Failed to fetch models from ${provider}`);
    const data = await response.json();
    
    let models: any[] = data.data || data.models || [];
    
    if (provider === 'openai') {
      models = models.filter((m: any) => m.id.includes('gpt'));
    }

    return models.map((m: any) => ({
      id: m.id,
      name: m.id,
      supportsVision: m.id.toLowerCase().includes('vision') || 
                      m.id.toLowerCase().includes('gpt-4o') ||
                      m.id.toLowerCase().includes('claude-3') ||
                      m.id.toLowerCase().includes('llava') ||
                      (provider === 'groq' && m.id.includes('llama-3.2') && m.id.includes('11b')), 
      contextLength: m.context_window || m.context_length,
      isFree: provider === 'custom' || 
              provider === 'groq' || 
              (provider === 'openrouter' && (m.id.includes(':free') || m.pricing?.prompt === "0" || m.pricing?.prompt === 0))
    })).sort((a: ModelInfo, b: ModelInfo) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return a.id.localeCompare(b.id);
    });
  } catch (error) {
    console.error(`${provider} Fetch Error:`, error);
    
    if (provider === 'deepseek') {
      return [
        { id: 'deepseek-chat', name: 'DeepSeek V3 (Chat)', supportsVision: false },
        { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoner)', supportsVision: false },
      ];
    }
    if (provider === 'groq') {
      return [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', supportsVision: false, isFree: true },
        { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B (Vision)', supportsVision: true, isFree: true },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', supportsVision: false, isFree: true },
      ];
    }
    if (provider === 'openai') {
      return [
        { id: 'gpt-4o', name: 'GPT-4o', supportsVision: true },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', supportsVision: true },
        { id: 'o1-preview', name: 'o1 Preview', supportsVision: false },
      ];
    }
    return [];
  }
};

// Helper to clean JSON markdown
const cleanJson = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// --- GENERIC LLM CALLER ---
const generateContent = async (
  prompt: string, 
  systemInstruction?: string,
  responseSchema?: any,
  configOverride?: LLMConfig
): Promise<string> => {
  const settings = configOverride || getLLMSettings();

  // 1. Google Gemini
  if (settings.provider === 'google') {
    const ai = new GoogleGenAI({ apiKey: settings.apiKey });
    const config: any = {
      systemInstruction,
    };
    if (responseSchema) {
      config.responseMimeType = "application/json";
      config.responseSchema = responseSchema;
    }
    const response = await ai.models.generateContent({
      model: settings.modelName,
      contents: prompt,
      config
    });
    return response.text || "";
  } 
  // 2. Anthropic (Claude)
  else if (settings.provider === 'anthropic') {
    const url = "https://api.anthropic.com/v1/messages";
    const headers = {
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "anthropic-dangerously-allow-browser-only": "true" 
    };

    const messages = [];
    messages.push({ role: "user", content: prompt });

    const body: any = {
      model: settings.modelName,
      max_tokens: 4096,
      messages: messages,
    };

    if (systemInstruction) {
        body.system = systemInstruction;
    }
    if (responseSchema) {
       messages[0].content += "\n\nOutput strictly valid JSON.";
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Anthropic Request Failed. (Check CORS/Key)");
    }

    const data = await res.json();
    return data.content?.[0]?.text || "";
  }
  // 3. OpenAI Compatible (OpenAI, DeepSeek, Groq, OpenRouter, Custom)
  else {
    let baseUrl = settings.baseUrl;
    if (settings.provider === 'openai') baseUrl = "https://api.openai.com/v1";
    if (settings.provider === 'deepseek') baseUrl = "https://api.deepseek.com"; 
    if (settings.provider === 'groq') baseUrl = "https://api.groq.com/openai/v1";
    if (settings.provider === 'openrouter') baseUrl = "https://openrouter.ai/api/v1";
    if (settings.provider === 'custom' && !baseUrl) baseUrl = "http://localhost:11434/v1"; 

    if (!baseUrl) throw new Error("Base URL is missing for this provider.");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (settings.apiKey) {
      headers["Authorization"] = `Bearer ${settings.apiKey}`;
    }
    if (settings.provider === 'openrouter') {
      if (settings.siteUrl) headers["HTTP-Referer"] = settings.siteUrl;
      if (settings.siteName) headers["X-Title"] = settings.siteName;
    }

    const messages = [];
    if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
    messages.push({ role: "user", content: prompt });

    const body: any = {
      model: settings.modelName,
      messages: messages,
    };
    if (responseSchema) {
       body.response_format = { type: "json_object" };
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Request Failed: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || "";
  }
};

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export interface ParsedResumeResult {
  name: string;
  content: string;
  confidenceScore: number;
}

// --- CORE FEATURES ---

export const parseResumeFromFile = async (file: File): Promise<ParsedResumeResult> => {
  const settings = getTaskSettings('parsing');
  const fullBase64 = await fileToBase64(file); 
  const base64Data = fullBase64.split(',')[1];
  const mimeType = file.type;

  const prompt = `
    You are an expert Resume Parser. Analyze the uploaded document.
    1. Extract ALL text content accurately.
    2. Extract Projects (name, description, stack) and Certifications.
    3. Detect hyperlinks.
    4. Provide a confidence score (0-100).
    5. Suggest a "Name - Role" profile name.
    Return JSON:
    {
      "name": "Suggested Name",
      "content": "Full text...",
      "confidenceScore": 95
    }
  `;

  if (settings.provider === 'google') {
    const ai = new GoogleGenAI({ apiKey: settings.apiKey });
    const response = await ai.models.generateContent({
      model: settings.modelName,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            content: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER }
          },
          required: ["name", "content", "confidenceScore"]
        }
      }
    });
    return JSON.parse(response.text || "{}") as ParsedResumeResult;
  } else {
    if (!settings.supportsVision) {
      throw new Error("The selected parsing model does not support Vision. Please switch to a Vision-capable model in settings.");
    }
    if (mimeType === 'application/pdf') {
       throw new Error("PDF parsing is primarily supported by Google Gemini. For other models, please convert to Image.");
    }

    let baseUrl = settings.baseUrl;
    if (settings.provider === 'openai') baseUrl = "https://api.openai.com/v1";
    if (settings.provider === 'groq') baseUrl = "https://api.groq.com/openai/v1";
    if (settings.provider === 'openrouter') baseUrl = "https://openrouter.ai/api/v1";
    if (settings.provider === 'custom' && !baseUrl) baseUrl = "http://localhost:11434/v1";
    if (!baseUrl) baseUrl = "https://api.openai.com/v1"; 

    const body = {
      model: settings.modelName,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt + " RETURN JSON ONLY." },
            {
              type: "image_url",
              image_url: {
                url: fullBase64
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings.apiKey) headers["Authorization"] = `Bearer ${settings.apiKey}`;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`${settings.provider} Vision Request Failed`);
    const data = await res.json();
    const txt = data.choices[0]?.message?.content || "{}";
    return JSON.parse(cleanJson(txt));
  }
};

export interface SearchFilters {
  locations: string[];
  jobTypes: string[];
  workModes: string[];
  datePosted: string;
}

export const generateJobDork = (jobTitle: string, company: string): string => {
  const domains = ['linkedin.com/jobs', 'indeed.com/viewjob', 'greenhouse.io', 'lever.co', 'workday.com', 'ashbyhq.com'];
  const siteQuery = `(${domains.map(d => `site:${d}`).join(' OR ')})`;
  return `${siteQuery} "${jobTitle}" "${company}"`;
};

export const generateDorkFromResume = async (resume: Resume): Promise<string> => {
  const settings = getTaskSettings('search');
  
  const prompt = `
    Analyze this resume content: "${resume.content.substring(0, 3000)}..."
    1. Identify the candidate's primary job role (e.g. Senior Frontend Engineer).
    2. Identify top 3 critical technical skills (e.g. React, TypeScript, Node.js).
    3. Construct a Google Advanced Search (Dork) query to find recent job listings suitable for this candidate.
    4. Use 'site:' operators for major job boards (linkedin.com/jobs, indeed.com, greenhouse.io, lever.co, ashbyhq.com, wellfound.com).
    5. Include the role and skills in the query logic.
    6. Exclude generic words like "templates", "examples", "cv".
    Return ONLY the raw Google Search Query string. No markdown, no explanations, no quotes around the whole string.
  `;

  const query = await generateContent(prompt, undefined, undefined, settings);
  return query.replace(/`/g, '').trim();
};

export const extractJobDetailsFromUrl = async (url: string): Promise<{ title: string; company: string; summary: string }> => {
  const settings = getTaskSettings('search');

  // STRATEGY 1: Google Grounding
  if (settings.provider === 'google' && settings.supportsSearch) {
      const prompt = `
        I have a job posting URL: ${url}
        Please perform a Google Search specifically for this URL to find the job details.
        Extract the following:
        1. Job Title
        2. Company Name
        3. A detailed Job Description/Summary (including skills, requirements).
        Return JSON:
        {
          "title": "Job Title",
          "company": "Company Name",
          "summary": "Detailed description..."
        }
      `;

      const ai = new GoogleGenAI({ apiKey: settings.apiKey });
      const response = await ai.models.generateContent({
        model: settings.modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        },
      });

      try {
        const data = JSON.parse(cleanJson(response.text || "{}"));
        return {
            title: data.title || "",
            company: data.company || "",
            summary: data.summary || ""
        };
      } catch (e) {
          console.error("Google Extraction Parsing Failed", e);
      }
  }

  // STRATEGY 2: Client-side Proxy Scraping + LLM
  try {
     const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
     const res = await fetch(proxyUrl);
     if (!res.ok) throw new Error(`Proxy request failed: ${res.statusText}`);
     
     const data = await res.json();
     if (!data.contents) throw new Error("Empty response from proxy");
     
     const html = data.contents;
     const doc = new DOMParser().parseFromString(html, 'text/html');
     ['script', 'style', 'nav', 'footer', 'iframe', 'svg', 'img', 'noscript'].forEach(tag => {
         doc.querySelectorAll(tag).forEach(el => el.remove());
     });
     const rawText = doc.body.innerText.replace(/\s+/g, ' ').trim().substring(0, 25000);

     const prompt = `
       You are a Job Extraction Robot.
       I will provide text extracted from a job posting webpage.
       You must extract the Job Title, Company Name, and Full Job Description.
       RAW TEXT START:
       ${rawText}
       RAW TEXT END
       Return strictly valid JSON with keys: "title", "company", "summary".
       If information is missing, use "Unknown".
     `;

     const jsonStr = await generateContent(prompt, undefined, { 
         type: Type.OBJECT, 
         properties: { 
             title: {type: Type.STRING}, 
             company: {type: Type.STRING}, 
             summary: {type: Type.STRING} 
         } 
     }, settings);
     
     const result = JSON.parse(cleanJson(jsonStr));
     return {
         title: result.title || "Unknown",
         company: result.company || "Unknown",
         summary: result.summary || "No description found"
     };
  } catch (e: any) {
      console.error("Scraping fallback failed:", e);
      if (settings.provider === 'google' && settings.supportsSearch) {
          throw new Error("Google Grounding failed to find details. The page might be indexed poorly.");
      }
      throw new Error(`Extraction failed. Since you are using a custom model, we attempted to scrape the page via a proxy but failed. (Error: ${e.message || 'Unknown'}). Ensure the URL is public.`);
  }
};

export const searchJobs = async (query: string, filters?: SearchFilters): Promise<Job[]> => {
  const settings = getTaskSettings('search');
  
  if (!settings.supportsSearch || settings.provider !== 'google') {
    throw new Error("Job Search requires Google Grounding (Gemini). Please configure the 'Job Search' task to use a Google model in Settings.");
  }

  const locationStr = filters?.locations?.length ? `Preferred Locations: ${filters.locations.join(", ")}` : "Location: Any";
  const typeStr = filters?.jobTypes?.length ? `Job Types: ${filters.jobTypes.join(", ")}` : "Job Type: Any";
  const modeStr = filters?.workModes?.length ? `Work Modes: ${filters.workModes.join(", ")}` : "Work Mode: Any";
  const dateStr = filters?.datePosted && filters.datePosted !== 'any' ? `Date Posted: ${filters.datePosted.replace(/_/g, ' ')}` : "Date Posted: Recent";

  const prompt = `
    Perform a Google Search to find REAL, live job listings matching this query: '${query}'.
    Filters: ${dateStr}, ${locationStr}, ${typeStr}, ${modeStr}.
    Return a raw JSON array of 6-10 job opportunities.
    Schema per job: { id, title, company, location, summary, url, source, postedAt }.
    Ensure 'url' is a direct link or a valid search link.
  `;

  const ai = new GoogleGenAI({ apiKey: settings.apiKey });
  const response = await ai.models.generateContent({
    model: settings.modelName,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
    },
  });

  try {
    const jobs = JSON.parse(cleanJson(response.text || "[]")) as Job[];
    return jobs.map(j => ({
      ...j,
      id: j.id || Math.random().toString(36).substr(2, 9),
      location: j.location || "Unknown",
      summary: j.summary || "No description available.",
      source: j.source || "Web"
    }));
  } catch (e) {
    console.error("Search Parse Error", e);
    return [];
  }
};

export const getSearchQueryFromResume = async (resume: Resume): Promise<string> => {
  const settings = getTaskSettings('search');
  
  const prompt = `
    Act as an expert Technical Recruiter.
    Resume Content: ${resume.content.substring(0, 3000)}
    Output ONE concise, high-impact Google Search query string (5-7 words max) to find the best relevant jobs. 
    Do NOT include boolean operators like OR/AND.
    Example: Senior Backend Engineer Go Kubernetes Remote
  `;

  const txt = await generateContent(prompt, undefined, undefined, settings);
  return txt.replace(/"/g, '').trim() || "Software Engineer";
};

export const generateLatexResume = async (resume: Resume, job?: Job | { title: string; company: string; summary: string }): Promise<string> => {
  const settings = getTaskSettings('tailoring');
  
  const prompt = `
    Act as an expert resume writer. 
    Convert the following resume content into a professional, modern, single-page LaTeX resume.
    ${job ? `Tailor it for: ${job.title} at ${job.company}. Summary: ${job.summary}` : 'General professional resume.'}
    Resume Content: ${resume.content}
    Output only raw LaTeX code starting with \\documentclass.
  `;

  const txt = await generateContent(prompt, undefined, undefined, settings);
  return cleanJson(txt).replace(/```latex/g, '').replace(/```/g, '');
};

export const generateHtmlResume = async (resume: Resume, job?: Job | { title: string; company: string; summary: string }): Promise<string> => {
  const settings = getTaskSettings('tailoring');
  
  const prompt = `
    Act as a frontend engineer.
    Convert this resume into a single-page HTML/CSS representation that LOOKS like a professional LaTeX PDF.
    Use inline CSS. Font: Serif (Times/Computer Modern).
    ${job ? `Tailor for: ${job.title} at ${job.company}` : ''}
    Resume: ${resume.content}
    Output raw HTML only.
  `;

  const txt = await generateContent(prompt, undefined, undefined, settings);
  return cleanJson(txt).replace(/```html/g, '').replace(/```/g, '');
};

export const analyzeJobMatch = async (job: Job, resumes: Resume[]): Promise<JobAnalysis> => {
  const settings = getTaskSettings('matching');
  
  const resumesText = resumes.map(r => `ID: ${r.id}, Name: ${r.name}, Content: ${r.content.substring(0, 1000)}...`).join('\n---\n');

  const prompt = `
    Job: ${job.title} at ${job.company}.
    Summary: ${job.summary}
    Resumes:
    ${resumesText}
    1. Identify BEST resume fit.
    2. Match Score (0-100).
    3. Reasoning (1 sentence).
    4. Missing Keywords (array).
    Return JSON: { bestResumeId, matchScore, reasoning, missingKeywords }.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      bestResumeId: { type: Type.STRING },
      matchScore: { type: Type.INTEGER },
      reasoning: { type: Type.STRING },
      missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["bestResumeId", "matchScore", "reasoning", "missingKeywords"]
  };

  let txt = "";
  if (settings.provider === 'google') {
    txt = await generateContent(prompt, undefined, schema, settings);
  } else {
    txt = await generateContent(prompt + " RETURN JSON OBJECT ONLY.", undefined, undefined, settings);
  }

  try {
    const result = JSON.parse(cleanJson(txt)) as JobAnalysis;
    return { ...result, jobId: job.id };
  } catch (e) {
    console.error("Analysis Parse Error", e);
    return {
      jobId: job.id,
      bestResumeId: resumes[0]?.id || "",
      matchScore: 0,
      reasoning: "Analysis failed due to LLM output format error.",
      missingKeywords: []
    };
  }
};

// --- SAFE WRAPPER FUNCTIONS WITH TOAST INTEGRATION ---

export const parseResumeFromFileSafe = async (
  file: File,
  toast: ToastFunctions
): Promise<ParsedResumeResult | null> => {
  try {
    toast.info('Parsing Resume', 'Analyzing document with AI vision...');
    const result = await parseResumeFromFile(file);
    
    if (result.confidenceScore < 60) {
      toast.warning('Low Confidence', `Parsing accuracy was ${result.confidenceScore}%. Please review the extracted text.`);
    } else {
      toast.success('Resume Parsed', `Successfully extracted content from ${file.name}`);
    }
    
    return result;
  } catch (err) {
    const { title, message } = parseAPIError(err, 'Resume Parsing');
    toast.error(title, message);
    return null;
  }
};

export const searchJobsSafe = async (
  query: string,
  filters: SearchFilters | undefined,
  toast: ToastFunctions
): Promise<Job[]> => {
  try {
    const jobs = await searchJobs(query, filters);
    
    if (jobs.length === 0) {
      toast.warning('No Results', 'No jobs found. Try different keywords or filters.');
    } else {
      toast.success('Search Complete', `Found ${jobs.length} matching opportunities.`);
    }
    
    return jobs;
  } catch (err) {
    const { title, message } = parseAPIError(err, 'Job Search');
    toast.error(title, message);
    return [];
  }
};

export const extractJobDetailsSafe = async (
  url: string,
  toast: ToastFunctions
): Promise<{ title: string; company: string; summary: string } | null> => {
  try {
    toast.info('Extracting Details', 'Fetching job information...');
    const result = await extractJobDetailsFromUrl(url);
    toast.success('Extraction Complete', `Found: ${result.title} at ${result.company}`);
    return result;
  } catch (err) {
    const { title, message } = parseAPIError(err, 'Job Extraction');
    toast.error(title, message);
    return null;
  }
};

export const analyzeJobMatchSafe = async (
  job: Job,
  resumes: Resume[],
  toast: ToastFunctions
): Promise<JobAnalysis | null> => {
  try {
    const analysis = await analyzeJobMatch(job, resumes);
    return analysis;
  } catch (err) {
    const { title, message } = parseAPIError(err, 'Job Analysis');
    toast.error(title, message);
    return null;
  }
};

export const generateLatexResumeSafe = async (
  resume: Resume,
  job: Job | { title: string; company: string; summary: string } | undefined,
  toast: ToastFunctions
): Promise<string | null> => {
  try {
    toast.info('Generating Resume', 'Creating tailored LaTeX resume...');
    const latex = await generateLatexResume(resume, job);
    toast.success('Resume Generated', 'Your tailored resume is ready.');
    return latex;
  } catch (err) {
    const { title, message } = parseAPIError(err, 'Resume Generation');
    toast.error(title, message);
    return null;
  }
};

export const generateHtmlResumeSafe = async (
  resume: Resume,
  job: Job | { title: string; company: string; summary: string } | undefined,
  toast: ToastFunctions
): Promise<string | null> => {
  try {
    const html = await generateHtmlResume(resume, job);
    return html;
  } catch (err) {
    const { title, message } = parseAPIError(err, 'Preview Generation');
    toast.error(title, message);
    return null;
  }
};

export const generateDorkFromResumeSafe = async (
  resume: Resume,
  toast: ToastFunctions
): Promise<string | null> => {
  try {
    const dork = await generateDorkFromResume(resume);
    toast.success('Query Generated', 'Advanced search query is ready.');
    return dork;
  } catch (err) {
    const { title, message } = parseAPIError(err, 'Query Generation');
    toast.error(title, message);
    return null;
  }
};

export const getSearchQueryFromResumeSafe = async (
  resume: Resume,
  toast: ToastFunctions
): Promise<string | null> => {
  try {
    const query = await getSearchQueryFromResume(resume);
    return query;
  } catch (err) {
    const { title, message } = parseAPIError(err, 'Query Generation');
    toast.error(title, message);
    return null;
  }
};