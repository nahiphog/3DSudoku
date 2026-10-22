createBoard(document.querySelector('#labels-cube'));
boards[0].labels.forEach((label, number) => { label.textContent = number; });
