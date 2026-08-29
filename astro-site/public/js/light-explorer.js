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
    const back = new THREE.Mesh(new THREE.BoxGeometry(13, 6, .2), makeMat('#d7c6ad')); back.position.set(0, .5, -2.9); scene.add(back);
    lamp = new THREE.Group(); lamp.position.y = -.25; scene.add(lamp);
    components.envelope = new THREE.Mesh(new THREE.SphereGeometry(1.48, 64, 32), makeMat('#dff4ff', { transparent: true, opacity: mode === 'xray' ? .16 : mode === 'cutaway' ? .28 : .34, transmission: .25, roughness: .08, side: THREE.DoubleSide })); components.envelope.scale.y = 1.08; components.envelope.position.y = .85; lamp.add(components.envelope);
    components.tip = new THREE.Mesh(new THREE.ConeGeometry(.18, .5, 32), makeMat('#d8edf0', { transparent: true, opacity: .55 })); components.tip.position.y = 2.47; lamp.add(components.tip);
    components.stem = cyl(.11, 1.8, makeMat('#e9f8f5', { transparent: true, opacity: .65 }), -.45); lamp.add(components.stem);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-.58, .25, 0), new THREE.Vector3(-.58, .8, 0), new THREE.Vector3(.58, .8, 0), new THREE.Vector3(.58, .25, 0)]);
    filament = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, .045, 12), makeMat('#a84222', { emissive: '#321008', emissiveIntensity: powered ? 3 : .1 })); filament.name = 'CarbonFilament'; components.filament = filament; lamp.add(filament);
    components.platinum = new THREE.Group(); for (const x of [-.58, .58]) { const clamp = cyl(.055, .85, makeMat('#c7ccd0', { metalness: .8 }), .12); clamp.position.x = x; clamp.rotation.z = .2 * Math.sign(x); components.platinum.add(clamp); } lamp.add(components.platinum);
    components.plates = new THREE.Group(); for (const x of [-.48, .48]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.18, .65, .7), makeMat('#b8783e', { metalness: .65 })); p.position.set(x, -1.35, 0); components.plates.add(p); } lamp.add(components.plates);
    components.contacts = cyl(.9, .12, makeMat('#b8783e', { metalness: .7 }), -1.72); lamp.add(components.contacts);
    if (mode === 'disassemble') { components.envelope.position.y += 1.4; components.tip.position.y += 2; components.platinum.position.y -= .3; components.plates.position.y -= .35; components.contacts.position.y -= .55; }
    for (const [name, object] of Object.entries(components)) { object.userData = { name }; }
  }
  function render() { if (!renderer || !scene) return; camera.position.set(Math.sin(yaw) * zoom, Math.sin(pitch) * zoom * .45, Math.cos(yaw) * zoom); camera.lookAt(0, .15, 0); renderer.render(scene, camera); if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) raf = requestAnimationFrame(render); }
  function resize() { if (!renderer) return; const r = canvas.getBoundingClientRect(); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(r.height, 1); camera.updateProjectionMatrix(); }
  function start() { if (!THREE) return; if (!renderer) { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.outputColorSpace = THREE.SRGBColorSpace; window.addEventListener('resize', resize); } build(); resize(); loading.hidden = true; render(); }
  async function load() { try { THREE = await import('three'); start(); } catch { loading.textContent = '3D is unavailable — use the accessible history below.'; } }
  function refresh() { if (renderer) { cancelAnimationFrame(raf); build(); render(); } }
  enter?.addEventListener('click', () => { enter.textContent = 'LAB OPEN'; hint.classList.add('is-hidden'); });
  power?.addEventListener('click', () => { powered = !powered; power.textContent = powered ? 'POWER ON' : 'POWER OFF'; refresh(); });
  document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => { mode = button.dataset.mode; document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b === button)); refresh(); }));
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
