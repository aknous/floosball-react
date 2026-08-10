import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { BG, BORDER, TEXT, ACCENT, FONT, font } from './tokens'

/**
 * "This is built for a desktop, for now."
 *
 * ⚠️ The redesigned shell was built desktop-first and the mobile pass has not happened
 * yet. A fixed-width nav, a 330px rail and multi-column grids all assume room they do
 * not have on a phone. Shipping without saying so lets a phone reader conclude the app
 * is broken rather than unfinished, and that is a worse first impression than the
 * honest one.
 *
 * ⚠️ DISMISSIBLE, and it stays dismissed. It is a warning, not a wall: someone who
 * wants to check a score on their phone should be able to, and being told twice is
 * being nagged. The flag lives in localStorage rather than on the account because it
 * is about this device, which is exactly the thing localStorage is for.
 *
 * ⚠️ Keyed to the RELEASE. When the mobile work lands the key changes and the notice
 * stops appearing for everyone at once, rather than lingering for anyone who never
 * cleared their storage.
 */

const DISMISS_KEY = 'floosball:mobile-notice:v1'
const MOBILE_MAX = 820

const MobileNotice: React.FC = () => {
  const [narrow, setNarrow] = useState(() => window.innerWidth < MOBILE_MAX)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < MOBILE_MAX)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!narrow || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* the session still works */ }
  }

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10050,
      background: 'rgba(2,6,23,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '22px', fontFamily: FONT,
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: BG.card, border: `1px solid ${BORDER.raised}`,
        padding: '24px 22px 20px',
      }}>
        <div style={{ ...font(700, 10, 1, '0.14em'), color: ACCENT.warning }}>
          REDESIGN IN PROGRESS
        </div>
        <h2 style={{ ...font(800, 20, 1.2, '-0.02em'), color: TEXT.primary, margin: '11px 0 10px' }}>
          Phones are still being redone
        </h2>
        {/* ⚠️ Says REDESIGN, not "not built yet". Mobile worked before this release, so
            a reader on a phone is meeting something that got worse rather than something
            that never existed, and the notice should not pretend otherwise. */}
        <p style={{ ...font(400, 13, 1.6), color: TEXT.secondary, margin: '0 0 6px' }}>
          Floosball has just been rebuilt, and the phone layout is the part still in
          progress. Everything works, but pages will be cramped and some will need
          scrolling sideways.
        </p>
        <p style={{ ...font(400, 13, 1.6), color: TEXT.muted, margin: '0 0 20px' }}>
          It is being worked on. Come back on a laptop for the full thing in the meantime.
        </p>
        <button
          onClick={dismiss}
          style={{
            ...font(700, 12, 1, '0.06em'), color: BG.shell, background: ACCENT.info,
            border: 'none', padding: '12px 18px', width: '100%',
            cursor: 'pointer', fontFamily: FONT,
          }}
        >CARRY ON ANYWAY</button>
      </div>
    </div>,
    document.body,
  )
}

export default MobileNotice
