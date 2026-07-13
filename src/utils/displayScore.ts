import { formatScore } from './formatScore'

// The score DISPLAY model — a lens over the two real cumulative scores. The engine
// still tracks cumulative points and decides the winner by them; this only changes
// how a team's number READS at a render site (docs/SCORING_MODEL_PLAN.md).
export type ScoringModel = 'additive' | 'spread' | 'subtractive'

// Render one team's score under the active model, given its own score and the
// opponent's:
//   additive    -> the team's cumulative points (today's behavior), e.g. "21"
//   spread      -> a SINGLE leader-centric readout: the leader shows "+N", the
//                  trailer shows nothing (blank), and a tie shows "EVEN". So the
//                  board reads "PHI +7" / (blank), not "+7" and "-7" on both sides.
//   subtractive -> golf-flavored: each team's points shown NEGATIVE (21 -> "-21"),
//                  so the LOWEST number is the winner. Display-only — the real
//                  winner (most points) is unchanged, it just reads inverted.
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
    return margin > 0 ? `+${formatScore(margin)}` : ''   // only the leader carries the line
  }

  if (model === 'subtractive') {
    return t === 0 ? '0' : `-${formatScore(t)}`   // negated; lowest wins (golf-style)
  }

  return formatScore(t)
}
