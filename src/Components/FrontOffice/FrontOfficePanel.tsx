import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useGmData } from '@/hooks/useGmData'
import { useIsMobile } from '@/hooks/useIsMobile'
import FireCoachCard from './FireCoachCard'
import HireCoachCard from './HireCoachCard'
import CutPlayerCard from './CutPlayerCard'
import ResignPlayerCard from './ResignPlayerCard'
import VoteResultsBanner from './VoteResultsBanner'
import FaBallotModal, { ScoutingPlayer, OpenSlot, StatLine } from './FaBallotModal'
import HelpModal, { HelpButton, GuideSection } from '@/Components/HelpModal'
import { Stars, calcStars } from '@/Components/Stars'
import PlayerLink from '@/Components/PlayerLink'
import { GM_VOTE_COST } from '@/types/gm'

const GM_ACTIVE_WEEK = 22
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const POS_CHIP_COLORS: Record<string, { bg: string; fg: string }> = {
  QB: { bg: 'rgba(59,130,246,0.18)', fg: '#60a5fa' },
  RB: { bg: 'rgba(34,197,94,0.18)', fg: '#4ade80' },
  WR: { bg: 'rgba(245,158,11,0.18)', fg: '#fbbf24' },
  TE: { bg: 'rgba(168,85,247,0.18)', fg: '#c084fc' },
  K: { bg: 'rgba(148,163,184,0.18)', fg: '#cbd5e1' },
}

const PositionChip: React.FC<{ position: string }> = ({ position }) => {
  const c = POS_CHIP_COLORS[position] || { bg: '#1e293b', fg: '#94a3b8' }
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700,
      color: c.fg, backgroundColor: c.bg,
      padding: '2px 6px', borderRadius: '4px',
      letterSpacing: '0.04em',
      minWidth: 28, textAlign: 'center' as const,
    }}>
      {position}
    </span>
  )
}

interface FrontOfficePanelProps {
  teamId: number
  teamAbbr: string
  teamColor: string
}

interface FanVoteEntry {
  id: number
  name: string
  position: string
  rating: number
  isProspect?: boolean
}

const FrontOfficePanel: React.FC<FrontOfficePanelProps> = ({ teamId, teamAbbr, teamColor }) => {
  const { user, getToken, refetchUser, updateFloobits } = useAuth()
  const { seasonState } = useFloosball()
  const { event: wsEvent } = useSeasonWebSocket()
  const isMobile = useIsMobile()
  const gm = useGmData(teamId)

  const currentWeek = seasonState.currentWeek
  const isOffseason = seasonState.currentWeekText === 'Offseason'
  // Cover the post-bowl gap (currentWeekText still 'Floos Bowl' for an hour
  // after the championship) and the between-seasons window — the board stays
  // available for the duration of the offseason window, not just the period
  // the backend has flipped the week label.
  const isActive = currentWeek >= GM_ACTIVE_WEEK || isOffseason || seasonState.seasonComplete

  // FA Requisition — year-round ballot targeting the team's projected walk-year
  // FAs + current prospects. The same modal used during the offseason FA window,
  // surfaced here so fans can influence signings before the window closes.
  const [faScoutingPlayers, setFaScoutingPlayers] = useState<ScoutingPlayer[]>([])
  const [faOpenSlots, setFaOpenSlots] = useState<OpenSlot[]>([])
  const [existingFaBallot, setExistingFaBallot] = useState<number[] | null>(null)
  const [faModalOpen, setFaModalOpen] = useState(false)
  const [faBallotSubmitting, setFaBallotSubmitting] = useState(false)
  const [faWindowEnd, setFaWindowEnd] = useState<number | null>(null)
  // Flat fan vote tally for THIS team — single overall priority list.
  // Two sources: live (raw ballot tallies during voting window) and resolved
  // (post-IRV rankings once the offseason ballot resolves). Each entry
  // carries its own position so the UI can render position chips.
  const [teamFaVotes, setTeamFaVotes] = useState<FanVoteEntry[]>([])
  const [liveBallotTally, setLiveBallotTally] = useState<(FanVoteEntry & { votes: number; firstChoice: number })[]>([])
  const [totalBallots, setTotalBallots] = useState<number>(0)
  const [fanVotesOpen, setFanVotesOpen] = useState(true)
  // Bumped whenever a WS event signals that the ballot state may have
  // changed — forces the fetch effect to re-run so the Vote Tallies sections
  // appear immediately after voting closes, not after all drafts are over.
  const [refetchToken, setRefetchToken] = useState(0)

  // Per-team offseason moves: cuts, resigns, promotions, rookie pick, FA
  // signings, coach decision. All sourced from /api/offseason transactions
  // + GM resolutions, filtered to this team. Rebuilt on every refetch.
  type Mover = { id?: number | null; name: string; position: string; rating: number; tier?: string; reason?: string }
  type CoachMove = { type: 'fire' | 'hire' | 'retire'; coachName?: string; outcome?: string }
  const [offseasonMoves, setOffseasonMoves] = useState<{
    resigns: Mover[]
    cuts: Mover[]
    promotions: Mover[]
    rookies: Mover[]
    faSignings: Mover[]
    coach: CoachMove[]
  }>({ resigns: [], cuts: [], promotions: [], rookies: [], faSignings: [], coach: [] })
  const [movesOpen, setMovesOpen] = useState(true)

  // Aggregated team-wide rookie ballot tally (Borda count of all fans of the
  // team). Parallel to teamFaVotes, but for the rookie draft. Populated
  // when the rookie draft tallies ballots — so visible after the draft is
  // underway.
  type RankedRookie = {
    id: number; name: string; position: string; rating: number;
    tier: string | null; draftedByTeamId: number | null;
    draftedByTeamAbbr: string | null;
  }
  const [teamRookieTally, setTeamRookieTally] = useState<RankedRookie[]>([])
  const [rookieTallyOpen, setRookieTallyOpen] = useState(true)

  useEffect(() => {
    const ev = wsEvent as { event?: string } | null
    if (!ev?.event) return
    if (
      ev.event === 'gm_fa_window_close' ||
      ev.event === 'gm_fa_directives' ||
      ev.event === 'offseason_predraft_start' ||
      ev.event === 'offseason_team_setup' ||
      ev.event === 'offseason_pick' ||
      ev.event === 'rookie_draft_pick' ||
      ev.event === 'gm_vote_resolved' ||
      ev.event === 'offseason_complete'
    ) {
      setRefetchToken(t => t + 1)
    }
  }, [wsEvent])

  // Refetch scouting whenever the user's vote counts change — a fresh
  // cut/resign vote can push a slot's likelyCut/likelyResigned flag over
  // quorum, opening (or closing) an FA requisition slot. Without this the
  // openSlots count would stay frozen at mount-time values.
  const gmVoteSignature = gm.myVotes?.counts.total ?? 0
  useEffect(() => {
    if (!isActive) return
    let cancelled = false
    const load = async () => {
      try {
        const tok = await getToken()
        if (!tok) return
        const [scoutRes, ofsRes] = await Promise.all([
          fetch(`${API_BASE}/gm/fa-scouting`, { headers: { Authorization: `Bearer ${tok}` } }),
          fetch(`${API_BASE}/offseason`, { headers: { Authorization: `Bearer ${tok}` } }),
        ])
        const scoutJson = await scoutRes.json().catch(() => null)
        if (!cancelled && scoutJson?.success && scoutJson.data) {
          setFaScoutingPlayers(scoutJson.data.players || [])
          setFaOpenSlots(scoutJson.data.openSlots || [])
          setLiveBallotTally(Array.isArray(scoutJson.data.ballotTally) ? scoutJson.data.ballotTally : [])
          setTotalBallots(scoutJson.data.totalBallots || 0)
        }
        const ofsJson = await ofsRes.json().catch(() => null)
        if (!cancelled && ofsJson) {
          if (ofsJson.existingBallot) setExistingFaBallot(ofsJson.existingBallot)
          if (ofsJson.faWindowEnd) setFaWindowEnd(ofsJson.faWindowEnd * 1000)
          const results = ofsJson.faVoteResults?.[teamAbbr]
          if (Array.isArray(results)) setTeamFaVotes(results)
          else setTeamFaVotes([])

          // Team-wide rookie ballot tally (parallel to FA tallies)
          const rookieTally = ofsJson.rookieBallotResults?.[teamAbbr]
          if (rookieTally && Array.isArray(rookieTally)) setTeamRookieTally(rookieTally)
          else setTeamRookieTally([])

          // Filter offseason transactions + GM resolutions down to this team's
          // moves. team_setup carries arrays for resigns/cuts/promotions; rookie_pick
          // and pick (FA signing) are individual events. teamAbbr is the join key
          // since teamId isn't included on every transaction shape.
          const txs: any[] = ofsJson.transactions || []
          const teamSetup = txs.find(t => t?.type === 'team_setup' && t?.teamAbbr === teamAbbr)
          const rookies = txs
            .filter(t => t?.type === 'rookie_pick' && t?.teamAbbr === teamAbbr)
            .map(t => ({ id: t.playerId, name: t.player, position: t.position, rating: t.rating, tier: t.tier }))
          const faSignings = txs
            .filter(t => t?.type === 'pick' && t?.teamAbbr === teamAbbr && !t?.isPromotion)
            .map(t => ({ id: t.playerId, name: t.player, position: t.position, rating: t.rating, tier: t.tier }))
          const promotions = txs
            .filter(t => t?.type === 'pick' && t?.teamAbbr === teamAbbr && t?.isPromotion)
            .map(t => ({ id: t.playerId, name: t.player, position: t.position, rating: t.rating, tier: t.tier }))
            .concat((teamSetup?.promotions || []).map((p: any) => ({
              id: p.id, name: p.name, position: p.position, rating: p.rating, tier: p.tier,
            })))

          const coach: CoachMove[] = []
          const resolutions: any[] = ofsJson.gmResolutions || []
          for (const r of resolutions) {
            if (r?.teamId !== teamId) continue
            if (r?.voteType === 'fire_coach') {
              coach.push({ type: 'fire', coachName: r.targetPlayerName, outcome: r.outcome })
            } else if (r?.voteType === 'hire_coach') {
              coach.push({ type: 'hire', coachName: r.targetPlayerName, outcome: r.outcome })
            }
          }

          setOffseasonMoves({
            resigns: (teamSetup?.resigns || []).map((p: any) => ({
              id: p.id, name: p.name, position: p.position, rating: p.rating, tier: p.tier,
            })),
            cuts: (teamSetup?.cuts || []).map((p: any) => ({
              id: p.id, name: p.name, position: p.position, rating: p.rating, tier: p.tier,
              reason: p.reason,
            })),
            promotions,
            rookies,
            faSignings,
            coach,
          })
        }

      } catch { /* silent */ }
    }
    load()
    return () => { cancelled = true }
  }, [isActive, getToken, gmVoteSignature, teamAbbr, teamId, refetchToken])

  const handleSubmitFaBallot = useCallback(async (rankings: number[]) => {
    const tok = await getToken()
    if (!tok) return null
    setFaBallotSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/gm/fa-ballot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ rankings }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Ballot submission failed' }))
        alert(err.detail || 'Ballot submission failed')
        return null
      }
      const json = await res.json()
      const data = json.data ?? json
      setExistingFaBallot(data.rankings)
      const balRes = await fetch(`${API_BASE}/currency/balance`, { headers: { Authorization: `Bearer ${tok}` } })
      if (balRes.ok) {
        const bj = await balRes.json()
        updateFloobits(bj.data?.balance ?? 0)
      }
      await refetchUser()
      setFaModalOpen(false)
      return data
    } catch {
      alert('Ballot submission failed')
      return null
    } finally {
      setFaBallotSubmitting(false)
    }
  }, [getToken, updateFloobits, refetchUser])

  // Compute disabled vote targets based on user's vote counts
  // Helper: per-target tally already meets/exceeds threshold (directive
  // is guaranteed to pass, so further votes are wasteful and the backend
  // rejects them).
  const targetThresholdMet = (voteType: string, targetId: number): boolean => {
    const tally = gm.summary?.tallies.find(
      t => t.voteType === voteType && t.targetPlayerId === targetId
    )
    return !!tally && tally.threshold > 0 && tally.votes >= tally.threshold
  }

  // One vote per target (the per-side lock lives in StanceControls). The only
  // thing we still grey out here is a target whose directive has already met
  // its pass threshold — further votes can't change the outcome and the spend
  // would be wasted.
  const disabledCutIds = useMemo(() => {
    const ids = new Set<number>()
    gm.eligible?.rosteredPlayers.forEach(p => {
      if (targetThresholdMet('cut_player', p.id)) ids.add(p.id)
    })
    return ids
  }, [gm.eligible, gm.summary])

  const disabledResignIds = useMemo(() => {
    const ids = new Set<number>()
    gm.eligible?.expiringPlayers.forEach(p => {
      if (targetThresholdMet('resign_player', p.id)) ids.add(p.id)
    })
    return ids
  }, [gm.eligible, gm.summary])

  const fireCoachDisabled = useMemo(() => {
    // Fire votes are aggregated against a single target=null, so check the
    // tally directly instead of going through targetThresholdMet.
    const fireTally = gm.summary?.tallies.find(t => t.voteType === 'fire_coach')
    return !!fireTally && fireTally.threshold > 0 && fireTally.votes >= fireTally.threshold
  }, [gm.summary])

  // Hire is a plurality election with no pass threshold; the per-candidate
  // voted lock is handled by the Nominate button's selected state.
  const disabledHireCoachIds = useMemo(() => new Set<number>(), [])

  const globalDisabled = false

  const coachTally = gm.summary?.tallies.find(t => t.voteType === 'fire_coach') ?? null
  const [showHelp, setShowHelp] = useState(false)

  // Flat cost per vote — one vote per target, so no escalation.
  const balance = user?.floobits ?? 0
  const targetVotesUsed = gm.myVotes?.counts.perTarget ?? {}
  const nextTargetCost = (type: string, _targetId?: number) => GM_VOTE_COST[type] ?? 10
  // How many votes the current user has on a specific target (drives the undo
  // button's visibility + count badge).
  const myVotesOnTarget = (type: string, targetId?: number) => {
    const targetKey = `${type}:${targetId ?? 'none'}`
    return targetVotesUsed[targetKey] ?? 0
  }
  // The user's current stance on a target ('yea'/'nay'), or null. All of a
  // user's votes on one target are single-direction (enforced server-side), so
  // the first matching vote's direction is the stance.
  const myStanceOnTarget = (type: string, targetId?: number): 'yea' | 'nay' | null => {
    const v = gm.myVotes?.votes.find(
      x => x.voteType === type && (x.targetPlayerId ?? null) === (targetId ?? null)
    )
    return v ? ((v.direction as 'yea' | 'nay') ?? 'yea') : null
  }
  // What the user paid for their vote on a target (flat) — what undo refunds.
  const lastTargetCost = (type: string, targetId?: number) =>
    myVotesOnTarget(type, targetId) > 0 ? (GM_VOTE_COST[type] ?? 10) : 0
  // For single-target directives (fire_coach), use the target cost directly
  const nextCostByType = {
    fire_coach: nextTargetCost('fire_coach'),
    hire_coach: nextTargetCost('hire_coach'),
    cut_player: nextTargetCost('cut_player'),
    resign_player: nextTargetCost('resign_player'),
  }

  // Section header matching TeamPage pattern
  const sectionHeader = (label: string, withHelp?: boolean) => (
    <div style={{ padding: '11px 14px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{
        fontSize: '13px',
        fontWeight: '600',
        color: '#94a3b8',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
      }}>
        {label}
      </span>
      {withHelp && <HelpButton onClick={() => setShowHelp(true)} size={22} />}
    </div>
  )

  // Offseason: show results banner + per-team moves + resolved fan vote
  // tallies. No active voting during free agency — the offseason view is
  // a record of decisions: GM votes, signings, rookies drafted, cuts.
  if (isOffseason) {
    const hasResults = gm.results && gm.results.results.length > 0
    const hasResolvedTallies = teamFaVotes.length > 0
    const moves = offseasonMoves
    const movesEmpty =
      moves.coach.length === 0 &&
      moves.resigns.length === 0 &&
      moves.cuts.length === 0 &&
      moves.promotions.length === 0 &&
      moves.rookies.length === 0 &&
      moves.faSignings.length === 0
    const moverRow = (m: Mover, badge?: { text: string; color: string }) => (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '5px 0', fontSize: '13px',
      }}>
        <Stars stars={calcStars(m.rating)} size={11} />
        <PlayerLink
          playerId={m.id}
          playerName={m.name}
          style={{ flex: 1, color: '#e2e8f0' }}
        />
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{m.position}</span>
        {badge && (
          <span style={{
            fontSize: '10px', fontWeight: 700, color: badge.color,
            letterSpacing: '0.04em', textTransform: 'uppercase' as const,
          }}>
            {badge.text}
          </span>
        )}
      </div>
    )
    const subSection = (label: string, color: string, children: React.ReactNode) => (
      <div style={{ marginTop: '12px' }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, color,
          textTransform: 'uppercase' as const, letterSpacing: '0.06em',
          marginBottom: '6px',
        }}>
          {label}
        </div>
        {children}
      </div>
    )
    return (
      <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
        {sectionHeader('The Front Office')}
        <div style={{ padding: '14px' }}>
          {hasResults ? (
            <VoteResultsBanner results={gm.results!.results} teamColor={teamColor} />
          ) : !hasResolvedTallies && movesEmpty ? (
            <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
              FA ballots are tallied when the voting window closes.
            </div>
          ) : null}
        </div>
        {!movesEmpty && (
          <div style={{ borderTop: '1px solid #334155' }}>
            <button
              onClick={() => setMovesOpen(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', background: 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left' as const,
              }}
            >
              <span style={{
                fontSize: '10px', color: '#64748b',
                transform: movesOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s',
              }}>▶</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>
                Offseason Moves
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Roster decisions for {teamAbbr}
              </span>
            </button>
            {movesOpen && (
              <div style={{ padding: '4px 14px 14px' }}>
                {moves.coach.length > 0 && subSection('Coach', '#a78bfa', (
                  <div>
                    {moves.coach.map((c, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', padding: '5px 0', fontSize: '13px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700,
                          color: c.outcome === 'success' ? '#22c55e' : '#94a3b8',
                          letterSpacing: '0.04em', textTransform: 'uppercase' as const,
                          minWidth: '50px',
                        }}>
                          {c.type === 'fire' ? 'Fire' : c.type === 'hire' ? 'Hire' : 'Retire'}
                        </span>
                        <span style={{ flex: 1, color: '#e2e8f0' }}>{c.coachName || '—'}</span>
                        <span style={{
                          fontSize: '10px', fontWeight: 700,
                          color: c.outcome === 'success' ? '#22c55e' : '#f43f5e',
                          letterSpacing: '0.04em', textTransform: 'uppercase' as const,
                        }}>
                          {c.outcome === 'success' ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                {moves.resigns.length > 0 && subSection('Re-signs', '#22c55e', moves.resigns.map((m, i) => (
                  <div key={i}>{moverRow(m)}</div>
                )))}
                {moves.promotions.length > 0 && subSection('Prospect Promotions', '#38bdf8', moves.promotions.map((m, i) => (
                  <div key={i}>{moverRow(m)}</div>
                )))}
                {moves.rookies.length > 0 && subSection('Rookie Picks', '#a78bfa', moves.rookies.map((m, i) => (
                  <div key={i}>{moverRow(m)}</div>
                )))}
                {moves.faSignings.length > 0 && subSection('Free Agent Signings', '#f59e0b', moves.faSignings.map((m, i) => (
                  <div key={i}>{moverRow(m)}</div>
                )))}
                {moves.cuts.length > 0 && subSection('Cuts', '#f43f5e', moves.cuts.map((m, i) => (
                  <div key={i}>{moverRow(m, m.reason === 'gm_vote' ? { text: 'GM Vote', color: '#f43f5e' } : { text: 'Expired', color: '#94a3b8' })}</div>
                )))}
              </div>
            )}
          </div>
        )}
        {teamRookieTally.length > 0 && (
          <div style={{ borderTop: '1px solid #334155' }}>
            <button
              onClick={() => setRookieTallyOpen(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', background: 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left' as const,
              }}
            >
              <span style={{
                fontSize: '10px', color: '#64748b',
                transform: rookieTallyOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s',
              }}>▶</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>
                Rookie Vote Tallies
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Aggregated rookie ballot for {teamAbbr}
              </span>
            </button>
            {rookieTallyOpen && (
              <div style={{ padding: '4px 14px 14px' }}>
                {teamRookieTally.map((p, idx) => {
                  const draftedByMe = p.draftedByTeamAbbr === teamAbbr
                  const draftedByOther = !!p.draftedByTeamAbbr && !draftedByMe
                  const status = draftedByMe
                    ? { label: 'Drafted by us', color: '#22c55e' }
                    : draftedByOther
                      ? { label: `Picked by ${p.draftedByTeamAbbr}`, color: '#f43f5e' }
                      : null
                  return (
                    <div key={`${p.id}-${idx}`} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '5px 0', fontSize: '13px',
                      borderBottom: idx < teamRookieTally.length - 1 ? '1px solid #1e293b' : 'none',
                    }}>
                      <span style={{
                        fontSize: '12px', fontWeight: 700,
                        color: idx === 0 ? '#f59e0b' : '#94a3b8',
                        minWidth: '22px',
                      }}>
                        {idx + 1}.
                      </span>
                      <Stars stars={calcStars(p.rating)} size={11} />
                      <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0' }}>
                        <PlayerLink
                          playerId={p.id}
                          playerName={p.name}
                          style={{ color: '#e2e8f0' }}
                        />
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {p.position}
                        </span>
                      </span>
                      {status && (
                        <span style={{
                          fontSize: '10px', fontWeight: 700, color: status.color,
                          letterSpacing: '0.04em', textTransform: 'uppercase' as const,
                        }}>
                          {status.label}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        {hasResolvedTallies && (
          <div style={{ borderTop: '1px solid #334155' }}>
            <button
              onClick={() => setFanVotesOpen(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', background: 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left' as const,
              }}
            >
              <span style={{
                fontSize: '10px', color: '#64748b',
                transform: fanVotesOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s',
              }}>▶</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>
                Free Agent Vote Tallies
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Resolved overall priority — top of list goes first
              </span>
            </button>
            {fanVotesOpen && (
              <div style={{ padding: '4px 14px 14px' }}>
                {teamFaVotes.map((p, idx) => (
                  <div key={`${p.id}-${idx}`} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '4px 0', fontSize: '13px',
                    borderBottom: idx < teamFaVotes.length - 1 ? '1px solid #1e293b' : 'none',
                  }}>
                    <span style={{
                      fontSize: '12px', fontWeight: 700,
                      color: idx === 0 ? '#f59e0b' : '#94a3b8',
                      minWidth: '22px',
                    }}>
                      {idx + 1}.
                    </span>
                    <PositionChip position={p.position} />
                    <Stars stars={calcStars(p.rating)} size={11} />
                    <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0' }}>
                      <PlayerLink
                        playerId={p.id}
                        playerName={p.name}
                        style={{ color: '#e2e8f0' }}
                      />
                      {p.isProspect && (
                        <span style={{
                          fontSize: '10px', fontWeight: 700, color: '#f59e0b',
                          letterSpacing: '0.04em',
                        }}>
                          PROSPECT
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Dormant state: before Week 10
  if (!isActive) {
    return (
      <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
        {sectionHeader('The Front Office')}
        <div style={{ padding: '20px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
            The Board of Directors convenes in Week {GM_ACTIVE_WEEK}. Until then, they are merely... observing.
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (gm.loading && !gm.eligible) {
    return (
      <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
        {sectionHeader('The Front Office')}
        <div style={{ padding: '20px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Convening the board...</div>
        </div>
      </div>
    )
  }

  if (!gm.eligible) return null

  return (
    <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
      {sectionHeader('The Front Office', true)}

      {/* FA Requisition — always visible when the board is active so fans can
          find the ballot. When there are no projected openings, we explain
          why voting isn't available rather than hiding the section entirely. */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' as const }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '2px' }}>
            Free Agent Requisition
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            {faOpenSlots.length > 0
              ? <>{faOpenSlots.length} slot{faOpenSlots.length !== 1 ? 's' : ''} projected to open · {existingFaBallot ? `ballot submitted (${existingFaBallot.length} ranked)` : 'no ballot on file'}</>
              : <>No roster openings projected — the board will vote on vacancies once cut/resign motions settle or contracts expire</>
            }
          </div>
        </div>
        <button
          onClick={() => setFaModalOpen(true)}
          disabled={faOpenSlots.length === 0}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '4px',
            border: `1px solid ${faOpenSlots.length === 0 ? '#334155' : teamColor}`,
            backgroundColor: faOpenSlots.length === 0 ? 'transparent' : `${teamColor}20`,
            color: faOpenSlots.length === 0 ? '#475569' : '#e2e8f0',
            cursor: faOpenSlots.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {existingFaBallot ? 'Revise Ballot' : 'Open Ballot'}
        </button>
      </div>

      {/* Fan Vote Tallies — single overall priority list. Live during the
          voting window; once the offseason ballot resolves, the post-IRV
          ranking takes over. Position chip on every entry since the list
          is no longer grouped by position. */}
      {(() => {
        const resolved = teamFaVotes.length > 0
        const live = liveBallotTally.length > 0
        if (!resolved && !live) return null
        const data: Array<FanVoteEntry & { votes?: number; firstChoice?: number }> =
          resolved ? teamFaVotes : liveBallotTally
        return (
          <div style={{ borderBottom: '1px solid #334155' }}>
            <button
              onClick={() => setFanVotesOpen(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', background: 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left' as const,
              }}
            >
              <span style={{
                fontSize: '10px', color: '#64748b',
                transform: fanVotesOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s',
              }}>▶</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>
                Free Agent Vote Tallies
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {resolved
                  ? 'Resolved overall priority — top of list goes first'
                  : `Live tally — ${totalBallots} ballot${totalBallots === 1 ? '' : 's'} in so far`}
              </span>
            </button>
            {fanVotesOpen && (
              <div style={{ padding: '4px 14px 14px' }}>
                {data.map((p, idx) => {
                  const votes = p.votes
                  return (
                    <div key={`${p.id}-${idx}`} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '4px 0', fontSize: '13px',
                      borderBottom: idx < data.length - 1 ? '1px solid #1e293b' : 'none',
                    }}>
                      <span style={{
                        fontSize: '12px', fontWeight: 700,
                        color: idx === 0 ? '#f59e0b' : '#94a3b8',
                        minWidth: '22px',
                      }}>
                        {idx + 1}.
                      </span>
                      <PositionChip position={p.position} />
                      <Stars stars={calcStars(p.rating)} size={11} />
                      <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0' }}>
                        <PlayerLink
                          playerId={p.id}
                          playerName={p.name}
                          style={{ color: '#e2e8f0' }}
                        />
                        {p.isProspect && (
                          <span style={{
                            fontSize: '10px', fontWeight: 700, color: '#f59e0b',
                            letterSpacing: '0.04em',
                          }}>
                            PROSPECT
                          </span>
                        )}
                      </span>
                      {!resolved && votes != null && (
                        <span style={{
                          fontSize: '12px', fontWeight: 700, color: '#60a5fa',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {votes} vote{votes === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      <div style={{ padding: '14px' }}>
        {/* Two-column layout: Coaching (left) | Roster (right) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '20px',
          alignItems: 'start',
        }}>
          {/* Left column: Coaching */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {gm.eligible.coach && (
              <FireCoachCard
                coach={gm.eligible.coach}
                availableCoaches={gm.eligible.coachCandidates}
                tally={coachTally}
                teamColor={teamColor}
                voting={gm.voting === 'fire_coach'}
                onVote={(dir) => gm.castVote('fire_coach', undefined, dir)}
                myStance={myStanceOnTarget('fire_coach')}
                undoing={gm.undoing === 'fire_coach'}
                onUndo={() => gm.undoVote('fire_coach')}
                myVoteCount={myVotesOnTarget('fire_coach')}
                lastCost={lastTargetCost('fire_coach')}
                disabled={globalDisabled || fireCoachDisabled || balance < nextCostByType.fire_coach}
                nextCost={nextCostByType.fire_coach}
                thresholdMet={!!coachTally && coachTally.votes >= coachTally.threshold}
              />
            )}

            {gm.eligible.coachCandidates.length > 0 && (
              <HireCoachCard
                availableCoaches={gm.eligible.coachCandidates}
                tallies={gm.summary?.tallies ?? []}
                teamColor={teamColor}
                voting={gm.voting}
                onVote={(coachId) => gm.castVote('hire_coach', coachId)}
                undoing={gm.undoing}
                onUndo={(coachId) => gm.undoVote('hire_coach', coachId)}
                myVoteCount={(coachId) => myVotesOnTarget('hire_coach', coachId)}
                disabledIds={disabledHireCoachIds}
                globalDisabled={globalDisabled}
                balance={balance}
                getCost={(coachId) => nextTargetCost('hire_coach', coachId)}
                lastCost={(coachId) => lastTargetCost('hire_coach', coachId)}
              />
            )}
          </div>

          {/* Right column: Roster */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {(gm.eligible.retiringPlayers?.length ?? 0) > 0 && (
              <div style={{
                background: '#1e2d3d',
                border: '1px solid #2a3a4e',
                borderLeft: '3px solid #f59e0b',
                borderRadius: '6px',
                padding: '14px 16px',
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#f59e0b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '8px',
                }}>
                  Retirement Watch
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                  These veterans have announced they will retire after this season. Plan replacements via the FA ballot.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {gm.eligible.retiringPlayers!.map(p => (
                    <div key={p.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: '#cbd5e1',
                      padding: '4px 0',
                    }}>
                      <span>
                        <span style={{ color: '#94a3b8', marginRight: '8px' }}>{p.position}</span>
                        {p.name}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>OVR {p.rating}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ResignPlayerCard
              players={gm.eligible.expiringPlayers}
              tallies={gm.summary?.tallies ?? []}
              teamColor={teamColor}
              voting={gm.voting}
              onVote={(playerId, dir) => gm.castVote('resign_player', playerId, dir)}
              undoing={gm.undoing}
              onUndo={(playerId) => gm.undoVote('resign_player', playerId)}
              myVoteCount={(playerId) => myVotesOnTarget('resign_player', playerId)}
              myStance={(playerId) => myStanceOnTarget('resign_player', playerId)}
              disabledIds={disabledResignIds}
              globalDisabled={globalDisabled}
              balance={balance}
              getCost={(playerId) => nextTargetCost('resign_player', playerId)}
              lastCost={(playerId) => lastTargetCost('resign_player', playerId)}
            />

            <CutPlayerCard
              players={gm.eligible.rosteredPlayers.filter(p => p.termRemaining > 1 && !p.willRetire)}
              tallies={gm.summary?.tallies ?? []}
              teamColor={teamColor}
              voting={gm.voting}
              onVote={(playerId, dir) => gm.castVote('cut_player', playerId, dir)}
              undoing={gm.undoing}
              onUndo={(playerId) => gm.undoVote('cut_player', playerId)}
              myVoteCount={(playerId) => myVotesOnTarget('cut_player', playerId)}
              myStance={(playerId) => myStanceOnTarget('cut_player', playerId)}
              disabledIds={disabledCutIds}
              globalDisabled={globalDisabled}
              balance={balance}
              getCost={(playerId) => nextTargetCost('cut_player', playerId)}
              lastCost={(playerId) => lastTargetCost('cut_player', playerId)}
            />
          </div>
        </div>

        {/* Resolved events from WebSocket during this session */}
        {gm.resolvedEvents.length > 0 && (
          <div style={{ marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '12px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}>
              Live Resolutions
            </div>
            {gm.resolvedEvents.map((ev, i) => {
              const isSuccess = ev.outcome === 'success'
              return (
                <div key={i} style={{
                  fontSize: '11px',
                  color: isSuccess ? '#22c55e' : '#f59e0b',
                  padding: '3px 0',
                }}>
                  {isSuccess ? 'RATIFIED' : ev.outcome === 'below_threshold' ? 'INSUFFICIENT QUORUM' : 'MOTION DENIED'}
                  {' \u2014 '}
                  <span style={{ color: '#94a3b8' }}>
                    {ev.voteType.replace('_', ' ')}{ev.targetPlayerName ? `: ${ev.targetPlayerName}` : ''}
                  </span>
                </div>
              )
            })}
          </div>
        )}

      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="The Front Office">
        <GuideSection title="Directives">
          As a board member, you may issue directives to influence your team's decisions.
          You get one vote per decision: back it or oppose it, for a flat Floobit cost.
          Changed your mind? Withdraw your vote for a refund, then cast the other way.
        </GuideSection>
        <GuideSection title="Quorum & Ratification">
          Coach hires are decided by simple plurality: whichever candidate receives the most
          votes is hired. Other directives (fire coach, re-sign, cut) need vote totals that
          meet or exceed the team's active fan count to ratify. The active fan count freezes
          when the Front Office opens in Week {GM_ACTIVE_WEEK}, so late-arriving fans don't
          shift the bar mid-vote.
        </GuideSection>
        <GuideSection title="Resolution">
          All motions are resolved at the end of the season during the offseason proceedings.
          Threshold votes (fire / re-sign / cut) pass when their tally meets or exceeds the
          team's active fan count, otherwise the motion is denied. Hire votes go to whichever
          candidate received the most votes.
        </GuideSection>
        <GuideSection title="Coaching Appointments">
          If a grievance against the head coach is ratified, the board may also nominate a
          preferred replacement from the available coaching pool. The nominee with the most
          votes is appointed. If nobody nominates anyone, a coach is appointed at random.
        </GuideSection>
        <GuideSection title="Free Agent Requisitions">
          Rank up to 5 replacements for projected roster openings — walk-year players, cut-vote
          targets, and current prospects all appear on the same ballot. Submit any time once the
          board convenes (Week {GM_ACTIVE_WEEK}). If the ballot achieves quorum and is ratified,
          the front office will prioritize those names during the draft using ranked-choice voting.
        </GuideSection>
      </HelpModal>

      <FaBallotModal
        visible={faModalOpen}
        onClose={() => setFaModalOpen(false)}
        openSlots={faOpenSlots}
        scoutingPlayers={faScoutingPlayers}
        faWindowEnd={faWindowEnd}
        onSubmit={handleSubmitFaBallot}
        submitting={faBallotSubmitting}
        existingBallot={existingFaBallot}
      />
    </div>
  )
}


export default FrontOfficePanel
