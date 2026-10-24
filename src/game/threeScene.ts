import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  MechanicalFailure,
  RaiderEnemy,
  SalvageNode,
  VehicleStats,
  VehicleUpgrades,
  CyberwareItem,
  HackingTarget,
  WeatherType,
  SceneObstacle,
} from '../types/game';
import { getTerrainHeight, TerrainChunkManager } from './proceduralTerrain';
import { audioEngine } from '../audio/audioEngine';
import { CITIES, INITIAL_HACKING_TARGETS } from '../data/gameContent';

export interface StoryInteractionTarget {
  id: string;
  label: string;
  action: string;
  distMeters: number;
}

export interface SceneCallbacks {
  onCollectSalvage: (salvage: SalvageNode, isOnFoot?: boolean) => void;
  onCollectTechCore?: (salvage: SalvageNode) => void;
  onOutOfFuel?: () => void;
  onSynthesizeFuel?: () => void;
  onDefeatEnemy: (enemy: RaiderEnemy) => void;
  onCityArrival: (cityIndex: number) => void;
  onVehicleDamage: (amount: number, reason: string) => void;
  onUpdateStats: (update: Partial<VehicleStats>) => void;
  onTogglePlayerMode: (isOnFoot: boolean) => void;
  onTriggerHacking: (target: HackingTarget) => void;
  onToggleScanner: (active: boolean) => void;
  onOpenDashboard?: () => void;
  onDestinationArrivedArea?: (cityIndex: number, cityName: string) => void;
  onWeatherChange?: (weather: WeatherType) => void;
  onIonVortexAbsorbed?: () => void;
  onAcidShieldToggle?: (active: boolean) => void;
  onAcidRainShieldStatus?: (status: 'protected' | 'moving_warning' | 'no_shield' | 'out_of_battery' | 'on_foot_danger') => void;
  onTriggerStoryInteraction?: (target: StoryInteractionTarget) => void;
}

export type CameraViewMode = 'chase' | 'cockpit' | 'cinematic';

export interface WorldCityMarker {
  cityIndex: number;
  name: string;
  x: number;
  z: number;
  mesh: THREE.Group;
}

export interface NearestCityInfo {
  name: string;
  distanceKm: number;
  relativeBearingDeg: number;
  directionHint: string;
  cardinal: string;
}

export class CyberpunkRoadScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private callbacks: SceneCallbacks;

  private isSoftwareGl = false;
  private animationFrameId: number = 0;
  private clock = new THREE.Clock();

  // Mode: In Vehicle vs. On Foot
  private isOnFoot = false;
  private isPaused = false;
  private lastStepPhase = 0;

  // 1. Rover Vehicle Physics
  private roverGroup = new THREE.Group();
  private proceduralChassisGroup = new THREE.Group();
  private customRoverModel: THREE.Object3D | null = null;
  private wheels: THREE.Mesh[] = [];
  private frontWheelPivots: THREE.Group[] = [];
  private turretGroup = new THREE.Group();
  private headlights: THREE.SpotLight[] = [];
  private taillights: THREE.Mesh[] = [];
  private boostFlames: THREE.Mesh[] = [];
  private isAcidShieldActive = false;
  private roverAcidShieldMesh: THREE.Mesh | null = null;

  // Rover Kinematics with Drift & Air-Time Jumps
  private roverX = 0;
  private roverZ = 0;
  private roverY = 0;
  private roverVelY = 0;
  private isRoverInAir = false;

  private roverHeading = 0;
  private roverSpeed = 0;
  private roverTargetSpeed = 0;
  private roverSteerAngle = 0;
  private roverPitch = 0;
  private roverRoll = 0;
  private roverDriftAngle = 0;
  private suspensionBounce = 0;
  private isBoosting = false;
  private boostSoundTriggered = false;

  // 2. Articulated On-Foot Nomad Player
  private playerGroup = new THREE.Group();
  private proceduralPlayerBody = new THREE.Group();
  private customPlayerModel: THREE.Object3D | null = null;
  private customPlayerMixer: THREE.AnimationMixer | null = null;
  private customSalvageTemplate: THREE.Object3D | null = null;
  private customEnemyTemplate: THREE.Object3D | null = null;
  private playerTorso: THREE.Mesh | null = null;
  private playerThighL: THREE.Group | null = null;
  private playerThighR: THREE.Group | null = null;
  private playerShinL: THREE.Mesh | null = null;
  private playerShinR: THREE.Mesh | null = null;
  private playerArmL: THREE.Mesh | null = null;
  private playerArmR: THREE.Mesh | null = null;

  private playerX = 3.5;
  private playerZ = 0;
  private playerY = 0;
  private playerVelX = 0;
  private playerVelZ = 0;
  private playerVelY = 0;
  private playerHeading = 0;
  private playerWalkCycle = 0;
  private isGrounded = true;

  // Camera Yaw state to decouple camera from player heading (stops S-key inversion freakout!)
  private cameraYaw = 0;

  // 3. Infinite Terrain Manager
  private terrainManager: TerrainChunkManager;

  // 4. Megacity Destination Progress System
  private worldCities: WorldCityMarker[] = [];
  private activeDestinationIndex = 0; // Starts at City 0, then advances to 1, 2, 3...
  private cityArrivalCooldown = 0;

  // 5. Dynamic Entities & Structured POIs
  private salvageNodes3D: { data: SalvageNode; mesh: THREE.Group }[] = [];
  private enemies3D: { data: RaiderEnemy; mesh: THREE.Group; alertLight: THREE.PointLight }[] = [];
  private poiStructures: THREE.Group[] = [];
  private hackingTargets3D: { data: HackingTarget; mesh: THREE.Group; screenMesh: THREE.Mesh }[] = [];

  // 6. Cyber-Eye Scanner & Cyberware
  private isScannerActive = false;
  private cyberwareList: CyberwareItem[] = [];
  private autoHarvesterCooldown = 0;
  private lastStallWarnTime = 0;
  private proceduralSpawnTimer = 0;

  // 7. EMP Shockwave Ring
  private empWaveMesh: THREE.Mesh | null = null;
  private empWaveRadius = 0;
  private empWaveActive = false;

  // 8. Atmospheric Dust Motes
  private dustParticles: THREE.Points | null = null;

  // 9. Environment Obstacles & Solid Collisions
  private staticObstacles: SceneObstacle[] = [];
  private sparkParticles: THREE.Points | null = null;
  private sparkVelocities: Float32Array | null = null;
  private sparkLifetimes: Float32Array | null = null;
  private lastCollisionDamageTime = 0;
  private destinationApproached = false;

  // 10. Holographic Sky Billboards & Megacity Silhouettes
  private holographicBillboards: THREE.Mesh[] = [];
  private skyBeams: THREE.Mesh[] = [];
  private customBuildingTemplate: THREE.Object3D | null = null;
  private customBuildingInstances: THREE.Group[] = [];

  // Celestial 3D Skydome & Custom Sky Texture
  private skydomeMesh: THREE.Mesh | null = null;
  private skydomeMaterial: THREE.MeshBasicMaterial | null = null;
  private customSkyTextureLoaded = false;

  // 11. Hazardous Cyber-Weather System
  private currentWeather: WeatherType = 'neon_twilight';
  private weatherTimer = 0;
  private acidRainParticles: THREE.Points | null = null;
  private acidRainPositions: Float32Array | null = null;
  private acidRainVelocities: Float32Array | null = null;
  private auroraRibbon: THREE.Mesh | null = null;
  private lightningFlashTimer = 0;
  private lightningNextTime = 7;
  private acidCorrosionTimer = 0;
  private ionVortexes: Array<{ mesh: THREE.Group; rings: THREE.Mesh[]; x: number; z: number }> = [];
  private ionVortexCooldown = 0; // Long cooldown to keep vortexes extremely rare

  // Lighting References
  private sunLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;

  // Camera & Inputs
  private cameraMode: CameraViewMode = 'chase';
  private cameraShake = 0;
  private keysHeld: Record<string, boolean> = {};

  // External Game Stats
  private stats: VehicleStats;
  private upgrades: VehicleUpgrades;
  private failure: MechanicalFailure | null = null;
  private distanceToNextCity = 0.9;

  constructor(
    container: HTMLElement,
    initialStats: VehicleStats,
    initialUpgrades: VehicleUpgrades,
    callbacks: SceneCallbacks
  ) {
    this.container = container;
    this.stats = { ...initialStats };
    this.upgrades = { ...initialUpgrades };
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const fogColor = new THREE.Color(0x0a0d18);
    this.scene.background = fogColor;
    this.scene.fog = new THREE.FogExp2(fogColor, 0.007);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      950
    );
    this.camera.position.set(0, 10, -14);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.setupLighting();

    this.terrainManager = new TerrainChunkManager(this.scene);

    this.buildSciFiRover();
    this.buildPlayerCharacter();
    this.buildWorldCityLandmarks();
    this.buildHolographicSkyBillboards();
    this.buildMegacitySkyline();
    this.tryLoadCustomBuildingTemplate();
    this.buildSkydome();
    this.tryLoadCustomSkyTexture();
    this.tryLoadCustomSalvageTemplate();
    this.tryLoadCustomEnemyTemplate();
    this.setupWeatherAndParticles();
    this.buildCollisionSparksPool();
    this.buildEmpWaveRing();
    this.buildAtmosphericParticles();

    this.terrainManager.update(0, 0, this.isSoftwareGl);
    this.seedStructuredResourceLocations();

    this.bindInputs();
    window.addEventListener('resize', this.onWindowResize);

    this.tick();
  }

  // --- Lighting ---
  private setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 1.1);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfbbf24, 1.45);
    this.sunLight.position.set(50, 80, -40);
    if (!this.isSoftwareGl) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 1024;
      this.sunLight.shadow.mapSize.height = 1024;
      this.sunLight.shadow.camera.near = 1;
      this.sunLight.shadow.camera.far = 250;
      const d = 45;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0005;
      this.sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.sunLight);

    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.7);
    this.scene.add(ambientLight);
  }

  // --- High-Fidelity Sci-Fi 4x4 MULE Rover Model ---
  private buildSciFiRover() {
    this.roverGroup = new THREE.Group();
    this.proceduralChassisGroup = new THREE.Group();
    this.roverGroup.add(this.proceduralChassisGroup);

    // Advanced Cyberpunk Materials
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x181e2b,
      metalness: 0.9,
      roughness: 0.32,
    });
    const armorPlateMat = new THREE.MeshStandardMaterial({
      color: 0x222a3a,
      metalness: 0.85,
      roughness: 0.4,
    });
    const skidPlateMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.95,
      roughness: 0.25,
    });
    const rollcageMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Hazard Amber/Orange exoskeleton
      metalness: 0.65,
      roughness: 0.3,
    });
    const cyanAccentMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.5,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x071524,
      metalness: 0.2,
      roughness: 0.12,
      transparent: true,
      opacity: 0.78,
      clearcoat: 1.0,
      ior: 1.52,
    });
    const cockpitSeatMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.75,
      metalness: 0.2,
    });
    const dashScreenMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
    });
    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.94,
      metalness: 0.08,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.92,
      roughness: 0.22,
    });
    const beadlockMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.88,
      roughness: 0.3,
    });
    const shockSpringMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Racing Red suspension coil
      metalness: 0.85,
      roughness: 0.25,
    });
    const chromeDamperMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.98,
      roughness: 0.08,
    });
    const fuelCanisterMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.55,
      metalness: 0.45,
    });
    const cargoCaseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.6,
      metalness: 0.6,
    });
    const thrusterMat = new THREE.MeshStandardMaterial({
      color: 0x1f2430,
      metalness: 0.95,
      roughness: 0.25,
    });
    const thrusterCoreMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
    });

    // 1. Lower Armored Hull with Angled Rocker Panels
    const lowerHullGeom = new THREE.BoxGeometry(2.35, 0.75, 4.45);
    const lowerHull = new THREE.Mesh(lowerHullGeom, chassisMat);
    lowerHull.position.y = 0.98;
    lowerHull.castShadow = !this.isSoftwareGl;
    this.proceduralChassisGroup.add(lowerHull);

    // Heavy Ribbed Steel Underbody Skid Plate
    const skidGeom = new THREE.BoxGeometry(2.05, 0.12, 4.6);
    const skidPlate = new THREE.Mesh(skidGeom, skidPlateMat);
    skidPlate.position.set(0, 0.58, 0);
    this.proceduralChassisGroup.add(skidPlate);

    // Angled Front Bash Shield
    const bashGeom = new THREE.BoxGeometry(2.1, 0.4, 0.5);
    const bashShield = new THREE.Mesh(bashGeom, skidPlateMat);
    bashShield.position.set(0, 0.74, 2.3);
    bashShield.rotation.x = -0.55;
    this.proceduralChassisGroup.add(bashShield);

    // 2. Hood with Power Cowl & Heat Extraction Louvers
    const hoodGeom = new THREE.BoxGeometry(2.1, 0.25, 1.6);
    const hood = new THREE.Mesh(hoodGeom, armorPlateMat);
    hood.position.set(0, 1.42, 1.4);
    hood.rotation.x = -0.06;
    this.proceduralChassisGroup.add(hood);

    // Dual Raised Cowl Bulges on Hood
    [-0.55, 0.55].forEach((hx) => {
      const cowlGeom = new THREE.BoxGeometry(0.42, 0.12, 1.3);
      const cowl = new THREE.Mesh(cowlGeom, chassisMat);
      cowl.position.set(hx, 1.58, 1.4);
      cowl.rotation.x = -0.06;
      this.proceduralChassisGroup.add(cowl);
    });

    // Heat Extraction Vents (Glowing cyan heat sinks under slats)
    const ventGeom = new THREE.PlaneGeometry(0.7, 0.35);
    const ventMesh = new THREE.Mesh(ventGeom, cyanAccentMat);
    ventMesh.position.set(0, 1.54, 1.15);
    ventMesh.rotation.x = -Math.PI / 2;
    this.proceduralChassisGroup.add(ventMesh);

    // Glowing Neon Chassis Accent Stripes
    [-1.19, 1.19].forEach((sx) => {
      const stripeGeom = new THREE.BoxGeometry(0.04, 0.1, 3.8);
      const sideStripe = new THREE.Mesh(stripeGeom, cyanAccentMat);
      sideStripe.position.set(sx, 1.05, 0.1);
      this.proceduralChassisGroup.add(sideStripe);

      // Rock-Slider Protective Bar
      const rockSliderGeom = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8);
      rockSliderGeom.rotateX(Math.PI / 2);
      const rockSlider = new THREE.Mesh(rockSliderGeom, rollcageMat);
      rockSlider.position.set(sx > 0 ? 1.25 : -1.25, 0.65, 0);
      this.proceduralChassisGroup.add(rockSlider);
    });

    // 3. Cabin Shell & Ballistic Windshield
    const cabinGeom = new THREE.BoxGeometry(1.9, 0.85, 2.5);
    const cabin = new THREE.Mesh(cabinGeom, chassisMat);
    cabin.position.set(0, 1.75, -0.2);
    cabin.castShadow = !this.isSoftwareGl;
    this.proceduralChassisGroup.add(cabin);

    // Front Windshield (Angled Aero Viewport)
    const windshieldGeom = new THREE.BoxGeometry(1.78, 0.72, 0.75);
    const windshield = new THREE.Mesh(windshieldGeom, glassMat);
    windshield.position.set(0, 1.78, 0.98);
    windshield.rotation.x = -0.38;
    this.proceduralChassisGroup.add(windshield);

    // Side Viewport Glass
    [-0.96, 0.96].forEach((gx) => {
      const sideGlassGeom = new THREE.BoxGeometry(0.04, 0.52, 1.8);
      const sideGlass = new THREE.Mesh(sideGlassGeom, glassMat);
      sideGlass.position.set(gx, 1.78, -0.2);
      this.proceduralChassisGroup.add(sideGlass);
    });

    // Rear Windshield
    const rearGlassGeom = new THREE.BoxGeometry(1.68, 0.58, 0.2);
    const rearGlass = new THREE.Mesh(rearGlassGeom, glassMat);
    rearGlass.position.set(0, 1.78, -1.45);
    rearGlass.rotation.x = 0.25;
    this.proceduralChassisGroup.add(rearGlass);

    // --- COCKPIT INTERIOR DETAILS (Visible through glass) ---
    // Dual Racing Bucket Seats
    [-0.45, 0.45].forEach((sx) => {
      const seatBaseGeom = new THREE.BoxGeometry(0.48, 0.16, 0.5);
      const seatBase = new THREE.Mesh(seatBaseGeom, cockpitSeatMat);
      seatBase.position.set(sx, 1.48, 0.05);
      this.proceduralChassisGroup.add(seatBase);

      const seatBackGeom = new THREE.BoxGeometry(0.46, 0.62, 0.12);
      const seatBack = new THREE.Mesh(seatBackGeom, cockpitSeatMat);
      seatBack.position.set(sx, 1.82, -0.22);
      seatBack.rotation.x = -0.15;
      this.proceduralChassisGroup.add(seatBack);

      const headrestGeom = new THREE.BoxGeometry(0.26, 0.2, 0.1);
      const headrest = new THREE.Mesh(headrestGeom, rollcageMat);
      headrest.position.set(sx, 2.18, -0.28);
      this.proceduralChassisGroup.add(headrest);
    });

    // Cockpit Navigation Dashboard Display (Glows inside cabin)
    const dashGeom = new THREE.BoxGeometry(0.85, 0.24, 0.3);
    const dashMesh = new THREE.Mesh(dashGeom, chassisMat);
    dashMesh.position.set(-0.35, 1.62, 0.65);
    dashMesh.rotation.x = -0.3;
    this.proceduralChassisGroup.add(dashMesh);

    const hudScreenGeom = new THREE.PlaneGeometry(0.5, 0.2);
    const hudScreen = new THREE.Mesh(hudScreenGeom, dashScreenMat);
    hudScreen.position.set(-0.35, 1.68, 0.58);
    hudScreen.rotation.x = -0.35;
    hudScreen.rotation.y = Math.PI;
    this.proceduralChassisGroup.add(hudScreen);

    // 4. Rugged Tubular Roll-Cage & Bull-Bar Assembly
    const rollcageGroup = new THREE.Group();

    // A-Pillars, B-Pillars & Roof Rails
    [-0.95, 0.95].forEach((rx) => {
      // Main roof rail
      const railGeom = new THREE.CylinderGeometry(0.045, 0.045, 2.4, 8);
      railGeom.rotateX(Math.PI / 2);
      const rail = new THREE.Mesh(railGeom, rollcageMat);
      rail.position.set(rx, 2.22, -0.2);
      rollcageGroup.add(rail);

      // Front A-Pillar Down-tube
      const aPillarGeom = new THREE.CylinderGeometry(0.045, 0.045, 1.15, 8);
      aPillarGeom.rotateX(-0.48);
      const aPillar = new THREE.Mesh(aPillarGeom, rollcageMat);
      aPillar.position.set(rx, 1.82, 0.95);
      rollcageGroup.add(aPillar);

      // Rear C-Pillar Down-tube
      const cPillarGeom = new THREE.CylinderGeometry(0.045, 0.045, 1.05, 8);
      cPillarGeom.rotateX(0.38);
      const cPillar = new THREE.Mesh(cPillarGeom, rollcageMat);
      cPillar.position.set(rx, 1.82, -1.35);
      rollcageGroup.add(cPillar);
    });

    // Crossbars on Roof
    [-1.0, 0, 1.0].forEach((cz) => {
      const crossbarGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.9, 8);
      crossbarGeom.rotateZ(Math.PI / 2);
      const crossbar = new THREE.Mesh(crossbarGeom, rollcageMat);
      crossbar.position.set(0, 2.22, cz - 0.2);
      rollcageGroup.add(crossbar);
    });

    // Front Tubular Bull-Bar & Winch
    const bullbarGeom = new THREE.BoxGeometry(2.4, 0.65, 0.45);
    const bullbar = new THREE.Mesh(bullbarGeom, armorPlateMat);
    bullbar.position.set(0, 0.95, 2.35);
    bullbar.castShadow = !this.isSoftwareGl;
    rollcageGroup.add(bullbar);

    // Front Upper Guard Bar
    const guardBarGeom = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8);
    guardBarGeom.rotateZ(Math.PI / 2);
    const guardBar = new THREE.Mesh(guardBarGeom, rollcageMat);
    guardBar.position.set(0, 1.35, 2.45);
    rollcageGroup.add(guardBar);

    // Recovery Winch Spool in Center of Bumper
    const winchSpoolGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.55, 12);
    winchSpoolGeom.rotateZ(Math.PI / 2);
    const winchSpool = new THREE.Mesh(winchSpoolGeom, rimMat);
    winchSpool.position.set(0, 0.95, 2.58);
    rollcageGroup.add(winchSpool);

    // Winch Hook / Shackle
    const shackleGeom = new THREE.TorusGeometry(0.1, 0.03, 8, 12);
    const shackle = new THREE.Mesh(shackleGeom, rollcageMat);
    shackle.position.set(0, 0.95, 2.7);
    rollcageGroup.add(shackle);

    this.proceduralChassisGroup.add(rollcageGroup);

    // 5. Overland Expedition Roof Rack & Gear
    const rackGroup = new THREE.Group();
    rackGroup.position.set(0, 2.28, -0.3);

    // Roof Basket Mesh
    const basketGeom = new THREE.BoxGeometry(1.75, 0.12, 2.2);
    const basket = new THREE.Mesh(basketGeom, rimMat);
    rackGroup.add(basket);

    // Twin Expedition Jerry Cans (Fuel / Coolant pods)
    [-0.55, -0.2].forEach((jx) => {
      const canGeom = new THREE.BoxGeometry(0.28, 0.48, 0.4);
      const can = new THREE.Mesh(canGeom, fuelCanisterMat);
      can.position.set(jx, 0.3, -0.65);
      can.castShadow = !this.isSoftwareGl;
      rackGroup.add(can);
    });

    // Military Heavy Tactical Nanite Case
    const caseGeom = new THREE.BoxGeometry(0.7, 0.35, 0.55);
    const caseMesh = new THREE.Mesh(caseGeom, cargoCaseMat);
    caseMesh.position.set(0.35, 0.24, -0.6);
    caseMesh.castShadow = !this.isSoftwareGl;
    rackGroup.add(caseMesh);

    // Dual High-Efficiency Solar Photovoltaic Array
    const solarGeom = new THREE.BoxGeometry(1.5, 0.04, 1.15);
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x07111e,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      metalness: 0.95,
      roughness: 0.1,
    });
    const solarPanel = new THREE.Mesh(solarGeom, solarMat);
    solarPanel.position.set(0, 0.1, 0.4);
    rackGroup.add(solarPanel);

    // Long Flexible Whip Radio Antenna at Rear-Right Corner
    const whipGeom = new THREE.CylinderGeometry(0.015, 0.03, 2.2, 6);
    whipGeom.rotateX(-0.1);
    const whipAntenna = new THREE.Mesh(whipGeom, chromeDamperMat);
    whipAntenna.position.set(0.85, 1.15, -1.1);
    rackGroup.add(whipAntenna);

    const whipTipGeom = new THREE.SphereGeometry(0.06, 8, 8);
    const whipTipMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const whipTip = new THREE.Mesh(whipTipGeom, whipTipMat);
    whipTip.position.set(0.85, 2.25, -1.2);
    rackGroup.add(whipTip);

    this.proceduralChassisGroup.add(rackGroup);

    // 6. Turret Group (EMP Blaster on Roof Pedestal)
    this.turretGroup = new THREE.Group();
    this.turretGroup.position.set(-0.35, 2.38, 0.4);
    const turretBaseGeom = new THREE.CylinderGeometry(0.24, 0.28, 0.18, 12);
    const turretBase = new THREE.Mesh(turretBaseGeom, rimMat);
    this.turretGroup.add(turretBase);

    const turretBarrelGeom = new THREE.CylinderGeometry(0.08, 0.09, 0.65, 8);
    const turretBarrel = new THREE.Mesh(turretBarrelGeom, cyanAccentMat);
    turretBarrel.position.set(0, 0.14, 0.28);
    turretBarrel.rotation.x = Math.PI / 2;
    this.turretGroup.add(turretBarrel);
    this.proceduralChassisGroup.add(this.turretGroup);

    // 7. Rear Powertrain & Twin Jet Thruster Nacelles
    [-0.65, 0.65].forEach((tx) => {
      const nacelleGeom = new THREE.CylinderGeometry(0.26, 0.32, 0.85, 12);
      nacelleGeom.rotateX(Math.PI / 2);
      const nacelle = new THREE.Mesh(nacelleGeom, thrusterMat);
      nacelle.position.set(tx, 0.95, -2.35);
      this.proceduralChassisGroup.add(nacelle);

      const nozzleRingGeom = new THREE.TorusGeometry(0.26, 0.035, 8, 16);
      const nozzleRing = new THREE.Mesh(nozzleRingGeom, cyanAccentMat);
      nozzleRing.position.set(tx, 0.95, -2.78);
      this.proceduralChassisGroup.add(nozzleRing);

      const thrusterCoreGeom = new THREE.CircleGeometry(0.22, 12);
      const thrusterCore = new THREE.Mesh(thrusterCoreGeom, thrusterCoreMat);
      thrusterCore.position.set(tx, 0.95, -2.76);
      thrusterCore.rotation.y = Math.PI;
      this.proceduralChassisGroup.add(thrusterCore);
    });

    // 8. 4-Wheel Independent Heavy Off-Road Suspension & Deep Knobby Tires
    const wheelPositions = [
      { x: -1.35, y: 0.68, z: 1.45, isFront: true },
      { x: 1.35, y: 0.68, z: 1.45, isFront: true },
      { x: -1.35, y: 0.68, z: -1.45, isFront: false },
      { x: 1.35, y: 0.68, z: -1.45, isFront: false },
    ];

    this.wheels = [];
    this.frontWheelPivots = [];

    wheelPositions.forEach((pos) => {
      const pivot = new THREE.Group();
      pivot.position.set(pos.x, pos.y, pos.z);

      // Upper & Lower A-Arm Wishbone Assembly
      const armGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6);
      armGeom.rotateZ(pos.x > 0 ? -Math.PI / 3 : Math.PI / 3);
      const upperArm = new THREE.Mesh(armGeom, rimMat);
      upperArm.position.set(pos.x > 0 ? -0.32 : 0.32, 0.3, 0);
      pivot.add(upperArm);

      // Dual Coilover Shock Absorber with RED coiled spring
      const shockCoilGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.58, 10);
      const shockCoil = new THREE.Mesh(shockCoilGeom, shockSpringMat);
      shockCoil.position.set(pos.x > 0 ? -0.22 : 0.22, 0.35, 0);
      pivot.add(shockCoil);

      const damperRodGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8);
      const damperRod = new THREE.Mesh(damperRodGeom, chromeDamperMat);
      damperRod.position.set(pos.x > 0 ? -0.22 : 0.22, 0.35, 0);
      pivot.add(damperRod);

      // Main Knobby Off-Road Mud Tire
      const tireGeom = new THREE.CylinderGeometry(0.72, 0.72, 0.62, 20);
      tireGeom.rotateZ(Math.PI / 2);
      const wheelMesh = new THREE.Mesh(tireGeom, rubberMat);
      wheelMesh.castShadow = !this.isSoftwareGl;
      pivot.add(wheelMesh);

      // 16 3D Knobby Mud Lugs around Tire Tread Perimeter
      for (let t = 0; t < 16; t++) {
        const ang = (t / 16) * Math.PI * 2;
        const lugGeom = new THREE.BoxGeometry(0.58, 0.09, 0.14);
        const lug = new THREE.Mesh(lugGeom, rubberMat);
        lug.position.set(0, Math.sin(ang) * 0.72, Math.cos(ang) * 0.72);
        lug.rotation.x = -ang;
        wheelMesh.add(lug);
      }

      // Satin Alloy Wheel Hub Rim
      const hubGeom = new THREE.CylinderGeometry(0.44, 0.44, 0.64, 12);
      hubGeom.rotateZ(Math.PI / 2);
      const hub = new THREE.Mesh(hubGeom, rimMat);
      wheelMesh.add(hub);

      // Beadlock Outer Ring with Anodized Gold Studs
      const beadlockGeom = new THREE.TorusGeometry(0.42, 0.03, 8, 16);
      beadlockGeom.rotateY(Math.PI / 2);
      const beadlock = new THREE.Mesh(beadlockGeom, beadlockMat);
      beadlock.position.x = pos.x > 0 ? 0.32 : -0.32;
      wheelMesh.add(beadlock);

      // Glowing Cyan Hub Dynamo Ring
      const ringGeom = new THREE.TorusGeometry(0.24, 0.025, 8, 16);
      ringGeom.rotateY(Math.PI / 2);
      const ring = new THREE.Mesh(ringGeom, cyanAccentMat);
      ring.position.x = pos.x > 0 ? 0.33 : -0.33;
      wheelMesh.add(ring);

      this.wheels.push(wheelMesh);
      if (pos.isFront) {
        this.frontWheelPivots.push(pivot);
      }
      this.proceduralChassisGroup.add(pivot);
    });

    // 9. Quad High-Intensity Rally LED Projector Headlights
    const lightConeGeom = new THREE.ConeGeometry(0.9, 7.5, 12, 1, true);
    lightConeGeom.rotateX(-Math.PI / 2);
    const lightBeamMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    [-0.8, -0.3, 0.3, 0.8].forEach((xPos, idx) => {
      // Light Pod Housing
      const podGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.2, 10);
      podGeom.rotateX(Math.PI / 2);
      const podMesh = new THREE.Mesh(podGeom, rimMat);
      podMesh.position.set(xPos, 1.15, 2.5);
      this.proceduralChassisGroup.add(podMesh);

      const lensGeom = new THREE.CircleGeometry(0.12, 10);
      const lensMesh = new THREE.Mesh(lensGeom, cyanAccentMat);
      lensMesh.position.set(xPos, 1.15, 2.61);
      this.proceduralChassisGroup.add(lensMesh);

      // Spotlights (2 primary outer ones cast real light)
      if (idx === 0 || idx === 3) {
        const spot = new THREE.SpotLight(0xdbeafe, 3.2, 75, Math.PI / 4.5, 0.35, 1.2);
        spot.position.set(xPos, 1.15, 2.55);
        spot.target.position.set(xPos, 0, 30);
        this.roverGroup.add(spot);
        this.roverGroup.add(spot.target);
        this.headlights.push(spot);

        const beamMesh = new THREE.Mesh(lightConeGeom, lightBeamMat);
        beamMesh.position.set(xPos, 1.15, 6.2);
        this.roverGroup.add(beamMesh);
      }
    });

    // 10. Twin Wide Red LED Tail-light Lightbars
    [-0.82, 0.82].forEach((xPos) => {
      const tailGeom = new THREE.BoxGeometry(0.55, 0.12, 0.1);
      const tailMat = new THREE.MeshStandardMaterial({
        color: 0xff0033,
        emissive: 0xff0033,
        emissiveIntensity: 0.95,
      });
      const tail = new THREE.Mesh(tailGeom, tailMat);
      tail.position.set(xPos, 1.2, -2.25);
      this.roverGroup.add(tail);
      this.taillights.push(tail);
    });

    // 11. Twin Dynamic Cyber-Boost Thruster Flames
    const flameGeom = new THREE.ConeGeometry(0.24, 2.2, 10);
    flameGeom.rotateX(Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });

    [-0.65, 0.65].forEach((xPos) => {
      const flame = new THREE.Mesh(flameGeom, flameMat.clone());
      flame.position.set(xPos, 0.95, -3.8);
      this.roverGroup.add(flame);
      this.boostFlames.push(flame);
    });

    // 12. Realistic Ground Contact Shadow Plane
    const shadowGeom = new THREE.PlaneGeometry(3.8, 5.8);
    shadowGeom.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeom, shadowMat);
    contactShadow.position.y = 0.05;
    this.roverGroup.add(contactShadow);

    // 12. Protective Acid Rain Canopy Shield (Hemisphere Energy Dome)
    const shieldGeom = new THREE.SphereGeometry(3.6, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      wireframe: false,
    });
    this.roverAcidShieldMesh = new THREE.Mesh(shieldGeom, shieldMat);
    this.roverAcidShieldMesh.position.set(0, 0.4, 0.3);
    this.roverAcidShieldMesh.visible = false;

    // Outer hexagonal shimmer lattice
    const wireGeom = new THREE.SphereGeometry(3.64, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const wireMesh = new THREE.Mesh(wireGeom, wireMat);
    this.roverAcidShieldMesh.add(wireMesh);
    this.roverGroup.add(this.roverAcidShieldMesh);

    this.scene.add(this.roverGroup);
    this.tryLoadCustomRoverModel();
  }

  // --- Automatic Custom 3D Model Loader with Auto-Scaling & Centering ---
  private tryLoadCustomRoverModel(): void {
    const candidatePaths = [
      '/models/colony_rover.glb',
      '/models/colony-rover.glb',
      '/models/colony_rover/scene.gltf',
      '/models/rover.glb',
      '/models/custom_rover.glb',
    ];

    const loader = new GLTFLoader();

    const tryNext = (index: number) => {
      if (index >= candidatePaths.length) {
        console.info('[NEO DRIFT] No custom rover model found in public/models/. Using procedural chassis.');
        return;
      }

      const path = candidatePaths[index];
      loader.load(
        path,
        (gltf) => {
          console.log(`[NEO DRIFT] ✅ Custom rover model loaded successfully from ${path}!`);
          const model = gltf.scene;

          // Compute exact bounding dimensions
          const bbox = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const center = new THREE.Vector3();
          bbox.getCenter(center);

          // Center horizontally (X and Z)
          model.position.x -= center.x;
          model.position.z -= center.z;

          // Lift bottom of model to ground level
          model.position.y -= bbox.min.y;

          // Auto-scale to standard rover length (approx 4.8 units)
          const maxDim = Math.max(size.x, size.z);
          if (maxDim > 0) {
            const targetLength = 4.8;
            const scaleFactor = targetLength / maxDim;
            model.scale.setScalar(scaleFactor);
          }

          // Enable shadows and physical materials
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = !this.isSoftwareGl;
              child.receiveShadow = !this.isSoftwareGl;
            }
          });

          // Smoothly replace procedural chassis with custom model
          this.proceduralChassisGroup.visible = false;
          this.customRoverModel = model;
          this.roverGroup.add(model);
        },
        undefined,
        () => {
          // File not found at this candidate path, try next
          tryNext(index + 1);
        }
      );
    };

    tryNext(0);
  }

  // --- High-Detail Articulated Nomad Player Character ---
  private buildPlayerCharacter() {
    this.playerGroup = new THREE.Group();
    this.proceduralPlayerBody = new THREE.Group();
    this.playerGroup.add(this.proceduralPlayerBody);

    const dusterMat = new THREE.MeshStandardMaterial({
      color: 0x155e75, // Weathered scavenger teal/cyan
      roughness: 0.72,
      metalness: 0.18,
    });
    const armorVestMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.65,
    });
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.55,
    });
    const respiratorMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.7,
    });
    const filterMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4,
      metalness: 0.6,
    });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const wristScreenMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const harnessMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const packMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.75 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.92 });
    const kneePadMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const hazardMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });

    // 1. Torso, Tactical Duster Jacket & Armored Chestplate
    const torsoGeom = new THREE.BoxGeometry(0.72, 0.78, 0.44);
    this.playerTorso = new THREE.Mesh(torsoGeom, dusterMat);
    this.playerTorso.position.y = 1.35;
    this.playerTorso.castShadow = !this.isSoftwareGl;
    this.proceduralPlayerBody.add(this.playerTorso);

    // Ballistic Chest Armor Plate
    const chestPlateGeom = new THREE.BoxGeometry(0.56, 0.52, 0.12);
    const chestPlate = new THREE.Mesh(chestPlateGeom, armorVestMat);
    chestPlate.position.set(0, 0.04, 0.22);
    this.playerTorso.add(chestPlate);

    // Chest Status LED
    const chestLedGeom = new THREE.BoxGeometry(0.12, 0.04, 0.02);
    const chestLed = new THREE.Mesh(chestLedGeom, visorMat);
    chestLed.position.set(-0.16, 0.18, 0.29);
    this.playerTorso.add(chestLed);

    // Protective Standup Jacket Collar
    const collarGeom = new THREE.BoxGeometry(0.52, 0.2, 0.46);
    const collar = new THREE.Mesh(collarGeom, dusterMat);
    collar.position.set(0, 0.44, 0);
    this.playerTorso.add(collar);

    // Shoulder Pauldrons with Hazard Accent
    [-0.42, 0.42].forEach((px) => {
      const pauldronGeom = new THREE.BoxGeometry(0.24, 0.14, 0.34);
      const pauldron = new THREE.Mesh(pauldronGeom, armorVestMat);
      pauldron.position.set(px, 0.36, 0);
      pauldron.rotation.z = px > 0 ? -0.2 : 0.2;
      this.playerTorso?.add(pauldron);

      const stripGeom = new THREE.BoxGeometry(0.04, 0.15, 0.22);
      const strip = new THREE.Mesh(stripGeom, hazardMat);
      strip.position.set(px > 0 ? 0.12 : -0.12, 0, 0);
      pauldron.add(strip);
    });

    // 2. Head, Scavenger Helmet, Respirator & Cyan Cyber-Visor
    const headGeom = new THREE.BoxGeometry(0.38, 0.4, 0.38);
    const head = new THREE.Mesh(headGeom, helmetMat);
    head.position.y = 0.62;
    head.castShadow = !this.isSoftwareGl;
    this.playerTorso.add(head);

    // Tactical Multi-Lens AR Optical Visor (Glows with cybernetic HUD)
    const visorGeom = new THREE.BoxGeometry(0.4, 0.14, 0.16);
    const visor = new THREE.Mesh(visorGeom, visorMat);
    visor.position.set(0, 0.04, 0.18);
    head.add(visor);

    // Dual Micro-Cameras / Optical Sensors on visor rim
    [-0.14, 0.14].forEach((vx) => {
      const lensGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8);
      lensGeom.rotateX(Math.PI / 2);
      const lens = new THREE.Mesh(lensGeom, armorVestMat);
      lens.position.set(vx, 0.04, 0.27);
      head.add(lens);
    });

    // Half-Face Tactical Respirator / Rebreather Mask
    const maskGeom = new THREE.BoxGeometry(0.32, 0.18, 0.22);
    const mask = new THREE.Mesh(maskGeom, respiratorMat);
    mask.position.set(0, -0.12, 0.15);
    head.add(mask);

    // Twin Filtration Canisters on mask
    [-0.18, 0.18].forEach((fx) => {
      const filterGeom = new THREE.CylinderGeometry(0.065, 0.065, 0.12, 10);
      filterGeom.rotateZ(Math.PI / 2);
      const canister = new THREE.Mesh(filterGeom, filterMat);
      canister.position.set(fx, -0.12, 0.18);
      head.add(canister);
    });

    // Helmet Comms Antenna
    const antGeom = new THREE.CylinderGeometry(0.01, 0.015, 0.35, 6);
    const ant = new THREE.Mesh(antGeom, armorVestMat);
    ant.position.set(0.18, 0.28, -0.12);
    ant.rotation.z = -0.15;
    head.add(ant);

    // 3. Heavy Expedition Tactical Backpack
    const packGeom = new THREE.BoxGeometry(0.52, 0.62, 0.26);
    const pack = new THREE.Mesh(packGeom, packMat);
    pack.position.set(0, 0.02, -0.32);
    this.playerTorso.add(pack);

    // Lashed Cylindrical Bedroll / Tarp on top of pack
    const tarpGeom = new THREE.CylinderGeometry(0.11, 0.11, 0.54, 10);
    tarpGeom.rotateZ(Math.PI / 2);
    const tarp = new THREE.Mesh(tarpGeom, harnessMat);
    tarp.position.set(0, 0.36, -0.32);
    this.playerTorso.add(tarp);

    // Auxiliary Power Cell Canister on side of pack
    const pwrCellGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.45, 10);
    const pwrCell = new THREE.Mesh(pwrCellGeom, visorMat);
    pwrCell.position.set(0.28, 0, -0.3);
    this.playerTorso.add(pwrCell);

    // Tactical Utility Belt with Cargo Pouches
    const beltGeom = new THREE.BoxGeometry(0.74, 0.12, 0.46);
    const belt = new THREE.Mesh(beltGeom, harnessMat);
    belt.position.set(0, -0.38, 0);
    this.playerTorso.add(belt);

    [-0.26, 0.26].forEach((bx) => {
      const pouchGeom = new THREE.BoxGeometry(0.16, 0.18, 0.12);
      const pouch = new THREE.Mesh(pouchGeom, packMat);
      pouch.position.set(bx, -0.38, 0.25);
      this.playerTorso?.add(pouch);
    });

    // 4. Legs, Cargo Pants, Knee Armor & Combat Boots
    const thighGeom = new THREE.BoxGeometry(0.24, 0.48, 0.24);
    const shinGeom = new THREE.BoxGeometry(0.22, 0.48, 0.22);
    const bootSoleGeom = new THREE.BoxGeometry(0.24, 0.16, 0.36);

    // Left Leg
    this.playerThighL = new THREE.Group();
    this.playerThighL.position.set(-0.22, 0.95, 0);
    const thighMeshL = new THREE.Mesh(thighGeom, dusterMat);
    thighMeshL.position.y = -0.24;
    this.playerThighL.add(thighMeshL);

    // Left Knee Guard
    const kneeGuardL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.08), kneePadMat);
    kneeGuardL.position.set(0, -0.42, 0.13);
    this.playerThighL.add(kneeGuardL);

    this.playerShinL = new THREE.Mesh(shinGeom, bootMat);
    this.playerShinL.position.set(0, -0.48, 0);
    const bootSoleL = new THREE.Mesh(bootSoleGeom, bootMat);
    bootSoleL.position.set(0, -0.18, 0.06);
    this.playerShinL.add(bootSoleL);
    this.playerThighL.add(this.playerShinL);
    this.proceduralPlayerBody.add(this.playerThighL);

    // Right Leg
    this.playerThighR = new THREE.Group();
    this.playerThighR.position.set(0.22, 0.95, 0);
    const thighMeshR = new THREE.Mesh(thighGeom, dusterMat);
    thighMeshR.position.y = -0.24;
    this.playerThighR.add(thighMeshR);

    // Right Knee Guard
    const kneeGuardR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.08), kneePadMat);
    kneeGuardR.position.set(0, -0.42, 0.13);
    this.playerThighR.add(kneeGuardR);

    this.playerShinR = new THREE.Mesh(shinGeom, bootMat);
    this.playerShinR.position.set(0, -0.48, 0);
    const bootSoleR = new THREE.Mesh(bootSoleGeom, bootMat);
    bootSoleR.position.set(0, -0.18, 0.06);
    this.playerShinR.add(bootSoleR);
    this.playerThighR.add(this.playerShinR);
    this.proceduralPlayerBody.add(this.playerThighR);

    // 5. Articulated Arms, Cyberdeck Wrist Unit & Diagnostic Tool
    const armGeom = new THREE.BoxGeometry(0.18, 0.68, 0.18);

    // Left Arm with Glowing Forearm Cyberdeck Terminal
    this.playerArmL = new THREE.Mesh(armGeom, dusterMat);
    this.playerArmL.position.set(-0.48, 1.3, 0);
    this.proceduralPlayerBody.add(this.playerArmL);

    // Wrist Cyberdeck Terminal Housing
    const deckUnitGeom = new THREE.BoxGeometry(0.16, 0.22, 0.1);
    const deckUnit = new THREE.Mesh(deckUnitGeom, armorVestMat);
    deckUnit.position.set(-0.06, -0.16, 0.1);
    deckUnit.rotation.y = 0.2;
    this.playerArmL.add(deckUnit);

    // Glowing Cyan Wrist Datapad Screen
    const wristScreenGeom = new THREE.PlaneGeometry(0.12, 0.18);
    const wristScreen = new THREE.Mesh(wristScreenGeom, wristScreenMat);
    wristScreen.position.set(-0.06, -0.16, 0.16);
    wristScreen.rotation.y = 0.2;
    this.playerArmL.add(wristScreen);

    // Right Arm with Scanner Device
    this.playerArmR = new THREE.Mesh(armGeom, dusterMat);
    this.playerArmR.position.set(0.48, 1.3, 0);
    this.proceduralPlayerBody.add(this.playerArmR);

    // Handheld Scavenger Multi-Tool / Scanner
    const toolGeom = new THREE.BoxGeometry(0.1, 0.2, 0.14);
    const tool = new THREE.Mesh(toolGeom, armorVestMat);
    tool.position.set(0, -0.32, 0.08);
    this.playerArmR.add(tool);

    const toolEmitterGeom = new THREE.SphereGeometry(0.035, 8, 8);
    const toolEmitter = new THREE.Mesh(toolEmitterGeom, visorMat);
    toolEmitter.position.set(0, -0.42, 0.14);
    this.playerArmR.add(toolEmitter);

    this.playerGroup.visible = false;
    this.scene.add(this.playerGroup);

    this.tryLoadCustomPlayerModel();
  }

  // --- Automatic Custom Player Model Loader ---
  private tryLoadCustomPlayerModel(): void {
    const candidatePaths = [
      '/models/player.glb',
      '/models/character.glb',
      '/models/nomad.glb',
      '/models/custom_player.glb',
      '/models/player/scene.gltf',
    ];

    const loader = new GLTFLoader();

    const tryNext = (index: number) => {
      if (index >= candidatePaths.length) {
        console.info('[NEO DRIFT] No custom player model found in public/models/. Using procedural nomad.');
        return;
      }

      const path = candidatePaths[index];
      loader.load(
        path,
        (gltf) => {
          console.log(`[NEO DRIFT] ✅ Custom player model loaded successfully from ${path}!`);
          const model = gltf.scene;

          const bbox = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const center = new THREE.Vector3();
          bbox.getCenter(center);

          // Center horizontally
          model.position.x -= center.x;
          model.position.z -= center.z;

          // Align feet to Y = 0
          model.position.y -= bbox.min.y;

          // Scale height to ~1.85 units (standard human scale)
          if (size.y > 0) {
            const targetHeight = 1.85;
            const scaleFactor = targetHeight / size.y;
            model.scale.setScalar(scaleFactor);
          }

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = !this.isSoftwareGl;
              child.receiveShadow = !this.isSoftwareGl;
            }
          });

          // Check for embedded animations
          if (gltf.animations && gltf.animations.length > 0) {
            this.customPlayerMixer = new THREE.AnimationMixer(model);
            const walkOrIdle = gltf.animations.find((a) => /walk|run|idle/i.test(a.name)) || gltf.animations[0];
            const action = this.customPlayerMixer.clipAction(walkOrIdle);
            action.play();
          }

          this.proceduralPlayerBody.visible = false;
          this.customPlayerModel = model;
          this.playerGroup.add(model);
        },
        undefined,
        () => {
          tryNext(index + 1);
        }
      );
    };

    tryNext(0);
  }

  // --- World Story Destination Landmarks ---
  private buildWorldCityLandmarks() {
    const destCoords = [
      { index: 0, name: CITIES[0].name, x: 0, z: 750, type: 'relay' },
      { index: 1, name: CITIES[1].name, x: 950, z: 3800, type: 'foundry' },
      { index: 2, name: CITIES[2].name, x: -1400, z: 7600, type: 'archive' },
      { index: 3, name: CITIES[3].name, x: 600, z: 12000, type: 'gate' },
    ];

    const rustMetalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.45,
    });
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.2,
      roughness: 0.8,
    });
    const glowCyanMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const glowAmberMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const glowPurpleMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    destCoords.forEach((c) => {
      const destGroup = new THREE.Group();
      const groundY = getTerrainHeight(c.x, c.z);
      destGroup.position.set(c.x, groundY, c.z);

      if (c.type === 'relay') {
        // --- DESTINATION 1: THE OUTLAND RELAY ---
        // 1. Central Communications Lattice Mast (38m high)
        const mastGeom = new THREE.CylinderGeometry(0.5, 2.2, 38, 8);
        const mast = new THREE.Mesh(mastGeom, rustMetalMat);
        mast.position.y = 19;
        destGroup.add(mast);

        // Blinking Obstruction Beacon
        const beaconGeom = new THREE.SphereGeometry(0.9, 8, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const beacon = new THREE.Mesh(beaconGeom, beaconMat);
        beacon.position.y = 38.5;
        destGroup.add(beacon);

        const beaconLight = new THREE.PointLight(0xef4444, 2.5, 45);
        beaconLight.position.y = 38.5;
        destGroup.add(beaconLight);

        // Parabolic Dishes
        const dishGeom = new THREE.ConeGeometry(4.2, 2.0, 16, 1, true);
        dishGeom.rotateX(Math.PI / 3);
        const dish1 = new THREE.Mesh(dishGeom, rustMetalMat);
        dish1.position.set(2, 28, 0);
        destGroup.add(dish1);

        const dish2 = new THREE.Mesh(dishGeom, rustMetalMat);
        dish2.position.set(-2, 22, 1);
        dish2.rotation.y = Math.PI * 0.7;
        destGroup.add(dish2);

        // Prefab Concrete Bunker (x: 0, z: 5)
        const bunker = new THREE.Mesh(new THREE.BoxGeometry(10, 4.2, 8), concreteMat);
        bunker.position.set(0, 2.1, 5);
        destGroup.add(bunker);

        // Comms Console Pedestal inside bunker
        const consolePedestal = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.0), rustMetalMat);
        consolePedestal.position.set(0, 0.6, 3);
        const consoleScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), glowCyanMat);
        consoleScreen.position.set(0, 1.25, 3);
        consoleScreen.rotation.x = -0.4;
        destGroup.add(consolePedestal);
        destGroup.add(consoleScreen);

        // Auxiliary Diesel Generator Unit with Hazard Striping (x: -7, z: 2)
        const genBox = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 2.4), rustMetalMat);
        genBox.position.set(-7, 1.1, 2);
        destGroup.add(genBox);

        const exhaustPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.5, 6), rustMetalMat);
        exhaustPipe.position.set(-7.8, 2.8, 2);
        destGroup.add(exhaustPipe);

        this.staticObstacles.push({
          x: c.x,
          z: c.z,
          radius: 4.5,
          name: 'Relay Tower Base',
        });
        this.staticObstacles.push({
          x: c.x,
          z: c.z + 5,
          radius: 5.5,
          name: 'Relay Communications Bunker',
        });
      } else if (c.type === 'foundry') {
        // --- DESTINATION 2: THE AUTOMATED FOUNDRY ---
        // Massive Factory Superstructure
        const factoryHull = new THREE.Mesh(new THREE.BoxGeometry(34, 16, 24), concreteMat);
        factoryHull.position.set(0, 8, 12);
        destGroup.add(factoryHull);

        // Twin Smokestacks
        [-8, 8].forEach((sx) => {
          const stack = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 3.2, 38, 12), rustMetalMat);
          stack.position.set(sx, 19, 14);
          destGroup.add(stack);

          const rimGlow = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.3, 8, 16), glowAmberMat);
          rimGlow.rotateX(Math.PI / 2);
          rimGlow.position.set(sx, 38, 14);
          destGroup.add(rimGlow);
        });

        // Overhead Truss Bridge spanning road
        const trussArch = new THREE.Mesh(new THREE.BoxGeometry(26, 4, 6), rustMetalMat);
        trussArch.position.set(0, 14, -6);
        destGroup.add(trussArch);

        // Decommissioned Robot Arm Husks
        const armBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 2.5, 8), rustMetalMat);
        armBase.position.set(12, 1.25, -4);
        const armLimb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.5, 0.8), glowAmberMat);
        armLimb.position.set(12, 4.5, -4);
        armLimb.rotation.z = -0.4;
        destGroup.add(armBase);
        destGroup.add(armLimb);

        // Sentry Drone on Pivot
        const droneMesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), rustMetalMat);
        droneMesh.position.set(-10, 8, -6);
        const redScanLight = new THREE.SpotLight(0xef4444, 4, 30, Math.PI / 6, 0.4);
        redScanLight.position.set(-10, 8, -6);
        redScanLight.target.position.set(-5, 0, -6);
        destGroup.add(droneMesh);
        destGroup.add(redScanLight);
        destGroup.add(redScanLight.target);

        // Industrial Mainframe Terminal
        const termTable = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.2), rustMetalMat);
        termTable.position.set(0, 0.7, -1);
        const termScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), glowAmberMat);
        termScreen.position.set(0, 1.45, -1);
        termScreen.rotation.x = -0.3;
        destGroup.add(termTable);
        destGroup.add(termScreen);

        this.staticObstacles.push({
          x: c.x,
          z: c.z + 12,
          radius: 18.0,
          name: 'Foundry Factory Superstructure',
        });
      } else if (c.type === 'archive') {
        // --- DESTINATION 3: THE DEEP ARCHIVE ---
        // Hexagonal Basalt Rock Crags surrounding entrance
        for (let r = 0; r < 8; r++) {
          const ang = (r / 8) * Math.PI * 2;
          const rx = Math.cos(ang) * 16;
          const rz = Math.sin(ang) * 14;
          const rock = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.8, 12 + (r % 3) * 4, 6), concreteMat);
          rock.position.set(rx, 6, rz);
          destGroup.add(rock);
        }

        // Subterranean Research Dome
        const dome = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), concreteMat);
        dome.position.set(0, 0, 4);
        destGroup.add(dome);

        // Bioluminescent Server Monoliths
        [-4, 4].forEach((sx) => {
          const rack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 8.5, 3.0), rustMetalMat);
          rack.position.set(sx, 4.25, -2);
          const strip = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.25, 3.05), glowPurpleMat);
          strip.position.set(sx, 5.0, -2);
          destGroup.add(rack);
          destGroup.add(strip);
        });

        // Conduit Box with severed cables
        const conduitBox = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.2), rustMetalMat);
        conduitBox.position.set(-6, 0.9, -4);
        destGroup.add(conduitBox);

        // Central Datavault Pedestal
        const vaultPedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.0, 1.2, 12), rustMetalMat);
        vaultPedestal.position.set(0, 0.6, -2);
        const vaultHolo = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), glowPurpleMat);
        vaultHolo.position.set(0, 1.8, -2);
        destGroup.add(vaultPedestal);
        destGroup.add(vaultHolo);

        this.staticObstacles.push({
          x: c.x,
          z: c.z + 4,
          radius: 15.0,
          name: 'Archive Subterranean Vault Dome',
        });
      } else {
        // --- DESTINATION 4: THE PERIMETER GATE (AEGIS MAINFRAME) ---
        // Twin Colossal Monolith Pylons (58m high)
        [-24, 24].forEach((px) => {
          const pylon = new THREE.Mesh(new THREE.BoxGeometry(8, 58, 8), concreteMat);
          pylon.position.set(px, 29, 0);
          destGroup.add(pylon);

          const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 54, 8.2), glowCyanMat);
          glowStrip.position.set(px + (px > 0 ? -4 : 4), 29, 0);
          destGroup.add(glowStrip);
        });

        // Electromagnetic Arch bridging the pylons
        const arch = new THREE.Mesh(new THREE.BoxGeometry(56, 6, 8), concreteMat);
        arch.position.set(0, 55, 0);
        destGroup.add(arch);

        // Translucent Energy Barrier
        const barrierGeom = new THREE.PlaneGeometry(40, 50);
        const barrierMat = new THREE.MeshBasicMaterial({
          color: 0x06b6d4,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        const barrier = new THREE.Mesh(barrierGeom, barrierMat);
        barrier.position.set(0, 25, 0);
        destGroup.add(barrier);

        // Skybeam Piercing Cloud Cover
        const beamGeom = new THREE.CylinderGeometry(2, 20, 800, 16, 1, true);
        const beam = new THREE.Mesh(beamGeom, glowCyanMat);
        beam.position.set(0, 400, 0);
        destGroup.add(beam);

        // Central AEGIS Mainframe Pedestal & Core
        const coreBase = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 1.8, 16), rustMetalMat);
        coreBase.position.set(0, 0.9, -12);
        const coreSphere = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), glowCyanMat);
        coreSphere.position.set(0, 3.2, -12);
        destGroup.add(coreBase);
        destGroup.add(coreSphere);

        const coreLight = new THREE.PointLight(0x06b6d4, 3.5, 40);
        coreLight.position.set(0, 3.2, -12);
        destGroup.add(coreLight);

        this.staticObstacles.push({
          x: c.x - 24,
          z: c.z,
          radius: 5.5,
          name: 'Perimeter Gate West Pylon',
        });
        this.staticObstacles.push({
          x: c.x + 24,
          z: c.z,
          radius: 5.5,
          name: 'Perimeter Gate East Pylon',
        });
      }

      this.scene.add(destGroup);
      this.worldCities.push({
        cityIndex: c.index,
        name: c.name,
        x: c.x,
        z: c.z,
        mesh: destGroup,
      });
    });
  }

  // --- Holographic Sky Billboards ---
  private createHologramTexture(
    brand: string,
    sub: string,
    accentColor: string,
    secondaryColor: string,
    tagline: string
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Translucent dark gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(6, 11, 24, 0.95)');
    grad.addColorStop(1, 'rgba(2, 5, 14, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Glowing border with tech corner cuts
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 492, 236);

    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(18, 18, 476, 220);

    // Corner brackets
    ctx.fillStyle = accentColor;
    ctx.fillRect(8, 8, 26, 6);
    ctx.fillRect(8, 8, 6, 26);
    ctx.fillRect(478, 8, 26, 6);
    ctx.fillRect(498, 8, 6, 26);
    ctx.fillRect(8, 242, 26, 6);
    ctx.fillRect(8, 222, 6, 26);
    ctx.fillRect(478, 242, 26, 6);
    ctx.fillRect(498, 222, 6, 26);

    // Kanji & serial stamp
    ctx.fillStyle = secondaryColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('サイバー // NET-CORP PROTOCOL // SEC-LEVEL 9', 30, 42);

    // Main Brand Headline
    ctx.fillStyle = accentColor;
    ctx.font = '900 34px sans-serif';
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 14;
    ctx.fillText(brand, 30, 105);
    ctx.shadowBlur = 0;

    // Subtitle & Tagline
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(sub, 30, 138);

    ctx.fillStyle = secondaryColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(tagline, 30, 162);

    // Barcode & telemetry blocks
    for (let b = 0; b < 40; b++) {
      ctx.fillStyle = b % 3 === 0 ? accentColor : b % 2 === 0 ? secondaryColor : 'rgba(255,255,255,0.4)';
      ctx.fillRect(30 + b * 11, 178, (b % 4 + 1) * 2, 24);
    }

    // Status pill
    ctx.fillStyle = accentColor;
    ctx.fillRect(30, 212, 160, 20);
    ctx.fillStyle = '#000000';
    ctx.font = '900 11px monospace';
    ctx.fillText('STATUS: NEURAL LINKED', 35, 226);

    // Scanlines raster overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    for (let y = 0; y < 256; y += 3) {
      ctx.fillRect(0, y, 512, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildHolographicSkyBillboards() {
    const ads = [
      {
        brand: 'CHROMA SYNTHETICS',
        sub: 'BIOMETRIC CHASSIS & PROSTHETICS',
        tagline: 'REGRADE YOUR DNA // MK-IX EXPEDITION',
        accent: '#06b6d4',
        secondary: '#ec4899',
        x: -95,
        z: 1650,
        height: 38,
        width: 25,
        boardH: 12.5,
        rotY: 0.35,
      },
      {
        brand: 'CYBER-DYNE BIO',
        sub: 'NEURAL CORTEX MK-IV INTEGRATION',
        tagline: 'OVERCLOCK THE FLESH // ZERO LATENCY',
        accent: '#10b981',
        secondary: '#f59e0b',
        x: 125,
        z: 2200,
        height: 42,
        width: 26,
        boardH: 13,
        rotY: -0.4,
      },
      {
        brand: 'ARASAKA ORBITAL',
        sub: 'SECURE YOUR SOUL // RELIC PROGRAM',
        tagline: 'IMMORTALITY ON THE BIO-CHIP MATRIX',
        accent: '#ef4444',
        secondary: '#94a3b8',
        x: -85,
        z: 4400,
        height: 45,
        width: 28,
        boardH: 14,
        rotY: 0.22,
      },
    ];

    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.3,
    });

    ads.forEach((ad, adIdx) => {
      const group = new THREE.Group();
      const groundY = getTerrainHeight(ad.x, ad.z);
      group.position.set(ad.x, groundY, ad.z);
      group.rotation.y = ad.rotY;

      // 4 Pylon Mast Legs
      const legGeom = new THREE.CylinderGeometry(0.35, 0.6, ad.height, 8);
      [-ad.width * 0.35, ad.width * 0.35].forEach((lx) => {
        [-2.5, 2.5].forEach((lz) => {
          const leg = new THREE.Mesh(legGeom, trussMat);
          leg.position.set(lx, ad.height / 2, lz);
          group.add(leg);
        });
      });

      // Cross struts
      for (let s = 1; s < 4; s++) {
        const strutGeom = new THREE.BoxGeometry(ad.width * 0.75, 0.4, 5.2);
        const strut = new THREE.Mesh(strutGeom, trussMat);
        strut.position.set(0, (ad.height * s) / 4, 0);
        group.add(strut);
      }

      // Billboard Screen Frame
      const frameGeom = new THREE.BoxGeometry(ad.width + 1.2, ad.boardH + 1.2, 0.8);
      const frame = new THREE.Mesh(frameGeom, trussMat);
      frame.position.set(0, ad.height + ad.boardH / 2, 0);
      group.add(frame);

      // Holographic Additive Plane
      const holoTex = this.createHologramTexture(ad.brand, ad.sub, ad.accent, ad.secondary, ad.tagline);
      const holoMat = new THREE.MeshBasicMaterial({
        map: holoTex,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const holoGeom = new THREE.PlaneGeometry(ad.width, ad.boardH);
      const holoPlane = new THREE.Mesh(holoGeom, holoMat);
      holoPlane.position.set(0, ad.height + ad.boardH / 2, 0.45);
      group.add(holoPlane);
      this.holographicBillboards.push(holoPlane);

      // Backside mirror
      const holoBack = new THREE.Mesh(holoGeom, holoMat.clone());
      holoBack.position.set(0, ad.height + ad.boardH / 2, -0.45);
      holoBack.rotation.y = Math.PI;
      group.add(holoBack);

      // Automatically check for custom billboard image assets in public/textures/
      this.tryLoadCustomBillboardTexture(adIdx, holoMat, holoBack.material as THREE.MeshBasicMaterial);

      this.scene.add(group);

      // Register pylon base for solid collision
      this.staticObstacles.push({
        x: ad.x,
        z: ad.z,
        radius: 3.2,
        name: `${ad.brand} Billboard Pylon`,
      });
    });
  }

  // --- Automatic Custom Billboard Image Loader ---
  private tryLoadCustomBillboardTexture(
    index: number,
    frontMat: THREE.MeshBasicMaterial,
    backMat: THREE.MeshBasicMaterial
  ): void {
    const candidatePaths = [
      `/textures/billboard_${index + 1}.png`,
      `/textures/billboard_${index + 1}.jpg`,
      `/textures/billboard_${index + 1}.webp`,
      `/textures/billboard${index + 1}.png`,
      `/textures/billboard${index + 1}.jpg`,
      `/textures/billboard${index + 1}.webp`,
      `/textures/ad_${index + 1}.png`,
      `/textures/ad${index + 1}.png`,
      `/textures/ad_${index + 1}.jpg`,
      `/textures/billboard.png`,
      `/textures/billboard.jpg`,
    ];

    const textureLoader = new THREE.TextureLoader();

    const tryNext = (i: number) => {
      if (i >= candidatePaths.length) return;

      const path = candidatePaths[i];
      textureLoader.load(
        path,
        (tex) => {
          console.log(`[NEO DRIFT] ✅ Custom billboard #${index + 1} texture loaded from ${path}!`);
          tex.colorSpace = THREE.SRGBColorSpace;
          frontMat.map = tex;
          frontMat.opacity = 1.0;
          frontMat.blending = THREE.NormalBlending;
          frontMat.needsUpdate = true;

          backMat.map = tex;
          backMat.opacity = 1.0;
          backMat.blending = THREE.NormalBlending;
          backMat.needsUpdate = true;
        },
        undefined,
        () => {
          tryNext(i + 1);
        }
      );
    };

    tryNext(0);
  }

  // --- Automatic Custom Salvage Node Model Loader ---
  private tryLoadCustomSalvageTemplate(): void {
    const candidatePaths = [
      '/models/salvage.glb',
      '/models/resource.glb',
      '/models/crate.glb',
      '/models/scrap.glb',
      '/models/custom_salvage.glb',
      '/models/salvage/scene.gltf',
    ];

    const loader = new GLTFLoader();

    const tryNext = (index: number) => {
      if (index >= candidatePaths.length) {
        console.info('[NEO DRIFT] No custom salvage model found in public/models/. Using procedural crates.');
        return;
      }

      const path = candidatePaths[index];
      loader.load(
        path,
        (gltf) => {
          console.log(`[NEO DRIFT] ✅ Custom salvage resource model loaded from ${path}!`);
          const model = gltf.scene;

          const bbox = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const center = new THREE.Vector3();
          bbox.getCenter(center);

          model.position.x -= center.x;
          model.position.z -= center.z;
          model.position.y -= bbox.min.y;

          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            model.scale.setScalar(1.4 / maxDim);
          }

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = !this.isSoftwareGl;
              child.receiveShadow = !this.isSoftwareGl;
            }
          });

          this.customSalvageTemplate = model;

          // Replace existing spawned salvage meshes
          this.salvageNodes3D.forEach((node) => {
            if (!node.data.collected) {
              const oldCrate = node.mesh.children.find((c) => (c as THREE.Mesh).isMesh && c.type === 'Mesh');
              if (oldCrate) oldCrate.visible = false;
              node.mesh.add(model.clone());
            }
          });
        },
        undefined,
        () => tryNext(index + 1)
      );
    };

    tryNext(0);
  }

  // --- Automatic Custom Enemy Drone Model Loader ---
  private tryLoadCustomEnemyTemplate(): void {
    const candidatePaths = [
      '/models/enemy.glb',
      '/models/drone.glb',
      '/models/raider.glb',
      '/models/custom_enemy.glb',
      '/models/enemy/scene.gltf',
    ];

    const loader = new GLTFLoader();

    const tryNext = (index: number) => {
      if (index >= candidatePaths.length) {
        console.info('[NEO DRIFT] No custom enemy model found in public/models/. Using procedural raiders.');
        return;
      }

      const path = candidatePaths[index];
      loader.load(
        path,
        (gltf) => {
          console.log(`[NEO DRIFT] ✅ Custom enemy drone model loaded from ${path}!`);
          const model = gltf.scene;

          const bbox = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const center = new THREE.Vector3();
          bbox.getCenter(center);

          model.position.x -= center.x;
          model.position.z -= center.z;
          model.position.y -= center.y;

          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            model.scale.setScalar(2.0 / maxDim);
          }

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = !this.isSoftwareGl;
              child.receiveShadow = !this.isSoftwareGl;
            }
          });

          this.customEnemyTemplate = model;

          // Replace existing spawned enemy meshes
          this.enemies3D.forEach((enemy) => {
            const sphereBody = enemy.mesh.children[0];
            if (sphereBody) sphereBody.visible = false;
            enemy.mesh.add(model.clone());
          });
        },
        undefined,
        () => tryNext(index + 1)
      );
    };

    tryNext(0);
  }

  // --- Automatic Custom Building Model Loader ---
  private tryLoadCustomBuildingTemplate(): void {
    const candidatePaths = [
      '/models/building.glb',
      '/models/building_1.glb',
      '/models/building1.glb',
      '/models/tower.glb',
      '/models/skyscraper.glb',
      '/models/city.glb',
      '/models/custom_building.glb',
      '/models/building/scene.gltf',
    ];

    const loader = new GLTFLoader();

    const tryNext = (index: number) => {
      if (index >= candidatePaths.length) {
        console.info('[NEO DRIFT] No custom building model found in public/models/. Using procedural architectural cyberpunk skyscrapers.');
        return;
      }

      const path = candidatePaths[index];
      loader.load(
        path,
        (gltf) => {
          console.log(`[NEO DRIFT] ✅ Custom building model loaded from ${path}!`);
          const model = gltf.scene;

          const bbox = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const center = new THREE.Vector3();
          bbox.getCenter(center);

          // Center horizontally and align base flush to ground
          model.position.x -= center.x;
          model.position.z -= center.z;
          model.position.y -= bbox.min.y;

          // Normalize height to ~110m
          if (size.y > 0) {
            model.scale.setScalar(110.0 / size.y);
          }

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = !this.isSoftwareGl;
              child.receiveShadow = !this.isSoftwareGl;
            }
          });

          this.customBuildingTemplate = model;

          // Replace procedural skyline towers with custom building model instances
          this.customBuildingInstances.forEach((towerGroup, idx) => {
            if (towerGroup.children[0]) {
              towerGroup.children[0].visible = false;
            }
            const instance = model.clone();
            const scaleVariation = 0.85 + (idx % 5) * 0.12;
            instance.scale.multiplyScalar(scaleVariation);
            towerGroup.add(instance);
          });
        },
        undefined,
        () => tryNext(index + 1)
      );
    };

    tryNext(0);
  }

  // --- Distant Megacity Horizon Silhouette (Way Beyond Gate at z: 6200) ---
  private buildMegacitySkyline() {
    const skylineGroup = new THREE.Group();

    // Procedural Window Matrix Canvas Texture
    const winCanvas = document.createElement('canvas');
    winCanvas.width = 256;
    winCanvas.height = 512;
    const wCtx = winCanvas.getContext('2d')!;

    wCtx.fillStyle = '#060a14';
    wCtx.fillRect(0, 0, 256, 512);

    for (let r = 0; r < 60; r++) {
      for (let c = 0; c < 16; c++) {
        if (Math.random() > 0.35) {
          const colors = ['#38bdf8', '#06b6d4', '#f59e0b', '#ffffff', '#ec4899'];
          wCtx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          wCtx.fillRect(10 + c * 15, 10 + r * 8, 8, 4);
        }
      }
    }

    const winTex = new THREE.CanvasTexture(winCanvas);
    winTex.wrapS = THREE.RepeatWrapping;
    winTex.wrapT = THREE.RepeatWrapping;
    winTex.repeat.set(2, 6);
    winTex.colorSpace = THREE.SRGBColorSpace;

    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x080c16,
      map: winTex,
      metalness: 0.95,
      roughness: 0.25,
    });

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.8,
      roughness: 0.45,
    });

    const neonColors = [0x06b6d4, 0xf59e0b, 0xec4899, 0xa855f7];
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // 22 Architectural Horizon Monoliths (Stepped Tiers, Antennas, Gantry Walkways)
    for (let i = 0; i < 22; i++) {
      const bx = -750 + i * 70 + (i % 3) * 15;
      const bz = 13500 + (i % 5) * 180;
      const groundY = getTerrainHeight(bx, bz);
      const bHeight = 130 + (i % 6) * 24;
      const bWidth = 36 + (i % 4) * 12;

      const towerGroup = new THREE.Group();
      towerGroup.position.set(bx, groundY, bz);

      // Procedural Architectural Skyscraper
      const proceduralTower = new THREE.Group();

      // Tier 1: Foundation Podium Base (Heavy setback with loading docks)
      const podiumHeight = bHeight * 0.18;
      const podiumGeom = new THREE.BoxGeometry(bWidth * 1.35, podiumHeight, bWidth * 1.35);
      const podium = new THREE.Mesh(podiumGeom, concreteMat);
      podium.position.y = podiumHeight / 2;
      proceduralTower.add(podium);

      // Inset illuminated bay on podium
      const neonMat = new THREE.MeshBasicMaterial({
        color: neonColors[i % neonColors.length],
      });
      const bayGeom = new THREE.BoxGeometry(bWidth * 0.7, podiumHeight * 0.45, bWidth * 1.38);
      const bay = new THREE.Mesh(bayGeom, neonMat);
      bay.position.y = podiumHeight * 0.35;
      proceduralTower.add(bay);

      // Tier 2: Main Skyscraper Shaft with Cyber Window Facade
      const shaftHeight = bHeight * 0.6;
      const shaftGeom = new THREE.BoxGeometry(bWidth, shaftHeight, bWidth);
      const shaft = new THREE.Mesh(shaftGeom, buildingMat);
      shaft.position.y = podiumHeight + shaftHeight / 2;
      proceduralTower.add(shaft);

      // Vertical Structural Pylons on 4 corners
      const pylonGeom = new THREE.BoxGeometry(bWidth * 0.12, shaftHeight * 1.02, bWidth * 0.12);
      [-0.5, 0.5].forEach((px) => {
        [-0.5, 0.5].forEach((pz) => {
          const pylon = new THREE.Mesh(pylonGeom, concreteMat);
          pylon.position.set(px * bWidth, podiumHeight + shaftHeight / 2, pz * bWidth);
          proceduralTower.add(pylon);
        });
      });

      // Tier 3: Stepped Setback Penthouse / Upper Crown Tier
      const crownHeight = bHeight * 0.22;
      const crownWidth = bWidth * 0.72;
      const crownGeom = new THREE.BoxGeometry(crownWidth, crownHeight, crownWidth);
      const crown = new THREE.Mesh(crownGeom, buildingMat);
      crown.position.y = podiumHeight + shaftHeight + crownHeight / 2;
      proceduralTower.add(crown);

      // Glowing Neon Accent Rim at Setback
      const neonRimGeom = new THREE.BoxGeometry(crownWidth * 1.06, 0.8, crownWidth * 1.06);
      const neonRim = new THREE.Mesh(neonRimGeom, neonMat);
      neonRim.position.y = podiumHeight + shaftHeight + 0.4;
      proceduralTower.add(neonRim);

      // Tier 4: Rooftop Industrial Infrastructure (HVAC units, water tank)
      const hvacGeom = new THREE.CylinderGeometry(bWidth * 0.14, bWidth * 0.14, crownHeight * 0.35, 8);
      const hvac = new THREE.Mesh(hvacGeom, concreteMat);
      hvac.position.set(crownWidth * 0.22, podiumHeight + shaftHeight + crownHeight + crownHeight * 0.17, 0);
      proceduralTower.add(hvac);

      // Tier 5: Communication Lattice Mast & Hazard Beacons
      const mastHeight = 28 + (i % 4) * 8;
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 1.1, mastHeight, 6),
        concreteMat
      );
      spire.position.set(0, podiumHeight + shaftHeight + crownHeight + mastHeight / 2, 0);
      proceduralTower.add(spire);

      // Crossbars on antenna
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 0.4), concreteMat);
      crossbar.position.set(0, podiumHeight + shaftHeight + crownHeight + mastHeight * 0.65, 0);
      proceduralTower.add(crossbar);

      // Red flashing aviation hazard beacon
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), beaconMat);
      beacon.position.set(0, podiumHeight + shaftHeight + crownHeight + mastHeight, 0);
      proceduralTower.add(beacon);

      towerGroup.add(proceduralTower);
      skylineGroup.add(towerGroup);
      this.customBuildingInstances.push(towerGroup);
    }

    // Skybeams piercing up into the clouds
    const beamGeom = new THREE.CylinderGeometry(0.8, 16, 900, 16, 1, true);
    const beamColors = [0x06b6d4, 0x38bdf8, 0xa855f7, 0x06b6d4];

    for (let b = 0; b < 4; b++) {
      const beamMat = new THREE.MeshBasicMaterial({
        color: beamColors[b % beamColors.length],
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(beamGeom, beamMat);
      const beamX = -450 + b * 280;
      const beamZ = 13600 + b * 180;
      const beamY = getTerrainHeight(beamX, beamZ);
      beam.position.set(beamX, beamY + 450, beamZ);
      skylineGroup.add(beam);
      this.skyBeams.push(beam);
    }

    this.scene.add(skylineGroup);
  }

  // --- Celestial 3D Skydome & Custom Sky Texture Loader ---
  private buildSkydome(): void {
    // Atmospheric equirectangular night-sky canvas texture
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 1024;
    skyCanvas.height = 512;
    const sCtx = skyCanvas.getContext('2d')!;

    // Cosmic sky gradient (Zenith -> Horizon)
    const grad = sCtx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#020308'); // Deepest space zenith
    grad.addColorStop(0.35, '#070b1a'); // Dark indigo upper sky
    grad.addColorStop(0.65, '#120d26'); // Cyberpunk violet mid-sky
    grad.addColorStop(0.85, '#1d1336'); // Dusk magenta/amber haze
    grad.addColorStop(0.96, '#0a0d18'); // Horizon fog blend
    grad.addColorStop(1.0, '#070912'); // Ground nadir
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 1024, 512);

    // Distant cosmic nebulae dust wisps
    const nebulae = [
      { x: 280, y: 150, r: 180, color: 'rgba(168, 85, 247, 0.14)' },
      { x: 740, y: 130, r: 210, color: 'rgba(6, 182, 212, 0.12)' },
      { x: 500, y: 200, r: 150, color: 'rgba(244, 63, 94, 0.08)' },
    ];
    nebulae.forEach((neb) => {
      const nGrad = sCtx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.r);
      nGrad.addColorStop(0, neb.color);
      nGrad.addColorStop(1, 'transparent');
      sCtx.fillStyle = nGrad;
      sCtx.beginPath();
      sCtx.arc(neb.x, neb.y, neb.r, 0, Math.PI * 2);
      sCtx.fill();
    });

    // 1400 Distant Stars with slight color variation
    for (let i = 0; i < 1400; i++) {
      const sx = Math.random() * 1024;
      const sy = Math.random() * 430;
      const radius = 0.5 + Math.random() * 1.4;
      const bright = 0.35 + Math.random() * 0.65;
      sCtx.fillStyle =
        i % 8 === 0
          ? `rgba(56, 189, 248, ${bright})`
          : i % 15 === 0
          ? `rgba(251, 191, 36, ${bright})`
          : `rgba(255, 255, 255, ${bright})`;
      sCtx.beginPath();
      sCtx.arc(sx, sy, radius, 0, Math.PI * 2);
      sCtx.fill();
    }

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    skyTex.mapping = THREE.EquirectangularReflectionMapping;

    const skyGeom = new THREE.SphereGeometry(880, 48, 32);
    this.skydomeMaterial = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.skydomeMesh = new THREE.Mesh(skyGeom, this.skydomeMaterial);
    this.skydomeMesh.renderOrder = -100;
    this.scene.add(this.skydomeMesh);
  }

  // --- Automatic Custom Sky Texture Loader ---
  private tryLoadCustomSkyTexture(): void {
    const candidatePaths = [
      '/textures/sky.png',
      '/textures/sky.jpg',
      '/textures/sky.webp',
      '/textures/skybox.jpg',
      '/textures/skybox.png',
      '/textures/skybox.webp',
      '/textures/skydome.jpg',
      '/textures/skydome.png',
      '/textures/space.jpg',
      '/textures/space.png',
      '/textures/night_sky.jpg',
    ];

    const loader = new THREE.TextureLoader();

    const tryNext = (index: number) => {
      if (index >= candidatePaths.length) {
        console.info('[NEO DRIFT] No custom sky texture found in public/textures/. Using procedural celestial skydome.');
        return;
      }

      const path = candidatePaths[index];
      loader.load(
        path,
        (tex) => {
          console.log(`[NEO DRIFT] ✅ Custom sky texture loaded from ${path}!`);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.mapping = THREE.EquirectangularReflectionMapping;
          tex.minFilter = THREE.LinearFilter;
          if (this.skydomeMaterial) {
            this.skydomeMaterial.map = tex;
            this.skydomeMaterial.needsUpdate = true;
            this.customSkyTextureLoaded = true;
          }
        },
        undefined,
        () => tryNext(index + 1)
      );
    };

    tryNext(0);
  }

  // --- Weather & Atmospheric Particle Systems ---
  private setupWeatherAndParticles() {
    // 1. Acid Rain Downward Particle System
    const count = 1500;
    const posArray = new Float32Array(count * 3);
    this.acidRainVelocities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      posArray[i * 3] = (Math.random() - 0.5) * 110;
      posArray[i * 3 + 1] = Math.random() * 55;
      posArray[i * 3 + 2] = (Math.random() - 0.5) * 110;
      this.acidRainVelocities[i] = 75 + Math.random() * 35;
    }

    const acidGeom = new THREE.BufferGeometry();
    acidGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    this.acidRainPositions = posArray;

    const acidMat = new THREE.PointsMaterial({
      color: 0x84cc16, // Toxic acid lime
      size: 0.65,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.acidRainParticles = new THREE.Points(acidGeom, acidMat);
    this.scene.add(this.acidRainParticles);

    // 2. Aurora Ribbon Shimmer Mesh (upper sky for Data Storms)
    const ribbonGeom = new THREE.CylinderGeometry(85, 110, 35, 32, 1, true);
    const auroraMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.auroraRibbon = new THREE.Mesh(ribbonGeom, auroraMat);
    this.auroraRibbon.position.set(0, 150, 400);
    this.scene.add(this.auroraRibbon);

    // 3. Energy Vortexes / Ion Rifts (Extremely rare anomalous phenomena in deep badlands)
    const vortexCoords = [
      { x: 120, z: 3600 },
    ];

    vortexCoords.forEach((coord) => {
      const vortexGroup = new THREE.Group();
      const groundY = getTerrainHeight(coord.x, coord.z);
      vortexGroup.position.set(coord.x, groundY, coord.z);

      const rings: THREE.Mesh[] = [];
      const ringRadii = [2.4, 4.0, 5.5];

      ringRadii.forEach((r, idx) => {
        const ringGeom = new THREE.TorusGeometry(r, 0.14, 8, 24);
        ringGeom.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: idx % 2 === 0 ? 0x06b6d4 : 0xa855f7,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.y = 0.35 + idx * 0.2;
        vortexGroup.add(ring);
        rings.push(ring);
      });

      // Upward swirling spire
      const spireGeom = new THREE.CylinderGeometry(0.3, 3.8, 38, 12, 1, true);
      const spireMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const spire = new THREE.Mesh(spireGeom, spireMat);
      spire.position.y = 19;
      vortexGroup.add(spire);

      const vortexLight = new THREE.PointLight(0x06b6d4, 2.0, 16);
      vortexLight.position.y = 2.0;
      vortexGroup.add(vortexLight);

      this.scene.add(vortexGroup);
      this.ionVortexes.push({
        mesh: vortexGroup,
        rings,
        x: coord.x,
        z: coord.z,
      });
    });
  }

  // --- Collision Sparks Pool ---
  private buildCollisionSparksPool() {
    const sparkCount = 60;
    const pos = new Float32Array(sparkCount * 3);
    this.sparkVelocities = new Float32Array(sparkCount * 3);
    this.sparkLifetimes = new Float32Array(sparkCount);

    for (let i = 0; i < sparkCount; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = -100;
      pos[i * 3 + 2] = 0;
      this.sparkLifetimes[i] = 0;
    }

    const sparkGeom = new THREE.BufferGeometry();
    sparkGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const sparkMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.5,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.sparkParticles = new THREE.Points(sparkGeom, sparkMat);
    this.scene.add(this.sparkParticles);
  }

  public spawnCrashSparks(x: number, y: number, z: number) {
    if (!this.sparkParticles || !this.sparkVelocities || !this.sparkLifetimes) return;
    const pos = this.sparkParticles.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < 20; i++) {
      const idx = Math.floor(Math.random() * 60);
      pos[idx * 3] = x;
      pos[idx * 3 + 1] = y;
      pos[idx * 3 + 2] = z;

      this.sparkVelocities[idx * 3] = (Math.random() - 0.5) * 14;
      this.sparkVelocities[idx * 3 + 1] = 4 + Math.random() * 8;
      this.sparkVelocities[idx * 3 + 2] = (Math.random() - 0.5) * 14;
      this.sparkLifetimes[idx] = 0.5;
    }
    this.sparkParticles.geometry.attributes.position.needsUpdate = true;
  }

  private updateSparks(dt: number) {
    if (!this.sparkParticles || !this.sparkVelocities || !this.sparkLifetimes) return;
    const pos = this.sparkParticles.geometry.attributes.position.array as Float32Array;
    let anyActive = false;

    for (let i = 0; i < 60; i++) {
      if (this.sparkLifetimes[i] > 0) {
        anyActive = true;
        this.sparkLifetimes[i] -= dt;

        pos[i * 3] += this.sparkVelocities[i * 3] * dt;
        pos[i * 3 + 1] += this.sparkVelocities[i * 3 + 1] * dt;
        pos[i * 3 + 2] += this.sparkVelocities[i * 3 + 2] * dt;
        this.sparkVelocities[i * 3 + 1] -= 22 * dt; // Gravity

        if (this.sparkLifetimes[i] <= 0) {
          pos[i * 3 + 1] = -100;
        }
      }
    }

    if (anyActive) {
      this.sparkParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  // --- Solid Collision Solvers ---
  private resolveRoverCollisions() {
    const allObstacles = [...this.staticObstacles, ...this.terrainManager.getAllObstacles()];
    const roverRadius = 2.4;

    for (const obs of allObstacles) {
      const dx = this.roverX - obs.x;
      const dz = this.roverZ - obs.z;
      const distSq = dx * dx + dz * dz;
      const minDistance = roverRadius + obs.radius;

      if (distSq < minDistance * minDistance && distSq > 0.001) {
        const dist = Math.sqrt(distSq);
        const overlap = minDistance - dist;
        const nx = dx / dist;
        const nz = dz / dist;

        // Push rover out of obstacle immediately
        this.roverX += nx * overlap;
        this.roverZ += nz * overlap;

        const absSpeed = Math.abs(this.roverSpeed);

        if (absSpeed > 6) {
          // Rebound and arrest velocity gently
          this.roverSpeed = -this.roverSpeed * 0.25;
          this.roverTargetSpeed = 0;
          this.cameraShake = Math.max(this.cameraShake, Math.min(0.8, absSpeed * 0.025 + 0.2));
          audioEngine.playCrash(absSpeed / 40);
          this.spawnCrashSparks(
            obs.x + nx * obs.radius,
            this.roverY + 0.8,
            obs.z + nz * obs.radius
          );

          // Substantially increased hull durability:
          // Low-speed bumps do zero damage
          // Only high-speed crashes above 22 km/h (6.2 m/s) inflict damage, with a 1.2s damage debounce
          const now = performance.now();
          if (absSpeed > 6.2 && (now - this.lastCollisionDamageTime > 1200)) {
            this.lastCollisionDamageTime = now;
            const baseDmg = Math.max(1, Math.round((absSpeed - 6.2) * 0.4 / Math.max(1, this.upgrades.hullLevel)));
            this.callbacks.onVehicleDamage(baseDmg, obs.name);
          }
        }
      }
    }
  }

  private resolveNomadCollisions() {
    // Nomad collides with static obstacles, terrain relics, AND the Rover!
    const allObstacles: SceneObstacle[] = [
      ...this.staticObstacles,
      ...this.terrainManager.getAllObstacles(),
      {
        x: this.roverX,
        z: this.roverZ,
        radius: 2.5,
        name: '4x4 Cruiser Hull',
      },
    ];

    const nomadRadius = 0.65;

    for (const obs of allObstacles) {
      const dx = this.playerX - obs.x;
      const dz = this.playerZ - obs.z;
      const distSq = dx * dx + dz * dz;
      const minDistance = nomadRadius + obs.radius;

      if (distSq < minDistance * minDistance && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = minDistance - dist;
        const nx = dx / dist;
        const nz = dz / dist;

        // Extrude player position
        this.playerX += nx * overlap;
        this.playerZ += nz * overlap;

        // Tangential sliding: eliminate velocity pointing directly into obstacle
        const dot = this.playerVelX * nx + this.playerVelZ * nz;
        if (dot < 0) {
          this.playerVelX -= dot * nx;
          this.playerVelZ -= dot * nz;
        }
      }
    }
  }

  // --- Weather Update ---
  private updateWeather(dt: number, focalX: number, focalY: number, focalZ: number) {
    this.weatherTimer += dt;

    // Significantly reduced hazardous weather frequency:
    // Long, chill, atmospheric neon driving (600s / 10 min) -> Brief acid rain storm (25s) -> Calm neon driving (600s)
    if (this.currentWeather === 'neon_twilight' && this.weatherTimer > 600) {
      this.weatherTimer = 0;
      this.setWeather('acid_rain');
    } else if (this.currentWeather === 'acid_rain' && this.weatherTimer > 25) {
      this.weatherTimer = 0;
      this.setWeather('neon_twilight');
    } else if (this.currentWeather === 'data_storm' && this.weatherTimer > 20) {
      this.weatherTimer = 0;
      this.setWeather('neon_twilight');
    }

    if (this.currentWeather === 'acid_rain') {
      audioEngine.setAcidRainActive(true);
      if (this.acidRainParticles && this.acidRainPositions && this.acidRainVelocities) {
        (this.acidRainParticles.material as THREE.PointsMaterial).opacity = 0.75;
        this.acidRainParticles.position.set(focalX, 0, focalZ);

        const pos = this.acidRainPositions;
        for (let i = 0; i < pos.length / 3; i++) {
          pos[i * 3 + 1] -= this.acidRainVelocities[i] * dt;
          if (pos[i * 3 + 1] < 0) {
            pos[i * 3 + 1] = 52 + Math.random() * 5;
            pos[i * 3] = (Math.random() - 0.5) * 100;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
          }
        }
        this.acidRainParticles.geometry.attributes.position.needsUpdate = true;
      }

      this.acidCorrosionTimer += dt;
      if (this.acidCorrosionTimer > 1.2) {
        this.acidCorrosionTimer = 0;
        audioEngine.playAcidSizzle();
      }

      // Acid Rain Hazard & Shield Protocol:
      if (this.isOnFoot) {
        // Exposed on foot: hazard suit deteriorating rapidly under caustic downpour
        this.callbacks.onAcidRainShieldStatus?.('on_foot_danger');
        this.callbacks.onVehicleDamage(Math.max(1, Math.round(4.5 * dt)), 'Caustic Acid Rain Exposure');
      } else {
        // Player inside 4x4 vehicle
        if (this.isAcidShieldActive) {
          if (this.stats.battery <= 0) {
            // Battery depleted: shield collapses!
            this.setAcidShield(false);
            this.callbacks.onAcidRainShieldStatus?.('out_of_battery');
            this.callbacks.onVehicleDamage(Math.max(1, Math.round(3.0 * dt)), 'Acid Rain (Canopy Depleted)');
          } else {
            // Drain battery steadily while sustaining canopy shield
            this.stats.battery = Math.max(0, this.stats.battery - 3.2 * dt);
            this.callbacks.onUpdateStats({ battery: this.stats.battery });

            // Stationary check: rover must be stationary inside vehicle
            const speedKmh = Math.abs(this.roverSpeed) * 3.6;
            if (speedKmh > 1.8) {
              // Moving vehicle destabilizes energy canopy!
              this.roverSpeed *= Math.pow(0.85, dt * 60);
              this.callbacks.onAcidRainShieldStatus?.('moving_warning');
              this.callbacks.onVehicleDamage(Math.max(1, Math.round(2.5 * dt)), 'Shield Destabilized by Motion');
            } else {
              // Stationary inside vehicle + Shield Active: 100% Protected!
              this.callbacks.onAcidRainShieldStatus?.('protected');
            }
          }
        } else {
          // Inside vehicle but shield NOT deployed: corrosive damage on hull
          this.callbacks.onAcidRainShieldStatus?.('no_shield');
          this.callbacks.onVehicleDamage(Math.max(1, Math.round(3.0 * dt)), 'Acid Rain Corroding Unshielded Hull');
        }
      }

      // Rotate protective shield dome if active
      if (this.roverAcidShieldMesh && this.roverAcidShieldMesh.visible) {
        this.roverAcidShieldMesh.rotation.y += dt * 0.9;
      }

      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.lerp(new THREE.Color(0x0e2015), dt * 2);
        this.scene.fog.density = THREE.MathUtils.lerp(this.scene.fog.density, 0.007, dt * 2);
      }
    } else {
      audioEngine.setAcidRainActive(false);
      // Clear weather: ensure shield powers down to conserve power and clear status
      if (this.isAcidShieldActive) {
        this.setAcidShield(false);
      }
      this.callbacks.onAcidRainShieldStatus?.('clear' as any);
      if (this.acidRainParticles) {
        (this.acidRainParticles.material as THREE.PointsMaterial).opacity = 0;
      }

      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.lerp(new THREE.Color(0x210c30), dt * 2);
        this.scene.fog.density = THREE.MathUtils.lerp(this.scene.fog.density, 0.0055, dt * 2);
      }

      this.lightningFlashTimer += dt;
      if (this.lightningFlashTimer > this.lightningNextTime) {
        this.lightningFlashTimer = 0;
        this.lightningNextTime = 4 + Math.random() * 6;
        audioEngine.playLightningThunder();
        this.cameraShake = Math.max(this.cameraShake, 0.65);

        if (this.sunLight) {
          const originalColor = this.sunLight.color.clone();
          this.sunLight.color.setHex(0xe0b0ff);
          this.sunLight.intensity = 3.5;
          setTimeout(() => {
            if (this.sunLight) {
              this.sunLight.color.copy(originalColor);
              this.sunLight.intensity = 1.45;
            }
          }, 90);
        }
      }

      if (this.auroraRibbon) {
        this.auroraRibbon.position.set(focalX, 150, focalZ);
        this.auroraRibbon.rotation.y += dt * 0.05;
      }
    }

    // Update Celestial Skydome (Tracks camera focal point for infinite horizon)
    if (this.skydomeMesh) {
      this.skydomeMesh.position.set(focalX, 0, focalZ);
      this.skydomeMesh.rotation.y += dt * 0.002;
    }
    if (this.skydomeMaterial && !this.customSkyTextureLoaded) {
      if (this.currentWeather === 'acid_rain') {
        this.skydomeMaterial.color.lerp(new THREE.Color(0x7ea360), dt * 1.5);
      } else if (this.currentWeather === 'data_storm') {
        this.skydomeMaterial.color.lerp(new THREE.Color(0xb588db), dt * 1.5);
      } else {
        this.skydomeMaterial.color.lerp(new THREE.Color(0xffffff), dt * 1.5);
      }
    }

    // Update Ion Vortex Cooldown (Significantly reduced frequency)
    if (this.ionVortexCooldown > 0) {
      this.ionVortexCooldown -= dt;
    }

    // Energy Vortexes Interaction (Extremely rare phenomenon)
    this.ionVortexes.forEach((vortex) => {
      const activeX = this.isOnFoot ? this.playerX : this.roverX;
      const activeZ = this.isOnFoot ? this.playerZ : this.roverZ;
      const dist = Math.hypot(vortex.x - activeX, vortex.z - activeZ);

      // Only visible and active when cooldown is finished
      const isAvailable = this.ionVortexCooldown <= 0;
      vortex.mesh.visible = isAvailable && dist < 500;

      if (isAvailable && vortex.mesh.visible) {
        vortex.rings.forEach((ring, idx) => {
          ring.rotation.z += dt * (1.5 + idx * 0.8) * (idx % 2 === 0 ? 1 : -1);
        });

        if (dist < 4.8) {
          this.stats.battery = 100;
          this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + 15);
          this.roverSpeed = Math.min(this.roverSpeed * 1.35, 60);
          this.cameraShake = 0.8;
          audioEngine.playIonSurge();

          this.callbacks.onIonVortexAbsorbed?.();
          this.callbacks.onUpdateStats({ battery: 100, health: this.stats.health });

          // Put on long cooldown (600s = 10 minutes) and relocate far into deep badlands
          this.ionVortexCooldown = 600;
          vortex.x = activeX + (Math.random() - 0.5) * 200;
          vortex.z = activeZ + 4500 + Math.random() * 2000;
          const groundY = getTerrainHeight(vortex.x, vortex.z);
          vortex.mesh.position.set(vortex.x, groundY, vortex.z);
          vortex.mesh.visible = false;
        }
      } else if (!isAvailable || activeZ > vortex.z + 150) {
        // If bypassed or on cooldown, relocate far ahead
        if (activeZ > vortex.z + 150) {
          vortex.x = activeX + (Math.random() - 0.5) * 200;
          vortex.z = activeZ + 3500 + Math.random() * 2000;
          const groundY = getTerrainHeight(vortex.x, vortex.z);
          vortex.mesh.position.set(vortex.x, groundY, vortex.z);
        }
      }
    });

    // Holographic Billboards Subtle Flicker
    const time = this.clock.getElapsedTime();
    this.holographicBillboards.forEach((b, idx) => {
      const mat = b.material as THREE.MeshBasicMaterial;
      const flicker = Math.sin(time * 14 + idx * 2.5) * 0.08 + (Math.random() > 0.985 ? -0.25 : 0);
      mat.opacity = Math.max(0.4, Math.min(0.95, 0.82 + flicker));
    });
  }

  public getWeather(): WeatherType {
    return this.currentWeather;
  }

  public setWeather(w: WeatherType) {
    this.currentWeather = w;
    this.weatherTimer = 0;
    this.callbacks.onWeatherChange?.(w);
  }

  public cycleWeather(): WeatherType {
    if (this.currentWeather === 'neon_twilight') {
      this.setWeather('acid_rain');
    } else if (this.currentWeather === 'acid_rain') {
      this.setWeather('data_storm');
    } else {
      this.setWeather('neon_twilight');
    }
    return this.currentWeather;
  }

  // --- Meaningful Resource Locations (Bunkers, Cargo Freight, Outposts) ---
  private seedStructuredResourceLocations() {
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x1e2638,
      metalness: 0.8,
      roughness: 0.4,
    });
    const containerMatOrange = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.6,
      metalness: 0.5,
    });
    const containerMatBlue = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.6,
      metalness: 0.5,
    });

    const poiLocations = [
      { x: 35, z: 220, type: 'bunker' },
      { x: -50, z: 450, type: 'container_wreck' },
      { x: 75, z: 620, type: 'substation' },
      // Near Relay (750)
      { x: -90, z: 1200, type: 'outpost' },
      { x: 140, z: 1650, type: 'bunker' },
      { x: -160, z: 2100, type: 'container_wreck' },
      { x: 80, z: 2600, type: 'outpost' },
      { x: -140, z: 3200, type: 'substation' },
      // Near Foundry (3800)
      { x: 120, z: 4400, type: 'bunker' },
      { x: -110, z: 5000, type: 'container_wreck' },
      { x: 170, z: 5600, type: 'outpost' },
      { x: -180, z: 6400, type: 'substation' },
      { x: 100, z: 7000, type: 'bunker' },
      // Near Archive (7600)
      { x: -120, z: 8400, type: 'container_wreck' },
      { x: 150, z: 9200, type: 'outpost' },
      { x: -130, z: 10100, type: 'bunker' },
      { x: 90, z: 11000, type: 'substation' },
    ];

    poiLocations.forEach((loc, poiIdx) => {
      const poiGroup = new THREE.Group();
      const groundY = getTerrainHeight(loc.x, loc.z);
      poiGroup.position.set(loc.x, groundY, loc.z);

      if (loc.type === 'bunker') {
        const wallBack = new THREE.Mesh(new THREE.BoxGeometry(10, 4.5, 0.6), buildingMat);
        wallBack.position.set(0, 2.25, -4);
        poiGroup.add(wallBack);

        const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.5, 8), buildingMat);
        wallLeft.position.set(-5, 2.25, 0);
        poiGroup.add(wallLeft);

        const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.5, 8), buildingMat);
        wallRight.position.set(5, 2.25, 0);
        poiGroup.add(wallRight);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.6, 8.6), buildingMat);
        roof.position.set(0, 4.7, 0);
        poiGroup.add(roof);

        this.spawnSalvageNode({
          id: `salvage_bunker_${poiIdx}_1`,
          x: loc.x - 2,
          z: loc.z - 1.5,
          type: 'scrap_pile',
          collected: false,
          value: 35,
          label: 'Bunker Supply Crate',
        });
        // Sheltered interior cache that requires on-foot extraction!
        this.spawnSalvageNode({
          id: `salvage_bunker_${poiIdx}_2`,
          x: loc.x + 2,
          z: loc.z - 1.5,
          type: 'nanite_cache',
          collected: false,
          value: 3,
          label: 'Military Nanite Cache [Inside Bunker]',
          footOnly: true,
        });
        this.staticObstacles.push({
          x: loc.x,
          z: loc.z,
          radius: 5.2,
          name: 'Bunker Blast Wall',
        });
      } else if (loc.type === 'container_wreck') {
        const cont1 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 8), containerMatOrange);
        cont1.position.set(0, 1.6, 0);
        cont1.rotation.y = 0.3;
        poiGroup.add(cont1);

        const cont2 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 8), containerMatBlue);
        cont2.position.set(4.5, 1.6, -1);
        cont2.rotation.z = 0.25;
        poiGroup.add(cont2);

        this.spawnSalvageNode({
          id: `salvage_cont_${poiIdx}_1`,
          x: loc.x + 2,
          z: loc.z + 3,
          type: 'scrap_pile',
          collected: false,
          value: 40,
          label: 'Spilled Cargo Crate',
        });
        // Sheltered interior cargo that requires on-foot extraction!
        this.spawnSalvageNode({
          id: `salvage_cont_${poiIdx}_2`,
          x: loc.x - 2.5,
          z: loc.z + 2.5,
          type: 'power_cell',
          collected: false,
          value: 20,
          label: 'Freight Battery Core [Inside Container]',
          footOnly: true,
        });
        this.staticObstacles.push({
          x: loc.x,
          z: loc.z,
          radius: 4.2,
          name: 'Freight Container Wreck',
        });
      } else if (loc.type === 'substation') {
        const base = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 7), buildingMat);
        base.position.y = 0.2;
        poiGroup.add(base);

        const transformer = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.5, 2.5), buildingMat);
        transformer.position.set(0, 1.9, 0);
        poiGroup.add(transformer);

        this.spawnSalvageNode({
          id: `salvage_sub_${poiIdx}_1`,
          x: loc.x + 1.8,
          z: loc.z + 1.8,
          type: 'power_cell',
          collected: false,
          value: 25,
          label: 'Substation Power Cell',
        });
        this.spawnSalvageNode({
          id: `salvage_sub_${poiIdx}_2`,
          x: loc.x - 1.8,
          z: loc.z - 1.8,
          type: 'data_relic',
          collected: false,
          value: 60,
          label: 'Grid Terminal Memory Core',
        });
        this.staticObstacles.push({
          x: loc.x,
          z: loc.z,
          radius: 3.8,
          name: 'Grid Substation Core',
        });
      } else {
        const shelterPoles = new THREE.Group();
        [-3, 3].forEach((px) => {
          [-2, 2].forEach((pz) => {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.5, 6), buildingMat);
            pole.position.set(px, 1.75, pz);
            shelterPoles.add(pole);
          });
        });
        poiGroup.add(shelterPoles);

        const awning = new THREE.Mesh(new THREE.BoxGeometry(7, 0.15, 5), containerMatOrange);
        awning.position.set(0, 3.5, 0);
        awning.rotation.x = 0.1;
        poiGroup.add(awning);

        this.spawnSalvageNode({
          id: `salvage_outpost_${poiIdx}_1`,
          x: loc.x,
          z: loc.z,
          type: 'scrap_pile',
          collected: false,
          value: 30,
          label: 'Nomad Tool Crate',
        });
        this.spawnSalvageNode({
          id: `salvage_outpost_${poiIdx}_2`,
          x: loc.x + 1.2,
          z: loc.z - 0.8,
          type: 'nanite_cache',
          collected: false,
          value: 2,
          label: 'Spare Parts Stash',
        });
        this.staticObstacles.push({
          x: loc.x,
          z: loc.z,
          radius: 3.5,
          name: 'Nomad Outpost Pylon',
        });
      }

      this.scene.add(poiGroup);
      this.poiStructures.push(poiGroup);
    });

    // --- Specific Story Encounter POIs ---
    // 1. Starter Cargo Wreckage near MULE (x: 6, z: 2)
    const starterWreckGroup = new THREE.Group();
    const groundStarter = getTerrainHeight(6, 2);
    starterWreckGroup.position.set(6, groundStarter, 2);
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 1.8), containerMatOrange);
    crate1.position.set(0, 0.9, 0);
    crate1.rotation.y = 0.4;
    starterWreckGroup.add(crate1);
    this.scene.add(starterWreckGroup);
    this.spawnSalvageNode({
      id: 'starter_fuel_canister',
      x: 6.8,
      z: 2.5,
      type: 'fuel_canister',
      collected: false,
      value: 35,
      label: 'Emergency Fuel Canister',
    });
    this.spawnSalvageNode({
      id: 'starter_scrap_crate',
      x: 5.2,
      z: 1.8,
      type: 'scrap_pile',
      collected: false,
      value: 30,
      label: 'Scattered Rig Scrap',
    });
    this.spawnSalvageNode({
      id: 'starter_nanite_cache',
      x: 6.2,
      z: 3.2,
      type: 'nanite_cache',
      collected: false,
      value: 2,
      label: 'Nanite Repair Injector',
      footOnly: true,
    });

    // 2. Roadside Autonomous Repair Depot #09 (x: 350, z: 2200)
    const depotGroup = new THREE.Group();
    const groundDepot = getTerrainHeight(350, 2200);
    depotGroup.position.set(350, groundDepot, 2200);
    const depotCanopy = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 6), buildingMat);
    depotCanopy.position.set(0, 4.2, 0);
    depotGroup.add(depotCanopy);
    const depotLight = new THREE.PointLight(0x10b981, 2.5, 20);
    depotLight.position.set(0, 3.8, 0);
    depotGroup.add(depotLight);
    this.scene.add(depotGroup);

    // 3. Stranded Maintenance Unit TX-84 (x: 550, z: 3000)
    const tx84Group = new THREE.Group();
    const groundTx84 = getTerrainHeight(550, 3000);
    tx84Group.position.set(550, groundTx84, 3000);
    const txBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.6), containerMatOrange);
    txBody.position.set(0, 0.9, 0);
    txBody.rotation.z = 0.3;
    tx84Group.add(txBody);
    const txLight = new THREE.PointLight(0xf59e0b, 3.0, 25);
    txLight.position.set(0, 2.2, 0);
    tx84Group.add(txLight);
    this.scene.add(tx84Group);

    // 4. Wrecked Expedition Buggy (Dr. Chen) (x: -700, z: 5800)
    const buggyGroup = new THREE.Group();
    const groundBuggy = getTerrainHeight(-700, 5800);
    buggyGroup.position.set(-700, groundBuggy, 5800);
    const buggyFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 4.0), buildingMat);
    buggyFrame.position.set(0, 1.0, 0);
    buggyFrame.rotation.x = Math.PI * 0.85;
    buggyGroup.add(buggyFrame);
    const recorderBeacon = new THREE.PointLight(0x06b6d4, 2.8, 22);
    recorderBeacon.position.set(0, 1.5, 0);
    buggyGroup.add(recorderBeacon);
    this.scene.add(buggyGroup);

    // Spawn Corpo Hacking Terminals & Military Safes
    INITIAL_HACKING_TARGETS.forEach((target) => {
      this.spawnHackingTerminal(target);
    });

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + 0.3;
      const dist = 75 + i * 40;
      this.spawnEnemy({
        id: `raider_${i}`,
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        speedZ: 8 + Math.random() * 4,
        speedX: (Math.random() - 0.5) * 4,
        health: 30,
        type: 'drone',
        disabled: false,
      });
    }
  }

  public spawnSalvageNode(data: SalvageNode) {
    const group = new THREE.Group();
    const groundY = getTerrainHeight(data.x, data.z);
    group.position.set(data.x, groundY + 0.6, data.z);

    const colors: Record<SalvageNode['type'], number> = {
      scrap_pile: 0xf59e0b,
      power_cell: 0x38bdf8,
      nanite_cache: 0x10b981,
      data_relic: 0xa855f7,
      fuel_canister: 0xf97316,
      tech_core: 0xd946ef,
    };
    const nodeColor = colors[data.type] || 0xf59e0b;

    if (data.type === 'tech_core') {
      // Rare Military Tech Core: Levitation Octahedron + Dual Orbiting Gimbal Rings
      const coreGeom = new THREE.OctahedronGeometry(0.75, 0);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xd946ef,
        emissive: 0xd946ef,
        emissiveIntensity: 1.2,
        metalness: 0.9,
        roughness: 0.1,
      });
      const core = new THREE.Mesh(coreGeom, coreMat);
      core.name = 'floating_core';
      group.add(core);

      const ring1Geom = new THREE.TorusGeometry(1.2, 0.04, 8, 24);
      const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const ring1 = new THREE.Mesh(ring1Geom, ring1Mat);
      ring1.name = 'ring_outer';
      group.add(ring1);

      const ring2Geom = new THREE.TorusGeometry(0.95, 0.03, 8, 20);
      ring2Geom.rotateX(Math.PI / 2);
      const ring2 = new THREE.Mesh(ring2Geom, new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
      group.add(ring2);

      const beaconLight = new THREE.PointLight(0xd946ef, 3.5, 20);
      beaconLight.position.set(0, 0.5, 0);
      group.add(beaconLight);
    } else if (data.type === 'fuel_canister') {
      // Pressurized Fuel Drum
      const drumGeom = new THREE.CylinderGeometry(0.55, 0.55, 1.3, 16);
      const drumMat = new THREE.MeshStandardMaterial({
        color: 0xc2410c,
        emissive: 0xea580c,
        emissiveIntensity: 0.65,
        metalness: 0.6,
        roughness: 0.35,
      });
      const drum = new THREE.Mesh(drumGeom, drumMat);
      group.add(drum);

      // Warning ring
      const ringGeom = new THREE.TorusGeometry(0.58, 0.04, 6, 16);
      ringGeom.rotateX(Math.PI / 2);
      const ring = new THREE.Mesh(ringGeom, new THREE.MeshBasicMaterial({ color: 0xfdba74 }));
      ring.position.y = 0.2;
      group.add(ring);

      const fuelLight = new THREE.PointLight(0xf97316, 2.0, 14);
      fuelLight.position.set(0, 0.8, 0);
      group.add(fuelLight);
    } else {
      // Standard Scrap Pile or Relic Crate
      if (this.customSalvageTemplate) {
        group.add(this.customSalvageTemplate.clone());
      } else {
        const crateGeom = new THREE.BoxGeometry(1.3, 0.9, 1.3);
        const crateMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          emissive: nodeColor,
          emissiveIntensity: 0.65,
          metalness: 0.8,
          roughness: 0.25,
        });
        const crate = new THREE.Mesh(crateGeom, crateMat);
        group.add(crate);
      }

      const haloGeom = new THREE.TorusGeometry(1.2, 0.05, 8, 20);
      haloGeom.rotateX(Math.PI / 2);
      const halo = new THREE.Mesh(haloGeom, new THREE.MeshBasicMaterial({ color: nodeColor }));
      halo.position.y = -0.35;
      group.add(halo);

      const scrapLight = new THREE.PointLight(nodeColor, 1.5, 12);
      scrapLight.position.set(0, 0.6, 0);
      group.add(scrapLight);
    }

    this.scene.add(group);
    this.salvageNodes3D.push({ data, mesh: group });
  }

  public spawnEnemy(data: RaiderEnemy) {
    const group = new THREE.Group();
    const groundY = getTerrainHeight(data.x, data.z);
    group.position.set(data.x, groundY + 2.5, data.z);

    if (this.customEnemyTemplate) {
      group.add(this.customEnemyTemplate.clone());
    } else {
      const bodyGeom = new THREE.SphereGeometry(0.9, 10, 10);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x3f1d24,
        roughness: 0.4,
        metalness: 0.8,
      });
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      group.add(body);
    }

    const eyeGeom = new THREE.SphereGeometry(0.35, 8, 8);
    const eye = new THREE.Mesh(eyeGeom, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    eye.position.set(0, 0, 0.8);
    group.add(eye);

    const alertLight = new THREE.PointLight(0xef4444, 1.4, 15);
    alertLight.position.set(0, 0.5, 0);
    group.add(alertLight);

    this.scene.add(group);
    this.enemies3D.push({ data, mesh: group, alertLight });
  }

  public spawnHackingTerminal(data: HackingTarget) {
    const group = new THREE.Group();
    const groundY = getTerrainHeight(data.x, data.z);
    group.position.set(data.x, groundY, data.z);

    const baseGeom = new THREE.BoxGeometry(1.6, 0.4, 1.6);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.3 });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = 0.2;
    group.add(base);

    const pillarGeom = new THREE.BoxGeometry(0.85, 2.0, 0.65);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
    const pillar = new THREE.Mesh(pillarGeom, pillarMat);
    pillar.position.y = 1.2;
    group.add(pillar);

    const screenGeom = new THREE.BoxGeometry(0.8, 0.55, 0.05);
    const screenColor = data.isHacked ? 0x10b981 : (data.difficulty === 'hard' ? 0xf43f5e : 0x06b6d4);
    const screenMat = new THREE.MeshStandardMaterial({
      color: screenColor,
      emissive: screenColor,
      emissiveIntensity: 0.85,
    });
    const screenMesh = new THREE.Mesh(screenGeom, screenMat);
    screenMesh.position.set(0, 1.95, 0.25);
    screenMesh.rotation.x = -0.35;
    group.add(screenMesh);

    const holoGeom = new THREE.OctahedronGeometry(0.35, 0);
    const holoMat = new THREE.MeshBasicMaterial({
      color: screenColor,
      wireframe: true,
    });
    const holo = new THREE.Mesh(holoGeom, holoMat);
    holo.position.y = 2.85;
    group.add(holo);

    this.scene.add(group);
    this.hackingTargets3D.push({ data, mesh: group, screenMesh });
    this.staticObstacles.push({
      x: data.x,
      z: data.z,
      radius: 1.6,
      name: data.title,
    });
  }

  public updateHackingTargets(targets: HackingTarget[]) {
    targets.forEach((updated) => {
      const found = this.hackingTargets3D.find((item) => item.data.id === updated.id);
      if (found) {
        found.data = { ...updated };
        if (updated.isHacked) {
          (found.screenMesh.material as THREE.MeshStandardMaterial).color.setHex(0x10b981);
          (found.screenMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x10b981);
        }
      }
    });
  }

  public updateCyberware(list: CyberwareItem[]) {
    this.cyberwareList = [...list];
  }

  private buildEmpWaveRing() {
    const ringGeom = new THREE.RingGeometry(0.1, 0.5, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.empWaveMesh = new THREE.Mesh(ringGeom, ringMat);
    this.scene.add(this.empWaveMesh);
  }

  private buildAtmosphericParticles() {
    const count = this.isSoftwareGl ? 200 : 500;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 160;
      pos[i * 3 + 1] = Math.random() * 25;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 160;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.35,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    this.dustParticles = new THREE.Points(geom, mat);
    this.scene.add(this.dustParticles);
  }

  // --- Depart City & Advance Destination ---
  public setDestinationIndex(index: number) {
    this.activeDestinationIndex = Math.max(0, Math.min(this.worldCities.length - 1, index));
    this.cityArrivalCooldown = 25.0;
    this.destinationApproached = false;
    const activeX = this.isOnFoot ? this.playerX : this.roverX;
    const activeZ = this.isOnFoot ? this.playerZ : this.roverZ;
    const targetCity = this.worldCities[this.activeDestinationIndex];
    if (targetCity) {
      this.distanceToNextCity = Math.hypot(targetCity.x - activeX, targetCity.z - activeZ) / 1000;
    }
  }

  public departCity(cityIndex: number) {
    this.cityArrivalCooldown = 25.0;
    this.destinationApproached = false;

    // Advance to next destination city!
    this.activeDestinationIndex = Math.min(this.worldCities.length - 1, cityIndex + 1);

    const activeX = this.isOnFoot ? this.playerX : this.roverX;
    const activeZ = this.isOnFoot ? this.playerZ : this.roverZ;
    const targetCity = this.worldCities[this.activeDestinationIndex];
    if (targetCity) {
      this.distanceToNextCity = Math.hypot(targetCity.x - activeX, targetCity.z - activeZ) / 1000;
    }
  }

  // --- Fixed Destination Compass & Waypoint ---
  public getNearestCityTelemetry(): NearestCityInfo {
    const activeX = this.isOnFoot ? this.playerX : this.roverX;
    const activeZ = this.isOnFoot ? this.playerZ : this.roverZ;

    // Always points to current TARGET destination city (not already visited one!)
    const targetCity = this.worldCities[this.activeDestinationIndex % this.worldCities.length];
    const distanceMeters = Math.hypot(targetCity.x - activeX, targetCity.z - activeZ);

    // Calculate view angle
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const viewHeading = Math.atan2(camDir.x, camDir.z);

    // Angle toward target city
    const targetAngle = Math.atan2(targetCity.x - activeX, targetCity.z - activeZ);

    // In our view-space (where screen-right is -X):
    // When target is to the right of camera view, bearing is positive (clockwise in CSS)
    let diff = viewHeading - targetAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const relDeg = Math.round((diff * 180) / Math.PI);

    let hint = 'STRAIGHT AHEAD';
    if (relDeg > 135 || relDeg < -135) {
      hint = 'BEHIND YOU';
    } else if (relDeg > 45 && relDeg <= 135) {
      hint = relDeg > 75 ? 'HARD RIGHT' : 'BEARING RIGHT';
    } else if (relDeg < -45 && relDeg >= -135) {
      hint = relDeg < -75 ? 'HARD LEFT' : 'BEARING LEFT';
    } else if (relDeg > 15) {
      hint = 'SLIGHT RIGHT';
    } else if (relDeg < -15) {
      hint = 'SLIGHT LEFT';
    }

    const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    let compassHeading = (-viewHeading % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const cardIdx = Math.round((compassHeading / (Math.PI * 2)) * 8) % 8;

    return {
      name: targetCity.name,
      distanceKm: distanceMeters / 1000,
      relativeBearingDeg: relDeg,
      directionHint: hint,
      cardinal: cardinals[cardIdx],
    };
  }

  // --- Enter / Exit Vehicle ---
  public togglePlayerMode() {
    if (this.isOnFoot) {
      const dist = Math.hypot(this.playerX - this.roverX, this.playerZ - this.roverZ);
      if (dist < 6.5) {
        this.isOnFoot = false;
        this.playerGroup.visible = false;
        audioEngine.playRepairSound();
        this.callbacks.onTogglePlayerMode(false);
      }
    } else {
      this.isOnFoot = true;
      this.playerGroup.visible = true;

      const sideAngle = this.roverHeading + Math.PI / 2;
      this.playerX = this.roverX + Math.sin(sideAngle) * 2.8;
      this.playerZ = this.roverZ + Math.cos(sideAngle) * 2.8;
      this.playerHeading = this.roverHeading;
      this.cameraYaw = this.roverHeading; // Align camera smoothly
      this.playerVelX = 0;
      this.playerVelZ = 0;
      this.playerVelY = 0;

      const groundY = getTerrainHeight(this.playerX, this.playerZ);
      this.playerY = groundY;
      this.playerGroup.position.set(this.playerX, groundY, this.playerZ);

      audioEngine.updateEnginePitch(0, false);
      this.callbacks.onTogglePlayerMode(true);
    }
  }

  public isPlayerOnFoot(): boolean {
    return this.isOnFoot;
  }

  public getPlayerDistanceToRover(): number {
    return Math.hypot(this.playerX - this.roverX, this.playerZ - this.roverZ);
  }

  public getNearbyStoryInteraction(): StoryInteractionTarget | null {
    const activeX = this.isOnFoot ? this.playerX : this.roverX;
    const activeZ = this.isOnFoot ? this.playerZ : this.roverZ;

    // 1. MULE Field Servicing (When on foot near MULE)
    if (this.isOnFoot) {
      const distToRover = Math.hypot(this.roverX - this.playerX, this.roverZ - this.playerZ);
      if (distToRover < 5.5) {
        return {
          id: 'mule_dashboard',
          label: this.failure && this.failure.type !== 'none'
            ? 'SERVICE MULE 4X4 // REPAIR CRACKED FUEL CONDUIT [V/E]'
            : 'INSPECT MULE 4X4 // FIELD DIAGNOSTICS & TUNING [V/E]',
          action: 'dashboard',
          distMeters: Math.round(distToRover),
        };
      }
    }

    // 2. Starter Wreckage
    const distToStarter = Math.hypot(6 - activeX, 2 - activeZ);
    if (distToStarter < 5.5) {
      return {
        id: 'starter_wreckage',
        label: 'SCAVENGE CRASHED CARGO WRECKAGE',
        action: 'starter_wreckage',
        distMeters: Math.round(distToStarter),
      };
    }

    // 3. Relay Auxiliary Power Breaker (Sector 01)
    const distToRelayBreaker = Math.hypot(0 - activeX, 742 - activeZ);
    if (distToRelayBreaker < 9.0) {
      return {
        id: 'relay_breaker',
        label: 'FLIP RELAY AUXILIARY POWER BREAKER',
        action: 'relay_terminal',
        distMeters: Math.round(distToRelayBreaker),
      };
    }

    // 4. Relay Comms Terminal (Sector 01)
    const distToRelayTerminal = Math.hypot(0 - activeX, 755 - activeZ);
    if (distToRelayTerminal < 10.0) {
      return {
        id: 'relay_terminal',
        label: 'ACCESS OUTLAND RELAY TERMINAL',
        action: 'relay_terminal',
        distMeters: Math.round(distToRelayTerminal),
      };
    }

    // 5. Roadside Autonomous Repair Depot #09
    const distToDepot = Math.hypot(350 - activeX, 2200 - activeZ);
    if (distToDepot < 10.0) {
      return {
        id: 'repair_depot',
        label: 'USE AUTONOMOUS REPAIR DEPOT #09',
        action: 'repair_station',
        distMeters: Math.round(distToDepot),
      };
    }

    // 6. Stranded Maintenance Unit TX-84
    const distToTx84 = Math.hypot(550 - activeX, 3000 - activeZ);
    if (distToTx84 < 10.0) {
      return {
        id: 'unit_tx84',
        label: 'INVESTIGATE STRANDED UNIT TX-84',
        action: 'tx84',
        distMeters: Math.round(distToTx84),
      };
    }

    // 7. Foundry Central Mainframe (Sector 06)
    const distToFoundry = Math.hypot(950 - activeX, 3800 - activeZ);
    if (distToFoundry < 15.0) {
      return {
        id: 'foundry_mainframe',
        label: 'ACCESS AUTOMATED FOUNDRY TERMINAL',
        action: 'foundry_terminal',
        distMeters: Math.round(distToFoundry),
      };
    }

    // 8. Wrecked Expedition Buggy (Dr. Chen)
    const distToBuggy = Math.hypot(-700 - activeX, 5800 - activeZ);
    if (distToBuggy < 10.0) {
      return {
        id: 'expedition_buggy',
        label: 'SEARCH EXPEDITION BUGGY // RECOVER KEY',
        action: 'expedition_buggy',
        distMeters: Math.round(distToBuggy),
      };
    }

    // 9. Deep Archive Core Vault (Sector 11)
    const distToArchive = Math.hypot(-1400 - activeX, 7600 - activeZ);
    if (distToArchive < 16.0) {
      return {
        id: 'archive_vault',
        label: 'ACCESS DEEP ARCHIVE CORE REPOSITORY',
        action: 'archive_terminal',
        distMeters: Math.round(distToArchive),
      };
    }

    // 10. The Gate // AEGIS Master Mainframe (Sector 18)
    const distToGate = Math.hypot(600 - activeX, 12000 - activeZ);
    if (distToGate < 22.0) {
      return {
        id: 'gate_mainframe',
        label: 'CONFRONT AEGIS ROOT MAINFRAME',
        action: 'gate_terminal',
        distMeters: Math.round(distToGate),
      };
    }

    return null;
  }

  public triggerContextualInteraction() {
    const storyTarget = this.getNearbyStoryInteraction();
    if (storyTarget) {
      this.callbacks.onTriggerStoryInteraction?.(storyTarget);
    } else {
      this.collectNearestSalvage();
      this.checkCityGateArrival();
    }
  }

  // --- EMP Blaster ---
  public triggerEmpBlaster() {
    if (this.empWaveActive || this.isOnFoot) return;
    if (this.stats.battery < 15) {
      audioEngine.playAlertBeep();
      return;
    }

    this.stats.battery = Math.max(0, this.stats.battery - 15);
    this.callbacks.onUpdateStats({ battery: this.stats.battery });

    this.empWaveActive = true;
    this.empWaveRadius = 0.5;
    if (this.empWaveMesh) {
      const groundY = getTerrainHeight(this.roverX, this.roverZ);
      this.empWaveMesh.position.set(this.roverX, groundY + 0.4, this.roverZ);
      this.empWaveMesh.scale.set(1, 1, 1);
      (this.empWaveMesh.material as THREE.MeshBasicMaterial).opacity = 0.85;
    }

    audioEngine.playEmpBlast();
    this.cameraShake = 0.6;
    this.turretGroup.rotation.y += Math.PI * 2;

    const maxRadius = 25 + this.upgrades.empLevel * 10;
    this.enemies3D.forEach((item) => {
      if (item.data.disabled) return;
      const dist = Math.hypot(item.mesh.position.x - this.roverX, item.mesh.position.z - this.roverZ);
      if (dist < maxRadius) {
        this.disableEnemy(item);
      }
    });
  }

  private disableEnemy(item: { data: RaiderEnemy; mesh: THREE.Group; alertLight: THREE.PointLight }) {
    item.data.disabled = true;
    item.alertLight.color.setHex(0x06b6d4);
    audioEngine.playEnemyExplosion();

    this.callbacks.onDefeatEnemy(item.data);

    // Drones drop a rare Tech Core to upgrade your rover (Speed, Durability, or Efficiency)
    this.spawnSalvageNode({
      id: `tech_core_${Date.now()}`,
      x: item.mesh.position.x,
      z: item.mesh.position.z,
      type: 'tech_core',
      collected: false,
      value: 1,
      label: 'Rare Drone Tech Core',
    });
  }

  public collectNearestSalvage() {
    const charX = this.isOnFoot ? this.playerX : this.roverX;
    const charZ = this.isOnFoot ? this.playerZ : this.roverZ;
    const range = this.isOnFoot ? 5.5 : 8 + this.upgrades.droneLevel * 5;

    const nearest = this.salvageNodes3D.find(
      (node) =>
        !node.data.collected &&
        Math.hypot(node.mesh.position.x - charX, node.mesh.position.z - charZ) < range
    );

    if (nearest) {
      if (nearest.data.footOnly && !this.isOnFoot) {
        audioEngine.playAlertBeep();
        this.callbacks.onVehicleDamage(0, 'Sheltered cache in tight crevice! Deploy Nomad on foot [F] to extract.');
        return;
      }
      nearest.data.collected = true;
      audioEngine.playScrapChime();
      if (nearest.data.type === 'tech_core') {
        this.callbacks.onCollectTechCore?.(nearest.data);
      }
      this.callbacks.onCollectSalvage(nearest.data, this.isOnFoot);
      this.scene.remove(nearest.mesh);
    }
  }

  // --- Cyberware & Cyber-Eye Scanner Operations ---
  public toggleScannerMode(): boolean {
    this.isScannerActive = !this.isScannerActive;
    if (this.isScannerActive) {
      audioEngine.playScannerPing();
    }
    this.callbacks.onToggleScanner(this.isScannerActive);
    return this.isScannerActive;
  }

  public setScannerMode(active: boolean) {
    this.isScannerActive = active;
    if (active) audioEngine.playScannerPing();
    this.callbacks.onToggleScanner(active);
  }

  public isScannerMode(): boolean {
    return this.isScannerActive;
  }

  public getNearestHackingTarget(): HackingTarget | null {
    const charX = this.isOnFoot ? this.playerX : this.roverX;
    const charZ = this.isOnFoot ? this.playerZ : this.roverZ;
    const range = 6.5;

    const nearest = this.hackingTargets3D.find(
      (item) =>
        !item.data.isHacked &&
        Math.hypot(item.mesh.position.x - charX, item.mesh.position.z - charZ) < range
    );
    return nearest ? nearest.data : null;
  }

  public triggerHackingNear() {
    const nearest = this.getNearestHackingTarget();
    if (nearest) {
      audioEngine.playCyberdeckBeep();
      this.callbacks.onTriggerHacking(nearest);
    }
  }

  public getScannerTargetHUD(): Array<{
    id: string;
    title: string;
    distanceMeters: number;
    type: string;
    isHacked?: boolean;
    secFirm?: string;
    label?: string;
  }> {
    const charX = this.isOnFoot ? this.playerX : this.roverX;
    const charZ = this.isOnFoot ? this.playerZ : this.roverZ;

    const opticsImplant = this.cyberwareList.find((c) => c.slot === 'optics' && c.installed);
    const maxRange = opticsImplant?.statBonus.scanRangeBonus || 65;

    const list: Array<{
      id: string;
      title: string;
      distanceMeters: number;
      type: string;
      isHacked?: boolean;
      secFirm?: string;
      label?: string;
    }> = [];

    // Terminals
    this.hackingTargets3D.forEach((t) => {
      const dist = Math.hypot(t.mesh.position.x - charX, t.mesh.position.z - charZ);
      if (dist < maxRange) {
        list.push({
          id: t.data.id,
          title: t.data.title,
          distanceMeters: Math.round(dist),
          type: 'terminal',
          isHacked: t.data.isHacked,
          secFirm: t.data.securityFirm,
        });
      }
    });

    // Salvage Nodes
    this.salvageNodes3D.forEach((s) => {
      if (s.data.collected) return;
      const dist = Math.hypot(s.mesh.position.x - charX, s.mesh.position.z - charZ);
      if (dist < maxRange) {
        list.push({
          id: s.data.id,
          title: s.data.label,
          distanceMeters: Math.round(dist),
          type: 'salvage',
          label: s.data.type,
        });
      }
    });

    // Enemies
    this.enemies3D.forEach((e) => {
      const dist = Math.hypot(e.mesh.position.x - charX, e.mesh.position.z - charZ);
      if (dist < maxRange) {
        list.push({
          id: e.data.id,
          title: e.data.disabled ? 'Disabled Drone Husk' : 'Hostile Drone',
          distanceMeters: Math.round(dist),
          type: 'enemy',
        });
      }
    });

    return list.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 8);
  }

  private bindInputs() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.isPaused) {
      return;
    }
    this.keysHeld[e.code] = true;
    audioEngine.resume();

    if (e.code === 'KeyF') {
      e.preventDefault();
      this.togglePlayerMode();
    }

    if (e.code === 'KeyQ') {
      e.preventDefault();
      this.toggleScannerMode();
    }

    if (e.code === 'KeyH') {
      e.preventDefault();
      this.triggerHackingNear();
    }

    if (e.code === 'Space') {
      e.preventDefault();
      if (!this.isOnFoot) {
        // Handbrake / EMP Blaster
        this.triggerEmpBlaster();
      } else {
        if (this.isGrounded) {
          this.playerVelY = 8.5;
          this.isGrounded = false;
        }
      }
    }

    if (e.code === 'KeyE') {
      this.triggerContextualInteraction();
    }

    if (e.code === 'KeyR') {
      if (this.stats.fuel <= 0 && this.callbacks.onSynthesizeFuel) {
        this.callbacks.onSynthesizeFuel();
      } else {
        audioEngine.cycleStation();
      }
    }

    if (e.code === 'KeyV') {
      e.preventDefault();
      this.callbacks.onOpenDashboard?.();
    }

    if (e.code === 'KeyB') {
      e.preventDefault();
      this.toggleAcidShield();
    }

    if (e.code === 'KeyC') {
      this.cycleCameraView();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = false;
  };

  private onWindowBlur = () => {
    this.keysHeld = {};
  };

  public setVirtualInput(code: string, held: boolean) {
    this.keysHeld[code] = held;
    audioEngine.resume();
  }

  public cycleCameraView() {
    const modes: CameraViewMode[] = ['chase', 'cockpit', 'cinematic'];
    const idx = (modes.indexOf(this.cameraMode) + 1) % modes.length;
    this.cameraMode = modes[idx];
  }

  public setCameraView(mode: CameraViewMode) {
    this.cameraMode = mode;
  }

  public getCameraView(): CameraViewMode {
    return this.cameraMode;
  }

  // --- Acid Rain Canopy Shield Operations ---
  public toggleAcidShield(): boolean {
    if (this.isOnFoot) {
      audioEngine.playAlertBeep();
      return false;
    }
    if (!this.isAcidShieldActive && this.stats.battery <= 2) {
      audioEngine.playAlertBeep();
      return false;
    }
    this.setAcidShield(!this.isAcidShieldActive);
    return this.isAcidShieldActive;
  }

  public setAcidShield(active: boolean) {
    if (active && (this.stats.battery <= 2 || this.isOnFoot)) {
      active = false;
    }
    this.isAcidShieldActive = active;
    if (this.roverAcidShieldMesh) {
      this.roverAcidShieldMesh.visible = active;
    }
    if (active) {
      audioEngine.playShieldEngage();
    } else {
      audioEngine.playShieldPowerDown();
    }
    audioEngine.setShieldHum(active);
    this.callbacks.onAcidShieldToggle?.(active);
  }

  public getIsAcidShieldActive(): boolean {
    return this.isAcidShieldActive;
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      this.keysHeld = {};
    }
    audioEngine.setPaused(paused);
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public updateStatsAndUpgrades(
    stats: VehicleStats,
    upgrades: VehicleUpgrades,
    failure: MechanicalFailure | null,
    distToCity: number
  ) {
    this.stats = { ...stats };
    this.upgrades = { ...upgrades };
    this.failure = failure;
    this.distanceToNextCity = distToCity;
  }

  private checkCityGateArrival() {
    if (this.cityArrivalCooldown > 0) return;
    if (!this.worldCities || this.worldCities.length === 0) return;

    const targetCity = this.worldCities[this.activeDestinationIndex % this.worldCities.length];
    if (!targetCity) return;

    const activeX = this.isOnFoot ? this.playerX : this.roverX;
    const activeZ = this.isOnFoot ? this.playerZ : this.roverZ;

    const dist = Math.hypot(targetCity.x - activeX, targetCity.z - activeZ);
    // When approaching destination outpost (< 75m), notify player and play beacon audio, but do NOT force open modal
    if (dist < 75 && !this.destinationApproached) {
      this.destinationApproached = true;
      audioEngine.playCityFanfare();
      this.callbacks.onDestinationArrivedArea?.(targetCity.cityIndex, targetCity.name);
    }
  }

  // --- Main 60fps Loop ---
  private tick = () => {
    if (this.isPaused) {
      this.renderer.render(this.scene, this.camera);
      this.animationFrameId = requestAnimationFrame(this.tick);
      return;
    }

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);

    if (this.cityArrivalCooldown > 0) {
      this.cityArrivalCooldown = Math.max(0, this.cityArrivalCooldown - dt);
    }

    if (this.isOnFoot) {
      this.updateOnFootCharacter(dt);
    } else {
      this.updateRoverDriving(dt);
    }

    const focalX = this.isOnFoot ? this.playerX : this.roverX;
    const focalY = this.isOnFoot ? this.playerY : this.roverY;
    const focalZ = this.isOnFoot ? this.playerZ : this.roverZ;
    this.terrainManager.update(focalX, focalZ, this.isSoftwareGl);

    this.updateWeather(dt, focalX, focalY, focalZ);
    this.updateSparks(dt);

    this.updateCamera(dt);
    this.updateEntities(dt);
    this.updateEmpShockwave(dt);

    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  // --- Enhanced 4x4 Rover Driving with Smooth Suspension & Stable Boost ---
  private updateRoverDriving(dt: number) {
    const forwardKey = this.keysHeld['KeyW'] || this.keysHeld['ArrowUp'];
    const backKey = this.keysHeld['KeyS'] || this.keysHeld['ArrowDown'];
    const leftKey = this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft'];
    const rightKey = this.keysHeld['KeyD'] || this.keysHeld['ArrowRight'];
    const boostKey = this.keysHeld['ShiftLeft'] || this.keysHeld['ShiftRight'];
    const handbrakeKey = this.keysHeld['Space'];

    const baseMaxSpeed = 28 + this.upgrades.engineLevel * 5;
    let maxSpeed = baseMaxSpeed;
    let accelRate = 16 + this.upgrades.engineLevel * 4;

    if (this.failure) {
      if (this.failure.type === 'overheat') maxSpeed *= 0.55;
      if (this.failure.type === 'puncture') maxSpeed *= 0.65;
    }

    // Thermal Governor: prevent engine burnout freakout when heat exceeds 95%
    const isOverheated = this.stats.heat >= 95;
    this.isBoosting = Boolean(boostKey && this.stats.battery > 5 && forwardKey && !isOverheated);

    if (this.isBoosting) {
      // Governed high-speed boost (capped at ~170 km/h for thrilling yet stable badland traversal)
      maxSpeed = Math.min(48, baseMaxSpeed * 1.5);
      accelRate *= 1.8;
      this.stats.battery = Math.max(0, this.stats.battery - dt * 6.5);
      this.stats.heat = Math.min(100, this.stats.heat + dt * 11);

      if (!this.boostSoundTriggered) {
        audioEngine.playTurboBoost();
        this.boostSoundTriggered = true;
      }

      this.boostFlames.forEach((flame) => {
        (flame.material as THREE.MeshBasicMaterial).opacity = 0.85 + Math.random() * 0.15;
        flame.scale.set(1 + Math.random() * 0.25, 1 + Math.random() * 0.35, 1);
      });
    } else {
      this.boostSoundTriggered = false;
      // Passive thermal dissipation
      this.stats.heat = Math.max(0, this.stats.heat - dt * 7.5);

      this.boostFlames.forEach((flame) => {
        (flame.material as THREE.MeshBasicMaterial).opacity = 0;
      });
    }

    if (this.upgrades.solarLevel > 1) {
      this.stats.battery = Math.min(100, this.stats.battery + dt * 2.5);
    }

    // Speed-sensitive steering stability: tighter turning at low speed, rock-solid at high speeds
    const speedDamping = Math.max(0.38, 1.0 - (Math.abs(this.roverSpeed) / 48) * 0.52);
    const maxSteerAngle = 0.44 * speedDamping;
    const steerRate = (2.2 + this.upgrades.suspensionLevel * 0.2) * speedDamping;
    const speedFactor = Math.abs(this.roverSpeed) / maxSpeed;

    if (rightKey) {
      this.roverSteerAngle = THREE.MathUtils.lerp(this.roverSteerAngle, -maxSteerAngle, dt * 10);
      this.roverHeading -= steerRate * dt * (this.roverSpeed >= 0 ? speedFactor : -speedFactor);
    } else if (leftKey) {
      this.roverSteerAngle = THREE.MathUtils.lerp(this.roverSteerAngle, maxSteerAngle, dt * 10);
      this.roverHeading += steerRate * dt * (this.roverSpeed >= 0 ? speedFactor : -speedFactor);
    } else {
      this.roverSteerAngle = THREE.MathUtils.lerp(this.roverSteerAngle, 0, dt * 12);
    }

    // Synchronize front wheel steering hubs
    this.frontWheelPivots.forEach((p) => {
      p.rotation.y = this.roverSteerAngle;
    });

    // Controlled Dynamic Drift Physics
    const isDrifting = handbrakeKey && Math.abs(this.roverSpeed) > 10;
    if (isDrifting || (Math.abs(this.roverSteerAngle) > 0.28 && this.roverSpeed > 22)) {
      this.roverDriftAngle = THREE.MathUtils.lerp(
        this.roverDriftAngle,
        this.roverSteerAngle * 0.65,
        dt * 6
      );
      this.cameraShake = Math.max(this.cameraShake, 0.25);
    } else {
      this.roverDriftAngle = THREE.MathUtils.lerp(this.roverDriftAngle, 0, dt * 6);
    }

    // Terrain Elevation Sampling
    const groundCenterY = getTerrainHeight(this.roverX, this.roverZ);

    const isOutOfFuel = this.stats.fuel <= 0;

    if (isOutOfFuel) {
      this.roverTargetSpeed = 0;
      this.isBoosting = false;
      this.roverSpeed = THREE.MathUtils.lerp(this.roverSpeed, 0, dt * 5);

      if (forwardKey || backKey) {
        const now = performance.now();
        if (now - this.lastStallWarnTime > 2500) {
          this.lastStallWarnTime = now;
          audioEngine.playAlertBeep();
          this.callbacks.onOutOfFuel?.();
        }
      }
    } else if (forwardKey) {
      this.roverTargetSpeed = maxSpeed;
      const fuelDrain = dt * (this.isBoosting ? 0.40 : 0.18);
      const prevFuel = this.stats.fuel;
      this.stats.fuel = Math.max(0, this.stats.fuel - fuelDrain);
      if (prevFuel > 0 && this.stats.fuel <= 0) {
        this.callbacks.onOutOfFuel?.();
      }
    } else if (backKey) {
      this.roverTargetSpeed = -10;
      this.stats.fuel = Math.max(0, this.stats.fuel - dt * 0.10);
    } else {
      this.roverTargetSpeed = 0;
    }

    if (handbrakeKey) {
      this.roverTargetSpeed *= 0.65;
    }

    if (!isOutOfFuel) {
      this.roverSpeed = THREE.MathUtils.lerp(
        this.roverSpeed,
        this.roverTargetSpeed,
        (forwardKey ? accelRate : 12) * dt
      );
    }

    // Rover Movement Kinematics
    const effectiveHeading = this.roverHeading + this.roverDriftAngle;
    this.roverX += Math.sin(effectiveHeading) * this.roverSpeed * dt;
    this.roverZ += Math.cos(effectiveHeading) * this.roverSpeed * dt;

    // Solid collision resolution against obstacles
    this.resolveRoverCollisions();

    // 4-Wheel Terrain Contact Heights
    const trackWidth = 2.4;
    const wheelbase = 2.8;
    const cosH = Math.cos(this.roverHeading);
    const sinH = Math.sin(this.roverHeading);

    const flY = getTerrainHeight(
      this.roverX + sinH * 1.4 - cosH * 1.2,
      this.roverZ + cosH * 1.4 + sinH * 1.2
    );
    const frY = getTerrainHeight(
      this.roverX + sinH * 1.4 + cosH * 1.2,
      this.roverZ + cosH * 1.4 - sinH * 1.2
    );
    const rlY = getTerrainHeight(
      this.roverX - sinH * 1.4 - cosH * 1.2,
      this.roverZ - cosH * 1.4 + sinH * 1.2
    );
    const rrY = getTerrainHeight(
      this.roverX - sinH * 1.4 + cosH * 1.2,
      this.roverZ - cosH * 1.4 - sinH * 1.2
    );

    const frontY = (flY + frY) / 2;
    const rearY = (rlY + rrY) / 2;
    const leftY = (flY + rlY) / 2;
    const rightY = (frY + rrY) / 2;
    const targetGroundY = (flY + frY + rlY + rrY + groundCenterY * 2) / 6;

    const newGroundY = getTerrainHeight(this.roverX, this.roverZ);
    const groundSlopeDiff = newGroundY - groundCenterY;

    // Controlled ridge launch: only launch off steep drop-offs at high speeds
    if (groundSlopeDiff < -2.2 && this.roverSpeed > 24 && !this.isRoverInAir) {
      this.isRoverInAir = true;
      this.roverVelY = Math.min(6.0, Math.max(2.5, (this.roverSpeed - 24) * 0.16));
    }

    if (this.isRoverInAir) {
      this.roverVelY -= 28 * dt; // Gravity in air
      this.roverY += this.roverVelY * dt;

      if (this.roverY <= targetGroundY) {
        // Cushioned landing impact
        this.roverY = targetGroundY;
        this.roverVelY = 0;
        this.isRoverInAir = false;
        this.cameraShake = 0.5;
        audioEngine.playRepairSound();
      }
    } else {
      // Damped suspension spring following terrain smoothly (eliminates jitter and seam spikes)
      this.roverY = THREE.MathUtils.damp(this.roverY, targetGroundY, 15, dt);
    }

    // Clamped pitch and roll: prevents flipping or spinning out
    const rawPitch = Math.atan2(frontY - rearY, wheelbase);
    const rawRoll = Math.atan2(leftY - rightY, trackWidth);
    const targetPitch = Math.max(-0.40, Math.min(0.40, rawPitch));
    const targetRoll = Math.max(-0.32, Math.min(0.32, rawRoll));

    this.roverPitch = THREE.MathUtils.damp(this.roverPitch, targetPitch, 8, dt);
    this.roverRoll = THREE.MathUtils.damp(this.roverRoll, targetRoll, 8, dt);

    // Rotate wheels based on rolling speed
    const wheelRot = (this.roverSpeed * dt * 2.5) / 0.72;
    this.wheels.forEach((w) => {
      w.rotation.x += wheelRot;
    });

    this.suspensionBounce = Math.sin(this.clock.getElapsedTime() * 12) * (this.roverSpeed > 3 ? 0.03 : 0.008);

    this.roverGroup.position.set(
      this.roverX,
      this.roverY + this.suspensionBounce,
      this.roverZ
    );
    this.roverGroup.rotation.y = this.roverHeading + this.roverDriftAngle * 0.5;
    this.roverGroup.rotation.x = -this.roverPitch;
    this.roverGroup.rotation.z = this.roverRoll + (isDrifting ? -this.roverSteerAngle * 0.12 : 0);

    const speedRatio = Math.abs(this.roverSpeed) / maxSpeed;
    audioEngine.updateEnginePitch(speedRatio, forwardKey);
    audioEngine.updateTireFriction(speedRatio, Boolean(isDrifting));
    audioEngine.updateWind(speedRatio);

    // Mag-Harvester Cyberware Auto-Collection (excludes footOnly sheltered caches)
    const harvesterImplant = this.cyberwareList.find((c) => c.slot === 'harvester' && c.installed);
    const autoRadius = harvesterImplant?.statBonus.autoHarvesterRadius || 0;
    if (autoRadius > 0) {
      this.autoHarvesterCooldown += dt;
      if (this.autoHarvesterCooldown > 0.4) {
        this.autoHarvesterCooldown = 0;
        this.salvageNodes3D.forEach((node) => {
          if (!node.data.collected && !node.data.footOnly) {
            const dist = Math.hypot(node.mesh.position.x - this.roverX, node.mesh.position.z - this.roverZ);
            if (dist < autoRadius) {
              node.data.collected = true;
              audioEngine.playScrapChime();
              this.callbacks.onCollectSalvage(node.data, false);
              this.scene.remove(node.mesh);
            }
          }
        });
      }
    }

    const kmDelta = (Math.abs(this.roverSpeed) * dt) / 1000;
    this.updateOdometerAndCityDistance(kmDelta);
  }

  // --- Completely Stable, Non-Inverting On-Foot Nomad Movement ---
  private updateOnFootCharacter(dt: number) {
    const forwardKey = this.keysHeld['KeyW'] || this.keysHeld['ArrowUp'];
    const backKey = this.keysHeld['KeyS'] || this.keysHeld['ArrowDown'];
    const leftKey = this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft'];
    const rightKey = this.keysHeld['KeyD'] || this.keysHeld['ArrowRight'];
    const sprintKey = this.keysHeld['ShiftLeft'] || this.keysHeld['ShiftRight'];

    const neuralImplant = this.cyberwareList.find((c) => c.slot === 'neural' && c.installed);
    const speedMult = neuralImplant?.statBonus.speedBonus || 1.0;
    const targetMaxSpeed = (sprintKey ? 13 : 7.2) * speedMult;

    // Fixed Camera-Relative World Vectors:
    // Forward direction from current camera yaw
    const forwardX = Math.sin(this.cameraYaw);
    const forwardZ = Math.cos(this.cameraYaw);

    // Screen Right direction in world space is (-forwardZ, 0, forwardX)
    const rightX = -forwardZ;
    const rightZ = forwardX;

    let moveX = 0;
    let moveZ = 0;

    if (forwardKey) {
      moveX += forwardX;
      moveZ += forwardZ;
    }
    if (backKey) {
      // Moves directly backwards towards screen without causing camera flip!
      moveX -= forwardX;
      moveZ -= forwardZ;
    }
    if (rightKey) {
      // Pressing D moves directly RIGHT on screen
      moveX += rightX;
      moveZ += rightZ;
    }
    if (leftKey) {
      // Pressing A moves directly LEFT on screen
      moveX -= rightX;
      moveZ -= rightZ;
    }

    const hasInput = moveX !== 0 || moveZ !== 0;

    if (hasInput) {
      const len = Math.hypot(moveX, moveZ);
      const normX = moveX / len;
      const normZ = moveZ / len;

      this.playerVelX = THREE.MathUtils.lerp(this.playerVelX, normX * targetMaxSpeed, dt * 9);
      this.playerVelZ = THREE.MathUtils.lerp(this.playerVelZ, normZ * targetMaxSpeed, dt * 9);

      // Character faces in the exact direction of travel!
      const targetHeading = Math.atan2(normX, normZ);
      let diff = targetHeading - this.playerHeading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerHeading += diff * Math.min(1, dt * 10);

      // Smoothly drift camera yaw to follow travel direction when moving forward or turning
      if (forwardKey) {
        let camDiff = targetHeading - this.cameraYaw;
        while (camDiff > Math.PI) camDiff -= Math.PI * 2;
        while (camDiff < -Math.PI) camDiff += Math.PI * 2;
        this.cameraYaw += camDiff * dt * 2.2;
      } else if (leftKey || rightKey) {
        let camDiff = targetHeading - this.cameraYaw;
        while (camDiff > Math.PI) camDiff -= Math.PI * 2;
        while (camDiff < -Math.PI) camDiff += Math.PI * 2;
        this.cameraYaw += camDiff * dt * 0.8;
      }
    } else {
      this.playerVelX = THREE.MathUtils.lerp(this.playerVelX, 0, dt * 10);
      this.playerVelZ = THREE.MathUtils.lerp(this.playerVelZ, 0, dt * 10);
    }

    const currentSpeed = Math.hypot(this.playerVelX, this.playerVelZ);

    this.playerX += this.playerVelX * dt;
    this.playerZ += this.playerVelZ * dt;

    // Solid collision resolution against all obstacles and the 4x4 Rover
    this.resolveNomadCollisions();

    // Ground & Jump Physics
    const terrainHeight = getTerrainHeight(this.playerX, this.playerZ);
    if (!this.isGrounded) {
      this.playerVelY -= 22 * dt;
      this.playerY += this.playerVelY * dt;

      if (this.playerY <= terrainHeight) {
        this.playerY = terrainHeight;
        this.playerVelY = 0;
        this.isGrounded = true;
      }
    } else {
      this.playerY = terrainHeight;
    }

    // Kinematics Articulation
    if (this.customPlayerMixer) {
      this.customPlayerMixer.update(dt);
    } else if (this.customPlayerModel && currentSpeed > 0.4 && this.isGrounded) {
      this.customPlayerModel.position.y = Math.sin(this.playerWalkCycle * 2) * 0.04;
    }

    if (currentSpeed > 0.4 && this.isGrounded) {
      const cadence = sprintKey ? 13 : 9;
      this.playerWalkCycle += dt * cadence;
      const stepPhase = Math.floor(this.playerWalkCycle / Math.PI);
      if (stepPhase !== this.lastStepPhase) {
        this.lastStepPhase = stepPhase;
        audioEngine.playFootstep();
      }
      const stride = Math.sin(this.playerWalkCycle);

      if (this.playerThighL && this.playerThighR && this.playerShinL && this.playerShinR) {
        this.playerThighL.rotation.x = stride * 0.7;
        this.playerThighR.rotation.x = -stride * 0.7;
        this.playerShinL.rotation.x = stride > 0 ? stride * 0.8 : 0.1;
        this.playerShinR.rotation.x = stride < 0 ? -stride * 0.8 : 0.1;
      }

      if (this.playerArmL && this.playerArmR) {
        this.playerArmL.rotation.x = -stride * 0.55;
        this.playerArmR.rotation.x = stride * 0.55;
      }

      if (this.playerTorso) {
        this.playerTorso.rotation.x = THREE.MathUtils.lerp(this.playerTorso.rotation.x, 0.14, dt * 6);
        this.playerTorso.position.y = 1.35 + Math.abs(Math.sin(this.playerWalkCycle * 2)) * 0.08;
      }
    } else {
      const breath = Math.sin(this.clock.getElapsedTime() * 2) * 0.02;
      if (this.playerThighL && this.playerThighR && this.playerShinL && this.playerShinR) {
        this.playerThighL.rotation.x = THREE.MathUtils.lerp(this.playerThighL.rotation.x, 0, dt * 8);
        this.playerThighR.rotation.x = THREE.MathUtils.lerp(this.playerThighR.rotation.x, 0, dt * 8);
        this.playerShinL.rotation.x = THREE.MathUtils.lerp(this.playerShinL.rotation.x, 0, dt * 8);
        this.playerShinR.rotation.x = THREE.MathUtils.lerp(this.playerShinR.rotation.x, 0, dt * 8);
      }
      if (this.playerArmL && this.playerArmR) {
        this.playerArmL.rotation.x = THREE.MathUtils.lerp(this.playerArmL.rotation.x, 0, dt * 8);
        this.playerArmR.rotation.x = THREE.MathUtils.lerp(this.playerArmR.rotation.x, 0, dt * 8);
      }
      if (this.playerTorso) {
        this.playerTorso.rotation.x = THREE.MathUtils.lerp(this.playerTorso.rotation.x, 0, dt * 8);
        this.playerTorso.position.y = 1.35 + breath;
      }
    }

    this.playerGroup.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerGroup.rotation.y = this.playerHeading;

    audioEngine.updateEnginePitch(0, false);
    audioEngine.updateTireFriction(0, false);
    audioEngine.updateWind(0);

    const kmDelta = (currentSpeed * dt) / 1000;
    this.updateOdometerAndCityDistance(kmDelta);
  }

  // --- Odometer & Closest City Telemetry ---
  private updateOdometerAndCityDistance(kmDelta: number) {
    if (kmDelta > 0) {
      this.stats.odometer += kmDelta;

      const activeX = this.isOnFoot ? this.playerX : this.roverX;
      const activeZ = this.isOnFoot ? this.playerZ : this.roverZ;

      const targetCity = this.worldCities[this.activeDestinationIndex % this.worldCities.length];
      const dist = Math.hypot(targetCity.x - activeX, targetCity.z - activeZ) / 1000;
      this.distanceToNextCity = dist;

      this.callbacks.onUpdateStats({
        odometer: this.stats.odometer,
        fuel: this.stats.fuel,
        battery: this.stats.battery,
        heat: this.stats.heat,
        speed: Math.round(this.isOnFoot ? 6 : this.roverSpeed * 3.6),
      });

      this.checkCityGateArrival();
    }
  }

  // --- Camera Update ---
  private updateCamera(dt: number) {
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 2.5);
    }
    const shakeX = (Math.random() - 0.5) * this.cameraShake * 0.5;
    const shakeY = (Math.random() - 0.5) * this.cameraShake * 0.5;

    if (this.isOnFoot) {
      // Smooth orbit camera using cameraYaw, NOT snapping to playerHeading!
      const distBehind = 7.5;
      const heightAbove = 3.6;
      const camX = this.playerX - Math.sin(this.cameraYaw) * distBehind + shakeX;
      const camZ = this.playerZ - Math.cos(this.cameraYaw) * distBehind;
      const groundAtCam = getTerrainHeight(camX, camZ);
      const camY = Math.max(groundAtCam + 1.6, this.playerY + heightAbove + shakeY);

      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, camX, dt * 6.5);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, camY, dt * 6.5);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, camZ, dt * 6.5);

      this.camera.lookAt(this.playerX, this.playerY + 1.6, this.playerZ);
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 60, dt * 4);
    } else {
      const groundAtRover = getTerrainHeight(this.roverX, this.roverZ);
      const targetFov = this.isBoosting ? 74 : 60 + (this.roverSpeed / 50) * 8;
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 5);

      if (this.cameraMode === 'chase') {
        const distBehind = 9.8;
        const heightAbove = 4.8;
        const camX = this.roverX - Math.sin(this.roverHeading) * distBehind + shakeX;
        const camZ = this.roverZ - Math.cos(this.roverHeading) * distBehind;
        const groundAtCam = getTerrainHeight(camX, camZ);
        const camY = Math.max(groundAtCam + 2.0, groundAtRover + heightAbove + shakeY);

        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, camX, dt * 6);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, camY, dt * 6);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, camZ, dt * 6);

        this.camera.lookAt(
          this.roverX + Math.sin(this.roverHeading) * 8,
          groundAtRover + 1.8,
          this.roverZ + Math.cos(this.roverHeading) * 8
        );
      } else if (this.cameraMode === 'cockpit') {
        this.camera.position.set(
          this.roverX + shakeX * 0.4,
          groundAtRover + 2.1,
          this.roverZ + shakeY * 0.4
        );
        this.camera.lookAt(
          this.roverX + Math.sin(this.roverHeading) * 30,
          groundAtRover + 1.5,
          this.roverZ + Math.cos(this.roverHeading) * 30
        );
      } else {
        const sideAngle = this.roverHeading + Math.PI / 2.5;
        const camX = this.roverX + Math.sin(sideAngle) * 7.5 + shakeX;
        const camZ = this.roverZ + Math.cos(sideAngle) * 7.5;
        const camY = groundAtRover + 2.4 + shakeY;

        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, camX, dt * 4);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, camY, dt * 4);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, camZ, dt * 4);

        this.camera.lookAt(this.roverX, groundAtRover + 1.2, this.roverZ);
      }
    }

    this.camera.updateProjectionMatrix();

    if (this.dustParticles) {
      this.dustParticles.position.set(this.camera.position.x, 0, this.camera.position.z);
    }
  }

  // --- Update Entities & Procedural Badland Resources ---
  private updateEntities(dt: number) {
    const charX = this.isOnFoot ? this.playerX : this.roverX;
    const charZ = this.isOnFoot ? this.playerZ : this.roverZ;
    const pickupRadius = this.isOnFoot ? 2.4 : 3.8;

    // 1. Update Salvage Nodes Animation & Direct Contact Collection
    this.salvageNodes3D.forEach((node) => {
      if (node.data.collected) return;
      node.mesh.rotation.y += dt * 1.5;

      // Special rotation for tech_core floating rings
      if (node.data.type === 'tech_core') {
        const ringOuter = node.mesh.getObjectByName('ring_outer');
        if (ringOuter) ringOuter.rotation.x += dt * 2.5;
        const floatingCore = node.mesh.getObjectByName('floating_core');
        if (floatingCore) {
          floatingCore.rotation.z += dt * 1.8;
          floatingCore.position.y = Math.sin(this.clock.getElapsedTime() * 3) * 0.15;
        }
      }

      // Contact collection
      const dist = Math.hypot(node.mesh.position.x - charX, node.mesh.position.z - charZ);
      if (dist < pickupRadius) {
        if (node.data.footOnly && !this.isOnFoot) {
          // Sheltered inside tight wreckage: requires Nomad on-foot
          return;
        }
        node.data.collected = true;
        audioEngine.playScrapChime();
        if (node.data.type === 'tech_core') {
          this.callbacks.onCollectTechCore?.(node.data);
        }
        this.callbacks.onCollectSalvage(node.data, this.isOnFoot);
        this.scene.remove(node.mesh);
      }
    });

    // 2. Update Raider Drone Patrols
    this.enemies3D.forEach((enemy) => {
      if (!enemy.data.disabled) {
        enemy.mesh.position.x += enemy.data.speedX * dt;
        enemy.mesh.position.z += enemy.data.speedZ * dt;

        const groundY = getTerrainHeight(enemy.mesh.position.x, enemy.mesh.position.z);
        enemy.mesh.position.y = groundY + 2.5 + Math.sin(this.clock.getElapsedTime() * 4) * 0.4;

        if (!this.isOnFoot) {
          const dist = Math.hypot(enemy.mesh.position.x - this.roverX, enemy.mesh.position.z - this.roverZ);
          if (dist < 3.6) {
            this.disableEnemy(enemy);
            if (this.upgrades.hullLevel >= 2) {
              this.cameraShake = 0.5;
            } else {
              this.callbacks.onVehicleDamage(12, 'Scavenger Drone Collision');
              this.cameraShake = 0.8;
            }
          }
        }
      }
    });

    // 3. Moderate Procedural Resource & Patrol Spawning along the wasteland
    this.updateProceduralResources(dt, charX, charZ);
  }

  // --- Moderate Procedural Badlands Resource & Drone Spawning ---
  private updateProceduralResources(dt: number, charX: number, charZ: number) {
    this.proceduralSpawnTimer += dt;
    if (this.proceduralSpawnTimer < 1.2) return;
    this.proceduralSpawnTimer = 0;

    // Prune distant nodes (> 380m) to maintain lightweight memory
    for (let i = this.salvageNodes3D.length - 1; i >= 0; i--) {
      const node = this.salvageNodes3D[i];
      if (node.data.collected) continue;
      const dist = Math.hypot(node.mesh.position.x - charX, node.mesh.position.z - charZ);
      if (dist > 380 && !node.data.id.startsWith('starter_')) {
        this.scene.remove(node.mesh);
        this.salvageNodes3D.splice(i, 1);
      }
    }

    // Moderate resource density: maintain 8 to 12 active resource caches around player
    const activeNearbyResources = this.salvageNodes3D.filter(
      (n) => !n.data.collected && Math.hypot(n.mesh.position.x - charX, n.mesh.position.z - charZ) < 260
    ).length;

    if (activeNearbyResources < 9) {
      const spawnCount = Math.min(4, 9 - activeNearbyResources);
      for (let k = 0; k < spawnCount; k++) {
        // Spawn ahead in travel cone (or around player if stationary)
        const travelAngle = this.roverHeading + (Math.random() - 0.5) * 1.6;
        const dist = 65 + Math.random() * 140;
        const spawnX = charX + Math.sin(travelAngle) * dist;
        const spawnZ = charZ + Math.cos(travelAngle) * dist;

        // Alternate moderately between fuel canister and scrap metal
        const isFuel = Math.random() < 0.45;
        this.spawnSalvageNode({
          id: `proc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          x: spawnX,
          z: spawnZ,
          type: isFuel ? 'fuel_canister' : 'scrap_pile',
          collected: false,
          value: isFuel ? 35 : 25 + Math.floor(Math.random() * 15),
          label: isFuel ? 'Pressurized Fuel Canister' : 'Scrap Metal Debris',
        });
      }
    }

    // Maintain 2-3 patrol drones in badland corridors
    const activeNearbyDrones = this.enemies3D.filter(
      (e) => !e.data.disabled && Math.hypot(e.mesh.position.x - charX, e.mesh.position.z - charZ) < 300
    ).length;

    if (activeNearbyDrones < 2) {
      const droneAngle = this.roverHeading + (Math.random() - 0.5) * 2.0;
      const droneDist = 110 + Math.random() * 80;
      this.spawnEnemy({
        id: `patrol_drone_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        x: charX + Math.sin(droneAngle) * droneDist,
        z: charZ + Math.cos(droneAngle) * droneDist,
        speedZ: (Math.random() - 0.5) * 6,
        speedX: (Math.random() - 0.5) * 6,
        health: 30,
        type: 'drone',
        disabled: false,
      });
    }
  }

  // --- EMP Shockwave ---
  private updateEmpShockwave(dt: number) {
    if (!this.empWaveActive || !this.empWaveMesh) return;
    const maxRadius = 25 + this.upgrades.empLevel * 10;
    this.empWaveRadius += dt * 45;
    this.empWaveMesh.scale.set(this.empWaveRadius, this.empWaveRadius, 1);

    const progress = this.empWaveRadius / maxRadius;
    (this.empWaveMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 * (1 - progress));

    if (progress >= 1) {
      this.empWaveActive = false;
      (this.empWaveMesh.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public dispose() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('resize', this.onWindowResize);

    this.terrainManager.dispose();
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
