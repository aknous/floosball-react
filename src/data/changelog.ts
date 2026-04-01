export interface ChangelogSection {
  label: string
  items: string[]
}

export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
  sections?: ChangelogSection[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v0.7.1',
    date: '2026-03-31',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          'Dashboard tutorial — guided tour for new users highlighting games, standings, highlights, prognostications, and leaders',
          'Game Day Report emails — consolidated recap after each game day with FP earned, Floobits breakdown, leaderboard finishes, pick-em results, and favorite team status',
          'Season Report emails — end-of-season summary with final rank, total Floobits earned, best weekly finish, and favorite team playoff result',
          'Granular email preferences — opt in/out of Game Day Reports and Season Reports individually, with a master email toggle',
        ],
      },
      {
        label: 'Changes',
        items: [
          'Weekly FP earnings cap raised from 20 to 40 Floobits',
          'Endowment power-up now raises cap to 65 Floobits (was 40)',
          'Pack prices reduced — Humble 50F, Proper 150F, Grand 350F, Exquisite 750F',
          'Removed per-round leaderboard prize emails — prize info now included in Game Day Reports',
        ],
      },
      {
        label: 'Fixes',
        items: [
          'Card flip on mobile — Equip button added below cards in card picker',
          'Lock state not refreshing after games end',
          'Countdown timer now updates correctly when all games finish',
        ],
      },
    ],
  },
  {
    version: 'v0.7.0',
    date: '2026-03-28',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          'Matchup Previews — pre-game matchup stat comparison available for scheduled games',
          'Edition-Tiered Effects — card effects are now tied to edition tiers (Base, Holographic, Prismatic, Diamond). Higher editions unlock exclusive, more powerful effects',
          'Daily Pack Limits — Humble: 3, Proper: 2, Grand: 1, Exquisite: 1 per day',
          'Shop closes when the regular season ends (week 29+) — purchases blocked during playoffs and offseason',
          'Weekly FP participation reward — earn 15% of weekly FP as Floobits, replacing old season-end lump sum',
          'Endowment power-up (100 Floobits) — raises weekly FP earnings cap for 4 weeks',
          'Expanded About page with more in-depth documentation',
        ],
      },
      {
        label: 'Changes',
        items: [
          '"Gold" edition renamed to Prismatic — new hierarchy: Base, Holographic, Prismatic, Diamond',
          '"Chrome" edition removed — consolidated to 4 tiers with refreshed visual themes',
          'Removed Promotion and Transplant operations — The Combine is now the sole card upgrade path',
          'The Combine thresholds rebalanced for the 4-tier system',
          'Secondary edition bonuses removed — edition determines which effects you get',
          'Roster swap cost increased to 15 Floobits. Dispensation price increased to 50 Floobits',
          'Season-end tax: 25% of unspent Floobits removed between seasons',
          'Rebalanced pack costs and economy (see v0.7.1 for latest prices)',
          'Shop cards repriced: Base 25F, Holographic 100F. Featured shop now shows all editions, no duplicates',
          'Sudden Death OT — 2nd+ overtime periods are now sudden death (any score wins)',
          'Reworked RB yardage model — single Gaussian draw with breakaway chance, rating weighted by gap type',
        ],
      },
      {
        label: 'Fixes',
        items: [
          'Fixed teams never calling timeouts when tied in Q4',
          'Fixed OT clock management — teams now use timeouts, spike, and kneel in overtime',
          'Clinch/elimination events now appear in league highlights feed',
          'Fantasy scoring breakdowns no longer disappear between games',
          'Fixed FLEX roster spot not saving correctly',
          'Game stats no longer leak from previous game into scheduled game detail view',
          'Between-weeks pick-em view now shows completed results instead of blank matchups',
          'Free agent draft "on the clock" badge no longer stays stuck after the draft ends',
          'Front office cut/re-sign votes no longer incorrectly marked as ineligible',
        ],
      },
    ],
  },
  {
    version: 'v0.6.2',
    date: '2026-03-22',
    changes: [
      'Play insights panel — expandable detail view on each play showing situation, coach strategy, execution, and composure',
      'Run play tuning — realistic yardage distributions with multi-stage gap system (A/B/C-gap and bounce)',
      'Run play descriptions now match actual gap selection — inside runs vs outside runs',
      'Clutch/choke redesign — situation-driven Q4/OT moments: go-ahead scores, 4th down heroics, critical turnovers',
      'Game clock fix — play duration is now snap-to-whistle only, no phantom dead time on clock-stopping plays',
      'OT play-calling fix — QB no longer throws ball away on desperation plays when trailing',
      'Leading team kneels on 4th down in final seconds instead of attempting unnecessary field goals',
      'MVP board hidden until award is announced — no more premature spoilers',
      'Playoff pick-em support with proper timing and featured badge fixes',
    ],
  },
  {
    version: 'v0.6.1',
    date: '2026-03-19',
    changes: [
      'All-Pro Team display in Leaders tab with purple accent styling',
      'All-Pro and MVP announcements in league highlight feed with colored badges',
      'Clock management tuning — smarter spike and timeout decisions in crunch time',
      'Garbage time detection reduces late-game pressure effects in blowouts',
      'Season resume fix — MVP and All-Pro selections now work correctly after restart',
      'Fantasy season-end prize summary with Floobits breakdown',
      'Prognostication leaderboard fix for between-week display',
    ],
  },
  {
    version: 'v0.6.0',
    date: '2026-03-17',
    changes: [
      'Prognostication redesign — pick winners before or during games with quarter-based point multipliers',
      'Earlier picks earn more: pre-game 10 pts, Q1 8 pts, Q2 6 pts, Q3 4 pts, Q4 2 pts, OT 3 pts',
      'Combined win probability bar with clickable pick buttons on game cards',
      'Prognostication leaderboard ranked by total points with season and weekly views',
      'Overtime play-calling fix — first possession team no longer kicks early field goals',
      'Overtime plays now display as "OT" instead of "Q5"',
      'Removed MVP Race from dashboard — streamlined leaderboard tabs',
      'Floobits rewards proportional to points earned',
    ],
  },
  {
    version: 'v0.5.0',
    date: '2026-03-16',
    changes: [
      'GM Board of Directors — ranked-choice ballot system for free agency player targeting',
      'Free agency draft with directive queues, one pick per team per round',
      'Tabbed offseason panel consolidating Players, Directives, and Transactions views',
      'Clutch/choke system redesign — blowout dampening, Q4 pressure progression fix, stricter choke criteria',
      'High-pressure moments now compress the no-effect zone for more dramatic player responses',
      'Game stats snapshot cached at game completion — Floosbowl stats persist through offseason',
      'Centered game bar for playoff weeks',
      'Pick\'em system and game card score predictions',
    ],
  },
  {
    version: 'v0.4.0',
    date: '2026-03-13',
    changes: [
      'The Combine — sacrifice multiple cards to create a new random card, edition based on total card value',
      'Classification-aware card values for upgrades (Rookie, MVP, Champion, All-Pro multipliers)',
      'Cards page restored to main navigation',
    ],
  },
  {
    version: 'v0.3.3',
    date: '2026-03-12',
    changes: [
      'Decoupled card effect pools from position — shared pool available to all positions plus position-exclusive effects for position-specific stats',
      'Rebalanced output types — reduced FPx dominance (44% → 21%), converted 23 effects to FP or Floobits output',
      'Diversified position-exclusive output types — QB and RB exclusives now cover FP, FPx, and Floobits',
      'New RB-exclusive effects: Expedition (FP per rushing yards) and Stampede (conditional FPx with base value)',
      'Buffed flat FP effect values to be competitive with conditional multipliers',
      'Reworked edition secondaries — Diamond gets randomized bonus types',
    ],
  },
  {
    version: 'v0.3.2',
    date: '2026-03-10',
    changes: [
      'Expandable player game stats on roster — tap any player to see live passing, rushing, receiving, or kicking stats',
      'Favorite team slot on roster showing ELO, record, streak, and playoff status',
      'Swap and card lock window now correctly opens between game scheduling and kickoff',
      'Score breakdown equation defaults to expanded',
    ],
  },
  {
    version: 'v0.3.1',
    date: '2026-03-10',
    changes: [
      'Fixed mid-week roster lock — weekly FP and card bonuses now only count post-lock stats',
      'Fixed card effects using pre-lock TDs, yards, and other stats for match bonuses',
      'Card lock button accessible when card equipment slots are collapsed',
      'Momentum flame badge in game modal scoreboard',
    ],
  },
  {
    version: 'v0.3.0',
    date: '2026-03-10',
    changes: [
      'Momentum system — teams go on runs with cascade multipliers and mental resistance',
      'Momentum shift highlights in play feed and game modal',
      'Card classifications (All-Pro, Champion) and weekly modifiers',
      'Roster swap system with between-game unlock window',
      'Detailed card effect breakdowns with equation display',
      'Score formula panel showing full FP calculation',
      'Flame indicator on game cards for momentum streaks',
    ],
  },
  {
    version: 'v0.2.0',
    date: '2026-03-06',
    changes: [
      'Trading card system with 4 editions (Base → Diamond)',
      'Balatro-inspired card effect pools with synergies',
      'Card equipment slots with draft mode and weekly locking',
      'Two-pass card bonus calculator with modifier cards',
      'Smart coaching with halftime gameplan adjustments',
      'Live card bonus tracking and per-card breakdowns',
      'Fantasy leaderboard with accurate live scoring',
      'Offseason system and admin portal',
    ],
  },
  {
    version: 'v0.1.0',
    date: '2026-03-05',
    changes: [
      'Initial release of Floosball simulation',
      'Live play-by-play with Big Play, Clutch, and Choke indicators',
      'Full season simulation with playoffs and Floosbowl',
      'Fantasy mode with live scoring',
      'Team and player management with procedural generation',
      'Coaching system with halftime adjustments',
      'Win probability and pressure-based gameplay',
    ],
  },
]
