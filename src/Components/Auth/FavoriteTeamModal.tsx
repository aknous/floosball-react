import React, { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BG, BORDER, TEXT, ACCENT, FONT, font } from '@/Components/Shell/tokens'
import { Crest } from '@/Views/GameBoard/boardPieces'
import { readableTeamColor } from '@/utils/colors'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * Pick a team to follow.
 *
 * ⚠️ Grouped by LEAGUE and DIVISION (owner), which is why this reads `/api/standings`
 * rather than `/api/teams`. The teams endpoint carries no league or division at all —
 * it is a flat list, which is exactly what the old alphabetical two-column list had to
 * be. Standings already returns leagues, their divisions in the owner's config order,
 * and a row per team with the crest color, so the shape the picker wants is a fetch
 * that already exists.
 *
 * The grouping is not decoration: at 32 teams an alphabetical list asks a newcomer to
 * scan for a name they do not have yet, while divisions give them somewhere to start
 * and teach the league's shape on the way past.
 */

interface PickTeam {
  id: number
  city: string
  name: string
  abbr: string
  color?: string
  division?: string | null
}

interface LeagueBlock {
  name: string
  divisions: { name: string; teams: PickTeam[] }[]
}

export const FavoriteTeamModal: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible, onClose,
}) => {
  const { setFavoriteTeam, user } = useAuth()
  // Undefined on an older payload — treat that as open, which matches how the server
  // behaves for a first pick and never promises a lock that is not there.
  const windowOpen = user?.canChangeFavoriteTeam !== false
  const isMobile = useIsMobile()
  const [leagues, setLeagues] = useState<LeagueBlock[]>([])
  const [confirmTeam, setConfirmTeam] = useState<PickTeam | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    fetch(`${API_BASE}/standings`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return
        const raw = Array.isArray(json) ? json : (json?.data ?? [])
        setLeagues(raw.map((lg: any) => {
          const byId = new Map<number, any>((lg.standings ?? []).map((t: any) => [Number(t.id), t]))
          const order: { name: string; teams: PickTeam[] }[] = (lg.divisions ?? []).map((d: any) => ({
            name: d.name,
            teams: (d.teamIds ?? []).map((id: number) => byId.get(Number(id))).filter(Boolean),
          }))
          // A team the divisions map somehow misses still has to be pickable.
          const seen = new Set(order.flatMap(d => d.teams.map((t: any) => Number(t.id))))
          const orphans = (lg.standings ?? []).filter((t: any) => !seen.has(Number(t.id)))
          if (orphans.length) order.push({ name: 'Other', teams: orphans })
          return { name: lg.name, divisions: order.filter(d => d.teams.length) }
        }))
      })
      .catch(() => { /* the modal shows its empty state */ })
    return () => { cancelled = true }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, onClose])

  useEffect(() => {
    if (!visible) { setConfirmTeam(null); setPendingMessage(null) }
  }, [visible])

  const hasFavorite = user?.favoriteTeamId != null

  const handleConfirm = async () => {
    if (!confirmTeam || saving) return
    setSaving(true)
    setPendingMessage(null)
    try {
      await setFavoriteTeam(confirmTeam.id)
      if (user?.pendingFavoriteTeamId === confirmTeam.id) {
        setPendingMessage(
          `Your change to the ${confirmTeam.name} takes effect next season.`)
      } else {
        onClose()
      }
    } finally {
      setSaving(false)
      setConfirmTeam(null)
    }
  }

  const total = useMemo(
    () => leagues.reduce((n, lg) => n + lg.divisions.reduce((m, d) => m + d.teams.length, 0), 0),
    [leagues],
  )

  if (!visible) return null

  const tile = (team: PickTeam) => {
    const current = user?.favoriteTeamId === team.id
    return (
      <button
        key={team.id}
        onClick={() => { if (!saving && !current) setConfirmTeam(team) }}
        className="plate"
        style={{
          display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
          background: current ? BG.cardOwn : BG.card,
          border: `1px solid ${current ? ACCENT.live : BORDER.hairline}`,
          padding: '8px 11px', cursor: current ? 'default' : 'pointer',
          fontFamily: FONT, minWidth: 0,
        }}
      >
        <Crest teamId={team.id} size={30} />
        <span style={{ minWidth: 0 }}>
          <span style={{
            display: 'block', ...font(500, 12, 1, '0.06em'), color: TEXT.muted,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{team.city}</span>
          <span style={{
            display: 'block', ...font(800, 15, 1.2, '-0.01em'),
            color: readableTeamColor(team.color || '#94a3b8'),
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{team.name}</span>
        </span>
      </button>
    )
  }

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(2,6,23,0.82)',
        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center', padding: isMobile ? 0 : '18px',
        fontFamily: FONT,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: isMobile ? '100%' : '880px',
          maxHeight: isMobile ? '94vh' : '88vh',
          background: BG.shell, border: `1px solid ${BORDER.raised}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '15px 20px 13px', borderBottom: `1px solid ${BORDER.hairline}`,
          flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: '14px',
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ ...font(800, 23, 1.15, '-0.02em'), color: TEXT.primary, margin: 0 }}>
              {hasFavorite ? 'Change your team' : 'Pick a team to follow'}
            </h2>
            {/* ⚠️ Two different promises, and saying the wrong one is worse than
                saying nothing. Switching is free right up to the first kickoff of
                week 1; after that a switch is booked for next season instead. */}
            <p style={{ ...font(400, 13, 1.5), color: TEXT.secondary, margin: '7px 0 0' }}>
              Their games are highlighted across the app and they get a panel on the
              front page.{' '}
              {!hasFavorite
                ? 'You can change this until week 1 kicks off.'
                : windowOpen
                  ? 'You can still switch freely until week 1 kicks off.'
                  : 'Week 1 has started, so a switch now takes effect next season.'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              ...font(700, 14, 1), color: TEXT.muted, background: 'transparent',
              border: `1px solid ${BORDER.raised}`, padding: '5px 9px',
              cursor: 'pointer', fontFamily: FONT, flexShrink: 0,
            }}
          >✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '2px 20px 14px', flex: 1 }}>
          {total === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', ...font(400, 14), color: TEXT.muted }}>
              Loading the league.
            </div>
          ) : leagues.map(lg => (
            <div key={lg.name} style={{ marginTop: '14px' }}>
              <div style={{
                ...font(800, 14, 1, '0.12em'), color: TEXT.strong,
                paddingBottom: '7px', borderBottom: `1px solid ${BORDER.raised}`,
              }}>{lg.name.toUpperCase()}</div>

              {lg.divisions.map(div => (
                /* ⚠️ The division label sits BESIDE its row, not above it. Stacked, eight
                   of them cost eight extra lines of height for one word each, and that
                   was most of why the last row needed scrolling to reach. */
                <div key={div.name} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px',
                }}>
                  {!isMobile && (
                    <div style={{
                      ...font(700, 12, 1, '0.14em'), color: TEXT.muted,
                      width: '104px', flexShrink: 0, textAlign: 'right',
                    }}>{div.name.toUpperCase()}</div>
                  )}
                  {isMobile && (
                    <div style={{ ...font(700, 11, 1, '0.14em'), color: TEXT.muted }}>
                      {div.name.toUpperCase()}
                    </div>
                  )}
                  <div style={{
                    display: 'grid', flex: 1, minWidth: 0,
                    gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, minmax(0, 1fr))`,
                    gap: '7px',
                  }}>
                    {div.teams.map(tile)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* The confirm step is a BAND, not a second dialog. A switch after kickoff is
            locked in for a season, so it deserves a deliberate second action, but
            stacking a modal on a modal to get one loses the grid the reader was just
            looking at. */}
        {confirmTeam ? (
          <div style={{
            flexShrink: 0, borderTop: `1px solid ${BORDER.raised}`, background: BG.panel,
            padding: '13px 20px', display: 'flex', alignItems: 'center', gap: '12px',
            flexWrap: 'wrap',
          }}>
            <Crest teamId={confirmTeam.id} size={26} />
            <span style={{ ...font(600, 14), color: TEXT.secondary, minWidth: 0 }}>
              Follow the{' '}
              <span style={{ ...font(800, 14), color: readableTeamColor(confirmTeam.color || '#94a3b8') }}>
                {confirmTeam.city} {confirmTeam.name}
              </span>
              {windowOpen || !hasFavorite ? '?' : ' from next season?'}
            </span>
            <span style={{ flex: 1 }} />
            <button
              onClick={() => setConfirmTeam(null)}
              style={{
                ...font(700, 12, 1, '0.06em'), color: TEXT.secondary, background: 'transparent',
                border: `1px solid ${BORDER.raised}`, padding: '9px 14px',
                cursor: 'pointer', fontFamily: FONT,
              }}
            >BACK</button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              style={{
                ...font(700, 12, 1, '0.06em'), color: BG.shell, background: ACCENT.live,
                border: 'none', padding: '9px 16px',
                cursor: saving ? 'default' : 'pointer', fontFamily: FONT,
                opacity: saving ? 0.6 : 1,
              }}
            >{saving ? 'SAVING' : 'CONFIRM'}</button>
          </div>
        ) : (
          <div style={{
            flexShrink: 0, borderTop: `1px solid ${BORDER.hairline}`,
            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            {pendingMessage && (
              <span style={{ ...font(600, 13), color: ACCENT.warning }}>{pendingMessage}</span>
            )}
            <span style={{ flex: 1 }} />
            <button
              onClick={onClose}
              style={{
                ...font(600, 13), color: TEXT.muted, background: 'transparent',
                border: 'none', padding: '4px 2px', cursor: 'pointer', fontFamily: FONT,
              }}
            >Skip for now</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default FavoriteTeamModal
