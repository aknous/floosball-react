import fs from 'fs'
import path from 'path'

/**
 * ⚠️ A REF MUTATED INSIDE A `setState` UPDATER IS NOT SET WHEN THE NEXT LINE RUNS.
 *
 * `pickFavoritesForSlot` staged its picks inside the `setSlots` updater. React runs that
 * updater during the render phase, so `stagedRef` was still empty on the following line —
 * `syncDirtyCount()` counted nothing and `scheduleSave()` reached a `flush()` that
 * early-returns on an empty staged map. The fill was never sent; it went out on the next
 * interaction that happened to schedule a save.
 *
 * Reported as "fill favorites on week 1, navigate away, come back, and it is unpicked."
 * Confirmed in production by picks landing in PAIRS of weeks sharing one timestamp
 * (weeks 1+2, 3+4, 5+6) — one save per two fills — and by a user whose last filled week
 * never saved at all, which is also why their Dedicated achievement read one week light.
 *
 * `setPick` was always correct because it stages outside its updater.
 */
describe('usePickEmDay staging', () => {
  const src = fs.readFileSync(path.join(__dirname, 'usePickEmDay.ts'), 'utf8')

  /** ⚠️ Comments stripped first: this file's own prose names `scheduleSave()` and
   *  `stagedRef`, and matching those made an assertion pass against a comment.
   *  Every check below still asserts the marker EXISTS, so stripping cannot go vacuous. */
  const bodyOf = (fnName: string): string => {
    const start = src.indexOf(`const ${fnName} = useCallback(`)
    expect(start).toBeGreaterThan(-1)
    // up to the callback's dependency array, which closes the useCallback
    const end = src.indexOf('}, [', start)
    return src.slice(start, end)
      .split('\n')
      .filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
      .join('\n')
  }

  /** The text of the `setSlots(...)` argument, by paren matching. */
  const updaterArg = (body: string): string => {
    const open = body.indexOf('setSlots(')
    expect(open).toBeGreaterThan(-1)
    let depth = 0
    for (let i = open + 'setSlots'.length; i < body.length; i++) {
      if (body[i] === '(') depth++
      else if (body[i] === ')') {
        depth--
        if (depth === 0) return body.slice(open, i + 1)
      }
    }
    throw new Error('unbalanced setSlots(')
  }

  it.each(['pickFavoritesForSlot', 'setPick'])(
    '%s does not stage inside the setSlots updater',
    (fnName) => {
      const body = bodyOf(fnName)
      expect(body).toContain('stagedRef.current.set')
      // Before or after the call is fine — both run synchronously. INSIDE the updater is
      // not, because React defers it to the render phase.
      expect(updaterArg(body)).not.toContain('stagedRef.current.set')
    },
  )

  it('the fill actually stages something before scheduling a save', () => {
    const body = bodyOf('pickFavoritesForSlot')
    const staged = body.indexOf('stagedRef.current.set')
    const scheduled = body.indexOf('scheduleSave()')
    expect(staged).toBeGreaterThan(-1)
    expect(scheduled).toBeGreaterThan(staged)
  })

  it('flush still bails on an empty staged map', () => {
    // The early return is correct and load-bearing — it is what stops an empty POST.
    // The bug was reaching it with picks the reader had already made.
    expect(src).toContain('stagedRef.current.size === 0')
  })
})
