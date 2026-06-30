# 🔒 Conseal Trust Console

Conseal Trust Console is a state-of-the-art, premium PII redaction and confidence analytics dashboard. It enables security teams and compliance auditors to scan sensitive documents, inspect flagged spans, interact with a live Gemini-grounded reasoning assistant, and export sanitized text with zero leakage.

---

## 🚀 Key Features

* **Live Gemini Explanations**: Uses `gemini-2.5-flash` to generate real-time, context-grounded reasoning for every redaction decision.
* **Confidence Distribution Analytics**: Computes document-wide confidence statistics (mean, median, standard deviation) and draws custom column bar charts.
* **Independent Side-by-Side Scrolling**: Columns scroll independently (left document viewer, right audit logs and explanation panel) for an optimal auditing experience.
* **Draggable Panel Resizing**: Custom drag handles let you adjust panel widths dynamically.
* **Robust Masking Engine**: Built-in regex rules with overlapping interval scheduling to accurately detect and redact Email, Phone, SSN, Passport Numbers, TIN/EINs, and Financial Accounts.
* **Custom Visible Scrollbars**: Styled with a minimal grab area and a brand-colored teal hover highlight.
* **100% Client-Server Navigation**: Broken race conditions in routing to allow seamless Home page navigation.

---

## 🛠️ Tech Stack

* **Frontend**: React, Vite, Zustand (State Management), Lucide React (Icons), TailwindCSS.
* **Backend**: Node.js, Express, Multer, tsx (watcher).
* **AI Engine**: Google Gemini API (`gemini-2.5-flash`).

---

## 📦 Project Structure

```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # UI components (layout, review, explanation)
│   │   ├── pages/          # Core pages (LandingPage, ReviewPage)
│   │   ├── store/          # Zustand state store
│   │   └── lib/            # Types, utilities, and API wrappers
├── server/                 # Express backend application
│   ├── src/
│   │   ├── routes/         # Express router and endpoints
│   │   ├── services/       # Mock and Gemini services
│   │   └── utils/          # Analysis and helper utilities
├── docs/                   # System design, documentation, and writeups
```

---

## ⚙️ Setup & Installation

Please refer to the detailed [System Writeup & Setup Guide](file:///docs/system_writeup.md) inside the `docs/` folder for backend `.env` configuration and launch instructions.
