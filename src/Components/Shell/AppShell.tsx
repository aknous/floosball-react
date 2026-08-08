import React from 'react'
import AppHeader from './AppHeader'
import AppNav from './AppNav'
import { BG, BORDER, FONT, FOOTER_HEIGHT } from './tokens'

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
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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
    <AppHeader />
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <AppNav />
      {/* The Footer is fixed to the viewport bottom, so its height is reserved here —
          without it the last rows of every page scroll underneath it and cannot be read. */}
      <main style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
        paddingBottom: `${FOOTER_HEIGHT}px`,
      }}>
        {children}
      </main>
    </div>
  </div>
)

export default AppShell
