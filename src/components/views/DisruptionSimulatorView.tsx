import React, { useEffect, useMemo, useState } from 'react';
import {
  Airport,
  DisruptionScenario,
  DisruptionType,
  EvaluatedRecoveryAction,
  RecoveryAction,
  SimulationResult,
  TimelineEvent,
} from '../../types/aviation';
import { formatDuration, formatMinutesToHHMM } from '../../utils/time';
import { UnderstandDisruptionPanel } from '../UnderstandDisruptionPanel';
import {
  AlertTriangle,
  Clock,
  CloudLightning,
  Compass,
  Loader2,
  MapPin,
  Play,
  ShieldAlert,
} from 'lucide-react';

interface DisruptionSimulatorViewProps {
  airports: Airport[];
  scenario: DisruptionScenario | null;
  disruptedBaseline: SimulationResult;
  currentSimulation: SimulationResult;
  recommendations: EvaluatedRecoveryAction[];
  appliedActions: RecoveryAction[];
  isSimulating: boolean;
  onApplyScenario: (scenario: DisruptionScenario) => void;
  onInspectFlightOnMap: (flightId: string) => void;
  onInspectAirportOnMap: (airportCode: string) => void;
  onOpenCascade: () => void;
  onOpenRecovery: () => void;
}

const DISRUPTION_PROFILES: Array<{
  type: DisruptionType;
  label: string;
  mechanism: string;
  severityHint: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    type: 'closure',
    label: 'Airport Closure',
    mechanism:
      'Zero arrivals or departures during the window. Queued movements release in staggered 6–8 min runway slots upon reopening.',
    severityHint: 'Severe cascade & potential cancellations',
    icon: ShieldAlert,
  },
  {
    type: 'thunderstorm',
    label: 'Severe Weather Slowdown',
    mechanism:
      'Convective Ground Delay Program slows arrival/departure flow proportionally to peak movement density inside the window.',
    severityHint: 'Moderate-to-high flow delay & hub misconnects',
    icon: CloudLightning,
  },
  {
    type: 'runway_restriction',
    label: 'Runway Restriction',
    mechanism:
      'Single-runway flow cap imposes deterministic spacing delays across scheduled bank departures and inbound arrivals.',
    severityHint: 'Contained flow delay & turn compression',
    icon: AlertTriangle,
  },
];

const START_WINDOWS = [
  { label: '06:30 Early Bank', value: 390 },
  { label: '08:00 Morning Peak', value: 480 },
  { label: '09:00 Hub Wave', value: 540 },
  { label: '10:00 Midday Bank', value: 600 },
  { label: '13:30 Afternoon Wave', value: 810 },
  { label: '16:30 Evening Rush', value: 990 },
];

const DURATION_OPTIONS = [60, 90, 120, 150, 180, 240];

export const DisruptionSimulatorView: React.FC<DisruptionSimulatorViewProps> = ({
  airports,
  scenario,
  disruptedBaseline,
  currentSimulation,
  recommendations,
  appliedActions,
  isSimulating,
  onApplyScenario,
  onInspectFlightOnMap,
  onInspectAirportOnMap,
  onOpenCascade,
  onOpenRecovery,
}) => {
  const [selectedCode, setSelectedCode] = useState<string>(
    scenario?.airportCode ?? airports[0]?.code ?? 'DEL'
  );
  const [selectedType, setSelectedType] = useState<DisruptionType>(
    scenario?.type ?? 'closure'
  );
  const [startTimeMin, setStartTimeMin] = useState<number>(
    scenario?.startTimeMin ?? 480
  );
  const [durationMin, setDurationMin] = useState<number>(
    scenario?.durationMin ?? 120
  );
  const [eventFilter, setEventFilter] = useState<
    'all' | TimelineEvent['category']
  >('all');

  useEffect(() => {
    if (scenario) {
      setSelectedCode(scenario.airportCode);
      setSelectedType(scenario.type);
      setStartTimeMin(scenario.startTimeMin);
      setDurationMin(scenario.durationMin);
    }
  }, [scenario]);

  useEffect(() => {
    setSelectedCode((prev) =>
      airports.some((a) => a.code === prev) ? prev : (airports[0]?.code ?? 'DEL')
    );
  }, [airports]);

  const selectedAirport = useMemo(
    () => airports.find((a) => a.code === selectedCode) ?? airports[0],
    [airports, selectedCode]
  );

  const selectedAirportScheduledCount = useMemo(() => {
    if (!selectedAirport) return 0;
    return currentSimulation.flights.filter(
      (f) => f.origin === selectedAirport.code || f.destination === selectedAirport.code
    ).length;
  }, [currentSimulation.flights, selectedAirport]);

  const windowAffectedCount = useMemo(() => {
    if (!selectedAirport) return 0;
    const end = startTimeMin + durationMin;
    return currentSimulation.flights.filter(
      (f) =>
        (f.origin === selectedAirport.code &&
          f.scheduledDepMin >= startTimeMin &&
          f.scheduledDepMin < end) ||
        (f.destination === selectedAirport.code &&
          f.scheduledArrMin >= startTimeMin &&
          f.scheduledArrMin < end)
    ).length;
  }, [currentSimulation.flights, selectedAirport, startTimeMin, durationMin]);

  const directFlights = useMemo(() => {
    if (!scenario) return [];
    return currentSimulation.flights
      .filter(
        (f) =>
          (f.origin === scenario.airportCode || f.destination === scenario.airportCode) &&
          (f.status !== 'on_time' || f.depDelayMin > 0 || f.arrDelayMin > 0)
      )
      .sort((a, b) => a.scheduledDepMin - b.scheduledDepMin);
  }, [currentSimulation.flights, scenario]);

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return currentSimulation.events;
    return currentSimulation.events.filter((ev) => ev.category === eventFilter);
  }, [currentSimulation.events, eventFilter]);

  const handleExecute = () => {
    onApplyScenario({
      id: `SCEN-${selectedCode}-${selectedType}-${startTimeMin}-${durationMin}`,
      airportCode: selectedCode,
      type: selectedType,
      startTimeMin,
      durationMin,
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto divide-y divide-[#28313B] bg-[#10151B]">
      {/* Header Strip */}
      <div className="px-5 py-3.5 bg-[#0B0E12] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#5EC8D8]">
            Disruption Simulation Builder
          </div>
          <h1 className="text-base font-semibold text-[#E8EDF2] mt-0.5">
            Configure Station Restriction &amp; Inspect Operational Timeline
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {scenario && (
            <>
              <button
                type="button"
                onClick={() => onInspectAirportOnMap(scenario.airportCode)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#E8EDF2] bg-[#151B22] hover:bg-[#1A222B] border border-[#28313B] transition-colors whitespace-nowrap shrink-0"
              >
                <Compass className="h-3.5 w-3.5 text-[#5EC8D8]" />
                <span>View on Map</span>
              </button>
              <button
                type="button"
                onClick={onOpenCascade}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#E8EDF2] bg-[#151B22] hover:bg-[#1A222B] border border-[#28313B] transition-colors whitespace-nowrap shrink-0"
              >
                <span>Trace Cascade</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Split: Configuration Controls (left) + Plain-English Analysis & Direct Flights (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#28313B] bg-[#10151B]">
        {/* Left 7 Columns: Structured Disruption Configuration */}
        <div className="lg:col-span-7 p-5 space-y-5">
          {/* Step 1: Airport Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="sim-airport-select"
                className="text-xs font-semibold text-[#E8EDF2]"
              >
                01. Target Indian Station
              </label>
              {selectedAirport && (
                <span className="font-mono text-[11px] text-[#8B98A7] tabular-nums">
                  {selectedAirport.isHub ? 'Primary Hub' : 'Regional Spoke'} ·{' '}
                  {selectedAirport.runways} runway{selectedAirport.runways > 1 ? 's' : ''} ·{' '}
                  {selectedAirport.gates} gates · {selectedAirportScheduledCount} movements
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <select
                id="sim-airport-select"
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                className="sm:col-span-7 rounded bg-[#151B22] border border-[#28313B] px-3 py-2 text-xs font-medium text-[#E8EDF2] focus:outline-none focus:border-[#5EC8D8]"
              >
                {airports.map((ap) => (
                  <option key={ap.code} value={ap.code}>
                    {ap.code} — {ap.city} ({ap.name})
                  </option>
                ))}
              </select>

              <div className="sm:col-span-5 rounded flex items-center justify-between px-3 py-2 bg-[#151B22] border border-[#28313B] text-xs">
                <span className="text-[#8B98A7]">In selected window</span>
                <span className="font-mono font-semibold text-[#F2A93B] tabular-nums">
                  {windowAffectedCount} movements
                </span>
              </div>
            </div>
          </div>

          {/* Step 2: Disruption Type */}
          <div className="space-y-2.5 pt-3 border-t border-[#28313B]">
            <div className="text-xs font-semibold text-[#E8EDF2]">
              02. Operational Disruption Profile
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 rounded-md overflow-hidden border border-[#28313B] divide-y md:divide-y-0 md:divide-x divide-[#28313B]">
              {DISRUPTION_PROFILES.map((prof) => {
                const Icon = prof.icon;
                const active = selectedType === prof.type;
                return (
                  <button
                    key={prof.type}
                    type="button"
                    onClick={() => setSelectedType(prof.type)}
                    className={`p-3.5 text-left transition-colors flex flex-col justify-between gap-2 ${
                      active
                        ? 'bg-[#1D1912] border-t-2 md:border-t-0 md:border-b-2 border-[#F2A93B]'
                        : 'bg-[#151B22] hover:bg-[#1A222B]'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#E8EDF2]">
                          {prof.label}
                        </span>
                        <Icon
                          className={`h-3.5 w-3.5 shrink-0 ${
                            active ? 'text-[#F2A93B]' : 'text-[#8B98A7]'
                          }`}
                        />
                      </div>
                      <p className="text-[11px] text-[#8B98A7] leading-relaxed">
                        {prof.mechanism}
                      </p>
                    </div>
                    <div
                      className={`text-[11px] font-medium ${
                        active ? 'text-[#F2A93B]' : 'text-[#647282]'
                      }`}
                    >
                      {prof.severityHint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Window & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#28313B]">
            <div className="space-y-2">
              <label
                htmlFor="sim-start-select"
                className="text-xs font-semibold text-[#E8EDF2] block"
              >
                03. Disruption Start Time
              </label>
              <select
                id="sim-start-select"
                value={startTimeMin}
                onChange={(e) => setStartTimeMin(Number(e.target.value))}
                className="w-full rounded bg-[#151B22] border border-[#28313B] px-3 py-2 text-xs font-mono text-[#E8EDF2] focus:outline-none focus:border-[#5EC8D8]"
              >
                {START_WINDOWS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#E8EDF2]">04. Duration</span>
                <span className="font-mono text-[#5EC8D8] tabular-nums">
                  {formatMinutesToHHMM(startTimeMin)} –{' '}
                  {formatMinutesToHHMM(startTimeMin + durationMin)}
                </span>
              </div>
              <div className="grid grid-cols-6 rounded overflow-hidden border border-[#28313B] divide-x divide-[#28313B]">
                {DURATION_OPTIONS.map((d) => {
                  const active = durationMin === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDurationMin(d)}
                      className={`py-2 text-xs font-mono tabular-nums transition-colors ${
                        active
                          ? 'bg-[#1D2834] text-[#5EC8D8] font-semibold'
                          : 'bg-[#151B22] text-[#8B98A7] hover:text-[#E8EDF2]'
                      }`}
                    >
                      {formatDuration(d)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Execute Button */}
          <div className="pt-3 border-t border-[#28313B] flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#8B98A7]">
              Deterministic run across{' '}
              <span className="font-mono text-[#E8EDF2]">
                {currentSimulation.metrics.totalFlights}
              </span>{' '}
              flights and{' '}
              <span className="font-mono text-[#E8EDF2]">
                {currentSimulation.connections.length}
              </span>{' '}
              connecting hub banks.
            </div>
            <button
              type="button"
              disabled={isSimulating}
              onClick={handleExecute}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-xs font-semibold text-[#0B0E12] bg-[#5EC8D8] hover:bg-[#76D4E2] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              {isSimulating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Simulating...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Simulate Disruption</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right 5 Columns: Intelligence Summary & Station Movements */}
        <div className="lg:col-span-5 bg-[#151B22] flex flex-col divide-y divide-[#28313B]">
          <div className="p-5">
            <UnderstandDisruptionPanel
              scenario={scenario}
              disruptedBaseline={disruptedBaseline}
              currentSimulation={currentSimulation}
              recommendations={recommendations}
              appliedActions={appliedActions}
              onOpenRecoveryLab={onOpenRecovery}
              onSelectFlight={onInspectFlightOnMap}
            />
          </div>

          <div className="p-5 space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#E8EDF2]">
                {scenario
                  ? `Affected Station Movements at ${scenario.airportCode}`
                  : 'Station Movements'}
              </h2>
              <span className="font-mono text-[11px] text-[#8B98A7] tabular-nums">
                {directFlights.length} flights
              </span>
            </div>

            {!scenario ? (
              <div className="py-8 rounded text-center text-xs text-[#8B98A7] border border-[#28313B] bg-[#10151B]">
                Run a simulation on the left to inspect affected arrivals and departures.
              </div>
            ) : directFlights.length === 0 ? (
              <div className="py-8 rounded text-center text-xs text-[#8B98A7] border border-[#28313B] bg-[#10151B]">
                No flights directly delayed or cancelled at {scenario.airportCode}.
              </div>
            ) : (
              <div className="rounded border border-[#28313B] divide-y divide-[#28313B]/70 max-h-64 overflow-y-auto bg-[#10151B]">
                {directFlights.map((f) => {
                  const peakDelay = Math.max(f.depDelayMin, f.arrDelayMin);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onInspectFlightOnMap(f.id)}
                      className="w-full px-3 py-2 flex items-center justify-between text-xs hover:bg-[#1A222B] transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-[#E8EDF2]">
                          {f.flightNumber}
                        </span>
                        <span className="font-mono text-[#8B98A7] ml-2">
                          {f.origin} → {f.destination}
                        </span>
                        <span className="font-mono text-[#647282] ml-2">
                          {formatMinutesToHHMM(f.scheduledDepMin)}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-semibold tabular-nums shrink-0 ${
                          f.status === 'cancelled'
                            ? 'text-[#E05D5D]'
                            : f.status === 'recovered'
                            ? 'text-[#75B798]'
                            : 'text-[#F2A93B]'
                        }`}
                      >
                        {f.status === 'cancelled' ? 'Cancelled' : `+${peakDelay}m`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Analytical Chronological Incident Log */}
      <div className="bg-[#10151B]">
        <div className="px-5 py-3.5 border-b border-[#28313B] bg-[#0B0E12] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#E8EDF2]">
              Chronological Disruption Story Log
            </h2>
            <p className="text-xs text-[#8B98A7] mt-0.5">
              {filteredEvents.length} timestamped events across initial disruption, rotation bleed, hub connections, and recovery
            </p>
          </div>

          <div className="flex flex-wrap items-center rounded overflow-hidden border border-[#28313B] bg-[#151B22]">
            {(
              [
                ['all', 'All Events'],
                ['disruption', 'Disruption'],
                ['rotation', 'Rotation'],
                ['connection', 'Connections'],
                ['cancellation', 'Cancellations'],
                ['recovery', 'Recovery'],
              ] as const
            ).map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => setEventFilter(val)}
                className={`px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  eventFilter === val
                    ? 'bg-[#1D2834] text-[#5EC8D8]'
                    : 'text-[#8B98A7] hover:text-[#E8EDF2]'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-[#8B98A7]">
            {scenario
              ? 'No events match this category filter.'
              : 'All flights are operating on baseline schedule with zero disruption events.'}
          </div>
        ) : (
          <div className="divide-y divide-[#28313B]/60 max-h-[340px] overflow-y-auto">
            {filteredEvents.map((ev) => {
              const sevColor =
                ev.severity === 'critical'
                  ? 'text-[#E05D5D]'
                  : ev.severity === 'warning'
                  ? 'text-[#F2A93B]'
                  : ev.severity === 'recovered'
                  ? 'text-[#75B798]'
                  : 'text-[#5EC8D8]';
              return (
                <div
                  key={ev.id}
                  onClick={() => {
                    if (ev.flightId) onInspectFlightOnMap(ev.flightId);
                    else onInspectAirportOnMap(ev.airportCode);
                  }}
                  className="px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-[#151B22] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-mono text-[#E8EDF2] tabular-nums shrink-0 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-[#8B98A7]" />
                      {formatMinutesToHHMM(ev.timeMin)}
                    </span>
                    <span className={`font-mono font-medium w-24 shrink-0 capitalize ${sevColor}`}>
                      {ev.category}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[#8B98A7] w-12 shrink-0">
                      <MapPin className="h-3 w-3 text-[#647282]" />
                      {ev.airportCode}
                    </span>
                    <div className="min-w-0">
                      <span className="font-medium text-[#E8EDF2]">{ev.title}</span>
                      <span className="text-[#8B98A7] ml-2 hidden md:inline">{ev.detail}</span>
                    </div>
                  </div>
                  {typeof ev.impactCount === 'number' && ev.impactCount > 0 && (
                    <span className="font-mono text-[#8B98A7] tabular-nums shrink-0">
                      {ev.impactCount} pax
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
