import React, { createContext, useContext, ReactNode } from 'react'
import { useSeasonUpdates } from '@/hooks/useSeasonUpdates'
import type { SeasonState } from '@/hooks/useSeasonUpdates'
import type { SeasonWebSocketEvent } from '@/types/websocket'

export interface FloosballContextValue {
  seasonState: SeasonState
  connected: boolean
  error: Event | null
  lastEvent: SeasonWebSocketEvent | null
}

const FloosballContext = createContext<FloosballContextValue | undefined>(undefined)

export interface FloosballProviderProps {
  children: ReactNode
}

export const FloosballProvider: React.FC<FloosballProviderProps> = ({ children }) => {
  const { seasonState, connected, error, lastEvent } = useSeasonUpdates()

  const value: FloosballContextValue = {
    seasonState,
    connected,
    error,
    lastEvent
  }

  return (
    <FloosballContext.Provider value={value}>
      {children}
    </FloosballContext.Provider>
  )
}

export const useFloosball = (): FloosballContextValue => {
  const context = useContext(FloosballContext)
  if (context === undefined) {
    throw new Error('useFloosball must be used within a FloosballProvider')
  }
  return context
}
