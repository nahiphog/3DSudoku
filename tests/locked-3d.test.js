const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({ Math });
for (const file of ['sudoku-core.js', 'techniques.js', 'rating.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
const outcome = vm.runInContext(`(() => {
  const puzzle = Array.from('....7...1....64..........32..7.47....52........1', c => c === '.' ? 0 : Number(c));
  const state = createTechniqueState(puzzle);
  for (let i = 0; i < 22; i++) {
    const step = nextTechniqueStep(state);
    if (!step) throw new Error('Walkthrough stopped before step 22');
    applyTechniqueStep(state, step);
  }
  const step = nextTechniqueStep(state);
  const sound = verifyTechniqueStep(state, step);
  const before = state.candidates[39];
  applyTechniqueStep(state, step);
  const after = state.candidates[39];
  const hiddenTriple = findTechniqueSteps(state).some(s => s.technique === 'Hidden Triple' && s.houses.includes(16) && s.digits.join(',') === '4,6,8');
  return {step, sound, before, after, hiddenTriple};
})()`, context);
assert.equal(outcome.step.technique, 'Locked candidates (3D sudoku)');
assert.equal(outcome.step.houses[0], 13);
assert.deepEqual(Array.from(outcome.step.cells).sort((a,b) => a-b), [3, 23]);
assert.equal(outcome.step.digits[0], 3);
assert.ok(outcome.step.eliminations.some(item => item.cell === 40 && item.digit === 3));
assert.equal(outcome.sound, true);
assert.ok(outcome.before & (1 << 2));
assert.equal(outcome.after & (1 << 2), 0);
assert.equal(outcome.hiddenTriple, false);
console.log('Verified the 3D locked-candidate step and the reported puzzle.');
