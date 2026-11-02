import React from 'react'
import { Link } from 'react-router-dom'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import HoverTooltip from '@/Components/HoverTooltip'
import PlayerLink from '@/Components/PlayerLink'
import { Stars, calcStars } from '@/Components/Stars'
import { TradeProposal, TeamTally, VoteAsset, VoteTeam } from '@/hooks/useTradeVotes'

/**
 * Fan approval votes on trades. Every trade the teams agree waits here until the fans
 * approve it (backend `managers/tradeVotes.py`). Everyone signed in can vote on every
 * trade; it goes through only if the league says yes, each team with active fans gets
 * enough of them to approve, and neither team's fans vote it down.
 */

const CLOSES: Record<TradeProposal['closeKind'], string> = {
  deadline: 'Closes at the first kickoff of deadline day',
  rookie_draft: 'Closes as the rookie draft begins',
  season_start: 'Closes when the new season starts',
}

function whenText(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

function Crest({ team }: { team: VoteTeam | null }) {
  if (!team) return null
  return <img src={`/avatars/${team.id}.png`} alt="" width={20} height={20}
    style={{ borderRadius: '50%', flexShrink: 0, display: 'block' }} />
}

function Asset({ a }: { a: VoteAsset }) {
  if (a.kind === 'pick') {
    const via = a.originalTeam ? ` (${a.originalTeam.name})` : ''
    return (
      <div style={{ ...font(500, 13), color: TEXT.body, padding: '2px 0' }}>
        {a.name.replace(/^S(\d+) R1 pick$/, 'Season $1 pick')}{via}
        {a.detail && <span style={{ color: TEXT.muted }}> {a.detail}</span>}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }}>
      <span style={{ ...font(700, 11, 1, '0.02em'), color: TEXT.muted, width: '24px' }}>
        {a.kind === 'prospect' ? 'PRO' : a.detail}
      </span>
      <PlayerLink playerId={a.id} playerName={a.name} style={{ ...font(600, 13), color: TEXT.body }} />
      {a.rating != null && a.rating > 0 && (
        <HoverTooltip text={`Rated ${Math.round(a.rating)}`}>
          <span style={{ display: 'inline-block' }}><Stars stars={calcStars(a.rating)} size={11} /></span>
        </HoverTooltip>
      )}
    </div>
  )
}

function Side({ team, gives, why, mine }: {
  team: VoteTeam | null; gives: VoteAsset[]; why: string | null; mine: boolean
}) {
  return (
    <div style={{ flex: 1, minWidth: '220px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <Crest team={team} />
        {team ? (
          <Link to={`/team/${team.id}`} style={{
            ...font(800, 14), color: mine ? ACCENT.ownTeam : TEXT.strong, textDecoration: 'none',
          }}>{team.name}</Link>
        ) : <span style={{ color: TEXT.dim }}>&ndash;</span>}
        <span style={{ ...font(600, 11, 1, '0.04em'), color: TEXT.muted }}>SEND</span>
      </div>
      {gives.length ? gives.map((a, i) => <Asset key={`${a.kind}${a.id}${i}`} a={a} />)
        : <div style={{ ...font(400, 13), color: TEXT.muted }}>Nothing</div>}
      {why && <div style={{ ...font(400, 12, 1.45), color: TEXT.muted, marginTop: '6px' }}>{why}</div>}
    </div>
  )
}

/** Where one team's fans stand against their bar. */
function FanLine({ team, t, open }: { team: VoteTeam | null; t: TeamTally; open: boolean }) {
  const name = team?.name ?? 'This team'
  if (t.fans === 0) {
    return (
      <div style={{ ...font(400, 12), color: TEXT.muted }}>
        {name} have no active fans, so anyone&rsquo;s approval counts for them.
      </div>
    )
  }
  const veto = t.no > t.yes
  const met = t.yes >= t.need && !veto
  const color = veto ? ACCENT.negative : met ? ACCENT.success : TEXT.secondary
  return (
    <div style={{ ...font(500, 12), ...TABULAR, color }}>
      {name} fans ({t.fans} active): {t.yes} of {t.need} approval{t.need === 1 ? '' : 's'} needed
      {t.no > 0 && `, ${t.no} against`}
      {veto ? (open ? ' (voting it down)' : ' (voted it down)') : met ? ' (enough)' : ''}
    </div>
  )
}

const RESULT: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: ACCENT.success },
  rejected: { label: 'Voted down', color: ACCENT.negative },
  failed: { label: 'Fell through', color: ACCENT.warning },
}

function reasonText(p: TradeProposal): string {
  if (p.status === 'failed') return `Approved, but ${p.note ?? 'it could not be completed'}.`
  switch (p.tally.reason) {
    case 'no_votes': return 'Nobody voted on it.'
    case 'league_no': return 'The league voted it down.'
    case 'team_veto': return 'One team’s own fans voted it down.'
    case 'team_quorum': return 'Not enough of the teams’ fans approved it.'
    default: return ''
  }
}

function VoteButton({ label, active, color, disabled, onClick }: {
  label: string; active: boolean; color: string; disabled: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={active} style={{
      ...font(800, 12, 1, '0.02em'), fontFamily: FONT,
      color: active ? BG.shell : color, background: active ? color : 'transparent',
      border: `1px solid ${color}`, padding: '6px 14px',
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
    }}>{label}</button>
  )
}

function ProposalCard({ p, myTeamId, signedIn, busy, onVote }: {
  p: TradeProposal
  myTeamId: number | null
  signedIn: boolean
  busy: boolean
  onVote?: (approve: boolean | null) => void
}) {
  const open = p.status === 'open'
  const result = RESULT[p.status]
  const involved = !!myTeamId && (p.teamA?.id === myTeamId || p.teamB?.id === myTeamId)
  return (
    <div style={{
      background: involved ? BG.cardOwn : BG.card, border: `1px solid ${BORDER.hairline}`,
      boxShadow: result ? `inset 3px 0 0 ${result.color}` : undefined,
      padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
        <Side team={p.teamA} gives={p.aGave} why={p.sellerWhy} mine={p.teamA?.id === myTeamId} />
        <Side team={p.teamB} gives={p.bGave} why={p.buyerWhy} mine={p.teamB?.id === myTeamId} />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
        borderTop: `1px solid ${BORDER.hairline}`, paddingTop: '10px',
      }}>
        <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ ...font(600, 12), ...TABULAR, color: TEXT.secondary }}>
            League: {p.tally.yes} yes, {p.tally.no} no
          </div>
          <FanLine team={p.teamA} t={p.tally.teamA} open={open} />
          <FanLine team={p.teamB} t={p.tally.teamB} open={open} />
          {open ? (
            <div style={{ ...font(400, 12), color: TEXT.muted }}>
              {CLOSES[p.closeKind]}{p.closesAt ? ` (${whenText(p.closesAt)})` : ''}.
              {' '}{p.tally.passing ? 'It would go through if the vote closed now.'
                : 'It would not go through if the vote closed now.'}
            </div>
          ) : (
            <div style={{ ...font(400, 12), color: TEXT.muted }}>{reasonText(p)}</div>
          )}
        </div>

        {open && onVote ? (
          signedIn ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <VoteButton label="Approve" active={p.myVote === true} color={ACCENT.success}
                disabled={busy} onClick={() => onVote(p.myVote === true ? null : true)} />
              <VoteButton label="Reject" active={p.myVote === false} color={ACCENT.negative}
                disabled={busy} onClick={() => onVote(p.myVote === false ? null : false)} />
            </div>
          ) : (
            <span style={{ ...font(500, 12), color: TEXT.muted }}>Sign in to vote.</span>
          )
        ) : result ? (
          <span style={{
            ...font(700, 11, 1, '0.01em'), color: result.color,
            border: `1px solid ${result.color}55`, padding: '2px 6px',
          }}>{result.label}</span>
        ) : null}
      </div>
    </div>
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
  if (open.length === 0 && closed.length === 0) return null
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <h2 style={{ ...font(800, 13, 1, '0.02em'), color: TEXT.strong, margin: 0, whiteSpace: 'nowrap' }}>
          Trade votes
        </h2>
        {open.length > 0 && <span style={{ ...font(600, 12), ...TABULAR, color: TEXT.muted }}>{open.length} open</span>}
        <span style={{ flex: 1, height: '2px', background: BORDER.hairline }} />
      </div>
      <div style={{ ...font(400, 12, 1.5), color: TEXT.muted }}>
        Every trade waits for the fans. It goes through if more of the league approves it than
        rejects it, and each team gets about a third of its active fans (signed in within the
        last two weeks) to approve without them voting it down. A team with no active fans
        leaves it to everyone else.
      </div>
      {voteError && <div style={{ ...font(500, 12), color: ACCENT.warning }}>{voteError}</div>}
      {open.map(p => (
        <ProposalCard key={p.id} p={p} myTeamId={myTeamId} signedIn={signedIn}
          busy={voting === p.id} onVote={approve => onVote(p.id, approve)} />
      ))}
      {closed.length > 0 && (
        <>
          <div style={{ ...font(700, 11, 1, '0.04em'), color: TEXT.muted, marginTop: '6px' }}>DECIDED</div>
          {closed.slice(0, 8).map(p => (
            <ProposalCard key={p.id} p={p} myTeamId={myTeamId} signedIn={signedIn} busy={false} />
          ))}
        </>
      )}
    </section>
  )
}

export default TradeVotes
