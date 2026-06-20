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
  rating?: number | null
  stars?: number | null
  side?: 'offense' | 'defense'   // which half of the All-Pro team this slot is
  defGroup?: string | null       // S / LB / CB / DE (defense slots)
}

export interface RecapAwards {
  champion: RecapTeamRef | null
  mvp: RecapPlayerStub | null
  allPro: RecapPlayerStub[]   // combined: offense slots then defense slots
  hofInductees?: RecapPlayerStub[]   // this season's Hall of Fame class
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
  pointDiff?: number
  elo?: number | null
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
  favoriteTeam?: { teamId: number; teamAbbr: string; teamColor: string } | null
}

export interface RecapShowcaseEntry {
  rank: number
  userId: number
  username: string
  grade: string
  weeklyDividend: number
  cardCount: number
  favoriteTeam?: { teamId: number; teamAbbr: string; teamColor: string } | null
}

export interface RecapUserLeaderboards {
  fantasy: RecapUserLbEntry[]
  pickem: RecapUserLbEntry[]
  bracket: RecapUserLbEntry[]
  funding: RecapUserLbEntry[]
  showcase: RecapShowcaseEntry[]
  sweptBoth: { userId: number; username: string } | null
}

export interface SeasonRecapResponse {
  season: number
  currentSeason: number
  awards: RecapAwards
  standings: RecapLeagueStandings[]
  leagueChampions: number[]   // team IDs that won their league championship (Floos Bowl participants)
  leaders: RecapLeaderCategory[]
  transactions: RecapTransaction[]
  userLeaderboards: RecapUserLeaderboards
}
