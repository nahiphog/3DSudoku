createBoard(document.querySelector('#puzzle-cube'));
createBoard(document.querySelector('#solution-cube'));
createBoard(document.querySelector('#walkthrough-cube'));
const customCube = document.querySelector('#custom-cube');
const selectedCells = new Set();
let customGenerationRunning = false;
let customHaltRequested = false;
if (customCube) {
  createBoard(customCube);
  const selectorBoard = boards[boards.length - 1];
  function selectionChanged() {
    document.querySelector('#selection-count').textContent = `${selectedCells.size} cells selected`;
    document.querySelector('#generated-results').hidden = true;
    document.querySelector('#walkthrough').hidden = true;
    document.querySelector('#cube-status').textContent = 'Selection changed. Generate to check this pattern.';
    walkthroughRun++;
  }
  selectorBoard.cells.forEach((cell, number) => {
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('role', 'button');
    cell.setAttribute('aria-label', `Cell ${number}`);
    cell.setAttribute('aria-pressed', 'false');
    function toggleCell() {
      if (customGenerationRunning) return;
      if (selectedCells.has(number)) selectedCells.delete(number); else selectedCells.add(number);
      cell.classList.toggle('custom-selected', selectedCells.has(number));
      cell.setAttribute('aria-pressed', String(selectedCells.has(number)));
      selectionChanged();
    }
    cell.addEventListener('click', toggleCell);
    cell.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleCell(); } });
  });
  document.querySelector('#clear-selection').addEventListener('click', () => {
    if (customGenerationRunning || !selectedCells.size) return;
    selectedCells.clear();
    selectorBoard.cells.forEach(cell => {
      cell.classList.remove('custom-selected');
      cell.setAttribute('aria-pressed', 'false');
    });
    selectionChanged();
  });
}
{
  document.querySelector('#halt-generation').addEventListener('click', () => {
    customHaltRequested = true;
    document.querySelector('#halt-generation').disabled = true;
    document.querySelector('#cube-status').textContent = 'Halting after the current attempt…';
  });
}

const activeGroups = new Set();
let walkthroughRows = new Set();
function updateHighlights() {
  const highlighted = new Set([...activeGroups].flat());
  boards.forEach(({ cube, cells }) => {
    if (cube === customCube) return;
    const mentioned = new Set(cube.id === 'walkthrough-cube' ? [...walkthroughRows].flatMap(row => rows[row - 1]) : []);
    cells.forEach((cell, number) => {
      cell.classList.toggle('highlighted', highlighted.has(number) || mentioned.has(number));
    });
  });
}

function addControls(container, groups, name) {
  groups.forEach((group, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'highlight-toggle';
    button.textContent = `${name} ${index + 1}`;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      if (activeGroups.has(group)) activeGroups.delete(group);
      else activeGroups.add(group);
      button.setAttribute('aria-pressed', String(activeGroups.has(group)));
      updateHighlights();
    });
    container.appendChild(button);
  });
}
addControls(document.querySelector('#region-controls'), regions, 'Region');
addControls(document.querySelector('#row-controls'), rows, 'Row');

document.querySelector('#generate-cube').addEventListener('click', () => {
  const button = document.querySelector('#generate-cube');
  const status = document.querySelector('#cube-status');
  const minimumControl = document.querySelector('#difficulty-min');
  const maximumControl = document.querySelector('#difficulty-max');
  const minimum = Number(minimumControl.value);
  const maximum = Number(maximumControl.value);
  if (minimum > maximum) {
    status.textContent = 'Minimum difficulty must not exceed maximum difficulty.';
    return;
  }
  button.disabled = true;
  minimumControl.disabled = maximumControl.disabled = true;
  customGenerationRunning = true;
  customHaltRequested = false;
  document.querySelector('#halt-generation').disabled = false;
  document.querySelector('#walkthrough').hidden = true;
  document.querySelectorAll('[data-copy]').forEach(control => { control.disabled = true; });
  walkthroughRun++;
  if (customCube) {
    customCube.setAttribute('aria-disabled', 'true');
    document.querySelector('#clear-selection').disabled = true;
    document.querySelector('#generated-results').hidden = true;
  }
  status.textContent = 'Generating puzzle…';
  const start = performance.now();
  let attempts = 0;
  function finishCustom() {
    customGenerationRunning = false;
    if (customCube) {
      customCube.setAttribute('aria-disabled', 'false');
      document.querySelector('#clear-selection').disabled = false;
    }
    document.querySelector('#halt-generation').disabled = true;
    minimumControl.disabled = maximumControl.disabled = false;
  }
  function stopped() {
    if (customHaltRequested) {
      finishCustom();
      status.textContent = `Halted after ${attempts.toLocaleString()} attempts · ${((performance.now() - start) / 1000).toFixed(2)} seconds`;
      button.disabled = false;
      return true;
    }
    return false;
  }
  function retry() {
    status.textContent = `Searching… ${attempts.toLocaleString()} attempts · ${((performance.now() - start) / 1000).toFixed(2)} seconds`;
    setTimeout(attempt, 0);
  }
  function fail(error) {
    finishCustom();
    status.textContent = `Could not generate a puzzle: ${error.message}`;
    button.disabled = false;
  }
  function attempt() {
    if (stopped()) return;
    try {
    attempts++;
    const solution = generateSolution();
    if (!solution) {
      status.textContent = 'Could not generate a solution.';
      finishCustom();
      button.disabled = false;
      return;
    }
    const puzzle = customCube ? solution.map((digit, index) => selectedCells.has(index + 1) ? digit : 0) : digPuzzle(solution);
    if (customCube && countSolutions(puzzle) !== 1) {
      retry();
      return;
    }
    const state = createTechniqueState(puzzle);
    let score = 0;
    function rateNext() {
      if (stopped()) return;
      try {
        if (!state.values.every(Boolean)) {
          const step = nextTechniqueStep(state);
          if (!step) { retry(); return; }
          score += techniqueRatings[step.technique];
          if (score > maximum) { retry(); return; }
          applyTechniqueStep(state, step);
          setTimeout(rateNext, 0);
          return;
        }
        if (score < minimum || score > maximum) { retry(); return; }
    const elapsed = (performance.now() - start) / 1000;
    finishCustom();
    if (customCube) document.querySelector('#generated-results').hidden = false;
    boards[0].labels.forEach((label, number) => {
      label.textContent = puzzle[number - 1] || '';
      label.classList.remove('solution-only');
    });
    boards[1].labels.forEach((label, number) => {
      label.textContent = solution[number - 1];
      label.classList.toggle('solution-only', !puzzle[number - 1]);
    });
    const generationSummary = (customCube ? `Unique solution · ${attempts.toLocaleString()} ${attempts === 1 ? 'attempt' : 'attempts'} · ` : '') + puzzle.filter(Boolean).length + ' filled cells · ' + elapsed.toFixed(2) + ' seconds';
    status.textContent = generationSummary + ' · Calculating difficulty and steps…';
    startWalkthrough(puzzle, generationSummary, boards[2], rows => { walkthroughRows = rows; updateHighlights(); });
    document.querySelectorAll('[data-copy]').forEach(control => { control.disabled = false; });
    button.disabled = false;
      } catch (error) { fail(error); }
    }
    setTimeout(rateNext, 0);
    } catch (error) { fail(error); }
  }
  setTimeout(attempt, 0);
});

function boardString(board) {
  return Array.from({ length: 48 }, (_, index) => board.labels.get(index + 1).textContent || '.').join('');
}

async function boardImage(board) {
  const svg = board.cube.cloneNode(true);
  svg.setAttribute('xmlns', svgNamespace);
  svg.setAttribute('width', '1200');
  svg.setAttribute('height', '1140');
  // Inline the visible styles so the standalone image matches the page.
  const originals = board.cube.querySelectorAll('polygon, polyline, line, text');
  svg.querySelectorAll('polygon, polyline, line, text').forEach((element, index) => {
    const style = getComputedStyle(originals[index]);
    for (const property of ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline']) {
      element.style.setProperty(property, style.getPropertyValue(property));
    }
  });
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Could not render the cube image.'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1140;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create the image.')), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    const board = boards[Number(button.dataset.board)];
    const status = document.querySelector('#copy-status');
    const name = button.dataset.board === '0' ? (customCube ? 'Custom puzzle' : 'Dug puzzle') : 'Completed puzzle';
    try {
      if (button.dataset.copy === 'text') {
        await navigator.clipboard.writeText(boardString(board));
        status.textContent = `${name} string copied.`;
      } else {
        if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('Image clipboard is not available in this browser.');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': boardImage(board) })]);
        status.textContent = `${name} image copied.`;
      }
    } catch (error) {
      status.textContent = `Could not copy ${name.toLowerCase()}: ${error.message || 'clipboard access was denied.'}`;
    }
  });
});
