import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CyberpunkRoadScene, CameraViewMode, NearestCityInfo, StoryInteractionTarget } from './game/threeScene';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { CityHavenModal } from './components/CityHavenModal';
import { StoryJournalModal } from './components/StoryJournalModal';
import { CyberdeckModal } from './components/CyberdeckModal';
import { DashboardModal } from './components/DashboardModal';
import { DistressSignalModal, DistressEventType } from './components/DistressSignalModal';
import { CampaignTerminalModal } from './components/CampaignTerminalModal';
import { EndingResultsModal } from './components/EndingResultsModal';
import { SettingIntroModal } from './components/SettingIntroModal';
import { DroneUpgradeModal } from './components/DroneUpgradeModal';
import { PauseScreenModal } from './components/PauseScreenModal';
import {
  GameState,
  MechanicalFailure,
  RaiderEnemy,
  SalvageNode,
  VehicleStats,
  VehicleUpgrades,
  CyberwareItem,
  HackingTarget,
  HackingDaemon,
  WeatherType,
  DestinationId,
  CampaignStoryState,
  CampaignEndingType,
  StoryDialogue,
  DroneUpgradeChoice,
} from './types/game';
import { CITIES, STORY_LOGS, UpgradeItem, INITIAL_CYBERWARE, INITIAL_HACKING_TARGETS } from './data/gameContent';
import { audioEngine } from './audio/audioEngine';
import { Pause, RotateCcw, Play } from 'lucide-react';

const INITIAL_STATS: VehicleStats = {
  speed: 0,
  maxSpeed: 115,
  acceleration: 20,
  health: 90, // Upgraded initial hull durability
  maxHealth: 120, // Reinforced hull
  fuel: 38,
  battery: 60,
  heat: 10,
  scrap: 35, // Starting scrap to easily patch and upgrade
  spareParts: 2, // 2 Nanite spare parts
  odometer: 0,
};

const INITIAL_UPGRADES: VehicleUpgrades = {
  hullLevel: 1,
  engineLevel: 1,
  suspensionLevel: 1,
  empLevel: 1,
  solarLevel: 1,
  droneLevel: 1,
};

const INITIAL_FAILURE: MechanicalFailure = {
  type: 'cracked_fuel_line',
  title: 'CRACKED FUEL LINE CONDUIT',
  description: 'Fuel manifold fractured by basalt shrapnel. Fuel leaking at 2x rate.',
  solutionText: 'Inspect Dashboard [V] or Quick Patch with 1 Nanite Part + 10 Scrap.',
  severity: 'critical',
};

const INITIAL_CAMPAIGN_STATE: CampaignStoryState = {
  currentDestinationId: 'relay',
  currentStage: 'inspect_dashboard',
  stageStepIndex: 0,
  dashboardInspected: false,
  scavengedStarterScrap: false,
  muleRepaired: false,
  relayGeneratorActive: false,
  relayTerminalHacked: false,
  helpedMaintenanceUnit: null,
  foundryTurretDisabled: false,
  foundryPowerRestored: false,
  foundryTerminalHacked: false,
  foremanDatapadRead: false,
  expeditionBuggySearched: false,
  hasDrChenKey: false,
  archiveConduitRepaired: false,
  archiveVaultHacked: false,
  timelineReconstructed: false,
  gateMainframeHacked: false,
  chosenEnding: null,
  totalSalvagedItems: 0,
  startTime: Date.now(),
  finishTime: 0,
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('title');
  const [stats, setStats] = useState<VehicleStats>(INITIAL_STATS);
  const [upgrades, setUpgrades] = useState<VehicleUpgrades>(INITIAL_UPGRADES);
  const [failure, setFailure] = useState<MechanicalFailure | null>(INITIAL_FAILURE);

  // Setting Intro Modal State
  const [showSettingIntro, setShowSettingIntro] = useState(false);

  // Pause State
  const [isPaused, setIsPaused] = useState(false);

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      if (sceneInstanceRef.current) {
        sceneInstanceRef.current.setPaused(next);
      }
      return next;
    });
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.setPaused(false);
    }
  }, []);

  // Drone Rare Tech Core Upgrade Modal State
  const [showDroneUpgrade, setShowDroneUpgrade] = useState(false);

  // Story Dialogue Queue & Bottom Dialogue Bar
  const [dialogueQueue, setDialogueQueue] = useState<StoryDialogue[]>([]);
  const [currentDialogue, setCurrentDialogue] = useState<StoryDialogue | null>(null);

  const triggerDialogue = useCallback((dialogue: StoryDialogue) => {
    setDialogueQueue((prev) => [...prev, dialogue]);
  }, []);

  const handleDismissDialogue = useCallback(() => {
    setDialogueQueue((prev) => {
      if (prev.length > 0) {
        setCurrentDialogue(prev[0]);
        return prev.slice(1);
      } else {
        setCurrentDialogue(null);
        return [];
      }
    });
  }, []);

  const handleNextDialogue = useCallback(() => {
    handleDismissDialogue();
  }, [handleDismissDialogue]);

  useEffect(() => {
    if (!currentDialogue && dialogueQueue.length > 0) {
      setCurrentDialogue(dialogueQueue[0]);
      setDialogueQueue((prev) => prev.slice(1));
    }
  }, [currentDialogue, dialogueQueue]);

  // Campaign Story State
  const [campaignState, setCampaignState] = useState<CampaignStoryState>(INITIAL_CAMPAIGN_STATE);
  const [storyPrompt, setStoryPrompt] = useState<StoryInteractionTarget | null>(null);

  // Modals
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [activeDistressEvent, setActiveDistressEvent] = useState<DistressEventType | null>(null);
  const [activeCampaignTerminal, setActiveCampaignTerminal] = useState<DestinationId | null>(null);
  const [chosenEnding, setChosenEnding] = useState<CampaignEndingType | null>(null);

  // Cyberware & Hacking States
  const [cyberwareList, setCyberwareList] = useState<CyberwareItem[]>(INITIAL_CYBERWARE);
  const [hackingTargets, setHackingTargets] = useState<HackingTarget[]>(INITIAL_HACKING_TARGETS);
  const [activeHackingTarget, setActiveHackingTarget] = useState<HackingTarget | null>(null);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [nearestHackingTarget, setNearestHackingTarget] = useState<HackingTarget | null>(null);
  const [scannerTargets, setScannerTargets] = useState<Array<{ id: string; title: string; distanceMeters: number; type: string; isHacked?: boolean; secFirm?: string; label?: string }>>([]);

  // On-Foot Nomad vs. In-Vehicle State (Starts on foot beside MULE!)
  const [isOnFoot, setIsOnFoot] = useState(true);
  const [distToRover, setDistToRover] = useState(3.5);

  // Cities & Traveled Distance
  const [cityIndex, setCityIndex] = useState(0);
  const [distToNextCity, setDistToNextCity] = useState(0.35);
  const [nearestCity, setNearestCity] = useState<NearestCityInfo>({
    name: CITIES[0].name,
    distanceKm: 0.35,
    relativeBearingDeg: 0,
    directionHint: 'STRAIGHT AHEAD',
    cardinal: 'N',
  });
  const [storyLogs, setStoryLogs] = useState(STORY_LOGS);
  const [journalOpen, setJournalOpen] = useState(false);

  // Weather & Acid Shield State
  const [currentWeather, setCurrentWeather] = useState<WeatherType>('neon_twilight');
  const [isAcidShieldActive, setIsAcidShieldActive] = useState(false);
  const [acidRainShieldStatus, setAcidRainShieldStatus] = useState<string>('clear');

  // Audio & Radio states
  const [isMuted, setIsMuted] = useState(false);
  const [radioOn, setRadioOn] = useState(true);
  const [stationName, setStationName] = useState('K-NEON LOFI CHILL');
  const [trackName, setTrackName] = useState('Midnight Glow');

  // Camera & Visuals
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('chase');

  // Scene references
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneInstanceRef = useRef<CyberpunkRoadScene | null>(null);

  // Sync state refs for Three.js callback closure safety
  const campaignStateRef = useRef<CampaignStoryState>(campaignState);
  campaignStateRef.current = campaignState;
  const cityIndexRef = useRef<number>(cityIndex);
  cityIndexRef.current = cityIndex;

  // Failure timer
  const lastFailureOdoRef = useRef(0);

  // Current City
  const currentCity = CITIES[cityIndex % CITIES.length];
  const totalCityDist = currentCity.distanceKm;

  // Initialize Three.js scene once canvas container is mounted
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const scene = new CyberpunkRoadScene(
      canvasMountRef.current,
      stats,
      upgrades,
      {
        onCollectSalvage: (salvage: SalvageNode) => {
          setStats((prev) => {
            const next = { ...prev };
            if (salvage.type === 'scrap_pile') {
              next.scrap += salvage.value;
            } else if (salvage.type === 'power_cell') {
              next.battery = Math.min(100, next.battery + 40);
              next.scrap += 10;
            } else if (salvage.type === 'nanite_cache') {
              next.spareParts += salvage.value;
            } else if (salvage.type === 'fuel_canister') {
              next.fuel = Math.min(100, next.fuel + salvage.value);
            } else if (salvage.type === 'data_relic') {
              next.scrap += salvage.value;
            }
            return next;
          });
          setCampaignState((prev) => ({
            ...prev,
            totalSalvagedItems: prev.totalSalvagedItems + 1,
            scavengedStarterScrap: true,
          }));

          if (salvage.type === 'tech_core') {
            audioEngine.playUpgradeFanfare();
            setShowDroneUpgrade(true);
          }
        },
        onCollectTechCore: (_salvage: SalvageNode) => {
          audioEngine.playUpgradeFanfare();
          setShowDroneUpgrade(true);
        },
        onOutOfFuel: () => {
          // Handled by HUD interactive fuel-exhaustion banner
        },
        onSynthesizeFuel: () => {
          handleSynthesizeFuel();
        },
        onDefeatEnemy: (_enemy: RaiderEnemy) => {
          setStats((prev) => ({
            ...prev,
            scrap: prev.scrap + 25,
          }));
        },
        onCityArrival: (arrivedCityIndex: number) => {
          audioEngine.playCityFanfare();
          setCityIndex(arrivedCityIndex);

          // Narrative story beats when discovering key relay landmarks
          const curCampaign = campaignStateRef.current;
          if (arrivedCityIndex === 0) {
            triggerDialogue({
              id: `story_relay_arrival_${Date.now()}`,
              speaker: 'COURIER NOMAD',
              role: 'DESTINATION 1 // THE OUTLAND RELAY',
              channel: 'RADIO 94.2',
              text: "I've reached Relay Station Beta. The rusted transponder tower is still humming against the desert wind. If I hack into the relay terminal [E], I can download the beacon route to the next station and find my way closer to civilization.",
            });
            if (!curCampaign.relayTerminalHacked) {
              setActiveCampaignTerminal('relay');
            }
          } else if (arrivedCityIndex === 1) {
            triggerDialogue({
              id: `story_foundry_arrival_${Date.now()}`,
              speaker: 'COURIER NOMAD',
              role: 'DESTINATION 2 // THE FOUNDRY',
              channel: 'RADIO 94.2',
              text: 'The Automated Foundry looms ahead through the orange dust. Still functioning on automated protocols decades after the world broke. I need to reach the central console [E] to recover the relay coordinates to the deep archive.',
            });
            if (!curCampaign.foundryTerminalHacked) {
              setActiveCampaignTerminal('foundry');
            }
          } else if (arrivedCityIndex === 2) {
            triggerDialogue({
              id: `story_archive_arrival_${Date.now()}`,
              speaker: 'COURIER NOMAD',
              role: 'DESTINATION 3 // DEEP ARCHIVE',
              channel: 'RADIO 94.2',
              text: 'Sector 11 Deep Archive... A subterranean vault holding the last records before civilization sealed its gates. Somewhere inside this terminal [E] is the master cipher required to open the perimeter gate to Haven-9.',
            });
            if (!curCampaign.timelineReconstructed) {
              setActiveCampaignTerminal('archive');
            }
          } else if (arrivedCityIndex === 3) {
            triggerDialogue({
              id: `story_gate_arrival_${Date.now()}`,
              speaker: 'COURIER NOMAD',
              role: 'DESTINATION 4 // THE PERIMETER GATE',
              channel: 'RADIO 94.2',
              text: 'There it is... The Perimeter Gate of Haven-9. Colossal blast shields and searchlights separating the dead wasteland from civilization. Access the root gate terminal [E] to punch through and complete my journey home.',
              priority: 'urgent',
            });
            if (!curCampaign.gateMainframeHacked) {
              setActiveCampaignTerminal('gate');
            }
          } else {
            setGameState('city');
          }
        },
        onVehicleDamage: (amount: number, _reason: string) => {
          setStats((prev) => {
            const subdermal = cyberwareList.find((c) => c.slot === 'subdermal' && c.installed);
            const reduction = subdermal?.statBonus.armorReduction || 0;
            const actualDmg = Math.max(1, Math.round(amount * (1 - reduction)));

            const newHealth = Math.max(0, prev.health - actualDmg);
            if (newHealth <= 0) {
              setGameState('gameover');
            }
            return { ...prev, health: newHealth };
          });
        },
        onTriggerHacking: (target: HackingTarget) => {
          setActiveHackingTarget(target);
        },
        onToggleScanner: (active: boolean) => {
          setIsScannerActive(active);
        },
        onUpdateStats: (update: Partial<VehicleStats>) => {
          setStats((prev) => {
            const next = { ...prev, ...update };

            // Extra fuel drain if cracked fuel line
            if (failure?.type === 'cracked_fuel_line' && next.speed > 5) {
              next.fuel = Math.max(0, next.fuel - 0.015);
            }

            if (next.health <= 0) {
              setGameState('gameover');
            }

            if (next.odometer - lastFailureOdoRef.current > 4.5 && !failure && Math.random() < 0.25) {
              lastFailureOdoRef.current = next.odometer;
              triggerRandomMechanicalFailure();
            }

            checkStoryLogUnlocks(next.odometer);
            return next;
          });

          // Update distance to rover, nearest city, and check nearby story interaction
          if (sceneInstanceRef.current) {
            setDistToRover(sceneInstanceRef.current.getPlayerDistanceToRover());
            const cityInfo = sceneInstanceRef.current.getNearestCityTelemetry();
            setNearestCity(cityInfo);
            setDistToNextCity(cityInfo.distanceKm);
            setNearestHackingTarget(sceneInstanceRef.current.getNearestHackingTarget());
            setScannerTargets(sceneInstanceRef.current.getScannerTargetHUD());

            const prompt = sceneInstanceRef.current.getNearbyStoryInteraction();
            setStoryPrompt(prompt);
          }
        },
        onTogglePlayerMode: (onFoot: boolean) => {
          setIsOnFoot(onFoot);
        },
        onWeatherChange: (weather: WeatherType) => {
          setCurrentWeather(weather);
          // Pure story dialogues only: weather warnings are handled cleanly by the HUD status banner
        },
        onIonVortexAbsorbed: () => {
          setStats((prev) => ({
            ...prev,
            battery: 100,
            health: Math.min(prev.maxHealth, prev.health + 15),
          }));
        },
        onAcidShieldToggle: (active: boolean) => {
          setIsAcidShieldActive(active);
        },
        onAcidRainShieldStatus: (status: 'protected' | 'moving_warning' | 'no_shield' | 'out_of_battery' | 'on_foot_danger') => {
          setAcidRainShieldStatus(status);
        },
        onTriggerStoryInteraction: (target: StoryInteractionTarget) => {
          handleExecuteStoryInteraction(target);
        },
      }
    );

    scene.updateCyberware(cyberwareList);
    scene.updateHackingTargets(hackingTargets);
    sceneInstanceRef.current = scene;

    return () => {
      scene.dispose();
      sceneInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync stats and upgrades to scene instance
  useEffect(() => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.updateStatsAndUpgrades(
        stats,
        upgrades,
        failure,
        distToNextCity
      );
    }
  }, [stats, upgrades, failure, distToNextCity]);

  // Story interaction dispatcher
  const handleExecuteStoryInteraction = (target: StoryInteractionTarget) => {
    if (target.action === 'dashboard') {
      setIsDashboardOpen(true);
      setCampaignState((prev) => ({ ...prev, dashboardInspected: true }));
    } else if (target.action === 'starter_wreckage') {
      setStats((prev) => ({
        ...prev,
        fuel: Math.min(100, prev.fuel + 35),
        scrap: prev.scrap + 30,
        spareParts: prev.spareParts + 2,
      }));
      setCampaignState((prev) => ({ ...prev, scavengedStarterScrap: true }));
      audioEngine.playScrapChime();
      triggerDialogue({
        id: `story_wreckage_scavenged_${Date.now()}`,
        speaker: 'COURIER NOMAD',
        role: 'STRANDED IN OUTLANDS',
        channel: 'RADIO 94.2',
        text: "Scavenged fuel and nanite sealant from my wrecked hauler. If I patch the MULE's fuel line [V], I can begin the long crossing toward Relay Station Beta and find my way to civilization.",
      });
    } else if (target.action === 'relay_terminal') {
      setActiveCampaignTerminal('relay');
    } else if (target.action === 'repair_station') {
      setActiveDistressEvent('roadside_repair_station');
    } else if (target.action === 'tx84') {
      setActiveDistressEvent('maintenance_unit_tx84');
    } else if (target.action === 'foundry_terminal') {
      setActiveCampaignTerminal('foundry');
    } else if (target.action === 'expedition_buggy') {
      setActiveDistressEvent('wrecked_expedition_buggy');
    } else if (target.action === 'archive_terminal') {
      setActiveCampaignTerminal('archive');
    } else if (target.action === 'gate_terminal') {
      setActiveCampaignTerminal('gate');
    }
  };

  // Random roadside failure
  const triggerRandomMechanicalFailure = () => {
    const failures: MechanicalFailure[] = [
      {
        type: 'overheat',
        title: 'ENGINE THERMAL FLUX',
        description: 'Turbine cooling jacket clogged with fine sand. Maximum highway speed reduced by 30%.',
        solutionText: 'Stop vehicle and let turbine cool down, or spray nanite coolant from cargo.',
        severity: 'medium',
      },
      {
        type: 'puncture',
        title: 'PNEUMATIC TIRE PUNCTURE',
        description: 'Sharp slag shard pierced rear-left off-road tire. Rover drifting erratically on sand.',
        solutionText: 'Use 1 Nanite Spare Part to auto-seal tire casing.',
        severity: 'low',
      },
      {
        type: 'emp_glitch',
        title: 'CYBER-DECK BUS OVERLOAD',
        description: 'Electromagnetic static glitching dash HUD displays and scanner telemetry.',
        solutionText: 'Reboot cyberdeck bus from cockpit dashboard.',
        severity: 'low',
      },
    ];

    const pick = failures[Math.floor(Math.random() * failures.length)];
    setFailure(pick);
    audioEngine.playAlertBeep();
  };

  // Emergency Fuel Synthesis using Scraps
  const handleSynthesizeFuel = () => {
    if (stats.scrap >= 15) {
      setStats((prev) => ({
        ...prev,
        scrap: prev.scrap - 15,
        fuel: Math.min(100, prev.fuel + 35),
      }));
      audioEngine.playRepairSound();
    } else {
      audioEngine.playAlertBeep();
    }
  };

  // Drone Rare Tech Core Upgrade Selection
  const handleSelectDroneUpgrade = (choice: DroneUpgradeChoice) => {
    setShowDroneUpgrade(false);
    audioEngine.playUpgradeFanfare();

    if (choice === 'speed') {
      setStats((prev) => ({
        ...prev,
        maxSpeed: prev.maxSpeed + 15,
        acceleration: prev.acceleration + 5,
      }));
      setUpgrades((prev) => ({
        ...prev,
        engineLevel: Math.min(4, prev.engineLevel + 1),
      }));
    } else if (choice === 'durability') {
      setStats((prev) => ({
        ...prev,
        maxHealth: prev.maxHealth + 35,
        health: Math.min(prev.maxHealth + 35, prev.health + 60),
      }));
      setUpgrades((prev) => ({
        ...prev,
        hullLevel: Math.min(4, prev.hullLevel + 1),
      }));
    } else if (choice === 'efficiency') {
      setStats((prev) => ({
        ...prev,
        fuel: Math.min(100, prev.fuel + 50),
      }));
    }
  };

  // Repair component on dashboard
  const handleRepairComponent = () => {
    const wasInitialBreak = failure?.type === 'cracked_fuel_line';
    setStats((prev) => ({
      ...prev,
      scrap: Math.max(0, prev.scrap - 10),
      spareParts: Math.max(0, prev.spareParts - 1),
      health: Math.min(prev.maxHealth, prev.health + 25),
    }));
    setFailure(null);
    setCampaignState((prev) => ({ ...prev, muleRepaired: true }));
    if (wasInitialBreak) {
      triggerDialogue({
        id: `story_mule_repaired_${Date.now()}`,
        speaker: 'COURIER NOMAD',
        role: 'JOURNEY TO CIVILIZATION',
        channel: 'RADIO 94.2',
        text: 'Fuel manifold patched and turbine ignition is holding green. The MULE is ready to roll. Time to mount up [F] and drive north toward Relay Station Beta to pick up the transit corridor.',
      });
    }
  };

  const handleRoadsideRepair = () => {
    const wasInitialBreak = failure?.type === 'cracked_fuel_line';
    if (stats.spareParts >= 1 && stats.scrap >= 10) {
      setStats((prev) => ({
        ...prev,
        scrap: Math.max(0, prev.scrap - 10),
        spareParts: prev.spareParts - 1,
        health: Math.min(prev.maxHealth, prev.health + 25),
      }));
      setFailure(null);
      if (wasInitialBreak) {
        setCampaignState((prev) => ({ ...prev, muleRepaired: true, dashboardInspected: true }));
        triggerDialogue({
          id: `story_mule_repaired_${Date.now()}`,
          speaker: 'COURIER NOMAD',
          role: 'JOURNEY TO CIVILIZATION',
          channel: 'RADIO 94.2',
          text: 'Fuel manifold patched and turbine ignition is holding green. The MULE is ready to roll. Time to mount up [F] and drive north toward Relay Station Beta to pick up the transit corridor.',
        });
      }
      audioEngine.playRepairSound();
    } else if (stats.spareParts >= 1) {
      setStats((prev) => ({
        ...prev,
        spareParts: prev.spareParts - 1,
        health: Math.min(prev.maxHealth, prev.health + 35),
      }));
      setFailure(null);
      audioEngine.playRepairSound();
    } else {
      audioEngine.playAlertBeep();
    }
  };

  // Check story log unlocks
  const checkStoryLogUnlocks = (odo: number) => {
    setStoryLogs((prev) =>
      prev.map((log) => {
        if (!log.isRead && odo >= log.unlockedAtKm) {
          audioEngine.playBlasterSound();
          return { ...log, isRead: true };
        }
        return log;
      })
    );
  };

  // Hacking target breach success
  const handleBreachSuccess = (targetId: string, completedDaemons: HackingDaemon[]) => {
    setHackingTargets((prev) =>
      prev.map((t) => (t.id === targetId ? { ...t, isHacked: true } : t))
    );

    const scrapGain = completedDaemons.reduce((sum, d) => sum + d.scrapReward, 0);
    const partsGain = completedDaemons.reduce((sum, d) => sum + d.partsReward, 0);
    const battGain = completedDaemons.reduce((sum, d) => sum + d.batteryReward, 0);

    setStats((prev) => ({
      ...prev,
      scrap: prev.scrap + scrapGain,
      spareParts: prev.spareParts + partsGain,
      battery: Math.min(100, prev.battery + battGain),
    }));

    completedDaemons.forEach((d) => {
      if (d.storyLogId) {
        setStoryLogs((prev) =>
          prev.map((l) => (l.id === d.storyLogId ? { ...l, isRead: true } : l))
        );
      }
    });

    setActiveHackingTarget(null);
  };

  // --- Campaign Objectives & Advancements ---
  const handleCompleteRelayTerminal = () => {
    setCampaignState((prev) => ({
      ...prev,
      relayTerminalHacked: true,
      currentDestinationId: 'foundry',
    }));
    setCityIndex(1);
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.setDestinationIndex(1);
    }
    setStoryLogs((prev) =>
      prev.map((l) => (l.id === 'log_relay_corrupted' ? { ...l, isRead: true } : l))
    );
    setActiveCampaignTerminal(null);
    audioEngine.playCityFanfare();
    triggerDialogue({
      id: `story_relay_unlocked_${Date.now()}`,
      speaker: 'COURIER NOMAD',
      role: 'RELAY DECRYPTED',
      channel: 'ROUTE MAPPED',
      text: 'First relay beacon decrypted! The transponder locked onto the Sector 06 Automated Foundry, roughly 1.6 km northeast. Following the highway pylons across the badlands to locate the next relay link.',
    });
  };

  const handleCompleteFoundryTerminal = () => {
    setCampaignState((prev) => ({
      ...prev,
      foundryTerminalHacked: true,
      currentDestinationId: 'archive',
    }));
    setCityIndex(2);
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.setDestinationIndex(2);
    }
    setStoryLogs((prev) =>
      prev.map((l) => (l.id === 'log_foundry_records' ? { ...l, isRead: true } : l))
    );
    setActiveCampaignTerminal(null);
    audioEngine.playCityFanfare();
    triggerDialogue({
      id: `story_foundry_unlocked_${Date.now()}`,
      speaker: 'COURIER NOMAD',
      role: 'RELAY DECRYPTED',
      channel: 'ROUTE MAPPED',
      text: "Foundry mainframe bypassed! Navigational telemetry locked onto Sector 11 Deep Archive (~1.8 km Northwest). Halfway across the wasteland—civilization is getting closer with every relay beacon.",
    });
  };

  const handleCompleteArchiveTerminal = () => {
    setCampaignState((prev) => ({
      ...prev,
      archiveVaultHacked: true,
      timelineReconstructed: true,
      currentDestinationId: 'gate',
    }));
    setCityIndex(3);
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.setDestinationIndex(3);
    }
    setStoryLogs((prev) =>
      prev.map((l) => (l.id === 'log_aegis_triage' ? { ...l, isRead: true } : l))
    );
    setActiveCampaignTerminal(null);
    audioEngine.playCityFanfare();
    triggerDialogue({
      id: `story_archive_unlocked_${Date.now()}`,
      speaker: 'COURIER NOMAD',
      role: 'GATE CIPHER RECOVERED',
      channel: 'ROUTE MAPPED',
      text: 'Master perimeter cipher decoded! The final beacon is broadcasting from Sector 18: The Perimeter Gate of Haven-9. Civilization is just over the horizon—time to make the final run to the gates.',
    });
  };

  const handleChooseEnding = (ending: CampaignEndingType) => {
    setChosenEnding(ending);
    setCampaignState((prev) => ({
      ...prev,
      chosenEnding: ending,
      finishTime: Date.now(),
    }));
    setActiveCampaignTerminal(null);
    setGameState('ending');
  };

  // Helper strings for current Campaign Stage
  const getCampaignChapterTitle = (): string => {
    if (cityIndex === 0) return 'DESTINATION 1 // THE OUTLAND RELAY';
    if (cityIndex === 1) return 'DESTINATION 2 // THE AUTOMATED FOUNDRY';
    if (cityIndex === 2) return 'DESTINATION 3 // THE DEEP ARCHIVE';
    return 'DESTINATION 4 // THE PERIMETER GATE';
  };

  const getCampaignObjective = (): string => {
    if (cityIndex === 0) {
      if (!campaignState.dashboardInspected) return 'Inspect MULE dashboard diagnostics [V]';
      if (!campaignState.muleRepaired) return 'Search crashed cargo debris & patch cracked fuel line';
      if (!campaignState.relayGeneratorActive) return 'Enter Relay & flip auxiliary power breaker [E]';
      if (!campaignState.relayTerminalHacked) return 'Hack Relay comms terminal & extract navigation key [E]';
      return 'Depart for The Foundry (1.8 km NE)';
    }
    if (cityIndex === 1) {
      if (!campaignState.foundryTerminalHacked) {
        return 'Investigate TX-84 distress ping, bypass sentry & breach Foundry mainframe';
      }
      return 'Depart for The Deep Archive (3.6 km)';
    }
    if (cityIndex === 2) {
      if (!campaignState.hasDrChenKey && !campaignState.expeditionBuggySearched) {
        return 'Traverse badlands, search wrecked expedition buggy & splice archive conduit';
      }
      if (!campaignState.timelineReconstructed) {
        return 'Reconstruct AEGIS triage timeline in Archive datavault';
      }
      return 'Head to Sector 18: The Perimeter Gate';
    }
    return 'Confront AEGIS Root Mainframe & decide the fate of Haven-9';
  };

  // Upgrades & Ripperdoc
  const handleInstallUpgrade = (item: UpgradeItem) => {
    if (stats.scrap >= item.costScrap && stats.spareParts >= item.costParts) {
      setStats((prev) => ({
        ...prev,
        scrap: prev.scrap - item.costScrap,
        spareParts: prev.spareParts - item.costParts,
      }));
      setUpgrades((prev) => {
        const next = { ...prev };
        if (item.category === 'hull') next.hullLevel = item.tier;
        if (item.category === 'engine') next.engineLevel = item.tier;
        if (item.category === 'suspension') next.suspensionLevel = item.tier;
        if (item.category === 'emp') next.empLevel = item.tier;
        if (item.category === 'solar') next.solarLevel = item.tier;
        if (item.category === 'drone') next.droneLevel = item.tier;
        return next;
      });
      audioEngine.playUpgradeFanfare();
    }
  };

  const handleInstallCyberware = (item: CyberwareItem) => {
    if (stats.scrap >= item.costScrap && stats.spareParts >= item.costParts) {
      setStats((prev) => ({
        ...prev,
        scrap: prev.scrap - item.costScrap,
        spareParts: prev.spareParts - item.costParts,
      }));
      setCyberwareList((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, installed: true } : c))
      );
      audioEngine.playUpgradeFanfare();
    }
  };

  const handleRepairVehicle = () => {
    const cost = Math.round((stats.maxHealth - stats.health) * 0.8);
    if (stats.scrap >= cost) {
      setStats((prev) => ({
        ...prev,
        scrap: prev.scrap - cost,
        health: prev.maxHealth,
      }));
      audioEngine.playRepairSound();
    }
  };

  const handleRefuelVehicle = () => {
    const cost = Math.round((100 - stats.fuel) * 0.5);
    if (stats.scrap >= cost) {
      setStats((prev) => ({
        ...prev,
        scrap: prev.scrap - cost,
        fuel: 100,
      }));
      audioEngine.playRepairSound();
    }
  };

  const handleBuySpareParts = () => {
    if (stats.scrap >= 40) {
      setStats((prev) => ({
        ...prev,
        scrap: prev.scrap - 40,
        spareParts: prev.spareParts + 1,
      }));
      audioEngine.playScrapChime();
    }
  };

  const handleContinueDriving = () => {
    setGameState('driving');
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.departCity(cityIndex);
    }
  };

  // Weather & Radio
  const handleCycleWeather = () => {
    if (sceneInstanceRef.current) {
      const nextW = sceneInstanceRef.current.cycleWeather();
      setCurrentWeather(nextW);
    }
  };

  const handleCycleRadio = () => {
    const nextStation = audioEngine.cycleStation();
    setStationName(nextStation);
    setTrackName(audioEngine.getCurrentTrackName());
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioEngine.setMuted(nextMute);
  };

  const handleCycleCamera = () => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.cycleCameraView();
      setCameraMode(sceneInstanceRef.current.getCameraView());
    }
  };

  const handleToggleAcidShield = () => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.toggleAcidShield();
    }
  };

  const handleStartGame = () => {
    audioEngine.init();
    audioEngine.resume();
    setShowSettingIntro(true);
  };

  const handleBeginExpeditionFromIntro = () => {
    setShowSettingIntro(false);
    setGameState('driving');
    triggerDialogue({
      id: 'story_stranded_prologue',
      speaker: 'COURIER NOMAD',
      role: 'STRANDED IN WASTELAND',
      channel: 'RADIO 94.2',
      text: "The EMP shockwave knocked out my navigation array and wrecked my transport in this dead basin. I'm stranded out in the wasteland. My only way back to civilization is tracing the old pre-collapse transponder relays. Relay Station Beta is ~350m north—I need to get the MULE running and reach that tower.",
      priority: 'urgent',
    });
  };

  const handleRestartGame = () => {
    setIsPaused(false);
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.setPaused(false);
      sceneInstanceRef.current.setDestinationIndex(0);
    }
    setStats(INITIAL_STATS);
    setUpgrades(INITIAL_UPGRADES);
    setFailure(INITIAL_FAILURE);
    setCampaignState(INITIAL_CAMPAIGN_STATE);
    setCityIndex(0);
    setGameState('driving');
    setIsOnFoot(true);
    setChosenEnding(null);
    setActiveCampaignTerminal(null);
  };

  // Global pause shortcut listener (Escape or P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (
          gameState === 'driving' &&
          !isDashboardOpen &&
          !activeDistressEvent &&
          !activeCampaignTerminal &&
          !activeHackingTarget &&
          !journalOpen &&
          !showDroneUpgrade &&
          !showSettingIntro &&
          !chosenEnding
        ) {
          e.preventDefault();
          handleTogglePause();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    gameState,
    isDashboardOpen,
    activeDistressEvent,
    activeCampaignTerminal,
    activeHackingTarget,
    journalOpen,
    showDroneUpgrade,
    showSettingIntro,
    chosenEnding,
    handleTogglePause,
  ]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#07090e] select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* Title Screen Overlay */}
      {gameState === 'title' && !showSettingIntro && (
        <TitleScreen
          onStartGame={handleStartGame}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Setting Lore Intro Modal */}
      {showSettingIntro && (
        <SettingIntroModal
          onBeginGame={handleBeginExpeditionFromIntro}
          onSkip={handleBeginExpeditionFromIntro}
        />
      )}

      {/* In-Game HUD Overlay */}
      {gameState === 'driving' && (
        <GameHUD
          stats={stats}
          upgrades={upgrades}
          failure={failure}
          currentCityName={currentCity.name}
          distToNextCity={distToNextCity}
          totalCityDist={totalCityDist}
          nearestCity={nearestCity}
          cameraMode={cameraMode}
          isMuted={isMuted}
          radioOn={radioOn}
          currentStationName={stationName}
          currentTrackName={trackName}
          activeDialogue={currentDialogue}
          onDismissDialogue={handleDismissDialogue}
          onNextDialogue={handleNextDialogue}
          hasMoreDialogues={dialogueQueue.length > 0}
          isOnFoot={isOnFoot}
          distToRover={distToRover}
          isScannerActive={isScannerActive}
          nearestHackingTarget={nearestHackingTarget}
          scannerTargets={scannerTargets}
          cyberwareList={cyberwareList}
          currentWeather={currentWeather}
          campaignChapterTitle={getCampaignChapterTitle()}
          campaignObjective={getCampaignObjective()}
          storyPrompt={storyPrompt}
          onTriggerStoryPrompt={() => storyPrompt && handleExecuteStoryInteraction(storyPrompt)}
          onOpenDashboard={() => setIsDashboardOpen(true)}
          onCycleWeather={handleCycleWeather}
          onTogglePlayerMode={() => sceneInstanceRef.current?.togglePlayerMode()}
          onToggleScanner={() => sceneInstanceRef.current?.toggleScannerMode()}
          onTriggerHacking={() => sceneInstanceRef.current?.triggerHackingNear()}
          onTriggerEmp={() => sceneInstanceRef.current?.triggerEmpBlaster()}
          onTriggerScavenge={() => sceneInstanceRef.current?.triggerContextualInteraction()}
          onRoadsideRepair={handleRoadsideRepair}
          onSynthesizeFuel={handleSynthesizeFuel}
          onCycleCamera={handleCycleCamera}
          onCycleRadio={handleCycleRadio}
          onToggleMute={handleToggleMute}
          onOpenJournal={() => setJournalOpen(true)}
          onVirtualDrive={(code, held) => sceneInstanceRef.current?.setVirtualInput(code, held)}
          isAcidShieldActive={isAcidShieldActive}
          onToggleAcidShield={handleToggleAcidShield}
          acidRainShieldStatus={acidRainShieldStatus}
          onPause={handleTogglePause}
        />
      )}

      {/* Drone Tech Core Field Upgrade Modal */}
      {showDroneUpgrade && (
        <DroneUpgradeModal
          currentStats={stats}
          currentUpgrades={upgrades}
          onSelectUpgrade={handleSelectDroneUpgrade}
        />
      )}

      {/* Dashboard Diagnostics & Component Repair Modal */}
      {isDashboardOpen && (
        <DashboardModal
          stats={stats}
          upgrades={upgrades}
          failure={failure}
          onRepairComponent={handleRepairComponent}
          onClose={() => setIsDashboardOpen(false)}
        />
      )}

      {/* Distress Signal & Story Landmark Modal */}
      {activeDistressEvent && (
        <DistressSignalModal
          eventType={activeDistressEvent}
          stats={stats}
          helpedMaintenanceUnit={campaignState.helpedMaintenanceUnit}
          hasDrChenKey={campaignState.hasDrChenKey}
          onHelpMaintenanceUnit={() => {
            setStats((prev) => ({
              ...prev,
              spareParts: Math.max(0, prev.spareParts - 2),
              battery: Math.max(0, prev.battery - 20),
            }));
            setCampaignState((prev) => ({ ...prev, helpedMaintenanceUnit: true }));
          }}
          onScavengeMaintenanceUnit={() => {
            setStats((prev) => ({ ...prev, scrap: prev.scrap + 45 }));
            setCampaignState((prev) => ({ ...prev, helpedMaintenanceUnit: false }));
          }}
          onSearchExpeditionBuggy={() => {
            setCampaignState((prev) => ({
              ...prev,
              hasDrChenKey: true,
              expeditionBuggySearched: true,
            }));
            setStoryLogs((prev) =>
              prev.map((l) => (l.id === 'log_chen_diary' ? { ...l, isRead: true } : l))
            );
          }}
          onRoadsideRecharge={() => {
            setStats((prev) => ({ ...prev, battery: 100 }));
            audioEngine.playUpgradeFanfare();
          }}
          onRoadsideCraftPart={() => {
            setStats((prev) => ({
              ...prev,
              scrap: prev.scrap - 35,
              spareParts: prev.spareParts + 1,
            }));
            audioEngine.playScrapChime();
          }}
          onClose={() => setActiveDistressEvent(null)}
        />
      )}

      {/* Campaign Interactive Terminals Modal (Relay, Foundry, Archive, Gate) */}
      {activeCampaignTerminal && (
        <CampaignTerminalModal
          destinationId={activeCampaignTerminal}
          campaignState={campaignState}
          onRestoreRelayPower={() => {
            setCampaignState((prev) => ({ ...prev, relayGeneratorActive: true }));
            audioEngine.playUpgradeFanfare();
          }}
          onCompleteRelayTerminal={handleCompleteRelayTerminal}
          onRestoreFoundryPower={() => {
            setCampaignState((prev) => ({ ...prev, foundryPowerRestored: true }));
            audioEngine.playUpgradeFanfare();
          }}
          onDisableFoundryTurret={() => {
            setCampaignState((prev) => ({ ...prev, foundryTurretDisabled: true }));
            audioEngine.playBlasterSound();
          }}
          onCompleteFoundryTerminal={handleCompleteFoundryTerminal}
          onRepairArchiveConduit={() => {
            setCampaignState((prev) => ({ ...prev, archiveConduitRepaired: true }));
            audioEngine.playRepairSound();
          }}
          onCompleteArchiveTerminal={handleCompleteArchiveTerminal}
          onChooseEnding={handleChooseEnding}
          onClose={() => setActiveCampaignTerminal(null)}
        />
      )}

      {/* Cyberdeck Breach Protocol Modal */}
      {activeHackingTarget && (
        <CyberdeckModal
          target={activeHackingTarget}
          bonusBufferSlots={Math.max(0, (cyberwareList.find((c) => c.slot === 'cyberdeck' && c.installed)?.statBonus.bufferSlotsBonus || 4) - 4)}
          bonusTimeSec={cyberwareList.find((c) => c.slot === 'neural' && c.installed)?.statBonus.hackTimeBonusSec || 0}
          onSuccess={handleBreachSuccess}
          onClose={() => setActiveHackingTarget(null)}
        />
      )}

      {/* City Haven Modal */}
      {gameState === 'city' && (
        <CityHavenModal
          city={currentCity}
          stats={stats}
          upgrades={upgrades}
          storyLogs={storyLogs.filter((l) => l.isRead)}
          cyberwareList={cyberwareList}
          onUpgrade={handleInstallUpgrade}
          onRepairVehicle={handleRepairVehicle}
          onRefuelVehicle={handleRefuelVehicle}
          onBuySpareParts={handleBuySpareParts}
          onInstallCyberware={handleInstallCyberware}
          onContinueDriving={handleContinueDriving}
        />
      )}

      {/* Story Journal Modal */}
      {journalOpen && (
        <StoryJournalModal
          logs={storyLogs.filter((l) => l.isRead)}
          onClose={() => setJournalOpen(false)}
        />
      )}

      {/* Ending & Results Screen Modal */}
      {gameState === 'ending' && chosenEnding && (
        <EndingResultsModal
          endingType={chosenEnding}
          campaignState={campaignState}
          stats={stats}
          onRestartCampaign={handleRestartGame}
          onContinueFreeRoam={() => setGameState('driving')}
        />
      )}

      {/* Pause Screen Modal with Audio Mixer, Soundscaping, and Controls */}
      {isPaused && gameState === 'driving' && (
        <PauseScreenModal
          stats={stats}
          upgrades={upgrades}
          currentCityName={currentCity.name}
          distToNextCity={distToNextCity}
          campaignChapterTitle={getCampaignChapterTitle()}
          campaignObjective={getCampaignObjective()}
          cameraMode={cameraMode}
          currentWeather={currentWeather}
          currentStationName={stationName}
          currentTrackName={trackName}
          radioOn={radioOn}
          onResume={handleResume}
          onRestart={handleRestartGame}
          onCycleCamera={handleCycleCamera}
          onSetCameraMode={(mode) => {
            if (sceneInstanceRef.current) {
              sceneInstanceRef.current.setCameraView(mode);
              setCameraMode(mode);
            }
          }}
          onCycleRadio={handleCycleRadio}
          onSetRadioStation={(idx) => {
            const stName = audioEngine.setStation(idx);
            setStationName(stName);
            setTrackName(audioEngine.getCurrentTrackName());
          }}
          onToggleRadio={() => {
            const nextOn = !radioOn;
            setRadioOn(nextOn);
            audioEngine.setRadioMuted(!nextOn);
          }}
          onCycleWeather={handleCycleWeather}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'gameover' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md select-none">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#090c15] p-6 text-slate-100 shadow-2xl text-center">
            <h3 className="font-cyber font-bold text-2xl text-rose-400 tracking-wider mb-2">
              EXPEDITION HALTED
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              MULE sustained critical structural collapse in the wasteland. A lone nomad recovery drone towed your chassis to safety and recharged your core.
            </p>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 mb-6 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Exploration Distance:</span>
              <strong className="text-amber-400 font-mono-nums">{stats.odometer.toFixed(2)} km</strong>
            </div>

            <button
              onClick={handleRestartGame}
              className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-cyber font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESTART CAMPAIGN & RESUME</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
