import React, { useEffect, useState } from 'react';
import {
  DisruptionScenario,
  EvaluatedRecoveryAction,
  RecoveryAction,
  SimulationResult,
} from '../types/aviation';
import { buildRuleBasedDispatchBrief } from '../engine/recoveryEngine';
import { formatDuration, formatMinutesToHHMM } from '../utils/time';
import { ArrowRight, Info, Sparkles } from 'lucide-react';

interface UnderstandDisruptionPanelProps {
  scenario: DisruptionScenario | null;
  disruptedBaseline: SimulationResult;
  currentSimulation: SimulationResult;
  recommendations: EvaluatedRecoveryAction[];
  appliedActions: RecoveryAction[];
  onOpenRecoveryLab: () => void;
  onSelectFlight: (flightId: string) => void;
}

interface AiBrief {
  situationSummary: string;
  propagationAnalysis: string;
  recommendedStrategy: string;
  tradeoffNotes: string;
}

export const UnderstandDisruptionPanel: React.FC<UnderstandDisruptionPanelProps> = ({
  scenario,
  disruptedBaseline,
  currentSimulation,
  recommendations,
  appliedActions,
  onOpenRecoveryLab,
  onSelectFlight,
}) => {
  const [aiBrief, setAiBrief] = useState<AiBrief | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setAiBrief(null);
    setAiError(null);
  }, [
    scenario?.id,
    scenario?.airportCode,
    scenario?.type,
    scenario?.durationMin,
    scenario?.startTimeMin,
    appliedActions.length,
  ]);

  if (!scenario) {
    return (
      <div className="space-y-1.5 text-xs">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#5EC8D8]">
          Active Disruption
        </div>
        <p className="text-[#8B98A7] leading-relaxed">
          All {currentSimulation.metrics.totalFlights} scheduled Indian domestic sectors are operating nominally. Select an airport or run a simulation to analyze propagation.
        </p>
      </div>
    );
  }

  const ruleBrief = buildRuleBasedDispatchBrief(
    scenario,
    disruptedBaseline,
    currentSimulation,
    recommendations,
    appliedActions
  );

  const affectedFlights = currentSimulation.flights
    .filter((f) => f.status === 'delayed' || f.status === 'cancelled' || f.status === 'recovered')
    .sort((a, b) => Math.max(b.depDelayMin, b.arrDelayMin) - Math.max(a.depDelayMin, a.arrDelayMin))
    .slice(0, 5);

  const handleGenerateAiBrief = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch('/api/ai/dispatch-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          disruptedMetrics: disruptedBaseline.metrics,
          recoveredMetrics: currentSimulation.metrics,
          topDelayedFlights: affectedFlights.map((f) => ({
            flightNumber: f.flightNumber,
            origin: f.origin,
            destination: f.destination,
            status: f.status,
            depDelayMin: f.depDelayMin,
            arrDelayMin: f.arrDelayMin,
            passengerCount: f.passengerCount,
            cause: f.delayCause,
          })),
          topMissedConnections: currentSimulation.connections
            .filter((c) => c.status === 'missed')
            .slice(0, 6)
            .map((c) => ({
              airport: c.connection.airportCode,
              from: c.fromFlightNumber,
              to: c.toFlightNumber,
              passengers: c.affectedPassengers,
              availableMin: c.availableConnectMin,
              requiredMct: c.requiredConnectMin,
            })),
          recommendations,
          appliedActions,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.brief) {
        setAiError(data?.message ?? 'AI summary unavailable; showing deterministic brief.');
      } else {
        setAiBrief(data.brief as AiBrief);
      }
    } catch {
      setAiError('Unable to reach AI brief endpoint; deterministic analysis active.');
    } finally {
      setAiLoading(false);
    }
  };

  const activeText = aiBrief ?? ruleBrief;

  return (
    <div className="space-y-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#F2A93B]">
          {aiBrief ? 'Active Disruption · Gemini AI' : 'Active Disruption'}
        </div>
        <button
          type="button"
          disabled={aiLoading}
          onClick={aiBrief ? () => setAiBrief(null) : handleGenerateAiBrief}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5EC8D8] hover:text-[#E8EDF2] disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <Sparkles className="h-3 w-3" />
          <span>{aiLoading ? 'Synthesizing...' : aiBrief ? 'Rule-Based' : 'AI Brief'}</span>
        </button>
      </div>

      {aiError && (
        <div className="flex items-start gap-1.5 text-[11px] text-[#F2A93B]">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{aiError}</span>
        </div>
      )}

      <div className="space-y-2 text-[11px] text-[#8B98A7] leading-relaxed">
        <div>
          <span className="font-semibold text-[#E8EDF2]">Event: </span>
          {scenario.airportCode}{' '}
          {scenario.type === 'closure'
            ? 'Closure'
            : scenario.type === 'thunderstorm'
            ? 'Severe Weather'
            : 'Runway Cap'}{' '}
          ({formatMinutesToHHMM(scenario.startTimeMin)}, {formatDuration(scenario.durationMin)}).{' '}
          {activeText.situationSummary}
        </div>
        <div>
          <span className="font-semibold text-[#E8EDF2]">Cascade: </span>
          {activeText.propagationAnalysis}
        </div>
        <div>
          <span className="font-semibold text-[#E8EDF2]">Recovery: </span>
          {activeText.recommendedStrategy}
        </div>
      </div>

      {affectedFlights.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {affectedFlights.slice(0, 4).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFlight(f.id)}
              className="px-2 py-0.5 rounded border border-[#28313B] bg-[#10151B] hover:border-[#5EC8D8] font-mono text-[10px] text-[#E8EDF2] transition-colors"
            >
              {f.flightNumber} ({f.status === 'cancelled' ? 'CXL' : `+${f.depDelayMin}m`})
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onOpenRecoveryLab}
        className="w-full flex items-center justify-between px-3 py-1.5 rounded border border-[#28313B] bg-[#10151B] hover:border-[#5EC8D8] text-xs font-medium text-[#E8EDF2] transition-colors"
      >
        <span>Evaluate {recommendations.length} Recovery Actions</span>
        <ArrowRight className="h-3.5 w-3.5 text-[#5EC8D8]" />
      </button>
    </div>
  );
};
