import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AppHeader from './AppHeader'
import AppNav from './AppNav'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BG, FONT, SHELL_MOBILE_MAX } from './tokens'

/**
 * The frame every page sits in: header, nav, and a content column that owns its padding.
 *
 * ⚠️ The shell fills the VIEWPORT. The handoffs were drawn at 1440px and an earlier
 * version capped the shell there and centered it, which reproduced the prototype
 * faithfully and looked wrong in a real browser: two dead gutters of page background on
 * a wide monitor. 1440px was the artboard, not a layout constraint.
 *
 * ⚠️ MOBILE uses this shell too, with the nav as a drawer. It used to fall through to a
 * separate legacy chrome (the old Navbar, GameBar, BetaBanner and Footer), which meant
 * two headers to keep in step and a phone seeing pre-redesign furniture around
 * redesigned pages. One shell, one header, and the nav slides in.
 */
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isMobile = useIsMobile(SHELL_MOBILE_MAX)
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  // Going somewhere closes the drawer. Without this it stays open over the page you
  // just asked for.
  useEffect(() => { setNavOpen(false) }, [location.pathname])

  // A drawer over the page must not leave the page scrolling underneath it.
  useEffect(() => {
    if (!isMobile) return
    document.body.style.overflow = navOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [navOpen, isMobile])

  return (
  <div
    className="font-pixel"
    style={{
      // ⚠️ The SHELL owns the viewport and does not scroll; the content column does.
      // With the document scrolling instead, a full-height nav could only be `sticky`,
      // and once the header scrolled away the nav was short by exactly the header's
      // height. Nothing to be short of if the page never moves.
      height: '100dvh',
      overflow: 'hidden',
      width: '100%',
      background: BG.shell,
      fontFamily: FONT,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <AppHeader onOpenNav={isMobile ? () => setNavOpen(true) : undefined} />
    <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
      {isMobile ? (
        navOpen && (
          <>
            <div
              onClick={() => setNavOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 70,
                background: 'rgba(2,6,23,0.72)',
              }}
            />
            <div style={{
              position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 71,
              boxShadow: '2px 0 24px rgba(0,0,0,0.55)',
            }}>
              <AppNav />
            </div>
          </>
        )
      ) : (
        <AppNav />
      )}
      {/* The one scroller on the page. No footer to reserve height for either: the
          version badge lives at the foot of the nav.

          ⚠️ A PAGE INSIDE HERE MUST NOT ASK FOR `100vh`. This element starts BELOW the
          header, so it is a viewport minus the header tall — a child claiming a full
          viewport is exactly the header's height too tall, and every such page carried a
          permanent ~63px of scroll that no amount of content explained. Measured on the
          fantasy page: main clientHeight 919 against scrollHeight 982, unchanged when the
          leaderboard inside it was shrunk, because the leaderboard was never the cause.
          Use `minHeight: '100%'` — it resolves against this box, needs no header constant,
          and stays right if the header ever changes height. */}
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
