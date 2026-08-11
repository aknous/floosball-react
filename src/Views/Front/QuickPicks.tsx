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

const YOUR_GAME_LABEL = 'YOUR TEAM'

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

const QuickPicks: React.FC<{ favouriteTeamId: number | null }> = ({ favouriteTeamId }) => {
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
  const slot = useMemo(
    () => slots.find(s => s.games.some(g => g.pickable))
      ?? slots.find(s => s.isActive)
      ?? slots.find(s => !s.isPast)
      ?? null,
    [slots])

  const games = useMemo(
    () => (slot ? orderGames(slot.games, favouriteTeamId) : []),
    [slot, favouriteTeamId])

  const [cursor, setCursor] = useState(0)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current) }, [])
  // ⚠️ Opens on the first game still to be called, not on game one. A reader coming back
  // mid-slate wants the next decision, not the one they already made. Re-homed only when
  // the SLATE changes — re-running it on every pick would fight the reader's own arrows.
  const slateKey = slot ? `${slot.week}:${games.length}` : ''
  const homedFor = useRef<string>('')
  useEffect(() => {
    if (!games.length || homedFor.current === slateKey) return
    homedFor.current = slateKey
    const firstOpen = games.findIndex(g => g.pickable && g.userPick == null)
    setCursor(firstOpen >= 0 ? firstOpen : 0)
  }, [slateKey, games])

  if (loading && !slot) return null
  if (!slot || !games.length) return null

  const game = games[Math.min(cursor, games.length - 1)]
  const picked = games.filter(g => g.userPick != null).length
  const isMine = favouriteTeamId != null && (
    Number(game.homeTeam.id) === favouriteTeamId || Number(game.awayTeam.id) === favouriteTeamId)

  const step = (by: number) => {
    // Taking the arrows means taking control: a queued advance would yank the panel out
    // from under them a moment later.
    if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null }
    setCursor(c => (c + by + games.length) % games.length)
  }

  const choose = (teamId: number) => {
    if (!game.pickable) return
    setPick(slot.week, game.gameIndex, teamId)
    // ⚠️ THE PICK IS SHOWN BEFORE THE PANEL MOVES ON (owner: it flipped too fast). The
    // card lands the club's colour and dims the other side the moment you choose, and
    // advancing on the same tick threw that away — you saw the next matchup and had to
    // take on trust that the last one registered. The pause is the confirmation.
    const from = game.gameIndex
    advanceTimer.current = setTimeout(() => {
      const nextOpen = games.findIndex((g, i) =>
        i > cursor && g.pickable && g.userPick == null && g.gameIndex !== from)
      if (nextOpen >= 0) { setCursor(nextOpen); return }
      const anyOpen = games.findIndex(g =>
        g.pickable && g.userPick == null && g.gameIndex !== from)
      // Nothing left to call: stay put rather than jumping somewhere arbitrary.
      if (anyOpen >= 0) setCursor(anyOpen)
    }, ADVANCE_DELAY_MS)
  }

  return (
    <div>
      <SectionHeader
        title="PROGNOSTICATE"
        rail
        badge={isMine ? { text: YOUR_GAME_LABEL, color: ACCENT.ownTeam } : undefined}
        link={{ to: '/prognostications', label: 'ALL' }}
      />
      <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}`, padding: '12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
        }}>
          <Arrow dir="prev" onClick={() => step(-1)} disabled={games.length < 2} />
          <span style={{ flex: 1, textAlign: 'center', ...font(700, 13, 1, '0.06em'), color: TEXT.secondary }}>
            WEEK {slot.week} · {Math.min(cursor, games.length - 1) + 1} OF {games.length}
          </span>
          <Arrow dir="next" onClick={() => step(1)} disabled={games.length < 2} />
        </div>

        {/* ⚠️ THE PROGNOSTICATIONS CARD ITSELF (owner), not a rail-sized lookalike. The
            two surfaces have to agree about what a matchup looks like, what a pick looks
            like once made, and what a settled game shows — and they only stay agreed if
            there is one component. It brings its own MORE expander and its own
            check / cross / lock gutter with it. */}
        <MatchupCard game={game} standings={standings} onPick={choose} compact />

        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px',
          ...font(600, 12), color: TEXT.secondary,
        }}>
          <span>{picked} of {games.length} picked</span>
          <span style={{ flex: 1 }} />
          {/* The one state worth saying out loud is a save that did not land; a pick that
              saved needs no receipt here, the highlight is the receipt. */}
          {!game.pickable
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
