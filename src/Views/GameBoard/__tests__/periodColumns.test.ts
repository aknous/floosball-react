import { periodColumns, quarterLine } from '../gameFormat'

/**
 * The line score's columns.
 *
 * ⚠️ TWO FAULTS FROM THE OWNER, both about columns that describe periods the game has not
 * played: an overtime game had NO OT column at all (the map ran q1..q4 and stopped, so the
 * points that decided the game appeared only in the total), and a period the game has not
 * reached must read blank rather than zero — a zero is a real scoreless period and the two
 * must not look the same.
 */
const base = (over: any = {}): any => ({
  id: 1, status: 'Active', quarter: 1,
  quarterScores: { home: { q1: 0, q2: 0, q3: 0, q4: 0 }, away: { q1: 0, q2: 0, q3: 0, q4: 0 } },
  ...over,
})

const vals = (g: any) => periodColumns(g)!.periods.map(p => `${p.label}:${p.homeValue}`)

describe('periodColumns', () => {
  it('blanks the quarters the game has not reached', () => {
    const g = base({ quarter: 2, quarterScores: {
      home: { q1: 7, q2: 0, q3: 0, q4: 0 }, away: { q1: 3, q2: 0, q3: 0, q4: 0 } } })
    expect(vals(g)).toEqual(['Q1:7', 'Q2:0', 'Q3:·', 'Q4:·'])
  })

  it('a scoreless quarter the game DID play still reads 0', () => {
    // ⚠️ The point of the blank is to distinguish "not yet" from "nobody scored".
    const g = base({ quarter: 3 })
    expect(vals(g)).toEqual(['Q1:0', 'Q2:0', 'Q3:0', 'Q4:·'])
  })

  it('a regulation final shows four quarters and NO OT column', () => {
    const g = base({ status: 'Final', quarter: 4 })
    expect(vals(g)).toEqual(['Q1:0', 'Q2:0', 'Q3:0', 'Q4:0'])
  })

  it('an overtime game gets an OT column', () => {
    const g = base({ status: 'Final', quarter: 5, quarterScores: {
      home: { q1: 7, q2: 0, q3: 3, q4: 7, ot: 3 },
      away: { q1: 0, q2: 10, q3: 0, q4: 7, ot: 0 } } })
    expect(vals(g)).toEqual(['Q1:7', 'Q2:0', 'Q3:3', 'Q4:7', 'OT:3'])
  })

  it('an OT column appears from the OT SCORE too, not only the quarter number', () => {
    // A finished overtime game may report quarter 4; the points are the other witness.
    const g = base({ status: 'Final', quarter: 4, quarterScores: {
      home: { q1: 0, q2: 0, q3: 0, q4: 0, ot: 6 },
      away: { q1: 0, q2: 0, q3: 0, q4: 0, ot: 0 } } })
    expect(vals(g)[vals(g).length - 1]).toBe('OT:6')
  })

  it('a scheduled game has played nothing', () => {
    const g = base({ status: 'Scheduled', quarter: 0 })
    expect(vals(g)).toEqual(['Q1:·', 'Q2:·', 'Q3:·', 'Q4:·'])
  })

  it('innings blank the innings not yet reached', () => {
    const g = base({ innings: { active: true, inning: 2, half: 'top', tries: 1, triesPerInning: 3,
                                inningsPerGame: 4,
                                lineScore: { innings: [1, 2, 3, 4], home: [3, 0], away: [0, 1] } } })
    expect(vals(g)).toEqual(['1:3', '2:0', '3:·', '4:·'])
  })

  it('frames blank the frames not yet played', () => {
    const g = base({ frames: { active: true, currentFrame: 2, framesPerGame: 4,
                               framesWonHome: 1, framesWonAway: 0,
                               frameResults: [{ home: 7, away: 3, winner: 'home' }] } })
    expect(vals(g)).toEqual(['1:7', '2:·', '3:·', '4:·'])
  })
})

/**
 * The rule the board card, the game page's scoreboard band and the game modal's line
 * score all share. It is tested directly as well as through periodColumns because the
 * other two readers do not go through periodColumns — a change that only satisfied the
 * card would leave them wrong, which is exactly how all three ended up wrong before.
 */
describe('quarterLine', () => {
  const line = (quarter: number, status: string, ot?: { home: number; away: number }) =>
    quarterLine({
      quarter,
      status,
      quarterScores: {
        home: { q1: 0, q2: 0, q3: 0, q4: 0, ot: ot?.home ?? 0 },
        away: { q1: 0, q2: 0, q3: 0, q4: 0, ot: ot?.away ?? 0 },
      },
    })

  it('is four columns in regulation and five once overtime happens', () => {
    expect(line(2, 'Active').map(c => c.label)).toEqual(['Q1', 'Q2', 'Q3', 'Q4'])
    expect(line(5, 'Active').map(c => c.label)).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'OT'])
    // A FINISHED overtime reports quarter 4; the points are the only witness left.
    expect(line(4, 'Final', { home: 6, away: 0 }).map(c => c.label))
      .toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'OT'])
  })

  it('marks played exactly the periods the game has reached', () => {
    expect(line(0, 'Scheduled').map(c => c.played)).toEqual([false, false, false, false])
    expect(line(1, 'Active').map(c => c.played)).toEqual([true, false, false, false])
    expect(line(3, 'Active').map(c => c.played)).toEqual([true, true, true, false])
    expect(line(4, 'Final').map(c => c.played)).toEqual([true, true, true, true])
  })

  it('treats the OT column as played, since it only exists because overtime happened', () => {
    const finished = line(4, 'Final', { home: 6, away: 0 })
    expect(finished[finished.length - 1].played).toBe(true)
    const live = line(5, 'Active')
    expect(live[live.length - 1].played).toBe(true)
  })
})
