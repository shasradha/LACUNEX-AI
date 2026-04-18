<div align="center">

# LACUNEX AI ⚡

### The World's Most Advanced Open-Source Intelligent Operating System

*From lacuna (Latin) — a gap, a missing piece, an unfilled space in knowledge.*
*LACUNEX exists to fill every gap humans can't reach.*

Fully architected, designed, and deployed in just **30 days** by a **solo 15-year-old developer** — [Shasradha Karmakar](https://github.com/shasradha) from Asansol, India.

[![Status](https://img.shields.io/badge/status-production--ready-success.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()
[![AI Providers](https://img.shields.io/badge/AI%20Providers-5%20Elite-blueviolet.svg)]()
[![API Keys](https://img.shields.io/badge/API%20Keys-28%20Independent-ff6b6b.svg)]()
[![Languages](https://img.shields.io/badge/Code%20Execution-50%2B%20Languages-06b6d4.svg)]()
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-black.svg)]()
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python-009688.svg)]()

</div>

---

## 🌌 What is LACUNEX AI?

LACUNEX AI is **not** another ChatGPT wrapper. It is **not** a thin API proxy with a pretty skin. It is a **production-grade, enterprise-class intelligence suite** — a fully autonomous AI operating system that was designed from the ground up to rival and outperform every major AI platform in existence.

Built across **30 consecutive days** of intense, round-the-clock development by a single teenage developer, LACUNEX represents what happens when raw talent meets obsessive engineering. Every pixel, every API route, every state machine, every fallback cascade — hand-crafted by one person.

**The scale of this project:**
- **~50,000+ lines of code** across frontend and backend
- **18+ React components**, each production-grade with full state management
- **14+ backend services** with async concurrency, SSE streaming, and fault tolerance
- **11 API route modules** handling auth, chat, export, flow, history, code execution, and more
- **28 independent API keys** rotating across 5 elite AI providers
- **1 developer. 30 days. Zero shortcuts.**

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LACUNEX AI — System Architecture              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│   │   Next.js 14  │    │   FastAPI     │    │   AI Provider Pool   │  │
│   │   Frontend    │◄──►│   Backend     │◄──►│                      │  │
│   │              │    │              │    │  Cerebras (3 keys)    │  │
│   │  • ChatBox   │    │  • SSE Stream│    │  Groq (3 keys)       │  │
│   │  • Sidebar   │    │  • Intent    │    │  Gemini (16 keys)    │  │
│   │  • CodeStudio│    │  • Router    │    │  SambaNova (3 keys)  │  │
│   │  • Flow      │    │  • Memory    │    │  OpenRouter (3 keys) │  │
│   │  • Artifacts │    │  • Search    │    │                      │  │
│   │  • DocPreview│    │  • Export    │    │  Total: 28 API Keys  │  │
│   └──────────────┘    └──────────────┘    └──────────────────────┘  │
│                                                                      │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│   │  SQLite/     │    │  Code        │    │  Web Intelligence    │  │
│   │  PostgreSQL  │    │  Executor    │    │                      │  │
│   │  Database    │    │  (50+ langs) │    │  • Live Search       │  │
│   │              │    │              │    │  • URL Scraping      │  │
│   │  • Users     │    │  • Python    │    │  • News Injection    │  │
│   │  • Convos    │    │  • Java      │    │  • Score Tracking    │  │
│   │  • Messages  │    │  • C/C++     │    │  • Stock Prices      │  │
│   │  • E2EE      │    │  • Go/Rust   │    │  • Trend Analysis    │  │
│   └──────────────┘    └──────────────┘    └──────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Core Engine: Multi-Provider Key Rotation System

Standard AI platforms fail when they hit server capacity. **LACUNEX never sleeps.**

The heart of LACUNEX is a **fault-tolerant, auto-rotating distribution engine** that intelligently routes every query through a cascading waterfall of 5 elite AI providers, each armed with multiple independent API keys. When one key hits a rate limit, the engine silently pivots to the next in **milliseconds**. The user experiences **actual zero downtime**.

### Provider Cascade Architecture

| Priority | Provider | Keys | Model Tier | Speed | Specialization |
|:--------:|----------|:----:|------------|-------|----------------|
| 🥇 1st | **Cerebras** | 3 | Qwen-3 235B MoE | ~1000+ T/s | Wafer-Scale Engine — fastest inference on Earth |
| 🥈 2nd | **Groq** | 3 | LLaMA 3.3-70B | Sub-second | LPU Architecture — near-zero latency |
| 🥉 3rd | **Gemini** | 16 | Gemini 2.5 Flash/Pro | High throughput | Google's flagship — massive token limits + thinking mode |
| 4th | **SambaNova** | 3 | LLaMA 3.3-70B | High quality | 405B Parameter Tier — deep reasoning |
| 5th | **OpenRouter** | 3 | 6+ free models | Fallback | Aggregates 200+ models as last resort |

### How the Waterfall Works

```
User sends message
    │
    ▼
┌─ Cerebras (3 keys × 2 models = 6 attempts) ─┐
│  Key 0 → Try qwen-3-235b → ✅ Success → DONE │
│  Key 0 → 429 Rate Limited → rotate           │
│  Key 1 → Try qwen-3-235b → ✅ Success → DONE │
│  Key 1 → 429 → rotate to Key 2               │
│  Key 2 → 429 → try fallback model llama3.1-8b│
│  All keys exhausted → escalate ↓              │
└───────────────────────────────────────────────┘
    │
    ▼
┌─ Groq (3 keys) ──────────────────────────────┐
│  Same rotation pattern...                     │
│  All keys exhausted → escalate ↓              │
└───────────────────────────────────────────────┘
    │
    ▼
┌─ Gemini (16 keys!) ──────────────────────────┐
│  16 independent keys provide massive          │
│  throughput buffer before exhaustion           │
└───────────────────────────────────────────────┘
    │
    ▼
┌─ SambaNova → OpenRouter (6+ free models) ────┐
│  Final fallback layer with multiple models    │
│  per key for maximum resilience               │
└───────────────────────────────────────────────┘
```

**Result:** Even under extreme load, LACUNEX can make **50+ provider attempts** before returning an error. In practice, users **never** see downtime.

---

## 🧠 Intent Detection Engine v5.0

LACUNEX doesn't just process text — it **understands humans**. The Intent Detection Engine is a custom-built NLP pre-processor that analyzes every message at 14 distinct layers before a single token is generated.

### The 14-Step Analysis Pipeline

| Step | Analysis | What It Does |
|:----:|----------|-------------|
| 1 | **Typo Correction** | Maps 60+ common misspellings (`explan` → `explain`, `cpde` → `code`) |
| 2 | **Language Detection** | Discriminates Hindi, Bengali, Telugu, Tamil from English with score-based classification |
| 3 | **Casual Pattern Match** | Detects greetings, farewells, gratitude, emotional states, identity questions |
| 4 | **Domain Classification** | Classifies into 7 domains: CS, mechanical engineering, cybersecurity, medical, academic, creative, business |
| 5 | **Academic Board Detection** | Identifies 12+ Indian academic boards (WBSCTVE, CBSE, MSBTE, GTU, GATE, JEE, NEET, UPSC) |
| 6 | **Code Intent Detection** | Recognizes programming requests even in broken English or mixed languages |
| 7 | **Document/MAX OUTPUT Detection** | Triggers multi-pass document generation for comprehensive content requests |
| 8 | **Web Search Classification** | Hard/soft/never trigger system — knows when to search vs when to use knowledge |
| 9 | **Image Generation Detection** | Catches `/imagine` commands and natural image requests |
| 10 | **Creative Writing Detection** | Identifies stories, poems, scripts, roleplay requests |
| 11 | **Tone Analysis** | Classifies tone as urgent, supportive, formal, casual, or neutral |
| 12 | **Confidence Scoring** | Calculates 0.0–1.0 confidence for intent classification accuracy |
| 13 | **Primary Intent Routing** | Routes to one of 8 primary intents: casual, academic, code, document, creative, image, web_search, knowledge_qa |
| 14 | **Reasoning & Math Detection** | Detects mathematical expressions, proofs, and complex analytical requests |

### Linguistic Omniscience — Cultural Intelligence

LACUNEX doesn't force users to speak perfect English. It speaks **their** language:

- **Hinglish**: `"bhai yeh quantum physics samjhao"` → Responds with Hindi warmth + English precision
- **Banglish**: `"eta ektu bujhao"` → Responds with Bengali cultural context
- **Tenglish/Tanglish**: Telugu and Tamil romanized text → Understood and contextualized
- **Broken English**: `"explan quantom computr"` → Intent detected perfectly
- **Abbreviations**: `"pls hw 2 mak websit"` → Parses and responds naturally
- **Mixed Scripts**: Seamlessly handles any combination of the above

**Critical distinction**: LACUNEX correctly differentiates `"kaise ho"` (Hindi) from `"kemon acho"` (Bengali) — **never mixing the two** in responses. This cultural precision is what separates LACUNEX from every other AI system.

---

## 📝 MAX OUTPUT Engine — Document Generation at Scale

Most AI systems hit a token ceiling after ~1,000 words. LACUNEX **obliterates** this ceiling.

### How It Works

1. **Intent Detection**: The engine detects large-scale document requests automatically
2. **Table of Contents Generation**: AI generates a 15-20 chapter deep-dive TOC as structured JSON
3. **Multi-Pass Waterfall Expansion**: Each chapter is generated independently using the full provider waterfall (crash-proof — if one provider fails mid-chapter, the next picks up)
4. **Context Continuity**: Each chapter receives the previous chapters' summaries to avoid repetition
5. **Mermaid Diagram Injection**: AI-generated flowcharts, sequence diagrams, and architecture visualizations
6. **Live Progress Tracking**: Real-time UI shows which chapter is being generated, with progress bar

### Output Capabilities

- **150+ page textbooks** generated natively in the browser
- **Structured Markdown** with proper heading hierarchy (H1 → H6)
- **Embedded tables, callouts, formulas** (plain text math for PDF compatibility)
- **Academic modes** with solved numericals in Given/Find/Solution format
- **Board-specific content** (WBSCTVE, CBSE, etc.) with exam tips and IS code references
- **One-click export** to **PDF**, **DOCX**, and **XLSX**

---

## 💻 Code Studio — A Full IDE in the Browser

LACUNEX ships with **Terminal Zero**, a professional-grade integrated development environment embedded directly into the chat interface.

### Features

| Feature | Description |
|---------|-------------|
| **Multi-Language Execution** | Run Python, Java, C, C++, Go, Rust, JavaScript, TypeScript, PHP, Ruby, Kotlin, Swift, and 40+ more languages |
| **Live HTML Preview** | Write HTML/CSS/JS and see it rendered instantly in a secure sandboxed iframe |
| **Syntax Highlighting** | Monaco-based editor with VS Code-level syntax highlighting and auto-completion |
| **stdin Support** | Pass custom input to programs that require user input |
| **Artifact System** | Multi-file web projects (`index.html` + `style.css` + `script.js`) rendered as interactive artifacts |
| **One-Click Open** | Open Code Studio from the sidebar, or directly from any code block in chat |

### The Artifact Viewer

When LACUNEX generates web code (HTML/CSS/JS), it doesn't just dump text — it renders it as a **live, interactive artifact**:

- Multi-file bundling (`<lacunex-artifact>` tags with multiple `<file>` children)
- Secure iframe sandbox with `allow-scripts`
- Real-time preview with hot-reload
- Copy, download, and open-in-new-tab options
- Split-pane view: code on the left, preview on the right

---

## 🔀 Lacunex Flow — Visual AI Pipeline Builder

**Lacunex Flow** is a revolutionary, node-based **visual canvas** that breaks free from linear chat constraints. Think of it as a visual programming language for AI — where each node is an AI operation, and wires connect outputs to inputs.

### Node Types

| Node | Purpose |
|------|---------|
| **Prompt Node** | Define custom prompts with variable injection |
| **AI Model Node** | Choose provider + model, set temperature, max tokens |
| **Transform Node** | Process AI output (extract JSON, filter, format) |
| **Conditional Node** | Branch pipeline based on output content |
| **Output Node** | Display final results or feed back to chat |

### How It Works

1. **Drag & drop** nodes onto the canvas
2. **Wire connections** between output ports → input ports
3. **Configure** each node with prompts, models, and parameters
4. **Execute** the pipeline — output from each node flows into the next
5. **Results** are injected back into the main chat workspace

> **Note:** Flow Canvas is deliberately disabled on mobile devices. The node-based drag-and-drop interface requires a large screen and mouse precision for optimal UX.

---

## 🌐 Real-Time Web Intelligence

LACUNEX doesn't just know things — it knows things **right now**.

### Smart Search Classification

The search system uses a tri-tier trigger architecture:

- **Hard Triggers** (always search): `"latest news"`, `"IPL score today"`, `"stock price"`, `"weather"`, `"2026"`
- **Soft Triggers** (search if ambiguous): `"who is"`, `"what happened to"`, `"is still"`
- **Never Triggers** (never search): `"explain"`, `"write code"`, `"create a function"`

### Capabilities

- **Live sports scores** (IPL, FIFA, Premier League, NBA, cricket — with date injection)
- **Stock prices and market data** (real-time with current date appended)
- **Breaking news** with source attribution
- **Weather forecasts** for any location
- **Tech product launches** and release information
- **URL scraping** — paste any URL and LACUNEX extracts and analyzes the content

### Auto-Query Optimization

When search is triggered, LACUNEX doesn't just pass the user's query to a search engine. It:

1. Detects the query category (sports, news, tech, finance)
2. Appends the current date for time-sensitive queries
3. Optimizes the search query for maximum relevance
4. Injects results directly into the AI's context window

---

## 🎨 Premium UI/UX Design System

LACUNEX was designed iteratively until it felt like a **$1,000/month Enterprise SaaS product**. Every interaction element is polished to a mirror shine.

### Design Principles

- **Deep Glassmorphism**: `backdrop-filter: blur(24px)` with multi-layer transparency
- **Dark Mode First**: Rich backgrounds (`#0a0a0f`, `#0d0d1a`) with vivid accent colors
- **Micro-Animations**: Subtle entrance animations, hover elevations, pulse effects on every interactive element
- **Gradient Mastery**: Multi-stop gradients for depth and dimension
- **Premium Typography**: Google Fonts (Inter, Outfit, Space Grotesk, JetBrains Mono for code)
- **3D Shadows**: Multi-layer `box-shadow` for floating card effects
- **Custom Scrollbars**: Themed `::-webkit-scrollbar` with 6px width and rounded tracks
- **Responsive**: Fully functional on mobile, tablet, and desktop

### Claude-Inspired Sidebar

- **Starred Workspaces**: Pin important conversations with ⭐ toggle (persisted in localStorage)
- **Collapsible Sections**: Starred and Recents sections with smooth expand/collapse
- **Context Menus**: Right-click any workspace for Rename, Star, or Delete
- **Inline Rename**: Double-click any title to rename in-place
- **Search**: Filter workspaces by title
- **User Profile**: Persistent bottom card with avatar, status, and account management
- **Navigation Tabs**: Switch between Chats, Code Studio, and Lacunex Flow

---

## 🛡️ Security & Privacy

| Feature | Implementation |
|---------|---------------|
| **End-to-End Encryption** | All messages encrypted with AES-GCM via Web Crypto API before storage |
| **JWT Authentication** | Secure token-based auth with httpOnly best practices |
| **Account Factory Reset** | One-click permanent deletion of all data |
| **Session Management** | Clear session and logout with localStorage/sessionStorage wipe |
| **Secure Code Execution** | Sandboxed execution environment with timeout limits |
| **No Data Retention** | Messages are encrypted client-side — server stores only ciphertext |

---

## 🧩 Thinking Mode — Deep Reasoning

When the 🧠 Thinking toggle is activated, LACUNEX switches to **deep reasoning mode**:

1. **Primary**: Gemini 2.5 Flash with 10,000-token thinking budget
2. **Fallback**: DeepSeek R1 Distill (70B) via OpenRouter
3. **Final fallback**: Full provider waterfall

The thinking process is displayed in real-time as a collapsible `<thinking>` block, showing the AI's step-by-step reasoning before the final answer.

---

## 📊 Export System

LACUNEX features a sophisticated multi-format export pipeline:

- **PDF Export**: Professional document with headers, footers, syntax highlighting, and proper pagination
- **DOCX Export**: Microsoft Word compatible with maintained formatting
- **XLSX Export**: Spreadsheet export for structured/tabular data
- **ZIP Bundle**: Export all formats at once with `Export All`
- **Document-specific exports**: MAX OUTPUT documents export with full ToC, diagrams, and styled sections

---

## 📦 Complete Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **Next.js 14** | React framework with App Router, server components |
| **Vanilla CSS** | 8,000+ lines of hand-crafted CSS — no Tailwind dependency |
| **Framer Motion** | Organic fluid animations and page transitions |
| **Monaco Editor** | VS Code's editor engine for Code Studio |
| **Web Crypto API** | Client-side AES-GCM encryption for E2EE |
| **localStorage** | Persistent starred workspaces, user preferences |
| **SSE (EventSource)** | Real-time streaming of AI responses |
| **KaTeX** | Beautiful LaTeX math rendering in chat |
| **Mermaid.js** | Diagram rendering for flowcharts and sequence diagrams |

### Backend
| Technology | Purpose |
|-----------|---------|
| **FastAPI** | Async Python web framework with automatic OpenAPI docs |
| **SQLAlchemy** | Async ORM with SQLite (dev) / PostgreSQL (prod) |
| **Python asyncio** | Concurrent request handling and SSE streaming |
| **Pydantic v2** | Request/response validation and serialization |
| **JWT (PyJWT)** | Stateless authentication tokens |
| **httpx / aiohttp** | Async HTTP clients for AI provider calls |
| **BeautifulSoup** | Web scraping for URL content extraction |

### Backend Microservices Architecture
| Service | File | Lines | Purpose |
|---------|------|:-----:|---------|
| **AI Router** | `ai_router.py` | 1,268 | Multi-provider waterfall with key rotation |
| **Intent Detector** | `intent_detector.py` | 841 | 14-step NLP intent classification engine |
| **Export Service** | `export_service.py` | 58,934B | PDF/DOCX/XLSX generation pipeline |
| **Export v2** | `_export_v2.py` | 87,769B | Next-gen document export engine |
| **Document Parser** | `document_parser.py` | 22,769B | Markdown → structured document tree |
| **Document Renderer** | `document_renderer.py` | 24,728B | Document tree → styled HTML/PDF |
| **Search Service** | `search_service.py` | 9,224B | Real-time web search aggregation |
| **Scraper Service** | `scraper_service.py` | 3,828B | URL content extraction and parsing |
| **Memory Service** | `memory_service.py` | 4,068B | Persistent user memory (facts, preferences) |
| **Auth Service** | `auth_service.py` | 2,025B | JWT token validation and user extraction |
| **Image Handler** | `image_handler.py` | 2,249B | Image generation and analysis routing |
| **Gap Detector** | `gap_detector.py` | 4,200B | Knowledge gap analysis in AI responses |

### API Routes
| Route Module | Endpoints | Purpose |
|-------------|:---------:|---------|
| `chat.py` | 4 | Main chat streaming, suggestions, auto-title |
| `history.py` | 6 | CRUD for conversations and encrypted messages |
| `auth.py` | 3 | Signup, login, account deletion |
| `executor.py` | 1 | Multi-language code execution |
| `export.py` | 3 | PDF/DOCX/XLSX/ZIP export |
| `flow.py` | 2 | Lacunex Flow pipeline execution |
| `image.py` | 2 | Image generation and analysis |
| `files.py` | 1 | File upload and text extraction (RAG) |
| `model_catalog.py` | 1 | Dynamic model listing by provider |
| `stats.py` | 1 | System statistics and health |

---

## 🌟 Complete Feature Matrix

| Category | Feature | Description |
|:--------:|---------|-------------|
| 🧠 | **Deep Reasoning** | Multi-step logical deduction with visible thinking process |
| ⚡ | **Zero-Downtime Inference** | 28-key rotation across 5 providers — never fails |
| 📝 | **MAX OUTPUT Mode** | 150+ page document generation with ToC and diagrams |
| 💻 | **Code Studio** | 50+ language execution + live HTML preview |
| 🔀 | **Lacunex Flow** | Visual node-based AI pipeline builder |
| 🌐 | **Live Web Intel** | Real-time search, scores, stocks, weather, news |
| 🎨 | **Image Generation** | `/imagine` syntax for AI-generated visuals |
| 📊 | **Multi-Format Export** | PDF, DOCX, XLSX with professional styling |
| 🛡️ | **E2E Encryption** | AES-GCM encryption for all stored messages |
| 🗣️ | **Linguistic AI** | Hinglish, Banglish, Tenglish, broken English — all understood |
| 📂 | **File Upload + RAG** | Upload PDFs/docs for context-aware analysis |
| 🖼️ | **Image Analysis** | Upload images for AI-powered visual understanding |
| ⭐ | **Starred Workspaces** | Pin important conversations for quick access |
| ✏️ | **Inline Rename** | Double-click or right-click to rename chats |
| 🔍 | **Smart Search Toggle** | Manual override for web search per message |
| 📱 | **Responsive Design** | Full mobile + tablet + desktop support |
| 🎮 | **Interactive Artifacts** | Live-rendered HTML/CSS/JS in sandboxed iframes |
| 📈 | **Proactive Intelligence** | AI suggests follow-ups, quizzes, and deeper dives |
| 🏫 | **Academic Board Support** | WBSCTVE, CBSE, GATE, JEE, NEET-specific content |
| 🔐 | **Account Management** | Rename, reset session, delete all data, factory reset |
| 🎯 | **Intent Badges** | Real-time display of detected intent and confidence |
| 📋 | **Auto-Titling** | AI generates descriptive workspace names from first message |
| 🧪 | **Interactive Quizzes** | AI generates MCQs with explanations for academic content |
| 💡 | **Fact-Check Badges** | «verified» and «approx» badges on factual claims |
| 🔄 | **Keep-Alive Pings** | Prevents server cold starts on free hosting tiers |
| 📲 | **Android Native App** | Full Capacitor-powered Android APK with native features |

---

## 📲 Android Native App (Capacitor)

LACUNEX AI ships as a **native Android application** built with [Capacitor](https://capacitorjs.com/) — the same framework used by production apps like Burger King, Popeyes, and Tim Hortons.

### Why Native?

The Android app isn't a PWA wrapped in a WebView. It's a **true hybrid native app** with:

- **Native splash screen** with custom Lacunex branding and spinner
- **Hardware-accelerated rendering** via Capacitor's optimized WebView
- **Android back button handling** — closes sidebar if open, otherwise navigates naturally
- **App lifecycle management** — auto-reconnects when resuming from background
- **90-second cold start timeout** — handles Render's free-tier wakeup seamlessly
- **Automatic retry** — network errors trigger automatic retries with exponential backoff
- **Safe area support** — properly handles gesture navigation and 3-button nav bars
- **Custom app icon and splash** — generated for all Android densities (mdpi → xxxhdpi)

### Architecture

```
┌──────────────────────────────────┐
│     Android Native Shell          │
│     (Capacitor + WebView)         │
├──────────────────────────────────┤
│  Server: androidScheme: 'https'   │
│  → Enables HTTPS API calls        │
│  → No mixed-content blocking      │
├──────────────────────────────────┤
│  Next.js Static Export (out/)     │
│  → All pages pre-rendered         │
│  → Zero server dependency         │
├──────────────────────────────────┤
│  Native Plugins:                  │
│  • @capacitor/splash-screen       │
│  • @capacitor/keyboard            │
│  • @capacitor/network             │
│  • @capacitor/haptics             │
│  • @capacitor/status-bar          │
│  • @capacitor/app                 │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Render Backend (Production)      │
│  https://lacunex-ai.onrender.com  │
│  CORS: http://localhost,          │
│        capacitor://localhost      │
└──────────────────────────────────┘
```

### Smart API Routing

The app automatically detects whether it's running on **web** (Vercel) or **native** (Android):

| Platform | API URL | Source |
|----------|---------|--------|
| Vercel (Web) | `process.env.NEXT_PUBLIC_API_URL` | Vercel env vars |
| Android (Native) | `https://lacunex-ai.onrender.com` | Hardcoded production URL |
| Local Dev | `http://localhost:8000` | `.env.local` fallback |

### Installing the APK (For Users)

> **You don't need to build anything!** Just download and install:

1. Go to the [LACUNEX AI GitHub Repository](https://github.com/shasradha/LACUNEX-AI)
2. Click on **Packages** in the repository sidebar
3. Download the latest `.apk` file
4. Open the APK on your Android phone and install it
5. Launch **Lacunex AI** and sign in!

### Building the APK (For Developers)

```bash
cd frontend

# 1. Build the static export
npm run build

# 2. Sync assets to Android
npx cap sync android

# 3. Open in Android Studio
npx cap open android

# 4. In Android Studio: Build → Build APK(s)
# APK output: android/app/build/outputs/apk/release/
```

### Tech Details

| Component | Value |
|-----------|-------|
| **App ID** | `com.lacunex.ai` |
| **Min SDK** | Android 7.0 (API 24) |
| **Target SDK** | Android 16 (API 36) |
| **WebView Scheme** | HTTPS (prevents mixed-content blocking) |
| **CapacitorHttp** | Enabled (native HTTP, bypasses WebView) |
| **Timeout (Native)** | 90 seconds (handles Render cold starts) |
| **Retry Logic** | 2 attempts with 1.5s backoff |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.10+
- API keys from at least one provider (Groq, Gemini, Cerebras, etc.)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Copy .env and add your API keys
cp .env.example .env
# Edit .env with your API keys (see .env for all supported variables)

# Run the server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install

# Set the API URL
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run the development server
npm run dev
```

### Environment Variables

```env
# Required (at least one provider)
GROQ_API_KEYS=key1,key2,key3
GEMINI_API_KEYS=key1,key2,...,key16
CEREBRAS_API_KEYS=key1,key2,key3

# Optional providers
SAMBANOVA_API_KEYS=key1,key2,key3
OPENROUTER_API_KEYS=key1,key2,key3

# Auth
JWT_SECRET=your-secret-key

# Database (defaults to SQLite for development)
DATABASE_URL=sqlite+aiosqlite:///./lacunex.db
```

---

## 📐 Project Structure

```
LACUNEX AI/
├── backend/
│   ├── main.py                    # FastAPI application entry point
│   ├── requirements.txt           # Python dependencies
│   ├── database/
│   │   └── connection.py          # Async SQLAlchemy engine & session
│   ├── models/
│   │   ├── db_models.py           # User, Conversation, Message ORMs
│   │   └── schemas.py             # Pydantic request/response schemas
│   ├── routes/
│   │   ├── auth.py                # Signup, login, delete account
│   │   ├── chat.py                # SSE streaming, suggestions, auto-title
│   │   ├── history.py             # Conversation CRUD + encrypted messages
│   │   ├── executor.py            # Multi-language code execution
│   │   ├── export.py              # PDF/DOCX/XLSX export
│   │   ├── flow.py                # Lacunex Flow pipeline execution
│   │   ├── image.py               # Image generation + analysis
│   │   ├── files.py               # File upload + text extraction
│   │   ├── model_catalog.py       # Dynamic model listing
│   │   └── stats.py               # System health + statistics
│   └── services/
│       ├── ai_router.py           # Multi-provider key rotation engine
│       ├── intent_detector.py     # 14-step NLP intent classifier
│       ├── export_service.py      # Document export pipeline
│       ├── search_service.py      # Web search aggregation
│       ├── scraper_service.py     # URL content extraction
│       ├── memory_service.py      # Persistent user memory
│       ├── auth_service.py        # JWT authentication
│       ├── image_handler.py       # Image routing
│       ├── gap_detector.py        # Knowledge gap analysis
│       ├── document_parser.py     # Markdown → document tree
│       └── document_renderer.py   # Document tree → styled output
│
├── frontend/
│   ├── capacitor.config.ts        # Capacitor native config (HTTPS, plugins)
│   ├── app/
│   │   ├── globals.css            # 8,600+ lines of premium CSS
│   │   ├── layout.js              # Root layout with metadata
│   │   ├── page.js                # Landing/redirect page
│   │   ├── chat/page.js           # Main chat workspace page
│   │   └── login/page.js          # Authentication page
│   ├── components/
│   │   ├── ChatBox.jsx            # Core chat interface (1,375 lines)
│   │   ├── Sidebar.jsx            # Claude-style sidebar (687 lines)
│   │   ├── MessageBubble.jsx      # Rich message renderer with KaTeX + Mermaid
│   │   ├── ArtifactViewer.jsx     # Multi-file HTML/CSS/JS live preview
│   │   ├── FlowCanvas.jsx         # Node-based visual pipeline (47,871B)
│   │   ├── DocumentPreview.jsx    # MAX OUTPUT document viewer
│   │   ├── CodeStudio/            # Monaco-based IDE component
│   │   ├── CodeTerminal.jsx       # Code execution terminal
│   │   ├── ModelSelector.jsx      # Provider + model picker
│   │   ├── ImageGallery.jsx       # Image search results grid
│   │   ├── ImageSlider.jsx        # Image carousel viewer
│   │   ├── LoginPageClient.jsx    # Auth UI with animations
│   │   ├── Navbar.jsx             # Top navigation bar
│   │   └── ...                    # Additional UI components
│   ├── lib/
│   │   ├── api.js                 # API client with native HTTP + retry
│   │   ├── auth.js                # Token management
│   │   ├── crypto.js              # AES-GCM encryption/decryption
│   │   └── capacitor-hooks.js     # Native hooks (haptics, splash, back button)
│   │
│   └── android/                   # Capacitor Android project
│       ├── app/
│       │   ├── build.gradle       # App-level Gradle config
│       │   └── src/main/
│       │       ├── AndroidManifest.xml    # Permissions + activity config
│       │       ├── java/.../MainActivity.java  # Edge-to-edge + status bar
│       │       ├── assets/public/  # Built web assets (synced from out/)
│       │       └── res/           # Icons, splash, XML configs
│       ├── build.gradle           # Root Gradle config
│       └── variables.gradle       # SDK versions (API 24-36)
│
├── README.md
├── LICENSE
└── .gitignore
```

---

## 🏆 Why LACUNEX is Different

| Other AI Platforms | LACUNEX AI |
|-------------------|-----------|
| Single provider, single key | 5 providers, 28 keys, zero downtime |
| Token limits (~4K output) | 150+ page document generation |
| English-only NLP | Hindi, Bengali, Telugu, Tamil + broken English |
| Basic chat interface | Full IDE + Visual Flow Builder + Artifact System |
| No offline-first design | E2E encrypted, localStorage persistence |
| Wrapper around one API | Custom intent engine + routing + memory + search |
| Built by teams of 50+ | Built by ONE 15-year-old in 30 days |

---

## 📈 Development Timeline

| Week | Milestone |
|:----:|-----------|
| **Week 1** | Core architecture: FastAPI backend, Next.js frontend, auth system, database schema, basic chat streaming |
| **Week 2** | Multi-provider engine, key rotation, intent detection v1, web search integration, image support |
| **Week 3** | MAX OUTPUT engine, Code Studio, export pipeline (PDF/DOCX/XLSX), artifact viewer, Lacunex Flow |
| **Week 4** | UI polish (8,000+ lines CSS), thinking mode, memory system, linguistic intelligence v5, deployment |

**Total development time:** 30 days
**Total developer count:** 1
**Developer age:** 15 years old

---

## 🤝 Contributing

LACUNEX AI is open source under the MIT license. Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👤 Creator & Lead Architect

**[Shasradha Karmakar](https://github.com/shasradha)**
- 🎂 Age: 15 years old
- 📍 Location: Asansol, West Bengal, India
- 🔐 Cybersecurity: TryHackMe Top 1% globally (#670 / 7M+ users), India Rank #120
- 🏅 Certifications: Microsoft, Google, IBM, AWS, Cisco, NVIDIA
- 🌐 Portfolio: [shasradha.github.io](https://shasradha.github.io/)
- 💼 LinkedIn: [linkedin.com/in/shasradha](https://www.linkedin.com/in/shasradha)

---

<div align="center">

### *"We didn't just build a wrapper. We gave the internet a brain."*

Written in code. Driven by passion. Designed for the bold.

**Welcome to the future of AI operating systems.**

⚡ **LACUNEX AI** ⚡

</div>
