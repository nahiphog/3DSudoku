const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ctx = vm.createContext({ Math });
for (const file of ['sudoku-core.js', 'techniques.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
function run(code) { return vm.runInContext(code, ctx); }
assert.equal(run(`countStateSolutions(createTechniqueState(Array(48).fill(0)), 2)`), 2);
assert.equal(run(`(()=>{const s=generateSolution(); s[1]=s[0]; try { createTechniqueState(s); return false; } catch { return true; }})()`), true);
assert.equal(run(`(()=>{const s=generateSolution(); const st=createTechniqueState(s); return countStateSolutions(st,2)})()`), 1);
assert.equal(run(`(()=>{const s=generateSolution(); s[0]=0; const st=createTechniqueState(s); st.candidates[0]=0; return countStateSolutions(st,2)})()`), 0);
assert.equal(run(`(()=>{const st=createTechniqueState(Array(48).fill(0)); return verifyTechniqueStep(st,{placements:[{cell:1,digit:1}],eliminations:[]})})()`), false);
assert.equal(run(`(()=>{const st=createTechniqueState(Array(48).fill(0)); return verifyTechniqueStep(st,{placements:[],eliminations:[{cell:1,digit:1}]})})()`), false);
let found = 0;
for (let i=0;i<12;i++) {
  const outcome = run(`(()=>{const solution=generateSolution(), puzzle=digPuzzle(solution), state=createTechniqueState(puzzle), steps=findTechniqueSteps(state); return {steps: steps.length, all: steps.every(step=>verifyTechniqueStep(state,step)), valid: countStateSolutions(state,2)===1}})()`);
  assert.equal(outcome.valid,true); assert.equal(outcome.all,true); found += outcome.steps;
}
assert.ok(found > 0, 'Generated positions should yield deductions');
assert.equal(run(`(()=>{const solution=generateSolution(); const puzzle=solution.slice(); puzzle[0]=0; const state=createTechniqueState(puzzle); const steps=findTechniqueSteps(state); return steps.some(s=>s.technique==='Full House'&&verifyTechniqueStep(state,s)) && steps.some(s=>s.technique==='Naked Single'&&verifyTechniqueStep(state,s)) && steps.some(s=>s.technique==='Hidden Single'&&verifyTechniqueStep(state,s))})()`), true);
console.log(`Passed: independently checked ${found} deductions across 12 generated puzzles, plus invalid, ambiguous and single fixtures.`);
