import React from 'react'

interface CoachAvatarProps {
  name: string
  size?: number
  bgColor?: string | null
  style?: React.CSSProperties
  className?: string
}

function getInitials(name: string): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function readableTextColor(hex: string | null | undefined): string {
  if (!hex) return '#e2e8f0'
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return '#e2e8f0'
  const r = parseInt(cleaned.slice(0, 2), 16)
  const g = parseInt(cleaned.slice(2, 4), 16)
  const b = parseInt(cleaned.slice(4, 6), 16)
  const luma = (0.299 * r + 0.587 * g + 0.114 * b)
  return luma > 150 ? '#0f172a' : '#e2e8f0'
}

// Coach "avatar" — neutral initials badge. Same direction as PlayerAvatar:
// the new Cores-authored worldbuilding suits abstract identity better than
// generated faces.
const CoachAvatar: React.FC<CoachAvatarProps> = ({ name, size = 80, bgColor, style, className }) => {
  const bg = bgColor || '#334155'
  const fg = readableTextColor(bg)
  const initials = getInitials(name)
  const fontSize = Math.max(11, Math.round(size * 0.36))
  return (
    <div
      className={className}
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        backgroundColor: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.02em',
        userSelect: 'none',
        ...style,
      }}
    >
      {initials}
    </div>
  )
}

export default CoachAvatar
