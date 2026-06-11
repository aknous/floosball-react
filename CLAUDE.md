# Floosball React Frontend

React 18 + TypeScript frontend for the Floosball football simulation. Single WebSocket feed (`/ws/season`) drives all live game/season state; REST handles everything else.

> **Keep this file current.** This is the source of truth for the frontend's architecture, provider tree, routes, conventions, and the `floosball:*` event map. Consult it before changing code, and when a change alters something documented here (a provider or route, a context or hook, the WS data flow, a styling/voice convention), update the matching section in the same change. If you find a claim here that's wrong or stale, fix it.

## Quick Start
```bash
npm start   # http://localhost:3000, connects to backend at http://localhost:8000
```
Backend repo at `../floosball/` — `python run_api.py --fresh --timing=fast`.

## Coding Conventions
- JS/TS: standard React (camelCase vars, PascalCase components). Newer files are `.tsx`; a few legacy files are plain `.js` (`App.js`, `Navbar.js`).
- **No emojis in UI** — use SVG icons (inline SVG or `react-icons`).
- Text legibility minimums on dark backgrounds: primary `#e2e8f0`, body `#cbd5e1`, secondary `#94a3b8`. **Never** use `#475569` / `#64748b` for readable text.
- Min font size: 11px body, 10px timestamps/metadata only.
- Newer components use **inline styles** for precision (not Tailwind). Tailwind is layout/global only; Chakra is for some modals/overlays.
- Global font via Tailwind class `font-pixel`. Elements rendered outside the main app div (toasts, portals) must set `className="font-pixel"` explicitly.
- **Tooltips: always use `<HoverTooltip>`** (`Components/HoverTooltip.tsx`), never the HTML `title=` attribute. (Note: ~12 legacy `title=` usages still exist — don't add more; migrate when touching them.)

## Tech Stack (package.json)
- react / react-dom ^18.2, typescript ~5.7
- @clerk/react ^6.0.1 (auth)
- @chakra-ui/react ^2.5 + @emotion (modals/overlays), tailwindcss ^3.1 (layout)
- axios ^0.27 (public REST only — auth'd calls use raw `fetch` + Bearer), framer-motion ^10.6
- react-router-dom ^6.3, @dicebear/core+collection ^9.3 (some avatars), @headlessui/react, heroicons, react-icons ^4.12
- **Build: `react-app-rewired`** (not plain `react-scripts`). `config-overrides.js` adds the `@` → `src/` path alias and removes `ForkTsCheckerWebpackPlugin` (crashes on TS 5.7+). So **type errors don't fail `npm start`** — run `npx tsc --noEmit` to check types. (There is a standing baseline of pre-existing tsc errors in WIP areas; verify your change adds none.)

## Architecture

```
src/
  App.js                          # Root — providers, routing, lifecycle modals, admin layout
  index.js / index.css            # Entry + global CSS + @font-face
  contexts/
    AuthContext.tsx                 # Clerk → app user, fantasy roster, floobits, follow/unfollow
    SeasonWebSocketContext.tsx      # Raw /ws/season wrapper; sends identify; exposes event + drainEvents + subscribe
    FloosballContext.tsx            # Season state (thin wrapper over useSeasonUpdates)
    GamesContext.tsx                # Central game state Map<gameId, CurrentGame>; processes game WS events
    AchievementsContext.tsx         # Achievements, pending rewards, claim/defer/convert, unlock toast queue
    PickEmContext.tsx               # Pick-em (NOT global — mounted only inside DashboardNew)
    SidebarContext.tsx              # Collapsed state + persistence (localStorage 'sidebarCollapsed')
  hooks/
    useWebSocket.ts                 # Generic WS hook (auto-reconnect 3s ×5, drainEvents queue, subscribe set, ping filter)
    useSeasonUpdates.ts             # Season WS events → SeasonState (+ offseason phase transitions)
    useGameUpdates.ts               # Per-game WS event processing (legacy/standalone)
    useFantasyLivePoints.ts         # Live earned FP from GamesContext gameStats (earned = total − pointsAtLock)
    useFantasySnapshot.ts           # REST /api/fantasy/snapshot + WS leaderboard_update merge
    useGmData.ts                    # GM eligible/summary/votes/results; castVote/undoVote/submitBallot
    usePickEm.ts                    # Pick-em week + leaderboard; optimistic submitPick
    useCardProjection.ts            # Card payout projection (owned + not-yet-owned templates)
    useAppSettings.ts               # Singleton fetch of /api/app-settings (feedback/survey toggles)
    useIsMobile.ts                  # 768px breakpoint
    useCurrentGames.ts              # TYPES ONLY (CurrentGame/RallyTeamTotals/RallyEvent) — not a hook
  services/api.ts                   # Public REST client (axios, typed). Auth'd calls bypass this (fetch + getToken).
  types/                            # api.ts, websocket.ts, achievements.ts, pickem.ts, gm.ts, env.d.ts
  data/changelog.ts                 # User-facing changelog (see Changelog Convention)
  Components/ , Views/              # See Components below
```

### Provider Tree (`src/App.js`)
```
<ClerkProvider>
  <ChakraProvider>
    <AuthProvider>
      <SeasonWebSocketProvider>          // raw WS + identify
        <FloosballProvider>              // season state
          <GamesProvider>                // game Map
            <AchievementsProvider>       // achievements + unlock queue
              <SidebarProvider>
                <AuthGate />             // sign-in gate, routes, lifecycle modals
                <AchievementUnlockedToast />
                <FloobitsReceivedToast />
                <PendingPackResumer />   // re-opens pack reveal after reload
```
`PickEmProvider` is **not** here — it wraps only the DashboardNew right panel.

### Data Flow
```
WS /ws/season → useWebSocket → SeasonWebSocketContext
  ├─ GamesContext        (drainEvents): game_start/state/end/rally, week_start, legacy events
  ├─ useSeasonUpdates → FloosballContext: season/week/offseason phase
  ├─ AchievementsContext (subscribe — never coalesced): achievement_unlocked
  ├─ useFantasySnapshot: leaderboard_update, game_end, week_*, season_end
  ├─ usePickEm: week_*, game_*, pickem_results
  └─ useGmData: gm_vote_resolved, gm_fa_window_open/close
REST initial load → GamesContext.fetchGames() → GET /api/currentGames → Map<gameId, CurrentGame>
```
WS URL from `REACT_APP_WS_URL` (default `ws://localhost:8000/ws`). On (re)connect, `SeasonWebSocketContext` sends `{type:"identify", userId}` once; `useSeasonUpdates` re-fetches `/api/season` to resync. Auth'd REST uses `useAuth().getToken()` + `fetch` with `Authorization: Bearer`.

## Routing (`App.js`)
| Route | Component | Notes |
|-------|-----------|-------|
| `/` → `/dashboard` | redirect | |
| `/dashboard` | `DashboardNew` | Main view — games grid + tabbed right panel |
| `/dashboard/old` | `Dashboard` | Legacy |
| `/teams` | `TeamsPage` | |
| `/team/:id` | `TeamPage` | tabs: Overview / Funding / Schedule |
| `/players` `/players/:id` | `PlayersPage` / `PlayerPage` | |
| `/cards` | `CardsPage` | |
| `/fantasy` | `FantasyPage` | roster + card equipment |
| `/front-office` | `FrontOfficePage` | tabs: Overview / Markets / Votes |
| `/achievements` | `AchievementsPage` | Rookie Goals + Season Goals |
| `/history` | `HistoryPage` | seasons / records / user-records |
| `/about` | `AboutPage` | Guide (no auth required) |
| `/admin` | `AdminPage` | separate layout, no auth gate component |

`Stats` and `Results` views are imported in `App.js` but **not routed** (legacy). `useGameUpdates`, `LiveGameViewer`, `Cards/CardShop` are also legacy/unwired. `types/env.d.ts` still declares `REACT_APP_SUPABASE_*` — dead (auth is Clerk).

## Components (by domain)
- **Layout**: `Sidebar.tsx` (collapsible 60/200px, favorite-team avatar swap, unclaimed-rewards badge), `Navbar.js` (user menu, floobit counter → Shop, notifications; hosts ShopModal/FavoriteTeamModal), `GameBar.tsx` (ticker; scrolls at ≥12 games; hidden on dashboard), `Footer.tsx` (Discord/Feedback + version → changelog popover), `AchievementUnlockedToast.tsx`, `FloobitsReceivedToast.tsx`.
- **Dashboard / Games**: `Views/Dashboard/DashboardNew.tsx` (grid `minmax(0,960px) 380px`; right tabs Highlights/Prognosticate/Standings/Leaders; wraps `PickEmProvider`; tutorial overlay), `GameCard.tsx` (scores, momentum flame, WP bar, inline pick), `GameGridNew.tsx`, `GameModalNew.tsx` (box score / plays / stats; replay+catch-up bar; PlayReactions, RallyButton, PlayInsightsPanel), `HighlightFeed.tsx`. During the **offseason** the main body renders `Recap/OffseasonMain.tsx` (Draft Board ⇄ Season Recap toggle) instead of the bare `OffseasonPanel`.
- **Season Recap** (`Recap/SeasonRecap.tsx`, `useSeasonRecap` → `GET /api/recap?season=`): offseason fixture — results (champion/MVP/All-Pro + standings by league), stat leaders, user fantasy + pick-em leaderboards (swept-both callout), top showcase, and the transactions/announcements log (retirements, HoF, coach moves, per-team roster moves). Season picker over `seasonsAvailable` (this feature onward); refetches live on offseason WS events.
- **Fantasy & Cards**: `Fantasy/FantasyRoster.tsx`, `Fantasy/FantasyLeaderboard.tsx` (season/weekly/players), `Fantasy/PlayerPicker.tsx`, `Cards/TradingCard.tsx`, `Cards/CardCollection.tsx`, `Cards/CardEquipment.tsx`, `Cards/CardPickerModal.tsx`, `Cards/CombineModal.tsx` (The Combine), `Cards/PackOpeningModal.tsx` (reveal→keep, particle bursts for prismatic/diamond), `Cards/PendingPackResumer.tsx`, `Shop/ShopModal.tsx`.
- **Pick-Em & Front Office**: `PickEm/PickEmPanel.tsx` (auto-pick modes off/favorites/underdogs/random), `FrontOffice/FrontOfficePanel.tsx` + sub-cards `FireCoachCard` / `HireCoachCard` / `CutPlayerCard` / `ResignPlayerCard`, shared `FrontOffice/VoteControls.tsx` (`VoteButton` two-tap confirm, `UndoButton`, `StanceControls`), `FrontOffice/ProbabilityMeter.tsx`, `FrontOffice/FaBallotModal.tsx`, `FrontOffice/VoteResultsBanner.tsx`; `Views/FrontOffice/FrontOfficePage.tsx` + `MarketsSection` / `RookiesSection`.
- **Stats / History**: `Standings.tsx` (standings / power-rankings), `PlayerLeaders.tsx`, `MvpRankings.tsx`, `Views/History/HistoryPage.tsx`.
- **Onboarding / Misc**: `Auth/FavoriteTeamModal.tsx`, `Auth/BetaBlockedPage.tsx`, `Onboarding/OnboardingModal.tsx`, `WelcomeModal.tsx`, `SeasonRecapModal.tsx`, `SurveyModal.tsx`, `Notifications/NotificationBell.tsx`, `Tutorial/*` (`TutorialOverlay` spotlight via `data-tour=`), `HelpModal.tsx` (exports `HelpModal` + `HelpButton` + `GuideSection`), `HoverTooltip.tsx`, `GlitchedText.tsx`, hover cards (`PlayerHoverCard`, `CoachHoverCard`, `TeamHoverCard`), `Stars.tsx`, `TeamFormBadge.tsx`, `GameModal/PlayReactions.tsx`, `GameModal/RallyPanel.tsx`.

## services/api.ts (public REST only)
`api.teams`, `api.players` (getAll/getById/getTopByPosition), `api.season` (getCurrent/getBySeason), `api.standings` (get/getByDivision), `api.games` (getStats/getResultsByWeek/getCurrentGames), `api.stats.getLeaders`, `api.powerRankings`, `api.playoffs`, `api.highlights`, `api.champion`, `api.roster.getHistory`, `api.schedule.getByTeam`. Everything auth-protected (`/api/users/me`, `/api/currency/*`, `/api/fantasy/*`, `/api/cards/*`, `/api/packs/*`, `/api/shop/*`, `/api/pickem/*`, `/api/gm/*`, `/api/achievements/*`, contribute) uses raw `fetch` + Clerk token in the contexts/hooks above.

## Custom Window Events (`floosball:*`)
Cross-component signalling without prop drilling. Dispatch with `window.dispatchEvent(new Event('floosball:x'))`, listen in the target.

| Event | Listener | Purpose |
|-------|----------|---------|
| `show-favorite-team-picker` / `show-shop` | Navbar | open modals |
| `shop-purchase` | CardEquipment, FantasyRoster, useFantasySnapshot | refresh after buy |
| `show-highlights` / `-pickem` / `-standings` / `-leaders` | DashboardNew | switch right-panel tab |
| `show-markets` / `-overview` / `-votes` | FrontOfficePage | switch tab (`show-team-funding` is a legacy alias → markets) |
| `show-team-funding` / `-team-schedule` / `-team-overview` | TeamPage | switch tab |
| `show-roster` / `-breakdown` | FantasyRoster | switch view |
| `expand-cards`, `flip-card`/`unflip-card`, `mock-card`/`unmock-card` | CardEquipment | tutorial card actions |
| `mock-countdown` / `unmock-countdown` | FantasyPage | tutorial lock countdown |
| `rally-fired` | RallyPanel | live rally animation sync |

Plus a non-namespaced `cards-equipped` event (dispatched by CardEquipment, heard by AuthContext + FantasyRoster) to refresh roster after equip/unequip. The AchievementsPage "action" buttons compose these: navigate to a route, then fire an `afterEvent` (tab switch) + `afterScrollTo` after ~150ms once targets mount.

## Styling
- Background `#0f172a`. Panels: **`#1e2d3d`** for toasts/elevated cards; **`#1e293b`** (slate-800) for most modal bodies/sidebar/ticker — both are in use by context.
- Borders `#2a3a4e` / `#334155`. Accents: primary `#3b82f6`, achievements/fav-team `#f59e0b`, MVP/packs `#a78bfa`, powerups `#06b6d4`, floobits `#fbbf24`. Oppose/negative `#ef4444`, positive `#22c55e`.
- Font: Tailwind class `font-pixel` → `@font-face` family **`pressStart`**, whose files are actually **Inconsolata** variants (monospace, not a pixel font despite the class name).

## Card Editions UI (`Cards/TradingCard.tsx`)
`EDITION_STYLES`: base (slate, no glow), holographic (purple shimmer), prismatic (rainbow conic shimmer), diamond (cyan shimmer + 8 sparkle positions + particle burst). Classifications render as corner badges (`rookie` R, `mvp` MVP, `champion` CH, `all_pro` AP) with effect blurbs. Behavior tags on the back: Chance / Conditional / Streak. `colorizeEffectText()` tints FP green, FPx pink, Floobits gold. Sizes xs/sm/md/lg.

## Changelog Convention (`src/data/changelog.ts`)
Each item starts with a bracketed area tag `'[Tag] ...'`, rendered as a colored chip by `ChangelogLine.tsx` (`TAG_COLORS`). Allowed tags: `UI/UX`, `Simulation`, `Fantasy`, `Cards`, `Pick-em`, `Achievements`, `Front Office`, `Prospects`, `Team Funding`, `Discord`, `Guide`, `Personality`. Keep items user-facing (no endpoint names, component names, or commit hashes). Group into `New Features` / `Changes` / `Fixes`. Section header colors: New Features `#22c55e`, Changes `#f59e0b`, Fixes `#3b82f6`.

## Team Avatars
Backend SVG: `http://localhost:8000/api/teams/{id}/avatar?size=N&format=svg|png`. On Vercel, static PNGs ship at `/avatars/{id}.png` to avoid backend round-trips.

## Git Workflow
Mirrors backend (`main` ← `development` ← `hotfix/*` / `next-season` / `feature/*`; always merge, no rebase; tags `vX.Y.Z`). **`main` auto-deploys to Vercel** — pushing/promoting frontend `main` is a release. Do not push frontend to `main` without explicit instruction.

## Naming Philosophy
Mix of formal, pop-culture, and humor. No trendy internet slang. One-word names preferred; should sound good with suffixes. Pack tiers stay formal; card-effect/achievement names can be playful. **User-facing copy must not read as AI-generated: no em-dashes, no "Pure X" framing, no multi-clause hedges.** Match the punchy declarative voice of existing card taglines.
