const form = document.querySelector('#difficulty-simulation-form');
const startButton = document.querySelector('#start');
const stopButton = document.querySelector('#stop');
const progress = document.querySelector('#progress');
const wingPuzzles = document.querySelector('#wing-puzzles');
const copyWingPuzzles = document.querySelector('#copy-wing-puzzles');
const wingCopyStatus = document.querySelector('#wing-copy-status');
const wingTechniques = new Set(['W-Wing', 'XY-Wing', 'XYZ-Wing', 'WXYZ-Wing']);
let running = false;
let stopRequested = false;

function renderHistogram(container, entries, completed) {
  container.replaceChildren();
  if (!entries.length) {
    container.textContent = 'No trials completed yet.';
    return;
  }
  const chart = document.createElement('div');
  chart.className = 'histogram-chart';
  const maxCount = Math.max(...entries.map(([, count]) => count));
  for (const [label, count] of entries) {
    const column = document.createElement('div');
    column.className = 'histogram-column';
    const value = document.createElement('div');
    value.className = 'histogram-value';
    value.textContent = `${count.toLocaleString()} (${(100 * count / completed).toFixed(2)}%)`;
    const barArea = document.createElement('div');
    barArea.className = 'histogram-bar-area';
    const bar = document.createElement('div');
    bar.className = 'histogram-bar';
    bar.style.height = `${100 * count / maxCount}%`;
    bar.setAttribute('aria-hidden', 'true');
    barArea.appendChild(bar);
    const caption = document.createElement('div');
    caption.className = 'histogram-label'; caption.textContent = label;
    column.appendChild(value); column.appendChild(barArea); column.appendChild(caption); chart.appendChild(column);
  }
  container.appendChild(chart);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (running) return;
  const trials = document.querySelector('#trials');
  const target = Number(trials.value);
  const started = performance.now();
  const hardest = new Map(), ratings = new Map();
  let incomplete = 0, completed = 0;
  wingPuzzles.value = '';
  copyWingPuzzles.disabled = true;
  wingCopyStatus.textContent = '';
  running = true; stopRequested = false;
  startButton.disabled = true; stopButton.disabled = false; trials.disabled = true;
  const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);
  function update(state) {
    progress.textContent = `${state}: ${completed.toLocaleString()} / ${target.toLocaleString()} trials · ${((performance.now() - started) / 1000).toFixed(1)} seconds`;
    renderHistogram(document.querySelector('#hardest-distribution'), [...hardest].sort((a, b) => (techniqueRatings[a[0]] ?? -1) - (techniqueRatings[b[0]] ?? -1) || a[0].localeCompare(b[0])), completed);
    const ratingEntries = [...ratings].sort((a, b) => a[0] - b[0]).map(([score, count]) => [String(score), count]);
    if (incomplete) ratingEntries.push(['Unavailable (incomplete)', incomplete]);
    renderHistogram(document.querySelector('#rating-distribution'), ratingEntries, completed);
  }
  function finish(state) {
    running = false; startButton.disabled = false; stopButton.disabled = true; trials.disabled = false;
    update(state);
  }
  function trial() {
    if (stopRequested) { finish('Stopped'); return; }
    if (completed === target) { finish('Completed'); return; }
    try {
      const solution = generateSolution();
      if (!solution) throw new Error('Could not generate a completed grid.');
      const puzzle = digPuzzle(solution);
      const state = createTechniqueState(puzzle);
      let score = 0, hardestName = 'No technique used', hardestScore = -1;
      function solveStep() {
        if (stopRequested) { finish('Stopped'); return; }
        try {
          if (state.values.every(Boolean)) {
            increment(ratings, score); record(); return;
          }
          const step = nextTechniqueStep(state);
          if (!step) {
            incomplete++;
            record(); return;
          }
          const points = techniqueRatings[step.technique];
          score += points;
          if (points > hardestScore) { hardestScore = points; hardestName = step.technique; }
          applyTechniqueStep(state, step);
          setTimeout(solveStep, 0);
        } catch (error) { finish(`Failed: ${error.message}`); }
      }
      function record() {
        if (wingTechniques.has(hardestName)) {
          const puzzleString = puzzle.map(value => value || '.').join('');
          wingPuzzles.value += (wingPuzzles.value ? '\n' : '') + puzzleString;
          copyWingPuzzles.disabled = false;
        }
        increment(hardest, hardestName); completed++;
        update('Running'); setTimeout(trial, 0);
      }
      setTimeout(solveStep, 0);
    } catch (error) { finish(`Failed: ${error.message}`); }
  }
  update('Running'); setTimeout(trial, 0);
});
stopButton.addEventListener('click', () => { stopRequested = true; stopButton.disabled = true; });
copyWingPuzzles.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(wingPuzzles.value);
    wingCopyStatus.textContent = 'Wing puzzle strings copied.';
  } catch (error) {
    wingCopyStatus.textContent = 'Could not copy. Select the puzzle strings and copy them manually.';
    wingPuzzles.focus(); wingPuzzles.select();
  }
});
