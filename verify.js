const verifyForm = document.querySelector('#verify-form');
const gridInput = document.querySelector('#grid-input');
const verifyResult = document.querySelector('#verify-result');
const verifyButton = document.querySelector('#verify-button');

verifyForm.addEventListener('submit', event => {
  event.preventDefault();
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
      verifyResult.textContent = count === 0
        ? 'No solution: the givens cannot form a valid grid.'
        : count === 1
          ? 'Unique solution: this puzzle has exactly one solution.'
          : 'Multiple solutions: this puzzle does not have a unique solution.';
    } catch (error) {
      verifyResult.textContent = 'Unable to verify the puzzle. Please try again.';
    } finally {
      verifyButton.disabled = false;
    }
  }, 0);
});
gridInput.addEventListener('input', () => { verifyResult.textContent = ''; });
