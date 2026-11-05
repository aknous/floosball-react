import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import PlayerLink from '@/Components/PlayerLink'
import HoverTooltip from '@/Components/HoverTooltip'
import { Stars, calcStars } from '@/Components/Stars'
import { Crest } from '@/Views/GameBoard/boardPieces'
import { useIsMobile } from '@/hooks/useIsMobile'
import { TradeProposal, TeamTally, VoteAsset, VoteTeam } from '@/hooks/useTradeVotes'
import { readableTeamColor } from '@/utils/colors'

/** A team's color, lifted to read on the dark card (owner: color and crests carry who is who). */
const teamColor = (team?: { color?: string | null } | null): string =>
  team?.color ? readableTeamColor(team.color) : TEXT.strong

/**
 * Fan approval votes on trades. Every trade the teams agree waits here until the fans
 * approve it (backend `managers/tradeVotes.py`). Everyone signed in can vote on every
 * trade; it goes through only if the league says yes, each team with active fans gets
 * enough of them to approve, and neither team's fans vote it down.
 */

const CLOSES: Record<TradeProposal['closeKind'], string> = {
  deadline: 'at the trade deadline',
  rookie_draft: 'at the rookie draft',
  season_start: 'at the season start',
}

function closesText(p: TradeProposal): string {
  if (!p.closesAt) return 'Closes soon'
  const ms = new Date(p.closesAt).getTime() - Date.now()
  if (isNaN(ms)) return 'Closes soon'
  if (ms <= 0) return 'Closing'
  // Votes close within a day or two (the deadline, the rookie draft, the season start),
  // so hours read better than "2 days" (owner).
  const mins = Math.round(ms / 60000)
  const rel = mins < 60 ? `${Math.max(1, mins)}m` : `${Math.round(ms / 3600000)}h`
  return `Closes in ${rel}`
}

const POS_RE = /^(QB|RB|WR|TE|K)$/

function pickLabel(a: VoteAsset): string {
  return a.name.replace(/^S(\d+) R1 pick$/, 'Season $1 pick')
}

function assetTag(a: VoteAsset): string {
  if (a.kind === 'pick') return 'PICK'
  if (a.position && POS_RE.test(a.position)) return a.position
  if (a.kind === 'prospect') return 'PROS'
  return a.detail && POS_RE.test(a.detail) ? a.detail : ''
}

const STAGE: Record<NonNullable<VoteAsset['careerStage']>, string> = {
  developing: 'Still developing',
  prime: 'In their prime',
  aging: 'Past their peak',
  near_retirement: 'Near retirement',
  retiring: 'Retiring this offseason',
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** A share as a voter reads it; the ends are a model, not a promise. */
function share(x: number, lower = false): string {
  if (x >= 0.985) return lower ? 'nearly all' : 'Nearly all'
  if (x <= 0.015) return lower ? 'almost none' : 'Almost none'
  return `${Math.round(x * 100)}%`
}

/** A rating range in stars, the way fans read talent (owner: no rating numbers on a card). */
function starsPhrase(lo: number, hi: number): string {
  const a = calcStars(lo), b = calcStars(hi)
  return a === b ? `a ${a}-star player` : `a ${a} to ${b}-star player`
}

/** The asset's main line, then notes a voter needs to judge it. */
/** One fact under a piece when Details is open: a short label and its value (owner,
 * 2026-11-05: the notes as stacked sentences read as clutter). */
interface Fact { label: string; value: string }

function assetLines(a: VoteAsset, p: TradeProposal): { detail: string; notes: Fact[] } {
  const phase = p.phase
  const notes: Fact[] = []
  // "a 2 to 3-star player" reads as a value without its article.
  const stars = (lo: number, hi: number) => starsPhrase(lo, hi).replace(/^a /, '')
  if (a.kind === 'pick') {
    const o = a.outlook
    const whose = a.originalTeam ? `${a.originalTeam.name} pick` : ''
    let at = ''
    if (o?.slot != null) {
      at = `${o.slotFinal ? '' : 'projected '}#${o.slot}`
    } else if (o?.expectedSlot != null) {
      at = `expected around #${o.expectedSlot}, ${o.draftsOut === 1 ? 'next' : `${o.draftsOut} drafts out`}`
    } else {
      // Only the upcoming draft (this trade's own season) has a slot worth showing. A future
      // pick's "slot" is just where that team sits today, which says nothing about that draft.
      const pickSeason = Number(a.name.match(/^S(\d+) /)?.[1])
      const slot = pickSeason === p.season ? a.detail?.match(/slot (\d+)/)?.[1] : undefined
      if (slot) at = `${phase === 'in_season' ? 'projected ' : ''}#${slot}`
    }
    if (o?.classProspect) {
      const c = o.classProspect
      notes.push({ label: 'This class',
        value: `The ${ordinal(c.rank)} best prospect projects as ${starsPhrase(c.low, c.high)}` })
    }
    // The class prospect is the better read where the class exists; the generic line
    // would contradict the stars beside it.
    if (o?.typical && !o.classProspect) {
      const t = o.typical
      const head = `Typically ${calcStars(t.medianBest)}-star players`
      notes.push({ label: `Picks ${ordinal(t.band[0])}-${ordinal(t.band[1])}`,
        value: t.threeStarShare >= 0.985
          ? `${head}, and ${share(t.fourStarShare, true)} reach 4 stars`
          : `${head}. ${share(t.threeStarShare)} reach 3 stars and ${share(t.fourStarShare, true)} reach 4` })
    }
    return { detail: [whose, at].filter(Boolean).join(', '), notes }
  }
  if (a.kind === 'prospect') {
    if (a.projection) {
      notes.push({ label: 'Projected', value: stars(a.projection.low, a.projection.high) })
    }
    if (a.windowLeft != null) {
      notes.push({ label: 'Roster window', value: a.windowLeft <= 1
        ? 'Last season to make the roster before release'
        : `${a.windowLeft} seasons left to make the roster before release` })
    }
    return { detail: 'Prospect', notes }
  }
  const bits: string[] = []
  if (a.termRemaining != null) {
    // The offseason belongs to the season that just ended: contracts have already ticked
    // down, so one season left means the coming one, not the season just played.
    if (a.termRemaining <= 1) bits.push(phase === 'in_season' ? 'contract ends this season' : 'one season left')
    else bits.push(`${a.termRemaining} seasons left`)
  }
  if (a.careerStage) {
    const n = a.seasonsPlayed ?? 0
    notes.push({ label: 'Career', value: n > 0
      ? `${STAGE[a.careerStage]}, ${n} season${n === 1 ? '' : 's'} in the league`
      : STAGE[a.careerStage] })
  }
  if (a.projection) {
    notes.push({ label: 'Projected', value: stars(a.projection.low, a.projection.high) })
  } else if (a.nextSeason != null && a.rating && a.careerStage !== 'retiring') {
    // The direction, not the number (owner, 2026-11-04).
    const change = Math.round(a.nextSeason) - Math.round(a.rating)
    notes.push({ label: 'Next season', value: change > 0 ? 'Expected to improve'
      : change < 0 ? 'Expected to regress' : 'Expected to hold steady' })
  }
  const detail = bits.join(', ')
  return { detail: detail ? detail[0].toUpperCase() + detail.slice(1) : '', notes }
}

/** What the star column means for this piece, in words. */
function expectedTip(a: VoteAsset): string {
  const n = calcStars(a.expectedRating ?? 0)
  if (a.kind === 'pick') return `${n}-star player at this slot`
  if (a.kind === 'prospect' || a.projection) return `${n}-star player once developed`
  return `${n}-star player next season`
}

function Asset({ a, p, showNotes }: { a: VoteAsset; p: TradeProposal; showNotes: boolean }) {
  const { detail, notes } = assetLines(a, p)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <span style={{ ...font(800, 11, 1, '0.03em'), color: TEXT.muted, minWidth: '36px', paddingTop: '3px' }}>
        {assetTag(a)}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
        {a.kind === 'pick' || a.id == null ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', ...font(650, 14), color: TEXT.strong }}>
            {a.kind === 'pick' && a.originalTeam?.id != null && (
              <HoverTooltip text={`Slot set by where the ${a.originalTeam.name} finish.`}>
                <Crest teamId={a.originalTeam.id} size={16} />
              </HoverTooltip>
            )}
            {pickLabel(a)}
          </span>
        ) : (
          <PlayerLink playerId={a.id} playerName={a.name} style={{ ...font(650, 14), color: TEXT.strong }} />
        )}
        {detail && <span style={{ ...font(400, 12), color: TEXT.secondary }}>{detail}</span>}
        {showNotes && notes.length > 0 && (
          <span style={{
            // A fixed label column, so values line up from piece to piece down the card,
            // set off by a rule like the GM reasoning block (owner, 2026-11-05).
            display: 'grid', gridTemplateColumns: '104px minmax(0, 1fr)',
            gap: '4px 12px', marginTop: '6px', alignItems: 'baseline',
            borderLeft: `2px solid ${BORDER.raised}`, paddingLeft: '10px',
          }}>
            {notes.map((n, i) => (
              <React.Fragment key={i}>
                <span style={{ ...font(700, 10, 1.4, '0.04em'), color: TEXT.muted, textTransform: 'uppercase' }}>{n.label}</span>
                <span style={{ ...font(400, 12, 1.4), color: TEXT.secondary }}>{n.value}</span>
              </React.Fragment>
            ))}
          </span>
        )}
      </span>
      {a.expectedRating != null && a.expectedRating > 0 && (
        <HoverTooltip text={expectedTip(a)} style={{ flexShrink: 0 }}>
          <Stars stars={calcStars(a.expectedRating)} size={16} />
        </HoverTooltip>
      )}
    </div>
  )
}

function Side({ team, gives, why, p, isMobile, last }: {
  team: VoteTeam | null; gives: VoteAsset[]; why: string | null
  p: TradeProposal; isMobile: boolean; last?: boolean
}) {
  const [showWhy, setShowWhy] = useState(false)
  const hasNotes = gives.some(a => assetLines(a, p).notes.length > 0)
  return (
    <div style={{
      padding: '14px 18px 16px', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0,
      // The team's color across the top of its side, so who sends what reads at a glance.
      borderTop: `3px solid ${team?.color ?? BORDER.hairline}`,
      ...(last ? {} : isMobile ? { borderBottom: `1px solid ${BORDER.hairline}` }
        : { borderRight: `1px solid ${BORDER.hairline}` }),
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <Crest teamId={team?.id} size={22} />
          <span style={{ ...font(800, 15), color: teamColor(team) }}>{team?.name ?? 'This team'}</span>
          <span style={{ ...font(600, 13), color: TEXT.muted }}>send</span>
        </span>
        {gives.some(a => (a.expectedRating ?? 0) > 0) && (
          <HoverTooltip text="A player next season, a prospect once developed, a pick by its slot.">
            <span style={{ ...font(700, 12, 1, '0.04em'), color: TEXT.muted }}>EXPECTED</span>
          </HoverTooltip>
        )}
      </div>
      {gives.length ? gives.map((a, i) => <Asset key={`${a.kind}${a.id}${i}`} a={a} p={p} showNotes={showWhy} />)
        : <div style={{ ...font(400, 13), color: TEXT.muted }}>Nothing</div>}
      {(why || hasNotes) && (
        <>
          <button onClick={() => setShowWhy(v => !v)} aria-expanded={showWhy} style={{
            ...font(600, 12), fontFamily: FONT, color: ACCENT.info, background: 'none', border: 'none',
            padding: 0, cursor: 'pointer', alignSelf: 'flex-start',
          }}>{showWhy ? 'Hide details' : 'Details'}</button>
          {showWhy && why && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '4px',
              borderLeft: `2px solid ${team?.color ?? BORDER.hairline}`, paddingLeft: '10px',
            }}>
              <span style={{ ...font(700, 10, 1, '0.04em'), color: TEXT.muted }}>GM REASONING</span>
              <p style={{ ...font(400, 13, 1.5), color: TEXT.secondary, margin: 0 }}>{why}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Bar({ label, count, countColor, fill, fillColor, against, tip }: {
  label: React.ReactNode; count: string; countColor: string
  fill: number; fillColor: string; against?: number; tip?: string
}) {
  const style: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' }
  const body = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ ...font(650, 13), color: TEXT.body, display: 'inline-flex', alignItems: 'center', gap: '7px' }}>{label}</span>
        <span style={{ ...font(600, 13), ...TABULAR, color: countColor, textAlign: 'right' }}>{count}</span>
      </div>
      <div style={{ height: '8px', background: BORDER.hairline, display: 'flex' }}>
        <span style={{ width: `${fill}%`, background: fillColor }} />
        <span style={{ flex: 1 }} />
        {!!against && <span style={{ width: `${against}%`, background: ACCENT.negative }} />}
      </div>
    </>
  )
  return tip ? <HoverTooltip text={tip} style={style}>{body}</HoverTooltip> : <div style={style}>{body}</div>
}

function vetoed(t: TeamTally) { return t.fans > 0 && t.no > t.yes }
function approved(t: TeamTally) { return t.fans === 0 || (t.yes >= t.need && !vetoed(t)) }

function TeamBar({ team, t }: { team: VoteTeam | null; t: TeamTally }) {
  const name = team?.name ?? 'This team'
  const label = (
    <>
      <Crest teamId={team?.id} size={16} />
      <span><span style={{ color: teamColor(team) }}>{name}</span> fans</span>
    </>
  )
  if (t.fans === 0) {
    return (
      <HoverTooltip text="No active fans, so the league decides."
        style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ ...font(650, 13), color: TEXT.body, display: 'inline-flex', alignItems: 'center', gap: '7px' }}>{label}</span>
        <span style={{ ...font(600, 13), color: TEXT.muted }}>None active</span>
      </HoverTooltip>
    )
  }
  const veto = vetoed(t)
  const met = approved(t)
  // Approvals fill from the left toward the bar's end (the approvals needed), no votes from the right.
  const scale = Math.max(1, t.need, t.yes + t.no)
  const tip = veto
    ? `${t.no} no, ${t.yes} yes. More no than yes blocks the trade.`
    : t.no ? `${t.no} no. More no than yes would block it.` : 'More no than yes would block it.'
  return (
    <Bar label={label} count={`${t.yes} yes, ${t.need} needed`}
      countColor={veto ? ACCENT.negative : met ? ACCENT.success : TEXT.secondary}
      fill={Math.round((t.yes / scale) * 100)} against={Math.round((t.no / scale) * 100)}
      fillColor={met ? ACCENT.success : ACCENT.warning} tip={tip} />
  )
}

function LeagueBar({ yes, no }: { yes: number; no: number }) {
  const total = Math.max(1, yes + no)
  const ok = yes > no
  return (
    <Bar label="League" count={`${yes} yes, ${no} no`}
      countColor={yes + no === 0 ? TEXT.muted : ok ? ACCENT.success : ACCENT.negative}
      fill={Math.round((yes / total) * 100)} fillColor={ACCENT.success}
      against={Math.round((no / total) * 100)} />
  )
}

// Trend arrows, not verdict marks: an open vote can still change until it closes.
const TREND_UP = <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>
const TREND_DOWN = <><path d="M3 7l6 6 4-4 8 8" /><path d="M15 17h6v-6" /></>
const TREND_FLAT = <><path d="M3 12h16" /><path d="M15 8l4 4-4 4" /></>

function standing(p: TradeProposal): { text: string; color: string; icon: React.ReactNode } {
  const { teamA, teamB } = p.tally
  if (vetoed(teamA)) return { text: `Trending to fail: ${p.teamA?.name ?? 'Team'} fans are voting it down.`, color: ACCENT.negative, icon: TREND_DOWN }
  if (vetoed(teamB)) return { text: `Trending to fail: ${p.teamB?.name ?? 'Team'} fans are voting it down.`, color: ACCENT.negative, icon: TREND_DOWN }
  if (p.tally.yes + p.tally.no === 0) return { text: `No votes yet.`, color: TEXT.muted, icon: TREND_FLAT }
  if (p.tally.yes <= p.tally.no) return { text: `Trending to fail: the league is voting it down.`, color: ACCENT.negative, icon: TREND_DOWN }
  if (p.tally.passing) return { text: `Trending to pass.`, color: ACCENT.success, icon: TREND_UP }
  return { text: `Short of the approvals it needs so far.`, color: ACCENT.warning, icon: TREND_FLAT }
}

function StandingIcon({ p }: { p: TradeProposal }) {
  const st = standing(p)
  return (
    <HoverTooltip text={st.text} color={st.color}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={st.color} strokeWidth="2.6"
        strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={st.text} style={{ display: 'block' }}>
        {st.icon}
      </svg>
    </HoverTooltip>
  )
}

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      ...font(700, 12), color, border: `1px solid ${color}73`, padding: '4px 8px', whiteSpace: 'nowrap',
    }}>{text}</span>
  )
}

function VoteButton({ label, active, color, disabled, onClick }: {
  label: string; active: boolean; color: string; disabled: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={active} style={{
      ...font(800, 14), fontFamily: FONT, flex: 1, minHeight: '44px',
      color: active ? BG.shell : color, background: active ? color : 'transparent',
      border: `1px solid ${color}`, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
    }}>{label}</button>
  )
}

function TeamName({ team }: { team: VoteTeam | null }) {
  if (!team) return <span>?</span>
  return <Link to={`/team/${team.id}`} style={{ color: teamColor(team), textDecoration: 'none' }}>{team.name}</Link>
}

function OpenCard({ p, myTeamId, signedIn, busy, onVote, isMobile }: {
  p: TradeProposal
  myTeamId: number | null
  signedIn: boolean
  busy: boolean
  onVote: (approve: boolean | null) => void
  isMobile: boolean
}) {
  const mine = myTeamId == null ? null
    : p.teamA?.id === myTeamId ? p.teamA : p.teamB?.id === myTeamId ? p.teamB : null
  const myNote = mine ? `Also counts for the ${mine.name} fans.` : undefined
  return (
    <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}`, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px 12px', flexWrap: 'wrap',
        padding: '14px 18px', borderBottom: `1px solid ${BORDER.hairline}`,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', ...font(800, 15), color: TEXT.strong }}>
          <Crest teamId={p.teamA?.id} size={22} />
          <TeamName team={p.teamA} />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEXT.dim} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 7h13l-3-3" /><path d="M17 17H4l3 3" />
          </svg>
          <Crest teamId={p.teamB?.id} size={22} />
          <TeamName team={p.teamB} />
        </span>
        {mine && <Pill text="YOUR TEAM" color={ACCENT.ownTeam} />}
        <span style={{ flex: 1 }} />
        <HoverTooltip text={`Closes ${CLOSES[p.closeKind]}. You can change your vote until then.`}>
          <span style={{ ...font(400, 13), ...TABULAR, color: TEXT.muted }}>{closesText(p)}</span>
        </HoverTooltip>
        <StandingIcon p={p} />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1fr) 330px',
      }}>
        <Side team={p.teamA} gives={p.aGave} why={p.sellerWhy} p={p} isMobile={isMobile} />
        <Side team={p.teamB} gives={p.bGave} why={p.buyerWhy} p={p} isMobile={isMobile} />

        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px', background: BG.panel }}>
          <TeamBar team={p.teamA} t={p.tally.teamA} />
          <TeamBar team={p.teamB} t={p.tally.teamB} />
          <LeagueBar yes={p.tally.yes} no={p.tally.no} />
          {signedIn ? (
            <>
              <HoverTooltip text={myNote} style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                <VoteButton label={p.myVote === true ? 'Approved' : 'Approve'} active={p.myVote === true}
                  color={ACCENT.success} disabled={busy} onClick={() => onVote(p.myVote === true ? null : true)} />
                <VoteButton label={p.myVote === false ? 'Rejected' : 'Reject'} active={p.myVote === false}
                  color={ACCENT.negative} disabled={busy} onClick={() => onVote(p.myVote === false ? null : false)} />
              </HoverTooltip>
            </>
          ) : (
            <span style={{ ...font(500, 13), color: TEXT.muted }}>Sign in to vote.</span>
          )}
        </div>
      </div>
    </div>
  )
}

const RESULT: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  approved: {
    label: 'Approved', color: ACCENT.success,
    icon: <path d="M7 12.5l3.3 3.3L17 9" />,
  },
  rejected: {
    label: 'Voted down', color: ACCENT.negative,
    icon: <path d="M8 8l8 8M16 8l-8 8" />,
  },
  failed: {
    label: 'Fell through', color: ACCENT.warning,
    icon: <path d="M12 6.5v7M12 17.5v.01" />,
  },
}

function reasonText(p: TradeProposal): string {
  if (p.status === 'failed') return `Approved, but ${p.note ?? 'it could not be completed'}`
  if (p.status === 'approved') return `${p.tally.yes} yes, ${p.tally.no} no`
  switch (p.tally.reason) {
    case 'no_votes': return 'Nobody voted on it'
    case 'league_no': return `The league voted it down, ${p.tally.yes} yes to ${p.tally.no} no`
    case 'team_veto': {
      const who = vetoed(p.tally.teamA) ? p.teamA?.name : vetoed(p.tally.teamB) ? p.teamB?.name : null
      return who ? `${who} fans voted it down` : 'One team’s own fans voted it down'
    }
    case 'team_quorum': return 'Not enough of the teams’ fans approved it'
    default: return ''
  }
}

function ResultIcon({ p }: { p: TradeProposal }) {
  const result = RESULT[p.status]
  if (!result) return null
  const reason = reasonText(p)
  return (
    <HoverTooltip color={result.color} content={
      <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontWeight: 800, color: result.color }}>{result.label}</span>
        {reason && <span>{reason}</span>}
      </span>
    }>
      <span role="img" aria-label={result.label} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '28px', height: '28px', borderRadius: '50%', background: result.color,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BG.page} strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
          {result.icon}
        </svg>
      </span>
    </HoverTooltip>
  )
}

function DecidedCard({ p, isMobile }: { p: TradeProposal; isMobile: boolean }) {
  const color = RESULT[p.status]?.color ?? BORDER.hairline
  return (
    <div style={{
      background: BG.card, border: `1px solid ${BORDER.hairline}`, borderLeft: `4px solid ${color}`,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px 12px', flexWrap: 'wrap',
        padding: '10px 18px', borderBottom: `1px solid ${BORDER.hairline}`, background: `${color}1a`,
      }}>
        <ResultIcon p={p} />
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', ...font(800, 14), color: TEXT.strong }}>
          <Crest teamId={p.teamA?.id} size={20} />
          <TeamName team={p.teamA} />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEXT.dim} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 7h13l-3-3" /><path d="M17 17H4l3 3" />
          </svg>
          <Crest teamId={p.teamB?.id} size={20} />
          <TeamName team={p.teamB} />
        </span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1fr)',
      }}>
        <Side team={p.teamA} gives={p.aGave} why={null} p={p} isMobile={isMobile} />
        <Side team={p.teamB} gives={p.bGave} why={null} p={p} isMobile={isMobile} last />
      </div>
    </div>
  )
}

/** Remembered per viewer; storage can throw (private mode), so it is a convenience only. */
function useCollapsed(key: string, initial: boolean): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const v = window.localStorage.getItem(key)
      return v == null ? initial : v === '1'
    } catch { return initial }
  })
  const toggle = () => setCollapsed(c => {
    try { window.localStorage.setItem(key, c ? '0' : '1') } catch { /* not persisted */ }
    return !c
  })
  return [collapsed, toggle]
}

/** A section header that folds its section away (owner: so each section is one scroll away). */
function SectionToggle({ title, count, collapsed, onToggle, strong }: {
  title: string; count: number; collapsed: boolean; onToggle: () => void; strong?: boolean
}) {
  return (
    <button onClick={onToggle} aria-expanded={!collapsed} style={{
      display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none',
      padding: 0, cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={TEXT.muted} strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 120ms' }}>
        <path d="M6 9l6 6 6-6" />
      </svg>
      <span style={strong
        ? { ...font(800, 15, 1, '0.02em'), color: TEXT.strong, whiteSpace: 'nowrap' }
        : { ...font(800, 12, 1, '0.06em'), color: TEXT.muted, whiteSpace: 'nowrap' }}>
        {title}
      </span>
      <span style={{ ...font(600, 13), ...TABULAR, color: TEXT.muted }}>{count}</span>
    </button>
  )
}

const TradeVotes: React.FC<{
  open: TradeProposal[]
  closed: TradeProposal[]
  myTeamId: number | null
  signedIn: boolean
  voting: number | null
  voteError: string | null
  onVote: (proposalId: number, approve: boolean | null) => void
}> = ({ open, closed, myTeamId, signedIn, voting, voteError, onVote }) => {
  const isMobile = useIsMobile()
  const howRef = useRef<HTMLDivElement>(null)
  const [openFolded, toggleOpen] = useCollapsed('tradeVotes.openCollapsed', false)
  const [decidedFolded, toggleDecided] = useCollapsed('tradeVotes.decidedCollapsed', true)
  if (open.length === 0 && closed.length === 0) return null
  const decided = closed.slice(0, 8)
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>
          <SectionToggle title="Open votes" count={open.length} collapsed={openFolded}
            onToggle={toggleOpen} strong />
        </h2>
        <span style={{ flex: 1, height: '2px', background: BORDER.hairline }} />
        <button onClick={() => howRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} style={{
          ...font(600, 13), fontFamily: FONT, color: ACCENT.info, background: 'none', border: 'none',
          padding: 0, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>How voting works</button>
      </div>
      {voteError && <div style={{ ...font(500, 13), color: ACCENT.warning }}>{voteError}</div>}

      {!openFolded && open.map(p => (
        <OpenCard key={p.id} p={p} myTeamId={myTeamId} signedIn={signedIn} isMobile={isMobile}
          busy={voting === p.id} onVote={approve => onVote(p.id, approve)} />
      ))}

      {decided.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
            <h3 style={{ margin: 0 }}>
              <SectionToggle title="DECIDED" count={decided.length} collapsed={decidedFolded}
                onToggle={toggleDecided} />
            </h3>
            <span style={{ flex: 1, height: '1px', background: BORDER.hairline }} />
          </div>
          {!decidedFolded && decided.map(p => <DecidedCard key={p.id} p={p} isMobile={isMobile} />)}
        </>
      )}

      <div ref={howRef} style={{
        background: BG.panel, border: `1px solid ${BORDER.hairline}`, padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        <h3 style={{ ...font(800, 13), color: TEXT.strong, margin: 0 }}>How voting works</h3>
        <p style={{ ...font(400, 13, 1.55), color: TEXT.secondary, margin: 0 }}>
          A trade goes through when the vote closes if more of the league approves it than
          rejects it, and each team in it gets about a third of its active fans to approve.
          If a team&rsquo;s own fans vote more no than yes, the trade fails. Active fans are
          fans who signed in within the last two weeks. A team with no active fans leaves its
          side to everyone else. A trade with no votes, or a tie, does not go through.
        </p>
      </div>
    </section>
  )
}

export default TradeVotes
