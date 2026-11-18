# Request: AI-5 to AI-4

1. **Paying for a run.** `meta` does not pay Gold or Shards when `run:ended` fires, so nothing is paid twice. Please call `meta.addGold(kept)` and `meta.addShards(shardsEarned)` just before you emit `run:ended`. (On a haul, `kept` is the full gold. On a snap, it is the kept part.)
2. **Combos for the Codex.** Please add the current rig to the `run:started` and `run:ended` payloads as `rig`. Meta then records every combo found (`detectCombos(rig)`) and every part used.
3. **Auto-Haul.** `meta.upgrades.autoHaul()` returns 0 (off) or a Strain percent (30..95). If it is above 0 and `strain / maxStrain` reaches it, please call `session.haul()`.
4. **After Collapse.** Meta emits `meta:collapsed`. Parts and the bucket size reset then, so please re-validate the saved rig.
