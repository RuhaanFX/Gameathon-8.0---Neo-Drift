import * as THREE from 'three';
import { SceneObstacle } from '../types/game';

/**
 * 2D Value Noise & Fractional Brownian Motion for infinite fantasy cyberpunk terrain
 */
function hash(x: number, z: number): number {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, z: number): number {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const fx = x - i;
  const fz = z - j;

  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);

  const a = hash(i, j);
  const b = hash(i + 1, j);
  const c = hash(i, j + 1);
  const d = hash(i + 1, j + 1);

  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function getTerrainHeight(x: number, z: number): number {
  const scale1 = 0.007;
  const scale2 = 0.018;
  const scale3 = 0.045;

  const n1 = smoothNoise(x * scale1, z * scale1) * 26; // Rolling hills & dunes
  const n2 = smoothNoise(x * scale2, z * scale2) * 10; // Ramps and ridges for jumps!
  const n3 = smoothNoise(x * scale3, z * scale3) * 2.8;

  return n1 + n2 + n3;
}

export function getTerrainNormal(x: number, z: number): THREE.Vector3 {
  const eps = 0.5;
  const hL = getTerrainHeight(x - eps, z);
  const hR = getTerrainHeight(x + eps, z);
  const hD = getTerrainHeight(x, z - eps);
  const hU = getTerrainHeight(x, z + eps);

  const normal = new THREE.Vector3(hL - hR, 2 * eps, hD - hU);
  return normal.normalize();
}

export class TerrainChunkManager {
  public scene: THREE.Scene;
  public chunkSize = 90;
  public gridRadius = 2; // 5x5 chunks around player
  private chunks = new Map<string, { mesh: THREE.Mesh; props: THREE.Group; obstacles: SceneObstacle[] }>();

  // Shared Materials
  private groundMat: THREE.MeshStandardMaterial;
  private crystalMatCyan: THREE.MeshStandardMaterial;
  private crystalMatAmber: THREE.MeshStandardMaterial;
  private ruinMat: THREE.MeshStandardMaterial;
  private neonBarMat: THREE.MeshBasicMaterial;
  private solarPanelMat: THREE.MeshStandardMaterial;
  private bioFungusMat: THREE.MeshStandardMaterial;
  private foliageMat: THREE.MeshStandardMaterial;
  private corpoHullMat: THREE.MeshStandardMaterial;
  private corpoHazardMat: THREE.MeshStandardMaterial;
  private repulsorGlowMat: THREE.MeshBasicMaterial;
  private serverGreenMat: THREE.MeshBasicMaterial;
  private fiberMagentaMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Ground canvas texture with stone marbling & glowing cyber-lichen
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 512;
    groundCanvas.height = 512;
    const ctx = groundCanvas.getContext('2d')!;

    ctx.fillStyle = '#0a0d17';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 700; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const radius = 1 + Math.random() * 3.5;
      ctx.fillStyle = Math.random() > 0.6 ? '#141a2b' : '#1d2539';
      ctx.beginPath();
      ctx.arc(rx, ry, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineWidth = 1.5;
    for (let line = 0; line < 60; line++) {
      ctx.strokeStyle = line % 2 === 0 ? 'rgba(6, 182, 212, 0.32)' : 'rgba(245, 158, 11, 0.25)';
      ctx.beginPath();
      let cx = Math.random() * 512;
      let cy = Math.random() * 512;
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) {
        cx += (Math.random() - 0.5) * 45;
        cy += (Math.random() - 0.5) * 45;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(6, 6);
    groundTex.colorSpace = THREE.SRGBColorSpace;

    this.groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.85,
      metalness: 0.2,
      flatShading: true,
    });

    this.crystalMatCyan = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.9,
    });

    this.crystalMatAmber = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.9,
    });

    this.ruinMat = new THREE.MeshStandardMaterial({
      color: 0x1e2433,
      roughness: 0.5,
      metalness: 0.7,
    });

    this.neonBarMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    this.solarPanelMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.45,
      metalness: 0.9,
      roughness: 0.2,
    });

    this.bioFungusMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x9333ea,
      emissiveIntensity: 0.75,
      roughness: 0.3,
      metalness: 0.4,
    });

    this.foliageMat = new THREE.MeshStandardMaterial({
      color: 0x0d9488,
      emissive: 0x0f766e,
      emissiveIntensity: 0.4,
      roughness: 0.4,
      metalness: 0.3,
    });

    this.corpoHullMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.35,
      metalness: 0.85,
    });

    this.corpoHazardMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xe11d48,
      emissiveIntensity: 0.3,
      roughness: 0.4,
      metalness: 0.6,
    });

    this.repulsorGlowMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.85,
    });

    this.serverGreenMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
    });

    this.fiberMagentaMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      emissive: 0xdb2777,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.8,
    });
  }

  public update(playerX: number, playerZ: number, isSoftwareGl: boolean) {
    const currentChunkX = Math.floor(playerX / this.chunkSize);
    const currentChunkZ = Math.floor(playerZ / this.chunkSize);

    const neededKeys = new Set<string>();

    for (let cx = currentChunkX - this.gridRadius; cx <= currentChunkX + this.gridRadius; cx++) {
      for (let cz = currentChunkZ - this.gridRadius; cz <= currentChunkZ + this.gridRadius; cz++) {
        const key = `${cx},${cz}`;
        neededKeys.add(key);

        if (!this.chunks.has(key)) {
          this.buildChunk(cx, cz, isSoftwareGl);
        }
      }
    }

    for (const [key, chunk] of this.chunks.entries()) {
      if (!neededKeys.has(key)) {
        this.scene.remove(chunk.mesh);
        this.scene.remove(chunk.props);
        chunk.mesh.geometry.dispose();
        chunk.props.traverse((child) => {
          if (child instanceof THREE.Mesh) child.geometry?.dispose();
        });
        this.chunks.delete(key);
      }
    }
  }

  public getAllObstacles(): SceneObstacle[] {
    const all: SceneObstacle[] = [];
    for (const chunk of this.chunks.values()) {
      for (const obs of chunk.obstacles) {
        all.push(obs);
      }
    }
    return all;
  }

  private buildChunk(cx: number, cz: number, isSoftwareGl: boolean) {
    const segments = isSoftwareGl ? 14 : 22;
    const geom = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, segments, segments);
    geom.rotateX(-Math.PI / 2);

    const originX = cx * this.chunkSize;
    const originZ = cz * this.chunkSize;

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i) + originX;
      const vz = pos.getZ(i) + originZ;
      pos.setY(i, getTerrainHeight(vx, vz));
    }
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, this.groundMat);
    mesh.position.set(originX, 0, originZ);
    mesh.receiveShadow = !isSoftwareGl;
    this.scene.add(mesh);

    const propsGroup = new THREE.Group();
    propsGroup.position.set(originX, 0, originZ);

    const obstacles: SceneObstacle[] = [];

    const seed = Math.sin(cx * 43.1 + cz * 83.7) * 10000;
    const rng = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    // 1. Crashed Corporate Hover-Hauler (Tech Relic replacing generic rocks)
    if (rng(10) > 0.65) {
      const px = (rng(11) - 0.5) * (this.chunkSize - 26);
      const pz = (rng(12) - 0.5) * (this.chunkSize - 26);
      const py = getTerrainHeight(originX + px, originZ + pz);

      const haulerGroup = new THREE.Group();
      haulerGroup.position.set(px, py + 1.2, pz);
      haulerGroup.rotation.y = rng(13) * Math.PI * 2;
      haulerGroup.rotation.z = 0.15;

      // Heavy fractured fuselage
      const fuselageGeom = new THREE.BoxGeometry(4.6, 2.6, 8.5);
      const fuselage = new THREE.Mesh(fuselageGeom, this.corpoHullMat);
      fuselage.position.y = 1.3;
      haulerGroup.add(fuselage);

      // Hazard trim plating
      const hazardPlateGeom = new THREE.BoxGeometry(4.7, 0.4, 6.0);
      const hazardPlate = new THREE.Mesh(hazardPlateGeom, this.corpoHazardMat);
      hazardPlate.position.set(0, 1.8, 0);
      haulerGroup.add(hazardPlate);

      // Exposed Glowing Antigrav Repulsor Coils
      [-2.8, 2.8].forEach((offsetZ) => {
        const ringGeom = new THREE.TorusGeometry(1.6, 0.22, 8, 20);
        ringGeom.rotateX(Math.PI / 2);
        const ring = new THREE.Mesh(ringGeom, this.repulsorGlowMat);
        ring.position.set(0, 0.2, offsetZ);
        haulerGroup.add(ring);
      });

      // Smoke wisp indicator
      const smokeGeom = new THREE.SphereGeometry(0.8, 6, 6);
      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.35,
      });
      const smoke = new THREE.Mesh(smokeGeom, smokeMat);
      smoke.position.set(0.8, 3.2, 1.5);
      haulerGroup.add(smoke);

      propsGroup.add(haulerGroup);
      obstacles.push({
        x: originX + px,
        z: originZ + pz,
        radius: 4.8,
        name: 'Crashed Hover-Hauler',
      });
    }

    // 2. Abandoned Underground Server Bunkers
    if (rng(30) > 0.68) {
      const px = (rng(31) - 0.5) * (this.chunkSize - 22);
      const pz = (rng(32) - 0.5) * (this.chunkSize - 22);
      const py = getTerrainHeight(originX + px, originZ + pz);

      const bunkerGroup = new THREE.Group();
      bunkerGroup.position.set(px, py, pz);
      bunkerGroup.rotation.y = rng(33) * Math.PI * 2;

      // Reinforced concrete entrance frame
      const frameGeom = new THREE.BoxGeometry(6.4, 3.2, 5.0);
      const frame = new THREE.Mesh(frameGeom, this.ruinMat);
      frame.position.set(0, 1.6, 0);
      bunkerGroup.add(frame);

      // Angled heavy blast hatch
      const hatchGeom = new THREE.BoxGeometry(4.0, 0.4, 3.5);
      const hatch = new THREE.Mesh(hatchGeom, this.corpoHazardMat);
      hatch.position.set(0, 2.2, 0.8);
      hatch.rotation.x = 0.4;
      bunkerGroup.add(hatch);

      // Server rack LED cluster
      for (let r = 0; r < 4; r++) {
        const ledGeom = new THREE.BoxGeometry(0.3, 0.15, 0.1);
        const led = new THREE.Mesh(ledGeom, r % 2 === 0 ? this.serverGreenMat : this.crystalMatAmber);
        led.position.set(-1.2 + r * 0.8, 1.4, 2.55);
        bunkerGroup.add(led);
      }

      propsGroup.add(bunkerGroup);
      obstacles.push({
        x: originX + px,
        z: originZ + pz,
        radius: 4.2,
        name: 'Underground Server Bunker',
      });
    }

    // 3. Abandoned Drone Recharge Towers
    if (rng(60) > 0.6) {
      const px = (rng(61) - 0.5) * (this.chunkSize - 18);
      const pz = (rng(62) - 0.5) * (this.chunkSize - 18);
      const py = getTerrainHeight(originX + px, originZ + pz);

      const towerGroup = new THREE.Group();
      towerGroup.position.set(px, py, pz);

      // Hexagonal structural mast
      const mastGeom = new THREE.CylinderGeometry(0.65, 1.1, 14, 6);
      const mast = new THREE.Mesh(mastGeom, this.corpoHullMat);
      mast.position.y = 7;
      towerGroup.add(mast);

      // Cantilever docking arms
      for (let a = 0; a < 3; a++) {
        const angle = (a * Math.PI * 2) / 3;
        const armGeom = new THREE.BoxGeometry(0.3, 0.4, 2.8);
        const arm = new THREE.Mesh(armGeom, this.ruinMat);
        arm.position.set(Math.cos(angle) * 1.5, 12.8, Math.sin(angle) * 1.5);
        arm.rotation.y = angle;
        towerGroup.add(arm);
      }

      // Blinking red aviation warning beacon at apex
      const beaconGeom = new THREE.SphereGeometry(0.35, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const beacon = new THREE.Mesh(beaconGeom, beaconMat);
      beacon.position.y = 14.5;
      towerGroup.add(beacon);

      propsGroup.add(towerGroup);
      obstacles.push({
        x: originX + px,
        z: originZ + pz,
        radius: 2.2,
        name: 'Drone Recharge Tower',
      });
    }

    // 4. Looming Server Monoliths
    if (rng(90) > 0.58) {
      const px = (rng(91) - 0.5) * (this.chunkSize - 20);
      const pz = (rng(92) - 0.5) * (this.chunkSize - 20);
      const py = getTerrainHeight(originX + px, originZ + pz);

      const monolithGroup = new THREE.Group();
      monolithGroup.position.set(px, py, pz);
      monolithGroup.rotation.y = rng(93) * Math.PI;

      // Dark obsidian server slab
      const slabGeom = new THREE.BoxGeometry(2.4, 11, 2.4);
      const slab = new THREE.Mesh(slabGeom, this.corpoHullMat);
      slab.position.y = 5.5;
      monolithGroup.add(slab);

      // Vertical pulsing cyan LED data bus strips on all 4 faces
      const stripVGeom = new THREE.BoxGeometry(0.12, 9.8, 0.05);
      [-1.18, 1.18].forEach((zOff) => {
        const strip = new THREE.Mesh(stripVGeom, this.neonBarMat);
        strip.position.set(0, 5.5, zOff);
        monolithGroup.add(strip);
      });

      const stripHGeom = new THREE.BoxGeometry(0.05, 9.8, 0.12);
      [-1.18, 1.18].forEach((xOff) => {
        const strip = new THREE.Mesh(stripHGeom, this.neonBarMat);
        strip.position.set(xOff, 5.5, 0);
        monolithGroup.add(strip);
      });

      propsGroup.add(monolithGroup);
      obstacles.push({
        x: originX + px,
        z: originZ + pz,
        radius: 2.4,
        name: 'Server Monolith',
      });
    }

    // 5. Tangled Fiber-Optic Cable Trees
    if (rng(150) > 0.5) {
      const px = (rng(151) - 0.5) * (this.chunkSize - 18);
      const pz = (rng(152) - 0.5) * (this.chunkSize - 18);
      const py = getTerrainHeight(originX + px, originZ + pz);

      const treeGroup = new THREE.Group();
      treeGroup.position.set(px, py, pz);

      // Conduit trunk
      const trunkGeom = new THREE.CylinderGeometry(0.4, 0.8, 6.5, 7);
      const trunk = new THREE.Mesh(trunkGeom, this.ruinMat);
      trunk.position.y = 3.25;
      treeGroup.add(trunk);

      // Tangled glowing fiber optic cables
      for (let b = 0; b < 6; b++) {
        const angle = (b * Math.PI * 2) / 6;
        const branchGeom = new THREE.BoxGeometry(0.12, 3.2, 0.12);
        const mat = b % 2 === 0 ? this.crystalMatCyan : this.fiberMagentaMat;
        const branch = new THREE.Mesh(branchGeom, mat);
        branch.position.set(Math.cos(angle) * 1.2, 5.2, Math.sin(angle) * 1.2);
        branch.rotation.set(Math.sin(angle) * 0.45, 0, Math.cos(angle) * 0.45);
        treeGroup.add(branch);
      }

      propsGroup.add(treeGroup);
      obstacles.push({
        x: originX + px,
        z: originZ + pz,
        radius: 1.8,
        name: 'Fiber-Optic Tree',
      });
    }

    // 6. Bioluminescent Crystal Clusters
    const clusterCount = 1 + (rng(1) > 0.5 ? 1 : 0);
    for (let k = 0; k < clusterCount; k++) {
      const px = (rng(2 + k * 10) - 0.5) * (this.chunkSize - 16);
      const pz = (rng(3 + k * 10) - 0.5) * (this.chunkSize - 16);
      const py = getTerrainHeight(originX + px, originZ + pz);

      const cluster = new THREE.Group();
      cluster.position.set(px, py, pz);

      const count = 3 + Math.floor(rng(4 + k) * 4);
      const isAmber = rng(5 + k) > 0.5;
      const crystalMat = isAmber ? this.crystalMatAmber : this.crystalMatCyan;

      for (let c = 0; c < count; c++) {
        const height = 2.2 + rng(6 + c + k) * 4;
        const crystalGeom = new THREE.ConeGeometry(0.45, height, 5);
        const crystal = new THREE.Mesh(crystalGeom, crystalMat);
        crystal.position.set((rng(10 + c) - 0.5) * 3, height / 2, (rng(20 + c) - 0.5) * 3);
        crystal.rotation.set((rng(30 + c) - 0.5) * 0.35, rng(40 + c) * Math.PI, (rng(50 + c) - 0.5) * 0.35);
        cluster.add(crystal);
      }
      propsGroup.add(cluster);
    }

    // 7. Ruined Highway Overpasses & Jump Ramps
    if (rng(50) > 0.55) {
      const px = (rng(51) - 0.5) * (this.chunkSize - 24);
      const pz = (rng(52) - 0.5) * (this.chunkSize - 24);
      const py = getTerrainHeight(originX + px, originZ + pz);

      const overpassGroup = new THREE.Group();
      overpassGroup.position.set(px, py + 1.2, pz);
      overpassGroup.rotation.y = rng(53) * Math.PI;

      const slabGeom = new THREE.BoxGeometry(8, 0.8, 24);
      const slab = new THREE.Mesh(slabGeom, this.ruinMat);
      slab.position.y = 4.2;
      slab.rotation.x = 0.22;
      overpassGroup.add(slab);

      const colGeom = new THREE.CylinderGeometry(0.8, 1.0, 9, 8);
      const col = new THREE.Mesh(colGeom, this.ruinMat);
      col.position.set(0, 2.5, -4);
      overpassGroup.add(col);

      const railGeom = new THREE.BoxGeometry(0.2, 0.3, 24);
      const railL = new THREE.Mesh(railGeom, this.neonBarMat);
      railL.position.set(-3.9, 4.9, 0);
      railL.rotation.x = 0.22;
      overpassGroup.add(railL);

      propsGroup.add(overpassGroup);

      // Register solid column collision
      obstacles.push({
        x: originX + px,
        z: originZ + pz - 4,
        radius: 2.2,
        name: 'Overpass Column',
      });
    }

    // 8. Ancient Solar Collector Arrays
    if (rng(120) > 0.6) {
      const px = (rng(121) - 0.5) * (this.chunkSize - 20);
      const pz = (rng(122) - 0.5) * (this.chunkSize - 20);
      const py = getTerrainHeight(originX + px, originZ + pz);

      const dishGroup = new THREE.Group();
      dishGroup.position.set(px, py, pz);

      const poleGeom = new THREE.CylinderGeometry(0.25, 0.4, 6, 8);
      const pole = new THREE.Mesh(poleGeom, this.ruinMat);
      pole.position.y = 3;
      dishGroup.add(pole);

      const dishGeom = new THREE.CylinderGeometry(3.5, 0.5, 0.8, 12);
      const dish = new THREE.Mesh(dishGeom, this.solarPanelMat);
      dish.position.y = 6.2;
      dish.rotation.x = -0.55;
      dish.rotation.y = rng(123) * Math.PI;
      dishGroup.add(dish);

      propsGroup.add(dishGroup);
      obstacles.push({
        x: originX + px,
        z: originZ + pz,
        radius: 1.8,
        name: 'Solar Array Pylon',
      });
    }

    // 9. Dense Neon Fern & Shrub Patches
    for (let f = 0; f < 2; f++) {
      if (rng(400 + f) > 0.4) {
        const px = (rng(410 + f) - 0.5) * (this.chunkSize - 14);
        const pz = (rng(420 + f) - 0.5) * (this.chunkSize - 14);
        const py = getTerrainHeight(originX + px, originZ + pz);

        const bushGeom = new THREE.DodecahedronGeometry(1.2, 0);
        const bush = new THREE.Mesh(bushGeom, this.foliageMat);
        bush.position.set(px, py + 0.8, pz);
        bush.scale.set(1.4, 0.7, 1.4);
        propsGroup.add(bush);
      }
    }

    this.scene.add(propsGroup);
    this.chunks.set(`${cx},${cz}`, { mesh, props: propsGroup, obstacles });
  }

  public dispose() {
    for (const chunk of this.chunks.values()) {
      this.scene.remove(chunk.mesh);
      this.scene.remove(chunk.props);
      chunk.mesh.geometry.dispose();
      chunk.props.traverse((child) => {
        if (child instanceof THREE.Mesh) child.geometry?.dispose();
      });
    }
    this.chunks.clear();
  }
}

