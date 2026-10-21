const regions = [
  [1,2,3,4,5,6,7,8], [9,10,11,12,13,14,15,16],
  [17,18,21,22,25,26,29,30], [19,20,23,24,27,28,31,32],
  [33,34,35,36,37,38,39,40], [41,42,43,44,45,46,47,48]
];
const rows = [
  [1,2,3,4,36,40,44,48], [5,6,7,8,35,39,43,47],
  [9,10,11,12,34,38,42,46], [13,14,15,16,33,37,41,45],
  [29,25,21,17,13,9,5,1], [30,26,22,18,14,10,6,2],
  [31,27,23,19,15,11,7,3], [32,28,24,20,16,12,8,4],
  [17,18,19,20,33,34,35,36], [21,22,23,24,37,38,39,40],
  [25,26,27,28,41,42,43,44], [29,30,31,32,45,46,47,48]
];

// Each group must contain all eight digits, so no peers may share a digit.
const groups = [...regions, ...rows];
const peers = Array.from({ length: 48 }, (_, index) => {
  const number = index + 1;
  return [...new Set(groups.filter(group => group.includes(number)).flat())]
    .filter(other => other !== number).map(other => other - 1);
});

function generateSolution() {
  const values = Array(48).fill(0);
  function solve() {
    let chosen = -1;
    let candidates = [];
    for (let cell = 0; cell < 48; cell++) {
      if (values[cell]) continue;
      const used = new Set(peers[cell].map(peer => values[peer]));
      const options = [1,2,3,4,5,6,7,8].filter(digit => !used.has(digit));
      if (!options.length) return false;
      if (chosen === -1 || options.length < candidates.length) {
        chosen = cell;
        candidates = options;
      }
    }
    if (chosen === -1) return true;
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (const digit of candidates) {
      values[chosen] = digit;
      if (solve()) return true;
      values[chosen] = 0;
    }
    return false;
  }
  return solve() ? values : null;
}


// Stop at two solutions: that is enough to establish non-uniqueness.
function countSolutions(puzzle) {
  const values = puzzle.slice();
  if (values.length !== 48 || values.some(value => !Number.isInteger(value) || value < 0 || value > 8)) return 0;
  if (values.some((value, cell) => value && peers[cell].some(peer => values[peer] === value))) return 0;
  let count = 0;
  function search() {
    let chosen = -1;
    let candidates = [];
    for (let cell = 0; cell < 48; cell++) {
      if (values[cell]) continue;
      const used = new Set(peers[cell].map(peer => values[peer]));
      const options = [1,2,3,4,5,6,7,8].filter(digit => !used.has(digit));
      if (!options.length) return;
      if (chosen === -1 || options.length < candidates.length) {
        chosen = cell;
        candidates = options;
      }
    }
    if (chosen === -1) { count++; return; }
    for (const digit of candidates) {
      values[chosen] = digit;
      search();
      values[chosen] = 0;
      if (count >= 2) return;
    }
  }
  search();
  return count;
}

function digPuzzle(solution) {
  const puzzle = solution.slice();
  const order = Array.from({ length: 48 }, (_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // A rejected removal cannot become unique after removing more clues.
  for (const cell of order) {
    const digit = puzzle[cell];
    puzzle[cell] = 0;
    if (countSolutions(puzzle) !== 1) puzzle[cell] = digit;
  }
  return puzzle;
}

