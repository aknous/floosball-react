import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { BG, BORDER, TEXT, ACCENT, PLAYOFF, FONT, font } from '@/Components/Shell/tokens'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SHELL_MOBILE_MAX } from '@/Components/Shell/tokens'
import { TrophyIcon } from './standingsPieces'
import ByDivision from './ByDivision'
import ByLeague from './ByLeague'
import type { LeagueStandings, StandingsView } from './standingsTypes'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
const VIEW_KEY = 'floosball:standingsView'

const VIEWS: { key: StandingsView; label: string }[] = [
  { key: 'division', label: 'BY DIVISION' },
  { key: 'league', label: 'BY LEAGUE' },
]

// ⚠️ The wild card race view was REMOVED (owner): it was a nice object but a confusing
// one, and the division and league views already answer everything it did. Anyone whose
// stored preference still says 'wildcard' is sent to the league view rather than left
// staring at nothing.

/**
 * Standings for a 32-club league: two leagues of 16, four divisions of four in each,
 * eight qualifiers per league (four division winners seeded 1-4, then four wild cards).
 *
 * A view SWITCHER rather than one table trying to answer everything. Switching is
 * client-side with no refetch, and the choice persists.
 *
 * The ELO power-rankings mode from the old page is dropped — ELO survives as a column in
 * the league view, which is where a fan actually wants to compare it against a record.
 */
const StandingsPage: React.FC = () => {
  const compact = useIsMobile(SHELL_MOBILE_MAX)
  const { user } = useAuth()
  const { event: wsEvent } = useSeasonWebSocket()

  const [view, setView] = useState<StandingsView>(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY) as StandingsView
      return saved === 'division' || saved === 'league' ? saved : 'league'
    } catch { return 'league' }
  })
  const [leagues, setLeagues] = useState<LeagueStandings[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view) } catch { /* preference is best-effort */ }
  }, [view])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/standings`)
      const json = await res.json()
      if (!Array.isArray(json)) { setError(true); return }
      setLeagues(json)
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // `standings_update` replaces the payload live; `week_start` and a finished game both
  // move records, so they refetch too.
  useEffect(() => {
    // ⚠️ `.event`, NOT `.type`. Every season-socket payload is keyed `event` (see
    // api/event_models.py); `.type` is only ever sent BY the client, on identify and
    // watch. Reading `.type` here yielded undefined for every message, so this effect
    // never fired once and the panel below only ever refreshed on mount.
    const type = (wsEvent as any)?.event ?? (wsEvent as any)?.type
    if (type === 'standings_update' || type === 'week_start' || type === 'game_end') load()
  }, [wsEvent, load])

  const favoriteTeamId = user?.favoriteTeamId ?? null

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: compact ? '10px' : '14px',
        flexWrap: 'wrap',
        padding: compact ? '12px 12px' : '15px 28px', background: BG.shell,
        borderBottom: `1px solid ${BORDER.hairline}`, fontFamily: FONT,
      }}>
        <h1 style={{ ...font(800, compact ? 18 : 22, 1, '-0.03em'), color: TEXT.primary, margin: 0 }}>Standings</h1>
        {!compact && <span style={{ width: '1px', height: '24px', background: BORDER.hairline }} />}

        <div style={{ display: 'flex', background: BG.panel, border: `1px solid ${BORDER.hairline}` }}>
          {VIEWS.map((option, i) => {
            const active = view === option.key
            return (
              <button
                key={option.key}
                onClick={() => setView(option.key)}
                style={{
                  ...font(active ? 800 : 500, 11),
                  color: active ? BG.shell : TEXT.muted,
                  background: active ? TEXT.secondary : 'transparent',
                  border: 'none',
                  borderLeft: i > 0 ? `1px solid ${BORDER.hairline}` : 'none',
                  padding: '8px 13px', cursor: 'pointer', fontFamily: FONT,
                }}
              >{option.label}</button>
            )
          })}
        </div>

        <span style={{ flex: 1 }} />
        {/* ⚠️ No legend on a phone. It is a key to seed colors that the rows already
            carry, and at this width it was the thing pushing the header off screen. */}
        {!compact && <Legend />}
      </div>

      <div style={{ padding: compact ? '14px 10px 22px' : '18px 28px 28px', fontFamily: FONT }}>
        {error ? (
          <div style={{
            background: BG.card, border: `1px solid ${BORDER.hairline}`,
            padding: '40px', textAlign: 'center', ...font(400, 13), color: TEXT.muted,
          }}>
            Standings are unavailable right now.
          </div>
        ) : !leagues ? (
          <StandingsSkeleton />
        ) : view === 'division' ? (
          <ByDivision leagues={leagues} favoriteTeamId={favoriteTeamId} compact={compact} />
        ) : (
          <ByLeague leagues={leagues} favoriteTeamId={favoriteTeamId} compact={compact} />
        )}
      </div>
    </>
  )
}

/**
 * The legend's swatches use the SAME treatment as the badges they describe — a tinted
 * circle with a ring, not a solid block. A solid block does not read as the thing it is
 * explaining.
 */
const Legend: React.FC = () => {
  const swatch = (ring: string, fill: string, text?: string) => (
    <span style={{
      boxSizing: 'border-box', width: '15px', height: '15px', borderRadius: '50%',
      border: `1px solid ${ring}`, background: fill,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...font(800, 9), color: text || 'transparent',
    }}>{text ? '1' : ''}</span>
  )
  const item = (node: React.ReactNode, label: string) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {node}
      <span style={{ ...font(600, 10, 1, '0.08em'), color: TEXT.muted }}>{label}</span>
    </span>
  )
  // ⚠️ A HEAVIER RING is the whole clinched treatment, so the legend has to show the
  // difference rather than describe it — the two swatches sit next to each other for
  // exactly that reason.
  const clinchedSwatch = (
    <span style={{
      boxSizing: 'border-box', width: '15px', height: '15px', borderRadius: '50%',
      border: `2px solid ${PLAYOFF.wildcardRing}`, background: PLAYOFF.wildcardFill,
      display: 'block',
    }} />
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
      {item(swatch(PLAYOFF.topSeedRing, PLAYOFF.topSeedFill, PLAYOFF.topSeedText), 'TOP SEED')}
      {item(swatch(PLAYOFF.divisionRing, PLAYOFF.divisionFill), 'DIVISION SEED')}
      {item(<TrophyIcon size={14} />, 'DIVISION WON')}
      {item(clinchedSwatch, 'CLINCHED')}
      {item(<span style={{ ...font(800, 11), color: ACCENT.negative }}>×</span>, 'ELIMINATED')}
    </div>
  )
}

/** Skeleton the bodies and keep the toolbar in place so the page does not jump. */
const StandingsSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
    {[0, 1].map(i => (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ width: '180px', height: '20px', background: BG.card }} />
        <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}` }}>
          {Array.from({ length: 8 }).map((_, r) => (
            <div key={r} style={{
              height: '52px',
              borderBottom: r < 7 ? `1px solid ${BORDER.hairline}` : 'none',
            }} />
          ))}
        </div>
      </div>
    ))}
  </div>
)

export default StandingsPage
