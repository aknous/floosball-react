import React, { useMemo } from 'react'
import { createAvatar } from '@dicebear/core'
import { micah } from '@dicebear/collection'

interface PlayerAvatarProps {
  name: string
  size?: number
  bgColor?: string | null
  style?: React.CSSProperties
  className?: string
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ name, size = 32, bgColor, style, className }) => {
  const bg = bgColor ? bgColor.replace('#', '') : '1e293b'
  const dataUri = useMemo(() => {
    return createAvatar(micah, {
      seed: name,
      size,
      backgroundColor: [bg],
      backgroundType: ['solid'],
    }).toDataUri()
  }, [name, size, bg])

  return (
    <img
      src={dataUri}
      alt={name}
      width={size}
      height={size}
      style={{ borderRadius: '50%', flexShrink: 0, ...style }}
      className={className}
    />
  )
}

export default PlayerAvatar
