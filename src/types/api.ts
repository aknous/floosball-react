// API Type Definitions
// Maps to backend FastAPI models

// Team types
export interface Team {
  id: string
  name: string
  city: string
  abbr: string
  color: string
  secondaryColor: string
  tertiaryColor: string
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
  // Stats (optional depending on context)
  passingYards?: number
  rushingYards?: number
  receivingYards?: number
  touchdowns?: number
  interceptions?: number
}

// Season types
export interface Season {
  id: string
  number: number
  currentWeek: number
  status: 'in_progress' | 'completed' | 'not_started'
}

// Game types
export interface GameStats {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  quarter: number
  timeRemaining: string
  status: 'scheduled' | 'in_progress' | 'final'
  homeWinProbability?: number
  awayWinProbability?: number
  // Player stats (for live games)
  homePlayerStats?: PlayerGameStats[]
  awayPlayerStats?: PlayerGameStats[]
  // Team stats
  homeTeamStats?: TeamGameStats
  awayTeamStats?: TeamGameStats
}

// Player game statistics (detailed)
export interface PlayerGameStats {
  playerId: string
  playerName: string
  position: string
  team: string
  // Passing
  passingAttempts?: number
  passingCompletions?: number
  passingYards?: number
  passingTouchdowns?: number
  interceptions?: number
  // Rushing
  rushingAttempts?: number
  rushingYards?: number
  rushingTouchdowns?: number
  // Receiving
  receptions?: number
  receivingYards?: number
  receivingTouchdowns?: number
  targets?: number
  // Defense
  tackles?: number
  sacks?: number
  forcedFumbles?: number
  // Kicking
  fieldGoalsMade?: number
  fieldGoalsAttempted?: number
  extraPointsMade?: number
  extraPointsAttempted?: number
}

// Team game statistics
export interface TeamGameStats {
  teamId: string
  teamName: string
  totalYards: number
  passingYards: number
  rushingYards: number
  turnovers: number
  timeOfPossession: string
  thirdDownConversions: string
  fourthDownConversions: string
  penalties: number
  penaltyYards: number
}

export interface GameResult {
  id: string
  week: number
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  winner: string
}

// Standings types
export interface StandingsEntry {
  teamId: string
  teamName: string
  wins: number
  losses: number
  ties: number
  winPercentage: number
  division: string
  conference: string
  rank: number
}

// Power Rankings
export interface PowerRanking {
  rank: number
  team: string
  rating: number
  record: string
  trend?: 'up' | 'down' | 'same'
}

// Playoff Picture
export interface PlayoffTeam {
  seed: number
  team: string
  record: string
  clinched?: boolean
}

// Highlights
export interface Highlight {
  id: string
  gameId: string
  description: string
  playNumber: number
  quarter: number
  impact: number  // Win Probability Added
}

// Champion
export interface Champion {
  season: number
  team: string
  record: string
}

// Roster History
export interface RosterEntry {
  playerId: string
  playerName: string
  position: string
  seasons: number[]
}

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
}

// Query filter types
export interface PlayerFilters {
  position?: string
  team?: string
  minRating?: number
  maxRating?: number
  status?: 'active' | 'retired' | 'free_agent' | 'hall_of_fame'
}

export interface TeamFilters {
  league?: string
  conference?: string
  division?: string
}
