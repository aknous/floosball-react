import React from 'react'
import { Stars, calcStars } from '@/Components/Stars'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import ProbabilityMeter from './ProbabilityMeter'
import { StanceControls, UndoButton } from './VoteControls'
import type { GmPlayerInfo, GmVoteTally } from '@/types/gm'

interface ResignPlayerCardProps {
  players: GmPlayerInfo[]
  tallies: GmVoteTally[]
  teamColor: string
  voting: string | null
  onVote: (playerId: number, direction: 'yea' | 'nay') => void
  undoing: string | null
  onUndo: (playerId: number) => void
  myVoteCount: (playerId: number) => number
  myStance: (playerId: number) => 'yea' | 'nay' | null
  disabledIds: Set<number>
  globalDisabled: boolean
  balance: number
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
  myStance,
  disabledIds,
  globalDisabled,
  balance,
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
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
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
                      votesFor={tally.votesFor}
                      votesAgainst={tally.votesAgainst}
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

                <StanceControls
                  cost={cost}
                  stance={myStance(p.id)}
                  baseDisabled={isDisabled}
                  voting={isVoting}
                  teamColor="#22c55e"
                  supportLabel="Renew"
                  opposeLabel="Release"
                  onVote={(dir) => onVote(p.id, dir)}
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
