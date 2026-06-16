import React, { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useProfile, Trophy, ActivityRank } from '@/hooks/useProfile'

const GOLD = '#fbbf24'
const wrap: React.CSSProperties = { maxWidth: '760px', margin: '0 auto', padding: '24px 16px' }

// ─── Overall level header ────────────────────────────────────────────────────
function LevelHeader({ username, level, title, pointsThisLevel, pointsToNext, isMax }: {
  username: string | null; level: number; title: string
  pointsThisLevel: number; pointsToNext: number; isMax: boolean
}) {
  const span = pointsThisLevel + pointsToNext
  const pct = isMax ? 100 : (span > 0 ? Math.round((pointsThisLevel / span) * 100) : 0)
  return (
    <div style={{ borderRadius: '12px', border: '1px solid #334155', background: '#1e293b', padding: '20px', marginBottom: '18px' }}>
      <div style={{ fontSize: '20px', fontWeight: 900, color: '#e2e8f0' }}>{username || 'Player'}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
        <span style={{ fontSize: '15px', fontWeight: 800, color: GOLD, letterSpacing: '0.02em' }}>Level {level}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>{title}</span>
      </div>
      <div style={{ marginTop: '12px', height: '8px', borderRadius: '6px', background: '#0f172a', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: GOLD, transition: 'width 0.4s' }} />
      </div>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
        {isMax ? 'Max level reached' : `${pointsToNext} to next level`}
      </div>
    </div>
  )
}

// ─── Per-activity season ranks ───────────────────────────────────────────────
function RankChip({ r }: { r: ActivityRank }) {
  const ranked = !!r.rankName
  return (
    <div style={{
      flex: '1 1 160px', minWidth: '150px', borderRadius: '10px', padding: '12px 14px',
      border: `1px solid ${r.maxed ? GOLD : '#334155'}`,
      background: r.maxed ? 'rgba(251,191,36,0.08)' : '#1e293b',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{r.activity}</div>
      <div style={{ fontSize: '16px', fontWeight: 800, color: ranked ? (r.maxed ? GOLD : '#e2e8f0') : '#64748b', marginTop: '4px' }}>
        {r.rankName || 'Unranked'}
      </div>
      {ranked && (
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
          Tier {r.tier} of {r.maxTier}{r.maxed ? ' · maxed' : ''}
        </div>
      )}
    </div>
  )
}

// ─── Trophy case (grouped permanent trophies) ────────────────────────────────
interface TrophyGroup { name: string; type: Trophy['type']; seasons: number[] }

function TrophyBadge({ g }: { g: TrophyGroup }) {
  const seasons = g.seasons.filter(s => s > 0).sort((a, b) => b - a)
  const count = g.seasons.length
  return (
    <div style={{
      borderRadius: '10px', border: '1px solid #334155', background: '#1e293b',
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      <div style={{ color: g.type === 'capstone' ? GOLD : '#a78bfa', flexShrink: 0 }}>
        {g.type === 'capstone' ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4zM5 6H3v2a3 3 0 0 0 3 3M19 6h2v2a3 3 0 0 1-3 3" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z" />
          </svg>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#e2e8f0' }}>
          {g.name}{count > 1 ? <span style={{ color: GOLD }}> ×{count}</span> : null}
        </div>
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
          {seasons.length ? `Season ${seasons.join(', ')}` : 'Earned'}
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>()
  const { profile, loading, error } = useProfile(userId)

  const trophyGroups = useMemo<TrophyGroup[]>(() => {
    if (!profile) return []
    const byKey = new Map<string, TrophyGroup>()
    for (const t of profile.trophies) {
      const g = byKey.get(t.key)
      if (g) g.seasons.push(t.season)
      else byKey.set(t.key, { name: t.name, type: t.type, seasons: [t.season] })
    }
    // capstones first, then by most seasons earned
    return Array.from(byKey.values()).sort((a, b) =>
      (a.type === b.type ? b.seasons.length - a.seasons.length : (a.type === 'capstone' ? -1 : 1)))
  }, [profile])

  if (loading) return <div style={wrap}><div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>Loading profile...</div></div>
  if (error || !profile) return <div style={wrap}><div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>{error || 'Profile unavailable'}</div></div>

  const ov = profile.overall
  return (
    <div style={wrap}>
      <div style={{ fontSize: '24px', fontWeight: 900, color: GOLD, letterSpacing: '0.03em', marginBottom: '16px' }}>
        {profile.isSelf ? 'My Profile' : 'Profile'}
      </div>

      <LevelHeader username={profile.username} level={ov.level} title={ov.title}
        pointsThisLevel={ov.pointsThisLevel} pointsToNext={ov.pointsToNext} isMax={ov.isMax} />

      <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
        Ranks · Season {profile.season}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '22px' }}>
        {profile.ranks.map(r => <RankChip key={r.activity} r={r} />)}
      </div>

      <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
        Trophy Case
      </div>
      {trophyGroups.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#64748b', padding: '16px', borderRadius: '10px', border: '1px dashed #334155' }}>
          No trophies yet. Max out a season rank or unlock a secret to earn one.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
          {trophyGroups.map(g => <TrophyBadge key={g.name} g={g} />)}
        </div>
      )}
    </div>
  )
}
