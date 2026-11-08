// Techniques use the 18 eight-cell houses from sudoku-core.js. Cell indices are zero-based.
const ALL_DIGITS = 0xff;
const techniqueHouses = groups.map(group => group.map(cell => cell - 1));
const bitCount = mask => { let count = 0; while (mask) { mask &= mask - 1; count++; } return count; };
const digitBit = digit => 1 << (digit - 1);
const digitsIn = mask => Array.from({length: 8}, (_, i) => i + 1).filter(d => mask & digitBit(d));

function createTechniqueState(values) {
  if (!Array.isArray(values) || values.length !== 48 || values.some(v => !Number.isInteger(v) || v < 0 || v > 8)) throw new Error('Expected 48 digits from 0 to 8.');
  if (values.some((value, cell) => value && peers[cell].some(peer => values[peer] === value))) throw new Error('Conflicting givens.');
  return { values: values.slice(), candidates: values.map((value, cell) => value ? 0 : peers[cell].reduce((mask, peer) => values[peer] ? mask & ~digitBit(values[peer]) : mask, ALL_DIGITS)) };
}

function combinations(items, size) {
  const result = [];
  function visit(start, selected) {
    if (selected.length === size) { result.push(selected.slice()); return; }
    for (let i = start; i <= items.length - (size - selected.length); i++) {
      selected.push(items[i]); visit(i + 1, selected); selected.pop();
    }
  }
  visit(0, []);
  return result;
}

function makeStep(technique, houses, cells, digits, placements = [], eliminations = []) {
  return { technique, houses: houses.map(i => i + 1), cells: cells.map(i => i + 1), digits, placements: placements.map(([cell, digit]) => ({ cell: cell + 1, digit })), eliminations: eliminations.map(([cell, digit]) => ({ cell: cell + 1, digit })) };
}

function findTechniqueSteps(state) {
  const { values, candidates } = state;
  const steps = [];
  const add = step => { if (step.placements.length || step.eliminations.length) steps.push(step); };
  techniqueHouses.forEach((house, h) => {
    const empty = house.filter(c => !values[c]);
    if (empty.length === 1 && bitCount(candidates[empty[0]]) === 1) {
      const d = digitsIn(candidates[empty[0]])[0]; add(makeStep('Full House', [h], empty, [d], [[empty[0], d]]));
    }
  });
  values.forEach((v, c) => {
    if (!v && bitCount(candidates[c]) === 1) { const d = digitsIn(candidates[c])[0]; add(makeStep('Naked Single', [], [c], [d], [[c, d]])); }
  });
  techniqueHouses.forEach((house, h) => {
    for (let d = 1; d <= 8; d++) {
      if (house.some(c => values[c] === d)) continue;
      const locations = house.filter(c => !values[c] && (candidates[c] & digitBit(d)));
      if (locations.length === 1) add(makeStep('Hidden Single', [h], locations, [d], [[locations[0], d]]));
    }
    const empty = house.filter(c => !values[c]);
    for (let size = 2; size <= 4; size++) {
      for (const subset of combinations(empty.filter(c => candidates[c] && bitCount(candidates[c]) <= size), size)) {
        const mask = subset.reduce((a,c) => a | candidates[c], 0);
        if (bitCount(mask) !== size) continue;
        const eliminations = empty.filter(c => !subset.includes(c)).flatMap(c => digitsIn(candidates[c] & mask).map(d => [c,d]));
        add(makeStep(`Naked ${['','','Pair','Triple','Quadruple'][size]}`, [h], subset, digitsIn(mask), [], eliminations));
      }
      const unplaced = Array.from({length:8},(_,i)=>i+1).filter(d => !house.some(c => values[c] === d));
      for (const digits of combinations(unplaced, size)) {
        const mask = digits.reduce((a,d) => a | digitBit(d), 0);
        const locations = empty.filter(c => candidates[c] & mask);
        if (locations.length !== size || digits.some(d => !locations.some(c => candidates[c] & digitBit(d)))) continue;
        const eliminations = locations.flatMap(c => digitsIn(candidates[c] & ~mask).map(d => [c,d]));
        add(makeStep(`Hidden ${['','','Pair','Triple','Quadruple'][size]}`, [h], locations, digits, [], eliminations));
      }
    }
  });
  techniqueHouses.forEach((source, a) => techniqueHouses.forEach((target, b) => {
    if (a === b) return;
    const common = source.filter(c => target.includes(c));
    if (!common.length) return;
    for (let d = 1; d <= 8; d++) {
      if (source.some(c => values[c] === d)) continue;
      const locations = source.filter(c => !values[c] && (candidates[c] & digitBit(d)));
      if (!locations.length || locations.some(c => !common.includes(c))) continue;
      const eliminations = target.filter(c => !source.includes(c) && !values[c] && (candidates[c] & digitBit(d))).map(c => [c,d]);
      add(makeStep('Locked Candidate', [a,b], locations, [d], [], eliminations));
    }
  }));
  // A digit must occur in one of the two candidate cells of this row.
  // Any cell that sees both candidates cannot contain that digit, even if
  // the three cells do not all belong to one common house.
  rows.forEach((row, rowIndex) => {
    const source = row.map(cell => cell - 1);
    for (let digit = 1; digit <= 8; digit++) {
      if (source.some(cell => values[cell] === digit)) continue;
      const locations = source.filter(cell => !values[cell] && (candidates[cell] & digitBit(digit)));
      if (locations.length !== 2) continue;
      const eliminations = peers[locations[0]].filter(cell =>
        !source.includes(cell) && peers[locations[1]].includes(cell) &&
        !values[cell] && (candidates[cell] & digitBit(digit))
      ).map(cell => [cell, digit]);
      add(makeStep('Locked candidates (3D sudoku)', [rowIndex + 6], locations, [digit], [], eliminations));
    }
  });
  return steps;
}

// Wing logic depends only on the cube's peer graph and eight-cell houses.
// Pattern details use zero-based indices internally, as do the candidate masks.
function findWingSteps(state) {
  const { values, candidates } = state;
  const steps = [];
  const sees = (a, b) => a !== b && peers[a].includes(b);
  const empty = candidates.map((mask, cell) => !values[cell] && mask ? cell : -1).filter(cell => cell >= 0);
  const bivalue = empty.filter(cell => bitCount(candidates[cell]) === 2);
  function emit(name, houses, cells, digits, targets, detail) {
    if (!targets.length) return;
    const step = makeStep(name, houses, cells, digits, [], targets);
    step.detail = detail;
    steps.push(step);
  }
  {
    for (const pivot of empty.filter(c => bitCount(candidates[c]) === 2 || bitCount(candidates[c]) === 3)) {
      const pivotMask = candidates[pivot];
      const wings = bivalue.filter(c => sees(pivot, c));
      for (const [a, b] of combinations(wings, 2)) {
        const am = candidates[a], bm = candidates[b], shared = am & bm;
        if (bitCount(shared) !== 1 || bitCount(am | bm) !== 3) continue;
        const z = digitsIn(shared)[0];
        const xy = bitCount(pivotMask) === 2 && !(pivotMask & shared) && (am | bm) === (pivotMask | shared) && bitCount(pivotMask & am) === 1 && bitCount(pivotMask & bm) === 1;
        const xyz = bitCount(pivotMask) === 3 && (am & pivotMask) === am && (bm & pivotMask) === bm && (pivotMask & shared);
        if (!xy && !xyz) continue;
        const targets = empty.filter(c => c !== pivot && c !== a && c !== b && (candidates[c] & shared) && sees(c, a) && sees(c, b) && (!xyz || sees(c, pivot))).map(c => [c, z]);
        emit(xy ? 'XY-Wing' : 'XYZ-Wing', [], [pivot, a, b], digitsIn(pivotMask | am | bm), targets, `Pivot cell ${pivot + 1}; wing cells ${a + 1} and ${b + 1}; eliminate ${z} from cells seeing ${xyz ? 'all three pattern cells' : 'both wings'}.`);
      }
    }
    for (const [a, b] of combinations(bivalue, 2)) {
      if (candidates[a] !== candidates[b]) continue;
      for (const linkDigit of digitsIn(candidates[a])) {
        const z = digitsIn(candidates[a] & ~digitBit(linkDigit))[0];
        techniqueHouses.forEach((house, h) => {
          if (house.some(c => values[c] === linkDigit)) return;
          const links = house.filter(c => !values[c] && (candidates[c] & digitBit(linkDigit)));
          if (links.length !== 2 || links.includes(a) || links.includes(b)) return;
          if (!((sees(a, links[0]) && sees(b, links[1])) || (sees(a, links[1]) && sees(b, links[0])))) return;
          const targets = empty.filter(c => c !== a && c !== b && !links.includes(c) && (candidates[c] & digitBit(z)) && sees(c, a) && sees(c, b)).map(c => [c, z]);
          emit('W-Wing', [h], [a, b, ...links], digitsIn(candidates[a]), targets, `Wing cells ${a + 1} and ${b + 1}; digit ${linkDigit} has a strong link between cells ${links[0] + 1} and ${links[1] + 1}; eliminate ${z} from cells seeing both wings.`);
        });
      }
    }
    // In four cells with four candidates, if all occurrences of each of the
    // other three digits are mutually visible, at least one cell contains z.
    const eligible = empty.filter(c => bitCount(candidates[c]) >= 2 && bitCount(candidates[c]) <= 4);
    for (const cells of combinations(eligible, 4)) {
      const mask = cells.reduce((m, c) => m | candidates[c], 0);
      if (bitCount(mask) !== 4) continue;
      for (const z of digitsIn(mask)) {
        const otherDigits = digitsIn(mask & ~digitBit(z));
        if (!otherDigits.every(d => {
          const locations = cells.filter(c => candidates[c] & digitBit(d));
          return locations.every((a, i) => locations.slice(i + 1).every(b => sees(a, b)));
        })) continue;
        const zCells = cells.filter(c => candidates[c] & digitBit(z));
        if (zCells.length < 2) continue;
        const targets = empty.filter(c => !cells.includes(c) && (candidates[c] & digitBit(z)) && zCells.every(a => sees(c, a))).map(c => [c, z]);
        emit('WXYZ-Wing', [], cells, digitsIn(mask), targets, `Four pattern cells use digits ${digitsIn(mask).join(', ')}; the other three digits are each restricted to mutually seeing cells, so at least one pattern cell contains ${z}.`);
      }
    }
    return steps;
  }
}

// A Remote Pair is an alternating chain of at least four bivalue cells with
// the same two candidates. Adjacent cells see each other, so they must take
// opposite digits. A cell seeing the opposite-parity endpoints therefore
// cannot contain either digit. This is expressed solely through the cube's
// peer graph; it does not assume a 9x9 grid geometry.
function findRemotePairSteps(state) {
  const { values, candidates } = state;
  const steps = [];
  const sees = (a, b) => a !== b && peers[a].includes(b);
  const masks = [...new Set(candidates.filter((mask, cell) => !values[cell] && bitCount(mask) === 2))];
  for (const mask of masks) {
    const pairCells = candidates.map((candidate, cell) => !values[cell] && candidate === mask ? cell : -1).filter(cell => cell >= 0);
    for (const start of pairCells) {
      const distance = Array(48).fill(-1);
      const previous = Array(48).fill(-1);
      const queue = [start];
      distance[start] = 0;
      for (let index = 0; index < queue.length; index++) {
        const cell = queue[index];
        for (const next of pairCells) {
          if (distance[next] >= 0 || !sees(cell, next)) continue;
          distance[next] = distance[cell] + 1;
          previous[next] = cell;
          queue.push(next);
        }
      }
      for (const end of pairCells) {
        // An odd number of links means opposite endpoint parity. The minimum
        // of three links keeps ordinary Naked Pairs out of this finder.
        if (end <= start || distance[end] < 3 || distance[end] % 2 !== 1) continue;
        const path = [];
        for (let cell = end; cell >= 0; cell = previous[cell]) { path.push(cell); if (cell === start) break; }
        path.reverse();
        const chain = new Set(path);
        const targets = candidates.map((candidate, cell) =>
          !values[cell] && !chain.has(cell) && (candidate & mask) && sees(cell, start) && sees(cell, end) ? cell : -1
        ).filter(cell => cell >= 0);
        if (!targets.length) continue;
        const eliminations = targets.flatMap(cell => digitsIn(candidates[cell] & mask).map(digit => [cell, digit]));
        if (!eliminations.length) continue;
        const step = makeStep('Remote Pair', [], path, digitsIn(mask), [], eliminations);
        step.detail = `Cells ${path.map(cell => cell + 1).join(', ')} form an alternating remote-pair chain using digits ${digitsIn(mask).join(' and ')}. Each target sees opposite-parity endpoints, so neither digit can remain there.`;
        steps.push(step);
      }
    }
  }
  return steps;
}

// Independent state-aware counter: checks all groups directly, including candidate exclusions.
function countStateSolutions(state, limit = 2) {
  const values = state.values.slice();
  if (values.length !== 48 || state.candidates.length !== 48) return 0;
  if (techniqueHouses.some(house => { const given = house.map(c => values[c]).filter(Boolean); return new Set(given).size !== given.length; })) return 0;
  let count = 0;
  function search() {
    let chosen = -1, best = 9, choices = 0;
    for (let c = 0; c < 48; c++) {
      if (values[c]) continue;
      let mask = state.candidates[c] & ALL_DIGITS;
      for (const house of techniqueHouses) if (house.includes(c)) for (const cell of house) if (values[cell]) mask &= ~digitBit(values[cell]);
      const n = bitCount(mask);
      if (!n) return;
      if (n < best) { chosen = c; best = n; choices = mask; if (n === 1) break; }
    }
    if (chosen < 0) { count++; return; }
    for (const d of digitsIn(choices)) { values[chosen] = d; search(); values[chosen] = 0; if (count >= limit) return; }
  }
  search(); return count;
}

function verifyTechniqueStep(state, step) {
  if (!countStateSolutions(state, 1)) return false;
  for (const {cell, digit} of step.eliminations) {
    const c = cell - 1;
    if (c < 0 || c >= 48 || state.values[c] || !(state.candidates[c] & digitBit(digit))) return false;
    const test = { values: state.values.slice(), candidates: state.candidates.slice() };
    test.values[c] = digit;
    if (countStateSolutions(test, 1)) return false;
  }
  for (const {cell, digit} of step.placements) {
    const c = cell - 1;
    if (c < 0 || c >= 48 || state.values[c] || !(state.candidates[c] & digitBit(digit))) return false;
    const test = { values: state.values.slice(), candidates: state.candidates.slice() };
    test.candidates[c] &= ~digitBit(digit);
    if (countStateSolutions(test, 1)) return false;
  }
  return true;
}
