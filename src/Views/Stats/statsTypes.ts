/** The shapes `GET /api/stats/players` and `GET /api/stats/teams` return. */

export interface StatsPlayerRow {
  id: number
  name: string
  position: string
  /** S | LB | CB | DE — everyone plays both ways, so this always has a value. */
  defensivePosition: string | null
  teamId: number | null
  teamAbbr: string | null
  teamColor: string | null
  status: 'active' | 'fa' | 'prospect' | 'retired'
  playerRating: number
  ratingStars: number

  gamesPlayed: number
  seasonsPlayed: number | null
  fantasyPoints: number

  passing: {
    comp?: number; att?: number; compPerc?: number; yards?: number
    tds?: number; ints?: number; ypc?: number
    sacked?: number; airYardsSum?: number; longest?: number
  }
  rushing: {
    carries?: number; yards?: number; ypc?: number; tds?: number
    fumblesLost?: number; longest?: number
  }
  receiving: {
    receptions?: number; targets?: number; rcvPerc?: number; yards?: number
    ypr?: number; tds?: number; yac?: number; drops?: number; longest?: number
  }
  kicking: {
    fgs?: number; fgAtt?: number; fgPerc?: number; longest?: number
    xps?: number; xpAtt?: number
  }
  defense: {
    tackles?: number; tfl?: number; sacks?: number; ints?: number
    passBreakups?: number; forcedFumbles?: number
  }
  returning: Record<string, number>

  /** Null wherever a reading was never taken — the table prints a dash. */
  impact: {
    performanceRating: number | null
    defensiveRating: number | null
    wpa: number | null
  }
}

export interface StatsPlayersResponse {
  rows: StatsPlayerRow[]
  total: number
  facets: { active: number; fa: number; prospects: number; retired: number; followed: number }
  season: number | 'career'
  currentSeason: number
}

export interface StatsTeamRow {
  id: number
  teamId: number
  name: string
  abbr: string
  color: string
  gamesPlayed: number
  wins: number
  losses: number
  offense: {
    pointsFor: number
    points: number
    totalYards: number
    passYards: number
    rushYards: number
    touchdowns: number
    fieldGoals: number
    turnovers: number
    sacksAllowed: number
  }
  defense: {
    pointsAgainst: number
    pointsAllowed: number
    yardsAllowed: number
    passYardsAllowed: number
    rushYardsAllowed: number
    sacks: number
    ints: number
    fumbleRecoveries: number
    takeaways: number
    turnoverMargin: number
  }
  differential: number
}

export interface StatsTeamsResponse {
  rows: Omit<StatsTeamRow, 'id'>[]
  season: number
  currentSeason: number
}
