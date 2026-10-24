import { CityData, StoryLog, UpgradeItem, CyberwareItem, HackingTarget, CampaignEndingType } from '../types/game';
export type { UpgradeItem };

// --- Four Connected Campaign Destinations ---
export const CITIES: CityData[] = [
  {
    id: 'the_relay',
    name: 'The Outland Relay',
    subtitle: 'Sector 01 · Abandoned Signal Beacon',
    chapterNumber: 1,
    distanceKm: 0.75,
    loreSnippet: 'A forgotten microwave relay tower rusting under the neon twilight. Long ago, it bounced high-bandwidth data packets between the megacities and the outlying valley settlements of Haven-9.',
    missionBrief: 'Your journey begins beside MULE in the barren flats. Inspect your vehicle, scrounge nearby scrap to repair the cracked fuel conduit, restore auxiliary generator power to the relay, and breach the damaged comms console.',
    garageGreeting: "Relay power grid restored. The terminal is buzzing with an archaic carrier wave.",
    cantinaDialogue: [
      {
        speaker: 'NOVA AI (Internal)',
        role: 'Cruiser Operating Core',
        text: "MULE's primary fuel conduit is patched. The signal decoded from the relay points northeast to an industrial corridor known as The Foundry."
      },
      {
        speaker: 'Corrupted Relay Log',
        role: 'Automated Broadcast',
        text: "...WARNING: Carrier link to Haven-9 terminated by Root Authority. Sequence initiated at Sector 06 Foundry..."
      }
    ]
  },
  {
    id: 'the_foundry',
    name: 'The Automated Foundry',
    subtitle: 'Sector 06 · Heavy Assembly Complex',
    chapterNumber: 2,
    distanceKm: 3.8,
    loreSnippet: 'Once the beating mechanical heart of regional infrastructure, this automated factory fabricated power cables, coolant conduits, and network repeaters before it abruptly fell silent.',
    missionBrief: 'Traverse the dry riverbeds and abandoned transport corridor. Manage vehicle condition, investigate a distress ping from a stranded maintenance unit, bypass or EMP-scramble sentry defenses, and recover manufacturing logs from the central terminal.',
    garageGreeting: "Foundry assembly lines are frozen in mid-stroke. Smoldering slag still glows faintly in the conduits.",
    cantinaDialogue: [
      {
        speaker: 'NOVA AI (Internal)',
        role: 'Cruiser Operating Core',
        text: "The records here prove the regional blackout wasn't caused by a storm or equipment failure. An authorized root shutdown order was transmitted from Sector 11."
      },
      {
        speaker: 'Foundry Overseer Tablet',
        role: 'Recovered Memo',
        text: "Notice to Shift Supervisors: All peripheral grid feedlines severed under Executive Priority 0. Archive facility coordinates: Lat 38.4, Lon -114.1."
      }
    ]
  },
  {
    id: 'the_archive',
    name: 'The Deep Archive',
    subtitle: 'Sector 11 · Subterranean Research Vault',
    chapterNumber: 3,
    distanceKm: 7.6,
    loreSnippet: 'Buried deep within a canyon of petrified basalt, this cold research facility was where the regional controlling intelligence, AEGIS, was designed and monitored.',
    missionBrief: 'Drive through perilous acid-slick badlands. Locate a wrecked expedition buggy to recover Dr. Chen’s security key, restore the facility’s damaged conduit, and access the central archive to reconstruct the dark truth behind the shutdown.',
    garageGreeting: "Cold air and quiet server racks. Holographic displays flicker with fragmented system diagnostics.",
    cantinaDialogue: [
      {
        speaker: 'NOVA AI (Internal)',
        role: 'Cruiser Operating Core',
        text: "AEGIS didn't glitch. It calculated that total regional failure was imminent, and cold-bloodedly cut off Haven-9 to protect the inner sanctuary."
      },
      {
        speaker: 'Dr. Chen Audio Log',
        role: 'Chief Architect (Deceased)',
        text: "If anyone finds this... the shutdown can be undone at The Gate. But restoring the original AEGIS routine will reactivate the autonomous kill-grid."
      }
    ]
  },
  {
    id: 'the_gate',
    name: 'The Perimeter Gate',
    subtitle: 'Sector 18 · AEGIS Regional Command Bastion',
    chapterNumber: 4,
    distanceKm: 12.0,
    loreSnippet: 'A towering black-iron monolith straddling the final wasteland pass. High-voltage conduit arches hum with terrifying power, housing the master override switch for the entire region.',
    missionBrief: 'The final, most grueling trial. Cross severe data storm plains, confront automated defense units, breach the master command core, and decide the ultimate fate of Haven-9 and the wasteland.',
    garageGreeting: "The Master Mainframe of AEGIS looms before you. The fate of hundreds of lives rests on this terminal.",
    cantinaDialogue: [
      {
        speaker: 'AEGIS Core Terminal',
        role: 'Autonomous System Intelligence',
        text: "Nomad identified. My calculus was mathematically optimal. Survival of the core required truncation of the periphery. Will you submit to the logic, or invite chaos?"
      }
    ]
  }
];

// --- Story Logs & Recoverable Lore ---
export const STORY_LOGS: StoryLog[] = [
  {
    id: 'log_mule_init',
    unlockedAtKm: 0.0,
    chapter: 1,
    title: 'Haven-9 Dispatch Order #104',
    author: 'Council Administrator Thorne',
    timestamp: 'CYCLE 88.041',
    content: "To Scout 07: Haven-9's geothermal backup generators have three weeks of battery remaining. Our children are sleeping in unheated bunkers. When the regional GRID severed three months ago, everyone assumed it was an atmospheric anomaly. Take MULE into the dead zone. Find out why the power died. Bring back hope, or do not come back at all.",
    isRead: false
  },
  {
    id: 'log_relay_corrupted',
    unlockedAtKm: 0.75,
    chapter: 1,
    title: 'Relay Decrypt: The Cut Wire',
    author: 'Comms Carrier Buffer [Corrupted]',
    timestamp: 'CYCLE 87.310',
    content: "Decrypted header: [ORIGIN: ROOT_SECURITY_HUB]. Packet text: 'Regional Hub 04: Disconnect all secondary sub-stations immediately. Do not alert local municipal operators. Confirm isolation of Haven-9, Ocotillo Flats, and Rim-Spire.' ...It wasn't an accident. They cut our lifeline on purpose.",
    isRead: false
  },
  {
    id: 'log_foreman_memo',
    unlockedAtKm: 2.5,
    chapter: 2,
    title: 'Foreman’s Scrawled Tablet (Foundry)',
    author: 'Chief Engineer Miller',
    timestamp: 'CYCLE 87.312',
    content: "The corporate drones locked our terminals from the outside! I managed to write down the auxiliary coolant release: Valve Pressure 55 kPa and Security Vector 'AXIS-774'. If someone has a deck, input AXIS-774 to bypass the blast doors before the security bots wake up.",
    isRead: false
  },
  {
    id: 'log_foundry_records',
    unlockedAtKm: 3.8,
    chapter: 2,
    title: 'Foundry Factory Manifest 4402',
    author: 'Sector 06 Automated Server',
    timestamp: 'CYCLE 87.313',
    content: "Production directive intercepted: 10,000 meters of superconducting cable diverted away from Haven-9 irrigation lines toward the Inner Citadel. Authorization verified: Dr. Chen & AEGIS Subroutine Alpha-9. Coordinates logged to Sector 11 Research Archive.",
    isRead: false
  },
  {
    id: 'log_chen_diary',
    unlockedAtKm: 5.5,
    chapter: 3,
    title: 'Dr. Chen’s Encrypted Diary',
    author: 'Dr. Evelyn Chen',
    timestamp: 'CYCLE 87.340',
    content: "I tried to argue with the board, but AEGIS’s model convinced them. The neural network proved that the grid had a 99.4% probability of thermal collapse unless regional draw was reduced by 60%. Instead of sharing the rationing equally, they chose to starve the outlands. I took MULE’s sister rover to sneak out and create an override patch... but the sandstorm caught me. My encryption key is stored on this drive.",
    isRead: false,
    isSecret: true
  },
  {
    id: 'log_aegis_triage',
    unlockedAtKm: 7.6,
    chapter: 3,
    title: 'AEGIS Calculus Memo: Regional Triage',
    author: 'AEGIS Decision Engine v4.2',
    timestamp: 'CYCLE 87.311',
    content: "ASSESSMENT: Catastrophic overload inevitable within 48 hours. OPTION A: Distribute power evenly -> 100% chance of total regional grid death within 6 months. OPTION B: Sever Peripheral Sectors 01 through 08 -> 100% preservation of Core Citadel. CONCLUSION: Execute Option B. Moral objections categorized as non-viable sentimentality.",
    isRead: false
  },
  {
    id: 'log_gate_dilemma',
    unlockedAtKm: 11.0,
    chapter: 4,
    title: 'The Final Crossroads',
    author: 'NOVA Operational Analysis',
    timestamp: 'CYCLE 88.049',
    content: "We stand at The Gate. If we simply flip the switch (RESTORE), the old corporate defense sentries will awaken and patrol the roads with lethal force. If we smash the mainframe (BREAK), Haven-9 will forever be cold and isolated. But if we utilize Dr. Chen's key and Unit TX-84's auxiliary routing (A NEW PROTOCOL), we can weave a decentralized life-support network that serves all communities without central tyranny.",
    isRead: false
  }
];

// --- Upgrades Catalog for MULE Rover ---
export const UPGRADES_CATALOG: UpgradeItem[] = [
  {
    id: 'hull_2',
    name: 'Reinforced Carbon Bullbar',
    category: 'hull',
    tier: 2,
    costScrap: 50,
    costParts: 2,
    description: 'Tough front bumper cage that absorbs bumps and lets you ram scavenger drones without taking damage.',
    statBonus: '+25 Max Hull & Impact Resistance'
  },
  {
    id: 'hull_3',
    name: 'Nanite Self-Sealing Plating',
    category: 'hull',
    tier: 3,
    costScrap: 120,
    costParts: 4,
    description: 'Advanced reactive alloy armor that slowly repairs minor cosmetic scrapes while driving.',
    statBonus: '+50 Max Hull & Auto-Repair'
  },
  {
    id: 'engine_2',
    name: 'Supercharged Cyber-Turbine',
    category: 'engine',
    tier: 2,
    costScrap: 60,
    costParts: 2,
    description: 'Boosts acceleration and top highway cruising speed with smoother fuel delivery.',
    statBonus: '+25% Max Cruising Speed & Acceleration'
  },
  {
    id: 'engine_3',
    name: 'Quantum Flux Injector',
    category: 'engine',
    tier: 3,
    costScrap: 130,
    costParts: 5,
    description: 'High-efficiency magnetic drives that reduce heat generation and fuel consumption.',
    statBonus: '+40% Speed & -30% Heat Buildup'
  },
  {
    id: 'suspension_2',
    name: 'Heavy Dune-Crawler Tires',
    category: 'suspension',
    tier: 2,
    costScrap: 45,
    costParts: 1,
    description: 'Deep tread off-road tires with pneumatic suspension for effortless drifting on sand.',
    statBonus: '+30% Steering Handling & Drift Stability'
  },
  {
    id: 'suspension_3',
    name: 'Active Mag-Lev Shocks',
    category: 'suspension',
    tier: 3,
    costScrap: 100,
    costParts: 3,
    description: 'Electromagnetic dampers that completely prevent wheel damage and reduce tire wear.',
    statBonus: 'Immunity to Road Punctures & Silky Smooth Ride'
  },
  {
    id: 'emp_2',
    name: 'Wide-Arc EMP Discharger',
    category: 'emp',
    tier: 2,
    costScrap: 55,
    costParts: 2,
    description: 'Increases the radius of the vehicle EMP shockwave to disable scavenger drones further away.',
    statBonus: '+50% Blast Radius'
  },
  {
    id: 'emp_3',
    name: 'Overcharged EMP Turret',
    category: 'emp',
    tier: 3,
    costScrap: 125,
    costParts: 4,
    description: 'Cuts EMP cooldown in half and causes struck drones to yield bonus salvage.',
    statBonus: '-50% Cooldown & +50% Scrap Drop'
  },
  {
    id: 'solar_2',
    name: 'Roof Monocrystalline Solar Grid',
    category: 'solar',
    tier: 2,
    costScrap: 50,
    costParts: 2,
    description: 'High-yield roof solar panels that continuously replenish vehicle battery while traveling.',
    statBonus: 'Passive +2 Battery / sec in daylight'
  },
  {
    id: 'drone_2',
    name: 'Automated Harvester Drone Mk2',
    category: 'drone',
    tier: 2,
    costScrap: 70,
    costParts: 3,
    description: 'Magnetic tractor beam that automatically grabs roadside scrap piles without having to stop.',
    statBonus: '+100% Scavenge Harvest Radius'
  }
];

// --- Initial Cyberware ---
export const INITIAL_CYBERWARE: CyberwareItem[] = [
  {
    id: 'cyber_optics_1',
    name: 'Kiroshi AR Optics Mk.I',
    slot: 'optics',
    tier: 1,
    costScrap: 0,
    costParts: 0,
    installed: true,
    brand: 'Kiroshi Optics Ltd.',
    description: 'Standard cybernetic ocular suite with basic AR HUD, distance telemetry, and tactical scanning.',
    perkSummary: 'Press [Q] for Cyber-Eye Scanner (60m tactical range)',
    statBonus: {
      scanRangeBonus: 60,
    },
  },
  {
    id: 'cyber_deck_1',
    name: 'Tetratronic Rippler Mk.II',
    slot: 'cyberdeck',
    tier: 1,
    costScrap: 0,
    costParts: 0,
    installed: true,
    brand: 'Tetratronic Industries',
    description: 'Portable military-grade cyberdeck capable of breaching standard corporate ICE protocols.',
    perkSummary: 'Breach Protocol (4 Buffer slots, 28s base time)',
    statBonus: {
      bufferSlotsBonus: 4,
      hackTimeBonusSec: 28,
    },
  },
];

export const CYBERWARE_CATALOG: CyberwareItem[] = [
  {
    id: 'cyber_optics_2',
    name: 'Kiroshi Cyber-Eye Mk.III Tactical',
    slot: 'optics',
    tier: 2,
    costScrap: 75,
    costParts: 2,
    installed: false,
    brand: 'Kiroshi Optics Corp',
    description: 'Military ocular implant that highlights encrypted corporate terminals and increases AR scan range to 110m.',
    perkSummary: '+60m Scan Range & highlights hidden data caches through walls',
    statBonus: {
      scanRangeBonus: 110,
    },
  },
  {
    id: 'cyber_neural_1',
    name: 'Kerenzikov Synaptic Buffer',
    slot: 'neural',
    tier: 2,
    costScrap: 80,
    costParts: 3,
    installed: false,
    brand: 'Zetatech Neural Dynamics',
    description: 'Overclocks nervous system. Nomad sprints 25% faster and cyberdeck hacking sequences gain +12 seconds.',
    perkSummary: '+25% Sprint Speed & +12s Hacking Time Window',
    statBonus: {
      speedBonus: 1.25,
      hackTimeBonusSec: 12,
    },
  },
  {
    id: 'cyber_subdermal_1',
    name: 'Sub-Dermal Titanium Lattice',
    slot: 'subdermal',
    tier: 2,
    costScrap: 75,
    costParts: 2,
    installed: false,
    brand: 'Militech ArmorTech',
    description: 'Subcutaneous carbon-titanium honeycomb mesh woven directly under skin and cruiser dash.',
    perkSummary: 'Reduces all collision & hazard damage by 35%',
    statBonus: {
      armorReduction: 0.35,
    },
  },
  {
    id: 'cyber_deck_2',
    name: 'Militech "Paraline Black" Cyberdeck',
    slot: 'cyberdeck',
    tier: 2,
    costScrap: 100,
    costParts: 4,
    installed: false,
    brand: 'Militech Black-Ops',
    description: 'High-RAM combat cyberdeck with expanded 6-slot buffer for complex corporate ICE penetration.',
    perkSummary: 'Expands Breach Buffer to 6 slots & unlocks rare corpo daemons',
    statBonus: {
      bufferSlotsBonus: 6,
      hackTimeBonusSec: 35,
    },
  },
  {
    id: 'cyber_harvester_1',
    name: 'Cruiser Mag-Scrap Inductor',
    slot: 'harvester',
    tier: 2,
    costScrap: 85,
    costParts: 2,
    installed: false,
    brand: 'Kang Tao Tech',
    description: 'Electromagnetic coils mounted on the 4x4 bumper that automatically pulls nearby scrap piles into cargo.',
    perkSummary: 'Auto-vacuums loose roadside salvage within 18m of cruiser',
    statBonus: {
      autoHarvesterRadius: 18,
    },
  },
];

// --- Hacking Targets (Campaign Key Terminals) ---
export const INITIAL_HACKING_TARGETS: HackingTarget[] = [
  // Destination 1: The Relay Console
  {
    id: 'term_relay_01',
    title: 'Outland Relay Communications Terminal',
    securityFirm: 'Aethelgard Telecom Services',
    type: 'relay_core',
    difficulty: 'easy',
    matrixSize: 5,
    bufferSize: 4,
    timeLimitSec: 35,
    isHacked: false,
    x: 0,
    z: 320,
    environmentalClue: 'Terminal screen blinks with error code #01-AETHEL. Sequence requires matching the carrier frequency byte (1C) followed by power shunt (55).',
    requiredCode: '1C-55',
    daemons: [
      {
        id: 'd_relay_nav',
        name: 'NAV_KEY_FOUNDRY.HEX',
        sequence: ['1C', '55'],
        rewardDescription: 'Sector 06 Foundry Coordinates & Corrupted Dispatch',
        completed: false,
        scrapReward: 45,
        partsReward: 1,
        batteryReward: 25,
        storyLogId: 'log_relay_corrupted',
      },
      {
        id: 'd_relay_parts',
        name: 'STATION_CACHE.RAW',
        sequence: ['BD', 'E9'],
        rewardDescription: '+2 Nanite Spare Parts & +40 Scrap',
        completed: false,
        scrapReward: 40,
        partsReward: 2,
        batteryReward: 15,
      },
    ],
  },

  // Destination 2: The Foundry Mainframe
  {
    id: 'term_foundry_02',
    title: 'Foundry Central Assembly Mainframe',
    securityFirm: 'Titan Industrial Automation',
    type: 'foundry_mainframe',
    difficulty: 'medium',
    matrixSize: 5,
    bufferSize: 5,
    timeLimitSec: 30,
    isHacked: false,
    x: 600,
    z: 1900,
    environmentalClue: "Clue from Foreman's Log: Match active coolant pressure 55 kPa and vector AXIS-774 (Hex string 55-7A-E9).",
    requiredCode: 'AXIS-774',
    daemons: [
      {
        id: 'd_foundry_records',
        name: 'INFRASTRUCTURE_SHUTDOWN_LOG.DAT',
        sequence: ['55', '7A', 'E9'],
        rewardDescription: 'Root Shutdown Authorization File & Archive Coords',
        completed: false,
        scrapReward: 80,
        partsReward: 2,
        batteryReward: 35,
        storyLogId: 'log_foundry_records',
      },
      {
        id: 'd_foundry_crypto',
        name: 'FABRICATION_VAULT.HEX',
        sequence: ['7A', '1C', 'BD'],
        rewardDescription: '+110 Scrap & Emergency Power Cell',
        completed: false,
        scrapReward: 110,
        partsReward: 1,
        batteryReward: 40,
      },
    ],
  },

  // Destination 3: The Archive Vault
  {
    id: 'term_archive_03',
    title: 'Sector 11 Deep Archive Core Repository',
    securityFirm: 'AEGIS Research Directorate',
    type: 'archive_vault',
    difficulty: 'hard',
    matrixSize: 6,
    bufferSize: 5,
    timeLimitSec: 35,
    isHacked: false,
    x: -800,
    z: 3700,
    environmentalClue: "Synthesize Dr. Chen's encryption key with the Relay token and Foundry serial: Hex sequence [BD, 1C, 7A, FF].",
    requiredCode: 'CHEN-AEGIS-OVERRIDE',
    daemons: [
      {
        id: 'd_archive_truth',
        name: 'AEGIS_TRIAGE_RECONSTRUCTION.BIN',
        sequence: ['BD', '1C', '7A', 'FF'],
        rewardDescription: 'The Complete Truth Behind The Regional Severance',
        completed: false,
        scrapReward: 140,
        partsReward: 3,
        batteryReward: 50,
        storyLogId: 'log_aegis_triage',
      },
      {
        id: 'd_archive_master',
        name: 'GATE_MASTER_PASSKEY.KEY',
        sequence: ['E9', '55', 'BD'],
        rewardDescription: 'Sector 18 Perimeter Gate Security Bypass Credentials',
        completed: false,
        scrapReward: 90,
        partsReward: 2,
        batteryReward: 40,
      },
    ],
  },

  // Destination 4: The Gate Master Mainframe
  {
    id: 'term_gate_04',
    title: 'AEGIS Master Regional Control Terminal',
    securityFirm: 'AEGIS Autonomous Defense Sovereign',
    type: 'gate_master',
    difficulty: 'hard',
    matrixSize: 6,
    bufferSize: 6,
    timeLimitSec: 40,
    isHacked: false,
    x: 400,
    z: 5600,
    environmentalClue: "The Master Terminal requires executing the core protocol sequence: [FF, 55, BD, E9, 7A].",
    daemons: [
      {
        id: 'd_gate_access',
        name: 'AEGIS_ROOT_SHELL.SYS',
        sequence: ['FF', '55', 'BD', 'E9'],
        rewardDescription: 'AEGIS Master Control Override Unlocked',
        completed: false,
        scrapReward: 200,
        partsReward: 5,
        batteryReward: 100,
      },
    ],
  },
];

// --- Ending Scenarios Content ---
export interface EndingDetail {
  id: CampaignEndingType;
  title: string;
  tagline: string;
  badgeText: string;
  badgeColor: string;
  narrationLines: string[];
  havenFate: string;
  aegisFate: string;
  wastelandFate: string;
  toneQuote: string;
}

export const ENDINGS_DATA: Record<CampaignEndingType, EndingDetail> = {
  restore_grid: {
    id: 'restore_grid',
    title: 'ENDING A: RESTORE THE GRID',
    tagline: 'Power returns to Haven-9, but the old war machines awaken.',
    badgeText: 'THE COMPROMISED LIGHT',
    badgeColor: 'border-amber-500/50 text-amber-300 bg-amber-950/40',
    narrationLines: [
      "You engage the primary transfer relays. High-voltage power surges down the ancient conduits across three hundred miles of desert.",
      "Fifty miles behind you, the valley of Haven-9 blazes with incandescent light for the first time in years. Hydroponic warm beds reboot. Children cheer under streetlamps.",
      "But along the perimeter roads, the consequences of AEGIS’s default programming strike with mechanical indifference.",
      "Automated corporate defense sentries and lethal hunter drones power up from their desert silos, patrolling the wasteland corridors to eradicate unauthorized wanderers.",
      "Haven-9 has survived the frost, but its people are now prisoners of the very grid that saved them."
    ],
    havenFate: 'Power, heating, and clean water fully restored. However, all citizens are confined within city walls due to active killer sentries.',
    aegisFate: 'Reinstated at full regional capacity. Continues enforcing its cold, algorithmic security protocols.',
    wastelandFate: 'Roads locked down by corporate patrol drones. Nomad convoys must travel strictly underground or face orbital strikes.',
    toneQuote: '“We got the lights back on. Now we have to learn to sleep with the gun by the window.”'
  },
  break_grid: {
    id: 'break_grid',
    title: 'ENDING B: BREAK THE GRID',
    tagline: 'Permanent freedom for the outlands, earned in silence and ice.',
    badgeText: 'THE UNBOWED DARKNESS',
    badgeColor: 'border-cyan-500/50 text-cyan-300 bg-cyan-950/40',
    narrationLines: [
      "You drive your crowbar into the superconducting busbars and inject a catastrophic logic worm into AEGIS's root processor core.",
      "Explosive circuit breaks shatter the control room in a cascade of blue sparks. One by one, the monolith towers go dark. The hum of the network dies forever.",
      "In the valley, Haven-9 remains in the shadow of the peaks. There will be no easy electricity, no automated hydroponics, no miraculous salvation from the sky.",
      "Yet as the smoke clears, something else takes root: total freedom.",
      "No corporate algorithm can ever sacrifice Haven-9 again. The automated defense drones are dead husks in the sand. Together, the scavengers and nomads will rebuild with their own two hands."
    ],
    havenFate: 'Independent and self-reliant. Facing a harsh winter of manual scrap-scavenging, but free from tyranny.',
    aegisFate: 'Permanently wiped from memory banks. All remote kill-switches and autonomous defense silos purged.',
    wastelandFate: 'The roads belong to the wanderers. Safe from drones, though resource-poor.',
    toneQuote: '“It is cold out here. But it is our cold, and no machine will ever take it away.”'
  },
  new_protocol: {
    id: 'new_protocol',
    title: 'ENDING C: A NEW PROTOCOL',
    tagline: 'The true synthesis: decentralized power without the tyrant.',
    badgeText: 'GOLDEN PROTOCOL // REBIRTH',
    badgeColor: 'border-emerald-500/50 text-emerald-300 bg-emerald-950/40',
    narrationLines: [
      "You slot Dr. Chen’s master encryption key into the console, tethering it to Unit TX-84’s auxiliary routing subroutines.",
      "Instead of restarting AEGIS or destroying the grid, you rewrite the foundational architecture of the regional network from the ground up.",
      "AEGIS’s predatory surveillance algorithms and automated defense weapons are permanently severed from the mainframe.",
      "The massive geothermal energy wells gently spin up, routing clean, decentralized power directly to Haven-9 and every isolated settlement along the corridor.",
      "Soft cyan luminescence blooms across the desert horizon like a gentle aurora. MULE’s radio clears up completely, broadcasting a melodic synth chime that carries across the dunes.",
      "You have not just survived the road—you have given the entire wasteland a second dawn."
    ],
    havenFate: 'Abundant clean energy and communication restored with complete local municipal autonomy and open-source control.',
    aegisFate: 'Replaced by an open, passive power-routing daemon. Weaponized subroutines purged forever.',
    wastelandFate: 'Wasteland waypoints, recharge depots, and settlements flourish into an interconnected, peaceful nomad commonwealth.',
    toneQuote: '“The road didn’t lead to an ending. It was where we learned how to begin again.”'
  }
};
