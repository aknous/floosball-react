import React, { useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactions, DraftSlot, Prospect, ExpiringPlayer, BlockListing, TradeRow, TradeAsset, TeamBlob, PoolFreeAgent } from '@/hooks/useTransactions'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import HoverTooltip from '@/Components/HoverTooltip'
import PlayerLink from '@/Components/PlayerLink'
import Potential, { potentialTooltip } from '@/Components/Potential'
import { Stars, calcStars } from '@/Components/Stars'
import { useIsMobile } from '@/hooks/useIsMobile'

/**
 * Why a team put this player on the trading block. Short: the row is scanned, not read.
 *
 * ⚠️ PLAIN WORDS, NOT THE SPORT'S OWN (owner, 2026-09-17). "Walking" and "leaves for
 * nothing" are how the front office talks about an expiring contract; a fan reading a
 * table wants the outcome, which is that the player becomes a free agent.
 */
const REASON_LABEL: Record<string, string> = {
  expiring_surplus: 'Leaving',
  expiring_keeper: 'Costly',
  horizon_mismatch: 'Timeline',
  locker_room: 'Locker room',
  blocked_prospect: 'Blocking',
  inquiry: 'Asked about',
}
const REASON_TEXT: Record<string, string> = {
  expiring_surplus: 'Out of contract and past the re-sign limit. Becomes a free agent unless traded.',
  expiring_keeper: 'Out of contract but the team could keep them, so it will take a real return.',
  horizon_mismatch: 'Under contract for longer than this team can use, or a rental it cannot keep.',
  locker_room: 'Their attitude drags the room down every week they stay.',
  blocked_prospect: 'A prospect is ready and stuck behind them.',
  inquiry: 'Nobody listed them. Another team called to ask.',
}

/**
 * The six roster positions, in roster order rather than alphabetical, because that is
 * the order every other surface in the app lists them in.
 *
 * ⚠️ A FIXED LIST, NOT ONE DERIVED FROM THE DATA. Deriving it means the filter loses a
 * position the moment nobody in the class plays it, so the control changes shape between
 * visits and "no tight ends in this class" becomes invisible instead of being an answer.
 */
/**
 * What an empty trading block means. The sim decides whether the market is open and
 * sends the STATE; the wording lives here, so the rule is in one place and the voice
 * in another.
 *
 * ⚠️ "Nothing is being shopped" is only true while the market is OPEN. Past the
 * deadline the table is empty because trades cannot happen at all, and saying nobody
 * is available reads as a quiet league rather than a shut one.
 */
const WINDOW_CHIP: Record<string, string> = {
  disabled: 'Trading closed',
  early: 'Market opens week 15',
  deadline: 'Deadline passed',
}
const WINDOW_EMPTY = (w: { open: boolean; state: string; deadlineWeek: number }): string => {
  if (w.state === 'deadline') {
    return `The trade deadline passed in week ${w.deadlineWeek}. Rosters are frozen until the offseason.`
  }
  if (w.state === 'early') return 'Teams start listing in week 15, once they know their season.'
  if (w.state === 'disabled') return 'Trading is closed.'
  return 'Nothing is being shopped right now.'
}

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K'] as const
type PositionFilter = 'ALL' | typeof POSITIONS[number]

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
  <span style={{ ...font(700, 11, 1, '0.02em'), color: TEXT.muted, width: '28px', flexShrink: 0 }}>
    {children}
  </span>
)

/**
 * A player's name with their grade beside it.
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
 * ⚠️ DEFINED AT MODULE SCOPE, NOT INSIDE THE PAGE. A component declared in a render body
 * is a NEW component type on every render, so React unmounts and remounts it rather than
 * updating it: refs are dropped and re-attached, and any scroll position inside it is
 * reset to the top. That is what stopped the draft pane opening at the reader's own team
 * — the effect set scrollTop and the very next render threw the node away.
 */
/** A dashboard pane: titled, counted, and bounded so the page stays scannable. */
const Pane: React.FC<{
  title: string
  count?: number
  note?: string
  height?: number
  scrollRef?: React.Ref<HTMLDivElement>
  /** Sits between the title and the rule, so a pane's controls stay with its name. */
  control?: React.ReactNode
  children: React.ReactNode
}> = ({ title, count, note, height = 360, scrollRef, control, children }) => (
  <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
    {/* ⚠️ SENTENCE CASE, NOT UPPERCASE. This app reserves uppercase for FIELD LABELS —
        table heads and the facts-grid cells — and a section title is not one; the team
        page's `SectionHead` sets the pattern ("Roster", "The Bleachers", "Pipeline"),
        down to the rule that runs out to the right. Uppercasing them also made every
        pane shout at the same volume as the column heads inside it. */}
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '9px' }}>
      <h2 style={{ ...font(800, 13, 1, '0.02em'), color: TEXT.strong, margin: 0, whiteSpace: 'nowrap' }}>
        {title}
      </h2>
      {count != null && (
        <span style={{ ...font(600, 12), ...TABULAR, color: TEXT.muted }}>{count}</span>
      )}
      {note && <span style={{ ...font(400, 12), color: TEXT.muted, whiteSpace: 'nowrap' }}>{note}</span>}
      <span style={{ flex: 1, height: '2px', background: BORDER.hairline }} />
      {control}
    </div>
    {/* ⚠️ A FLOOR AS WELL AS A CEILING. Paired panes sit on `alignItems: start`, so an
        empty one collapsed to a single line of text beside a full one and the row read
        as broken rather than as quiet. It does not STRETCH to match either: forcing both
        to the tallest makes two sparse panes into two tall empty boxes. */}
    <div ref={scrollRef} data-pane style={{
      background: BG.panel, border: `1px solid ${BORDER.hairline}`, position: 'relative',
      minHeight: '150px', maxHeight: `${height}px`, overflowY: 'auto',
    }}>
      {children}
    </div>
  </section>
)

const PosFilter: React.FC<{ value: PositionFilter; onChange: (p: PositionFilter) => void }> =
  ({ value, onChange }) => (
    <div style={{ display: 'flex', border: `1px solid ${BORDER.hairline}`, background: BG.panel }}>
      {(['ALL', ...POSITIONS] as PositionFilter[]).map((p, i) => {
        const active = value === p
        return (
          <button key={p} onClick={() => onChange(p)}
            aria-pressed={active}
            title={p === 'ALL' ? 'Every position' : p}
            style={{
              ...font(active ? 800 : 500, 10),
              color: active ? BG.shell : TEXT.muted,
              background: active ? TEXT.secondary : 'transparent',
              border: 'none', borderLeft: i > 0 ? `1px solid ${BORDER.hairline}` : 'none',
              padding: '4px 7px', cursor: 'pointer', fontFamily: FONT,
            }}>{p}</button>
        )
      })}
    </div>
  )

/**
 * One settled trade: a headline you can read at a glance, and the full manifest underneath.
 *
 * ⚠️ THE COLLAPSED LINE IS THE TRADE, NOT A COUNT OF IT. It read "Rocks and Bees, 3 assets",
 * which says two clubs did something and refuses to say what — a reader has to open every
 * row to find the one they care about, which is the opposite of a summary. It now names who
 * sent whom to whom, and what came back.
 *
 * ⚠️ NO REASONING, DELIBERATELY (owner). The sim records why each side did it and this
 * showed it, which turns out to be the wrong call for a FAN surface: "part of being a fan
 * is wondering why a team made a move". Reading a trade and arguing about it is the point,
 * and an authoritative explanation under every one removes the argument. The `seller_why`
 * and `buyer_why` columns stay written — they cost nothing and the market harness reads
 * them — they are simply not shown.
 */
/**
 * How each kind of move reads. ⚠️ PLAIN WORDS (owner, 2026-09-18): "walked" is the
 * sport's own term for an expiring contract and reads as jargon, so it says where the
 * player went instead.
 */
const MOVE_KIND: Record<string, { label: string; color: string }> = {
  walked:      { label: 'Free Agency', color: ACCENT.warning },
  cut:         { label: 'Released',    color: ACCENT.negative },
  resign:      { label: 'Re-signed',   color: ACCENT.info },
  fa_pick:     { label: 'Signed',      color: ACCENT.success },
  rookie_pick: { label: 'Drafted',     color: ACCENT.featured },
  promotion:   { label: 'Promoted',    color: ACCENT.rules },
  retirement:  { label: 'Retired',     color: TEXT.muted },
}

const TradeRowView: React.FC<{
  trade: TradeRow
  row: React.CSSProperties
  tag: (text: string, color: string) => React.ReactNode
}> = ({ trade: t, row, tag }) => {
  const [open, setOpen] = useState(false)
  const names = (list: TradeAsset[]) =>
    list.map(a => a.name).filter(Boolean).join(', ') || 'nothing'
  const when = t.phase === 'offseason' ? 'Offseason' : `Week ${t.week}`

  /** A team's crest and name, so a reader recognises the shield before the word. */
  const teamChip = (team: TeamBlob | null, weight = 700) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
      <Crest team={team} size={15} />
      <b style={{ ...font(weight, 13), color: TEXT.body }}>{team?.name}</b>
    </span>
  )

  const piece = (a: TradeAsset, i: number) => (
    <li key={`${a.kind}-${a.id ?? i}`} style={{
      display: 'flex', alignItems: 'baseline', gap: '8px', padding: '3px 0',
    }}>
      <span style={{ ...font(700, 10, 1, '0.02em'), color: TEXT.dim, width: '58px', flexShrink: 0 }}>
        {(a.kind || 'asset').toUpperCase()}
      </span>
      <span style={{ ...font(600, 13), color: TEXT.body }}>{a.name}</span>
      {a.detail && <span style={{ ...font(400, 11), color: TEXT.muted }}>{a.detail}</span>}
      {/* ⚠️ ONLY WHERE THERE IS A PLAYER. A pick has no rating and a player who has since
          left the league cannot be resolved, so the stars are absent rather than drawn
          at some default that would read as a one-star player. */}
      {a.rating != null && (
        <HoverTooltip text={`Rated ${Math.round(a.rating)} now`}>
          <span style={{ display: 'inline-block' }}>
            <Stars stars={calcStars(a.rating)} size={13} tracking={2} />
          </span>
        </HoverTooltip>
      )}
    </li>
  )

  const side = (team: TeamBlob | null, gave: TradeAsset[]) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px' }}>
        {teamChip(team, 700)}
        <span style={{ ...font(400, 11), color: TEXT.muted }}>sent</span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{gave.map(piece)}</ul>
    </div>
  )

  return (
    <div style={{ borderBottom: `1px solid ${BORDER.subtle}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          ...row, borderBottom: 'none', width: '100%', textAlign: 'left',
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: FONT, color: 'inherit',
        }}>
        <span style={{
          ...font(700, 11), color: TEXT.dim, width: '10px', flexShrink: 0,
          transform: open ? 'rotate(90deg)' : 'none', display: 'inline-block',
        }}>&rsaquo;</span>
        {tag('Trade', ACCENT.info)}
        <span style={{ ...font(500, 13, 1.7), color: TEXT.secondary, flex: 1, minWidth: 0 }}>
          {teamChip(t.teamA)} sent <b style={{ color: TEXT.body }}>{names(t.aGave)}</b> to{' '}
          {teamChip(t.teamB)} for <b style={{ color: TEXT.body }}>{names(t.bGave)}</b>
        </span>
        <span style={{ ...font(400, 11), color: TEXT.muted, whiteSpace: 'nowrap' }}>{when}</span>
      </button>
      {open && (
        <div style={{
          display: 'grid', gap: '22px', padding: '4px 14px 16px 36px',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
        }}>
          {side(t.teamA, t.aGave)}
          {side(t.teamB, t.bGave)}
        </div>
      )}
    </div>
  )
}

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
 *   THE BOARD      rookie draft order beside the rookie class. Where we pick, and who is
 *                  there. ⚠️ THE ROOKIE DRAFT SPECIFICALLY — this league runs two drafts,
 *                  and the free-agency draft has its own worst-first order that this pane
 *                  is NOT showing. The picks it overlays come from `draft_picks`, which
 *                  are rookie picks; a reader who reads "draft order" as the FA draft
 *                  would take the traded-pick markers to mean something they do not.
 *   THE MARKET     the trading block beside players about to reach free agency. Who we
 *                  could get, and by which route.
 *   ACTIVITY       what has already moved.
 *
 * ⚠️ EACH PANE SCROLLS INSIDE ITSELF rather than growing the page. The free-agent pane
 * alone runs to 150 rows on a mature league; laid out flat, the dashboard becomes a document
 * you scroll for a minute, which is the thing it exists not to be. Bounded panes keep
 * every region on screen at once, which is the whole argument for dropping the tabs.
 */
const TransactionsPage: React.FC = () => {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const myTeamId = (user as any)?.favoriteTeamId ?? null
  const {
    loading, error, season, week, tradeWindow,
    draftOrder, prospects, expiring, block, trades, moves, showPool, freeAgentPool,
  } = useTransactions()

  const [classPos, setClassPos] = useState<PositionFilter>('ALL')
  const [contractPos, setContractPos] = useState<PositionFilter>('ALL')
  const shownProspects = useMemo(
    () => (classPos === 'ALL' ? prospects : prospects.filter(p => p.position === classPos)),
    [prospects, classPos])
  const shownExpiring = useMemo(
    () => (contractPos === 'ALL' ? expiring : expiring.filter(e => e.position === contractPos)),
    [expiring, contractPos])
  const shownPool = useMemo(
    () => (contractPos === 'ALL' ? freeAgentPool : freeAgentPool.filter(p => p.position === contractPos)),
    [freeAgentPool, contractPos])
  /**
   * Who each free agent LEFT and who has since SIGNED them, from this season's moves.
   * The pool itself carries neither: a free agent's team is just "Free Agent".
   */
  const { leftTeam, signedBy } = useMemo(() => {
    const left = new Map<number, TeamBlob>()
    const signed = new Map<number, TeamBlob>()
    for (const m of moves) {
      if (m.playerId == null || !m.team || !('id' in m.team)) continue
      if (m.type === 'walked' || m.type === 'cut') left.set(m.playerId, m.team)
      else if (m.type === 'fa_pick') signed.set(m.playerId, m.team)
    }
    return { leftTeam: left, signedBy: signed }
  }, [moves])

  const tradedCount = useMemo(() => draftOrder.filter(d => d.traded).length, [draftOrder])
  /**
   * ⚠️ A HIGHLIGHT BELOW THE FOLD IS NOT A HIGHLIGHT. The pane shows about seven of
   * thirty-two rows, so a team picking 16th was marked in its own colour and invisible
   * until you went looking — which is the one job the marking has. The pane opens
   * already scrolled to it.
   *
   * Scrolls the CONTAINER rather than calling scrollIntoView, which walks up the tree and
   * would drag the whole page down to meet it. Jumps rather than animates: this is the
   * pane's resting position, not a transition the reader should watch.
   *
   * ⚠️ A REF CALLBACK, NOT AN EFFECT. An effect reading two refs fired before the row had
   * attached and returned early, leaving the pane at the top with no sign anything had
   * been attempted. A ref callback runs exactly when the node arrives, so there is no
   * ordering to get wrong.
   */
  const revealOwnRow = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const pane = node.closest('[data-pane]') as HTMLElement | null
    if (!pane) return
    // ⚠️ `offsetTop` IS MEASURED FROM THE NEAREST POSITIONED ANCESTOR, so the pane sets
    // `position: relative` — against a static pane this reads the distance from somewhere
    // further up the page and scrolls to a meaningless offset.
    pane.scrollTop = Math.max(0, node.offsetTop - pane.clientHeight / 2 + node.clientHeight / 2)
  }, [])

  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 14px', borderBottom: `1px solid ${BORDER.subtle}`,
  }
  /**
   * The team name and the trailing badge are COLUMNS, so they need `flexShrink: 0`.
   * A bare `width` in a flex row is only a basis: a wide badge ("Locker room") shrinks
   * the team span below its 112px and the column goes ragged row to row. Mobile keeps
   * the default shrink, where auto widths have to give way rather than overflow.
   */
  const teamCol: React.CSSProperties = {
    width: isMobile ? 'auto' : '112px', flexShrink: isMobile ? 1 : 0,
  }
  const tagCol: React.CSSProperties = {
    width: isMobile ? 'auto' : '92px', flexShrink: isMobile ? 1 : 0, textAlign: 'right',
  }
  const headRow: React.CSSProperties = {
    ...row, padding: '8px 14px', background: BG.shell,
    ...font(700, 10, 1, '0.02em'), color: TEXT.muted, textTransform: 'uppercase',
    position: 'sticky', top: 0, zIndex: 1,
  }
  const mine = (on: boolean): React.CSSProperties =>
    on ? { background: BG.cardOwn, boxShadow: `inset 2px 0 0 ${ACCENT.ownTeam}` } : {}
  const tag = (text: string, color: string) => (
    <span style={{
      ...font(700, 11, 1, '0.01em'), color,
      border: `1px solid ${color}55`, padding: '2px 6px', whiteSpace: 'nowrap',
    }}>{text}</span>
  )

  const emptyPane = (text: string) => (
    <div style={{
      padding: '34px 16px', textAlign: 'center', ...font(400, 13), color: TEXT.muted,
      minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {text}
    </div>
  )

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
        {!tradeWindow.open && tag(WINDOW_CHIP[tradeWindow.state] || 'Trading closed', TEXT.muted)}
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

            {/* THE BOARD */}
            <div style={pair}>
              {/* ⚠️ NO COUNT. It is one slot per team, so it is always the size of the
                  league and tells a reader nothing — unlike the block or the free agents,
                  where the number IS the news. The class keeps its count because the
                  filter turns it into "3 of 32". */}
              <Pane title="Rookie draft order"
                note={tradedCount ? `${tradedCount} traded` : undefined}
>
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
                      const isMyPick = !!myTeamId && d.owner?.id === myTeamId
                      return (
                        <div key={d.slot} ref={isMyPick ? revealOwnRow : undefined}
                          style={{ ...row, ...mine(isMine) }}>
                          <span style={{
                            ...font(700, 13), ...TABULAR, width: '22px',
                            color: d.slot <= 3 ? ACCENT.info : TEXT.dim,
                          }}>{d.slot}</span>
                          <Crest team={d.owner} size={17} />
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <TeamName team={d.owner} mine={!!myTeamId && d.owner?.id === myTeamId} />
                          </span>
                          <HoverTooltip text={`${d.originalTeam?.name ?? ''} finished here. The rookie slot follows that record, whoever holds the pick.`}>
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

              <Pane title="Rookie class" count={shownProspects.length}
                note={classPos === 'ALL' ? undefined : `of ${prospects.length}`}
                control={<PosFilter value={classPos} onChange={setClassPos} />}>
                {prospects.length === 0 ? emptyPane('No class generated yet.')
                  : shownProspects.length === 0 ? emptyPane(`No ${classPos} in this class.`) : (
                  <>
                    <div style={headRow}>
                      <span style={{ width: '22px' }}>#</span>
                      <span style={{ flex: 1 }}>Prospect</span>
                      <span style={{ width: '150px' }}>Now &amp; potential</span>
                    </div>
                    {/* ⚠️ RANKED, NOT PAIRED TO A SLOT. Lining prospect N up against pick N
                        would read as a prediction, and every team drafts off its own board. */}
                    {shownProspects.map((p: Prospect, i) => (
                      <div key={p.playerId} style={row}>
                        <span style={{ ...font(700, 12), ...TABULAR, width: '22px', color: TEXT.faint }}>
                          {i + 1}
                        </span>
                        <Pos>{p.position}</Pos>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <PlayerLink playerId={p.playerId} playerName={p.name}
                            style={{ ...font(600, 14), color: TEXT.body }} />
                        </span>
                        <HoverTooltip content={potentialTooltip(p.rating, p.ceilingRange)}>
                          <span style={{ width: '150px', display: 'inline-block' }}>
                            <Potential rating={p.rating} range={p.ceilingRange} />
                          </span>
                        </HoverTooltip>
                      </div>
                    ))}
                  </>
                )}
              </Pane>
            </div>

            {/* THE MARKET */}
            <div style={pair}>
              <Pane title="Trading block" count={block.length}>
                {block.length === 0
                  ? emptyPane(WINDOW_EMPTY(tradeWindow))
                  : [...block].sort((a, b) => b.rating - a.rating).map((b: BlockListing, i) => {
                    const isMine = !!myTeamId && b.team?.id === myTeamId
                    return (
                      <div key={`${b.playerId}-${i}`} style={{ ...row, ...mine(isMine) }}>
                        <Pos>{b.position}</Pos>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <NameGrade playerId={b.playerId} name={b.name} rating={b.rating} />
                        </span>
                        <Crest team={b.team} />
                        <span style={teamCol}>
                          <TeamName team={b.team} mine={isMine} />
                        </span>
                        <span style={tagCol}>
                          <HoverTooltip text={REASON_TEXT[b.reason] || b.reason}>
                            {tag(REASON_LABEL[b.reason] || b.reason, TEXT.muted)}
                          </HoverTooltip>
                        </span>
                      </div>
                    )
                  })}
              </Pane>

              {showPool ? (
              <Pane title="Free agents" count={shownPool.length}
                note={contractPos === 'ALL' ? undefined : `of ${freeAgentPool.length}`}
                control={<PosFilter value={contractPos} onChange={setContractPos} />}>
                {freeAgentPool.length === 0 ? emptyPane('The free-agent pool is empty.')
                  : shownPool.length === 0 ? emptyPane(`No ${contractPos} is a free agent.`) : (
                  [...shownPool].sort((a, b) => b.rating - a.rating).map((p: PoolFreeAgent, i) => {
                    const from = leftTeam.get(p.id) ?? null
                    const to = signedBy.get(p.id) ?? null
                    const isMine = !!myTeamId && (from?.id === myTeamId || to?.id === myTeamId)
                    return (
                      <div key={`${p.id}-${i}`} style={{ ...row, ...mine(isMine) }}>
                        <Pos>{p.position}</Pos>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <NameGrade playerId={p.id} name={p.name} rating={p.rating} />
                        </span>
                        <Crest team={to ?? from} />
                        <span style={teamCol}>
                          <TeamName team={to ?? from} mine={isMine} />
                        </span>
                        <span style={tagCol}>
                          {to ? (
                            <HoverTooltip text={from ? `Entered free agency from ${from.name}, signed by ${to.name}.` : `Signed by ${to.name}.`}>
                              {tag('Signed', ACCENT.success)}
                            </HoverTooltip>
                          ) : from ? (
                            <HoverTooltip text={`Entered free agency from ${from.name} this offseason.`}>
                              {tag('Free Agency', ACCENT.warning)}
                            </HoverTooltip>
                          ) : p.isNewcomer ? (
                            <HoverTooltip text="New to the league. No pro season played yet.">
                              {tag('New', ACCENT.info)}
                            </HoverTooltip>
                          ) : null}
                        </span>
                      </div>
                    )
                  })
                )}
              </Pane>
              ) : (
                <Pane title="Potential free agents" count={shownExpiring.length}
                  note={contractPos === 'ALL' ? undefined : `of ${expiring.length}`}
                  control={<PosFilter value={contractPos} onChange={setContractPos} />}>
                  {expiring.length === 0 ? emptyPane('Nobody is in the last year of a contract.')
                    : shownExpiring.length === 0 ? emptyPane(`No ${contractPos} is out of contract.`) : (
                    [...shownExpiring].sort((a, b) => b.rating - a.rating).map((e: ExpiringPlayer, i) => {
                      const isMine = !!myTeamId && e.team?.id === myTeamId
                      return (
                        <div key={`${e.playerId}-${i}`} style={{ ...row, ...mine(isMine) }}>
                          <Pos>{e.position}</Pos>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <NameGrade playerId={e.playerId} name={e.name} rating={e.rating} />
                          </span>
                          <Crest team={e.team} />
                          <span style={teamCol}>
                            <TeamName team={e.team} mine={isMine} />
                          </span>
                          <span style={tagCol}>
                            {e.cannotKeep && (
                              <HoverTooltip text="This team is over its re-sign limit. Becomes a free agent unless traded.">
                                {tag('Leaving', ACCENT.warning)}
                              </HoverTooltip>
                            )}
                          </span>
                        </div>
                      )
                    })
                  )}
                </Pane>
              )}
            </div>

            {/* WHAT HAS ALREADY MOVED */}
            <Pane title="Activity" count={trades.length + moves.length} height={300}>
              {trades.length === 0 && moves.length === 0 ? emptyPane('Nothing has moved yet.') : (
                <>
                  {trades.map(t => (
                    <TradeRowView key={`t${t.id}`} trade={t} row={row} tag={tag} />
                  ))}
                  {moves.map((m, i) => {
                    const kind = MOVE_KIND[m.type] ?? { label: m.type.replace(/_/g, ' '), color: TEXT.muted }
                    const team = m.team && 'id' in m.team ? m.team : null
                    const isMine = !!myTeamId && team?.id === myTeamId
                    return (
                      <div key={`m${i}`} style={{
                        ...row, flexWrap: 'wrap',
                        boxShadow: `inset 3px 0 0 ${kind.color}`,
                        // Your team's rows keep the own-team highlight over the move color.
                        ...mine(isMine),
                      }}>
                        <span style={{ width: '112px', flexShrink: 0 }}>{tag(kind.label, kind.color)}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px' }}>
                          <PlayerLink playerId={m.playerId} playerName={m.player || 'Someone'}
                            style={{ ...font(600, 13), color: TEXT.body }} />
                          {m.rating != null && m.rating > 0 && (
                            <Stars stars={calcStars(m.rating)} size={11} />
                          )}
                          {m.position && m.position !== '—' && (
                            <span style={{ ...font(700, 11, 1, '0.02em'), color: TEXT.muted }}>{m.position}</span>
                          )}
                        </span>
                        {team ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', ...teamCol }}>
                            <Crest team={team} size={17} />
                            <TeamName team={team} mine={isMine} />
                          </span>
                        ) : m.team?.name ? (
                          <span style={{ ...font(500, 13), color: TEXT.muted, ...teamCol }}>{m.team.name}</span>
                        ) : null}
                      </div>
                    )
                  })}
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
