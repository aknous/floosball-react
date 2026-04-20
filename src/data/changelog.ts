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
    version: 'v0.10.0',
    date: '2026-04-19',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          '[Prospects] Rookie Draft & Scouting — every team now has scouted prospects who develop over the season and promote into the pro roster. View each team\'s pipeline, vote on rookie class priority, and track retirement risk on aging players',
          '[Simulation] Defense & Two-Way Players — players now have defensive positions, ratings, and game stats. Sacks, interceptions, fumbles, and tackles for loss name the defenders who made them',
          '[Simulation] Coverage schemes and blitz packages added to defensive play-calling for more realistic outcomes',
          '[Achievements] Full goal system with Rookie Goals (onboarding milestones) and Season Goals (re-earnable each year, tiered I through IV)',
          '[Achievements] Secret achievements reward hidden milestones',
          '[Achievements] Unlocks pay Floobits, packs, and powerups with claim or defer-to-next-season options',
          '[UI/UX] Team Management Hub — consolidated /front-office page replaces the old team page with tabs for Overview, Schedule, Fund, Markets, Prospects, and Board',
          '[Front Office] League Markets — new panel shows where every team sits in the funding tier system, who\'s rising or falling, and historical tier trajectory across seasons',
          '[UI/UX] Collapsible Sidebar — navigation moved into a left sidebar that collapses for focus or expands for labels. State persists across sessions',
          '[Discord] Bot Integration — link your account with /link, get DM reminders for picks and roster lock, and use slash commands to check cards, roster, standings, and more',
          '[UI/UX] Rating Sparklines — every player row shows their rating trend over recent weeks so you can spot risers and fallers at a glance',
          '[Front Office] Year-Round Free Agency Ballots — vote on your free agency priorities starting Week 22 and keep shaping the ballot all the way through the offseason',
        ],
      },
      {
        label: 'Changes',
        items: [
          '[Pick-em] Underdog bonus — picks against the ELO favorite earn extra points',
          '[Pick-em] Certainty decay — pre-game picks carry full value; value drops as games progress',
          '[Pick-em] Opt-in auto-pick setting picks the ELO favorite for you when you miss a week',
          '[Team Funding] Share-of-league tier system — your tier depends on how much you contribute relative to the league, not a fixed threshold',
          '[Team Funding] New trajectory chart shows where your team is heading next season',
          '[Fantasy] Playoff scoring is now frozen at the start of the playoffs — fantasy rankings reflect the regular season, not late-season chaos',
          '[Front Office] Board Resolutions now name specific players to vote on (Fire Coach X, Cut Player Y) instead of generic directives',
          '[Cards] Bonsai reworked — growth is now earned through roster performance each week instead of random luck, with higher levels requiring bigger weeks to keep pushing',
          '[Cards] Eminence and Rising Tide ceilings raised so elite player seasons actually get to enjoy the upside',
          '[Cards] Avalanche uses a smoother scaling curve so it still feels rewarding at high FP totals',
          '[Simulation] 4th-down coaching is more aggressive in appropriate situations — fewer timid punts in modern-football scenarios',
          '[Prospects] Prospect cards show a single Skill Ceiling rating instead of overwhelming per-attribute potentials',
          '[Prospects] Rookie voting stays open through the playoffs — the window no longer closes once Wild Card weekend starts',
          '[Guide] Updated with Prospects, Team Management, Achievements, and refreshed Prognosticate and Front Office sections',
        ],
      },
      {
        label: 'Fixes',
        items: [
          '[Simulation] Offseason replay bug — restarting mid-offseason no longer replays free agency picks',
          '[Front Office] FA ballot submissions now persist correctly across page refreshes',
          '[Cards] Windfall, Fat Cat, and Martyr card effects corrected',
          '[Front Office] Walk-year players now appear in the projected FA pool so you can plan cuts and re-signs',
          '[Prospects] READY badge now uses a fair comparison against current roster, not an arbitrary threshold',
        ],
      },
    ],
  },
  {
    version: 'v0.9.0',
    date: '2026-04-12',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          'Clerk production authentication — accounts now use the production identity provider for improved reliability and higher capacity',
          'Existing accounts are automatically migrated on first login',
        ],
      },
      {
        label: 'Changes',
        items: [
          'Closer card effect now persists Q4 fantasy points across game restarts and between weeks',
          'Player performance ratings are snapshot at the start of each week — post-game recalculation no longer alters card output mid-week',
          'Flourish card effect removed',
          'Fantasy leaderboard now shows top 5 with your rank highlighted below if you\'re outside the top 5',
          'Season scheduling anchored to Monday — new seasons always start on the correct day',
        ],
      },
      {
        label: 'Fixes',
        items: [
          'Fixed duplicate WebSocket connections and orphaned sockets on rapid page transitions',
          'Fixed WebSocket disconnect cleanup so stale connections no longer accumulate',
          'Coach names can no longer collide with player names after generation',
        ],
      },
    ],
  },
  {
    version: 'v0.8.1',
    date: '2026-04-08',
    changes: [],
    sections: [
      {
        label: 'Changes',
        items: [
          'API responses are now compressed and cached for snappier data loading',
          'Team avatars and league logo load instantly from local assets instead of the server',
          'Reduced unnecessary background requests — pages only refresh data when it actually changes',
          'Notifications pause when the browser tab is hidden to save resources',
          'Improved server stability and health monitoring under heavy traffic',
        ],
      },
    ],
  },
  {
    version: 'v0.8.0',
    date: '2026-04-05',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          'Team Funding System — fans contribute Floobits to their favorite team to unlock market tiers (Small, Mid, Large, Mega) with offseason development, morale, and fatigue bonuses',
          'Projected next-season tier — funding page shows where your team will land next season after carry-forward decay, with hoverable tier badges showing effects',
          'New card effect: Gone Streaking — holographic-tier effect that pays FP based on your favorite team\'s longest win or loss streak this season',
          'Season Recap Modal — end-of-season summary showing champion, awards, your fantasy and pick-em results, and Floobits earned',
          'Player hover cards — hover over player names to see quick stats preview',
          'MVP awards displayed on player profile pages',
          'Escalating roster swap costs — each slot\'s swap price increases with use to discourage excessive churning',
        ],
      },
      {
        label: 'Changes',
        items: [
          'Funding tiers are locked at season start — mid-season contributions build toward next season\'s tier',
          '50% carry-forward between seasons — teams must sustain contributions to maintain high tiers',
          'Card effect description cleanup — Surplus, Connection, and RNG tooltips rewritten for clarity',
          'Odometer yardage gates raised to 200/400/600/800',
          'Overperformance thresholds fixed for Rising Tide, Diamond in the Rough, Buy Low, and Fixer Upper',
          'Stale card effect tooltips now auto-refresh on startup when effects are reworked',
        ],
      },
      {
        label: 'Fixes',
        items: [
          'Reigning champion now appears in navbar immediately after the Floosbowl (no longer waits for next season)',
          'Player season stats no longer reset to zeros after offseason — previous season data preserved correctly',
          'Free agent list no longer shows rostered players when "All" is selected during offseason',
          'Roster integrity validation after FA draft prevents player-team reference mismatches',
          'Pick-em picks no longer disappear after games end',
          'Game Day and Season Report emails fixed for roster model and team attribute access',
          'Second-pass card effects no longer ignore FPx cards as triggered',
          'Card effect text coloring now handles range patterns and standalone signed numbers correctly',
        ],
      },
    ],
  },
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
