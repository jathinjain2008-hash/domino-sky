import {
  ConnectionImpact,
  DisruptionScenario,
  FlightSimState,
  SimulationResult,
} from './aviation';

export type ReplayStage = 1 | 2 | 3 | 4 | 5 | 6;

export interface ReplayStageDefinition {
  stage: ReplayStage;
  shortLabel: string;
  title: string;
  subtitle: string;
}

export const REPLAY_STAGES: ReplayStageDefinition[] = [
  {
    stage: 1,
    shortLabel: '1. The Event',
    title: 'Initial Airport Disruption',
    subtitle: 'Primary restriction activates at the origin airport.',
  },
  {
    stage: 2,
    shortLabel: '2. Direct Impact',
    title: 'Station Departures & Arrivals Held',
    subtitle: 'Flights inside the disruption window absorb direct ground or flow delays.',
  },
  {
    stage: 3,
    shortLabel: '3. Rotation Cascade',
    title: 'Downstream Tail Propagation',
    subtitle: 'Late inbound aircraft compress turnaround buffers across subsequent sectors.',
  },
  {
    stage: 4,
    shortLabel: '4. Connection Impact',
    title: 'Hub Transfer Window Breaches',
    subtitle: 'Connecting passenger banks miss minimum connect times at major hubs.',
  },
  {
    stage: 5,
    shortLabel: '5. Network Impact',
    title: 'Full Unrecovered Consequences',
    subtitle: 'Crew duty limits, cancellations, and national network delay footprint.',
  },
  {
    stage: 6,
    shortLabel: '6. Recovery',
    title: 'Dispatch Recovery & Restoration',
    subtitle: 'Spare aircraft, tail swaps, holds, and express turns restore network flow.',
  },
];

export interface ReplayStageSnapshot {
  stage: ReplayStage;
  simulation: SimulationResult;
  highlightedAirportCodes: Set<string>;
  primaryAirportCode: string | null;
  directFlightIds: Set<string>;
  cascadeFlightIds: Set<string>;
  cancelledFlightIds: Set<string>;
  recoveredFlightIds: Set<string>;
  connectionHubCodes: Set<string>;
  missedConnectionsAtStage: ConnectionImpact[];
  headlineMetricLabel: string;
  headlineMetricValue: string;
  narrative: string;
  keyFlights: FlightSimState[];
}

export function buildReplayStageSnapshot(
  stage: ReplayStage,
  scenario: DisruptionScenario | null,
  disruptedBaseline: SimulationResult,
  currentSimulation: SimulationResult,
  appliedActionsCount: number
): ReplayStageSnapshot {
  // Stage 6 uses recovered simulation if actions applied; stages 1-5 inspect the disruption cascade progression
  const sim = stage === 6 ? currentSimulation : disruptedBaseline;
  const primaryAirportCode = scenario?.airportCode ?? null;

  const directFlights = sim.flights.filter(
    (f) =>
      (f.status === 'delayed' || f.status === 'cancelled') &&
      !f.affectedByRotation &&
      (f.origin === primaryAirportCode || f.destination === primaryAirportCode)
  );
  const directFlightIds = new Set(directFlights.map((f) => f.id));

  const cascadeFlights = sim.flights.filter(
    (f) => f.affectedByRotation && (f.status === 'delayed' || f.status === 'cancelled')
  );
  const cascadeFlightIds = new Set(cascadeFlights.map((f) => f.id));

  const cancelledFlights = sim.flights.filter((f) => f.status === 'cancelled');
  const cancelledFlightIds = new Set(cancelledFlights.map((f) => f.id));

  const recoveredFlights = sim.flights.filter((f) => f.status === 'recovered');
  const recoveredFlightIds = new Set(recoveredFlights.map((f) => f.id));

  const missedConns = sim.connections.filter((c) => c.status === 'missed');
  const savedConns = sim.connections.filter((c) => c.status === 'saved');

  const highlightedAirportCodes = new Set<string>();
  const connectionHubCodes = new Set<string>();

  if (primaryAirportCode) {
    highlightedAirportCodes.add(primaryAirportCode);
  }

  if (stage >= 2) {
    for (const f of directFlights) {
      highlightedAirportCodes.add(f.origin);
      highlightedAirportCodes.add(f.destination);
    }
  }
  if (stage >= 3) {
    for (const f of cascadeFlights) {
      highlightedAirportCodes.add(f.origin);
      highlightedAirportCodes.add(f.destination);
    }
  }
  if (stage >= 4) {
    for (const c of missedConns) {
      connectionHubCodes.add(c.connection.airportCode);
      highlightedAirportCodes.add(c.connection.airportCode);
    }
  }

  if (!scenario) {
    return {
      stage,
      simulation: sim,
      highlightedAirportCodes,
      primaryAirportCode: null,
      directFlightIds,
      cascadeFlightIds,
      cancelledFlightIds,
      recoveredFlightIds,
      connectionHubCodes,
      missedConnectionsAtStage: [],
      headlineMetricLabel: 'Network Status',
      headlineMetricValue: '100% Nominal',
      narrative:
        'Select an Indian airport on the map or choose a disruption scenario to replay how local delays ripple across aircraft rotations and passenger hubs.',
      keyFlights: [],
    };
  }

  const apInfo = sim.airports[scenario.airportCode];
  const apLabel = `${scenario.airportCode} (${apInfo?.city ?? scenario.airportCode})`;

  if (stage === 1) {
    const typeText =
      scenario.type === 'closure'
        ? 'full airport closure'
        : scenario.type === 'thunderstorm'
        ? 'severe convective weather slowdown'
        : 'single-runway flow restriction';
    return {
      stage,
      simulation: sim,
      highlightedAirportCodes: new Set([scenario.airportCode]),
      primaryAirportCode,
      directFlightIds: new Set(),
      cascadeFlightIds: new Set(),
      cancelledFlightIds: new Set(),
      recoveredFlightIds: new Set(),
      connectionHubCodes: new Set(),
      missedConnectionsAtStage: [],
      headlineMetricLabel: 'Origin Station Restricted',
      headlineMetricValue: `${scenario.airportCode} · ${scenario.durationMin}m`,
      narrative: `At ${apLabel}, a ${typeText} begins for ${scenario.durationMin} minutes. Departures and arrivals scheduled in this window immediately face ground holds and slot queuing.`,
      keyFlights: directFlights.slice(0, 4),
    };
  }

  if (stage === 2) {
    const directDelaySum = directFlights.reduce(
      (s, f) => s + Math.max(f.depDelayMin, f.arrDelayMin),
      0
    );
    return {
      stage,
      simulation: sim,
      highlightedAirportCodes,
      primaryAirportCode,
      directFlightIds,
      cascadeFlightIds: new Set(),
      cancelledFlightIds: new Set(directFlights.filter((f) => f.status === 'cancelled').map((f) => f.id)),
      recoveredFlightIds: new Set(),
      connectionHubCodes: new Set(),
      missedConnectionsAtStage: [],
      headlineMetricLabel: 'Directly Held Flights',
      headlineMetricValue: `${directFlights.length} flights (${directDelaySum}m)`,
      narrative: `${directFlights.length} departures and arrivals touching ${scenario.airportCode} absorb direct disruption delays totaling ${directDelaySum} minutes before downstream rotations even leave their next gates.`,
      keyFlights: directFlights.slice(0, 5),
    };
  }

  if (stage === 3) {
    const uniqueTails = new Set(cascadeFlights.map((f) => f.effectiveAircraftId)).size;
    return {
      stage,
      simulation: sim,
      highlightedAirportCodes,
      primaryAirportCode,
      directFlightIds,
      cascadeFlightIds,
      cancelledFlightIds,
      recoveredFlightIds: new Set(),
      connectionHubCodes: new Set(),
      missedConnectionsAtStage: [],
      headlineMetricLabel: 'Rotation-Cascaded Legs',
      headlineMetricValue: `${cascadeFlights.length} legs · ${uniqueTails} aircraft`,
      narrative: `Because turnaround buffers are only 35–45 minutes, delayed inbound aircraft carry delays onward to ${cascadeFlights.length} downstream sectors across ${uniqueTails} tail rotations.`,
      keyFlights: cascadeFlights.slice(0, 5),
    };
  }

  if (stage === 4) {
    const missedPax = missedConns.reduce((s, c) => s + c.affectedPassengers, 0);
    return {
      stage,
      simulation: sim,
      highlightedAirportCodes,
      primaryAirportCode,
      directFlightIds,
      cascadeFlightIds,
      cancelledFlightIds,
      recoveredFlightIds: new Set(),
      connectionHubCodes,
      missedConnectionsAtStage: missedConns,
      headlineMetricLabel: 'Missed Hub Connections',
      headlineMetricValue: `${missedPax} pax (${missedConns.length} waves)`,
      narrative: `Late arrivals shrink transfer windows below the 35-minute minimum connect time across ${connectionHubCodes.size} hub airport(s), misconnecting ${missedPax} passengers.`,
      keyFlights: sim.flights.filter((f) => f.missedInboundConnections > 0).slice(0, 5),
    };
  }

  if (stage === 5) {
    return {
      stage,
      simulation: sim,
      highlightedAirportCodes,
      primaryAirportCode,
      directFlightIds,
      cascadeFlightIds,
      cancelledFlightIds,
      recoveredFlightIds: new Set(),
      connectionHubCodes,
      missedConnectionsAtStage: missedConns,
      headlineMetricLabel: 'Total Unrecovered Impact',
      headlineMetricValue: `${sim.metrics.affectedPassengers.toLocaleString()} pax · ${sim.metrics.totalDelayMin}m`,
      narrative: `Full network impact without recovery: ${sim.metrics.delayedFlights} delayed flights, ${sim.metrics.cancelledFlights} cancellations, ${sim.metrics.totalDelayMin} total delay minutes, and ${sim.metrics.affectedPassengers.toLocaleString()} disrupted passengers across ${highlightedAirportCodes.size} airports.`,
      keyFlights: [...cancelledFlights, ...cascadeFlights].slice(0, 5),
    };
  }

  // Stage 6 — Recovery
  if (appliedActionsCount === 0) {
    return {
      stage,
      simulation: sim,
      highlightedAirportCodes,
      primaryAirportCode,
      directFlightIds,
      cascadeFlightIds,
      cancelledFlightIds,
      recoveredFlightIds,
      connectionHubCodes,
      missedConnectionsAtStage: missedConns,
      headlineMetricLabel: 'Recovery Pending',
      headlineMetricValue: '0 actions applied',
      narrative: `No recovery actions have been applied yet. Open the Recovery Lab to deploy standby spares, execute tail swaps, prioritize turns, or hold hub connections.`,
      keyFlights: sim.flights.filter((f) => f.status !== 'on_time').slice(0, 5),
    };
  }

  const delaySaved = disruptedBaseline.metrics.totalDelayMin - currentSimulation.metrics.totalDelayMin;
  const paxSaved = disruptedBaseline.metrics.affectedPassengers - currentSimulation.metrics.affectedPassengers;
  return {
    stage,
    simulation: currentSimulation,
    highlightedAirportCodes,
    primaryAirportCode,
    directFlightIds,
    cascadeFlightIds,
    cancelledFlightIds,
    recoveredFlightIds,
    connectionHubCodes,
    missedConnectionsAtStage: missedConns,
    headlineMetricLabel: 'Recovered Network State',
    headlineMetricValue: `${recoveredFlights.length} recovered · ${savedConns.length} conn saved`,
    narrative: `${appliedActionsCount} recovery decision(s) restored ${recoveredFlights.length} flight(s), eliminated ${Math.max(0, delaySaved)} delay minutes, and protected ${Math.max(0, paxSaved)} passenger journeys.`,
    keyFlights: recoveredFlights.slice(0, 5),
  };
}
