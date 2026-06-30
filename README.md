# 🔒 Conseal Trust Console

Conseal Trust Console is a state-of-the-art, premium PII redaction and confidence analytics dashboard. It enables security teams and compliance auditors to scan sensitive documents, inspect flagged spans, interact with a live Gemini-grounded reasoning assistant, and export sanitized text with zero leakage.

---

## 🚀 Architectural Modules & Details

### 1. **Ingestion & Intake Module (`server/src/routes/api.ts` & `client/src/pages/LandingPage.tsx`)**
* **Responsibility**: Manages the loading and uploading of raw text, sample files, and `.txt` files.
* **Details**: 
  * Accepts file uploads via `multer` (in-memory buffer parsing) or direct text copy-pasting.
  * Validates inputs to ensure they are non-empty and under the 200KB limit to optimize latency.
  * Initiates the detection process and returns a standardized `PIIDocumentResponse` to the client.

### 2. **PII Detection Engine (`server/src/services/MockDetectionService.ts`)**
* **Responsibility**: Identifies sensitive strings inside the raw ingested document and classifies them into standard categories.
* **Detections Supported**: 
  * `EMAIL`: Standard email formats.
  * `SSN_OR_GOVT_ID`: US Social Security Numbers, Alphanumeric Passport Numbers (e.g. `XK9087345`), and Tax IDs/EINs (`XX-XXXXXXX`).
  * `PHONE`: US phone number structures.
  * `FINANCIAL_ACCOUNT`: Bank Routing Numbers (9 digits) and general account sequences (6 to 18 digits).
* **Core Logic**: Runs concurrent regex evaluations, assigns confidence scores, and executes a **greedy interval scheduling filter** to eliminate overlapping or duplicate span detections.

### 3. **AI Reasoning Assistant (`server/src/services/GeminiAnswerService.ts` & `client/src/components/explanation/AskWhyBox.tsx`)**
* **Responsibility**: Powers the "Ask Conseal AI" side-pane conversation box.
* **Details**:
  * Integrates Google Gemini API (`gemini-2.5-flash`) to answer compliance questions.
  * Dynamically packages surrounding text, confidence score distributions, PII categories, and regulatory risks into a structured prompt.
  * Tracks query counts, input/output tokens, and maps grounding signals (e.g. confidence, signals, risk notes).

### 4. **Split-Pane Layout & Resizing Module (`client/src/components/explanation/ExplanationPanel.tsx` & `client/src/components/review/AuditLogSidebar.tsx`)**
* **Responsibility**: Provides a responsive, side-by-side workspace split.
* **Details**:
  * Uses inline flex items instead of floating elements so that the Document Viewer (left) and Sidebars (right) sit side-by-side naturally.
  * Features custom draggable mouse handlers that sync width changes to the Zustand store.
  * Binds column heights to the viewport with `overflow-y: auto`, enabling independent scrolling.

---

## ⚙️ Setup & Installation Guide

Follow these steps to configure your API credentials and run the project locally:

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** (v18.x or higher)
* **npm** (v9.x or higher)
* A Google AI Studio API Key (for Gemini)

### 2. Configure Environment Variables
Create a `.env` file in the `server/` directory:
```bash
# Navigate to server/ and create .env
PORT=3001
ANSWER_MODE=live
GEMINI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Install Dependencies
Install all package dependencies in the root workspace directory:
```bash
# From the project root
npm install
```

### 4. Run in Development Mode
Launch both the frontend client and backend server concurrently:
```bash
npm run dev
```
* **Frontend Application**: `http://localhost:5173/`
* **Backend API**: `http://localhost:3001/`

---

## 🛡️ Solved Edge Cases & Heuristics

During the integration phase, several critical layout, navigation, and logic edge cases were solved:

### 1. Gemini Answer Truncation (Safety & Thinking Budget)
* **Problem**: By default, newer Gemini 2.5 models generate internal reasoning/thinking tokens. These tokens count toward the `maxOutputTokens` limit. In a setup with `maxOutputTokens: 150`, the thinking process consumed almost the entire budget, leaving only 4-5 words for the actual output, resulting in premature truncation (`finishReason: MAX_TOKENS`).
* **Solution**: Explicitly disabled the thinking budget in the model request (`thinkingConfig: { thinkingBudget: 0 }`) and increased the `maxOutputTokens` limit to `400` to guarantee complete, detailed explanations.

### 2. Split Workspace Squishing & Layout Overlaps
* **Problem**: In a fluid side-by-side split layout, dragging a sidebar to its maximum width (800px) or opening it on smaller laptop displays could squish the Document Viewer column to a tiny sliver or push it entirely off the screen.
* **Solution**: Enforced strict CSS constraints:
  * Document Viewer column: `minWidth: 400` and `flex: 1`.
  * Sidebars: `maxWidth: "50%"` and minimum limits (`320px` for Explanation Panel, `280px` for Audit Log).
  This guarantees that the main text box is always visible and occupies at least 50% of the screen width.

### 3. Double-Redirect Navigation Loop (Home / Logo clicks)
* **Problem**: The Landing Page auto-redirected to the review page if a document was active in the store, while the Review Page redirected to home if the document was missing. Calling `reset()` and navigating synchronously caused a race condition where the Landing Page would mount, detect the old document before the reset hook ran, and push the user straight back to the review page.
* **Solution**: Removed the auto-redirect `useEffect` from `LandingPage.tsx`. All navigations are now triggered explicitly in action handlers (like clicking a sample or pasting text). Clicks on the Logo or Home buttons now reset state and navigate back synchronously with zero redirects.

### 4. Overlapping Regex PII Detections
* **Problem**: Independent regex rules for Phone Numbers and Financial Accounts could overlap (e.g. matching a 10-digit number as both a phone number and a bank account). If left unfiltered, these overlapping offsets caused string index crashes or duplicated characters when slicing text segments in `buildSegments`.
* **Solution**: Implemented a **greedy interval scheduling filter** in `generateDefaultSpans` that sorts matches by length descending (longest match first) and priority descending (specific types over generic numbers). It scans matches sequentially and drops any span that overlaps with a previously accepted span.

### 5. Session Expiration & Offline Fallback
* **Problem**: Saving server files triggers automatic Node.js restarts, which clears the in-memory document store. An active browser tab clicking "Ask Why" after a restart would send an `/api/ask` request with an expired document ID, returning a 404 and showing a generic error bubble.
* **Solution**: Created a client-side fallback in `AskWhyBox.tsx`. If the API request fails (due to a restart, network issue, or rate limit), the box catches the error and reconstructs a grounded reasoning and risk card based on local span metadata (matching the previous template values), keeping the app functional and user-friendly at all times.

---

## 🏆 Earning Marcus's Trust: Judging Criteria

To address Marcus's trust and explainability problem, our system was built to prioritize complete user visibility, interactive interrogation, and structural bulletproofing:

### 1. Software Engineering Fundamentals
* **Separation of Concerns**: Clean isolation between UI rendering (`client/`), client state management (`Zustand` store), and server-side processing services (`server/src/services/`).
* **Factory Pattern Implementation**: Utilized a clean service factory (`factory.ts`) controlled by environment variables to switch between Mock and Live Gemini Answer services dynamically, making testing and scaling trivial.
* **Offsets and Safety Assertions**: The detection service enforces strict runtime string index assertions (`extracted !== match[0]`) to guarantee that indices sliced from raw documents match matched tokens with 100% mathematical precision.

### 2. Discovery of Hidden Hard Cases
We went beyond the core prompt requirements to discover and solve structural edge cases:
* **Gemini Chain-of-Thought Budgeting**: Discovered that Gemini 2.5 counts reasoning/thinking tokens as output, which prematurely truncated factual explanations under standard token limits. We solved this by disabling the thinking budget and tuning parameters.
* **Interval Overlap Collisions**: Discovered that overlapping regex rules (e.g. matching a 10-digit number as both a phone and financial account) corrupted string segmentation and crashed page rendering. Implemented a greedy interval scheduling algorithm to resolve collisions.
* **Double-Redirect Race Loops**: Identified a routing feedback loop where asynchronous resets and automatic mounting triggers caused navigation redirects to fight on page unmounting. We resolved this by mapping navigations explicitly to actions.

### 3. Empathy for Marcus's Anxiety (Real-User Empathy)
* **Grounded Signal Interrogation**: Instead of expecting Marcus to accept redacted text on faith, we present an inline, searchable list of signals (e.g., standard formats, surrounding words, contextual risk notes) that explain exactly why a redaction was applied.
* **Visual Confidence Calibration**: Included a collapsible confidence analysis block showing median, mean, standard deviation, and distribution charts, allowing Marcus to gauge the model's certainty across the entire document.
* **Interactive Chat Box**: Marcus is never locked into static reasoning; he can click quick questions or write custom queries directly to interrogate the system, receiving contextually grounded, live Gemini responses.
* **Worried Mode Toggle**: Built a dedicated toggle for heightened sensitivity, adjusting thresholds and highlighting borderline cases dynamically.

### 4. Tradeoff & Architecture Judgment
* **Mock vs. Heavy Dependencies**: We chose to implement a fast, regex-based engine with overlapping interval scheduling instead of integrating Microsoft Presidio. Presidio requires heavy native bindings or a python service sidecar, which complicates installation and increases resource footprints. A robust regex engine in Node.js provides a zero-setup, zero-latency demo.
* **In-Memory Store vs. Database**: Stored active auditing states in an in-memory session map. Since compliance auditing is an active task where data should not persist indefinitely on disk, keeping it in memory guarantees maximum performance and automatic data cleanup upon session restarts.
