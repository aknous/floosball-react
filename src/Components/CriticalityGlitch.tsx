import React, { useEffect } from 'react'
import { useCoresStatus } from '../contexts/CoresStatusContext'
import { useGlitchIntensity } from '../hooks/useGlitchIntensity'

// Site-wide Criticality glitch mode. When a Criticality is live (status.criticalityActive) the whole
// app takes on an unstable cast: a violet wash + a breathing edge glow (the overlay), a
// `criticality-active` class on <html>, and per-burst glitches — brief character corruption on random
// visible text PLUS a few DISCRETE elements shifting a few px and glowing, then restoring (individual
// objects glitch, not the whole window). Tuned to be apparent but not annoying — iterate via the
// constants below.
//
// Preview without a real event: append ?criticality=1 to the URL.
//
// ⚠️ THE GLITCH-INTENSITY SETTING HAD NO REACH IN HERE, AND CSS COULD NEVER HAVE GIVEN IT
// ONE. The `data-glitch="off"` block in index.css lists `.criticality-overlay`, which kills
// the overlay's breathing glow — and that is ALL it could ever kill. The two things that
// actually make a Criticality glitchy are driven from JavaScript in this file:
//
//   - character corruption REWRITES `node.textContent`. No stylesheet can undo a DOM
//     mutation, so a reader on "off" still had words turning into ███ every second.
//   - the element shift/glow is written to INLINE `style.transform` / `style.filter` on
//     whichever elements the walker happened to pick, which match none of the selectors in
//     that block.
//
// It also ran regardless of the setting: a `setInterval` walking every text node in
// `document.body` and calling `getBoundingClientRect()` on each one, once a second. That is
// the single heaviest thing the app does, and the setting exists because a reader reported
// the animations bogging their laptop down.
//
// So the tiers are enforced HERE, and they follow the wording the options already promise
// (see GLITCH_OPTIONS in useGlitchIntensity):
//
//   full     — everything below.
//   reduced  — "A slow pulse. No jitter or strobing": the overlay's 3.4s breathe IS that
//              pulse; corruption and shifting are exactly the jitter it rules out.
//   off      — "No animation. Anomalies stay marked in color": the overlay still renders,
//              CSS holds it static, and its violet wash is what says a Criticality is live.
//
// Neither lower tier starts the interval at all, so they cost nothing.
const GLYPHS = '█▓▒░╳╱╲▇▆※╬#@&%§¥'
const FLIP_INTERVAL_MS = 1000   // gap between glitch bursts
const FLIP_HOLD_MS = 220        // how long a corrupted char / shifted element holds before restoring
const FLIP_NODES = 4            // text nodes char-corrupted per burst
const FLIP_CHARS_MAX = 2        // up to this many characters flipped per node
const SHIFT_ELEMENTS = 4        // discrete elements that briefly shift + glow per burst
const SHIFT_PX = 4              // max element shift distance (px) — small so layout/clicks barely move

const CriticalityGlitch: React.FC = () => {
  const { status } = useCoresStatus()
  const { intensity } = useGlitchIntensity()
  const override = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('criticality') === '1'
  const active = !!status.criticalityActive || override
  // Corruption and element shifting are the jitter both lower tiers rule out.
  const bursting = active && intensity === 'full'

  // Theme-cast hook on <html> (CSS can target html.criticality-active for per-element restyling).
  useEffect(() => {
    const root = document.documentElement
    if (active) root.classList.add('criticality-active')
    else root.classList.remove('criticality-active')
    return () => root.classList.remove('criticality-active')
  }, [active])

  // Character corruption on random visible text nodes.
  useEffect(() => {
    if (!bursting) return
    const timeouts: ReturnType<typeof setTimeout>[] = []
    // ⚠️ A RESTORE HAS TO SURVIVE TEARDOWN. Each burst schedules a timeout to put the text
    // or the element back, and the cleanup used to `clearTimeout` them all — which CANCELS
    // the restore rather than completing it, freezing corrupted glyphs and displaced
    // elements on the page permanently. It was survivable while only unmount could trigger
    // it; now that changing the setting tears this down mid-Criticality it is the first
    // thing a reader turning the effects OFF would hit. Restores are held here and run by
    // hand on the way out. Each is idempotent via the Set, so a fired one never repeats.
    const restores = new Set<() => void>()
    const schedule = (restore: () => void) => {
      restores.add(restore)
      timeouts.push(setTimeout(() => {
        if (restores.delete(restore)) restore()
      }, FLIP_HOLD_MS))
    }
    const collectNodes = (): Text[] => {
      const out: Text[] = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          const txt = n.textContent
          if (!txt || txt.trim().length < 2) return NodeFilter.FILTER_REJECT
          const p = (n as Text).parentElement
          if (!p) return NodeFilter.FILTER_REJECT
          const tag = p.tagName
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || p.isContentEditable) {
            return NodeFilter.FILTER_REJECT
          }
          if (p.closest('.criticality-overlay, input, textarea')) return NodeFilter.FILTER_REJECT
          const r = p.getBoundingClientRect()
          if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > window.innerHeight) {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        },
      })
      let cur: Node | null
      while ((cur = walker.nextNode())) out.push(cur as Text)
      return out
    }
    const burst = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      const nodes = collectNodes()
      if (!nodes.length) return
      for (let i = 0; i < Math.min(FLIP_NODES, nodes.length); i++) {
        const node = nodes[Math.floor(Math.random() * nodes.length)]
        const orig = node.textContent
        if (!orig || orig.length < 2) continue
        const chars = orig.split('')
        const nFlips = 1 + Math.floor(Math.random() * FLIP_CHARS_MAX)
        for (let j = 0; j < nFlips; j++) {
          const idx = Math.floor(Math.random() * chars.length)
          if (chars[idx] === ' ' || chars[idx] === '\n') continue
          chars[idx] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        }
        const glitched = chars.join('')
        if (glitched === orig) continue
        node.textContent = glitched
        schedule(() => {
          // Restore only if nothing else (a React re-render) changed it meanwhile —
          // avoids clobbering a live update with a stale value.
          if (node.textContent === glitched) node.textContent = orig
        })
      }
      // Discrete element shifts — a few visible UI chunks jump a few px and glow, then restore, so
      // INDIVIDUAL objects glitch out of place (not the whole window moving together). Skip oversized
      // containers so it's small discrete pieces, not big blocks.
      const parents = Array.from(new Set(
        nodes.map(n => n.parentElement).filter((p): p is HTMLElement => !!p)
      ))
      for (let i = 0; i < Math.min(SHIFT_ELEMENTS, parents.length); i++) {
        const el = parents[Math.floor(Math.random() * parents.length)]
        if (el.dataset.critShift) continue
        const box = el.getBoundingClientRect()
        if (box.width > window.innerWidth * 0.6 || box.height > window.innerHeight * 0.5) continue
        const dx = (Math.random() * 2 - 1) * SHIFT_PX
        const dy = (Math.random() * 2 - 1) * SHIFT_PX * 0.6
        const prevTransform = el.style.transform
        const prevFilter = el.style.filter
        el.dataset.critShift = '1'
        el.style.transform = `${prevTransform} translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`.trim()
        el.style.filter = `${prevFilter ? prevFilter + ' ' : ''}drop-shadow(0 0 7px rgba(202,104,232,0.85))`.trim()
        schedule(() => {
          el.style.transform = prevTransform
          el.style.filter = prevFilter
          delete el.dataset.critShift
        })
      }
    }
    const id = setInterval(burst, FLIP_INTERVAL_MS)
    return () => {
      clearInterval(id)
      timeouts.forEach(clearTimeout)
      restores.forEach(restore => restore())
      restores.clear()
    }
    // ⚠️ `bursting`, not `active` — changing the setting mid-Criticality has to tear the
    // interval down, and the cleanup above is what puts the page back.
  }, [bursting])

  if (!active) return null
  return <div className="criticality-overlay" aria-hidden="true" />
}

export default CriticalityGlitch
