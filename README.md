# Family Firewall (फैमिली फ़ायरवॉल)

> **Rehearse together. Pause together.**
> Protective scam rehearsal, emergency pause, and privacy-first defense for families against digital arrest, courier fraud, and high-pressure imposter scams.

---

## Table of Contents
1. [Core Principles & Safety Rules](#core-principles--safety-rules)
2. [Quick Start & Setup](#quick-start--setup)
3. [Environment Variables](#environment-variables)
4. [Demo Story & Walkthrough](#demo-story--walkthrough)
5. [How Offline Works](#how-offline-works)
6. [Privacy Design in Plain Words](#privacy-design-in-plain-words)
7. [What is Real vs. Simplified in this Prototype](#what-is-real-vs-simplified-in-this-prototype)
8. [Testing & Verification](#testing--verification)

---

## Core Principles & Safety Rules

Family Firewall is designed with strict, non-negotiable ethical and architectural safeguards:

- **No AI / LLM APIs Anywhere**: The practice drill engine is 100% deterministic (`src/engine/index.ts`). Every caller prompt, tactic, and response path is pre-authored and predictable.
- **Strict Local-Only Data**: Safe words, personal phone numbers, audio recordings, and screen captures **stay on the device only** in Dexie IndexedDB. They are never transmitted over the network or stored in cloud databases.
- **Fictional Organizations Only**: Practice drills use strictly fictional names (e.g., *"National Digital Task Unit"*, *"State Parcel Vigilance"*). Real law enforcement names (CBI, ED, Cyber Police, Mumbai Police) or official state crests are never used.
- **Clear Practice Signage**: Every drill screen displays an always-visible **"Practice call"** tag and an always-visible **"Exit"** button.
- **Dignified Language**: The interface **never** uses the words *"failed"* or *"wrong"*. Drill outcomes are categorized respectfully as **Safe**, **Almost**, or **Let's try again**.
- **Complete Internationalization**: Every user-facing string is managed across Hindi (`hi`), English (`en`), and Hinglish (`hing`). Unverified translations are marked with `_TODO_REVIEW_`.
- **Elder-Accessible UI**: Body text is at least 18px (with a one-tap toggle for 22px Large Text), primary action buttons are at least 56px tall, and each screen focuses on a single primary action with high contrast.

---

## Quick Start & Setup

### Prerequisites
- Node.js 18+ (tested on Node.js 20+)
- npm 9+

### Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Build for production with PWA generation
npm run build

# 4. Run test suite (57 vitest unit tests)
npm test
```

The app will be available locally at `http://localhost:5173/`.

---

## Environment Variables

Copy `.env.example` to create your local `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default / Fallback |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase project URL for optional cross-device pairing & alerts | Empty / Optional |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anonymous API key (`anon` key only) | Empty / Optional |

> **Note on Offline Resilience**:
> The application is **offline-first**. Even if Supabase environment variables are left empty or the network is unavailable, the app launches cleanly, practice drills run locally, safe word verification works, and all events queue securely in the local Dexie outbox.

---

## Demo Story & Walkthrough

Here is the recommended 10-step story flow for demonstrations and evaluator reviews:

### Step 1: Welcome & Role Choice (`/welcome`)
- Open `http://localhost:5173/welcome`.
- Switch languages anytime using the Hindi, English, or Hinglish buttons.
- Toggle between normal text (18px) and large text (22px) using the top `A/A` button.
- Choose **"I am the parent"** to enter the Elder view.

### Step 2: Parent Protected Home (`/elder`)
- Prominent reassuring card: *"You are safe. Take your time before answering any unfamiliar call."*
- One-tap access to:
  - **"Practice a call"**: Start a simulated pressure call.
  - **"I feel pressured"**: One-tap reassurance explaining that real police never ask for money or secret transfers.
  - **"Verify this caller"**: Instructions to ask the caller for the secret family safe word.
  - **Always-present Emergency Pause Shield** (bottom right): Instantly halts any panic and alerts the family.

### Step 3: Practice Drill Engine (`/drill`)
- Features the **Digital Arrest Simulation** scenario.
- Notice the **"Practice call"** badge and always-visible **"Exit"** button.
- As the simulated scammer increases urgency, the visual **Pressure Meter** rises from *Calm* to *Rising* to *High Pressure*.
- Test different choices: decline the call, hang up early, refuse OTP, or press the Pause Shield.
- **Debrief Screen**: Shows the **Butterfly Effect Path Map** highlighting choices made vs. dangerous traps avoided. Shows what the user did well and gives constructive guidance for next time.

### Step 4: Family Pairing (`/elder/pair` & `/pair`)
- Parent taps **"Connect with Family"** -> views the plain-language Privacy Consent Modal.
- Displays a large, high-contrast QR code and an expiring 6-character text code (e.g., `FW8291`).
- Family member joins on their device at `/pair`, scans the QR code or enters the 6-character code, and sets their name.

### Step 5: Guardian Dashboard (`/family`)
- Displays the parent's protected status and readiness band (*Ready*, *Building*, *Starting*).
- **Practice Streak**: Tracks consecutive weekly rehearsals.
- **Weekly Booster Due Indicator**: Flags if more than 7 days have elapsed since the last rehearsal.
- **Real-time Alert Feed**: When the parent taps the Pause button, an urgent visual banner and audio alert trigger on the Guardian's screen with a one-tap **Quick Call** button.

### Step 6: Family Safety Pact Card (`/pact`)
- Printable A4 / pocket card designed to be kept near the parent's phone.
- Contains the 3 golden rules (*"Never send money"*, *"Never share OTPs"*, *"Hang up and call family"*), official cybercrime helpline (`1930`), and family emergency contacts.
- Includes a one-click **"Download PDF"** button (generated locally using `jspdf`).

### Step 7: Safe Word Setup (`/safeword`)
- Family agrees on a memorable phrase (e.g., *"Neeli Cycle"* or *"Mango Garden"*).
- The safe word is saved **exclusively in IndexedDB on the device** and never synced to the server.
- Used when a caller impersonates a child, grandchild, or relative in distress.

### Step 8: Privacy Proof Screen (`/privacy-proof`)
- Transparent audit screen reachable from Settings or Family Dashboard.
- Lists all local-only tables vs. outbound network traffic.
- Shows a live log of outgoing network requests, proving that no phone numbers, transcripts, or safe words ever cross the wire.

### Step 9: Hidden Demo Mode (`/demo`)
- **How to reach**: Tap the app title or logo **7 times** quickly on any header screen, or visit `/demo`.
- **Features**:
  - **Reset All Local Data**: Clears all 7 Dexie tables and local storage with a safe two-step confirmation step to prevent accidental deletion.
  - **FORCE OFFLINE Toggle**: Displays an amber `"FORCE OFFLINE (demo)"` banner and inhibits network event dispatching to demonstrate outbox queuing.
  - **Create Sample Drill History**: Injects 4 realistic rehearsal records clearly labeled as `"sample data (demo only)"` that stay strictly on the local device and never sync to the server, demonstrating the Guardian's readiness band and streak calculations.
  - Displays prototype build version.

### Step 10: Pilot Logger (`/pilot-logger`)
- Observer screen for field researchers and trial facilitators (reached from Demo Mode).
- Collects: participant code (no names), age band, round (before/after rehearsal), scenario shown (dynamically built from `/src/scenarios`), observation checkboxes (*Hung up*, *Refused OTP*, *Told someone*, *Used Pause*), and free-text notes.
- Saved strictly in Dexie `pilotLog`.
- One-click **"Export CSV"** downloads an anonymized observation dataset.
- Never synchronizes to cloud servers.

---

## How Offline Works

Family Firewall is architected to work reliably even in regions with intermittent mobile connectivity:

1. **Service Worker Precaching (`vite-plugin-pwa` + Workbox)**:
   - On the very first visit, the service worker precaches:
     - The complete app shell (`index.html`, JavaScript bundles, CSS stylesheets).
     - All scenario decision trees (`src/scenarios/*.json`).
     - Web fonts and icons (`lucide-react`, local font assets).
     - All locale translation dictionaries (`en.json`, `hi.json`, `hing.json`).
     - Pre-recorded guidance audio files under `/audio`.
2. **Offline Detection Banner**:
   - The app actively monitors `window.onLine` and `window.offline` events.
   - When offline, a discreet blue banner informs the user:
     > *"You are offline: practice and Pause guidance still work."*
3. **Dexie IndexedDB Local Outbox Queue**:
   - When a parent triggers a Pause alert or completes a drill while offline, the payload is persisted in the local `db.outbox` table with status `'pending'`.
   - As soon as network connectivity is restored (or when the app restarts), the background worker automatically processes and flushes pending outbox records to Supabase.
4. **PWA Install Guidance (`/install`)**:
   - The app provides an install prompt explanation screen guiding users on Android/Chrome (`beforeinstallprompt` event) and iOS Safari (*"Add to Home Screen"*) so the app runs fullscreen as a standalone app icon.

---

## Privacy Design in Plain Words

Elder protection requires absolute, uncompromised trust. Here is how Family Firewall guarantees privacy:

| Data Type | Where It Lives | Leaves Device? | Purpose |
| :--- | :--- | :---: | :--- |
| **Safe Word** | Dexie `safeWord` | **NEVER** | Rehearsed orally between family members to detect AI voice clones. |
| **Trusted Phone Numbers** | Dexie `trustedContacts` | **NEVER** | Used only by device `tel:` handler for emergency quick dialing. |
| **Microphone Audio & Speech** | Transient in RAM | **NEVER** | No voice data is uploaded, analyzed by cloud AI, or saved. |
| **Drill Notes & Mistakes** | Dexie `drillHistory` | **NEVER** | Detailed tactics and notes remain solely on the parent's phone. |
| **Pairing Codes** | Supabase `pairing_codes` | Yes (Expiring) | Temporary random 6-character code with 10-minute expiry. |
| **Safety Signals (Pause & Drill Status)** | Supabase `events` | Yes (Metadata only) | Timestamp, event type (`pause_pressed`), and high-level outcome (`safe`). |

---

## What is Real vs. Simplified in this Prototype

To ensure clarity for evaluators, researchers, and partners, here is a transparent breakdown:

### What is Real (Fully Functional)
- **Deterministic Drill Engine**: Complete branching logic, real-time pressure scoring, tactic detection, and butterfly effect analysis.
- **Dexie.js IndexedDB Schema**: 7 distinct local tables (`profile`, `trustedContacts`, `safeWord`, `drillHistory`, `outbox`, `settings`, `pilotLog`).
- **PWA Precaching & Service Worker**: Full offline functionality via Workbox.
- **Multilingual Support**: Real-time switching between English, Hindi, and Hinglish with unverified translation tracking.
- **PDF Generation**: Real client-side vector PDF generation of the Family Safety Pact card with customized contacts.
- **QR Code Generation & Scanning**: Live SVG/Canvas QR generation and HTML5 camera scanning.
- **Offline Outbox Synchronization**: Automatic retry mechanism with connection listeners.
- **Text Accessibility**: Dynamic CSS variable scaling supporting 18px and 22px body text across the entire interface.

### What is Simplified (Prototype Scope)
- **Simulated Incoming Calls**: The incoming call UI simulates an Android/iOS incoming call within the browser window rather than triggering native telephony or GSM rings.
- **Fictional Agencies**: All scam scenarios use fictitious government departments rather than real agency names to prevent impersonation hazards.
- **Synthesized Audio Guidance**: Speech guidance uses browser Web Speech synthesis and HTML5 audio fallbacks rather than a dedicated high-bandwidth carrier audio stream.
- **Supabase Cloud Sync**: Configured for lightweight testing with anonymous authentication tokens; production deployments can connect directly to private enterprise or municipal alert dispatch systems.

---

## Testing & Verification

The test suite covers drill engine mechanics, readiness calculations, leak-proof privacy audits, outbox queuing, and pilot logging:

```bash
# Run all unit tests
npm test

# Run build verification
npm run build
```

**Test Coverage Summary:**
- `src/engine/engine.test.ts`: Branching choices, pressure meter bands, tactic assignment, safe outcomes (35 tests).
- `src/engine/readiness.test.ts`: Readiness bands, weekly streaks, booster due checks (12 tests).
- `src/db/privacy.test.ts`: Leak audits, payload filtering, forbidden word detection (4 tests).
- `src/db/outbox.test.ts`: Outbox queueing, pending states, offline payload isolation (3 tests).
- `src/db/pilot.test.ts`: Observer data storage in Dexie, CSV sanitization, force-offline controls (3 tests).
- **Total: 57 passing tests**.

---

## License & Credits
Built for family safety and elder dignity.
Protected under the MIT License.
