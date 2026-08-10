import React, { useState } from 'react'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { Crest } from '@/Views/GameBoard/boardPieces'
import { readableTeamColor } from '@/utils/colors'
import { multiplierToPoints, eloToWinPct } from '@/Components/PickEm/PickRow'
import type { PickEmGame } from '@/types/pickem'
import type { TeamStanding } from '@/Views/Standings/standingsTypes'

/**
 * One matchup: three numbers on the face, everything else a click away.
 *
 * ⚠️ The first build put form pips, streak, point differential, division record,
 * record and the multiplier all on one line for both clubs. Every number was useful
 * and the row was unreadable — sixteen cards of that is a wall (owner: "way too much
 * data compressed into this screen"). The fix is not fewer stats, it is a FACE and a
 * BACK: win probability, record and rating decide most picks, and the rest is there
 * when a pick is close enough to want it.
 *
 * ⚠️ WIN PROBABILITY is the headline. It sat in the card's header as a tiny
 * "29% / 71%" string and was the hardest thing on the card to read, which is exactly
 * backwards — it is the one number that frames the whole matchup. It now sits on each
 * club's own row, at size, in the colour of what it means.
 *
 * ⚠️ A SELECTED side has to be unmissable. A tinted background and a 3px rule read as
 * decoration next to sixteen other cards; a reader could not tell at a glance which
 * way they had called it. Selection now takes the club's own colour as a full-height
 * bar, a filled check, the name in that colour, and the card's own border.
 *
 * Team context comes from `/api/standings`, joined by id — the standings board already
 * computes form, streaks and differentials, so nothing new is asked of the backend.
 */


/**
 * Did this pick come in?
 *
 * ⚠️ `result.correct` FIRST, and `winnerId` only as the fallback. The two halves of the
 * payload disagree about which one exists: `_buildPickemMatchup` sets `winnerId` only
 * from a live game object that has reached Final, so a PAST slot — rebuilt from the
 * schedule rather than from `activeGames` — arrives with no `winnerId` at all, and the
 * user's own pick overlay supplies `correct` instead. Comparing ids alone therefore
 * scored every resolved pick on a past slate as a miss.
 */
export function pickWasCorrect(game: PickEmGame): boolean {
  if (game.userPick == null || !game.result) return false
  if (typeof game.result.correct === 'boolean') return game.result.correct
  return game.result.winnerId != null
    && Number(game.userPick) === Number(game.result.winnerId)
}

/** Oldest first, newest last — matching the standings board's own ordering. */
const FormPips: React.FC<{ last5?: ('W' | 'L' | 'T')[] }> = ({ last5 }) => {
  if (!last5 || last5.length === 0) return null
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

const Check: React.FC<{ color: string }> = ({ color }) => (
  <span style={{
    width: '18px', height: '18px', borderRadius: '50%', background: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }}>
    <svg width="11" height="11" viewBox="0 0 20 20" fill={BG.shell}>
      <path d="M7.6 14.2 3.4 10l1.4-1.4 2.8 2.8 7-7L16 5.8z" />
    </svg>
  </span>
)

/** The detail row, shown only when the card is opened. */
const Detail: React.FC<{ standing?: TeamStanding }> = ({ standing }) => {
  if (!standing) return null
  const diff = Math.round(standing.scoreDiff ?? 0)
  const cell = (label: string, value: React.ReactNode, color?: string) => (
    <span style={{ minWidth: 0 }}>
      <span style={{ display: 'block', ...font(700, 9, 1, '0.1em'), color: TEXT.muted }}>{label}</span>
      <span style={{
        display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px',
        ...font(600, 12), color: color ?? TEXT.body, ...TABULAR,
      }}>{value}</span>
    </span>
  )
  return (
    <span style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', minWidth: 0 }}>
      {cell('LAST 5', <FormPips last5={standing.last5} />)}
      {standing.streak && cell('STREAK', standing.streak,
        standing.streak.startsWith('W') ? ACCENT.live : ACCENT.negative)}
      {/* ⚠️ Rounded — scoreDiff is a float under the innings and frames formats, and
          "+54.8" claims a precision it does not have. */}
      {diff !== 0 && cell('DIFF', `${diff > 0 ? '+' : ''}${diff}`,
        diff > 0 ? ACCENT.live : ACCENT.negative)}
      {standing.division && cell('IN DIVISION', `${standing.divisionRecord} ${standing.division}`)}
      {cell('LEAGUE', standing.leagueRecord)}
    </span>
  )
}

const TeamSide: React.FC<{
  team: PickEmGame['homeTeam']
  standing?: TeamStanding
  isHome: boolean
  winPct: number
  multiplier: number
  points: number
  picked: boolean
  disabled: boolean
  open: boolean
  onPick: () => void
}> = ({ team, standing, isHome, winPct, multiplier, points, picked, disabled, open, onPick }) => {
  const accent = readableTeamColor(team.color || '#94a3b8')

  return (
    <div>
      <button
        onClick={disabled ? undefined : onPick}
        className={disabled ? undefined : 'plate'}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
          padding: '11px 13px', textAlign: 'left', fontFamily: FONT,
          background: picked ? `${team.color}22` : 'transparent',
          border: 'none',
          borderLeft: `4px solid ${picked ? accent : 'transparent'}`,
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled && !picked ? 0.5 : 1,
        }}
      >
        {picked ? <Check color={accent} /> : <Crest teamId={team.id} size={18} />}

        <span style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{
            ...font(picked ? 800 : 600, 14, 1, '-0.01em'),
            color: picked ? accent : TEXT.body,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{team.name}</span>
          {isHome && <span style={{ ...font(700, 9, 1, '0.1em'), color: TEXT.muted }}>H</span>}
        </span>

        {/* The three headline numbers, in the order a pick is actually made. */}
        <span style={{ ...font(700, 15, 1), ...TABULAR, width: '42px', textAlign: 'right',
          color: winPct >= 50 ? TEXT.primary : TEXT.muted }}>{winPct}%</span>
        <span style={{ ...font(500, 11), color: TEXT.muted, ...TABULAR, width: '38px', textAlign: 'right' }}>
          {standing ? `${standing.wins}-${standing.losses}` : team.record}
        </span>
        <span style={{ ...font(500, 11), color: TEXT.muted, ...TABULAR, width: '36px', textAlign: 'right' }}>
          {Math.round(standing?.elo ?? team.elo)}
        </span>
        <span style={{ width: '52px', textAlign: 'right', flexShrink: 0 }}>
          <span style={{
            display: 'block', ...font(800, 14, 1), ...TABULAR,
            color: multiplier >= 1.5 ? ACCENT.live : multiplier < 0.8 ? TEXT.faint : TEXT.body,
          }}>{multiplier.toFixed(1)}x</span>
          <span style={{ display: 'block', ...font(500, 9), color: TEXT.muted, marginTop: '2px' }}>
            {points} pts
          </span>
        </span>
      </button>

      {open && (
        <div style={{ padding: '9px 13px 11px 21px', background: BG.panel }}>
          <Detail standing={standing} />
        </div>
      )}
    </div>
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
  const pickedTeam = game.userPick != null
    ? (Number(game.userPick) === Number(home.id) ? home : away) : null

  return (
    <div style={{
      background: BG.card, fontFamily: FONT, minWidth: 0,
      // The card's own edge carries the pick too, so a scan down the column shows
      // which games are called without reading a single row.
      border: `1px solid ${pickedTeam ? readableTeamColor(pickedTeam.color || '#94a3b8') + '55' : BORDER.hairline}`,
    }}>
      <TeamSide
        team={away} standing={awayStanding} isHome={false}
        winPct={wp.away} multiplier={awayMult}
        points={multiplierToPoints(timing, awayMult)}
        picked={Number(game.userPick) === Number(away.id)}
        disabled={!game.pickable} open={open}
        onPick={() => onPick(Number(away.id))}
      />
      <div style={{ height: '1px', background: BORDER.subtle }} />
      <TeamSide
        team={home} standing={homeStanding} isHome
        winPct={wp.home} multiplier={homeMult}
        points={multiplierToPoints(timing, homeMult)}
        picked={Number(game.userPick) === Number(home.id)}
        disabled={!game.pickable} open={open}
        onPick={() => onPick(Number(home.id))}
      />

      {/* The foot carries state and the way in to the detail. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '9px',
        padding: '6px 13px', borderTop: `1px solid ${BORDER.subtle}`,
      }}>
        {settled ? (
          <span style={{
            ...font(700, 10, 1, '0.08em'),
            color: game.userPick == null ? TEXT.muted : correct ? ACCENT.live : ACCENT.negative,
          }}>
            {game.userPick == null ? 'NO PICK'
              : correct ? `CORRECT +${game.result?.pointsEarned ?? 0}` : 'MISSED'}
          </span>
        ) : !game.pickable ? (
          <span style={{ ...font(700, 10, 1, '0.08em'), color: TEXT.muted }}>LOCKED</span>
        ) : (
          <span style={{ ...font(500, 10), color: TEXT.muted, ...TABULAR }}>
            {timing.toFixed(2)}x timing
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            ...font(700, 9, 1, '0.1em'), color: TEXT.muted,
            background: 'transparent', border: 'none', padding: '2px 0',
            cursor: 'pointer', fontFamily: FONT,
          }}
        >{open ? 'LESS −' : 'MORE +'}</button>
      </div>
    </div>
  )
}

export default MatchupCard
