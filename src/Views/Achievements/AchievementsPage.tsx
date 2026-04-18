import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAchievements } from '@/contexts/AchievementsContext'
import { useAuth } from '@/contexts/AuthContext'
import type { Achievement, PendingReward } from '@/types/achievements'
import PackOpeningModal from '@/Components/Cards/PackOpeningModal'
import type { CardData } from '@/Components/Cards/TradingCard'

type OnboardingAction =
  | { kind: 'route'; path: string; afterEvent?: string; afterScrollTo?: string }
  | { kind: 'event'; name: string }

interface OnboardingHint {
  steps: string[]
  action: OnboardingAction
  actionLabel: string
}

const ONBOARDING_HINTS: Record<string, OnboardingHint | ((user: any) => OnboardingHint | null)> = {
  rookie: {
    steps: [
      'Click the button below, or click your user icon in the top-right and choose "Pick a Team".',
      'Browse the 32 franchises and select the one you want to root for.',
      'Confirm your pick. You can swap teams later, but only once per season.',
    ],
    action: { kind: 'event', name: 'floosball:show-favorite-team-picker' },
    actionLabel: 'Pick a Team',
  },
  prognosticator: {
    steps: [
      'Head to the Dashboard and find the Prognosticate panel.',
      'Pick a winner for any one of this week\'s scheduled games.',
      'Correct picks earn you Floobits when the game ends.',
    ],
    action: { kind: 'route', path: '/dashboard', afterEvent: 'floosball:show-pickem' },
    actionLabel: 'Open Dashboard',
  },
  pack_popper: {
    steps: [
      'Click your Floobits balance in the top-right to open the Shop.',
      'Pick a pack tier you can afford. The Humble Pack costs 50F.',
      'Click Open to draw random cards into your collection.',
    ],
    action: { kind: 'event', name: 'floosball:show-shop' },
    actionLabel: 'Open the Shop',
  },
  field_general: {
    steps: [
      'Go to the Fantasy page.',
      'Choose a player for each of the five roster slots (QB, RB, WR, TE, K).',
      'Save the roster to lock in your selections for the season.',
    ],
    action: { kind: 'route', path: '/fantasy', afterScrollTo: '[data-tour="fantasy-roster"]' },
    actionLabel: 'Go to Fantasy',
  },
  deck_builder: {
    steps: [
      'Open the Fantasy page and find the Card Equipment section at the top.',
      'Click one of the five equipment slots to open the card picker.',
      'Pick any card from your collection to equip it for the week.',
    ],
    action: { kind: 'route', path: '/fantasy', afterScrollTo: '[data-tour="fantasy-cards"]' },
    actionLabel: 'Go to Fantasy',
  },
  patron: (user: any) => ({
    steps: user?.favoriteTeamId
      ? [
          'Visit your favorite team\'s page.',
          'Open the Funding tab.',
          'Choose an amount of Floobits to donate. Contributions fund team development and recovery.',
        ]
      : [
          'You need a favorite team first. Pick one before you can contribute.',
          'Once picked, open the Funding tab on their team page.',
          'Donate any amount of Floobits to complete this goal.',
        ],
    action: user?.favoriteTeamId
      ? {
          kind: 'route',
          path: `/team/${user.favoriteTeamId}`,
          afterEvent: 'floosball:show-team-funding',
          afterScrollTo: '[data-tour="team-funding-contribute"]',
        }
      : { kind: 'event', name: 'floosball:show-favorite-team-picker' },
    actionLabel: user?.favoriteTeamId ? 'Visit My Team' : 'Pick a Team First',
  }),
}

const packLabel = (slug: string) => {
  const map: Record<string, string> = {
    humble: 'Humble Pack',
    proper: 'Proper Pack',
    grand: 'Grand Pack',
    exquisite: 'Exquisite Pack',
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
  podium: 'Podium',
  pundit: 'Pundit',
  benefactor: 'Benefactor',
  compound: 'Compound',
}

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
      families.push({ family: fam, label: FAMILY_LABELS[fam] ?? fam, items })
    }
  }
  const out: GuidanceGroup[] = []
  if (singles.length) out.push({ family: 'singles', label: null, items: singles })
  out.push(...families)
  return out
}

const powerupLabel = (slug: string) =>
  slug === 'random' ? 'Random Powerup' : slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const AchievementsPage: React.FC = () => {
  const {
    achievements, pendingRewards, currentSeason, currentWeek,
    loading, claimReward, deferReward,
  } = useAchievements()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [openedPack, setOpenedPack] = useState<{ packName: string; cards: CardData[] } | null>(null)

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
  const secrets = achievements.filter(a => a.category === 'secret')
  const completedCount = (list: Achievement[]) => list.filter(a => a.completedAt != null).length

  // Group guidance achievements by family (strip trailing roman numerals from key).
  // Singles collapse into a "Milestones" bucket; multi-tier families get their own bucket.
  const guidanceGroups = groupByFamily(guidance)

  if (loading) {
    return (
      <div style={{ padding: '32px', color: '#94a3b8', textAlign: 'center' }}>
        Loading achievements...
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#e2e8f0', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Achievements</h1>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            {currentSeason > 0 ? `Season ${currentSeason}${currentWeek > 0 ? ` · Week ${currentWeek}` : ''}` : 'Off-season'}
          </div>
        </div>

        {pendingRewards.length > 0 && (
          <PendingRewardsSection
            rewards={pendingRewards}
            onClaim={claimReward}
            onDefer={deferReward}
            onPackOpened={setOpenedPack}
          />
        )}

        {openedPack && (
          <PackOpeningModal
            packName={openedPack.packName}
            cards={openedPack.cards}
            onClose={() => setOpenedPack(null)}
          />
        )}

        <Section
          title="Rookie Goals"
          subtitle="One-time milestones"
          completed={completedCount(onboarding)}
          total={onboarding.length}
          storageKey="rookie-goals"
        >
          {onboarding.map(a => (
            <AchievementRow
              key={a.id}
              achievement={a}
              hint={getHint(a.key)}
              onAction={runAction}
            />
          ))}
        </Section>

        <Section
          title="Season Goals"
          subtitle="Re-earn each season"
          completed={completedCount(guidance)}
          total={guidance.length}
          storageKey="season-goals"
          customLayout
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {guidanceGroups.map(group => (
              <FamilyGroup key={group.family} group={group} />
            ))}
          </div>
        </Section>

        {secrets.length > 0 && (
          <Section
            title="Secret Achievements"
            subtitle="Hidden until unlocked"
            completed={completedCount(secrets)}
            total={secrets.length}
            storageKey="secrets"
          >
            {secrets.map(a => <SecretRow key={a.id} achievement={a} />)}
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
  children: React.ReactNode
}> = ({ title, subtitle, completed, total, storageKey, customLayout, children }) => {
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
    <section style={{ marginBottom: '28px' }}>
      <button
        onClick={toggle}
        aria-expanded={!collapsed}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 0 12px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#e2e8f0',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <span style={{
          width: '18px',
          height: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: '16px',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}>
          {collapsed ? '+' : '−'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{title}</h2>
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: allDone ? '#f59e0b' : '#cbd5e1',
              backgroundColor: allDone ? 'rgba(245,158,11,0.12)' : 'rgba(148,163,184,0.12)',
              border: `1px solid ${allDone ? 'rgba(245,158,11,0.35)' : 'rgba(148,163,184,0.25)'}`,
              padding: '2px 10px',
              borderRadius: '999px',
              lineHeight: 1.3,
            }}>
              {completed}/{total}
            </span>
          </div>
          {subtitle && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{subtitle}</div>}
        </div>
      </button>
      {!collapsed && (
        customLayout
          ? <>{children}</>
          : (
            <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', alignItems: 'start' }}>
              {children}
            </div>
          )
      )}
    </section>
  )
}

// Family sub-group within Season Goals: optional header for tiered families + grid of achievements.
const FamilyGroup: React.FC<{ group: GuidanceGroup }> = ({ group }) => {
  const completed = group.items.filter(a => a.completedAt != null).length
  const total = group.items.length
  const allDone = completed === total
  return (
    <div>
      {group.label && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '8px', paddingBottom: '6px',
          borderBottom: '1px solid #1e293b',
        }}>
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
            color: '#94a3b8', textTransform: 'uppercase',
          }}>
            {group.label}
          </span>
          <span style={{
            fontSize: '11px', fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: allDone ? '#f59e0b' : '#64748b',
          }}>
            {completed}/{total}
          </span>
        </div>
      )}
      <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', alignItems: 'start' }}>
        {group.items.map(a => <AchievementRow key={a.id} achievement={a} />)}
      </div>
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
      backgroundColor: '#1e2d3d',
      border: complete ? '1px solid #f59e0b' : '1px solid #2a3a4e',
      borderRadius: '8px',
      padding: '14px 16px',
      opacity: complete ? 1 : 0.95,
      minHeight: hint ? '260px' : '170px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: complete ? '#f59e0b' : '#e2e8f0' }}>
            {a.name}
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.45 }}>
            {a.description}
          </div>
        </div>
        {complete && (
          <span style={{
            flexShrink: 0,
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
            color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.12)',
            padding: '3px 6px', borderRadius: '3px',
          }}>
            DONE
          </span>
        )}
      </div>

      {/* Progress */}
      {!complete && a.target > 1 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ height: '8px', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: '#3b82f6', transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {a.progress} / {a.target}
          </div>
        </div>
      )}

      {/* Rewards — pushed to the bottom so short cards don't have a huge dead zone */}
      {(floobits > 0 || packs.length > 0 || powerups.length > 0) && (
        <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {floobits > 0 && (
            <RewardChip text={`+${floobits} Floobits`} color="#fbbf24" />
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
          marginTop: '12px', paddingTop: '10px',
          borderTop: '1px solid #2a3a4e',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
            color: '#94a3b8', textTransform: 'uppercase',
          }}>
            How to complete
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {hint.steps.map((step, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '8px',
                fontSize: '12px',
                color: '#cbd5e1',
                lineHeight: 1.5,
              }}>
                <span style={{ color: '#64748b', flexShrink: 0 }}>-</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onAction(hint.action)}
            style={{
              alignSelf: 'flex-start',
              fontSize: '12px', fontWeight: 600,
              color: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.3)', borderRadius: '4px',
              padding: '6px 12px', cursor: 'pointer',
            }}
          >
            {hint.actionLabel} →
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
      backgroundColor: '#1e2d3d',
      border: unlocked ? '1px solid #f59e0b' : '1px dashed #334155',
      borderRadius: '8px',
      padding: '14px 16px',
      opacity: unlocked ? 1 : 0.85,
      height: '130px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: unlocked ? '#f59e0b' : '#64748b',
            letterSpacing: unlocked ? 'normal' : '0.1em',
          }}>
            {unlocked ? a.name : '???'}
          </div>
          {unlocked && (
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.45 }}>
              {a.description}
            </div>
          )}
        </div>
        {unlocked && (
          <span style={{
            flexShrink: 0,
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
            color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.12)',
            padding: '3px 6px', borderRadius: '3px',
          }}>
            DONE
          </span>
        )}
      </div>
      {unlocked && (floobits > 0 || packs.length > 0 || powerups.length > 0) && (
        <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {floobits > 0 && <RewardChip text={`+${floobits} Floobits`} color="#fbbf24" />}
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

const RewardChip: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <span style={{
    fontSize: '11px',
    fontWeight: 600,
    color,
    backgroundColor: `${color}20`,
    padding: '3px 8px',
    borderRadius: '3px',
  }}>
    {text}
  </span>
)

const PendingRewardsSection: React.FC<{
  rewards: PendingReward[]
  onClaim: (id: number) => Promise<{ kind: string; packName?: string; cards?: any[] } | null>
  onDefer: (id: number) => Promise<void>
  onPackOpened: (pack: { packName: string; cards: CardData[] }) => void
}> = ({ rewards, onClaim, onDefer, onPackOpened }) => {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClaim = async (r: PendingReward) => {
    setBusyId(r.id)
    setError(null)
    try {
      const result = await onClaim(r.id)
      if (result && result.kind === 'pack' && result.cards && result.cards.length > 0) {
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

  return (
    <section style={{
      backgroundColor: '#1e2d3d',
      border: '1px solid #f59e0b',
      borderRadius: '8px',
      padding: '16px 18px',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#f59e0b' }}>Unclaimed Rewards</h2>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          {rewards.length} {rewards.length === 1 ? 'reward' : 'rewards'}
        </span>
      </div>

      {error && (
        <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rewards.map(r => {
          const busy = busyId === r.id
          const deferred = r.deferUntilSeason != null
          const label = r.kind === 'pack' ? packLabel(r.slug) : powerupLabel(r.slug)
          const sourceText = r.source.startsWith('achievement:')
            ? `Earned from ${r.source.replace('achievement:', '').replace(/_/g, ' ')}`
            : r.source
          return (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px',
              backgroundColor: '#0f172a',
              border: '1px solid #2a3a4e',
              borderRadius: '6px',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: r.kind === 'pack' ? packColor(r.slug) : '#06b6d4' }}>
                  {label}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  {sourceText}
                  {deferred && (
                    <span style={{ color: '#f59e0b', marginLeft: '6px' }}>
                      · Held for season {r.deferUntilSeason}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {r.canDefer && !deferred && (
                  <button
                    onClick={() => handleDefer(r)}
                    disabled={busy}
                    style={{
                      fontSize: '12px', fontWeight: 600,
                      color: '#cbd5e1', backgroundColor: 'transparent',
                      border: '1px solid #475569', borderRadius: '4px',
                      padding: '5px 10px', cursor: busy ? 'default' : 'pointer',
                      opacity: busy ? 0.5 : 1,
                    }}
                  >
                    Save for Next Season
                  </button>
                )}
                <button
                  onClick={() => handleClaim(r)}
                  disabled={busy || (deferred && !r.canDefer)}
                  style={{
                    fontSize: '12px', fontWeight: 700,
                    color: '#0f172a', backgroundColor: '#f59e0b',
                    border: 'none', borderRadius: '4px',
                    padding: '6px 12px', cursor: busy ? 'default' : 'pointer',
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  {busy ? 'Claiming...' : 'Claim'}
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
