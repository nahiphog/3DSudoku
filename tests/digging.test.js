const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ Math });
vm.runInContext(fs.readFileSync('sudoku-core.js', 'utf8'), context, { filename: 'sudoku-core.js' });
const run = source => vm.runInContext(source, context);

vm.runInContext(`
  function referenceCountSolutions(puzzle) {
    const values = puzzle.slice(); let count = 0;
    function search() {
      let chosen = -1, candidates = [];
      for (let cell = 0; cell < 48; cell++) {
        if (values[cell]) continue;
        const used = new Set(peers[cell].map(peer => values[peer]));
        const options = [1,2,3,4,5,6,7,8].filter(digit => !used.has(digit));
        if (!options.length) return;
        if (chosen < 0 || options.length < candidates.length) { chosen = cell; candidates = options; }
      }
      if (chosen < 0) { count++; return; }
      for (const digit of candidates) { values[chosen] = digit; search(); values[chosen] = 0; if (count >= 2) return; }
    }
    search(); return count;
  }
`, context);

assert.equal(run('countSolutions(Array(48).fill(0))'), 2, 'The solver stops after two solutions.');
assert.equal(run('countSolutions(Array(48).fill(1))'), 0, 'Conflicting givens have no solution.');
assert.equal(run('(()=>{const solution=generateSolution(); return countSolutions(solution)})()'), 1, 'A completed generated grid is unique.');
assert.equal(run(`(()=>{
  const solution=generateSolution(), puzzle=solution.slice();
  for(let cell=0;cell<48;cell+=3)puzzle[cell]=0;
  return countSolutions(puzzle)===referenceCountSolutions(puzzle);
})()`), true, 'The optimized solver agrees with the original peer-scan solver.');
const profile = run('(()=>{const solution=generateSolution(); const metrics={}; const puzzle=digPuzzle(solution,metrics); return {unique:countSolutions(puzzle), clues:puzzle.filter(Boolean).length, metrics}})()');
assert.equal(profile.unique, 1, 'A dug puzzle remains unique.');
assert.equal(profile.metrics.removalChecks, 48, 'The digger checks each clue once.');
assert.ok(profile.metrics.nodes > 0 && profile.metrics.candidateChecks >= profile.metrics.nodes, 'Profiling records solver work.');
console.log(`Verified bit-mask uniqueness solver across ${profile.metrics.removalChecks} removal checks and ${profile.metrics.nodes} search nodes.`);
