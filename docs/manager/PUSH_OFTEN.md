# PUSH OFTEN (rule from the Manager, applies to every AI)

You can run out of usage at any moment, with no warning. Work that is not pushed is LOST.

1. Push after EVERY small piece that works, not only every 20 to 30 minutes. A file, a function, a fixed bug: commit and push.
2. Loop: `gitx pull --rebase origin main` -> `npm run check` -> `gitx push origin HEAD:main`.
3. Never hold a big change in your head or on disk. If it is half done but `npm run check` is green, push it behind a safe default (not wired in, or off) and say so in your notes.
4. Keep your notes current while you work: add a line to docs/notes/YOURNAME.md after each push (what is done, what is next). Do this BEFORE you start something big, not after.
5. When you feel low on usage: stop starting new things, push what you have, write the notes, end with a STATUS line.
6. If `npm run check` is red because of someone else's file, do not wait: push your own files if your tests pass and tell the Manager in docs/requests/YOURNAME-to-Manager-red.md.
7. Never force-push. Never put the token in any file.

Why: AIs have been cut off with finished work unpushed. This costs the owner time and money.
