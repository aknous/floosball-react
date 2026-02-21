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
}

export const useWebSocket = <T = any>(
  channel: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn<T> => {
  const {
    reconnect = true,
    reconnectInterval = 3000,
    reconnectAttempts = 5
  } = options

  const [data, setData] = useState<T | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Event | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const connect = useCallback(() => {
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
          const message = JSON.parse(event.data) as T
          setData(message)
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onclose = () => {
        console.log(`WebSocket disconnected: ${channel}`)
        setConnected(false)
        
        // Attempt reconnection
        if (reconnect && reconnectCountRef.current < reconnectAttempts) {
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
  }, [channel, reconnect, reconnectInterval, reconnectAttempts])

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [])

  const manualReconnect = useCallback(() => {
    reconnectCountRef.current = 0
    if (wsRef.current) {
      wsRef.current.close()
    }
    connect()
  }, [connect])

  useEffect(() => {
    connect()
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  return { data, connected, error, send, reconnect: manualReconnect }
}
