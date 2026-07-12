# AI Mock Interviewer — Speech & Sentiment Analysis

**Final Year Project | Iqra National University, Peshawar**  
Submitted by: Shakeel Javed (20099) & Abdul Rehman (20231) | Supervisor: Mubashir Zainoor

---

## Overview

Full-stack AI mock interview platform with voice-based sessions, speech analysis, sentiment evaluation, and Gemini AI feedback. Gemini API key is **100% server-side** — never exposed to the browser.

## Tech Stack

- **Frontend**: Next.js 16 App Router + React + Tailwind CSS
- **Backend**: Next.js API Routes (Node.js, server-side only)  
- **AI**: Google Gemini 1.5 Flash (free tier)
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + bcryptjs
- **Speech**: Browser Web Speech API

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
# Fill in: MONGODB_URI, GEMINI_API_KEY, JWT_SECRET, NEXTAUTH_SECRET
```

Get free Gemini key: https://aistudio.google.com/app/apikey

### 3. Run
```bash
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/login, register          — Auth pages
│   ├── (dashboard)/dashboard,          — Main app pages
│   │   interview, sessions, profile
│   └── api/auth, interview, sessions,  — All API routes
│       users
├── context/AuthContext.tsx             — JWT auth state
├── hooks/useApi.ts, useSpeechRecognition.ts
├── lib/mongodb.ts, gemini.ts*,         — Core utilities
│   jwt.ts, speech-analysis.ts
├── models/User.ts, Session.ts          — Mongoose models
└── types/index.ts                      — TypeScript types

* gemini.ts is server-side only — API key never reaches the browser
```

## Security

- `GEMINI_API_KEY` has no `NEXT_PUBLIC_` prefix — server-side only
- Passwords: bcrypt with 12 salt rounds
- JWT tokens expire in 7 days
- All DB queries scoped to authenticated userId

## Deploy to Vercel

Push to GitHub → import in vercel.com → add env vars → deploy.
