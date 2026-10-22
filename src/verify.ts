const verifyForm = document.querySelector('#verify-form');
const gridInput = document.querySelector('#grid-input');
const verifyResult = document.querySelector('#verify-result');
const verifyButton = document.querySelector('#verify-button');
createBoard(document.querySelector('#walkthrough-cube'));
const walkthroughBoard = boards[0];
let verificationRun = 0;
function hideWalkthrough() {
  walkthroughRun++;
  document.querySelector('#walkthrough').hidden = true;
}
function highlightWalkthroughRows(mentionedRows) {
  const cells = new Set([...mentionedRows].flatMap(row => rows[row - 1]));
  walkthroughBoard.cells.forEach((cell, number) => cell.classList.toggle('highlighted', cells.has(number)));
}

verifyForm.addEventListener('submit', event => {
  event.preventDefault();
  const run = ++verificationRun;
  hideWalkthrough();
  const input = gridInput.value.trim();
  if (!/^[1-8.]{48}$/.test(input)) {
    verifyResult.textContent = 'Enter exactly 48 characters using only digits 1–8 and dots.';
    return;
  }
  const puzzle = Array.from(input, char => char === '.' ? 0 : Number(char));
  verifyButton.disabled = true;
  verifyResult.textContent = 'Checking…';
  setTimeout(() => {
    try {
      const count = countSolutions(puzzle);
      if (run !== verificationRun) return;
      verifyResult.textContent = count === 0
        ? 'No solution: the givens cannot form a valid grid.'
        : count === 1
          ? 'Unique solution: this puzzle has exactly one solution.'
          : 'Multiple solutions: this puzzle does not have a unique solution.';
      if (count === 1) startWalkthrough(puzzle, '', walkthroughBoard, highlightWalkthroughRows);
    } catch (error) {
      verifyResult.textContent = 'Unable to verify the puzzle. Please try again.';
    } finally {
      verifyButton.disabled = false;
    }
  }, 0);
});
gridInput.addEventListener('input', () => {
  verificationRun++;
  verifyResult.textContent = '';
  hideWalkthrough();
});

document.querySelector('#find-step').addEventListener('click', () => {
  const result = document.querySelector('#step-result');
  const button = document.querySelector('#find-step');
  const input = gridInput.value.trim();
  if (!/^[1-8.]{48}$/.test(input)) { result.textContent = 'Enter exactly 48 characters using only digits 1–8 and dots.'; return; }
  button.disabled = true;
  result.textContent = 'Checking…';
  setTimeout(() => {
    try {
      const state = createTechniqueState(Array.from(input, c => c === '.' ? 0 : Number(c)));
      if (!countStateSolutions(state, 1)) { result.textContent = 'This position has no solution.'; return; }
      const step = nextTechniqueStep(state);
      if (!step) { result.textContent = 'No supported logical step found for this position.'; return; }
      const changes = [
        ...step.placements.map(p => `place ${p.digit} in cell ${p.cell}`),
        ...step.eliminations.map(p => `remove ${p.digit} from cell ${p.cell}`)
      ];
      const houses = step.houses.map(h => h <= 6 ? `region ${h}` : `row ${h - 6}`);
      result.textContent = `${step.technique}${houses.length ? ` (${houses.join(', ')})` : ''}: ${changes.join('; ')}.${step.detail ? ` ${step.detail}` : ''}`;
    } catch (error) {
      result.textContent = error.message || 'Unable to find a step.';
    } finally { button.disabled = false; }
  }, 0);
});
