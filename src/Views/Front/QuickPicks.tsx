import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BG, BORDER, TEXT, ACCENT, FONT, font } from '@/Components/Shell/tokens'
import { usePickEmDay } from '@/hooks/usePickEmDay'
import MatchupCard from '@/Views/Prognostications/MatchupCard'
import { SectionHeader } from './frontPieces'
import type { PickEmGame } from '@/types/pickem'
import type { TeamStanding, LeagueStandings } from '@/Views/Standings/standingsTypes'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * ONE GAME AT A TIME, in the rail.
 *
 * The Prognostications page shows the whole slate at once, which is the right shape for
 * someone who came to prognosticate. This is for someone who came to read the front page:
 * a single matchup, two buttons, and it moves on. Sixteen decisions turn into sixteen
 * glances rather than one wall.
 *
 * ⚠️ IT DOES NOT DISAPPEAR WHEN THE SLATE IS PICKED (owner). It becomes a browser —
 * arrows either side, wrapping — so a reader can go back and look at, or change, any call
 * they have made. A panel that vanishes the moment you finish with it takes the record of
 * what you did with it.
 *
 * ⚠️ YOUR OWN TEAM'S GAME COMES FIRST (owner), then the rest in kickoff order. It is the
 * one game a reader is certain to have an opinion about, so it is the one that opens.
 */

/** How long the panel holds on a game after it is called, so the pick is seen landing. */
const ADVANCE_DELAY_MS = 900

/** Kickoff order IS `gameIndex` — the slate is built in schedule order. */
const orderGames = (games: PickEmGame[], favouriteTeamId: number | null): PickEmGame[] => {
  const inKickoffOrder = [...games].sort((a, b) => a.gameIndex - b.gameIndex)
  if (favouriteTeamId == null) return inKickoffOrder
  const isMine = (g: PickEmGame) =>
    Number(g.homeTeam.id) === favouriteTeamId || Number(g.awayTeam.id) === favouriteTeamId
  const mine = inKickoffOrder.filter(isMine)
  return mine.length ? [...mine, ...inKickoffOrder.filter(g => !isMine(g))] : inKickoffOrder
}

const Arrow: React.FC<{ dir: 'prev' | 'next'; onClick: () => void; disabled: boolean }> = ({
  dir, onClick, disabled,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={dir === 'prev' ? 'Previous game' : 'Next game'}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '26px', height: '26px', flexShrink: 0,
      background: 'transparent', border: `1px solid ${BORDER.hairline}`,
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1,
      fontFamily: FONT,
    }}
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={TEXT.secondary}
         strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === 'prev' ? 'M15 5L8 12l7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  </button>
)

const QuickPicks: React.FC<{
  favouriteTeamId: number | null
  /** Is any game in the league underway right now? */
  gamesActive: boolean
}> = ({ favouriteTeamId, gamesActive }) => {
  const { slots, loading, setPick, saveState } = usePickEmDay()

  // The card colours its rows with each club's form and standing. Same fetch the
  // Prognostications page makes, and the same shape — the board already computes it, so
  // nothing new is asked of the backend.
  const [standings, setStandings] = useState<Map<number, TeamStanding>>(new Map())
  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/standings`)
      .then(r => r.json())
      .then((json: LeagueStandings[]) => {
        if (cancelled || !Array.isArray(json)) return
        const map = new Map<number, TeamStanding>()
        json.forEach(lg => (lg.standings ?? []).forEach(t => map.set(Number(t.id), t)))
        setStandings(map)
      })
      .catch(() => { /* the card falls back to the record on the pick-em payload */ })
    return () => { cancelled = true }
  }, [])

  // ⚠️ THE EARLIEST SLATE WITH SOMETHING LEFT TO CALL, not simply the live one. Slots
  // arrive in week order, so the first with a pickable game is the next thing a reader
  // can actually do — and once the live week has kicked off, offering it is offering a
  // panel with both buttons disabled. Falls back to the live slot so the panel still
  // shows the week in progress when nothing anywhere is open.
  const slot = useMemo(() => {
    // ⚠️ WHILE THE LEAGUE IS PLAYING, THE PANEL WATCHES rather than looks ahead. Picks
    // are locked anyway, and this is the window where the calls a reader already made
    // are being answered — the card's own gutter turns each one into a check or a cross
    // as its game finals. Skipping to next week's slate would step over exactly that.
    if (gamesActive) {
      const live = slots.find(sl => sl.isActive) ?? slots.find(sl => sl.games.some(g => g.result))
      if (live) return live
    }
    return slots.find(sl => sl.games.some(g => g.pickable))
      ?? slots.find(sl => sl.isActive)
      ?? slots.find(sl => !sl.isPast)
      ?? null
  }, [slots, gamesActive])

  /**
   * What the arrows walk: the slate in focus, and the one before it.
   *
   * ⚠️ THE PREVIOUS SLATE IS REACHABLE ON PURPOSE. The focus slate moves on the moment
   * its last game finals — picks open on the next one — so a panel showing only the
   * focus would step over the results a reader had been waiting for. One slate back is
   * where their answered calls live, and the card marks each with the same check or
   * cross the Prognostications page uses. Bounded at two slates: a whole day is seven,
   * and 112 games is not a thing to arrow through.
   */
  const { games, focusStart } = useMemo(() => {
    if (!slot) return { games: [] as PickEmGame[], focusStart: 0 }
    const focus = orderGames(slot.games, favouriteTeamId)
    const idx = slots.findIndex(sl => sl.week === slot.week)
    const prev = idx > 0 ? slots[idx - 1] : null
    // Only worth carrying back if it has resolved into something to show.
    const previous = prev && prev.games.some(g => g.result)
      ? [...prev.games].sort((a, b) => a.gameIndex - b.gameIndex)
      : []
    return { games: [...previous, ...focus], focusStart: previous.length }
  }, [slot, slots, favouriteTeamId])

  /** Which slate a given game belongs to — the two blocks are contiguous. */
  const weekOf = (index: number) => {
    if (!slot) return 0
    if (index >= focusStart) return slot.week
    const idx = slots.findIndex(sl => sl.week === slot.week)
    return idx > 0 ? slots[idx - 1].week : slot.week
  }

  const [cursor, setCursor] = useState(0)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current) }, [])
  // ⚠️ Opens on the first game still to be called, not on game one. A reader coming back
  // mid-slate wants the next decision, not the one they already made. Re-homed only when
  // the SLATE changes — re-running it on every pick would fight the reader's own arrows.
  const slateKey = slot ? `${slot.week}:${games.length}:${focusStart}` : ''
  const homedFor = useRef<string>('')
  useEffect(() => {
    if (!games.length || homedFor.current === slateKey) return
    homedFor.current = slateKey
    const firstOpen = games.findIndex((g, i) =>
      i >= focusStart && g.pickable && g.userPick == null)
    // Nothing left to call means the slate is being played or is done — sit on the first
    // game of the focus block, which is the reader's own club's.
    setCursor(firstOpen >= 0 ? firstOpen : focusStart)
  }, [slateKey, games, focusStart])

  if (loading && !slot) return null
  if (!slot || !games.length) return null

  const at = Math.min(cursor, games.length - 1)
  const game = games[at]
  const focusGames = games.slice(focusStart)
  const picked = focusGames.filter(g => g.userPick != null).length

  const step = (by: number) => {
    // Taking the arrows means taking control: a queued advance would yank the panel out
    // from under them a moment later.
    if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null }
    setCursor(c => (c + by + games.length) % games.length)
  }

  const choose = (teamId: number) => {
    // ⚠️ NOTHING IS PICKED WHILE THE LEAGUE IS PLAYING (owner). Per-game locking already
    // stops a pick on a game that has kicked off, but it leaves the rest of the day open
    // — so a reader could sit watching one result come in and keep calling the games
    // behind it. The panel still browses; it just does not take a pick.
    if (gamesActive || !game.pickable) return
    setPick(slot.week, game.gameIndex, teamId)
    // ⚠️ THE PICK IS SHOWN BEFORE THE PANEL MOVES ON (owner: it flipped too fast). The
    // card lands the club's colour and dims the other side the moment you choose, and
    // advancing on the same tick threw that away — you saw the next matchup and had to
    // take on trust that the last one registered. The pause is the confirmation.
    const from = game.gameIndex
    advanceTimer.current = setTimeout(() => {
      const nextOpen = games.findIndex((g, i) =>
        i > cursor && i >= focusStart && g.pickable && g.userPick == null && g.gameIndex !== from)
      if (nextOpen >= 0) { setCursor(nextOpen); return }
      const anyOpen = games.findIndex((g, i) =>
        i >= focusStart && g.pickable && g.userPick == null && g.gameIndex !== from)
      // Nothing left to call: stay put rather than jumping somewhere arbitrary.
      if (anyOpen >= 0) setCursor(anyOpen)
    }, ADVANCE_DELAY_MS)
  }

  return (
    <div>
      <SectionHeader
        title="PROGNOSTICATE"
        rail
        link={{ to: '/prognostications', label: 'ALL' }}
      />
      <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}`, padding: '12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
        }}>
          <Arrow dir="prev" onClick={() => step(-1)} disabled={games.length < 2} />
          <span style={{ flex: 1, textAlign: 'center', ...font(700, 13, 1, '0.06em'), color: TEXT.secondary }}>
            WEEK {weekOf(at)} · {(at >= focusStart ? at - focusStart : at) + 1} OF{' '}
            {at >= focusStart ? games.length - focusStart : focusStart}
          </span>
          <Arrow dir="next" onClick={() => step(1)} disabled={games.length < 2} />
        </div>

        {/* ⚠️ THE PROGNOSTICATIONS CARD ITSELF (owner), not a rail-sized lookalike. The
            two surfaces have to agree about what a matchup looks like, what a pick looks
            like once made, and what a settled game shows — and they only stay agreed if
            there is one component. It brings its own MORE expander and its own
            check / cross / lock gutter with it. */}
        {/* ⚠️ Handed the game as NOT PICKABLE while the league plays, rather than given a
            second "disabled" prop: picks genuinely are closed on it right now, and this
            way the card shows what it already shows for a game that has kicked off — the
            lock in the gutter, both sides inert — instead of a second visual language for
            the same fact. */}
        <MatchupCard
          game={gamesActive ? { ...game, pickable: false } : game}
          standings={standings}
          onPick={choose}
          compact
        />

        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px',
          ...font(600, 12), color: TEXT.secondary,
        }}>
          <span>{picked} of {focusGames.length} picked</span>
          <span style={{ flex: 1 }} />
          {/* The one state worth saying out loud is a save that did not land; a pick that
              saved needs no receipt here, the highlight is the receipt. */}
          {gamesActive
            ? <span style={{ color: ACCENT.warning }}>Picks locked</span>
            : !game.pickable
            ? <span style={{ color: TEXT.muted }}>Kicked off</span>
            : saveState === 'error'
              ? <span style={{ color: ACCENT.negative }}>Not saved</span>
              : saveState === 'closed'
                ? <span style={{ color: ACCENT.warning }}>That one kicked off</span>
    
                : null}
        </div>
      </div>
    </div>
  )
}

export default QuickPicks
