import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GiStarMedal, GiLaurelsTrophy, GiStarsStack } from 'react-icons/gi'
import { useAwards, MvpCandidate, HofCandidate } from '@/hooks/useAwards'
import { Stars } from '@/Components/Stars'
import HoverTooltip from '@/Components/HoverTooltip'
import PlayerLink from '@/Components/PlayerLink'
import { useIsMobile } from '@/hooks/useIsMobile'

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

function SectionHeader({ title, subtitle, closes }: { title: string; subtitle: string; closes?: string }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '18px', fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.02em' }}>{title}</div>
      <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>{subtitle}</div>
      {closes && (
        <div style={{ fontSize: '12px', color: GOLD, marginTop: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: GOLD, display: 'inline-block', flexShrink: 0 }} />
          {closes}
        </div>
      )}
    </div>
  )
}

function StatPair({ label, value }: { label: string; value: number | string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '3px' }}>
      <span style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
    </span>
  )
}

function MvpCard({ c, picked, onPick }: { c: MvpCandidate; picked: boolean; onPick: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 16px', borderRadius: '8px',
      border: `1px solid ${picked ? GOLD : '#334155'}`,
      background: picked ? 'rgba(251,191,36,0.08)' : '#1e293b',
      transition: 'border-color 0.15s, background 0.15s',
    }}>
      {c.teamId != null && (
        <img src={`/avatars/${c.teamId}.png`} alt={c.teamAbbr}
             style={{ width: '40px', height: '40px', flexShrink: 0 }}
             onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlayerLink playerId={c.id} playerName={c.name}
                style={{ fontSize: '17px', fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />
          <span style={{ fontSize: '13px', color: '#94a3b8', flexShrink: 0 }}>{c.teamAbbr}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', flexWrap: 'wrap' }}>
          <Stars stars={c.ratingStars} size={13} />
          {c.stats.map(s => <StatPair key={s.label} label={s.label} value={s.value} />)}
          <HoverTooltip content="Win Probability Added: the net win probability this player's plays swung over the season, in win units (100 percentage points = 1). Higher is better." color="#38bdf8">
            <span style={{ cursor: 'help' }}><StatPair label="WPA" value={(c.seasonWpa / 100).toFixed(1)} /></span>
          </HoverTooltip>
          <StatPair label="FP" value={c.fantasyPoints} />
        </div>
      </div>
      <button
        onClick={onPick}
        style={{
          flexShrink: 0, cursor: 'pointer',
          fontSize: '12px', fontWeight: 800, letterSpacing: '0.05em',
          color: picked ? '#0f172a' : GOLD,
          background: picked ? GOLD : 'rgba(251,191,36,0.12)',
          border: `1px solid ${GOLD}`, borderRadius: '6px', padding: '10px 18px',
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
      background: approved ? 'rgba(251,191,36,0.08)' : '#1e293b',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Link to={`/players/${c.playerId}`} style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', textDecoration: 'none' }}>
            {c.name || `Player #${c.playerId}`}
          </Link>
          {c.position && <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>{c.position}</span>}
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
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '7px' }}>
          {c.seasonsRemaining === 1 ? 'Final year on the ballot' : `${c.seasonsRemaining} years left on the ballot`}
        </div>
      </div>
      <button
        onClick={onToggle}
        aria-pressed={approved}
        title={approved ? 'Voted for induction' : 'Vote for induction'}
        style={{
          cursor: 'pointer', flexShrink: 0,
          width: '34px', height: '34px', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: approved ? GOLD : 'rgba(251,191,36,0.08)',
          border: `2px solid ${approved ? GOLD : 'rgba(251,191,36,0.45)'}`,
          borderRadius: '7px',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        {approved && (
          <svg viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="3.5"
               strokeLinecap="round" strokeLinejoin="round"
               style={{ width: '20px', height: '20px' }}>
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
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
        fontSize: '16px', fontWeight: 800, letterSpacing: '0.03em',
        color: active ? '#0f172a' : '#cbd5e1',
        background: active ? GOLD : 'transparent',
        border: `1px solid ${active ? GOLD : '#334155'}`,
        borderRadius: '8px', padding: '12px 0',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function ClosedNotice({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px', borderRadius: '12px', border: '1px solid #334155', background: '#1e293b' }}>
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>{title}</div>
      <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px', lineHeight: 1.5, maxWidth: '440px', margin: '8px auto 0' }}>{body}</div>
    </div>
  )
}

export default function AwardsPage() {
  const { loading, mvpOpen, hofOpen, anyOpen, mvpCandidates, myMvpVote,
          hofCandidates, myApprovals, classCap, castMvpVote, toggleHofApproval } = useAwards()
  const [tab, setTab] = useState<'mvp' | 'hof'>('mvp')
  const isMobile = useIsMobile()

  // Default the active tab to whichever window is open (MVP wins if both).
  useEffect(() => {
    if (mvpOpen) setTab('mvp')
    else if (hofOpen) setTab('hof')
  }, [mvpOpen, hofOpen])

  const wrap: React.CSSProperties = { maxWidth: '880px', margin: '0 auto', padding: '24px 16px' }

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
  const active = tab

  return (
    <div style={wrap}>
      <div style={{ fontSize: '24px', fontWeight: 900, color: GOLD, letterSpacing: '0.03em', marginBottom: '16px' }}>Awards Voting</div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <Tab label="MVP" active={active === 'mvp'} onClick={() => setTab('mvp')} />
        <Tab label="Hall of Fame" active={active === 'hof'} onClick={() => setTab('hof')} />
      </div>

      {active === 'mvp' && !mvpOpen && (
        <ClosedNotice
          title="MVP voting isn't open right now"
          body="MVP voting runs at the end of each regular season. Check back when the season wraps to cast your ballot."
        />
      )}

      {active === 'mvp' && mvpOpen && (
        <div>
          <SectionHeader title="Most Valuable Player" subtitle="Vote for the season's MVP. One pick, change it any time before voting closes." closes="Open through the playoffs. Closes after the Floos Bowl, when the season wraps." />
          {POSITION_ORDER.map(pos => {
            const group = mvpCandidates.filter(c => c.position === pos)
            if (!group.length) return null
            return (
              <div key={pos} style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '6px' }}>{pos}</div>
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

      {active === 'hof' && !hofOpen && (
        <ClosedNotice
          title="Hall of Fame voting isn't open right now"
          body="The Hall of Fame ballot opens late in the regular season and resolves in the offseason. Check back to weigh in on this year's class."
        />
      )}

      {active === 'hof' && hofOpen && (
        <div>
          <SectionHeader
            title="Hall of Fame"
            subtitle={`Vote for the players you want inducted into the Hall of Fame. Only ${classCap} can be inducted each season, and players stay on the ballot for up to 5 seasons.`}
            closes="Open through the playoffs and into the offseason. Closes at the induction ceremony."
          />
          {hofCandidates.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#94a3b8', padding: '12px 0' }}>No players on the ballot this season.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gridAutoFlow: 'row', gap: '8px' }}>
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
