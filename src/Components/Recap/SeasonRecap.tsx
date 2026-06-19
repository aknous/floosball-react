import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSeasonRecap } from '@/hooks/useSeasonRecap'
import PlayerLink from '@/Components/PlayerLink'
import TeamHoverCard from '@/Components/TeamHoverCard'
import { Stars as AppStars, calcStars } from '@/Components/Stars'
import HoverTooltip from '@/Components/HoverTooltip'
import { useIsMobile } from '@/hooks/useIsMobile'
import type {
  RecapTransaction, RecapEventType, RecapPlayerStub, RecapAwards,
  RecapLeagueStandings, RecapLeaderCategory, RecapUserLeaderboards, RecapUserLbEntry, RecapShowcaseEntry,
} from '@/types/recap'

const CARD: React.CSSProperties = { backgroundColor: '#1e2d3d', border: '1px solid #2a3a4e', borderRadius: '10px' }
const SECTION_H: React.CSSProperties = { fontSize: '16px', fontWeight: 700, color: '#e2e8f0', margin: '0 0 12px' }
const LABEL: React.CSSProperties = { fontSize: '12px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }
const STAT_HEAD: React.CSSProperties = { fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', textAlign: 'right' }
const STAT_CELL: React.CSSProperties = { fontSize: '13px', fontVariantNumeric: 'tabular-nums', textAlign: 'right', flexShrink: 0 }

const POS_ORDER: Record<string, number> = { QB: 0, RB: 1, WR: 2, TE: 3, K: 4, S: 5, LB: 6, CB: 7, DE: 8 }

const MOVE_BADGE: Record<string, { label: string; color: string }> = {
  rookie_pick: { label: 'Drafted',   color: '#60a5fa' },
  fa_pick:     { label: 'Signed',    color: '#4ade80' },
  resign:      { label: 'Re-signed', color: '#2dd4bf' },
  promotion:   { label: 'Promoted',  color: '#c084fc' },
  cut:         { label: 'Cut',       color: '#f87171' },
  walked:      { label: 'Departed',  color: '#fbbf24' },
}

// Team name (+ optional avatar) → routes to /team/:id with a hover card.
const TeamLink: React.FC<{
  teamId?: number | null; abbr?: string | null; name?: string | null
  avatar?: boolean; avatarSize?: number; style?: React.CSSProperties
}> = ({ teamId, abbr, name, avatar = false, avatarSize = 18, style }) => {
  const label = name ?? abbr ?? '—'
  const inner = (
    <>
      {avatar && teamId != null && (
        <img src={`/avatars/${teamId}.png`} alt={abbr || ''} crossOrigin="anonymous"
          style={{ width: avatarSize, height: avatarSize, flexShrink: 0 }} />
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </>
  )
  if (teamId == null) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...style }}>{inner}</span>
  }
  return (
    <TeamHoverCard teamId={teamId}>
      <Link to={`/team/${teamId}`} style={{
        color: 'inherit', textDecoration: 'none', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: 0, ...style,
      }}>
        {inner}
      </Link>
    </TeamHoverCard>
  )
}

const PosBadge: React.FC<{ pos?: string | null }> = ({ pos }) => (
  pos ? <span style={{
    fontSize: '11px', fontWeight: 700, color: '#94a3b8', backgroundColor: 'rgba(148,163,184,0.14)',
    padding: '1px 6px', borderRadius: '4px', flexShrink: 0, minWidth: '30px', textAlign: 'center',
  }}>{pos}</span> : null
)

// Thin wrapper over the shared Stars: accepts a raw rating or a star count and
// uses the app-standard per-count colors (5 gold, 4 green, 3 blue, 2 gray, 1 red).
const Stars: React.FC<{ rating?: number | null; stars?: number | null; size?: number }> = ({ rating, stars, size = 13 }) => {
  const n = stars ?? (rating != null ? calcStars(rating) : 0)
  if (!n) return null
  return <span style={{ flexShrink: 0 }}><AppStars stars={n} size={size} /></span>
}

type Tab = 'results' | 'stats' | 'fans' | 'transactions'
const TABS: [Tab, string][] = [
  ['results', 'Results'], ['stats', 'Stats'], ['fans', 'Fans'], ['transactions', 'Transactions'],
]

export const SeasonRecap: React.FC = () => {
  const { recap, loading } = useSeasonRecap()
  const [tab, setTab] = useState<Tab>('results')
  const isMobile = useIsMobile()

  if (loading && !recap) {
    return <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>Loading recap...</div>
  }
  if (!recap || !recap.awards) {
    return <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No recap available.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <h1 style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
        Season {recap.season} Recap
      </h1>

      {/* Tab bar — scrolls horizontally on narrow screens so all four tabs stay reachable */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid #2a3a4e', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(([key, label]) => {
          const on = tab === key
          return (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: isMobile ? '9px 13px' : '10px 18px', fontSize: isMobile ? '13px' : '14px', fontWeight: 700, fontFamily: 'inherit',
              color: on ? '#e2e8f0' : '#94a3b8', backgroundColor: on ? '#1e293b' : 'transparent',
              border: 'none', borderBottom: on ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0, whiteSpace: 'nowrap',
            }}>{label}</button>
          )
        })}
      </div>

      {tab === 'results' && <ResultsTab awards={recap.awards} standings={recap.standings} leagueChampions={recap.leagueChampions} />}
      {tab === 'stats' && <StatsTab leaders={recap.leaders} />}
      {tab === 'fans' && <FansTab userLeaderboards={recap.userLeaderboards} />}
      {tab === 'transactions' && <TransactionsTab transactions={recap.transactions} />}
    </div>
  )
}

// One All-Pro slot row (shared by the Offense and Defense sub-grids).
const AllProRow: React.FC<{ p: RecapPlayerStub }> = ({ p }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#162231', minWidth: 0 }}>
    <PosBadge pos={p.position} />
    {p.teamId != null && <img src={`/avatars/${p.teamId}.png`} alt={p.teamAbbr || ''} crossOrigin="anonymous" style={{ width: 20, height: 20, flexShrink: 0 }} />}
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <PlayerLink playerId={p.id} playerName={p.name} style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
        <Stars rating={p.rating} stars={p.stars} size={12} />
        <TeamLink teamId={p.teamId} abbr={p.teamAbbr} style={{ fontSize: '12px', color: '#94a3b8' }} />
      </div>
    </div>
  </div>
)

// ── Results ──
const ResultsTab: React.FC<{ awards: RecapAwards; standings: RecapLeagueStandings[]; leagueChampions: number[] }> = ({ awards, standings, leagueChampions }) => {
  const isMobile = useIsMobile()
  const allProSorted = [...(awards.allPro || [])].sort((a, b) => (POS_ORDER[a.position || ''] ?? 9) - (POS_ORDER[b.position || ''] ?? 9))
  const hofClass = [...(awards.hofInductees || [])].sort((a, b) => (POS_ORDER[a.position || ''] ?? 9) - (POS_ORDER[b.position || ''] ?? 9))
  const champId = awards.champion?.id
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Champion + MVP */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ flex: '1 1 220px', padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.4)' }}>
          <div style={{ ...LABEL, color: '#eab308' }}>FLOOS BOWL CHAMPION</div>
          {awards.champion ? (
            <TeamLink teamId={awards.champion.id}
              name={[awards.champion.city, awards.champion.name].filter(Boolean).join(' ')}
              avatar avatarSize={34}
              style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginTop: '8px' }} />
          ) : <div style={{ fontSize: '15px', color: '#64748b', marginTop: '8px' }}>TBD</div>}
        </div>
        <div style={{ flex: '1 1 220px', padding: '14px', borderRadius: '10px', backgroundColor: '#162231' }}>
          <div style={{ ...LABEL, color: '#38bdf8' }}>SEASON MVP</div>
          {awards.mvp ? (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {awards.mvp.teamId != null && <img src={`/avatars/${awards.mvp.teamId}.png`} alt={awards.mvp.teamAbbr || ''} crossOrigin="anonymous" style={{ width: 30, height: 30, flexShrink: 0 }} />}
              <PosBadge pos={awards.mvp.position} />
              <PlayerLink playerId={awards.mvp.id} playerName={awards.mvp.name}
                style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0' }} />
              <Stars rating={awards.mvp.rating} stars={awards.mvp.stars} size={12} />
              <TeamLink teamId={awards.mvp.teamId} abbr={awards.mvp.teamAbbr}
                style={{ fontSize: '13px', color: '#94a3b8' }} />
            </div>
          ) : <div style={{ fontSize: '15px', color: '#64748b', marginTop: '8px' }}>TBD</div>}
        </div>
      </div>

      {/* All-Pro team — the six best players, by combined offensive + defensive value */}
      {allProSorted.length > 0 && (
        <div style={{ ...CARD, padding: '16px' }}>
          <h2 style={SECTION_H}>All-Pro Team</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
            {allProSorted.map(p => <AllProRow key={p.id} p={p} />)}
          </div>
        </div>
      )}

      {/* Hall of Fame class inducted this season */}
      {hofClass.length > 0 && (
        <div style={{ ...CARD, padding: '16px', border: '1px solid rgba(234,179,8,0.4)', backgroundColor: 'rgba(234,179,8,0.06)' }}>
          <h2 style={{ ...SECTION_H, color: '#eab308' }}>Hall of Fame Inductees</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
            {hofClass.map(p => <AllProRow key={p.id} p={p} />)}
          </div>
        </div>
      )}

      {/* Standings by league with champion badges */}
      <div style={{ ...CARD, padding: '16px' }}>
        <h2 style={SECTION_H}>Final Standings</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {standings.map(lg => (
            <div key={lg.league} style={{ flex: '1 1 340px', minWidth: 0 }}>
              <div style={{ ...LABEL, marginBottom: '6px' }}>{lg.league}</div>
              {/* column headers */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px 4px' }}>
                <span style={{ width: '18px' }} />
                <span style={{ flex: 1, ...STAT_HEAD, textAlign: 'left' }}>Team</span>
                <span style={{ width: '40px', ...STAT_HEAD }}>PCT</span>
                <span style={{ width: '42px', ...STAT_HEAD }}>DIFF</span>
                <span style={{ width: '42px', ...STAT_HEAD }}>ELO</span>
                <span style={{ width: '52px', ...STAT_HEAD }}>REC</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {lg.standings.map((t, i) => {
                  const isBowl = champId === t.teamId
                  const isLeague = leagueChampions.includes(t.teamId)
                  const diff = t.pointDiff ?? (t.pointsFor - t.pointsAgainst)
                  const diffColor = diff > 0 ? '#4ade80' : diff < 0 ? '#f87171' : '#94a3b8'
                  return (
                    <div key={t.teamId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', borderRadius: '6px', backgroundColor: i % 2 ? 'transparent' : '#162231' }}>
                      <span style={{ width: '18px', fontSize: '13px', color: '#64748b' }}>{i + 1}</span>
                      <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <TeamLink teamId={t.teamId} name={t.teamName} abbr={t.teamAbbr} avatar avatarSize={18}
                          style={{ fontSize: '14px', color: '#cbd5e1', minWidth: 0 }} />
                        {isBowl && <ChampBadge label="Floos Bowl" color="#eab308" />}
                        {!isBowl && isLeague && <ChampBadge label="League Champ" color="#94a3b8" />}
                      </span>
                      <span style={{ width: '40px', ...STAT_CELL, color: '#cbd5e1' }}>
                        {t.winPct.toFixed(3).replace(/^0/, '')}
                      </span>
                      <span style={{ width: '42px', ...STAT_CELL, color: diffColor }}>
                        {diff > 0 ? '+' : ''}{diff}
                      </span>
                      <span style={{ width: '42px', ...STAT_CELL, color: '#94a3b8' }}>
                        {t.elo != null ? t.elo : '—'}
                      </span>
                      <span style={{ width: '52px', ...STAT_CELL, color: '#e2e8f0', fontWeight: 700 }}>
                        {t.wins}-{t.losses}{t.ties ? `-${t.ties}` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Collapsible card section with a count chip in the header (keeps the
// Transactions tab manageable when it gets dense).
const CollapsibleSection: React.FC<{ title: string; count: number; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, count, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ ...CARD, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '13px 16px',
        background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span style={LABEL}>{title}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', backgroundColor: 'rgba(148,163,184,0.12)', padding: '1px 7px', borderRadius: '10px' }}>{count}</span>
      </button>
      {open && <div style={{ padding: '0 16px 14px' }}>{children}</div>}
    </div>
  )
}

const ChampBadge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 700, color, backgroundColor: `${color}22`, padding: '1px 6px', borderRadius: '4px', flexShrink: 0 }}>
    <svg width="10" height="10" viewBox="0 0 24 24" fill={color}><path d="M5 4h14v2a5 5 0 0 1-3 4.58A4 4 0 0 1 13 13v3h3v2H8v-2h3v-3a4 4 0 0 1-3-2.42A5 5 0 0 1 5 6V4Z" /></svg>
    {label}
  </span>
)

// ── Stats ──
const StatsTab: React.FC<{ leaders: RecapLeaderCategory[] }> = ({ leaders }) => {
  const [cat, setCat] = useState<string | null>(null)
  if (leaders.length === 0) return <div style={{ ...CARD, padding: '16px', color: '#64748b', fontSize: '14px' }}>No stats yet.</div>
  const activeCat = cat || leaders[0].category
  const active = leaders.find(l => l.category === activeCat)
  return (
    <div style={{ ...CARD, padding: '16px' }}>
      <h2 style={SECTION_H}>Stat Leaders</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
        {leaders.map(l => {
          const on = l.category === activeCat
          return (
            <button key={l.category} onClick={() => setCat(l.category)} style={{
              fontSize: '12px', fontWeight: 600, padding: '6px 11px', borderRadius: '6px', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', backgroundColor: on ? '#3b82f6' : '#0f172a', color: on ? '#fff' : '#94a3b8',
            }}>{l.label}</button>
          )
        })}
      </div>
      {active && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {active.leaders.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderRadius: '8px', backgroundColor: p.rank === 1 ? 'rgba(234,179,8,0.10)' : '#162231' }}>
              <span style={{ width: '22px', fontSize: '14px', fontWeight: 700, color: p.rank === 1 ? '#eab308' : '#94a3b8' }}>{p.rank}</span>
              <PosBadge pos={p.position} />
              {p.teamId != null && <img src={`/avatars/${p.teamId}.png`} alt={p.teamAbbr || ''} crossOrigin="anonymous" style={{ width: 20, height: 20, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PlayerLink playerId={p.id} playerName={p.name} style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }} />
                  <Stars rating={p.rating} stars={p.stars} />
                </div>
                <TeamLink teamId={p.teamId} abbr={p.teamAbbr} style={{ fontSize: '12px', color: '#64748b' }} />
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>{p.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Fans (user leaderboards) ──
const FanLbCol: React.FC<{ title: string; color: string; rows: RecapUserLbEntry[]; unit?: string }> = ({ title, color, rows, unit }) => (
  <div style={{ flex: '1 1 230px', minWidth: 0 }}>
    <div style={{ ...LABEL, color, marginBottom: '8px' }}>{title}</div>
    {rows.length === 0 ? <div style={{ fontSize: '13px', color: '#64748b' }}>No entries yet.</div> : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {rows.slice(0, 5).map(r => (
          <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', borderRadius: '6px', backgroundColor: r.rank === 1 ? 'rgba(234,179,8,0.10)' : 'transparent' }}>
            <span style={{ width: '16px', fontSize: '14px', fontWeight: 700, color: r.rank === 1 ? '#eab308' : '#64748b' }}>{r.rank}</span>
            {r.favoriteTeam?.teamId != null && (
              <img src={`/avatars/${r.favoriteTeam.teamId}.png`} alt={r.favoriteTeam.teamAbbr} crossOrigin="anonymous" style={{ width: 16, height: 16, flexShrink: 0 }} />
            )}
            <span style={{ flex: 1, fontSize: '14px', color: '#cbd5e1', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username}</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
              {r.totalPoints}{unit ? <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginLeft: '3px' }}>{unit}</span> : null}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
)

const ShowcaseLbCol: React.FC<{ rows: RecapShowcaseEntry[] }> = ({ rows }) => (
  <div style={{ flex: '1 1 230px', minWidth: 0 }}>
    <div style={{ ...LABEL, color: '#c084fc', marginBottom: '8px' }}>VAULT SHOWCASE <span style={{ fontWeight: 400, color: '#64748b' }}>(grade)</span></div>
    {rows.length === 0 ? <div style={{ fontSize: '13px', color: '#64748b' }}>No entries yet.</div> : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {rows.slice(0, 5).map(r => (
          <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', borderRadius: '6px', backgroundColor: r.rank === 1 ? 'rgba(234,179,8,0.10)' : 'transparent' }}>
            <span style={{ width: '16px', fontSize: '14px', fontWeight: 700, color: r.rank === 1 ? '#eab308' : '#64748b' }}>{r.rank}</span>
            {r.favoriteTeam?.teamId != null && (
              <img src={`/avatars/${r.favoriteTeam.teamId}.png`} alt={r.favoriteTeam.teamAbbr} crossOrigin="anonymous" style={{ width: 16, height: 16, flexShrink: 0 }} />
            )}
            <span style={{ flex: 1, fontSize: '14px', color: '#cbd5e1', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username}</span>
            <HoverTooltip text={`Grade ${r.grade} · ${r.cardCount} cards · ${r.estimatedPayout} Floobits payout`} color="#c084fc">
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#c084fc', minWidth: '22px', textAlign: 'right', display: 'inline-block' }}>{r.grade}</span>
            </HoverTooltip>
          </div>
        ))}
      </div>
    )}
  </div>
)

const FansTab: React.FC<{ userLeaderboards: RecapUserLeaderboards }> = ({ userLeaderboards }) => {
  const { fantasy, pickem, bracket, funding, showcase, sweptBoth } = userLeaderboards
  const empty = !fantasy?.length && !pickem?.length && !bracket?.length && !funding?.length && !showcase?.length
  return (
    <div style={{ ...CARD, padding: '16px' }}>
      <h2 style={SECTION_H}>Top Fans</h2>
      {empty && <div style={{ fontSize: '13px', color: '#64748b' }}>No fan results yet this season.</div>}
      {sweptBoth && (
        <div style={{ padding: '12px 14px', borderRadius: '10px', marginBottom: '14px', backgroundColor: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.45)' }}>
          <div style={{ ...LABEL, color: '#eab308' }}>THE SWEEP — #1 IN FANTASY AND PROGNOSTICATIONS</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fde68a', marginTop: '3px' }}>{sweptBoth.username}</div>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        <FanLbCol title="FANTASY" color="#4ade80" rows={fantasy ?? []} unit="FP" />
        <FanLbCol title="PROGNOSTICATIONS" color="#60a5fa" rows={pickem ?? []} unit="pts" />
        <FanLbCol title="BRACKET CHALLENGE" color="#f59e0b" rows={bracket ?? []} unit="pts" />
        <FanLbCol title="TEAM FUNDING" color="#2dd4bf" rows={funding ?? []} unit="F" />
        <ShowcaseLbCol rows={showcase ?? []} />
      </div>
    </div>
  )
}

// ── Transactions & Announcements ──
const TransactionsTab: React.FC<{ transactions: RecapTransaction[] }> = ({ transactions }) => {
  const isMobile = useIsMobile()
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
    return <div style={{ ...CARD, padding: '16px', color: '#64748b', fontSize: '14px' }}>No moves yet this offseason.</div>
  }

  const announce = (title: string, items: RecapTransaction[], render: (t: RecapTransaction) => React.ReactNode) =>
    items.length > 0 ? (
      <CollapsibleSection title={title} count={items.length}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{items.map(render)}</div>
      </CollapsibleSection>
    ) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {announce('RETIREMENTS', groups.retirements, t => (
        <div key={`ret-${t.playerId}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <PosBadge pos={t.position} />
          <PlayerLink playerId={t.playerId} playerName={t.playerName || '—'} style={{ fontWeight: 600, color: '#e2e8f0' }} />
          <Stars rating={t.rating} />
          <TeamLink teamId={t.teamId} abbr={t.teamAbbr} style={{ color: '#94a3b8', fontSize: '13px' }} />
          {t.detail && <span style={{ color: '#64748b', fontSize: '13px' }}>· {t.detail}</span>}
        </div>
      ))}

      {announce('HALL OF FAME', groups.hof, t => (
        <div key={`hof-${t.playerId}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <PosBadge pos={t.position} />
          <PlayerLink playerId={t.playerId} playerName={t.playerName || '—'} style={{ fontWeight: 700, color: '#fde68a' }} />
          <Stars rating={t.rating} />
          {t.teamName && <TeamLink teamId={t.teamId} name={t.teamName} style={{ color: '#a8a29e', fontSize: '13px' }} />}
        </div>
      ))}

      {announce('COACHING CHANGES', groups.coach, t => (
        <div key={`coach-${t.type}-${t.teamId}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#cbd5e1' }}>
          <span style={{ color: t.type === 'coach_fire' ? '#f87171' : '#4ade80', fontWeight: 700 }}>
            {t.type === 'coach_fire' ? 'Fired' : 'Hired'}
          </span>
          <span>{t.detail || 'coach'}</span>
          <TeamLink teamId={t.teamId} name={t.teamName} style={{ color: '#94a3b8', fontSize: '13px' }} />
        </div>
      ))}

      {groups.byTeam.size > 0 && (
        <CollapsibleSection title="ROSTER MOVES" count={Array.from(groups.byTeam.values()).reduce((n, a) => n + a.length, 0)}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {Array.from(groups.byTeam.entries()).map(([team, items]) => (
              <div key={team} style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#162231' }}>
                <TeamLink teamId={items[0]?.teamId} name={team} avatar avatarSize={18}
                  style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
                  {items.map((t, i) => {
                    const b = MOVE_BADGE[t.type] || { label: t.type, color: '#94a3b8' }
                    return (
                      <div key={`${t.type}-${t.playerId}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: b.color, backgroundColor: `${b.color}1f`, padding: '2px 6px', borderRadius: '3px', flexShrink: 0, minWidth: '64px', textAlign: 'center' }}>{b.label}</span>
                        <PlayerLink playerId={t.playerId} playerName={t.playerName || '—'} style={{ flex: 1, fontSize: '13px', color: '#cbd5e1', minWidth: 0 }} />
                        <Stars rating={t.rating} size={9} />
                        <PosBadge pos={t.position} />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}
