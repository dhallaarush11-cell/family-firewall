# ASSUMPTIONS.md — Family Firewall (Team Aurex)

This document details the architectural and product assumptions made during the implementation of the "Family Firewall" mobile-first PWA.

---

### 1. Target Audience & Accessibility Constraints
- **Primary Persona**: Older adults (elders/parents in India) practicing protection against "digital arrest" and high-pressure phone/video scams.
- **Cognitive & Motor Ergonomics**:
  - Minimum body font size is set to **18px** (`var(--base-font-size)`), with a **Large Text toggle (22px)** available in Settings.
  - Primary call-to-action buttons are configured with **at least 56px height** (primary buttons are 64px–72px) with generous touch padding to prevent mis-taps.
  - Visual hierarchy emphasizes **one primary action per screen/card** to eliminate cognitive overload.
  - No swipe-only navigation gestures are used; all screens have explicit back or home buttons.
- **Color Palette & Contrast**:
  - Cream background: `#FFF1CC`
  - Deep Teal primary: `#0B4F4A`
  - Terracotta accent: `#E07856`
  - Dark Brown text: `#231A14`
  - All text-to-background combinations exceed WCAG AA contrast thresholds (Deep Teal on Cream is ~7.4:1; Dark Brown on Cream is ~11.8:1).

---

### 2. Strict Privacy & Local-First IndexedDB
- **Hard Rule 2 Compliance**:
  - Safe words, trusted contacts, phone numbers, drill histories, outbox queue, and pilot logs are stored **exclusively in IndexedDB** via Dexie (`FamilyFirewallDB`).
  - **No external server, analytics, or CDN APIs** are called.
  - The "Alert Family Member" action writes to the local `outbox` and `pilotLog` tables with status `pending`. In future stages when Supabase is introduced, this outbox will sync, but currently it remains 100% on-device.

---

### 3. Fictional Entities & Deterministic Drill Engine
- **Hard Rule 1 Compliance (Zero LLM/AI)**:
  - The drill engine in `/src/engine` is a pure deterministic state machine with predefined decision trees. No LLM or generative AI is invoked anywhere in the codebase.
- **Hard Rule 3 Compliance (Fictional Organizations Only)**:
  - Scenarios use purely fictional entities (e.g., *"Central Cyber Verification Bureau"*) and simulation actors (*"Officer R. Sharma (Simulation Actor)"*).
  - No real law enforcement names, emblems, state police departments, or real phone numbers are ever referenced.
  - Every drill screen includes a prominent **"Practice call" tag** and an **always-visible Exit button**.
- **Hard Rule 4 Compliance (No "Failed" or "Wrong")**:
  - UI outcome states are strictly limited to:
    1. **"Safe"**
    2. **"Almost"**
    3. **"Let's try again"**
  - Negative phrasing like "failed", "incorrect", or "wrong" is strictly disallowed.

---

### 4. Language & Internationalization (i18n)
- **Supported Locales**:
  - `en`: English
  - `hi`: हिन्दी (Devanagari script)
  - `hing`: Hinglish (Hindi written in Roman script for easy conversational reading)
- **Hard Rule 5 Compliance**:
  - All user-facing strings are loaded from `/src/i18n/locales/*.json`.
  - Every single Hindi entry in `hi.json` contains a corresponding `_TODO_REVIEW` comment/metadata key to signal mandatory native linguist review.
  - A language switcher is reachable from **every screen** (via the header bar or inline selector).

---

### 5. Font Bundling & Zero-CDN Architecture
- **Hard Rule 6 Compliance**:
  - Both fonts (**Noto Sans Devanagari** and Latin **Outfit**) are bundled locally inside `/public/fonts/` and served via `@font-face` in `src/index.css`.
  - Zero Google Fonts or external CDN stylesheets are included in `index.html`.

---

### 6. Dexie Database Schema for Current & Future Stages
The following tables are created in `FamilyFirewallDB`:
- `profile`: `id, role, language`
- `trustedContacts`: `++id, priority, name, phone` (limited to a maximum of 3 contacts)
- `safeWord`: `id, word, hint, updatedAt`
- `drillHistory`: `++id, scenarioId, outcome, date`
- `outbox`: `++id, type, status, createdAt`
- `settings`: `key, value`
- `pilotLog`: `++id, timestamp, event`

---

### 7. Screen Scoping
As explicitly requested, only these 4 screens were built:
1. **Welcome Screen** (`/welcome`): App name, tagline, 3 language buttons, 2 role buttons ("I am the parent", "I am the family member").
2. **Elder Home** (`/elder`): Big friendly greeting, three huge buttons ("Practice a call", "I feel pressured", "Call my person"), and persistent round Pause shield button.
3. **Family Home** (`/family`): Dashboard placeholder with the exact text *"Family dashboard coming soon"*.
4. **Settings** (`/settings`): Language switcher, text-size toggle (normal/large), and Trusted Contacts manager (up to 3 contacts).
