import {
  AirlineDataset,
  AirportImpact,
  ConnectionImpact,
  DisruptionScenario,
  Flight,
  FlightSimState,
  RecoveryAction,
  SimulationMetrics,
  SimulationResult,
  TimelineEvent,
} from '../types/aviation';
import { formatDuration, formatMinutesToHHMM } from '../utils/time';

interface EffectiveScheduleState {
  effectiveAircraftMap: Map<string, string>;
  turnaroundReductionMap: Map<string, number>;
  holdMap: Map<string, number>;
  manualCancelSet: Set<string>;
  recoveryReasonMap: Map<string, string[]>;
}

const DEFAULT_ASSUMPTIONS = [
  'Minimum aircraft turnaround is 35-45 min by airframe type; priority ground handling can compress turns by 15 min (25 min safety floor).',
  'Airport closures hold all scheduled arrivals and departures in the window until reopening, released in staggered 6-8 min runway slots.',
  'Thunderstorms and runway restrictions impose deterministic flow-rate queuing delays proportional to movement density in the disruption window.',
  'Crew duty timeouts occur when cumulative duty exceeds FAR-modeled maxDutyMin + 60 min (with up to +25 min extension between maxDutyMin and +60 min).',
  'Flights delayed 225 min or more without recovery are cancelled; subsequent legs on that stranded tail cancel unless covered by a spare or tail swap.',
  'Passenger impact deduplicates individuals whose inbound or outbound flight is cancelled so affected headcounts are never inflated.',
];

function applyRecoveryOverrides(
  dataset: AirlineDataset,
  actions: RecoveryAction[]
): EffectiveScheduleState {
  const effectiveAircraftMap = new Map<string, string>();
  for (const f of dataset.flights) {
    effectiveAircraftMap.set(f.id, f.aircraftId);
  }

  const turnaroundReductionMap = new Map<string, number>();
  const holdMap = new Map<string, number>();
  const manualCancelSet = new Set<string>();
  const recoveryReasonMap = new Map<string, string[]>();

  const addReason = (flightId: string, actionId: string) => {
    const existing = recoveryReasonMap.get(flightId) ?? [];
    if (!existing.includes(actionId)) {
      recoveryReasonMap.set(flightId, [...existing, actionId]);
    }
  };

  for (const action of actions) {
    const targetFlight = dataset.flights.find((f) => f.id === action.targetFlightId);
    if (!targetFlight) continue;

    if (action.type === 'assign_spare' && action.spareAircraftId) {
      const origAc = effectiveAircraftMap.get(targetFlight.id);
      const affectedChain = dataset.flights
        .filter(
          (f) =>
            effectiveAircraftMap.get(f.id) === origAc &&
            f.scheduledDepMin >= targetFlight.scheduledDepMin
        )
        .sort((a, b) => a.scheduledDepMin - b.scheduledDepMin);

      for (const leg of affectedChain) {
        effectiveAircraftMap.set(leg.id, action.spareAircraftId);
        addReason(leg.id, action.id);
      }
    } else if (action.type === 'swap_aircraft' && action.secondaryFlightId) {
      const secondary = dataset.flights.find((f) => f.id === action.secondaryFlightId);
      if (!secondary) continue;

      const acA = effectiveAircraftMap.get(targetFlight.id);
      const acB = effectiveAircraftMap.get(secondary.id);
      if (!acA || !acB || acA === acB) continue;

      const tailALegs = dataset.flights.filter(
        (f) =>
          effectiveAircraftMap.get(f.id) === acA &&
          f.scheduledDepMin >= targetFlight.scheduledDepMin
      );
      const tailBLegs = dataset.flights.filter(
        (f) =>
          effectiveAircraftMap.get(f.id) === acB &&
          f.scheduledDepMin >= secondary.scheduledDepMin
      );

      for (const leg of tailALegs) {
        effectiveAircraftMap.set(leg.id, acB);
        addReason(leg.id, action.id);
      }
      for (const leg of tailBLegs) {
        effectiveAircraftMap.set(leg.id, acA);
        addReason(leg.id, action.id);
      }
    } else if (action.type === 'prioritize_turnaround') {
      const savings = action.turnaroundSavingsMin ?? 15;
      const prev = turnaroundReductionMap.get(targetFlight.id) ?? 0;
      turnaroundReductionMap.set(targetFlight.id, Math.max(prev, savings));
      addReason(targetFlight.id, action.id);
    } else if (action.type === 'hold_for_connections') {
      const hold = action.holdMinutes ?? 18;
      holdMap.set(targetFlight.id, Math.max(holdMap.get(targetFlight.id) ?? 0, hold));
      addReason(targetFlight.id, action.id);
    } else if (action.type === 'cancel_flight') {
      manualCancelSet.add(targetFlight.id);
      addReason(targetFlight.id, action.id);
      if (action.secondaryFlightId) {
        manualCancelSet.add(action.secondaryFlightId);
        addReason(action.secondaryFlightId, action.id);
      }
    }
  }

  return {
    effectiveAircraftMap,
    turnaroundReductionMap,
    holdMap,
    manualCancelSet,
    recoveryReasonMap,
  };
}

function computeDirectAirportDisruption(
  flights: Flight[],
  scenario: DisruptionScenario
): {
  depDelayByFlight: Map<string, number>;
  arrDelayByFlight: Map<string, number>;
} {
  const depDelayByFlight = new Map<string, number>();
  const arrDelayByFlight = new Map<string, number>();

  const winStart = scenario.startTimeMin;
  const winEnd = scenario.startTimeMin + scenario.durationMin;

  // Departures at disrupted airport inside window
  const impactedDeps = flights
    .filter(
      (f) =>
        f.origin === scenario.airportCode &&
        f.scheduledDepMin >= winStart &&
        f.scheduledDepMin < winEnd
    )
    .sort((a, b) => a.scheduledDepMin - b.scheduledDepMin);

  impactedDeps.forEach((f, idx) => {
    let delay = 0;
    if (scenario.type === 'closure') {
      delay = winEnd - f.scheduledDepMin + idx * 8;
    } else if (scenario.type === 'thunderstorm') {
      const base = Math.round(Math.min(scenario.durationMin * 0.72, 28 + scenario.durationMin * 0.42));
      const posFactor = Math.round(((winEnd - f.scheduledDepMin) / Math.max(1, scenario.durationMin)) * 18);
      delay = base + posFactor + idx * 9;
    } else {
      // runway_restriction
      const cap = Math.max(42, Math.round(scenario.durationMin * 0.65));
      delay = Math.min(cap, 26 + idx * 9);
    }
    depDelayByFlight.set(f.id, Math.max(0, Math.round(delay)));
  });

  // Arrivals at disrupted airport inside window
  const impactedArrs = flights
    .filter(
      (f) =>
        f.destination === scenario.airportCode &&
        f.scheduledArrMin >= winStart &&
        f.scheduledArrMin < winEnd
    )
    .sort((a, b) => a.scheduledArrMin - b.scheduledArrMin);

  impactedArrs.forEach((f, idx) => {
    let delay = 0;
    if (scenario.type === 'closure') {
      delay = winEnd - f.scheduledArrMin + idx * 6;
    } else if (scenario.type === 'thunderstorm') {
      const base = Math.round(Math.min(scenario.durationMin * 0.58, 22 + scenario.durationMin * 0.32));
      delay = base + idx * 7;
    } else {
      const cap = Math.max(36, Math.round(scenario.durationMin * 0.55));
      delay = Math.min(cap, 22 + idx * 7);
    }
    arrDelayByFlight.set(f.id, Math.max(0, Math.round(delay)));
  });

  return { depDelayByFlight, arrDelayByFlight };
}

export function runSimulation(
  dataset: AirlineDataset,
  rawScenario: DisruptionScenario | null,
  appliedActions: RecoveryAction[] = [],
  unrecoveredBaseline?: SimulationResult | null
): SimulationResult {
  const airportSet = new Set(dataset.airports.map((a) => a.code));
  const scenario: DisruptionScenario | null =
    rawScenario && airportSet.has(rawScenario.airportCode)
      ? {
          ...rawScenario,
          startTimeMin: Number.isFinite(rawScenario.startTimeMin)
            ? Math.max(0, Math.min(1439, Math.round(rawScenario.startTimeMin)))
            : 480,
          durationMin: Number.isFinite(rawScenario.durationMin)
            ? Math.max(15, Math.min(480, Math.round(rawScenario.durationMin)))
            : 120,
        }
      : null;

  const aircraftMap = new Map(dataset.aircraft.map((a) => [a.id, a]));
  const crewMap = new Map(dataset.crew.map((c) => [c.id, c]));
  const overrides = applyRecoveryOverrides(dataset, appliedActions);

  const directDisruption = scenario
    ? computeDirectAirportDisruption(dataset.flights, scenario)
    : { depDelayByFlight: new Map<string, number>(), arrDelayByFlight: new Map<string, number>() };

  // Group flights by effective aircraft and sort chronologically
  const flightsByEffectiveAircraft = new Map<string, Flight[]>();
  for (const f of dataset.flights) {
    const effAc = overrides.effectiveAircraftMap.get(f.id) ?? f.aircraftId;
    const list = flightsByEffectiveAircraft.get(effAc) ?? [];
    list.push(f);
    flightsByEffectiveAircraft.set(effAc, list);
  }
  for (const [, list] of flightsByEffectiveAircraft.entries()) {
    list.sort((a, b) => a.scheduledDepMin - b.scheduledDepMin);
  }

  // Track simulation states by flight ID
  const simMap = new Map<string, FlightSimState>();
  const events: TimelineEvent[] = [];

  if (scenario) {
    const typeLabel =
      scenario.type === 'closure'
        ? 'Airport Closure'
        : scenario.type === 'thunderstorm'
        ? 'Severe Thunderstorm GDP'
        : 'Single-Runway Restriction';
    events.push({
      id: `EVT-INIT-${scenario.airportCode}`,
      timeMin: scenario.startTimeMin,
      category: 'disruption',
      severity: scenario.type === 'closure' ? 'critical' : 'warning',
      airportCode: scenario.airportCode,
      title: `${typeLabel} initiated at ${scenario.airportCode}`,
      detail: `Active from ${formatMinutesToHHMM(scenario.startTimeMin)} to ${formatMinutesToHHMM(
        scenario.startTimeMin + scenario.durationMin
      )} (${formatDuration(scenario.durationMin)}).`,
    });
  }

  // Track crew cumulative arrival times to enforce FAR duty limits deterministically
  const crewCancelledSet = new Set<string>();
  const crewExtensionDelay = new Map<string, number>();

  // First pass: propagate each effective aircraft rotation
  for (const [effAcId, legs] of flightsByEffectiveAircraft.entries()) {
    const ac = aircraftMap.get(effAcId);
    const baseTurnMin = ac?.minTurnaroundMin ?? 40;
    let prevLegState: FlightSimState | null = null;
    let lastOperatingLegState: FlightSimState | null = null;
    let currentLocation: string | null = null;

    for (let i = 0; i < legs.length; i++) {
      const flight = legs[i];
      const blockMin = flight.scheduledArrMin - flight.scheduledDepMin;
      const directDepDelay = directDisruption.depDelayByFlight.get(flight.id) ?? 0;
      const directArrDelay = directDisruption.arrDelayByFlight.get(flight.id) ?? 0;
      const recoveryIds = overrides.recoveryReasonMap.get(flight.id) ?? [];

      const turnReduction = overrides.turnaroundReductionMap.get(flight.id) ?? 0;
      const effectiveTurnMin = Math.max(25, baseTurnMin - turnReduction);
      const holdMin = overrides.holdMap.get(flight.id) ?? 0;

      // Check manual cancellation
      if (overrides.manualCancelSet.has(flight.id)) {
        const state: FlightSimState = {
          ...flight,
          status: 'cancelled',
          actualDepMin: flight.scheduledDepMin,
          actualArrMin: flight.scheduledArrMin,
          depDelayMin: 0,
          arrDelayMin: 0,
          effectiveAircraftId: effAcId,
          delayCause: 'Cancelled by dispatch recovery plan to reset tail rotation',
          propagationChain: [flight.origin],
          affectedByRotation: false,
          affectedByCrewDuty: false,
          recoveredByActionIds: recoveryIds,
          missedInboundConnections: 0,
          outboundPassengersSaved: 0,
        };
        simMap.set(flight.id, state);
        if (currentLocation === null) currentLocation = flight.origin;
        prevLegState = state;
        continue;
      }

      // Check if aircraft is physically stranded away from this leg's origin
      let stranded = false;
      if (prevLegState && prevLegState.status === 'cancelled') {
        if (currentLocation !== flight.origin) {
          stranded = true;
        }
      }

      if (stranded) {
        const state: FlightSimState = {
          ...flight,
          status: 'cancelled',
          actualDepMin: flight.scheduledDepMin,
          actualArrMin: flight.scheduledArrMin,
          depDelayMin: 0,
          arrDelayMin: 0,
          effectiveAircraftId: effAcId,
          delayCause: `Aircraft ${ac?.tailNumber ?? effAcId} stranded after prior leg cancellation`,
          propagationChain: [...(prevLegState?.propagationChain ?? []), flight.origin],
          affectedByRotation: true,
          affectedByCrewDuty: false,
          recoveredByActionIds: recoveryIds,
          missedInboundConnections: 0,
          outboundPassengersSaved: 0,
        };
        simMap.set(flight.id, state);
        prevLegState = state;
        events.push({
          id: `EVT-STRAND-${flight.id}`,
          timeMin: flight.scheduledDepMin,
          category: 'cancellation',
          severity: 'critical',
          airportCode: flight.origin,
          flightId: flight.id,
          flightNumber: flight.flightNumber,
          title: `${flight.flightNumber} (${flight.origin} → ${flight.destination}) cancelled`,
          detail: `Inbound tail ${ac?.tailNumber ?? effAcId} stranded due to upstream cancellation.`,
          impactCount: flight.passengerCount,
        });
        continue;
      }

      // Compute earliest departure from last operating leg on this tail (or spare ferry readiness)
      let rotationReadyDep = flight.scheduledDepMin;
      let affectedByRotation = false;
      const inboundLegForTurn =
        prevLegState && prevLegState.status !== 'cancelled'
          ? prevLegState
          : lastOperatingLegState;
      if (inboundLegForTurn && inboundLegForTurn.destination === flight.origin) {
        rotationReadyDep = inboundLegForTurn.actualArrMin + effectiveTurnMin;
        if (rotationReadyDep > flight.scheduledDepMin) {
          affectedByRotation = true;
        }
      } else if (!inboundLegForTurn && ac?.isSpare && flight.origin !== ac.baseAirport) {
        const baseReopenMin =
          scenario && scenario.type === 'closure' && scenario.airportCode === ac.baseAirport
            ? scenario.startTimeMin + scenario.durationMin
            : 360;
        const ferryReadyMin = baseReopenMin + 105;
        if (ferryReadyMin > flight.scheduledDepMin) {
          rotationReadyDep = ferryReadyMin;
        }
      }

      // Direct departure disruption at origin
      let earliestDep = Math.max(flight.scheduledDepMin + directDepDelay, rotationReadyDep);
      if (holdMin > 0) {
        earliestDep = Math.max(earliestDep, flight.scheduledDepMin + holdMin);
      }

      // Also if the flight was pushed into an active closure window at its origin, respect window end
      if (scenario && scenario.type === 'closure' && flight.origin === scenario.airportCode) {
        const winStart = scenario.startTimeMin;
        const winEnd = winStart + scenario.durationMin;
        if (earliestDep >= winStart && earliestDep < winEnd) {
          earliestDep = winEnd + 4;
        }
      }

      // Crew duty check
      const crew = crewMap.get(flight.crewId);
      let affectedByCrewDuty = false;
      let crewAutoCancel = false;
      let crewExtraDelay = 0;

      if (crew) {
        if (crewCancelledSet.has(crew.id)) {
          crewAutoCancel = true;
        } else {
          const projectedArr = earliestDep + blockMin + directArrDelay;
          const projectedDuty = projectedArr - crew.dutyStartMin;
          if (projectedDuty > crew.maxDutyMin + 60) {
            crewAutoCancel = true;
            crewCancelledSet.add(crew.id);
          } else if (projectedDuty > crew.maxDutyMin) {
            affectedByCrewDuty = true;
            crewExtraDelay = crewExtensionDelay.get(crew.id) ?? 25;
            crewExtensionDelay.set(crew.id, crewExtraDelay);
            earliestDep += crewExtraDelay;
          }
        }
      }

      const depDelayMin = Math.max(0, Math.round(earliestDep - flight.scheduledDepMin));

      // Cancel if extreme delay >= 225m or crew timeout (unless recovery action explicitly mitigated)
      if (crewAutoCancel || depDelayMin >= 225) {
        const reason = crewAutoCancel
          ? `Crew ${crew?.callsign ?? flight.crewId} exceeded FAR duty limit`
          : `Departure delay (${depDelayMin}m) exceeded 225m operational cancel threshold`;
        const state: FlightSimState = {
          ...flight,
          status: 'cancelled',
          actualDepMin: flight.scheduledDepMin,
          actualArrMin: flight.scheduledArrMin,
          depDelayMin: 0,
          arrDelayMin: 0,
          effectiveAircraftId: effAcId,
          delayCause: reason,
          propagationChain: [
            ...(prevLegState && prevLegState.depDelayMin > 0 ? prevLegState.propagationChain : []),
            flight.origin,
          ],
          affectedByRotation,
          affectedByCrewDuty: crewAutoCancel,
          recoveredByActionIds: recoveryIds,
          missedInboundConnections: 0,
          outboundPassengersSaved: 0,
        };
        simMap.set(flight.id, state);
        if (currentLocation === null) currentLocation = flight.origin;
        prevLegState = state;
        events.push({
          id: `EVT-CANC-${flight.id}`,
          timeMin: flight.scheduledDepMin,
          category: crewAutoCancel ? 'crew' : 'cancellation',
          severity: 'critical',
          airportCode: flight.origin,
          flightId: flight.id,
          flightNumber: flight.flightNumber,
          title: `${flight.flightNumber} (${flight.origin} → ${flight.destination}) cancelled`,
          detail: reason,
          impactCount: flight.passengerCount,
        });
        continue;
      }

      let actualArrMin = earliestDep + blockMin + directArrDelay;
      if (scenario && scenario.type === 'closure' && flight.destination === scenario.airportCode) {
        const winStart = scenario.startTimeMin;
        const winEnd = winStart + scenario.durationMin;
        if (actualArrMin >= winStart && actualArrMin < winEnd) {
          actualArrMin = winEnd + 4;
        }
      }

      const arrDelayMin = Math.max(0, Math.round(actualArrMin - flight.scheduledArrMin));

      // Determine cause description
      const causes: string[] = [];
      if (directDepDelay > 0 && scenario) {
        causes.push(`${scenario.airportCode} ${scenario.type.replace('_', ' ')} (+${directDepDelay}m)`);
      }
      if (directArrDelay > 0 && scenario) {
        causes.push(`${scenario.airportCode} arrival flow (+${directArrDelay}m)`);
      }
      if (affectedByRotation && inboundLegForTurn) {
        causes.push(`Late inbound ${inboundLegForTurn.flightNumber} (${ac?.tailNumber ?? effAcId})`);
      }
      if (affectedByCrewDuty) {
        causes.push(`Crew duty extension (+${crewExtraDelay}m)`);
      }
      if (holdMin > 0) {
        causes.push(`Connection hold (+${holdMin}m)`);
      }

      const chain =
        inboundLegForTurn && Math.max(inboundLegForTurn.depDelayMin, inboundLegForTurn.arrDelayMin) >= 15
          ? [...inboundLegForTurn.propagationChain, flight.origin]
          : [flight.origin];

      let status: FlightSimState['status'] = depDelayMin >= 15 || arrDelayMin >= 15 ? 'delayed' : 'on_time';

      // Compare against unrecovered baseline to flag recovered flights cleanly
      if (unrecoveredBaseline && appliedActions.length > 0) {
        const prior = unrecoveredBaseline.flights.find((pf) => pf.id === flight.id);
        if (prior) {
          const wasCancelledNowActive = prior.status === 'cancelled';
          const delayImproved = prior.depDelayMin - depDelayMin >= 15 || prior.arrDelayMin - arrDelayMin >= 15;
          if (wasCancelledNowActive || delayImproved || (recoveryIds.length > 0 && prior.depDelayMin > depDelayMin)) {
            status = 'recovered';
          }
        }
      }

      const state: FlightSimState = {
        ...flight,
        status,
        actualDepMin: earliestDep,
        actualArrMin,
        depDelayMin,
        arrDelayMin,
        effectiveAircraftId: effAcId,
        delayCause: causes.length > 0 ? causes.join(' · ') : null,
        propagationChain: chain,
        affectedByRotation,
        affectedByCrewDuty,
        recoveredByActionIds: recoveryIds,
        missedInboundConnections: 0,
        outboundPassengersSaved: 0,
      };
      simMap.set(flight.id, state);
      currentLocation = flight.destination;
      prevLegState = state;
      lastOperatingLegState = state;

      if (status === 'delayed' && (affectedByRotation || directDepDelay > 0 || directArrDelay > 0)) {
        events.push({
          id: `EVT-DEL-${flight.id}`,
          timeMin: earliestDep,
          category: affectedByRotation ? 'rotation' : 'disruption',
          severity: depDelayMin >= 75 ? 'critical' : 'warning',
          airportCode: flight.origin,
          flightId: flight.id,
          flightNumber: flight.flightNumber,
          title: `${flight.flightNumber} delayed +${depDelayMin}m (${flight.origin} → ${flight.destination})`,
          detail: state.delayCause ?? 'Network delay propagation',
          impactCount: flight.passengerCount,
        });
      } else if (status === 'recovered') {
        events.push({
          id: `EVT-REC-${flight.id}`,
          timeMin: earliestDep,
          category: 'recovery',
          severity: 'recovered',
          airportCode: flight.origin,
          flightId: flight.id,
          flightNumber: flight.flightNumber,
          title: `${flight.flightNumber} recovered (${depDelayMin === 0 ? 'On Time' : `+${depDelayMin}m`})`,
          detail: `Mitigated via dispatch recovery action.`,
          impactCount: flight.passengerCount,
        });
      }
    }
  }

  // Evaluate passenger connections
  const connections: ConnectionImpact[] = dataset.connections.map((conn) => {
    const fromFlight = simMap.get(conn.fromFlightId);
    const toFlight = simMap.get(conn.toFlightId);

    if (!fromFlight || !toFlight) {
      return {
        connection: conn,
        fromFlightNumber: conn.fromFlightId,
        toFlightNumber: conn.toFlightId,
        fromOrigin: '---',
        toDestination: '---',
        status: 'intact',
        availableConnectMin: 0,
        requiredConnectMin: conn.minConnectTimeMin,
        affectedPassengers: 0,
      };
    }

    const available = toFlight.actualDepMin - fromFlight.actualArrMin;
    const brokenByCancel = fromFlight.status === 'cancelled' || toFlight.status === 'cancelled';
    const brokenByTime = available < conn.minConnectTimeMin;
    const isMissed = brokenByCancel || brokenByTime;

    let status: ConnectionImpact['status'] = isMissed ? 'missed' : 'intact';

    // Check if connection was missed in unrecovered baseline and saved by recovery actions
    if (!isMissed && unrecoveredBaseline && appliedActions.length > 0) {
      const priorConn = unrecoveredBaseline.connections.find((c) => c.connection.id === conn.id);
      if (priorConn && priorConn.status === 'missed') {
        status = 'saved';
        toFlight.outboundPassengersSaved += conn.passengerCount;
      }
    }

    if (isMissed) {
      toFlight.missedInboundConnections += conn.passengerCount;
      events.push({
        id: `EVT-CONN-${conn.id}`,
        timeMin: fromFlight.actualArrMin,
        category: 'connection',
        severity: 'warning',
        airportCode: conn.airportCode,
        flightId: toFlight.id,
        flightNumber: toFlight.flightNumber,
        title: `${conn.passengerCount} pax missed connection at ${conn.airportCode}`,
        detail: `${fromFlight.flightNumber} → ${toFlight.flightNumber}: ${
          brokenByCancel
            ? 'flight cancelled'
            : `only ${available}m available (MCT ${conn.minConnectTimeMin}m)`
        }.`,
        impactCount: conn.passengerCount,
      });
    }

    return {
      connection: conn,
      fromFlightNumber: fromFlight.flightNumber,
      toFlightNumber: toFlight.flightNumber,
      fromOrigin: fromFlight.origin,
      toDestination: toFlight.destination,
      status,
      availableConnectMin: available,
      requiredConnectMin: conn.minConnectTimeMin,
      affectedPassengers: isMissed ? conn.passengerCount : 0,
    };
  });

  // Recovery action events (timestamped against target flight schedule)
  for (const action of appliedActions) {
    const targetF = simMap.get(action.targetFlightId);
    events.push({
      id: `EVT-ACT-${action.id}`,
      timeMin: targetF?.scheduledDepMin ?? scenario?.startTimeMin ?? 480,
      category: 'recovery',
      severity: 'recovered',
      airportCode: action.airportCode,
      flightId: action.targetFlightId,
      flightNumber: targetF?.flightNumber,
      title: `Recovery Applied: ${action.title}`,
      detail: action.description,
    });
  }

  const orderedFlights = dataset.flights
    .map((f) => simMap.get(f.id)!)
    .sort((a, b) => a.scheduledDepMin - b.scheduledDepMin);

  const flightDelayMag = (f: FlightSimState) => Math.max(f.depDelayMin, f.arrDelayMin);

  // Build per-airport impact map (mutually exclusive status counts summing cleanly to totalFlights)
  const airports: Record<string, AirportImpact> = {};
  for (const ap of dataset.airports) {
    const apFlights = orderedFlights.filter((f) => f.origin === ap.code || f.destination === ap.code);
    const depFlights = orderedFlights.filter((f) => f.origin === ap.code);
    const delayed = apFlights.filter((f) => f.status === 'delayed');
    const cancelled = apFlights.filter((f) => f.status === 'cancelled');
    const recovered = apFlights.filter((f) => f.status === 'recovered');
    const onTime = apFlights.filter((f) => f.status === 'on_time');
    const totalDelay = depFlights.reduce(
      (sum, f) => sum + (f.status === 'cancelled' ? 0 : flightDelayMag(f)),
      0
    );

    const paxSetDelay = apFlights
      .filter((f) => f.status === 'cancelled' || flightDelayMag(f) >= 15)
      .reduce((sum, f) => sum + f.passengerCount, 0);
    const missedConnAtAp = connections
      .filter((c) => c.connection.airportCode === ap.code && c.status === 'missed')
      .reduce((sum, c) => sum + c.affectedPassengers, 0);

    const isPrimary = scenario?.airportCode === ap.code;
    let severity: AirportImpact['severity'] = 'normal';
    if (isPrimary || cancelled.length >= 2 || totalDelay >= 240) {
      severity = 'severe';
    } else if (delayed.length >= 1 || recovered.some((f) => flightDelayMag(f) >= 15) || cancelled.length >= 1 || missedConnAtAp > 0) {
      severity = 'moderate';
    }

    airports[ap.code] = {
      code: ap.code,
      name: ap.name,
      city: ap.city,
      isHub: ap.isHub,
      totalFlights: apFlights.length,
      onTimeFlights: onTime.length,
      delayedFlights: delayed.length,
      cancelledFlights: cancelled.length,
      recoveredFlights: recovered.length,
      totalDelayMin: totalDelay,
      affectedPassengers: paxSetDelay + missedConnAtAp,
      isPrimaryDisrupted: isPrimary,
      severity,
    };
  }

  // Network-level metrics
  const delayedFlightsList = orderedFlights.filter(
    (f) => f.status !== 'cancelled' && flightDelayMag(f) >= 15
  );
  const cancelledFlightsList = orderedFlights.filter((f) => f.status === 'cancelled');
  const recoveredFlightsList = orderedFlights.filter((f) => f.status === 'recovered');
  const onTimeFlightsList = orderedFlights.filter(
    (f) => f.status !== 'cancelled' && flightDelayMag(f) < 15
  );

  const totalDelayMin = orderedFlights.reduce(
    (sum, f) => sum + (f.status === 'cancelled' ? 0 : flightDelayMag(f)),
    0
  );
  const maxDelayMin = orderedFlights.reduce(
    (max, f) => (f.status === 'cancelled' ? max : Math.max(max, flightDelayMag(f))),
    0
  );
  const avgDelayMin =
    delayedFlightsList.length > 0 ? Math.round(totalDelayMin / delayedFlightsList.length) : 0;

  // Deduplicated passenger counts:
  // Cancelled pax = sum of passengerCount on cancelled flights.
  // Delayed pax = sum of passengerCount on flights with >= 15m delay (not cancelled).
  // Missed connections = sum of missed connecting pax where neither flight was already cancelled.
  const passengersCancelled = cancelledFlightsList.reduce((sum, f) => sum + f.passengerCount, 0);
  const passengersDelayed = delayedFlightsList.reduce((sum, f) => sum + f.passengerCount, 0);
  const missedConnList = connections.filter((c) => c.status === 'missed');
  const missedConnections = missedConnList.reduce((sum, c) => sum + c.affectedPassengers, 0);
  const nonCancelledMissedConn = missedConnList
    .filter((c) => {
      const from = simMap.get(c.connection.fromFlightId);
      const to = simMap.get(c.connection.toFlightId);
      return from?.status !== 'cancelled' && to?.status !== 'cancelled';
    })
    .reduce((sum, c) => sum + c.affectedPassengers, 0);

  const affectedPassengers = passengersCancelled + passengersDelayed + nonCancelledMissedConn;

  // Network health percentage: weighted score across on-time ratio, non-cancelled ratio, and connection integrity
  const totalFlightsCount = orderedFlights.length || 1;
  const onTimeRatio = onTimeFlightsList.length / totalFlightsCount;
  const cancelPenalty = (cancelledFlightsList.length / totalFlightsCount) * 1.6;
  const delayPenalty = Math.min(0.45, totalDelayMin / (totalFlightsCount * 120));
  const connPenalty =
    connections.length > 0 ? (missedConnList.length / connections.length) * 0.25 : 0;
  const networkHealthPct = Math.max(
    0,
    Math.min(100, Math.round((onTimeRatio * 0.45 + (1 - cancelPenalty) * 0.35 + (1 - delayPenalty - connPenalty) * 0.2) * 100))
  );

  events.sort((a, b) => a.timeMin - b.timeMin);

  return {
    scenario,
    flights: orderedFlights,
    connections,
    airports,
    events,
    metrics: {
      totalAirports: dataset.airports.length,
      totalFlights: dataset.flights.length,
      totalAircraft: dataset.aircraft.length,
      activeAircraft: dataset.aircraft.filter((a) => !a.isSpare).length,
      spareAircraft: dataset.aircraft.filter((a) => a.isSpare).length,
      onTimeFlights: onTimeFlightsList.length,
      delayedFlights: delayedFlightsList.length,
      cancelledFlights: cancelledFlightsList.length,
      recoveredFlights: recoveredFlightsList.length,
      totalDelayMin,
      avgDelayMin,
      maxDelayMin,
      affectedPassengers,
      passengersDelayed,
      passengersCancelled,
      missedConnections,
      missedConnectionEvents: missedConnList.length,
      networkHealthPct,
    },
    assumptions: DEFAULT_ASSUMPTIONS,
  };
}
