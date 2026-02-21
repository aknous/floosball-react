import axios, { AxiosResponse } from 'axios'
import type {
  Team,
  Player,
  Season,
  GameStats,
  GameResult,
  StandingsEntry,
  PowerRanking,
  PlayoffTeam,
  Highlight,
  Champion,
  RosterEntry,
  PlayerFilters,
  TeamFilters,
} from '@/types/api'

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// Helper to extract data from axios response
const getData = <T>(response: AxiosResponse<T>): T => response.data

/**
 * Centralized API service layer with TypeScript
 * All backend REST API calls go through here
 */
export const api = {
  /**
   * Team endpoints
   */
  teams: {
    /**
     * Get all teams, optionally filtered
     */
    getAll: (filters?: TeamFilters): Promise<Team[]> =>
      axios.get<Team[]>(`${API_BASE_URL}/teams`, { params: filters }).then(getData),

    /**
     * Get a single team by ID
     */
    getById: (id: string): Promise<Team> =>
      axios.get<Team>(`${API_BASE_URL}/teams/${id}`).then(getData),
  },

  /**
   * Player endpoints
   */
  players: {
    /**
     * Get all players, optionally filtered
     */
    getAll: (filters?: PlayerFilters): Promise<Player[]> =>
      axios.get<Player[]>(`${API_BASE_URL}/players`, { params: filters }).then(getData),

    /**
     * Get a single player by ID
     */
    getById: (id: string): Promise<Player> =>
      axios.get<Player>(`${API_BASE_URL}/players/${id}`).then(getData),

    /**
     * Get top players by position
     */
    getTopByPosition: (position: string, limit: number = 10): Promise<Player[]> =>
      axios
        .get<Player[]>(`${API_BASE_URL}/players/top`, {
          params: { position, limit },
        })
        .then(getData),
  },

  /**
   * Season endpoints
   */
  season: {
    /**
     * Get current season info
     */
    getCurrent: (): Promise<Season> =>
      axios.get<Season>(`${API_BASE_URL}/season`).then(getData),

    /**
     * Get season by number
     */
    getBySeason: (seasonNumber: number): Promise<Season> =>
      axios.get<Season>(`${API_BASE_URL}/season/${seasonNumber}`).then(getData),
  },

  /**
   * Standings endpoints
   */
  standings: {
    /**
     * Get current standings
     */
    get: (): Promise<StandingsEntry[]> =>
      axios.get<StandingsEntry[]>(`${API_BASE_URL}/standings`).then(getData),

    /**
     * Get standings by division
     */
    getByDivision: (division: string): Promise<StandingsEntry[]> =>
      axios
        .get<StandingsEntry[]>(`${API_BASE_URL}/standings`, {
          params: { division },
        })
        .then(getData),
  },

  /**
   * Game endpoints
   */
  games: {
    /**
     * Get game statistics by ID
     */
    getStats: (gameId: string): Promise<GameStats> =>
      axios.get<GameStats>(`${API_BASE_URL}/games/${gameId}`).then(getData),

    /**
     * Get results for a specific week
     */
    getResultsByWeek: (week: number): Promise<GameResult[]> =>
      axios
        .get<GameResult[]>(`${API_BASE_URL}/games/results`, {
          params: { week },
        })
        .then(getData),

    /**
     * Get currently live games
     */
    getCurrentGames: (): Promise<GameStats[]> =>
      axios.get<GameStats[]>(`${API_BASE_URL}/games/current`).then(getData),
  },

  /**
   * Stats endpoints
   */
  stats: {
    /**
     * Get stat leaders by category
     */
    getLeaders: (category: string, limit: number = 10): Promise<Player[]> =>
      axios
        .get<Player[]>(`${API_BASE_URL}/stats/leaders`, {
          params: { category, limit },
        })
        .then(getData),
  },

  /**
   * Power rankings
   */
  powerRankings: {
    get: (): Promise<PowerRanking[]> =>
      axios.get<PowerRanking[]>(`${API_BASE_URL}/power-rankings`).then(getData),
  },

  /**
   * Playoff picture
   */
  playoffs: {
    getPicture: (): Promise<PlayoffTeam[]> =>
      axios.get<PlayoffTeam[]>(`${API_BASE_URL}/playoffs/picture`).then(getData),
  },

  /**
   * Highlights
   */
  highlights: {
    getRecent: (limit: number = 10): Promise<Highlight[]> =>
      axios
        .get<Highlight[]>(`${API_BASE_URL}/highlights`, {
          params: { limit },
        })
        .then(getData),
  },

  /**
   * Champion
   */
  champion: {
    getCurrent: (): Promise<Champion> =>
      axios.get<Champion>(`${API_BASE_URL}/champion`).then(getData),

    getBySeason: (seasonNumber: number): Promise<Champion> =>
      axios.get<Champion>(`${API_BASE_URL}/champion/${seasonNumber}`).then(getData),
  },

  /**
   * Roster history
   */
  roster: {
    getHistory: (teamId: string): Promise<RosterEntry[]> =>
      axios.get<RosterEntry[]>(`${API_BASE_URL}/teams/${teamId}/roster-history`).then(getData),
  },

  /**
   * Schedule
   */
  schedule: {
    getByTeam: (teamId: string): Promise<GameResult[]> =>
      axios.get<GameResult[]>(`${API_BASE_URL}/teams/${teamId}/schedule`).then(getData),
  },
}
