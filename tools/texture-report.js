// [PERF-1] Texture memory report: live canvases per subsystem after a dive. Run from the repo root:
//   SZ=360x800 DPR=2 node --expose-gc tools/texture-report.js   (the budget test is tests/perf-texture-budget.test.js)
import { createCanvas } from '@napi-rs/canvas';
const root = process.cwd();
const rec = []; 
globalThis.OffscreenCanvas = function (w, h) { return mk(w, h); };
function mk(w, h) { const c = createCanvas(w, h); const wr = new WeakRef(c); const st = new Error().stack.split('\n').map(s => (s.match(/src\/render\/([^:)]*)/)||[])[1]).filter(Boolean).filter(f => f !== 'canvasUtil.js'); rec.push({ wr, w, h, f: st[0] || '?', st: st.slice(0,3).join('<') }); return c; }
const { setCanvasFactory } = await import(root + '/src/render/canvasUtil.js'); setCanvasFactory(mk);
const { createRenderer } = await import(root + '/src/render/index.js');
const { models } = await import(root + '/src/render/models/index.js');
const [W, H] = (process.env.SZ||'430x932').split('x').map(Number), DPR = Number(process.env.DPR||2);
const BI = ['clay','quartz','amber','magma','void','abyss'], DEPTH = { clay: 40, quartz: 170, amber: 350, magma: 580, void: 850, abyss: 1200 };
const r = createRenderer(createCanvas(W*DPR, H*DPR), { quality: 'high', reduceMotion: false });
r.resize(W, H, DPR);
const rig = { cols: 5, rows: 4, cells: [[0,1,2,3,4].map(()=>null),[],[],[]].map(()=>[null,null,null,null,null]) };
for (const b of BI) { r.setRun({ status:'running', depth: DEPTH[b], gold:0, strain: 20, maxStrain:100, biomeId:b, combo:3 }, rig); for (let i=0;i<120;i++) r.frame(16,0.5); }
console.log('covered frames', r.debugStats().covered); let g = 0; while (models.step(200) > 0 && g++ < 500);
for (let i=0;i<30;i++) r.frame(16,0.5);
await new Promise(r=>setTimeout(r,50)); globalThis.gc(); await new Promise(r=>setTimeout(r,50)); globalThis.gc(); const all = rec.length; const live = rec.filter(c=>c.wr.deref()); console.log('created', all, 'live', live.length); rec.length = 0; rec.push(...live);
const by = {}; for (const c of rec) { const k = c.f.split('/')[0]; by[k] = by[k] || { n:0, mb:0 }; by[k].n++; by[k].mb += c.w*c.h*4/1048576; }
console.log(JSON.stringify(by, null, 1)); console.log('total MB', rec.reduce((a,c)=>a+c.w*c.h*4,0)/1048576, 'canvases', rec.length);
const agg={}; for (const c of rec) if (c.f.startsWith('depth')) { const k=c.f+' '+c.w+'x'+c.h; agg[k]=(agg[k]||0)+1; } console.log(agg);
const top = rec.slice().sort((a,b)=>b.w*b.h-a.w*a.h).slice(0,10).map(c=>`${c.w}x${c.h} ${(c.w*c.h*4/1048576).toFixed(2)}MB ${c.st}`); console.log(top.join('\n'));
const before = rec.length;
const { createHomeScene } = await import(root + '/src/render/homeScene.js');
const h = createHomeScene({ crew: 8 }); h.resize(W, H, DPR); h.frame(1.2); console.log('home', h.memoryBytes()/1048576, 'new canvases', rec.length - before, rec.slice(before).reduce((a,c)=>a+c.w*c.h*4,0)/1048576);
process.exit(0);
