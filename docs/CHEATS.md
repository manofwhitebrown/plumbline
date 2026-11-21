# Cheats (owner only)

The cheat panel is hidden and locked with a password. This page lists what each cheat does. It does not hold the password.

## The rules

- The first time you use a real cheat, the save is marked **Cheats used**. Settings shows this honestly.
- After that: no new records, no achievements and no new Codex finds. Gold from the Crew still counts.
- Cheat Gold does not count toward Collapse or achievements.
- Each cheat shows a short message saying what changed.
- The **Tools** cheats do not change the game, so they do not mark the save.
- Five wrong tries in a row lock the box for 30 seconds. The box never says how close you were.
- **Clear cheat flag and reset progress** erases the save so you can start clean. It works even while locked, because it only erases.

## Money

- **Add 1K / 1M / 1B / 1T Gold**: adds that much Gold.
- **Gold x 1000**: multiplies your Gold by 1000.
- **Add 100 Shards**, **Add 10 Core Dust**.
- **Set Gold to 0**.

## Parts and Rig

- **Unlock all Parts**: you own one of every Part.
- **Own 5 copies of every Part**.
- **Biggest bucket (5 x 4)**.
- **Clear all Parts**: leaves only the Hook.

## Upgrades

- **Max all upgrades** and **Reset upgrades**.

## Run helpers

These go into the Drop through `mods.cheat`. They stay on until you change them.

- **Rope cannot Snap** and **Freeze Strain** (press again to turn off).
- **Drop speed x0.5 / x2 / x4** (or normal).
- **Always start at 100 / 250 / 500 / 1000 m** (or back to the top).
- **Lock Biome** to Clay, Quartz, Amber, Magma, Void or Abyss (or unlock it).
- **Gold x10 inside Drops** (press again to turn off).

## Play layer (boons, skills, surprises, guardians)

These go into the Drop through `mods.cheat.play`. They mark the save as **Cheats used**, like the other run helpers.

- **Start Drops with every boon** (press again to turn off).
- **First boon pick at 10 m**.
- **Skills: no cooldown, many charges** and **Unlock Flare as well**.
- **Next Drop: (a surprise) first**: one entry for each surprise (Gem Vein, Cave-in, Treasure Alcove, Echo Chamber, Rope Weevil, Merchant Lantern). It starts about 45 steps in, once per Drop.
- **Next Drop: meet (a guardian)**: Stone Warden, Amber Weaver, Magma Maw or Void Eye. It comes after the first few steps, once per Drop.
- **Clear all play cheats**.

## Time

- **Skip 1 h / 8 h / 24 h away**: acts like you were away. Open the Welcome back box to collect (the 8-hour cap still applies).
- **Claim the daily reward again**.
- **Finish all quests**: then claim them in Rewards.

## Progress

- **Make Collapse available now**.
- **Unlock every Codex entry** and **Unlock all achievements**.
- **Set best Depth** to 100 / 500 / 1000 / 2500 m.
- **Show every relic on the Wall**: all 36 appear on the Relic Wall so you can look at them. They do not count for the Wall bonus or for Looks.
- **Unlock every Look**: you can wear any bucket, rope or well Look. Looks are only colours, so nothing else changes.

- **Finish one Contract**: then claim it in Rewards.
- **Add 1 Mastery to every owned Part** and **Reset all Mastery**.
- **Reset the Daily Dive (new try)**: gives the free try back. A cheated save can start the Dive, but it earns no chest and no streak.

## Tools

- **Show FPS and particle count**: sends `cheats:debug`.
- **Print the last 50 log lines**: returns the lines as data.
- **Export save**: returns the save code to copy.
- **Reset everything**: asks you to press twice within 8 seconds.

## For the UI (AI-7)

`cheats.reveal()`, `cheats.tryPassword(text)`, `cheats.isUnlocked()`, `cheats.lock()`, `cheats.lockedForMs()`, `cheats.list()` (groups of items), `cheats.run(id)` returns `{ ok, text, data?, needsConfirm? }`, `cheats.wasUsed()`, `cheats.clearFlagAndReset()`. Listen to `cheats:result` for toasts and `cheats:debug {fps}` for the FPS counter.
