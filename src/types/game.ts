export type GameState = 'title' | 'driving' | 'city' | 'paused' | 'gameover' | 'ending';

export interface VehicleStats {
  speed: number;
  maxSpeed: number;
  acceleration: number;
  health: number; // 0 - 100
  maxHealth: number;
  fuel: number; // 0 - 100
  battery: number; // 0 - 100
  heat: number; // 0 - 100 (overheat risk)
  scrap: number; // currency
  spareParts: number; // repair items
  odometer: number; // total km travelled
}

export interface VehicleUpgrades {
  hullLevel: number; // 1 to 4
  engineLevel: number; // 1 to 4
  suspensionLevel: number; // 1 to 4
  empLevel: number; // 1 to 4
  solarLevel: number; // 1 to 3
  droneLevel: number; // 1 to 3
}

export interface UpgradeItem {
  id: string;
  name: string;
  category: 'hull' | 'engine' | 'suspension' | 'emp' | 'solar' | 'drone';
  tier: number;
  costScrap: number;
  costParts: number;
  description: string;
  statBonus: string;
}

export type MechanicalFailureType = 'none' | 'overheat' | 'alternator' | 'puncture' | 'emp_glitch' | 'cracked_fuel_line';

export interface MechanicalFailure {
  type: MechanicalFailureType;
  title: string;
  description: string;
  solutionText: string;
  severity: 'low' | 'medium' | 'critical';
}

export interface StoryDialogue {
  id: string;
  speaker: string;
  role?: string;
  channel?: string;
  text: string;
  priority?: 'normal' | 'urgent';
  timestamp?: string;
  autoCloseSec?: number;
}

export type DroneUpgradeChoice = 'speed' | 'durability' | 'efficiency' | 'emp';

export interface SalvageNode {
  id: string;
  x: number;
  z: number;
  type: 'scrap_pile' | 'power_cell' | 'data_relic' | 'nanite_cache' | 'fuel_canister' | 'tech_core';
  collected: boolean;
  value: number;
  label: string;
  footOnly?: boolean;
}

export interface RaiderEnemy {
  id: string;
  x: number;
  z: number;
  speedZ: number;
  speedX: number;
  health: number;
  type: 'drone' | 'buggy' | 'turret';
  disabled: boolean;
}

export interface CityData {
  id: string;
  name: string;
  subtitle: string;
  chapterNumber: number;
  distanceKm: number; // Target distance marker
  loreSnippet: string;
  missionBrief: string;
  garageGreeting: string;
  cantinaDialogue: {
    speaker: string;
    role: string;
    text: string;
  }[];
}

export interface StoryLog {
  id: string;
  unlockedAtKm: number;
  title: string;
  author: string;
  timestamp: string;
  content: string;
  isRead: boolean;
  chapter?: number;
  isSecret?: boolean;
}

export type WeatherType = 'neon_twilight' | 'acid_rain' | 'data_storm' | 'calm_midnight';

export interface SceneObstacle {
  x: number;
  z: number;
  radius: number;
  name: string;
  isDynamic?: boolean;
}

// --- Cyberware & Ripperdoc Implants ---
export type CyberwareSlot = 'optics' | 'neural' | 'subdermal' | 'chassis' | 'cyberdeck' | 'harvester';

export interface CyberwareItem {
  id: string;
  name: string;
  slot: CyberwareSlot;
  tier: number;
  costScrap: number;
  costParts: number;
  installed: boolean;
  brand: string;
  description: string;
  perkSummary: string;
  statBonus: {
    scanRangeBonus?: number;
    speedBonus?: number;
    armorReduction?: number;
    hackTimeBonusSec?: number;
    bufferSlotsBonus?: number;
    autoHarvesterRadius?: number;
  };
}

// --- Cyberdeck Hacking & Breach Protocol ---
export interface HackingDaemon {
  id: string;
  name: string;
  sequence: string[];
  rewardDescription: string;
  completed: boolean;
  scrapReward: number;
  partsReward: number;
  batteryReward: number;
  storyLogId?: string;
}

export interface HackingTarget {
  id: string;
  title: string;
  securityFirm: string;
  type: 'corpo_terminal' | 'military_safe' | 'drone_core' | 'substation_grid' | 'relay_core' | 'foundry_mainframe' | 'archive_vault' | 'gate_master';
  difficulty: 'easy' | 'medium' | 'hard';
  matrixSize: number;
  bufferSize: number;
  timeLimitSec: number;
  daemons: HackingDaemon[];
  isHacked: boolean;
  x: number;
  z: number;
  environmentalClue?: string;
  requiredCode?: string;
}

// --- Connected Campaign State & Objectives ---
export type DestinationId = 'relay' | 'foundry' | 'archive' | 'gate';

export type DestinationStage =
  // Destination 1: The Relay
  | 'inspect_dashboard'
  | 'scavenge_wreckage'
  | 'repair_mule'
  | 'reach_relay'
  | 'restore_relay_power'
  | 'hack_relay_terminal'
  | 'relay_completed'
  // En Route 1 -> 2
  | 'drive_to_foundry'
  // Destination 2: The Foundry
  | 'reach_foundry'
  | 'investigate_foundry_memo'
  | 'disable_foundry_turret'
  | 'restore_foundry_power'
  | 'hack_foundry_terminal'
  | 'foundry_completed'
  // En Route 2 -> 3
  | 'drive_to_archive'
  // Destination 3: The Archive
  | 'reach_archive'
  | 'repair_archive_conduit'
  | 'hack_archive_vault'
  | 'reconstruct_timeline'
  | 'archive_completed'
  // En Route 3 -> 4
  | 'drive_to_gate'
  // Destination 4: The Gate
  | 'reach_gate'
  | 'hack_gate_mainframe'
  | 'confront_aegis'
  | 'campaign_ended';

export type CampaignEndingType = 'restore_grid' | 'break_grid' | 'new_protocol';

export interface CampaignStoryState {
  currentDestinationId: DestinationId;
  currentStage: DestinationStage;
  stageStepIndex: number;
  
  // Chapter 1 Progress
  dashboardInspected: boolean;
  scavengedStarterScrap: boolean;
  muleRepaired: boolean;
  relayGeneratorActive: boolean;
  relayTerminalHacked: boolean;

  // Chapter 2 Progress & Choices
  helpedMaintenanceUnit: boolean | null; // true: repaired TX-84, false: scavenged/ignored
  foundryTurretDisabled: boolean;
  foundryPowerRestored: boolean;
  foundryTerminalHacked: boolean;
  foremanDatapadRead: boolean;

  // Chapter 3 Progress & Choices
  expeditionBuggySearched: boolean;
  hasDrChenKey: boolean; // Crucial for Ending C!
  archiveConduitRepaired: boolean;
  archiveVaultHacked: boolean;
  timelineReconstructed: boolean;

  // Chapter 4 Progress
  gateMainframeHacked: boolean;
  chosenEnding: CampaignEndingType | null;

  // Stats & Metrics
  totalSalvagedItems: number;
  startTime: number;
  finishTime: number;
}
