import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactions, DraftSlot, Prospect, ExpiringPlayer, BlockListing } from '@/hooks/useTransactions'
import HoverTooltip from '@/Components/HoverTooltip'
import PlayerLink from '@/Components/PlayerLink'
import { useIsMobile } from '@/hooks/useIsMobile'

const INK = '#e2e8f0'
const BODY = '#cbd5e1'
const MUTED = '#94a3b8'
const LINE = '#1e293b'
const PANEL = '#0f172a'
const ACCENT = '#38bdf8'
const WARN = '#f59e0b'

type TabKey = 'order' | 'class' | 'expiring' | 'block' | 'activity'

/** Why a team put this player on the block, in a fan's words rather than the trigger slug. */
const REASON_TEXT: Record<string, string> = {
  expiring_surplus: 'Out of contract and past the re-sign limit, so he leaves for nothing unless somebody moves',
  expiring_keeper: 'Out of contract but the team could keep him, so it will take a real return to prise him away',
  horizon_mismatch: 'Under contract for longer than this team can use, or a rental it cannot keep',
  locker_room: 'His attitude is dragging the room down every week he stays',
  blocked_prospect: 'A prospect in the pipeline is ready and stuck behind him',
  inquiry: 'Nobody put him on the block. Another team called to ask',
}
const REASON_LABEL: Record<string, string> = {
  expiring_surplus: 'Leaving for nothing',
  expiring_keeper: 'Would take a lot',
  horizon_mismatch: 'Wrong timeline',
  locker_room: 'Locker room',
  blocked_prospect: 'Blocking a prospect',
  inquiry: 'Asked about',
}

function Crest({ team, size = 20 }: { team: { id: number; name: string } | null; size?: number }) {
  if (!team) return null
  return (
    <img
      src={`/avatars/${team.id}.png`}
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: '4px', flexShrink: 0, display: 'block' }}
    />
  )
}

function TeamName({ team, mine }: { team: { id: number; name: string } | null; mine: boolean }) {
  if (!team) return <span style={{ color: MUTED }}>&mdash;</span>
  return (
    <Link
      to={`/team/${team.id}`}
      style={{
        color: mine ? ACCENT : INK,
        fontWeight: mine ? 700 : 600,
        textDecoration: 'none',
        fontSize: '14px',
      }}
    >
      {team.name}
    </Link>
  )
}

function Pos({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: '11px', fontWeight: 700, color: MUTED, letterSpacing: '0.06em',
      minWidth: '26px', display: 'inline-block',
    }}>{children}</span>
  )
}

function Rating({ value }: { value: number }) {
  return (
    <span style={{
      fontSize: '13px', fontWeight: 700, color: BODY,
      fontVariantNumeric: 'tabular-nums', minWidth: '28px', textAlign: 'right',
      display: 'inline-block',
    }}>{Math.round(value)}</span>
  )
}

/** A prospect's scouted ceiling, drawn as the band it actually is. */
function CeilingBar({ rating, low, high }: { rating: number; low: number; high: number }) {
  const floor = Math.max(40, Math.min(rating, low) - 4)
  const span = Math.max(1, 100 - floor)
  const left = ((low - floor) / span) * 100
  const width = Math.max(2, ((high - low) / span) * 100)
  const now = ((rating - floor) / span) * 100
  return (
    <div style={{ position: 'relative', height: '8px', background: '#1e293b', borderRadius: '2px' }}>
      <div style={{
        position: 'absolute', left: `${left}%`, width: `${width}%`, top: 0, bottom: 0,
        background: `linear-gradient(90deg, ${ACCENT}44, ${ACCENT}aa)`, borderRadius: '2px',
      }} />
      <div style={{
        position: 'absolute', left: `${now}%`, top: '-2px', bottom: '-2px', width: '2px',
        background: INK, borderRadius: '1px', transform: 'translateX(-1px)',
      }} />
    </div>
  )
}

const TransactionsPage: React.FC = () => {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const myTeamId = (user as any)?.favoriteTeamId ?? null
  const {
    loading, error, season, week, tradingEnabled,
    draftOrder, prospects, expiring, block, trades, moves,
  } = useTransactions()
  const [tab, setTab] = useState<TabKey>('order')

  const tradedCount = useMemo(() => draftOrder.filter(d => d.traded).length, [draftOrder])
  const leavingCount = useMemo(() => expiring.filter(e => e.cannotKeep).length, [expiring])

  const TABS: { key: TabKey; label: string; count: number | null }[] = [
    { key: 'order', label: 'Draft order', count: draftOrder.length || null },
    { key: 'class', label: 'Draft class', count: prospects.length || null },
    { key: 'expiring', label: 'Out of contract', count: expiring.length || null },
    { key: 'block', label: 'On the block', count: block.length || null },
    { key: 'activity', label: 'Activity', count: (trades.length + moves.length) || null },
  ]

  const panel: React.CSSProperties = {
    background: PANEL, border: `1px solid ${LINE}`, borderRadius: '8px', overflow: 'hidden',
  }
  const rowBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 14px', borderBottom: `1px solid ${LINE}`,
  }
  const mineRow = (mine: boolean): React.CSSProperties => mine
    ? { background: `${ACCENT}0f`, boxShadow: `inset 3px 0 0 ${ACCENT}` }
    : {}

  return (
    // ⚠️ `width: 100%` IS LOAD-BEARING, not belt-and-braces. `AppShell`'s <main> is a COLUMN
    // flex container, so the horizontal axis is the CROSS axis — and `margin: 0 auto` there
    // sets cross-axis auto margins, which disables `align-items: stretch`. The div then sizes
    // to its CONTENT: measured 611px inside a 1604px main, against the 1000px cap asked for.
    <div style={{
      width: '100%', maxWidth: '1000px', margin: '0 auto',
      padding: isMobile ? '16px 12px 60px' : '26px 20px 80px',
    }}>
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: isMobile ? '24px' : '30px', fontWeight: 800, color: INK, margin: 0, letterSpacing: '-0.01em' }}>
          Transactions
        </h1>
        <div style={{ color: MUTED, fontSize: '14px', marginTop: '6px', maxWidth: '62ch' }}>
          The front-office desk. Who picks where, who is coming into the league, who is out
          of contract, and everything that has already moved.
        </div>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '10px', fontSize: '12px', color: MUTED }}>
          <span>Season {season} &middot; Week {week}</span>
          {tradedCount > 0 && <span style={{ color: WARN }}>{tradedCount} pick{tradedCount === 1 ? '' : 's'} traded</span>}
          {leavingCount > 0 && <span style={{ color: WARN }}>{leavingCount} leaving for nothing</span>}
          {!tradingEnabled && <span>Trading is closed</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: tab === t.key ? `${ACCENT}1a` : 'transparent',
              border: `1px solid ${tab === t.key ? `${ACCENT}66` : LINE}`,
              color: tab === t.key ? ACCENT : BODY,
              borderRadius: '6px', padding: '7px 12px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600,
            }}
          >
            {t.label}
            {t.count != null && (
              <span style={{ color: MUTED, fontWeight: 500, marginLeft: '6px', fontSize: '12px' }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: MUTED, fontSize: '14px' }}>Reading the wire&hellip;</div>}
      {error && !loading && <div style={{ color: WARN, fontSize: '14px' }}>{error}</div>}

      {!loading && !error && tab === 'order' && (
        <>
        <div style={{ color: MUTED, fontSize: '13px', marginBottom: '12px', maxWidth: '68ch' }}>
          Worst record picks first, and the order moves every week as results land. A pick
          belongs to whoever holds it, but the <b style={{ color: BODY }}>slot</b> is set by where the
          team it came from finishes &mdash; so a team can trade its pick away, finish last,
          and hand somebody else the first selection.
        </div>
        <div style={panel}>
          <div style={{ ...rowBase, background: '#0b1220', color: MUTED, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
            <span style={{ width: '28px' }}>#</span>
            <span style={{ flex: 1 }}>Picks</span>
            <span>Record</span>
            <span style={{ width: '58px', textAlign: 'right' }}>Via</span>
          </div>
          {draftOrder.map((d: DraftSlot) => {
            const mine = !!myTeamId && (d.owner?.id === myTeamId || d.originalTeam?.id === myTeamId)
            return (
              <div key={d.slot} style={{ ...rowBase, ...mineRow(mine) }}>
                <span style={{
                  width: '28px', color: d.slot <= 3 ? ACCENT : MUTED, fontWeight: 700,
                  fontSize: '13px', fontVariantNumeric: 'tabular-nums',
                }}>{d.slot}</span>
                <Crest team={d.owner} />
                <span style={{ flex: 1, minWidth: 0 }}><TeamName team={d.owner} mine={!!myTeamId && d.owner?.id === myTeamId} /></span>
                {/* ⚠️ ALWAYS RENDERED, even at 0-0. Hiding the cell when nothing has been
                    played leaves a ragged column in week 1 that reads as missing data, when
                    the truth is simply that the season has not started. */}
                <HoverTooltip text={`${d.originalTeam?.name}'s record. The slot is set by where THIS team finishes, whoever ends up holding the pick.`}>
                  <span style={{
                    fontSize: '12px', color: MUTED, fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap', minWidth: '46px', display: 'inline-block', textAlign: 'right',
                  }}>
                    {d.record
                      ? `${d.record.wins}\u2013${d.record.losses}${d.record.ties ? `\u2013${d.record.ties}` : ''}`
                      : '\u2014'}
                  </span>
                </HoverTooltip>
                {d.traded && d.originalTeam ? (
                  <HoverTooltip text={`This slot is ${d.originalTeam.name}'s finishing position. ${d.owner?.name} acquired the pick in a trade, so it picks here instead.`}>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, color: WARN, background: `${WARN}1a`,
                      border: `1px solid ${WARN}44`, borderRadius: '4px', padding: '2px 7px',
                    }}>via {d.originalTeam.abbr}</span>
                  </HoverTooltip>
                ) : <span style={{ fontSize: '11px', color: '#475569', width: '58px', textAlign: 'right' }}>&mdash;</span>}
              </div>
            )
          })}
        </div>
        </>
      )}

      {!loading && !error && tab === 'class' && (
        <>
          <div style={{ color: MUTED, fontSize: '13px', marginBottom: '12px', maxWidth: '68ch' }}>
            What a player does today is a fact. What he might become is <b style={{ color: BODY }}>scouted</b>,
            so it is shown as a range &mdash; and it is <b style={{ color: BODY }}>your team&rsquo;s</b> reading of him.
            Another team sees a different range. The bands narrow as the season runs.
          </div>
          <div style={{
            display: 'grid', gap: '10px',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(290px, 1fr))',
          }}>
            {prospects.map((p: Prospect) => (
              <div key={p.playerId} style={{ ...panel, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                  <Pos>{p.position}</Pos>
                  <PlayerLink playerId={p.playerId} playerName={p.name}
                    style={{ color: INK, fontWeight: 700, fontSize: '15px' }} />
                  <span style={{ marginLeft: 'auto' }}><Rating value={p.rating} /></span>
                </div>
                {p.ceilingRange && (
                  <>
                    <CeilingBar rating={p.rating} low={p.ceilingRange.low} high={p.ceilingRange.high} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: MUTED }}>
                      <span>plays at {Math.round(p.rating)}</span>
                      <span style={{ color: ACCENT, fontWeight: 600 }}>
                        {p.ceilingRange.exact != null
                          ? `ceiling ${p.ceilingRange.exact}`
                          : `could reach ${p.ceilingRange.low}–${p.ceilingRange.high}`}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && !error && tab === 'expiring' && (
        <>
          <div style={{ color: MUTED, fontSize: '13px', marginBottom: '12px', maxWidth: '68ch' }}>
            A team may re-sign only two of its out-of-contract players each offseason. Anyone
            marked <b style={{ color: WARN }}>leaving for nothing</b> is past that limit &mdash; his team
            loses him for no return unless it trades him first.
          </div>
          <div style={panel}>
            {expiring.length === 0 && (
              <div style={{ padding: '18px 14px', color: MUTED, fontSize: '14px' }}>
                Nobody is in the last year of a contract yet.
              </div>
            )}
            {[...expiring].sort((a, b) => b.rating - a.rating).map((e: ExpiringPlayer, i) => {
              const mine = !!myTeamId && e.team?.id === myTeamId
              return (
                <div key={`${e.playerId}-${i}`} style={{ ...rowBase, ...mineRow(mine) }}>
                  <Pos>{e.position}</Pos>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <PlayerLink playerId={e.playerId} playerName={e.name}
                      style={{ color: INK, fontWeight: 600, fontSize: '14px' }} />
                  </span>
                  <Crest team={e.team} size={18} />
                  <span style={{ width: isMobile ? 'auto' : '120px' }}>
                    <TeamName team={e.team} mine={mine} />
                  </span>
                  <Rating value={e.rating} />
                  {e.cannotKeep && (
                    <HoverTooltip text="His team is over its re-sign limit and he is one of the ones it cannot keep. He walks at the end of the season unless somebody trades for him.">
                      <span style={{
                        fontSize: '11px', fontWeight: 700, color: WARN, background: `${WARN}1a`,
                        border: `1px solid ${WARN}44`, borderRadius: '4px', padding: '2px 7px', whiteSpace: 'nowrap',
                      }}>leaving for nothing</span>
                    </HoverTooltip>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {!loading && !error && tab === 'block' && (
        <div style={panel}>
          {block.length === 0 ? (
            <div style={{ padding: '18px 14px', color: MUTED, fontSize: '14px' }}>
              {tradingEnabled
                ? 'Nobody is on the block. Teams do not start listing players until they can read their own season, which is week 15.'
                : 'Trading is closed right now.'}
            </div>
          ) : [...block].sort((a, b) => b.rating - a.rating).map((b: BlockListing, i) => {
            const mine = !!myTeamId && b.team?.id === myTeamId
            return (
              <div key={`${b.playerId}-${i}`} style={{ ...rowBase, ...mineRow(mine), flexWrap: 'wrap' }}>
                <Pos>{b.position}</Pos>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <PlayerLink playerId={b.playerId} playerName={b.name}
                    style={{ color: INK, fontWeight: 600, fontSize: '14px' }} />
                </span>
                <Crest team={b.team} size={18} />
                <span style={{ width: isMobile ? 'auto' : '120px' }}>
                  <TeamName team={b.team} mine={mine} />
                </span>
                <Rating value={b.rating} />
                <HoverTooltip text={REASON_TEXT[b.reason] || b.reason}>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, color: BODY, border: `1px solid ${LINE}`,
                    borderRadius: '4px', padding: '2px 7px', whiteSpace: 'nowrap',
                  }}>{REASON_LABEL[b.reason] || b.reason}</span>
                </HoverTooltip>
              </div>
            )
          })}
        </div>
      )}

      {!loading && !error && tab === 'activity' && (
        <div style={panel}>
          {trades.length === 0 && moves.length === 0 && (
            <div style={{ padding: '18px 14px', color: MUTED, fontSize: '14px' }}>
              Nothing has moved yet this season.
            </div>
          )}
          {trades.map(t => (
            <div key={`t${t.id}`} style={{ ...rowBase, flexWrap: 'wrap', gap: '8px' }}>
              <span style={{
                fontSize: '11px', fontWeight: 700, color: ACCENT, background: `${ACCENT}1a`,
                border: `1px solid ${ACCENT}44`, borderRadius: '4px', padding: '2px 7px',
              }}>Trade</span>
              <span style={{ color: BODY, fontSize: '13.5px', flex: 1, minWidth: '200px' }}>
                <b style={{ color: INK }}>{t.teamA?.name}</b> and <b style={{ color: INK }}>{t.teamB?.name}</b> swapped{' '}
                {t.aGave.length + t.bGave.length} asset{t.aGave.length + t.bGave.length === 1 ? '' : 's'}
              </span>
              <span style={{ fontSize: '11px', color: MUTED }}>
                {t.phase === 'offseason' ? 'Offseason' : `Week ${t.week}`}
              </span>
            </div>
          ))}
          {moves.map((m, i) => (
            <div key={`m${i}`} style={{ ...rowBase, flexWrap: 'wrap', gap: '8px' }}>
              <span style={{
                fontSize: '11px', fontWeight: 600, color: MUTED, border: `1px solid ${LINE}`,
                borderRadius: '4px', padding: '2px 7px', textTransform: 'capitalize',
              }}>{m.type.replace(/_/g, ' ')}</span>
              <span style={{ color: BODY, fontSize: '13.5px', flex: 1, minWidth: '200px' }}>
                <PlayerLink playerId={m.playerId} playerName={m.player || 'Someone'}
                  style={{ color: INK, fontWeight: 600 }} />
                {m.team?.name ? <span style={{ color: MUTED }}> &middot; {m.team.name}</span> : null}
              </span>
              {m.detail && <span style={{ fontSize: '11px', color: MUTED }}>{m.detail}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TransactionsPage
