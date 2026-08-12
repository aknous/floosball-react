import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { OffseasonPanel } from '@/Components/OffseasonPanel'
import { SeasonRecap } from '@/Components/Recap/SeasonRecap'
import { useFloosball } from '@/contexts/FloosballContext'
import { BG, BORDER, TEXT, FONT, font } from '@/Components/Shell/tokens'

/**
 * The season-end home: the Season Recap and the live Draft Board.
 *
 * ⚠️ BOTH WERE UNREACHABLE. They lived inside `DashboardNew`, which the restructure
 * left routed at `/dashboard/legacy` — `/dashboard` redirects to `/`, and the new front
 * page has no offseason branch at all. So the two pages that ARE the season's ending had
 * no door for anyone who did not know the legacy URL.
 *
 * They get a route rather than a slot on the front page because the front page is a
 * standing layout and these are an event. That is the same call the app already made for
 * the Bracket and for Awards — a nav entry that appears when its moment arrives and not
 * before, since a draft board in week 3 is an empty list.
 *
 * The two views stay ONE page with a toggle rather than two nav entries because the
 * offseason is SEQUENTIAL: the recap is the story the moment the Floos Bowl ends, the
 * draft board is the story while picks are running. Only one of them is ever the live
 * thing, so two permanent entries would advertise a dead one half the time.
 */

type View = 'recap' | 'draft'

const VIEWS: [View, string][] = [['recap', 'Season Recap'], ['draft', 'Draft Board']]

/**
 * ⚠️ The view is in the URL, not just in state, so the front page can link straight at
 * the draft board (`/offseason?view=draft`) and so a reader can send someone the thing
 * they are actually looking at.
 */
export const OffseasonPage: React.FC = () => {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { seasonState } = useFloosball()
  const isOffseason = seasonState?.currentWeekText === 'Offseason'

  const raw = params.get('view')
  const view: View = raw === 'draft' ? 'draft' : 'recap'

  // Out of the offseason this page has nothing live to show and no nav entry pointing at
  // it, so a stale link or a back button lands on the front page rather than on an empty
  // draft board. Waits for season state to arrive first — `seasonState` is null on the
  // very first render and bouncing then would fire on every cold load.
  useEffect(() => {
    if (seasonState && !isOffseason) navigate('/', { replace: true })
  }, [seasonState, isOffseason, navigate])

  const setView = (next: View) => setParams(next === 'recap' ? {} : { view: next },
                                            { replace: true })

  return (
    <div style={{ padding: '26px 28px 40px', fontFamily: FONT, minWidth: 0 }}>
      <div style={{ marginBottom: '18px' }}>
        <div style={{ ...font(700, 22), color: TEXT.primary }}>Offseason</div>
        <div style={{ ...font(400, 13, 1.5), color: TEXT.muted, marginTop: '4px' }}>
          How the season finished, and how every roster is being rebuilt.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {VIEWS.map(([key, label]) => {
          const on = view === key
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{
                ...font(700, 12, 1, '0.04em'),
                padding: '8px 15px',
                border: `1px solid ${on ? BORDER.raised : BORDER.hairline}`,
                background: on ? BG.card : 'transparent',
                color: on ? TEXT.body : TEXT.muted,
                cursor: 'pointer', fontFamily: FONT,
              }}
            >{label}</button>
          )
        })}
      </div>

      {view === 'draft' ? <OffseasonPanel /> : <SeasonRecap />}
    </div>
  )
}

export default OffseasonPage
