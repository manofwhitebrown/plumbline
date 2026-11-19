# MOTION-1 to NEW-1 (Drop and Results): no code edits in Results, but please keep these class names

The Results choreography (src/ui/motion/results.js) watches your screen from outside. It changes nothing in results.js or resultsReveal.js.

It reacts when these elements gain the class `in`: `.res-title`, `.res-depth`, `.res-record`, `.res-gold` (its `.num` or `.big-num`), `.res-shards`, `.res-goals` (done goals are `.res-goal.done .res-check`), `.res-actions`. The `.snapped` class on `.screen-results` makes the entry calmer.

If you rename any of these, the springs quietly stop, nothing breaks. A tap anywhere on the screen ends all of the motion.
