import React, { createContext, useContext, ReactNode } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { GameWebSocketEvent, SeasonWebSocketEvent } from '@/types/websocket'

interface SeasonWebSocketContextType {
  event: GameWebSocketEvent | SeasonWebSocketEvent | null
  connected: boolean
  error: Event | null
}

const SeasonWebSocketContext = createContext<SeasonWebSocketContextType | undefined>(undefined)

export const SeasonWebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: event, connected, error } = useWebSocket<GameWebSocketEvent | SeasonWebSocketEvent>('/season')

  return (
    <SeasonWebSocketContext.Provider value={{ event, connected, error }}>
      {children}
    </SeasonWebSocketContext.Provider>
  )
}

export const useSeasonWebSocket = () => {
  const context = useContext(SeasonWebSocketContext)
  if (context === undefined) {
    throw new Error('useSeasonWebSocket must be used within SeasonWebSocketProvider')
  }
  return context
}
