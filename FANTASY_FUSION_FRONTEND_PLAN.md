# Fantasy / Cards Fusion — Frontend Plan (Phase 8)

> Companion to the backend fusion (branch `feature/fantasy-cards-fusion` in the
> `floosball` repo; see its `docs/FANTASY_FUSION_PROGRESS.md`). Backend Phases 1–7a are
> done: equipped cards ARE the fantasy roster. This plan covers the frontend rebuild
> (Phase 8) **and the co-landing backend API retirement (Phase 7b)** — they ship together
> so the endpoint removal can be integration-tested against the new UI.

## The one-line goal
Collapse the two side-by-side systems on `/fantasy` — `CardEquipment` (cards) and
`FantasyRoster` (players) — into **one position-locked lineup**: 6 base slots
(QB/RB/WR1/WR2/TE/K) + a FLEX 7th. Each slot holds ONE card; the card's depicted player is
the player you field there. No separate roster, no match bonus, no swaps.

## What the backend now gives us (contract is READY)
- `GET /api/cards/equipped` → each entry has **`slot`** (`QB/RB/WR1/WR2/TE/K/FLEX`) +
  `slotNumber`, `card`, `playerId`, `templatePosition`, `locked`, `streakCount`. Top level
  still returns `hasExtraSlot` / `extraSlotSource` (`"mvp"` | `"temp_card_slot"`) /
  `extraSlotPowerup` — these now mean **"FLEX unlocked"**.
- `PUT /api/cards/equipped` → body is now `{ cards: [{ slot, userCardId }] }` (**`slot`
  string, not `slotNumber`**). Server validates position-fit (`cardFitsSlot`), FLEX unlock
  (MVP card OR Accession), no-dup-card, no-dup-effect, **no-dup-player**, and persists both
  `slot` + `slot_number`.
- `GET /api/cards/collection?position=<1-5>&equipped=false` → cards eligible for a slot
  (position is 1-based: QB=1…K=5; FLEX passes no position filter). Already supported.
- `GET /api/fantasy/card-projection?include_candidates=true&replace_slot=<n>` → per-card
  projected payout + candidate picker projections.
- `GET /api/fantasy/snapshot` → leaderboard + per-entry `players` (each with `slot`,
  `weekFP`, `earnedPoints`) + `cardBreakdowns`. **`matchMultiplied` is now always false /
  `matchMultiplier` always 1.0** — the match bonus is gone.
- `isMatch` is still returned but is now trivially true for every equipped card (the
  player IS on your lineup). **Stop rendering match badges/glow.**

## Frontend work breakdown

### A. New unified lineup component (the core of the work)
Build one lineup surface with 7 position slots. Reuse `Cards/TradingCard.tsx` for card art.
Per slot show: the card, the **depicted player's** live/week FP (from snapshot `players[]`
by `slot`), and the card's effect projection/bonus (`useCardProjection`, keyed by slot).
- Cleanest path: **retire `Components/Fantasy/FantasyRoster.tsx` (1902 lines)** and
  **rebuild `Components/Cards/CardEquipment.tsx` (961 lines)** into this lineup component
  (or a new `Components/Fantasy/Lineup.tsx`). CardEquipment is already the closer match —
  it owns the equip GET/PUT and slot rendering (`EquippedCardSlot` `:102`).
- Slot fill → open the card picker **filtered to that slot's position**
  (`CardPickerModal.tsx`); FLEX passes no filter. Kill the separate `PlayerPicker.tsx`
  (415 lines) — you no longer pick players, you pick cards.
- PUT change: send `{ slot, userCardId }` per card (was `{ slotNumber, userCardId }`) —
  `CardEquipment.tsx:329-343, :366-377`.
- FLEX: one slot-count concept. Show the 7th (FLEX) slot when `hasExtraSlot` is true;
  surface its source (`extraSlotSource`: MVP card vs Accession) like the current
  `:528-539` indicator. Delete the roster-side `temp_flex`/FLEX_SLOT path entirely.

### B. Data layer — introduce a unified hook
Today: roster state in `AuthContext` (`fantasyRoster`, `refetchRoster`, GET `/fantasy/roster`)
+ local `CardEquipment` state, glued by the `cards-equipped` window event. Replace with a
single `useLineup()` (equipped GET/PUT + collection for the picker). Remove
`AuthContext.fantasyRoster` / `refetchRoster` / the roster-player-id Set (`:80,:90-92,:95-105`)
and the `cards-equipped` listener there (`:156`).

### C. Remove match-bonus UI (isMatch)
- `CardEquipment.tsx:121,:132,:615-638,:873,:895-897`; `CardPickerModal.tsx:15,:36,:52,:277-281`;
  `LeaderboardExpandedBody.tsx:20,:239,:260`.
- `useFantasySnapshot.ts` `CardBreakdownEntry.matchMultiplied/matchMultiplier` (`:35-36`) +
  `HandSynergies.match` (`:68`) — drop from the breakdown panel display
  (`FantasyRoster.tsx PointsBreakdownPanel :135`, moving into the new component).
- `useCardProjection.ts` `CardProjection.isMatch` (`:27`) — drop.

### D. Remove swaps
- All swap UI + calls: `FantasyRoster.tsx` swap/remove (`:1051-1099`), swap-cost display
  (`:42,:1120-1124,:1504,:1822`), swap-history panel (`:807`); `FantasyPage.tsx` swaps badge
  (`GameInfoBar :170-203`). Delete POST `/fantasy/roster/swap` + `/remove` calls.

### E. Retire powerups in the shop
- `Shop/ShopModal.tsx`: remove `extra_swap` (Dispensation) + `temp_flex` (Conscription) from
  `POWERUP_STYLES` (`:70-74`), `POWERUP_ICONS` (`:121-125`), the render loop (`:924-975`), and
  the `extra_swap`→`refetchRoster` special-case (`:313`). Keep `temp_card_slot` (Accession),
  reworded to "Unlocks the FLEX lineup slot". Update `AboutPage.tsx:1793-1796`.

### F. Copy / help / tour
- `FantasyPage.tsx` Help (`:570-644`): rewrite the "Match Bonus" 1.5x section (`:626`) and the
  "slots are NOT position-locked" line (`:580`) — both now false. Update the tour steps
  (`:17-87`) to the position-locked, cards-are-your-roster model.
- Changelog entry (`[Fantasy]`/`[Cards]` tags) + version bump per house format.

### G. Routing / nav
- `/fantasy` becomes the unified lineup page. Decide the fate of `/cards` (`App.js:83`,
  `Sidebar.tsx:84-86`): keep as the **collection browser** (view/sell/blend/vault/showcase),
  since the lineup page only handles equipping. Recommend: `/fantasy` = lineup + leaderboard,
  `/cards` = collection. Update the FantasyPage↔Cards cross-links (`:449`).

## Co-landing backend Phase 7b (in the `floosball` repo, same PR window)
- **Delete endpoints** (replaced by equipped-cards): `GET/PUT /api/fantasy/roster`,
  `POST /api/fantasy/roster/{lock,remove,swap}`.
- **Migrate achievement hooks** to fire off the equipped lineup in `setEquippedCards`:
  `onFantasyRosterSet`, and secrets **Shoestring** (all ≤3-star), **Homer** (all fav-team),
  **Greenhorn** (all rookies). (Arsenal dies with swaps.)
- **Remove the swap web:** `_grantRosterSwaps` (seasonManager ~:1399), `swaps_available` /
  `purchased_swaps` reads/writes, `extra_swap` shop-buy + reward-grant branches, admin-stats
  swap counters, CardCalcContext `unusedSwaps`.
- **Repoint reads:** `GET /api/bot/roster` + admin-stats top-rostered query → equipped lineup.
- Keep the `FantasyRoster` row + `WeeklyCardBonus.roster_id` FK. Don't DROP
  `fantasy_roster_players` / `fantasy_roster_swaps` tables yet (retire usage first).

## Suggested milestones
1. **7b backend** (delete/retire endpoints + swap web + migrate achievements) — do first so
   the frontend builds against the final contract.
2. **useLineup hook** + the unified lineup component (position slots, card picker by position,
   PUT `{slot,userCardId}`, FLEX via hasExtraSlot).
3. **Strip** match badges, swaps, retired powerups; rewrite help/tour.
4. **Nav/routing** split (`/fantasy` lineup, `/cards` collection) + cross-links.
5. **Verify** end-to-end against a fresh fast sim, then the backend Phase 9 `simcheck`.

## Open questions
- `/cards` page fate: collection-only (recommended) vs fold into `/fantasy`.
- Do we keep a read-only "who's depicted" summary distinct from the card, or is the card art
  (which shows the player) enough? (Affects slot cell density.)
- AP/CH classification reuse (backend open question) may add a slot-cell badge later.
