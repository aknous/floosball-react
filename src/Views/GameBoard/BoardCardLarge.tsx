import React from 'react'
import type { CurrentGame } from '@/hooks/useCurrentGames'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { effectiveAwayColor, readableTeamColor } from '@/utils/colors'
import { DriveLine } from '@/Components/DriveLine'
import { lastPlaySummary, downAndDistance } from './lastPlaySummary'
import { periodColumns, FormatClock, FormatScore, leadingSide } from './gameFormat'
import type { ScoringModel } from '@/utils/displayScore'
import { PickButtons, PickedMark, type PickState } from './pickControl'
import {
  Crest, MomentumFlame, InterestChip, SectionLabel,
  CHIP_COLOR, inRedZone, RED_ZONE, type ChipKind,
} from './boardPieces'

/** Footer containers: a panel, its cells, and the rule between them. Defined once so
 *  the two panels cannot drift apart in padding or height. */
const PANEL: React.CSSProperties = {
  background: BG.panel,
  border: `1px solid ${BORDER.hairline}`,
  padding: '0 11px',
  minHeight: '34px',
  boxSizing: 'border-box',
}
const CELL: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0 9px',
}
const RULE: React.CSSProperties = {
  width: '1px',
  alignSelf: 'stretch',
  margin: '8px 0',
  background: BORDER.hairline,
  flexShrink: 0,
}

/**
 * LARGE density: two across, full detail. ~586px wide, ~300px tall, so 16 games scroll
 * by design.
 *
 * ⚠️ The quarter/TOT header cluster and the team rows' value cluster MUST share their
 * gaps and widths exactly. They drifted apart in review and the labels stopped sitting
 * over their values, so they are defined once below and spread into both — change a
 * width or a gap here and BOTH move together.
 */

/**
 * ⚠️ The score panel takes a SHARE of the row, not its content width. Sized to
 * content it stayed ~240px however wide the card got, so on a large window the
 * club names kept the surplus and the numbers huddled against the right edge
 * with a hole in the middle of the card. A percentage basis means the scoreboard
 * grows with the board instead.
 *
 * Both the header cluster and the two value clusters use this, so they take the
 * same share of the same row width and their columns stay aligned — which is the
 * property the whole file depends on.
 */
const CLUSTER = { display: 'flex', alignItems: 'center', gap: '16px', flex: '0 0 46%', minWidth: 0 } as const

/**
 * The score column's panel, applied to the header cluster and BOTH team clusters.
 *
 * ⚠️ `alignSelf: stretch` is what makes this work. The three clusters are separate
 * rows, so their backgrounds only join into one continuous panel if each fills its
 * row's full height — a cluster sized to its own content leaves a gap wherever the
 * team block beside it is taller, and the panel comes apart into three boxes.
 *
 * For the same reason the rows sit at gap 0 and the breathing room lives INSIDE
 * this padding: a gap between the rows is a gap through the middle of the panel.
 */
const SCORE_PANEL = {
  background: BG.panel,
  borderLeft: `1px solid ${BORDER.hairline}`,
  borderRight: `1px solid ${BORDER.hairline}`,
  padding: '0 13px',
  alignSelf: 'stretch',
} as const
// The period columns SHARE the panel's spare width equally; the total keeps a fixed
// box so the right edge does not move as periods are added.
//
// ⚠️ `minWidth: 0` WAS THE BUG, and the note that stood here predicted it without fixing
// it: it lets a cell squeeze BELOW its own text, and the text then spills into the
// neighbouring column. `nowrap` does not help — a browser never breaks a number anyway,
// so the overflow is silent and the digits simply run together. Reported on a frames game
// during Criticality, where chaos rulesets hand out FRACTIONAL scoring values and the
// per-frame cells read "12.6" instead of "12".
//
// The arithmetic, at the shipped sizes: the score panel is 46% of the card, less 26px of
// padding, 32px of cluster gaps, the 1px rule and the 96px frames total — so six frames
// share roughly (0.46w - 155 - gaps). At 18px a plain "12" needs about 22px and "12.6"
// about 37px, i.e. six fractional cells want ~90px MORE than six whole ones. A card wide
// enough for integers is therefore not wide enough for decimals, which is exactly the band
// this landed in.
//
// Two changes, and both are needed. `fit-content` is the correctness one: a cell can no
// longer be narrower than what it holds, so nothing can overlap whatever else is true. The
// tightening below is what keeps that from pushing the row out of the panel instead.
const QUARTER_CELL = { flex: 1, minWidth: 'fit-content', textAlign: 'center' as const, whiteSpace: 'nowrap' as const, ...TABULAR }

/**
 * The period row, tightened for how much it actually has to hold.
 *
 * A fractional value is ~1.7x the width of a whole one, and frames run six columns to a
 * quarter game's four, so the two compound. Rather than size everything for the worst case
 * — which would leave a normal game's quarters oddly cramped — the row gives back gap and
 * a little type size only when the values in it are genuinely wider.
 */
const quartersRow = (periods: number, fractional: boolean) => ({
  display: 'flex',
  gap: (periods > 4 || fractional) ? '6px' : '12px',
  flex: 1,
  minWidth: 0,
})
const periodFontSize = (fractional: boolean) => (fractional ? 15 : 18)
/** Does any cell in this row carry a decimal? Chaos rulesets make scores fractional. */
const hasFractional = (periods: { homeValue: string; awayValue: string }[]) =>
  periods.some(p => p.homeValue.includes('.') || p.awayValue.includes('.'))

// ⚠️ THE TOTAL BOX HAS TO FIT WHAT THE FORMAT PUTS IN IT. 58px holds a two-digit score at
// 34px and nothing more, and FRAMES puts a composite there — [frames won] | [points] — which
// measured 91.7px with a halved total ("2½") and 63.9px even for a plain whole number. So
// the cell overflowed on EVERY frames game and worst on a halved one, which is how it was
// reported. Frames get their own width; every other format keeps the original box, so the
// right edge still does not move as periods are added.
//
// 96px is sized for a SINGLE-DIGIT frames total, which is the only kind there is: the rule
// patch sets framesPerGame to 6, and tabular-nums makes "6½" exactly as wide as "2½". If a
// patch ever runs more than nine frames, this needs ~115px — measured, "12½" overflows 96
// by 18.6px.
//
// ⚠️ AND IT IS A FIXED WIDTH, so anything wider than it was sized for OVERFLOWS rather than
// wraps. A Criticality chaos ruleset makes the scoring values fractional, and "2½ | 12.6"
// runs past a box cut for "2½ | 12". ⚠️ WIDENING THE BOX IS THE WRONG FIX and was tried:
// the box and the period columns share one panel, so every pixel it gains comes straight
// out of the frames row beside it — at a 820px card that put the row back over its budget
// (206px available against 217px needed). `FormatScore` shrinks the POINTS instead, which
// keeps the composite inside 96px and leaves the panel arithmetic untouched.
const TOTAL_W = 58
const TOTAL_W_FRAMES = 96
const totalCell = (frames: boolean) => ({
  width: `${frames ? TOTAL_W_FRAMES : TOTAL_W}px`,
  flexShrink: 0, textAlign: 'right' as const, ...TABULAR,
})

type Props = {
  game: CurrentGame
  chip: ChipKind | null
  pinned: boolean
  pinnedAccent: string
  scoringModel: ScoringModel
  onOpen: (id: number) => void
  /** Prognostication state for THIS fixture, or null when picks do not apply
      (signed out, or the board is showing a past week — see pickControl). */
  pick?: PickState | null
}

const BoardCardLarge: React.FC<Props> = ({ game, chip, pinned, pinnedAccent, scoringModel, onOpen, pick }) => {
  const live = game.status === 'Active'
  const isFinal = game.status === 'Final'
  const home = game.homeTeam
  const away = game.awayTeam

  const homeScore = game.homeScore ?? 0
  const awayScore = game.awayScore ?? 0
  // Who is ahead is a FORMAT question — in frames it is frames won, not points.
  const leader = leadingSide(game)
  const homeAhead = leader !== 'away'
  const awayAhead = leader !== 'home'

  // Fills use the raw color; only text gets corrected.
  const awayFill = effectiveAwayColor(home?.color, away?.color, away?.secondaryColor, away?.tertiaryColor)
  const homeFill = home?.color || '#64748b'
  const awayText = readableTeamColor(awayFill)
  const homeText = readableTeamColor(homeFill)

  const homeWp = Math.round(game.homeWinProbability ?? 50)
  const awayWp = 100 - homeWp
  const wpFor = (side: 'home' | 'away') => (side === 'home' ? homeWp : awayWp)

  // The last play as structure, not prose — see lastPlaySummary for why.
  const lastPlay = lastPlaySummary(game)

  const redZone = inRedZone(game)
  // Derived, NOT game.downText — that field is REST-only and freezes.
  const downText = downAndDistance(game)
  // A score leaves the down and the spot holding pre-score values until the
  // next drive starts, so the row shows only the clock through that gap.
  const situationLive = !lastPlay?.afterScore



  const accent = pinned ? pinnedAccent : chip ? CHIP_COLOR[chip] : BORDER.hairline
  const possessionTeam = game.homeTeamPoss ? 'home' : game.awayTeamPoss ? 'away' : null
  const momentumMagnitude = Math.abs(game.momentum ?? 0)

  // The period columns this format actually has: quarters for most, the innings line
  // score for innings, none at all for frames.
  const columns = periodColumns(game)

  const teamRow = (
    side: 'away' | 'home',
    team: typeof home,
    score: number,
    ahead: boolean,
  ) => {
    const hasMomentum = live && momentumMagnitude > 0 && game.momentumTeam === team?.abbr
    // ⚠️ minHeight 46, not 54. The rows carry their own height now that the block
    // sits at gap 0, and the first pass simply reused the old 16px root gap as
    // slack. Inside a bordered panel that slack stops reading as separation
    // between rows and starts reading as an empty box — the card measured the
    // SAME height as before and still looked bigger. Content is ~40px (a 36px
    // crest, or the city + name block), so this leaves 6px of breathing room.
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minHeight: '46px' }}>
        {/* ⚠️ THE PICK MARK OVERLAYS THE CREST and takes no width — see `PickedMark`. The
            wrapper exists only to be its positioning context; it is `inline-flex` so the
            crest keeps the exact box it had. */}
        <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
          <Crest teamId={team?.id} size={36} possession={live && possessionTeam === side} />
          {live && <PickedMark teamId={team?.id}
                               color={side === 'home' ? homeText : awayText} pick={pick} />}
        </span>
        {/* ⚠️ Shrink-to-fit, NOT flex: 1. Growing this block pushed everything after
            it across to the scoreboard; the spacer below takes the slack instead. */}
        <div style={{ flexShrink: 1, minWidth: 0 }}>
          <div style={{ ...font(500, 13), color: TEXT.muted, whiteSpace: 'nowrap' }}>{team?.city}</div>
          {/* The record rides the NAME line (owner). On the city line it read as
              part of the city — "Anaheim 5-0" as one phrase — and centered beside
              the whole block it floated with nothing to attach to. Against the
              name it reads as that club's season, which is what it is.
              BASELINE, not center: 13px next to 21px centered sits visibly high. */}
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: '9px',
            marginTop: '3px', minWidth: 0,
          }}>
            <span style={{
              ...font(ahead ? 800 : 600, 21, 1, '-0.02em'),
              color: ahead ? TEXT.primary : TEXT.muted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              minWidth: 0,
            }}>{team?.name}</span>
            {/* flexShrink 0 so a long club name truncates and the record survives —
                the name is still recognizable clipped, a record is not. */}
            <span style={{
              ...font(600, 13, 1), color: TEXT.muted, ...TABULAR,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>{team?.record}</span>

            {hasMomentum && <MomentumFlame magnitude={momentumMagnitude} size={14} />}
          </div>
        </div>

        <span style={{ flex: 1, minWidth: 0 }} />
        <div style={{
          ...CLUSTER, ...SCORE_PANEL,
          ...(side === 'home' ? { borderBottom: `1px solid ${BORDER.hairline}` } : {}),
        }}>
          {columns && (
            <div style={quartersRow(columns.periods.length, hasFractional(columns.periods))}>
              {columns.periods.map((period, i) => {
                // In frames the side that TOOK the frame is what matters, not the points —
                // so the winner is lit and the loser reads as background, which is the
                // opposite emphasis to a quarter score.
                const tookIt = side === 'home' ? period.homeWon : period.awayWon
                const isFrames = period.homeWon !== undefined
                return (
                  <span key={period.label} style={{
                    ...QUARTER_CELL,
                    ...font(isFrames ? (tookIt ? 800 : 400) : period.played ? 600 : 400,
                            periodFontSize(hasFractional(columns.periods))),
                    color: !period.played ? TEXT.dim
                      : isFrames ? (tookIt ? ACCENT.live : TEXT.dim)
                        : game.quarter === i + 1 && live ? TEXT.strong : TEXT.secondary,
                  }}>{side === 'home' ? period.homeValue : period.awayValue}</span>
                )
              })}
            </div>
          )}
          {columns && <span style={{ width: '1px', height: '24px', background: BORDER.hairline }} />}
          <span style={{ ...totalCell(!!game.frames?.active), display: 'inline-flex', justifyContent: 'flex-end' }}>
            <FormatScore
              game={game}
              side={side}
              scoringModel={scoringModel}
              size={34}
              color={ahead ? TEXT.primary : TEXT.muted}
            />
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="plate"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(game.id)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(game.id) } }}
      style={{
        boxSizing: 'border-box',
        background: pinned ? BG.cardOwn : BG.card,
        border: `1px solid ${pinned ? BORDER.raised : BORDER.hairline}`,
        borderTop: `2px solid ${accent}`,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        cursor: 'pointer',
        fontFamily: FONT,
      }}
    >
      {/* The scoreboard block: status, then the two clubs. Held at gap 0 so the
          score panel behind the numbers stays continuous — see SCORE_PANEL. The
          root's own 16px gap still separates this block from the footer. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '20px' }}>
        {/* ⚠️ The running clock is NOT here — it moved down to the situation row
            (owner), where the quarter, the down, the spot and the red zone read
            as one line. Duplicating it in both places is the same number twice.
            The states that are not a running clock stay: they are the card's
            status, and they have no situation row to live in (a final replaces
            that row with team stats, and halftime suppresses it). */}
        {isFinal ? (
          <span style={{ ...font(700, 12, 1, '0.08em'), color: TEXT.muted, ...TABULAR }}>FINAL</span>
        ) : live ? (
          game.isHalftime
            ? <span style={{ ...font(700, 12, 1, '0.08em'), color: ACCENT.live, ...TABULAR }}>HALFTIME</span>
            : null
        ) : (
          <span style={{ ...font(700, 12, 1, '0.08em'), color: TEXT.muted, ...TABULAR }}>SCHEDULED</span>
        )}
        {chip && <InterestChip kind={chip} size="large" />}
        {/* No format badge here (owner). The board's rules strip already names the active
            format once, at the top — repeating it on all sixteen cards is noise, and the
            column headers below already show what changed. */}
        <span style={{ flex: 1 }} />
        <div style={{
          ...CLUSTER, ...SCORE_PANEL,
          borderTop: `1px solid ${BORDER.hairline}`,
          paddingTop: '6px', paddingBottom: '4px',
        }}>
          {columns && (
            /* The same gap as the score row below it, or the labels stop sitting over
               the columns they name. */
            <div style={quartersRow(columns.periods.length, hasFractional(columns.periods))}>
              {columns.periods.map(period => (
                <span key={period.label} style={{ ...QUARTER_CELL, ...font(600, 12), color: TEXT.muted }}>
                  {period.label}
                </span>
              ))}
            </div>
          )}
          {columns && <span style={{ width: '1px', height: '16px', background: BORDER.hairline }} />}
          {/* Same width as the score cell below it, or the header label and the totals
              column stop lining up the moment frames widen the box. */}
          <span style={{ ...totalCell(!!game.frames?.active), ...font(600, 11, 1, '0.08em'), color: TEXT.muted }}>
            {columns ? columns.label : 'TOT'}
          </span>
        </div>
      </div>

      {teamRow('away', away, awayScore, awayAhead)}
      {teamRow('home', home, homeScore, homeAhead)}
      </div>


      {/* ⚠️ Two CONTAINERS, not one run of text (owner). The last play and the
          current situation are separate thoughts that happened to share a row,
          and floating them either side of a flex spacer read as one disorganized
          sentence. Each gets a panel; inside the right-hand one the fields are
          divided by rules rather than middots, which is the same idiom as the
          quarter cluster at the top of the card and makes it read as one
          instrument instead of three loose numbers. */}
      {/* ⚠️ PRE-GAME THIS BLOCK IS THE PROGNOSTICATION ZONE (owner). A scheduled game has no
          field to draw and no last play to report, so the space that carries those while the
          game is live sits empty before it -- which is where the pick buttons go. That is
          what let the pick come off the left of the team rows, where any control at all
          "pushes everything too far to the right". */}
      {!isFinal && (live || pick) && (
        /* ⚠️ ONE FLEX CHILD, NOT TWO. The card root is `flex-direction: column` with
           `gap: 16px`, so every direct child is pushed 16px off the one above it — measured
           live, the drive strip sat 15px below the row despite `marginTop: -1px`, which is
           the gap minus that margin. No amount of padding or `minHeight` on either box could
           reach it, which is why four attempts at this changed nothing the owner could see.
           Wrapping the pair makes the card's gap apply ONCE, above the pair, and lets the
           two touch inside it. */
        <div style={{
          display: 'flex', flexDirection: 'column', minWidth: 0,
          paddingTop: '13px', borderTop: `1px solid ${BORDER.hairline}`,
        }}>
          {live ? (<>
          {/* ⚠️ THE FIELD SITS WHERE THE WIN-PROBABILITY GRAPH USED TO (owner), with the
              last play and the situation under it. It is the widest thing on the card and
              the one most worth the width, and putting it directly beneath the teams means
              the drive reads against the clubs driving it rather than as a footnote.

              ⚠️ LAST PLAY AND THE SITUATION STAY ON ONE ROW (owner) — that row is now
              BELOW this one, and pulls up onto this strip's bottom border so the two still
              read as one block.

              ⚠️ GATED ONLY ON THE GAME BEING LIVE. It used to need `situationLive`
              and a known spot as well, so a score or a possession change took the
              row away and the whole card changed height mid-game (owner).
              `DriveLine` draws the field regardless and leaves out only the
              football, so the height is fixed for the whole game. */}
          {/* ⚠️ NOT GATED ON HALFTIME (owner: a game at half was not showing the field).
              The SITUATION row is suppressed at half for a good reason -- nobody is on the
              clock and the down and spot belong to a drive that is over -- and the field
              inherited that gate by sitting next to it. But the field is not a live readout
              the way a down is: it is where the ball GOT TO, which is exactly the thing
              worth looking at while a game is stopped. Dropping the row at half also
              resized the card mid-game, which is the complaint this was already fixed for
              once. */}
          {live && (
            <div style={{
              ...PANEL,
              // ⚠️ THE SPACE ABOVE THIS ROW WAS NEVER A MARGIN, which is why pulling the
              // margin to -1px did not close it. `PANEL` has no vertical padding at all --
              // it is `minHeight: 34px` with the contents centred, so a 12px field sat in a
              // 34px box with eleven pixels of air on each side. The strip is sized to what
              // is in it instead, so it reads as part of the panel above rather than as a
              // second box of the same height (owner).
              // ⚠️ 6px, and this padding IS the space between the two rows -- they share a
              // collapsed border now, so there is no margin or gap left to put it in.
              minHeight: 0, paddingTop: '6px', paddingBottom: '6px',
              borderTopLeftRadius: 0, borderTopRightRadius: 0,
              display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0,
            }}>
              <SectionLabel>DRIVE</SectionLabel>
              <span style={{ flex: 1, minWidth: 0, display: 'flex' }}>
                <DriveLine
                  yardsToEndzone={game.yardsToEndzone}
                  driveStartYardsToEndzone={game.driveStartYardsToEndzone}
                  homeTeamPoss={game.homeTeamPoss}
                  awayTeamPoss={game.awayTeamPoss}
                  homeColor={homeFill}
                  awayColor={awayFill}
                />
              </span>
            </div>
          )}
          <div style={{
            // ⚠️ 4px, not the -1px that collapsed the borders (owner wants "a bit more of
            // a gap between the field viz and the situation bar"). The separator from the
            // team block above moved onto the strip with it.
            marginTop: '4px',
            display: 'flex', alignItems: 'stretch', gap: '10px', minWidth: 0,
          }}>
          <div style={{
            // ⚠️ 28px, NOT `PANEL`'s 34. The air the owner kept seeing above the drive
            // strip was never between the boxes -- it is INSIDE this one. `PANEL` has no
            // vertical padding, it is `minHeight: 34px` with its contents centred, so a
            // 13px line of text leaves about ten dead pixels underneath it, directly above
            // the field. Shrinking the strip removed the space BELOW the field and left
            // that untouched, which is why the gap "hasn't changed at all".
            ...PANEL, minHeight: '28px', flex: 1, minWidth: 0,
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <SectionLabel>LAST PLAY</SectionLabel>
            {lastPlay ? (
              /* ⚠️ CENTER, not baseline. The row mixes 10-15px type with a
                 bordered tag whose baseline sits inside its own padding, so on a
                 baseline row the chip and the numbers never agreed. Every span
                 below also pins lineHeight to 1 — an unset line box is ~1.2x the
                 font size and differs per span, which shifts the center of each
                 item by a different amount. */
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                {lastPlay.teamAbbr && (
                  <span style={{
                    ...font(700, 12, 1, '0.04em'),
                    color: lastPlay.teamAbbr === away?.abbr ? awayText : homeText,
                    ...TABULAR,
                  }}>{lastPlay.teamAbbr}</span>
                )}
                <span style={{ ...font(700, 14, 1, '0.02em'), color: TEXT.secondary, whiteSpace: 'nowrap' }}>
                  {lastPlay.action}
                </span>
                {lastPlay.yards != null && (
                  <span style={{
                    ...font(800, 15, 1), ...TABULAR, whiteSpace: 'nowrap',
                    color: lastPlay.yards < 0 ? ACCENT.negative : TEXT.primary,
                  }}>
                    {lastPlay.unsigned || lastPlay.yards <= 0 ? lastPlay.yards : `+${lastPlay.yards}`}
                    <span style={{ ...font(500, 11, 1), color: TEXT.muted }}> YD</span>
                  </span>
                )}
                {lastPlay.tag && (
                  <span style={{
                    ...font(700, 10, 1, '0.08em'), color: lastPlay.tagColor,
                    border: `1px solid ${lastPlay.tagColor}59`, padding: '3px 6px',
                    whiteSpace: 'nowrap',
                  }}>{lastPlay.tag}</span>
                )}
              </div>
            ) : (
              <span style={{ ...font(400, 14, 1), color: TEXT.muted }}>
                {live ? 'Waiting on the snap' : '—'}
              </span>
            )}
          </div>

          {/* Where the game stands NOW. The last play says what just happened;
              this says what is about to. Suppressed at halftime, where nobody is
              on the clock and the down and spot belong to a drive that is over. */}
          {live && !game.isHalftime && (
            <div style={{
              // 28px to match LAST PLAY — see the note there.
              ...PANEL, minHeight: '28px', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 0,
              // ⚠️ `borderColor` IS ALWAYS SET, NEVER CONDITIONALLY SPREAD, and that is what
              // fixes the white border that appeared at random (owner). `PANEL` sets the
              // `border` SHORTHAND; this used to add the `borderColor` LONGHAND only in the
              // red zone. React writes style objects property by property, so when a card
              // LEFT the red zone it removed the longhand — and removing a longhand that
              // came after a shorthand takes the shorthand's colour with it. `border-color`
              // then falls back to `currentColor`, which here is #e2e8f0. Measured live: 3
              // of 16 cards had `border-width: 1px; border-style: solid;` and no colour at
              // all. It looked random because it depends on where the ball has BEEN, not on
              // where it is. Same reason the background is stated both ways.
              borderColor: redZone && situationLive ? `${RED_ZONE}4d` : BORDER.hairline,
              background: redZone && situationLive ? 'rgba(248,113,113,0.06)' : BG.panel,
            }}>
              {/* FormatClock, not a hand-rolled quarter + time: an innings game
                  or a chess-clock game does not have either. */}
              <span style={CELL}><FormatClock game={game} size="large" /></span>
              {situationLive && downText && (
                <>
                  <span style={RULE} />
                  <span style={{
                    ...CELL, ...font(700, 13, 1), color: TEXT.secondary,
                    ...TABULAR, whiteSpace: 'nowrap',
                  }}>{downText}</span>
                </>
              )}
              {situationLive && game.yardLine && (
                <>
                  <span style={RULE} />
                  <span style={{
                    ...CELL, ...font(600, 13, 1), ...TABULAR, whiteSpace: 'nowrap',
                    color: redZone ? RED_ZONE : TEXT.muted,
                  }}>{game.yardLine}</span>
                </>
              )}
              {/* ⚠️ No RED ZONE cell (owner): the panel's own tint already says it,
                  and spelling it out beside a red container is the same fact
                  twice. The small card still needs its chip — it has no panel to
                  tint and no spot to color. */}
            </div>
          )}
          </div>
          </>) : (
            <PickButtons away={away} home={home}
                         awayColor={awayFill} homeColor={homeFill}
                         awayPct={awayWp} homePct={homeWp} pick={pick} />
          )}
        </div>
      )}
    </div>
  )
}

export default BoardCardLarge
