import React, { createContext, useContext, useCallback, useEffect, useRef, ReactNode } from 'react'
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
  /** Tell the server which game this client has open, for viewer counts.
   *  Pass null when closing. Safe to call before the socket connects. */
  watchGame: (gameId: string | number | null) => void
}

const SeasonWebSocketContext = createContext<SeasonWebSocketContextType | undefined>(undefined)

export const SeasonWebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: event, connected, error, drainEvents, subscribe, send } = useWebSocket<AnyEvent>('/season')
  const { user } = useAuth()
  const identifiedRef = useRef(false)
  // The game this client has open. Kept in a ref so it can be re-sent after a
  // reconnect — the server forgets viewers when the socket drops.
  const watchingRef = useRef<string | null>(null)

  useEffect(() => {
    if (connected && user?.id && !identifiedRef.current) {
      send({ type: 'identify', userId: user.id })
      identifiedRef.current = true
    }
    if (!connected) {
      identifiedRef.current = false
    }
  }, [connected, user?.id, send])

  // Re-announce the open game after a reconnect, otherwise this viewer silently
  // stops being counted for the rest of the session.
  useEffect(() => {
    if (connected && watchingRef.current) {
      send({ type: 'watch', gameId: watchingRef.current })
    }
  }, [connected, send])

  const watchGame = useCallback((gameId: string | number | null) => {
    const id = gameId == null ? null : String(gameId)
    if (watchingRef.current === id) return
    watchingRef.current = id
    send(id ? { type: 'watch', gameId: id } : { type: 'unwatch' })
  }, [send])

  return (
    <SeasonWebSocketContext.Provider value={{ event, connected, error, drainEvents, subscribe, watchGame }}>
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
