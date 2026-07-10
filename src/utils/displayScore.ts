import { formatScore } from './formatScore'

// The score DISPLAY model — a lens over the two real cumulative scores. The engine
// still tracks cumulative points and decides the winner by them; this only changes
// how a team's number READS at a render site (docs/SCORING_MODEL_PLAN.md).
export type ScoringModel = 'additive' | 'spread' | 'share'

// Render one team's score under the active model, given its own score and the
// opponent's:
//   additive -> the team's cumulative points (today's behavior), e.g. "21"
//   spread   -> the leader-centric margin: leader "+N", trailer "-N", tie "EVEN"
//   share    -> the team's percentage of total points scored, e.g. "60%" (tie/0-0 -> "50%")
// Falls back to additive for an unknown model, so a new backend value never blanks
// the scoreboard.
export function displayScore(
  teamScore: number | null | undefined,
  oppScore: number | null | undefined,
  model: ScoringModel | string | null | undefined,
): string {
  const t = Number(teamScore) || 0
  const o = Number(oppScore) || 0

  if (model === 'spread') {
    const margin = t - o
    if (margin === 0) return 'EVEN'
    return (margin > 0 ? '+' : '-') + formatScore(Math.abs(margin))
  }

  if (model === 'share') {
    const total = t + o
    if (total <= 0) return '50%'
    return `${Math.round((t / total) * 100)}%`
  }

  return formatScore(t)
}
