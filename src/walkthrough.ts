let walkthroughRun = 0;
function startWalkthrough(puzzle, generationSummary = '', board, highlightRows) {
  const run = ++walkthroughRun;
  const section = document.querySelector('#walkthrough');
  const status = document.querySelector('#walkthrough-status');
  const slider = document.querySelector('#walkthrough-slider');
  const description = document.querySelector('#walkthrough-description');
  const count = document.querySelector('#walkthrough-count');
  const state = createTechniqueState(puzzle);
  const frames = [{ values: state.values.slice(), candidates: state.candidates.slice(), removed: Array(48).fill(0), step: null }];
  const tally = document.querySelector('#technique-tally');
  const rating = document.querySelector('#difficulty-rating');
  const controls = ['#walk-first', '#walk-prev', '#walk-next', '#walk-last'].map(selector => document.querySelector(selector));
  let finished = false;
  section.hidden = false;
  slider.disabled = true;
  slider.value = 0;
  slider.max = 0;
  status.textContent = 'Building walkthrough…';
  tally.replaceChildren();
  rating.textContent = 'Calculating difficulty…';

  function showFrame() {
    const index = Number(slider.value);
    const frame = frames[index];
    const step = frame.step;
    highlightRows(new Set(step ? step.houses.filter(h => h > 6).map(h => h - 6) : []));
    count.textContent = `${index} / ${frames.length - 1}`;
    const pattern = new Set(step ? step.cells : []);
    const changed = new Set(step ? [...step.placements, ...step.eliminations].map(change => change.cell) : []);
    board.cells.forEach((cell, number) => {
      cell.classList.toggle('walkthrough-pattern', pattern.has(number));
      cell.classList.toggle('walkthrough-change', changed.has(number));
    });
    board.labels.forEach((label, number) => {
      label.textContent = frame.values[number - 1] || '';
      label.classList.toggle('solution-only', !!frame.values[number - 1] && !puzzle[number - 1]);
    });
    board.notes.forEach((notes, number) => notes.forEach((note, index) => {
      const cell = number - 1;
      const bit = digitBit(index + 1);
      const removed = !!(frame.removed[cell] & bit);
      note.setAttribute('visibility', !frame.values[cell] && ((frame.candidates[cell] & bit) || removed) ? 'visible' : 'hidden');
      note.classList.toggle('candidate-removed', removed);
    }));
    controls[0].disabled = index === 0;
    controls[1].disabled = index === 0;
    controls[2].disabled = index === frames.length - 1;
    controls[3].disabled = index === frames.length - 1;
    if (!step) { description.textContent = 'Step 0: the given cells and all currently legal candidates.'; return; }
    const houses = step.houses.map(h => h <= 6 ? `region ${h}` : `row ${h - 6}`);
    const changes = [...step.placements.map(p => `place ${p.digit} in cell ${p.cell}`), ...step.eliminations.map(p => `remove candidate ${p.digit} from cell ${p.cell}`)];
    description.textContent = `${step.technique}${houses.length ? ` in ${houses.join(' and ')}` : ''}, using cell${step.cells.length === 1 ? '' : 's'} ${step.cells.join(', ')} and digit${step.digits.length === 1 ? '' : 's'} ${step.digits.join(', ')}: ${changes.join('; ')}.${step.detail ? ` ${step.detail}` : ''}`;
  }
  slider.oninput = showFrame;
  controls.forEach((button, index) => { button.onclick = () => {
    const current = Number(slider.value);
    slider.value = [0, Math.max(0, current - 1), Math.min(frames.length - 1, current + 1), frames.length - 1][index];
    showFrame();
  }; });
  function updateTally() {
    const counts = new Map();
    frames.slice(1).forEach(({step}, index) => {
      if (!counts.has(step.technique)) counts.set(step.technique, []);
      counts.get(step.technique).push(index + 1);
    });
    tally.replaceChildren();
    let total = 0;
    [...counts].sort((a,b) => techniqueRatings[a[0]] - techniqueRatings[b[0]] || a[0].localeCompare(b[0])).forEach(([name, steps]) => {
      const points = techniqueRatings[name] * steps.length;
      total += points;
      const row = document.createElement('tr');
      [name, techniqueRatings[name], steps.join(', ')].forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell); });
      tally.appendChild(row);
    });
    rating.textContent = finished ? `Difficulty score: ${total} points. Sum of the per-technique scores for each verified 3D step; the 3D-specific technique and brute force have local scores.` : `Partial score: ${total} points. No final difficulty rating until the walkthrough is complete.`;
    return total;
  }
  showFrame();
  function nextStep() {
    if (run !== walkthroughRun) return;
    try {
      if (state.values.every(Boolean)) {
        finished = true;
        const score = updateTally();
        if (generationSummary) document.querySelector('#cube-status').textContent = `${generationSummary} · Difficulty: ${score} points · ${frames.length - 1} steps`;
        status.textContent = 'Walkthrough complete.'; slider.disabled = frames.length === 1; return;
      }
      const step = nextTechniqueStep(state);
      if (!step) {
        const score = updateTally();
        if (generationSummary) document.querySelector('#cube-status').textContent = `${generationSummary} · Difficulty: unavailable (partial score ${score}) · ${frames.length - 1} steps found`;
        status.textContent = 'Walkthrough stops here: the available techniques cannot find another verified step.'; slider.disabled = frames.length === 1; return;
      }
      const previousCandidates = state.candidates.slice();
      applyTechniqueStep(state, step);
      const removed = state.candidates.map((mask, index) => state.values[index] ? 0 : previousCandidates[index] & ~mask);
      frames.push({ values: state.values.slice(), candidates: state.candidates.slice(), removed, step });
      slider.max = frames.length - 1;
      slider.disabled = false;
      count.textContent = `${slider.value} / ${frames.length - 1}`;
      updateTally();
      controls[2].disabled = Number(slider.value) === frames.length - 1;
      controls[3].disabled = controls[2].disabled;
      setTimeout(nextStep, 0);
    } catch (error) {
      if (generationSummary) document.querySelector('#cube-status').textContent = `${generationSummary} · Difficulty and total steps unavailable`;
      status.textContent = 'Unable to build the walkthrough: ' + error.message;
      slider.disabled = frames.length === 1;
    }
  }
  setTimeout(nextStep, 0);
}

