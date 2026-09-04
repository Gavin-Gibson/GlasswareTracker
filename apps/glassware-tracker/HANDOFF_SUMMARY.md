# Glassware Tracker Project Handoff Summary

## 1. Project Overview & Architecture
* **Live Production URL**: [https://gavins-glassware-tracker.vercel.app](https://gavins-glassware-tracker.vercel.app)
* **GitHub Repository**: [https://github.com/Gavin-Gibson/GlasswareTracker.git](https://github.com/Gavin-Gibson/GlasswareTracker.git)
* **Codebase Directory**: `/Users/gaving/Ai Stuff/open-design/apps/glassware-tracker`
* **Tech Stack**: React 18, TypeScript, Vite, Supabase Backend.
* **Supabase Configuration**:
  * URL: `https://yvtciknrhytkwcvjtojf.supabase.co`
  * Publishable Key: `sb_publishable_Td0srhv2Lgs49Q_DQ9wfog_JHmgHqT9`
  * Note on Tournaments Table: The circuit identifier column is uppercase `Circuit`.

---

## 2. Recent Updates & Capabilities

### 🍁 CRS Majors (Canadian Roundnet Series) Glassware Inclusion
* **Major Eligibility**: Configured CRS Majors to officially award glassware for top 3 finishes (Pitcher / Tankard / Glass).
* **Indexed Events**:
  1. `[2023-06-24]` **Edmonton Major** (*Open Division*)
  2. `[2025-06-14]` **Rive-Nord (Circuit Québécois #2 + CRS Major)** (*5.0 - Premier* & *4.0 - Féminin Avancé*)
  3. `[2025-07-12]` **CRS Vancouver MAJOR** (*Premier 5.0+* & *Women's Advanced 4.0+*)
  4. `[2025-07-26]` **CRS Mississauga Major - River Cup 7.0** (*Premier*, *Women's Advanced*, & *Mixed Advanced*)
  5. `[2025-08-09]` **Québec (Circuit Québécois #4 + CRS Major)** (*5.0 - Premier* & *5.0-4.5 - Mixte Élite*)
  6. `[2026-07-25]` **North American Tour Series - Vancouver Sectional** (*5.0 Open Premier/Bronze+* & *4.5 Women's Advanced*)
* **UI & Circuit Tab**: Added **`🍁 CRS Majors`** filter tab with dedicated warm red badge styling.

### 🚫 European Tournaments (ETS) Exclusion
* **Non-Glassware Rule**: Enforced that European tournaments (ETS stops in Bern, Leuven, Barcelona, Vienna, Bologna, Helsinki, Lyon, Bucharest, Basel, and European tour stops like STS 2022 - Paris & ETS Prague) **do not award glassware**.
* **Database & Code Sync**:
  * Set `awards_glassware: false` and `glassware_awarded: false` in Supabase across all European tournament divisions.
  * Added `ETS` and European location guards to `nonGlasswareCircuits` in `api.ts`.
  * Removed the `ETS Europe` circuit tab from glassware series filters.

### 🍺 Will Picone Career Hardware & STS Co-ed/Mixed Backfill
* **Comprehensive Update**: Added missing STS Major and Tour Stop Co-ed/Mixed glassware divisions (Richmond Major 2023 Mixed, San Diego Challenger 2023 Mixed, STS 2022 Atlanta & Raleigh Coed, Chicago Major 2024 Mixed, and Columbus Major 2023).
* **Verified Totals**:
  * **15 Pitchers (1st Place)**
  * **7 Tankards (2nd Place)**
  * **6 Glasses / Horns (3rd Place)**
  * **28 Total Career Hardware Pieces**

### ⏱️ Loading Screen & Trophy Cabinet UX Polish
* **Stats Flash Fix**: Wrapped KPI summary stats in `{!loadingDB && ...}` in `App.tsx` so users no longer see an initial flash of `0 players 0 glassware` while database records are loading.
* **Chronological Sorting**: Player and Team trophy cabinets display the most recent trophies at the top by default (`sortOrder === 'desc'`), with an interactive sort toggle available.

---

## 3. Core Features & Historical Data Integrations

### 🎒 Sherpa Score System (`🎒`)
* **Core Mentorship Rule**: When a player wins their **first career glassware award in a division category** (Men's, Women's, or Mixed), their veteran partner who had **already won prior glassware in that category** earns **+1 Sherpa Point** (`🎒`).
* **Elite Veteran Sherpa Rule**: Athletes who attained Spikeball Elite status in a prior year automatically qualify as experienced veteran Sherpas when guiding rookie partners to their first glassware podium.
* **Exclusions**: Squad format matches (6–8 player rosters) are strictly excluded; only 2-player doubles partnerships qualify.
* **Player Trophy Cabinet Integration**: Left sidebar contains the dedicated **🎒 Sherpa Mentorships Card** with a scrollable breakdown of rookie partners guided.

### 🏆 Complete Historical Glassware Datasets
1. **Chico Spikes 2010s Archive (2013–2015)**:
   * 27 historical tournaments indexed and seeded with confirmed glassware placement awards across the 2013, 2014, and 2015 seasons.
2. **'Include Pre-2020?' Toggle**:
   * **Unchecked by Default (`includePre2020: false`)**: Modern post-COVID era (**2020–2026**) with clean #1 serial baseline.
   * **Checked (`includePre2020: true`)**: Activates full historical pre-COVID archive (**2013–2026**).
3. **National Circuits & Regionals**:
   * **USAR Regionals (2024–2025)**: West, East, South, Midwest, Southeast Regionals.
   * **Nationals (2014–2025)**: Spikeball Tour Series Championships & USAR Nationals. Restricted 2025 Nationals to top 6.0 Pro tiers.
4. **Spikeball Elite Ingestion (`src/elite.ts`, `src/spikeball_elite.json`)**:
   * 10 full years of official Spikeball Elite teams & players (**2014–2024**).
   * Fuzzy name alias mapping for historical spelling variants.
   * Dedicated `⭐ Spikeball Elite` filter and badges across player cards, team cards, and leaderboards.

---

## 4. Key Source Files

* [`apps/glassware-tracker/src/App.tsx`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/App.tsx): Main frontend application containing Hall of Fame, Timeline, Database Explorer, Team Database, Player & Team Modals, Circuit Tabs, and Loading screen handlers.
* [`apps/glassware-tracker/src/api.ts`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/api.ts): Supabase API client, circuit classification (`getTournamentCircuit`), glassware eligibility rules, trophy categorization, and gender inference.
* [`apps/glassware-tracker/src/elite.ts`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/elite.ts): Spikeball Elite dataset and query utilities (`isElitePlayer`, `isEliteVeteranAtDate`, `getTeamEliteInfo`).
* [`apps/glassware-tracker/src/spikeball_elite.json`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/spikeball_elite.json): JSON database of all official Spikeball Elite rosters (2014–2024).
* [`apps/glassware-tracker/src/index.css`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/index.css): Design system, responsive grid layouts, animations, and dark glassmorphic styling.

---

## 5. Current Status
* **Build**: Passing with 0 errors (`pnpm --filter glassware-tracker build`).
* **Git Status**: Clean, synced with `origin/main` on GitHub.
* **Production Deployment**: Live on Vercel at [https://gavins-glassware-tracker.vercel.app](https://gavins-glassware-tracker.vercel.app).
