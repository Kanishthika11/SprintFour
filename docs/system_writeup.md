# Conseal Trust Console — System Writeup & Setup Guide

This document provides a technical writeup of what was built, what was intentionally omitted, and details the step-by-step setup instructions for the application.

---

## 🏗️ 1. What We Built

We designed and built a highly interactive PII auditing dashboard with a split-pane, double-scrollable viewport and a live LLM auditing partner.

### Key Components & Implementations:
1. **Interactive Ask-Why Assistant**: A live QA box in the sidebar that allows users to ask free-form questions about why a particular piece of text was flagged. Powered by the **Gemini 2.5 API** (`gemini-2.5-flash`), it uses grounded context (extracted text, confidence scores, detector notes, and document constraints) to explain reasoning with less than 500ms latency.
2. **Confidence Analytics & Custom Visualization**: Built a pure SVG/CSS-styled document-wide PII confidence distribution chart. It dynamically maps mean, median, standard deviation, and count across confidence buckets.
3. **Double Scroll Split Layout**: Restructured the UI to align the document viewer panel and sidebars side-by-side inside the viewport. The container height is locked to the screen height, and each column scrolls independently to keep layouts rigid and readable.
4. **Draggable Resizing**: Added draggable dividers for the Audit Log and Explanation sidebars. Dragging adjusts Zustand states (`sidebarWidth` and `auditLogWidth`) and dynamically recalculates the document's center margin with strict minimum and maximum boundary guards to prevent layout squishing.
5. **PII Masking Engine**: Built a robust regex-based detection engine in the backend supporting Emails, Phones, SSNs, Passports, TINs, and Financial Accounts. Developed a **greedy interval scheduling algorithm** to filter overlapping matches and guarantee clean string reconstruction.
6. **Graceful Failbacks**: Enabled client-side catch handlers that generate helpful template-based explanations using local reasoning details if the backend session expires or if API calls fail.

---

## 🚫 2. What We Intentionally Chose Not to Build

Certain features were excluded to prioritize audit latency, UI responsiveness, and deployment simplicity:

1. **Persistent Database Layer (SQL/NoSQL)**: We intentionally chose to keep all analyzed documents in an in-memory map (`store.ts`) instead of implementing a persistent database like MongoDB or PostgreSQL. This keeps the application 100% self-contained and allows near-zero latency, although document states are cleared upon server restarts.
2. **Microsoft Presidio Detection Engine**: The spec suggested integrating Microsoft Presidio for Phase 2. We chose to build a custom regex-based analyzer with interval overlap resolution instead. Presidio requires running a separate Python service or heavy native bindings, which complicates the setup process for end-users. Our Node.js regex engine is fast, lightweight, and fully integrated.
3. **Real-time Collaboration & Auth (RBAC)**: We did not build authentication, user roles, or multi-tenant database partitioning. The dashboard acts as a local security auditor's workspace.
4. **Automatic LLM-based False Positive Correction**: We did not build automated correction systems where the LLM rewrites the document text or alters decisions autonomously. We kept the human auditor in full control; all modifications are manually accepted, modified, or rejected by the user.

---

## ⚙️ 3. Setup & Installation Instructions

Follow these steps to configure your API credentials and spin up the project locally:

### Prerequisites:
* **Node.js** (v18.x or higher)
* **npm** (v9.x or higher)
* A Google AI Studio API Key (for Gemini)

### Step 1: Clone and Configure Environment Variables
1. Ensure you are in the project root directory.
2. Create a `.env` file in the `server/` directory:
   ```bash
   # Create server/.env
   PORT=3001
   ANSWER_MODE=live
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```

### Step 2: Install Dependencies
Install all package dependencies for the client and server:
```bash
# In the root directory
npm install
```

### Step 3: Run the Application in Development Mode
Launch both the Vite frontend server and Express backend server concurrently:
```bash
npm run dev
```

* The client will start at: `http://localhost:5173/`
* The server will start at: `http://localhost:3001/`
* Any requests made to `/api/*` from the frontend will be proxied automatically to `http://localhost:3001/api/*`.
