# ECONOMY-3 notes

Task: make bot styles 50, 70, 85, 100 meet the targets, fix style 50, check part and boon balance, check new reward sources, write the final table.

## Push 1: the bot was the first problem (tools/bot.js only, no game numbers changed)
Plain words. Two bot habits made results look worse than a real player would get:
1. It spent every coin on Crew the moment it could, so it never saved for the next rope level. Style 50 sat at max Strain 1000 for 12 hours with 349 M Gold per hour coming in. Now the bot saves for rope when the next level is under 20 minutes of Crew income away (SAVE_S).
2. After a Collapse the rig finder stacks duplicate copies (Extra Copy). Those rigs build Strain fast and the same rope reached only about 170 m instead of about 460 m. The bot now tries the finder's rig and a one-copy rig and keeps the one that pays more Gold per beat.
3. New: `--collapse=on` takes the Collapse for real and reports "1000 m after it" (a single drop of 1000 m after the reset). It also buys Core Dust upgrades. Default stays off so tests and the report are unchanged.

First numbers with these fixes (seed 1): style 85: Collapse 2.36 h, 1000 m after it 1.60 h. Style 50: 500 m at 3.7 h, Collapse ready 6.6 h (target 5 h at most), 250 m 26 min (target 10 to 20).

Check: npm run check green (one flaky failure in integration-flow-real under load, passes alone and on re-run).

STATUS: NOT DONE (in progress)
