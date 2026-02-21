# Floosball React Frontend - Refactoring Plan

## Executive Summary
The React frontend needs significant updates to integrate with the new refactored backend API and WebSocket system. The app uses React 18, Tailwind CSS, and has authentication via Supabase. While the UI structure is solid, it needs modernization in state management, API integration, real-time features, and **TypeScript migration for type safety**.

**Timeline**: 5-6 weeks with TypeScript migration integrated throughout.

---

## 1. Current State Analysis

### Strengths ✅
- **Modern React 18** with hooks
- **Tailwind CSS** for styling (clean, maintainable)
- **Component structure** is logical (Views, Components separation)
- **Routing** with React Router v6
- **Auth system** with Supabase
- **Responsive design** with laptop breakpoints

### Issues ❌

#### API Integration
- **Hardcoded endpoints** scattered throughout components
- **No API abstraction layer** - axios calls everywhere
- **Old API endpoints** - doesn't match new `/api/teams`, `/api/players` structure
- **Polling-based updates** - uses `setInterval` instead of WebSocket
- **No error handling** - try/catch blocks with only console.error
- **No loading states** - poor UX during data fetching

#### Code Quality
- **Prop drilling** - no centralized state management
- **Duplicate code** - getPlayers/getTeams repeated in multiple components
- **Mixed concerns** - API calls inside component files
- **Absolute imports** in some places (e.g., GameModal import with full path)
- **No TypeScript** - missing type safety (CRITICAL for WebSocket events)
- **No custom hooks** - logic not reusable
- **Large components** - Dashboard.js is 444 lines

#### WebSocket Integration
- **No WebSocket support** - critical missing feature
- **No real-time updates** - relies on polling
- **No live game tracking** - can't show plays as they happen

#### Dependencies
- **Auth0 + Supabase** - two auth systems (confusing)
- **Chakra UI + Headless UI** - two component libraries (unnecessary)
- **Old packages** - some may need updates

---

## 2. Refactoring Strategy

### Phase 1: TypeScript Setup + API Integration (CRITICAL - Week 1)

#### 1.0 TypeScript Configuration
**Install TypeScript**:
```bash
npm install --save-dev typescript @types/react @types/react-dom @types/node
npm install --save-dev @types/react-router-dom
```

**File**: `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "esnext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": "src",
    "paths": {
      "@/*": ["*"]
    }
  },
  "include": ["src"]
}
```

#### 1.1 Create Type Definitions
**File**: `src/types/api.ts`
```typescript
// Team types
export interface Team {
  id: string
  name: string
  rating: number
  wins: number
  losses: number
  ties: number
  division: string
  conference: string
  offenseRating: number
  defenseRating: number
}

// Player types
export interface Player {
  id: string
  firstName: string
  lastName: string
  position: string
  rating: number
  team: string
  age: number
  experience: number
}

export interface Season {
  id: string
  number: number
  currentWeek: number
  status: 'in_progress' | 'completed' | 'not_started'
}

export interface GameStats {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  quarter: number
  timeRemaining: string
  status: 'scheduled' | 'in_progress' | 'final'
}

// API response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
}
```

#### 1.2 Create API Service Layer with Types
**File**: `src/services/api.ts`
```typescript
import axios, { AxiosResponse } from 'axios'
import type { Team, Player, Season, GameStats } from '@/types/api'

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// Helper to extract data from axios response
const getData = <T>(response: AxiosResponse<T>): T => response.data

export const api = {
  teams: {
    getAll: (league?: string): Promise<Team[]> => 
      axios.get<Team[]>(`${API_BASE_URL}/teams`, { params: { league } }).then(getData),
    getById: (id: string): Promise<Team> => 
      axios.get<Team>(`${API_BASE_URL}/teams/${id}`).then(getData),
  },
  players: {
    getAll: (filters?: Record<string, string>): Promise<Player[]> => 
      axios.get<Player[]>(`${API_BASE_URL}/players`, { params: filters }).then(getData),
    getById: (id: string): Promise<Player> => 
      axios.get<Player>(`${API_BASE_URL}/players/${id}`).then(getData),
  },
  season: {
    getCurrent: (): Promise<Season> => 
      axios.get<Season>(`${API_BASE_URL}/season`).then(getData),
  },
  standings: {
    get: (): Promise<Team[]> => 
      axios.get<Team[]>(`${API_BASE_URL}/standings`).then(getData),
  },
  stats: {
    getLeaders: (category: string): Promise<Player[]> => 
      axios.get<Player[]>(`${API_BASE_URL}/stats/leaders`, { params: { category } }).then(getData),
  },
}
```

**Benefits**:
- Single source of truth for endpoints
- Easy to update when API changes
- Type safety if migrating to TypeScript
- Centralized error handling

#### 1.3 Create Custom Hooks for Data Fetching
**File**: `src/hooks/useTeams.ts`
```typescript
import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import type { Team } from '@/types/api'

export const useTeams = (league?: string) => {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true)
        const data = await api.teams.getAll(league)
        setTeams(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch teams'))
      } finally {
        setLoading(false)
      }
    }
    fetchTeams()
  }, [league])

  return { teams, loading, error }
}
```

**Files to create**:
- `src/hooks/useTeams.ts`
- `src/hooks/usePlayers.ts`
- `src/hooks/useSeason.ts`
- `src/hooks/useStandings.ts`

#### 1.4 Update Environment Variables
**File**: `.env`
```
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_WS_URL=ws://localhost:8000/ws
```

**File**: `src/types/env.d.ts`
```typescript
/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    REACT_APP_API_URL: string
    REACT_APP_WS_URL: string
    REACT_APP_SUPABASE_URL: string
    REACT_APP_SUPABASE_KEY: string
  }
}
```

### Phase 2: WebSocket Integration with Type Safety (Week 2)

#### 2.0 WebSocket Event Types
**File**: `src/types/websocket.ts`
```typescript
// Base event type
export interface BaseWebSocketEvent {
  event: string
  timestamp: string
}

// Play event
export interface PlayEvent {
  play_number: number
  quarter: number
  down: number
  distance: number
  yard_line: number
  play_type: 'run' | 'pass' | 'punt' | 'field_goal' | 'kickoff'
  yards_gained: number
  description: string
}

// Game events
export interface PlayCompleteEvent extends BaseWebSocketEvent {
  event: 'play_complete'
  gameId: string
  play: PlayEvent
  homeScore: number
  awayScore: number
  homeWpa: number  // Win Probability Added
  awayWpa: number
}

export interface ScoreUpdateEvent extends BaseWebSocketEvent {
  event: 'score_update'
  gameId: string
  homeScore: number
  awayScore: number
  scoringPlay: string
}

export interface GameStartEvent extends BaseWebSocketEvent {
  event: 'game_start'
  gameId: string
  homeTeam: string
  awayTeam: string
}

export interface GameEndEvent extends BaseWebSocketEvent {
  event: 'game_end'
  gameId: string
  finalScore: { home: number; away: number }
  winner: string
}

export interface WinProbabilityUpdateEvent extends BaseWebSocketEvent {
  event: 'win_probability_update'
  gameId: string
  homeWinProbability: number
  awayWinProbability: number
  homeWpa: number
  awayWpa: number
}

// Union type for all game events
export type GameWebSocketEvent = 
  | PlayCompleteEvent 
  | ScoreUpdateEvent 
  | GameStartEvent 
  | GameEndEvent
  | WinProbabilityUpdateEvent

// Season events
export interface WeekStartEvent extends BaseWebSocketEvent {
  event: 'week_start'
  weekNumber: number
}

export type SeasonWebSocketEvent = WeekStartEvent | GameStartEvent | GameEndEvent
```

#### 2.1 Create Typed WebSocket Hook
**File**: `src/hooks/useWebSocket.ts`
```typescript
import { useState, useEffect, useRef } from 'react'

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws'

export const useWebSocket = <T = any>(channel: string) => {
  const [data, setData] = useState<T | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}${channel}`)
    
    ws.onopen = () => setConnected(true)
    ws.onmessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data) as T
      setData(message)
    }
    ws.onclose = () => setConnected(false)
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnected(false)
    }
    
    wsRef.current = ws
    return () => {
      ws.close()
    }
  }, [channel])

  return { data, connected }
}
```

#### 2.2 Create Live Game Component
**File**: `src/components/LiveGame.tsx`
```typescript
import { useState, useEffect } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { GameWebSocketEvent, PlayEvent } from '@/types/websocket'

interface LiveGameProps {
  gameId: string
}

export const LiveGame: React.FC<LiveGameProps> = ({ gameId }) => {
  const { data: gameEvent, connected } = useWebSocket<GameWebSocketEvent>(`/game/${gameId}`)
  const [plays, setPlays] = useState<PlayEvent[]>([])
  const [score, setScore] = useState({ home: 0, away: 0 })

  useEffect(() => {
    if (!gameEvent) return

    switch (gameEvent.event) {
      case 'play_complete':
        setPlays(prev => [gameEvent.play, ...prev])
        setScore({ home: gameEvent.homeScore, away: gameEvent.awayScore })
        break
      case 'score_update':
        setScore({ home: gameEvent.homeScore, away: gameEvent.awayScore })
        break
      // TypeScript ensures we handle all event types
    }
  }, [gameEvent])

  if (!connected) return <div>Connecting to live game...</div>

  return (
    <div className="live-game">
      <div className="score">
        <span>Home: {score.home}</span>
        <span>Away: {score.away}</span>
      </div>
      {/* Live updating UI */}
    </div>
  )
}
```

#### 2.3 Season-Wide Updates
**File**: `src/hooks/useSeasonUpdates.ts`
```typescript
import { useState, useEffect } from 'react'
import { useWebSocket } from './useWebSocket'
import type { SeasonWebSocketEvent, GameStartEvent } from '@/types/websocket'

export const useSeasonUpdates = () => {
  const { data: seasonEvent } = useWebSocket<SeasonWebSocketEvent>('/season')
  const [currentWeek, setCurrentWeek] = useState<number | null>(null)
  const [liveGames, setLiveGames] = useState<GameStartEvent[]>([])

  useEffect(() => {
    if (!seasonEvent) return

    switch (seasonEvent.event) {
      case 'week_start':
        setCurrentWeek(seasonEvent.weekNumber)
        break
      case 'game_start':
        setLiveGames(prev => [...prev, seasonEvent])
        break
      case 'game_end':
        setLiveGames(prev => prev.filter(g => g.gameId !== seasonEvent.gameId))
        break
    }
  }, [seasonEvent])

  return { currentWeek, liveGames }
}
```

### Phase 3: State Management with Types (Week 2-3)

#### 3.1 Create Context for Global State
**File**: `src/context/FloosballContext.tsx`
```typescript
import React, { createContext, useState, useEffect, useContext } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { Season } from '@/types/api'
import type { SeasonWebSocketEvent } from '@/types/websocket'

interface FloosballContextType {
  season: Season | null
  currentWeek: number | null
  setSeason: (season: Season | null) => void
  setCurrentWeek: (week: number | null) => void
}

const FloosballContext = createContext<FloosballContextType | undefined>(undefined)

export const FloosballProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [season, setSeason] = useState<Season | null>(null)
  const [currentWeek, setCurrentWeek] = useState<number | null>(null)
  const { data: seasonUpdate } = useWebSocket<SeasonWebSocketEvent>('/season')

  // Auto-update from WebSocket
  useEffect(() => {
    if (seasonUpdate?.event === 'week_start') {
      setCurrentWeek(seasonUpdate.weekNumber)
    }
  }, [seasonUpdate])

  return (
    <FloosballContext.Provider value={{ season, currentWeek, setSeason, setCurrentWeek }}>
      {children}
    </FloosballContext.Provider>
  )
}

// Custom hook for using context
export const useFloosball = () => {
  const context = useContext(FloosballContext)
  if (context === undefined) {
    throw new Error('useFloosball must be used within a FloosballProvider')
  }
  return context
}
```

#### 3.2 Remove Polling Intervals
**Find and replace all**:
```javascript
// OLD - Polling every 60s
useEffect(() => {
  getTeams()
  const interval = setInterval(() => {
    getTeams()
  }, 60000)
  return () => clearInterval(interval)
}, [])

// NEW - WebSocket updates
const { teams } = useTeams()  // Auto-updates via WebSocket
```

### Phase 4: Component Refactoring (Week 2-3)

#### 4.1 Break Down Large Components
**Dashboard.js** (444 lines) → Split into:
- `Dashboard.js` (orchestrator)
- `TopPlayers.js`
- `PowerRankings.js`
- `PlayoffPicture.js`
- `Highlights.js`
- `Champion.js`

#### 4.2 Standardize Component Structure
```javascript
// Standard pattern for all components
function Component() {
  // 1. Hooks (custom hooks first)
  const { data, loading, error } = useCustomHook()
  
  // 2. State
  const [localState, setLocalState] = useState()
  
  // 3. Effects
  useEffect(() => {}, [])
  
  // 4. Event handlers
  const handleClick = () => {}
  
  // 5. Early returns
  if (loading) return <Loading />
  if (error) return <Error error={error} />
  
  // 6. Render
  return <div>...</div>
}
```

#### 4.3 Create Reusable UI Components
**File**: `src/components/ui/` (standardize existing)
- `LoadingSpinner.js`
- `ErrorMessage.js`
- `Card.js`
- `Table.js`
- `Badge.js` (for tier badges)

### Phase 5: Real-Time Features (Week 3-4)

#### 5.1 Live Play-by-Play Feed
```javascript
function LivePlayByPlay({ gameId }) {
  const { data: gameEvent } = useWebSocket(`/game/${gameId}`)
  const [plays, setPlays] = useState([])
  const [winProb, setWinProb] = useState({ home: 50, away: 50 })

  useEffect(() => {
    if (gameEvent?.event === 'play_complete') {
      setPlays(prev => [gameEvent.play, ...prev].slice(0, 20)) // Keep last 20
    }
    if (gameEvent?.event === 'win_probability_update') {
      setWinProb({
        home: gameEvent.homeWinProbability,
        away: gameEvent.awayWinProbability,
        homeWpa: gameEvent.homeWpa,  // Win Probability Added
        awayWpa: gameEvent.awayWpa
      })
    }
  }, [gameEvent])

  return (
    <div>
      <WinProbabilityBar home={winProb.home} away={winProb.away} />
      {plays.map(play => (
        <PlayCard 
          key={play.play_number} 
          play={play}
          wpa={/* calculate from homeWpa/awayWpa */}
        />
      ))}
    </div>
  )
}
```

#### 5.2 Live Scoreboard
```javascript
function LiveScoreboard() {
  const { liveGames } = useSeasonUpdates()
  const [games, setGames] = useState([])

  // Subscribe to each live game
  useEffect(() => {
    const gameData = liveGames.map(game => ({
      ...game,
      ws: useWebSocket(`/game/${game.gameId}`)
    }))
    setGames(gameData)
  }, [liveGames])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {games.map(game => (
        <LiveGameCard key={game.gameId} game={game} />
      ))}
    </div>
  )
}
```

#### 5.3 High-Impact Play Highlights
```javascript
function HighImpactPlays() {
  const { data: seasonEvent } = useWebSocket('/season')
  const [bigPlays, setBigPlays] = useState([])

  useEffect(() => {
    if (seasonEvent?.event === 'win_probability_update') {
      const { homeWpa, awayWpa } = seasonEvent
      
      // Only show plays with >5% win probability swing
      if (Math.abs(homeWpa) > 5 || Math.abs(awayWpa) > 5) {
        setBigPlays(prev => [seasonEvent, ...prev].slice(0, 10))
      }
    }
  }, [seasonEvent])

  return (
    <div className="bg-red-50 p-4 rounded">
      <h3 className="font-bold">⚡ High Impact Plays</h3>
      {bigPlays.map(play => (
        <div className="border-b py-2">
          <span className="font-semibold">
            {play.homeWpa > 0 ? play.homeTeam : play.awayTeam}
          </span>
          <span className="text-green-600 ml-2">
            +{Math.abs(play.homeWpa > 0 ? play.homeWpa : play.awayWpa).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}
```

### Phase 6: Cleanup & Optimization (Week 4)

#### 6.1 Dependencies Cleanup
**Remove unnecessary packages**:
```bash
npm uninstall @auth0/auth0-react  # If not using Auth0
npm uninstall @headlessui/vue     # Vue components in React app?
npm uninstall @heroicons/vue      # Same as above
```

**Consider removing one UI library**:
- Keep Headless UI + Heroicons (better with Tailwind)
- Remove Chakra UI (unless heavily used)

#### 6.2 Fix Import Issues
Replace absolute imports with relative:
```javascript
// BAD
import GameModal from '/Users/andrew/Projects/floosball-react/src/Components/GameModal'

// GOOD
import GameModal from '../../Components/GameModal'
// or with path alias in jsconfig.json:
import GameModal from '@/components/GameModal'
```

#### 6.3 Add Error Boundaries
```javascript
class ErrorBoundary extends React.Component {
  state = { hasError: false }
  
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}
```

#### 6.4 Performance Optimization
- Memoize expensive computations with `useMemo`
- Memoize callbacks with `useCallback`
- Lazy load routes with `React.lazy`
- Virtual scrolling for long player/team lists

---

## 3. File Structure (Proposed)

```
floosball-react/
├── src/
│   ├── types/               # TypeScript type definitions
│   │   ├── api.ts           # API response types
│   │   ├── websocket.ts     # WebSocket event types
│   │   └── env.d.ts         # Environment variable types
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── Error.tsx
│   │   │   └── Badge.tsx
│   │   ├── game/            # Game-specific components
│   │   │   ├── LiveGame.tsx
│   │   │   ├── GameCard.tsx
│   │   │   ├── PlayByPlay.tsx
│   │   │   ├── WinProbabilityBar.tsx
│   │   │   └── Scoreboard.tsx
│   │   ├── team/            # Team components
│   │   │   ├── TeamCard.tsx
│   │   │   ├── TeamGrid.tsx
│   │   │   └── Roster.tsx
│   │   └── player/          # Player components
│   │       ├── PlayerCard.tsx
│   │       └── PlayerStats.tsx
│   ├── hooks/               # Custom hooks
│   │   ├── useWebSocket.ts
│   │   ├── useTeams.ts
│   │   ├── usePlayers.ts
│   │   ├── useSeason.ts
│   │   └── useSeasonUpdates.ts
│   ├── services/            # API services
│   │   ├── api.ts           # REST API with types
│   │   └── websocket.ts     # WebSocket utilities
│   ├── context/             # Context providers
│   │   ├── FloosballContext.tsx
│   │   └── SessionContext.tsx
│   ├── views/               # Page components
│   │   ├── Dashboard/
│   │   │   └── Dashboard.tsx
│   │   ├── Teams/
│   │   │   └── TeamGrid.tsx
│   │   ├── Players/
│   │   ├── Games/
│   │   └── Stats/
│   ├── utils/               # Utilities
│   │   ├── formatters.ts    # Date, number formatting
│   │   └── constants.ts     # App constants
│   ├── App.tsx
│   └── index.tsx
├── tsconfig.json
└── package.json
```

---

## 4. Migration Steps (Prioritized)

### Week 1: TypeScript Setup + API Migration
1. ✅ Install TypeScript and type definitions
2. ✅ Create `tsconfig.json` configuration
3. ✅ Create type definitions in `types/api.ts`
4. ✅ Create type definitions in `types/websocket.ts`
5. ✅ Create `services/api.ts` with typed endpoints
6. ✅ Create `.env` with API_URL and WS_URL
7. ✅ Create typed hooks: `useTeams.ts`, `usePlayers.ts`, `useSeason.ts`
8. ✅ Rename key files to `.tsx` (start with smaller components)

### Week 2: WebSocket Foundation + Type Safety
9. ✅ Create `hooks/useWebSocket.ts` with generic typing
10. ✅ Create `hooks/useSeasonUpdates.ts` with event types
11. ✅ Create `context/FloosballContext.tsx` with typed context
12. ✅ Migrate `GameBar.tsx` to TypeScript with WebSocket
13. ✅ Create `LiveGame.tsx` component with types
14. ✅ Remove all `setInterval` polling

### Week 3: Component Migration + Real-Time Features
15. ✅ Migrate `Dashboard.tsx` to TypeScript
16. ✅ Migrate `TeamGrid.tsx` to TypeScript
17. ✅ Create `LivePlayByPlay.tsx` with typed events
18. ✅ Create `WinProbabilityBar.tsx` with WPA types
19. ✅ Create `LiveScoreboard.tsx` for all active games
20. ✅ Create `HighImpactPlays.tsx` feed

### Week 4-5: Complete Migration
21. ✅ Migrate all remaining Views to TypeScript
22. ✅ Migrate all remaining Components to TypeScript
23. ✅ Break down large components
24. ✅ Add loading/error states with proper types
25. ✅ Fix absolute imports with path aliases
26. ✅ Add prop-types validation where needed

### Week 6: Polish & Optimization
27. ✅ Enable strict TypeScript mode
28. ✅ Add error boundaries
29. ✅ Remove unused dependencies
30. ✅ Performance optimization (memoization, lazy loading)
31. ✅ Final TypeScript cleanup (any types, missing types)
32. ✅ Code review and testing

---

## 5. Specific Component Updates

### Dashboard.tsx
**Current issues**:
- 444 lines (too large)
- 4 separate API calls
- Polling every 60s
- No error handling
- No TypeScript

**Refactor to**:
```typescript
import React from 'react'
import { useSeason } from '@/hooks/useSeason'
import { useSeasonUpdates } from '@/hooks/useSeasonUpdates'
import { Loading } from '@/components/ui/Loading'
import type { GameStartEvent } from '@/types/websocket'

const Dashboard: React.FC = () => {
  const { season, loading, error } = useSeason()
  const { liveGames } = useSeasonUpdates()

  if (loading) return <Loading />
  if (error) return <Error error={error} />

  return (
    <div className="container mx-auto px-4">
      <LiveGamesBar games={liveGames} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopPlayers />
        <PowerRankings />
        <PlayoffPicture />
        <RecentHighlights />
      </div>
    </div>
  )
}

export default Dashboard
```

### GameBar.tsx
**Current issues**:
- Polls every 10s
- No live updates
- No TypeScript

**Refactor to**:
```typescript
import React, { useState } from 'react'
import { useSeasonUpdates } from '@/hooks/useSeasonUpdates'
import { LiveGameCard } from '@/components/game/LiveGameCard'
import { GameModal } from '@/components/GameModal'

const GameBar: React.FC = () => {
  const { liveGames } = useSeasonUpdates()
  const [selectedGame, setSelectedGame] = useState<string | null>(null)

  return (
    <div className="flex space-x-4 overflow-x-auto">
      {liveGames.map(game => (
        <LiveGameCard 
          key={game.gameId}
          game={game}
          onClick={() => setSelectedGame(game.gameId)}
        />
      ))}
      {selectedGame && (
        <GameModal 
          gameId={selectedGame} 
          onClose={() => setSelectedGame(null)} 
        />
      )}
    </div>
  )
}

export default GameBar
```

---

## 6. Testing Strategy

### Unit Tests (Jest + React Testing Library)
- Test custom hooks with `@testing-library/react-hooks`
- Test components in isolation
- Mock API calls
- Mock WebSocket connections

### Integration Tests
- Test WebSocket event handling
- Test real-time updates
- Test error scenarios

### E2E Tests (Optional - Cypress/Playwright)
- Full user flows
- Live game watching
- Navigation

---

## 7. Deployment Considerations

### Environment Variables
```
# Production
REACT_APP_API_URL=https://api.floosball.com/api
REACT_APP_WS_URL=wss://api.floosball.com/ws

# Development
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_WS_URL=ws://localhost:8000/ws
```

### Build Optimization
- Code splitting by route
- Lazy load non-critical components
- Optimize bundle size
- CDN for static assets

---

## 8. Success Metrics

### Before Refactor
- ❌ No real-time updates
- ❌ API calls scattered across 20+ files
- ❌ Polling overhead (~30 requests/minute)
- ❌ No loading/error states
- ❌ 444-line components
- ❌ No TypeScript (runtime type errors)
- ❌ Prop drilling everywhere

### After Refactor
- ✅ Real-time WebSocket updates
- ✅ Centralized API layer
- ✅ Zero polling (100% WebSocket)
- ✅ Consistent loading/error UX
- ✅ Components <200 lines
- ✅ **100% TypeScript with strict mode**
- ✅ Type-safe WebSocket events
- ✅ Better performance (memoization, lazy loading)
- ✅ Compile-time error detection
- ✅ IDE autocomplete for all API/WS events

---

## 9. Future Enhancements

### Phase 2 Features (Post-Refactor)
1. **Push Notifications** - Browser notifications for big plays
2. **Dark Mode** - Toggle light/dark theme
3. **Replay System** - Rewatch completed games
4. **Fantasy Mode** - Fantasy football integration
5. **Mobile App** - React Native (with shared TypeScript types)
6. **Progressive Web App** - Offline support, install prompt
7. **Advanced Stats** - Visualizations (D3.js, Recharts)
8. **Social Features** - Share plays, comment on games
9. **Admin Panel** - Control simulation settings
10. **GraphQL API** - Alternative to REST (with TypeScript codegen)

---

## 10. Resources Needed

### Documentation
- New API endpoint documentation (✅ Already exists in /api/README.md)
- WebSocket event types (✅ Already exists in event_models.py)
- Component library documentation

### Tools
- VS Code extensions: ES7 snippets, Tailwind IntelliSense
- React DevTools
- Redux DevTools (if adding Redux)

### Team
- 1 frontend developer (full-time, 4 weeks)
- Code review from backend team
- QA testing

---

## Conclusion

The React app has a solid foundation but needs significant refactoring to leverage the new backend API and WebSocket system. **TypeScript migration is strongly recommended as part of the core refactor** (not a future enhancement) due to the complexity of WebSocket event handling and API integration.

The migration is estimated at **5-6 weeks of focused development**. Priority should be on:

1. **TypeScript Setup + API Integration** (Week 1)
2. **WebSocket Real-Time Updates with Type Safety** (Week 2)
3. **Component Migration to TypeScript** (Week 3)
4. **Live Game Features** (Week 4-5)
5. **Polish & Optimization** (Week 6)

### Why TypeScript Matters Here:
- **Backend defines ~15 different WebSocket event types** - TypeScript prevents runtime errors
- **Complex event handling** - Type safety ensures you handle all event types
- **API migration** - Catch endpoint mismatches at compile time, not runtime
- **Better DX** - Autocomplete for all API responses and WebSocket events

The end result will be a **type-safe**, modern, real-time football simulation dashboard with live play-by-play, win probability tracking, and high-impact play detection - leveraging all the new backend capabilities with compile-time guarantees.
