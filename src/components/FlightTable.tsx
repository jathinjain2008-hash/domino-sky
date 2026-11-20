import React, { useMemo, useState } from 'react';
import { Airport, FlightSimState, FlightStatus } from '../types/aviation';
import { formatMinutesToHHMM } from '../utils/time';
import { AlertTriangle, ArrowDownUp, CheckCircle2, Search, ShieldCheck, X, XCircle } from 'lucide-react';

interface FlightTableProps {
  flights: FlightSimState[];
  airports: Airport[];
  selectedFlightId: string | null;
  onSelectFlight: (flightId: string | null) => void;
  initialAirportFilter?: string;
}

type SortKey =
  | 'flightNumber'
  | 'origin'
  | 'destination'
  | 'scheduledDepMin'
  | 'scheduledArrMin'
  | 'effectiveAircraftId'
  | 'status'
  | 'depDelayMin'
  | 'arrDelayMin'
  | 'passengerCount';

const STATUS_LABELS: Record<
  FlightStatus,
  { label: string; colorClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  on_time: { label: 'On Time', colorClass: 'text-[#5EC8D8]', icon: CheckCircle2 },
  delayed: { label: 'Delayed', colorClass: 'text-[#F2A93B]', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', colorClass: 'text-[#E05D5D]', icon: XCircle },
  recovered: { label: 'Recovered', colorClass: 'text-[#75B798]', icon: ShieldCheck },
};

export const FlightTable: React.FC<FlightTableProps> = ({
  flights,
  airports,
  selectedFlightId,
  onSelectFlight,
  initialAirportFilter = 'ALL',
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FlightStatus | 'ALL'>('ALL');
  const [airportFilter, setAirportFilter] = useState<string>(initialAirportFilter);
  const [sortKey, setSortKey] = useState<SortKey>('scheduledDepMin');
  const [sortAsc, setSortAsc] = useState(true);

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = flights.filter((f) => {
      if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
      if (airportFilter !== 'ALL' && f.origin !== airportFilter && f.destination !== airportFilter) {
        return false;
      }
      if (q) {
        const hay = `${f.flightNumber} ${f.origin} ${f.destination} ${f.effectiveAircraftId} ${f.delayCause ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      let cmp = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB));
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [flights, search, statusFilter, airportFilter, sortKey, sortAsc]);

  const selectedFlight = useMemo(
    () => flights.find((f) => f.id === selectedFlightId) ?? null,
    [flights, selectedFlightId]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const renderSortHeader = (label: string, key: SortKey, alignRight = false) => (
    <th className={`px-3.5 py-2.5 text-xs font-medium text-[#8B98A7] whitespace-nowrap ${alignRight ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => handleSort(key)}
        className={`inline-flex items-center gap-1 hover:text-[#E8EDF2] transition-colors ${
          sortKey === key ? 'text-[#5EC8D8]' : ''
        }`}
      >
        <span>{label}</span>
        <ArrowDownUp className="h-3 w-3 opacity-60" />
      </button>
    </th>
  );

  return (
    <div className="rounded border border-[#28313B] bg-[#151B22] overflow-hidden">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-b border-[#28313B] bg-[#0B0E12]">
        <div>
          <h2 className="text-sm font-semibold text-[#E8EDF2]">
            Flight Schedule &amp; Delay Ledger
          </h2>
          <p className="text-xs text-[#8B98A7] mt-0.5">
            {filteredAndSorted.length} of {flights.length} sectors · Select a row to highlight on the India Map
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-[#8B98A7] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flight, IATA, tail..."
              className="pl-8 pr-3 py-1.5 w-48 rounded bg-[#151B22] border border-[#28313B] text-xs text-[#E8EDF2] placeholder:text-[#647282] focus:outline-none focus:border-[#5EC8D8]"
            />
          </div>

          <select
            value={airportFilter}
            onChange={(e) => setAirportFilter(e.target.value)}
            aria-label="Filter by airport"
            className="px-2.5 py-1.5 rounded bg-[#151B22] border border-[#28313B] text-xs text-[#E8EDF2] focus:outline-none focus:border-[#5EC8D8]"
          >
            <option value="ALL">All Airports ({airports.length})</option>
            {airports.map((ap) => (
              <option key={ap.code} value={ap.code}>
                {ap.code} — {ap.city}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-0.5 p-0.5 rounded bg-[#151B22] border border-[#28313B]">
            {(['ALL', 'on_time', 'delayed', 'cancelled', 'recovered'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-[#1D2834] text-[#5EC8D8]'
                    : 'text-[#8B98A7] hover:text-[#E8EDF2]'
                }`}
              >
                {st === 'ALL' ? 'All' : STATUS_LABELS[st].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedFlight && (
        <div className="px-5 py-3 bg-[#101A22] border-b border-[#28313B] flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-mono font-semibold text-[#5EC8D8] text-sm">
                {selectedFlight.flightNumber}
              </span>
              <span className="text-[#E8EDF2]">
                {selectedFlight.origin} → {selectedFlight.destination}
              </span>
              <span className="text-[#28313B]">·</span>
              <span className="font-mono text-[#8B98A7]">
                Aircraft {selectedFlight.effectiveAircraftId} (Leg {selectedFlight.rotationOrder})
              </span>
              <span className="text-[#28313B]">·</span>
              <span className={STATUS_LABELS[selectedFlight.status].colorClass + ' font-semibold'}>
                {STATUS_LABELS[selectedFlight.status].label}
              </span>
            </div>
            <p className="text-xs text-[#8B98A7]">
              {selectedFlight.delayCause
                ? selectedFlight.delayCause
                : 'Operating within scheduled block and turnaround margins.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectFlight(null)}
            className="flex items-center gap-1 text-xs text-[#8B98A7] hover:text-[#E8EDF2]"
          >
            <X className="h-3.5 w-3.5" />
            <span>Close</span>
          </button>
        </div>
      )}

      <div className="overflow-x-auto max-h-[460px]">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#0B0E12] border-b border-[#28313B]">
            <tr>
              {renderSortHeader('Flight', 'flightNumber')}
              {renderSortHeader('Origin', 'origin')}
              {renderSortHeader('Dest', 'destination')}
              {renderSortHeader('Sched Dep', 'scheduledDepMin')}
              {renderSortHeader('Sched Arr', 'scheduledArrMin')}
              {renderSortHeader('Aircraft', 'effectiveAircraftId')}
              {renderSortHeader('Status', 'status')}
              {renderSortHeader('Dep Delay', 'depDelayMin', true)}
              {renderSortHeader('Arr Delay', 'arrDelayMin', true)}
              {renderSortHeader('Passengers', 'passengerCount', true)}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#28313B]/70 text-xs">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-[#8B98A7]">
                  No flights match the current search or filter criteria.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((f) => {
                const isSelected = f.id === selectedFlightId;
                const statusMeta = STATUS_LABELS[f.status];
                return (
                  <tr
                    key={f.id}
                    onClick={() => onSelectFlight(isSelected ? null : f.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#1D2834]' : 'hover:bg-[#1A222B]'
                    }`}
                  >
                    <td className="px-3.5 py-2 font-mono font-semibold text-[#E8EDF2] whitespace-nowrap">
                      {f.flightNumber}
                    </td>
                    <td className="px-3.5 py-2 font-mono text-[#8B98A7]">{f.origin}</td>
                    <td className="px-3.5 py-2 font-mono text-[#8B98A7]">{f.destination}</td>
                    <td className="px-3.5 py-2 font-mono text-[#8B98A7] tabular-nums">
                      {formatMinutesToHHMM(f.scheduledDepMin)}
                    </td>
                    <td className="px-3.5 py-2 font-mono text-[#8B98A7] tabular-nums">
                      {formatMinutesToHHMM(f.scheduledArrMin)}
                    </td>
                    <td className="px-3.5 py-2 font-mono text-[#8B98A7] whitespace-nowrap">
                      {f.effectiveAircraftId}
                      {f.effectiveAircraftId !== f.aircraftId && (
                        <span className="ml-1.5 text-[#5EC8D8] text-xs">(swapped)</span>
                      )}
                    </td>
                    <td className={`px-3.5 py-2 font-medium whitespace-nowrap ${statusMeta.colorClass}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <statusMeta.icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{statusMeta.label}</span>
                      </span>
                    </td>
                    <td
                      className={`px-3.5 py-2 text-right font-mono tabular-nums ${
                        f.depDelayMin >= 60
                          ? 'text-[#E05D5D] font-semibold'
                          : f.depDelayMin >= 15
                          ? 'text-[#F2A93B]'
                          : 'text-[#647282]'
                      }`}
                    >
                      {f.status === 'cancelled' ? '—' : f.depDelayMin > 0 ? `+${f.depDelayMin}m` : '0m'}
                    </td>
                    <td
                      className={`px-3.5 py-2 text-right font-mono tabular-nums ${
                        f.arrDelayMin >= 60
                          ? 'text-[#E05D5D] font-semibold'
                          : f.arrDelayMin >= 15
                          ? 'text-[#F2A93B]'
                          : 'text-[#647282]'
                      }`}
                    >
                      {f.status === 'cancelled' ? '—' : f.arrDelayMin > 0 ? `+${f.arrDelayMin}m` : '0m'}
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono text-[#E8EDF2] tabular-nums">
                      {f.passengerCount}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
