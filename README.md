# NEO DRIFT 2088 - Local Development & Custom Asset Guide

## 🚀 1. Local Setup & Installation

### Prerequisites
- **Node.js**: v18.0.0+ or v20.0.0+ (recommended)
- **npm**: v9+ (or `pnpm` / `bun`)

### Quick Start
```bash
# 1. Clone the repository (or extract downloaded zip)
git clone <repository-url>
cd neo-drift-2088

# 2. Install dependencies
npm install

# 3. Start the local development server
npm run dev
```

The game will be running at **`http://localhost:3000`** with Hot Module Reloading (HMR).

### Building for Production
```bash
npm run build
npm run preview
```

---

## 🎨 2. Zero-Code Custom Assets (Drop & Play)

The game includes **smart auto-scaling asset loaders**. Simply drop your `.glb` 3D files or `.png`/`.jpg` images into the designated `public/` subfolders with the names below — **no code edits required!**

Directory structure:
```text
public/
├── models/      # 3D models (.glb, .gltf)
├── textures/    # Image textures (.png, .jpg, .webp)
└── audio/       # Music & SFX (.mp3, .ogg, .wav)
```

---

### A. 3D Models (`public/models/`)
The engine automatically calculates bounding boxes, centers your models at origin, auto-scales them to real-world dimensions, lifts them to ground level, and hides the default procedural blocks.

| What you want to replace | Name your file | Auto-sizing & Behavior |
| :--- | :--- | :--- |
| **Rover Vehicle** | `colony_rover.glb` or `rover.glb` | Auto-fits to ~4.8m length, wheels aligned to terrain, shadows on. |
| **Nomad Player** (On-Foot) | `player.glb` or `character.glb` | Auto-fits to ~1.85m human height, plays embedded animations. |
| **Salvage & Resources** | `salvage.glb` or `crate.glb` or `scrap.glb` | Auto-fits to ~1.4m, replaces scrap and battery caches in world. |
| **Raider Drones & Enemies** | `enemy.glb` or `drone.glb` or `raider.glb` | Auto-fits to ~2.0m, replaces procedural enemy drones. |

---

### B. Terrain Billboards & Advertisements (`public/textures/`)
Images dropped here automatically replace the procedural holographic cyberpunk advertisements on the roadside towers.

| Target Billboard | Name your file | Recommended Aspect Ratio |
| :--- | :--- | :--- |
| **Billboard #1** | `billboard_1.png` or `billboard1.png` or `ad_1.png` | 2:1 (e.g. 1024x512) |
| **Billboard #2** | `billboard_2.png` or `billboard2.png` or `ad_2.png` | 2:1 (e.g. 1024x512) |
| **Billboard #3** | `billboard_3.png` or `billboard3.png` or `ad_3.png` | 2:1 (e.g. 1024x512) |
| **All Billboards (Default)** | `billboard.png` | 2:1 (e.g. 1024x512) |

---

### C. Radio Music Tracks (`public/audio/`)
Place any `.mp3` or `.ogg` tracks into `public/audio/` (e.g. `track1.mp3`).
In `src/audio/audioEngine.ts`, hook it up with:
```ts
const radioAudio = new Audio('/audio/track1.mp3');
radioAudio.loop = true;
radioAudio.volume = 0.6;
radioAudio.play();
```

---

### D. Customizing Story, Locations & Upgrades
- **`src/data/gameContent.ts`**: Contains all city waypoints (`CITIES`), story logs (`STORY_LOGS`), hacking targets, and starting items.
- **`src/types/game.ts`**: Contains TypeScript definitions for vehicle upgrades, cyberware, radio stations, and events.
