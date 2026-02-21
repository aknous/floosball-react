// WebSocket Event Type Definitions
// Maps to backend event_models.py

// Base event type
export interface BaseWebSocketEvent {
  event: string
  timestamp: string
}

// Player statistics during a game
export interface PlayerGameStats {
  playerId: string
  playerName: string
  position: string
  team: string
  // Passing stats
  passingAttempts?: number
  passingCompletions?: number
  passingYards?: number
  passingTouchdowns?: number
  interceptions?: number
  // Rushing stats
  rushingAttempts?: number
  rushingYards?: number
  rushingTouchdowns?: number
  // Receiving stats
  receptions?: number
  receivingYards?: number
  receivingTouchdowns?: number
  targets?: number
  // Defense stats
  tackles?: number
  sacks?: number
  forcedFumbles?: number
  // Kicking stats
  fieldGoalsMade?: number
  fieldGoalsAttempted?: number
  extraPointsMade?: number
  extraPointsAttempted?: number
}

// Team statistics during a game
export interface TeamGameStats {
  teamId: string
  teamName: string
  totalYards: number
  passingYards: number
  rushingYards: number
  turnovers: number
  timeOfPossession: string
  thirdDownConversions: string  // e.g., "5/12"
  fourthDownConversions: string
  penalties: number
  penaltyYards: number
}

// Play event details
export interface PlayEvent {
  playNumber: number
  quarter: number
  timeRemaining: string
  down: number
  distance: number
  yardLine: number
  playType: 'run' | 'pass' | 'punt' | 'field_goal' | 'kickoff' | 'extra_point'
  yardsGained: number
  description: string
  isTouchdown: boolean
  isTurnover: boolean
  isSack: boolean
  offensiveTeam: string
  defensiveTeam: string
}

// Game Events

export interface PlayCompleteEvent extends BaseWebSocketEvent {
  event: 'play_complete'
  gameId: string
  play: PlayEvent
  homeScore: number
  awayScore: number
  homeWpa: number  // Win Probability Added
  awayWpa: number
  // Player stats updated by this play (if applicable)
  playerStatsUpdate?: {
    playerId: string
    playerName: string
    statType: 'passing' | 'rushing' | 'receiving' | 'defense' | 'kicking'
    yards?: number
    touchdown?: boolean
  }
}

export interface ScoreUpdateEvent extends BaseWebSocketEvent {
  event: 'score_update'
  gameId: string
  homeScore: number
  awayScore: number
  scoringPlay: string
  quarter: number
}

export interface GameStartEvent extends BaseWebSocketEvent {
  event: 'game_start'
  gameId: string
  homeTeam: string
  awayTeam: string
  week: number
}

export interface GameEndEvent extends BaseWebSocketEvent {
  event: 'game_end'
  gameId: string
  finalScore: {
    home: number
    away: number
  }
  winner: string
  homeTeam: string
  awayTeam: string
}

export interface WinProbabilityUpdateEvent extends BaseWebSocketEvent {
  event: 'win_probability_update'
  gameId: string
  homeWinProbability: number
  awayWinProbability: number
  homeWpa: number
  awayWpa: number
  quarter: number
  timeRemaining: string
}

export interface QuarterEndEvent extends BaseWebSocketEvent {
  event: 'quarter_end'
  gameId: string
  quarter: number
  homeScore: number
  awayScore: number
}

export interface TurnoverEvent extends BaseWebSocketEvent {
  event: 'turnover'
  gameId: string
  turnoverType: 'interception' | 'fumble'
  offensiveTeam: string
  defensiveTeam: string
  description: string
}

export interface PlayerStatsUpdateEvent extends BaseWebSocketEvent {
  event: 'player_stats_update'
  gameId: string
  homePlayerStats: PlayerGameStats[]
  awayPlayerStats: PlayerGameStats[]
}

export interface TeamStatsUpdateEvent extends BaseWebSocketEvent {
  event: 'team_stats_update'
  gameId: string
  homeTeamStats: TeamGameStats
  awayTeamStats: TeamGameStats
}

// Union type for all game events
export type GameWebSocketEvent =
  | PlayCompleteEvent
  | ScoreUpdateEvent
  | GameStartEvent
  | GameEndEvent
  | WinProbabilityUpdateEvent
  | QuarterEndEvent
  | TurnoverEvent
  | PlayerStatsUpdateEvent
  | TeamStatsUpdateEvent

// Season Events

export interface WeekStartEvent extends BaseWebSocketEvent {
  event: 'week_start'
  weekNumber: number
  seasonNumber: number
}

export interface WeekEndEvent extends BaseWebSocketEvent {
  event: 'week_end'
  weekNumber: number
  gamesCompleted: number
}

export interface SeasonStartEvent extends BaseWebSocketEvent {
  event: 'season_start'
  seasonNumber: number
}

export interface SeasonEndEvent extends BaseWebSocketEvent {
  event: 'season_end'
  seasonNumber: number
  champion: string
}

// Union type for all season events
export type SeasonWebSocketEvent =
  | WeekStartEvent
  | WeekEndEvent
  | SeasonStartEvent
  | SeasonEndEvent
  | GameStartEvent
  | GameEndEvent

// Standings Events

export interface StandingsUpdateEvent extends BaseWebSocketEvent {
  event: 'standings_update'
  teams: Array<{
    teamId: string
    wins: number
    losses: number
    ties: number
  }>
}

// Union type for all WebSocket events
export type WebSocketEvent = GameWebSocketEvent | SeasonWebSocketEvent | StandingsUpdateEvent
