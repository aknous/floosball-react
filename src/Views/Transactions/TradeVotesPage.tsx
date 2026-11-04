import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { BG, BORDER, TEXT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTradeVotes } from '@/hooks/useTradeVotes'
import TradeVotes from './TradeVotes'

/**
 * TRADE VOTES — every trade the teams agree, waiting on the fans (owner, 2026-11-04: the
 * open trades board is its own tab, with a count of the open proposals in the nav).
 *
 * It used to sit at the top of the Transactions page, where a vote was easy to miss and
 * pushed the draft board below the fold. The nav entry shows only while trading and its
 * votes are on (`enabled` from GET /api/trade-votes), and carries a dot and a count of the
 * open votes this reader has not cast yet.
 */
const TradeVotesPage: React.FC = () => {
  const { user } = useAuth()
  const { seasonState } = useFloosball()
  const isMobile = useIsMobile()
  const myTeamId = (user as any)?.favoriteTeamId ?? null
  const tradeVotes = useTradeVotes()

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', flexWrap: 'wrap',
        padding: isMobile ? '12px' : '15px 28px', background: BG.shell,
        borderBottom: `1px solid ${BORDER.hairline}`, fontFamily: FONT,
      }}>
        <h1 style={{ ...font(800, isMobile ? 18 : 22, 1, '-0.03em'), color: TEXT.primary, margin: 0 }}>
          Trade Votes
        </h1>
        {!isMobile && <span style={{ width: '1px', height: '24px', background: BORDER.hairline }} />}
        {seasonState?.seasonNumber != null && (
          <span style={{ ...font(500, 12), ...TABULAR, color: TEXT.muted }}>
            Season {seasonState.seasonNumber}
          </span>
        )}
      </div>

      <div style={{ padding: isMobile ? '14px 10px 30px' : '18px 28px 40px', fontFamily: FONT }}>
        {tradeVotes.enabled && (tradeVotes.open.length > 0 || tradeVotes.closed.length > 0) ? (
          <TradeVotes open={tradeVotes.open} closed={tradeVotes.closed} myTeamId={myTeamId}
            signedIn={!!user} voting={tradeVotes.voting} voteError={tradeVotes.voteError}
            onVote={tradeVotes.vote} />
        ) : (
          <div style={{
            background: BG.panel, border: `1px solid ${BORDER.hairline}`,
            padding: '40px', textAlign: 'center', ...font(400, 13), color: TEXT.muted,
          }}>
            {tradeVotes.enabled ? 'No trades are waiting on a vote.' : 'Trading is off.'}
          </div>
        )}
      </div>
    </>
  )
}

export default TradeVotesPage
