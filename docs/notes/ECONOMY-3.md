# ECONOMY-3 notes

Task: make bot styles 50, 70, 85, 100 meet the targets, fix style 50, check part and boon balance, check new reward sources, write the final table.

## Push 1: the bot was the first problem (tools/bot.js only, no game numbers changed)
Plain words. Two bot habits made results look worse than a real player would get:
1. It spent every coin on Crew the moment it could, so it never saved for the next rope level. Style 50 sat at max Strain 1000 for 12 hours with 349 M Gold per hour coming in. Now the bot saves for rope when the next level is under 20 minutes of Crew income away (SAVE_S).
2. After a Collapse the rig finder stacks duplicate copies (Extra Copy). Those rigs build Strain fast and the same rope reached only about 170 m instead of about 460 m. The bot now tries the finder's rig and a one-copy rig and keeps the one that pays more Gold per beat.
3. New: `--collapse=on` takes the Collapse for real and reports "1000 m after it" (a single drop of 1000 m after the reset). It also buys Core Dust upgrades. Default stays off so tests and the report are unchanged.

First numbers with these fixes (seed 1): style 85: Collapse 2.36 h, 1000 m after it 1.60 h. Style 50: 500 m at 3.7 h, Collapse ready 6.6 h (target 5 h at most), 250 m 26 min (target 10 to 20).

Check: npm run check green (one flaky failure in integration-flow-real under load, passes alone and on re-run).


## Push 2: bot results no longer depend on how busy the machine is (tools/bot.js)
The rig finder had a 5 second clock limit. When the computer was busy it stopped early and picked other rigs, so the same player got different times (style 85 Collapse 1.85 h busy, 2.36 h alone). The bot now limits the search by count only. Same code now gives the same answer every time.

## Number experiments (seed 1, NOT applied, saved in docs/notes/ECONOMY-3-wip-numbers.patch)
The patch holds: rope base 50, growth 2.45, +80 per level; Clay rock strain 1; catch-up after 2 snaps instead of 3 (data/play.js). Results with the patch (one seed, so treat as rough):
| Style | 100 m | 250 m | Collapse | 1000 m after |
|---|---|---|---|---|
| 50 | 5.1 min | 16.1 min | 5.88 h | not reached |
| 85 | 1.5 min (lucky drop) | 17.7 min | 1.67 h | 2.03 h |
| 70 | 4.3 min | 17.9 min | 2.25 h | 75.8 min |
Why not applied: it does not fix style 50 (Collapse still over 5 h) and style 85 after-Collapse got worse (1.60 h before, 2.03 h with it). One seed cannot tell luck from effect.

Tried and dropped, no effect or worse: shorter rope-saving window of 10 min (style 50 never reached 500 m in 9 h); Crew unlocks earlier (Assay 300 m, Foundry 400 m: identical numbers, so unlock depth is not the limit); Crew price growth 1.13 (style 85 identical, style 50 worse).

## What I learned about style 50
- Rope was the first block (fixed in the bot: it now saves for it). With that, style 50 reaches 500 m at about 3.5 to 3.7 h.
- After that the 100M Gold gate is the block: Gold earned in total is only about 1M at 2 h and 13M at 4 h, because careful drops pay 10 to 90k and Crew only snowballs late. Collapse is then ready at about 5.9 h.
- No knob for "a safe Haul Up pays a little more" exists in src/data; it would live in src/run/payout.js, not my file. That is the likely clean fix (or a lower gate only for careful players, which the design would not like).

## Baseline table (bot with the fixes, seed 1, real Collapse, no number changes)
| Style | 100 m (5 min) | 250 m (10 to 20) | Collapse | 1000 m after (under 1.5 h) |
|---|---|---|---|---|
| 50 | 6.4 min NOT MET | 26 min NOT MET | 6.4 h NOT MET (limit 5) | not reached NOT MET |
| 70 | 3.4 min ok | 17.1 min ok | 3.0 h | 1.69 h NOT MET |
| 85 | 4.8 min ok | 9.5 min (a little fast) | 2.36 h ok | 1.60 h NOT MET |
| 100 | 2.8 min ok | 12.6 min ok | 1.64 h | 49.8 min ok |

## Still not done
- tools/balance-report.js (part dominance, boon pick rates) not run.
- Contracts, daily dive, mastery, relic and daily rewards income share (about 10% target) not measured.
- The 8 character number check at 1000 m and after 10 Collapses not done.
- Only one seed per cell. Next session should run 3 seeds per cell before accepting any number.

STATUS: NOT DONE (style 50 and after-Collapse 1000 m miss targets; part, boon and reward checks not run)

## Session 2 (Saturday 21 Nov 2026): measurements, nothing applied yet
Plain words: I measured what limits a careful player (style 50). No game numbers changed in this push. The best number set so far is saved in docs/notes/ECONOMY-3-wip-numbers-v2.patch. It is NOT applied because pinned tests have not been updated and re-run.

Findings (bot, --collapse=on, --parts=off, 2 seeds):
- Style 50 earns almost all its Gold from Crew late. Its drops pay only 20k to 45k each at about 300 m. Collapse is ready at 6.1 h (limit 5 h).
- Crew unlock depths are not the limit for style 50 (Assay 300 m and Foundry 400 m gave identical Collapse times).
- Lowering only the Collapse gate (40M) is not enough: style 50 gets 5.1 to 5.3 h but style 85 falls to 1.5 to 1.9 h.
- Crew output x1.4 alone: style 50 5.5 to 5.7 h, style 85 barely changes.
- Patch v2 = Crew output x1.4 + Gold factor Quartz 1.8, Amber 2.2, Magma 2.4 + gentler hazards in Quartz, Amber, Magma. Result: style 50 Collapse 5.0 / 4.85 h (borderline), style 70 2.2 to 2.3 h, style 85 1.7 to 1.8 h, style 100 1.2 to 1.5 h. All first part, 100 m and 250 m targets still met.
- Still open with patch v2: style 85 "1000 m after Collapse" is 1.8 h (target under 1.5 h). Collapse resets Gold, Crew, Parts and Gold upgrades, so the time after is a rebuild of the first hour; an earlier Collapse made it worse, not better.

Not done: balance-report (part and boon rates), reward-source share, 8-character check, final table, updating pinned tests for patch v2.

STATUS: NOT DONE (style 50 borderline at 5 h, after-Collapse 1000 m for style 85 over target; part, boon and reward checks not run)
