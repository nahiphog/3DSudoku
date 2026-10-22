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
const notes = new Map();
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
      if (cube.id === 'walkthrough-cube') {
        const candidates = [];
        for (let digit = 1; digit <= 8; digit++) {
          const note = document.createElementNS(svgNamespace, 'text');
          note.setAttribute('x', center[0] + ((digit - 1) % 4 - 1.5) * 9);
          note.setAttribute('y', center[1] + (Math.floor((digit - 1) / 4) - 0.5) * 12);
          note.setAttribute('class', 'candidate-note');
          note.textContent = digit;
          cube.appendChild(note);
          candidates.push(note);
        }
        notes.set(number, candidates);
      }
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

boards.push({ cube, cells, labels, notes });
}
