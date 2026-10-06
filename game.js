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

  const SPECIAL = {
    volcano: { icon: '♨', name: 'Vulkan', description: 'Verliert 1 Soldaten pro Sekunde bis 0; keine Rekrutierung.' },
    castle: { icon: '♜', name: 'Burg', description: 'Vernichtet 2 angreifende Soldaten pro Sekunde während des Anmarschs.' },
    shrine: { icon: '◎', name: 'Schrein', description: 'Truppen können zu jedem anderen Schrein teleportieren.' },
  };
  const ABILITIES = {
    capacity: { name: 'Ausbau', icon: '♜', description: '+15 Kapazität auf einem eigenen Feld.' },
    reinforcement: { name: 'Verstärkung', icon: '✚', description: '+15 Soldaten auf einem eigenen Feld, auch über die Kapazität hinaus.' },
    strike: { name: 'Schlag', icon: 'ϟ', description: '−15 Soldaten auf einem feindlichen Feld, mindestens 0.' },
  };
  const layouts = {
    easy: { r3: 'shrine', r10: 'shrine' },
    medium: { r3: 'shrine', r10: 'shrine', r6: 'volcano', r7: 'castle' },
    hard: { r3: 'shrine', r10: 'shrine', r6: 'volcano', r9: 'volcano', r4: 'volcano', r7: 'castle', r11: 'castle' },
  };

  // Small, repeatable irregularities give each territory an organic coastline.
  function coastline(path) {
    const points = [...path.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(m => [+m[1], +m[2]]);
    return points.map(([x, y], i) => {
      const [nx, ny] = points[(i + 1) % points.length];
      const length = Math.hypot(nx - x, ny - y);
      let edge = `${i ? 'L' : 'M'}${x} ${y}`;
      for (let j = 1; j < 5; j++) {
        const t = j / 5, wave = Math.sin((i * 4 + j) * 2.4) * 5;
        edge += ` L${(x + (nx - x) * t - (ny - y) / length * wave).toFixed(1)} ${(y + (ny - y) * t + (nx - x) / length * wave).toFixed(1)}`;
      }
      return edge;
    }).join(' ') + ' Z';
  }

  const state = {
    regions: new Map(),
    legions: [],
    selectedId: null,
    pointerSourceId: null,
    started: false,
    ended: false,
    startTime: performance.now(),
    endTime: null,
    lastFrame: performance.now(),
    lastAI: 0,
    legionSeq: 1,
    difficulty: 'easy',
    ability: 'capacity',
    abilityReadyAt: 0,
    targetingAbility: false,
    drag: null,
    suppressClick: false,
  };

  const el = {
    map: document.getElementById('gameMap'),
    dragArrow: document.getElementById('dragArrow'),
    setup: document.getElementById('roundSetup'),
    difficulty: document.getElementById('difficulty'),
    abilityBtn: document.getElementById('abilityBtn'),
    territoryBar: document.getElementById('territoryBar'),
    regions: document.getElementById('regions'),
    legions: document.getElementById('legions'),
    connections: document.getElementById('connections'),
    playerRegions: document.getElementById('playerRegions'),
    enemyRegions: document.getElementById('enemyRegions'),
    timer: document.getElementById('timer'),
    toast: document.getElementById('toast'),
    selectedInfo: document.getElementById('selectedInfo'),
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
    state.started = false;
    state.ended = false;
    state.startTime = performance.now();
    state.endTime = null;
    state.lastFrame = performance.now();
    state.lastAI = 0;
    state.legionSeq = 1;
    state.abilityReadyAt = 0;
    state.targetingAbility = false;
    state.drag = null;
    state.suppressClick = false;
    el.dragArrow.classList.add('hidden');
    el.setup.hidden = false;
    clearTimeout(toastTimer);
    el.toast.classList.remove('show');
    el.overlayKicker.textContent = 'BEREIT?';
    el.overlayTitle.textContent = 'Territory';
    el.overlayText.textContent = 'Erobere alle roten Regionen. Die Partie läuft ohne Pause.';
    el.overlayRestart.textContent = 'Spiel starten';
    el.overlay.classList.remove('hidden');

    for (const def of regionDefs) {
      state.regions.set(def.id, {
        ...def,
        path: coastline(def.path),
        special: layouts[state.difficulty][def.id] || null,
        capacity: def.cap,
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
      const border = svg('path', { d: region.path, class: 'region-border' });
      const path = svg('path', { d:region.path, class:`region-shape owner-${region.owner}` });
      const labelBg = svg('circle', { cx:region.cx, cy:region.cy-10, r:25, class:'region-label-bg' });
      const soldiers = svg('text', { x:region.cx, y:region.cy-10, class:'region-soldiers' });
      const capacity = svg('text', { x:region.cx, y:region.cy+24, class:'region-capacity' });
      const name = svg('text', { x:region.cx, y:region.cy+64, class:'region-name' });
      name.textContent = region.name;

      const specialIcon = svg('text', { x:region.cx, y:region.cy+48, class:'special-icon' });
      specialIcon.textContent = SPECIAL[region.special]?.icon || '';
      const title = svg('title');
      title.textContent = region.special ? `${SPECIAL[region.special].name}: ${SPECIAL[region.special].description}` : region.name;
      g.append(title, border, path, labelBg, soldiers, capacity, specialIcon, name);
      g.addEventListener('pointerdown', (e) => onRegionPointerDown(e, region.id));
      g.addEventListener('click', (e) => onRegionClick(e, region.id));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRegionClick(e, region.id); }
      });
      el.regions.appendChild(g);
      region.dom = { g, path, soldiers, capacity };
    }
  }

  function onRegionPointerDown(e, id) {
    if (!state.started || state.ended || e.button !== 0) return;
    const r = state.regions.get(id);
    if (state.targetingAbility || r.owner !== OWNER.PLAYER) return;
    state.pointerSourceId = id;
    state.drag = { id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function moveDrag(e) {
    const drag = state.drag;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6 && !drag.moved) return;
    drag.moved = true;
    selectRegion(drag.id);
    const source = state.regions.get(drag.id);
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(el.map.getScreenCTM().inverse());
    const targetId = document.elementFromPoint(e.clientX, e.clientY)?.closest('.region-group')?.getAttribute('data-id');
    const target = state.regions.get(targetId);
    const valid = target && target.id !== source.id && canTravel(source, target);
    el.dragArrow.setAttribute('d', `M${source.cx} ${source.cy} L${point.x} ${point.y}`);
    el.dragArrow.classList.remove('hidden');
    el.dragArrow.classList.toggle('invalid', !valid);
  }

  function finishDrag(e, cancelled = false) {
    if (!state.drag || state.drag.pointerId !== e.pointerId) return;
    const drag = state.drag;
    if (drag.moved) {
      state.suppressClick = true;
      setTimeout(() => { state.suppressClick = false; }, 0);
      const id = document.elementFromPoint(e.clientX, e.clientY)?.closest('.region-group')?.getAttribute('data-id');
      if (!cancelled && id && id !== drag.id) attemptSend(drag.id, id, OWNER.PLAYER);
      clearSelection();
    }
    state.drag = null;
    state.pointerSourceId = null;
    el.dragArrow.classList.add('hidden');
  }

  function canTravel(source, target) {
    return source.neighbors.includes(target.id) || (source.special === 'shrine' && target.special === 'shrine');
  }

  function onRegionClick(_e, id) {
    if (!state.started || state.ended) return;
    if (state.suppressClick) return;
    const clicked = state.regions.get(id);
    if (state.targetingAbility) { applyAbility(clicked); return; }

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
    if (clicked.owner === OWNER.PLAYER && !canTravel(selected, clicked)) {
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
    for (const target of state.regions.values()) {
      if (target.id !== source.id && canTravel(source, target)) target.dom.g.classList.add('valid-target');
    }
  }

  function attemptSend(sourceId, targetId, owner) {
    if (!state.started || state.ended) return false;
    const source = state.regions.get(sourceId);
    const target = state.regions.get(targetId);
    if (!source || !target || source.owner !== owner) return false;
    if (!canTravel(source, target)) {
      if (owner === OWNER.PLAYER) {
        flashInvalid(targetId);
        showToast('Wähle ein Nachbarfeld oder verbinde zwei Schreine.');
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
    const teleport = source.special === 'shrine' && target.special === 'shrine';
    const duration = teleport ? 450 : Math.max(850, distance / 0.16);
    const now = performance.now();
    const legion = {
      id: state.legionSeq++, sourceId:source.id, targetId:target.id,
      owner, count, start:now, duration, teleport, progress:0, lastUpdate:now,
      x:source.cx, y:source.cy, arrived:false, dom:null,
    };

    const g = svg('g');
    const line = svg('line', {
      x1:source.cx, y1:source.cy, x2:target.cx, y2:target.cy,
      class: teleport ? 'legion-line teleport-line' : 'legion-line', 'marker-end':'url(#marchHead)', stroke: owner === OWNER.PLAYER ? '#29c862' : '#f04f54'
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
    if (!target || legion.count < 1) return;
    const count = Math.floor(legion.count);

    if (target.owner === legion.owner) {
      target.soldiers = Math.max(target.soldiers, Math.min(target.capacity, target.soldiers + count));
    } else {
      const defenders = Math.floor(target.soldiers);
      if (count > defenders) {
        target.owner = legion.owner;
        target.soldiers = Math.min(target.capacity, count - defenders);
        if (legion.owner === OWNER.PLAYER) showToast(`${target.name} erobert.`);
      } else if (count < defenders) {
        target.soldiers = defenders - count;
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
      if (r.special === 'volcano') {
        r.soldiers = Math.max(0, r.soldiers - dtSeconds);
        continue;
      }
      if (r.owner === OWNER.NEUTRAL) continue;
      if (r.soldiers >= r.capacity) continue;
      r.soldiers = Math.min(r.capacity, r.soldiers + dtSeconds / 3);
    }
  }

  function distanceToPlayer() {
    const distances = new Map();
    const queue = [];
    for (const r of state.regions.values()) {
      if (r.owner === OWNER.PLAYER) { distances.set(r.id, 0); queue.push(r); }
    }
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      for (const next of state.regions.values()) {
        if (distances.has(next.id) || next.special === 'volcano' || !canTravel(current, next)) continue;
        distances.set(next.id, distances.get(current.id) + 1);
        queue.push(next);
      }
    }
    return distances;
  }

  function aiTick(now) {
    if (now - state.lastAI < ({ easy:1800, medium:1150, hard:800 }[state.difficulty])) return;
    state.lastAI = now;
    const distances = distanceToPlayer();
    const candidates = [];
    for (const source of state.regions.values()) {
      if (source.owner !== OWNER.ENEMY) continue;
      const available = Math.floor(source.soldiers);
      if (available < 4) continue;
      const send = Math.floor(available * 0.5);
      const fill = source.soldiers / source.capacity;
      for (const target of state.regions.values()) {
        if (target.id === source.id || target.special === 'volcano' || !canTravel(source, target)) continue;
        const progress = (distances.get(source.id) ?? 99) - (distances.get(target.id) ?? 99);
        const incoming = state.legions.filter(l => !l.arrived && l.owner === OWNER.ENEMY && l.targetId === target.id)
          .reduce((sum, l) => sum + Math.floor(l.count), 0);
        if (target.owner === OWNER.ENEMY) {
          // Move reserves toward the front instead of leaving rear fields full.
          if (progress <= 0 || fill < 0.45 || target.soldiers + incoming >= target.capacity * 0.8) continue;
          candidates.push({ source, target, score: 10 + progress * 10 + fill * 8 });
          continue;
        }
        const defenders = Math.floor(target.soldiers);
        const advantage = send + incoming - defenders;
        const isPlayer = target.owner === OWNER.PLAYER;
        // A full field must be allowed to wear down stronger defenders.
        if (advantage <= 0 && fill < (isPlayer ? 0.55 : 0.72)) continue;
        if (incoming > defenders + 2) continue;
        let score = (isPlayer ? 50 : 20) + progress * 18 + Math.max(-15, Math.min(15, advantage));
        if (target.special === 'volcano') score -= 20;
        if (target.special === 'castle') score -= 8;
        candidates.push({ source, target, score });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length) attemptSend(candidates[0].source.id, candidates[0].target.id, OWNER.ENEMY);
  }

  function refreshRegion(r) {
    const ownerClass = `owner-${r.owner}`;
    r.dom.path.setAttribute('class', `region-shape ${ownerClass} ${r.special || ''}`);
    r.dom.soldiers.textContent = Math.floor(r.soldiers);
    r.dom.capacity.textContent = `Kap. ${r.capacity}`;
    r.dom.g.setAttribute('aria-label', `${r.name}: ${Math.floor(r.soldiers)} Soldaten, Kapazität ${r.capacity}${r.special ? ', ' + SPECIAL[r.special].name : ''}`);
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
      const step = Math.max(0, now - legion.lastUpdate);
      const travelStep = Math.min(step, Math.max(0, 1 - legion.progress) * legion.duration);
      legion.progress += step / legion.duration;
      legion.lastUpdate = now;
      const t = Math.min(1, legion.progress);
      const source = state.regions.get(legion.sourceId);
      const target = state.regions.get(legion.targetId);
      if (target.special === 'castle' && target.owner !== legion.owner && !legion.teleport) {
        legion.count = Math.max(0, legion.count - 2 * travelStep / 1000);
        legion.dom.text.textContent = Math.floor(legion.count);
        if (legion.count < 1) { legion.arrived = true; legion.dom.g.remove(); continue; }
      }
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
    el.territoryBar.style.setProperty('--player-share', `${playerCount / state.regions.size * 100}%`);
    el.territoryBar.style.setProperty('--enemy-share', `${enemyCount / state.regions.size * 100}%`);
    const ability = ABILITIES[state.ability];
    const cooldown = Math.max(0, Math.ceil((state.abilityReadyAt - performance.now()) / 1000));
    el.abilityBtn.disabled = !state.started || state.ended || cooldown > 0;
    el.abilityBtn.classList.toggle('armed', state.targetingAbility);
    el.abilityBtn.textContent = `${ability.icon} ${ability.name}${cooldown ? ' · ' + cooldown + ' s' : state.targetingAbility ? ' · Zielfeld wählen' : ''}`;
    el.abilityBtn.title = `${ability.description} 60 Sekunden Abklingzeit. Anklicken, dann Zielfeld wählen.`;

    const elapsed = state.started ? Math.max(0, (state.endTime ?? performance.now()) - state.startTime) : 0;
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
    const rate = (r.special === 'volcano' ? 0 : 1 / 3).toFixed(2).replace('.', ',');
    el.selectedInfo.innerHTML = `<b>${r.name}</b><br>${ownerLabel} · ${Math.floor(r.soldiers)}/${r.capacity} Soldaten<br>Rekrutierung: ${r.owner === OWNER.NEUTRAL ? '0' : rate} / Sek.${r.special ? `<br><b>${SPECIAL[r.special].icon} ${SPECIAL[r.special].name}</b><br>${SPECIAL[r.special].description}` : ''}`;
  }

  function checkEndState() {
    if (state.ended) return;
    const playerRegions = [...state.regions.values()].filter(r => r.owner === OWNER.PLAYER).length;
    const enemyRegions = [...state.regions.values()].filter(r => r.owner === OWNER.ENEMY).length;
    const playerLegions = state.legions.some(l => !l.arrived && l.owner === OWNER.PLAYER);
    const enemyLegions = state.legions.some(l => !l.arrived && l.owner === OWNER.ENEMY);

    if (enemyRegions === 0 && !enemyLegions) endGame(true);
    else if (playerRegions === 0 && !playerLegions) endGame(false);
  }

  function endGame(won) {
    state.ended = true;
    state.endTime = performance.now();
    state.drag = null;
    el.dragArrow.classList.add('hidden');
    el.setup.hidden = true;
    updateHUD();
    el.overlayKicker.textContent = won ? 'MISSION ERFÜLLT' : 'MISSION GESCHEITERT';
    el.overlayTitle.textContent = won ? 'Sieg!' : 'Niederlage';
    el.overlayText.textContent = won
      ? `Du hast alle feindlichen Regionen in ${el.timer.textContent} ausgeschaltet.`
      : 'Die KI hat deine letzte Region erobert.';
    el.overlayRestart.textContent = 'Noch einmal';
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

  function activateAbility() {
    if (!state.started || state.ended || performance.now() < state.abilityReadyAt) return;
    state.targetingAbility = !state.targetingAbility;
    clearSelection();
    showToast(state.targetingAbility ? (state.ability === 'strike' ? 'Wähle ein rotes Feld.' : 'Wähle ein grünes Feld.') : 'Fähigkeit abgewählt.');
    updateHUD();
  }

  function applyAbility(target) {
    const now = performance.now();
    if (!state.started || state.ended || now < state.abilityReadyAt) return;
    const expectedOwner = state.ability === 'strike' ? OWNER.ENEMY : OWNER.PLAYER;
    if (target.owner !== expectedOwner) { showToast(expectedOwner === OWNER.ENEMY ? 'Wähle ein rotes Feld.' : 'Wähle ein grünes Feld.'); return; }
    if (state.ability === 'capacity') target.capacity += 15;
    if (state.ability === 'reinforcement') target.soldiers += 15;
    if (state.ability === 'strike') target.soldiers = Math.max(0, target.soldiers - 15);
    state.abilityReadyAt = now + 60000;
    state.targetingAbility = false;
    showToast(`${ABILITIES[state.ability].name}: ${target.name}`);
    refreshAll();
  }

  function startGame() {
    if (state.started && !state.ended) return;
    if (state.ended) { resetState(); return; }
    const now = performance.now();
    state.started = true;
    state.startTime = now;
    state.lastFrame = now;
    state.lastAI = now;
    state.ability = document.querySelector('input[name=ability]:checked').value;
    el.overlay.classList.add('hidden');
    updateHUD();
  }

  function frame(now) {
    if (state.started && !state.ended) {
      const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
      recruitmentTick(dt);
      updateLegions(now);
      aiTick(now);
      for (const r of state.regions.values()) {
        refreshRegion(r);
      }
      updateHUD();
      updateSelectedInfo();
      checkEndState();
    }
    state.lastFrame = now;
    requestAnimationFrame(frame);
  }

  el.restartBtn.addEventListener('click', resetState);
  el.overlayRestart.addEventListener('click', startGame);
  document.addEventListener('pointermove', moveDrag);
  document.addEventListener('pointerup', e => finishDrag(e));
  document.addEventListener('pointercancel', e => finishDrag(e, true));
  el.difficulty.addEventListener('change', () => {
    if (state.started && !state.ended) return;
    state.difficulty = el.difficulty.value;
    resetState();
  });
  el.abilityBtn.addEventListener('click', activateAbility);

  resetState();
  requestAnimationFrame(frame);
})();
