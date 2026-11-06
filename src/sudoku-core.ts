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
// Every cell belongs to one region and two rows. Keeping these indices lets the
// uniqueness solver derive candidates from three small bit masks instead of
// rebuilding Sets from every peer at every search node.
const cellGroups = Array.from({ length: 48 }, (_, cell) =>
  groups.map((group, groupIndex) => group.includes(cell + 1) ? groupIndex : -1).filter(groupIndex => groupIndex >= 0)
);
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


const FULL_DIGIT_MASK = 0xff;
const solverBitCount = mask => { let count = 0; while (mask) { mask &= mask - 1; count++; } return count; };

// Stop at two solutions: that is enough to establish non-uniqueness. Supplying
// metrics is optional and is used only by the benchmark and developer profiling.
function countSolutions(puzzle, metrics) {
  const values = puzzle.slice();
  if (values.length !== 48 || values.some(value => !Number.isInteger(value) || value < 0 || value > 8)) return 0;
  const groupMasks = Array(18).fill(0);
  for (let cell = 0; cell < 48; cell++) {
    const digit = values[cell];
    if (!digit) continue;
    const bit = 1 << (digit - 1);
    for (const group of cellGroups[cell]) {
      if (groupMasks[group] & bit) return 0;
      groupMasks[group] |= bit;
    }
  }
  let count = 0;
  function search(depth) {
    if (metrics) {
      metrics.nodes = (metrics.nodes || 0) + 1;
      metrics.maxDepth = Math.max(metrics.maxDepth || 0, depth);
    }
    let chosen = -1, chosenMask = 0, best = 9;
    for (let cell = 0; cell < 48; cell++) {
      if (values[cell]) continue;
      const [a, b, c] = cellGroups[cell];
      const options = FULL_DIGIT_MASK & ~(groupMasks[a] | groupMasks[b] | groupMasks[c]);
      const optionCount = solverBitCount(options);
      if (metrics) metrics.candidateChecks = (metrics.candidateChecks || 0) + 1;
      if (!optionCount) { if (metrics) metrics.deadEnds = (metrics.deadEnds || 0) + 1; return; }
      if (optionCount < best) {
        chosen = cell;
        chosenMask = options;
        best = optionCount;
        if (best === 1) break;
      }
    }
    if (chosen === -1) { count++; if (metrics) metrics.solutions = count; return; }
    const [a, b, c] = cellGroups[chosen];
    for (let digit = 1; digit <= 8; digit++) {
      const bit = 1 << (digit - 1);
      if (!(chosenMask & bit)) continue;
      values[chosen] = digit;
      groupMasks[a] |= bit; groupMasks[b] |= bit; groupMasks[c] |= bit;
      search(depth + 1);
      values[chosen] = 0;
      groupMasks[a] &= ~bit; groupMasks[b] &= ~bit; groupMasks[c] &= ~bit;
      if (count >= 2) return;
    }
  }
  search(0);
  return count;
}

function digPuzzle(solution, metrics) {
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
    if (metrics) metrics.removalChecks = (metrics.removalChecks || 0) + 1;
    const solveMetrics = metrics ? {} : undefined;
    if (countSolutions(puzzle, solveMetrics) !== 1) puzzle[cell] = digit;
    if (metrics) for (const [key, value] of Object.entries(solveMetrics)) metrics[key] = (metrics[key] || 0) + value;
  }
  return puzzle;
}

