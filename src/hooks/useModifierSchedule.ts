import { useState, useEffect, useCallback, useRef } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import type { ModifierSlot } from '@/types/pickem'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface UseModifierScheduleResult {
  slots: ModifierSlot[]
  day: number | null
  active: ModifierSlot | null
  next: ModifierSlot | null
  loading: boolean
}

/** The current calendar day's fantasy-modifier slate, so users can plan cards
 *  ahead. Public/number-free endpoint; refetches on week transitions. */
export function useModifierSchedule(): UseModifierScheduleResult {
  const [slots, setSlots] = useState<ModifierSlot[]>([])
  const [day, setDay] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const { event } = useSeasonWebSocket()
  const hasLoadedOnce = useRef(false)

  const fetchSchedule = useCallback(async () => {
    try {
      if (!hasLoadedOnce.current) setLoading(true)
      const resp = await fetch(`${API_BASE}/fantasy/modifier-schedule`)
      const json = await resp.json()
      const data = json.data ?? json
      setSlots(data.slots ?? [])
      setDay(data.day ?? null)
      hasLoadedOnce.current = true
    } catch (err) {
      console.error('Error fetching modifier schedule:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSchedule() }, [fetchSchedule])

  useEffect(() => {
    if (!event) return
    if (event.event === 'week_start' || event.event === 'week_end') {
      fetchSchedule()
    }
  }, [event, fetchSchedule])

  const active = slots.find(s => s.isActive) ?? null
  const next = slots.find(s => s.isNext) ?? null

  return { slots, day, active, next, loading }
}
