# 🎯 JobHunter AI

An AI-powered job hunting platform that automates resume parsing, job searching, matching, and resume tailoring.

<!-- Top of README -->
<div align="center">

# 🎯 JobHunter AI

[![Stars](https://img.shields.io/github/stars/vinayhr01/jobhunter-ai?style=social)](https://github.com/vinayhr01/jobhunter-ai)
[![Forks](https://img.shields.io/github/forks/vinayhr01/jobhunter-ai?style=social)](https://github.com/vinayhr01/jobhunter-ai/fork)
[![Issues](https://img.shields.io/github/issues/vinayhr01/jobhunter-ai)](https://github.com/vinayhr01/jobhunter-ai/issues)
[![License](https://img.shields.io/github/license/vinayhr01/jobhunter-ai)](LICENSE)

**⭐ Star this repo if it helped your job search!**

</div>

## Overview

JobHunter AI helps job seekers by:
- Parsing resumes from PDF/images using AI vision
- Searching for jobs in real-time using Google Grounding
- Matching jobs to resumes with AI-powered scoring
- Generating tailored resumes for specific job applications
- Tracking application status through the hiring pipeline

## Tech Stack

- React 18 + TypeScript
- Tailwind CSS + Lucide Icons
- Vite (build tool)
- Google GenAI SDK
- Gemini & OpenAI-compatible API support
- LocalStorage for persistence

## Supported AI Providers

The following providers are supported. Provider configurations are hardcoded in `src/services/gemini.ts`. To add or modify providers, edit the `providers` array and `fetchProviderModels` function in that file.

| Provider | Vision | Search | Notes |
|----------|--------|--------|-------|
| Google Gemini | ✅ | ✅ | Recommended, free tier available |
| OpenAI | ✅ | ❌ | GPT-4o, GPT-4o Mini |
| Anthropic | ✅ | ❌ | May have CORS issues |
| Groq | ✅ | ❌ | Free, ultra-fast |
| DeepSeek | ❌ | ❌ | Cost effective |
| OpenRouter | ✅ | ❌ | Access 100+ models |
| Ollama/Local | ✅ | ❌ | Self-hosted, free |

**Note:** Job Search requires Google Gemini (uses Google Grounding feature).

**To modify providers:**
- File: `src/services/gemini.ts`
- Edit `fetchProviderModels()` for model lists
- Edit `generateContent()` for API call logic
- Edit provider defaults in `DEFAULT_SETTINGS`

## Installation

```bash
git clone https://github.com/yourusername/jobhunter-ai.git
cd jobhunter-ai
npm install
npm run dev
```

Open http://localhost:3000

## Configuration

1. Click Settings (gear icon) in top-right
2. Select AI provider
3. Enter API key
4. Choose model
5. Save

### Getting API Keys

- **Google Gemini**: https://aistudio.google.com/ (free tier)
- **OpenAI**: https://platform.openai.com/
- **Groq**: https://console.groq.com/ (free)
- **OpenRouter**: https://openrouter.ai/

---

## Features

### Resume Management

- Upload PDF or images (AI vision parsing)
- Paste text manually
- Multiple resume profiles
- Confidence score for parsing quality

### Job Search

- **Keyword Search**: Enter job title, click Find Jobs
- **Resume Match**: AI generates search query from resume
- **Manual Entry**: Paste job URL or enter details manually
- **Filters**: Location, job type, work mode, date posted

### Job Matching

- Match score (0-100%) for each job
- Missing skills detection
- Best resume recommendation
- AI reasoning explanation

### Resume Tailoring

- One-click tailored resume generation
- LaTeX export for Overleaf
- HTML preview with print-to-PDF
- Customized for specific job requirements

### Application Tracking

- Track status: Saved → Applied → Interviewing → Offer/Rejected
- Filter by status
- Persistent storage in browser

---

## Data Storage

All data stored locally in browser (localStorage):

- Resumes
- Tracked jobs
- Saved filters
- AI settings

No backend, no accounts, no tracking.

