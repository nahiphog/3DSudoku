const svgNamespace = 'http://www.w3.org/2000/svg';
const boards = [];

// Each face is described by its top-left corner and two cell-sized vectors.
const faces = [
  { origin: [300, 35], right: [60, 30], down: [-60, 30], className: 'cube-top' },
  { origin: [60, 155], right: [60, 30], down: [0, 60], className: 'cube-left' },
  { origin: [300, 275], right: [60, -30], down: [0, 60], className: 'cube-right' }
];

function point(face, column, row) {
  return [face.origin[0] + column * face.right[0] + row * face.down[0],
    face.origin[1] + column * face.right[1] + row * face.down[1]];
}

function createBoard(cube) {
const cells = new Map();
const labels = new Map();
faces.forEach((face, faceIndex) => {
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      const number = faceIndex * 16 + row * 4 + column + 1;
      const polygon = document.createElementNS(svgNamespace, 'polygon');
      polygon.setAttribute('points', [point(face, column, row), point(face, column + 1, row), point(face, column + 1, row + 1), point(face, column, row + 1)].map(p => p.join(',')).join(' '));
      polygon.setAttribute('class', face.className);
      cells.set(number, polygon);
      cube.appendChild(polygon);
      const center = point(face, column + 0.5, row + 0.5);
      const label = document.createElementNS(svgNamespace, 'text');
      label.setAttribute('x', center[0]);
      label.setAttribute('y', center[1]);
      label.setAttribute('class', 'cube-label');
      label.textContent = '';
      labels.set(number, label);
      cube.appendChild(label);
    }
  }
  const outline = document.createElementNS(svgNamespace, 'polygon');
  outline.setAttribute('points', [point(face, 0, 0), point(face, 4, 0), point(face, 4, 4), point(face, 0, 4)].map(p => p.join(',')).join(' '));
  outline.setAttribute('class', 'cube-outline');
  cube.appendChild(outline);
  {
    const divider = document.createElementNS(svgNamespace, 'line');
    const start = faceIndex === 1 ? point(face, 2, 0) : point(face, 0, 2);
    const end = faceIndex === 1 ? point(face, 2, 4) : point(face, 4, 2);
    divider.setAttribute('x1', start[0]);
    divider.setAttribute('y1', start[1]);
    divider.setAttribute('x2', end[0]);
    divider.setAttribute('y2', end[1]);
    divider.setAttribute('class', 'cube-divider');
    cube.appendChild(divider);
  }
});

boards.push({ cube, cells, labels });
}
createBoard(document.querySelector('#puzzle-cube'));
createBoard(document.querySelector('#solution-cube'));

const activeGroups = new Set();
function updateHighlights() {
  const highlighted = new Set([...activeGroups].flat());
  boards.forEach(({ cells }) => cells.forEach((cell, number) => cell.classList.toggle('highlighted', highlighted.has(number))));
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
  button.disabled = true;
  status.textContent = 'Generating puzzle…';
  setTimeout(() => {
    const start = performance.now();
    const solution = generateSolution();
    if (!solution) {
      status.textContent = 'Could not generate a solution.';
      button.disabled = false;
      return;
    }
    const puzzle = digPuzzle(solution);
    const elapsed = (performance.now() - start) / 1000;
    boards[0].labels.forEach((label, number) => {
      label.textContent = puzzle[number - 1] || '';
      label.classList.remove('solution-only');
    });
    boards[1].labels.forEach((label, number) => {
      label.textContent = solution[number - 1];
      label.classList.toggle('solution-only', !puzzle[number - 1]);
    });
    status.textContent = puzzle.filter(Boolean).length + ' filled cells · ' + elapsed.toFixed(2) + ' seconds';
    document.querySelectorAll('[data-copy]').forEach(control => { control.disabled = false; });
    button.disabled = false;
  }, 0);
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
  const originals = board.cube.querySelectorAll('polygon, line, text');
  svg.querySelectorAll('polygon, line, text').forEach((element, index) => {
    const style = getComputedStyle(originals[index]);
    for (const property of ['fill', 'stroke', 'stroke-width', 'stroke-linejoin', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline']) {
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
    const name = button.dataset.board === '0' ? 'Dug puzzle' : 'Completed puzzle';
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
