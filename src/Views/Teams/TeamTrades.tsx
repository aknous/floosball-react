import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import HoverTooltip from '@/Components/HoverTooltip'
import PlayerLink from '@/Components/PlayerLink'
import { Stars, calcStars } from '@/Components/Stars'
import { TRADE_MOVE_LABEL } from '@/hooks/useTransactions'
import type { TradeAsset, TradeMove } from '@/hooks/useTransactions'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface TeamRef {
  id: number
  name: string
  city?: string | null
  abbr?: string
  color?: string | null
}

export interface TeamTrade {
  id: number
  season: number
  week: number
  phase: string
  partner: TeamRef | null
  /** What left this team. */
  gave: TradeAsset[]
  /** What arrived. */
  got: TradeAsset[]
  /** Roster moves the trade forced, on either side. Absent on older trades and swaps. */
  moves?: TradeMove[]
}

export interface PickEntry {
  season: number
  round: number
  originalTeam: TeamRef | null
  owner: TeamRef | null
  own: boolean
  /** Only on the next draft, off this season's table. A future draft has no order yet. */
  projectedSlot: number | null
}

export interface DraftStock {
  season: number
  projected: boolean
  held: PickEntry[]
  tradedAway: PickEntry[]
}

/** A team's trade ledger and its rookie-draft pick stock, for the team page. */
export function useTeamTrades(teamId: number | null | undefined) {
  const [trades, setTrades] = useState<TeamTrade[]>([])
  const [drafts, setDrafts] = useState<DraftStock[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teamId) { setLoading(false); return }
    let live = true
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/teams/${teamId}/trades`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API_BASE}/teams/${teamId}/picks`).then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([t, p]) => {
      if (!live) return
      setTrades(t?.data?.trades ?? [])
      setDrafts(p?.data?.drafts ?? [])
    }).finally(() => { if (live) setLoading(false) })
    // Cancel on team change, so a slow response cannot land on the next team's page.
    return () => { live = false }
  }, [teamId])

  return { trades, drafts, loading }
}

const Crest: React.FC<{ team: TeamRef | null; size?: number }> = ({ team, size = 18 }) =>
  team ? (
    <img src={`/avatars/${team.id}.png`} alt="" width={size} height={size}
         style={{ flexShrink: 0, display: 'block' }} />
  ) : null

const TeamLink: React.FC<{ team: TeamRef | null }> = ({ team }) =>
  team ? (
    <Link to={`/team/${team.id}`} style={{ color: '#e2e8f0', fontWeight: 600, textDecoration: 'none' }}>
      {team.city ? `${team.city} ${team.name}` : team.name}
    </Link>
  ) : <span style={{ color: '#94a3b8' }}>&ndash;</span>

// ── Pick stock ──────────────────────────────────────────────────────────────

/**
 * Picks the team holds for each upcoming rookie draft, and its own picks now held by
 * someone else.
 *
 * ⚠️ A PICK RIDES ON ITS ORIGINAL TEAM'S FINISH, not its owner's, so every acquired pick
 * names whose record decides it. That is what makes a pick from a bad team worth having.
 * Only the next draft shows a slot: a later one resolves off a season not yet played.
 */
export const PickStock: React.FC<{ drafts: DraftStock[] }> = ({ drafts }) => {
  if (drafts.length === 0) {
    return <div style={{ fontSize: '13px', color: '#cbd5e1' }}>No upcoming drafts on the books.</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {drafts.map(d => (
        <div key={d.season}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>
              Season {d.season} draft
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {d.held.length === 0 ? 'no picks'
                : `${d.held.length} pick${d.held.length === 1 ? '' : 's'}`}
            </span>
          </div>
          {d.held.map(p => (
            <PickRow key={`h-${p.season}-${p.round}-${p.originalTeam?.id}`} pick={p} />
          ))}
          {d.tradedAway.map(p => (
            <PickRow key={`a-${p.season}-${p.round}-${p.originalTeam?.id}`} pick={p} away />
          ))}
        </div>
      ))}
    </div>
  )
}

const PickRow: React.FC<{ pick: PickEntry; away?: boolean }> = ({ pick, away }) => {
  const slot = pick.projectedSlot != null ? `#${pick.projectedSlot}` : `R${pick.round}`
  const slotHelp = pick.projectedSlot != null
    ? `Projected slot if the season ended today, off ${pick.own ? 'this team’s' : `${pick.originalTeam?.name ?? 'the original team'}’s`} record.`
    : 'Slot set by where the original team finishes that season.'
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '38px 20px minmax(0,1fr)', gap: '8px',
      alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #16202f',
    }}>
      <HoverTooltip text={slotHelp}>
        <span style={{
          fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          color: away ? '#94a3b8' : '#e2e8f0', display: 'inline-block',
        }}>{slot}</span>
      </HoverTooltip>
      <Crest team={away ? pick.owner : pick.originalTeam} size={18} />
      <span style={{ fontSize: '13px', color: away ? '#94a3b8' : '#cbd5e1', minWidth: 0 }}>
        {away ? (
          <>Own pick, traded to <TeamLink team={pick.owner} /></>
        ) : pick.own ? (
          <>Own pick</>
        ) : (
          <>From <TeamLink team={pick.originalTeam} /></>
        )}
      </span>
    </div>
  )
}

// ── Trade history ───────────────────────────────────────────────────────────

const assetLabel = (a: TradeAsset): string => {
  if (a.kind === 'pick') {
    // The manifest names a pick "S9 R1 pick"; read it the way the rest of the page does.
    const m = /^S(\d+)\s+R(\d+)/.exec(a.name ?? '')
    return m ? `Season ${m[1]} pick` : (a.name ?? 'Pick')
  }
  return a.name ?? ''
}

const AssetList: React.FC<{ label: string; assets: TradeAsset[] }> = ({ label, assets }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.02em', marginBottom: '4px' }}>
      {label}
    </div>
    {assets.length === 0 ? (
      <div style={{ fontSize: '13px', color: '#94a3b8' }}>Nothing</div>
    ) : assets.map((a, i) => (
      <div key={`${a.kind}-${a.id ?? i}`} style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0', minWidth: 0,
      }}>
        {(a.kind === 'player' || a.kind === 'prospect') && a.id != null ? (
          <PlayerLink playerId={a.id} playerName={a.name ?? ''}
            style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '13px' }} />
        ) : (
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{assetLabel(a)}</span>
        )}
        {a.kind === 'prospect' && <span style={{ fontSize: '11px', color: '#94a3b8' }}>prospect</span>}
        {a.kind === 'player' && a.detail && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{a.detail}</span>}
        {/* Only where there is a player: a pick has no rating, and one who has left the
            league cannot be resolved, so no stars rather than a default one-star read. */}
        {a.rating != null && (
          <HoverTooltip text={`Rated ${Math.round(a.rating)} now`}>
            <span style={{ display: 'inline-block' }}>
              <Stars stars={calcStars(a.rating)} size={12} tracking={2} />
            </span>
          </HoverTooltip>
        )}
      </div>
    ))}
  </div>
)

/**
 * The roster moves the trade forced: this team's release, signing or promotion, and the
 * partner's. A partner's move names the partner, since it happened on the other roster.
 */
const TradeMoves: React.FC<{ moves: TradeMove[]; partnerId?: number }> = ({ moves, partnerId }) => (
  <div style={{ marginTop: '10px' }}>
    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.02em', marginBottom: '4px' }}>
      Roster moves
    </div>
    {moves.map((m, i) => {
      const partner = partnerId != null && m.team?.id === partnerId
      return (
        <div key={`${m.kind}-${m.id ?? i}`} style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px', padding: '2px 0', minWidth: 0,
        }}>
          {partner && <Crest team={m.team} size={14} />}
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
            {partner ? `${m.team?.name} ${(TRADE_MOVE_LABEL[m.kind] ?? m.kind).toLowerCase()}` : (TRADE_MOVE_LABEL[m.kind] ?? m.kind)}
          </span>
          {m.id != null ? (
            <PlayerLink playerId={m.id} playerName={m.name ?? ''}
              style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '13px' }} />
          ) : (
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{m.name}</span>
          )}
          {m.detail && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{m.detail}</span>}
          {m.rating != null && m.rating > 0 && (
            <HoverTooltip text={`Rated ${Math.round(m.rating)} ${m.ratingNow ? 'now' : 'at the time'}`}>
              <span style={{ display: 'inline-block' }}>
                <Stars stars={calcStars(m.rating)} size={12} tracking={2} />
              </span>
            </HoverTooltip>
          )}
          {(m.note || m.fee) && (
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {[m.note, m.fee ? `${m.fee}F cut fee` : null].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      )
    })}
  </div>
)

/** Every trade the team has made, newest first, from this team's side of it. */
export const TradeHistory: React.FC<{ trades: TeamTrade[]; narrow: boolean }> = ({ trades, narrow }) => {
  if (trades.length === 0) {
    return <div style={{ fontSize: '13px', color: '#cbd5e1' }}>No trades yet.</div>
  }
  return (
    <div>
      {trades.map(t => (
        <div key={t.id} style={{ padding: '10px 8px 12px', borderBottom: '1px solid #16202f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              S{t.season} {t.phase === 'offseason' ? 'Offseason' : `Week ${t.week}`}
            </span>
            <Crest team={t.partner} size={18} />
            <span style={{ fontSize: '13px', color: '#cbd5e1', minWidth: 0 }}>
              with <TeamLink team={t.partner} />
            </span>
          </div>
          <div style={{
            display: 'grid', gap: '16px',
            gridTemplateColumns: narrow ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))',
          }}>
            {/* Read by who RECEIVED what (owner): this team's haul first, then the partner's. */}
            <AssetList label="Received" assets={t.got} />
            <AssetList label={`${t.partner?.name ?? 'Partner'} received`} assets={t.gave} />
          </div>
          {(t.moves?.length ?? 0) > 0 && <TradeMoves moves={t.moves!} partnerId={t.partner?.id} />}
        </div>
      ))}
    </div>
  )
}
