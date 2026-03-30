import React, { useMemo } from 'react'
import { createAvatar } from '@dicebear/core'
import { openPeeps } from '@dicebear/collection'

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
    return createAvatar(openPeeps, {
      seed: name,
      size,
      backgroundColor: [bg],
      backgroundType: ['solid'],
      maskProbability: 0,
      facialHairProbability: 40,
      accessoriesProbability: 40,
      accessories: ['glasses', 'glasses2', 'glasses3', 'glasses4', 'glasses5', 'sunglasses', 'sunglasses2'],
      headContrastColor: ['2c1b18', '4a312c', 'a55728', 'b58143', 'c93305', 'd6b370', 'cb8442', 'deb777', 'e8e1e1', '8d4a43'],
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
