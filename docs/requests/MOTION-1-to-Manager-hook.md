# MOTION-1 to Manager: hooks in shell.js and index.js

I added three guarded edits to src/ui/shell.js and one import to src/ui/index.js. None changes behaviour when the motion hook is missing or throws.

1. shell.js `setMotionHook(hook)`: stores an optional `{ before(root, from, to, back), after(token) }`.
2. shell.js go(): calls `before` just before unmount and `after` just after mount and updateChrome, each in try/catch.
3. shell.js back(): now calls `go(prev.id, prev.params, { replace: true, back: true })` so transitions can reverse direction.
4. index.js: `import './motion/index.js'` after the guide screen import.

If you change go() or back(), please keep those calls. Tests: tests/motion-transitions.test.js (last test covers the hook).
