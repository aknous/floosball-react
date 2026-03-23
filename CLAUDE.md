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
  - Primary text: `#e2e8f0`, Body: `#cbd5e1`, Secondary: `#94a3b8`
  - Never use `#475569` or `#64748b` for readable text
- Minimum font size: 11px body, 10px timestamps only
- Most newer components use inline styles (not Tailwind) for precision

## Tech Stack
- React 18, TypeScript (newer files .tsx, some legacy .js)
- Tailwind CSS + Chakra UI (Chakra for modals/overlays; Tailwind for layout)
- Clerk (authentication)
- axios (REST API)
- framer-motion (animations)
- react-app-rewired (CRA overrides)

## Architecture

```
src/
  App.js                          # Root — providers, routing
  contexts/
    FloosballContext.tsx           # Season state + WS connection status
    SeasonWebSocketContext.tsx     # Raw WS wrapper for /ws/season
    GamesContext.tsx               # Central game state Map<gameId, CurrentGame>
  hooks/
    useWebSocket.ts               # Generic WS hook (auto-reconnect)
    useSeasonUpdates.ts           # Processes season WS events → SeasonState
    useCurrentGames.ts            # Fetches game list, refreshes on events
  services/
    api.ts                        # Centralized REST API client (typed)
  types/
    api.ts                        # REST API type definitions
    websocket.ts                  # WS event type definitions
```

### Context Provider Tree
```
<ClerkProvider>
  <ChakraProvider>
    <FloosballProvider>
      <SeasonWebSocketProvider>
        <GamesProvider>
          <App />
        </GamesProvider>
      </SeasonWebSocketProvider>
    </FloosballProvider>
  </ChakraProvider>
</ClerkProvider>
```

### Data Flow
```
WebSocket /ws/season
  → useWebSocket → SeasonWebSocketContext (raw events)
    → GamesContext (updates game Map)
    → useSeasonUpdates (updates SeasonState → FloosballContext)

REST (initial load)
  → GamesContext.fetchGames() → GET /api/currentGames → Map<gameId, CurrentGame>
```

## Views
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | redirect → `/dashboard` | |
| `/dashboard` | `DashboardNew.tsx` | Main view — games grid, standings, highlights |
| `/teams` | `TeamGrid` | All teams |
| `/team/:id` | `TeamPage.tsx` | Team detail |
| `/players` | `PlayersPage.tsx` | Player listing |
| `/players/:id` | `PlayerPage.tsx` | Player detail |
| `/cards` | `CardsPage.tsx` | Card collection, equipped, shop |
| `/fantasy` | `FantasyPage.tsx` | Fantasy roster management |
| `/admin` | `AdminPage.tsx` | Admin panel (users, allowlist, requests) |
| `/about` | `AboutPage.tsx` | About page |

## Key Components
- **GameCard.tsx** — Game tile (scores, teams, WP bar, possession indicator)
- **GameGridNew.tsx** — Grid of GameCards from GamesContext
- **GameModalNew.tsx** — Full game detail (box score, plays, stats tabs)
- **TradingCard.tsx** — Card display component
- **CardCollection.tsx** / **CardEquipment.tsx** / **CardShop.tsx** — Card system UI
- **FantasyRoster.tsx** / **FantasyLeaderboard.tsx** — Fantasy UI
- **FrontOfficePanel.tsx** — GM voting interface
- **PickEmPanel.tsx** — Pick-em game UI
- **Standings.tsx** / **PlayerLeaders.tsx** / **MvpRankings.tsx** — Stats displays
- **NotificationBell.tsx** — User notifications
- **BetaBlockedPage.tsx** — Beta gate with "Request Access" button

## Styling
- Background: `#0f172a` (slate-900), Cards: `#1e293b` (slate-800)
- Borders: `#334155` (slate-700), Active: `#64748b`
- Font: `font-pixel` (custom from index.css)
- Dark theme throughout

## API Service (`services/api.ts`)
Axios-based, all calls to `REACT_APP_API_URL` (default `http://localhost:8000/api`):
```
api.teams.getAll / getById
api.players.getAll / getById / getTopByPosition
api.season.getCurrent
api.standings.get
api.games.getCurrentGames / getStats
api.highlights.getRecent
api.powerRankings.get
api.playoffs.getPicture
api.champion.getCurrent
api.roster.getHistory
api.schedule.getByTeam
```
Auth endpoints use Clerk token in `Authorization: Bearer <token>` header.

## Team Avatars
Served from backend: `http://localhost:8000/api/teams/{id}/avatar?size=N`
Referenced throughout components via this URL pattern.

## Git Workflow
- `feature/typescript-websocket-refactor` → `development` → `main`
- Always merge (no rebase)
- Tags: `vX.Y.Z` matching backend versions

## Naming Philosophy
Ridiculously formal/pompous tone. Timeless vocabulary, no trendy internet slang. One-word names preferred.
