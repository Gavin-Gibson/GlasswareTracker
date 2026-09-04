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

### 🍺 STS Mixed & Co-ed Glassware Comprehensive Backfill (2022–2024)
* **Comprehensive Update**: Enabled glassware across all 19 official North American STS Challenger and Tour Stop Mixed / Co-ed divisions (1st: Pitcher, 2nd: Tankard, 3rd: Glass/Horn).
* **Indexed Events Backfilled**:
  1. `[2023-05-27]` **Atlanta Slam 2023** (*Mixed*)
  2. `[2023-07-01]` **The Portland Open 2023** (*Mixed Advanced 4.0+*)
  3. `[2023-07-08]` **Long Island Classic 2023** (*Mixed / Co-ED Advanced 4.0+*)
  4. `[2023-07-08]` **Windy City Classic 2023** (*Mixed Advanced 4.0+*)
  5. `[2023-07-15]` **Nashville Cup 2023** (*Mixed*)
  6. `[2023-07-29]` **River Cup 2023** (*Mixed Advanced 4.0+*)
  7. `[2023-08-26]` **BC Open Vancouver 2023** (*Mixed Advanced 4.0+*)
  8. `[2024-04-13]` **Spikeball Challenger & USAR Southeast Regionals** (*Mixed 4.5+*)
  9. `[2024-04-20]` **AZR Southwest Showcase 2024** (*Coed 4.5+ Expert*)
  10. `[2024-05-04]` **The Los Angeles Grand Slam 2024** (*Mixed 4.0+*)
  11. `[2024-05-11]` **Oceanside Grand Slam #2 2024** (*4.0 Mixed*)
  12. `[2024-05-25]` **Raleigh STS Challenger 2024** (*Mixed Advanced*)
  13. `[2024-06-01]` **Atlanta Slam 2024** (*Mixed 4.0*)
  14. `[2024-06-23]` **Minneapolis Challenger 2024** (*Sunday - Mixed*)
  15. `[2024-07-20]` **The BC Open - Vancouver Challenger 2024** (*Mixed Advanced 4.0+*)
  16. `[2024-07-27]` **STS Challenger: Seattle Slam 2024** (*Coed Advanced Sunday*)
  17. `[2024-07-27]` **STS - Mississauga - River Cup 2024** (*Mixed Advanced 4.0+*)
  18. `[2024-08-10]` **ERS Boston 2024 - A Spikeball Challenger** (*Mixed Advanced 4.0+ Sunday*)
  19. `[2024-08-10]` **Cowtown Showdown 2024** (*Co-ed Advanced 4.0+*)
* **Updated Mixed Pitcher Leaders**:
  * **Olivia Jenki**: 8 Mixed Pitchers (24 Career Pitchers, 31 Total Pieces)
  * **Will Picone**: 7 Mixed Pitchers (15 Career Pitchers, 28 Total Pieces)
  * **Kieran Rose**: 6 Mixed Pitchers (16 Career Pitchers, 35 Total Pieces)
  * **Karah Hui**: 6 Mixed Pitchers (23 Career Pitchers, 49 Total Pieces)
  * **Katie Pierson**: 6 Mixed Pitchers (21 Career Pitchers, 45 Total Pieces)
  * **Ali Jenki**: 5 Mixed Pitchers (18 Career Pitchers, 33 Total Pieces)
  * **Connor Nelson**: 4 Mixed Pitchers (19 Career Pitchers, 31 Total Pieces)
  * **Rahul Murthy**: 4 Mixed Pitchers (13 Career Pitchers, 30 Total Pieces)

### 🇺🇸🇨🇦 USA vs Canada Championship Classification & Glassware
* **Circuit Update**: Reclassified *USA vs Canada Championship* (2025-11-08) from `NATIONALS` to `USAR`.
* **Division Glassware**:
  * **`Open 5.0+`**: Confirmed glassware awarded (1st Pitcher: Connor Nelson & Tyler Fernandez, 2nd Tankard: Paq Clifford & Kieran Rose, 3rd Glass: Emerson Dean & Jé Gagnon, Maxime Prince & Guillaume Bilodeau).
  * **`Individuals Tournament 5.0 [Sunday]`**: Glassware awards disabled per tournament format rules.

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

### 🏆 2018 & 2019 STS Seasons Ingestion (tournaments.spikeball.com)
* **Official Season Scrape**: Ingested all official Spikeball Tour Series (STS) Tour Stops, Grand Slams, and Nationals from `tournaments.spikeball.com/pages/results` across **2018 (24 tournaments)** and **2019 (25 tournaments)**.
* **Database Growth**:
  * Added **49 new tournament records** (`era: 'Modern'`, `Circuit: 'STS'` / `'NATIONALS'`).
  * Created **407 new player records** in Supabase.
  * Populated all official division podiums with top 3 placements (`Pitcher`, `Tankard`, `Shot Glass / Horn`).
  * Database now totals **359 tournaments**, **1,261 divisions**, and **1,093 total glassware placements** (**1,059 in the 2018–2026 kept records era**).

### ⏳ Kept Records Era Baseline (2018–2026) & 'Include Pre-2018?' Toggle
* **Kept Records Standard**: Established **2018–2026** as the official standard kept records era.
* **Toggle Refactor**: Replaced `includePre2020` with **`Include Pre-2018?`**:
  * **Unchecked by Default (`includePre2018: false`)**: Active baseline covers all official STS Tour Stops, Majors, Grand Slams, Regionals, and Nationals from **2018–2026**.
  * **Checked (`includePre2018: true`)**: Includes the historical pre-kept records archive (**2013–2017**, including Chico Spikes 2013–2015).

---

## 3. Core Features & Historical Data Integrations

### 🎒 Sherpa Score System (`🎒`)
* **Core Mentorship Rule**: When a player wins their **first career glassware award in a division category** (Men's, Women's, or Mixed), their veteran partner who had **already won prior glassware in that category** earns **+1 Sherpa Point** (`🎒`).
* **Elite Veteran Sherpa Rule**: Athletes who attained Spikeball Elite status in a prior year automatically qualify as experienced veteran Sherpas when guiding rookie partners to their first glassware podium.
* **Exclusions**: Squad format matches (6–8 player rosters) are strictly excluded; only 2-player doubles partnerships qualify.
* **Player Trophy Cabinet Integration**: Left sidebar contains the dedicated **🎒 Sherpa Mentorships Card** with a scrollable breakdown of rookie partners guided.

### 🏆 Complete Historical Glassware Datasets
1. **2018–2026 Kept Records Era**:
   * Complete tournament coverage across all official Spikeball Tour Series, USAR Regionals, Canadian Roundnet Series Majors, and National Championships.
2. **Chico Spikes 2010s Archive (2013–2015)**:
   * 27 historical tournaments indexed and seeded with confirmed glassware placement awards across the 2013, 2014, and 2015 seasons, accessible via the `Include Pre-2018?` toggle.
3. **National Circuits & Regionals**:
   * **USAR Regionals (2024–2025)**: West, East, South, Midwest, Southeast Regionals.
   * **Nationals (2014–2025)**: Spikeball Tour Series Championships & USAR Nationals.
4. **Spikeball Elite Ingestion (`src/elite.ts`, `src/spikeball_elite.json`)**:
   * 10 full years of official Spikeball Elite teams & players (**2014–2024**).
   * Fuzzy name alias mapping for historical spelling variants.
   * Dedicated `⭐ Spikeball Elite` filter and badges across player cards, team cards, and leaderboards.

---

## 4. Key Source Files

* [`apps/glassware-tracker/src/App.tsx`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/App.tsx): Main frontend application containing Hall of Fame, Timeline, Database Explorer, Team Database, Player & Team Modals, Circuit Tabs, `Include Pre-2018?` toggle, and Loading screen handlers.
* [`apps/glassware-tracker/src/api.ts`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/api.ts): Supabase API client, circuit classification (`getTournamentCircuit`), glassware eligibility rules, trophy categorization, and gender inference.
* [`apps/glassware-tracker/src/elite.ts`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/elite.ts): Spikeball Elite dataset and query utilities (`isElitePlayer`, `isEliteVeteranAtDate`, `getTeamEliteInfo`).
* [`apps/glassware-tracker/src/spikeball_elite.json`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/spikeball_elite.json): JSON database of all official Spikeball Elite rosters (2014–2024).
* [`apps/glassware-tracker/src/index.css`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/index.css): Design system, responsive grid layouts, animations, and dark glassmorphic styling.

---

## 5. Current Status
* **Build**: Passing with 0 errors (`pnpm --filter glassware-tracker build`).
* **Git Status**: Clean, synced with `origin/main` on GitHub.
* **Production Deployment**: Live on Vercel at [https://gavins-glassware-tracker.vercel.app](https://gavins-glassware-tracker.vercel.app).
