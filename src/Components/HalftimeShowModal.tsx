import { useEffect, useRef, useState } from 'react'
import { useGames } from '@/contexts/GamesContext'
import { useAppSettings } from '@/hooks/useAppSettings'

// Floos Bowl halftime show. When the Floos Bowl reaches halftime, this pops a
// video window with a "Start Halftime Show" button. The user presses play (a
// deliberate gesture, so the video plays with sound). The game keeps simulating
// underneath; if the user never presses play, that's fine.

// Pull a YouTube video id out of the common URL forms (watch, youtu.be, embed,
// shorts) and return an autoplay embed URL. Returns null if we can't parse one.
function toEmbedUrl(raw: string): string | null {
  if (!raw) return null
  const url = raw.trim()
  let id = ''
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      id = u.pathname.slice(1)
    } else if (host.endsWith('youtube.com')) {
      if (u.pathname.startsWith('/watch')) id = u.searchParams.get('v') || ''
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/embed/')[1]
      else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/shorts/')[1]
    }
  } catch {
    // Not a full URL — maybe a bare id was pasted.
    if (/^[\w-]{6,}$/.test(url)) id = url
  }
  id = (id || '').split('/')[0].split('?')[0]
  if (!id) return null
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`
}

export default function HalftimeShowModal() {
  const { games } = useGames()
  const { halftime_show_url } = useAppSettings()
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  // Only auto-open once per game so re-closing it doesn't fight the live feed.
  const triggeredRef = useRef<number | null>(null)

  const embedUrl = toEmbedUrl(halftime_show_url)

  useEffect(() => {
    if (!embedUrl) return
    let atHalftime: number | null = null
    games.forEach(g => {
      if (g.isFloosBowl && g.isHalftime) atHalftime = g.id
    })
    if (atHalftime != null && triggeredRef.current !== atHalftime) {
      triggeredRef.current = atHalftime
      setPlaying(false)
      setOpen(true)
    }
  }, [games, embedUrl])

  if (!open || !embedUrl) return null

  const close = () => {
    setOpen(false)
    setPlaying(false)
  }

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(2, 6, 23, 0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(880px, 100%)',
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid #1e293b',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.02em' }}>
              Floos Bowl Halftime Show
            </span>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            style={{
              width: '28px', height: '28px', borderRadius: '6px',
              background: 'transparent', border: '1px solid #334155',
              color: '#cbd5e1', cursor: 'pointer', fontSize: '15px', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#000' }}>
          {playing ? (
            <iframe
              title="Halftime Show"
              src={embedUrl}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <button
              onClick={() => setPlaying(true)}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '14px', cursor: 'pointer',
                background: 'radial-gradient(circle at 50% 45%, #1e293b 0%, #020617 80%)',
                border: 'none', color: '#e2e8f0', fontFamily: 'inherit',
              }}
            >
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '72px', height: '72px', borderRadius: '50%',
                background: '#3b82f6', boxShadow: '0 8px 24px rgba(59,130,246,0.45)',
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span style={{ fontSize: '16px', fontWeight: 700 }}>Start Halftime Show</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
