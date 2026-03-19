import React from 'react'
import { Stars, calcStars } from '@/Components/Stars'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import PlayerAvatar from '@/Components/PlayerAvatar'
import ProbabilityMeter from './ProbabilityMeter'
import type { GmPlayerInfo, GmVoteTally } from '@/types/gm'

interface CutPlayerCardProps {
  players: GmPlayerInfo[]
  tallies: GmVoteTally[]
  teamColor: string
  voting: string | null
  onVote: (playerId: number) => void
  disabledIds: Set<number>
  globalDisabled: boolean
  balance: number
  votesRemaining: number
  getCost: (playerId: number) => number
}

const CutPlayerCard: React.FC<CutPlayerCardProps> = ({
  players,
  tallies,
  teamColor,
  voting,
  onVote,
  disabledIds,
  globalDisabled,
  balance,
  votesRemaining,
  getCost,
}) => {

  const getTally = (playerId: number): GmVoteTally | undefined =>
    tallies.find(t => t.voteType === 'cut_player' && t.targetPlayerId === playerId)

  return (
    <div>
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
        <span>Release Memoranda</span>
        <span style={{ fontWeight: '600', color: votesRemaining > 0 ? '#94a3b8' : '#ef4444', textTransform: 'none' }}>
          {votesRemaining} remaining
        </span>
      </div>

      {players.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
          No personnel actions available.
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          maxHeight: '300px',
          overflowY: 'auto',
        }}>
          {players.map(p => {
            const tally = getTally(p.id)
            const isVoting = voting === `cut_player:${p.id}`
            const cost = getCost(p.id)
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
                <PlayerAvatar name={p.name} size={28} bgColor={teamColor} />
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

                <button
                  onClick={() => onVote(p.id)}
                  disabled={isDisabled || isVoting}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: isDisabled ? '#1e293b' : teamColor,
                    color: isDisabled ? '#475569' : '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isVoting ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isVoting ? '...' : `${cost} F`}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CutPlayerCard
