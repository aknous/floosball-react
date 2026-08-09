import React from 'react'
import { Link } from 'react-router-dom'
import { useCoresStatus } from '@/contexts/CoresStatusContext'
import { useRuleVote } from '@/contexts/RuleVoteContext'
import { useCountdown } from '@/Components/RuleVoteModal'
import { bandVisual, CoreIcon, coreColor } from '@/utils/coresVisual'
import { BG, BORDER, TEXT, ACCENT, FONT, font } from '@/Components/Shell/tokens'

/**
 * The Cores' read on the simulation, as a band across the top of the league news.
 *
 * It sits INSIDE the news card rather than in a panel of its own. It had a column to
 * itself for a while and the column was mostly empty: the state of the world is one line
 * most weeks, and a column that says "all readings nominal" and then stops reads as a
 * gap. The news feed is where league events land, so the state of the league belongs at
 * the head of it — and when the Cores do have something to say, the anomaly climbing or
 * Aris and Pyre calling a rule vote, it lands directly above the stories it explains.
 *
 * Deliberately NUMBER-FREE. `/api/cores/status` returns a qualitative band and nothing
 * else — the raw aggregate and threshold stay in the ungated debug endpoint and the
 * ephemeral control-room feed. The band IS the information; a percentage would turn a
 * mood into a progress bar.
 */
export const CoresBand: React.FC = () => {
  const { status, lines, loading } = useCoresStatus()
  const rv = useRuleVote()
  const countdown = useCountdown(rv.closesAt)
  if (loading) return null

  const band = bandVisual(status.status)
  const label = status.label || band.label
  const description = status.description || band.fallback

  // The most recent line, whoever said it. One line, not a feed — the control room is
  // where the conversation lives, and the Cores also publish into the feed below.
  const latest = lines.length > 0 ? lines[0] : null

  // A ballot is the Cores' current business, so while one is open it takes the slot the
  // ambient line otherwise holds — showing both means saying the same thing twice, since
  // the Core who called the vote also publishes a line about it into the feed below.
  const ballotOpen = rv.open && rv.votingOpen
  const hasVoted = rv.multiSelect ? rv.myPicks.length > 0 : !!rv.myPick
  // The context types these as `string | null`; the Core helpers take `string | undefined`.
  const ballotCore = rv.core ?? undefined
  const ballotColor = coreColor(ballotCore)

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        padding: '11px 14px',
        background: band.tint,
        borderBottom: `1px solid ${BORDER.hairline}`,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0 }}>
          <span
            className={band.pulseMs ? 'cores-band-dot' : undefined}
            style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: band.color, flexShrink: 0,
              animationDuration: band.pulseMs ? `${band.pulseMs}ms` : undefined,
            }}
          />
          <span style={{ ...font(800, 11, 1, '0.1em'), color: band.color }}>
            {label.toUpperCase()}
          </span>
        </span>

        <span style={{
          ...font(400, 12, 1.5), color: TEXT.secondary,
          flex: 1, minWidth: '160px', textWrap: 'pretty' as any,
        }}>{description}</span>

        {status.inSuppression && (
          <span style={{ ...font(700, 9, 1, '0.1em'), color: TEXT.muted, flexShrink: 0 }}>
            CONTAINED
          </span>
        )}
        <Link
          to="/about"
          className="hd"
          style={{
            ...font(700, 9, 1, '0.12em'), color: TEXT.muted,
            textDecoration: 'none', flexShrink: 0,
          }}
        >CONTROL ROOM &rarr;</Link>
      </div>

      {ballotOpen ? (
        <button
          type="button"
          onClick={rv.openModal}
          className="row"
          style={{
            display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap',
            width: '100%', textAlign: 'left', cursor: 'pointer',
            padding: '11px 14px',
            border: 'none', borderBottom: `1px solid ${BORDER.hairline}`,
            borderLeft: `2px solid ${ballotColor}`,
            background: BG.panel, fontFamily: FONT,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0 }}>
            <CoreIcon core={ballotCore} color={ballotColor} size={14} />
            <span style={{ ...font(700, 10, 1, '0.1em'), color: ballotColor }}>
              {(rv.coreDisplayName || 'CORE').toUpperCase()}
            </span>
            <span style={{ ...font(700, 10, 1, '0.1em'), color: TEXT.muted }}>
              {rv.kind === 'revert' ? 'RULE REVERT VOTE' : 'RULE CHANGE VOTE'}
            </span>
          </span>

          {rv.prompt && (
            <span style={{
              ...font(400, 12, 1.4), color: TEXT.secondary,
              flex: 1, minWidth: '140px', textWrap: 'pretty' as any,
            }}>{rv.prompt}</span>
          )}

          {countdown && countdown !== '0:00' && (
            <span style={{ ...font(700, 10, 1, '0.1em'), color: TEXT.muted, flexShrink: 0 }}>
              CLOSES {countdown}
            </span>
          )}
          <span style={{
            ...font(800, 10, 1, '0.1em'),
            color: hasVoted ? TEXT.muted : ACCENT.warning, flexShrink: 0,
          }}>{hasVoted ? 'VOTE IN' : 'VOTE \u2192'}</span>
        </button>
      ) : latest && (
        <div style={{
          display: 'flex', gap: '10px', alignItems: 'flex-start',
          padding: '11px 14px', borderBottom: `1px solid ${BORDER.hairline}`,
          background: BG.panel,
        }}>
          <span style={{ paddingTop: '1px', flexShrink: 0 }}>
            <CoreIcon core={latest.core} color={coreColor(latest.core)} size={14} />
          </span>
          <span style={{ minWidth: 0, display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
            <span style={{ ...font(700, 10, 1.4, '0.1em'), color: coreColor(latest.core) }}>
              {(latest.coreDisplayName || 'CORE').toUpperCase()}
            </span>
            <span style={{ ...font(400, 12, 1.4), color: TEXT.muted, textWrap: 'pretty' as any }}>
              {latest.text}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}

export default CoresBand
