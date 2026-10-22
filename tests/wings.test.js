const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({ Math });
for (const file of ['sudoku-core.js', 'techniques.js', 'rating.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
const fixtures = {
  'WXYZ-Wing': [255,3,80,12,255,32,30,255,255,65,33,2,8,162,33,255,162,26,255,255,255,14,255,201,98,164,255,255,228,255,255,131,255,104,255,85,255,169,255,128,6,194,255,32,255,255,11,16],
  'XYZ-Wing': [255,255,255,255,255,255,255,144,255,208,34,255,64,255,44,255,28,255,210,255,255,80,255,255,255,255,255,255,132,58,64,255,255,255,255,28,133,255,255,99,39,255,12,204,255,144,57,255],
  'XY-Wing': [18,64,255,255,255,255,65,4,204,36,36,255,3,255,255,255,65,129,2,255,255,24,255,48,24,2,255,255,255,255,72,112,255,255,144,255,196,255,136,34,192,255,200,255,6,255,8,81],
  'W-Wing': [255,195,69,24,18,107,255,6,255,255,255,74,255,255,255,255,13,50,195,200,255,255,104,40,48,192,50,9,140,2,196,12,101,208,5,255,255,136,255,7,104,5,255,255,255,15,69,255]
};
for (const [name, candidates] of Object.entries(fixtures)) {
  context.fixture = candidates;
  context.name = name;
  const result = vm.runInContext(`(() => {
    const state = { values: Array(48).fill(0), candidates: fixture.slice() };
    const steps = findWingSteps(state).filter(s => s.technique === name);
    if (!steps.length) return { count: 0 };
    const first = steps[0];
    const invalid = { values: state.values.slice(), candidates: state.candidates.slice() };
    for (const cell of first.cells) invalid.candidates[cell - 1] = 255;
    const hasInvalidPattern = findWingSteps(invalid).some(s => s.technique === name && s.cells.join(',') === first.cells.join(','));
    return { count: steps.length, sound: steps.every(step => verifyTechniqueStep(state, step)), hasInvalidPattern };
  })()`, context);
  assert.ok(result.count, `${name} was not found`);
  assert.equal(result.sound, true, `${name} had an unsound elimination`);
  assert.equal(result.hasInvalidPattern, false, `${name} accepted a broken pattern`);
}
const ambiguous = vm.runInContext(`(() => {
  const state = createTechniqueState(Array(48).fill(0));
  state.candidates[38] = 136; state.candidates[21] = 24; state.candidates[34] = 144;
  const step = findWingSteps(state).find(s => s.technique === 'XY-Wing' && s.cells.join(',') === '39,22,35');
  return countStateSolutions(state, 2) === 2 && !!step && verifyTechniqueStep(state, step);
})()`, context);
assert.equal(ambiguous, true, 'The rule must remain sound for multiple-solution positions');
const example = vm.runInContext(`(() => {
  const state = createTechniqueState(Array.from('....7...1....64..........32..7.47....52........1', c => c === '.' ? 0 : Number(c)));
  let steps = 0, wingUsed = false;
  while (!state.values.every(Boolean) && steps < 100) {
    const step = nextTechniqueStep(state);
    if (!step) break;
    wingUsed ||= step.technique === 'W-Wing';
    applyTechniqueStep(state, step); steps++;
  }
  return state.values.every(Boolean) && wingUsed;
})()`, context);
assert.equal(example, true, 'The reported puzzle should complete using a W-Wing');
console.log('Verified positive and broken wing patterns.');
