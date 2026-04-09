import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface Notification {
  id: number
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const typeIcons: Record<string, string> = {
  leaderboard_weekly: 'trophy',
  leaderboard_season: 'star',
  season_fp_payout: 'coins',
  favorite_team: 'heart',
}

function TypeIcon({ type }: { type: string }) {
  const icon = typeIcons[type] || 'bell'
  if (icon === 'trophy') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b">
      <path d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 01-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.22 49.22 0 00-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 00-.657.744z"/>
    </svg>
  )
  if (icon === 'star') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#a78bfa">
      <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"/>
    </svg>
  )
  if (icon === 'coins') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#eab308">
      <path d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"/>
    </svg>
  )
  if (icon === 'heart') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#f43f5e">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"/>
    </svg>
  )
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#94a3b8">
      <path d="M5.85 3.5a.75.75 0 00-1.117-1 9.719 9.719 0 00-2.348 4.876.75.75 0 001.479.248A8.219 8.219 0 015.85 3.5zM19.267 2.5a.75.75 0 10-1.118 1 8.22 8.22 0 011.987 4.124.75.75 0 001.48-.248A9.72 9.72 0 0019.266 2.5z"/>
      <path fillRule="evenodd" d="M12 2.25A6.75 6.75 0 005.25 9v.75a8.217 8.217 0 01-2.119 5.52.75.75 0 00.298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 107.48 0 24.583 24.583 0 004.83-1.244.75.75 0 00.298-1.205 8.217 8.217 0 01-2.118-5.52V9A6.75 6.75 0 0012 2.25zM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 004.496 0l.002.1a2.25 2.25 0 01-4.5 0z" clipRule="evenodd"/>
    </svg>
  )
}

export const NotificationBell: React.FC = () => {
  const { user, getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Poll for unread count — pauses when tab is hidden
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (!user) return
    const fetchCount = async () => {
      try {
        const tok = await getTokenRef.current()
        if (!tok) return
        const res = await fetch(`${API_BASE}/notifications/count`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.unread || 0)
        }
      } catch { /* silent */ }
    }
    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      fetchCount()
      intervalRef.current = setInterval(fetchCount, 30000)
    }
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      } else {
        startPolling()
      }
    }
    startPolling()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user])

  // Fetch full notifications when dropdown opens
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const tok = await getTokenRef.current()
      if (!tok) return
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAllRead = async () => {
    try {
      const tok = await getTokenRef.current()
      if (!tok) return
      await fetch(`${API_BASE}/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ all: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch { /* silent */ }
  }

  if (!user) return null

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          color: open ? '#e2e8f0' : '#94a3b8',
          transition: 'color 0.15s',
        }}
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm6.75 12a2.25 2.25 0 002.248-2.1 25.04 25.04 0 01-4.496 0A2.25 2.25 0 0012 21z" clipRule="evenodd" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            minWidth: '16px', height: '16px',
            backgroundColor: '#ef4444',
            color: '#fff',
            fontSize: '9px',
            fontWeight: '700',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '320px',
          maxHeight: '400px',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          zIndex: 200,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderBottom: '1px solid #334155',
          }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '11px', color: '#3b82f6', fontWeight: '600',
                  padding: '2px 4px',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '10px 14px',
                    borderBottom: '1px solid #1e293b',
                    backgroundColor: n.isRead ? 'transparent' : 'rgba(59,130,246,0.05)',
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: '2px' }}>
                    <TypeIcon type={n.type} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: n.isRead ? '500' : '600',
                      color: n.isRead ? '#94a3b8' : '#e2e8f0',
                      marginBottom: '2px',
                    }}>
                      {n.title}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#64748b',
                      lineHeight: '1.4',
                    }}>
                      {n.message}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: '#475569',
                      marginTop: '4px',
                    }}>
                      {n.createdAt ? timeAgo(n.createdAt) : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
