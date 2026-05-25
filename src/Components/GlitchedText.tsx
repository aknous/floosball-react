import React, { useEffect, useRef, useState } from 'react'

const GLITCH_CHARS = '░▒▓█▌▐│┃▪◦◊◆▲△◢◣⌬⌭⌮'

interface Props {
  text: string
  /** 'low' = occasional single-char swap, 'high' = frequent multi-char swap. */
  intensity?: 'low' | 'high'
}

/**
 * Renders text with periodic character-substitution glitches. Picks random
 * positions, swaps them to glitch glyphs briefly, then restores. The pacing
 * differs by intensity so L1 (aberration) feels like a stray artifact and
 * L2 (corruption) feels like the line is actively breaking.
 */
export const GlitchedText: React.FC<Props> = ({ text, intensity = 'low' }) => {
  const [display, setDisplay] = useState(text)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDisplay(text)
    if (!text) return

    const high = intensity === 'high'
    const intervalMs = high ? 130 : 350
    const holdMs = high ? 80 : 45
    const maxSwaps = high ? 3 : 1

    const tick = () => {
      const chars = text.split('')
      const taken = new Set<number>()
      const n = 1 + Math.floor(Math.random() * maxSwaps)
      let safety = 0
      while (taken.size < n && safety < 20) {
        safety += 1
        const i = Math.floor(Math.random() * chars.length)
        const ch = text[i]
        if (ch && ch !== ' ' && ch !== '\n') taken.add(i)
      }
      taken.forEach(i => {
        chars[i] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
      })
      setDisplay(chars.join(''))
      timeoutRef.current = setTimeout(() => setDisplay(text), holdMs)
    }

    const id = setInterval(tick, intervalMs)
    return () => {
      clearInterval(id)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [text, intensity])

  return <>{display}</>
}
