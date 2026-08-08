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
  gamesBack: number

  rankLastWeek: number | null
  rankChange: number

  clinchedPlayoffs: boolean
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

export type StandingsView = 'division' | 'league' | 'wildcard'
