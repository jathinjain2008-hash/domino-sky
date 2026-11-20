import React from 'react';
import {
  AirportImpact,
  ComparisonMetrics,
  FlightSimState,
  SimulationMetrics,
} from '../types/aviation';
import { formatDuration } from '../utils/time';

export const NetworkHealthGauge: React.FC<{ healthPct: number }> = ({ healthPct }) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthPct / 100) * circumference;

  const color =
    healthPct >= 85
      ? '#75B798'
      : healthPct >= 60
      ? '#F2A93B'
      : '#E05D5D';

  const label =
    healthPct >= 85 ? 'Nominal' : healthPct >= 60 ? 'Strained' : 'Critical';

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-24 w-24 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 104 104" className="h-24 w-24 -rotate-90">
          <circle
            cx="52"
            cy="52"
            r={radius}
            fill="none"
            stroke="#1C232C"
            strokeWidth="7"
          />
          <circle
            cx="52"
            cy="52"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-lg font-semibold text-[#E8EDF2] tabular-nums">
            {healthPct}%
          </span>
          <span className="text-[11px] font-medium" style={{ color }}>
            {label}
          </span>
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <div className="text-[#E8EDF2] font-semibold">Network Health Index</div>
        <p className="text-[#8B98A7] leading-relaxed max-w-xs">
          Composite schedule score across on-time ratio, flight completion, cumulative delay hours, and hub connection integrity.
        </p>
      </div>
    </div>
  );
};

export const FlightStatusDistribution: React.FC<{
  metrics: SimulationMetrics;
  flights?: FlightSimState[];
}> = ({ metrics, flights }) => {
  const total = Math.max(1, metrics.totalFlights);
  const onTimeCount = flights
    ? flights.filter((f) => f.status === 'on_time').length
    : Math.max(0, metrics.totalFlights - metrics.delayedFlights - metrics.cancelledFlights - metrics.recoveredFlights);
  const delayedCount = flights
    ? flights.filter((f) => f.status === 'delayed').length
    : metrics.delayedFlights;
  const cancelledCount = flights
    ? flights.filter((f) => f.status === 'cancelled').length
    : metrics.cancelledFlights;
  const recoveredCount = flights
    ? flights.filter((f) => f.status === 'recovered').length
    : metrics.recoveredFlights;

  const segments = [
    { key: 'on_time', label: 'On Time', count: onTimeCount, color: 'bg-[#5EC8D8]', text: 'text-[#5EC8D8]' },
    { key: 'delayed', label: 'Delayed', count: delayedCount, color: 'bg-[#F2A93B]', text: 'text-[#F2A93B]' },
    { key: 'cancelled', label: 'Cancelled', count: cancelledCount, color: 'bg-[#E05D5D]', text: 'text-[#E05D5D]' },
    { key: 'recovered', label: 'Recovered', count: recoveredCount, color: 'bg-[#75B798]', text: 'text-[#75B798]' },
  ];

  const sum = Math.max(1, segments.reduce((s, seg) => s + seg.count, 0));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[#E8EDF2]">Flight Status Distribution</span>
        <span className="font-mono text-[#8B98A7] tabular-nums">{total} Flights</span>
      </div>

      <div className="h-2.5 w-full rounded-sm bg-[#1C232C] overflow-hidden flex">
        {segments.map((seg) =>
          seg.count > 0 ? (
            <div
              key={seg.key}
              style={{ width: `${(seg.count / sum) * 100}%` }}
              className={`${seg.color} transition-all duration-300`}
              title={`${seg.label}: ${seg.count}`}
            />
          ) : null
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-[#8B98A7]">
              <span className={`h-2 w-2 rounded-xs ${seg.color}`} />
              <span>{seg.label}</span>
            </span>
            <span className={`font-mono font-semibold tabular-nums ${seg.text}`}>
              {seg.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DelaySeverityBreakdown: React.FC<{ flights: FlightSimState[] }> = ({
  flights,
}) => {
  const delayOf = (f: FlightSimState) => Math.max(f.depDelayMin, f.arrDelayMin);
  const buckets = [
    {
      label: 'On Time (0–14m)',
      count: flights.filter((f) => f.status !== 'cancelled' && delayOf(f) < 15).length,
      color: 'bg-[#5EC8D8]',
    },
    {
      label: 'Minor (15–44m)',
      count: flights.filter((f) => f.status !== 'cancelled' && delayOf(f) >= 15 && delayOf(f) < 45).length,
      color: 'bg-[#7A9BB8]',
    },
    {
      label: 'Moderate (45–89m)',
      count: flights.filter((f) => f.status !== 'cancelled' && delayOf(f) >= 45 && delayOf(f) < 90).length,
      color: 'bg-[#F2A93B]',
    },
    {
      label: 'Severe (90m+)',
      count: flights.filter((f) => f.status !== 'cancelled' && delayOf(f) >= 90).length,
      color: 'bg-[#D97D45]',
    },
    {
      label: 'Cancelled',
      count: flights.filter((f) => f.status === 'cancelled').length,
      color: 'bg-[#E05D5D]',
    },
  ];

  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[#E8EDF2]">Delay Severity Breakdown</span>
        <span className="text-[#8B98A7]">Peak delay band</span>
      </div>
      <div className="space-y-2.5">
        {buckets.map((b) => (
          <div key={b.label} className="grid grid-cols-12 items-center gap-3 text-xs">
            <div className="col-span-5 text-[#8B98A7] truncate">{b.label}</div>
            <div className="col-span-5 h-1.5 rounded-full bg-[#1C232C] overflow-hidden">
              <div
                className={`h-full ${b.color} transition-all duration-300`}
                style={{ width: `${(b.count / maxCount) * 100}%` }}
              />
            </div>
            <div className="col-span-2 text-right font-mono font-semibold text-[#E8EDF2] tabular-nums">
              {b.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AirportDisruptionBars: React.FC<{
  airports: Record<string, AirportImpact>;
  onSelectAirport?: (code: string) => void;
}> = ({ airports, onSelectAirport }) => {
  const list = Object.values(airports)
    .sort((a, b) => b.totalDelayMin + b.cancelledFlights * 120 - (a.totalDelayMin + a.cancelledFlights * 120))
    .slice(0, 8);

  const maxScore = Math.max(
    1,
    ...list.map((a) => a.totalDelayMin + a.cancelledFlights * 120)
  );

  const anyImpact = list.some((a) => a.totalDelayMin > 0 || a.cancelledFlights > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[#E8EDF2]">Station Impact Distribution</span>
        <span className="text-[#8B98A7]">Delay &amp; cancellations</span>
      </div>
      {!anyImpact ? (
        <div className="py-6 text-xs text-[#8B98A7]">
          All {Object.keys(airports).length} stations nominal with 0 delay minutes.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((ap) => {
            const score = ap.totalDelayMin + ap.cancelledFlights * 120;
            const barColor =
              ap.severity === 'severe'
                ? 'bg-[#E05D5D]'
                : ap.severity === 'moderate'
                ? 'bg-[#F2A93B]'
                : 'bg-[#5EC8D8]';
            return (
              <button
                key={ap.code}
                type="button"
                onClick={() => onSelectAirport?.(ap.code)}
                className="w-full grid grid-cols-12 items-center gap-3 text-xs py-1 rounded hover:bg-[#1A222B] px-1.5 -mx-1.5 transition-colors text-left"
              >
                <div className="col-span-3 flex items-center gap-1.5 font-mono font-semibold text-[#E8EDF2]">
                  <span>{ap.code}</span>
                  {ap.isPrimaryDisrupted && (
                    <span className="text-[10px] font-sans text-[#E05D5D]">(Source)</span>
                  )}
                </div>
                <div className="col-span-5 h-1.5 rounded-full bg-[#1C232C] overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all duration-300`}
                    style={{ width: `${(score / maxScore) * 100}%` }}
                  />
                </div>
                <div className="col-span-4 text-right font-mono text-[#8B98A7] tabular-nums">
                  {formatDuration(ap.totalDelayMin)}
                  {ap.cancelledFlights > 0 ? ` · ${ap.cancelledFlights}cxl` : ''}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const BeforeAfterComparisonPanel: React.FC<{
  comparison: ComparisonMetrics;
  appliedActionsCount: number;
}> = ({ comparison, appliedActionsCount }) => {
  const rows = [
    {
      label: 'Total Delay',
      before: comparison.totalDelayMinBefore,
      after: comparison.totalDelayMinAfter,
      unit: 'm',
      lowerIsBetter: true,
    },
    {
      label: 'Delayed Flights',
      before: comparison.delayedFlightsBefore,
      after: comparison.delayedFlightsAfter,
      unit: '',
      lowerIsBetter: true,
    },
    {
      label: 'Cancelled Flights',
      before: comparison.cancelledFlightsBefore,
      after: comparison.cancelledFlightsAfter,
      unit: '',
      lowerIsBetter: true,
    },
    {
      label: 'Affected Pax',
      before: comparison.affectedPassengersBefore,
      after: comparison.affectedPassengersAfter,
      unit: '',
      lowerIsBetter: true,
    },
    {
      label: 'Missed Conn',
      before: comparison.missedConnectionsBefore,
      after: comparison.missedConnectionsAfter,
      unit: ' pax',
      lowerIsBetter: true,
    },
    {
      label: 'Utilisation',
      before: comparison.aircraftUtilisationBefore,
      after: comparison.aircraftUtilisationAfter,
      unit: '%',
      lowerIsBetter: false,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[#28313B] pb-3">
        <div>
          <div className="text-xs font-semibold text-[#E8EDF2]">
            Before &amp; After Recovery Delta
          </div>
          <p className="text-xs text-[#8B98A7] mt-0.5">
            {appliedActionsCount > 0
              ? `Unrecovered baseline vs ${appliedActionsCount} active recovery decision(s)`
              : 'Apply any decision below to measure schedule improvement'}
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono tabular-nums">
          <div>
            <span className="font-sans text-[#8B98A7] mr-2">Recovered</span>
            <span className="text-base font-semibold text-[#75B798]">
              {comparison.networkRecoveryPct}%
            </span>
          </div>
          <div>
            <span className="font-sans text-[#8B98A7] mr-2">Health</span>
            <span className="text-[#8B98A7]">
              {comparison.networkHealthBefore}% →{' '}
              <span className="text-[#75B798] font-semibold">
                {comparison.networkHealthAfter}%
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#28313B]">
        {rows.map((r) => {
          const improvement = r.lowerIsBetter ? r.before - r.after : r.after - r.before;
          const maxVal = Math.max(1, r.before, r.after);
          const beforePct = (r.before / maxVal) * 100;
          const afterPct = (r.after / maxVal) * 100;

          return (
            <div key={r.label} className="pt-2 sm:pt-0 sm:pl-4 first:pl-0 space-y-2">
              <div className="text-[11px] font-medium text-[#8B98A7]">{r.label}</div>
              <div className="flex items-baseline justify-between font-mono tabular-nums">
                <span className="text-xs text-[#647282] line-through">
                  {r.before}
                  {r.unit}
                </span>
                <span className="text-base font-semibold text-[#E8EDF2]">
                  {r.after}
                  {r.unit}
                </span>
              </div>

              <div className="space-y-1">
                <div className="h-1 w-full bg-[#1C232C] overflow-hidden">
                  <div className="h-full bg-[#F2A93B]/75" style={{ width: `${beforePct}%` }} />
                </div>
                <div className="h-1 w-full bg-[#1C232C] overflow-hidden">
                  <div
                    className="h-full bg-[#75B798] transition-all duration-300"
                    style={{ width: `${afterPct}%` }}
                  />
                </div>
              </div>

              <div
                className={`text-[11px] font-mono tabular-nums ${
                  improvement > 0
                    ? 'text-[#75B798]'
                    : improvement < 0
                    ? 'text-[#E05D5D]'
                    : 'text-[#647282]'
                }`}
              >
                {improvement > 0
                  ? r.lowerIsBetter
                    ? `-${improvement}${r.unit}`
                    : `+${improvement}${r.unit}`
                  : improvement < 0
                  ? r.lowerIsBetter
                    ? `+${Math.abs(improvement)}${r.unit}`
                    : `-${Math.abs(improvement)}${r.unit}`
                  : 'No delta'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
