const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function game() {
  class Element {
    constructor() {
      this.textContent = ''; this.children = []; this.attributes = {}; this.events = {}; this.style = { setProperty() {} };
      const classes = new Set();
      this.classList = { add: (...a) => a.forEach(x => classes.add(x)), remove: (...a) => a.forEach(x => classes.delete(x)), toggle: (x, on) => on ? classes.add(x) : classes.delete(x), contains: x => classes.has(x) };
    }
    set innerHTML(value) { this.children = []; this.html = value; }
    get innerHTML() { return this.html; }
    setAttribute(key, value) { this.attributes[key] = value; }
    append(...nodes) { this.children.push(...nodes); }
    appendChild(node) { this.append(node); }
    addEventListener(key, fn) { this.events[key] = fn; }
    remove() {}
  }
  let now = 0, ability = 'capacity';
  const elements = {};
  const document = { getElementById: id => elements[id] ??= new Element(), createElementNS: () => new Element(), addEventListener() {}, querySelector: () => ({ value: ability }) };
  const context = { document, performance: { now: () => now }, requestAnimationFrame() {}, setTimeout() {}, clearTimeout() {} };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8').replace('  resetState();\n  requestAnimationFrame(frame);', '  resetState();\n  globalThis.api = {state, frame, startGame, resetState, recruitmentTick, attemptSend, updateLegions, resolveArrival, activateAbility, applyAbility, onRegionClick};');
  vm.runInContext(source, context);
  return { ...context.api, elements, advance: ms => now += ms, choose: value => ability = value };
}

test('waiting screen freezes production, AI, timer; start fields recruit every three seconds', () => {
  const g = game(); g.advance(5000); g.frame(5000);
  assert.equal(g.state.regions.get('r1').soldiers, 18); assert.equal(g.state.legions.length, 0); assert.equal(g.elements.timer.textContent, '00:00');
  g.startGame(); g.recruitmentTick(3);
  for (const [id, expected] of [['r1', 19], ['r8', 19], ['r12', 25]]) assert.equal(g.state.regions.get(id).soldiers, expected);
  for (const r of g.state.regions.values()) assert.equal(r.dom.capacity.textContent, `Kap. ${r.capacity}`);
});
test('two clicks select a player field and send soldiers to neutral and hostile neighbors', () => {
  const g = game(); g.startGame(); g.onRegionClick({}, 'r1'); assert.equal(g.state.selectedId, 'r1');
  g.onRegionClick({}, 'r2'); assert.equal(g.state.legions.length, 1); assert.equal(g.state.regions.get('r1').soldiers, 9);
  g.state.regions.get('r5').owner = 'enemy'; g.onRegionClick({}, 'r1'); g.onRegionClick({}, 'r5'); assert.equal(g.state.legions.length, 2);
  assert.equal(g.attemptSend('r1', 'r12', 'player'), false);
});
test('difficulty adds 2, 4, 7 special fields while protecting start fields and pairing shrines', () => {
  const g = game(); for (const [difficulty, count] of [['easy',2],['medium',4],['hard',7]]) {
    g.state.difficulty = difficulty; g.resetState();
    assert.equal([...g.state.regions.values()].filter(r => r.special).length, count);
    assert.equal([...g.state.regions.values()].filter(r => r.special === 'shrine').length, 2);
    for (const id of ['r1','r8','r12']) assert.equal(g.state.regions.get(id).special, null);
  }
});
test('volcano destroys neutral and occupied units down to zero without producing', () => {
  const g = game(); g.state.difficulty = 'medium'; g.resetState(); g.startGame(); const r = g.state.regions.get('r6');
  g.recruitmentTick(3); assert.equal(r.soldiers,11); r.owner = 'player'; g.recruitmentTick(20); assert.equal(r.soldiers,0); g.recruitmentTick(3); assert.equal(r.soldiers,0);
});
test('castle continuously destroys incoming attackers; friendly reinforcements survive', () => {
  const g = game(); g.state.difficulty = 'medium'; g.resetState(); g.startGame(); const source = g.state.regions.get('r6'); source.owner = 'player'; source.soldiers = 20;
  assert(g.attemptSend('r6','r7','player')); const legion = g.state.legions[0]; g.advance(500); g.updateLegions(500); assert.equal(legion.count,9);
  g.state.regions.get('r7').owner = 'player'; g.advance(500); g.updateLegions(1000); assert.equal(legion.count,9);
});
test('shrine sends troops to distant shrine and arrives after teleport animation', () => {
  const g = game(); g.startGame(); g.state.regions.get('r3').owner = 'player'; g.state.regions.get('r3').soldiers = 30;
  assert(g.attemptSend('r3','r10','player')); assert(g.state.legions[0].teleport); g.advance(450); g.updateLegions(450); assert.equal(g.state.regions.get('r10').owner,'player'); assert.equal(g.state.regions.get('r10').soldiers,5);
});
test('capacity ability validates ownership and allows choosing another field after 60 seconds', () => {
  const g = game(); g.startGame(); g.activateAbility(); g.applyAbility(g.state.regions.get('r8')); assert.equal(g.state.abilityReadyAt,0);
  g.applyAbility(g.state.regions.get('r1')); assert.equal(g.state.regions.get('r1').capacity,39);
  g.activateAbility(); g.applyAbility(g.state.regions.get('r1')); assert.equal(g.state.regions.get('r1').capacity,39);
  g.advance(60000); const other = g.state.regions.get('r2'); other.owner = 'player'; g.activateAbility(); g.applyAbility(other); assert.equal(other.capacity,31);
});
test('reinforcement adds exactly 15, including over capacity, without later removing surplus', () => {
  const g = game(); g.choose('reinforcement'); g.startGame(); g.activateAbility(); const r = g.state.regions.get('r1'); g.applyAbility(r); assert.equal(r.soldiers,33); g.recruitmentTick(3); assert.equal(r.soldiers,33);
  g.resolveArrival({targetId:'r1', owner:'player', count:4}); assert.equal(r.soldiers,33);
});
test('strike reduces hostile garrison by 15, never below zero, and cannot hit own fields', () => {
  const g = game(); g.choose('strike'); g.startGame(); g.activateAbility(); g.applyAbility(g.state.regions.get('r1')); assert.equal(g.state.abilityReadyAt,0);
  const enemy = g.state.regions.get('r8'); g.applyAbility(enemy); assert.equal(enemy.soldiers,3); g.advance(60000); g.activateAbility(); g.applyAbility(enemy); assert.equal(enemy.soldiers,0);
});
test('destroyed last enemy legion does not prevent victory', () => {
  const g = game(); g.state.difficulty='medium'; g.resetState(); g.startGame();
  for (const r of g.state.regions.values()) r.owner='player';
  const target = g.state.regions.get('r7');
  g.state.legions.push({targetId:target.id, sourceId:'r6',owner:'enemy', count:1, progress:0,lastUpdate:0,duration:1500,teleport:false,dom:{g:{remove(){}},text:{setAttribute(){}},dot:{setAttribute(){}}}});
  g.advance(500); g.frame(500); assert.equal(g.state.ended,true);
});
