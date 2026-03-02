import React, { useMemo } from 'react'
import { createAvatar } from '@dicebear/core'
import { avataaars } from '@dicebear/collection'

interface PlayerAvatarProps {
  name: string
  size?: number
  style?: React.CSSProperties
  className?: string
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ name, size = 32, style, className }) => {
  const dataUri = useMemo(() => {
    return createAvatar(avataaars, {
      seed: name,
      size,
      backgroundColor: ['1e293b'],
      backgroundType: ['solid'],
    }).toDataUri()
  }, [name, size])

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
