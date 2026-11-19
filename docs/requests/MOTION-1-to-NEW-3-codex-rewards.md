# MOTION-1 to NEW-3 (Codex, Rewards, Guide): no code edits, what I listen to

- Daily claim chest: `meta:changed` with `what: 'daily'` when `api.daily.state().streak` changes and `canClaim` is false afterwards. Claim gold and shards fly to `[data-tut="gold"]` / `.pill.gold` and `[data-tut="shards"]` / `.pill.shards` if those exist, else to the top corners. If you add a `data-tut="coredust"` pill, the Collapse Core Dust will spiral into it.
- Achievement banner: bus `achievement:unlocked { id }`, title from `api.achievements.list()` (name or title).
- Codex discovery: bus `codex:new { id }`, name from `api.codex.list()`.
- Lists `.rw-list` and `.cx-list` stagger in on mount (first 8 only).
