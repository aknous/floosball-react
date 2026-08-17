import { highlightPlayText } from './playTextHighlight'
import React from 'react'

/** Flatten the returned node tree back to the strings that were emphasised. */
function bolded(node: React.ReactNode): string[] {
  const out: string[] = []
  const walk = (n: any) => {
    if (Array.isArray(n)) return n.forEach(walk)
    if (n && typeof n === 'object' && n.props) {
      // Weight-agnostic: this asserts WHAT is emphasised, not how heavily. Pinning the
      // number made these fail the moment the emphasis was strengthened, which is a
      // test of the styling rather than of the behaviour.
      if (n.props.style?.fontWeight && n.props.style.fontWeight >= 700) out.push(String(n.props.children))
      else walk(n.props.children)
    }
  }
  walk(node)
  return out
}
const plain = (node: React.ReactNode): string => {
  let s = ''
  const walk = (n: any) => {
    if (typeof n === 'string') { s += n; return }
    if (Array.isArray(n)) return n.forEach(walk)
    if (n && typeof n === 'object' && n.props) walk(n.props.children)
  }
  walk(node)
  return s
}

const TEXT = 'Waffles goes no-huddle. Mario Trolleyproblem quick out to Rhodes Alltime ' +
  'for 10 yards, spins but gets dragged down anyway, and reaches the ball across the ' +
  'marker for the first down!'
const PLAYERS = ['Mario Trolleyproblem', 'Rhodes Alltime']

describe('highlightPlayText', () => {
  it('lifts the players, the yards, and the outcome', () => {
    const got = bolded(highlightPlayText(TEXT, PLAYERS))
    expect(got).toContain('Mario Trolleyproblem')
    expect(got).toContain('Rhodes Alltime')
    expect(got).toContain('10 yards')
    expect(got).toContain('first down')
  })

  it('never alters the text itself', () => {
    expect(plain(highlightPlayText(TEXT, PLAYERS))).toBe(TEXT)
  })

  it('prefers the longer outcome over the shorter one inside it', () => {
    // "first down" must win over "down"; "down" also appears in "dragged down".
    const got = bolded(highlightPlayText(TEXT, PLAYERS))
    expect(got).toContain('first down')
    expect(got).not.toContain('down')
  })

  it('does not bold a bare number that is not yardage', () => {
    const t = '3rd and 7. Jim Bob runs for 4 yards.'
    const got = bolded(highlightPlayText(t, ['Jim Bob']))
    expect(got).toContain('4 yards')
    expect(got).not.toContain('7')
    expect(got).not.toContain('3')
  })

  it('handles a name that contains another name', () => {
    const t = 'Al Green throws to Al Greenway for 12 yards.'
    const got = bolded(highlightPlayText(t, ['Al Green', 'Al Greenway']))
    expect(got).toContain('Al Greenway')
    expect(plain(highlightPlayText(t, ['Al Green', 'Al Greenway']))).toBe(t)
  })

  it('does not match an outcome inside another word', () => {
    const t = 'Sackett Jones gains 3 yards.'
    const got = bolded(highlightPlayText(t, ['Sackett Jones']))
    expect(got).toContain('Sackett Jones')
    expect(got.join('|')).not.toMatch(/^sack$/i)
  })

  it('passes through text with nothing to lift', () => {
    expect(highlightPlayText('Timeout.', [])).toBe('Timeout.')
  })

  it('survives no players and empty input', () => {
    expect(highlightPlayText('', [])).toBe('')
    expect(highlightPlayText(null, [])).toBeNull()
    expect(plain(highlightPlayText(TEXT, []))).toBe(TEXT)
  })
})

describe('emphasis is actually distinct', () => {
  // ⚠️ Reported: the bold did not stand out. It was not the weight — the colours were
  // #f1f5f9 for a name and #e2e8f0 for yardage against a body of #e2e8f0, i.e. a hair
  // brighter and exactly identical. And the font ladder is remapped (400 = Medium), so a
  // 700 highlight sat close to its surroundings.
  const styleOf = (node: React.ReactNode, text: string): React.CSSProperties | null => {
    let found: React.CSSProperties | null = null
    const walk = (n: any) => {
      if (Array.isArray(n)) return n.forEach(walk)
      if (n && typeof n === 'object' && n.props) {
        if (String(n.props.children) === text && n.props.style) found = n.props.style
        else walk(n.props.children)
      }
    }
    walk(node)
    return found
  }
  const NODE = highlightPlayText(
    'Jim Bob runs for 4 yards, tackled by Al Green for the first down', ['Jim Bob', 'Al Green'])

  it('uses the heaviest face the font ships', () => {
    expect(styleOf(NODE, 'Jim Bob')?.fontWeight).toBe(900)
  })

  it('does not colour a highlight the same as the body text', () => {
    const body = '#cbd5e1'
    for (const t of ['Jim Bob', '4 yards', 'first down']) {
      expect(styleOf(NODE, t)?.color).not.toBe(body)
      expect(styleOf(NODE, t)?.color).not.toBe('#e2e8f0')
    }
  })

  it('gives the outcome the only hue', () => {
    expect(styleOf(NODE, 'first down')?.color).not.toBe(styleOf(NODE, 'Jim Bob')?.color)
  })
})
