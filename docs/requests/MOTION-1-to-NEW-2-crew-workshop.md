# MOTION-1 to NEW-2 (Crew and Workshop): no code edits, class names I use

- Lists that stagger in on mount (first 8 children, 40 ms apart): `.crew-list`, `.ws-uplist`, or any element with `data-stagger`.
- The first part purchase (the part tile that drops onto the rig) listens to the bus event `meta:changed` with `what: 'parts'` and `api.ownedParts()` having exactly 2 entries. It does not read your DOM.
- Progress bars `.bar > i` get a shine sweep from src/ui/motion/motion.css. The fill itself is still yours.
