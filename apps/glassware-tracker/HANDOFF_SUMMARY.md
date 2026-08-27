# Glassware Tracker Project Handoff Summary

## 1. Project Overview & Architecture
* **Live Production URL**: [https://gavins-glassware-tracker.vercel.app](https://gavins-glassware-tracker.vercel.app)
* **Codebase Directory**: `/Users/gaving/Ai Stuff/open-design/apps/glassware-tracker`
* **Tech Stack**: React 18, TypeScript, Vite, Supabase Backend.
* **Supabase Configuration**:
  * URL: `https://yvtciknrhytkwcvjtojf.supabase.co`
  * Publishable Key: `sb_publishable_Td0srhv2Lgs49Q_DQ9wfog_JHmgHqT9`
  * Note on Tournaments Table: The circuit identifier column is uppercase `Circuit`.

---

## 2. All Features & Capabilities Implemented

### 🎒 Sherpa Score System (`🎒`)
* **Core Mentorship Rule**: When a player wins their **first career glassware award in a division category** (Men's, Women's, or Mixed), their veteran doubles partner who had **already won prior glassware in that category** earns **+1 Sherpa Point** (`🎒`).
* **Squads Exclusion**: Squad format matches (6–8 player rosters) are strictly excluded from awarding Sherpa points; only standard 2-player doubles partnerships qualify.
* **Leaderboard & UI Integration**:
  * Sort by `🎒 Sherpa Score` in Hall of Fame leaderboards.
  * Podium cards display `🎒 X Sherpas`.
  * Hall of Fame table contains an emerald `🎒 Sherpas` column.
* **Player Trophy Cabinet (2-Column Modal Layout)**:
  * **Left Sidebar Column**: Houses the 2x2 Career Hardware Summary Grid (`🍺 Pitchers`, `🍻 Tankards`, `🥃 Glasses`, `🏆 Total`) and the dedicated **🎒 Sherpa Mentorships Card** with a scrollable list of rookie partners guided (`🤝 Rookie Name • Tournament • Date (Glassware Type)`).
  * **Right Column**: Dedicates 100% full vertical height to the **Chronological Trophy Chronicle ({count} Titles)**, keeping the tournament history spacious and unobstructed.

### 🏆 Complete Glassware Data Integrations
1. **Chico Spikes 2010s Historical Tournaments (2013–2015)** (`Circuit: STS / NATIONALS`):
   * All 27 tournaments from the 2016 Chico Spikes flyer have been indexed and seeded into Supabase with confirmed glassware placement awards:
     * **2013** (5 Events): Summer Spike (Coney Island), All American (Santa Barbara), Spike-a-Palooza (Nashville), The Good Life Spiked (Ventura), Frozen Chosen (Boston).
     * **2014** (9 Events): San Diego Spring Classic, West Coast Classic, West Grand Slam (Santa Monica), Midwest Grand Slam (Chicago), East Grand Slam (Coney Island), Long Beach Classic (3rd Place), Mile High Classic (Denver), West Regionals (San Diego), 2014 National Championship (Santa Monica - Belt #1 & Pitcher #13).
     * **2015** (13 Events): West Coast Warm Up, West Tour 2nd Stop (SF), West Tour 3rd Stop (Denver), West Grand Slam (Santa Monica), Southeast Tour 3rd Stop (Dallas), Southeast Grand Slam (Nashville), SummerSpike 2015 / East Grand Slam (2nd Place), National Spikeball Day (Long Beach), Midwest Tour 3rd Stop (Naperville), Midwest Grand Slam (Chicago), West Regional Warm Up, West Regionals (Santa Monica), 2015 National Championship (Nashville).
2. **'Include Pre-2020?' Checkbox Toggle**:
   * **Unchecked by Default (`includePre2020: false`)**: Displays the modern post-COVID era (**2020–2026**) with clean #1 serial baseline.
   * **Checked (`includePre2020: true`)**: Instantly includes the full historical pre-COVID 2010s archive (**2013–2026**), activating all 27 Chico Spikes tournaments, Grand Slams, and initial Nationals.
   * Conveniently located in the top sticky navigation header next to the title.
3. **2024 USAR Regional Championships** (`Circuit: USAR`):
   * **USAR West Regionals 2024** (5.0+ Men's & 4.5+ Women's)
   * **USAR East Regionals 2024** (5.0+ Open & 4.0+ Women's)
   * **USAR South Regionals 2024** (5.0+ Men's)
   * **USAR Midwest Regionals 2024** (5.0+ Men's)
   * **USAR Southeast Regionals 2024** (5.0+ Open & 4.5+ Women's)
4. **2024 U.S. Roundnet National Championship** (`Circuit: NATIONALS`):
   * **5.5 Open Bronze/Premier** and **4.5+ Women's** divisions awarded glassware.
5. **The 2022 Spikeball Tour Series Championship** (`Circuit: NATIONALS`):
   * Standardized tournament title; all 12 hardware pieces indexed across **Pro**, **Women's Advanced 4.0+**, **Coed Pro**, and **Premier 5.0+**.
6. **2023 STS Majors** (`Circuit: STS`):
   * **The Salt Lake City Major 2023** enabled on **Premier 5.0+**, **Women's Advanced 4.0+**, and **Mixed Advanced 4.0+** (9 total glassware pieces awarded).
   * **The Richmond Major 2023** and **The Philadelphia Major 2023** enabled on **Premier 5.0+** and **Women's Advanced 4.0+**.
7. **2025 USAR Nationals Division Restriction**:
   * Restricted strictly to top 6.0 Pro tiers (**6.0 Open Pro**, **6.0 Women's Pro**, and **6.0 Mixed Pro**). Lower divisions (5.0 Open Silver+, 4.0 Women's Advanced) are excluded.
8. **Championship Belt Icon (`<BeltIcon />`)**:
   * Custom Championship Belt SVG icon component featuring an authentic leather strap, side plates, and an ornate gold center medallion.

### 🔍 Database & Navigation Features
* **Dynamic Pre-2020 Statistics & Titles**: Header subtitle, counts, and badges dynamically recalculate based on whether `Include Pre-2020?` is toggled.
* **Tournament Database Advanced Sorting & Quick Filters (Zero-Lag)**:
  * **Sort By**:
    * `📅 Date: Newest First` / `📅 Date: Oldest First`
    * `🔮 Most Future Glassware Champions` (e.g. *The Championship 2023*, *2021 Nationals*, *The Richmond Major 2023*, *ETS Paris 2023*, *STS Columbus 2022*)
    * `🏆 Most Total Glassware Champions` (e.g. *The Championship 2023* [128], *2024 STS Championship* [117], *Chicago Major 2024* [113])
    * `🥂 Most Glassware Pieces Awarded`
  * **Quick Filter Badges**:
    * `🔮 High Future Champs (10+)`
    * `🏆 Major Fields (30+)`
    * `🥂 Hardware Only`
  * **Tournament Cards**: Display live pill badges (`🔮 {n} Future`, `🏆 {n} Champs`, `🥂 {n} Pieces`) with 0ms in-memory latency.
* **Filter-Aware Dynasty Bar**: Dynasty teams bar dynamically updates based on active filters.

---

### ⭐ Spikeball Elite Integration & Veteran Sherpa System
* **Spikeball Elite Ingestion & Database (`src/elite.ts`, `src/spikeball_elite.json`)**:
  * Scraped and indexed all **10 years** of official Spikeball Elite teams and players (**2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024**) across Open, Men's, and Women's divisions.
  * Ingested **100 Spikeball Elite team records** spanning over **100 unique athletes**.
  * **2024 Class Added**:
    - **Open**: *Ultra Instinct* (Gabriel Finocchi & Thomas Hamilton), *Eisenträger/Siemer* (Lukas Eisenträger & Paul Siemer), *Numb* (Paq Clifford & Kieran Rose), *J.A.R.V.I.S.* (Josh Fragiacomo & Connor Nelson).
    - **Women's**: *Nova* (Laura Kunzelmann & Inès Paysan), *Pierson/Phan* (Katheleen Phan & Katie Pierson), *Kickstart* (Sarah Allen & Karah Hui), *Thus Parabatai* (Kalin Morgan & Kayla Wu).
  * Fuzzy and alias name mapping for historical variations (e.g. `Preston Beis` $\rightarrow$ `Preston Bies`, `PJ Showalter` $\rightarrow$ `Peter Jon Showalter`, `Ashley Gingerich-Showalter` $\rightarrow$ `Ashley Showalter`, `Kayla Wu Fleming` $\rightarrow$ `Kayla Wu`, `Matthew Cole` $\rightarrow$ `Matt Cole`, `Daniel McPartland` $\rightarrow$ `Dan McPartland`, `Alli Kauffman / Alli Rogers`, `Kalin Miramontes / Kalin Morgan`, `Pac / Paq Clifford`, `Kathleen / Katheleen Phan`, `Ines / Inès Paysan`, `Lukas Eisentraeger / Lukas Eisenträger`).
* **Elite Veteran Sherpa Rule**:
  * Once an athlete earns Spikeball Elite status in year $Y$, for any tournament held in year $> Y$, they qualify as an experienced veteran Sherpa and receive Sherpa mentorship credit (`🎒`) whenever guiding a rookie partner to their 1st career glassware podium.
* **Team Database Integration**:
  * Dedicated **`⭐ Spikeball Elite ({count})`** filter option in Team Database tab.
  * **`⭐ Spikeball Elite`** badges on team cards, team table rows, and the Team Trophy Cabinet modal.
* **Hall of Fame & Player Profile Badges**:
  * **`⭐ Elite ({year})`** / **`⭐ Spikeball Elite`** badges on 1st, 2nd, 3rd place podium cards, Hall of Fame leaderboard table rows, and the Player Trophy Cabinet modal header.

---

## 3. Key Source Files
* [`apps/glassware-tracker/src/App.tsx`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/App.tsx): Main UI containing Hall of Fame, Timeline, Database Explorer, Team Database, Player Modal (2-column layout), BeltIcon component, Sherpa calculations, and Spikeball Elite badges.
* [`apps/glassware-tracker/src/elite.ts`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/elite.ts): Spikeball Elite dataset, alias normalization, and query helper functions (`isElitePlayer`, `getFirstEliteYear`, `getAllEliteYears`, `getEliteBadgeText`, `isEliteVeteranAtDate`, `getTeamEliteInfo`).
* [`apps/glassware-tracker/src/spikeball_elite.json`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/spikeball_elite.json): Clean JSON archive of all official Spikeball Elite teams, players, and years.
* [`apps/glassware-tracker/src/api.ts`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/api.ts): Supabase client, queries, tournament filters, trophy detection, and glassware winner processing.
* [`apps/glassware-tracker/src/index.css`](file:///Users/gaving/Ai%20Stuff/open-design/apps/glassware-tracker/src/index.css): Glassmorphism styles and dark-mode aesthetics.

---

## 4. Current Status
* **Build**: Passing clean with Vite & TypeScript (`pnpm --filter glassware-tracker build`).
* **Deployment**: Live on Vercel at [https://gavins-glassware-tracker.vercel.app](https://gavins-glassware-tracker.vercel.app).
* **Pending Tasks**: None pending. Ready for any new user instructions.
