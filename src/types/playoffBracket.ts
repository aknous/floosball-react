// Playoff bracket challenge — types mirroring the backend API
// (/api/playoffs/bracket/{template,me,leaderboard} + POST /api/playoffs/bracket).

export type RoundKey = 'round1' | 'round2' | 'league_championship' | 'floosbowl'

export const ROUND_ORDER: RoundKey[] = ['round1', 'round2', 'league_championship', 'floosbowl']
export const ROUND_LABEL: Record<RoundKey, string> = {
  round1: 'Round 1',
  round2: 'Round 2',
  league_championship: 'League Championship',
  floosbowl: 'Floos Bowl',
}
export const ROUND_POINTS: Record<RoundKey, number> = {
  round1: 1, round2: 2, league_championship: 4, floosbowl: 8,
}

export interface BracketSeedTeam {
  teamId: number
  seed: number
  bye: boolean
  winPct: number
  scoreDiff: number
  teamName: string
  city?: string
  abbreviation?: string
}

export type BracketPredictions = Partial<Record<RoundKey, number[]>>

export interface BracketTemplate {
  season: number
  available: boolean
  open?: boolean
  conferences?: Record<string, BracketSeedTeam[]>
  round1Matchups?: Record<string, Array<{ higherSeed: number; lowerSeed: number }>>
  roundLabels?: Record<string, string>
  myPredictions?: BracketPredictions | null
}

export interface MyBracket {
  season: number
  hasBracket: boolean
  predictions?: BracketPredictions
  points?: number
  correctCount?: number
  locked?: boolean
  perRound?: Record<string, { correct: number; predicted: number; points: number }>
  actualAdvancers?: Record<string, number[]>
}

export interface BracketLeaderRow {
  rank: number
  userId: number
  username: string
  points: number
  correctCount: number
  isMe: boolean
}
