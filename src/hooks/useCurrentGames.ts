import type { GameStats } from '@/types/websocket'
export type { GameStats }

export interface CurrentGame {
  id: number
  homeTeam: {
    id: string
    name: string
    city: string
    abbr: string
    color: string
    secondaryColor: string
    tertiaryColor: string
    record: string
    elo?: number
  }
  awayTeam: {
    id: string
    name: string
    city: string
    abbr: string
    color: string
    secondaryColor: string
    tertiaryColor: string
    record: string
    elo?: number
  }
  quarterScores?: {
    home: {
      q1: number
      q2: number
      q3: number
      q4: number
    }
    away: {
      q1: number
      q2: number
      q3: number
      q4: number
    }
  }
  possession?: string  // Team ID that has possession
  down?: number
  yardsToFirstDown?: number
  yardLine?: string  // e.g., "BAL 25"
  yardsToEndzone?: number
  downText?: string
  status: 'Scheduled' | 'Active' | 'Final'
  homeScore: number
  awayScore: number
  homeTeamPoss?: boolean
  awayTeamPoss?: boolean
  quarter: number
  timeRemaining: string
  homeWinProbability: number
  awayWinProbability: number
  startTime?: number
  isOvertime?: boolean
  isHalftime?: boolean
  isUpsetAlert?: boolean
  isFeatured?: boolean
  homeTimeouts?: number
  awayTimeouts?: number
  momentum?: number
  momentumTeam?: string | null
  gameStats?: GameStats
  plays?: any[]
  matchupPreview?: {
    home: Record<string, number>
    away: Record<string, number>
  }
}
