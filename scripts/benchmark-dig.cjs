const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const trials = Number(process.argv[2] || 100);
if (!Number.isInteger(trials) || trials < 1) throw new Error('Usage: npm run benchmark:dig -- [positive trial count]');
const source = fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'sudoku-core.js'), 'utf8');
const referenceSource = `
function referenceCountSolutions(puzzle) {
  const values = puzzle.slice();
  if (values.length !== 48 || values.some(value => !Number.isInteger(value) || value < 0 || value > 8)) return 0;
  if (values.some((value, cell) => value && peers[cell].some(peer => values[peer] === value))) return 0;
  let count = 0;
  function search() {
    let chosen = -1, candidates = [];
    for (let cell = 0; cell < 48; cell++) {
      if (values[cell]) continue;
      const used = new Set(peers[cell].map(peer => values[peer]));
      const options = [1,2,3,4,5,6,7,8].filter(digit => !used.has(digit));
      if (!options.length) return;
      if (chosen === -1 || options.length < candidates.length) { chosen = cell; candidates = options; }
    }
    if (chosen === -1) { count++; return; }
    for (const digit of candidates) { values[chosen] = digit; search(); values[chosen] = 0; if (count >= 2) return; }
  }
  search(); return count;
}
function referenceDigPuzzle(solution) {
  const puzzle = solution.slice();
  const order = Array.from({ length: 48 }, (_, index) => index);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  for (const cell of order) { const digit = puzzle[cell]; puzzle[cell] = 0; if (referenceCountSolutions(puzzle) !== 1) puzzle[cell] = digit; }
  return puzzle;
}`;
function createContext(seed) {
  let state = seed >>> 0;
  const math = Object.create(Math);
  math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; };
  const context = vm.createContext({ Math: math });
  vm.runInContext(source, context, { filename: 'sudoku-core.js' });
  return context;
}
function sample(context, expression) {
  const start = performance.now();
  const result = vm.runInContext(expression, context);
  return { milliseconds: performance.now() - start, ...result };
}
function stats(samples) {
  const values = samples.map(sample => sample.milliseconds).sort((a, b) => a - b);
  const percentile = ratio => values[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)];
  return { mean: values.reduce((a, b) => a + b, 0) / values.length, median: percentile(.5), p95: percentile(.95) };
}

const seed = 0x3d5d0;
const optimized = createContext(seed);
const reference = createContext(seed);
vm.runInContext(referenceSource, reference);
const optimizedSamples = [], referenceSamples = [];
for (let trial = 0; trial < trials; trial++) {
  optimizedSamples.push(sample(optimized, '(()=>{const solution=generateSolution();const puzzle=digPuzzle(solution);return {puzzle:puzzle.join(\'\'),unique:countSolutions(puzzle)}})()'));
  referenceSamples.push(sample(reference, '(()=>{const solution=generateSolution();const puzzle=referenceDigPuzzle(solution);return {puzzle:puzzle.join(\'\'),unique:referenceCountSolutions(puzzle)}})()'));
}
const identicalResults = optimizedSamples.every((sample, index) => sample.unique === 1 && referenceSamples[index].unique === 1 && sample.puzzle === referenceSamples[index].puzzle);
const before = stats(referenceSamples), after = stats(optimizedSamples);
console.log(JSON.stringify({
  trials,
  sameSeedAndRemovalOrder: true,
  identicalPuzzles: identicalResults,
  beforePeerScanMs: before,
  afterBitMaskMs: after,
  meanSpeedup: before.mean / after.mean
}, null, 2));
