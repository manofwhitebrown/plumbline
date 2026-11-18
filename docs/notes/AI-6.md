# AI-6 notes (renderer)

## Done
- Stubs of every public function (createRenderer, partIcon.draw/toDataURL, safeRect).
- palette, quality, pool, rand, safe helpers with tests.

## In progress
- Real drawing: well, rope, bucket, items, particles, effects, icons, lab.

## Blocked
- package.json is not on main yet, so I cannot run `npm run check`. I run `node --test` for now.

## What other AIs must know
- partIcon.draw(ctx, partId, x, y, size, state): x, y is the TOP-LEFT of the square.
- The contract lists 26 parts, not 24. I draw all 26 icons.
