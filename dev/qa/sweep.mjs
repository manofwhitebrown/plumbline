import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
const sizes=[process.argv[3].split('x').map(Number)];
const screens=(process.argv[4]||'home,workshop,rig,drop,results,crew,codex,rewards,settings,guide').split(',');
const fixture=process.argv[2]||'busy';
const exe=await chromium.executablePath(); const launch=()=>puppeteer.launch({args:[...chromium.args,'--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer'],executablePath:exe,headless:'shell'});
const issues=[];
for(const [w,h] of sizes){
  for(const s of screens){
    const b=await launch(); const p=await b.newPage(); await p.setViewport({width:w,height:h,deviceScaleFactor:1,isMobile:w<500,hasTouch:w<500});
    const logs=[];
    p.on('console',m=>{if(['error','warning'].includes(m.type()))logs.push(m.type()+': '+m.text())});
    p.on('pageerror',e=>logs.push('pageerror: '+e.message));
    p.on('requestfailed',r=>logs.push('reqfail: '+r.url()));
    p.on('response',r=>{if(r.status()>=400)logs.push('http'+r.status()+' '+r.url())});
    await p.goto(`http://127.0.0.1:4173/?debug=1&screen=${s}&fixture=${fixture}`,{waitUntil:'load'}).catch(e=>logs.push('goto '+e.message));
    const t0=Date.now(); let gone=true; try{await p.waitForFunction(()=>!document.getElementById('splash'),{timeout:20000})}catch(e){gone=false}; const splashMs=Date.now()-t0; await new Promise(r=>setTimeout(r,800));
    const claimed=await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/^claim$/i.test(x.innerText.trim())&&x.getBoundingClientRect().width>0); if(b){b.click();return true}return false});
    await new Promise(r=>setTimeout(r,s==='drop'?3500:4500));
    const m=await p.evaluate(()=>{
      const d=document.documentElement;
      const txt=document.body.innerText;
      const bad=(txt.match(/NaN|undefined|Infinity|\[object/g)||[]);
      const small=[...document.querySelectorAll('button,a,[role=button]')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.width<44||r.height<44)}).length;
      return {sw:d.scrollWidth,cw:d.clientWidth,bad,small,len:txt.length};
    });
    await p.screenshot({path:`../../../scratch/shots/${fixture}-${s}-${w}x${h}.png`});
    console.log(`${w}x${h} ${s}: scrollW ${m.sw}/${m.cw} bad=${m.bad.join(',')||'-'} smallTargets=${m.small} claimed=${claimed} textLen=${m.len} splash=${gone?splashMs+'ms':'STUCK'} logs=${logs.length}`);
    logs.slice(0,4).forEach(l=>console.log('   ',l.slice(0,200)));
    await b.close();
  }
}
