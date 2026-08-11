/**
 * Reading a timestamp that came from the API.
 *
 * ⚠️ THE API'S TIMESTAMPS ARE UTC, AND JAVASCRIPT ASSUMES LOCAL. Most of these columns
 * default to `datetime.utcnow()`, which is naive — `.isoformat()` on a naive value used
 * to emit no offset at all, and a date-time string without one is read as LOCAL time. A
 * post stamped 14:33 UTC parsed as 14:33 wherever the reader is, hours adrift.
 *
 * ⚠️ AND CALLERS WORKED AROUND IT INDEPENDENTLY, which is the reason this exists as one
 * function. Each surface appended a `Z` of its own: fine while the server sent none, and
 * `NaN` the moment it started sending one, because `new Date('…Z' + 'Z')` is Invalid
 * Date. That shipped — the team Bleachers rendered every timestamp as "NaNd". Adding the
 * Z only when there is no zone already is the whole job, and it belongs in one place.
 *
 * Use this for anything from the API. Never `Date.parse` one raw, and never append a Z at
 * a call site.
 */
export const apiTimeMs = (iso: string | null | undefined): number => {
  if (!iso) return NaN
  const hasZone = iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso)
  return new Date(hasZone ? iso : `${iso}Z`).getTime()
}

/** "just now" / "5m" / "3h" / "2d" — the house relative-time format. */
export const relativeTime = (iso: string | null | undefined): string => {
  const then = apiTimeMs(iso)
  if (!Number.isFinite(then)) return ''
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  const hrs = Math.floor(secs / 3600)
  return hrs < 24 ? `${hrs}h` : `${Math.floor(hrs / 24)}d`
}
