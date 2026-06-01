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
// Per-type cap: coach votes cap at 4 (only one coach to deal with), player
// votes cap at 8 (multiple cut/resign candidates worth spreading across).
// Mirrors GM_VOTES_PER_TYPE / GM_VOTES_PER_TYPE_DEFAULT in floosball/constants.py.
export const GM_VOTES_PER_TYPE: Record<string, number> = {
  fire_coach:    4,
  hire_coach:    4,
  resign_player: 8,
  cut_player:    8,
  sign_fa:       8,
}
export const GM_VOTES_PER_TYPE_DEFAULT = 4
export const GM_VOTES_PER_TARGET = 4
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
  attitude?: number
}

export interface GmPlayerInfo {
  id: number
  name: string
  position: string
  rating: number
  tier: string
  termRemaining: number
  willRetire?: boolean
}

export interface GmEligibleTargets {
  teamId: number
  coach: GmCoachInfo | null
  // Per-team candidate slate. Replaces the shared availableCoaches pool —
  // each team now has its own 3 candidates, only one of which they hire.
  coachCandidates: GmCoachInfo[]
  rosteredPlayers: GmPlayerInfo[]
  expiringPlayers: GmPlayerInfo[]
  retiringPlayers?: GmPlayerInfo[]
}

export interface GmVoteTally {
  voteType: string
  targetPlayerId: number | null
  votes: number          // NET tally (votesFor - votesAgainst)
  votesFor?: number
  votesAgainst?: number
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
  direction?: 'yea' | 'nay'
  targetPlayerId: number | null
  costPaid: number
  currentVotes: number
  votesFor?: number
  votesAgainst?: number
  threshold: number
  probability: number
  remainingBalance: number
}

export interface GmUndoVoteResponse {
  voteType: string
  targetPlayerId: number | null
  refunded: number
  currentVotes: number
  votesFor?: number
  votesAgainst?: number
  threshold: number
  probability: number
  remainingBalance: number
}

export interface GmUserVote {
  id: number
  voteType: string
  targetPlayerId: number | null
  direction?: 'yea' | 'nay'
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
  totalVotes: number       // 'yea' (for) count
  votesAgainst?: number
  threshold: number
  probability: number
  outcome: 'success' | 'below_threshold' | 'failed_roll' | 'ineligible' | 'retiring'
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
  direction?: 'yea' | 'nay'
}

export interface GmFaBallotRequest {
  rankings: number[]
}
