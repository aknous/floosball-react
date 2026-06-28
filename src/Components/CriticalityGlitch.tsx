import React, { useEffect } from 'react'
import { useCoresStatus } from '../contexts/CoresStatusContext'

// Site-wide Criticality glitch mode. When a Criticality is live (status.criticalityActive) the whole
// app takes on an unstable cast: a violet wash + a breathing edge glow (the overlay), a
// `criticality-active` class on <html>, and per-burst glitches — brief character corruption on random
// visible text PLUS a few DISCRETE elements shifting a few px and glowing, then restoring (individual
// objects glitch, not the whole window). Tuned to be apparent but not annoying — iterate via the
// constants below.
//
// Preview without a real event: append ?criticality=1 to the URL.
const GLYPHS = '█▓▒░╳╱╲▇▆※╬#@&%§¥'
const FLIP_INTERVAL_MS = 1000   // gap between glitch bursts
const FLIP_HOLD_MS = 220        // how long a corrupted char / shifted element holds before restoring
const FLIP_NODES = 4            // text nodes char-corrupted per burst
const FLIP_CHARS_MAX = 2        // up to this many characters flipped per node
const SHIFT_ELEMENTS = 4        // discrete elements that briefly shift + glow per burst
const SHIFT_PX = 4              // max element shift distance (px) — small so layout/clicks barely move

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
        timeouts.push(setTimeout(() => {
          // Restore only if nothing else (a React re-render) changed it meanwhile —
          // avoids clobbering a live update with a stale value.
          if (node.textContent === glitched) node.textContent = orig
        }, FLIP_HOLD_MS))
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
        timeouts.push(setTimeout(() => {
          el.style.transform = prevTransform
          el.style.filter = prevFilter
          delete el.dataset.critShift
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
