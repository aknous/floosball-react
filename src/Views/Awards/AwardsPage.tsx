import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GiStarMedal, GiLaurelsTrophy, GiStarsStack } from 'react-icons/gi'
import { useAwards, MvpCandidate, HofCandidate } from '@/hooks/useAwards'
import { Stars } from '@/Components/Stars'
import HoverTooltip from '@/Components/HoverTooltip'

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'K']
const GOLD = '#fbbf24'

// Award badges — same icons/colors as the Hall of Fame plaques + trophy case.
const HOF_AWARDS: { key: 'mvps' | 'championships' | 'allPros'; label: string; Icon: React.ComponentType<any>; color: string }[] = [
  { key: 'mvps', label: 'MVP', Icon: GiStarMedal, color: '#fbbf24' },
  { key: 'championships', label: 'Champ', Icon: GiLaurelsTrophy, color: '#f59e0b' },
  { key: 'allPros', label: 'All-Pro', Icon: GiStarsStack, color: '#cbd5e1' },
]

const AwardBadge: React.FC<{ count: number; label: string; Icon: React.ComponentType<any>; color: string }> = ({ count, label, Icon, color }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '11px', fontWeight: 700, color,
    backgroundColor: `${color}1a`, border: `1px solid ${color}33`,
    borderRadius: '5px', padding: '2px 6px', whiteSpace: 'nowrap',
  }}>
    <Icon style={{ fontSize: '13px' }} />
    {count}&times; {label}
  </span>
)

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '18px', fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.02em' }}>{title}</div>
      <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>{subtitle}</div>
    </div>
  )
}

function StatPair({ label, value }: { label: string; value: number | string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '3px' }}>
      <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
    </span>
  )
}

function MvpCard({ c, picked, onPick }: { c: MvpCandidate; picked: boolean; onPick: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 12px', borderRadius: '8px',
      border: `1px solid ${picked ? GOLD : '#334155'}`,
      background: picked ? 'rgba(251,191,36,0.08)' : '#0f172a',
      transition: 'border-color 0.15s, background 0.15s',
    }}>
      {c.teamId != null && (
        <img src={`/avatars/${c.teamId}.png`} alt={c.teamAbbr}
             style={{ width: '32px', height: '32px', flexShrink: 0 }}
             onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to={`/players/${c.id}`}
                style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.name}
          </Link>
          <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>{c.teamAbbr}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
          <Stars stars={c.ratingStars} size={11} />
          {c.stats.map(s => <StatPair key={s.label} label={s.label} value={s.value} />)}
          <StatPair label="WPA" value={c.seasonWpa} />
          <StatPair label="FP" value={c.fantasyPoints} />
        </div>
      </div>
      <button
        onClick={onPick}
        style={{
          flexShrink: 0, cursor: 'pointer',
          fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em',
          color: picked ? '#0f172a' : GOLD,
          background: picked ? GOLD : 'rgba(251,191,36,0.12)',
          border: `1px solid ${GOLD}`, borderRadius: '6px', padding: '8px 14px',
          whiteSpace: 'nowrap',
        }}
      >
        {picked ? 'YOUR PICK' : 'VOTE'}
      </button>
    </div>
  )
}

function HofCard({ c, approved, onToggle }: { c: HofCandidate; approved: boolean; onToggle: () => void }) {
  const k = c.case || {}
  const records = c.recordsHeld || []
  const secondary: string[] = []
  if (k.seasons) secondary.push(`${k.seasons} seasons`)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px', borderRadius: '8px',
      border: `1px solid ${approved ? GOLD : '#334155'}`,
      background: approved ? 'rgba(251,191,36,0.08)' : '#0f172a',
    }}>
      {c.teamId != null && (
        <img src={`/avatars/${c.teamId}.png`} alt={c.teamAbbr}
             style={{ width: '34px', height: '34px', flexShrink: 0 }}
             onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Link to={`/players/${c.playerId}`} style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', textDecoration: 'none' }}>
            {c.name || `Player #${c.playerId}`}
          </Link>
          {c.position && <span style={{ fontSize: '11px', fontWeight: 700, color: c.teamColor || '#94a3b8' }}>{c.position}</span>}
          {c.teamAbbr && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{c.teamAbbr}</span>}
          <Stars stars={c.ratingStars} size={11} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '7px' }}>
          {HOF_AWARDS.filter(a => (k[a.key] || 0) > 0).map(a => (
            <AwardBadge key={a.key} count={k[a.key] || 0} label={a.label} Icon={a.Icon} color={a.color} />
          ))}
          {records.length > 0 && (
            <HoverTooltip content={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'left' }}>
                {records.map((r, i) => <span key={i}>{r}</span>)}
              </div>
            } color="#38bdf8">
              <span style={{
                fontSize: '11px', fontWeight: 600, color: '#38bdf8',
                backgroundColor: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.28)',
                borderRadius: '5px', padding: '2px 8px', whiteSpace: 'nowrap', cursor: 'help',
              }}>{records.length} league record{records.length !== 1 ? 's' : ''}</span>
            </HoverTooltip>
          )}
          {secondary.map(chip => (
            <span key={chip} style={{ fontSize: '11px', color: '#cbd5e1', background: '#1e293b', border: '1px solid #334155', borderRadius: '5px', padding: '2px 7px' }}>{chip}</span>
          ))}
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '7px' }}>
          {c.seasonsRemaining === 1 ? 'Final year on the ballot' : `${c.seasonsRemaining} years left on the ballot`}
        </div>
      </div>
      <button
        onClick={onToggle}
        style={{
          cursor: 'pointer', flexShrink: 0,
          fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em',
          color: approved ? '#0f172a' : GOLD,
          background: approved ? GOLD : 'rgba(251,191,36,0.12)',
          border: `1px solid ${GOLD}`, borderRadius: '6px', padding: '8px 14px',
        }}
      >
        {approved ? 'APPROVED' : 'APPROVE'}
      </button>
    </div>
  )
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        cursor: 'pointer', flex: 1,
        fontSize: '13px', fontWeight: 800, letterSpacing: '0.03em',
        color: active ? '#0f172a' : '#cbd5e1',
        background: active ? GOLD : 'transparent',
        border: `1px solid ${active ? GOLD : '#334155'}`,
        borderRadius: '8px', padding: '9px 0',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

export default function AwardsPage() {
  const { loading, mvpOpen, hofOpen, anyOpen, mvpCandidates, myMvpVote,
          hofCandidates, myApprovals, classCap, castMvpVote, toggleHofApproval } = useAwards()
  const [tab, setTab] = useState<'mvp' | 'hof'>('mvp')

  // Default the active tab to whichever window is open (MVP wins if both).
  useEffect(() => {
    if (mvpOpen) setTab('mvp')
    else if (hofOpen) setTab('hof')
  }, [mvpOpen, hofOpen])

  const wrap: React.CSSProperties = { maxWidth: '760px', margin: '0 auto', padding: '24px 16px' }

  if (loading) {
    return <div style={wrap}><div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>Loading the Awards Hall...</div></div>
  }

  if (!anyOpen) {
    return (
      <div style={wrap}>
        <div style={{ textAlign: 'center', padding: '48px 24px', borderRadius: '12px', border: '1px solid #334155', background: '#1e293b' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#e2e8f0' }}>The Awards Hall is closed</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px', lineHeight: 1.5 }}>
            MVP and Hall of Fame voting open at season's end. Check back when the regular season wraps to cast your ballot.
          </div>
        </div>
      </div>
    )
  }

  const myApprovalSet = new Set(myApprovals)
  const showTabs = mvpOpen && hofOpen
  const active = showTabs ? tab : (mvpOpen ? 'mvp' : 'hof')

  return (
    <div style={wrap}>
      <div style={{ fontSize: '24px', fontWeight: 900, color: GOLD, letterSpacing: '0.03em', marginBottom: '16px' }}>Awards</div>

      {showTabs && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <Tab label="MVP" active={active === 'mvp'} onClick={() => setTab('mvp')} />
          <Tab label="Hall of Fame" active={active === 'hof'} onClick={() => setTab('hof')} />
        </div>
      )}

      {active === 'mvp' && mvpOpen && (
        <div>
          <SectionHeader title="Most Valuable Player" subtitle="Vote for the season's MVP. One pick, change it any time before voting closes." />
          {POSITION_ORDER.map(pos => {
            const group = mvpCandidates.filter(c => c.position === pos)
            if (!group.length) return null
            return (
              <div key={pos} style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '6px' }}>{pos}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {group.map(c => (
                    <MvpCard key={c.id} c={c} picked={myMvpVote === c.id} onPick={() => castMvpVote(c.id)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {active === 'hof' && hofOpen && (
        <div>
          <SectionHeader
            title="Hall of Fame"
            subtitle={`Approve the players you want enshrined. Up to ${classCap} are inducted this year; the rest carry over.`}
          />
          {hofCandidates.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#64748b', padding: '12px 0' }}>No players on the ballot this season.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {hofCandidates.map(c => (
                <HofCard key={c.playerId} c={c} approved={myApprovalSet.has(c.playerId)} onToggle={() => toggleHofApproval(c.playerId)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
