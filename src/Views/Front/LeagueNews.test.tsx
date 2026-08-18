import React from 'react'
import { render, screen } from '@testing-library/react'

// ⚠️ CoresStatusPanel reaches the auth context and from there Clerk, which does not resolve
// under jest. It contributes a decorative band and nothing this file asserts on, so it is
// stubbed to keep the test about the lead's own rendering rather than about module
// resolution.
jest.mock('./CoresStatusPanel', () => ({ CoresBand: () => null }))

import LeagueNews from './LeagueNews'

/**
 * ⚠️ A CORES EXCHANGE LEADS AS THE WHOLE CONVERSATION, NOT ITS FIRST LINE.
 *
 * Reported while testing the admin conversation composer: it "only shows the first line and
 * drops any subsequent lines". The backend was correct end to end — three rows persisted,
 * grouped into one entry, `turns` present and in spoken order — and the ROWS below the lead
 * had always rendered them. The LEAD renderer drew the flat `text` field, which is only the
 * opening turn (it exists so anything reading the plain field gets something sensible).
 *
 * ⚠️ That is exactly where a posted conversation lands: pinning is what lets a Cores item
 * lead at all, and the composer defaults it on, so the headline slot was both the intended
 * destination and the one place the turns were not drawn.
 *
 * ⚠️ MY BACKEND TESTS COULD NOT HAVE CAUGHT THIS. They asserted the payload carried the
 * turns, correctly ordered — which it did. The gap was between a correct payload and a
 * renderer that ignored part of it, which is the same trap noted in test_record_ties.py
 * ("the engine working is not the same as the reader seeing a line"). Hence this file.
 */

const turn = (core: string, text: string) => ({
  core, coreDisplayName: core.charAt(0).toUpperCase() + core.slice(1), text,
})

const coresLead = (turns: ReturnType<typeof turn>[]) => ({
  id: 1,
  category: 'cores',
  rawCategory: 'cores',
  text: `${turns[0].coreDisplayName}: ${turns[0].text}`,
  rawText: turns[0].text,
  core: turns[0].core,
  coreDisplayName: turns[0].coreDisplayName,
  turns,
  stats: [],
  season: 1,
  week: 5,
  at: new Date().toISOString(),
  pinned: true,
} as any)

describe('LeagueNews lead', () => {
  const conversation = [
    turn('vera', 'The instance is holding.'),
    turn('pyre', 'It is not holding. It is deciding.'),
    turn('aris', 'I love this part.'),
  ]

  it('renders every turn of a leading conversation', () => {
    render(<LeagueNews lead={coresLead(conversation)} items={[]} />)
    expect(screen.getByText(/The instance is holding/)).toBeInTheDocument()
    expect(screen.getByText(/It is not holding/)).toBeInTheDocument()
    expect(screen.getByText(/I love this part/)).toBeInTheDocument()
  })

  it('names every speaker, not just the first', () => {
    render(<LeagueNews lead={coresLead(conversation)} items={[]} />)
    for (const name of ['Vera', 'Pyre', 'Aris']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('does not print the speaker twice', () => {
    // The flat `text` carries "Vera: ..." inline for the older feed; the lead draws the
    // name separately, so the inline copy has to be stripped or it reads "Vera Vera:".
    render(<LeagueNews lead={coresLead(conversation)} items={[]} />)
    expect(screen.queryByText(/Vera: The instance/)).not.toBeInTheDocument()
  })

  it('still renders an ordinary headline that has no turns', () => {
    const plain = {
      id: 2, category: 'announcement', rawCategory: 'announcement',
      text: 'The league will expand next season', stats: [], season: 1, week: 5,
      at: new Date().toISOString(),
    } as any
    render(<LeagueNews lead={plain} items={[]} />)
    expect(screen.getByText('The league will expand next season')).toBeInTheDocument()
  })

  it('handles a single-turn Cores post', () => {
    const one = coresLead([turn('vera', 'Curious.')])
    render(<LeagueNews lead={one} items={[]} />)
    expect(screen.getByText(/Curious/)).toBeInTheDocument()
    expect(screen.getByText('Vera')).toBeInTheDocument()
  })
})
