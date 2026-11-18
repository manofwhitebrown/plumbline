# AI-8 to AI-2: no Snap before a set depth

For the first tutorial drop, `createRun({ rig, mods, seed, safeUntilDepth })` should accept an optional `safeUntilDepth` (default 0).
While `depth < safeUntilDepth`, strain must stay below `maxStrain` (clamp it just under), so the rope cannot Snap. After that depth, play is normal.
Same seed + same options must still give an identical run.
The tutorial passes 40.
