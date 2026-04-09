import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useFloosball } from '@/contexts/FloosballContext'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import PlayerAvatar from '@/Components/PlayerAvatar'
import { Stars } from '@/Components/Stars'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
const STORAGE_KEY = 'lastSeenRecapSeason'

// Prize constants (match FantasyLeaderboard.tsx and backend constants.py)
const FANTASY_PRIZES: Record<number, number> = { 1: 200, 2: 125, 3: 75 }
const FANTASY_TOP_PCT = 0.25
const FANTASY_TOP_PCT_PRIZE = 25
const PICKEM_PRIZES: Record<number, number> = { 1: 75, 2: 50, 3: 25 }
const PICKEM_TOP_PCT = 0.25
const PICKEM_TOP_PCT_PRIZE = 10

interface SeasonData {
  champion: { name?: string; city?: string; abbr?: string; color?: string; id?: number } | null
  mvp: { name?: string; position?: string; team?: string; teamAbbr?: string; teamId?: number; teamColor?: string; id?: number; ratingStars?: number } | null
  allPro: Array<{ name?: string; position?: string; team?: string; teamAbbr?: string; teamId?: number; teamColor?: string; id?: number; ratingStars?: number }> | null
}

interface FantasyData {
  rank: number
  total: number
  totalEntries: number
  earnedFP: number
  cardBonus: number
}

interface PickEmData {
  rank: number
  totalEntries: number
  correctCount: number
  totalPicks: number
  totalPoints: number
  accuracy: number
}

interface TeamRecord {
  teamId: number
  teamName: string
  teamColor: string
  wins: number
  losses: number
  isChampion: boolean
  playoffResult?: string
}

interface FundingUpdate {
  currentTier: string
  nextSeasonTier: string
  currentFunding: number
  nextSeasonFunding: number
}

function computePrize(rank: number, totalEntries: number, prizes: Record<number, number>, topPct: number, topPctPrize: number): number {
  if (prizes[rank]) return prizes[rank]
  const cutoff = Math.max(1, Math.ceil(totalEntries * topPct))
  if (rank <= cutoff) return topPctPrize
  return 0
}

const SeasonRecapModal: React.FC = () => {
  const { seasonState } = useFloosball()
  const { user, getToken } = useAuth()
  const isMobile = useIsMobile()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)

  const [seasonData, setSeasonData] = useState<SeasonData | null>(null)
  const [fantasyData, setFantasyData] = useState<FantasyData | null>(null)
  const [pickEmData, setPickEmData] = useState<PickEmData | null>(null)
  const [teamRecord, setTeamRecord] = useState<TeamRecord | null>(null)
  const [fundingUpdate, setFundingUpdate] = useState<FundingUpdate | null>(null)

  const seasonNumber = seasonState.seasonNumber

  // Check visibility
  useEffect(() => {
    if (!seasonState.seasonComplete || !seasonNumber || seasonNumber <= 0) return
    const lastSeen = localStorage.getItem(STORAGE_KEY)
    if (lastSeen !== String(seasonNumber)) {
      setVisible(true)
    }
  }, [seasonState.seasonComplete, seasonNumber])

  // Fetch data when modal becomes visible
  const fetchRecapData = useCallback(async () => {
    if (!seasonNumber || !user) return
    setLoading(true)

    const tok = await getToken()
    const authHeaders: Record<string, string> = {}
    if (tok) authHeaders['Authorization'] = `Bearer ${tok}`

    try {
      // Fetch all in parallel
      const favTeamId = user.favoriteTeamId
      const [seasonResp, fantasyResp, pickemResp, standingsResp, fundingResp] = await Promise.allSettled([
        fetch(`${API_BASE}/season`).then(r => r.json()),
        fetch(`${API_BASE}/fantasy/snapshot`, { headers: authHeaders }).then(r => r.json()),
        fetch(`${API_BASE}/pickem/leaderboard`).then(r => r.json()),
        fetch(`${API_BASE}/standings`).then(r => r.json()),
        favTeamId
          ? Promise.all([
              fetch(`${API_BASE}/teams/${favTeamId}`).then(r => r.json()),
              fetch(`${API_BASE}/teams/${favTeamId}/projected-funding`).then(r => r.json()),
            ])
          : Promise.resolve(null),
      ])

      // Season data (champion, MVP, All-Pro)
      if (seasonResp.status === 'fulfilled') {
        const d = seasonResp.value.data ?? seasonResp.value
        setSeasonData({
          champion: d.champion ?? null,
          mvp: d.mvp ?? null,
          allPro: d.allPro ?? d.all_pro ?? null,
        })
      }

      // Fantasy data
      if (fantasyResp.status === 'fulfilled') {
        const d = fantasyResp.value.data ?? fantasyResp.value
        const entries = d.entries ?? []
        const myEntry = entries.find((e: any) => e.userId === user.id)
        if (myEntry) {
          setFantasyData({
            rank: myEntry.rank,
            total: myEntry.seasonTotal,
            totalEntries: entries.length,
            earnedFP: myEntry.seasonEarnedFP,
            cardBonus: myEntry.seasonCardBonus,
          })
        }
      }

      // Pick-em data
      if (pickemResp.status === 'fulfilled') {
        const d = pickemResp.value.data ?? pickemResp.value
        const entries = d.season?.entries ?? []
        const myEntry = entries.find((e: any) => e.userId === user.id)
        if (myEntry) {
          setPickEmData({
            rank: myEntry.rank,
            totalEntries: entries.length,
            correctCount: myEntry.correctCount,
            totalPicks: myEntry.totalPicks,
            totalPoints: myEntry.totalPoints,
            accuracy: myEntry.accuracy,
          })
        }
      }

      // Funding data for favorite team
      if (fundingResp.status === 'fulfilled' && fundingResp.value) {
        const [teamData, projectedData] = fundingResp.value as [any, any]
        const teamD = teamData?.data ?? teamData
        const projD = projectedData?.data ?? projectedData
        const currentTier = teamD?.funding?.tier || 'SMALL_MARKET'
        const currentFunding = teamD?.funding?.effectiveFunding ?? 0
        const nextSeasonTier = projD?.nextSeasonProjectedTier || currentTier
        const nextSeasonFunding = projD?.nextSeasonProjectedFunding ?? 0
        setFundingUpdate({ currentTier, nextSeasonTier, currentFunding, nextSeasonFunding })
      }

      // Standings → favorite team record
      if (standingsResp.status === 'fulfilled' && user.favoriteTeamId) {
        const d = standingsResp.value.data ?? standingsResp.value
        // Standings is an array of league objects, each with a standings array of team dicts
        const leagues = Array.isArray(d) ? d : Object.values(d)
        const allTeams = leagues.flatMap((l: any) => l.standings ?? [l])
        for (const entry of allTeams as any[]) {
          const teamId = entry.id ?? entry.team?.id ?? entry.teamId
          if (teamId === user.favoriteTeamId || String(teamId) === String(user.favoriteTeamId)) {
            const teamName = entry.city && entry.name
              ? `${entry.city} ${entry.name}`
              : entry.team ? `${entry.team.city ?? ''} ${entry.team.name ?? ''}`.trim() : 'Your Team'
            let playoffResult: string | undefined
            if (entry.floosbowlChampion) playoffResult = 'Won the Floosbowl'
            else if (entry.eliminated) playoffResult = 'Eliminated from playoffs'
            else if (entry.clinchedPlayoffs) playoffResult = 'Made the playoffs'
            setTeamRecord({
              teamId: teamId,
              teamName,
              teamColor: entry.color ?? '#334155',
              wins: entry.wins ?? 0,
              losses: entry.losses ?? 0,
              isChampion: false, // updated below
              playoffResult,
            })
            break
          }
        }
      }
    } catch (err) {
      console.error('Error fetching season recap data:', err)
    } finally {
      setLoading(false)
    }
  }, [seasonNumber, user, getToken])

  useEffect(() => {
    if (visible) fetchRecapData()
  }, [visible, fetchRecapData])

  // Mark champion status on team record once both data sources are loaded
  useEffect(() => {
    if (teamRecord && seasonData?.champion && user?.favoriteTeamId) {
      const champId = seasonData.champion.id
      if (champId === user.favoriteTeamId || String(champId) === String(user.favoriteTeamId)) {
        setTeamRecord(prev => prev ? { ...prev, isChampion: true } : prev)
      }
    }
  }, [teamRecord, seasonData, user?.favoriteTeamId])

  useEffect(() => {
    if (!visible) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [visible])

  const handleDismiss = () => {
    if (seasonNumber && seasonNumber > 0) {
      localStorage.setItem(STORAGE_KEY, String(seasonNumber))
    }
    setVisible(false)
  }

  const handleVisitFrontOffice = () => {
    handleDismiss()
    if (user?.favoriteTeamId) {
      window.location.href = `/team/${user.favoriteTeamId}`
    }
  }

  const isOffseason = seasonState.currentWeekText === 'Offseason'
  const nextSeasonStart = seasonState.nextSeasonStartTime

  // Countdown timer for offseason
  const [countdown, setCountdown] = useState('')
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!visible || !isOffseason || !nextSeasonStart) {
      setCountdown('')
      return
    }
    const update = () => {
      const target = new Date(nextSeasonStart).getTime()
      const now = Date.now()
      const diff = target - now
      if (diff <= 0) { setCountdown(''); return }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const parts: string[] = []
      if (days > 0) parts.push(`${days}d`)
      if (hours > 0) parts.push(`${hours}h`)
      parts.push(`${minutes}m`)
      setCountdown(parts.join(' '))
    }
    update()
    countdownRef.current = setInterval(update, 60000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [visible, isOffseason, nextSeasonStart])

  if (!visible) return null

  const hasFavoriteTeam = !!(user?.favoriteTeamId)

  const fantasyPrize = fantasyData ? computePrize(fantasyData.rank, fantasyData.totalEntries, FANTASY_PRIZES, FANTASY_TOP_PCT, FANTASY_TOP_PCT_PRIZE) : 0
  const pickEmPrize = pickEmData ? computePrize(pickEmData.rank, pickEmData.totalEntries, PICKEM_PRIZES, PICKEM_TOP_PCT, PICKEM_TOP_PCT_PRIZE) : 0
  const totalPrizes = fantasyPrize + pickEmPrize

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        backgroundColor: 'rgba(0,0,0,0.8)',
        fontFamily: 'pressStart, monospace',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '24px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleDismiss() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : '580px',
          maxHeight: isMobile ? '90vh' : '85vh',
          backgroundColor: '#1e293b',
          border: isMobile ? 'none' : '1px solid #334155',
          borderRadius: isMobile ? '14px 14px 0 0' : '14px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column' as const,
        }}
      >
        {/* Header */}
        <div style={{ padding: '28px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
              Season {seasonNumber} Recap
            </h2>
            <button
              onClick={handleDismiss}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >
              x
            </button>
          </div>
          <div style={{ width: '100%', height: '1px', backgroundColor: '#334155', marginTop: '18px' }} />
        </div>

        {/* Scrollable content */}
        <div style={{ padding: '22px 28px 28px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Loading recap...</span>
            </div>
          ) : (
            <>
              {/* === Season Awards === */}
              <div style={{
                backgroundColor: '#0f172a',
                borderRadius: '10px',
                padding: '18px',
                marginBottom: '20px',
                border: '1px solid #1e3a5f',
              }}>
                {/* Champion */}
                {seasonData?.champion && (
                  <div style={{ marginBottom: '18px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '10px' }}>
                      Floosbowl Champion
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {seasonData.champion.id && (
                        <img
                          src={`/avatars/${seasonData.champion.id}.png`}
                          alt={seasonData.champion.abbr || ''}
                          style={{ width: '36px', height: '36px', flexShrink: 0 }}
                        />
                      )}
                      <p style={{ fontSize: '18px', fontWeight: '700', color: seasonData.champion.color || '#e2e8f0', margin: 0 }}>
                        {seasonData.champion.city} {seasonData.champion.name}
                      </p>
                    </div>
                  </div>
                )}

                {/* MVP */}
                {seasonData?.mvp && (
                  <div style={{ marginBottom: '18px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '10px' }}>
                      Most Valuable Player
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <PlayerAvatar name={seasonData.mvp.name || ''} size={56} bgColor={seasonData.mvp.teamColor || '#1e293b'} style={{ borderRadius: '50%', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '17px', fontWeight: '700', color: '#e2e8f0' }}>
                            {seasonData.mvp.name}
                          </span>
                          {seasonData.mvp.ratingStars != null && <Stars stars={seasonData.mvp.ratingStars} size={20} />}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <span style={{ fontSize: '14px', color: '#cbd5e1' }}>{seasonData.mvp.position}</span>
                          <span style={{ color: '#475569' }}>·</span>
                          {seasonData.mvp.teamId && (
                            <img
                              src={`/avatars/${seasonData.mvp.teamId}.png`}
                              alt={seasonData.mvp.teamAbbr || ''}
                              style={{ width: '18px', height: '18px' }}
                            />
                          )}
                          <span style={{ fontSize: '14px', color: '#cbd5e1' }}>{seasonData.mvp.teamAbbr || seasonData.mvp.team}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* All-Pro */}
                {seasonData?.allPro && seasonData.allPro.length > 0 && (
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '10px' }}>
                      All-Pro Team
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                      {seasonData.allPro.map((p, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          backgroundColor: '#1e293b',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          border: '1px solid #334155',
                        }}>
                          <PlayerAvatar name={p.name || ''} size={42} bgColor={p.teamColor || '#1e293b'} style={{ borderRadius: '50%', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0' }}>{p.name}</span>
                              {p.ratingStars != null && <Stars stars={p.ratingStars} size={18} />}
                            </div>
                          </div>
                          <span style={{ fontSize: '13px', color: '#cbd5e1', flexShrink: 0 }}>{p.position}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                            {p.teamId && (
                              <img
                                src={`/avatars/${p.teamId}.png`}
                                alt={p.teamAbbr || ''}
                                style={{ width: '18px', height: '18px' }}
                              />
                            )}
                            <span style={{ fontSize: '13px', color: '#cbd5e1' }}>{p.teamAbbr}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* === Your Team === */}
              {teamRecord && (
                <div style={{
                  backgroundColor: '#0f172a',
                  borderRadius: '10px',
                  padding: '16px 18px',
                  marginBottom: '20px',
                  border: '1px solid #1e3a5f',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={`/avatars/${teamRecord.teamId}.png`}
                      alt={teamRecord.teamName}
                      style={{ width: '40px', height: '40px', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' }}>
                        Your Team
                      </p>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: teamRecord.teamColor, margin: 0 }}>
                        {teamRecord.teamName}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                      <p style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
                        {teamRecord.wins}-{teamRecord.losses}
                      </p>
                      {teamRecord.isChampion ? (
                        <p style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '700', margin: '2px 0 0' }}>
                          Champions
                        </p>
                      ) : teamRecord.playoffResult ? (
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>
                          {teamRecord.playoffResult}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {fundingUpdate && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #1e3a5f',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Market Tier</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TierBadge tier={fundingUpdate.currentTier} />
                        {fundingUpdate.nextSeasonTier !== fundingUpdate.currentTier && (
                          <>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>&rarr;</span>
                            <TierBadge tier={fundingUpdate.nextSeasonTier} label="Next" />
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: '#334155', margin: '4px 0 20px' }} />

              {/* === Fantasy Results === */}
              {fantasyData && (
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#22c55e', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: 0 }}>
                      Fantasy
                    </p>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#e2e8f0',
                      backgroundColor: 'rgba(34,197,94,0.15)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                    }}>
                      #{fantasyData.rank} <span style={{ color: '#94a3b8', fontWeight: '400' }}>of {fantasyData.totalEntries}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
                    <StatBox label="Total FP" value={fantasyData.total.toFixed(1)} />
                    <StatBox label="Base FP" value={fantasyData.earnedFP.toFixed(1)} secondary />
                    <StatBox label="Card Bonus" value={`+${fantasyData.cardBonus.toFixed(1)}`} secondary />
                    {fantasyPrize > 0 && <StatBox label="Prize" value={`${fantasyPrize}F`} highlight />}
                  </div>
                </div>
              )}

              {/* === Pick-Em Results === */}
              {pickEmData && (
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: 0 }}>
                      Prognostications
                    </p>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#e2e8f0',
                      backgroundColor: 'rgba(167,139,250,0.15)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                    }}>
                      #{pickEmData.rank} <span style={{ color: '#94a3b8', fontWeight: '400' }}>of {pickEmData.totalEntries}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
                    <StatBox label="Correct" value={`${pickEmData.correctCount}/${pickEmData.totalPicks}`} />
                    <StatBox label="Accuracy" value={`${pickEmData.accuracy}%`} secondary />
                    <StatBox label="Points" value={String(pickEmData.totalPoints)} secondary />
                    {pickEmPrize > 0 && <StatBox label="Prize" value={`${pickEmPrize}F`} highlight />}
                  </div>
                </div>
              )}

              {/* === Floobits Summary === */}
              {totalPrizes > 0 && (
                <div style={{
                  backgroundColor: '#0f172a',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  marginBottom: '18px',
                  border: '1px solid #1e3a5f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Season Prize Earnings</span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#f59e0b' }}>
                    {totalPrizes}F
                  </span>
                </div>
              )}

              <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 18px' }}>
                A 25% season-end tax was applied to unspent Floobits.{hasFavoriteTeam ? ' Your tax funded your favorite team\'s market status.' : ''}
              </p>

              {/* === Offseason Reminder === */}
              {isOffseason && (
                <div style={{
                  backgroundColor: 'rgba(59,130,246,0.08)',
                  borderRadius: '10px',
                  padding: '16px 18px',
                  marginBottom: '6px',
                  border: '1px solid rgba(59,130,246,0.2)',
                }}>
                  <p style={{ fontSize: '13px', color: '#93c5fd', lineHeight: '1.6', margin: 0 }}>
                    The offseason is underway — vote on free agent signings for {hasFavoriteTeam ? 'your' : 'a'} team!
                  </p>
                  {hasFavoriteTeam && (
                    <button
                      onClick={handleVisitFrontOffice}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        fontSize: '13px',
                        cursor: 'pointer',
                        padding: '8px 0 0',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      Visit Front Office
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Countdown + Dismiss button */}
        <div style={{ padding: '0 28px 28px', flexShrink: 0 }}>
          {isOffseason && countdown && (
            <p style={{
              fontSize: '12px',
              color: '#94a3b8',
              textAlign: 'center',
              margin: '0 0 10px',
            }}>
              Season {seasonNumber + 1} begins in <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{countdown}</span>
            </p>
          )}
          <button
            onClick={handleDismiss}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            {isOffseason ? 'Continue to Offseason' : `On to Season ${seasonNumber + 1}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

const TIER_LABELS: Record<string, string> = { SMALL_MARKET: 'Small Market', MID_MARKET: 'Mid Market', LARGE_MARKET: 'Large Market', MEGA_MARKET: 'Mega Market' }
const TIER_COLORS: Record<string, string> = { SMALL_MARKET: '#94a3b8', MID_MARKET: '#38bdf8', LARGE_MARKET: '#a78bfa', MEGA_MARKET: '#f59e0b' }

const TierBadge: React.FC<{ tier: string; label?: string }> = ({ tier, label }) => {
  const color = TIER_COLORS[tier] || '#94a3b8'
  const text = label ? `${label}: ${TIER_LABELS[tier] || tier}` : (TIER_LABELS[tier] || tier)
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: '700',
      color,
      backgroundColor: `${color}18`,
      padding: '3px 8px',
      borderRadius: '4px',
      whiteSpace: 'nowrap' as const,
    }}>
      {text}
    </span>
  )
}

const StatBox: React.FC<{ label: string; value: string; secondary?: boolean; highlight?: boolean }> = ({ label, value, secondary, highlight }) => (
  <div style={{
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    padding: '10px 14px',
    border: '1px solid #1e3a5f',
    minWidth: '70px',
  }}>
    <p style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.3px', margin: '0 0 4px' }}>
      {label}
    </p>
    <p style={{
      fontSize: secondary ? '14px' : '16px',
      fontWeight: '700',
      color: highlight ? '#f59e0b' : (secondary ? '#cbd5e1' : '#e2e8f0'),
      margin: 0,
    }}>
      {value}
    </p>
  </div>
)

export default SeasonRecapModal
