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
    version: 'v0.17.0',
    date: '2026-05-29',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          '[UI/UX] Replay finished games. A Replay button on any final game walks back through the game one play at a time, driving the scoreboard, field graphic, win-probability chart, and play feed. Play/pause, step, scrub, and 1x/2x/4x speed.',
          '[Front Office] Undo your votes. Cut, re-sign, fire, and coaching votes now show an undo button on any directive you have voted on, with a full Floobit refund. Votes can be retracted any time before the offseason locks them in.',
        ],
      },
      {
        label: 'Changes',
        items: [
          '[Front Office] Vote buttons now confirm on a second tap before spending, so an accidental press costs nothing.',
        ],
      },
    ],
  },
  {
    version: 'v0.16.1',
    date: '2026-05-27',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          '[UI/UX] Cheer your team mid-game. A megaphone button on every live scoreboard sends a confidence boost to the rostered players. Free, with a 20-second cooldown per team. When enough fans cheer for the same team in a short window, a rally line drops into the play feed.',
          '[UI/UX] Player Mental Profile panel on the player hover card and player page. Mood, Attitude, Pressure handling, Resilience, Self-belief, Discipline, Focus, Instinct, and Creativity all show as tiered status badges.',
          '[UI/UX] Per-player breakdown in the game modal. Click any player row in the Stats tab to see pre-game rating modifiers (Fatigue, Team Disposition, Soft cap), live confidence + determination drift, and pressure exposure for that game.',
          '[UI/UX] Trophy Case panel on the player page. MVP and championship medals moved out of the tabbed panel into their own slot below Recent Moments on the right column.',
        ],
      },
      {
        label: 'Changes',
        items: [
          '[Simulation] Team and player balance pass. League competitiveness, market tier effects, and fatigue all tuned.',
          '[Simulation] Form state and matchup context consolidated into a single Team Disposition with one narrative label (Hot Streak, Trap-Game Risk, Cinderella Push, Coasting, Playoff Push, etc.).',
          '[Simulation] Play-calling rebalanced.',
          '[Simulation] Momentum system polish. Big plays count sooner, close games build the most momentum, and late-game swings carry real weight. Trailing teams keep their comeback momentum at full value in blowouts; the leading team is the one whose piling-on gets dampened.',
          '[Simulation] Teams stuck in a rough patch are no longer dragged down as hard. The downhill spiral is less self-reinforcing and the underdog still has a fighting chance.',
          '[Fantasy] Floobit payouts bumped across the board. Weekly fantasy income and pick-em prize pools both raised so mid-tier rosters can keep up with pack prices.',
          '[UI/UX] Game modal stats clean-up. Stat columns line up across positions, expand chevrons are more visible, rows highlight on hover, and the layout condenses on landscape phones.',
          '[UI/UX] Player page reorg. Skills and Mental sit side-by-side in the attributes panel, with the Offense and Defense column headers now showing their own rating gauge.',
        ],
      },
      {
        label: 'Fixes',
        items: [
          '[UI/UX] Punts and other plays no longer drop out of the play feed.',
          '[UI/UX] Down and distance now display correctly on every play.',
          '[UI/UX] Ball position lands in the endzone on touchdown plays in the field graphic.',
        ],
      }
    ],
  },
  {
    version: 'v0.16.0',
    date: '2026-05-25',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          '[UI/UX] Play reactions on the in-game play feed. React to any play with hype, love, wow, laugh, cry, or mad.',
          '[Cards] Roster-trait cards. Synergy, Vanguard, Range, Loyalty, Charmed, and Cornerstone pay out based on how your roster is constructed.',
          '[Cards] Three Diamond stat amplifiers. Doubler, Surveyor, and Sharpshooter mutate the QB, RB, or WR\'s relevant stat before other cards read it.',
          '[Front Office] "Retiring" status shows in the front office once a player has locked in their retirement decision.',
        ],
      },
      {
        label: 'Changes',
        items: [
          '[Cards] Card balance pass. Comeback Kid, Domination, Walk Off, Believe, Showoff, Eminence, Homer, Honor Roll, Hedge, Drought, Sandbagger, Quiet Storm, Momentum, Anthem, and Loyalty reworked or retuned.',
          '[Cards] No duplicate card effects can be equipped in the same week. Starter packs also deduplicate.',
          '[Cards] Pack purchase limit. Max 5 packs per 7-week cycle.',
          '[Cards] Pack rates tightened. Diamond cards are noticeably rarer. Prismatic rates trimmed.',
          '[Achievements] Banner Week, Dynamo, and Compound thresholds bumped.',
          '[Front Office] Retirement only fires for players whose contract expires this offseason.',
          '[Front Office] Star ratings and contract tiers are now aligned. No more 4-star players signing 1-year deals.',
          '[Team Funding] Markets chart keeps each team\'s tier dot inside the correct band after the offseason recompute.',
        ],
      },
      {
        label: 'Fixes',
        items: [
          '[Simulation] Onside kick recovery no longer desyncs possession.',
          '[Front Office] Fired coaches stay fired. They no longer silently re-attach to their old team on the next reload.',
          '[Front Office] A coach can only be assigned to one team at a time.',
          '[Cards] Range card pays out when your kicker hits multiple field goals. It used to pay zero.',
        ],
      },
    ],
  },
  {
    version: 'v0.15.1',
    date: '2026-05-19',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          '[Cards] Remove (red X) button on locked roster slots. Drop a player without using a swap. Adding a new player to that slot later still costs a swap and the slot fee.',
          '[Cards] Convert to Floobits option on stashed pack rewards. When you already have a pack waiting to be opened and earn another one, the new pack now shows a Convert button (alongside Open) so you can trade it for Floobits at the pack\'s shop price instead of stockpiling.',
          '[Cards] Card picker Output filter. Filter the picker list down to FP, FPx, or Floobits cards alongside the existing Position and Edition filters.',
          '[Cards] No-duplicate-effects rule. Only one card of each effect can be equipped at a time. The picker dims and badges any card whose effect is already equipped in another slot.',
          '[Cards] Empty roster slots that have never been filled now fill for free. Save a partial roster, play through, and fill the open slots later without burning swaps. Slots that have been swapped or removed still cost a swap.',
        ],
      },
      {
        label: 'Changes',
        items: [
          '[Cards] Drought, Sandbagger, Quiet Storm, and Hedge require 5+ rostered players to pay out. These cards are meant for a full roster of underperformers.',
          '[Cards] Roster minimum dropped to 2 players for lock (was a full 6). You can lock and play with a partial roster.',
          '[Cards] Bonsai FP values roughly doubled. Was opening too far below other Prismatic flat-FP cards.',
          '[Cards] Grand and Exquisite pack non-guaranteed slots tuned to the themed-pack rate table. You pay for the guaranteed Prismatic or Diamond; the rest are at elevated-but-not-inflated odds.',
          '[Cards] Duplicate-effect equipped sets auto-resolve at week start. If you had two of the same effect equipped, the loser unequips back into your collection at the next week boundary. Keeper rule: rarer edition wins; if both are the same edition, the higher-rated depicted player wins. No Floobit refund; the unequipped card is yours to sell, combine, or equip elsewhere.',
          '[UI/UX] FPx equation text cleaned up. Dropped the "log-taper" jargon on Cornucopia and Juggernaut. Stripped the parenthetical caption from the full-roster gate so it reads cleanly as "Requires 5+ rostered players."',
          '[Cards] Card descriptions updated. Drought / Sandbagger / Quiet Storm / Hedge now mention the 5+ filled slots requirement directly. All In and Stacked Deck tooltips switched to delta notation.',
        ],
      },
      {
        label: 'Fixes',
        items: [
          '[Cards] Home Alone now counts an empty FLEX slot. The FPx-per-empty-slot bonus was missing your open FLEX previously.',
          '[Cards] Alchemy + Cornucopia synergy works regardless of slot order. Alchemy\'s "FGs count as TDs" bump now applies before other cards compute, so Cornucopia (and Touchdown Piñata, Avalanche, etc.) see the boosted count even if they sit in a lower slot.',
          '[Cards] Lemons no longer multiplies FPx cards. Was wrongly amplifying the match-conditional FP on FPx cards when they were the lowest non-zero card in the hand.',
          '[Cards] Leaderboard FPx output, breakdown zero-state chip, and grounded modifier chip all now show FPx as a delta (+0.32 FPx) instead of a full multiplier (1.32x).',
          '[Cards] Pre-lock roster editor: Remove (X) button on each filled slot, so you can drop a player from your draft without first picking a replacement.',
          '[Simulation] Crash dump on game-sim errors. If a game crashes mid-simulation the engine now writes a full state dump (traceback, score, OT period, possession state, recent feed) to the persistent volume so we can post-mortem after the next restart instead of losing the trail with log rotation.',
          '[Simulation] Hard cap on overtime periods (5) to prevent a theoretically-deadlocked tied game from simulating forever. Beyond five OTs the game is accepted as a tie. Each tied finalize also logs the OT state.',
        ],
      },
    ],
  },
  {
    version: 'v0.15.0',
    date: '2026-05-16',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          '[Cards] Themed packs in the shop. Position packs guarantee a card at one position (QB, RB, WR, TE, K). Output packs only contain cards of one payout type (FP, FPx, or Floobits). Champion and All-Pro packs only pull from last season\'s champion roster or All-Pro team.',
          '[Cards] Themed pack reroll. Pay an escalating Floobit cost to refresh today\'s themed pack selection.',
          '[Front Office] Coach hiring now runs per team. Every team without a coach gets a slate of 3 candidates at GM week. Each team\'s vote winner signs with that team, so other teams can\'t take your top pick.',
        ],
      },
      {
        label: 'Changes',
        items: [
          '[Cards] Card FPx output is now shown as a delta (+0.32 FPx) instead of a full multiplier (1.32x). Matches how the equation totals work and makes match bonuses easier to read.',
          '[Cards] FPx cards now combine by adding their deltas together, not by multiplying them. Keeps scaling in check when you stack multiple FPx cards in one hand.',
          '[Cards] Card baseline rebalance to compensate for the new FPx math. Flat-FP and roster-trait cards pay about 2.25x more. FPx delta payouts trim by about 30%. Hands that mix FP and FPx now outperform stacking only FPx.',
          '[Cards] Bizarro tier values trimmed. Top tier with the match bonus stacked was paying out at about 4x; new cap is 2.5x base.',
          '[Achievements] Banner Week, Dynamo, Compound, and Zenith all bumped to harder thresholds. Card power crept up across the rebalance and the old targets were too easy to clear.',
        ],
      },
      {
        label: 'Fixes',
        items: [
          '[Cards] Achievement-reward and purchased packs are no longer lost if you refresh the page before picking your cards. The reveal modal now re-opens on the next page load until you complete your selection.',
          '[Cards] Closer (q4-only FP card) now reads fourth-quarter fantasy points at week-end instead of zeroing out.',
          '[Cards] Card projections fixed for several newer effects (Patient, Wanderer, Castaway, Rookie Hype, Anthem, Sandbagger, Quiet Storm, Drought, Nose Picker, Medium, Parlay).',
          '[Front Office] Extra Swap powerup no longer shows as already-purchased in the shop after claiming an Extra Swap as an achievement reward. Free grants no longer count against the daily limit.',
          '[Front Office] Powerups defer their start when the week\'s games have ended but the week hasn\'t rolled over yet, instead of starting and immediately wasting a week.',
        ],
      },
    ],
  },
  {
    version: 'v0.14.0',
    date: '2026-05-10',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          '[Cards] Pack opening is now a reveal-and-pick flow. Humble shows 2 cards and you keep 1. Proper shows 3 and you keep 2. Grand and Exquisite both show 5 and you keep 3 (Exquisite has better drop rates). Achievement and starter pack rewards use the same flow.',
          '[Cards] Shop runs a daily rotation in the Daily Packs section instead of always listing every tier. A free Starter Pack tile shows once per season for new users until claimed.',
          '[UI/UX] New History page (sidebar > History). Tabs for Seasons (champion and MVP per year), Record Book (game, season, and career bests across the major stat categories), and Fantasy Records (best weekly and best season FP across all users).',
          '[Cards] Three new prognostication-driven cards. Nose Picker rewards weeks where you submit picks manually instead of riding auto-picks, scaling with streak length. Medium scales output to your weekly pick accuracy. Parlay outputs FPx based on the prognostication points your picks earned that week.',
          '[Front Office] Follow players. Tap the star on a player profile to follow them. A new Followed filter appears on the Players page, and the highlights feed surfaces off-day quotes from anyone you follow.',
          '[Team Funding] Custom contribute amount on the Markets / Fund panel. Type any Floobit amount instead of using the preset buttons.',
          '[Cards] Projected output pill on every card during pack reveal and on featured shop cards, based on the player you have rostered at that position.',
          '[Fantasy] Equipped cards now appear inline when you expand a row on the fantasy leaderboard.',
          '[Pick-em] AUTO badge next to users on the weekly leaderboard when every one of their picks was an auto-pick.',
          '[UI/UX] Floobits-received toast. Passive grants (card payouts, team contributions, weekly conversions) now flash a brief on-screen toast in addition to updating your balance.',
        ],
      },
      {
        label: 'Changes',
        items: [
          '[Fantasy] Weekly FP-to-Floobits conversion now uses a smooth growth curve instead of a flat 15% with a hard cap. Smaller weeks pay more proportionally. Big weeks still earn the most. The Endowment powerup uses a flatter curve for higher tops.',
          '[Front Office] Free agency ballot is now a single overall priority list. Drag-rank every free agent you want; the team works your list top-down and skips anyone whose position has already filled.',
          '[Cards] Exquisite packs now pick 3 cards (was 4). Grand and Exquisite differ only by drop rates.',
          '[Cards] Juggernaut and Cornucopia rebalanced. Both still scale on streaks and touchdowns, but growth flattens at the high end so they no longer run away in extreme weeks.',
          '[Cards] Rookie Hype now counts any player at the Rookie service tier, not only first-year players.',
          '[Achievements] Tycoon (lifetime Floobits earned) is now a tiered family. Tiers I through IV unlock at 750, 2,500, 5,500, and 10,000 earned, mirroring Magnate. Reward pool bumped accordingly.',
          '[Achievements] Pending rewards can now be deferred for powerups (was packs only) and during the offseason.',
          '[Front Office] Coach pool expanded from 5 to 12 candidates for more variety in hire votes.',
          '[Front Office] Coach hire help text now mentions that other teams hire from the same pool, so your top pick may sign elsewhere. Spread votes across backups.',
          '[UI/UX] FA ballot modal: single drag-rank column, equal column widths, larger stars and arrows, fixed modal height regardless of how the position filter narrows the list.',
          '[UI/UX] Highlight feed off-day filter. Only shows quotes from your favorite team, your fantasy roster, and players you follow. Cuts the league-wide chatter during long idle windows.',
          '[UI/UX] Sidebar gains a History entry (book icon). Achievements icon refreshed to a trophy.',
        ],
      },
      {
        label: 'Fixes',
        items: [
          '[Cards] Card templates no longer generated for prospects, drafting-team players, or free agents. Pack draws, featured shop, and admin grants all filter them out.',
          '[Cards] Medium and Parlay projected output no longer reads 0. Falls back to your historical pick accuracy and points when the current week has no data yet.',
          '[Cards] Nose Picker lights up its streak as soon as your manual picks land, instead of waiting for game results.',
          '[Cards] During active games, Medium and Parlay now show "waiting for results" instead of incorrectly reading "no submission this week".',
          '[Cards] Sleeper no longer errors on certain projection and scoring paths.',
          '[Achievements] Tycoon now displays its proper name in the pending-rewards panel (was showing the raw lowercase key).',
          '[Fantasy] Fantasy leaderboard score breakdown drops the duplicate Card Bonus summary row. The per-card breakdown already covers it.',
        ],
      },
    ],
  },
  {
    version: 'v0.13.6',
    date: '2026-05-06',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          '[Front Office] Equipped All-Pro cards now show a green dot on the AP badge when their roster swap is still available, and a dim gray dot when it has been used. Hover the badge for the current state.',
        ],
      },
      {
        label: 'Changes',
        items: [
          '[Front Office] Hire Coach is now a simple plurality vote. Whoever gets the most votes is hired. Ties show TIED on each candidate; the leader gets a LEADING badge in the team color.',
          '[Front Office] Fire / Re-sign / Cut directives now resolve deterministically. The directive passes when its vote total meets or exceeds the team\'s active fan count. No more probability roll, no more "70% chance" feel.',
          '[Front Office] Active fan count is snapshotted at the moment the Front Office opens (Week 22). Fans logging in for the first time after that point don\'t shift the threshold mid-vote.',
          '[Front Office] Per-season vote caps adjusted: coach votes (fire / hire) cap at 4 per fan, player votes (re-sign / cut) cap at 8 per fan. Per-target cap is 4 across the board.',
          '[Front Office] Champion classification no longer secretly bumps the weekly swap-refill cap. Its only perk is now what the tooltip says: it unlocks the FLEX roster slot.',
          '[Front Office] Vote buttons disable automatically once a directive\'s threshold is met. No more spending floobits on a vote that\'s already guaranteed to pass.',
          '[Cards] All-Pro card swap grants refresh once per game day instead of once per season — equipped AP cards now grant a fresh swap every 7 weeks.',
          '[UI/UX] Powerup countdowns (FLEX slot, Accession, Endowment, Patronage) now refresh on week transitions instead of waiting for a manual page reload.',
          '[UI/UX] Front Office help copy refreshed to describe plurality hire, threshold-based directives, the Week 22 fan-count snapshot, and the new vote caps.',
        ],
      },
      {
        label: 'Fixes',
        items: [
          '[Front Office] Fixed coach hire votes silently failing to register results when SQLite\'s write lock was contended between sessions. Hire / fire DB updates and the GM vote-result records now share one connection.',
          '[Front Office] Fixed the unassigned coach pool getting wiped on every app boot, which orphaned outstanding hire-coach votes. Pool now tops up rather than wipes, so an in-flight vote keeps its target through restarts.',
          '[Front Office] Fixed All-Pro swap grants being lost across week boundaries. The carry-forward in both the equip endpoint and the season manager now preserves the swap-bonus flag, so an unused grant stays available across week transitions.',
          '[Front Office] Fixed the AP swap exploit where users could equip, use a swap, unequip, and re-equip the same card to receive another grant. Using a swap now correctly marks the card\'s grant as consumed.',
          '[Front Office] Fixed the All-Pro swap retroactive grant on roster lock. Equipping an AP card before locking the roster used to silently skip the grant; it now fires correctly when the roster locks (manual or auto).',
          '[Front Office] Fixed the weekly swap-refill cap inflating with carry-forward rows from earlier weeks. Cap now considers only this week\'s active AP grants.',
          '[Front Office] Fixed FLEX rosterPlayers being deleted at week rollover when the user had a Champion card equipped. The defensive sweep now checks the user\'s most recent equipped loadout instead of the new (empty) week\'s rows.',
          '[Front Office] Fixed FLEX powerup expiration leaving the slot visible in the UI even after it expired. The GET roster endpoint no longer fakes hasFlexSlot based on a stale FLEX rosterPlayer.',
          '[Front Office] Fixed Accession (6th card slot) and other duration powerups deferring to next week when bought before games actually started. Activation now correctly fires for purchases made during the pre-game window.',
          '[Front Office] Fixed admin-curated player/coach names getting wiped on fresh-start deploys. The unused_names table is now preserved, and config additions are merged in on every boot.',
          '[Cards] Card templates are no longer generated for prospects or upcoming rookies — only rostered players get cards.',
        ],
      },
    ],
  },
  {
    version: 'v0.13.5',
    date: '2026-05-04',
    changes: [],
    sections: [
      {
        label: 'Fixes',
        items: [
          '[UI/UX] Mobile roster rows on the team page and front office now stack vertically so player names use the full row width instead of getting truncated.',
        ],
      },
    ],
  },
  {
    version: 'v0.13.4',
    date: '2026-05-04',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          '[UI/UX] New League page replacing the old team grid. Standings split by league, favorite team highlighted, postseason status icons (champion, top seed, clinched, eliminated) on every card.',
          '[UI/UX] Team Nav Strip on the team page. Hop between teams without leaving the page.',
          '[UI/UX] Roster table restructured into a column grid with service-time tags (Rookie / Veteran / Vested / Lifer) and a play-time status pill (Fresh / Active / Worked / Worn).',
          '[UI/UX] Game Modal Stats tab redesigned. Stats grouped into sectioned cards with team-color headers instead of a flat list.',
          '[UI/UX] Game Modal Box Score redesigned. Side-by-side comparison with cell-tint highlighting on the winning team for each stat. Adds Y/Play, Y/Att, Pass TDs, Y/Carry, Rush TDs.',
          '[UI/UX] Pregame matchup preview now uses the same comparison layout as the box score.',
        ],
      },
      {
        label: 'Changes',
        items: [
          '[Simulation] Late-game field-goal decisions smarter. Trailing teams defer FGs to drain clock when they have the ball and time, and only kick on the last play of the drive.',
          '[Simulation] Hail Mary nerfed. Lower base completion, much higher coverage and sack rates so desperation throws play closer to reality.',
          '[Simulation] Clutch and choke tags now credit defensive players (sackers, interceptors, forced-fumble forcers), not just the offense.',
          '[Simulation] Play text calls out the blitzer on a sack and the lead tackler on completed passes.',
          '[Simulation] Per-range field goal tracking (under 20, 20–40, 40–50, over 50) recorded for stats and percentages.',
          '[Front Office] Vote buttons use the team color with auto-contrasting text so light-team labels stay legible.',
        ],
      },
      {
        label: 'Fixes',
        items: [
          '[Simulation] Player fatigue now persists across server restarts mid-season instead of resetting to fresh.',
          '[Simulation] Career stats no longer show zeros after a server restart — fixes a stale reference and a JSON column persistence bug.',
          '[Simulation] Per-range FG counters no longer get wiped by the season-stats backfill on boot.',
        ],
      },
    ],
  },
  {
    version: 'v0.13.3',
    date: '2026-05-04',
    changes: [],
    sections: [
      {
        label: 'Changes',
        items: [
          '[Personality] Off-day and sideline lines varied. Conversational archetypes (fiery, paranoid, ghost, dramatic, trash-talker, and others) now use natural contractions instead of formal phrasing. Repeated refusal-pattern closers ("and I will not be...") rewritten for variety.',
          '[Prospects] Promoted prospects now get a jersey number on call-up. Existing prospects without numbers get backfilled on next server boot.',
        ],
      },
    ],
  },
  {
    version: 'v0.13.1',
    date: '2026-05-04',
    changes: [],
    sections: [
      {
        label: 'Fixes',
        items: [
          '[Personality] Off-day quotes in the highlights feed no longer show the player name twice. The feed card already attributes the speaker in a header above the quote, so first-person lines render without the auto "Name:" prefix and third-person lines use the player\'s first name only.',
          '[UI/UX] Highlights feed scrolls inside its panel instead of growing the page when off-day quotes pile up over long idle gaps between games.',
        ],
      },
      {
        label: 'Changes',
        items: [
          '[UI/UX] Off-day quote retention dropped from 30 to 12. Feed rotates through fresh content faster during multi-hour idle windows.',
        ],
      },
    ],
  },
  {
    version: 'v0.13.0',
    date: '2026-05-03',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          '[Simulation] Season-long form states for every team (Hot Streak, Complacent, Spiraling, Resolute, and others). Form affects game outcomes. Hot teams overperform their ELO, complacent teams cool off, losing teams with backbone get a Cinderella lift.',
          '[UI/UX] Team Form badge on the team page, standings, and team hover cards.',
          '[UI/UX] Fortitude pill on the team page. Combines vulnerability and resolve into a single tier (Hardened, Resilient, Steady, Wobbly, Brittle) showing locker-room health.',
          '[UI/UX] Player Mood pill now blends locker-room attitude with confidence and determination. Color goes green to red (leader to toxic).',
          '[Front Office] Coaches have an Attitude attribute (toxic to leader). Affects locker-room contagion, attitude drift, and a small game-day boost from players playing hard for a leader.',
          '[Front Office] Retirement Watch. Players who plan to retire after this season get flagged at week 22 when the Front Office opens. They\'re blocked from resign votes so you can put your votes toward replacements via the FA ballot.',
          '[Simulation] Per-matchup context modifiers. Heavy favorites with low discipline fall into trap games, clinched teams coast late, on-bubble teams push for the playoffs, heavy underdogs with high determination overperform.',
          '[Simulation] Mental attributes split into two pools. Game attributes (discipline, focus, pressure, instinct) stay 60-100. Locker-room attributes (attitude, resilience, selfBelief) now span 30-100, widening the spread.',
          '[Simulation] Extra points are now their own play in the feed, separate from the touchdown. Missed XPs in close games affect win probability appropriately.',
          '[Simulation] Clutch/choke detection rewritten. Now tied to game pressure and credits multiple players when a key play involves more than one (e.g. QB and receiver on a clutch TD).',
          '[Simulation] Tempo intent stamped on every play. New Tempo section in the play insights panel.',
          '[UI/UX] Player profile reworked. Adds locker-room flavor (hometown, favorite, motto) and a Recent Moments column with personality quotes.',
          '[Personality] Players have hometown, favorite item, and motto flavor. Off-day quote feed runs between rounds.',
        ],
      },
      {
        label: 'Changes',
        items: [
          '[UI/UX] Player and coach avatars removed from team-scoped pages where the team is already implicit. Cross-team views (MVP/All-Pro on season recap, equipped cards) show the team logo instead.',
          '[UI/UX] Mobile menu now includes Cards, Team Management, Achievements, and Guide.',
          '[UI/UX] Game feed shows a clock-stops icon next to plays that stop the clock and a play-continues icon when the clock keeps running.',
          '[UI/UX] Touchdown and extra-point badges are now separate entries in the feed.',
          '[UI/UX] Standings: Hot Streak teams get a flame icon, team form state shown in hover card.',
          '[UI/UX] Form-state tooltips trimmed to short phrases.',
          '[Simulation] FA contract runway softened for top-tier players. High-rated veterans get longer offers at the end of their careers.',
          '[Simulation] End-of-Q2 4th-down at midfield no longer punts. Teams take a shot or kick if in range, scaled by coach aggressiveness.',
          '[Simulation] OT and end-of-Q4 long-shot field goals (under 55%) sometimes go for it instead of kicking, scaled by coach aggressiveness.',
          '[Simulation] OT 1st-down field goal to win the game now requires a near-automatic kick (88-96% probability), pushing teams to advance for a chip shot.',
          '[Front Office] Coach hire and fire votes persist across server restarts.',
        ],
      },
      {
        label: 'Fixes',
        items: [
          '[Simulation] Burn-the-clock plays now work in Q1/Q2 (quarter gate was missing).',
          '[Simulation] Field goal play text now includes the result, not just "kicks the field goal".',
          '[Simulation] Sideline-pass touchdowns no longer say "out of bounds".',
          '[Simulation] Kickoff event persists in the play feed instead of vanishing on reload.',
          '[Front Office] /api/offseason no longer returns the wrong draft order during the pre-FA refresh window.',
        ],
      },
    ],
  },
  {
    version: 'v0.11.0',
    date: '2026-04-27',
    changes: [],
    sections: [
      {
        label: 'New Features',
        items: [
          '[Personality] Every player has a personality — base vibes (Stoic, Chill, Fiery, Goofy, Wholesome, Cool, Lively, Melancholy, Unhinged) plus rare variants like Mystic, Alien, Prophet, Knight, Fossil, and Ghost',
          '[Personality] Players react after big plays — touchdowns, field goals, sacks, interceptions, fumbles, turnovers on downs, clutch moments, and big momentum swings now show in-character reactions in the play feed',
          '[Personality] Defensive players react too — when a defender gets the sack, picks off the ball, or forces the fumble, sometimes the camera goes to them instead of the offense',
          '[Personality] Sideline cutaways — between drives, at halftime, and on big moments, the camera occasionally cuts to a player on the sideline mid-bit (a Goofy doing a magic trick, a Mystic drinking water with two hands, an Alien poking the turf)',
          '[Personality] Postgame reactions — when a game ends, the winning team\'s players react positively and the losing team\'s players react negatively',
          '[Personality] Mood system — every player has a 1-5 mood that shifts based on their recent performance. Mood names are personality-flavored (a Stoic is "Composed" or "Locked In", a Cool is "Smooth" or "Untouchable", a Mystic is "Foreseeing" or "Threaded")',
          '[Personality] Mood badge on the player hover card replaces the old skill bars — color hints at the underlying personality vibe',
          '[Cards] Card score projections (WORK IN PROGRESS) — every equipped card now shows its projected output for the upcoming week (FP, FPx, Floobits, or a contextual status for amplifiers) based on your roster\'s season averages. Amplifiers like Lemons compute their actual FP impact against your equipped hand',
        ],
      },
      {
        label: 'Changes',
        items: [
          '[Cards] Rebalanced card effects — Possession dialed back into the base-tier range, Lemons reworked (no longer zeros the top card), several effects renamed and tuned',
          '[UI/UX] Highlights feed cleaned up — only shows scores, turnovers, and game start/end cards. Big-play backgrounds, lightning markers, clutch/choke/momentum badges, and sideline cutaways now live exclusively in the per-game modal where they belong',
          '[UI/UX] Reaction text in the highlights feed bumped from 11px to 13px to match the modal',
          '[UI/UX] Sideline cutaways in the game modal now match the regular play row layout — team avatar at left, accent border, italic body',
        ],
      },
      {
        label: 'Fixes',
        items: [
          '[Personality] Reactions feel less repetitive — picker draws from a shuffled deck so every line in a pool shows once before any repeats. With pools of 40+ lines per personality, the same reaction shouldn\'t surface twice in a single game',
          '[Simulation] Kneeling out the clock on a turnover on downs no longer duplicates the play in the game feed',
          '[Cards] Card descriptions and tooltips clarified to drop misleading static numbers where the actual value is computed at runtime',
        ],
      },
    ],
  },
  {
    version: 'v0.10.1',
    date: '2026-04-21',
    changes: [],
    sections: [
      {
        label: 'Changes',
        items: [
          '[UI/UX] Card equip modal adds search, position and edition filters, sort options, and a match-roster-only toggle. Modal is now a fixed size.',
          '[UI/UX] Combine modal upgraded with the same search/filter/sort tools, and you can now multi-select cards to sacrifice instead of adding them one at a time.',
          '[Front Office] Team Management funding summary relabeled for clarity — "This Season", "Next Tier Target", and "Projected Next Season" now each read correctly in isolation.',
          '[UI/UX] Markets chart projection marker is now a directional arrow on a dashed line, so it\'s obvious which way a team is heading.',
        ],
      },
      {
        label: 'Fixes',
        items: [
          '[Achievements] Curator now counts unique cards from all sources, not just bought packs. Users who were stuck at 10 unique cards will catch up automatically.',
          '[Achievements] Unclaimed rewards no longer go missing after a server deploy.',
          '[Fantasy] Discord week report fantasy scores fixed — were roughly doubling at week end.',
          '[Cards] Fat Cat correctly reads your Floobits balance at week-end (was banking 0 FP).',
          '[Cards] 4-star player cards now render in green instead of blue — card tier color matches the star count across the whole rating range.',
        ],
      },
    ],
  },
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
