# 3D Sudoku technique coverage

The cube has 48 cells, six eight-cell regions and twelve eight-cell rows. A house in the implementation is one of those 18 groups. Techniques below are independently implemented, not copied from sudokUI. The reference catalogue is https://github.com/AImenes/sudokUI#technique-library (GPL-3.0). This file tracks coverage of the requested reference, not a claim that all techniques have been implemented.

## Implemented and checked

- Full House, Naked Single, Hidden Single: directly follow from an eight-digit all-different house or the cell's candidates.
- Naked Pair, Triple, Quadruple: n cells whose candidate union contains n digits reserve those digits in their house.
- Hidden Pair, Triple, Quadruple: n unplaced digits restricted to n cells reserve those cells.
- Locked Candidate: a digit confined to the intersection of two houses cannot occur in the rest of the second house. This generalizes pointing and claiming; it is not a claim to implement every distinct locked-pair or locked-triple finder in the reference.
- Remote Pair: a chain of four or more mutually seeing bivalue cells with the same two candidates alternates those digits. Any cell seeing opposite-parity endpoints loses both candidates. The finder uses the cube peer graph, so it needs no classical 9×9 geometry.

Each proposed step is checked at runtime by a separate search over the actual houses and the complete candidate state. The check first requires at least one valid completion. It then assumes each proposed elimination, or excludes each proposed placement, and checks that the resulting state has no solution. The checker is exhaustive for the given state; it makes no assumption that the puzzle is unique. Tests include generated positions, contradictions, ambiguous puzzles, and constructed examples for subset sizes 2–4 and intersections. These tests supplement, but do not replace, the per-step check.

## Not yet implemented or verified

- Reference-specific Locked Pair and Locked Triple (beyond consequences found by the generic subset/intersection finders).
- Basic, finned, sashimi and complex fish; Skyscraper, 2-String Kite, Turbot Fish and Empty Rectangle.
- XY, XYZ, W and WXYZ wings.
- Unique Rectangle Types 1–6, Hidden Rectangle, Avoidable Rectangles, Extended Rectangles and BUG+1. Uniqueness arguments must only run after verifying uniqueness and must prove the relevant geometry is valid on this cube.
- Simple and Multi Colours, 3D Medusa and Chute Remote Pairs.
- X-Chains, X-Cycles, XY-Chains, AICs and Nice Loops, including grouped and ALS variants.
- ALS-XZ, ALS-XY-Wing, ALS-XY-Chain, Sue de Coq and Death Blossom.
- Aligned Pair Exclusion, Fireworks, Tridagon, Exocet, Double Exocet, Pattern Overlay and forcing techniques.
- The reference itself lists Twinned XY-Chains, SK Loops and generic linear Forcing Chain as not implemented.

For each remaining finder, first express its premises with 3D houses and peers, implement it without assuming classical 9×9 geometry, and add positive and near-miss fixtures. Then run the state-aware counter against every deduction, including candidate-exclusion positions and independently validated unique inputs where needed. Mark it implemented only after soundness and regression tests pass. A technique that depends on absent geometry should be documented as not applicable rather than presented as implemented.

Run `node tests/techniques.test.js` and `node tests/technique-patterns.test.js` from the project directory. The current verification page finds one checked step from the entered givens; it does not yet apply deductions or maintain a sequence of candidate exclusions.
