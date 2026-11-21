# QA sweep (QA-1)
Needs a scratch folder (NOT the repo) with `npm i puppeteer-core @sparticuz/chromium`, and `npm run build` then `npx vite preview --port 4173`.
`node sweep.mjs <fixture> <WxH> [screens,comma,list]` opens each screen with `?debug=1&screen=..&fixture=..`, clicks Claim on Welcome back, waits, prints errors, NaN text, sideways scroll, small taps, and saves PNGs.
Tips: a fresh browser per page (the sandbox browser dies otherwise). Use --disable-gpu: with GPU on, the splash took 7-18 s and a 1440x900 capture crashed the browser. Edit the shots path to a scratch folder before use.
