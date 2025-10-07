const fs = require('fs');
const path = require('path');
const covPath = path.resolve(process.cwd(), 'coverage/coverage-final.json');
if (!fs.existsSync(covPath)) {
  console.error('coverage-final.json not found at', covPath);
  process.exit(2);
}
const data = JSON.parse(fs.readFileSync(covPath, 'utf8'));

function pct(covered, total) {
  if (!total) return 100;
  return Math.round((covered / total) * 100);
}

function firstN(arr, n) { return arr.slice(0, n); }

const rows = Object.keys(data).map(file => {
  const v = data[file];
  const s = v.s || {};
  const stmtTotal = Object.keys(s).length;
  const stmtCovered = Object.values(s).filter(x => x > 0).length;
  const stmtPct = pct(stmtCovered, stmtTotal);

  const b = v.b || {};
  const branchTotal = Object.values(b).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
  const branchCovered = Object.values(b).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.filter(x => x > 0).length : 0), 0);
  const branchPct = pct(branchCovered, branchTotal);

  const f = v.f || {};
  const fnTotal = Object.keys(f).length;
  const fnCovered = Object.values(f).filter(x => x > 0).length;
  const fnPct = pct(fnCovered, fnTotal);

  const stmtMap = v.statementMap || {};
  const uncoveredStmtIds = Object.keys(s).filter(id => !(s[id] > 0));
  const uncoveredLines = uncoveredStmtIds.map(id => {
    const m = stmtMap[id];
    if (!m) return '?';
    return `${m.start.line}` + (m.end && m.end.line && m.end.line !== m.start.line ? `-${m.end.line}` : '');
  });

  const sampleUncovered = firstN(uncoveredLines, 6);

  return {
    file: path.relative(process.cwd(), file),
    statements: `${stmtCovered}/${stmtTotal}`,
    stmtPct,
    branches: branchTotal ? `${branchCovered}/${branchTotal}` : 'n/a',
    branchPct: branchTotal ? branchPct : 'n/a',
    functions: `${fnCovered}/${fnTotal}`,
    fnPct,
    sampleUncovered
  };
});

rows.sort((a,b) => a.stmtPct - b.stmtPct || (typeof a.branchPct === 'number' && typeof b.branchPct === 'number' ? a.branchPct - b.branchPct : 0));

console.log('\nLowest coverage files (by statements %):\n');
rows.slice(0, 40).forEach(r => {
  console.log(`- ${r.file}`);
  console.log(`  statements: ${r.statements} (${r.stmtPct}%)`);
  console.log(`  branches:   ${r.branches} (${r.branchPct}%)`);
  console.log(`  functions:  ${r.functions} (${r.fnPct}%)`);
  if (r.sampleUncovered && r.sampleUncovered.length) {
    console.log(`  uncovered statement lines (sample): ${r.sampleUncovered.join(', ')}`);
  }
  console.log('');
});

console.log('Done.');
