import React from 'react'
import { Stars, calcStars } from '@/Components/Stars'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import ProbabilityMeter from './ProbabilityMeter'
import { VoteButton, UndoButton } from './VoteControls'
import type { GmPlayerInfo, GmVoteTally } from '@/types/gm'

interface ResignPlayerCardProps {
  players: GmPlayerInfo[]
  tallies: GmVoteTally[]
  teamColor: string
  voting: string | null
  onVote: (playerId: number) => void
  undoing: string | null
  onUndo: (playerId: number) => void
  myVoteCount: (playerId: number) => number
  disabledIds: Set<number>
  globalDisabled: boolean
  balance: number
  votesRemaining: number
  getCost: (playerId: number) => number
  lastCost: (playerId: number) => number
}

const ResignPlayerCard: React.FC<ResignPlayerCardProps> = ({
  players,
  tallies,
  teamColor,
  voting,
  onVote,
  undoing,
  onUndo,
  myVoteCount,
  disabledIds,
  globalDisabled,
  balance,
  votesRemaining,
  getCost,
  lastCost,
}) => {

  const getTally = (playerId: number): GmVoteTally | undefined =>
    tallies.find(t => t.voteType === 'resign_player' && t.targetPlayerId === playerId)

  return (
    <div style={{ flex: 1, minWidth: '240px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '10px',
      }}>
        <span>Contract Renewals</span>
        <span style={{ fontWeight: '600', color: votesRemaining > 0 ? '#94a3b8' : '#ef4444', textTransform: 'none' }}>
          {votesRemaining} remaining
        </span>
      </div>

      {players.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
          No contracts require attention.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {players.map(p => {
            const tally = getTally(p.id)
            const isVoting = voting === `resign_player:${p.id}`
            const isUndoing = undoing === `resign_player:${p.id}`
            const cost = getCost(p.id)
            const myVotes = myVoteCount(p.id)
            const isDisabled = globalDisabled || disabledIds.has(p.id) || balance < cost

            return (
              <div key={p.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                borderRadius: '4px',
                backgroundColor: '#0f172a',
              }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#94a3b8',
                  minWidth: '24px',
                }}>
                  {p.position}
                </span>
                <PlayerHoverCard playerId={p.id} playerName={p.name}>
                  <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500', cursor: 'default' }}>
                    {p.name}
                  </span>
                </PlayerHoverCard>
                <Stars stars={calcStars(p.rating)} size={12} />
                <span style={{ flex: 1 }} />

                {tally && (
                  <div style={{ width: '90px' }}>
                    <ProbabilityMeter
                      votes={tally.votes}
                      threshold={tally.threshold}
                      probability={tally.probability}
                      compact
                      accentColor={teamColor}
                    />
                  </div>
                )}

                {myVotes > 0 && (
                  <UndoButton
                    onUndo={() => onUndo(p.id)}
                    undoing={isUndoing}
                    voteCount={myVotes}
                    refundAmount={lastCost(p.id)}
                  />
                )}

                <VoteButton
                  cost={cost}
                  disabled={isDisabled}
                  voting={isVoting}
                  onConfirm={() => onVote(p.id)}
                  teamColor="#22c55e"
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ResignPlayerCard
