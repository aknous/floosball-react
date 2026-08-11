import React, { useCallback, useEffect, useState } from 'react'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useAuth } from '@/contexts/AuthContext'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { readableTeamColor } from '@/utils/colors'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * The Bleachers' fan half: what you can shout AT THIS GAME, and what everyone
 * else has shouted at it.
 *
 * ⚠️ Deliberately NOT `TeamFeed`. That feed is a club's standing conversation —
 * "This is our season", "Same story every season" — lines about a year, which
 * read as nonsense shouted at a single snap. Worse, it is scoped to a team, so
 * a post made watching one game showed up in every other game's rail.
 *
 * Posts here carry a `game_id` and are read back per game, so a shout belongs
 * to the night it was shouted at.
 */

interface FeedPost {
  id: number
  postKey: string
  text: string
  valence: number
  teamId: number
  teamAbbr: string | null
  teamColor: string | null
  username: string | null
  isMine: boolean
  createdAt: string | null
}

interface CatalogGroup {
  label: string
  options: { key: string; text: string; valence: number }[]
}

const relativeTime = (iso: string | null): string => {
  if (!iso) return ''
  const then = new Date(iso.endsWith('Z') ? iso : `${iso}Z`).getTime()
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  return `${Math.floor(secs / 3600)}h`
}

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="14" height="14" viewBox="0 0 20 20" fill={TEXT.muted}
    style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 160ms ease' }}
  >
    <path d="M5 7l5 6 5-6H5z" />
  </svg>
)

export interface TimelineEntry {
  key: string
  /** ISO wall clock. Missing on a cutaway generated before the server stamped them —
   *  those sink to the bottom rather than jumping the queue. */
  createdAt?: string | null
  node: React.ReactNode
}

const GameFeedComposer: React.FC<{
  gameId: number
  /** The player and sideline voices, appended below the fan posts in the same
   *  scroller — the rail is one feed, not two stacked ones. */
  /**
   * The OTHER voices in this rail — sideline cutaways — as DATA, not as a rendered
   * block.
   *
   * ⚠️ THIS USED TO BE A ReactNode APPENDED AFTER THE POSTS, which is why every
   * sideline line sat under every fan shout however long ago it was said. A feed that
   * claims to be a timeline has to be sorted as one, and that can only happen where
   * both halves are in scope — here.
   */
  timelineEntries?: TimelineEntry[]
  /**
   * Whether there is anything in the rail besides posts.
   *
   * ⚠️ A ReactNode is always truthy, even when it renders to nothing, so the feed
   * cannot work this out by looking. The caller knows and has to say. It is only
   * needed for the empty state below.
   */
  hasExtraEntries?: boolean
}> = ({ gameId, timelineEntries = [], hasExtraEntries = false }) => {
  const { user, getToken } = useAuth()
  const { subscribe } = useSeasonWebSocket()
  const [groups, setGroups] = useState<CatalogGroup[]>([])
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [remaining, setRemaining] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /**
   * ⚠️ Seconds until the next post is allowed — the limiter a fan actually meets.
   * The hourly cap used to be the only one and it was ten an hour, so someone
   * watching a whole match ran out partway through and sat silent for the finish.
   * The cap is a runaway backstop now; a few seconds between shouts is the real rule.
   *
   * Seeded from the server on every load and post, then ticked down locally. The
   * server rounds UP, so the button never comes back a moment before a post would
   * be accepted.
   */
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  useEffect(() => {
    fetch(`${API_BASE}/games/${gameId}/feed/catalog`)
      .then(r => r.json())
      .then(j => { if (j?.success) setGroups(j.data.groups ?? []) })
      .catch(() => { /* the feed still reads without a composer */ })
  }, [gameId])

  const loadFeed = useCallback(async () => {
    try {
      const token = user ? await getToken() : null
      const res = await fetch(`${API_BASE}/games/${gameId}/feed`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (!json?.success) return
      setPosts(json.data.posts ?? [])
      setRemaining(json.data.postsRemaining ?? null)
      setCooldown(json.data.cooldownSeconds ?? 0)
    } catch { /* keep whatever we had */ }
  }, [gameId, user, getToken])

  // Reset on a game switch so the previous match's shouts never flash up here.
  useEffect(() => { setPosts([]); setOpen(false); setError(null); loadFeed() }, [gameId, loadFeed])

  /**
   * Other people's shouts, as they land.
   *
   * ⚠️ The feed is SHARED — it is keyed on the game, not on you — but it only ever
   * loaded on mount, so two people watching the same match could not see each other
   * until one of them navigated away and back. This rides the same channel as
   * `play_reaction_update`, which had the identical requirement and solved it first.
   *
   * `isMine` is not taken from the wire. The broadcast goes to every viewer, so it
   * ships false and each client decides for itself.
   *
   * Deduped on id because the poster gets their own post twice: once from the POST
   * response path and once from this broadcast.
   */
  useEffect(() => {
    return subscribe((msg: any) => {
      if (msg?.event !== 'game_feed_post') return
      if (String(msg.gameId) !== String(gameId)) return
      const incoming = msg.post
      if (!incoming) return
      setPosts(prev => (prev.some(p => p.id === incoming.id)
        ? prev
        : [{ ...incoming, isMine: !!user && incoming.username === user.username }, ...prev]))
    })
  }, [subscribe, gameId, user])

  const post = async (key: string, text: string) => {
    setOpen(false)
    setError(null)
    // Optimistic: the shout appears the moment you pick it.
    const optimistic: FeedPost = {
      id: -Date.now(), postKey: key, text, valence: 0,
      teamId: user?.favoriteTeamId ?? 0, teamAbbr: null, teamColor: null,
      username: user?.username ?? 'you', isMine: true,
      createdAt: new Date().toISOString(),
    }
    setPosts(prev => [optimistic, ...prev])
    try {
      const token = await getToken()
      const res = await fetch(`${API_BASE}/games/${gameId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ postKey: key }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        setPosts(prev => prev.filter(p => p.id !== optimistic.id))
        setError(json?.detail || 'That did not go through')
        return
      }
      setRemaining(json.data?.postsRemaining ?? remaining)
      setCooldown(json.data?.cooldownSeconds ?? 0)
      loadFeed()
    } catch {
      setPosts(prev => prev.filter(p => p.id !== optimistic.id))
      setError('That did not go through')
    }
  }

  const canPost = !!user?.favoriteTeamId
  const waiting = canPost && cooldown > 0
  const triggerEnabled = canPost && !waiting

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* The composer is pinned; everything said scrolls under it.
          `relative` so the option list can be lifted OUT of the flow — in it,
          opening the list shoved the whole feed down the page instead of
          covering it. */}
      <div style={{
        padding: '13px 14px', borderBottom: `1px solid ${BORDER.hairline}`,
        flexShrink: 0, position: 'relative', zIndex: 5,
      }}>
        <button
          onClick={() => (triggerEnabled ? setOpen(o => !o) : undefined)}
          style={{
            display: 'flex', alignItems: 'center', width: '100%',
            padding: '10px 12px', cursor: triggerEnabled ? 'pointer' : 'default',
            background: open ? '#243044' : BG.panel,
            border: `1px solid ${open ? '#64748b' : BORDER.raised}`,
            fontFamily: FONT, ...font(700, 12),
            color: waiting ? TEXT.muted : TEXT.secondary,
          }}
        >
          {/* The wait is on the BUTTON, not in a message under it. It is the reason
              the button is not doing anything, so it belongs where the reader is
              already looking. */}
          <span style={{ flex: 1, textAlign: 'left' }}>
            {waiting ? `Take a breath — ${cooldown}s`
              : canPost ? 'Say something'
                : user ? 'Pick a team to join in' : 'Sign in to join in'}
          </span>
          {triggerEnabled && <Chevron open={open} />}
        </button>

        {open && (
          <div style={{
            // Over the feed, not above it. Anchored to the trigger's box and
            // inset to match its padding, so it lines up with the button.
            position: 'absolute',
            top: 'calc(100% - 8px)',
            left: '14px',
            right: '14px',
            zIndex: 30,
            maxHeight: '340px',
            overflowY: 'auto',
            border: `1px solid ${BORDER.raised}`,
            background: BG.panel,
            boxShadow: '0 10px 28px rgba(0,0,0,0.55)',
          }}>
            {groups.map(group => (
              <div key={group.label}>
                <div style={{ ...font(700, 11, 1, '0.04em'), color: TEXT.muted, padding: '8px 12px 5px' }}>
                  {group.label}
                </div>
                {group.options.map(option => (
                  <button
                    key={option.key}
                    className="feed-composer-option"
                    onClick={() => post(option.key, option.text)}
                    style={{
                      display: 'flex', alignItems: 'baseline', gap: '8px', width: '100%',
                      padding: '9px 12px', background: 'transparent', border: 'none',
                      borderLeft: '2px solid transparent', cursor: 'pointer',
                      fontFamily: FONT, ...font(500, 12), color: TEXT.secondary, textAlign: 'left',
                    }}
                  >{option.text}</button>
                ))}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ ...font(400, 11), color: ACCENT.negative, paddingTop: '8px' }}>{error}</div>
        )}
        {/* ⚠️ Only shown when the hourly cap is genuinely in reach. At 90 an hour it
            is a backstop, and printing "87 posts left this hour" under every shout
            advertises a limit nobody is going to hit as though it were a budget. */}
        {canPost && remaining != null && remaining <= 10 && (
          <div style={{ ...font(400, 11), color: TEXT.muted, paddingTop: '8px' }}>
            {remaining} posts left this hour
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {/* ⚠️ ONE TIMELINE. Posts and sideline lines are merged and sorted here rather
          than concatenated, so the rail reads in the order things were actually said.
          An entry with no timestamp keeps to the bottom: a cutaway generated before the
          server stamped them has no place to claim, and guessing one would put an old
          line above a shout from a second ago. */}
      {(() => {
        const postEntries: TimelineEntry[] = posts.map(p => {
          const colour = p.teamColor ? readableTeamColor(p.teamColor) : TEXT.muted
          return {
            key: `post-${p.id}`,
            createdAt: p.createdAt,
            node: (
              <div
                key={`post-${p.id}`}
                style={{
                  display: 'flex', flexDirection: 'column', gap: '6px',
                  padding: '12px 14px', borderBottom: `1px solid ${BORDER.hairline}`,
                  ...(p.isMine && p.teamColor
                    ? { background: `${p.teamColor}14`, boxShadow: `inset 3px 0 0 ${p.teamColor}` }
                    : {}),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {p.teamId ? (
                    <img src={`/avatars/${p.teamId}.png`} alt="" width={18} height={18}
                         style={{ borderRadius: '50%', flexShrink: 0, display: 'block' }} />
                  ) : null}
                  <span style={{ ...font(600, 11), color: colour }}>{p.username ?? 'someone'}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ ...font(400, 10), color: TEXT.muted, ...TABULAR }}>{relativeTime(p.createdAt)}</span>
                </div>
                <span style={{ ...font(700, 14, 1.2, '-0.01em'), color: TEXT.strong }}>{p.text}</span>
              </div>
            ),
          }
        })
        const at = (e: TimelineEntry) => (e.createdAt ? Date.parse(e.createdAt) : NaN)
        const merged = [...postEntries, ...timelineEntries].sort((a, b) => {
          const ta = at(a), tb = at(b)
          if (Number.isNaN(ta) && Number.isNaN(tb)) return 0
          if (Number.isNaN(ta)) return 1          // undated sinks
          if (Number.isNaN(tb)) return -1
          return tb - ta                          // newest first, like the feed already was
        })
        return merged.map(e => <React.Fragment key={e.key}>{e.node}</React.Fragment>)
      })()}
      {/* ⚠️ THE EMPTY STATE BELONGS HERE, not in the caller's extraEntries, because
          this is the only place that can see BOTH halves of the feed. It used to sit
          in gameBleachers gated on the rail entries alone, so posting a shout left
          "Nobody has said anything yet." sitting underneath the shout you had just
          made: `posts` had grown, and the condition could not see it. */}
      {posts.length === 0 && !hasExtraEntries && (
        <div style={{
          padding: '28px 16px', textAlign: 'center',
          ...font(400, 12, 1.5), color: TEXT.muted,
        }}>
          Nobody has said anything yet.
        </div>
      )}
      </div>
    </div>
  )
}

export default GameFeedComposer
