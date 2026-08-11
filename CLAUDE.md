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
    usePickEm.ts                    # Pick-em current-slot week + leaderboard; optimistic submitPick
    usePickEmDay.ts                 # Whole-day picks: /api/pickem/day + bulk /api/pickem/picks. PICKING IS THE SUBMISSION — no submit button; each pick POSTs immediately (a pick made during an in-flight save rides the next one). Staged picks live in a Map keyed "week:gameIndex" so a refetch cannot wipe one, and a CLEAN save deliberately does NOT refetch (only a skip does)
    useModifierSchedule.ts          # /api/fantasy/modifier-schedule — day's modifier slate (active/next)
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

## The Shell (`Components/Shell/`) — desktop
The three redesigned pages (front page, game board, standings) live inside `AppShell`: full-width `AppHeader`, fixed **196px** `AppNav`, content column. **Mobile keeps the original `Navbar` + `GameBar`** (`useIsMobile` in `App.js`) — the design handoffs are a fixed 1440px desktop layout and did not design a responsive collapse.
- `tokens.ts` — the redesign's palette. **Deliberately separate from the older `index.css` palette**: it steps backgrounds (page `#070c15` → shell `#0b1220` → panel `#0f172a` → card `#131e2f`) where the old system used one flat `#0f172a`. A component belongs to one system or the other; mixing them reads as a bug. No radii except circles, no shadows, `#94a3b8` is the floor for readable labels.
- `AppNav` badge rules (settled in review, don't "improve" them): **notification dot** only on tabs that notify — Achievements (dot + count, a queue) and your team (bare dot, a state) — plus Awards while its window is open; **plain ambient count** on Games; nothing on Prognostications/Fantasy/Cards. Filled pills on all four were rejected as too loud.
- `AppHeader` mounts the **same `UserDropdown`** exported from `Navbar.js` rather than a second account menu. `CriticalityIndicator`/`RulebookIndicator` are gone from desktop chrome — anomaly status moved to the front page rail, the active ruleset to the game board.
- Shared hover classes live in `index.css`: `.row` (list rows), `.plate` (raised, lifts on hover), `.hd` (link brightens).

## Team color as TEXT (`utils/colors.ts`)
Bar/badge FILLS use a team's raw primary. **Text does not.** `readableTeamColor(hex)` delegates to `readableOnDark`, which lifts in HSL so the hue survives (a navy club stays navy). Measured: `lightenColor` alone leaves **10 of 32 teams under 4.6:1** on the card surfaces (PHI at 4.41:1); `readableTeamColor` clears all 32 with none falling back to gray. Apply it to **both** sides of a paired figure — correcting only the favoured half of a gauge leaves the number pair mismatched.

## Routing (`App.js`)
| Route | Component | Notes |
|-------|-----------|-------|
| `/` | `Views/Front/FrontPage` | Signed-in landing: Happening now / League news / Worth watching + rail (Your team, Your numbers, The Cores) |
| `/games` | `Views/GameBoard/GameBoardPage` | Every game of the week, Large (2-up) or Small (4-up), fixed interest ranking, active-rules strip |
| `/standings` | `Views/Standings/StandingsPage` | Three views: By division / By league / Wild card race |
| `/prognostications` | `Views/Prognostications/PrognosticationsPage` | Head-to-head `MatchupCard`s + rail (your season, auto-pick, leaderboard). Picks save themselves — the bottom bar is an acknowledgement, and it only sits there when a save FAILED or the game had already kicked off. Settled games show a green check + the points, a red X, or a lock while a game is underway |
| `/dashboard` | redirect → `/` | Old landing |
| `/dashboard/legacy` | `DashboardNew` | The previous dashboard, kept for comparison |
| `/dashboard/old` | `Dashboard` | Legacy |
| `/teams` | `TeamsPage` | |
| `/team/:id` | `TeamPage` | single scrolling page, no tabs: hero band → trophy case → 5-cell facts row (ratings / coach / locker room / stadium / next up) → roster + The Bleachers → season history + schedule → `FrontOfficeBand` (gated to your own team; `/front-office` redirects here). `SectionRail` gives right-edge section nav + proximity scroll-snap. |
| `/players` `/players/:id` | `PlayersPage` / `PlayerPage` | |
| `/stats` | `Views/Stats/StatsPage` | Players / Teams, with a **TOTALS ⇄ PER GAME** switch on each. ⚠️ Only COUNTING stats divide (`statsColumns.perGameOf`) — a rate is already per something (YPC, CMP%, YPR, AIR), a maximum is not a total (LNG), a rating is a percentile, and WPA is quoted in wins; dividing any of those makes a number that looks like a stat and means nothing. Players default to TOTALS and teams to PER GAME on purpose: a team plays a fixed schedule so its totals are comparable, players miss games so the leaderboard people arrive expecting is the total. `PTS` becomes `FP/G` in per-game, which is where the fantasy average lives |
| `/cards` | `CardsPage` | |
| `/fantasy` | `FantasyPage` | roster + card equipment; status bar shows `DayModifierBadge` (active modifier chip; click → dropdown of the day's full slate by week, `useModifierSchedule`) next to the lock countdown + swaps badge |
| `/front-office` | `FrontOfficePage` | tabs: Overview / Markets / Votes |
| `/achievements` | `AchievementsPage` | Rookie Goals + Season Goals |
| `/history` | `HistoryPage` | seasons / records / user-records |
| `/about` | `AboutPage` | Guide (no auth required) |
| `/admin` | `AdminPage` | separate layout, no auth gate component |

- ⚠️ **ANOMALY GLITCH EFFECTS ARE A USER SETTING** — `hooks/useGlitchIntensity.ts`, three levels (`full` / `reduced` / `off`) stamped on `<html>` as `data-glitch`, gated in `index.css`. Added after a reader reported the animations bogging down their laptop AND being an accessibility problem. **Per DEVICE (localStorage), not per account**: the reason to turn them down is the machine in front of you and the way motion reads to you, and the same account on a phone may want them on. **Seeded from `prefers-reduced-motion`**, so someone who has already told their OS is heard without finding this control. Applied at IMPORT time (`src/index.js` imports the hook for its side effect) so the first paint already obeys it — an effect would run after it.
- ⚠️ **THE `off` GATE IS WRITTEN AS CONTAINERS + DESCENDANTS (`.anomaly-row-l1 *`), NOT AS A LIST OF INNER CLASSES.** The first version listed the `.glitch-text-*` classes and missed the `.anomaly-row-l1`/`-l2` families entirely — the row shimmer, the row breathe, the label pulse, and the descendant rules animating every `p`/`div`/`span` in a glitched row — so a reader who turned effects OFF still had the **play feed** moving, which is where they see the most of it. Reported. `reduced` had the same hole. Measured on a real play-feed row: **full 16 animating elements, reduced 4, off 0**. An audit found 81 animated selectors against 19 the gate covered; the anomaly family is 20 named keyframes and everything else (score flashes, cheer payouts, the board marquee, the awakened glow) is deliberately untouched — turning the glitch off is not turning the app off.
- ⚠️ **The `.glitch-text-*` classes carry NOTHING BUT `animation:`** — no color, no weight. So switching the animation off does not calm an anomalous player down, it makes them look like everybody else and the state stops existing on screen. Every `off` rule REPLACES the animation with a static treatment (color + a **dotted underline**, since color alone is not a marker for a reader who cannot separate those hues) taken from that animation's own resting frame. Anything new that animates an anomaly needs the same three-level treatment, or it comes back to life for the reader who switched it off.
`Stats` and `Results` views are imported in `App.js` but **not routed** (legacy). `useGameUpdates`, `LiveGameViewer`, `Cards/CardShop` are also legacy/unwired. `types/env.d.ts` still declares `REACT_APP_SUPABASE_*` — dead (auth is Clerk).

## Components (by domain)
- **Layout**: `Sidebar.tsx` (collapsible 60/200px, favorite-team avatar swap, unclaimed-rewards badge), `Navbar.js` (user menu, floobit counter → Shop, notifications; hosts ShopModal/FavoriteTeamModal), `GameBar.tsx` (ticker; scrolls at ≥12 games; hidden on dashboard), `Footer.tsx` (Discord/Feedback + version → changelog popover), `AchievementUnlockedToast.tsx`, `FloobitsReceivedToast.tsx`.
- **Dashboard / Games**: `Views/Dashboard/DashboardNew.tsx` (grid `minmax(0,960px) 380px`; right tabs Highlights/Prognosticate/Standings/Leaders; wraps `PickEmProvider`; tutorial overlay), `GameCard.tsx` (scores, momentum flame, WP bar, inline pick), `GameGridNew.tsx`, `GameModalNew.tsx` (box score / plays / stats; replay+catch-up bar; PlayReactions, RallyButton, PlayInsightsPanel), `HighlightFeed.tsx`. During the **offseason** the main body renders `Recap/OffseasonMain.tsx` (Draft Board ⇄ Season Recap toggle) instead of the bare `OffseasonPanel`.
- **Season Recap** (`Recap/SeasonRecap.tsx`, `useSeasonRecap` → `GET /api/recap`): offseason fixture, **tabbed** (Results / Stats / Fans / Transactions). Results = champion/MVP/All-Pro (links + hover via `PlayerLink`/`TeamHoverCard`, positions, star ratings, team logos) + standings by league with league-champ badges; Stats = per-category leaders; Fans = fantasy/pick-em/bracket/funding leaderboards (favorite-team logos, swept-both callout) + top showcase; Transactions = collapsible retirements/HoF/coach/roster-moves. Current season only (no archive); refetches live on offseason WS events.
- **Fantasy & Cards**: `Fantasy/FantasyRoster.tsx`, `Fantasy/FantasyLeaderboard.tsx` (season/weekly/players), `Fantasy/PlayerPicker.tsx`, `Cards/TradingCard.tsx`, `Cards/CardCollection.tsx`, `Cards/CardEquipment.tsx`, `Cards/CardPickerModal.tsx`, `Cards/CombineModal.tsx` (The Combine), `Cards/PackOpeningModal.tsx` (reveal→keep, particle bursts for prismatic/diamond), `Cards/PendingPackResumer.tsx`, `Shop/ShopModal.tsx`.
- **Pick-Em & Front Office**: `PickEm/PickEmPanel.tsx` (tabs: This Slot / All Today / Leaderboard; auto-pick modes off/favorites/underdogs/random), `PickEm/PickEmDay.tsx` (whole-day slate by week — per-slot "pick favorites" + batched submit; no modifiers, those live on the fantasy page), `PickEm/PickRow.tsx` (shared single-game row, extracted to break the Panel↔Day import cycle), `FrontOffice/FrontOfficePanel.tsx` + sub-cards `FireCoachCard` / `HireCoachCard` / `CutPlayerCard` / `ResignPlayerCard`, shared `FrontOffice/VoteControls.tsx` (`VoteButton` two-tap confirm, `UndoButton`, `StanceControls`), `FrontOffice/ProbabilityMeter.tsx`, `FrontOffice/FaBallotModal.tsx`, `FrontOffice/VoteResultsBanner.tsx`; `Views/FrontOffice/FrontOfficePage.tsx` + `MarketsSection` / `RookiesSection`.
- **Stats / History**: `PlayerLeaders.tsx`, `MvpRankings.tsx`, `Views/History/HistoryPage.tsx`. `Standings.tsx` (old flat table + ELO power-rankings) is **superseded** by `Views/Standings/` and no longer routed.
- **Game board** (`Views/GameBoard/`): `GameBoardPage` + `BoardCardLarge` / `BoardCardSmall` / `boardPieces` (Crest with a dashed placeholder for ids >24, momentum flame, interest chip, split bar, swing trend) / `ranking.ts` / `ActiveRulesStrip`. ⚠️ The interest ORDER is computed once and **frozen in a ref** while the game data inside stays live — cards re-sorting under the cursor as scores land is exactly what the fixed ranking exists to prevent. The swing trend reads win probability off `game.plays` (which already carries it per play), so it is correct on load rather than only after watching the swings happen.
- **Standings** (`Views/Standings/`): `StandingsPage` + `ByDivision` / `ByLeague` / `WildCardRace` / `standingsPieces` / `standingsTypes`. Consumes the extended `/api/standings` (divisions, seed/seedKind, gamesBack, rankChange, streak, last5). ⚠️ The seeding note says what the **backend actually does**, not what the handoff said: two division winners come from different divisions and did not play the same slate, so that tie falls to LEAGUE record, not division record.
- **Front page** (`Views/Front/`): `FrontPage` + `HappeningNow` / `LeagueNews` / `WorthWatching` / `YourTeamCard` / `YourNumbers` / `CoresStatusPanel` / `frontPieces`. News comes from `GET /api/front-page/news` — templated single clauses over stored fields, one lead with four numbers. `CoresStatusPanel` is number-free by design (the band IS the information). `TopPlayers` shows **one row per stat leaderboard** (pass yds/TDs/completions, rush yds/TDs, rec yds/catches/TDs, FGs, fantasy points) — whoever currently leads each, so the board spans the whole game rather than stacking one position.
- **League news** is a PERSISTED, cumulative feed (`GET /api/front-page/news`): items are published by the backend the moment they happen and do NOT clear at the week rollover. Fixed length (`NEWS_LENGTH`), so stories fall off the bottom. It refetches on anything that PRODUCES news — `game_end`, `league_news`, `week_start` — not only the week rollover. Color is keyed on the item's **raw** category, so a publisher shipping before the color map knows about it still renders readably.
- **Onboarding / Misc**: `Auth/FavoriteTeamModal.tsx`, `Auth/BetaBlockedPage.tsx`, `Onboarding/OnboardingModal.tsx`, `WelcomeModal.tsx`, `SeasonRecapModal.tsx`, `SurveyModal.tsx`, `Notifications/NotificationBell.tsx`, `Tutorial/*` (`TutorialOverlay` spotlight via `data-tour=`), `HelpModal.tsx` (exports `HelpModal` + `HelpButton` + `GuideSection`), `HoverTooltip.tsx`, `GlitchedText.tsx`, hover cards (`PlayerHoverCard`, `CoachHoverCard`, `TeamHoverCard`), `Stars.tsx`, `TeamFormBadge.tsx`, `GameModal/PlayReactions.tsx`, `GameModal/RallyPanel.tsx`.

## services/api.ts (public REST only)
`api.teams`, `api.players` (getAll/getById/getTopByPosition), `api.season` (getCurrent/getBySeason), `api.standings` (get/getByDivision), `api.games` (getStats/getResultsByWeek/getCurrentGames), `api.stats.getLeaders`, `api.powerRankings`, `api.playoffs`, `api.highlights`, `api.champion`, `api.roster.getHistory`, `api.schedule.getByTeam`. Everything auth-protected (`/api/users/me`, `/api/currency/*`, `/api/fantasy/*`, `/api/cards/*`, `/api/packs/*`, `/api/shop/*`, `/api/pickem/*`, `/api/gm/*`, `/api/achievements/*`, contribute) uses raw `fetch` + Clerk token in the contexts/hooks above.

## Custom Window Events (`floosball:*`)
Cross-component signaling without prop drilling. Dispatch with `window.dispatchEvent(new Event('floosball:x'))`, listen in the target.

| Event | Listener | Purpose |
|-------|----------|---------|
| `show-favorite-team-picker` / `show-shop` | Navbar | open modals |
| `shop-purchase` | CardEquipment, FantasyRoster, useFantasySnapshot | refresh after buy |
| `show-highlights` / `-pickem` / `-standings` / `-leaders` | DashboardNew | switch right-panel tab |
| `show-markets` / `-overview` / `-votes` | FrontOfficePage | switch tab (`show-team-funding` is a legacy alias → markets) |
| `show-roster` / `-breakdown` | FantasyRoster | switch view |
| `expand-cards`, `flip-card`/`unflip-card`, `mock-card`/`unmock-card` | CardEquipment | tutorial card actions |
| `mock-countdown` / `unmock-countdown` | FantasyPage | tutorial lock countdown |
| `rally-fired` | RallyPanel | live rally animation sync |

Plus a non-namespaced `cards-equipped` event (dispatched by CardEquipment, heard by AuthContext + FantasyRoster) to refresh roster after equip/unequip. The AchievementsPage "action" buttons compose these: navigate to a route, then fire an `afterEvent` (tab switch) + `afterScrollTo` after ~150ms once targets mount.

## Styling
- Background `#0f172a`. Panels: **`#1e2d3d`** for toasts/elevated cards; **`#1e293b`** (slate-800) for most modal bodies/sidebar/ticker — both are in use by context.
- Borders `#2a3a4e` / `#334155`. Accents: primary `#3b82f6`, achievements/fav-team `#f59e0b`, MVP/packs `#a78bfa`, powerups `#06b6d4`, floobits `#fbbf24`. Oppose/negative `#ef4444`, positive `#22c55e`.
- Font: Tailwind class `font-pixel` → `@font-face` family **`pressStart`**, whose files are actually **Inconsolata** variants (monospace, not a pixel font despite the class name).
- **Rating gauges** are one shared pattern — see `PlayerPage.attrRow`, `PlayerHoverCard`, `TeamPage.Gauge`. Track `#334155`, `borderRadius: 2px`, `overflow: hidden`; fill same radius; height 4px (6px for a hero/overall bar, 3px for a compact sub-bar). Color bands `>= 85 → #22c55e`, `>= 72 → #f59e0b`, else `#ef4444`. **Fill width is the raw 0–100 value** — do NOT normalize to a 60–100 window: it draws an 80 as a half-full bar and empties anything under 60 (common for a non-primary defender), and the bar must agree with the number printed beside it. Layout is label left / value right on one line with the bar full-width beneath; `TeamPage`'s roster plates use an inline label-track-number variant so six players line up into readable columns.

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
