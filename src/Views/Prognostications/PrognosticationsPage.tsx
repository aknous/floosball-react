import React, { useEffect, useMemo, useState } from 'react'
import { usePickEmDay } from '@/hooks/usePickEmDay'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, RAIL_WIDTH, SHELL_MOBILE_MAX, font } from '@/Components/Shell/tokens'
import type { TeamStanding, LeagueStandings } from '@/Views/Standings/standingsTypes'
import MatchupCard, { pickWasCorrect } from './MatchupCard'
import AutoPickPanel from './AutoPickPanel'
import Leaderboard, { type BoardEntry } from './Leaderboard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * Prognostications.
 *
 * ⚠️ This REPLACES a thin frame around `PickEmPanel`, which was the dashboard's old
 * right-rail tab moved across unchanged — its own comment said so. That component was
 * built for a 300px rail: a stack of narrow rows carrying two abbreviations, two
 * records and a multiplier. On a full-width page it left most of the screen empty and
 * still did not tell a reader enough to pick with.
 *
 * The page now answers the two questions a picker actually has, in this order:
 *   1. what is this matchup  — form, streak, differential, division standing, odds
 *   2. what is it worth      — the per-side multiplier and the points it pays
 *
 * Team context comes from `/api/standings`, joined by team id. The standings board
 * already computes form, streaks and differentials, so nothing new is asked of the
 * backend — see MatchupCard for why that mattered.
 *
 * The whole-day flow is kept from the old panel and is the one part of it worth
 * keeping: stage every pick for the day, then submit once. A once-a-day reader should
 * not have to make seven round trips.
 */

const HeaderStat: React.FC<{ value: React.ReactNode; label: string; color?: string }> = ({
  value, label, color,
}) => (
  <span style={{ minWidth: 0 }}>
    <span style={{ display: 'block', ...font(800, 19, 1), color: color ?? TEXT.primary, ...TABULAR }}>
      {value}
    </span>
    <span style={{ display: 'block', ...font(700, 9, 1, '0.12em'), color: TEXT.muted, marginTop: '5px' }}>
      {label}
    </span>
  </span>
)

const PrognosticationsPage: React.FC = () => {
  const { user, getToken } = useAuth()
  // ⚠️ The SHELL's breakpoint, not the hook's 768 default. Between 768 and 900 the
  // nav is already a drawer while this page still thought it had desktop room.
  const isMobile = useIsMobile(SHELL_MOBILE_MAX)
  const {
    slots, day, loading, submitting, dirtyCount, saveState,
    setPick, pickFavoritesForSlot, submitAll,
  } = usePickEmDay()

  const [standings, setStandings] = useState<Map<number, TeamStanding>>(new Map())
  const [flash, setFlash] = useState<string | null>(null)
  const [openPast, setOpenPast] = useState<Set<number>>(new Set())
  type Line = { points: number; correct: number; total: number; rank: number }
  const [season, setSeason] = useState<Line | null>(null)
  const [thisWeek, setThisWeek] = useState<Line | null>(null)
  // The same fetch already feeds the rail's own line — no second request for the board.
  const [board, setBoard] = useState<{ season: BoardEntry[]; week: BoardEntry[]; weekNumber: number | null }>(
    { season: [], week: [], weekNumber: null })

  // Team context for every club on the slate. One fetch, joined by id.
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
      .catch(() => { /* the cards fall back to the record on the pick-em payload */ })
    return () => { cancelled = true }
  }, [])

  // The reader's own season line, for the rail.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const tok = await getToken()
        const res = await fetch(`${API_BASE}/pickem/leaderboard`, {
          headers: tok ? { Authorization: `Bearer ${tok}` } : {},
        })
        const json = await res.json()
        // ⚠️ The payload is `data.season.entries` / `data.week.entries` — there is no
        // flat `leaderboard` key. Reading one left the rail permanently showing its
        // empty state to a reader with 224 picks on the board.
        const data = json?.data ?? json
        const mineIn = (entries: any[]): Line | null => {
          const row = (entries ?? []).find((r: any) => Number(r.userId) === Number(user.id))
          return row ? {
            points: row.totalPoints ?? 0,
            correct: row.correctCount ?? 0,
            total: row.totalPicks ?? 0,
            rank: row.rank ?? 0,
          } : null
        }
        if (!cancelled) {
          setSeason(mineIn(data?.season?.entries))
          setThisWeek(mineIn(data?.week?.entries))
          setBoard({
            season: data?.season?.entries ?? [],
            week: data?.week?.entries ?? [],
            weekNumber: data?.week?.week ?? null,
          })
        }
      } catch { /* the rail hides itself */ }
    })()
    return () => { cancelled = true }
  }, [user, getToken])

  const { totalGames, pickedGames, openGames } = useMemo(() => {
    let total = 0, picked = 0, open = 0
    slots.forEach(s => s.games.forEach(g => {
      total += 1
      if (g.userPick != null) picked += 1
      if (g.pickable && g.userPick == null) open += 1
    }))
    return { totalGames: total, pickedGames: picked, openGames: open }
  }, [slots])

  /**
   * ⚠️ Slates you can still act on come FIRST, finished ones fall to the bottom (owner).
   * The server returns them in clock order, which puts this morning's finished games
   * above tonight's open ones — so by midday the page opened on nothing you could do.
   * Within each group the clock order is left alone.
   */
  const orderedSlots = useMemo(() => {
    const rank = (s: typeof slots[number]) => (s.isPast ? 1 : 0)
    return [...slots].sort((a, b) => rank(a) - rank(b))
  }, [slots])

  const handleSubmit = async () => {
    try {
      const { saved, skipped } = await submitAll()
      setFlash(skipped > 0
        ? `Saved ${saved}, skipped ${skipped} already final`
        : `Saved ${saved} pick${saved !== 1 ? 's' : ''}`)
    } catch {
      setFlash('Could not save. Try again.')
    }
    setTimeout(() => setFlash(null), 4000)
  }

  const accuracy = season && season.total > 0
    ? Math.round((season.correct / season.total) * 100) : null

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header band: what today is, and how far through it you are. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
        padding: isMobile ? '12px 12px' : '15px 28px', background: BG.shell,
        borderBottom: `1px solid ${BORDER.hairline}`,
      }}>
        <span>
          <h1 style={{ ...font(800, 22, 1, '-0.03em'), color: TEXT.primary, margin: 0 }}>
            Prognostications
          </h1>
          {/* ⚠️ The rule and the maths, on the page, in one line each. Readers were
              asking what the multipliers meant and what a pick was worth — both were
              only discoverable by picking something and looking at the number that
              came back. */}
          <span style={{ display: 'block', ...font(400, 12), color: TEXT.muted, marginTop: '6px' }}>
            {day != null ? `Day ${day + 1}` : 'Today'}
            {' · '}Picks lock at kickoff.
          </span>
          {/* ⚠️ Stated in POINTS, not multipliers (owner) — the card already shows each
              team's points, so a multiplier here asks the reader to redo that sum. Cut
              back to the two facts the cards cannot state for themselves: what the number
              on a team means, and that only a correct pick pays. The worked range (4 to
              30) went with the rest of the page's explanatory copy. */}
          <span style={{ display: 'block', ...font(400, 12, 1.5), color: TEXT.secondary, marginTop: '4px' }}>
            Each team shows what a correct pick on them is worth. A wrong pick scores nothing.
          </span>
        </span>
        <span style={{ flex: 1 }} />
        {totalGames > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '26px' }}>
            <HeaderStat value={`${pickedGames}/${totalGames}`} label="PICKED" />
            <HeaderStat
              value={openGames}
              label="STILL OPEN"
              color={openGames > 0 ? ACCENT.warning : TEXT.muted}
            />
          </span>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '20px',
        padding: isMobile ? '12px 10px 24px' : '18px 28px 28px',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', ...font(400, 13), color: TEXT.muted }}>
              Loading the slate.
            </div>
          ) : slots.length === 0 ? (
            <div style={{
              padding: '48px', textAlign: 'center', ...font(400, 13), color: TEXT.muted,
              background: BG.panel, border: `1px solid ${BORDER.hairline}`,
            }}>
              No games today.
            </div>
          ) : orderedSlots.map(slot => {
            const open = slot.games.filter(g => g.pickable && g.userPick == null).length
            // ⚠️ A slate that has finished is COLLAPSED (owner). Midday, most of the day
            // is already played, and leading with games nobody can pick any more buries
            // the one slate that still wants a decision. A past slate keeps its result
            // on the header line so it is still worth having, and opens on a click.
            const collapsed = slot.isPast && !openPast.has(slot.week)
            const done = slot.games.filter(g => g.result).length
            const hit = slot.games.filter(pickWasCorrect).length

            return (
              <div key={slot.week} style={{ marginBottom: collapsed ? '9px' : '22px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  paddingBottom: '9px', marginBottom: collapsed ? 0 : '11px',
                  borderBottom: `1px solid ${collapsed ? BORDER.hairline : BORDER.raised}`,
                }}>
                  <span style={{
                    ...font(800, 13, 1, '0.02em'),
                    color: collapsed ? TEXT.muted : TEXT.strong,
                  }}>{slot.label}</span>
                  {slot.isActive && (
                    <span style={{ ...font(700, 9, 1, '0.1em'), color: ACCENT.live }}>LIVE</span>
                  )}
                  {slot.isNext && !slot.isActive && (
                    <span style={{ ...font(700, 9, 1, '0.1em'), color: ACCENT.info }}>UP NEXT</span>
                  )}
                  <span style={{ ...font(400, 11), color: TEXT.muted }}>
                    {slot.isPast
                      ? `${hit}/${done} correct`
                      : `${slot.games.length} game${slot.games.length !== 1 ? 's' : ''}`}
                  </span>
                  <span style={{ flex: 1 }} />
                  {open > 0 && !collapsed && (
                    // A shortcut, not a recommendation — favorites pay the least, which
                    // is exactly why it is offered as a starting point to edit rather
                    // than a button that finishes your day for you.
                    <button
                      onClick={() => pickFavoritesForSlot(slot.week)}
                      style={{
                        ...font(700, 10, 1, '0.08em'), color: TEXT.secondary,
                        background: 'transparent', border: `1px solid ${BORDER.raised}`,
                        padding: '6px 10px', cursor: 'pointer', fontFamily: FONT,
                      }}
                    >FILL FAVORITES</button>
                  )}
                  {slot.isPast && (
                    <button
                      onClick={() => setOpenPast(prev => {
                        const next = new Set(prev)
                        if (next.has(slot.week)) next.delete(slot.week); else next.add(slot.week)
                        return next
                      })}
                      style={{
                        ...font(700, 9, 1, '0.1em'), color: TEXT.muted,
                        background: 'transparent', border: 'none', padding: '2px 0',
                        cursor: 'pointer', fontFamily: FONT,
                      }}
                    >{collapsed ? 'SHOW +' : 'HIDE −'}</button>
                  )}
                </div>

                {/* ⚠️ The COLUMN gap is much wider than the row gap. The cards are two
                    panels facing each other, so a narrow gutter between columns let the
                    right-hand club of one matchup sit beside the left-hand club of the
                    next and read as a pairing of its own. The cards give up the width. */}
                {!collapsed && (
                  <div style={{
                    display: 'grid', rowGap: '10px', columnGap: '30px',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))',
                  }}>
                    {slot.games.map(g => (
                      <MatchupCard
                        key={`${slot.week}:${g.gameIndex}`}
                        game={g}
                        standings={standings}
                        onPick={teamId => setPick(slot.week, g.gameIndex, teamId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!isMobile && user && (
          <div style={{ width: `${RAIL_WIDTH}px`, flexShrink: 0 }}>
            <div style={{ background: BG.panel, border: `1px solid ${BORDER.hairline}` }}>
              <div style={{
                ...font(700, 11, 1, '0.1em'), color: TEXT.secondary,
                padding: '12px 15px', borderBottom: `1px solid ${BORDER.hairline}`,
              }}>YOUR SEASON</div>
              {season ? (
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  borderBottom: `1px solid ${BORDER.hairline}`,
                }}>
                  <div style={{ padding: '14px 15px', borderRight: `1px solid ${BORDER.hairline}` }}>
                    <HeaderStat value={season.points.toLocaleString()} label="POINTS" color={ACCENT.warning} />
                  </div>
                  <div style={{ padding: '14px 15px' }}>
                    <HeaderStat value={season.rank ? `#${season.rank}` : '—'} label="RANK" />
                  </div>
                  <div style={{ padding: '14px 15px', borderTop: `1px solid ${BORDER.hairline}`, borderRight: `1px solid ${BORDER.hairline}` }}>
                    <HeaderStat value={`${season.correct}/${season.total}`} label="CORRECT" />
                  </div>
                  <div style={{ padding: '14px 15px', borderTop: `1px solid ${BORDER.hairline}` }}>
                    <HeaderStat value={accuracy != null ? `${accuracy}%` : '—'} label="ACCURACY" />
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px 15px', ...font(400, 12), color: TEXT.muted }}>
                  No picks yet.
                </div>
              )}
              {thisWeek && thisWeek.total > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: '8px',
                  padding: '11px 15px', borderBottom: `1px solid ${BORDER.hairline}`,
                }}>
                  <span style={{ ...font(700, 10, 1, '0.1em'), color: TEXT.muted }}>THIS WEEK</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ ...font(700, 13), color: TEXT.body, ...TABULAR }}>
                    {thisWeek.correct}/{thisWeek.total}
                  </span>
                  <span style={{ ...font(700, 13), color: ACCENT.warning, ...TABULAR }}>
                    {thisWeek.points} pts
                  </span>
                </div>
              )}
            </div>

            {/* Auto-pick sits ABOVE the board (owner): it is a control the reader may
                want to change, and the leaderboard is the thing they read afterwards. */}
            <AutoPickPanel />

            <Leaderboard
              season={board.season}
              week={board.week}
              weekNumber={board.weekNumber}
              myUserId={user?.id}
            />
          </div>
        )}
      </div>

      {/* ⚠️ Picking IS the submission (owner) — there is no submit button, and there was
          one. A pick a reader had made was not a pick they had made until they found the
          bar at the bottom and pressed it, which is a second act asked for no reason.
          What is left is an ACKNOWLEDGEMENT: it says a save is in flight or has landed,
          and it stays put only when one FAILED, which is the case where the reader has
          something to do about it. */}
      {saveState !== 'idle' && (
        <div style={{
          position: 'sticky', bottom: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '13px 28px', background: BG.shell,
          borderTop: `1px solid ${BORDER.raised}`,
        }}>
          <span style={{
            ...font(600, 12),
            color: saveState === 'error' ? ACCENT.negative
              : saveState === 'closed' ? ACCENT.warning
              : saveState === 'saved' ? ACCENT.live : TEXT.secondary,
          }}>
            {saveState === 'saving' ? 'Saving picks'
              : saveState === 'saved' ? (flash ?? 'Picks saved')
              /* The game kicked off between the click and the save. Say so — the pick is
                 about to disappear off the card and the reader is owed the reason. */
              : saveState === 'closed' ? 'That game kicked off. Picks are closed on it.'
              : `Could not save ${dirtyCount} pick${dirtyCount !== 1 ? 's' : ''}`}
          </span>
          <span style={{ flex: 1 }} />
          {saveState === 'error' && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                ...font(700, 12, 1, '0.06em'), color: BG.shell, background: ACCENT.live,
                border: 'none', padding: '10px 18px', fontFamily: FONT,
                cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1,
              }}
            >{submitting ? 'SAVING' : 'RETRY'}</button>
          )}
        </div>
      )}
    </div>
  )
}

export default PrognosticationsPage
