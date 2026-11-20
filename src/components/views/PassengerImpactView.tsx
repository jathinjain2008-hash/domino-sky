import React, { useMemo, useState } from 'react';
import { Airport, SimulationResult } from '../../types/aviation';
import { FlightTable } from '../FlightTable';
import { HelpTooltip } from '../HelpTooltip';
import { CheckCircle2, Info, ShieldCheck, XCircle } from 'lucide-react';

interface PassengerImpactViewProps {
  airportsList: Airport[];
  simulation: SimulationResult;
  selectedFlightId: string | null;
  onSelectFlight: (flightId: string | null) => void;
  onInspectFlightOnMap: (flightId: string) => void;
}

export const PassengerImpactView: React.FC<PassengerImpactViewProps> = ({
  airportsList,
  simulation,
  selectedFlightId,
  onSelectFlight,
  onInspectFlightOnMap,
}) => {
  const [connFilter, setConnFilter] = useState<'all' | 'missed' | 'saved' | 'intact'>('all');

  const { metrics, connections, airports, flights } = simulation;

  const topAirportsByPax = useMemo(() => {
    return Object.values(airports)
      .filter((a) => a.affectedPassengers > 0)
      .sort((a, b) => b.affectedPassengers - a.affectedPassengers)
      .slice(0, 8);
  }, [airports]);

  const topFlightsByPax = useMemo(() => {
    const delayOf = (f: (typeof flights)[number]) => Math.max(f.depDelayMin, f.arrDelayMin);
    return flights
      .filter((f) => f.status === 'cancelled' || delayOf(f) >= 15)
      .sort(
        (a, b) =>
          (b.status === 'cancelled' ? b.passengerCount * 2 : b.passengerCount) -
          (a.status === 'cancelled' ? a.passengerCount * 2 : a.passengerCount)
      )
      .slice(0, 10);
  }, [flights]);

  const filteredConnections = useMemo(() => {
    return connections
      .filter((c) => connFilter === 'all' || c.status === connFilter)
      .sort((a, b) => {
        const order = { missed: 0, saved: 1, intact: 2 };
        return order[a.status] - order[b.status];
      });
  }, [connections, connFilter]);

  const maxApPax = Math.max(1, ...topAirportsByPax.map((a) => a.affectedPassengers));

  return (
    <div className="flex-1 flex flex-col overflow-y-auto divide-y divide-[#28313B] bg-[#10151B]">
      {/* Console Section Header */}
      <div className="px-5 py-3.5 bg-[#0B0E12] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#5EC8D8]">
            Passenger Connections &amp; Schedule Ledger
          </div>
          <h1 className="text-base font-semibold text-[#E8EDF2] mt-0.5">
            Hub Transfer Integrity &amp; Flight Operations Table
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#8B98A7] max-w-xl">
          <Info className="h-3.5 w-3.5 text-[#5EC8D8] shrink-0" />
          <span>
            Connections break if either leg cancels or transfer time drops below the 35-minute MCT. Affected passenger totals deduplicate cancelled-leg overlap.
          </span>
        </div>
      </div>

      {/* Hairline-Separated 4-Column Passenger Impact Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#28313B] bg-[#151B22]">
        <div className="px-5 py-4">
          <div className="text-[11px] uppercase tracking-wider text-[#8B98A7]">
            Total Affected Passengers
          </div>
          <div
            className={`font-mono text-2xl font-semibold mt-1 tabular-nums ${
              metrics.affectedPassengers > 0 ? 'text-[#F2A93B]' : 'text-[#E8EDF2]'
            }`}
          >
            {metrics.affectedPassengers.toLocaleString()}
          </div>
          <div className="text-xs text-[#647282] mt-1">Deduplicated travelers impacted across India</div>
        </div>

        <div className="px-5 py-4">
          <div className="text-[11px] uppercase tracking-wider text-[#8B98A7]">
            Missed Connections
          </div>
          <div
            className={`font-mono text-2xl font-semibold mt-1 tabular-nums ${
              metrics.missedConnections > 0 ? 'text-[#F2A93B]' : 'text-[#75B798]'
            }`}
          >
            {metrics.missedConnections.toLocaleString()}
          </div>
          <div className="text-xs text-[#647282] mt-1">
            Across {metrics.missedConnectionEvents} broken hub transfer banks
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="text-[11px] uppercase tracking-wider text-[#8B98A7]">
            Passengers on Cancelled Flights
          </div>
          <div
            className={`font-mono text-2xl font-semibold mt-1 tabular-nums ${
              metrics.passengersCancelled > 0 ? 'text-[#E05D5D]' : 'text-[#E8EDF2]'
            }`}
          >
            {metrics.passengersCancelled.toLocaleString()}
          </div>
          <div className="text-xs text-[#647282] mt-1">
            From {metrics.cancelledFlights} cancelled {metrics.cancelledFlights === 1 ? 'flight' : 'flights'}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="text-[11px] uppercase tracking-wider text-[#8B98A7]">
            Passengers on Delayed Flights
          </div>
          <div className="font-mono text-2xl font-semibold text-[#E8EDF2] mt-1 tabular-nums">
            {metrics.passengersDelayed.toLocaleString()}
          </div>
          <div className="text-xs text-[#647282] mt-1">
            Across {metrics.delayedFlights} sectors delayed 15 minutes or more
          </div>
        </div>
      </div>

      {/* Passenger Impact by Airport & Highest-Impact Flights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#28313B] bg-[#10151B]">
        <div className="lg:col-span-5 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[#E8EDF2]">
              Passenger Impact by Indian Airport
            </h2>
            <p className="text-xs text-[#8B98A7] mt-0.5">
              Stations with highest delayed, cancelled, and missed-connection volume
            </p>
          </div>

          {topAirportsByPax.length === 0 ? (
            <div className="py-10 rounded text-center text-xs text-[#8B98A7] border border-[#28313B] bg-[#151B22]">
              0 passengers disrupted across all {Object.keys(airports).length} airports.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {topAirportsByPax.map((ap) => (
                <div key={ap.code} className="grid grid-cols-12 items-center gap-3 text-xs">
                  <div className="col-span-3 font-mono font-semibold text-[#E8EDF2]">
                    {ap.code}
                  </div>
                  <div className="col-span-6 h-1.5 rounded-full bg-[#1C232C] overflow-hidden">
                    <div
                      className={ap.severity === 'severe' ? 'h-full bg-[#E05D5D]' : 'h-full bg-[#F2A93B]'}
                      style={{ width: `${(ap.affectedPassengers / maxApPax) * 100}%` }}
                    />
                  </div>
                  <div className="col-span-3 text-right font-mono font-semibold text-[#E8EDF2] tabular-nums">
                    {ap.affectedPassengers.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[#E8EDF2]">
              Highest-Impact Flights
            </h2>
            <p className="text-xs text-[#8B98A7] mt-0.5">
              Click any row to inspect its full aircraft rotation on the India Network Map
            </p>
          </div>

          {topFlightsByPax.length === 0 ? (
            <div className="py-10 rounded text-center text-xs text-[#8B98A7] border border-[#28313B] bg-[#151B22]">
              All {flights.length} flights operating on time with zero passenger disruption.
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-[#28313B]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#0B0E12] border-b border-[#28313B] text-[#8B98A7]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Flight</th>
                    <th className="px-3 py-2 font-medium">Route</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium text-right">Onboard</th>
                    <th className="px-3 py-2 font-medium text-right">Missed Inbound</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#28313B]/70 bg-[#151B22]">
                  {topFlightsByPax.map((f) => {
                    const peakDelay = Math.max(f.depDelayMin, f.arrDelayMin);
                    return (
                      <tr
                        key={f.id}
                        onClick={() => onInspectFlightOnMap(f.id)}
                        className="hover:bg-[#1A222B] cursor-pointer transition-colors"
                      >
                        <td className="px-3 py-2 font-mono font-semibold text-[#E8EDF2]">
                          {f.flightNumber}
                        </td>
                        <td className="px-3 py-2 font-mono text-[#8B98A7]">
                          {f.origin} → {f.destination}
                        </td>
                        <td
                          className={`px-3 py-2 font-mono font-semibold ${
                            f.status === 'cancelled'
                              ? 'text-[#E05D5D]'
                              : f.status === 'recovered'
                              ? 'text-[#75B798]'
                              : 'text-[#F2A93B]'
                          }`}
                        >
                          {f.status === 'cancelled' ? 'Cancelled' : `+${peakDelay}m`}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[#E8EDF2] tabular-nums">
                          {f.passengerCount}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-[#F2A93B] tabular-nums">
                          {f.missedInboundConnections > 0 ? `${f.missedInboundConnections} pax` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Connecting Passenger Itinerary Monitor */}
      <div className="bg-[#10151B]">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-b border-[#28313B] bg-[#0B0E12]">
          <div>
            <h2 className="text-sm font-semibold text-[#E8EDF2]">
              Hub Transfer Connection Monitor
            </h2>
            <p className="text-xs text-[#8B98A7] mt-0.5 flex items-center gap-1.5">
              <span>
                {connections.length} tracked hub passenger banks across DEL, BOM, BLR, HYD, CCU (35m MCT)
              </span>
              <HelpTooltip
                label="What is MCT?"
                text="Minimum Connect Time (35 minutes) is the shortest safe buffer for passengers and baggage to transfer between an arriving flight and an outbound departure at a hub."
              />
            </p>
          </div>

          <div className="flex items-center rounded overflow-hidden border border-[#28313B] bg-[#151B22]">
            {(['all', 'missed', 'saved', 'intact'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setConnFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium capitalize whitespace-nowrap shrink-0 transition-colors ${
                  connFilter === st
                    ? 'bg-[#1D2834] text-[#5EC8D8]'
                    : 'text-[#8B98A7] hover:text-[#E8EDF2]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[360px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-[#151B22] border-b border-[#28313B] text-[#8B98A7]">
              <tr>
                <th className="px-5 py-2.5 font-medium">Hub</th>
                <th className="px-4 py-2.5 font-medium">Inbound</th>
                <th className="px-4 py-2.5 font-medium">Outbound</th>
                <th className="px-4 py-2.5 font-medium text-right">Available</th>
                <th className="px-4 py-2.5 font-medium text-right">Required MCT</th>
                <th className="px-4 py-2.5 font-medium text-right">Connecting Pax</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#28313B]/70">
              {filteredConnections.map((c) => {
                const statusClass =
                  c.status === 'missed'
                    ? 'text-[#E05D5D] font-semibold'
                    : c.status === 'saved'
                    ? 'text-[#75B798] font-semibold'
                    : 'text-[#8B98A7] font-medium';
                return (
                  <tr key={c.connection.id} className="hover:bg-[#151B22] transition-colors">
                    <td className="px-5 py-2.5 font-mono font-semibold text-[#E8EDF2]">
                      {c.connection.airportCode}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[#8B98A7]">
                      {c.fromFlightNumber} ({c.fromOrigin})
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[#8B98A7]">
                      {c.toFlightNumber} ({c.toDestination})
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#E8EDF2]">
                      {c.availableConnectMin < -500 ? 'CXL' : `${c.availableConnectMin}m`}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#8B98A7]">
                      {c.requiredConnectMin}m
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[#E8EDF2]">
                      {c.connection.passengerCount}
                    </td>
                    <td className="px-5 py-2.5 font-medium">
                      <span className={`inline-flex items-center gap-1.5 ${statusClass}`}>
                        {c.status === 'missed' ? (
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                        ) : c.status === 'saved' ? (
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#5EC8D8]" />
                        )}
                        <span className="capitalize">{c.status}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete 70-Flight Operations Ledger */}
      <div className="p-5 bg-[#10151B]">
        <FlightTable
          flights={simulation.flights}
          airports={airportsList}
          selectedFlightId={selectedFlightId}
          onSelectFlight={(fid) => {
            onSelectFlight(fid);
            if (fid) onInspectFlightOnMap(fid);
          }}
        />
      </div>
    </div>
  );
};
