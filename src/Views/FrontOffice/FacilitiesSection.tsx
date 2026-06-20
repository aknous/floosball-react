import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import HoverTooltip from '@/Components/HoverTooltip'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// Levels use Roman numerals to match the app's tier convention.
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']
const roman = (n: number) => ROMAN[n] || String(n)

// Concrete per-level perk copy (mirrors the backend FACILITY effect curves;
// keep in sync if the curves are retuned). '' = no active bonus at that level.
const PERK: Record<string, string[]> = {
  training:    ['', '', '', '+1 player development', '+1 player development', '+2 player development'],
  locker_room: ['', '', '', 'minor in-game morale', 'moderate in-game morale', 'strong in-game morale'],
  recovery:    ['', '', '', '-15% fatigue buildup', '-30% fatigue buildup', '-35% fatigue buildup'],
  scouting:    ['', '', '', '+3 rookie scouting', '+5 rookie scouting', '+7 rookie scouting'],
  stadium:     ['', 'small home crowd', 'bigger home crowd', 'large home crowd', 'major home crowd', 'elite home crowd'],
}
const perkAt = (key: string, lvl: number) => (PERK[key] || [])[lvl] || ''
// short column labels for the league graph header
const SHORT_FAC: Record<string, string> = {
  training: 'Train', locker_room: 'Locker', recovery: 'Recov', scouting: 'Scout', stadium: 'Stadium',
}

const TIER_SHORT: Record<string, string> = {
  MEGA_MARKET: 'MEGA', LARGE_MARKET: 'LARGE', MID_MARKET: 'MID', SMALL_MARKET: 'SMALL',
}
const TIER_COLOR: Record<string, string> = {
  MEGA_MARKET: '#a78bfa', LARGE_MARKET: '#3b82f6', MID_MARKET: '#2dd4bf', SMALL_MARKET: '#f97316',
}
const FUND_AMOUNTS = [25, 50, 100]

// ── types ─────────────────────────────────────────────────────────────────
interface Facility { key: string; name: string; level: number; maxLevel: number; effect: string; upgrading: boolean; upkeepCost: number; upkeepFunded: number; upgradeCost: number }
interface Project { id: number; facilityKey: string; kind: string; targetLevel: number; cost: number; funded: number }
interface TeamFacilities { teamId: number; treasury: number; appeal: number; shareUnit: number; facilities: Facility[]; projects: Project[] }
interface Candidate { key: string; name: string; currentLevel: number; targetLevel: number; kind: string }
interface LeagueTeam { id: number; name: string; city: string; abbr: string; color: string; appeal: number; levels: Record<string, number>; fanCount: number; marketTier: string }

// ── small UI bits ─────────────────────────────────────────────────────────
function Bar({ pct, color, full }: { pct: number; color: string; full?: boolean }) {
  return (
    <div style={{ height: '7px', background: '#20303f', borderRadius: '5px', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: full ? '#22c55e' : color, transition: 'width .2s' }} />
    </div>
  )
}

function FundChips({ onFund, balance, max }: { onFund: (amt: number) => void; balance: number; max: number }) {
  return (
    <div style={{ display: 'flex', gap: '5px', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      {FUND_AMOUNTS.map(a => {
        const amt = Math.min(a, max)
        const disabled = balance < amt || max <= 0
        return (
          <button key={a} onClick={() => !disabled && onFund(amt)} disabled={disabled} style={{
            font: 'inherit', fontSize: '11px', fontWeight: 600, borderRadius: '5px', padding: '3px 9px',
            border: `1px solid ${disabled ? '#1e293b' : '#3b82f6'}`, background: disabled ? 'transparent' : '#2563eb1f',
            color: disabled ? '#475569' : '#93c5fd', cursor: disabled ? 'not-allowed' : 'pointer',
          }}>+{a}</button>
        )
      })}
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────
const FacilitiesSection: React.FC = () => {
  const { user, getToken } = useAuth()
  const favId = (user as any)?.favoriteTeamId ?? null
  const [data, setData] = useState<TeamFacilities | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [myVote, setMyVote] = useState<string | null>(null)
  const [league, setLeague] = useState<LeagueTeam[]>([])
  const [catalog, setCatalog] = useState<Record<string, string>>({})
  const [balance, setBalance] = useState<number>((user as any)?.floobits ?? 0)
  const [pct, setPct] = useState<number>((user as any)?.teamFundingPct ?? 25)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const reqs: Promise<any>[] = [
      fetch(`${API_BASE}/league/facilities`).then(r => r.json()).catch(() => null),
    ]
    if (favId) {
      reqs.push(fetch(`${API_BASE}/teams/${favId}/facilities`).then(r => r.json()).catch(() => null))
      const tok = await getToken().catch(() => null)
      reqs.push(fetch(`${API_BASE}/teams/${favId}/facilities/vote`, tok ? { headers: { Authorization: `Bearer ${tok}` } } : {}).then(r => r.json()).catch(() => null))
    }
    const [lg, fac, vote] = await Promise.all(reqs)
    if (lg?.success) { setLeague(lg.data.teams || []); setCatalog(lg.data.facilityCatalog || {}) }
    if (fac?.success) setData(fac.data)
    if (vote?.success) { setCandidates(vote.data.candidates || []); setMyVote(vote.data.myVote ?? null) }
    setLoading(false)
  }, [favId, getToken])

  useEffect(() => { load() }, [load])
  useEffect(() => { setBalance((user as any)?.floobits ?? 0) }, [user])

  const contribute = useCallback(async (amount: number, target: string, extra: Record<string, any> = {}) => {
    if (!favId || busy || amount <= 0) return
    setBusy(true)
    try {
      const tok = await getToken()
      const resp = await fetch(`${API_BASE}/teams/${favId}/facilities/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify({ amount, target, ...extra }),
      })
      const j = await resp.json()
      if (resp.ok) { setBalance(j.data?.newBalance ?? balance - amount); await load() }
    } finally { setBusy(false) }
  }, [favId, busy, getToken, balance, load])

  const setAutoPct = useCallback(async (p: number) => {
    setPct(p)
    const tok = await getToken().catch(() => null)
    if (!tok) return
    fetch(`${API_BASE}/users/me/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ teamFundingPct: p }),
    }).catch(() => {})
  }, [getToken])

  const castVote = useCallback(async (facilityKey: string) => {
    if (!favId || busy) return
    setBusy(true); setMyVote(facilityKey)
    try {
      const tok = await getToken()
      await fetch(`${API_BASE}/teams/${favId}/facilities/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify({ facilityKey }),
      })
    } finally { setBusy(false) }
  }, [favId, busy, getToken])

  if (loading) return <div style={{ color: '#64748b', padding: '20px', fontSize: '13px' }}>Loading facilities…</div>

  const tierColor = data ? TIER_COLOR[league.find(t => t.id === data.teamId)?.marketTier || 'MID_MARKET'] : '#2dd4bf'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', color: '#e2e8f0' }}>
      {!favId && <div style={{ color: '#94a3b8', fontSize: '13px' }}>Pick a favorite team to manage its facilities.</div>}

      {data && (
        <>
          {/* header strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
            background: 'linear-gradient(135deg,#11202e,#16273a)', border: '1px solid #243446', borderRadius: '10px', padding: '11px 16px' }}>
            {([
              ['Market', TIER_SHORT[league.find(t => t.id === data.teamId)?.marketTier || 'MID_MARKET'], tierColor],
              ['Appeal', `${Math.round(data.appeal)} · FA #${faRankOf(league, data.teamId)}`, '#2dd4bf'],
              ['Treasury', data.treasury.toLocaleString(), '#fbbf24'],
              ['Your F', balance.toLocaleString(), '#cbd5e1'],
            ] as [string, string, string][]).map(([l, v, c]) => (
              <div key={l} style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', color: '#94a3b8' }}>{l}</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: c }}>{v}</span>
              </div>
            ))}
          </div>

          {/* season-end auto-deposit % */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', color: '#94a3b8', fontWeight: 700, marginRight: '4px' }}>Season-end deposit</span>
            {[0, 10, 25, 50, 75, 100].map(p => (
              <button key={p} onClick={() => setAutoPct(p)} style={{
                padding: '5px 11px', fontSize: '12px', fontWeight: pct === p ? 700 : 500, borderRadius: '4px',
                border: `1px solid ${pct === p ? tierColor : '#334155'}`, background: pct === p ? `${tierColor}20` : 'transparent',
                color: pct === p ? tierColor : '#cbd5e1', cursor: 'pointer',
              }}>{p}%</button>
            ))}
            <span style={{ fontSize: '11px', color: '#7e93a8', marginLeft: '4px' }}>of your unspent Floobits funds the Treasury at season end</span>
          </div>

          {/* current facilities */}
          <section>
            <SectionHead title="Current Facilities" hint="keep upkeep funded so facilities hold their level" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '8px' }}>
              {data.facilities.map(f => <FacilityTile key={f.key} f={f} balance={balance} onFund={(amt) => contribute(amt, 'upkeep', { facilityKey: f.key })} />)}
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="fac-cols">
            {/* active projects */}
            <section>
              <SectionHead title="Active Projects" hint="fund to finish" />
              {data.projects.length ? data.projects.map(p => {
                const fac = data.facilities.find(x => x.key === p.facilityKey)
                return <ProjectCard key={p.id} p={p} name={catalog[p.facilityKey] || p.facilityKey} fromLvl={fac?.level ?? p.targetLevel - 1} balance={balance} onFund={(amt) => contribute(amt, 'project', { projectId: p.id })} />
              }) : <div style={{ fontSize: '12.5px', color: '#94a3b8', padding: '6px 2px' }}>No project in progress. The ballot winner starts one next season.</div>}
            </section>

            {/* ballot */}
            <section>
              <SectionHead title="Project Ballot" hint="one vote · winner starts next season" />
              {candidates.map(c => <BallotCard key={c.key} c={c} selected={myVote === c.key} onVote={() => castVote(c.key)} />)}
              {!candidates.length && <div style={{ fontSize: '12px', color: '#64748b', padding: '6px 2px' }}>Every facility is maxed or in progress.</div>}
            </section>
          </div>
        </>
      )}

      {/* league graphs */}
      <section>
        <SectionHead title="League Facilities & Appeal" hint="best-equipped clubs draft free agents first" />
        <AppealGraph teams={league} catalog={catalog} favId={favId} />
      </section>
      <section>
        <SectionHead title="League Fanbase" hint="how many fans each team has, which sets the Market tier" />
        <FanGraph teams={league} favId={favId} />
      </section>
    </div>
  )
}

function faRankOf(league: LeagueTeam[], teamId: number): number {
  const sorted = [...league].sort((a, b) => b.appeal - a.appeal || b.fanCount - a.fanCount)
  const i = sorted.findIndex(t => t.id === teamId)
  return i >= 0 ? i + 1 : league.length
}

function SectionHead({ title, hint }: { title: string; hint: string }) {
  return (
    <h2 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.08em', color: '#cbd5e1', margin: '0 0 8px', display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
      {title}<span style={{ fontSize: '11.5px', textTransform: 'none', letterSpacing: 0, color: '#94a3b8', fontWeight: 400 }}>{hint}</span>
    </h2>
  )
}

function FacilityTile({ f, balance, onFund }: { f: Facility; balance: number; onFund: (amt: number) => void }) {
  const perk = perkAt(f.key, f.level)
  const covered = f.upkeepFunded >= f.upkeepCost
  return (
    <div style={{ background: '#15202d', border: `1px solid ${f.upgrading ? '#3a2d5c' : '#243446'}`, borderRadius: '8px', padding: '10px 11px' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
        <span>{f.name}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', background: '#223', padding: '1px 7px', borderRadius: '10px', border: '1px solid #33465b' }}>{roman(f.level)}</span>
      </div>
      <div style={{ fontSize: '12.5px', color: perk ? '#cbd5e1' : '#64748b', margin: '5px 0 7px', minHeight: '16px' }}>{perk || 'no bonus yet'}</div>
      {f.upgrading ? (
        <div style={{ fontSize: '12px', color: '#a78bfa' }}>upkeep paused while upgrading</div>
      ) : covered ? (
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>upkeep {f.upkeepCost} F/yr · <span style={{ color: '#4ade80' }}>covered</span></div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
            <span>upkeep</span><span><b style={{ color: '#cbd5e1' }}>{f.upkeepFunded}/{f.upkeepCost}</b> F/yr</span>
          </div>
          <Bar pct={f.upkeepCost ? (f.upkeepFunded / f.upkeepCost) * 100 : 100} color="#3b82f6" />
          <FundChips onFund={onFund} balance={balance} max={f.upkeepCost - f.upkeepFunded} />
        </>
      )}
    </div>
  )
}

function ProjectCard({ p, name, fromLvl, balance, onFund }: { p: Project; name: string; fromLvl: number; balance: number; onFund: (amt: number) => void }) {
  const pct = p.cost ? (p.funded / p.cost) * 100 : 0
  const full = p.funded >= p.cost
  return (
    <div style={{ background: '#15202d', border: '1px solid #3a2d5c', borderRadius: '9px', padding: '11px 13px', marginBottom: '9px' }}>
      <div style={{ fontSize: '14px', fontWeight: 700 }}>{name} {roman(fromLvl)} → {roman(p.targetLevel)}</div>
      <div style={{ fontSize: '12.5px', marginTop: '6px' }}>Unlocks: <span style={{ color: '#2dd4bf', fontWeight: 600 }}>{perkAt(p.facilityKey, p.targetLevel) || 'foundational level'}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#94a3b8', marginTop: '8px' }}>
        <span>build</span><b style={{ color: '#cbd5e1' }}>{p.funded.toLocaleString()} / {p.cost.toLocaleString()} F</b>
      </div>
      <div style={{ marginTop: '5px' }}><Bar pct={pct} color="#a78bfa" full={full} /></div>
      {full ? <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#a78bfa', marginTop: '6px' }}>Funded ✓ builds next season</div>
            : <FundChips onFund={onFund} balance={balance} max={p.cost - p.funded} />}
    </div>
  )
}

function BallotCard({ c, selected, onVote }: { c: Candidate; selected: boolean; onVote: () => void }) {
  return (
    <div onClick={onVote} style={{ background: selected ? '#13243a' : '#15202d', border: `1px solid ${selected ? '#3b82f6' : '#243446'}`, borderRadius: '9px', padding: '11px 13px', marginBottom: '9px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <div style={{ width: '15px', height: '15px', borderRadius: '50%', border: '2px solid #3a4d63', flexShrink: 0, background: selected ? 'radial-gradient(#3b82f6 38%,transparent 44%)' : undefined, borderColor: selected ? '#3b82f6' : '#3a4d63' }} />
        <span style={{ fontSize: '14px', fontWeight: 700 }}>{c.name}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', background: '#223', padding: '1px 7px', borderRadius: '10px', border: '1px solid #33465b', marginLeft: 'auto' }}>{roman(c.currentLevel)} → {roman(c.targetLevel)}</span>
      </div>
      <div style={{ fontSize: '12.5px', marginTop: '6px' }}>Unlocks: <span style={{ color: '#2dd4bf', fontWeight: 600 }}>{perkAt(c.key, c.targetLevel) || 'foundational level'}</span></div>
    </div>
  )
}

// league facilities + appeal: each team a row of level pips + an appeal number
function AppealGraph({ teams, catalog, favId }: { teams: LeagueTeam[]; catalog: Record<string, string>; favId: number | null }) {
  const keys = Object.keys(catalog)
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* facility-name column header */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 40px', gap: '10px', alignItems: 'center', padding: '0 8px 6px', borderBottom: '1px solid #1e293b', marginBottom: '2px' }}>
        <span style={{ fontSize: '10px', color: '#7e93a8', fontWeight: 700 }}>TEAM</span>
        <span style={{ display: 'flex', gap: '4px' }}>
          {keys.map(k => <span key={k} style={{ flex: 1, fontSize: '10px', color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>{SHORT_FAC[k] || catalog[k]}</span>)}
        </span>
        <span style={{ fontSize: '10px', color: '#2dd4bf', fontWeight: 700, textAlign: 'right' }}>APPEAL</span>
      </div>
      {teams.map(t => {
        const isFav = t.id === favId
        const tip = (
          <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, color: t.color, marginBottom: '4px' }}>{t.city} {t.name}</div>
            <div>Appeal: <strong>{Math.round(t.appeal)}</strong></div>
            {keys.map(k => <div key={k}>{catalog[k]}: <strong>{t.levels[k] ? roman(t.levels[k]) : 'not built'}</strong></div>)}
          </div>
        )
        return (
          <Link key={t.id} to={`/team/${t.id}`} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 40px', gap: '10px', alignItems: 'center', padding: '3px 8px', borderRadius: '3px', textDecoration: 'none',
            background: isFav ? `${t.color}15` : 'transparent', border: `1px solid ${isFav ? t.color : 'transparent'}` }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#cbd5e1' }}>{t.abbr}</span>
            <HoverTooltip content={tip} color={t.color}>
              <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {keys.map(k => {
                  const lvl = t.levels[k] || 0
                  return <span key={k} style={{ flex: 1, display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ flex: 1, height: '11px', borderRadius: '2px', background: i <= lvl ? t.color : '#1e2a38', opacity: i <= lvl ? 1 : 0.5 }} />)}
                  </span>
                })}
              </span>
            </HoverTooltip>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#2dd4bf', textAlign: 'right' }}>{Math.round(t.appeal)}</span>
          </Link>
        )
      })}
    </div>
  )
}

// fan-count bars (kept from the old Markets fan chart, simplified to fan count)
function FanGraph({ teams, favId }: { teams: LeagueTeam[]; favId: number | null }) {
  const sorted = [...teams].sort((a, b) => b.fanCount - a.fanCount)
  const maxFans = Math.max(1, ...sorted.map(t => t.fanCount))
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {sorted.map(t => {
        const isFav = t.id === favId
        const tip = (
          <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, color: t.color, marginBottom: '4px' }}>{t.city} {t.name}</div>
            <div>Fans: <strong>{t.fanCount.toLocaleString()}</strong></div>
            <div>Market: <strong style={{ color: TIER_COLOR[t.marketTier] }}>{TIER_SHORT[t.marketTier]}</strong></div>
          </div>
        )
        return (
          <Link key={t.id} to={`/team/${t.id}`} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 40px', gap: '10px', alignItems: 'center', padding: '3px 8px', borderRadius: '3px', textDecoration: 'none',
            background: isFav ? `${t.color}15` : 'transparent', border: `1px solid ${isFav ? t.color : 'transparent'}` }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#cbd5e1' }}>{t.abbr}</span>
            <HoverTooltip content={tip} color={t.color}>
              <span style={{ display: 'block', height: '12px' }}>
                <span style={{ display: 'block', height: '100%', width: `${(t.fanCount / maxFans) * 100}%`, background: t.color, opacity: 0.9, borderRadius: '2px', minWidth: '2px' }} />
              </span>
            </HoverTooltip>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#94a3b8', textAlign: 'right' }}>{t.fanCount}</span>
          </Link>
        )
      })}
    </div>
  )
}

export default FacilitiesSection
