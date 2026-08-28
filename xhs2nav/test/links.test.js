const L = require('../src/links.js');
const withCoord = [
  { name: '深圳湾公园', lon: 113.9784, lat: 22.4936 },
  { name: '海上世界',   lon: 113.9166, lat: 22.4818 },
  { name: '蛇口老街',   lon: 113.9203, lat: 22.4874 },
  { name: '世界之窗',   lon: 113.9738, lat: 22.5389 },
  { name: '欢乐谷',     lon: 113.9835, lat: 22.5411 },
];
const noCoord = withCoord.map(s => ({ name: s.name }));

function dump(r, tag) {
  console.log('\n===== ' + tag + ' =====');
  console.log('mode=' + r.mode + ' coords=' + r.coords + (r.reason ? '  (' + r.reason + ')' : ''));
  for (const p of r.plans) {
    console.log('  ## ' + p.title + '  — ' + p.note);
    for (const leg of p.legs) {
      console.log('   ' + (leg.title || '(单段)') + '  ' + leg.from.name +
        (leg.vias.length ? ' →[' + leg.vias.map(v => v.name).join(',') + ']→ ' : ' → ') + leg.to.name);
      for (const k of leg.links) console.log('      ' + k.label.padEnd(16) + k.note + '\n        ' + k.url);
    }
  }
}
dump(L.build(withCoord, { os: 'android', mode: 'car', city: '深圳' }), '有坐标 · Android · 5点');
dump(L.build(withCoord, { os: 'ios', mode: 'car' }), '有坐标 · iOS · 5点');
dump(L.build(noCoord, { os: 'android', city: '深圳' }), '无坐标 · Android · 降级分段');

console.log('\n===== chunkRoute 边界 =====');
const mk = n => Array.from({length: n}, (_, i) => ({ name: 'P' + i }));
for (const n of [2, 3, 5, 6, 10, 11]) {
  console.log('  ' + String(n).padStart(2) + ' 点 / viaMax=3 → ' +
    JSON.stringify(L.chunkRoute(mk(n), 3).map(s => s.map(p => p.name).join('>'))));
}
