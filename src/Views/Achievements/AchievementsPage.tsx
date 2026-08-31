import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAchievements } from '@/contexts/AchievementsContext'
import { useAuth } from '@/contexts/AuthContext'
import type { Achievement, PendingReward } from '@/types/achievements'
import PackOpeningModal from '@/Components/Cards/PackOpeningModal'
import type { CardData } from '@/Components/Cards/TradingCard'
import { BG, BORDER, TEXT, ACCENT, font, TABULAR } from '@/Components/Shell/tokens'
import { FloobitSymbol } from '@/Components/Icons/Floobit'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

type OnboardingAction =
  | { kind: 'route'; path: string; afterEvent?: string; afterScrollTo?: string }
  | { kind: 'event'; name: string }

interface OnboardingHint {
  steps: string[]
  action: OnboardingAction
  actionLabel: string
}

/**
 * ⚠️ THESE GO STALE SILENTLY. They name pages, panels, prices and slot counts, and
 * nothing fails when one moves — a reader just follows an instruction to somewhere that
 * no longer exists. Checked against the app 2026-08-10, when every one of them was
 * wrong in some way: pick-em had moved off the dashboard to its own page, the Front
 * Office had been merged into the team page, the Humble Pack had been 40F for a while,
 * the lineup had grown from five slots to six plus FLEX, and swapping teams was no
 * longer once a season. Two of the actions fired events with no listener left
 * (`show-pickem`, `show-markets`) and one scrolled to an anchor that had been deleted
 * (`team-funding-contribute`), so the buttons did nothing at all.
 *
 * If you move a page or rename a panel, this map is part of the change.
 */
const ONBOARDING_HINTS: Record<string, OnboardingHint | ((user: any) => OnboardingHint | null)> = {
  rookie: {
    steps: [
      'Click the button below, or use the search icon in the header and go to Teams.',
      'Browse the 32 teams and pick the one you want to follow.',
      'Confirm. You can switch freely until week 1 kicks off; after that a switch takes effect next season.',
    ],
    action: { kind: 'event', name: 'floosball:show-favorite-team-picker' },
    actionLabel: 'Pick a Team',
  },
  prognosticator: {
    steps: [
      'Open the Prognostications page.',
      "Pick a winner for any of this week's games.",
      'Correct picks earn Floobits when the game goes final, and more for backing an underdog.',
    ],
    action: { kind: 'route', path: '/prognostications' },
    actionLabel: 'Open Prognostications',
  },
  pack_popper: {
    steps: [
      'Click your Floobits balance in the header to open the Shop.',
      'Pick a pack you can afford. The Humble Pack is the cheapest at 40F.',
      'Open it, then keep the cards you want from the ones it reveals.',
    ],
    action: { kind: 'event', name: 'floosball:show-shop' },
    actionLabel: 'Open the Shop',
  },
  deck_builder: {
    steps: [
      'Open the Fantasy page and find your lineup at the top.',
      'Click an empty slot to pick a card from your collection.',
      'Your equipped cards ARE your fantasy lineup: six slots (QB, RB, WR, WR, TE, K), and they score for you every week.',
    ],
    action: { kind: 'route', path: '/fantasy', afterScrollTo: '[data-tour="fantasy-cards"]' },
    actionLabel: 'Go to Fantasy',
  },
  patron: (user: any) => ({
    steps: user?.favoriteTeamId
      ? [
          "Open your team's page.",
          'Find the Front Office band and its Facilities.',
          'Put any amount of Floobits in. Funding raises your team\'s market tier, which feeds player development, morale and fatigue.',
        ]
      : [
          'You need a team first. Pick one, then come back.',
          "Open your team's page and find the Front Office band.",
          'Contribute any amount of Floobits to finish this goal.',
        ],
    action: user?.favoriteTeamId
      ? { kind: 'route', path: `/team/${user.favoriteTeamId}` }
      : { kind: 'event', name: 'floosball:show-favorite-team-picker' },
    actionLabel: user?.favoriteTeamId ? 'Go to My Team' : 'Pick a Team First',
  }),
}

/**
 * Reward pack slugs to their shop names.
 *
 * ⚠️ There is NO "proper" pack and there has not been for some time; the map carried
 * one anyway. It never showed, because nothing grants that slug — which is exactly why
 * it survived. Unknown slugs fall through to the raw slug, so a pack added later
 * renders readably rather than blank, and looks obviously unlabeled to whoever adds it.
 */
const packLabel = (slug: string) => {
  const map: Record<string, string> = {
    humble: 'Humble Pack',
    grand: 'Grand Pack',
    exquisite: 'Exquisite Pack',
    starter: 'Starter Pack',
  }
  return map[slug] ?? slug
}

// Pack accent colors — mirror CardShop/ShopModal so chips match the shop UI
const packColor = (slug: string) => {
  const map: Record<string, string> = {
    humble: '#94a3b8',     // slate
    proper: '#c4b5fd',     // lavender
    grand: '#f472b6',      // pink
    exquisite: '#67e8f9',  // cyan
  }
  return map[slug] ?? '#a78bfa'
}

// Derive family name from an achievement key by stripping the trailing roman-numeral tier.
// "banner_week_iii" → "banner_week", "sharp" → "sharp"
const familyOf = (key: string) => key.replace(/_[ivx]+$/i, '')

// Display labels per family (when a family has 2+ tiers, we show the family name as a sub-header).
const FAMILY_LABELS: Record<string, string> = {
  dedicated: 'Dedicated',
  banner_week: 'Banner Week',
  racket: 'Racket',
  dynamo: 'Dynamo',
  oracle: 'Oracle',
  magnate: 'Magnate',
  tycoon: 'Tycoon',
  podium: 'Podium',
  pundit: 'Pundit',
  bracketeer: 'Bracketeer',
  benefactor: 'Benefactor',
  compound: 'Compound',
  artificer: 'Artificer',
  ice_cold: 'Ice Cold',
  archivist: 'Archivist',
}

// Fallback for any family without an explicit label: title-case the key.
// "ice_cold" → "Ice Cold", "artificer" → "Artificer".
const prettifyFamily = (fam: string) =>
  fam.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

interface GuidanceGroup {
  family: string         // "dedicated" | ... | "singles"
  label: string | null   // null for singles
  items: Achievement[]
}

const groupByFamily = (list: Achievement[]): GuidanceGroup[] => {
  // Bucket by family key
  const byFamily = new Map<string, Achievement[]>()
  for (const a of list) {
    const fam = familyOf(a.key)
    if (!byFamily.has(fam)) byFamily.set(fam, [])
    byFamily.get(fam)!.push(a)
  }
  // Singles get merged into a single group preserving their sort order
  const singles: Achievement[] = []
  const families: GuidanceGroup[] = []
  // Preserve the ORIGINAL list order so families appear roughly as seeded
  const seen = new Set<string>()
  for (const a of list) {
    const fam = familyOf(a.key)
    if (seen.has(fam)) continue
    seen.add(fam)
    const items = byFamily.get(fam)!
    if (items.length === 1) {
      singles.push(items[0])
    } else {
      families.push({ family: fam, label: FAMILY_LABELS[fam] ?? prettifyFamily(fam), items })
    }
  }
  const out: GuidanceGroup[] = []
  if (singles.length) out.push({ family: 'singles', label: null, items: singles })
  out.push(...families)
  return out
}

const powerupLabel = (slug: string) =>
  slug === 'random' ? 'Random Powerup' : slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

/**
 * ⚠️ A FIXED COLUMN COUNT, not `auto-fill`. The cards carry their reward chips pinned to
 * the bottom, and equal-width columns are what line those rows up across the grid; an
 * auto-fill track reflows to whatever fits and the chips stop agreeing.
 *
 * ⚠️ Rows DO stretch (no `align-items: start`), and that only became right once
 * `SplitGrid` separated finished cards from active ones. While the two were mixed,
 * stretching gave a two-line completed card the height of a step-bearing neighbour —
 * so the grid was set to `start` and the rows came out ragged instead. Split, each grid
 * holds cards of one rough shape, so stretching equalises them and the reward chips
 * (pinned with `margin-top: auto`) line up across the row, which is what the fixed
 * column count is for.
 */
const ACH_GRID: React.CSSProperties = {
  display: 'grid', gap: '14px',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
}

/**
 * Active cards, then finished ones, in two grids rather than one.
 *
 * ⚠️ THE MIX IS WHAT MADE THE SIZES RAGGED (owner, 2026-08-23). An active card carries a
 * HOW TO COMPLETE step list, a progress bar and an action plate; a finished one is a name,
 * a line of description and its reward. Interleaved in a single grid those sit in the same
 * ROW, so either the short card stretches to a tall neighbour (dead space inside a card)
 * or it does not and the row ends ragged — and the old page picked the third option, a
 * fixed 340px height that CLIPPED anything longer.
 *
 * Splitting them means each grid holds cards of roughly one shape, so the rows equalise on
 * their own and nothing has to be pinned to a magic number. It also puts what you can still
 * do above what you have already done, which is the order you read the page in.
 */
/**
 * Split a Season Goals / Collection list into active and finished nodes.
 *
 * A tiered FAMILY counts as finished only when every tier is — a family sitting on tier
 * 2 of 4 is still something you are working on, and its card is the tall kind (progress
 * bar, next-tier reward), so it belongs with the active half.
 */
function splitGroups(groups: GuidanceGroup[]): { active: React.ReactNode[]; completed: React.ReactNode[] } {
  const active: React.ReactNode[] = []
  const completed: React.ReactNode[] = []
  for (const group of groups) {
    if (group.family === 'singles') {
      for (const a of group.items) {
        (a.completedAt != null ? completed : active).push(
          <AchievementRow key={a.id} achievement={a} />)
      }
      continue
    }
    const allDone = group.items.every(t => t.completedAt != null)
    ;(allDone ? completed : active).push(
      <TieredFamilySummary key={group.family} group={group} />)
  }
  return { active, completed }
}

const SplitGrid: React.FC<{
  active: React.ReactNode[]
  completed: React.ReactNode[]
  /** What the finished half is called — "COMPLETED" for goals, "LOCKED" for secrets. */
  doneLabel?: string
  columns?: number
}> = ({ active, completed, doneLabel = 'COMPLETED', columns }) => {
  const grid = columns
    ? { ...ACH_GRID, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
    : ACH_GRID
  return (
    <>
      {active.length > 0 && <div style={grid}>{active}</div>}
      {completed.length > 0 && (
        <>
          {active.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              margin: '18px 0 12px',
            }}>
              <span style={{ ...font(700, 11, 1, '0.1em'), color: TEXT.muted }}>{doneLabel}</span>
              <span style={{ flex: 1, height: '1px', backgroundColor: BORDER.hairline }} />
              <span style={{ ...font(700, 11, 1, '0.1em'), ...TABULAR, color: TEXT.muted }}>
                {completed.length}
              </span>
            </div>
          )}
          <div style={grid}>{completed}</div>
        </>
      )}
    </>
  )
}

const AchievementsPage: React.FC = () => {
  const {
    achievements, pendingRewards, currentSeason, currentWeek,
    loading, claimReward, deferReward, convertReward, refetch,
  } = useAchievements()

  // ⚠️ Pull fresh progress on arrival. The context fetches once when the app mounts and
  // then only on an `achievement_unlocked` event — but PROGRESS moving (Dedicated going
  // 5 -> 6 as you make picks) completes nothing, so no event fires and the page showed
  // whatever was true when the session started. Reported as having to refresh the browser
  // to watch a counter move. Guarded with a ref so React's development double-mount does
  // not fire two requests on every visit.
  const refreshedOnMount = useRef(false)
  useEffect(() => {
    if (refreshedOnMount.current) return
    refreshedOnMount.current = true
    refetch()
  }, [refetch])
  const { user, getToken } = useAuth()
  const navigate = useNavigate()
  // Achievement-claimed packs go through the same reveal+select flow as
  // purchased packs (pendingId set means user must pick which to keep).
  const [openedPack, setOpenedPack] = useState<{
    packName: string
    cards: CardData[]
    pendingId?: number
    cardsKept?: number
  } | null>(null)

  const runAction = (action: OnboardingAction) => {
    if (action.kind === 'event') {
      window.dispatchEvent(new Event(action.name))
      return
    }
    navigate(action.path)
    // After navigating, wait for the target component to mount, then trigger
    // any tab-switch event. Scroll runs in a second tick so the tab content
    // has time to render before we try to find the element.
    if (action.afterEvent || action.afterScrollTo) {
      setTimeout(() => {
        if (action.afterEvent) {
          window.dispatchEvent(new Event(action.afterEvent))
        }
        if (action.afterScrollTo) {
          setTimeout(() => {
            const el = document.querySelector(action.afterScrollTo!) as HTMLElement | null
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 100)
        }
      }, 150)
    }
  }

  const getHint = (key: string): OnboardingHint | null => {
    const entry = ONBOARDING_HINTS[key]
    if (!entry) return null
    return typeof entry === 'function' ? entry(user) : entry
  }

  const onboarding = achievements.filter(a => a.category === 'onboarding')
  const guidance = achievements.filter(a => a.category === 'guidance')
  const collection = achievements.filter(a => a.category === 'collection')
  const secrets = achievements.filter(a => a.category === 'secret')
  const completedCount = (list: Achievement[]) => list.filter(a => a.completedAt != null).length

  // Group guidance achievements by family (strip trailing roman numerals from key).
  // Singles collapse into a "Milestones" bucket; multi-tier families get their own bucket.
  const guidanceGroups = groupByFamily(guidance)
  const collectionGroups = groupByFamily(collection)

  // The one page-level total. It replaces nothing — the sections each carry their own
  // count, and none of them answered "how far through am I".
  const doneAll = achievements.filter(a => a.completedAt != null).length

  if (loading) {
    return (
      <div style={{ padding: '32px', color: TEXT.muted, textAlign: 'center', ...font(400, 13) }}>
        Loading achievements...
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: BG.shell, color: TEXT.body, minHeight: '100%' }}>
      {/* ── PAGE HEAD ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: '16px', padding: '19px 24px 17px', borderBottom: `1px solid ${BORDER.hairline}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '11px', minWidth: 0 }}>
          <h1 style={{ ...font(800, 24, 1, '-0.025em'), color: TEXT.primary, margin: 0 }}>Achievements</h1>
          <span style={{ ...font(400, 13), color: TEXT.muted, whiteSpace: 'nowrap' }}>
            {currentSeason > 0 ? `Season ${currentSeason}${currentWeek > 0 ? ` · Week ${currentWeek}` : ''}` : 'Off-season'}
          </span>
        </div>
        {achievements.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
            backgroundColor: BG.card, border: `1px solid ${BORDER.hairline}`, padding: '7px 11px',
          }}>
            <span style={{ ...font(700, 11, 1, '0.1em'), color: TEXT.muted }}>COMPLETE</span>
            <span style={{ ...font(800, 13), ...TABULAR, color: TEXT.strong }}>
              {doneAll} / {achievements.length}
            </span>
            <span style={{ width: '64px', height: '5px', backgroundColor: BG.shell, display: 'block' }}>
              <span style={{
                display: 'block', height: '100%', backgroundColor: ACCENT.info,
                width: `${Math.round((doneAll / Math.max(1, achievements.length)) * 100)}%`,
              }} />
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '24px 24px 40px', display: 'flex', flexDirection: 'column', gap: '34px' }}>

        {pendingRewards.length > 0 && (
          <PendingRewardsSection
            rewards={pendingRewards}
            achievements={achievements}
            currentSeason={currentSeason}
            onClaim={claimReward}
            onDefer={deferReward}
            onConvert={convertReward}
            onPackOpened={setOpenedPack}
          />
        )}

        {openedPack && (
          <PackOpeningModal
            packName={openedPack.packName}
            cards={openedPack.cards}
            pendingId={openedPack.pendingId}
            cardsKept={openedPack.cardsKept}
            onConfirmSelection={openedPack.pendingId ? async (keptIndices) => {
              const tok = await getToken()
              if (!tok) return
              try {
                const res = await fetch(`${API_BASE}/packs/select`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                  body: JSON.stringify({ pendingId: openedPack.pendingId, keptIndices }),
                })
                if (!res.ok) {
                  const err = await res.json().catch(() => ({ detail: 'Failed to confirm selection' }))
                  alert(err.detail || 'Failed to confirm selection')
                  return
                }
              } catch {
                alert('Failed to confirm selection')
                return
              }
              setOpenedPack(null)
            } : undefined}
            onClose={() => setOpenedPack(null)}
          />
        )}

        <Section
          title="Rookie Goals"
          subtitle="One-time milestones"
          completed={completedCount(onboarding)}
          total={onboarding.length}
          storageKey="rookie-goals"
          customLayout
        >
          <SplitGrid
            active={onboarding.filter(a => a.completedAt == null).map(a => (
              <AchievementRow key={a.id} achievement={a} hint={getHint(a.key)} onAction={runAction} />
            ))}
            completed={onboarding.filter(a => a.completedAt != null).map(a => (
              <AchievementRow key={a.id} achievement={a} />
            ))}
          />
        </Section>

        <Section
          title="Season Goals"
          subtitle="Re-earn each season"
          completed={completedCount(guidance)}
          total={guidance.length}
          storageKey="season-goals"
          customLayout
        >
          <SplitGrid {...splitGroups(guidanceGroups)} />
        </Section>

        {collection.length > 0 && (
          <Section
            title="Collection"
            subtitle="Permanent Vault goals"
            completed={completedCount(collection)}
            total={collection.length}
            storageKey="collection-goals"
            customLayout
          >
            <SplitGrid {...splitGroups(collectionGroups)} />
          </Section>
        )}

        {secrets.length > 0 && (
          <Section
            title="Secrets"
            subtitle="Hidden until unlocked"
            completed={completedCount(secrets)}
            total={secrets.length}
            storageKey="secrets"
            customLayout
          >
            <SplitGrid
              columns={4}
              doneLabel="STILL HIDDEN"
              active={secrets.filter(a => a.completedAt != null).map(a => (
                <SecretRow key={a.id} achievement={a} />
              ))}
              completed={secrets.filter(a => a.completedAt == null).map(a => (
                <SecretRow key={a.id} achievement={a} />
              ))}
            />
          </Section>
        )}
      </div>
    </div>
  )
}

const Section: React.FC<{
  title: string
  subtitle?: string
  completed: number
  total: number
  storageKey: string
  customLayout?: boolean   // when true, children manage their own layout (skip the default grid)
  /** Column count for the default grid. Secrets run four-up: a masked card is two lines,
   *  so three columns leave it looking like a gap rather than a row. */
  columns?: number
  children: React.ReactNode
}> = ({ title, subtitle, completed, total, storageKey, customLayout, columns, children }) => {
  const storeId = `achievements-section:${storageKey}`
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(storeId) === '1' } catch { return false }
  })
  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem(storeId, next ? '1' : '0') } catch {}
      return next
    })
  }
  const allDone = total > 0 && completed === total

  return (
    <section>
      <button
        onClick={toggle}
        aria-expanded={!collapsed}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '0 0 9px 0', marginBottom: '13px',
          borderBottom: `1px solid ${BORDER.hairline}`,
          background: 'none', border: 'none', borderBottomWidth: '1px',
          borderBottomStyle: 'solid', borderBottomColor: BORDER.hairline,
          cursor: 'pointer', color: TEXT.body, fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{
          width: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: TEXT.muted, ...font(700, 15), ...TABULAR, flexShrink: 0,
        }}>
          {collapsed ? '+' : '−'}
        </span>
        <h2 style={{ ...font(800, 13, 1, '0.12em'), color: TEXT.strong, margin: 0, textTransform: 'uppercase' }}>{title}</h2>
        <span style={{
          ...font(700, 11, 1, '0.1em'), ...TABULAR,
          color: allDone ? ACCENT.warning : TEXT.muted,
          backgroundColor: BG.panel,
          border: `1px solid ${allDone ? 'rgba(245,158,11,0.4)' : BORDER.hairline}`,
          padding: '3px 7px',
        }}>
          {completed} / {total}
        </span>
        {subtitle && <span style={{ ...font(400, 12), color: TEXT.muted }}>{subtitle}</span>}
      </button>
      {!collapsed && (
        customLayout ? <>{children}</> : (
          <div style={columns
            ? { ...ACH_GRID, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
            : ACH_GRID}>{children}</div>
        )
      )}
    </section>
  )
}

// Family sub-group within Season Goals: optional header for tiered families + grid of achievements.
// ── Family rendering ────────────────────────────────────────────────────────
// Singles and tiered families render differently. Tiered families collapse into
// one summary card by default (tier dots + progress toward next tier + next
// reward) and expand to show all tier cards on click.

const FamilyGroup: React.FC<{ group: GuidanceGroup }> = ({ group }) => {
  // Singles bucket: grid of individual cards, no family header
  if (group.family === 'singles') {
    return (
      <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', alignItems: 'start' }}>
        {group.items.map(a => <AchievementRow key={a.id} achievement={a} />)}
      </div>
    )
  }
  // Tiered family: summary card (click to expand)
  return <TieredFamilySummary group={group} />
}

// Format a progress value for display, aware of the Compound family's
// mult×100 encoding (shown as e.g. "1.20x").
const formatFamilyValue = (family: string, n: number): string => {
  if (family === 'compound') return `${(n / 100).toFixed(2)}x`
  return n.toLocaleString()
}

const TieredFamilySummary: React.FC<{ group: GuidanceGroup }> = ({ group }) => {
  // Sort tiers by target ascending and find state
  const tiers = [...group.items].sort((a, b) => a.target - b.target)
  const total = tiers.length
  const completed = tiers.filter(t => t.completedAt != null).length
  const allDone = completed === total
  const nextTier = tiers.find(t => t.completedAt == null) ?? null
  // Progress toward next tier (UserAchievement.progress is the live metric value
  // clamped to target; for an incomplete tier it reflects the current real value).
  const currentValue = nextTier ? nextTier.progress : (tiers[tiers.length - 1]?.target ?? 0)
  const nextTarget = nextTier?.target ?? 0
  const pct = nextTier && nextTarget > 0
    ? Math.min(100, Math.round((currentValue / nextTarget) * 100))
    : 100

  const nextRewardChips: React.ReactNode = nextTier ? (() => {
    const cfg = nextTier.rewardConfig || {}
    const floobits = cfg.floobits ?? 0
    const packs = cfg.packs ?? []
    const powerups = cfg.powerups ?? []
    const chips: React.ReactNode[] = []
    if (floobits > 0) chips.push(<RewardChip key="f" text={<><FloobitSymbol size={11} color="#fbbf24" />{floobits}</>} color="#fbbf24" />)
    packs.forEach((p, i) => chips.push(<RewardChip key={`p${i}`} text={packLabel(p)} color={packColor(p)} />))
    powerups.forEach((p, i) => chips.push(<RewardChip key={`u${i}`} text={powerupLabel(p)} color="#06b6d4" />))
    // marginTop: auto pushes the reward chips to the bottom of the flex column
    // so short-content summary cards don't have a big empty zone below them.
    return chips.length
      ? (
        <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
          <RewardLabel text="NEXT TIER" />
          {chips}
        </div>
      )
      : null
  })() : null

  const label = group.label ?? group.family
  const description = nextTier?.description ?? tiers[0]?.description ?? ''

  return (
    <div style={{
      backgroundColor: BG.card,
      border: `1px solid ${allDone ? 'rgba(245,158,11,0.5)' : BORDER.hairline}`,
      padding: '15px 16px',
      // ⚠️ NO FIXED HEIGHT. It was 170px to match AchievementRow's; equal heights now come
      // from the grid row, and ACH_GRID's `align-items: start` keeps a short card short.
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      {/* Header: name + tier squares + count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px', minWidth: 0 }}>
          <span style={{ ...font(700, 15), color: allDone ? ACCENT.warning : TEXT.strong }}>
            {label}
          </span>
          <span style={{
            ...font(700, 12), ...TABULAR,
            color: allDone ? ACCENT.warning : TEXT.muted,
          }}>
            {completed}/{total}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
          {tiers.map((t, i) => (
            <span
              key={t.id}
              title={`Tier ${['I','II','III','IV','V','VI'][i] ?? i + 1}`}
              style={{
                width: '9px', height: '9px',
                backgroundColor: t.completedAt != null ? ACCENT.warning : BG.shell,
                border: t.completedAt != null ? 'none' : `1px solid ${BORDER.raised}`,
                display: 'inline-block',
              }}
            />
          ))}
        </div>
      </div>

      {/* Next tier progress + reward, or "all complete" */}
      {allDone ? (
        <div style={{ ...font(700, 13), color: ACCENT.warning }}>
          All tiers complete
        </div>
      ) : (
        <>
          <div style={{ ...font(400, 13, 1.5), color: TEXT.secondary }}>
            {description}
          </div>
          <div>
            <div style={{ height: '6px', backgroundColor: BG.shell, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: ACCENT.info, transition: 'width 0.3s' }} />
            </div>
            <div style={{
              ...font(700, 11, 1, '0.05em'), color: TEXT.muted, marginTop: '6px',
              ...TABULAR, display: 'flex', justifyContent: 'space-between', gap: '10px',
            }}>
              <span>{formatFamilyValue(group.family, currentValue)} / {formatFamilyValue(group.family, nextTarget)}</span>
              <span>NEXT: TIER {['I','II','III','IV','V','VI'][completed] ?? ''}</span>
            </div>
          </div>
          {nextRewardChips}
        </>
      )}
    </div>
  )
}

const AchievementRow: React.FC<{
  achievement: Achievement
  hint?: OnboardingHint | null
  onAction?: (action: OnboardingAction) => void
}> = ({ achievement: a, hint, onAction }) => {
  const complete = a.completedAt != null
  const pct = a.target > 0 ? Math.min(100, Math.round((a.progress / a.target) * 100)) : 0
  const floobits = a.rewardConfig.floobits ?? 0
  const packs = a.rewardConfig.packs ?? []
  const powerups = a.rewardConfig.powerups ?? []

  return (
    <div style={{
      backgroundColor: BG.card,
      border: `1px solid ${complete ? 'rgba(245,158,11,0.5)' : BORDER.hairline}`,
      padding: '15px 16px',
      // ⚠️ NO FIXED HEIGHT. This carried 340px for a rookie goal and 170px otherwise, so
      // a completed two-line card kept a step list's worth of dead space and anything
      // longer was CLIPPED by the `overflow: hidden` that went with it. Rows equalise
      // through the grid now; ACH_GRID's `align-items: start` keeps short cards short.
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...font(700, 15), color: complete ? ACCENT.warning : TEXT.strong }}>
            {a.name}
          </div>
          <div style={{ ...font(400, 13, 1.5), color: TEXT.secondary, marginTop: '6px' }}>
            {a.description}
          </div>
        </div>
        {complete && (
          <span style={{
            flexShrink: 0, ...font(700, 11, 1, '0.1em'),
            color: ACCENT.warning, backgroundColor: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.4)', padding: '2px 6px',
          }}>
            DONE
          </span>
        )}
      </div>

      {/* Progress */}
      {!complete && a.target > 1 && (
        <div style={{ marginTop: '11px' }}>
          <div style={{ height: '6px', backgroundColor: BG.shell, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: ACCENT.info, transition: 'width 0.3s' }} />
          </div>
          <div style={{ ...font(700, 11, 1, '0.05em'), color: TEXT.muted, marginTop: '6px', ...TABULAR }}>
            {a.progress} / {a.target}
          </div>
        </div>
      )}

      {/* Rewards — pushed to the bottom so short cards don't have a huge dead zone */}
      {(floobits > 0 || packs.length > 0 || powerups.length > 0) && (
        <div style={{ marginTop: 'auto', paddingTop: '12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
          <RewardLabel />
          {floobits > 0 && (
            <RewardChip text={<><FloobitSymbol size={11} color="#fbbf24" />{floobits}</>} color="#fbbf24" />
          )}
          {packs.map((p, i) => (
            <RewardChip key={`pack-${i}`} text={packLabel(p)} color={packColor(p)} />
          ))}
          {powerups.map((p, i) => (
            <RewardChip key={`pu-${i}`} text={powerupLabel(p)} color="#06b6d4" />
          ))}
        </div>
      )}

      {/* Hand-holding steps for incomplete rookie goals */}
      {!complete && hint && onAction && (
        <div style={{
          marginTop: '13px', paddingTop: '11px',
          borderTop: `1px solid ${BORDER.hairline}`,
          display: 'flex', flexDirection: 'column', gap: '9px',
        }}>
          <div style={{ ...font(700, 11, 1, '0.1em'), color: TEXT.muted }}>
            HOW TO COMPLETE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {hint.steps.map((step, i) => (
              <div key={i} style={{
                display: 'flex', gap: '8px',
                ...font(400, 13, 1.5), color: TEXT.secondary,
              }}>
                {/* ⚠️ The step number is READABLE TEXT and bottoms out at `muted`. It was
                    `#64748b`, which is a border value — one of the two contrast failures
                    the restyle was called for. */}
                <span style={{ ...TABULAR, color: TEXT.muted, flexShrink: 0 }}>{i + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onAction(hint.action)}
            style={{
              alignSelf: 'flex-start',
              ...font(700, 11, 1, '0.1em'),
              color: ACCENT.info, backgroundColor: 'rgba(56,189,248,0.10)',
              border: '1px solid rgba(56,189,248,0.34)',
              padding: '7px 11px', cursor: 'pointer',
            }}
          >
            {hint.actionLabel.toUpperCase()} →
          </button>
        </div>
      )}
    </div>
  )
}

// Secret row — masked when locked (name "???", description hidden), full reveal when unlocked.
const SecretRow: React.FC<{ achievement: Achievement }> = ({ achievement: a }) => {
  const unlocked = a.completedAt != null
  const floobits = a.rewardConfig.floobits ?? 0
  const packs = a.rewardConfig.packs ?? []
  const powerups = a.rewardConfig.powerups ?? []

  return (
    <div style={{
      // A masked secret is a DIFFERENT KIND of card, not a dimmed one: its own darker
      // field and a dashed border say "nothing here yet" without an opacity that also
      // takes the text below the contrast floor.
      backgroundColor: unlocked ? BG.card : '#101a29',
      border: unlocked ? '1px solid rgba(245,158,11,0.5)' : `1px dashed ${'#26313f'}`,
      padding: '15px 16px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            ...font(700, 15, 1, unlocked ? undefined : '0.16em'),
            color: unlocked ? ACCENT.warning : TEXT.muted,
          }}>
            {unlocked ? a.name : '? ? ?'}
          </div>
          <div style={{ ...font(400, 13, 1.5), color: TEXT.muted, marginTop: '6px' }}>
            {unlocked ? a.description : 'Hidden until unlocked'}
          </div>
        </div>
        {unlocked && (
          <span style={{
            flexShrink: 0, ...font(700, 11, 1, '0.1em'),
            color: ACCENT.warning, backgroundColor: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.4)', padding: '2px 6px',
          }}>
            DONE
          </span>
        )}
      </div>
      {unlocked && (floobits > 0 || packs.length > 0 || powerups.length > 0) && (
        <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
          <RewardLabel />
          {floobits > 0 && <RewardChip text={<><FloobitSymbol size={11} color="#fbbf24" />{floobits}</>} color="#fbbf24" />}
          {packs.map((p, i) => (
            <RewardChip key={`pack-${i}`} text={packLabel(p)} color={packColor(p)} />
          ))}
          {powerups.map((p, i) => (
            <RewardChip key={`pu-${i}`} text={powerupLabel(p)} color="#06b6d4" />
          ))}
        </div>
      )}
    </div>
  )
}

const RewardChip: React.FC<{ text: React.ReactNode; color: string }> = ({ text, color }) => (
  <span style={{
    ...font(700, 12), color,
    backgroundColor: `${color}20`,
    padding: '3px 8px', whiteSpace: 'nowrap',
  }}>
    {text}
  </span>
)

/** The prefix in front of a reward chip row. `text` so a tiered card can say what the
 *  chips are for ("NEXT TIER") without a second component saying the same thing. */
const RewardLabel: React.FC<{ text?: string }> = ({ text = 'REWARDS' }) => (
  <span style={{
    ...font(700, 11, 1, '0.1em'), color: TEXT.muted, marginRight: '2px',
  }}>
    {text}
  </span>
)

const PendingRewardsSection: React.FC<{
  rewards: PendingReward[]
  achievements: Achievement[]
  currentSeason: number
  onClaim: (id: number) => Promise<{
    kind: string
    packName?: string
    // Legacy free-grant path (no longer used for achievements but supported for compat)
    cards?: any[]
    // Reveal+select flow (new): pendingId means user must select keeps
    pendingId?: number
    revealed?: any[]
    cardsKept?: number
    cardsPerPack?: number
  } | null>
  onDefer: (id: number) => Promise<void>
  onConvert: (id: number) => Promise<{
    kind: 'floobits'
    floobits: number
    packName: string
  } | null>
  onPackOpened: (pack: {
    packName: string
    cards: CardData[]
    pendingId?: number
    cardsKept?: number
  }) => void
}> = ({ rewards, achievements, currentSeason, onClaim, onDefer, onConvert, onPackOpened }) => {
  // Soft stash cap surfaced on the UI. Backend allows packs to queue
  // beyond this — the Convert button appears on every pending pack
  // row once the user is at or above this count so they can choose
  // to trade a stashed pack for Floobits instead of opening it.
  const STASH_LIMIT = 1
  // "Stash full" means the user is already HOLDING the cap's worth of packs
  // for a future season — i.e. deferred rows (deferUntilSeason set). It must
  // NOT count packs that are merely pending-and-openable this season: a user
  // who earned two packs but stashed neither hasn't stashed anything, so the
  // stash isn't full and "Save for Next Season" must stay available. Counting
  // all pending packs was the bug ("stash full" with nothing stashed).
  const stashedPackCount = rewards.filter(r => r.kind === 'pack' && r.deferUntilSeason != null).length
  const stashFull = stashedPackCount >= STASH_LIMIT
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClaim = async (r: PendingReward) => {
    setBusyId(r.id)
    setError(null)
    try {
      const result = await onClaim(r.id)
      if (!result || result.kind !== 'pack') return
      // Reveal+select shape (achievement-granted packs use this now)
      if (result.pendingId && result.revealed && result.revealed.length > 0) {
        onPackOpened({
          packName: result.packName || packLabel(r.slug),
          cards: result.revealed as CardData[],
          pendingId: result.pendingId,
          cardsKept: result.cardsKept,
        })
        return
      }
      // Legacy free-grant shape (compatibility)
      if (result.cards && result.cards.length > 0) {
        onPackOpened({
          packName: result.packName || packLabel(r.slug),
          cards: result.cards as CardData[],
        })
      }
    } catch (e: any) {
      setError(e.message || 'Failed to claim')
    } finally {
      setBusyId(null)
    }
  }

  const handleDefer = async (r: PendingReward) => {
    setBusyId(r.id)
    setError(null)
    try {
      await onDefer(r.id)
    } catch (e: any) {
      setError(e.message || 'Failed to defer')
    } finally {
      setBusyId(null)
    }
  }

  const handleConvert = async (r: PendingReward) => {
    setBusyId(r.id)
    setError(null)
    try {
      await onConvert(r.id)
    } catch (e: any) {
      setError(e.message || 'Failed to convert')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section style={{
      backgroundColor: BG.card,
      border: '1px solid rgba(245,158,11,0.5)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: BG.panel, borderBottom: `1px solid ${BORDER.hairline}`,
        padding: '9px 12px',
      }}>
        <h2 style={{ ...font(800, 11, 1, '0.12em'), color: '#fbbf24', margin: 0 }}>UNCLAIMED REWARDS</h2>
        <span style={{ ...font(700, 11, 1, '0.1em'), ...TABULAR, color: TEXT.muted }}>
          {rewards.length} WAITING
        </span>
      </div>

      {error && (
        <div style={{ ...font(400, 12), color: ACCENT.negative, padding: '9px 12px 0' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', padding: '11px 12px 12px' }}>
        {rewards.map(r => {
          const busy = busyId === r.id
          const deferred = r.deferUntilSeason != null
          // A deferred reward can be claimed once the target season has
          // arrived. Previously used `!r.canDefer` which is always true for
          // already-deferred rewards — meaning the Claim button stayed
          // disabled even after the target season rolled over.
          const lockedByDefer = deferred && currentSeason > 0 && currentSeason < (r.deferUntilSeason as number)
          const label = r.kind === 'pack' ? packLabel(r.slug) : powerupLabel(r.slug)
          const sourceText = (() => {
            if (!r.source.startsWith('achievement:')) return r.source
            const key = r.source.replace('achievement:', '')
            const ach = achievements.find(a => a.key === key)
            return `Earned from ${ach?.name ?? key.replace(/_/g, ' ')}`
          })()
          return (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 11px',
              backgroundColor: BG.shell,
              border: `1px solid ${BORDER.hairline}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...font(700, 14), color: r.kind === 'pack' ? packColor(r.slug) : '#06b6d4' }}>
                  {label}
                </div>
                <div style={{ ...font(400, 12), color: TEXT.muted, marginTop: '4px' }}>
                  {sourceText}
                  {deferred && (
                    <span style={{ color: ACCENT.warning, marginLeft: '6px' }}>
                      · Held for season {r.deferUntilSeason}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {r.canDefer && !deferred && !(r.kind === 'pack' && stashFull) && (
                  <button
                    onClick={() => handleDefer(r)}
                    disabled={busy}
                    style={{
                      ...font(700, 11, 1, '0.1em'),
                      color: TEXT.secondary, backgroundColor: 'transparent',
                      border: `1px solid ${BORDER.raised}`,
                      padding: '6px 10px', cursor: busy ? 'default' : 'pointer',
                      opacity: busy ? 0.5 : 1,
                    }}
                  >
                    SAVE FOR NEXT SEASON
                  </button>
                )}
                {r.kind === 'pack' && stashFull && !deferred && (
                  <button
                    onClick={() => handleConvert(r)}
                    disabled={busy || lockedByDefer}
                    title="Convert this pack to Floobits instead of opening it"
                    style={{
                      ...font(700, 11, 1, '0.1em'),
                      color: TEXT.secondary, backgroundColor: 'transparent',
                      border: `1px solid ${BORDER.raised}`,
                      padding: '6px 10px',
                      cursor: busy || lockedByDefer ? 'not-allowed' : 'pointer',
                      opacity: busy || lockedByDefer ? 0.5 : 1,
                    }}
                  >
                    CONVERT TO FLOOBITS
                  </button>
                )}
                <button
                  onClick={() => handleClaim(r)}
                  disabled={busy || lockedByDefer}
                  title={lockedByDefer ? `Available in season ${r.deferUntilSeason}` : undefined}
                  style={{
                    // The one FILLED plate on the page. Everything else is a ghost, so
                    // the thing you came here to do is the thing that reads first.
                    ...font(800, 11, 1, '0.1em'),
                    color: BG.shell, backgroundColor: '#fbbf24',
                    border: 'none',
                    padding: '7px 12px',
                    cursor: busy || lockedByDefer ? 'not-allowed' : 'pointer',
                    opacity: busy || lockedByDefer ? 0.5 : 1,
                  }}
                >
                  {busy ? 'CLAIMING…' : (r.kind === 'pack' && stashFull ? 'OPEN' : 'CLAIM')}
                </button>
              </div>
            </div>
          )
        })}
      </div>

    </section>
  )
}

export default AchievementsPage
