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
  return (
  <div
    className="font-pixel"
    style={{
      // ⚠️ The SHELL owns the viewport and does not scroll; the content column
      // does. With the document scrolling instead, a full-height nav could only
      // be `sticky`, and once the header scrolled away the nav was short by
      // exactly the header's height — you could scroll past its bottom edge and
      // see the page behind it. Nothing to be short of if the page never moves.
      height: '100dvh',
      overflow: 'hidden',
      width: '100%',
      background: BG.shell,
      fontFamily: FONT,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <AppHeader />
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <AppNav />
      {/* The one scroller on the page. No footer to reserve height for either —
          the version badge lives at the foot of the nav. */}
      <main style={{
        flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {children}
      </main>
    </div>
  </div>
  )
}

export default AppShell
