import * as THREE from 'three';
import { EDISON_1879_COMPONENTS } from '../data/lampComponents';
import { MANUFACTURING_STEPS } from '../data/manufacturingSteps';

export type LampViewMode =
  | 'assembly'
  | 'cutaway'
  | 'exploded'
  | 'xray'
  | 'manufacturing'
  | 'vacuum'
  | 'experiment';

export interface ElectricalState {
  isPowered: boolean;
  voltage: number; // 0 to 130 V
  resistance: number; // Ω (cold ~113 Ω, hot ~140 Ω)
  current: number; // A
  power: number; // W
  temperature: number; // K
  candlepower: number; // cd
  lumens: number; // lm
  isFailed: boolean;
  statusText: string;
}

export interface Lamp3DCallbacks {
  onSelectComponent?: (componentId: string | null) => void;
  onElectricalUpdate?: (state: ElectricalState) => void;
  onManufacturingStepChange?: (step: number) => void;
  onModeChange?: (mode: LampViewMode) => void;
}

export class Edison1879LampScene {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private lampRoot: THREE.Group;
  private componentMeshes: Map<string, THREE.Object3D> = new Map();
  private originalPositions: Map<string, THREE.Vector3> = new Map();

  // Materials
  private glassEnvelopeMat!: THREE.MeshPhysicalMaterial;
  private glassStemMat!: THREE.MeshPhysicalMaterial;
  private carbonFilamentMat!: THREE.MeshStandardMaterial;
  private platinumMat!: THREE.MeshStandardMaterial;
  private copperMat!: THREE.MeshStandardMaterial;
  private woodCollarMat!: THREE.MeshStandardMaterial;
  private brassContactMat!: THREE.MeshStandardMaterial;

  // Lighting
  private ambientLight!: THREE.AmbientLight;
  private keyLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private bulbPointLight!: THREE.PointLight;
  private tableMesh!: THREE.Mesh;

  // State
  private currentMode: LampViewMode = 'assembly';
  private selectedComponentId: string | null = null;
  private isolatedComponentId: string | null = null;
  private manufacturingStep = 8;
  private animationFrameId: number | null = null;
  private isDestroyed = false;

  // Electrical Simulation
  private electricalState: ElectricalState = {
    isPowered: true,
    voltage: 110,
    resistance: 140,
    current: 0.786,
    power: 86.4,
    temperature: 2100,
    candlepower: 16,
    lumens: 180,
    isFailed: false,
    statusText: 'Optimal Incandescence (Nominal 110V)',
  };

  // Vacuum animation state
  private vacuumProgress = 1.0;
  private vacuumParticles: THREE.Points | null = null;

  // Interaction / Orbit
  private isPointerDown = false;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private targetRotationX = 0.15;
  private targetRotationY = -0.45;
  private currentRotationX = 0.15;
  private currentRotationY = -0.45;
  private targetDistance = 7.5;
  private currentDistance = 7.5;
  private cameraTarget = new THREE.Vector3(0, 0.4, 0);

  // Exploded interpolation
  private explodedProgress = 0;
  private targetExplodedProgress = 0;

  // Callbacks
  private callbacks: Lamp3DCallbacks;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor(container: HTMLElement, canvas: HTMLCanvasElement, callbacks: Lamp3DCallbacks = {}) {
    this.container = container;
    this.canvas = canvas;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    // Warm light daylight lab background
    this.scene.background = new THREE.Color(0xf6f8fa);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.lampRoot = new THREE.Group();
    this.scene.add(this.lampRoot);

    this.setupMaterials();
    this.setupLighting();
    this.setupEnvironment();
    this.buildEdison1879Model();
    this.setupVacuumParticles();
    this.setupEventListeners();

    this.updateElectricalSimulation();
    this.animate();
  }

  private setupMaterials(): void {
    // Highly authentic glass shader with transmission & clearcoat
    this.glassEnvelopeMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.32,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.92,
      ior: 1.52,
      thickness: 0.25,
      reflectivity: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.glassStemMat = new THREE.MeshPhysicalMaterial({
      color: 0xf0fdf4,
      transparent: true,
      opacity: 0.55,
      roughness: 0.12,
      metalness: 0.0,
      transmission: 0.8,
      ior: 1.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Emissive Carbon Filament
    this.carbonFilamentMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      emissive: new THREE.Color(0xff8c00),
      emissiveIntensity: 3.2,
      roughness: 0.65,
      metalness: 0.2,
    });

    // Platinum Metal (Gray-white high luster)
    this.platinumMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.92,
      roughness: 0.18,
    });

    // Copper Leads (Red-orange ductile metal)
    this.copperMat = new THREE.MeshStandardMaterial({
      color: 0xc2410c,
      metalness: 0.88,
      roughness: 0.25,
    });

    // Turned Hardwood Collar (Rich antique walnut/oak)
    this.woodCollarMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.7,
      metalness: 0.05,
    });

    // Dual Flat Brass Contact Plates
    this.brassContactMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.85,
      roughness: 0.3,
    });
  }

  private setupLighting(): void {
    // Soft daylight ambient
    this.ambientLight = new THREE.AmbientLight(0xf1f5f9, 1.2);
    this.scene.add(this.ambientLight);

    // Warm daylight sun key light
    this.keyLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    this.keyLight.position.set(6, 10, 6);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);

    // Soft sky fill light
    this.fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.9);
    this.fillLight.position.set(-6, 4, -4);
    this.scene.add(this.fillLight);

    // Filament physical point light
    this.bulbPointLight = new THREE.PointLight(0xff9900, 2.2, 12, 1.6);
    this.bulbPointLight.position.set(0, 1.3, 0);
    this.bulbPointLight.castShadow = true;
    this.scene.add(this.bulbPointLight);
  }

  private setupEnvironment(): void {
    // Light oak wooden laboratory workbench
    const tableGeo = new THREE.CylinderGeometry(8, 8, 0.4, 48);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0xe2d7c5,
      roughness: 0.8,
      metalness: 0.05,
    });
    this.tableMesh = new THREE.Mesh(tableGeo, tableMat);
    this.tableMesh.position.y = -2.8;
    this.tableMesh.receiveShadow = true;
    this.scene.add(this.tableMesh);

    // Historical laboratory wooden base stand holding the collar
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x452311,
      roughness: 0.65,
      metalness: 0.1,
    });
    const standBase = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.35, 32), standMat);
    standBase.position.y = -2.6;
    standBase.receiveShadow = true;
    this.scene.add(standBase);

    const standPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.6, 32), standMat);
    standPillar.position.y = -2.25;
    this.scene.add(standPillar);
  }

  /**
   * Constructs the historically accurate 1879 Edison Demonstration Lamp
   * (Smithsonian NMAH_704361: No screw base, top tip pip, collar contacts, horseshoe filament).
   */
  private buildEdison1879Model(): void {
    // 1. Glass Envelope (Pear/Droplet Shape)
    const envelopeGroup = new THREE.Group();
    envelopeGroup.name = 'envelope';

    const envelopeGeo = new THREE.SphereGeometry(1.55, 36, 36);
    const pos = envelopeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < 0.3) {
        // Taper bottom towards neck
        const factor = Math.max(0.45, 1.0 + (y - 0.3) * 0.35);
        pos.setX(i, pos.getX(i) * factor);
        pos.setZ(i, pos.getZ(i) * factor);
      }
    }
    envelopeGeo.computeVertexNormals();
    const envelopeMesh = new THREE.Mesh(envelopeGeo, this.glassEnvelopeMat);
    envelopeMesh.position.y = 0.85;
    envelopeMesh.castShadow = false;
    envelopeMesh.receiveShadow = true;
    envelopeGroup.add(envelopeMesh);

    // Glass neck extension joining to stem
    const neckGeo = new THREE.CylinderGeometry(0.68, 0.72, 0.9, 32, 1, true);
    const neckMesh = new THREE.Mesh(neckGeo, this.glassEnvelopeMat);
    neckMesh.position.y = -0.4;
    envelopeGroup.add(neckMesh);

    this.registerComponent('envelope', envelopeGroup);

    // 2. Top Glass Tip (Exhaust Pip from Sprengel Pump Sealing)
    const tipGroup = new THREE.Group();
    tipGroup.name = 'tip';

    const tipConeGeo = new THREE.ConeGeometry(0.18, 0.45, 24);
    const tipConeMesh = new THREE.Mesh(tipConeGeo, this.glassEnvelopeMat);
    tipConeMesh.position.y = 2.45;
    tipGroup.add(tipConeMesh);

    const tipPipGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const tipPipMesh = new THREE.Mesh(tipPipGeo, this.glassEnvelopeMat);
    tipPipMesh.position.y = 2.7;
    tipGroup.add(tipPipMesh);

    this.registerComponent('tip', tipGroup);

    // 3. Glass Stem (Internal mount tube with flattened pinch seal)
    const stemGroup = new THREE.Group();
    stemGroup.name = 'stem';

    const stemTubeGeo = new THREE.CylinderGeometry(0.28, 0.45, 1.4, 24);
    const stemTubeMesh = new THREE.Mesh(stemTubeGeo, this.glassStemMat);
    stemTubeMesh.position.y = -0.35;
    stemGroup.add(stemTubeMesh);

    const pinchGeo = new THREE.BoxGeometry(0.6, 0.3, 0.16);
    const pinchMesh = new THREE.Mesh(pinchGeo, this.glassStemMat);
    pinchMesh.position.y = 0.35;
    stemGroup.add(pinchMesh);

    this.registerComponent('stem', stemGroup);

    // 4. Platinum Lead-in Wires (Sealed through glass pinch)
    const platinumLeadsGroup = new THREE.Group();
    platinumLeadsGroup.name = 'platinum-leads';

    const wireLeft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 1.1, 12),
      this.platinumMat,
    );
    wireLeft.position.set(-0.16, 0.35, 0);
    platinumLeadsGroup.add(wireLeft);

    const wireRight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 1.1, 12),
      this.platinumMat,
    );
    wireRight.position.set(0.16, 0.35, 0);
    platinumLeadsGroup.add(wireRight);

    this.registerComponent('platinum-leads', platinumLeadsGroup);

    // 5. Platinum Screw Clamps (Clamping carbon to metal leads)
    const clampsGroup = new THREE.Group();
    clampsGroup.name = 'clamps';

    const clampLeft = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.08), this.platinumMat);
    clampLeft.position.set(-0.16, 0.9, 0);
    clampsGroup.add(clampLeft);

    const clampRight = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.08), this.platinumMat);
    clampRight.position.set(0.16, 0.9, 0);
    clampsGroup.add(clampRight);

    this.registerComponent('clamps', clampsGroup);

    // 6. Horseshoe Carbon Filament (Carbonized cotton thread / paper)
    const filamentGroup = new THREE.Group();
    filamentGroup.name = 'filament';

    const curvePoints: THREE.Vector3[] = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI;
      const x = -Math.cos(theta) * 0.22;
      const y = 0.95 + Math.sin(theta) * 0.65;
      const z = Math.sin(theta * 3) * 0.02;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }
    const filamentCurve = new THREE.CatmullRomCurve3(curvePoints);
    const filamentGeo = new THREE.TubeGeometry(filamentCurve, 40, 0.028, 10, false);
    const filamentMesh = new THREE.Mesh(filamentGeo, this.carbonFilamentMat);
    filamentGroup.add(filamentMesh);

    this.registerComponent('filament', filamentGroup);

    // 7. Copper Extension Leads
    const copperGroup = new THREE.Group();
    copperGroup.name = 'copper-leads';

    const copperLeft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.9, 12),
      this.copperMat,
    );
    copperLeft.position.set(-0.25, -0.9, 0);
    copperGroup.add(copperLeft);

    const copperRight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.9, 12),
      this.copperMat,
    );
    copperRight.position.set(0.25, -0.9, 0);
    copperGroup.add(copperRight);

    this.registerComponent('copper-leads', copperGroup);

    // 8. Wooden / Plaster Mounting Collar (Historical neck collar, NOT a screw base!)
    const collarGroup = new THREE.Group();
    collarGroup.name = 'collar';

    const collarCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.82, 0.85, 32),
      this.woodCollarMat,
    );
    collarCyl.position.y = -1.25;
    collarCyl.castShadow = true;
    collarGroup.add(collarCyl);

    const collarRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.07, 12, 32),
      this.woodCollarMat,
    );
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.y = -0.88;
    collarGroup.add(collarRing);

    this.registerComponent('collar', collarGroup);

    // 9. Dual Brass Collar Contact Plates (No screw threads!)
    const contactsGroup = new THREE.Group();
    contactsGroup.name = 'contacts';

    const plateGeo = new THREE.BoxGeometry(0.12, 0.45, 0.35);
    const plateLeft = new THREE.Mesh(plateGeo, this.brassContactMat);
    plateLeft.position.set(-0.8, -1.25, 0);
    contactsGroup.add(plateLeft);

    const plateRight = new THREE.Mesh(plateGeo, this.brassContactMat);
    plateRight.position.set(0.8, -1.25, 0);
    contactsGroup.add(plateRight);

    this.registerComponent('contacts', contactsGroup);
  }

  private registerComponent(id: string, group: THREE.Object3D): void {
    group.userData = { componentId: id };
    this.componentMeshes.set(id, group);
    this.originalPositions.set(id, group.position.clone());
    this.lampRoot.add(group);
  }

  private setupVacuumParticles(): void {
    const particleCount = 140;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const r = Math.random() * 1.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = 0.85 + r * Math.cos(phi) * 0.9;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.04,
      transparent: true,
      opacity: 0.0,
    });

    this.vacuumParticles = new THREE.Points(geometry, material);
    this.scene.add(this.vacuumParticles);
  }

  private setupEventListeners(): void {
    const el = this.canvas;

    el.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      this.pointerStartX = e.clientX;
      this.pointerStartY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (this.isPointerDown) {
        const dx = e.clientX - this.pointerStartX;
        const dy = e.clientY - this.pointerStartY;
        this.pointerStartX = e.clientX;
        this.pointerStartY = e.clientY;

        this.targetRotationY += dx * 0.008;
        this.targetRotationX = Math.max(-0.8, Math.min(0.8, this.targetRotationX + dy * 0.008));
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (this.isPointerDown) {
        this.isPointerDown = false;
        // Check for click / selection if movement was tiny
        const dx = Math.abs(e.clientX - this.pointerStartX);
        const dy = Math.abs(e.clientY - this.pointerStartY);
        if (dx < 5 && dy < 5) {
          this.handleRaycastClick(e);
        }
      }
    });

    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.targetDistance = Math.max(3.5, Math.min(14.0, this.targetDistance + e.deltaY * 0.006));
      },
      { passive: false },
    );

    window.addEventListener('resize', () => this.handleResize());
  }

  private handleRaycastClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.lampRoot.children, true);

    if (intersects.length > 0) {
      let current: THREE.Object3D | null = intersects[0].object;
      while (current && current !== this.lampRoot) {
        if (current.userData?.componentId) {
          this.selectComponent(current.userData.componentId);
          return;
        }
        current = current.parent;
      }
    } else {
      this.selectComponent(null);
    }
  }

  public selectComponent(componentId: string | null): void {
    this.selectedComponentId = componentId;
    if (this.callbacks.onSelectComponent) {
      this.callbacks.onSelectComponent(componentId);
    }
    this.updateMaterialHighlights();
  }

  public isolateComponent(componentId: string | null): void {
    this.isolatedComponentId = componentId;
    this.componentMeshes.forEach((mesh, id) => {
      if (!componentId) {
        mesh.visible = true;
      } else {
        mesh.visible = id === componentId;
      }
    });
  }

  public setMode(mode: LampViewMode): void {
    this.currentMode = mode;
    this.isolatedComponentId = null;

    if (mode === 'exploded') {
      this.targetExplodedProgress = 1.0;
    } else {
      this.targetExplodedProgress = 0.0;
    }

    if (mode === 'cutaway') {
      this.glassEnvelopeMat.opacity = 0.12;
      this.glassEnvelopeMat.roughness = 0.2;
      this.glassEnvelopeMat.depthWrite = false;
    } else if (mode === 'xray') {
      this.glassEnvelopeMat.opacity = 0.08;
      this.glassEnvelopeMat.color.setHex(0x38bdf8);
      this.carbonFilamentMat.emissive.setHex(0x00ffff);
      this.carbonFilamentMat.emissiveIntensity = 4.0;
    } else {
      this.glassEnvelopeMat.opacity = 0.32;
      this.glassEnvelopeMat.color.setHex(0xffffff);
      this.updateFilamentMaterial();
    }

    if (mode === 'vacuum') {
      this.vacuumProgress = 0.0;
      if (this.vacuumParticles) {
        (this.vacuumParticles.material as THREE.PointsMaterial).opacity = 0.75;
      }
    } else if (this.vacuumParticles) {
      (this.vacuumParticles.material as THREE.PointsMaterial).opacity = 0.0;
    }

    if (mode === 'manufacturing') {
      this.setManufacturingStep(this.manufacturingStep);
    } else {
      this.componentMeshes.forEach((mesh) => {
        mesh.visible = true;
      });
    }

    if (this.callbacks.onModeChange) {
      this.callbacks.onModeChange(mode);
    }
  }

  public setManufacturingStep(step: number): void {
    this.manufacturingStep = Math.max(1, Math.min(8, step));
    const stepConfig = MANUFACTURING_STEPS[this.manufacturingStep - 1];

    this.componentMeshes.forEach((mesh, id) => {
      mesh.visible = stepConfig.visibleComponents.includes(id);
    });

    this.selectComponent(stepConfig.focusPartId);

    if (this.callbacks.onManufacturingStepChange) {
      this.callbacks.onManufacturingStepChange(this.manufacturingStep);
    }
  }

  public setVoltage(voltage: number): void {
    this.electricalState.voltage = Math.max(0, Math.min(130, voltage));
    this.updateElectricalSimulation();
  }

  public togglePower(): void {
    this.electricalState.isPowered = !this.electricalState.isPowered;
    this.updateElectricalSimulation();
  }

  public resetExperiment(): void {
    this.electricalState.isFailed = false;
    this.electricalState.isPowered = true;
    this.electricalState.voltage = 110;
    this.updateElectricalSimulation();
  }

  private updateElectricalSimulation(): void {
    const { isPowered, voltage, isFailed } = this.electricalState;

    if (isFailed || !isPowered || voltage === 0) {
      this.electricalState.current = 0;
      this.electricalState.power = 0;
      this.electricalState.resistance = 113; // Cold resistance
      this.electricalState.temperature = 295; // Room temp K
      this.electricalState.candlepower = 0;
      this.electricalState.lumens = 0;
      this.electricalState.statusText = isFailed
        ? 'FILAMENT FAILED (THERMAL OVERLOAD BURNOUT)'
        : 'POWER OFF (Cold Resistance: 113 Ω)';
    } else {
      // Deterministic documented historical model: 113 Ω cold -> ~140 Ω hot at 110V
      const vRatio = voltage / 110;
      const r = 113 + 27 * vRatio ** 0.85;
      const current = voltage / r;
      const power = voltage * current;
      const temp = 295 + 1805 * vRatio ** 1.4;
      const candlepower = Math.max(0, vRatio ** 3.5 * 16);
      const lumens = candlepower * 12.57;

      // Overload check (> 125 V causes burnout)
      if (voltage >= 125) {
        this.electricalState.isFailed = true;
        this.electricalState.statusText = 'FILAMENT BURNED OUT (Voltage Exceeded Limit)';
      } else {
        this.electricalState.resistance = Math.round(r * 10) / 10;
        this.electricalState.current = Math.round(current * 1000) / 1000;
        this.electricalState.power = Math.round(power * 10) / 10;
        this.electricalState.temperature = Math.round(temp);
        this.electricalState.candlepower = Math.round(candlepower * 10) / 10;
        this.electricalState.lumens = Math.round(lumens);
        this.electricalState.statusText =
          voltage === 110
            ? 'Optimal Incandescence (Documented 140 Ω / 16 cp)'
            : `Operating at ${voltage}V (Hot Resistance: ${this.electricalState.resistance} Ω)`;
      }
    }

    this.updateFilamentMaterial();

    if (this.callbacks.onElectricalUpdate) {
      this.callbacks.onElectricalUpdate({ ...this.electricalState });
    }
  }

  private updateFilamentMaterial(): void {
    if (this.currentMode === 'xray') return;

    const { isPowered, isFailed, voltage } = this.electricalState;

    if (isFailed) {
      this.carbonFilamentMat.emissive.setHex(0x000000);
      this.carbonFilamentMat.emissiveIntensity = 0;
      this.bulbPointLight.intensity = 0;
      return;
    }

    if (!isPowered || voltage === 0) {
      this.carbonFilamentMat.emissive.setHex(0x000000);
      this.carbonFilamentMat.emissiveIntensity = 0;
      this.bulbPointLight.intensity = 0;
      return;
    }

    const vNorm = voltage / 110;
    // Heating transition: dark -> cherry red -> amber orange -> incandescent yellow-white
    const r = Math.min(1.0, 0.4 + vNorm * 0.6);
    const g = Math.min(1.0, Math.max(0, (vNorm - 0.2) * 0.85));
    const b = Math.min(1.0, Math.max(0, (vNorm - 0.7) * 0.6));

    const emissiveColor = new THREE.Color(r, g, b);
    const intensity = Math.min(5.5, vNorm ** 2.2 * 3.5);

    this.carbonFilamentMat.emissive.copy(emissiveColor);
    this.carbonFilamentMat.emissiveIntensity = intensity;

    this.bulbPointLight.color.copy(emissiveColor);
    this.bulbPointLight.intensity = intensity * 0.8;
  }

  private updateMaterialHighlights(): void {
    this.componentMeshes.forEach((group, id) => {
      const isSelected = this.selectedComponentId === id;
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (isSelected) {
            // Apply subtle selection glow or tone
            if ('emissive' in child.material && child.material !== this.carbonFilamentMat) {
              (child.material as THREE.MeshStandardMaterial).emissive.setHex(0x0284c7);
              (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.45;
            }
          } else {
            if ('emissive' in child.material && child.material !== this.carbonFilamentMat) {
              (child.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
              (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
            }
          }
        }
      });
    });
  }

  public resetCamera(): void {
    this.targetRotationX = 0.15;
    this.targetRotationY = -0.45;
    this.targetDistance = 7.5;
    this.cameraTarget.set(0, 0.4, 0);
  }

  private updateCameraPosition(): void {
    const x =
      this.currentDistance * Math.sin(this.currentRotationY) * Math.cos(this.currentRotationX);
    const y = this.currentDistance * Math.sin(this.currentRotationX) + this.cameraTarget.y;
    const z =
      this.currentDistance * Math.cos(this.currentRotationY) * Math.cos(this.currentRotationX);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private animate = (): void => {
    if (this.isDestroyed) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    // Smooth camera orbit damping
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.08;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.08;
    this.currentDistance += (this.targetDistance - this.currentDistance) * 0.08;
    this.updateCameraPosition();

    // Smooth exploded animation
    this.explodedProgress += (this.targetExplodedProgress - this.explodedProgress) * 0.08;
    if (
      Math.abs(this.targetExplodedProgress - this.explodedProgress) > 0.001 ||
      this.explodedProgress > 0.001
    ) {
      this.componentMeshes.forEach((mesh, id) => {
        const comp = EDISON_1879_COMPONENTS[id];
        const orig = this.originalPositions.get(id) || new THREE.Vector3();
        if (comp) {
          mesh.position.set(
            orig.x + comp.explodedOffset[0] * this.explodedProgress,
            orig.y + comp.explodedOffset[1] * this.explodedProgress,
            orig.z + comp.explodedOffset[2] * this.explodedProgress,
          );
        }
      });
    }

    // Vacuum particle evacuation animation
    if (this.currentMode === 'vacuum' && this.vacuumParticles) {
      this.vacuumProgress = Math.min(1.0, this.vacuumProgress + 0.006);
      const mat = this.vacuumParticles.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0.0, 0.75 * (1.0 - this.vacuumProgress));
    }

    this.renderer.render(this.scene, this.camera);
  };

  public handleResize(): void {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.renderer.dispose();
  }
}
