# Floosball React Frontend

React 18 + TypeScript frontend for the Floosball football simulation.

## Quick Start
```bash
npm start   # http://localhost:3000, connects to backend at http://localhost:8000
```
Backend repo is at `../floosball/` — `python run_api.py --fresh --timing=fast`.

## Coding Conventions
- JS/TS: standard React conventions (camelCase vars, PascalCase components)
- No emojis in UI — use SVG icons instead
- Text legibility minimums on dark backgrounds:
  - Primary: `#e2e8f0`, Body: `#cbd5e1`, Secondary: `#94a3b8`
  - Never use `#475569` or `#64748b` for readable text
- Minimum font size: 11px body, 10px timestamps/metadata only
- Newer components use inline styles (not Tailwind) for precision
- Global font via Tailwind class `font-pixel`; fixed elements rendered outside the main app div (toasts, portals) need `className="font-pixel"` explicitly

## Changelog Convention
Every changelog item in `src/data/changelog.ts` must start with a bracketed area tag: `'[Tag] rest of the line...'`. The tag renders as a colored chip via `src/Components/ChangelogLine.tsx` in both the Footer panel and the Welcome-to-Season modal.

Allowed tags (add new ones to `TAG_COLORS` in `ChangelogLine.tsx` when introducing a new area):
`UI/UX`, `Simulation`, `Fantasy`, `Cards`, `Pick-em`, `Achievements`, `Front Office`, `Prospects`, `Team Funding`, `Discord`, `Guide`

Keep items user-facing: surface-level language, no technical jargon, no internal terminology (endpoint names, commit hashes, component names). Group into `New Features` / `Changes` / `Fixes` sections.

## Tech Stack
- React 18, TypeScript (newer files .tsx, some legacy .js like `App.js`, `Navbar.js`)
- Tailwind CSS + Chakra UI (Chakra for modals/overlays; Tailwind for layout)
- Clerk (authentication)
- axios (REST API) — only used in `services/api.ts` for public endpoints; auth'd calls use raw `fetch` with `Bearer` tokens
- framer-motion (animations)
- react-app-rewired (CRA overrides)

## Architecture

```
src/
  App.js                          # Root — providers, routing, modals
  contexts/
    AuthContext.tsx                 # Clerk auth, user profile, floobits, fantasy roster
    FloosballContext.tsx            # Season state + WS connection status
    SeasonWebSocketContext.tsx      # Raw WS wrapper for /ws/season; sends identify on connect
    GamesContext.tsx                # Central game state Map<gameId, CurrentGame>
    PickEmContext.tsx               # Pick-em games, picks, results, leaderboard
    AchievementsContext.tsx         # Achievements, pending rewards, claim/defer, unlock toast queue
    SidebarContext.tsx              # Collapsed state + persistence
  hooks/
    useWebSocket.ts                 # Generic WS hook (auto-reconnect)
    useSeasonUpdates.ts             # Processes season WS events → SeasonState
    useCurrentGames.ts              # Fetches game list, refreshes on events
    useGameUpdates.ts               # Per-game WS event processing
    useFantasyLivePoints.ts         # Live FP accumulation from game_state events
    useFantasySnapshot.ts           # REST snapshot for banked FP
    useGmData.ts                    # GM voting state
    usePickEm.ts                    # Pick-em hook (underlying PickEmContext)
    useIsMobile.ts                  # Responsive breakpoint hook
  services/
    api.ts                          # Public REST API client (axios, typed). Auth'd calls use fetch directly in contexts.
  types/
    api.ts                          # REST API type definitions
    websocket.ts                    # WS event type definitions
    achievements.ts                 # Achievement, PendingReward, AchievementUnlockedEvent types
    pickem.ts                       # Pick-em types
```

### Provider Tree (src/App.js)
```
<ClerkProvider>
  <ChakraProvider>
    <AuthProvider>
      <SeasonWebSocketProvider>
        <FloosballProvider>
          <GamesProvider>
            <AchievementsProvider>
              <SidebarProvider>
                <AuthGate />             // main app + routes
                <AchievementUnlockedToast />
              </SidebarProvider>
            </AchievementsProvider>
          </GamesProvider>
        </FloosballProvider>
      </SeasonWebSocketProvider>
    </AuthProvider>
  </ChakraProvider>
</ClerkProvider>
```

### Data Flow
```
WebSocket /ws/season
  → useWebSocket → SeasonWebSocketContext (raw events + identify)
    → GamesContext (updates game Map)
    → useSeasonUpdates → FloosballContext (season state)
    → AchievementsContext (achievement_unlocked → toast queue + refetch + balance refresh)
    → PickEmContext (pickem_results → leaderboard refresh)

REST (initial load)
  → GamesContext.fetchGames() → GET /api/currentGames → Map<gameId, CurrentGame>
  → AchievementsContext (on first paint) → GET /api/achievements + /api/achievements/pending-rewards + /api/currency/balance
```

## Views
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | redirect → `/dashboard` | |
| `/dashboard` | `DashboardNew.tsx` | Main view — games grid + tabbed right panel (Highlights / Prognosticate / Standings / Leaders) |
| `/dashboard/old` | `Dashboard.tsx` | Legacy dashboard (kept for reference) |
| `/teams` | `TeamGrid` | All teams |
| `/team/:id` | `TeamPage.tsx` | Team detail — tabs: Overview, Funding, Schedule |
| `/players` | `PlayersPage.tsx` | Player listing |
| `/players/:id` | `PlayerPage.tsx` | Player detail |
| `/cards` | `CardsPage.tsx` | Card collection |
| `/fantasy` | `FantasyPage.tsx` | Fantasy roster + card equipment |
| `/achievements` | `AchievementsPage.tsx` | Rookie Goals (one-time) + Season Goals (per-season, tiered) |
| `/about` | `AboutPage.tsx` | Guide / documentation (linked from sidebar as "Guide") |
| `/admin` | `AdminPage.tsx` | Admin panel (users, allowlist, requests) |

## Key Components

### Layout
- **Sidebar.tsx** — collapsible left nav; hover-to-peek + persistent toggle; unclaimed-rewards badge on Achievements item
- **Navbar.js** — top bar with user menu, floobit counter (opens Shop), notifications; hosts `ShopModal`, `FavoriteTeamModal`, listens for `floosball:show-*` events
- **GameBar.tsx** — scrolling game ticker under navbar (hidden on dashboard)
- **Footer.tsx** — minimal footer with Discord + Feedback links + version
- **AchievementUnlockedToast.tsx** — global toast triggered by WS `achievement_unlocked`

### Dashboard / Games
- **DashboardNew.tsx** — desktop grid `gridTemplateColumns: 'minmax(0, 960px) 380px'`, gap 32px; tablet + mobile variants; exposes tab-switch via `floosball:show-pickem`/`-standings`/`-leaders`/`-highlights`
- **GameCard.tsx** — game tile (scores, teams, WP bar, possession indicator, pickable inline button)
- **GameGridNew.tsx** — grid of GameCards from GamesContext
- **GameModalNew.tsx** — full game detail (box score, plays, stats tabs)
- **HighlightFeed.tsx** — recent plays + league news

### Fantasy & Cards
- **FantasyRoster.tsx** / **FantasyLeaderboard.tsx**
- **Cards/TradingCard.tsx** — card display (supports edition gradients, classifications)
- **Cards/CardCollection.tsx** / **Cards/CardEquipment.tsx** — listen for `floosball:expand-cards`, `floosball:flip-card`, `floosball:mock-card`
- **Cards/CardShop.tsx** / **Cards/CardPickerModal.tsx** / **Cards/CombineModal.tsx** / **Cards/PackOpeningModal.tsx** — full pack reveal animation with particle burst for prismatic/diamond
- **Shop/ShopModal.tsx** — packs + powerups + featured cards; dispatches `floosball:shop-purchase`

### Pick-Em & GM
- **PickEm/PickEmPanel.tsx** — weekly picks UI
- **FrontOfficePanel.tsx** / **FrontOfficeModal.tsx** — GM voting interface

### Stats / Standings
- **Standings.tsx** / **PlayerLeaders.tsx** / **MvpRankings.tsx**

### Onboarding & Misc
- **Auth/FavoriteTeamModal.tsx** — team picker (opens on first login or on `floosball:show-favorite-team-picker`)
- **Onboarding/OnboardingModal.tsx** — first-login tour
- **WelcomeModal.tsx**, **SeasonRecapModal.tsx**, **SurveyModal.tsx** — modals for lifecycle moments
- **NotificationBell.tsx** — user notifications
- **BetaBlockedPage.tsx** — gated sign-up with request-access button
- **HelpButton.tsx** / **TeamHoverCard.tsx** — shared helpers

## Custom Window Events (`floosball:*`)
Pattern for cross-component signalling (modal opens, tab switches, scroll targets) without prop drilling:

| Event | Listener | Used for |
|-------|----------|----------|
| `floosball:show-favorite-team-picker` | Navbar | open FavoriteTeamModal |
| `floosball:show-shop` | Navbar | open ShopModal |
| `floosball:shop-purchase` | CardEquipment | refresh collection after buy |
| `floosball:show-highlights` / `-pickem` / `-standings` / `-leaders` | DashboardNew | switch right-panel tab |
| `floosball:show-team-funding` / `-schedule` / `-overview` | TeamPage | switch tab |
| `floosball:show-roster` / `-breakdown` | FantasyRoster | switch view |
| `floosball:expand-cards` | CardEquipment | expand collection list |
| `floosball:flip-card` / `-unflip-card` | CardEquipment | tutorial card flip |
| `floosball:mock-card` / `-unmock-card` | CardEquipment | tutorial card highlight |

Achievements page composes these: navigate to a route, then fire an `afterEvent` (tab switch) + `afterScrollTo` (scrollIntoView) after 150ms so targets are mounted.

## Styling
- Background: `#0f172a` (slate-900)
- Panels / cards: `#1e2d3d` (custom, slightly warmer than slate-800)
- Borders: `#2a3a4e` (panel borders), `#334155` (secondary)
- Accents: `#3b82f6` (primary), `#f59e0b` (achievements, favorite team), `#a78bfa` (packs, MVP), `#06b6d4` (powerups), `#fbbf24` (floobits)
- Font: `font-pixel` (custom from `index.css`)
- Dark theme throughout

## Card Editions
Stored values: `base`, `holographic`, `prismatic`, `diamond` (cheapest → rarest). UI surfaces these via color gradients in `TradingCard.tsx` — Diamond cards get cyan particle bursts in the pack reveal.

## API Service (`services/api.ts`)
Axios, public endpoints only. Auth-protected calls live in contexts/components using raw `fetch` + Clerk `getToken()`:
```
api.teams.getAll / getById
api.players.getAll / getById / getTopByPosition
api.season.getCurrent / getBySeason
api.standings.get
api.games.getCurrentGames / getStats
api.highlights.getRecent
api.powerRankings.get
api.playoffs.getPicture
api.champion.getCurrent / getBySeason
api.roster.getHistory
api.schedule.getByTeam
```

Auth-protected endpoints accessed directly (not through `api` export): `/api/users/me`, `/api/currency/balance`, `/api/fantasy/roster`, `/api/cards/equipped`, `/api/packs/*`, `/api/shop/*`, `/api/pickem/*`, `/api/gm/*`, `/api/achievements/*`, `/api/teams/{id}/contribute`.

## Team Avatars
Served from backend: `http://localhost:8000/api/teams/{id}/avatar?size=N`. On Vercel deploy, static PNGs are shipped at `/avatars/{id}.png` to avoid backend round-trips for the CDN.

## Achievements System
- **AchievementsPage** renders two sections: **Rookie Goals** (one-time, floobit-only, hand-holding step-by-step hints with action button) and **Season Goals** (tiered, re-earn each season)
- Section headers are collapsible (+/− toggle, persisted to `localStorage` under `achievements-section:<slug>`) with a badge pill showing `completed/total`
- **Rookie Goals hints** (frontend-only map in AchievementsPage) pair each achievement with a step-by-step list and an action button that either dispatches a `floosball:*` event or navigates to a route + optional `afterEvent`/`afterScrollTo`
- **Unclaimed rewards panel** shows pending packs/powerups with **Claim** (opens `PackOpeningModal` for pack rewards) and **Save for Next Season** (visible only when `canDefer` — late regular-season weeks, pack kind)
- Toast fires on `achievement_unlocked` WS event; queued so multiple rapid unlocks stack
- Sidebar shows an amber badge with the unclaimed-reward count

## Git Workflow
Three-tier strategy mirroring the backend:
```
main              ← production (Vercel)
└── development   ← staging / integration
     ├── hotfix/*      → merge to dev → main immediately
     ├── next-season   → accumulate between-season changes
     └── feature/*     → long-term features
```
- Always merge (no rebase)
- Tags: `vX.Y.Z` matching backend versions
- Current feature branch: `feature/achievements`

## Naming Philosophy
Mix of formal, pop-culture, and humor. No trendy internet slang. One-word names preferred. Pack tiers stay formal (Humble / Proper / Grand / Exquisite); card effects and achievement names can be playful. Should sound good with suffixes.
