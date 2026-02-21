import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import type { Team, TeamFilters } from '@/types/api'

/**
 * Custom hook for fetching teams
 * @param filters - Optional filters for teams (league, conference, division)
 */
export const useTeams = (filters?: TeamFilters) => {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.teams.getAll(filters)
        setTeams(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch teams'))
        console.error('Error fetching teams:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [filters?.league, filters?.conference, filters?.division])

  const refetch = () => {
    setLoading(true)
    setError(null)
    api.teams
      .getAll(filters)
      .then(setTeams)
      .catch((err) => setError(err instanceof Error ? err : new Error('Failed to fetch teams')))
      .finally(() => setLoading(false))
  }

  return { teams, loading, error, refetch }
}

/**
 * Custom hook for fetching a single team
 * @param teamId - The ID of the team to fetch
 */
export const useTeam = (teamId: string | null) => {
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!teamId) {
      setLoading(false)
      return
    }

    const fetchTeam = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.teams.getById(teamId)
        setTeam(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch team'))
        console.error('Error fetching team:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTeam()
  }, [teamId])

  return { team, loading, error }
}
