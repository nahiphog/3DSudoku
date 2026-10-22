const descriptions = {
  'Full House': 'The only empty cell in a row or region takes its missing digit.',
  'Naked Single': 'A cell has only one legal candidate.',
  'Hidden Single': 'A digit has only one possible cell in a row or region.',
  'Locked Candidate': 'A digit confined to the intersection of two rows or regions can be removed from the rest of the other group.',
  'Locked candidates (3D sudoku)': 'If a digit can appear in exactly two cells of a row, remove it from any cell that sees both of them.',
  'XY-Wing': 'A bivalue pivot and two bivalue wings force a shared wing digit into at least one wing.',
  'XYZ-Wing': 'A three-candidate pivot and two bivalue wings force their shared digit into at least one of the three cells.',
  'W-Wing': 'Two matching bivalue cells linked through a strong link force their other digit into at least one wing.',
  'WXYZ-Wing': 'Four cells with four candidates constrain one digit to at least one of their mutually visible candidate locations.',
  'Brute force': 'When no supported logical technique applies, backtracking finds a cell whose digit is forced by all valid completions.',
  'Naked Pair': 'Two cells in a group contain only the same two candidates, which can be removed from other cells in that group.',
  'Hidden Pair': 'Two digits occur only in the same two cells in a group, so other candidates can be removed from those cells.',
  'Naked Triple': 'Three cells in a group share only three candidates, which can be removed from other cells in that group.',
  'Hidden Triple': 'Three digits occur only in the same three cells in a group, so other candidates can be removed from those cells.',
  'Naked Quadruple': 'Four cells in a group share only four candidates, which can be removed from other cells in that group.',
  'Hidden Quadruple': 'Four digits occur only in the same four cells in a group, so other candidates can be removed from those cells.'
};
const list = document.querySelector('#technique-list');
Object.entries(techniqueRatings).sort((a, b) => a[1] - b[1]).forEach(([name, points]) => {
  const row = document.createElement('tr');
  [name, points, descriptions[name] || ''].forEach(value => {
    const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell);
  });
  list.appendChild(row);
});
