import { useCallback, useEffect, useState } from 'react'

/**
 * How much the anomaly glitch effects are allowed to move.
 *
 * A reader reported the animations bogging down their laptop and being an
 * accessibility problem for them, so this is both a performance and an access control.
 *
 * ⚠️ PER DEVICE, NOT PER ACCOUNT — localStorage rather than user preferences. The reason
 * to turn these down is the machine in front of you and the eyes reading it; the same
 * account on a phone may well want them on. It also means the setting applies before
 * anything is fetched, which matters for the reader who cannot look at the page while it
 * loads.
 *
 * ⚠️ SEEDED FROM `prefers-reduced-motion`, so a reader who has already told their
 * operating system they do not want animation does not have to find this control to be
 * heard. They can still raise it if they want the full thing here.
 */
export type GlitchIntensity = 'full' | 'reduced' | 'off'

const STORAGE_KEY = 'floosball:glitchIntensity'

export const GLITCH_OPTIONS: { key: GlitchIntensity; label: string; note: string }[] = [
  { key: 'full', label: 'Full', note: 'Anomalies glitch, shift and strobe' },
  { key: 'reduced', label: 'Reduced', note: 'A slow pulse. No jitter or strobing' },
  { key: 'off', label: 'Off', note: 'No animation. Anomalies stay marked in colour' },
]

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined'
  && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const read = (): GlitchIntensity => {
  if (typeof window === 'undefined') return 'full'
  const stored = window.localStorage?.getItem(STORAGE_KEY)
  if (stored === 'full' || stored === 'reduced' || stored === 'off') return stored
  return prefersReducedMotion() ? 'reduced' : 'full'
}

/** Stamp the document so the CSS can gate on it. Exported for the boot path below. */
export const applyGlitchIntensity = (value: GlitchIntensity): void => {
  if (typeof document === 'undefined') return
  // 'full' carries no attribute: the default is the stylesheet as written, and an
  // attribute for it would be a second way to say the same thing.
  if (value === 'full') document.documentElement.removeAttribute('data-glitch')
  else document.documentElement.setAttribute('data-glitch', value)
}

/**
 * Applied at import time, before React renders.
 *
 * ⚠️ Not in an effect: a reader who set this to off should never see the first frame of
 * the animations they turned off, and an effect runs after the first paint.
 */
applyGlitchIntensity(read())

export function useGlitchIntensity(): {
  intensity: GlitchIntensity
  setIntensity: (next: GlitchIntensity) => void
} {
  const [intensity, setState] = useState<GlitchIntensity>(read)

  const setIntensity = useCallback((next: GlitchIntensity) => {
    setState(next)
    applyGlitchIntensity(next)
    try {
      window.localStorage?.setItem(STORAGE_KEY, next)
    } catch {
      // Private browsing or a full quota: the setting still holds for this session.
    }
    // Other tabs of the same app should follow — the reader turned these off because of
    // the machine, and that is true in every window on it.
    window.dispatchEvent(new CustomEvent('floosball:glitch-intensity', { detail: next }))
  }, [])

  useEffect(() => {
    const onChange = (e: Event) => {
      const next = (e as CustomEvent).detail as GlitchIntensity
      setState(next)
      applyGlitchIntensity(next)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) { setState(read()); applyGlitchIntensity(read()) }
    }
    window.addEventListener('floosball:glitch-intensity', onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('floosball:glitch-intensity', onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return { intensity, setIntensity }
}
