// GM Mode ("The Front Office") Type Definitions
// Maps to backend GM endpoints and event models

// ── Vote costs & limits (mirrors constants.py) ──

export const GM_VOTE_COST: Record<string, number> = {
  fire_coach: 15,
  cut_player: 10,
  resign_player: 10,
  sign_fa: 12,
  hire_coach: 10,
}

export const GM_VOTES_PER_SEASON = 20
export const GM_VOTES_PER_TYPE = 8
export const GM_VOTES_PER_TARGET = 5
export const GM_FA_BALLOT_COST = 15
export const GM_FA_BALLOT_MAX_RANKINGS = 18

// ── API Response Types ──

export interface GmCoachInfo {
  id: number | null
  name: string
  overallRating: number
  offensiveMind: number
  defensiveMind: number
  adaptability: number
  aggressiveness: number
  clockManagement: number
  playerDevelopment: number
  scouting: number
}

export interface GmPlayerInfo {
  id: number
  name: string
  position: string
  rating: number
  tier: string
  termRemaining: number
}

export interface GmEligibleTargets {
  teamId: number
  coach: GmCoachInfo | null
  availableCoaches: GmCoachInfo[]
  rosteredPlayers: GmPlayerInfo[]
  expiringPlayers: GmPlayerInfo[]
}

export interface GmVoteTally {
  voteType: string
  targetPlayerId: number | null
  votes: number
  threshold: number
  probability: number
}

export interface GmTeamSummary {
  teamId: number
  season: number
  tallies: GmVoteTally[]
}

export interface GmCastVoteResponse {
  voteId: number
  voteType: string
  targetPlayerId: number | null
  costPaid: number
  currentVotes: number
  threshold: number
  probability: number
  remainingBalance: number
}

export interface GmUserVote {
  id: number
  voteType: string
  targetPlayerId: number | null
  costPaid: number
  createdAt: string | null
}

export interface GmVoteCounts {
  total: number
  perType: Record<string, number>
  perTarget: Record<string, number>
}

export interface GmUserVotes {
  season: number
  votes: GmUserVote[]
  counts: GmVoteCounts
}

export interface GmVoteResult {
  id: number
  voteType: string
  targetPlayerId: number | null
  targetName: string | null
  directiveNames: string[]
  totalVotes: number
  threshold: number
  probability: number
  outcome: 'success' | 'below_threshold' | 'failed_roll' | 'ineligible'
  details: string | null
  resolvedAt: string | null
}

export interface GmTeamResults {
  teamId: number
  season: number
  results: GmVoteResult[]
}

export interface GmFaBallotResponse {
  ballotId: number
  rankings: number[]
  costPaid: number
  isUpdate: boolean
}

// ── Request Types ──

export interface GmVoteRequest {
  voteType: string
  targetPlayerId?: number | null
}

export interface GmFaBallotRequest {
  rankings: number[]
}
