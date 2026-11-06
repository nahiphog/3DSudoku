const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const trials = Number(process.argv[2] || 100);
if (!Number.isInteger(trials) || trials < 1) throw new Error('Usage: npm run benchmark:dig -- [positive trial count]');
let state = 0x3d5d0;
function random() { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; }
const math = Object.create(Math); math.random = random;
const context = vm.createContext({ Math: math });
const dist = path.resolve(__dirname, '..', 'dist', 'sudoku-core.js');
vm.runInContext(fs.readFileSync(dist, 'utf8'), context, { filename: 'sudoku-core.js' });
const samples = [];
for (let trial = 0; trial < trials; trial++) {
  const start = performance.now();
  const result = vm.runInContext('(()=>{const metrics={};const solution=generateSolution();const puzzle=digPuzzle(solution,metrics);return {clues:puzzle.filter(Boolean).length,unique:countSolutions(puzzle),metrics}})()', context);
  samples.push({ milliseconds: performance.now() - start, ...result });
}
const values = samples.map(sample => sample.milliseconds).sort((a, b) => a - b);
const sum = key => samples.reduce((total, sample) => total + (sample.metrics[key] || 0), 0);
const percentile = ratio => values[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)];
console.log(JSON.stringify({
  trials,
  durationMs: { mean: values.reduce((a, b) => a + b, 0) / trials, median: percentile(.5), p95: percentile(.95) },
  averages: { clues: samples.reduce((total, sample) => total + sample.clues, 0) / trials, removalChecks: sum('removalChecks') / trials, nodes: sum('nodes') / trials, candidateChecks: sum('candidateChecks') / trials, deadEnds: sum('deadEnds') / trials },
  uniquePuzzles: samples.every(sample => sample.unique === 1)
}, null, 2));
