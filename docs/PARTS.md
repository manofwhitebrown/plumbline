# Parts, combos and twists

Written by AI-3. Plain words on purpose. The codex and the owner use this file.
This file is made from `src/data/parts.js` and `src/data/twists.js`. If a number here is different, the data files win.

## How the bucket works (in short)

- Things rise past the bucket in columns. The **bottom row** of the Rig meets them first, the **top row** last.
- An item goes up its column and meets each Part in order, bottom to top. A **collector** grabs it and it stops there.
- So put changing Parts **below** the part that grabs. A Polisher above a Hook does nothing for that item.
- In one row, changing Parts work first and grabbers work last.
- A "step" is one moment of the Drop (about half a second).

## Unlock rules

- **Gold**: shows up after you have earned that much Gold in total.
- **Depth**: shows up after your best Depth reaches that many metres.
- **Codex**: shows up after you discover that combo.
- A part costs Gold once. After that you own it and can put it in any number of cells.

## All 26 parts

### Collectors (they grab)

| Part | What it does | Cost | How it unlocks |
|---|---|---|---|
| Hook | Grabs the gem or ore passing its column. | 0 | You start with it |
| Magnet | Grabs ore in its column and both side columns. | 40 | After 10 total Gold |
| Net | Grabs gems in its column and the right column (right pays 75%). | 260 | After 200 total Gold |
| Vacuum | Grabs everything except dangers in its column. Adds a little Strain. | 9,800 | After 9,000 total Gold |

### Processors (they change what passes)

| Part | What it does | Cost | How it unlocks |
|---|---|---|---|
| Polisher | Makes a passing gem one tier better. | 70 | After 40 total Gold |
| Multiplier | Doubles the value of what passes through. | 400 | After 380 total Gold |
| Smelter | Turns ore into a tier 1 gem, worth a little more. | 1,900 | After 1,800 total Gold |
| Splitter | Copies what passes into both side columns at half value. | 2,700 | After you find the combo "gem_press" |
| Amplifier | Adds 25% value for each Part that already worked this step. | 13,000 | After you find the combo "wide_net" |
| Gilder | Every 5th thing passing through is worth double. | 18,000 | After 17,000 total Gold |
| Prism | A tier 3+ gem shimmers for double when a Prism beside it also worked. | 25,000 | After reaching 350 m |

### Defense (they protect the rope)

| Part | What it does | Cost | How it unlocks |
|---|---|---|---|
| Plate | Blocks the first danger in its column, then rests for 5 steps. | 110 | After 90 total Gold |
| Shield | Blocks dangers in a 3x3 area. 3 charges per Drop. | 3,800 | After 3,500 total Gold |
| Oil Can | Lowers Strain a little every step. | 170 | After reaching 70 m |
| Cooler | Lowers Strain by 2 when a gem is grabbed in its column. | 1,300 | After reaching 140 m |
| Spike Guard | Turns dangers in its column into ore. | 900 | After 800 total Gold |
| Spare Rope | +20 max Strain. Only one counts. | 5,200 | After reaching 200 m |

### Engine (speed and timing)

| Part | What it does | Cost | How it unlocks |
|---|---|---|---|
| Drill | Dive faster (+1 m a step) but adds Strain. | 7,200 | After reaching 260 m |
| Anchor | Dive slower (0.3 m less a step) and lower Strain. | 600 | After reaching 110 m |
| Metronome | Every 4th step, Parts that change gems in its row work twice. | 34,000 | After you find the combo "drill_rush" |
| Battery | Stores power for each grab. At 10, the next grab pays double. | 46,000 | After reaching 480 m |

### Specials

| Part | What it does | Cost | How it unlocks |
|---|---|---|---|
| Lantern | Shows the next 2 steps in its column. Relics appear more. | 210,000 | After you find the combo "safe_dive" |
| Compass | Rare finds appear twice as often. | 85,000 | After reaching 600 m |
| Jackpot Chest | Grabs relics in its column. | 115,000 | After 100,000 total Gold |
| Echo | Repeats your last grab at half value. | 62,000 | After you find the combo "gilded_press" |
| Fuse | When a danger hits in its column, nearby dangers blow up for Gold. | 155,000 | After 150,000 total Gold |

### Fine print for a few parts

- **Net** grabs gems in its own column at full value and the column to its right at 75%.
- **Splitter** copies are marked as copies. A copy is never split again, so there are no endless loops.
- **Echo** remembers the last real grab. It never repeats its own echo.
- **Metronome** makes each changing Part in its row work one extra time, never more than twice.
- **Plate** blocks one danger, then rests 5 steps. **Shield** has 3 charges for the whole Drop.
- **Fuse** blows up dangers in the columns next to a danger that hits. If one of those has a Fuse in its column, that Fuse goes off too.
- **Spare Rope**: only one counts. **Compass**: only one counts. **Lantern**: each one adds 10% (up to 50%).
- **Multiplier** pays x2. A Workshop upgrade can make it x3.
- Part state (Shield charges, Battery power, Gilder count, Echo memory, Plate rest) resets every Drop.

## Combos (17)

Each combo shows in the Codex the first time your Rig makes it.

| Combo | What it does | How to build it |
|---|---|---|
| Gem Press | Smelter, then Polisher, then Multiplier in one column (bottom to top). Ore leaves as rich gems. | Smelter at the bottom, Polisher above it, Multiplier above that, all in one column. |
| Wide Net | A Splitter with a Net on each side in its row. Every gem is grabbed in three columns. | Splitter in the middle, one Net directly left and one directly right (same row). |
| Safe Dive | Shield, Oil Can and Anchor together. Slow, deep and steady. | Shield, Oil Can and Anchor anywhere in the Rig. |
| Drill Rush | Drill, Cooler and Plate together. Fast and greedy, with a little cover. | Drill, Cooler and Plate anywhere in the Rig. |
| Echo Chamber | An Echo in or beside a column that holds a Multiplier. Big grabs ring twice. | Echo in the same column as a Multiplier, or in the column next to it. |
| Prism Pair | Two Prisms side by side or one above the other. High tier gems shimmer. | Two Prisms side by side or one above the other. |
| Battery Burst | A Battery with 3 or more grabbing Parts. It fills fast and pays double often. | A Battery plus 3 grabbing Parts (Hook, Magnet, Net, Vacuum or Jackpot Chest). |
| Metronome Mill | A Metronome with 2 or more changing Parts in its row. They work twice every 4th step. | A Metronome plus 2 changing Parts in the same row. |
| Lantern Scout | Lantern and Compass together. See what comes and find rare things more. | Lantern and Compass anywhere in the Rig. |
| Relic Hunter | A Jackpot Chest right beside a Compass. Relics turn up and get grabbed. | Jackpot Chest touching a Compass (also diagonally). |
| Fuse Chain | Two Fuses in neighbouring columns. One blast sets off the next. | Two Fuses in neighbouring columns. |
| Gilded Press | A Gilder and a Multiplier in the same column. Every 5th gem pays a lot. | Gilder and Multiplier in the same column. |
| Loud Chain | An Amplifier above 2 or more changing Parts in its column. Each one makes it louder. | Amplifier at the top, with 2 or more changing Parts below it in its column. |
| Rock Alchemist | Spike Guard, then Smelter, then Polisher in one column. Dangers become gems. | Spike Guard at the bottom, Smelter above it, Polisher above that, in one column. |
| Cool Sweep | A Vacuum and a Cooler in the same column. It grabs a lot and cools the rope. | Vacuum and Cooler in the same column. |
| Iron Wall | Plate, Shield and Spike Guard together. Very few dangers get through. | Plate, Shield and Spike Guard anywhere in the Rig. |
| Long Rope | Spare Rope, Oil Can and Cooler together. A rope that lasts and lasts. | Spare Rope, Oil Can and Cooler anywhere in the Rig. |

Combo ids (used by the Codex): `gem_press`, `wide_net`, `safe_dive`, `drill_rush`, `echo_chamber`, `prism_pair`, `battery_burst`, `metronome_mill`, `lantern_scout`, `relic_hunter`, `fuse_chain`, `gilded_press`, `loud_chain`, `rock_alchemist`, `cool_sweep`, `iron_wall`, `long_rope`.

## Daily twists (8)

One twist per day. Every 8 days all 8 show up once, and the same twist never shows two days in a row.

| Twist | What it does |
|---|---|
| Brittle Rope | The rope is weaker (-30 max Strain) but Gold pays 40% more. |
| Gem Rain | Better gems fall today. |
| Danger Fest | Many more dangers, but every danger you stop pays Gold. |
| Heavy Bucket | The bucket sinks faster, and the rope feels it. |
| Lucky Day | A little more luck, more relics and a bit more Gold. |
| Ore Flood | Ore everywhere, and fewer gems. |
| Thin Air | The rope strains less, but fewer gems show up. |
| Deep Calling | Start at 100 m, with 30% more Strain. |

## For the other AIs

- Parts: `getPart(id)`, `allParts()`, `partsByFamily(f)`, `detectCombos(rig)`, `comboInfo(id)`, `allCombos()` from `src/engine/parts/index.js`.
- Twists: `getTwist(id)`, `todaysTwist(dateKey)`, `applyTwist(mods, id)` from `src/engine/twists.js`.
- Engine: see `docs/requests/AI-3-to-AI-2-parts-runtime.md` for how a beat calls the parts.
