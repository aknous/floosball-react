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

// Play insights — hidden simulation data surfaced in expandable panels
export interface PlayInsightsSituation {
  gamePressure: number
  momentum: number
  momentumTeam: string | null
  offenseAbbr: string
}

export interface PlayInsightsCoach {
  playWeights: { run: number; short: number; medium: number; long: number }
  baseWeights: { run: number; short: number; medium: number; long: number }
  coachAggr: number
  coachOffMind: number
  coachAdapt: number
  clockIQ: number
  targetSideline: boolean
  gameplan?: {
    runPassRatio: number
    gapDistribution: Record<string, number>
    aggressiveness: number
  }
  oppDefense?: {
    runStopFocus: number
    blitzFrequency: number
    aggressiveness: number
    coachDefMind: number | null
    coachAdapt: number | null
    coachAggr: number | null
  }
  isSecondHalf?: boolean
  offenseAbbr?: string
  defenseAbbr?: string
}

export interface PlayInsightsFourthDown {
  decision: 'punt' | 'fieldGoal' | 'goForIt'
  fgProbability: number
  fgThreshold: number
  inFgRange: boolean
  goForItThreshold: number
  yardsToEndzone: number
  coachAggr: number | null
}

export interface PlayInsightsDefense {
  runDefMult: number
  passDefMult: number
  passRushMult: number
}

export interface PlayInsightsTarget {
  position: string
  name: string
  openness: number
  routeQuality?: number
  reach: number
  route: string
  isSelected: boolean
}

export interface PlayInsightsRun {
  designedGap: string
  selectedGap: string
  gapQualities: Record<string, number>
  gapQualityUsed: number
  rbVision: number
  rbDiscipline: number
  runnerRating: number
  runnerPressureMod: number
  blockerRating: number
  blockerName: string | null
  blockingVsDefense: number
  effectiveRunDef: number
  offenseVsDefense: number
  stage1Yards: number
  fumbleRisk: number
  isFumble: boolean
}

export interface PlayInsightsPass {
  sackProbability: number
  sackRoll: number
  effectivePassRush: number
  effectivePassDef: number
  blockingModifier: number
  protectionDiff: number
  wasSacked?: boolean
  throwAway?: boolean
  qbVision?: number
  targets?: PlayInsightsTarget[]
  throwQuality?: number
  qbPressureMod?: number
  rcvPressureMod?: number
  rcvHands?: number
  rcvReach?: number
  rcvRouteRunning?: number
  contactProbability?: number
  secureProbability?: number
  catchProbability?: number
  intProbability?: number
  dropProbability?: number
  outcomeRoll?: number
  airYards?: number
  yac?: number
}

export interface PlayInsightsFg {
  distance: number
  baseProbability: number
  finalProbability: number
  kickerRating: number
  kickerName: string
  pressureAdj: number
  gamePressure: number
  roll: number
  isGood: boolean
  mentalScore?: number
  boostChance?: number
  neutralChance?: number
}

export interface PressureProfile {
  pressureHandling: number
  clutchFactor: number
  riseChance: number
  steadyChance: number
  crumbleChance: number
  outcome: 'rose' | 'steady' | 'crumbled'
}

export interface PlayInsightsPlayer {
  name: string
  position: string | null
  confidence: number
  determination: number
  confidenceChange: number
  determinationChange: number
  confidenceDrift?: number
  determinationDrift?: number
  pressureMod?: number
  pressureProfile?: PressureProfile
}

export interface PlayInsightsClockMgmt {
  decision: 'kneel' | 'spike' | 'timeout' | 'desperationFG'
  reason: string
  clockRemaining: number
  drainableSeconds?: number
  oppTimeouts?: number
  spikeChance?: number
  coachClockIQ?: number
  timeoutsLeft?: number
  fgProbability?: number
}

export interface PlayInsights {
  situation?: PlayInsightsSituation
  coach?: PlayInsightsCoach
  fourthDown?: PlayInsightsFourthDown
  defense?: PlayInsightsDefense
  run?: PlayInsightsRun
  pass?: PlayInsightsPass
  fg?: PlayInsightsFg
  players?: PlayInsightsPlayer[]
  clockMgmt?: PlayInsightsClockMgmt
  playCall?: 'run' | 'short' | 'medium' | 'long'
}

// Play event details
export interface PlayEvent {
  playNumber: number
  quarter: number
  timeRemaining: string
  down: number
  distance: number
  yardLine: number
  playType: string
  yardsGained: number
  description: string
  playResult: string | null
  isTouchdown: boolean
  isTurnover: boolean
  isSack: boolean
  scoreChange: boolean
  homeTeamScore: number | null
  awayTeamScore: number | null
  offensiveTeam: string
  defensiveTeam: string
  // Win probability data
  homeWinProbability?: number
  awayWinProbability?: number
  homeWpa?: number
  awayWpa?: number
  isBigPlay?: boolean
  isClutchPlay?: boolean
  isChokePlay?: boolean
  isMomentumShift?: boolean
  insights?: PlayInsights | null
}

// Game Events

export interface PlayCompleteEvent extends BaseWebSocketEvent {
  event: 'play_complete'
  gameId: number
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
  gameId: number
  homeScore: number
  awayScore: number
  scoringPlay: string
  quarter: number
}

export interface GameStartEvent extends BaseWebSocketEvent {
  event: 'game_start'
  gameId: number
  homeTeam: string
  awayTeam: string
  week: number
}

export interface GameEndEvent extends BaseWebSocketEvent {
  event: 'game_end'
  gameId: number
  finalScore: {
    home: number
    away: number
  }
  winner: string
  homeTeam: string
  awayTeam: string
  homeWinProbability: number
  awayWinProbability: number
}

export interface WinProbabilityUpdateEvent extends BaseWebSocketEvent {
  event: 'win_probability_update'
  gameId: number
  homeWinProbability: number
  awayWinProbability: number
  homeWpa: number
  awayWpa: number
  quarter: number
  timeRemaining: string
}

export interface QuarterEndEvent extends BaseWebSocketEvent {
  event: 'quarter_end'
  gameId: number
  quarter: number
  homeScore: number
  awayScore: number
}

export interface TurnoverEvent extends BaseWebSocketEvent {
  event: 'turnover'
  gameId: number
  turnoverType: 'interception' | 'fumble'
  offensiveTeam: string
  defensiveTeam: string
  description: string
}

export interface PlayerStatsUpdateEvent extends BaseWebSocketEvent {
  event: 'player_stats_update'
  gameId: number
  homePlayerStats: PlayerGameStats[]
  awayPlayerStats: PlayerGameStats[]
}

export interface TeamStatsUpdateEvent extends BaseWebSocketEvent {
  event: 'team_stats_update'
  gameId: number
  homeTeamStats: TeamGameStats
  awayTeamStats: TeamGameStats
}

export interface GameStateUpdateEvent extends BaseWebSocketEvent {
  event: 'game_state_update'
  gameId: number
  state: {
    down: number
    distance: number
    yardLine: string
    possession: string
  }
}

// Comprehensive game state event (replaces score_update, play_complete, game_state_update)
export interface GameStateEvent extends BaseWebSocketEvent {
  event: 'game_state'
  gameId: number
  status: 'Active' | 'Scheduled' | 'Final'
  homeScore: number
  awayScore: number
  quarterScores: {
    home: {
      q1: number
      q2: number
      q3: number
      q4: number
      ot: number
    }
    away: {
      q1: number
      q2: number
      q3: number
      q4: number
      ot: number
    }
  }
  possession: string | null  // Team abbreviation
  homeTeamPoss: boolean  // True if home team has possession
  awayTeamPoss: boolean  // True if away team has possession
  quarter: number
  timeRemaining: string
  down: number | null
  distance: number | null  // Yards to first down
  yardLine: string | null  // e.g., 'BAL 25'
  yardsToEndzone: number | null
  yardsToSafety: number | null
  isPossessionChange: boolean
  lastPlay: {
    playNumber: number
    quarter: number
    timeRemaining: string
    down: number
    distance: number
    yardLine: string
    playType: string
    yardsGained: number
    description: string
    playResult: string | null
    isTouchdown: boolean
    isTurnover: boolean
    isSack: boolean
    scoreChange: boolean
    homeTeamScore: number | null
    awayTeamScore: number | null
    offensiveTeam: string
    defensiveTeam: string
    homeWpa: number
    awayWpa: number
    isBigPlay: boolean
    isClutchPlay: boolean
    isChokePlay: boolean
    isMomentumShift: boolean
    insights?: PlayInsights | null
  } | null
  finalPlay?: {
    playNumber: number
    quarter: number
    timeRemaining: string
    down: number
    distance: number
    yardLine: string
    playType: string
    yardsGained: number
    description: string
    playResult: string | null
    isTouchdown: boolean
    isTurnover: boolean
    isSack: boolean
    scoreChange: boolean
    homeTeamScore: number | null
    awayTeamScore: number | null
    offensiveTeam: string
    defensiveTeam: string
    homeWpa: number
    awayWpa: number
    isBigPlay: boolean
    isClutchPlay: boolean
    isChokePlay: boolean
    isMomentumShift: boolean
    insights?: PlayInsights | null
  } | null
  homeWinProbability: number
  awayWinProbability: number
  homeWpa: number
  awayWpa: number
  momentum: number
  momentumTeam: string | null
  isHalftime: boolean
  isOvertime: boolean
  isUpsetAlert?: boolean
  homeTimeouts: number
  awayTimeouts: number
  gameStats?: GameStats
}

export interface TeamGameStats {
  passYards: number
  passComp: number
  passAtt: number
  passTds: number
  passInts: number
  rushYards: number
  rushCarries: number
  rushTds: number
  totalYards: number
  turnovers: number
  sacks: number
  firstDowns: number
  totalPlays: number
  thirdDownConv: number
  thirdDownAtt: number
  fourthDownConv: number
  fourthDownAtt: number
}

interface PlayerBase {
  id: number
  name: string
  position: string | null
  defensivePosition?: string | null
  playerRating: number
  ratingStars: number
  fantasyPoints: number
  totalFantasyPoints: number
  defense?: {
    sacks: number
    ints: number
    tackles: number
    tfl: number
    forcedFumbles: number
    passBreakups: number
  }
}

export interface GameStats {
  home: {
    team: TeamGameStats
    players: {
      qb:  (PlayerBase & { att: number; comp: number; yards: number; tds: number; ints: number; ypc: number; longest: number } | null)
      rb:  (PlayerBase & { carries: number; yards: number; tds: number; fumblesLost: number; ypc: number; longest: number } | null)
      wr1: (PlayerBase & { receptions: number; targets: number; yards: number; tds: number; ypr: number; yac: number } | null)
      wr2: (PlayerBase & { receptions: number; targets: number; yards: number; tds: number; ypr: number; yac: number } | null)
      te:  (PlayerBase & { receptions: number; targets: number; yards: number; tds: number; ypr: number; yac: number } | null)
      k:   (PlayerBase & { fgs: number; fgAtt: number; longest: number } | null)
    }
  }
  away: {
    team: TeamGameStats
    players: {
      qb:  (PlayerBase & { att: number; comp: number; yards: number; tds: number; ints: number; ypc: number; longest: number } | null)
      rb:  (PlayerBase & { carries: number; yards: number; tds: number; fumblesLost: number; ypc: number; longest: number } | null)
      wr1: (PlayerBase & { receptions: number; targets: number; yards: number; tds: number; ypr: number; yac: number } | null)
      wr2: (PlayerBase & { receptions: number; targets: number; yards: number; tds: number; ypr: number; yac: number } | null)
      te:  (PlayerBase & { receptions: number; targets: number; yards: number; tds: number; ypr: number; yac: number } | null)
      k:   (PlayerBase & { fgs: number; fgAtt: number; longest: number } | null)
    }
  }
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
  | GameStateUpdateEvent
  | GameStateEvent  // New comprehensive event

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

export interface LeagueNewsEvent extends BaseWebSocketEvent {
  event: 'league_news'
  text: string
}

export interface OffseasonStartEvent extends BaseWebSocketEvent {
  event: 'offseason_start'
  draftOrder: Array<{ name: string; abbr: string }>
}

export interface OffseasonPickEvent extends BaseWebSocketEvent {
  event: 'offseason_pick'
  teamName: string
  teamAbbr: string
  playerName: string
  position: string
  rating: number
  tier: string
}

export interface OffseasonCutEvent extends BaseWebSocketEvent {
  event: 'offseason_cut'
  teamName: string
  teamAbbr: string
  playerName: string
  position: string
  rating: number
  tier?: string
}

export interface OffseasonTeamCompleteEvent extends BaseWebSocketEvent {
  event: 'offseason_team_complete'
  teamName: string
  teamAbbr: string
}

export interface OffseasonCompleteEvent extends BaseWebSocketEvent {
  event: 'offseason_complete'
  remainingFreeAgents: number
}

// Union type for all season events
export type SeasonWebSocketEvent =
  | WeekStartEvent
  | WeekEndEvent
  | SeasonStartEvent
  | SeasonEndEvent
  | GameStartEvent
  | GameEndEvent
  | LeagueNewsEvent
  | LeaderboardUpdateEvent
  | OffseasonStartEvent
  | OffseasonPickEvent
  | OffseasonCutEvent
  | OffseasonTeamCompleteEvent
  | OffseasonCompleteEvent
  | GmVoteResolvedEvent
  | GmFaWindowOpenEvent
  | GmFaWindowCloseEvent
  | GmFaDirectivesEvent
  | PickEmResultsEvent

// Leaderboard Events

export interface LeaderboardUpdateEvent extends BaseWebSocketEvent {
  event: 'leaderboard_update'
  leaderboard: any[]
  season?: number
  week?: number
}

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

// GM Events

export interface GmVoteResolvedEvent extends BaseWebSocketEvent {
  event: 'gm_vote_resolved'
  teamId: number
  teamName: string
  voteType: string
  outcome: string
  targetPlayerName: string | null
  totalVotes: number
  threshold: number
  probability: number
  details: string | null
}

export interface GmFaWindowOpenEvent extends BaseWebSocketEvent {
  event: 'gm_fa_window_open'
  season: number
  faPool: Array<{ id: number; name: string; position: string; rating: number; tier: string }>
  durationSeconds: number
}

export interface GmFaWindowCloseEvent extends BaseWebSocketEvent {
  event: 'gm_fa_window_close'
  season: number
}

export interface GmFaDirectivePlayer {
  id: number
  name: string
  position: string
  rating: number
}

export interface GmFaDirectivesEvent extends BaseWebSocketEvent {
  event: 'gm_fa_directives'
  directives: Record<number, GmFaDirectivePlayer[]>
}

// Pick-Em Events

export interface PickEmResultsEvent extends BaseWebSocketEvent {
  event: 'pickem_results'
  season: number
  week: number
  games: Array<{ gameIndex: number; winnerId: number }>
  leaderboard: Array<{ userId: number; username: string; correct: number; total: number }>
}

// Union type for all WebSocket events
export type WebSocketEvent = GameWebSocketEvent | SeasonWebSocketEvent | StandingsUpdateEvent
