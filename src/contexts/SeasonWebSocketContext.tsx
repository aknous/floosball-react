import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAuth } from '@/contexts/AuthContext'
import type { GameWebSocketEvent, SeasonWebSocketEvent } from '@/types/websocket'

type AnyEvent = GameWebSocketEvent | SeasonWebSocketEvent

interface SeasonWebSocketContextType {
  event: AnyEvent | null
  connected: boolean
  error: Event | null
  drainEvents: () => AnyEvent[]
  subscribe: (handler: (message: AnyEvent) => void) => () => void
}

const SeasonWebSocketContext = createContext<SeasonWebSocketContextType | undefined>(undefined)

export const SeasonWebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: event, connected, error, drainEvents, subscribe, send } = useWebSocket<AnyEvent>('/season')
  const { user } = useAuth()
  const identifiedRef = useRef(false)

  useEffect(() => {
    if (connected && user?.id && !identifiedRef.current) {
      send({ type: 'identify', userId: user.id })
      identifiedRef.current = true
    }
    if (!connected) {
      identifiedRef.current = false
    }
  }, [connected, user?.id, send])

  return (
    <SeasonWebSocketContext.Provider value={{ event, connected, error, drainEvents, subscribe }}>
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
