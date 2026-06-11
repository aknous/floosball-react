import React, { useMemo, useState } from 'react'
import { useSeasonRecap } from '@/hooks/useSeasonRecap'
import type { RecapTransaction, RecapEventType, RecapPlayerStub } from '@/types/recap'

const CARD = { backgroundColor: '#1e2d3d', border: '1px solid #2a3a4e', borderRadius: '8px' }
const H2: React.CSSProperties = { fontSize: '14px', fontWeight: 700, color: '#e2e8f0', margin: '0 0 10px' }

// Movement event badges (color matches the action).
const MOVE_BADGE: Record<string, { label: string; color: string }> = {
  rookie_pick: { label: 'Drafted', color: '#60a5fa' },
  fa_pick:     { label: 'Signed',  color: '#4ade80' },
  resign:      { label: 'Re-signed', color: '#2dd4bf' },
  promotion:   { label: 'Promoted', color: '#c084fc' },
  cut:         { label: 'Cut',     color: '#f87171' },
  walked:      { label: 'Departed', color: '#fbbf24' },
}

const TierAvatar: React.FC<{ teamId?: number | null; abbr?: string | null; size?: number }> = ({ teamId, abbr, size = 18 }) => (
  teamId != null
    ? <img src={`/avatars/${teamId}.png`} alt={abbr || ''} crossOrigin="anonymous"
        style={{ width: size, height: size, flexShrink: 0 }} />
    : <span style={{ width: size, height: size, flexShrink: 0 }} />
)

export const SeasonRecap: React.FC = () => {
  const { recap, season, setSeason, loading } = useSeasonRecap()
  const [statCat, setStatCat] = useState<string | null>(null)

  if (loading && !recap) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Loading recap...</div>
  }
  if (!recap) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No recap available.</div>
  }

  const { awards, standings, leaders, transactions, userLeaderboards, showcase, seasonsAvailable } = recap
  const viewSeason = recap.season

  const activeCat = statCat || (leaders[0]?.category ?? null)
  const activeLeaders = leaders.find(l => l.category === activeCat)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header + season picker */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
          Season {viewSeason} Recap
        </h1>
        {seasonsAvailable.length > 1 && (
          <select
            value={season ?? recap.season}
            onChange={e => setSeason(Number(e.target.value))}
            style={{
              backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #334155',
              borderRadius: '6px', padding: '5px 8px', fontSize: '12px', fontFamily: 'inherit',
            }}
          >
            {seasonsAvailable.map(s => (
              <option key={s} value={s}>Season {s}{s === recap.currentSeason ? ' (current)' : ''}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Season Results ── */}
      <ResultsSection awards={awards} standings={standings} />

      {/* ── Stat Leaders ── */}
      {leaders.length > 0 && (
        <div style={{ ...CARD, padding: '14px' }}>
          <h2 style={H2}>Stat Leaders</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
            {leaders.map(l => {
              const on = l.category === activeCat
              return (
                <button key={l.category} onClick={() => setStatCat(l.category)} style={{
                  fontSize: '11px', fontWeight: 600, padding: '4px 9px', borderRadius: '5px',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  backgroundColor: on ? '#3b82f6' : '#0f172a', color: on ? '#fff' : '#94a3b8',
                }}>{l.label}</button>
              )
            })}
          </div>
          {activeLeaders && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {activeLeaders.leaders.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px',
                  borderRadius: '6px', backgroundColor: p.rank === 1 ? 'rgba(234,179,8,0.10)' : '#162231',
                }}>
                  <span style={{ width: '18px', fontSize: '12px', fontWeight: 700, color: p.rank === 1 ? '#eab308' : '#94a3b8' }}>{p.rank}</span>
                  <TierAvatar teamId={p.teamId} abbr={p.teamAbbr} />
                  <span style={{ flex: 1, fontSize: '13px', color: '#e2e8f0', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name} <span style={{ color: '#64748b', fontSize: '11px' }}>{p.position} · {p.teamAbbr}</span>
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>{p.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── User Leaderboards ── */}
      <UserSection userLeaderboards={userLeaderboards} showcase={showcase} />

      {/* ── Transactions & Announcements ── */}
      <TransactionsSection transactions={transactions} />
    </div>
  )
}

// ── Section: Season Results (awards + standings) ──
const ResultsSection: React.FC<{ awards: any; standings: any[] }> = ({ awards, standings }) => (
  <div style={{ ...CARD, padding: '14px' }}>
    <h2 style={H2}>Season Results</h2>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
      {/* Champion */}
      <div style={{ flex: '1 1 160px', padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.35)' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#eab308', letterSpacing: '0.05em' }}>FLOOS BOWL CHAMPION</div>
        {awards.champion ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <img src={`/avatars/${awards.champion.id}.png`} alt={awards.champion.abbr} crossOrigin="anonymous" style={{ width: 28, height: 28 }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>{awards.champion.name}</span>
          </div>
        ) : <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>TBD</div>}
      </div>
      {/* MVP */}
      <div style={{ flex: '1 1 160px', padding: '10px', borderRadius: '8px', backgroundColor: '#162231' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em' }}>MVP</div>
        {awards.mvp ? (
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginTop: '6px' }}>
            {awards.mvp.name} <span style={{ fontSize: '11px', color: '#64748b' }}>{awards.mvp.position} · {awards.mvp.teamAbbr}</span>
          </div>
        ) : <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>TBD</div>}
      </div>
    </div>

    {/* All-Pro team */}
    {awards.allPro?.length > 0 && (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>ALL-PRO TEAM</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {awards.allPro.map((p: RecapPlayerStub) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#162231' }}>
              <TierAvatar teamId={p.teamId} abbr={p.teamAbbr} size={16} />
              <span style={{ fontSize: '12px', color: '#e2e8f0' }}>{p.name}</span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>{p.position}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Standings by league */}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
      {standings.map((lg: any) => (
        <div key={lg.league} style={{ flex: '1 1 280px', minWidth: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>{lg.league}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {lg.standings.map((t: any, i: number) => (
              <div key={t.teamId} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 6px', borderRadius: '4px', backgroundColor: i % 2 ? 'transparent' : '#162231' }}>
                <span style={{ width: '16px', fontSize: '11px', color: '#64748b' }}>{i + 1}</span>
                <img src={`/avatars/${t.teamId}.png`} alt={t.teamAbbr} crossOrigin="anonymous" style={{ width: 16, height: 16 }} />
                <span style={{ flex: 1, fontSize: '12px', color: '#cbd5e1', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.teamName}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>{t.wins}-{t.losses}{t.ties ? `-${t.ties}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)

// ── Section: User leaderboards + top showcase ──
const UserSection: React.FC<{ userLeaderboards: any; showcase: any }> = ({ userLeaderboards, showcase }) => {
  const { fantasy, pickem, sweptBoth } = userLeaderboards
  if (!fantasy?.length && !pickem?.length && !showcase) return null
  const lbCol = (title: string, color: string, rows: any[]) => (
    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color, marginBottom: '6px' }}>{title}</div>
      {rows.length === 0 ? <div style={{ fontSize: '12px', color: '#64748b' }}>No entries.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {rows.slice(0, 5).map(r => (
            <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 6px', borderRadius: '4px', backgroundColor: r.rank === 1 ? 'rgba(234,179,8,0.10)' : 'transparent' }}>
              <span style={{ width: '16px', fontSize: '11px', fontWeight: 700, color: r.rank === 1 ? '#eab308' : '#64748b' }}>{r.rank}</span>
              <span style={{ flex: 1, fontSize: '12px', color: '#cbd5e1', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username}</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>{r.totalPoints}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
  return (
    <div style={{ ...CARD, padding: '14px' }}>
      <h2 style={H2}>Players of the Season</h2>
      {sweptBoth && (
        <div style={{ padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', backgroundColor: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.4)' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#eab308', letterSpacing: '0.05em' }}>THE SWEEP — #1 IN FANTASY AND PROGNOSTICATIONS</span>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fde68a', marginTop: '2px' }}>{sweptBoth.username}</div>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {lbCol('FANTASY', '#4ade80', fantasy ?? [])}
        {lbCol('PROGNOSTICATIONS', '#60a5fa', pickem ?? [])}
        {showcase && (
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc', marginBottom: '6px' }}>TOP SHOWCASE</div>
            <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: '#162231' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#c084fc' }}>{showcase.grade}</span>
                <span style={{ fontSize: '12px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{showcase.username}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                {showcase.cardCount} cards · {showcase.estimatedPayout} Floobits
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Section: Transactions & Announcements ──
const TransactionsSection: React.FC<{ transactions: RecapTransaction[] }> = ({ transactions }) => {
  const groups = useMemo(() => {
    const retirements = transactions.filter(t => t.type === 'retirement')
    const hof = transactions.filter(t => t.type === 'hof_induction')
    const coach = transactions.filter(t => t.type === 'coach_fire' || t.type === 'coach_hire')
    const moveTypes: RecapEventType[] = ['rookie_pick', 'fa_pick', 'resign', 'promotion', 'cut', 'walked']
    const byTeam = new Map<string, RecapTransaction[]>()
    for (const t of transactions) {
      if (!moveTypes.includes(t.type)) continue
      const key = t.teamName || t.teamAbbr || '—'
      if (!byTeam.has(key)) byTeam.set(key, [])
      byTeam.get(key)!.push(t)
    }
    return { retirements, hof, coach, byTeam }
  }, [transactions])

  if (transactions.length === 0) {
    return (
      <div style={{ ...CARD, padding: '14px' }}>
        <h2 style={H2}>Transactions &amp; Announcements</h2>
        <div style={{ fontSize: '12px', color: '#64748b' }}>No moves yet this offseason.</div>
      </div>
    )
  }

  const announce = (title: string, items: RecapTransaction[], render: (t: RecapTransaction) => React.ReactNode) =>
    items.length > 0 && (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>{title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>{items.map(render)}</div>
      </div>
    )

  return (
    <div style={{ ...CARD, padding: '14px' }}>
      <h2 style={H2}>Transactions &amp; Announcements</h2>

      {announce('RETIREMENTS', groups.retirements, t => (
        <div key={`ret-${t.playerId}`} style={{ fontSize: '12px', color: '#cbd5e1' }}>
          <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{t.playerName}</span>
          <span style={{ color: '#64748b' }}> {t.position}{t.teamAbbr ? ` · ${t.teamAbbr}` : ''}{t.detail ? ` · ${t.detail}` : ''}</span>
        </div>
      ))}

      {announce('HALL OF FAME', groups.hof, t => (
        <div key={`hof-${t.playerId}`} style={{ fontSize: '12px', color: '#fde68a' }}>
          <span style={{ fontWeight: 700 }}>{t.playerName}</span>
          <span style={{ color: '#a8a29e' }}> {t.position}{t.teamName ? ` · ${t.teamName}` : ''}</span>
        </div>
      ))}

      {announce('COACHING CHANGES', groups.coach, t => (
        <div key={`coach-${t.type}-${t.teamId}`} style={{ fontSize: '12px', color: '#cbd5e1' }}>
          <span style={{ color: t.type === 'coach_fire' ? '#f87171' : '#4ade80', fontWeight: 600 }}>
            {t.type === 'coach_fire' ? 'Fired' : 'Hired'}
          </span>
          <span> {t.detail || 'coach'} </span>
          <span style={{ color: '#64748b' }}>· {t.teamName}</span>
        </div>
      ))}

      {/* Player movement, grouped by team */}
      {groups.byTeam.size > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>ROSTER MOVES</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Array.from(groups.byTeam.entries()).map(([team, items]) => (
              <div key={team} style={{ flex: '1 1 220px', minWidth: 0, padding: '8px', borderRadius: '6px', backgroundColor: '#162231' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <TierAvatar teamId={items[0]?.teamId} abbr={items[0]?.teamAbbr} size={16} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>{team}</span>
                </div>
                {items.map((t, i) => {
                  const b = MOVE_BADGE[t.type] || { label: t.type, color: '#94a3b8' }
                  return (
                    <div key={`${t.type}-${t.playerId}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: b.color, backgroundColor: `${b.color}1f`, padding: '1px 5px', borderRadius: '3px', flexShrink: 0, minWidth: '52px', textAlign: 'center' }}>{b.label}</span>
                      <span style={{ flex: 1, fontSize: '12px', color: '#cbd5e1', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.playerName}</span>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>{t.position}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
