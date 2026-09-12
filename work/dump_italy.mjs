import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const DIR='/tmp/claude-0/-home-user--/e07f952c-feef-5bae-a52f-f48f64f371e6/scratchpad/zztest';
const HTML='file://'+DIR+'/index.html';
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport:{width:393,height:873} });
const page = await ctx.newPage();
await page.addInitScript(()=>{ window.ZouzheBridge={copy(){},openUrl(u){window.__lastOpenUrl=u;}}; });
await page.goto(HTML,{waitUntil:'load',timeout:60000});
await page.waitForTimeout(3500);
// open Italy explicitly
await page.evaluate(()=>{[...document.querySelectorAll('#zz-trip-list div')].find(d=>(d.textContent||'').trim()==='意大利 13 日')?.click();});
await page.waitForTimeout(1500);

const data = await page.evaluate(()=>{
  const c=window.__ZZ_COMP;
  const out={ tripId:c.__zzTripId, Y:c.Y, days:null, pre:null, book:null, emg:null, cons:null, err:{} };
  try{ out.days = JSON.parse(JSON.stringify(c.trip())); }catch(e){ out.err.days=e.message; }
  for (const [k,fn] of [['pre','preRaw'],['book','bookRaw'],['emg','emgRaw'],['cons','consRaw']]){
    try{ out[k]=JSON.parse(JSON.stringify(c[fn]())); }catch(e){ out.err[k]=e.message; }
  }
  // route info per day
  try{ out.routes={}; const n=c.trip().length; for(let i=1;i<=n;i++){ out.routes[i]=JSON.parse(JSON.stringify(c.rtOf(i))); } }catch(e){ out.err.routes=e.message; }
  return out;
});
writeFileSync(DIR+'/italy.json', JSON.stringify(data,null,2));
console.log('tripId:',data.tripId,'Y:',data.Y,'days:',data.days?data.days.length:'ERR');
console.log('errors:',JSON.stringify(data.err));
console.log('sections: pre=',Array.isArray(data.pre)?data.pre.length:typeof data.pre,
            ' book=',Array.isArray(data.book)?data.book.length:typeof data.book,
            ' emg=',Array.isArray(data.emg)?data.emg.length:typeof data.emg,
            ' cons=',Array.isArray(data.cons)?data.cons.length:typeof data.cons);
console.log('day1 keys:', data.days?Object.keys(data.days[0]).join(','):'-');
console.log('node1 keys:', data.days&&data.days[0].nodes?Object.keys(data.days[0].nodes[0]).join(','):'-');
await browser.close();
