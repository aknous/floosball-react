import React, { useEffect } from 'react'
import { useCoresStatus } from '../contexts/CoresStatusContext'

// Site-wide Criticality glitch mode. When a Criticality is live (status.criticalityActive) the whole
// app takes on an unstable cast: a faint wash + scanlines + an occasional jitter (the overlay), a
// `criticality-active` class on <html> (a hook for per-element restyling), and brief character
// corruption on random visible text. Tuned to be APPARENT but not annoying — a few characters flicker
// every couple of seconds then restore. All the feel lives in the constants below; iterate freely.
//
// Preview without a real event: append ?criticality=1 to the URL.
const GLYPHS = '▓▒░█▌▐╳※╬#%&@'
const FLIP_INTERVAL_MS = 2200   // gap between flip bursts
const FLIP_HOLD_MS = 130        // how long a corrupted character holds before it restores
const FLIP_NODES = 3            // text nodes corrupted per burst

const CriticalityGlitch: React.FC = () => {
  const { status } = useCoresStatus()
  const override = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('criticality') === '1'
  const active = !!status.criticalityActive || override

  // Theme-cast hook on <html> (CSS can target html.criticality-active for per-element restyling).
  useEffect(() => {
    const root = document.documentElement
    if (active) root.classList.add('criticality-active')
    else root.classList.remove('criticality-active')
    return () => root.classList.remove('criticality-active')
  }, [active])

  // Character corruption on random visible text nodes.
  useEffect(() => {
    if (!active) return
    const timeouts: ReturnType<typeof setTimeout>[] = []
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
        if (!orig) continue
        const idx = Math.floor(Math.random() * orig.length)
        if (orig[idx] === ' ' || orig[idx] === '\n') continue
        const g = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        const glitched = orig.slice(0, idx) + g + orig.slice(idx + 1)
        node.textContent = glitched
        timeouts.push(setTimeout(() => {
          // Restore only if nothing else (a React re-render) changed it meanwhile —
          // avoids clobbering a live update with a stale value.
          if (node.textContent === glitched) node.textContent = orig
        }, FLIP_HOLD_MS))
      }
    }
    const id = setInterval(burst, FLIP_INTERVAL_MS)
    return () => { clearInterval(id); timeouts.forEach(clearTimeout) }
  }, [active])

  if (!active) return null
  return <div className="criticality-overlay" aria-hidden="true" />
}

export default CriticalityGlitch
