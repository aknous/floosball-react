import { useState, useEffect, useRef, useCallback } from 'react'

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws'

export interface UseWebSocketOptions {
  reconnect?: boolean
  reconnectInterval?: number
  reconnectAttempts?: number
}

export interface UseWebSocketReturn<T> {
  data: T | null
  connected: boolean
  error: Event | null
  send: (data: any) => void
  reconnect: () => void
  drainEvents: () => T[]
  subscribe: (handler: (message: T) => void) => () => void
}

export const useWebSocket = <T = any>(
  channel: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn<T> => {
  const {
    reconnect: shouldReconnect = true,
    reconnectInterval = 3000,
    reconnectAttempts = 5
  } = options

  const [data, setData] = useState<T | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Event | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const queueRef = useRef<T[]>([])
  const mountedRef = useRef(false)
  // Per-message listeners — fire on every message regardless of React batching.
  // Use this for events where each message matters (e.g. achievement_unlocked).
  const listenersRef = useRef<Set<(message: T) => void>>(new Set())

  useEffect(() => {
    // Prevent double-connect on rapid re-renders
    if (mountedRef.current) return
    mountedRef.current = true

    function connect() {
      // Close any existing connection to prevent orphaned sockets
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }

      try {
        const ws = new WebSocket(`${WS_URL}${channel}`)

        ws.onopen = () => {
          console.log(`WebSocket connected: ${channel}`)
          setConnected(true)
          setError(null)
          reconnectCountRef.current = 0
        }

        ws.onmessage = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data)
            if (message.type === 'ping') return
            queueRef.current.push(message as T)
            setData(message as T)
            // Fire per-message listeners — unaffected by React state batching.
            listenersRef.current.forEach(cb => {
              try { cb(message as T) } catch (e) { console.error('WS listener error:', e) }
            })
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err)
          }
        }

        ws.onclose = () => {
          console.log(`WebSocket disconnected: ${channel}`)
          setConnected(false)

          if (shouldReconnect && reconnectCountRef.current < reconnectAttempts) {
            reconnectCountRef.current++
            console.log(`Reconnecting (${reconnectCountRef.current}/${reconnectAttempts})...`)
            reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval)
          }
        }

        ws.onerror = (event) => {
          console.error('WebSocket error:', event)
          setError(event)
          setConnected(false)
        }

        wsRef.current = ws
      } catch (err) {
        console.error('Failed to create WebSocket:', err)
      }
    }

    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel])

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [])

  const manualReconnect = useCallback(() => {
    // Tear down and reconnect by resetting the mounted guard and re-triggering
    reconnectCountRef.current = 0
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
    mountedRef.current = false
    // Force a fresh connect — inline since we can't re-trigger the effect
    const ws = new WebSocket(`${WS_URL}${channel}`)
    ws.onopen = () => {
      setConnected(true)
      setError(null)
      reconnectCountRef.current = 0
    }
    ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'ping') return
        queueRef.current.push(message as T)
        setData(message as T)
        listenersRef.current.forEach(cb => {
          try { cb(message as T) } catch (e) { console.error('WS listener error:', e) }
        })
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }
    ws.onclose = () => {
      setConnected(false)
    }
    ws.onerror = (event) => {
      setError(event)
      setConnected(false)
    }
    wsRef.current = ws
    mountedRef.current = true
  }, [channel])

  const subscribe = useCallback((handler: (message: T) => void): (() => void) => {
    listenersRef.current.add(handler)
    return () => { listenersRef.current.delete(handler) }
  }, [])

  const drainEvents = useCallback((): T[] => {
    return queueRef.current.splice(0)
  }, [])

  return { data, connected, error, send, reconnect: manualReconnect, drainEvents, subscribe }
}
