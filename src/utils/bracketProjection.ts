// Re-seed projection for the playoff bracket — the JS mirror of the backend's
// playoff_bracket.py (pairTopVsBottom / projectRound). The playoffs re-seed
// every round, so given the frozen seeds + a user's picks the matchups are
// deterministic. KEEP THIS IN SYNC with playoff_bracket.py (same sort key +
// pairing) or the displayed tree drifts from how games actually resolve.
import type { BracketSeedTeam, BracketPredictions, RoundKey } from '@/types/playoffBracket'

export type Matchup = { higher: BracketSeedTeam; lower: BracketSeedTeam }

/** Best record first: winPct, then scoreDiff, then lower teamId (stable). */
export function seedSort(teams: BracketSeedTeam[]): BracketSeedTeam[] {
  return [...teams].sort(
    (a, b) => b.winPct - a.winPct || b.scoreDiff - a.scoreDiff || a.teamId - b.teamId,
  )
}

/** Re-seed survivors into matchups: top-vs-bottom (1v n, 2v n-1, …). */
export function pairTopVsBottom(teams: BracketSeedTeam[]): Matchup[] {
  const o = seedSort(teams)
  const pairs: Matchup[] = []
  let lo = o.length - 1
  let hi = 0
  while (lo > hi) {
    pairs.push({ higher: o[hi], lower: o[lo] })
    hi++
    lo--
  }
  return pairs
}

/** A fully-projected bracket: matchups per round per conference (round 4 keyed
 * by 'floosbowl'), derived from the field + the user's picks so far. */
export interface ProjectedBracket {
  round1: Record<string, Matchup[]>
  round2: Record<string, Matchup[]>
  league_championship: Record<string, Matchup[]>
  floosbowl: Matchup[]
}

const picksSet = (preds: BracketPredictions, key: RoundKey) => new Set(preds[key] || [])

/** Project the whole tree. `conferences` is the frozen field; `preds` is the
 * user's current picks. Each round's matchups are built from the survivors the
 * picks imply (re-seeded), so the tree reshapes as picks change. */
export function projectBracket(
  conferences: Record<string, BracketSeedTeam[]>,
  preds: BracketPredictions,
): ProjectedBracket {
  const byId: Record<number, BracketSeedTeam> = {}
  for (const teams of Object.values(conferences)) for (const t of teams) byId[t.teamId] = t

  const result: ProjectedBracket = { round1: {}, round2: {}, league_championship: {}, floosbowl: [] }
  const r1Picks = picksSet(preds, 'round1')
  const r2Picks = picksSet(preds, 'round2')
  const lcPicks = picksSet(preds, 'league_championship')

  const leagueChamps: BracketSeedTeam[] = []
  for (const [conf, teams] of Object.entries(conferences)) {
    const byes = teams.filter((t) => t.bye)
    const nonByes = teams.filter((t) => !t.bye)

    // Round 1: the fixed wild-card games (non-bye seeds).
    result.round1[conf] = pairTopVsBottom(nonByes)
    const r1Winners = nonByes.filter((t) => r1Picks.has(t.teamId))

    // Round 2: byes + Round 1 winners, re-seeded.
    const r2Field = [...byes, ...r1Winners]
    result.round2[conf] = pairTopVsBottom(r2Field)
    const r2Winners = r2Field.filter((t) => r2Picks.has(t.teamId))

    // League Championship: the Round 2 survivors, re-seeded (one game).
    result.league_championship[conf] = pairTopVsBottom(r2Winners)
    const champ = r2Winners.find((t) => lcPicks.has(t.teamId))
    if (champ) leagueChamps.push(champ)
  }

  // Floos Bowl: the two league champions (cross-conference).
  result.floosbowl = pairTopVsBottom(leagueChamps)
  return result
}
