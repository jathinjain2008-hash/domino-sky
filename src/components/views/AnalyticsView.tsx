import React from 'react';
import {
  AirlineDataset,
  ComparisonMetrics,
  DisruptionScenario,
  RecoveryAction,
  SimulationResult,
} from '../../types/aviation';
import { formatDuration } from '../../utils/time';
import {
  AirportDisruptionBars,
  BeforeAfterComparisonPanel,
  DelaySeverityBreakdown,
  FlightStatusDistribution,
  NetworkHealthGauge,
} from '../Charts';
import { Database } from 'lucide-react';

interface AnalyticsViewProps {
  dataset: AirlineDataset;
  scenario: DisruptionScenario | null;
  simulation: SimulationResult;
  comparison: ComparisonMetrics;
  appliedActions: RecoveryAction[];
  onSelectAirport: (code: string) => void;
  onOpenDatasetModal: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  dataset,
  scenario,
  simulation,
  comparison,
  appliedActions,
  onSelectAirport,
  onOpenDatasetModal,
}) => {
  const airportRows = Object.values(simulation.airports).sort(
    (a, b) => b.totalDelayMin - a.totalDelayMin || b.totalFlights - a.totalFlights
  );

  return (
    <div className="flex-1 flex flex-col overflow-y-auto divide-y divide-[#28313B] bg-[#10151B]">
      {/* Console Header */}
      <div className="px-5 py-3.5 bg-[#0B0E12] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#5EC8D8]">
            Before/After &amp; Station Reports
          </div>
          <h1 className="text-base font-semibold text-[#E8EDF2] mt-0.5">
            Station Performance &amp; Fleet Roster
          </h1>
        </div>

        <button
          type="button"
          onClick={onOpenDatasetModal}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded text-xs font-medium text-[#E8EDF2] bg-[#151B22] hover:bg-[#1A222B] border border-[#28313B] transition-colors whitespace-nowrap shrink-0"
        >
          <Database className="h-3.5 w-3.5 text-[#5EC8D8]" />
          <span>Inspect / Import Official Dataset</span>
        </button>
      </div>

      {/* Before & After Comparison Strip when scenario active */}
      {scenario && (
        <div className="p-5 bg-[#10151B]">
          <BeforeAfterComparisonPanel
            comparison={comparison}
            appliedActionsCount={appliedActions.length}
          />
        </div>
      )}

      {/* Health + Status + Delay Severity + Airport Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#28313B] bg-[#10151B]">
        <div className="lg:col-span-6 p-5 divide-y divide-[#28313B]">
          <div className="pb-5">
            <NetworkHealthGauge healthPct={simulation.metrics.networkHealthPct} />
          </div>
          <div className="py-5">
            <FlightStatusDistribution metrics={simulation.metrics} flights={simulation.flights} />
          </div>
          <div className="pt-5">
            <DelaySeverityBreakdown flights={simulation.flights} />
          </div>
        </div>

        <div className="lg:col-span-6 p-5 bg-[#151B22]/50">
          <AirportDisruptionBars
            airports={simulation.airports}
            onSelectAirport={onSelectAirport}
          />
        </div>
      </div>

      {/* All Airports Operations Ledger */}
      <div className="bg-[#10151B]">
        <div className="px-5 py-3.5 border-b border-[#28313B] bg-[#0B0E12] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#E8EDF2]">
              Indian Station Performance Breakdown ({airportRows.length} Airports)
            </h2>
            <p className="text-xs text-[#8B98A7] mt-0.5">
              Select any station row to inspect its corridors and departures on the India Network Map.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#151B22] border-b border-[#28313B] text-[#8B98A7]">
              <tr>
                <th className="px-5 py-2.5 font-medium">Station</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium text-right">Flights</th>
                <th className="px-4 py-2.5 font-medium text-right">On Time</th>
                <th className="px-4 py-2.5 font-medium text-right">Delayed</th>
                <th className="px-4 py-2.5 font-medium text-right">Cancelled</th>
                <th className="px-4 py-2.5 font-medium text-right">Recovered</th>
                <th className="px-4 py-2.5 font-medium text-right">Outgoing Delay</th>
                <th className="px-5 py-2.5 font-medium text-right">Affected Pax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#28313B]/70">
              {airportRows.map((ap) => (
                <tr
                  key={ap.code}
                  onClick={() => onSelectAirport(ap.code)}
                  className="hover:bg-[#151B22] cursor-pointer transition-colors"
                >
                  <td className="px-5 py-2.5">
                    <span className="font-mono font-semibold text-[#E8EDF2]">{ap.code}</span>
                    <span className="ml-2 text-[#8B98A7]">{ap.city}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[#8B98A7]">
                    {ap.isHub ? 'Hub' : 'Spoke'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[#E8EDF2] tabular-nums">
                    {ap.totalFlights}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[#E8EDF2] tabular-nums">
                    {ap.onTimeFlights}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono font-semibold tabular-nums ${
                      ap.delayedFlights > 0 ? 'text-[#F2A93B]' : 'text-[#647282]'
                    }`}
                  >
                    {ap.delayedFlights}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono font-semibold tabular-nums ${
                      ap.cancelledFlights > 0 ? 'text-[#E05D5D]' : 'text-[#647282]'
                    }`}
                  >
                    {ap.cancelledFlights}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono font-semibold tabular-nums ${
                      ap.recoveredFlights > 0 ? 'text-[#75B798]' : 'text-[#647282]'
                    }`}
                  >
                    {ap.recoveredFlights}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[#E8EDF2] tabular-nums">
                    {formatDuration(ap.totalDelayMin)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-[#E8EDF2] tabular-nums">
                    {ap.affectedPassengers.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fleet & Standby Spare Inventory + Dataset Architecture Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#28313B] bg-[#10151B]">
        <div className="lg:col-span-8">
          <div className="px-5 py-3.5 border-b border-[#28313B] bg-[#0B0E12]">
            <h2 className="text-sm font-semibold text-[#E8EDF2]">
              Fleet &amp; Standby Spare Roster ({dataset.aircraft.length} Aircraft)
            </h2>
          </div>
          <div className="overflow-x-auto max-h-[320px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#151B22] border-b border-[#28313B] text-[#8B98A7]">
                <tr>
                  <th className="px-5 py-2.5 font-medium">ID</th>
                  <th className="px-4 py-2.5 font-medium">Tail</th>
                  <th className="px-4 py-2.5 font-medium">Airframe</th>
                  <th className="px-4 py-2.5 font-medium">Base</th>
                  <th className="px-4 py-2.5 font-medium text-right">Seats</th>
                  <th className="px-4 py-2.5 font-medium text-right">Min Turn</th>
                  <th className="px-5 py-2.5 font-medium">Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#28313B]/70">
                {dataset.aircraft.map((ac) => {
                  const assignedLegs = simulation.flights.filter(
                    (f) => f.effectiveAircraftId === ac.id
                  ).length;
                  return (
                    <tr key={ac.id} className="hover:bg-[#151B22] transition-colors">
                      <td className="px-5 py-2 font-mono font-semibold text-[#E8EDF2]">{ac.id}</td>
                      <td className="px-4 py-2 font-mono text-[#8B98A7]">{ac.tailNumber}</td>
                      <td className="px-4 py-2 text-[#8B98A7]">{ac.model}</td>
                      <td className="px-4 py-2 font-mono text-[#E8EDF2]">{ac.baseAirport}</td>
                      <td className="px-4 py-2 text-right font-mono text-[#E8EDF2] tabular-nums">
                        {ac.capacity}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[#8B98A7] tabular-nums">
                        {ac.minTurnaroundMin}m
                      </td>
                      <td className="px-5 py-2">
                        {ac.isSpare ? (
                          assignedLegs > 0 ? (
                            <span className="text-[#75B798] font-semibold">
                              Spare Deployed ({assignedLegs} legs)
                            </span>
                          ) : (
                            <span className="text-[#5EC8D8] font-medium">Standby Spare</span>
                          )
                        ) : (
                          <span className="text-[#8B98A7]">Active ({assignedLegs} legs)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 p-5 bg-[#151B22] flex flex-col justify-between space-y-5">
          <div className="space-y-2.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#5EC8D8]">
              {dataset.metadata.isDemo ? 'Demo Data Active' : 'Official Dataset Active'}
            </div>
            <h3 className="text-sm font-semibold text-[#E8EDF2]">
              {dataset.metadata.label}
            </h3>
            <p className="text-xs text-[#8B98A7] leading-relaxed">
              {dataset.metadata.notes}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenDatasetModal}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded text-xs font-medium text-[#E8EDF2] bg-[#10151B] hover:bg-[#1A222B] border border-[#28313B] transition-colors"
          >
            <Database className="h-3.5 w-3.5 text-[#5EC8D8]" />
            <span>Inspect / Import Official Dataset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
