const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({Math});for(const f of ['sudoku-core.js','techniques.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const result=vm.runInContext(`(()=>{
 const solution=generateSolution(), names=['','','Pair','Triple','Quadruple'], results=[];
 for(let size=2;size<=4;size++){
  const house=techniqueHouses[0], chosen=house.slice(0,size), ds=chosen.map(c=>solution[c]), mask=ds.reduce((a,d)=>a|digitBit(d),0);
  let state=createTechniqueState(Array(48).fill(0)); chosen.forEach(c=>state.candidates[c]=mask);
  let step=findTechniqueSteps(state).find(s=>s.technique==='Naked '+names[size] && s.houses[0]===1 && s.cells.join(',')===chosen.map(c=>c+1).join(','));
  results.push(!!step && verifyTechniqueStep(state,step));
  state=createTechniqueState(Array(48).fill(0)); house.filter(c=>!chosen.includes(c)).forEach(c=>state.candidates[c]&=~mask);
  step=findTechniqueSteps(state).find(s=>s.technique==='Hidden '+names[size] && s.houses[0]===1 && s.digits.join(',')===ds.slice().sort((a,b)=>a-b).join(','));
  results.push(!!step && verifyTechniqueStep(state,step));
 }
 let locked=false;
 for(let a=0;a<18&&!locked;a++)for(let b=0;b<18&&!locked;b++){
  const source=techniqueHouses[a],target=techniqueHouses[b],common=source.filter(c=>target.includes(c));
  if(a===b||!common.length||common.length===8)continue;
  const cell=common[0],d=solution[cell]; let state=createTechniqueState(Array(48).fill(0));
  source.filter(c=>!common.includes(c)).forEach(c=>state.candidates[c]&=~digitBit(d));
  const step=findTechniqueSteps(state).find(s=>s.technique==='Locked Candidate'&&s.houses[0]===a+1&&s.houses[1]===b+1&&s.digits[0]===d);
  if(step)locked=verifyTechniqueStep(state,step);
 }
 results.push(locked);return results;
})()`,ctx);
assert.ok(result.every(Boolean),JSON.stringify(result));console.log('Verified synthetic naked and hidden pairs, triples, quadruples, and locked candidate');
