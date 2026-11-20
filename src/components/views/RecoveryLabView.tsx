import React, { useMemo, useState } from 'react';
import {
  ComparisonMetrics,
  DisruptionScenario,
  EvaluatedRecoveryAction,
  RecoveryAction,
  RecoveryActionType,
  SimulationResult,
} from '../../types/aviation';
import { BeforeAfterComparisonPanel } from '../Charts';
import { HelpTooltip } from '../HelpTooltip';
import { formatDuration, formatMinutesToHHMM } from '../../utils/time';
import {
  CheckCircle2,
  Clock,
  Compass,
  Plane,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';

interface RecoveryLabViewProps {
  scenario: DisruptionScenario | null;
  disruptedBaseline: SimulationResult;
  recoveredSimulation: SimulationResult;
  comparison: ComparisonMetrics;
  recommendations: EvaluatedRecoveryAction[];
  appliedActions: RecoveryAction[];
  onApplyAction: (action: RecoveryAction) => void;
  onRemoveAction: (actionId: string) => void;
  onClearActions: () => void;
  onInspectFlightOnMap: (flightId: string) => void;
  onBackToAtlas: () => void;
}

const ACTION_META: Record<
  RecoveryActionType,
  { label: string; short: string; icon: React.ComponentType<{ className?: string }> }
> = {
  assign_spare: { label: 'Deploy Spare Aircraft', short: 'Spare', icon: Plane },
  swap_aircraft: { label: 'Swap Aircraft Tails', short: 'Tail Swap', icon: RefreshCw },
  prioritize_turnaround: { label: 'Express Turnaround', short: 'Fast Turn', icon: Clock },
  hold_for_connections: { label: 'Connection Hold', short: 'Conn Hold', icon: Users },
  cancel_flight: { label: 'Strategic Cancel', short: 'Cancel Turn', icon: XCircle },
};

export const RecoveryLabView: React.FC<RecoveryLabViewProps> = ({
  scenario,
  disruptedBaseline,
  recoveredSimulation,
  comparison,
  recommendations,
  appliedActions,
  onApplyAction,
  onRemoveAction,
  onClearActions,
  onInspectFlightOnMap,
  onBackToAtlas,
}) => {
  const [typeFilter, setTypeFilter] = useState<RecoveryActionType | 'all'>('all');

  const filteredRecs = useMemo(() => {
    if (typeFilter === 'all') return recommendations;
    return recommendations.filter((r) => r.type === typeFilter);
  }, [recommendations, typeFilter]);

  if (!scenario) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto bg-[#10151B]">
        <div className="max-w-lg w-full rounded-md border border-[#28313B] bg-[#151B22] p-8 text-center space-y-4">
          <Compass className="h-7 w-7 text-[#5EC8D8] mx-auto" />
          <div className="space-y-1.5">
            <h1 className="text-base font-semibold text-[#E8EDF2]">
              No Active Disruption Scenario
            </h1>
            <p className="text-xs sm:text-sm text-[#8B98A7] leading-relaxed">
              Run a disruption scenario on the India Network Map first. Domino Sky then evaluates feasible standby spares, tail swaps, turnaround compressions, and hub holds deterministically here.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToAtlas}
            className="px-4 py-2 rounded text-xs font-semibold text-[#0B0E12] bg-[#5EC8D8] hover:bg-[#76D4E2] transition-colors"
          >
            Open Network Map
          </button>
        </div>
      </div>
    );
  }

  const flightLookup = new Map(recoveredSimulation.flights.map((f) => [f.id, f]));

  return (
    <div className="flex-1 flex flex-col overflow-y-auto divide-y divide-[#28313B] bg-[#10151B]">
      {/* Header Strip */}
      <div className="px-5 py-3.5 bg-[#0B0E12] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#5EC8D8]">
            Recovery Decision Workspace
          </div>
          <h1 className="text-base font-semibold text-[#E8EDF2] mt-0.5">
            {scenario.airportCode}{' '}
            {scenario.type === 'closure'
              ? 'Airport Closure'
              : scenario.type === 'thunderstorm'
              ? 'Severe Weather Slowdown'
              : 'Runway Restriction'}{' '}
            <span className="font-mono font-normal text-xs text-[#8B98A7] ml-2 tabular-nums">
              {formatMinutesToHHMM(scenario.startTimeMin)} · {formatDuration(scenario.durationMin)}
            </span>
          </h1>
        </div>

        <button
          type="button"
          onClick={onBackToAtlas}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded text-xs font-medium text-[#E8EDF2] bg-[#151B22] hover:bg-[#1A222B] border border-[#28313B] transition-colors whitespace-nowrap shrink-0"
        >
          <Compass className="h-3.5 w-3.5 text-[#5EC8D8]" />
          <span>Inspect on Network Map</span>
        </button>
      </div>

      {/* Compact Before & After Comparison + Network Restoration Bar */}
      <div className="p-5 bg-[#10151B] space-y-5">
        <BeforeAfterComparisonPanel
          comparison={comparison}
          appliedActionsCount={appliedActions.length}
        />

        <div className="pt-3 border-t border-[#28313B] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 flex-1 min-w-[260px]">
            <span className="font-medium text-[#8B98A7] whitespace-nowrap inline-flex items-center gap-1.5">
              <span>Network Restoration Progress</span>
              <HelpTooltip
                label="How restoration is calculated"
                text="Calculated from the average percentage improvement across total delay minutes, affected passengers, cancelled flights, and missed connections relative to the unrecovered disruption."
              />
            </span>
            <div className="flex-1 h-2 rounded-full bg-[#1C232C] overflow-hidden max-w-md">
              <div
                className="h-full bg-[#75B798] transition-all duration-300"
                style={{ width: `${comparison.networkRecoveryPct}%` }}
              />
            </div>
            <span className="font-mono font-semibold text-[#75B798] tabular-nums">
              {comparison.networkRecoveryPct}%
            </span>
          </div>
          <div className="font-mono text-[11px] text-[#8B98A7] tabular-nums inline-flex items-center gap-1.5">
            <span>
              Aircraft Utilisation: {comparison.aircraftUtilisationBefore}% →{' '}
              <span className="text-[#E8EDF2] font-semibold">
                {comparison.aircraftUtilisationAfter}%
              </span>
            </span>
            <HelpTooltip
              label="Aircraft utilisation metric"
              text="Percentage of scheduled flight sectors actively flown without cancellation across the operating fleet."
            />
          </div>
        </div>
      </div>

      {/* Candidate Comparison Matrix Table */}
      {filteredRecs.length > 0 && (
        <div className="bg-[#10151B]">
          <div className="px-5 py-3 bg-[#0B0E12] border-b border-[#28313B] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold text-[#E8EDF2]">
                Recovery Options Comparison Matrix ({filteredRecs.length} Feasible Actions)
              </h2>
              <p className="text-[11px] text-[#8B98A7] mt-0.5">
                Every outcome is computed deterministically by executing the candidate decision against the current simulation state.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded border border-[#28313B] bg-[#151B22] p-0.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'assign_spare', label: 'Spares' },
                  { id: 'swap_aircraft', label: 'Tail Swap' },
                  { id: 'prioritize_turnaround', label: 'Fast Turn' },
                  { id: 'hold_for_connections', label: 'Conn Hold' },
                  { id: 'cancel_flight', label: 'Cancel Turn' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                    typeFilter === tab.id
                      ? 'bg-[#1D2834] text-[#5EC8D8]'
                      : 'text-[#8B98A7] hover:text-[#E8EDF2]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#151B22] border-b border-[#28313B] text-[#8B98A7]">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Decision Option</th>
                  <th className="px-3 py-2.5 font-medium">Station</th>
                  <th className="px-3 py-2.5 font-medium text-right">Delay Reduction</th>
                  <th className="px-3 py-2.5 font-medium text-right">Flights Affected</th>
                  <th className="px-3 py-2.5 font-medium text-right">Passenger Impact</th>
                  <th className="px-3 py-2.5 font-medium text-right">Cancellation Impact</th>
                  <th className="px-3 py-2.5 font-medium text-right">Health Gain</th>
                  <th className="px-5 py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#28313B]/70">
                {filteredRecs.map((rec) => {
                  const meta = ACTION_META[rec.type];
                  return (
                    <tr key={`row-${rec.id}`} className="hover:bg-[#151B22] transition-colors">
                      <td className="px-5 py-2.5">
                        <div className="font-medium text-[#E8EDF2]">{rec.title}</div>
                        <div className="text-[11px] text-[#8B98A7]">{meta.label}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[#8B98A7]">{rec.airportCode}</td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono font-semibold tabular-nums ${
                          rec.impact.delayMinutesSaved > 0
                            ? 'text-[#75B798]'
                            : rec.impact.delayMinutesSaved < 0
                            ? 'text-[#F2A93B]'
                            : 'text-[#8B98A7]'
                        }`}
                      >
                        {rec.impact.delayMinutesSaved >= 0
                          ? `-${rec.impact.delayMinutesSaved}m`
                          : `+${Math.abs(rec.impact.delayMinutesSaved)}m`}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[#E8EDF2] tabular-nums">
                        {rec.impact.delayedFlightsReduced >= 0
                          ? `-${rec.impact.delayedFlightsReduced} delayed`
                          : `+${Math.abs(rec.impact.delayedFlightsReduced)} delayed`}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[#5EC8D8] tabular-nums">
                        {rec.impact.affectedPassengersSaved} pax · +{rec.impact.missedConnectionsSaved} conn
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[#E8EDF2] tabular-nums">
                        {rec.impact.cancelledFlightsReduced >= 0
                          ? `-${rec.impact.cancelledFlightsReduced}`
                          : `+${Math.abs(rec.impact.cancelledFlightsReduced)}`}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#75B798] tabular-nums">
                        {rec.impact.networkHealthGainPct >= 0
                          ? `+${rec.impact.networkHealthGainPct}%`
                          : `${rec.impact.networkHealthGainPct}%`}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onApplyAction(rec)}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold text-[#0B0E12] bg-[#5EC8D8] hover:bg-[#76D4E2] transition-colors whitespace-nowrap"
                        >
                          Apply
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Decision Split: Detailed Mechanism & Tradeoffs (left) + Active Stack (right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#28313B]">
        <div className="lg:col-span-8 flex flex-col">
          <div className="px-5 py-3 bg-[#151B22] border-b border-[#28313B] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#E8EDF2]">
              Operational Trade-Offs &amp; Flight Linkage
            </span>
            <span className="font-mono text-[11px] text-[#8B98A7] tabular-nums">
              {filteredRecs.length} option{filteredRecs.length === 1 ? '' : 's'}
            </span>
          </div>

          {filteredRecs.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#8B98A7]">
              No remaining beneficial recovery decisions in this category.
            </div>
          ) : (
            <div className="divide-y divide-[#28313B]">
              {filteredRecs.map((rec, idx) => {
                const meta = ACTION_META[rec.type];
                const Icon = meta.icon;
                const primaryFlight = flightLookup.get(rec.targetFlightId);
                const secondaryFlight = rec.secondaryFlightId
                  ? flightLookup.get(rec.secondaryFlightId)
                  : undefined;

                return (
                  <div
                    key={rec.id}
                    className="p-5 hover:bg-[#151B22]/70 transition-colors space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                          <span className="text-[#5EC8D8]">{meta.label}</span>
                          <span className="text-[#28313B]">·</span>
                          <span className="text-[#8B98A7]">{rec.airportCode}</span>
                          {idx === 0 && typeFilter === 'all' && (
                            <>
                              <span className="text-[#28313B]">·</span>
                              <span className="text-[#F2A93B]">Highest Calculated Benefit</span>
                            </>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-[#E8EDF2]">{rec.title}</h3>
                        <p className="text-xs text-[#8B98A7]">{rec.subtitle}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onApplyAction(rec)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-semibold text-[#0B0E12] bg-[#5EC8D8] hover:bg-[#76D4E2] transition-colors whitespace-nowrap"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>Apply Decision</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-y border-[#28313B]/70 py-3">
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-medium text-[#8B98A7]">
                          Mechanism &amp; Affected Sectors
                        </div>
                        <p className="text-[#8B98A7] leading-relaxed">{rec.description}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {primaryFlight && (
                            <button
                              type="button"
                              onClick={() => onInspectFlightOnMap(primaryFlight.id)}
                              className="px-2 py-0.5 rounded border border-[#28313B] bg-[#151B22] hover:border-[#5EC8D8] font-mono text-[11px] text-[#E8EDF2] transition-colors"
                            >
                              {primaryFlight.flightNumber} ({primaryFlight.origin}→{primaryFlight.destination})
                            </button>
                          )}
                          {secondaryFlight && (
                            <button
                              type="button"
                              onClick={() => onInspectFlightOnMap(secondaryFlight.id)}
                              className="px-2 py-0.5 rounded border border-[#28313B] bg-[#151B22] hover:border-[#5EC8D8] font-mono text-[11px] text-[#E8EDF2] transition-colors"
                            >
                              {secondaryFlight.flightNumber} ({secondaryFlight.origin}→{secondaryFlight.destination})
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[11px] font-medium text-[#F2A93B]">
                          Operational Trade-Off
                        </div>
                        <p className="text-[#8B98A7] leading-relaxed">{rec.tradeoff}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Active Decision Stack (4 cols) */}
        <div className="lg:col-span-4 bg-[#151B22] flex flex-col divide-y divide-[#28313B]">
          <div className="px-5 py-3 flex items-center justify-between">
            <div className="text-xs font-semibold text-[#E8EDF2]">
              Active Recovery Stack ({appliedActions.length})
            </div>
            {appliedActions.length > 0 && (
              <button
                type="button"
                onClick={onClearActions}
                className="text-xs font-medium text-[#E05D5D] hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="p-5 space-y-3 flex-1">
            {appliedActions.length === 0 ? (
              <div className="py-8 text-center space-y-2 text-xs text-[#8B98A7]">
                <ShieldCheck className="h-6 w-6 text-[#5EC8D8] mx-auto opacity-75" />
                <p>
                  No recovery decisions applied yet. Select &ldquo;Apply&rdquo; on any evaluated action to update the live India schedule.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#28313B] border-y border-[#28313B]">
                {appliedActions.map((act) => (
                  <div
                    key={act.id}
                    className="py-3 flex items-start justify-between gap-2.5"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#75B798]">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{act.title}</span>
                      </div>
                      <div className="text-[11px] text-[#8B98A7]">{act.subtitle}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveAction(act.id)}
                      className="p-1 rounded text-[#8B98A7] hover:text-[#E05D5D] transition-colors shrink-0"
                      aria-label={`Remove ${act.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 space-y-2 text-xs font-mono tabular-nums bg-[#0B0E12]">
            <div className="font-sans text-xs font-medium text-[#8B98A7]">
              Unrecovered vs Active Schedule
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-[#8B98A7]">Total Delay</span>
              <span className="text-[#E8EDF2]">
                {disruptedBaseline.metrics.totalDelayMin}m →{' '}
                <span className="text-[#75B798] font-semibold">
                  {recoveredSimulation.metrics.totalDelayMin}m
                </span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-[#8B98A7]">Disrupted Pax</span>
              <span className="text-[#E8EDF2]">
                {disruptedBaseline.metrics.affectedPassengers.toLocaleString()} →{' '}
                <span className="text-[#75B798] font-semibold">
                  {recoveredSimulation.metrics.affectedPassengers.toLocaleString()}
                </span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-[#8B98A7]">Network Health</span>
              <span className="text-[#E8EDF2]">
                {disruptedBaseline.metrics.networkHealthPct}% →{' '}
                <span className="text-[#75B798] font-semibold">
                  {recoveredSimulation.metrics.networkHealthPct}%
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
