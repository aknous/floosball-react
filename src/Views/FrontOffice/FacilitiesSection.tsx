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
  training:    ['', 'Young players develop a little faster', 'Young players develop faster', 'Young players develop notably faster', 'Young players develop much faster', 'Young players develop dramatically faster'],
  locker_room: ['', '', '', 'Small pre-game morale boost', 'Moderate pre-game morale boost', 'Strong pre-game morale boost'],
  recovery:    ['', '', '', 'Players tire 15% slower', 'Players tire 30% slower', 'Players tire 35% slower'],
  scouting:    ['', '', '', 'Clearer read on draft prospects', 'Sharper read on draft prospects', 'Precise read on draft prospects'],
  stadium:     ['', 'Small home crowd', 'Bigger home crowd', 'Large home crowd', 'Major home crowd', 'Elite home crowd'],
}
const perkAt = (key: string, lvl: number) => (PERK[key] || [])[lvl] || ''
const SHORT_FAC: Record<string, string> = {
  training: 'Train', locker_room: 'Locker', recovery: 'Recov', scouting: 'Scout', stadium: 'Stadium',
}
// Quippy flavor per facility per level (0-5). Pure personality, no mechanics.
const QUIP: Record<string, string[]> = {
  training: [
    'A field, some cones, and hope.',
    'A squat rack and a stern whistle.',
    'Real weights, real treadmills, real sweat.',
    'Position coaches and film rooms that work.',
    'Pro-grade everything. Gains all but guaranteed.',
    'Sports science so advanced the other teams are suspicious.',
  ],
  locker_room: [
    'Just hooks on a wall in a room.',
    'Broken benches, communal lockers, and one flickering light.',
    'Carpet, lockers, and a faint smell of sweat.',
    'Comfy chairs and a shower that stays hot.',
    'Lounge, game room, and a well stocked snack bar.',
    'A clubhouse nobody wants to leave.',
  ],
  recovery: [
    'Ice borrowed from the concession stand.',
    'Ice baths and a great deal of tape.',
    'A trainer who knows everyone by name.',
    'Massage tables and a hot tub that works.',
    'Cryo chambers and oxygen therapy.',
    'Players heal faster than physics allows.',
  ],
  scouting: [
    'One guy with a hunch.',
    'Binoculars and a battered clipboard.',
    'A few scouts and a serious coffee budget.',
    'Regional scouts a well organized spreadsheet.',
    'Analysts with many large monitors.',
    'Know who will be a star before they\'re born.',
  ],
  stadium: [
    'Home games happen somewhere, technically.',
    'Bleachers, a hot dog cart, and big dreams.',
    'A roof. Most of one, anyway.',
    'A real stadium with real noise.',
    'Bright lights and a proper wall of sound.',
    'A cathedral to the sport.',
  ],
}
const quipAt = (key: string, lvl: number) => (QUIP[key] || [])[lvl] || ''
const TIER_SHORT: Record<string, string> = {
  MEGA_MARKET: 'MEGA', LARGE_MARKET: 'LARGE', MID_MARKET: 'MID', SMALL_MARKET: 'SMALL',
}
const TIER_COLOR: Record<string, string> = {
  MEGA_MARKET: '#a78bfa', LARGE_MARKET: '#3b82f6', MID_MARKET: '#2dd4bf', SMALL_MARKET: '#f97316',
}
const FUND_AMOUNTS = [25, 50, 100]
const BUILD = '#a78bfa'   // project / construction purple
const hex = (c: string, a: number) => `${c}${Math.round(a * 255).toString(16).padStart(2, '0')}`
// flavor-text treatment for the quips (italic + warm tone + a quote bar)
const QUIP_STYLE: React.CSSProperties = {
  fontSize: '12px', fontStyle: 'italic', color: '#caa46a', lineHeight: 1.35,
  borderLeft: '2px solid #3a4456', paddingLeft: '8px',
}

// scoped animations + hover states (inline styles can't do either)
const FAC_CSS = `
@keyframes facStripes { to { background-position: 36px 0; } }
.facChip { font: inherit; cursor: pointer; transition: all .12s; }
.facChip:disabled { cursor: not-allowed; }
.facChip:hover:not(:disabled) { border-color:#3b82f6 !important; background:#1d3654 !important; color:#bfdbfe !important; box-shadow:0 0 10px rgba(59,130,246,.28); }
.facVote { transition: border-color .14s, box-shadow .14s, background .14s; }
.facVote:hover { border-color:#3a506e; }
.facRow { transition: background .12s; }
.facRow:hover { background:#16263d !important; }
.facStripes { background-image: repeating-linear-gradient(45deg,#a78bfa 0 9px,#8b6ef0 9px 18px); background-size:36px 36px; animation: facStripes .9s linear infinite; }
`

// ── types ─────────────────────────────────────────────────────────────────
interface Facility { key: string; name: string; level: number; maxLevel: number; effect: string; upgrading: boolean; upkeepCost: number; upkeepFunded: number; upgradeCost: number }
interface Project { id: number; facilityKey: string; kind: string; targetLevel: number; cost: number; funded: number }
interface TeamFacilities { teamId: number; treasury: number; appeal: number; shareUnit: number; facilities: Facility[]; projects: Project[] }
interface Candidate { key: string; name: string; currentLevel: number; targetLevel: number; kind: string; cost: number; upkeep: number }
interface LeagueTeam { id: number; name: string; city: string; abbr: string; color: string; appeal: number; levels: Record<string, number>; fanCount: number; marketTier: string }

// ── small UI bits ─────────────────────────────────────────────────────────
function FundChips({ onFund, balance, max }: { onFund: (amt: number) => void; balance: number; max: number }) {
  return (
    <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
      {FUND_AMOUNTS.map(a => {
        const amt = Math.min(a, max)
        const disabled = balance < amt || max <= 0
        return (
          <button key={a} className="facChip" onClick={() => !disabled && onFund(amt)} disabled={disabled} style={{
            fontSize: '12px', fontWeight: 700, borderRadius: '6px', padding: '3px 10px',
            border: `1px solid ${disabled ? '#1e293b' : '#2f4a6b'}`, background: disabled ? 'transparent' : '#15293f',
            color: disabled ? '#475569' : '#93c5fd',
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

  const me = data ? league.find(t => t.id === data.teamId) : undefined
  const tierColor = TIER_COLOR[me?.marketTier || 'MID_MARKET']
  const accent = me?.color || tierColor   // the club's own color tints the tab

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#e2e8f0', fontFamily: 'pressStart, monospace' }}>
      <style>{FAC_CSS}</style>
      {!favId && <div style={{ color: '#94a3b8', fontSize: '13px' }}>Pick a favorite team to manage its facilities.</div>}

      {data && (
        <>
          {/* readout panel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '1px',
            background: '#2c3a4d', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
            {([
              ['Market', TIER_SHORT[me?.marketTier || 'MID_MARKET'], tierColor, 'Fanbase size'],
              ['Appeal', appealRank(data.appeal), '#34d399', 'Facility quality'],
              ['Free Agency', `#${faRankOf(league, data.teamId)} pick`, '#2dd4bf', 'Draft slot'],
              ['Treasury', `${data.treasury.toLocaleString()} F`, '#fbbf24', 'Build fund'],
            ] as [string, string, string, string][]).map(([l, v, c, sub]) => (
              <div key={l} style={{ background: '#1e293b', padding: '13px 15px' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.1em', color: '#94a3b8', fontWeight: 700 }}>{l}</div>
                <div style={{ fontSize: '21px', fontWeight: 800, margin: '5px 0 2px', color: c,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* season-end auto-deposit % */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.08em', color: '#94a3b8', fontWeight: 700, marginRight: '4px' }}>Season-end deposit</span>
            {[0, 10, 25, 50, 75, 100].map(p => (
              <button key={p} className="facChip" onClick={() => setAutoPct(p)} style={{
                padding: '5px 11px', fontSize: '12px', fontWeight: pct === p ? 700 : 500, borderRadius: '5px',
                border: `1px solid ${pct === p ? accent : '#334155'}`, background: pct === p ? hex(accent, 0.13) : 'transparent',
                color: pct === p ? accent : '#cbd5e1',
              }}>{p}%</button>
            ))}
            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>of unspent Floobits, into the Treasury at season end</span>
          </div>

          {/* current facilities */}
          <section>
            <SectionHead title="Your Facilities" hint="Keep upkeep funded so they hold their level" accent={accent} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(205px,1fr))', gap: '11px' }}>
              {data.facilities.map(f => <FacilityTile key={f.key} f={f} accent={accent} balance={balance} onFund={(amt) => contribute(amt, 'upkeep', { facilityKey: f.key })} />)}
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="fac-cols">
            {/* active projects */}
            <section>
              <SectionHead title="In Progress" hint="Fund to finish" accent={BUILD} />
              {data.projects.length ? data.projects.map(p => {
                const fac = data.facilities.find(x => x.key === p.facilityKey)
                return <ProjectCard key={p.id} p={p} name={catalog[p.facilityKey] || p.facilityKey} fromLvl={fac?.level ?? p.targetLevel - 1} balance={balance} onFund={(amt) => contribute(amt, 'project', { projectId: p.id })} />
              }) : <div style={{ fontSize: '12.5px', color: '#7e93a8', padding: '12px 14px', borderRadius: '9px', border: '1px dashed #2c3a4d', background: 'rgba(20,29,41,.5)' }}>Nothing under construction. The winning vote starts the next build.</div>}
            </section>

            {/* ballot */}
            <section>
              <SectionHead title="Project Vote" hint="What gets built next" accent={accent} />
              {candidates.map(c => <BallotCard key={c.key} c={c} accent={accent} selected={myVote === c.key} onVote={() => castVote(c.key)} />)}
              {!candidates.length && <div style={{ fontSize: '12px', color: '#64748b', padding: '6px 2px' }}>Every facility is maxed or in progress.</div>}
            </section>
          </div>
        </>
      )}

      {/* league readouts */}
      <section>
        <SectionHead title="League Facilities" hint="Best-equipped clubs draft free agents first" accent="#2dd4bf" />
        <AppealGraph teams={league} catalog={catalog} favId={favId} />
      </section>
      <section>
        <SectionHead title="League Fanbase" hint="How many fans each team has, which sets the Market tier" accent="#2dd4bf" />
        <FanGraph teams={league} favId={favId} />
      </section>
    </div>
  )
}

// league arrives already sorted in true FA draft order (appeal, then reverse
// standings) from the backend, so the array index IS the FA pick.
function faRankOf(league: LeagueTeam[], teamId: number): number {
  const i = league.findIndex(t => t.id === teamId)
  return i >= 0 ? i + 1 : league.length
}

// Appeal (facility quality) as a named rank. Appeal = sum of the 5 facility
// levels (0-25), so the per-facility average drives the band.
function appealRank(appeal: number): string {
  const avg = appeal / 5
  if (avg >= 4.2) return 'Palatial'
  if (avg >= 3.2) return 'Premier'
  if (avg >= 2.2) return 'Modern'
  if (avg >= 1.2) return 'Modest'
  return 'Barebones'
}

function SectionHead({ title, hint, accent }: { title: string; hint: string; accent: string }) {
  return (
    <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.12em', color: '#cbd5e1', margin: '0 0 11px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <span style={{ width: '4px', height: '15px', borderRadius: '2px', background: accent, flexShrink: 0 }} />
      {title}<span style={{ fontSize: '12px', textTransform: 'none', letterSpacing: 0, color: '#7e93a8', fontWeight: 400 }}>{hint}</span>
    </h2>
  )
}

function FacilityTile({ f, accent, balance, onFund }: { f: Facility; accent: string; balance: number; onFund: (amt: number) => void }) {
  const perk = perkAt(f.key, f.level)
  const quip = quipAt(f.key, f.level)
  const covered = f.upkeepFunded >= f.upkeepCost
  const c = f.upgrading ? BUILD : accent
  return (
    <div className="facRow" style={{
      background: '#1e293b',
      border: '1px solid #2c3a4d', borderTop: `2px solid ${c}`, borderRadius: '9px', padding: '12px 13px 13px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', lineHeight: 1.2 }}>
        {f.name} <span style={{ color: c }}>{roman(f.level)}</span>
      </div>
      <div style={{ ...QUIP_STYLE, minHeight: '32px', marginTop: '11px' }}>{quip}</div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: perk ? '#e2e8f0' : '#5b6b7d', marginTop: '3px' }}>{perk || 'No bonus yet'}</div>
      {f.upgrading ? (
        <div style={{ fontSize: '12px', color: BUILD, fontWeight: 600, letterSpacing: '.03em', marginTop: '10px' }}>UPKEEP PAUSED · UPGRADING</div>
      ) : covered ? (
        <div style={{ fontSize: '12px', color: '#7e93a8', marginTop: '10px' }}>Upkeep <span style={{ color: '#fbbf24' }}>{f.upkeepCost} F/season</span> · <span style={{ color: '#34d399', fontWeight: 700 }}>FUNDED</span></div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', margin: '10px 0 5px' }}>
            <span>Upkeep</span><b style={{ color: '#fbbf24' }}>{f.upkeepFunded}/{f.upkeepCost} F/season</b>
          </div>
          <div style={{ height: '6px', background: '#18293b', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${f.upkeepCost ? (f.upkeepFunded / f.upkeepCost) * 100 : 100}%`, height: '100%', background: '#3b82f6' }} />
          </div>
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
    <div style={{ background: '#1a1730', border: '1px solid #3a2d5c', borderLeft: `3px solid ${BUILD}`, borderRadius: '9px', padding: '13px 15px', marginBottom: '10px' }}>
      <div style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em' }}>{name} {roman(fromLvl)} → {roman(p.targetLevel)}</div>
      <div style={{ ...QUIP_STYLE, marginTop: '8px' }}>{quipAt(p.facilityKey, p.targetLevel)}</div>
      <div style={{ fontSize: '12.5px', marginTop: '4px' }}>Unlocks: <span style={{ color: '#2dd4bf', fontWeight: 600 }}>{perkAt(p.facilityKey, p.targetLevel) || 'Foundational level'}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', margin: '11px 0 5px' }}>
        <span style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>Build progress</span><b style={{ color: '#fbbf24' }}>{p.funded.toLocaleString()} / {p.cost.toLocaleString()} F</b>
      </div>
      <div style={{ height: '10px', background: '#181430', borderRadius: '6px', overflow: 'hidden', border: '1px solid #2a2147' }}>
        <div className={full ? '' : 'facStripes'} style={{ width: `${pct}%`, height: '100%',
          background: full ? '#22c55e' : undefined }} />
      </div>
      {full ? <div style={{ fontSize: '12px', fontWeight: 700, color: BUILD, marginTop: '7px' }}>Funded ✓ builds next season</div>
            : <FundChips onFund={onFund} balance={balance} max={p.cost - p.funded} />}
    </div>
  )
}

function BallotCard({ c, accent, selected, onVote }: { c: Candidate; accent: string; selected: boolean; onVote: () => void }) {
  return (
    <div className="facVote" onClick={onVote} style={{ position: 'relative', cursor: 'pointer', marginBottom: '10px',
      background: selected ? '#16243a' : '#1e293b',
      border: `1px solid ${selected ? accent : '#2c3a4d'}`, borderRadius: '9px', padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${selected ? accent : '#3a4d63'}`,
          background: selected ? `radial-gradient(${accent} 38%,transparent 44%)` : 'transparent' }} />
        <span style={{ fontSize: '13.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em' }}>{c.name} {roman(c.currentLevel)} → {roman(c.targetLevel)}</span>
      </div>
      <div style={{ ...QUIP_STYLE, marginTop: '8px' }}>{quipAt(c.key, c.targetLevel)}</div>
      <div style={{ fontSize: '12.5px', marginTop: '4px' }}>Unlocks: <span style={{ color: '#2dd4bf', fontWeight: 600 }}>{perkAt(c.key, c.targetLevel) || 'Foundational level'}</span></div>
      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>
        Build <b style={{ color: '#fbbf24' }}>{c.cost.toLocaleString()} F</b>, then upkeep <b style={{ color: '#fbbf24' }}>{c.upkeep.toLocaleString()} F/season</b>
      </div>
    </div>
  )
}

// per-team facility power meters + FA pick, in true FA draft order
function AppealGraph({ teams, catalog, favId }: { teams: LeagueTeam[]; catalog: Record<string, string>; favId: number | null }) {
  const keys = Object.keys(catalog)
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1d2c3e', borderRadius: '10px', padding: '6px 4px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 46px', gap: '12px', alignItems: 'center', padding: '5px 12px', borderBottom: '1px solid #1d2c3e' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.1em', color: '#7e93a8', fontWeight: 700 }}>Team</span>
        <span style={{ display: 'flex', gap: '4px' }}>
          {keys.map(k => <span key={k} style={{ flex: 1, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.04em', color: '#7e93a8', fontWeight: 700, textAlign: 'center' }}>{SHORT_FAC[k] || catalog[k]}</span>)}
        </span>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.1em', color: '#2dd4bf', fontWeight: 700, textAlign: 'right' }}>FA Pick</span>
      </div>
      {teams.map((t, idx) => {
        const isFav = t.id === favId
        const rc = t.color || TIER_COLOR[t.marketTier] || '#2dd4bf'
        const tip = (
          <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: 1.6, fontFamily: 'pressStart, monospace' }}>
            <div style={{ fontWeight: 700, color: t.color, marginBottom: '4px' }}>{t.city} {t.name}</div>
            <div>Appeal: <strong>{appealRank(t.appeal)}</strong></div>
            <div>Free agency: <strong>{`#${idx + 1} pick`}</strong></div>
            {keys.map(k => <div key={k}>{catalog[k]}: <strong>{t.levels[k] ? roman(t.levels[k]) : 'Not built'}</strong></div>)}
          </div>
        )
        return (
          <Link key={t.id} to={`/team/${t.id}`} className="facRow" style={{ display: 'grid', gridTemplateColumns: '56px 1fr 46px', gap: '12px', alignItems: 'center', padding: '5px 12px', borderRadius: '4px', textDecoration: 'none',
            background: isFav ? hex(t.color, 0.1) : 'transparent', boxShadow: isFav ? `inset 0 0 0 1px ${hex(t.color, 0.5)}` : 'none' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#cbd5e1' }}>{t.abbr}</span>
            <HoverTooltip content={tip} color={t.color}>
              <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {keys.map(k => {
                  const lvl = t.levels[k] || 0
                  return <span key={k} style={{ flex: 1, display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map(i => {
                      const on = i <= lvl
                      return <span key={i} style={{ flex: 1, height: '9px', borderRadius: '2px', background: on ? rc : '#16273a' }} />
                    })}
                  </span>
                })}
              </span>
            </HoverTooltip>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#2dd4bf', textAlign: 'right' }}>{`#${idx + 1}`}</span>
          </Link>
        )
      })}
    </div>
  )
}

// fan-count bars
function FanGraph({ teams, favId }: { teams: LeagueTeam[]; favId: number | null }) {
  const sorted = [...teams].sort((a, b) => b.fanCount - a.fanCount)
  const maxFans = Math.max(1, ...sorted.map(t => t.fanCount))
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1d2c3e', borderRadius: '10px', padding: '8px 6px' }}>
      {sorted.map(t => {
        const isFav = t.id === favId
        const tip = (
          <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: 1.6, fontFamily: 'pressStart, monospace' }}>
            <div style={{ fontWeight: 700, color: t.color, marginBottom: '4px' }}>{t.city} {t.name}</div>
            <div>Fans: <strong>{t.fanCount.toLocaleString()}</strong></div>
            <div>Market: <strong style={{ color: TIER_COLOR[t.marketTier] }}>{TIER_SHORT[t.marketTier]}</strong></div>
          </div>
        )
        return (
          <Link key={t.id} to={`/team/${t.id}`} className="facRow" style={{ display: 'grid', gridTemplateColumns: '56px 1fr 46px', gap: '12px', alignItems: 'center', padding: '4px 12px', borderRadius: '4px', textDecoration: 'none',
            background: isFav ? hex(t.color, 0.1) : 'transparent', boxShadow: isFav ? `inset 0 0 0 1px ${hex(t.color, 0.5)}` : 'none' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#cbd5e1' }}>{t.abbr}</span>
            <HoverTooltip content={tip} color={t.color}>
              <span style={{ display: 'block', height: '11px' }}>
                <span style={{ display: 'block', height: '100%', width: `${(t.fanCount / maxFans) * 100}%`, background: t.color, borderRadius: '3px', minWidth: '2px' }} />
              </span>
            </HoverTooltip>
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#94a3b8', textAlign: 'right' }}>{t.fanCount}</span>
          </Link>
        )
      })}
    </div>
  )
}

export default FacilitiesSection
