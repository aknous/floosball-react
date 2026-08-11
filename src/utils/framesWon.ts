/**
 * A frames total, as text.
 *
 * A drawn frame is HALVED rather than won, so the total is a whole number or a half —
 * never any other fraction. It reads as "2", "2½", "½".
 *
 * ⚠️ THERE WERE FOUR COPIES OF THIS AND ONE OF THEM DISAGREED. GameCard, GameModalNew and
 * TeamPage each had the ½ form; the game board's own copy in gameFormat.tsx used
 * `n.toFixed(1)` and rendered "2.5". So the same match read "2½" on the card and "2.5" on
 * the board.
 *
 * The decimal is also much the wider of the two, which is how it was reported: on the large
 * board card the frames total sits in a fixed 58px cell beside the points, and "2.5" pushes
 * the composite to 95.6px against 91.7px for "2½" and 63.9px for a plain "2" — the cell
 * overflows in every case, and the decimal worst. Measured in Chrome at the real font sizes.
 *
 * gameFormat.tsx already carried a note about being one module "so the two boards cannot
 * drift on what a frames score means". They had drifted from everything else instead, so
 * the rule lives here now and every surface reads it.
 */
export const fmtFramesWon = (v: number | null | undefined): string => {
  const n = Number(v) || 0
  const whole = Math.floor(n)
  const half = n - whole >= 0.5
  return half ? `${whole > 0 ? whole : ''}½` : `${whole}`
}
