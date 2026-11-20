import React, { useMemo, useState } from 'react';
import {
  AirlineDataset,
  DisruptionScenario,
  FlightSimState,
  SimulationResult,
} from '../../types/aviation';
import { formatDuration, formatMinutesToHHMM } from '../../utils/time';
import {
  AlertTriangle,
  ArrowRight,
  Compass,
  GitBranch,
  Plane,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';

interface CascadePropagationViewProps {
  dataset: AirlineDataset;
  scenario: DisruptionScenario | null;
  simulation: SimulationResult;
  onInspectFlightOnMap: (flightId: string) => void;
  onInspectAirportOnMap: (airportCode: string) => void;
  onOpenNetwork: () => void;
  onOpenRecovery: () => void;
}

interface TailChain {
  aircraftId: string;
  tailNumber: string;
  model: string;
  legs: FlightSimState[];
  hasDirectHit: boolean;
  hasRotationBleed: boolean;
  hasCancellation: boolean;
  hasRecovered: boolean;
  totalDelayMin: number;
  affectedPax: number;
}

export const CascadePropagationView: React.FC<CascadePropagationViewProps> = ({
  dataset,
  scenario,
  simulation,
  onInspectFlightOnMap,
  onInspectAirportOnMap,
  onOpenNetwork,
  onOpenRecovery,
}) => {
  const [chainFilter, setChainFilter] = useState<'disrupted' | 'all'>('disrupted');

  const aircraftLookup = useMemo(
    () => new Map(dataset.aircraft.map((a) => [a.id, a])),
    [dataset.aircraft]
  );

  const cascadeSummary = useMemo(() => {
    const primaryCode = scenario?.airportCode ?? null;
    const directFlights = simulation.flights.filter(
      (f) =>
        (f.status === 'delayed' || f.status === 'cancelled') &&
        !f.affectedByRotation &&
        (f.origin === primaryCode || f.destination === primaryCode)
    );
    const secondaryFlights = simulation.flights.filter(
      (f) => f.affectedByRotation && (f.status === 'delayed' || f.status === 'cancelled')
    );
    const cancelledFlights = simulation.flights.filter((f) => f.status === 'cancelled');
    const crewImpacted = simulation.flights.filter((f) => f.affectedByCrewDuty);
    const missedConns = simulation.connections.filter((c) => c.status === 'missed');
    const affectedTails = new Set(
      simulation.flights
        .filter((f) => f.status === 'delayed' || f.status === 'cancelled' || f.status === 'recovered')
        .map((f) => f.effectiveAircraftId)
    );
    const secondaryAirports = new Set<string>();
    secondaryFlights.forEach((f) => {
      secondaryAirports.add(f.origin);
      secondaryAirports.add(f.destination);
    });

    return {
      directFlights,
      secondaryFlights,
      cancelledFlights,
      crewImpacted,
      missedConns,
      affectedTailsCount: affectedTails.size,
      secondaryAirportsCount: secondaryAirports.size,
    };
  }, [scenario, simulation]);

  const tailChains = useMemo<TailChain[]>(() => {
    const byTail = new Map<string, FlightSimState[]>();
    for (const f of simulation.flights) {
      const list = byTail.get(f.effectiveAircraftId) ?? [];
      list.push(f);
      byTail.set(f.effectiveAircraftId, list);
    }

    const chains: TailChain[] = [];
    for (const [aircraftId, legs] of byTail.entries()) {
      const sorted = [...legs].sort((a, b) => a.scheduledDepMin - b.scheduledDepMin);
      const ac = aircraftLookup.get(aircraftId);
      const hasDirectHit = sorted.some(
        (l) => !l.affectedByRotation && (l.status === 'delayed' || l.status === 'cancelled')
      );
      const hasRotationBleed = sorted.some(
        (l) => l.affectedByRotation && (l.status === 'delayed' || l.status === 'cancelled')
      );
      const hasCancellation = sorted.some((l) => l.status === 'cancelled');
      const hasRecovered = sorted.some((l) => l.status === 'recovered');
      const totalDelayMin = sorted.reduce(
        (sum, l) => sum + (l.status === 'cancelled' ? 0 : Math.max(l.depDelayMin, l.arrDelayMin)),
        0
      );
      const affectedPax = sorted.reduce(
        (sum, l) =>
          sum +
          (l.status === 'cancelled' || Math.max(l.depDelayMin, l.arrDelayMin) >= 15
            ? l.passengerCount
            : 0),
        0
      );

      if (
        chainFilter === 'disrupted' &&
        !hasDirectHit &&
        !hasRotationBleed &&
        !hasCancellation &&
        !hasRecovered
      ) {
        continue;
      }

      chains.push({
        aircraftId,
        tailNumber: ac?.tailNumber ?? aircraftId,
        model: ac?.model ?? 'Narrowbody',
        legs: sorted,
        hasDirectHit,
        hasRotationBleed,
        hasCancellation,
        hasRecovered,
        totalDelayMin,
        affectedPax,
      });
    }

    return chains.sort((a, b) => b.totalDelayMin - a.totalDelayMin);
  }, [simulation.flights, aircraftLookup, chainFilter]);

  if (!scenario) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto bg-[#10151B]">
        <div className="max-w-lg w-full rounded-md border border-[#28313B] bg-[#151B22] p-8 text-center space-y-4">
          <GitBranch className="h-7 w-7 text-[#5EC8D8] mx-auto" />
          <div className="space-y-1.5">
            <h1 className="text-base font-semibold text-[#E8EDF2]">
              No Active Disruption Cascade
            </h1>
            <p className="text-xs sm:text-sm text-[#8B98A7] leading-relaxed">
              Run a disruption scenario on the Network Map or Disruption Simulator to trace how local ground delays propagate across aircraft tail rotations, turnaround buffers, and hub passenger banks.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenNetwork}
            className="px-4 py-2 rounded text-xs font-semibold text-[#0B0E12] bg-[#5EC8D8] hover:bg-[#76D4E2] transition-colors"
          >
            Open India Network Map
          </button>
        </div>
      </div>
    );
  }

  const pipelineNodes = [
    {
      step: '01',
      title: 'DISRUPTION SOURCE',
      value: `${scenario.airportCode} · ${formatDuration(scenario.durationMin)}`,
      sub: `${
        scenario.type === 'closure'
          ? 'Airport Closure'
          : scenario.type === 'thunderstorm'
          ? 'Severe Weather'
          : 'Runway Restriction'
      } at ${formatMinutesToHHMM(scenario.startTimeMin)}`,
      borderColor: 'border-t-[#E05D5D]',
      textColor: 'text-[#E05D5D]',
      action: () => onInspectAirportOnMap(scenario.airportCode),
    },
    {
      step: '02',
      title: 'DIRECT FLIGHT IMPACT',
      value: `${cascadeSummary.directFlights.length} sectors`,
      sub: 'Departures & arrivals held inside window',
      borderColor: 'border-t-[#F2A93B]',
      textColor: 'text-[#F2A93B]',
    },
    {
      step: '03',
      title: 'AIRCRAFT ROTATION',
      value: `${cascadeSummary.affectedTailsCount} aircraft`,
      sub: 'Tight 35–45m turns absorb tardiness',
      borderColor: 'border-t-[#D97D45]',
      textColor: 'text-[#D97D45]',
    },
    {
      step: '04',
      title: 'SECONDARY FLIGHTS',
      value: `${cascadeSummary.secondaryFlights.length} legs`,
      sub: `Cascaded to ${cascadeSummary.secondaryAirportsCount} stations`,
      borderColor: 'border-t-[#D97D45]',
      textColor: 'text-[#F2A93B]',
    },
    {
      step: '05',
      title: 'PASSENGER CONSEQUENCES',
      value: `${simulation.metrics.missedConnections.toLocaleString()} misconnects`,
      sub: `${cascadeSummary.missedConns.length} hub banks below 35m MCT`,
      borderColor: 'border-t-[#F2A93B]',
      textColor: 'text-[#F2A93B]',
    },
    {
      step: '06',
      title: 'NETWORK SUMMARY',
      value: `${simulation.metrics.networkHealthPct}% health`,
      sub: `${simulation.metrics.cancelledFlights} cxl · ${formatDuration(
        simulation.metrics.totalDelayMin
      )} delay`,
      borderColor:
        simulation.metrics.cancelledFlights > 0
          ? 'border-t-[#E05D5D]'
          : 'border-t-[#5EC8D8]',
      textColor:
        simulation.metrics.cancelledFlights > 0
          ? 'text-[#E05D5D]'
          : 'text-[#5EC8D8]',
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto divide-y divide-[#28313B] bg-[#10151B]">
      {/* Header */}
      <div className="px-5 py-3.5 bg-[#0B0E12] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#5EC8D8]">
            Cascade Propagation Analysis
          </div>
          <h1 className="text-base font-semibold text-[#E8EDF2] mt-0.5">
            {scenario.airportCode} Disruption Propagation Chain &amp; Tail Rotation Matrix
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNetwork}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#E8EDF2] bg-[#151B22] hover:bg-[#1A222B] border border-[#28313B] transition-colors whitespace-nowrap shrink-0"
          >
            <Compass className="h-3.5 w-3.5 text-[#5EC8D8]" />
            <span>Network Map</span>
          </button>
          <button
            type="button"
            onClick={onOpenRecovery}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-[#0B0E12] bg-[#5EC8D8] hover:bg-[#76D4E2] transition-colors whitespace-nowrap shrink-0"
          >
            <span>Open Recovery</span>
          </button>
        </div>
      </div>

      {/* 5-Stage Causal Flow + Network Summary */}
      <div className="p-5 bg-[#10151B] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#E8EDF2]">
            End-to-End Cascade Progression
          </span>
          <span className="text-[#8B98A7]">
            Deterministic trace from source restriction through tail rotation to passenger &amp; network impact
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          {pipelineNodes.map((node, idx) => (
            <div key={node.step} className="flex items-stretch gap-1.5">
              <div
                onClick={node.action}
                className={`flex-1 rounded bg-[#151B22] border border-[#28313B] border-t-2 ${
                  node.borderColor
                } p-3 flex flex-col justify-between gap-2 ${
                  node.action ? 'cursor-pointer hover:bg-[#1A222B]' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-mono text-[10px] text-[#647282]">{node.step}</span>
                  <span className="font-mono text-[10px] font-medium text-[#8B98A7] tracking-wide truncate">
                    {node.title}
                  </span>
                </div>
                <div
                  className={`font-mono text-sm font-semibold tabular-nums ${node.textColor}`}
                >
                  {node.value}
                </div>
                <div className="text-[11px] text-[#8B98A7] leading-snug">{node.sub}</div>
              </div>
              {idx < pipelineNodes.length - 1 && (
                <div className="hidden lg:flex items-center text-[#28313B]">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tail-by-Tail Rotation Cascade Matrix */}
      <div className="bg-[#10151B]">
        <div className="px-5 py-3.5 border-b border-[#28313B] bg-[#0B0E12] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#E8EDF2]">
              Aircraft Tail Rotation Propagation ({tailChains.length} Tails)
            </h2>
            <p className="text-xs text-[#8B98A7] mt-0.5">
              Direct delays propagate horizontally into subsequent sectors when turnaround buffers compress. Click any flight node to inspect its corridor on the India Map.
            </p>
          </div>

          <div className="flex items-center rounded overflow-hidden border border-[#28313B] bg-[#151B22]">
            <button
              type="button"
              onClick={() => setChainFilter('disrupted')}
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                chainFilter === 'disrupted'
                  ? 'bg-[#1D2834] text-[#5EC8D8]'
                  : 'text-[#8B98A7] hover:text-[#E8EDF2]'
              }`}
            >
              Affected Tails
            </button>
            <button
              type="button"
              onClick={() => setChainFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                chainFilter === 'all'
                  ? 'bg-[#1D2834] text-[#5EC8D8]'
                  : 'text-[#8B98A7] hover:text-[#E8EDF2]'
              }`}
            >
              All Fleet Tails
            </button>
          </div>
        </div>

        {tailChains.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-[#8B98A7]">
            No disrupted tail rotations under current scenario.
          </div>
        ) : (
          <div className="divide-y divide-[#28313B]">
            {tailChains.map((chain) => (
              <div key={chain.aircraftId} className="p-4 lg:px-5 space-y-2.5 bg-[#10151B]">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-[#E8EDF2]">
                      <Plane className="h-3.5 w-3.5 text-[#5EC8D8]" />
                      {chain.tailNumber}
                    </span>
                    <span className="text-[#8B98A7]">{chain.model}</span>
                    <span className="text-[#28313B]">·</span>
                    <span className="font-mono text-[#8B98A7] tabular-nums">
                      {chain.legs.length} sectors
                    </span>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-[11px] tabular-nums">
                    {chain.hasDirectHit && (
                      <span className="text-[#F2A93B]">Direct Hold</span>
                    )}
                    {chain.hasRotationBleed && (
                      <span className="text-[#D97D45]">Rotation Bleed</span>
                    )}
                    {chain.hasCancellation && (
                      <span className="text-[#E05D5D]">Cancellation</span>
                    )}
                    {chain.hasRecovered && (
                      <span className="text-[#75B798]">Recovered</span>
                    )}
                    <span className="text-[#E8EDF2]">
                      {formatDuration(chain.totalDelayMin)} · {chain.affectedPax} pax
                    </span>
                  </div>
                </div>

                {/* Horizontal Leg Chain */}
                <div className="flex flex-wrap items-center gap-2">
                  {chain.legs.map((leg, idx) => {
                    const prevLeg = idx > 0 ? chain.legs[idx - 1] : null;
                    const schedTurn = prevLeg
                      ? leg.scheduledDepMin - prevLeg.scheduledArrMin
                      : null;
                    const peakDelay = Math.max(leg.depDelayMin, leg.arrDelayMin);

                    const borderTone =
                      leg.status === 'cancelled'
                        ? 'border-[#6E2D2D] bg-[#221215]'
                        : leg.status === 'recovered'
                        ? 'border-[#2E5E4E] bg-[#11221D]'
                        : leg.affectedByRotation && peakDelay >= 15
                        ? 'border-[#6E4025] bg-[#201610]'
                        : peakDelay >= 15
                        ? 'border-[#6B4E1E] bg-[#211A10]'
                        : 'border-[#28313B] bg-[#151B22]';

                    return (
                      <React.Fragment key={leg.id}>
                        {schedTurn !== null && (
                          <div className="flex flex-col items-center px-1 text-[10px] font-mono text-[#647282] tabular-nums">
                            <ArrowRight className="h-3 w-3 text-[#28313B]" />
                            <span>{schedTurn}m</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => onInspectFlightOnMap(leg.id)}
                          className={`px-3 py-2 rounded border text-left transition-colors hover:border-[#5EC8D8] ${borderTone}`}
                        >
                          <div className="flex items-center justify-between gap-3 text-xs font-mono">
                            <span className="font-semibold text-[#E8EDF2]">
                              {leg.flightNumber}
                            </span>
                            <span
                              className={`font-semibold tabular-nums ${
                                leg.status === 'cancelled'
                                  ? 'text-[#E05D5D]'
                                  : leg.status === 'recovered'
                                  ? 'text-[#75B798]'
                                  : leg.affectedByRotation && peakDelay >= 15
                                  ? 'text-[#D97D45]'
                                  : peakDelay >= 15
                                  ? 'text-[#F2A93B]'
                                  : 'text-[#5EC8D8]'
                              }`}
                            >
                              {leg.status === 'cancelled'
                                ? 'CXL'
                                : leg.status === 'recovered'
                                ? peakDelay > 0
                                  ? `REC +${peakDelay}m`
                                  : 'REC 0m'
                                : peakDelay >= 15
                                ? `+${peakDelay}m`
                                : 'On Time'}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-[#8B98A7] mt-0.5 tabular-nums">
                            {leg.origin} → {leg.destination} ·{' '}
                            {formatMinutesToHHMM(leg.scheduledDepMin)}
                          </div>
                          <div className="text-[10px] text-[#647282] mt-0.5">
                            {leg.status === 'cancelled'
                              ? 'Cancelled'
                              : leg.affectedByRotation && peakDelay >= 15
                              ? 'Secondary rotation cascade'
                              : peakDelay >= 15
                              ? 'Direct station impact'
                              : leg.status === 'recovered'
                              ? 'Restored by action'
                              : 'Nominal'}
                          </div>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Downstream Hub Connection & Crew Consequences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#28313B] bg-[#10151B]">
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#E8EDF2]">
              <Users className="h-3.5 w-3.5 text-[#F2A93B]" />
              <span>Broken Hub Passenger Connections</span>
            </div>
            <span className="font-mono text-xs text-[#F2A93B] tabular-nums">
              {cascadeSummary.missedConns.length} waves ·{' '}
              {simulation.metrics.missedConnections} pax
            </span>
          </div>

          {cascadeSummary.missedConns.length === 0 ? (
            <div className="py-6 text-xs text-[#75B798] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span>All hub passenger transfer windows remain intact above 35m MCT.</span>
            </div>
          ) : (
            <div className="rounded border border-[#28313B] divide-y divide-[#28313B]/70 max-h-60 overflow-y-auto bg-[#151B22]">
              {cascadeSummary.missedConns.map((c) => (
                <div
                  key={c.connection.id}
                  onClick={() => onInspectFlightOnMap(c.connection.toFlightId)}
                  className="px-3 py-2 flex items-center justify-between text-xs hover:bg-[#1A222B] cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-mono font-semibold text-[#E8EDF2]">
                      {c.connection.airportCode}
                    </span>
                    <span className="font-mono text-[#8B98A7] ml-2">
                      {c.fromFlightNumber} ({c.fromOrigin}) → {c.toFlightNumber} ({c.toDestination})
                    </span>
                  </div>
                  <div className="font-mono text-right tabular-nums">
                    <span className="text-[#E05D5D] font-semibold">
                      {c.availableConnectMin < -500 ? 'CXL' : `${c.availableConnectMin}m`}
                    </span>
                    <span className="text-[#8B98A7] ml-2">
                      {c.affectedPassengers} pax
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#E8EDF2]">
              <AlertTriangle className="h-3.5 w-3.5 text-[#E05D5D]" />
              <span>Crew Duty Limits &amp; Cancellations</span>
            </div>
            <span className="font-mono text-xs text-[#E05D5D] tabular-nums">
              {cascadeSummary.cancelledFlights.length} cancelled ·{' '}
              {cascadeSummary.crewImpacted.length} crew-flagged
            </span>
          </div>

          {cascadeSummary.cancelledFlights.length === 0 &&
          cascadeSummary.crewImpacted.length === 0 ? (
            <div className="py-6 text-xs text-[#75B798] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span>Zero flights cancelled and no FAR crew duty limits breached.</span>
            </div>
          ) : (
            <div className="rounded border border-[#28313B] divide-y divide-[#28313B]/70 max-h-60 overflow-y-auto bg-[#151B22]">
              {[...cascadeSummary.cancelledFlights, ...cascadeSummary.crewImpacted]
                .filter((f, idx, arr) => arr.findIndex((x) => x.id === f.id) === idx)
                .map((f) => (
                  <div
                    key={f.id}
                    onClick={() => onInspectFlightOnMap(f.id)}
                    className="px-3 py-2 flex items-start justify-between gap-3 text-xs hover:bg-[#1A222B] cursor-pointer transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="font-mono font-semibold text-[#E8EDF2] flex items-center gap-1.5">
                        {f.status === 'cancelled' && (
                          <XCircle className="h-3.5 w-3.5 text-[#E05D5D]" />
                        )}
                        <span>
                          {f.flightNumber} ({f.origin} → {f.destination})
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8B98A7]">{f.delayCause}</div>
                    </div>
                    <span className="font-mono text-[#8B98A7] tabular-nums shrink-0">
                      {f.passengerCount} pax
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
