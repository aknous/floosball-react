export interface PickEmTeam {
  id: number
  name: string
  abbr: string
  color: string
  record: string
  elo: number
}

export interface UnderdogInfo {
  homeMultiplier: number
  awayMultiplier: number
}

export interface PickEmGame {
  gameIndex: number
  homeTeam: PickEmTeam
  awayTeam: PickEmTeam
  userPick: number | null
  pointsMultiplier: number | null     // timing multiplier locked in when user picked
  underdogMultiplier: number | null   // underdog multiplier locked in when user picked
  underdogInfo: UnderdogInfo | null   // pre-game underdog multipliers for each team
  pickable: boolean                    // can the user pick this game right now?
  currentMultiplier: number            // multiplier user would get if they picked now
  result: { winnerId?: number; correct?: boolean; pointsEarned?: number } | null
}

export interface PickEmWeekSummary {
  correct: number
  total: number
  totalPoints: number
  clairvoyant: boolean
}

export interface PickEmPreviousWeekSummary {
  week: number
  correct: number
  total: number
  totalPoints: number
  clairvoyant: boolean
}

export interface PickEmWeekResponse {
  season: number
  week: number
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
  totalPoints: number
  accuracy: number
  clairvoyantWeeks?: number
  allAuto?: boolean
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
    pointsMultiplier: number | null
    pointsEarned: number | null
  }>
  correct: number
  total: number
  totalPoints: number
  clairvoyant: boolean
}

export interface PickEmHistoryResponse {
  weeks: PickEmHistoryWeek[]
}

// ── Whole-day prognostications (all of a calendar day's slots at once) ──
export interface PickEmDaySlot {
  week: number
  label: string | null            // e.g. "Week 9"
  isActive: boolean               // the live slot right now
  isPast: boolean                 // already finaled earlier today
  isNext: boolean                 // the next slot to kick off
  games: PickEmGame[]
  pickedCount?: number
}

export interface PickEmDayResponse {
  season: number
  day: number | null
  currentWeek: number
  slots: PickEmDaySlot[]
}

// ── Fantasy modifier schedule (for planning cards/rosters ahead) ──
export interface ModifierSlot {
  week: number
  etHour: number
  label: string
  modifier: string
  displayName: string
  description: string
  isActive: boolean
  isPast: boolean
  isNext: boolean
}

export interface ModifierScheduleResponse {
  season: number
  day: number | null
  slots: ModifierSlot[]
}
