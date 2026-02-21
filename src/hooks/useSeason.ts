import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import type { Season } from '@/types/api'

/**
 * Custom hook for fetching current season information
 */
export const useSeason = () => {
  const [season, setSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchSeason = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.season.getCurrent()
        setSeason(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch season'))
        console.error('Error fetching season:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSeason()
  }, [])

  const refetch = () => {
    setLoading(true)
    setError(null)
    api.season
      .getCurrent()
      .then(setSeason)
      .catch((err) => setError(err instanceof Error ? err : new Error('Failed to fetch season')))
      .finally(() => setLoading(false))
  }

  return { season, loading, error, refetch }
}
