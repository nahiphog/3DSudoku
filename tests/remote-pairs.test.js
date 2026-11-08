const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({ Math });
for (const file of ['sudoku-core.js', 'techniques.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
const result = vm.runInContext(`(() => {
  const solution = [7,4,6,3,8,5,2,1,1,6,4,7,2,3,8,5,4,7,5,8,6,1,3,2,5,2,1,6,3,8,7,4,6,2,3,1,4,8,7,5,7,3,4,8,1,5,6,2];
  const chain = [6, 7, 23, 21], target = 1, pairMask = digitBit(1) | digitBit(2);
  const values = solution.slice();
  [...chain, target].forEach(cell => values[cell] = 0);
  const state = createTechniqueState(values);
  chain.forEach(cell => state.candidates[cell] = pairMask);
  state.candidates[target] |= pairMask;
  const step = findRemotePairSteps(state).find(candidate => candidate.eliminations.some(item => item.cell === target + 1 && item.digit === 1));
  const nearMiss = { values: state.values.slice(), candidates: state.candidates.slice() };
  nearMiss.candidates[chain[2]] = digitBit(2) | digitBit(3);
  return {
    step,
    verified: !!step && verifyTechniqueStep(state, step),
    nearMissSteps: findRemotePairSteps(nearMiss).length
  };
})()`, context);
assert.ok(result.step, 'Finds the four-cell Remote Pair chain.');
assert.equal(result.verified, true, 'Remote Pair elimination is exhaustive-search verified.');
assert.equal(result.nearMissSteps, 0, 'A chain with a different bivalue pair is not a Remote Pair.');
console.log('Verified a Remote Pair elimination and a broken-chain near miss.');
