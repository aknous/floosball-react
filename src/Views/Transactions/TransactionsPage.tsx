import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactions, DraftSlot, Prospect, ExpiringPlayer, BlockListing } from '@/hooks/useTransactions'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import HoverTooltip from '@/Components/HoverTooltip'
import PlayerLink from '@/Components/PlayerLink'
import CeilingBand, { ceilingLabel } from '@/Components/CeilingBand'
import { Stars, calcStars } from '@/Components/Stars'
import { useIsMobile } from '@/hooks/useIsMobile'

type TabKey = 'draft' | 'expiring' | 'block' | 'activity'

/** Why a team put this player on the block. Short: the row is scanned, not read. */
const REASON_LABEL: Record<string, string> = {
  expiring_surplus: 'Walking',
  expiring_keeper: 'Costly',
  horizon_mismatch: 'Timeline',
  locker_room: 'Locker room',
  blocked_prospect: 'Blocking',
  inquiry: 'Asked about',
}
const REASON_TEXT: Record<string, string> = {
  expiring_surplus: 'Out of contract and past the re-sign limit. He leaves for nothing unless someone moves.',
  expiring_keeper: 'Out of contract but the team could keep him, so it will take a real return.',
  horizon_mismatch: 'Under contract for longer than this team can use, or a rental it cannot keep.',
  locker_room: 'His attitude drags the room down every week he stays.',
  blocked_prospect: 'A prospect is ready and stuck behind him.',
  inquiry: 'Nobody listed him. Another team called to ask.',
}

function Crest({ team, size = 18 }: { team: { id: number; name: string } | null; size?: number }) {
  if (!team) return null
  return <img src={`/avatars/${team.id}.png`} alt="" width={size} height={size}
    style={{ borderRadius: '50%', flexShrink: 0, display: 'block' }} />
}

function TeamName({ team, mine }: { team: { id: number; name: string } | null; mine: boolean }) {
  if (!team) return <span style={{ color: TEXT.dim }}>&ndash;</span>
  return (
    <Link to={`/team/${team.id}`} style={{
      ...font(mine ? 800 : 500, 12), color: mine ? ACCENT.ownTeam : TEXT.body,
      textDecoration: 'none',
    }}>{team.name}</Link>
  )
}

const Pos: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ ...font(700, 10, 1, '0.08em'), color: TEXT.muted, width: '24px', flexShrink: 0 }}>
    {children}
  </span>
)

/**
 * A player's quality as STARS, the same 1-5 bands the rest of the app uses
 * (`calcStars`: 1* 60-67, 2* 68-75, 3* 76-83, 4* 84-91, 5* 92-100). The raw number
 * stays available on hover for anyone comparing two players inside one band.
 */
const Rating: React.FC<{ value: number }> = ({ value }) => (
  <HoverTooltip text={`Rated ${Math.round(value)}`}>
    <span style={{ width: '58px', display: 'inline-block', textAlign: 'right' }}>
      <Stars stars={calcStars(value)} size={11} />
    </span>
  </HoverTooltip>
)

const TransactionsPage: React.FC = () => {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const myTeamId = (user as any)?.favoriteTeamId ?? null
  const {
    loading, error, season, week, tradingEnabled,
    draftOrder, prospects, expiring, block, trades, moves,
  } = useTransactions()
  const [tab, setTab] = useState<TabKey>('draft')

  const tradedCount = useMemo(() => draftOrder.filter(d => d.traded).length, [draftOrder])
  const leavingCount = useMemo(() => expiring.filter(e => e.cannotKeep).length, [expiring])

  const TABS: { key: TabKey; label: string; count: number }[] = [
    // ⚠️ ONE DRAFT VIEW. The order and the class were two tabs, and reading either one
    // alone answers half a question: who picks where means nothing without who is there
    // to be picked. Side by side they are the draft board.
    { key: 'draft', label: 'Draft', count: draftOrder.length },
    { key: 'expiring', label: 'Expiring', count: expiring.length },
    { key: 'block', label: 'Block', count: block.length },
    { key: 'activity', label: 'Activity', count: trades.length + moves.length },
  ]

  // No radii, no shadows: depth is the background step plus a 1px border.
  //
  // ⚠️ CAPPED, unlike Standings. That table earns the full bleed with ten columns of
  // numbers; these lists carry four or five, and stretched to 1300px the team name and
  // its record end up at opposite ends of an empty row. Left-aligned under the header
  // rather than centred, so it still reads as part of the same page.
  const panel: React.CSSProperties = {
    background: BG.panel, border: `1px solid ${BORDER.hairline}`, maxWidth: '860px',
  }
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '9px',
    padding: '8px 12px', borderBottom: `1px solid ${BORDER.subtle}`,
  }
  const headRow: React.CSSProperties = {
    ...row, background: BG.shell, ...font(700, 10, 1, '0.08em'), color: TEXT.muted,
    textTransform: 'uppercase',
  }
  const mine = (on: boolean): React.CSSProperties =>
    on ? { background: BG.cardOwn, boxShadow: `inset 2px 0 0 ${ACCENT.ownTeam}` } : {}
  const empty = (text: string) => (
    <div style={{ ...panel, padding: '40px', textAlign: 'center', ...font(400, 12), color: TEXT.muted }}>
      {text}
    </div>
  )
  const tag = (text: string, color: string) => (
    <span style={{
      ...font(700, 10, 1, '0.04em'), color,
      border: `1px solid ${color}55`, padding: '2px 5px', whiteSpace: 'nowrap',
    }}>{text}</span>
  )

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', flexWrap: 'wrap',
        padding: isMobile ? '12px' : '15px 28px', background: BG.shell,
        borderBottom: `1px solid ${BORDER.hairline}`, fontFamily: FONT,
      }}>
        <h1 style={{ ...font(800, isMobile ? 18 : 22, 1, '-0.03em'), color: TEXT.primary, margin: 0 }}>
          Transactions
        </h1>
        {!isMobile && <span style={{ width: '1px', height: '24px', background: BORDER.hairline }} />}

        <div style={{ display: 'flex', background: BG.panel, border: `1px solid ${BORDER.hairline}` }}>
          {TABS.map((t, i) => {
            const active = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                ...font(active ? 800 : 500, 11),
                color: active ? BG.shell : TEXT.muted,
                background: active ? TEXT.secondary : 'transparent',
                border: 'none', borderLeft: i > 0 ? `1px solid ${BORDER.hairline}` : 'none',
                padding: '8px 11px', cursor: 'pointer', fontFamily: FONT,
              }}>{t.label}{t.count > 0 ? ` ${t.count}` : ''}</button>
            )
          })}
        </div>

        <span style={{ flex: 1 }} />
        {!isMobile && (
          <div style={{ display: 'flex', gap: '12px', ...font(500, 11), color: TEXT.muted }}>
            <span style={TABULAR}>S{season} W{week}</span>
            {tradedCount > 0 && <span style={{ color: ACCENT.warning }}>{tradedCount} picks traded</span>}
            {leavingCount > 0 && <span style={{ color: ACCENT.warning }}>{leavingCount} walking</span>}
            {!tradingEnabled && <span>Trading closed</span>}
          </div>
        )}
      </div>

      <div style={{ padding: isMobile ? '14px 10px 22px' : '18px 28px 28px', fontFamily: FONT }}>
        {loading && empty('Loading.')}
        {error && !loading && empty(error)}

        {!loading && !error && tab === 'draft' && (
          <div style={{
            display: 'grid', gap: isMobile ? '18px' : '20px', alignItems: 'start',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)',
            maxWidth: '1100px',
          }}>
            {/* WHO PICKS */}
            <div>
              <div style={{ ...font(700, 10, 1, '0.08em'), color: TEXT.muted, marginBottom: '7px' }}>
                ORDER
              </div>
              <div style={{ background: BG.panel, border: `1px solid ${BORDER.hairline}` }}>
                <div style={headRow}>
                  <span style={{ width: '22px' }}>#</span>
                  <span style={{ flex: 1 }}>Team</span>
                  <span style={{ width: '42px', textAlign: 'right' }}>Rec</span>
                  <span style={{ width: '46px', textAlign: 'right' }}>Via</span>
                </div>
                {draftOrder.map((d: DraftSlot) => {
                  const isMine = !!myTeamId && (d.owner?.id === myTeamId || d.originalTeam?.id === myTeamId)
                  return (
                    <div key={d.slot} style={{ ...row, ...mine(isMine) }}>
                      <span style={{
                        ...font(700, 12), ...TABULAR, width: '22px',
                        color: d.slot <= 3 ? ACCENT.info : TEXT.dim,
                      }}>{d.slot}</span>
                      <Crest team={d.owner} size={16} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <TeamName team={d.owner} mine={!!myTeamId && d.owner?.id === myTeamId} />
                      </span>
                      <HoverTooltip text={`${d.originalTeam?.name ?? ''} finished here. The slot follows that record, whoever holds the pick.`}>
                        <span style={{ ...font(500, 11), ...TABULAR, color: TEXT.muted, width: '42px', textAlign: 'right', display: 'inline-block' }}>
                          {d.record ? `${d.record.wins}-${d.record.losses}` : '\u2013'}
                        </span>
                      </HoverTooltip>
                      <span style={{ width: '46px', textAlign: 'right' }}>
                        {d.traded && d.originalTeam
                          ? <HoverTooltip text={`Traded. ${d.owner?.name} picks on ${d.originalTeam.name}'s finish.`}>
                              {tag(d.originalTeam.abbr, ACCENT.warning)}
                            </HoverTooltip>
                          : <span style={{ color: TEXT.faint, ...font(400, 11) }}>&ndash;</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* WHO IS THERE TO BE PICKED */}
            <div>
              <div style={{ ...font(700, 10, 1, '0.08em'), color: TEXT.muted, marginBottom: '7px' }}>
                CLASS
              </div>
              {prospects.length === 0 ? empty('No class generated yet.') : (
                <div style={{ background: BG.panel, border: `1px solid ${BORDER.hairline}` }}>
                  <div style={headRow}>
                    <span style={{ width: '22px' }}>&nbsp;</span>
                    <span style={{ flex: 1 }}>Prospect</span>
                    <span style={{ width: '58px', textAlign: 'right' }}>Now</span>
                    <span style={{ width: '104px', textAlign: 'right' }}>Ceiling</span>
                  </div>
                  {/* ⚠️ RANKED, NOT PAIRED TO A SLOT. Lining prospect N up against pick N
                      would read as a prediction, and every team drafts off its own board —
                      the sim makes no such claim and neither should this. */}
                  {prospects.map((p: Prospect, i) => (
                    <div key={p.playerId} style={row}>
                      <span style={{ ...font(700, 11), ...TABULAR, width: '22px', color: TEXT.faint }}>
                        {i + 1}
                      </span>
                      <Pos>{p.position}</Pos>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <PlayerLink playerId={p.playerId} playerName={p.name}
                          style={{ ...font(600, 12), color: TEXT.body }} />
                      </span>
                      <Rating value={p.rating} />
                      <HoverTooltip text="Your team's scouted ceiling. Another team sees a different range.">
                        <span style={{ width: '104px', display: 'inline-block' }}>
                          <CeilingBand rating={p.rating} range={p.ceilingRange} accent={ACCENT.info} height={5} />
                          {/* 10px is the floor for metadata in this app; 9px reads as broken. */}
                          <span style={{ ...font(400, 10), color: TEXT.muted, display: 'block', marginTop: '3px', textAlign: 'right' }}>
                            {ceilingLabel(p.ceilingRange)}
                          </span>
                        </span>
                      </HoverTooltip>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !error && tab === 'expiring' && (
          expiring.length === 0 ? empty('Nobody is in the last year of a contract.') : (
            <>
              <div style={{ ...font(400, 11, 1.5), color: TEXT.muted, marginBottom: '10px', maxWidth: '860px' }}>
                A team may re-sign two of these each offseason. Anyone marked WALKING is past that limit.
              </div>
              <div style={panel}>
                {[...expiring].sort((a, b) => b.rating - a.rating).map((e: ExpiringPlayer, i) => {
                  const isMine = !!myTeamId && e.team?.id === myTeamId
                  return (
                    <div key={`${e.playerId}-${i}`} style={{ ...row, ...mine(isMine) }}>
                      <Pos>{e.position}</Pos>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <PlayerLink playerId={e.playerId} playerName={e.name}
                          style={{ ...font(600, 12), color: TEXT.body }} />
                      </span>
                      <Crest team={e.team} />
                      <span style={{ width: isMobile ? 'auto' : '110px' }}>
                        <TeamName team={e.team} mine={isMine} />
                      </span>
                      <Rating value={e.rating} />
                      <span style={{ width: '68px', textAlign: 'right' }}>
                        {e.cannotKeep && (
                          <HoverTooltip text="His team is over its re-sign limit. He leaves for nothing unless somebody trades for him.">
                            {tag('Walking', ACCENT.warning)}
                          </HoverTooltip>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )
        )}

        {!loading && !error && tab === 'block' && (
          block.length === 0
            ? empty(tradingEnabled ? 'Nobody is on the block. Teams start listing in week 15.' : 'Trading is closed.')
            : (
              <div style={panel}>
                {[...block].sort((a, b) => b.rating - a.rating).map((b: BlockListing, i) => {
                  const isMine = !!myTeamId && b.team?.id === myTeamId
                  return (
                    <div key={`${b.playerId}-${i}`} style={{ ...row, ...mine(isMine) }}>
                      <Pos>{b.position}</Pos>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <PlayerLink playerId={b.playerId} playerName={b.name}
                          style={{ ...font(600, 12), color: TEXT.body }} />
                      </span>
                      <Crest team={b.team} />
                      <span style={{ width: isMobile ? 'auto' : '110px' }}>
                        <TeamName team={b.team} mine={isMine} />
                      </span>
                      <Rating value={b.rating} />
                      <span style={{ width: '92px', textAlign: 'right' }}>
                        <HoverTooltip text={REASON_TEXT[b.reason] || b.reason}>
                          {tag(REASON_LABEL[b.reason] || b.reason, TEXT.muted)}
                        </HoverTooltip>
                      </span>
                    </div>
                  )
                })}
              </div>
            )
        )}

        {!loading && !error && tab === 'activity' && (
          trades.length === 0 && moves.length === 0
            ? empty('Nothing has moved yet.')
            : (
              <div style={panel}>
                {trades.map(t => (
                  <div key={`t${t.id}`} style={{ ...row, flexWrap: 'wrap' }}>
                    {tag('Trade', ACCENT.info)}
                    <span style={{ ...font(500, 12), color: TEXT.secondary, flex: 1, minWidth: '180px' }}>
                      {t.teamA?.name} and {t.teamB?.name}, {t.aGave.length + t.bGave.length} assets
                    </span>
                    <span style={{ ...font(400, 10), color: TEXT.muted }}>
                      {t.phase === 'offseason' ? 'Offseason' : `W${t.week}`}
                    </span>
                  </div>
                ))}
                {moves.map((m, i) => (
                  <div key={`m${i}`} style={{ ...row, flexWrap: 'wrap' }}>
                    {tag(m.type.replace(/_/g, ' '), TEXT.muted)}
                    <span style={{ ...font(500, 12), color: TEXT.secondary, flex: 1, minWidth: '180px' }}>
                      <PlayerLink playerId={m.playerId} playerName={m.player || 'Someone'}
                        style={{ ...font(600, 12), color: TEXT.body }} />
                      {m.team?.name ? <span style={{ color: TEXT.muted }}> {m.team.name}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            )
        )}
      </div>
    </>
  )
}

export default TransactionsPage
