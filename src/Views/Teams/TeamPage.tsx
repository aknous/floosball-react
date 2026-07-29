import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiChevronDown } from 'react-icons/fi'

import { useAuth } from '@/contexts/AuthContext'
import { Stars } from '@/Components/Stars'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import TeamNavStrip from '@/Components/TeamNavStrip'
import { CoachProfileTags } from '@/Components/CoachProfile'
import { getContrastTextColor } from '@/utils/colors'
import PlayerRating from '@/Components/Sentiment/PlayerRating'
import TeamFeed from '@/Components/Sentiment/TeamFeed'
import SentimentBoards from '@/Components/Sentiment/SentimentBoards'
import FacilitiesSection from '@/Views/FrontOffice/FacilitiesSection'
import SupporterCard from '@/Components/FrontOffice/SupporterCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * TEAM PAGE — the roster as player cards, grouped by unit.
 *
 * The organising insight: a Floosball roster is SIX players. Earlier versions
 * rendered those six as a table with columns, which is what made the page read
 * like a spreadsheet no matter how it was restyled. Six players is a small
 * enough set to give each one a CARD.
 *
 * An earlier attempt posed them on a field box as an offensive formation. It
 * never read as one, and it forced the kicker into a set they have no place in.
 * Splitting Offense / Special Teams then stranded the kicker alone, and an
 * outsized QB card just put a hole in the grid. Six equal cards read cleanest.
 *
 * Every card carries the two-way identity — offensive slot and defensive
 * assignment — because in Floosball every player plays both sides.
 *
 * Kept by request: the existing font and palette, and per-player star rating,
 * contract length and career status. Everything else is new.
 */

const PAGE_MAX = '1500px'

// One roster, depth-chart order. Earlier passes split this into Offense /
// Special Teams and gave the QB a feature card — but a lone kicker in its own
// group looked stranded, and an outsized QB card just made a hole in the grid.
// Six equal cards read cleanest.
const POSITION_LABEL: Record<string, string> = {
  qb: 'QB', rb: 'RB', wr1: 'WR', wr2: 'WR', te: 'TE', k: 'K',
}
const ROSTER_SLOTS = ['qb', 'rb', 'wr1', 'wr2', 'te', 'k']

interface RosterPlayer {
  id: number
  name: string
  position: string
  rating: number
  ratingStars: number
  termRemaining?: number
  serviceTime?: string
  fatigue?: number
  // Floosball players go both ways: QB→S, RB→LB, WR→CB, TE→DE. Kickers don't
  // play defense, so this is null for them.
  defensivePosition?: string | null
}

interface Coach {
  name: string
  seasonsCoached: number
  profile?: any
}

interface TeamData {
  id: number
  name: string
  city: string
  abbr: string
  league: string
  color: string
  wins: number
  losses: number
  elo: number
  roster: Record<string, RosterPlayer | null>
  schedule: any[]
  history: any[]
  coach: Coach | null
  fundingTier?: string
  floosbowlChampion?: boolean
  clinchedPlayoffs?: boolean
  clinchedTopSeed?: boolean
  eliminated?: boolean
}

// ── Shared pieces ───────────────────────────────────────────────────────────

/** Wide-tracked small caps — the page's only heading treatment. */
// #94a3b8 is the project's floor for readable secondary text — #64748b reads
// as disabled and was genuinely hard to make out at 10px.
// Set in sentence case: labels earn their quiet from weight and tracking, not
// from shouting.
const Kicker: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = '#94a3b8' }) => (
  <span style={{
    fontSize: '11px', letterSpacing: '0.06em', fontWeight: 600,
    color, whiteSpace: 'nowrap',
  }}>{children}</span>
)

/** Label + hairline running to the edge. Sections are parts of one page. */
const Rule: React.FC<{ label: string; color?: string }> = ({ label, color = '#cbd5e1' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
    <Kicker color={color}>{label}</Kicker>
    <span style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }} />
  </div>
)

/** A figure with its label beneath — the scoreboard idiom. */
const Figure: React.FC<{ value: React.ReactNode; label: string; size: number; color?: string }> = ({
  value, label, size, color = '#e2e8f0',
}) => (
  <div>
    <div style={{ fontSize: `${size}px`, lineHeight: 1, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </div>
    <div style={{ marginTop: '5px' }}><Kicker>{label}</Kicker></div>
  </div>
)

/** Career status in one word — what a fan actually reads. Detail lives on the
 *  player page. */
function careerStatus(p: RosterPlayer): { label: string; color: string } {
  const svc = (p.serviceTime || '').toLowerCase()
  if (svc.includes('rookie')) return { label: 'Rookie', color: '#38bdf8' }
  if (svc.includes('veteran3') || svc.includes('veteran4')) return { label: 'Veteran', color: '#a78bfa' }
  if (svc.includes('veteran')) return { label: 'Established', color: '#94a3b8' }
  return { label: 'Active', color: '#94a3b8' }
}

// ── Nameplate ───────────────────────────────────────────────────────────────

const Nameplate: React.FC<{
  slot: string
  player: RosterPlayer | null
  teamColor: string
  canRate: boolean
  onRated: () => void
}> = ({ slot, player, teamColor, canRate, onRated }) => {
  const label = POSITION_LABEL[slot] || slot.toUpperCase()

  if (!player) {
    return (
      <div className="tp-plate tp-plate-empty">
        <div className="tp-tab" style={{ backgroundColor: '#334155', color: '#cbd5e1' }}>{label}</div>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Vacant</span>
      </div>
    )
  }

  const status = careerStatus(player)
  const worn = (player.fatigue ?? 0) > 4

  return (
    <div className="tp-plate">
      {/* Row 1 uses the card's WIDTH — tab, name and rating on one line —
          rather than stacking and leaving the right half of the card empty. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', flexShrink: 0 }}>
          {/* Team colors are DATA — a quarter of the league is dark enough
              that near-black ink on them is unreadable. Let the helper pick. */}
          <span className="tp-tab" style={{
            backgroundColor: teamColor, color: getContrastTextColor(teamColor),
          }}>{label}</span>
          {/* Both ways: the defensive assignment sits beside the roster slot. */}
          {player.defensivePosition && (
            <span className="tp-tab tp-tab-def">{player.defensivePosition}</span>
          )}
        </div>

        <PlayerHoverCard playerId={player.id} playerName={player.name}>
          <Link to={`/players/${player.id}`} style={{
            flex: 1, minWidth: 0, textDecoration: 'none',
            fontSize: '15px', fontWeight: 700, color: '#f1f5f9',
            lineHeight: 1.1, letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{player.name}</Link>
        </PlayerHoverCard>

        <span style={{ flexShrink: 0 }}><Stars stars={player.ratingStars} size={12} /></span>
      </div>

      {/* Row 2: the two facts kept by request. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        marginTop: '8px', fontSize: '11px',
      }}>
        <span style={{ color: status.color, fontWeight: 600 }}>{status.label}</span>
        {player.termRemaining != null && (
          <>
            <span style={{ color: '#475569' }}>&middot;</span>
            <span style={{
              color: player.termRemaining === 1 ? '#f59e0b' : '#94a3b8',
              fontVariantNumeric: 'tabular-nums',
            }}>{player.termRemaining}yr</span>
          </>
        )}
        {worn && (
          <>
            <span style={{ color: '#475569' }}>&middot;</span>
            <span style={{ color: '#f87171' }}>Worn</span>
          </>
        )}
      </div>

      {/* Your rating sits on its own row at the foot of the card, under a
          divider — it's an action, not another stat, and crowding it onto a
          data line squeezed the player's name into an ellipsis. */}
      <div style={{ marginTop: '9px', borderTop: '1px solid #334155', paddingTop: '8px' }}>
        <PlayerRating playerId={player.id} compact canRate={canRate} onChange={onRated} />
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [team, setTeam] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [showTables, setShowTables] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1000)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1000)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`${API_BASE}/teams/${id}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return
        if (json?.data) setTeam(json.data)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  const isMyTeam = !!user?.favoriteTeamId && String(user.favoriteTeamId) === String(id)
  const onRated = useCallback(() => setTick(t => t + 1), [])

  const standing = useMemo(() => {
    if (!team) return null
    if (team.floosbowlChampion) return { label: 'Champion', color: '#f59e0b' }
    if (team.clinchedTopSeed) return { label: 'Top Seed', color: '#ca8a04' }
    if (team.clinchedPlayoffs) return { label: 'Playoffs', color: '#16a34a' }
    if (team.eliminated) return { label: 'Eliminated', color: '#475569' }
    return null
  }, [team])

  // The strip stays up even while the team is loading or missing, so you can
  // always navigate on to another team rather than hitting a dead end.
  if (loading || !team) {
    return (
      <div style={{ backgroundColor: '#0b1220', minHeight: '100vh' }}>
        <TeamNavStrip currentTeamId={team?.id ?? (id ? parseInt(id, 10) : 0)} />
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          {loading ? 'Loading…' : 'Team not found.'}
        </div>
      </div>
    )
  }

  const accent = team.color || '#64748b'

  return (
    <div style={{ backgroundColor: '#0b1220', minHeight: '100vh', paddingBottom: '60px' }}>

      {/* Jump straight to any other team without going back to the league list. */}
      <TeamNavStrip currentTeamId={team.id} />

      {/* ── MASTHEAD ─────────────────────────────────────────────────────
          Team color as a field, name at display size, record as scoreboard
          figures rather than another chip in a row of chips. */}
      <div className="tp-masthead" style={{
        borderBottom: `3px solid ${accent}`,
        background: `linear-gradient(180deg, ${accent}26 0%, #0b1220 100%)`,
      }}>
        <div style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: isMobile ? '22px 16px 16px' : '36px 28px 22px' }}>
          <Kicker color="#94a3b8">{team.league} &middot; {team.city}</Kicker>

          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: isMobile ? '14px' : '22px',
            marginTop: '10px', flexWrap: 'wrap',
          }}>
            <img src={`/avatars/${team.id}.png`} alt=""
                 style={{ width: isMobile ? '48px' : '68px', height: isMobile ? '48px' : '68px' }} />
            <h1 style={{
              margin: 0, fontSize: isMobile ? '32px' : '54px', lineHeight: 0.92,
              fontWeight: 700, letterSpacing: '-0.03em', color: '#f8fafc',
            }}>{team.name}</h1>

            <div style={{ marginLeft: isMobile ? 0 : 'auto', display: 'flex', gap: isMobile ? '22px' : '34px' }}>
              <Figure size={isMobile ? 26 : 38} label="Record"
                      value={<>{team.wins}<span style={{ color: '#334155' }}>–</span>{team.losses}</>} />
              <Figure size={isMobile ? 26 : 38} label="ELO" color="#cbd5e1" value={Math.round(team.elo)} />
            </div>
          </div>

          {(standing || team.fundingTier) && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '16px' }}>
              {standing && (
                <span style={{
                  backgroundColor: standing.color, color: getContrastTextColor(standing.color),
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em',
                  padding: '3px 9px',
                }}>{standing.label}</span>
              )}
              {team.fundingTier && (
                <Kicker>{team.fundingTier.replace(/_/g, ' ').toLowerCase()
                  .replace(/\b\w/g, c => c.toUpperCase())}</Kicker>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: PAGE_MAX, margin: '0 auto', padding: isMobile ? '18px 16px' : '28px' }}>
        <div style={{
          display: 'grid',
          // The ROSTER is the capped column and the rail flexes, not the other
          // way round — six cards don't need 1000px. 760 is the floor that
          // keeps a name like "Raymond Crongulord" off the ellipsis at 2-up.
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 760px) minmax(0, 1fr)',
          gap: isMobile ? '30px' : '36px',
          alignItems: 'start',
        }}>

          {/* ── PERSONNEL ─────────────────────────────────────────────── */}
          <div>
            <Rule label="Roster" />
            <div className="tp-unit">
              {ROSTER_SLOTS.map((slot, i) => (
                <div key={slot} className="tp-slot" style={{ animationDelay: `${i * 45}ms` }}>
                  <Nameplate
                    slot={slot}
                    player={team.roster?.[slot] ?? null}
                    teamColor={accent}
                    canRate={isMyTeam}
                    onRated={onRated}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── SIDELINE ──────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {team.coach && (
              <div>
                <Rule label="Head Coach" />
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.1 }}>
                  {team.coach.name}
                </div>
                <div style={{ marginTop: '3px', fontSize: '11px', color: '#94a3b8' }}>
                  {team.coach.seasonsCoached} season{team.coach.seasonsCoached === 1 ? '' : 's'}
                </div>
                <div style={{ marginTop: '10px' }}>
                  <CoachProfileTags profile={team.coach.profile} />
                </div>
                {/* Same 1-5 control the players use — a GM is judged on the
                    same scale, so it's the same component. */}
                <div style={{ marginTop: '12px' }}>
                  <PlayerRating
                    playerId={team.id}
                    subject="gm"
                    canRate={isMyTeam}
                    onChange={onRated}
                  />
                </div>
              </div>
            )}

            <div>
              <Rule label="The Bleachers" />
              <TeamFeed teamId={team.id} refreshKey={tick} canPost={isMyTeam} />
            </div>

            <SentimentBoards key={tick} teamId={team.id} limit={5} />
          </div>
        </div>

        {/* ── YOUR TEAM ─────────────────────────────────────────────────
            What used to be the separate front-office page. It served the same
            purpose as this one, so it's folded in and gated to your own team. */}
        {isMyTeam && (
          <div style={{ marginTop: '40px' }}>
            <Rule label="Your Team" color={accent} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* The vote cards lived here until step 7 removed the binding
                  votes — the GM decides now, and fans express themselves by
                  rating. What's left is what fans still genuinely control. */}
              <FacilitiesSection />
              <SupporterCard />
            </div>
          </div>
        )}

        {/* ── REFERENCE ───────────────────────────────────────────────── */}
        <button type="button" onClick={() => setShowTables(v => !v)} className="tp-disclose">
          <span>Schedule &amp; Season History</span>
          <FiChevronDown style={{
            fontSize: '16px',
            transform: showTables ? 'rotate(180deg)' : 'none',
            transition: 'transform 160ms ease',
          }} />
        </button>

        {showTables && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr',
            gap: '30px', marginTop: '22px',
          }}>
            <div>
              <Rule label="Schedule" />
              {(team.schedule || []).map((g: any, i: number) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) auto',
                  gap: '10px', alignItems: 'center',
                  padding: '7px 0', borderBottom: '1px solid #16202f',
                  fontSize: '12px', color: '#cbd5e1',
                }}>
                  <span style={{ color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>W{g.week}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.isHome ? 'vs' : '@'} {g.opponent?.name ?? '—'}
                  </span>
                  <span style={{
                    fontVariantNumeric: 'tabular-nums',
                    color: g.result === 'W' ? '#4ade80' : g.result === 'L' ? '#f87171' : '#94a3b8',
                  }}>
                    {g.result ? `${g.result} ${g.teamScore}–${g.opponentScore}` : '—'}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <Rule label="Season History" />
              {(team.history || []).map((h: any, i: number) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '52px minmax(0, 1fr) auto',
                  gap: '10px', alignItems: 'center',
                  padding: '7px 0', borderBottom: '1px solid #16202f',
                  fontSize: '12px', color: '#cbd5e1',
                }}>
                  <span style={{ color: '#94a3b8' }}>S{h.season}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{h.wins}–{h.losses}</span>
                  <span style={{ color: '#94a3b8' }}>{h.result || ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
