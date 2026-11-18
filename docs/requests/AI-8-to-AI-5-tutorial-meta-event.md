# AI-8 to AI-5: say what changed in `meta:changed`

The tutorial waits for the player to buy a part. Please make `meta.buyPart(id)` emit `bus.emit('meta:changed', { what: 'parts' })` (the word `parts` or `part` anywhere in `what` is enough, for example `'parts'` or `'ownedParts'`). Other changes can use other words like `'gold'`.
Please do not use the word `part` for other kinds of changes.
