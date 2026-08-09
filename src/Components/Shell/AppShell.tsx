import React from 'react'
import AppHeader from './AppHeader'
import AppNav from './AppNav'
import { BG, BORDER, FONT } from './tokens'

/**
 * The frame the three redesigned pages sit in: full-width header, fixed 196px nav, and a
 * content column that owns its own padding.
 *
 * ⚠️ The shell fills the VIEWPORT. The handoffs were drawn at 1440px and an earlier
 * version of this capped the shell there and centred it, which reproduced the prototype
 * faithfully and looked wrong in a real browser — two dead gutters of page background on
 * a wide monitor. 1440px was the artboard, not a layout constraint. Every page inside
 * uses flexible columns (the nav is fixed, the content is `1fr`, the front page's rail is
 * a fixed 330px), so they all stretch correctly.
 *
 * Responsive below desktop was not designed; the old mobile Navbar still covers phones.
 */
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // The nav is sticky and full-height, so it has to know how tall the header is
  // to avoid overhanging the viewport by exactly that much. Measured rather than
  // assumed: the header grows when the beta strip or a season banner is up.
  const headerRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const apply = () => document.documentElement.style.setProperty(
      '--app-header-h', `${el.getBoundingClientRect().height}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
  <div
    className="font-pixel"
    style={{
      minHeight: '100vh',
      width: '100%',
      background: BG.shell,
      borderBottom: `1px solid ${BORDER.hairline}`,
      fontFamily: FONT,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <div ref={headerRef}><AppHeader /></div>
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <AppNav />
      {/* No footer on desktop any more, so nothing to reserve height for — the
          version badge lives at the foot of the nav and the page runs to the
          bottom of the viewport. */}
      <main style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
      }}>
        {children}
      </main>
    </div>
  </div>
  )
}

export default AppShell
