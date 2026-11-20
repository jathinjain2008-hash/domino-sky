import {
  AirlineDataset,
  ComparisonMetrics,
  DisruptionScenario,
  EvaluatedRecoveryAction,
  RecoveryAction,
  SimulationResult,
} from '../types/aviation';
import { formatDuration, formatMinutesToHHMM } from '../utils/time';
import { runSimulation } from './simulationEngine';

function evaluateAction(
  dataset: AirlineDataset,
  scenario: DisruptionScenario,
  disruptedBaseline: SimulationResult,
  existingActions: RecoveryAction[],
  candidate: RecoveryAction
): EvaluatedRecoveryAction {
  const combined = [...existingActions, candidate];
  const currentSim =
    existingActions.length === 0
      ? disruptedBaseline
      : runSimulation(dataset, scenario, existingActions, disruptedBaseline);
  const nextSim = runSimulation(dataset, scenario, combined, disruptedBaseline);

  const delayedFlightsReduced =
    currentSim.metrics.delayedFlights - nextSim.metrics.delayedFlights;
  const cancelledFlightsReduced =
    currentSim.metrics.cancelledFlights - nextSim.metrics.cancelledFlights;
  const delayMinutesSaved =
    currentSim.metrics.totalDelayMin - nextSim.metrics.totalDelayMin;
  const affectedPassengersSaved =
    currentSim.metrics.affectedPassengers - nextSim.metrics.affectedPassengers;
  const missedConnectionsSaved =
    currentSim.metrics.missedConnections - nextSim.metrics.missedConnections;
  const networkHealthGainPct =
    nextSim.metrics.networkHealthPct - currentSim.metrics.networkHealthPct;

  const score =
    cancelledFlightsReduced * 180 +
    delayedFlightsReduced * 45 +
    delayMinutesSaved * 1.2 +
    missedConnectionsSaved * 2.5 +
    affectedPassengersSaved * 0.8;

  return {
    ...candidate,
    impact: {
      delayedFlightsReduced,
      cancelledFlightsReduced,
      delayMinutesSaved,
      affectedPassengersSaved,
      missedConnectionsSaved,
      networkHealthGainPct,
    },
    score: Math.round(score),
  };
}

export function generateRecoveryRecommendations(
  dataset: AirlineDataset,
  scenario: DisruptionScenario | null,
  disruptedBaseline: SimulationResult,
  appliedActions: RecoveryAction[]
): EvaluatedRecoveryAction[] {
  if (!scenario) return [];

  const currentSim =
    appliedActions.length === 0
      ? disruptedBaseline
      : runSimulation(dataset, scenario, appliedActions, disruptedBaseline);

  const appliedIds = new Set(appliedActions.map((a) => a.id));
  const usedSpares = new Set(
    appliedActions.filter((a) => a.spareAircraftId).map((a) => a.spareAircraftId!)
  );
  const usedSpareTargets = new Set(
    appliedActions.filter((a) => a.type === 'assign_spare').map((a) => a.targetFlightId)
  );

  const candidates: RecoveryAction[] = [];

  // 1. Spare aircraft deployment candidates
  const availableSpares = dataset.aircraft.filter((a) => a.isSpare && !usedSpares.has(a.id));
  for (const spare of availableSpares) {
    // Prefer delayed/cancelled flights originating at spare's base airport, or adjacent hub
    const targetFlights = currentSim.flights
      .filter(
        (f) =>
          !usedSpareTargets.has(f.id) &&
          (f.status === 'delayed' || f.status === 'cancelled') &&
          (f.origin === spare.baseAirport || f.depDelayMin >= 45 || f.status === 'cancelled')
      )
      .sort((a, b) => {
        const aAtBase = a.origin === spare.baseAirport ? 1 : 0;
        const bAtBase = b.origin === spare.baseAirport ? 1 : 0;
        if (aAtBase !== bAtBase) return bAtBase - aAtBase;
        return (b.status === 'cancelled' ? 300 : b.depDelayMin) - (a.status === 'cancelled' ? 300 : a.depDelayMin);
      })
      .slice(0, 2);

    for (const target of targetFlights) {
      const id = `REC-SPARE-${spare.id}-${target.id}`;
      if (appliedIds.has(id)) continue;
      const isFerry = target.origin !== spare.baseAirport;
      candidates.push({
        id,
        type: 'assign_spare',
        title: `Deploy Spare ${spare.tailNumber} to ${target.flightNumber}`,
        subtitle: `${spare.model} · ${target.origin} → ${target.destination} (${formatMinutesToHHMM(target.scheduledDepMin)})`,
        description: isFerry
          ? `Reposition standby spare ${spare.tailNumber} from ${spare.baseAirport} to assume ${target.flightNumber} and its remaining rotation legs.`
          : `Assign standby spare ${spare.tailNumber} stationed at ${spare.baseAirport} to operate ${target.flightNumber} and protect downstream legs.`,
        airportCode: target.origin,
        targetFlightId: target.id,
        spareAircraftId: spare.id,
        tradeoff: isFerry
          ? `Consumes standby spare ${spare.tailNumber} and requires rapid ferry positioning from ${spare.baseAirport}.`
          : `Consumes standby spare ${spare.tailNumber} at ${spare.baseAirport} for the remainder of the operating day.`,
      });
    }
  }

  // 2. Aircraft tail-swap candidates at shared stations (only when delayed tail is physically present, not stranded elsewhere)
  const disruptedOutbound = currentSim.flights
    .filter(
      (f) =>
        (f.status === 'delayed' && f.depDelayMin >= 35) ||
        (f.status === 'cancelled' && !f.affectedByRotation)
    )
    .sort((a, b) => b.depDelayMin - a.depDelayMin)
    .slice(0, 8);

  const usedSwapFlights = new Set(
    appliedActions
      .filter((a) => a.type === 'swap_aircraft')
      .flatMap((a) => [a.targetFlightId, a.secondaryFlightId ?? ''])
  );

  const seenSwapPairs = new Set<string>();
  for (const delayedF of disruptedOutbound) {
    if (usedSwapFlights.has(delayedF.id)) continue;
    const healthyPeer = currentSim.flights.find(
      (f) =>
        f.id !== delayedF.id &&
        !usedSwapFlights.has(f.id) &&
        f.effectiveAircraftId !== delayedF.effectiveAircraftId &&
        f.origin === delayedF.origin &&
        f.status === 'on_time' &&
        Math.abs(f.scheduledDepMin - delayedF.scheduledDepMin) <= 95 &&
        f.scheduledDepMin >= delayedF.scheduledDepMin - 20
    );
    if (!healthyPeer) continue;
    const id = `REC-SWAP-${delayedF.id}-${healthyPeer.id}`;
    if (appliedIds.has(id) || seenSwapPairs.has(id)) continue;
    seenSwapPairs.add(id);

    candidates.push({
      id,
      type: 'swap_aircraft',
      title: `Swap Tail ${healthyPeer.effectiveAircraftId} ↔ ${delayedF.effectiveAircraftId} at ${delayedF.origin}`,
      subtitle: `Prioritize ${delayedF.flightNumber} using ${healthyPeer.flightNumber}'s airframe`,
      description: `Reassign on-time tail from ${healthyPeer.flightNumber} to cover ${delayedF.flightNumber} (${delayedF.origin} → ${delayedF.destination}), isolating the inbound delay onto ${healthyPeer.flightNumber}.`,
      airportCode: delayedF.origin,
      targetFlightId: delayedF.id,
      secondaryFlightId: healthyPeer.id,
      tradeoff: `Transfers part of the inbound delay onto ${healthyPeer.flightNumber} (${healthyPeer.passengerCount} pax) to save higher-cascade legs on ${delayedF.flightNumber}.`,
    });
  }

  // 3. Turnaround prioritization on tight cascading legs
  const rotationImpacted = currentSim.flights
    .filter((f) => f.affectedByRotation && f.status === 'delayed' && f.depDelayMin >= 20)
    .sort((a, b) => b.depDelayMin - a.depDelayMin)
    .slice(0, 5);

  for (const f of rotationImpacted) {
    const id = `REC-TURN-${f.id}`;
    if (appliedIds.has(id)) continue;
    const ac = dataset.aircraft.find((a) => a.id === f.effectiveAircraftId);
    const actualSavings = Math.min(15, Math.max(0, (ac?.minTurnaroundMin ?? 40) - 25));
    if (actualSavings <= 0) continue;
    candidates.push({
      id,
      type: 'prioritize_turnaround',
      title: `Express Ground Turnaround for ${f.flightNumber}`,
      subtitle: `${f.origin} station · Save ${actualSavings}m turn time`,
      description: `Deploy dual-door deplaning, priority fueling, and pre-staged catering at ${f.origin} to compress minimum turnaround by ${actualSavings} min on ${f.flightNumber}.`,
      airportCode: f.origin,
      targetFlightId: f.id,
      turnaroundSavingsMin: actualSavings,
      tradeoff: `Requires dedicated ramp and gate crew surge at ${f.origin} for 25-min minimum turn execution.`,
    });
  }

  // 4. Outbound hold to protect large missed connections
  const missedConns = currentSim.connections
    .filter((c) => c.status === 'missed' && c.availableConnectMin >= c.requiredConnectMin - 24)
    .sort((a, b) => b.affectedPassengers - a.affectedPassengers)
    .slice(0, 4);

  for (const conn of missedConns) {
    const incrementalHold = conn.requiredConnectMin - conn.availableConnectMin + 2;
    if (incrementalHold <= 0 || incrementalHold > 24) continue;
    const toFlight = currentSim.flights.find((f) => f.id === conn.connection.toFlightId);
    if (!toFlight || toFlight.status === 'cancelled') continue;
    const id = `REC-HOLD-${conn.connection.toFlightId}`;
    if (appliedIds.has(id)) continue;

    // Total departure hold measured from scheduledDepMin so it clears the inbound actual arrival + MCT even if outbound already has minor delay
    const totalHoldFromSched = toFlight.depDelayMin + incrementalHold;

    candidates.push({
      id,
      type: 'hold_for_connections',
      title: `Hold ${toFlight.flightNumber} (+${incrementalHold}m) for ${conn.affectedPassengers} Connecting Pax`,
      subtitle: `Protect ${conn.fromFlightNumber} → ${toFlight.flightNumber} bank at ${conn.connection.airportCode}`,
      description: `Hold outbound ${toFlight.flightNumber} at ${conn.connection.airportCode} by ${incrementalHold} min so ${conn.affectedPassengers} passengers arriving on ${conn.fromFlightNumber} clear MCT (${conn.requiredConnectMin}m).`,
      airportCode: conn.connection.airportCode,
      targetFlightId: toFlight.id,
      holdMinutes: totalHoldFromSched,
      tradeoff: `Adds +${incrementalHold}m departure delay to ${toFlight.flightNumber} (${toFlight.passengerCount} onboard pax) to prevent ${conn.affectedPassengers} missed connections.`,
    });
  }

  // 5. Strategic round-trip cancellation to stop severe rotation bleed
  const severeCandidates = currentSim.flights
    .filter((f) => f.status === 'delayed' && f.depDelayMin >= 95 && f.rotationOrder <= 3)
    .slice(0, 3);

  for (const leg of severeCandidates) {
    const returnLeg = currentSim.flights.find(
      (f) =>
        f.effectiveAircraftId === leg.effectiveAircraftId &&
        f.rotationOrder === leg.rotationOrder + 1 &&
        f.destination === leg.origin
    );
    if (!returnLeg) continue;
    const id = `REC-CANCEL-PAIR-${leg.id}-${returnLeg.id}`;
    if (appliedIds.has(id)) continue;

    candidates.push({
      id,
      type: 'cancel_flight',
      title: `Cancel Out-and-Back Turn ${leg.flightNumber}/${returnLeg.flightNumber}`,
      subtitle: `${leg.origin} ↔ ${leg.destination} · Reset tail ${leg.effectiveAircraftId}`,
      description: `Cancel severely delayed spoke turn ${leg.flightNumber} and return ${returnLeg.flightNumber} so aircraft ${leg.effectiveAircraftId} stays positioned at ${leg.origin} to operate downstream evening bank on time.`,
      airportCode: leg.origin,
      targetFlightId: leg.id,
      secondaryFlightId: returnLeg.id,
      tradeoff: `Displaces ${leg.passengerCount + returnLeg.passengerCount} passengers on the spoke turn in exchange for eliminating evening hub cascade.`,
    });
  }

  // Evaluate every candidate through the deterministic engine
  const evaluated = candidates
    .map((c) => evaluateAction(dataset, scenario, disruptedBaseline, appliedActions, c))
    .filter((e) => e.score > 0 || e.impact.missedConnectionsSaved > 0 || e.impact.delayMinutesSaved > 0)
    .sort((a, b) => b.score - a.score);

  return evaluated;
}

export function computeBeforeAfterComparison(
  before: SimulationResult,
  after: SimulationResult
): ComparisonMetrics {
  const ratios: number[] = [];

  if (before.metrics.totalDelayMin > 0) {
    ratios.push((before.metrics.totalDelayMin - after.metrics.totalDelayMin) / before.metrics.totalDelayMin);
  }
  if (before.metrics.affectedPassengers > 0) {
    ratios.push((before.metrics.affectedPassengers - after.metrics.affectedPassengers) / before.metrics.affectedPassengers);
  }
  if (before.metrics.cancelledFlights > 0) {
    ratios.push((before.metrics.cancelledFlights - after.metrics.cancelledFlights) / before.metrics.cancelledFlights);
  }
  if (before.metrics.missedConnections > 0) {
    ratios.push((before.metrics.missedConnections - after.metrics.missedConnections) / before.metrics.missedConnections);
  }

  const avgRatio = ratios.length > 0 ? ratios.reduce((s, r) => s + r, 0) / ratios.length : 0;
  const networkRecoveryPct = Math.max(0, Math.min(100, Math.round(avgRatio * 100)));

  const totalBefore = Math.max(1, before.metrics.totalFlights);
  const totalAfter = Math.max(1, after.metrics.totalFlights);
  const aircraftUtilisationBefore = Math.round(
    ((before.metrics.totalFlights - before.metrics.cancelledFlights) / totalBefore) * 100
  );
  const aircraftUtilisationAfter = Math.round(
    ((after.metrics.totalFlights - after.metrics.cancelledFlights) / totalAfter) * 100
  );

  return {
    delayedFlightsBefore: before.metrics.delayedFlights,
    delayedFlightsAfter: after.metrics.delayedFlights,
    totalDelayMinBefore: before.metrics.totalDelayMin,
    totalDelayMinAfter: after.metrics.totalDelayMin,
    affectedPassengersBefore: before.metrics.affectedPassengers,
    affectedPassengersAfter: after.metrics.affectedPassengers,
    missedConnectionsBefore: before.metrics.missedConnections,
    missedConnectionsAfter: after.metrics.missedConnections,
    cancelledFlightsBefore: before.metrics.cancelledFlights,
    cancelledFlightsAfter: after.metrics.cancelledFlights,
    networkRecoveryPct,
    networkHealthBefore: before.metrics.networkHealthPct,
    networkHealthAfter: after.metrics.networkHealthPct,
    aircraftUtilisationBefore,
    aircraftUtilisationAfter,
  };
}

export function buildRuleBasedDispatchBrief(
  scenario: DisruptionScenario,
  disrupted: SimulationResult,
  recovered: SimulationResult,
  recommendations: EvaluatedRecoveryAction[],
  appliedActions: RecoveryAction[]
): {
  situationSummary: string;
  propagationAnalysis: string;
  recommendedStrategy: string;
  tradeoffNotes: string;
} {
  const ap = disrupted.airports[scenario.airportCode];
  const typeLabel =
    scenario.type === 'closure'
      ? 'airport closure'
      : scenario.type === 'thunderstorm'
      ? 'convective thunderstorm ground delay program'
      : 'single-runway restriction';

  const rotationCount = disrupted.flights.filter((f) => f.affectedByRotation).length;
  const crewCount = disrupted.flights.filter((f) => f.affectedByCrewDuty).length;

  const situationSummary = `${scenario.airportCode} (${ap?.city ?? scenario.airportCode}) experienced a ${formatDuration(
    scenario.durationMin
  )} ${typeLabel} starting at ${formatMinutesToHHMM(scenario.startTimeMin)}. Across the ${
    disrupted.metrics.totalFlights
  }-flight schedule, ${
    disrupted.metrics.delayedFlights
  } flights are delayed (${disrupted.metrics.totalDelayMin} total delay min) and ${
    disrupted.metrics.cancelledFlights
  } flights are cancelled, impacting ${disrupted.metrics.affectedPassengers} passengers and breaking ${
    disrupted.metrics.missedConnections
  } connecting passenger itineraries.`;

  const propagationAnalysis = `Initial ground holds at ${scenario.airportCode} cascaded downstream across aircraft rotations (${rotationCount} rotation-linked legs affected)${
    crewCount > 0 ? ` and triggered ${crewCount} FAR crew duty constraints` : ''
  }. Primary hub bank transfer windows compressed below the 35-minute minimum connect time, resulting in ${
    disrupted.metrics.missedConnectionEvents
  } missed connection waves.`;

  const topRecs = recommendations.slice(0, 3);
  const recommendedStrategy =
    appliedActions.length > 0
      ? `${appliedActions.length} recovery action(s) currently active, reducing total delay to ${recovered.metrics.totalDelayMin} min and lowering affected passengers to ${recovered.metrics.affectedPassengers}.`
      : topRecs.length > 0
      ? `Top deterministic actions: ${topRecs
          .map(
            (r, i) =>
              `(${i + 1}) ${r.title} [saves ${r.impact.delayMinutesSaved}m delay, ${r.impact.affectedPassengersSaved} pax]`
          )
          .join('; ')}.`
      : 'No higher-impact recovery maneuvers remain available under current spare and turnaround constraints.';

  const tradeoffNotes =
    topRecs.length > 0
      ? topRecs.map((r) => `${r.title}: ${r.tradeoff}`).join(' ')
      : 'Monitor crew duty margins closely if additional weather delays develop.';

  return {
    situationSummary,
    propagationAnalysis,
    recommendedStrategy,
    tradeoffNotes,
  };
}
