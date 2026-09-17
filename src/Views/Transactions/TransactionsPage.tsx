import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactions, DraftSlot, Prospect, ExpiringPlayer, BlockListing } from '@/hooks/useTransactions'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import HoverTooltip from '@/Components/HoverTooltip'
import PlayerLink from '@/Components/PlayerLink'
import Potential, { ceilingLabel } from '@/Components/Potential'
import { Stars, calcStars } from '@/Components/Stars'
import { useIsMobile } from '@/hooks/useIsMobile'

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

/** 1st, 2nd, 3rd, 4th. A pick is a position in a queue, so it reads as one. */
function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
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
      ...font(mine ? 800 : 500, 13), color: mine ? ACCENT.ownTeam : TEXT.body,
      textDecoration: 'none',
    }}>{team.name}</Link>
  )
}

const Pos: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ ...font(700, 11, 1, '0.08em'), color: TEXT.muted, width: '28px', flexShrink: 0 }}>
    {children}
  </span>
)

/**
 * A player's name with his grade beside it.
 *
 * ⚠️ THE STARS BELONG NEXT TO THE NAME, not in a column of their own on the far side of
 * the row. They are how you read a player, so putting them a few hundred pixels away
 * made the row two separate facts that had to be joined by eye.
 */
const NameGrade: React.FC<{
  playerId: number | null
  name: string
  rating: number
}> = ({ playerId, name, rating }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
    <PlayerLink playerId={playerId} playerName={name}
      style={{ ...font(600, 14), color: TEXT.body }} />
    <HoverTooltip text={`Rated ${Math.round(rating)}`}>
      <span style={{ display: 'inline-block' }}>
        <Stars stars={calcStars(rating)} size={15} tracking={2} />
      </span>
    </HoverTooltip>
  </span>
)


/**
 * TRANSACTIONS — the front office, as a dashboard rather than a set of tabs.
 *
 * ⚠️ TABS WERE THE WRONG SHAPE FOR THIS PAGE. Standings is deliberately a view switcher
 * because its three views answer three different questions and you arrive knowing which
 * one you want. Nobody arrives here knowing that: the questions are "where do we pick",
 * "who is available", "what just happened", and the interesting answer is usually the
 * RELATIONSHIP between two of them — a team holding pick 1 while its best player is on
 * the block is a story that a tab hides by construction.
 *
 * Four panes in two pairs, plus the ledger:
 *   THE BOARD      draft order beside the class. Where we pick, and who is there.
 *   THE MARKET     the block beside contract-year players. Who we could get.
 *   ACTIVITY       what has already moved.
 *
 * ⚠️ EACH PANE SCROLLS INSIDE ITSELF rather than growing the page. Contract year alone
 * runs to 150 rows on a mature league; laid out flat, the dashboard becomes a document
 * you scroll for a minute, which is the thing it exists not to be. Bounded panes keep
 * every region on screen at once, which is the whole argument for dropping the tabs.
 */
const TransactionsPage: React.FC = () => {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const myTeamId = (user as any)?.favoriteTeamId ?? null
  const {
    loading, error, season, week, tradingEnabled,
    draftOrder, prospects, expiring, block, trades, moves,
  } = useTransactions()

  const tradedCount = useMemo(() => draftOrder.filter(d => d.traded).length, [draftOrder])
  const leaving = useMemo(() => expiring.filter(e => e.cannotKeep), [expiring])
  const myPick = useMemo(
    () => (myTeamId ? draftOrder.find(d => d.owner?.id === myTeamId) : null),
    [draftOrder, myTeamId])

  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 14px', borderBottom: `1px solid ${BORDER.subtle}`,
  }
  const headRow: React.CSSProperties = {
    ...row, padding: '8px 14px', background: BG.shell,
    ...font(700, 10, 1, '0.08em'), color: TEXT.muted, textTransform: 'uppercase',
    position: 'sticky', top: 0, zIndex: 1,
  }
  const mine = (on: boolean): React.CSSProperties =>
    on ? { background: BG.cardOwn, boxShadow: `inset 2px 0 0 ${ACCENT.ownTeam}` } : {}
  const tag = (text: string, color: string) => (
    <span style={{
      ...font(700, 11, 1, '0.04em'), color,
      border: `1px solid ${color}55`, padding: '2px 6px', whiteSpace: 'nowrap',
    }}>{text}</span>
  )

  /** A dashboard pane: titled, counted, and bounded so the page stays scannable. */
  const Pane: React.FC<{
    title: string
    count?: number
    note?: string
    height?: number
    children: React.ReactNode
  }> = ({ title, count, note, height = 360, children }) => (
    <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      {/* ⚠️ SENTENCE CASE, NOT UPPERCASE. This app reserves uppercase for FIELD LABELS —
          table heads and the facts-grid cells — and a section title is not one; the team
          page's `SectionHead` sets the pattern ("Roster", "The Bleachers", "Pipeline"),
          down to the rule that runs out to the right. Uppercasing them also made every
          pane shout at the same volume as the column heads inside it. */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '9px' }}>
        <h2 style={{ ...font(800, 13, 1, '0.08em'), color: TEXT.strong, margin: 0, whiteSpace: 'nowrap' }}>
          {title}
        </h2>
        {count != null && (
          <span style={{ ...font(600, 12), ...TABULAR, color: TEXT.muted }}>{count}</span>
        )}
        {note && <span style={{ ...font(400, 12), color: TEXT.muted, whiteSpace: 'nowrap' }}>{note}</span>}
        <span style={{ flex: 1, height: '2px', background: BORDER.hairline }} />
      </div>
      {/* ⚠️ A FLOOR AS WELL AS A CEILING. Paired panes sit on `alignItems: start`, so an
          empty one collapsed to a single line of text beside a full one and the row read
          as broken rather than as quiet. It does not STRETCH to match either: forcing both
          to the tallest makes two sparse panes into two tall empty boxes. */}
      <div style={{
        background: BG.panel, border: `1px solid ${BORDER.hairline}`,
        minHeight: '150px', maxHeight: `${height}px`, overflowY: 'auto',
      }}>
        {children}
      </div>
    </section>
  )

  const emptyPane = (text: string) => (
    <div style={{
      padding: '34px 16px', textAlign: 'center', ...font(400, 13), color: TEXT.muted,
      minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {text}
    </div>
  )

  /**
   * A supporting figure. Deliberately quiet.
   *
   * ⚠️ SIX STATS AT ONE VOLUME IS NOT A SUMMARY, IT IS A ROW OF NUMBERS. The strip was
   * six identical big-number/small-label cells, so nothing led and the eye had to read
   * all six to find the one that mattered — and in the opening weeks four of them are
   * zero, which made the whole page look empty. The lead is the reader's OWN pick,
   * stated as a sentence; everything else sits underneath it at a smaller size.
   */
  const Stat: React.FC<{ value: React.ReactNode; label: string; color?: string; hint?: string }> =
    ({ value, label, color = TEXT.secondary, hint }) => {
      const cell = (
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px', minWidth: 0 }}>
          <span style={{ ...font(700, 14), ...TABULAR, color }}>{value}</span>
          <span style={{ ...font(400, 12), color: TEXT.muted, whiteSpace: 'nowrap' }}>{label}</span>
        </span>
      )
      return hint ? <HoverTooltip text={hint}>{cell}</HoverTooltip> : cell
    }

  const pair: React.CSSProperties = {
    display: 'grid', gap: isMobile ? '18px' : '22px', alignItems: 'start',
    gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)',
  }

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
        <span style={{ ...font(500, 12), ...TABULAR, color: TEXT.muted }}>Season {season} &middot; Week {week}</span>
        <span style={{ flex: 1 }} />
        {!tradingEnabled && tag('Trading closed', TEXT.muted)}
      </div>

      <div style={{ padding: isMobile ? '14px 10px 30px' : '18px 28px 40px', fontFamily: FONT }}>
        {loading ? (
          <div style={{
            background: BG.panel, border: `1px solid ${BORDER.hairline}`,
            padding: '40px', textAlign: 'center', ...font(400, 13), color: TEXT.muted,
          }}>Loading.</div>
        ) : error ? (
          <div style={{
            background: BG.panel, border: `1px solid ${BORDER.hairline}`,
            padding: '40px', textAlign: 'center', ...font(400, 13), color: ACCENT.warning,
          }}>{error}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '22px' : '28px' }}>

            {/* SUMMARY. The numbers that decide whether anything below is worth reading. */}
            <div style={{
              background: BG.panel, border: `1px solid ${BORDER.hairline}`,
              padding: isMobile ? '16px' : '18px 22px',
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              {/* The one thing a reader came for, said as a sentence rather than a tile. */}
              <div style={{ ...font(700, isMobile ? 17 : 21, 1.25), color: TEXT.primary }}>
                {myPick
                  ? <>You pick <span style={{ color: ACCENT.ownTeam }}>{ordinal(myPick.slot)}</span> of {draftOrder.length}</>
                  : <>{draftOrder.length} teams in the draft order</>}
              </div>
              <div style={{ display: 'flex', gap: isMobile ? '14px' : '26px', flexWrap: 'wrap' }}>
                <Stat value={prospects.length} label="in the class"
                  hint="Prospects entering the league this offseason." />
                <Stat value={tradedCount} label="picks traded"
                  color={tradedCount ? ACCENT.warning : TEXT.secondary}
                  hint="Slots whose pick now belongs to another team." />
                <Stat value={block.length} label="on the block"
                  color={block.length ? ACCENT.info : TEXT.secondary}
                  hint="Players their team would move right now." />
                <Stat value={leaving.length} label="walking"
                  color={leaving.length ? ACCENT.warning : TEXT.secondary}
                  hint="Past their team's re-sign limit. They leave for nothing unless traded." />
                <Stat value={trades.length} label="trades" hint="Completed this season." />
              </div>
            </div>

            {/* THE BOARD */}
            <div style={pair}>
              <Pane title="Draft order" count={draftOrder.length}
                note={tradedCount ? `${tradedCount} traded` : undefined}>
                {draftOrder.length === 0 ? emptyPane('No order yet.') : (
                  <>
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
                            ...font(700, 13), ...TABULAR, width: '22px',
                            color: d.slot <= 3 ? ACCENT.info : TEXT.dim,
                          }}>{d.slot}</span>
                          <Crest team={d.owner} size={17} />
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <TeamName team={d.owner} mine={!!myTeamId && d.owner?.id === myTeamId} />
                          </span>
                          <HoverTooltip text={`${d.originalTeam?.name ?? ''} finished here. The slot follows that record, whoever holds the pick.`}>
                            <span style={{ ...font(500, 12), ...TABULAR, color: TEXT.muted, width: '42px', textAlign: 'right', display: 'inline-block' }}>
                              {d.record ? `${d.record.wins}-${d.record.losses}` : '\u2013'}
                            </span>
                          </HoverTooltip>
                          <span style={{ width: '46px', textAlign: 'right' }}>
                            {d.traded && d.originalTeam
                              ? <HoverTooltip text={`Traded. ${d.owner?.name} picks on ${d.originalTeam.name}'s finish.`}>
                                  {tag(d.originalTeam.abbr, ACCENT.warning)}
                                </HoverTooltip>
                              : <span style={{ color: TEXT.faint, ...font(400, 12) }}>&ndash;</span>}
                          </span>
                        </div>
                      )
                    })}
                  </>
                )}
              </Pane>

              <Pane title="Incoming class" count={prospects.length}
                note="solid = now, hollow = scouted">
                {prospects.length === 0 ? emptyPane('No class generated yet.') : (
                  <>
                    <div style={headRow}>
                      <span style={{ width: '22px' }}>#</span>
                      <span style={{ flex: 1 }}>Prospect &amp; potential</span>
                    </div>
                    {/* ⚠️ RANKED, NOT PAIRED TO A SLOT. Lining prospect N up against pick N
                        would read as a prediction, and every team drafts off its own board. */}
                    {prospects.map((p: Prospect, i) => (
                      <div key={p.playerId} style={row}>
                        <span style={{ ...font(700, 12), ...TABULAR, width: '22px', color: TEXT.faint }}>
                          {i + 1}
                        </span>
                        <Pos>{p.position}</Pos>
                        <span style={{ flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                          <PlayerLink playerId={p.playerId} playerName={p.name}
                            style={{ ...font(600, 14), color: TEXT.body }} />
                          <HoverTooltip text={`Plays at ${Math.round(p.rating)} today. Your team scouts him to ${ceilingLabel(p.ceilingRange) || 'no clear ceiling'}. Another team sees a different range.`}>
                            <span style={{ display: 'inline-block' }}>
                              <Potential rating={p.rating} range={p.ceilingRange} size={16} />
                            </span>
                          </HoverTooltip>
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </Pane>
            </div>

            {/* THE MARKET */}
            <div style={pair}>
              <Pane title="On the block" count={block.length}>
                {block.length === 0
                  ? emptyPane(tradingEnabled
                      ? 'Nobody is on the block. Teams start listing in week 15.'
                      : 'Trading is closed.')
                  : [...block].sort((a, b) => b.rating - a.rating).map((b: BlockListing, i) => {
                    const isMine = !!myTeamId && b.team?.id === myTeamId
                    return (
                      <div key={`${b.playerId}-${i}`} style={{ ...row, ...mine(isMine) }}>
                        <Pos>{b.position}</Pos>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <NameGrade playerId={b.playerId} name={b.name} rating={b.rating} />
                        </span>
                        <Crest team={b.team} />
                        <span style={{ width: isMobile ? 'auto' : '112px' }}>
                          <TeamName team={b.team} mine={isMine} />
                        </span>
                        <HoverTooltip text={REASON_TEXT[b.reason] || b.reason}>
                          {tag(REASON_LABEL[b.reason] || b.reason, TEXT.muted)}
                        </HoverTooltip>
                      </div>
                    )
                  })}
              </Pane>

              <Pane title="Contract year" count={expiring.length}
                note={leaving.length ? `${leaving.length} leaving for nothing` : undefined}>
                {expiring.length === 0 ? emptyPane('Nobody is in the last year of a contract.') : (
                  [...expiring].sort((a, b) => b.rating - a.rating).map((e: ExpiringPlayer, i) => {
                    const isMine = !!myTeamId && e.team?.id === myTeamId
                    return (
                      <div key={`${e.playerId}-${i}`} style={{ ...row, ...mine(isMine) }}>
                        <Pos>{e.position}</Pos>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <NameGrade playerId={e.playerId} name={e.name} rating={e.rating} />
                        </span>
                        <Crest team={e.team} />
                        <span style={{ width: isMobile ? 'auto' : '112px' }}>
                          <TeamName team={e.team} mine={isMine} />
                        </span>
                        <span style={{ width: '70px', textAlign: 'right' }}>
                          {e.cannotKeep && (
                            <HoverTooltip text="His team is over its re-sign limit. He leaves for nothing unless somebody trades for him.">
                              {tag('Walking', ACCENT.warning)}
                            </HoverTooltip>
                          )}
                        </span>
                      </div>
                    )
                  })
                )}
              </Pane>
            </div>

            {/* WHAT HAS ALREADY MOVED */}
            <Pane title="Activity" count={trades.length + moves.length} height={300}>
              {trades.length === 0 && moves.length === 0 ? emptyPane('Nothing has moved yet.') : (
                <>
                  {trades.map(t => (
                    <div key={`t${t.id}`} style={{ ...row, flexWrap: 'wrap' }}>
                      {tag('Trade', ACCENT.info)}
                      <span style={{ ...font(500, 13), color: TEXT.secondary, flex: 1, minWidth: '180px' }}>
                        {t.teamA?.name} and {t.teamB?.name}, {t.aGave.length + t.bGave.length} assets
                      </span>
                      <span style={{ ...font(400, 11), color: TEXT.muted }}>
                        {t.phase === 'offseason' ? 'Offseason' : `Week ${t.week}`}
                      </span>
                    </div>
                  ))}
                  {moves.map((m, i) => (
                    <div key={`m${i}`} style={{ ...row, flexWrap: 'wrap' }}>
                      {tag(m.type.replace(/_/g, ' '), TEXT.muted)}
                      <span style={{ ...font(500, 13), color: TEXT.secondary, flex: 1, minWidth: '180px' }}>
                        <PlayerLink playerId={m.playerId} playerName={m.player || 'Someone'}
                          style={{ ...font(600, 13), color: TEXT.body }} />
                        {m.team?.name ? <span style={{ color: TEXT.muted }}> {m.team.name}</span> : null}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </Pane>
          </div>
        )}
      </div>
    </>
  )
}

export default TransactionsPage
