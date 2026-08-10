import React, { useState } from 'react'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { Crest } from '@/Views/GameBoard/boardPieces'
import { readableTeamColor } from '@/utils/colors'
import { multiplierToPoints, eloToWinPct } from '@/Components/PickEm/PickRow'
import type { PickEmGame } from '@/types/pickem'
import type { TeamStanding } from '@/Views/Standings/standingsTypes'

/**
 * One matchup, the two clubs facing each other.
 *
 * ⚠️ HEAD TO HEAD, not stacked (owner). A vertical pair reads as a list of clubs; two
 * panels either side of a gutter reads as a contest, which is what the reader is being
 * asked to judge. This is the shape the old `PickRow` had and it was the right one.
 *
 * ⚠️ Three numbers on the face, the rest behind MORE. The first build put form, streak,
 * differential, division record, record and the points on one line for both clubs —
 * every number useful, and sixteen cards of it a wall.
 *
 * Team context comes from `/api/standings`, joined by id: the standings board already
 * computes form, streaks and differentials, so nothing new is asked of the backend.
 */

/**
 * Did this pick come in?
 *
 * ⚠️ `result.correct` FIRST, `winnerId` only as a fallback. `_buildPickemMatchup` sets
 * `winnerId` only from a live game object that reached Final, so a PAST slot — rebuilt
 * from the schedule rather than from `activeGames` — arrives with no `winnerId` at all
 * and the pick overlay supplies `correct` instead. Comparing ids alone scored every
 * resolved pick on a past slate as a miss.
 */
export function pickWasCorrect(game: PickEmGame): boolean {
  if (game.userPick == null || !game.result) return false
  if (typeof game.result.correct === 'boolean') return game.result.correct
  return game.result.winnerId != null
    && Number(game.userPick) === Number(game.result.winnerId)
}

/** Oldest first, newest last — matching the standings board. */
const FormPips: React.FC<{ last5?: ('W' | 'L' | 'T')[] }> = ({ last5 }) => {
  if (!last5?.length) return null
  return (
    <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
      {last5.map((r, i) => (
        <span key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
          background: r === 'W' ? ACCENT.live : r === 'L' ? ACCENT.negative : TEXT.faint,
        }} />
      ))}
    </span>
  )
}

const Detail: React.FC<{ standing?: TeamStanding; align: 'left' | 'right' }> = ({ standing, align }) => {
  if (!standing) return null
  // ⚠️ Rounded — scoreDiff is a float under the innings and frames formats.
  const diff = Math.round(standing.scoreDiff ?? 0)
  const row = (label: string, value: React.ReactNode, color?: string) => (
    <span style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      flexDirection: align === 'right' ? 'row-reverse' : 'row',
    }}>
      <span style={{
        ...font(700, 9, 1, '0.1em'), color: TEXT.muted, width: '52px',
        textAlign: align === 'right' ? 'right' : 'left',
      }}>{label}</span>
      <span style={{ ...font(600, 11), color: color ?? TEXT.body, ...TABULAR }}>{value}</span>
    </span>
  )
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
      {row('LAST 5', <FormPips last5={standing.last5} />)}
      {standing.streak && row('STREAK', standing.streak,
        standing.streak.startsWith('W') ? ACCENT.live : ACCENT.negative)}
      {diff !== 0 && row('DIFF', `${diff > 0 ? '+' : ''}${diff}`,
        diff > 0 ? ACCENT.live : ACCENT.negative)}
      {standing.division && row('DIVISION', `${standing.divisionRecord} ${standing.division}`)}
      {row('LEAGUE', standing.leagueRecord)}
    </span>
  )
}

const Side: React.FC<{
  team: PickEmGame['homeTeam']
  standing?: TeamStanding
  /** Away reads left-to-right, home reads right-to-left, so the two mirror the gutter. */
  align: 'left' | 'right'
  winPct: number
  points: number
  picked: boolean
  dimmed: boolean
  disabled: boolean
  onPick: () => void
}> = ({ team, standing, align, winPct, points, picked, dimmed, disabled, onPick }) => {
  const accent = readableTeamColor(team.color || '#94a3b8')
  const rtl = align === 'right'
  return (
    <button
      onClick={disabled ? undefined : onPick}
      className={disabled ? undefined : 'plate'}
      style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
        alignItems: rtl ? 'flex-end' : 'flex-start', gap: '4px',
        padding: '9px 11px', fontFamily: FONT,
        textAlign: rtl ? 'right' : 'left',
        background: picked ? `${team.color}22` : BG.card,
        border: `1px solid ${picked ? accent : 'transparent'}`,
        cursor: disabled ? 'default' : 'pointer',
        // The side you did NOT take recedes, so the call reads at a glance.
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      {/* ⚠️ Both rows run EDGE TO EDGE, club on the outside and the numbers on the
          inside. Grouped at one end they left a hole down the middle of every panel,
          and the points — the price of this side, and half the decision — ended up
          buried in a run of small text instead of sitting where the eye already is,
          next to the gutter. */}
      <span style={{
        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
        justifyContent: 'space-between',
        flexDirection: rtl ? 'row-reverse' : 'row',
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0,
          flexDirection: rtl ? 'row-reverse' : 'row',
        }}>
          <Crest teamId={team.id} size={22} />
          <span style={{
            ...font(picked ? 800 : 700, 14, 1, '0.02em'),
            color: picked ? accent : TEXT.body,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{team.abbr}</span>
        </span>
        <span style={{
          ...font(800, 21, 1), ...TABULAR, flexShrink: 0,
          color: winPct >= 50 ? TEXT.primary : TEXT.muted,
        }}>{winPct}%</span>
      </span>

      <span style={{
        display: 'flex', alignItems: 'baseline', gap: '10px', width: '100%',
        justifyContent: 'space-between',
        flexDirection: rtl ? 'row-reverse' : 'row',
      }}>
        <span style={{ ...font(400, 11), color: TEXT.muted, ...TABULAR, whiteSpace: 'nowrap' }}>
          {standing ? `${standing.wins}-${standing.losses}` : team.record}
          {' · '}
          {Math.round(standing?.elo ?? team.elo)}
        </span>
        <span style={{
          display: 'flex', alignItems: 'baseline', gap: '5px', flexShrink: 0,
          flexDirection: rtl ? 'row-reverse' : 'row',
        }}>
          {/* ⚠️ THE POINTS, AND ONLY THE POINTS (owner). The card used to print the
              multiplier beside them, which is just the arithmetic that produced the
              number the reader already has. Two numbers where one is derived from the
              other is what made this confusing.
              The colour keeps the intuition: a big payout reads live-green, a heavy
              favorite recedes. Same information, no second number to reconcile.
              ⚠️ The unit stays glued to the value — this row REVERSES on the home
              side, and a bare number left "pts" stranded across the mirror. */}
          <span style={{
            ...font(800, 17, 1), ...TABULAR, whiteSpace: 'nowrap',
            color: points >= 15 ? ACCENT.live : points < 8 ? TEXT.muted : TEXT.body,
          }}>
            {points}<span style={{ ...font(500, 10), marginLeft: '3px' }}>pts</span>
          </span>
        </span>
      </span>
    </button>
  )
}

export const MatchupCard: React.FC<{
  game: PickEmGame
  standings: Map<number, TeamStanding>
  onPick: (teamId: number) => void
}> = ({ game, standings, onPick }) => {
  const [open, setOpen] = useState(false)
  const home = game.homeTeam
  const away = game.awayTeam
  const homeStanding = standings.get(Number(home.id))
  const awayStanding = standings.get(Number(away.id))

  const wp = eloToWinPct(home.elo, away.elo)
  const homeMult = game.underdogInfo?.homeMultiplier ?? 1
  const awayMult = game.underdogInfo?.awayMultiplier ?? 1
  const timing = game.currentMultiplier || 1

  const settled = !!game.result
  const correct = pickWasCorrect(game)
  const homePicked = Number(game.userPick) === Number(home.id)
  const awayPicked = Number(game.userPick) === Number(away.id)
  const hasPick = homePicked || awayPicked

  return (
    <div style={{
      background: BG.panel, border: `1px solid ${BORDER.hairline}`,
      fontFamily: FONT, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: '4px', padding: '4px' }}>
        <Side
          team={away} standing={awayStanding} align="left"
          winPct={wp.away}
          points={multiplierToPoints(timing, awayMult)}
          picked={awayPicked} dimmed={hasPick && !awayPicked}
          disabled={!game.pickable}
          onPick={() => onPick(Number(away.id))}
        />

        {/* The gutter: what the game is doing, and what it pays right now. */}
        <div style={{
          width: '54px', flexShrink: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '3px',
        }}>
          {settled ? (
            <span style={{
              ...font(700, 12, 1, '0.04em'), textAlign: 'center',
              color: !hasPick ? TEXT.muted : correct ? ACCENT.live : ACCENT.negative,
            }}>
              {!hasPick ? '—' : correct ? `+${game.result?.pointsEarned ?? 0}` : 'MISS'}
            </span>
          ) : (
            <>
              <span style={{ ...font(600, 12), color: TEXT.muted }}>vs</span>
              {/* ⚠️ The TIMING multiplier used to live here. Picks close at kickoff
                  now, so it is 1.00x on every pickable game and told the reader
                  nothing — it was two multipliers on one card where only one varies.
                  LOCKED still earns the slot: it is the difference between a game you
                  can still call and one that has gone. */}
              {!game.pickable && (
                <span style={{ ...font(700, 10, 1, '0.08em'), color: TEXT.muted }}>
                  LOCKED
                </span>
              )}
            </>
          )}
        </div>

        <Side
          team={home} standing={homeStanding} align="right"
          winPct={wp.home}
          points={multiplierToPoints(timing, homeMult)}
          picked={homePicked} dimmed={hasPick && !homePicked}
          disabled={!game.pickable}
          onPick={() => onPick(Number(home.id))}
        />
      </div>

      {open && (
        <div style={{
          display: 'flex', gap: '10px', padding: '10px 12px 12px',
          borderTop: `1px solid ${BORDER.subtle}`,
        }}>
          <span style={{ flex: 1, minWidth: 0 }}><Detail standing={awayStanding} align="left" /></span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <Detail standing={homeStanding} align="right" />
          </span>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'block', width: '100%', ...font(700, 9, 1, '0.1em'), color: TEXT.muted,
          background: 'transparent', border: 'none', borderTop: `1px solid ${BORDER.subtle}`,
          padding: '5px 0', cursor: 'pointer', fontFamily: FONT,
        }}
      >{open ? 'LESS' : 'MORE'}</button>
    </div>
  )
}

export default MatchupCard
