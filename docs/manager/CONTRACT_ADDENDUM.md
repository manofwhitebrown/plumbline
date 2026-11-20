# CONTRACT ADDENDUM (HOOK-1): the play layer

Additions only. Nothing in docs/CONTRACT.md changed. Listeners must ignore events they do not know.

## Switch
`createRun({ rig, mods, seed, play })` and `simulateRun({ ..., play, skills })`. `play` is `undefined` (old behaviour, no new events)
or an options object (`{}` = defaults from src/data/play.js). Needs the real parts; test fakes ignore it.

## New status
`run.state.status === 'choosing'`: a boon or Merchant offer is open. `stepBeat` returns `[]` until `chooseBoon` answers. `haul` does nothing while choosing.

## New functions (src/engine/index.js)
- `chooseBoon(run, id)` -> events. `id` = a card id, or `null`/`'auto'` for the middle card (the 6 s timeout). Junk ids return `[]`.
- `useSkill(run, 'brace'|'surge'|'flare')` -> events (`[]` if locked, cooling or paused). `skillCheck(run, id)` -> '' or a short reason.
- `playView(run)` -> read-only object for HUD and pickers (offer, skills, boons, synergies, encounter, guardian, nextOffer, relics, shards) or `null`.
- `autoChoose(run)`, `autoSkills(run)` -> headless helpers for bots and tests.

## New events
| event | fields |
|---|---|
| ABILITY | id, phase ('used' / 'ready' / 'end'), strain? (used), row/cleared/lanes? (flare) |
| BOON_OFFER | kind ('boon'/'merchant'), source, options[{id,name,rarity,tags,desc,power,cost?}], seconds, depth, mid, cost |
| BOON_PICK | id, name, rarity, tags, auto, via ('pick'/'merchant'/'guardian') |
| BOON_SYNERGY | tag, name, desc, tagName |
| SECOND_WIND | left |
| ENCOUNTER_WARN | id, name, text, steps (3 steps before it starts) |
| ENCOUNTER_START / ENCOUNTER_END | id, name / id, success |
| RELIC_FOUND | id, name, rarity, biome, source ('item'/'alcove'/'guardian') |
| GUARDIAN_WARN | id, name, steps, depth, intro |
| GUARDIAN_START | id, name, hp, maxHp, steps, tip |
| GUARDIAN_HIT | id, dmg, hp, maxHp, lane, weak |
| GUARDIAN_DOWN | id, name, won, reward{shards,coreDust}|null, damage |

Items inside SPAWN and COLLECT may carry `weak: true` (guardian weak point) or `mark: true` (Treasure Alcove gem).
COLLECT with kind 'relic' and tier 1 can also come from Gold Tooth (a danger paid gold).

## Determinism
One stream, `run.play.rng`, seeded from the run seed. Offers draw once per card; encounters and guardians draw a fixed number when built.
