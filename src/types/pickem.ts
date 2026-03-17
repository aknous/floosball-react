export interface PickEmTeam {
  id: number
  name: string
  abbr: string
  color: string
  record: string
  elo: number
}

export interface PickEmGame {
  gameIndex: number
  homeTeam: PickEmTeam
  awayTeam: PickEmTeam
  userPick: number | null
  result: { winnerId?: number; correct?: boolean } | null
}

export interface PickEmWeekSummary {
  correct: number
  total: number
  perfectWeek: boolean
}

export interface PickEmPreviousWeekSummary {
  week: number
  correct: number
  total: number
  perfectWeek: boolean
}

export interface PickEmWeekResponse {
  season: number
  week: number
  locked: boolean
  games: PickEmGame[]
  weekSummary: PickEmWeekSummary | null
  previousWeekSummary: PickEmPreviousWeekSummary | null
}

export interface PickEmLeaderboardEntry {
  rank: number
  userId: number
  username: string
  correctCount: number
  totalPicks: number
  accuracy: number
  perfectWeeks?: number
}

export interface PickEmLeaderboardResponse {
  season: { entries: PickEmLeaderboardEntry[] }
  week: { week: number; entries: PickEmLeaderboardEntry[] }
}

export interface PickEmHistoryWeek {
  week: number
  picks: Array<{
    gameIndex: number
    homeTeamId: number
    awayTeamId: number
    pickedTeamId: number
    correct: boolean | null
  }>
  correct: number
  total: number
  perfectWeek: boolean
}

export interface PickEmHistoryResponse {
  weeks: PickEmHistoryWeek[]
}
