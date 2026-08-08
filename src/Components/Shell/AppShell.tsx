import React from 'react'
import AppHeader from './AppHeader'
import AppNav from './AppNav'
import { BG, BORDER, FONT } from './tokens'

/**
 * The frame the three redesigned pages sit in: full-width header, fixed 196px nav, and a
 * content column that owns its own padding.
 *
 * Responsive was not designed — the handoffs are a fixed 1440px desktop layout — so this
 * lays out at that width and lets the content column flex. Below roughly 1100px the pages
 * themselves handle the collapse; the old mobile Navbar still covers phones.
 */
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="font-pixel"
    style={{
      minHeight: '100vh',
      background: BG.page,
      fontFamily: FONT,
      display: 'flex',
      justifyContent: 'center',
    }}
  >
    <div style={{
      width: '100%',
      maxWidth: '1440px',
      background: BG.shell,
      border: `1px solid ${BORDER.hairline}`,
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
    }}>
      <AppHeader />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <AppNav />
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
    </div>
  </div>
)

export default AppShell
