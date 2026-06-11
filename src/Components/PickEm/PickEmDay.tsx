import React, { useState } from 'react'
import { usePickEmDay } from '@/hooks/usePickEmDay'
import { useAuth } from '@/contexts/AuthContext'
import { PickRow } from './PickRow'
import type { PickEmDaySlot } from '@/types/pickem'

export const PickEmDay: React.FC = () => {
  const { user } = useAuth()
  const {
    slots, day, loading, submitting, dirtyCount,
    setPick, pickFavoritesForSlot, submitAll,
  } = usePickEmDay()
  const [flash, setFlash] = useState<string | null>(null)

  if (loading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
        Loading today&apos;s slate...
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
        No games scheduled today.
      </div>
    )
  }

  const totalGames = slots.reduce((n, s) => n + s.games.length, 0)
  const pickedGames = slots.reduce(
    (n, s) => n + s.games.filter(g => g.userPick != null).length, 0,
  )
  const dayLabel = day != null ? `Day ${day + 1} Games` : "Today's Games"

  const handleSubmit = async () => {
    try {
      const { saved, skipped } = await submitAll()
      setFlash(
        skipped > 0
          ? `Saved ${saved} pick${saved !== 1 ? 's' : ''} (${skipped} skipped — already final)`
          : `Saved ${saved} pick${saved !== 1 ? 's' : ''}`,
      )
      setTimeout(() => setFlash(null), 3500)
    } catch {
      setFlash('Could not save picks — try again')
      setTimeout(() => setFlash(null), 3500)
    }
  }

  return (
    <div>
      {/* Day header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '8px', padding: '7px 12px', marginBottom: '8px',
        borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #334155',
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>
            {dayLabel}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
            {pickedGames}/{totalGames} picked across {slots.length} slot{slots.length !== 1 ? 's' : ''}
          </div>
        </div>
        {user && (
          <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'right', maxWidth: '45%' }}>
            Set every game for the day at once, then submit.
          </div>
        )}
      </div>

      {/* Slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '64px' }}>
        {slots.map(slot => (
          <DaySlot
            key={slot.week}
            slot={slot}
            canBatch={!!user}
            onPick={(gameIndex, teamId) => setPick(slot.week, gameIndex, teamId)}
            onPickFavorites={() => pickFavoritesForSlot(slot.week)}
          />
        ))}
      </div>

      {/* Sticky submit bar */}
      {user && (
        <div style={{
          position: 'sticky', bottom: 0, left: 0, right: 0,
          marginTop: '8px', padding: '8px',
          background: 'linear-gradient(to top, #0f172a 70%, rgba(15,23,42,0))',
        }}>
          {flash && (
            <div style={{
              fontSize: '11px', color: '#86efac', textAlign: 'center', marginBottom: '6px',
            }}>
              {flash}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={dirtyCount === 0 || submitting}
            style={{
              width: '100%', padding: '10px 0', borderRadius: '8px', border: 'none',
              backgroundColor: dirtyCount === 0 || submitting ? '#1e293b' : '#3b82f6',
              color: dirtyCount === 0 || submitting ? '#64748b' : '#fff',
              fontSize: '14px', fontWeight: 700,
              cursor: dirtyCount === 0 || submitting ? 'default' : 'pointer',
              transition: 'background-color 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {submitting
              ? 'Submitting...'
              : dirtyCount === 0
                ? 'No new picks to submit'
                : `Submit ${dirtyCount} pick${dirtyCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}

interface DaySlotProps {
  slot: PickEmDaySlot
  canBatch: boolean
  onPick: (gameIndex: number, teamId: number) => void
  onPickFavorites: () => void
}

const DaySlot: React.FC<DaySlotProps> = ({ slot, canBatch, onPick, onPickFavorites }) => {
  const unpicked = slot.games.filter(g => g.pickable && g.result?.correct == null && g.userPick == null).length

  // Status tag
  let tag: { label: string; color: string } | null = null
  if (slot.isActive) tag = { label: 'LIVE', color: '#22c55e' }
  else if (slot.isNext) tag = { label: 'NEXT', color: '#38bdf8' }
  else if (slot.isPast) tag = { label: 'DONE', color: '#64748b' }

  return (
    <div>
      {/* Slot header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '5px 8px', marginBottom: '5px',
        borderRadius: '6px',
        backgroundColor: slot.isActive ? 'rgba(34,197,94,0.08)' : '#172033',
        borderLeft: `3px solid ${slot.isActive ? '#22c55e' : (slot.isNext ? '#38bdf8' : '#334155')}`,
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', flexShrink: 0 }}>
          {slot.label || `Week ${slot.week}`}
        </span>
        {tag && (
          <span style={{
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em',
            color: tag.color, backgroundColor: `${tag.color}1f`,
            padding: '1px 5px', borderRadius: '3px', flexShrink: 0,
          }}>
            {tag.label}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {canBatch && unpicked > 0 && (
          <button
            onClick={onPickFavorites}
            style={{
              fontSize: '10px', fontWeight: 600, color: '#94a3b8',
              background: 'none', border: '1px solid #334155', borderRadius: '4px',
              padding: '2px 7px', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
            }}
          >
            Pick favorites
          </button>
        )}
      </div>

      {/* Slot games */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {slot.games.map(game => (
          <PickRow
            key={game.gameIndex}
            game={game}
            onPick={(teamId) => onPick(game.gameIndex, teamId)}
          />
        ))}
      </div>
    </div>
  )
}
