import React, { useEffect, useMemo, useState } from 'react';
import {
  Airport,
  DisruptionScenario,
  DisruptionType,
  EvaluatedRecoveryAction,
  RecoveryAction,
  SimulationResult,
} from '../../types/aviation';
import { buildReplayStageSnapshot, ReplayStage } from '../../types/replay';
import { formatDuration, formatMinutesToHHMM } from '../../utils/time';
import { IndiaNetworkMap } from '../IndiaNetworkMap';
import { HorizontalIncidentTimeline } from '../HorizontalIncidentTimeline';
import { UnderstandDisruptionPanel } from '../UnderstandDisruptionPanel';
import {
  AlertTriangle,
  Clock,
  GitMerge,
  Loader2,
  MapPin,
  Play,
  X,
} from 'lucide-react';

interface NetworkAtlasViewProps {
  airports: Airport[];
  scenario: DisruptionScenario | null;
  disruptedBaseline: SimulationResult;
  currentSimulation: SimulationResult;
  recommendations: EvaluatedRecoveryAction[];
  appliedActions: RecoveryAction[];
  isSimulating: boolean;
  isDemoDataset: boolean;
  selectedAirportCode: string | null;
  selectedFlightId: string | null;
  selectedStateName: string | null;
  replayStage: ReplayStage;
  isReplaying: boolean;
  onSelectAirport: (code: string | null) => void;
  onSelectFlight: (flightId: string | null) => void;
  onSelectState: (stateName: string | null) => void;
  onChangeReplayStage: (stage: ReplayStage) => void;
  onToggleReplayPlay: () => void;
  onReplayFromStart: () => void;
  onApplyScenario: (scenario: DisruptionScenario) => void;
  onOpenCascade: () => void;
  onOpenRecoveryLab: () => void;
}

const DISRUPTION_TYPES: Array<{ type: DisruptionType; label: string }> = [
  { type: 'closure', label: 'Airport Closure' },
  { type: 'thunderstorm', label: 'Severe Weather' },
  { type: 'runway_restriction', label: 'Runway Cap' },
];

const START_TIMES = [
  { label: '06:30', value: 390 },
  { label: '08:00', value: 480 },
  { label: '09:00', value: 540 },
  { label: '10:00', value: 600 },
  { label: '13:30', value: 810 },
  { label: '16:30', value: 990 },
];

const DURATIONS = [60, 90, 120, 150, 180, 240];

export const NetworkAtlasView: React.FC<NetworkAtlasViewProps> = ({
  airports,
  scenario,
  disruptedBaseline,
  currentSimulation,
  recommendations,
  appliedActions,
  isSimulating,
  isDemoDataset,
  selectedAirportCode,
  selectedFlightId,
  selectedStateName,
  replayStage,
  isReplaying,
  onSelectAirport,
  onSelectFlight,
  onSelectState,
  onChangeReplayStage,
  onToggleReplayPlay,
  onReplayFromStart,
  onApplyScenario,
  onOpenCascade,
  onOpenRecoveryLab,
}) => {
  const defaultAirport = useMemo(() => airports[0]?.code ?? 'DEL', [airports]);
  const [formAirport, setFormAirport] = useState<string>(scenario?.airportCode ?? defaultAirport);
  const [formType, setFormType] = useState<DisruptionType>(scenario?.type ?? 'closure');
  const [formStartMin, setFormStartMin] = useState<number>(scenario?.startTimeMin ?? 480);
  const [formDurationMin, setFormDurationMin] = useState<number>(scenario?.durationMin ?? 120);

  useEffect(() => {
    if (selectedAirportCode && airports.some((a) => a.code === selectedAirportCode)) {
      setFormAirport(selectedAirportCode);
    }
  }, [selectedAirportCode, airports]);

  useEffect(() => {
    if (!airports.some((a) => a.code === formAirport) && airports[0]) {
      setFormAirport(airports[0].code);
    }
  }, [airports, formAirport]);

  const replaySnapshot = useMemo(
    () =>
      buildReplayStageSnapshot(
        replayStage,
        scenario,
        disruptedBaseline,
        currentSimulation,
        appliedActions.length
      ),
    [replayStage, scenario, disruptedBaseline, currentSimulation, appliedActions.length]
  );

  const selectedAirportMeta = useMemo(
    () => airports.find((a) => a.code === selectedAirportCode) ?? null,
    [airports, selectedAirportCode]
  );
  const selectedAirportImpact = selectedAirportCode
    ? currentSimulation.airports[selectedAirportCode] ?? null
    : null;
  const selectedAirportFlights = useMemo(() => {
    if (!selectedAirportCode) return [];
    return currentSimulation.flights
      .filter((f) => f.origin === selectedAirportCode || f.destination === selectedAirportCode)
      .sort((a, b) => a.scheduledDepMin - b.scheduledDepMin);
  }, [currentSimulation.flights, selectedAirportCode]);
  const selectedAirportConnectingPax = useMemo(() => {
    if (!selectedAirportCode) return 0;
    return currentSimulation.connections
      .filter((c) => c.connection.airportCode === selectedAirportCode)
      .reduce((s, c) => s + c.connection.passengerCount, 0);
  }, [currentSimulation.connections, selectedAirportCode]);
  const selectedAirportRotationAffected = useMemo(
    () => selectedAirportFlights.filter((f) => f.affectedByRotation).length,
    [selectedAirportFlights]
  );

  const selectedFlight = useMemo(
    () => currentSimulation.flights.find((f) => f.id === selectedFlightId) ?? null,
    [currentSimulation.flights, selectedFlightId]
  );
  const selectedFlightRotation = useMemo(() => {
    if (!selectedFlight) return [];
    return currentSimulation.flights
      .filter((f) => f.effectiveAircraftId === selectedFlight.effectiveAircraftId)
      .sort((a, b) => a.scheduledDepMin - b.scheduledDepMin);
  }, [currentSimulation.flights, selectedFlight]);

  const stateAirports = useMemo(() => {
    if (!selectedStateName) return [];
    return airports.filter(
      (a) => (a.state ?? '').toLowerCase() === selectedStateName.toLowerCase()
    );
  }, [airports, selectedStateName]);

  const impactSplit = useMemo(() => {
    const primary = scenario?.airportCode ?? null;
    const direct = currentSimulation.flights.filter(
      (f) =>
        (f.status === 'delayed' || f.status === 'cancelled') &&
        !f.affectedByRotation &&
        (f.origin === primary || f.destination === primary)
    );
    const secondary = currentSimulation.flights.filter(
      (f) => f.affectedByRotation && (f.status === 'delayed' || f.status === 'cancelled')
    );
    return { direct, secondary };
  }, [currentSimulation.flights, scenario]);

  const quickPresets: Array<{ label: string; scen: DisruptionScenario }> = useMemo(() => {
    const has = (code: string) => airports.some((a) => a.code === code);
    const items: Array<{ label: string; scen: DisruptionScenario }> = [];
    if (has('DEL')) {
      items.push({
        label: 'DEL Fog',
        scen: { id: 'PRESET-DEL', airportCode: 'DEL', type: 'closure', startTimeMin: 480, durationMin: 120 },
      });
    }
    if (has('BOM')) {
      items.push({
        label: 'BOM Storm',
        scen: { id: 'PRESET-BOM', airportCode: 'BOM', type: 'thunderstorm', startTimeMin: 540, durationMin: 150 },
      });
    }
    if (has('BLR')) {
      items.push({
        label: 'BLR Runway',
        scen: { id: 'PRESET-BLR', airportCode: 'BLR', type: 'runway_restriction', startTimeMin: 600, durationMin: 150 },
      });
    }
    return items;
  }, [airports]);

  const handleRunCustomScenario = () => {
    onApplyScenario({
      id: `SCEN-${formAirport}-${formType}-${formStartMin}-${formDurationMin}`,
      airportCode: formAirport,
      type: formType,
      startTimeMin: formStartMin,
      durationMin: formDurationMin,
    });
  };

  const { metrics, events } = currentSimulation;

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      {/* LEFT / CENTER: Dominant Map Workspace (~75% width, full height) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0 relative bg-[#0B0E12]">
        {/* Floating Compact Simulation Control Bar */}
        <div className="lg:absolute lg:top-3 lg:left-3 z-20 p-2.5 lg:p-0 border-b lg:border-b-0 border-[#28313B] bg-[#10151B] lg:bg-transparent">
          <div className="bg-[#151B22] border border-[#28313B] rounded-md px-2.5 py-2 flex flex-wrap items-center gap-1.5">
            <select
              value={formAirport}
              onChange={(e) => {
                setFormAirport(e.target.value);
                onSelectAirport(e.target.value);
              }}
              aria-label="Select airport to disrupt"
              className="bg-[#0B0E12] border border-[#28313B] rounded px-2 py-1 text-xs font-medium text-[#E8EDF2] focus:outline-none focus:border-[#5EC8D8]"
            >
              {airports.map((ap) => (
                <option key={ap.code} value={ap.code}>
                  {ap.code} — {ap.city}
                </option>
              ))}
            </select>

            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as DisruptionType)}
              aria-label="Disruption type"
              className="bg-[#0B0E12] border border-[#28313B] rounded px-2 py-1 text-xs text-[#E8EDF2] focus:outline-none focus:border-[#5EC8D8]"
            >
              {DISRUPTION_TYPES.map((dt) => (
                <option key={dt.type} value={dt.type}>
                  {dt.label}
                </option>
              ))}
            </select>

            <select
              value={formStartMin}
              onChange={(e) => setFormStartMin(Number(e.target.value))}
              aria-label="Start time"
              className="bg-[#0B0E12] border border-[#28313B] rounded px-2 py-1 text-xs font-mono text-[#E8EDF2] focus:outline-none focus:border-[#5EC8D8]"
            >
              {START_TIMES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>

            <select
              value={formDurationMin}
              onChange={(e) => setFormDurationMin(Number(e.target.value))}
              aria-label="Duration"
              className="bg-[#0B0E12] border border-[#28313B] rounded px-2 py-1 text-xs font-mono text-[#E8EDF2] focus:outline-none focus:border-[#5EC8D8]"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {formatDuration(d)}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={isSimulating}
              onClick={handleRunCustomScenario}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold text-[#0B0E12] bg-[#F2A93B] hover:bg-[#F5B95D] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {isSimulating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Running</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  <span>Simulate</span>
                </>
              )}
            </button>

            {quickPresets.length > 0 && (
              <div className="hidden xl:flex items-center gap-1 pl-1.5 ml-0.5 border-l border-[#28313B]">
                {quickPresets.map((p) => {
                  const isCurrent =
                    scenario?.airportCode === p.scen.airportCode &&
                    scenario?.type === p.scen.type;
                  return (
                    <button
                      key={p.scen.id}
                      type="button"
                      disabled={isSimulating}
                      onClick={() => onApplyScenario(p.scen)}
                      className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap ${
                        isCurrent
                          ? 'bg-[#221A10] border-[#F2A93B] text-[#F2A93B]'
                          : 'bg-[#10151B] border-[#28313B] text-[#8B98A7] hover:text-[#E8EDF2]'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Dominant Cartographic India Map */}
        <IndiaNetworkMap
          airports={airports}
          simulation={currentSimulation}
          replaySnapshot={scenario ? replaySnapshot : null}
          isReplaying={isReplaying}
          selectedAirportCode={selectedAirportCode}
          selectedFlightId={selectedFlightId}
          selectedStateName={selectedStateName}
          onSelectAirport={(code) => {
            onSelectAirport(code);
            if (code) onSelectState(null);
          }}
          onSelectFlight={(fid) => onSelectFlight(fid)}
          onSelectState={(st) => {
            onSelectState(st);
            if (st) {
              onSelectAirport(null);
              onSelectFlight(null);
            }
          }}
          isDemoDataset={isDemoDataset}
        />

        {/* Compact Cascade Story & Event Progression Bar */}
        <HorizontalIncidentTimeline
          hasScenario={Boolean(scenario)}
          stage={replayStage}
          isPlaying={isReplaying}
          snapshot={replaySnapshot}
          events={events}
          appliedActionsCount={appliedActions.length}
          onChangeStage={onChangeReplayStage}
          onTogglePlay={onToggleReplayPlay}
          onReplayFromStart={onReplayFromStart}
          onSelectFlight={(fid) => onSelectFlight(fid)}
          onSelectAirport={(code) => onSelectAirport(code)}
        />
      </div>

      {/* RIGHT INTELLIGENCE SIDEBAR (~320px fixed on desktop) */}
      <aside className="w-full lg:w-[320px] shrink-0 bg-[#151B22] border-t lg:border-t-0 lg:border-l border-[#28313B] flex flex-col lg:overflow-y-auto divide-y divide-[#28313B]">
        {/* 1. Network Summary */}
        <div className="p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B98A7]">
              Network Summary
            </span>
            <span className="font-mono text-[11px] text-[#5EC8D8] tabular-nums">
              {metrics.recoveredFlights > 0
                ? `${metrics.recoveredFlights} recovered · ${metrics.spareAircraft} spares`
                : `${metrics.activeAircraft} active · ${metrics.spareAircraft} spares`}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
            <div className="bg-[#10151B] border border-[#28313B] rounded px-2.5 py-1.5">
              <div className="font-sans text-[10px] text-[#8B98A7]">On Time</div>
              <div className="text-[#75B798] font-semibold mt-0.5">{metrics.onTimeFlights}</div>
            </div>
            <div className="bg-[#10151B] border border-[#28313B] rounded px-2.5 py-1.5">
              <div className="font-sans text-[10px] text-[#8B98A7]">Delayed</div>
              <div className="text-[#F2A93B] font-semibold mt-0.5">{metrics.delayedFlights}</div>
            </div>
            <div className="bg-[#10151B] border border-[#28313B] rounded px-2.5 py-1.5">
              <div className="font-sans text-[10px] text-[#8B98A7]">Cancelled</div>
              <div
                className={`font-semibold mt-0.5 ${
                  metrics.cancelledFlights > 0 ? 'text-[#E05D5D]' : 'text-[#E8EDF2]'
                }`}
              >
                {metrics.cancelledFlights}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Selected Airport / Flight / State */}
        <div className="p-3.5 space-y-2.5">
          {selectedFlight ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#5EC8D8]">
                    Selected Flight
                  </div>
                  <div className="font-mono text-sm font-semibold text-[#E8EDF2] mt-0.5">
                    {selectedFlight.flightNumber} · {selectedFlight.origin} → {selectedFlight.destination}
                  </div>
                  <div className="text-[11px] text-[#8B98A7] tabular-nums">
                    Tail {selectedFlight.effectiveAircraftId} · {selectedFlight.passengerCount} pax
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectFlight(null)}
                  className="p-1 rounded text-[#8B98A7] hover:text-[#E8EDF2]"
                  aria-label="Close flight detail"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums bg-[#10151B] border border-[#28313B] rounded p-2">
                <div>
                  <div className="font-sans text-[10px] text-[#8B98A7]">Departure</div>
                  <div className="text-[#E8EDF2]">
                    {formatMinutesToHHMM(selectedFlight.scheduledDepMin)} →{' '}
                    {selectedFlight.status === 'cancelled'
                      ? 'CXL'
                      : formatMinutesToHHMM(selectedFlight.actualDepMin)}
                  </div>
                </div>
                <div>
                  <div className="font-sans text-[10px] text-[#8B98A7]">Status</div>
                  <div
                    className={`font-semibold ${
                      selectedFlight.status === 'cancelled'
                        ? 'text-[#E05D5D]'
                        : selectedFlight.status === 'delayed'
                        ? 'text-[#F2A93B]'
                        : selectedFlight.status === 'recovered'
                        ? 'text-[#75B798]'
                        : 'text-[#5EC8D8]'
                    }`}
                  >
                    {selectedFlight.status === 'on_time'
                      ? 'On Time'
                      : selectedFlight.status === 'delayed'
                      ? `+${selectedFlight.depDelayMin}m`
                      : selectedFlight.status}
                  </div>
                </div>
              </div>

              {selectedFlight.delayCause && (
                <p className="text-[11px] text-[#F2A93B] leading-snug">
                  {selectedFlight.delayCause}
                </p>
              )}

              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#8B98A7]">
                  Tail Rotation ({selectedFlightRotation.length} legs)
                </div>
                <div className="divide-y divide-[#28313B] border border-[#28313B] rounded bg-[#10151B] max-h-36 overflow-y-auto">
                  {selectedFlightRotation.map((leg) => (
                    <button
                      key={leg.id}
                      type="button"
                      onClick={() => onSelectFlight(leg.id)}
                      className={`w-full text-left px-2.5 py-1.5 text-[11px] flex items-center justify-between transition-colors ${
                        leg.id === selectedFlight.id ? 'bg-[#1A2430]' : 'hover:bg-[#151B22]'
                      }`}
                    >
                      <span className="font-mono text-[#E8EDF2]">
                        #{leg.rotationOrder} {leg.flightNumber}{' '}
                        <span className="text-[#8B98A7]">
                          {leg.origin}→{leg.destination}
                        </span>
                      </span>
                      <span
                        className={`font-mono tabular-nums ${
                          leg.status === 'cancelled'
                            ? 'text-[#E05D5D]'
                            : leg.status === 'recovered'
                            ? 'text-[#75B798]'
                            : leg.depDelayMin >= 15
                            ? 'text-[#F2A93B]'
                            : 'text-[#8B98A7]'
                        }`}
                      >
                        {leg.status === 'cancelled'
                          ? 'CXL'
                          : leg.depDelayMin >= 15
                          ? `+${leg.depDelayMin}m`
                          : formatMinutesToHHMM(leg.scheduledDepMin)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : selectedAirportMeta && selectedAirportImpact ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#F2A93B]">
                    Selected Airport
                  </div>
                  <div className="text-sm font-semibold text-[#E8EDF2] mt-0.5">
                    {selectedAirportMeta.code} — {selectedAirportMeta.city}
                  </div>
                  <div className="text-[11px] text-[#8B98A7]">
                    {selectedAirportMeta.name}
                    {selectedAirportMeta.state ? ` · ${selectedAirportMeta.state}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectAirport(null)}
                  className="p-1 rounded text-[#8B98A7] hover:text-[#E8EDF2]"
                  aria-label="Close airport detail"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums bg-[#10151B] border border-[#28313B] rounded p-2.5">
                <div>
                  <div className="font-sans text-[10px] text-[#8B98A7]">Status</div>
                  <div
                    className={`font-sans font-semibold ${
                      selectedAirportImpact.severity === 'severe'
                        ? 'text-[#E05D5D]'
                        : selectedAirportImpact.severity === 'moderate'
                        ? 'text-[#F2A93B]'
                        : 'text-[#75B798]'
                    }`}
                  >
                    {selectedAirportImpact.isPrimaryDisrupted
                      ? 'Primary Source'
                      : selectedAirportImpact.severity === 'severe'
                      ? 'Severe'
                      : selectedAirportImpact.severity === 'moderate'
                      ? 'Delayed'
                      : 'Nominal'}
                  </div>
                </div>
                <div>
                  <div className="font-sans text-[10px] text-[#8B98A7]">Flights Affected</div>
                  <div className="text-[#E8EDF2] font-semibold">
                    {selectedAirportImpact.delayedFlights + selectedAirportImpact.cancelledFlights} /{' '}
                    {selectedAirportImpact.totalFlights}
                  </div>
                </div>
                <div>
                  <div className="font-sans text-[10px] text-[#8B98A7]">Rotation Effects</div>
                  <div className="text-[#E8EDF2]">
                    {selectedAirportRotationAffected} legs · {formatDuration(selectedAirportImpact.totalDelayMin)}
                  </div>
                </div>
                <div>
                  <div className="font-sans text-[10px] text-[#8B98A7]">Passengers</div>
                  <div className="text-[#F2A93B] font-semibold">
                    {selectedAirportImpact.affectedPassengers.toLocaleString()}
                    <span className="font-sans font-normal text-[#8B98A7] text-[10px]">
                      {' '}
                      ({selectedAirportConnectingPax} conn)
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFormAirport(selectedAirportMeta.code);
                  onApplyScenario({
                    id: `SCEN-${selectedAirportMeta.code}-${formType}-${formStartMin}-${formDurationMin}`,
                    airportCode: selectedAirportMeta.code,
                    type: formType,
                    startTimeMin: formStartMin,
                    durationMin: formDurationMin,
                  });
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border border-[#523B1B] bg-[#221A10] hover:bg-[#2E2214] text-xs font-medium text-[#F2A93B] transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Simulate at {selectedAirportMeta.code}</span>
              </button>

              <div className="divide-y divide-[#28313B] border border-[#28313B] rounded bg-[#10151B] max-h-32 overflow-y-auto">
                {selectedAirportFlights.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onSelectFlight(f.id)}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-[#151B22] text-[11px] flex items-center justify-between transition-colors"
                  >
                    <span className="font-mono text-[#E8EDF2]">
                      {f.flightNumber}{' '}
                      <span className="text-[#8B98A7]">
                        {f.origin}→{f.destination}
                      </span>
                    </span>
                    <span
                      className={`font-mono tabular-nums ${
                        f.status === 'cancelled'
                          ? 'text-[#E05D5D]'
                          : f.status === 'recovered'
                          ? 'text-[#75B798]'
                          : f.depDelayMin >= 15
                          ? 'text-[#F2A93B]'
                          : 'text-[#8B98A7]'
                      }`}
                    >
                      {f.status === 'cancelled'
                        ? 'CXL'
                        : f.depDelayMin >= 15
                        ? `+${f.depDelayMin}m`
                        : formatMinutesToHHMM(f.scheduledDepMin)}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : selectedStateName ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#5EC8D8]">
                    State Selection
                  </div>
                  <div className="text-sm font-semibold text-[#E8EDF2] mt-0.5">
                    {selectedStateName}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectState(null)}
                  className="p-1 rounded text-[#8B98A7] hover:text-[#E8EDF2]"
                  aria-label="Close state detail"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {stateAirports.length === 0 ? (
                <p className="text-xs text-[#8B98A7]">
                  No scheduled airports in {selectedStateName}.
                </p>
              ) : (
                <div className="divide-y divide-[#28313B] border border-[#28313B] rounded bg-[#10151B]">
                  {stateAirports.map((ap) => (
                    <button
                      key={ap.code}
                      type="button"
                      onClick={() => {
                        onSelectState(null);
                        onSelectAirport(ap.code);
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-[#151B22] flex items-center justify-between text-xs"
                    >
                      <span className="font-mono font-semibold text-[#E8EDF2]">
                        {ap.code} <span className="font-sans font-normal text-[#8B98A7]">{ap.city}</span>
                      </span>
                      <span className="font-mono text-[#8B98A7] tabular-nums">
                        {currentSimulation.airports[ap.code]?.totalFlights ?? 0} legs
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#8B98A7]">
                {scenario ? 'Highest Impact Stations' : 'Key Network Hubs'}
              </div>
              <div className="divide-y divide-[#28313B] border border-[#28313B] rounded bg-[#10151B]">
                {Object.values(currentSimulation.airports)
                  .sort((a, b) =>
                    scenario
                      ? b.totalDelayMin + b.cancelledFlights * 120 - (a.totalDelayMin + a.cancelledFlights * 120)
                      : Number(b.isHub) - Number(a.isHub) || b.totalFlights - a.totalFlights
                  )
                  .slice(0, 5)
                  .map((ap) => (
                    <button
                      key={ap.code}
                      type="button"
                      onClick={() => onSelectAirport(ap.code)}
                      className="w-full px-2.5 py-1.5 hover:bg-[#151B22] transition-colors flex items-center justify-between text-xs text-left"
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <MapPin
                          className={`h-3 w-3 shrink-0 ${
                            ap.isPrimaryDisrupted || ap.severity === 'severe'
                              ? 'text-[#E05D5D]'
                              : ap.severity === 'moderate'
                              ? 'text-[#F2A93B]'
                              : 'text-[#5EC8D8]'
                          }`}
                        />
                        <span className="font-mono font-semibold text-[#E8EDF2]">{ap.code}</span>
                        <span className="text-[#8B98A7] truncate">{ap.city}</span>
                      </span>
                      <span className="font-mono text-[11px] text-[#8B98A7] tabular-nums shrink-0">
                        {ap.totalDelayMin > 0
                          ? `${formatDuration(ap.totalDelayMin)}${ap.cancelledFlights > 0 ? ` · ${ap.cancelledFlights}cxl` : ''}`
                          : `${ap.totalFlights} legs`}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Active Disruption & Direct vs Secondary Impact Split */}
        {scenario && (
          <div className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#F2A93B]">
                Direct vs Secondary Impact
              </span>
              <button
                type="button"
                onClick={onOpenCascade}
                className="inline-flex items-center gap-1 text-[11px] text-[#5EC8D8] hover:underline"
              >
                <GitMerge className="h-3 w-3" />
                <span>Trace</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
              <div className="bg-[#10151B] border border-[#28313B] rounded p-2">
                <div className="font-sans text-[10px] text-[#8B98A7]">Direct Impact</div>
                <div className="text-[#F2A93B] font-semibold mt-0.5">
                  {impactSplit.direct.length} flights
                </div>
              </div>
              <div className="bg-[#10151B] border border-[#28313B] rounded p-2">
                <div className="font-sans text-[10px] text-[#8B98A7]">Secondary Cascade</div>
                <div className="text-[#D97D45] font-semibold mt-0.5">
                  {impactSplit.secondary.length} flights
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Active Disruption Brief (Deterministic + Optional Gemini AI) */}
        <div className="p-3.5">
          <UnderstandDisruptionPanel
            scenario={scenario}
            disruptedBaseline={disruptedBaseline}
            currentSimulation={currentSimulation}
            recommendations={recommendations}
            appliedActions={appliedActions}
            onOpenRecoveryLab={onOpenRecoveryLab}
            onSelectFlight={(fid) => onSelectFlight(fid)}
          />
        </div>

        {/* 5. Compact Incident List */}
        <div className="p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B98A7]">
              Compact Incident List
            </span>
            <span className="font-mono text-[10px] text-[#8B98A7] tabular-nums">
              {events.length} events
            </span>
          </div>
          {events.length === 0 ? (
            <div className="text-xs text-[#8B98A7] py-2">
              No active incidents. All flights nominal.
            </div>
          ) : (
            <div className="divide-y divide-[#28313B] border border-[#28313B] rounded bg-[#10151B] max-h-44 overflow-y-auto">
              {events.slice(0, 12).map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    if (ev.flightId) onSelectFlight(ev.flightId);
                    else onSelectAirport(ev.airportCode);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#151B22] transition-colors flex items-start gap-2 text-[11px]"
                >
                  <span className="font-mono text-[#8B98A7] tabular-nums shrink-0 flex items-center gap-1 mt-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatMinutesToHHMM(ev.timeMin)}
                  </span>
                  <span
                    className={`truncate ${
                      ev.severity === 'critical'
                        ? 'text-[#E05D5D]'
                        : ev.severity === 'recovered'
                        ? 'text-[#75B798]'
                        : 'text-[#E8EDF2]'
                    }`}
                  >
                    {ev.title}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
