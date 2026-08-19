/** The shape `GET /api/standings` returns for the redesigned board. */

export type SeedKind = 'division' | 'wildcard'

export interface TeamStanding {
  id: number
  name: string
  city: string
  abbr: string
  color: string
  secondaryColor: string

  wins: number
  losses: number
  winPerc: string
  scoreDiff: number

  division: string | null

  divisionWins: number
  divisionLosses: number
  divisionRecord: string
  leagueWins: number
  leagueLosses: number
  leagueRecord: string

  /** 1-8 if the club currently projects into the field, null otherwise. */
  seed: number | null
  seedKind: SeedKind | null
  /** Signed from the club ON the cut: negative is ahead, 0 holds the last spot. */
  /** Behind the last playoff spot. Signed: negative is ahead of the cut. */
  gamesBack: number
  /** Behind this club's OWN division leader. Never negative; the leader is 0. */
  divisionGamesBack: number

  rankLastWeek: number | null
  rankChange: number

  /**
   * Mathematically SECURED, which is a different claim from `seed`. A seed is where
   * the club would land if the season stopped now; these mean no remaining result can
   * take it away. They disagree with the seed all season.
   */
  clinchedPlayoffs: boolean
  clinchedDivision: boolean
  clinchedTopSeed: boolean
  eliminated: boolean

  elo: number
  /** "W3" | "L2" | "" before any games. */
  streak: string
  /** Oldest first, newest last. */
  last5: ('W' | 'L' | 'T')[]
}

export interface DivisionStandings {
  name: string
  teamIds: number[]
}

export interface LeagueStandings {
  name: string
  divisions: DivisionStandings[]
  standings: TeamStanding[]
}

export type StandingsView = 'division' | 'league' | 'graph'

/** One week of one club's season, from GET /api/standings/history. */
export interface HistoryPoint {
  week: number
  wins: number
  losses: number
  ties: number
  /** Wins minus losses. The readable y-axis: cumulative wins only ever climb. */
  gamesAbove500: number
  /** Behind that club's division leader AS OF THAT WEEK, recomputed server-side. */
  divisionGamesBack: number
}

export interface HistoryTeam {
  id: number
  name: string
  abbr: string
  color: string | null
  secondaryColor: string | null
  division: string | null
  series: HistoryPoint[]
}

export interface HistoryLeague {
  name: string
  divisions: { name: string; teamIds: number[] }[]
  teams: HistoryTeam[]
}

export interface StandingsHistory {
  season: number
  weeks: number[]
  leagues: HistoryLeague[]
}
