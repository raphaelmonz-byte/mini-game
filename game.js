(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const OWNER = { PLAYER: 'player', ENEMY: 'enemy', NEUTRAL: 'neutral' };

  const regionDefs = [
    { id:'r1', name:'Westhain', cx:150, cy:345, cap:24, soldiers:18, owner:OWNER.PLAYER, neighbors:['r2','r5'], path:'M54 286 L98 244 L173 245 L216 277 L223 337 L193 386 L122 412 L64 375 Z' },
    { id:'r2', name:'Nordpass', cx:310, cy:235, cap:16, soldiers:9, owner:OWNER.NEUTRAL, neighbors:['r1','r3','r5','r6'], path:'M222 195 L276 157 L347 162 L385 197 L379 258 L338 292 L274 286 L230 252 Z' },
    { id:'r3', name:'Hochland', cx:487, cy:170, cap:20, soldiers:11, owner:OWNER.NEUTRAL, neighbors:['r2','r4','r6','r7'], path:'M383 122 L432 84 L510 77 L568 104 L591 153 L572 207 L516 235 L447 222 L400 189 Z' },
    { id:'r4', name:'Falkenmark', cx:676, cy:190, cap:28, soldiers:16, owner:OWNER.NEUTRAL, neighbors:['r3','r7','r8'], path:'M584 133 L642 101 L716 112 L771 149 L779 207 L742 252 L668 262 L610 227 L589 187 Z' },
    { id:'r5', name:'Moorfeld', cx:316, cy:385, cap:18, soldiers:10, owner:OWNER.NEUTRAL, neighbors:['r1','r2','r6','r9'], path:'M222 323 L267 290 L341 298 L391 333 L389 396 L349 435 L282 440 L234 407 Z' },
    { id:'r6', name:'Kernland', cx:487, cy:350, cap:26, soldiers:14, owner:OWNER.NEUTRAL, neighbors:['r2','r3','r5','r7','r9','r10'], path:'M393 286 L449 244 L516 249 L566 292 L570 354 L537 405 L470 422 L411 396 L382 346 Z' },
    { id:'r7', name:'Silberauen', cx:665, cy:350, cap:22, soldiers:12, owner:OWNER.NEUTRAL, neighbors:['r3','r4','r6','r8','r10','r11'], path:'M571 278 L626 248 L704 260 L755 301 L757 360 L720 410 L648 418 L590 392 L565 338 Z' },
    { id:'r8', name:'Rotgrat', cx:862, cy:310, cap:24, soldiers:18, owner:OWNER.ENEMY, neighbors:['r4','r7','r11','r12'], path:'M774 244 L829 212 L911 221 L970 265 L978 325 L945 372 L879 391 L813 367 L781 329 Z' },
    { id:'r9', name:'Südwest', cx:386, cy:535, cap:14, soldiers:8, owner:OWNER.NEUTRAL, neighbors:['r5','r6','r10'], path:'M283 470 L341 439 L409 445 L456 486 L458 548 L420 594 L352 607 L300 574 L275 522 Z' },
    { id:'r10', name:'Südhain', cx:571, cy:525, cap:20, soldiers:10, owner:OWNER.NEUTRAL, neighbors:['r6','r7','r9','r11'], path:'M460 455 L519 422 L594 430 L643 468 L648 530 L610 579 L537 592 L480 562 L453 510 Z' },
    { id:'r11', name:'Osttal', cx:765, cy:510, cap:30, soldiers:16, owner:OWNER.NEUTRAL, neighbors:['r7','r8','r10','r12'], path:'M651 430 L711 405 L786 416 L842 461 L851 520 L816 569 L747 589 L681 560 L650 511 Z' },
    { id:'r12', name:'Kronland', cx:989, cy:465, cap:36, soldiers:24, owner:OWNER.ENEMY, neighbors:['r8','r11'], path:'M858 391 L918 357 L1005 365 L1080 410 L1115 472 L1085 536 L1018 572 L934 558 L880 514 L855 453 Z' },
  ];

  const state = {
    regions: new Map(),
    legions: [],
    selectedId: null,
    pointerSourceId: null,
    paused: false,
    ended: false,
    startTime: performance.now(),
    pausedAt: 0,
    accumulatedPause: 0,
    lastFrame: performance.now(),
    lastAI: 0,
    legionSeq: 1,
  };

  const el = {
    regions: document.getElementById('regions'),
    legions: document.getElementById('legions'),
    connections: document.getElementById('connections'),
    playerRegions: document.getElementById('playerRegions'),
    enemyRegions: document.getElementById('enemyRegions'),
    timer: document.getElementById('timer'),
    toast: document.getElementById('toast'),
    selectedInfo: document.getElementById('selectedInfo'),
    pauseBtn: document.getElementById('pauseBtn'),
    restartBtn: document.getElementById('restartBtn'),
    overlay: document.getElementById('overlay'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlayText: document.getElementById('overlayText'),
    overlayKicker: document.getElementById('overlayKicker'),
    overlayRestart: document.getElementById('overlayRestart'),
  };

  function svg(tag, attrs = {}) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k,v]) => node.setAttribute(k, v));
    return node;
  }

  function resetState() {
    state.regions.clear();
    state.legions = [];
    state.selectedId = null;
    state.pointerSourceId = null;
    state.paused = false;
    state.ended = false;
    state.startTime = performance.now();
    state.pausedAt = 0;
    state.accumulatedPause = 0;
    state.lastFrame = performance.now();
    state.lastAI = 0;
    state.legionSeq = 1;
    el.pauseBtn.textContent = 'Pause';
    el.overlay.classList.add('hidden');

    for (const def of regionDefs) {
      state.regions.set(def.id, {
        ...def,
        soldiers: def.soldiers,
        owner: def.owner,
        dom: null,
      });
    }

    renderStaticMap();
    refreshAll();
  }

  function renderStaticMap() {
    el.connections.innerHTML = '';
    el.regions.innerHTML = '';
    el.legions.innerHTML = '';

    const seen = new Set();
    for (const region of state.regions.values()) {
      for (const nId of region.neighbors) {
        const key = [region.id, nId].sort().join('-');
        if (seen.has(key)) continue;
        seen.add(key);
        const target = state.regions.get(nId);
        const line = svg('line', { x1:region.cx, y1:region.cy, x2:target.cx, y2:target.cy, class:'connection' });
        el.connections.appendChild(line);
      }
    }

    for (const region of state.regions.values()) {
      const g = svg('g', { class:'region-group', 'data-id':region.id, tabindex:'0', role:'button', 'aria-label':region.name });
      const path = svg('path', { d:region.path, class:`region-shape owner-${region.owner}` });
      const labelBg = svg('circle', { cx:region.cx, cy:region.cy-5, r:38, class:'region-label-bg' });
      const soldiers = svg('text', { x:region.cx, y:region.cy-12, class:'region-soldiers' });
      const capacity = svg('text', { x:region.cx, y:region.cy+27, class:'region-capacity' });
      const name = svg('text', { x:region.cx, y:region.cy+56, class:'region-name' });
      name.textContent = region.name;

      g.append(path, labelBg, soldiers, capacity, name);
      g.addEventListener('pointerdown', (e) => onRegionPointerDown(e, region.id));
      g.addEventListener('pointerup', (e) => onRegionPointerUp(e, region.id));
      g.addEventListener('click', (e) => onRegionClick(e, region.id));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRegionClick(e, region.id); }
      });
      el.regions.appendChild(g);
      region.dom = { g, path, soldiers, capacity };
    }
  }

  function onRegionPointerDown(e, id) {
    if (state.paused || state.ended) return;
    const r = state.regions.get(id);
    if (r.owner === OWNER.PLAYER) {
      state.pointerSourceId = id;
      selectRegion(id);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } else {
      state.pointerSourceId = null;
    }
  }

  function onRegionPointerUp(_e, id) {
    if (state.paused || state.ended) return;
    if (!state.pointerSourceId || state.pointerSourceId === id) return;
    const sourceId = state.pointerSourceId;
    state.pointerSourceId = null;
    attemptSend(sourceId, id, OWNER.PLAYER);
  }

  function onRegionClick(_e, id) {
    if (state.paused || state.ended) return;
    const clicked = state.regions.get(id);

    if (!state.selectedId) {
      if (clicked.owner === OWNER.PLAYER) selectRegion(id);
      else showToast('Wähle zuerst eine grüne Region.');
      return;
    }

    if (state.selectedId === id) {
      clearSelection();
      return;
    }

    const selected = state.regions.get(state.selectedId);
    if (clicked.owner === OWNER.PLAYER && !selected.neighbors.includes(id)) {
      selectRegion(id);
      return;
    }

    const success = attemptSend(state.selectedId, id, OWNER.PLAYER);
    if (success) clearSelection();
  }

  function selectRegion(id) {
    state.selectedId = id;
    updateSelectionClasses();
    updateSelectedInfo();
  }

  function clearSelection() {
    state.selectedId = null;
    updateSelectionClasses();
    updateSelectedInfo();
  }

  function updateSelectionClasses() {
    for (const r of state.regions.values()) {
      r.dom.g.classList.remove('selected', 'valid-target');
    }
    if (!state.selectedId) return;
    const source = state.regions.get(state.selectedId);
    source.dom.g.classList.add('selected');
    for (const nId of source.neighbors) state.regions.get(nId).dom.g.classList.add('valid-target');
  }

  function attemptSend(sourceId, targetId, owner) {
    const source = state.regions.get(sourceId);
    const target = state.regions.get(targetId);
    if (!source || !target || source.owner !== owner) return false;
    if (!source.neighbors.includes(targetId)) {
      if (owner === OWNER.PLAYER) {
        flashInvalid(targetId);
        showToast('Diese Regionen grenzen nicht aneinander.');
      }
      return false;
    }

    const visible = Math.floor(source.soldiers);
    const sendCount = Math.floor(visible * 0.5);
    if (sendCount < 1) {
      if (owner === OWNER.PLAYER) showToast('Zu wenig Soldaten für einen Angriff.');
      return false;
    }

    source.soldiers -= sendCount;
    spawnLegion(source, target, sendCount, owner);
    refreshRegion(source);
    return true;
  }

  function spawnLegion(source, target, count, owner) {
    const dx = target.cx - source.cx;
    const dy = target.cy - source.cy;
    const distance = Math.hypot(dx, dy);
    const duration = Math.max(850, distance / 0.16); // ms
    const now = performance.now();
    const legion = {
      id: state.legionSeq++, sourceId:source.id, targetId:target.id,
      owner, count, start:now, duration,
      x:source.cx, y:source.cy, arrived:false, dom:null,
    };

    const g = svg('g');
    const line = svg('line', {
      x1:source.cx, y1:source.cy, x2:target.cx, y2:target.cy,
      class:'legion-line', stroke: owner === OWNER.PLAYER ? '#29c862' : '#f04f54'
    });
    const dot = svg('circle', {
      cx:source.cx, cy:source.cy, r:18, class:'legion-dot',
      fill: owner === OWNER.PLAYER ? '#159747' : '#c83338'
    });
    const text = svg('text', { x:source.cx, y:source.cy+1, class:'legion-count' });
    text.textContent = count;
    g.append(line, dot, text);
    el.legions.appendChild(g);
    legion.dom = { g, dot, text };
    state.legions.push(legion);
  }

  function resolveArrival(legion) {
    const target = state.regions.get(legion.targetId);
    if (!target) return;

    if (target.owner === legion.owner) {
      target.soldiers = Math.min(target.capacity, target.soldiers + legion.count);
    } else {
      const defenders = Math.floor(target.soldiers);
      if (legion.count > defenders) {
        target.owner = legion.owner;
        target.soldiers = legion.count - defenders;
        if (legion.owner === OWNER.PLAYER) showToast(`${target.name} erobert.`);
      } else if (legion.count < defenders) {
        target.soldiers = defenders - legion.count;
      } else {
        target.owner = OWNER.NEUTRAL;
        target.soldiers = 0;
      }
    }

    refreshRegion(target);
    updateSelectionClasses();
    checkEndState();
  }

  function recruitmentTick(dtSeconds) {
    for (const r of state.regions.values()) {
      if (r.owner === OWNER.NEUTRAL) continue;
      if (r.soldiers >= r.capacity) { r.soldiers = r.capacity; continue; }
      r.soldiers = Math.min(r.capacity, r.soldiers + (r.capacity / 20) * dtSeconds);
    }
  }

  function aiTick(now) {
    if (now - state.lastAI < 1150) return;
    state.lastAI = now;

    const candidates = [];
    for (const source of state.regions.values()) {
      if (source.owner !== OWNER.ENEMY) continue;
      const available = Math.floor(source.soldiers);
      if (available < 4) continue;
      const send = Math.floor(available * 0.5);

      for (const nId of source.neighbors) {
        const target = state.regions.get(nId);
        if (target.owner === OWNER.ENEMY) continue;
        const defenders = Math.floor(target.soldiers);
        const advantage = send - defenders;
        let score = 0;
        score += target.owner === OWNER.PLAYER ? 26 : 10;
        score += target.capacity * 0.65;
        score += advantage * 2.2;
        score += source.soldiers / source.capacity > 0.78 ? 12 : 0;
        if (send <= defenders) score -= 18;
        score += Math.random() * 10;
        candidates.push({ source, target, score, advantage });
      }
    }

    if (!candidates.length) return;
    candidates.sort((a,b) => b.score - a.score);
    const choice = candidates[0];
    const fill = choice.source.soldiers / choice.source.capacity;
    if (choice.score > 18 && (choice.advantage >= -2 || fill > 0.72)) {
      attemptSend(choice.source.id, choice.target.id, OWNER.ENEMY);
    }
  }

  function refreshRegion(r) {
    const ownerClass = `owner-${r.owner}`;
    r.dom.path.setAttribute('class', `region-shape ${ownerClass}`);
    r.dom.soldiers.textContent = Math.floor(r.soldiers);
    r.dom.capacity.textContent = r.capacity;
    r.dom.capacity.setAttribute('fill', r.owner === OWNER.NEUTRAL ? '#15130f' : '#071118');
  }

  function refreshAll() {
    for (const r of state.regions.values()) refreshRegion(r);
    updateHUD();
    updateSelectionClasses();
    updateSelectedInfo();
  }

  function updateLegions(now) {
    for (const legion of state.legions) {
      if (legion.arrived) continue;
      const t = Math.min(1, (now - legion.start) / legion.duration);
      const source = state.regions.get(legion.sourceId);
      const target = state.regions.get(legion.targetId);
      const eased = t < .5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2;
      legion.x = source.cx + (target.cx - source.cx) * eased;
      legion.y = source.cy + (target.cy - source.cy) * eased;
      legion.dom.dot.setAttribute('cx', legion.x);
      legion.dom.dot.setAttribute('cy', legion.y);
      legion.dom.text.setAttribute('x', legion.x);
      legion.dom.text.setAttribute('y', legion.y + 1);

      if (t >= 1) {
        legion.arrived = true;
        legion.dom.g.remove();
        resolveArrival(legion);
      }
    }
    state.legions = state.legions.filter(l => !l.arrived);
  }

  function updateHUD() {
    let playerCount = 0, enemyCount = 0;
    for (const r of state.regions.values()) {
      if (r.owner === OWNER.PLAYER) playerCount++;
      if (r.owner === OWNER.ENEMY) enemyCount++;
    }
    el.playerRegions.textContent = playerCount;
    el.enemyRegions.textContent = enemyCount;

    const effectiveNow = state.paused ? state.pausedAt : performance.now();
    const elapsed = Math.max(0, effectiveNow - state.startTime - state.accumulatedPause);
    const seconds = Math.floor(elapsed / 1000);
    el.timer.textContent = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  }

  function updateSelectedInfo() {
    if (!state.selectedId) {
      el.selectedInfo.textContent = 'Wähle eine grüne Region aus.';
      return;
    }
    const r = state.regions.get(state.selectedId);
    const ownerLabel = r.owner === OWNER.PLAYER ? 'Du' : r.owner === OWNER.ENEMY ? 'KI' : 'Neutral';
    const rate = (r.capacity / 20).toFixed(1).replace('.', ',');
    el.selectedInfo.innerHTML = `<b>${r.name}</b><br>${ownerLabel} · ${Math.floor(r.soldiers)}/${r.capacity} Soldaten<br>Rekrutierung: ${r.owner === OWNER.NEUTRAL ? '0' : rate} / Sek.`;
  }

  function checkEndState() {
    if (state.ended) return;
    const playerRegions = [...state.regions.values()].filter(r => r.owner === OWNER.PLAYER).length;
    const enemyRegions = [...state.regions.values()].filter(r => r.owner === OWNER.ENEMY).length;
    const playerLegions = state.legions.some(l => l.owner === OWNER.PLAYER);
    const enemyLegions = state.legions.some(l => l.owner === OWNER.ENEMY);

    if (enemyRegions === 0 && !enemyLegions) endGame(true);
    else if (playerRegions === 0 && !playerLegions) endGame(false);
  }

  function endGame(won) {
    state.ended = true;
    state.paused = true;
    updateHUD();
    el.overlayKicker.textContent = won ? 'MISSION ERFÜLLT' : 'MISSION GESCHEITERT';
    el.overlayTitle.textContent = won ? 'Sieg!' : 'Niederlage';
    el.overlayText.textContent = won
      ? `Du hast alle feindlichen Regionen in ${el.timer.textContent} ausgeschaltet.`
      : 'Die KI hat deine letzte Region erobert.';
    el.overlay.classList.remove('hidden');
  }

  function flashInvalid(id) {
    const r = state.regions.get(id);
    if (!r) return;
    r.dom.g.classList.remove('invalid-flash');
    requestAnimationFrame(() => r.dom.g.classList.add('invalid-flash'));
    setTimeout(() => r.dom.g.classList.remove('invalid-flash'), 550);
  }

  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.classList.add('show');
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1500);
  }

  function togglePause() {
    if (state.ended) return;
    const now = performance.now();
    if (!state.paused) {
      state.paused = true;
      state.pausedAt = now;
      el.pauseBtn.textContent = 'Weiter';
    } else {
      state.paused = false;
      state.accumulatedPause += now - state.pausedAt;
      const pauseDelta = now - state.pausedAt;
      for (const l of state.legions) l.start += pauseDelta;
      state.lastFrame = now;
      el.pauseBtn.textContent = 'Pause';
    }
  }

  function frame(now) {
    if (!state.paused && !state.ended) {
      const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
      recruitmentTick(dt);
      updateLegions(now);
      aiTick(now);
      for (const r of state.regions.values()) {
        r.dom.soldiers.textContent = Math.floor(r.soldiers);
      }
      updateHUD();
      updateSelectedInfo();
      checkEndState();
    }
    state.lastFrame = now;
    requestAnimationFrame(frame);
  }

  el.pauseBtn.addEventListener('click', togglePause);
  el.restartBtn.addEventListener('click', resetState);
  el.overlayRestart.addEventListener('click', resetState);
  document.addEventListener('pointerup', () => { state.pointerSourceId = null; });

  resetState();
  requestAnimationFrame(frame);
})();
