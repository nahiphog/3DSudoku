const form = document.querySelector('#simulation-form');
const startButton = document.querySelector('#start');
const stopButton = document.querySelector('#stop');
const copyButton = document.querySelector('#copy-matches');
const progress = document.querySelector('#progress');
const summary = document.querySelector('#summary');
const table = document.querySelector('#distribution');
const matchesField = document.querySelector('#matches');
const copyResult = document.querySelector('#copy-result');
let running = false;
let stopRequested = false;

function updateResults(counts, completed, target, started, state) {
  const elapsed = (performance.now() - started) / 1000;
  progress.textContent = `${state}: ${completed.toLocaleString()} / ${target.toLocaleString()} trials · ${elapsed.toFixed(1)} seconds`;
  const totalGivens = counts.reduce((sum, count, givens) => sum + count * givens, 0);
  summary.textContent = completed ? `Average: ${(totalGivens / completed).toFixed(2)} given cells per puzzle.` : 'No trials completed yet.';
  table.replaceChildren();
  counts.forEach((count, givens) => {
    if (!count) return;
    const row = document.createElement('tr');
    for (const text of [givens, count.toLocaleString(), `${(100 * count / completed).toFixed(2)}%`]) {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.appendChild(cell);
    }
    table.appendChild(row);
  });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (running) return;
  const target = Number(document.querySelector('#trials').value);
  const threshold = Number(document.querySelector('#threshold').value);
  const counts = Array(49).fill(0);
  const matches = [];
  let completed = 0;
  const started = performance.now();
  running = true;
  stopRequested = false;
  startButton.disabled = true;
  stopButton.disabled = false;
  copyButton.disabled = true;
  matchesField.value = '';
  copyResult.textContent = '';
  updateResults(counts, completed, target, started, 'Running');
  try {
    while (completed < target && !stopRequested) {
      // Yield regularly so progress and the Stop button remain responsive.
      await new Promise(resolve => setTimeout(resolve, 0));
      const batchStart = performance.now();
      while (completed < target && performance.now() - batchStart < 80) {
        const solution = generateSolution();
        if (!solution) throw new Error('Could not generate a completed grid.');
        const puzzle = digPuzzle(solution);
        const givenCount = puzzle.filter(Boolean).length;
        counts[givenCount]++;
        if (givenCount <= threshold) matches.push(puzzle.map(value => value || '.').join(''));
        completed++;
      }
      updateResults(counts, completed, target, started, 'Running');
    }
    matchesField.value = matches.join('\n');
    copyButton.disabled = !matches.length;
    updateResults(counts, completed, target, started, stopRequested ? 'Stopped' : 'Completed');
    copyResult.textContent = `${matches.length.toLocaleString()} matching puzzle${matches.length === 1 ? '' : 's'}.`;
  } catch (error) {
    matchesField.value = matches.join('\n');
    copyButton.disabled = !matches.length;
    updateResults(counts, completed, target, started, 'Failed');
    copyResult.textContent = error.message;
  } finally {
    running = false;
    startButton.disabled = false;
    stopButton.disabled = true;
  }
});
stopButton.addEventListener('click', () => { stopRequested = true; stopButton.disabled = true; });
copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(matchesField.value);
    copyResult.textContent = 'Puzzle strings copied.';
  } catch (error) {
    copyResult.textContent = 'Could not copy to the clipboard. Select the strings above and copy them manually.';
    matchesField.focus();
    matchesField.select();
  }
});
