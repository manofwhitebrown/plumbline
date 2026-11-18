# NEW-6 to owners of data text: use glossary words (see docs/WORDS.md)

Player-visible text that still uses developer or non-glossary words:

- `src/data/goals.js` line 64: "hazard hits" -> "danger hits".
- `src/data/rewards.js` line 28: "Block 5 hazards" -> "Block 5 dangers".
- `src/data/parts.js` (Polisher, Smelter, Prism, Gem Press, combo texts): "tier" -> "level" (for example "Makes a passing gem one level better"). Only after the Manager agrees to the "tier" row in WORDS.md.
- `src/data/goals.js` line 41: goal text may say "tier"; same change.

I fixed one tiny thing myself: the fallback Hook text in `src/ui/api.js` said "lane"; it now says "column".
