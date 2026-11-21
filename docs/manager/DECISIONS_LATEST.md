# Manager decisions (latest)

- Flaky test "a snap pays exactly once": fixed by FIX-1 (clock seed + boon pause). Re-run alone 8 times by the Manager: 8 of 8 pass. ci green 8 runs in a row.
- Button release shrink bug (taps missed buttons): fixed in src/ui/motion/micro.js (real scale values). Request closed.
- Wall and Looks hooks added by FINISH-3 in src/meta/mods.js and src/ui/screens/codex.js: KEEP them.
- HOOK-2 hooks in rewards.js, workshopParts.js, rigSheet.js: KEEP them.
- Economy (tools/balance-report.js, Manager run): style 85 passes. Styles 50, 70 and 100 still miss targets (see ECONOMY-3 notes). Part dominance numbers for styles 50 and 70 (97%) only say that early rigs are tiny; not a real balance problem.
