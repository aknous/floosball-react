// Season Recap — shapes returned by GET /api/recap?season=

export interface RecapTeamRef {
  id: number
  name: string
  abbr: string
  color: string
  city?: string
}

export interface RecapPlayerStub {
  id: number
  name: string
  position?: string | null
  teamId?: number | null
  teamAbbr?: string | null
  teamColor?: string | null
  rank?: number
  value?: number
  gamesPlayed?: number
}

export interface RecapAwards {
  champion: RecapTeamRef | null
  mvp: RecapPlayerStub | null
  allPro: RecapPlayerStub[]
}

export interface RecapStandingRow {
  teamId: number
  teamName: string
  teamAbbr: string
  teamColor: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  winPct: number
}

export interface RecapLeagueStandings {
  league: string
  standings: RecapStandingRow[]
}

export interface RecapLeaderCategory {
  category: string
  label: string
  leaders: RecapPlayerStub[]
}

// Offseason transaction / announcement event.
export type RecapEventType =
  | 'rookie_pick' | 'fa_pick' | 'cut' | 'resign' | 'walked' | 'promotion'
  | 'retirement' | 'hof_induction' | 'coach_fire' | 'coach_hire'

export interface RecapTransaction {
  type: RecapEventType
  teamId: number | null
  teamAbbr: string | null
  teamName: string | null
  playerId: number | null
  playerName: string | null
  position: string | null
  rating: number | null
  tier: string | null
  detail: string | null
}

export interface RecapUserLbEntry {
  rank: number
  userId: number
  username: string
  totalPoints: number
  correct?: number
  total?: number
}

export interface RecapUserLeaderboards {
  fantasy: RecapUserLbEntry[]
  pickem: RecapUserLbEntry[]
  sweptBoth: { userId: number; username: string } | null
}

export interface RecapShowcase {
  userId: number
  username: string
  grade: string
  estimatedPayout: number
  cardCount: number
  activeSets: string[]
}

export interface SeasonRecapResponse {
  season: number
  currentSeason: number
  seasonsAvailable: number[]
  awards: RecapAwards
  standings: RecapLeagueStandings[]
  leaders: RecapLeaderCategory[]
  transactions: RecapTransaction[]
  userLeaderboards: RecapUserLeaderboards
  showcase: RecapShowcase | null
}
