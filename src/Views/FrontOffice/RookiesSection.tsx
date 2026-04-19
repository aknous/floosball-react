import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Stars } from '@/Components/Stars'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface PotentialRange {
  low: number | null
  high: number | null
  exact: number | null
}

interface ScoutedRookie {
  playerId: number
  name: string
  position: string
  rating: number
  tier: string | null
  longevity: number | null
  potentials: Record<string, PotentialRange>
  scoutingAccuracy: number
  scoutingRange: number
}

interface UpcomingRookiesResponse {
  season: number
  currentWeek: number
  votingOpensWeek: number
  votingOpen: boolean
  effectiveScouting: number
  scoutingTeamId: number | null
  rookies: ScoutedRookie[]
}

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'K']

// Friendly labels for potential attributes shown in the scouted card
const POTENTIAL_LABELS: Record<string, string> = {
  potentialSkillRating: 'Skill Ceiling',
  potentialSpeed: 'Speed',
  potentialHands: 'Hands',
  potentialAgility: 'Agility',
  potentialPower: 'Power',
  potentialArmStrength: 'Arm',
  potentialAccuracy: 'Accuracy',
  potentialLegStrength: 'Leg',
  potentialReach: 'Reach',
}

// Primary potential attribute per position — the headline ceiling stat.
const PRIMARY_POTENTIAL: Record<string, string[]> = {
  QB: ['potentialSkillRating', 'potentialArmStrength', 'potentialAccuracy'],
  RB: ['potentialSkillRating', 'potentialPower', 'potentialSpeed'],
  WR: ['potentialSkillRating', 'potentialSpeed', 'potentialHands'],
  TE: ['potentialSkillRating', 'potentialHands', 'potentialPower'],
  K:  ['potentialSkillRating', 'potentialLegStrength', 'potentialAccuracy'],
}

function calcStars(rating: number) {
  return Math.min(5, Math.max(1, Math.floor((rating - 60) / 8) + 1))
}

function PotentialCell({ label, range }: { label: string; range: PotentialRange }) {
  if (!range) return null
  const display = range.exact != null
    ? `${range.exact}`
    : range.low != null && range.high != null
      ? `${range.low}–${range.high}`
      : '—'
  const isExact = range.exact != null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px' }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{
        color: isExact ? '#e2e8f0' : '#cbd5e1',
        fontVariantNumeric: 'tabular-nums' as const,
        fontWeight: 600,
      }}>
        {display}
      </span>
    </div>
  )
}

function ScoutingAccuracyBadge({ accuracy, range }: { accuracy: number; range: number }) {
  const color = range === 0 ? '#22c55e' : range <= 5 ? '#a3e635' : range <= 10 ? '#fbbf24' : '#f87171'
  const label = range === 0 ? 'Exact' : `±${range}`
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 10px', backgroundColor: `${color}15`,
      border: `1px solid ${color}40`, borderRadius: '999px',
      fontSize: '12px', fontWeight: 600, color,
    }}>
      Scouting: {accuracy} · {label}
    </span>
  )
}

function RookieCard({
  rookie, rank, voteOrder, onToggle, votingOpen, slotCount,
}: {
  rookie: ScoutedRookie
  rank: number | null
  voteOrder: number | null
  onToggle: () => void
  votingOpen: boolean
  slotCount: number
}) {
  const primaryKeys = PRIMARY_POTENTIAL[rookie.position] || []
  const secondaryKeys = Object.keys(rookie.potentials).filter(k => !primaryKeys.includes(k))
  const [expanded, setExpanded] = useState(false)
  const selected = voteOrder != null

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        border: selected ? '1px solid #a78bfa' : '1px solid #334155',
        borderRadius: '8px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', minWidth: '26px' }}>#{rank}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#a78bfa', minWidth: '22px' }}>{rookie.position}</span>
        <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {rookie.name}
        </span>
        <Stars stars={calcStars(rookie.rating)} size={13} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
          Scouted Potential
        </div>
        {primaryKeys.map(k => (
          rookie.potentials[k] ? (
            <PotentialCell key={k} label={POTENTIAL_LABELS[k] || k} range={rookie.potentials[k]} />
          ) : null
        ))}
        {expanded && secondaryKeys.map(k => (
          <PotentialCell key={k} label={POTENTIAL_LABELS[k] || k} range={rookie.potentials[k]} />
        ))}
        {secondaryKeys.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              alignSelf: 'flex-start', marginTop: '4px',
              fontSize: '11px', color: '#64748b', background: 'none', border: 'none',
              cursor: 'pointer', padding: 0,
            }}
          >
            {expanded ? '— hide details' : '+ all attributes'}
          </button>
        )}
      </div>

      <button
        onClick={onToggle}
        disabled={!votingOpen || (!selected && slotCount >= 12)}
        style={{
          padding: '7px 12px',
          fontSize: '12px',
          fontWeight: 700,
          borderRadius: '5px',
          border: `1px solid ${selected ? '#a78bfa' : '#334155'}`,
          backgroundColor: selected ? 'rgba(167,139,250,0.15)' : 'transparent',
          color: selected ? '#a78bfa' : votingOpen ? '#cbd5e1' : '#475569',
          cursor: votingOpen && (selected || slotCount < 12) ? 'pointer' : 'not-allowed',
          transition: 'all 0.15s',
        }}
      >
        {selected ? `Ranked #${voteOrder}` : votingOpen ? 'Add to ballot' : 'Voting closed'}
      </button>
    </div>
  )
}

export default function RookiesSection() {
  const { user, getToken } = useAuth()
  const { seasonState: _seasonState } = useFloosball()
  const isMobile = useIsMobile()
  const [data, setData] = useState<UpcomingRookiesResponse | null>(null)
  const [ballot, setBallot] = useState<number[]>([])
  const [filter, setFilter] = useState<'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'K'>('ALL')
  const [submitting, setSubmitting] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const token = await getToken()
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const [upcomingRes, ballotRes] = await Promise.all([
      fetch(`${API_BASE}/rookies/upcoming`, { headers }).then(r => r.json()).catch(() => null),
      user ? fetch(`${API_BASE}/gm/rookie-ballot`, { headers }).then(r => r.json()).catch(() => null) : null,
    ])
    if (upcomingRes?.success && upcomingRes.data) setData(upcomingRes.data as UpcomingRookiesResponse)
    if (ballotRes?.success && ballotRes.data?.rankings) {
      setBallot(ballotRes.data.rankings as number[])
      setDirty(false)
    }
  }, [getToken, user])

  useEffect(() => { refresh() }, [refresh])

  const filteredRookies = useMemo(() => {
    if (!data) return []
    if (filter === 'ALL') return data.rookies
    return data.rookies.filter(r => r.position === filter)
  }, [data, filter])

  const ballotRankLookup = useMemo(() => {
    const m = new Map<number, number>()
    ballot.forEach((id, i) => m.set(id, i + 1))
    return m
  }, [ballot])

  const toggleRookie = (playerId: number) => {
    setDirty(true)
    setBallot(prev => {
      if (prev.includes(playerId)) return prev.filter(id => id !== playerId)
      if (prev.length >= 12) return prev
      return [...prev, playerId]
    })
  }

  const submit = async () => {
    if (!data?.votingOpen || ballot.length === 0) return
    setSubmitting(true)
    setLastError(null)
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`${API_BASE}/gm/rookie-ballot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rankings: ballot }),
      })
      const json = await res.json()
      if (!res.ok) {
        setLastError(json?.detail || 'Submit failed')
      } else {
        setDirty(false)
      }
    } catch (e: any) {
      setLastError(e?.message || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!data) {
    return <div style={{ padding: '48px', color: '#94a3b8', textAlign: 'center' }}>Loading rookies…</div>
  }

  return (
    <div>
      <div style={{ marginBottom: '16px', fontSize: '13px', color: '#94a3b8' }}>
        {data.rookies.length} prospects available in the offseason rookie draft.
        Scouting accuracy depends on your team's head coach and market tier.
      </div>

      {/* Status bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px',
        padding: '12px 14px', backgroundColor: '#1e293b',
        border: '1px solid #334155', borderRadius: '8px', marginBottom: '20px',
      }}>
        <ScoutingAccuracyBadge accuracy={data.effectiveScouting} range={data.rookies[0]?.scoutingRange ?? 15} />
        {data.votingOpen ? (
          <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
            Voting is open — rank your preferred rookies
          </span>
        ) : (
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Voting opens Week {data.votingOpensWeek} (current: Week {data.currentWeek})
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          On your ballot: {ballot.length} / 12
        </span>
        {data.votingOpen && ballot.length > 0 && (
          <button
            onClick={submit}
            disabled={submitting || !dirty}
            style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '5px',
              border: '1px solid #a78bfa', backgroundColor: dirty ? '#a78bfa' : 'rgba(167,139,250,0.2)',
              color: dirty ? '#0f172a' : '#a78bfa',
              cursor: submitting || !dirty ? 'default' : 'pointer',
            }}
          >
            {submitting ? 'Submitting…' : dirty ? 'Submit Ballot' : 'Saved'}
          </button>
        )}
      </div>

      {lastError && (
        <div style={{
          padding: '10px 14px', marginBottom: '16px', borderRadius: '6px',
          backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444',
          color: '#fca5a5', fontSize: '12px',
        }}>
          {lastError}
        </div>
      )}

      {/* Position filter */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, marginBottom: '16px' }}>
        {(['ALL', 'QB', 'RB', 'WR', 'TE', 'K'] as const).map(pos => {
          const active = filter === pos
          return (
            <button
              key={pos}
              onClick={() => setFilter(pos)}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: active ? 700 : 500,
                borderRadius: '5px',
                border: `1px solid ${active ? '#a78bfa' : '#334155'}`,
                backgroundColor: active ? 'rgba(167,139,250,0.15)' : 'transparent',
                color: active ? '#e2e8f0' : '#94a3b8',
                cursor: 'pointer',
              }}
            >
              {pos}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '12px',
      }}>
        {filteredRookies.map(r => (
          <RookieCard
            key={r.playerId}
            rookie={r}
            rank={filteredRookies.indexOf(r) + 1}
            voteOrder={ballotRankLookup.get(r.playerId) ?? null}
            onToggle={() => toggleRookie(r.playerId)}
            votingOpen={data.votingOpen}
            slotCount={ballot.length}
          />
        ))}
      </div>
    </div>
  )
}
