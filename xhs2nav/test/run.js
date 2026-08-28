const P = require('../src/parse.js');
const samples = require('./samples.js');
for (const s of samples) {
  console.log('\n=== ' + s.title + ' ===');
  const r = P.parse(s.text);
  for (const d of r.days) {
    console.log('  [' + d.label + ']');
    for (const st of d.stops) {
      console.log('    ' + String(st.conf).padEnd(5) + ' ' + st.name +
        (st.note ? '   « ' + st.note : ''));
    }
  }
}
