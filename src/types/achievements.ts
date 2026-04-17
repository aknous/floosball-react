export type AchievementScope = 'once' | 'per_season'
export type AchievementCategory = 'onboarding' | 'guidance'

export interface RewardConfig {
  floobits?: number
  packs?: string[]     // pack slugs: "humble" | "proper" | "grand" | "exquisite"
  powerups?: string[]  // powerup slugs; "random" for a random one
  deferred?: boolean
}

export interface Achievement {
  id: number
  key: string
  name: string
  description: string
  category: AchievementCategory
  scope: AchievementScope
  target: number
  progress: number
  completedAt: string | null
  claimedAt: string | null
  rewardConfig: RewardConfig
}

export interface PendingReward {
  id: number
  kind: 'pack' | 'powerup'
  slug: string
  source: string
  availableAt: string
  createdAt: string
  deferUntilSeason: number | null
  canDefer: boolean
}

export interface AchievementUnlockedEvent {
  event: 'achievement_unlocked'
  key: string
  name: string
  description: string
  rewardConfig: RewardConfig
  season: number
  deferredRelease?: boolean
  timestamp: string
}
