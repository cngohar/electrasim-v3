(() => {
  const canvas = document.getElementById('le-canvas');
  const loading = document.getElementById('le-loading');
  const hint = document.getElementById('le-hint');
  const enter = document.getElementById('le-enter');
  const power = document.getElementById('le-power');
  const inspector = document.getElementById('le-inspector');
  const history = document.getElementById('le-history-panel');
  if (!canvas) return;
  let THREE, renderer, scene, camera, lamp, filament, filamentGlow, raf, powered = false, mode = 'assembly';
  let yaw = .35, pitch = .15, zoom = 7, drag = null;
  let appliedVoltage = 0, failed = false, buildStep = 0, vacuumState = 'open', demonstration = false;
  const BUILD_STEPS = [
    ['CONNECT', 'Copper wires + platinum sections'], ['FORM', 'Glass stem blown around the wires'],
    ['CARBONIZE', 'Cotton thread becomes carbon filament'], ['MOUNT', 'Filament fixed to platinum clamps'],
    ['FIT', 'Glass envelope fitted around assembly'], ['EVACUATE', 'Air removed through the top glass tip'],
    ['SEAL', 'Tip sealed; lamp ready for life test'],
  ];
  const components = {};
  const makeMat = (color, opts = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: .42, metalness: .08, ...opts });
  const cyl = (r, h, mat, y = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), mat); m.position.y = y; return m; };
  const openPanel = (el) => { if (el) el.hidden = false; };
  function build() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#f1e8da');
    camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
    scene.add(new THREE.HemisphereLight('#fff9ed', '#806044', 2.7));
    const key = new THREE.DirectionalLight('#fff3d2', 4); key.position.set(-3, 6, 5); key.castShadow = true; scene.add(key);
    const fill = new THREE.PointLight('#ffd879', powered ? 15 : 2, 12); fill.position.set(0, 1, 1); scene.add(fill); filamentGlow = fill;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(13, .3, 7), makeMat('#9b6a43')); bench.position.y = -2.5; scene.add(bench);
    const back = new THREE.Mesh(new THREE.BoxGeometry(13, 6, .2), makeMat(demonstration ? '#b7a88f' : '#d7c6ad')); back.position.set(0, .5, -2.9); scene.add(back);
    if (demonstration) {
      // Three distant warm points suggest the many lamps reported at Menlo Park;
      // the foreground object remains the documented hero lamp.
      for (const x of [-4.2, 0, 4.2]) { const window = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.1, .08), makeMat('#f4d68d', { emissive: '#9c6424', emissiveIntensity: 1.4 })); window.position.set(x, .9, -2.76); scene.add(window); }
      const night = new THREE.AmbientLight('#8ba6ba', .4); scene.add(night);
    }
    lamp = new THREE.Group(); lamp.position.y = -.25; scene.add(lamp);
    components.envelope = new THREE.Mesh(new THREE.SphereGeometry(1.48, 64, 32), makeMat('#dff4ff', { transparent: true, opacity: mode === 'xray' ? .16 : mode === 'cutaway' ? .28 : .34, transmission: .25, roughness: .08, side: THREE.DoubleSide })); components.envelope.scale.y = 1.08; components.envelope.position.y = .85; lamp.add(components.envelope);
    components.tip = new THREE.Mesh(new THREE.ConeGeometry(.18, .5, 32), makeMat('#d8edf0', { transparent: true, opacity: .55 })); components.tip.position.y = 2.47; lamp.add(components.tip);
    if (vacuumState !== 'open') {
      components.pump = new THREE.Group();
      const pumpBody = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, 1.7, 32), makeMat('#aab2b5', { metalness: .8 })); pumpBody.position.set(2.7, 1.5, 0); components.pump.add(pumpBody);
      const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(2.35, 1.5, 0), new THREE.Vector3(1.6, 2.1, 0), new THREE.Vector3(.18, 2.45, 0)]), 24, .07, 12), makeMat('#78909c', { metalness: .25 })); components.pump.add(hose);
      const plunger = new THREE.Mesh(new THREE.BoxGeometry(.12, .9, .12), makeMat('#806a55', { metalness: .35 })); plunger.position.set(2.7, 2.75, 0); components.pump.add(plunger);
      scene.add(components.pump);
    }
    components.stem = cyl(.11, 1.8, makeMat('#e9f8f5', { transparent: true, opacity: .65 }), -.45); lamp.add(components.stem);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-.58, .25, 0), new THREE.Vector3(-.58, .8, 0), new THREE.Vector3(.58, .8, 0), new THREE.Vector3(.58, .25, 0)]);
    filament = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, .045, 12), makeMat('#a84222', { emissive: '#321008', emissiveIntensity: powered ? 3 : .1 })); filament.name = 'CarbonFilament'; components.filament = filament; lamp.add(filament);
    components.platinum = new THREE.Group(); for (const x of [-.58, .58]) { const clamp = cyl(.055, .85, makeMat('#c7ccd0', { metalness: .8 }), .12); clamp.position.x = x; clamp.rotation.z = .2 * Math.sign(x); components.platinum.add(clamp); } lamp.add(components.platinum);
    components.plates = new THREE.Group(); for (const x of [-.48, .48]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.18, .65, .7), makeMat('#b8783e', { metalness: .65 })); p.position.set(x, -1.35, 0); components.plates.add(p); } lamp.add(components.plates);
    components.contacts = cyl(.9, .12, makeMat('#b8783e', { metalness: .7 }), -1.72); lamp.add(components.contacts);
    if (mode === 'disassemble') { components.envelope.position.y += 1.4; components.tip.position.y += 2; components.platinum.position.y -= .3; components.plates.position.y -= .35; components.contacts.position.y -= .55; }
    if (mode === 'build') {
      // A physical construction sequence, from contact hardware to sealed lamp.
      const reveal = [components.contacts, components.plates, components.stem, components.platinum, components.filament, components.envelope, components.tip];
      reveal.forEach((object, index) => { object.visible = index <= buildStep; object.position.y += (index - 3) * .16; });
    }
    if (mode === 'cutaway') components.envelope.scale.x = .58;
    if (mode === 'xray') components.envelope.scale.set(.9, 1.08, .9);
    components.envelope.material.opacity = vacuumState === 'sealed' ? .3 : vacuumState === 'pumping' ? .18 : .34;
    if (failed) { components.filament.visible = false; }
    const heat = Math.min(1, appliedVoltage / 110);
    components.filament.material.emissive = new THREE.Color(failed ? '#210b06' : '#ff4d18');
    components.filament.material.emissiveIntensity = failed ? .05 : heat * 5;
    if (filamentGlow) { filamentGlow.intensity = powered ? 2 + heat * 18 : 2; filamentGlow.color.set(heat > .75 ? '#ffd36b' : '#e3a86d'); }
    for (const [name, object] of Object.entries(components)) { object.userData = { name }; }
  }
  function render() { if (!renderer || !scene) return; camera.position.set(Math.sin(yaw) * zoom, Math.sin(pitch) * zoom * .45, Math.cos(yaw) * zoom); camera.lookAt(0, .15, 0); renderer.render(scene, camera); if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) raf = requestAnimationFrame(render); }
  function resize() { if (!renderer) return; const r = canvas.getBoundingClientRect(); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(r.height, 1); camera.updateProjectionMatrix(); }
  function start() { if (!THREE) return; if (!renderer) { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.outputColorSpace = THREE.SRGBColorSpace; window.addEventListener('resize', resize); } build(); resize(); loading.hidden = true; render(); }
  async function load() { try { THREE = await import('three'); start(); } catch { loading.textContent = '3D is unavailable — use the accessible history below.'; } }
  function refresh() { if (renderer) { cancelAnimationFrame(raf); build(); render(); } }
  enter?.addEventListener('click', () => { enter.textContent = 'LAB OPEN'; hint.classList.add('is-hidden'); });
  function updatePhysics() {
    appliedVoltage = Number(document.getElementById('le-voltage')?.value || 0);
    powered = appliedVoltage > 0;
    if (appliedVoltage >= 124) failed = true;
    const output = document.getElementById('le-voltage-out');
    if (output) output.textContent = `${appliedVoltage} V`;
    const physics = document.getElementById('le-physics-status');
    if (physics) physics.textContent = failed ? 'SIMULATION · FILAMENT FAILED' : `SIMULATION · ${powered ? `POWER ${appliedVoltage} V · P ≈ ${(appliedVoltage * appliedVoltage / 140).toFixed(1)} W` : 'POWER OFF'}`;
    if (power) power.textContent = powered ? 'POWER ON' : 'POWER OFF';
    refresh();
  }
  power?.addEventListener('click', () => { const slider = document.getElementById('le-voltage'); if (failed) return; const next = powered ? 0 : 110; if (slider) slider.value = String(next); updatePhysics(); });
  document.getElementById('le-voltage')?.addEventListener('input', updatePhysics);
  document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => {
    mode = button.dataset.mode;
    if (mode === 'build') {
      buildStep = (buildStep + 1) % 7;
      const step = BUILD_STEPS[buildStep];
      const label = document.getElementById('le-build-status');
      if (label) label.textContent = `STEP ${String(buildStep + 1).padStart(2, '0')} · ${step[0]} · ${step[1]}`;
    }
    document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b === button)); refresh();
  }));
  document.getElementById('le-reset')?.addEventListener('click', () => { appliedVoltage = 0; powered = false; failed = false; buildStep = 0; vacuumState = 'open'; demonstration = false; const vacuumButton = document.getElementById('le-vacuum'); if (vacuumButton) vacuumButton.textContent = 'VACUUM PUMP'; const vacuumLabel = document.getElementById('le-vacuum-status'); if (vacuumLabel) vacuumLabel.textContent = 'VACUUM · OPEN TO ATMOSPHERE'; const demoButton = document.getElementById('le-demonstration'); if (demoButton) demoButton.textContent = '31 DEC 1879'; const eventLabel = document.getElementById('le-event-status'); if (eventLabel) eventLabel.textContent = 'MENLO PARK · LABORATORY BENCH'; const slider = document.getElementById('le-voltage'); if (slider) slider.value = '0'; mode = 'assembly'; document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === 'assembly')); updatePhysics(); });
  document.getElementById('le-vacuum')?.addEventListener('click', () => {
    vacuumState = vacuumState === 'open' ? 'pumping' : vacuumState === 'pumping' ? 'sealed' : 'open';
    const labels = { open: 'VACUUM · OPEN TO ATMOSPHERE', pumping: 'VACUUM · PUMPING AIR OUT…', sealed: 'VACUUM · SEALED FOR LIFE TEST' };
    const label = document.getElementById('le-vacuum-status'); if (label) label.textContent = labels[vacuumState];
    const button = document.getElementById('le-vacuum'); if (button) button.textContent = vacuumState === 'sealed' ? 'REOPEN TIP' : vacuumState === 'pumping' ? 'SEAL TIP' : 'VACUUM PUMP';
    refresh();
  });
  document.getElementById('le-demonstration')?.addEventListener('click', () => {
    demonstration = !demonstration;
    const label = document.getElementById('le-event-status');
    if (label) label.textContent = demonstration ? 'MENLO PARK · 31 DEC 1879 · DEMONSTRATION' : 'MENLO PARK · LABORATORY BENCH';
    const button = document.getElementById('le-demonstration'); if (button) button.textContent = demonstration ? 'RETURN TO LAB' : '31 DEC 1879';
    refresh();
  });
  document.getElementById('le-history')?.addEventListener('click', () => openPanel(history));
  document.getElementById('le-history-close')?.addEventListener('click', () => { history.hidden = true; });
  document.getElementById('le-close')?.addEventListener('click', () => { inspector.hidden = true; });
  document.getElementById('le-isolate')?.addEventListener('click', () => { Object.entries(components).forEach(([key, object]) => { if (key !== 'filament') object.visible = false; }); });
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); hint.classList.add('is-hidden'); });
  canvas.addEventListener('pointermove', (e) => { if (!drag) return; yaw += (e.clientX - drag.x) * .008; pitch = Math.max(-.8, Math.min(.8, pitch + (e.clientY - drag.y) * .008)); drag = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.max(4.5, Math.min(12, zoom + e.deltaY * .01)); }, { passive: false });
  canvas.addEventListener('click', (e) => { if (!renderer || !camera || !lamp) return; const rect = canvas.getBoundingClientRect(); const pointer = new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1); const ray = new THREE.Raycaster(); ray.setFromCamera(pointer, camera); const hit = ray.intersectObjects(lamp.children, true)[0]; if (!hit) return; const name = hit.object.userData.name || hit.object.name || 'Lamp component'; document.getElementById('le-inspector-title').textContent = name === 'filament' ? 'Carbon filament' : name[0].toUpperCase() + name.slice(1); document.getElementById('le-inspector-copy').textContent = name === 'filament' ? 'Carbonized cotton thread. It becomes incandescent when current passes through its resistance.' : 'A historically grounded component in the reconstructed 1879 demonstration lamp.'; openPanel(inspector); });
  document.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'r') { yaw = .35; pitch = .15; zoom = 7; } if (e.key === 'Escape') { if (inspector) inspector.hidden = true; if (history) history.hidden = true; } });
  load();
})();
