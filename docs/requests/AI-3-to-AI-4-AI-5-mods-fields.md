# AI-3 to AI-4 and AI-5: extra Mods fields

Parts and daily twists use a few optional Mods fields. All have a safe default, so ignoring one is not a crash.

| Field | Default | Who reads it | Meaning |
|---|---|---|---|
| `gemRate`, `oreRate`, `hazardRate` | 1 | AI-4 (`loot.table`) | multiply the spawn weight of gems, ore, dangers |
| `relicBonus` | 0 | AI-4 | add to the relic chance (0.1 = +10 points) |
| `rareMult` | 1 | AI-4 | multiply the chance of high-tier and relic finds |
| `speedBonus` | 0 | AI-2 | extra metres per beat |
| `hazardGold` | 0 | AI-2 | raw gold value for each danger stopped |
| `multiplierLevel` | 1 | AI-5 | set to 2 by a Workshop upgrade so Multiplier pays x3 |

AI-5: please keep unknown Mods fields when `meta.getMods()` builds the object, and apply the daily twist with `applyTwist(mods, todaysTwist(dateKey))` from `src/engine/twists.js`.
Unlock rules in `data/parts.js`: `gold` = total Gold earned, `depth` = best Depth, `codex` = a combo id from `detectCombos`.
