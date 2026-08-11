import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { BG, BORDER, TEXT, ACCENT, FONT, font } from './tokens'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * Go anywhere from anywhere.
 *
 * ⚠️ This replaces a permanently-visible search field in the header (owner). The field
 * cost 196px of the header on every page to do one thing, and it could only ever find a
 * team or a player — the pages themselves, which are what a reader actually navigates
 * between, were not reachable through it at all. A palette costs an icon and reaches
 * everything.
 *
 * ⚠️ It fetches the team and player lists ONCE PER OPEN and caches them for the session.
 * The old field re-fetched both on every debounced keystroke — `/api/players?limit=600`
 * for each — which is a lot of traffic to filter a list client-side anyway. Nothing here
 * is per-user or time-sensitive enough to need re-fetching mid-session.
 *
 * With an empty query it lists the PAGES. That is the difference between a palette and a
 * search box: opening it should show you somewhere to go, not an empty result set.
 */

type Item = {
  key: string
  label: string
  hint?: string
  group: string
  path: string
  /** Crest to draw beside the row, when the item is a team or has one. */
  crestId?: number
}

const PAGES: Item[] = [
  { key: 'p-front', label: 'Front page', hint: 'League news and leaders', group: 'PAGES', path: '/' },
  { key: 'p-games', label: 'Games', hint: 'The game board', group: 'PAGES', path: '/games' },
  { key: 'p-standings', label: 'Standings', hint: 'Divisions, seeds and the cutline', group: 'PAGES', path: '/standings' },
  { key: 'p-stats', label: 'Stats', hint: 'Leaders and comparisons', group: 'PAGES', path: '/stats' },
  { key: 'p-teams', label: 'Teams', hint: 'Every team in the league', group: 'PAGES', path: '/teams' },
  { key: 'p-pickem', label: 'Prognostications', hint: 'Pick this week', group: 'PAGES', path: '/prognostications' },
  { key: 'p-fantasy', label: 'Fantasy', hint: 'Your lineup and scoring', group: 'PAGES', path: '/fantasy' },
  { key: 'p-cards', label: 'Cards', hint: 'Collection, packs and the shop', group: 'PAGES', path: '/cards' },
  { key: 'p-achievements', label: 'Achievements', hint: 'Goals and rewards', group: 'PAGES', path: '/achievements' },
  { key: 'p-awards', label: 'Awards', hint: 'MVP and Hall of Fame voting', group: 'PAGES', path: '/awards' },
  { key: 'p-bracket', label: 'Bracket', hint: 'The playoff bracket', group: 'PAGES', path: '/bracket' },
  { key: 'p-history', label: 'History', hint: 'Past seasons and records', group: 'PAGES', path: '/history' },
  { key: 'p-about', label: 'About', group: 'PAGES', path: '/about' },
]

/** Session cache. The palette opens far more often than the league changes. */
let cachedTeams: any[] | null = null
let cachedPlayers: any[] | null = null

const CommandPalette: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [teams, setTeams] = useState<any[]>(cachedTeams ?? [])
  const [players, setPlayers] = useState<any[]>(cachedPlayers ?? [])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) { setQuery(''); setCursor(0); return }
    inputRef.current?.focus()
    if (cachedTeams && cachedPlayers) return
    let cancelled = false
    ;(async () => {
      try {
        const [t, p] = await Promise.all([
          fetch(`${API_BASE}/teams`).then(r => r.json()),
          fetch(`${API_BASE}/players?limit=600`).then(r => r.json()),
        ])
        if (cancelled) return
        cachedTeams = (t?.data ?? t ?? []) as any[]
        cachedPlayers = (p?.data ?? p ?? []) as any[]
        setTeams(cachedTeams)
        setPlayers(cachedPlayers)
      } catch { /* pages still work without the league loaded */ }
    })()
    return () => { cancelled = true }
  }, [open])

  const items = useMemo<Item[]>(() => {
    const term = query.trim().toLowerCase()
    if (!term) return PAGES

    const pages = PAGES.filter(p => p.label.toLowerCase().includes(term))
    const teamItems: Item[] = teams
      .filter(t => `${t.city} ${t.name} ${t.abbr ?? ''}`.toLowerCase().includes(term))
      .slice(0, 6)
      .map(t => ({
        key: `t${t.id}`, label: `${t.city} ${t.name}`, hint: t.record || undefined,
        group: 'TEAMS', path: `/team/${t.id}`, crestId: Number(t.id),
      }))
    const playerItems: Item[] = players
      .filter(p => (p.name || '').toLowerCase().includes(term))
      .slice(0, 8)
      .map(p => ({
        key: `p${p.id}`, label: p.name,
        hint: [p.position, p.teamAbbr ?? p.team].filter(Boolean).join(' · ') || undefined,
        group: 'PLAYERS', path: `/players/${p.id}`,
      }))
    return [...pages, ...teamItems, ...playerItems]
  }, [query, teams, players])

  // The cursor is an index into a list that changes as you type, so it has to be
  // pulled back in range rather than left pointing past the end.
  useEffect(() => { setCursor(c => (c >= items.length ? 0 : c)) }, [items.length])

  const go = useCallback((item: Item | undefined) => {
    if (!item) return
    onClose()
    navigate(item.path)
  }, [navigate, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(items.length - 1, c + 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); return }
      if (e.key === 'Enter') { e.preventDefault(); go(items[cursor]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, items, cursor, go, onClose])

  // Keep the highlighted row on screen when arrowing past the fold.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cursor="${cursor}"]`)
    if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  let lastGroup: string | null = null

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10002,
        background: 'rgba(2,6,23,0.72)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        // Sits high, not centered: the reader's eye is already at the top of the
        // page and a centered dialog makes them travel to reach it.
        paddingTop: '12vh', fontFamily: FONT,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '560px', margin: '0 16px',
          background: BG.shell, border: `1px solid ${BORDER.raised}`,
          display: 'flex', flexDirection: 'column', maxHeight: '68vh', overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: '11px',
          padding: '13px 16px', borderBottom: `1px solid ${BORDER.hairline}`,
        }}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill={TEXT.muted} style={{ flexShrink: 0 }}>
            <path d="M8 3a5 5 0 013.9 8.1l4 4-1.4 1.4-4-4A5 5 0 118 3zm0 2a3 3 0 100 6 3 3 0 000-6z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0) }}
            placeholder="Go to a page, team or player"
            style={{
              ...font(500, 15), color: TEXT.primary, background: 'transparent',
              border: 'none', outline: 'none', width: '100%', minWidth: 0, fontFamily: FONT,
            }}
          />
          <span style={{ ...font(600, 10, 1, '0.08em'), color: TEXT.faint, flexShrink: 0 }}>ESC</span>
        </div>

        <div ref={listRef} style={{ overflowY: 'auto', padding: '4px 0' }}>
          {items.length === 0 ? (
            <div style={{ padding: '26px 16px', ...font(400, 13), color: TEXT.muted }}>
              Nothing matches that.
            </div>
          ) : items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null
            lastGroup = item.group
            const active = i === cursor
            return (
              <React.Fragment key={item.key}>
                {header && (
                  <div style={{ ...font(700, 10, 1, '0.14em'), color: TEXT.faint, padding: '10px 16px 6px' }}>
                    {header}
                  </div>
                )}
                <div
                  data-cursor={i}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 16px', cursor: 'pointer',
                    background: active ? 'rgba(56,189,248,0.10)' : 'transparent',
                    borderLeft: `2px solid ${active ? ACCENT.info : 'transparent'}`,
                  }}
                >
                  {item.crestId != null && (
                    <img src={`/avatars/${item.crestId}.png`} alt="" width={18} height={18}
                      style={{ borderRadius: '50%', flexShrink: 0 }} />
                  )}
                  <span style={{ ...font(600, 13), color: active ? TEXT.primary : TEXT.body }}>
                    {item.label}
                  </span>
                  {item.hint && (
                    <>
                      <span style={{ flex: 1 }} />
                      <span style={{ ...font(400, 11), color: TEXT.muted, whiteSpace: 'nowrap' }}>
                        {item.hint}
                      </span>
                    </>
                  )}
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default CommandPalette
