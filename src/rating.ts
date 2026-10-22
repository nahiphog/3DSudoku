// Per-step scores from sudokUI's catalogue; the 3D-specific rule uses a local score.
const techniqueRatings = {
  'Full House': 4, 'Naked Single': 4, 'Hidden Single': 14,
  'Locked Candidate': 50, 'Locked candidates (3D sudoku)': 60, 'Naked Pair': 60, 'Hidden Pair': 70,
  'Naked Triple': 80, 'Hidden Triple': 100, 'Naked Quadruple': 120, 'Hidden Quadruple': 150,
  'W-Wing': 150, 'XY-Wing': 160, 'XYZ-Wing': 180, 'WXYZ-Wing': 200, 'Brute force': 10000
};
function nextTechniqueStep(state) {
  const choose = steps => steps.sort((a, b) => techniqueRatings[a.technique] - techniqueRatings[b.technique]).find(candidate => verifyTechniqueStep(state, candidate));
  return choose(findTechniqueSteps(state)) || choose(findWingSteps(state)) || bruteForceStep(state);
}
function bruteForceStep(state) {
  // Only place a digit proven to occur in every completion of this state.
  if (!countStateSolutions(state, 1)) return undefined;
  const cells = state.values.map((value, cell) => value ? -1 : cell).filter(cell => cell >= 0)
    .sort((a, b) => bitCount(state.candidates[a]) - bitCount(state.candidates[b]));
  for (const cell of cells) {
    const possible = [];
    for (const digit of digitsIn(state.candidates[cell])) {
      const test = { values: state.values.slice(), candidates: state.candidates.slice() };
      test.values[cell] = digit;
      if (countStateSolutions(test, 1)) possible.push(digit);
      if (possible.length > 1) break;
    }
    if (possible.length === 1) {
      const digit = possible[0];
      const step = makeStep('Brute force', [], [cell], [digit], [[cell, digit]]);
      step.detail = `Backtracking shows that ${digit} is the only candidate in cell ${cell + 1} that can lead to a complete solution.`;
      return step;
    }
  }
}
function applyTechniqueStep(state, step) {
  for (const {cell, digit} of step.eliminations) state.candidates[cell - 1] &= ~digitBit(digit);
  for (const {cell, digit} of step.placements) {
    const index = cell - 1;
    state.values[index] = digit;
    state.candidates[index] = 0;
    peers[index].forEach(peer => { if (!state.values[peer]) state.candidates[peer] &= ~digitBit(digit); });
  }
}
