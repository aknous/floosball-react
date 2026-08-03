import React, { useEffect, useRef, useState } from 'react'

/**
 * SECTION RAIL — light navigation down the right edge, plus the page-turn feel.
 *
 * The page is four distinct reads stacked vertically (who they are, who's on
 * the field, the record, the front office) and nothing marked where one ended
 * and the
 * next began. The rail does two jobs: it says how many reads there are and
 * which one you're in, and it gives you a way to jump.
 *
 * Deliberately quiet — a stack of short dashes, labels only on hover or when
 * active. It sits opposite the app's own left sidebar so the two don't stack up
 * on the same edge.
 *
 * ── On the snapping ────────────────────────────────────────────────────────
 * The scroll container here is the DOCUMENT (App.js scrolls the page body, with
 * a fixed header on top), so `scroll-snap-type` has to go on <html>. That's
 * global, so the class is added on mount and removed on unmount — no other page
 * inherits it.
 *
 * It's `proximity`, never `mandatory`. Mandatory snapping on a page whose
 * sections are each taller than the viewport is a trap: you can't rest in the
 * middle of the roster, and every flick fights you. Proximity only engages when
 * you already came to rest near a boundary, which is exactly the "turned the
 * page" beat and nothing more.
 *
 * Sections also need `scroll-margin-top` equal to the fixed header, or a
 * snapped section lands underneath the navbar. The header height is dynamic
 * (App.js measures it with a ResizeObserver), so it's tracked here and written
 * to a CSS variable rather than hard-coded.
 */

export interface RailSection {
  id: string
  label: string
}

/** Measure the app's fixed header so snapped sections clear it. */
function useHeaderHeight(): number {
  const [h, setH] = useState(64)
  useEffect(() => {
    const el = document.querySelector('.fixed.w-full.top-0.z-50') as HTMLElement | null
    if (!el) return
    const measure = () => setH(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return h
}

const SectionRail: React.FC<{
  sections: RailSection[]
  accent: string
  /** Hidden on narrow windows — there's no room, and it would overlap content. */
  enabled: boolean
}> = ({ sections, accent, enabled }) => {
  const [active, setActive] = useState(sections[0]?.id ?? '')
  const [hovered, setHovered] = useState<string | null>(null)
  const headerHeight = useHeaderHeight()
  const railRef = useRef<HTMLDivElement | null>(null)

  // Publish the scroll offsets + arm the snap, and take all of it back down on
  // unmount so no other route inherits them.
  //
  // Two different offsets, because the first section is a special case. The
  // routed page does NOT start at the document top: App.js renders the GameBar
  // above it. So snapping section one to `start` like the others parks the
  // GameBar underneath the fixed header and hides it. Its snap target has to be
  // scroll position 0 instead, which means a scroll-margin equal to its own
  // document offset — measured, not assumed, since the GameBar's height varies
  // with how many games are on.
  useEffect(() => {
    const root = document.documentElement
    if (enabled) root.classList.add('tp-snap')

    const publish = () => {
      root.style.setProperty('--tp-head', `${headerHeight + 8}px`)
      const first = document.getElementById(sections[0]?.id ?? '')
      if (first) {
        const offset = first.getBoundingClientRect().top + window.scrollY
        root.style.setProperty('--tp-top', `${Math.max(0, Math.round(offset))}px`)
      }
    }
    // A frame late, so the GameBar has laid out before it's measured.
    const raf = requestAnimationFrame(publish)
    window.addEventListener('resize', publish)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', publish)
      root.classList.remove('tp-snap')
      root.style.removeProperty('--tp-head')
      root.style.removeProperty('--tp-top')
    }
  }, [headerHeight, enabled, sections])

  // Which section owns the viewport. The top margin discounts the band hidden
  // behind the fixed header, so "active" matches what you can actually see.
  useEffect(() => {
    const els = sections
      .map(s => document.getElementById(s.id))
      .filter((e): e is HTMLElement => !!e)
    if (!els.length) return

    const io = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActive(visible[0].target.id)
      },
      {
        rootMargin: `-${headerHeight + 12}px 0px -55% 0px`,
        threshold: [0, 0.25, 0.5],
      },
    )
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [sections, headerHeight])

  if (!enabled) return null

  const go = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Same exception as the snap: the first section means "the top of the
    // page", GameBar and all, not "this element under the header".
    const top = id === sections[0]?.id
      ? 0
      : el.getBoundingClientRect().top + window.scrollY - (headerHeight + 8)
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <div
      ref={railRef}
      aria-label="Page sections"
      style={{
        position: 'fixed', right: '14px', top: '50%', transform: 'translateY(-50%)',
        zIndex: 30, display: 'flex', flexDirection: 'column', gap: '2px',
        alignItems: 'flex-end',
      }}
    >
      {sections.map(s => {
        const on = active === s.id
        const lit = on || hovered === s.id
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s.id)}
            onMouseEnter={() => setHovered(s.id)}
            onMouseLeave={() => setHovered(null)}
            aria-current={on ? 'true' : undefined}
            style={{
              font: 'inherit', cursor: 'pointer',
              background: 'none', border: 'none', borderRadius: 0,
              padding: '7px 0 7px 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              gap: '9px',
              ['--tp-focus' as any]: accent,
            }}
          >
            <span style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
              whiteSpace: 'nowrap',
              color: on ? '#f1f5f9' : '#cbd5e1',
              // Labels stay out of the way until they're wanted, so the rail
              // reads as a margin mark rather than a menu.
              opacity: lit ? 1 : 0,
              transform: lit ? 'translateX(0)' : 'translateX(6px)',
              transition: 'opacity 150ms ease, transform 150ms ease',
              pointerEvents: 'none',
            }}>{s.label}</span>
            <span style={{
              display: 'block', height: '2px',
              width: on ? '22px' : lit ? '16px' : '11px',
              backgroundColor: on ? accent : '#475569',
              transition: 'width 150ms ease, background-color 150ms ease',
            }} />
          </button>
        )
      })}
    </div>
  )
}

export default SectionRail
