import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import type { StandingsEntry } from '@/types/api'

/**
 * Custom hook for fetching standings
 * @param division - Optional division filter
 */
export const useStandings = (division?: string) => {
  const [standings, setStandings] = useState<StandingsEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = division
          ? await api.standings.getByDivision(division)
          : await api.standings.get()
        setStandings(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch standings'))
        console.error('Error fetching standings:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStandings()
  }, [division])

  const refetch = () => {
    setLoading(true)
    setError(null)
    const fetchPromise = division
      ? api.standings.getByDivision(division)
      : api.standings.get()
    
    fetchPromise
      .then(setStandings)
      .catch((err) => setError(err instanceof Error ? err : new Error('Failed to fetch standings')))
      .finally(() => setLoading(false))
  }

  return { standings, loading, error, refetch }
}
