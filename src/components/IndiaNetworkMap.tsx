import React, { useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoMercator, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import indiaTopoRaw from '../data/indiaStatesTopo.json';
import { Airport, FlightSimState, SimulationResult } from '../types/aviation';
import { ReplayStageSnapshot } from '../types/replay';
import { formatMinutesToHHMM } from '../utils/time';
import { Layers, Minus, Plus, RotateCcw } from 'lucide-react';

interface IndiaStateProps {
  st_nm: string;
  st_code: string;
}

interface IndiaNetworkMapProps {
  airports: Airport[];
  simulation: SimulationResult;
  replaySnapshot: ReplayStageSnapshot | null;
  isReplaying: boolean;
  selectedAirportCode: string | null;
  selectedFlightId: string | null;
  selectedStateName: string | null;
  onSelectAirport: (code: string | null) => void;
  onSelectFlight: (flightId: string | null) => void;
  onSelectState: (stateName: string | null) => void;
  isDemoDataset: boolean;
}

const SVG_W = 840;
const SVG_H = 740;

const indiaTopo = indiaTopoRaw as unknown as Topology<{
  states: GeometryCollection<IndiaStateProps>;
}>;

interface CorridorRoute {
  key: string;
  origin: string;
  destination: string;
  flights: FlightSimState[];
  status: 'recovered' | 'cancelled' | 'cascade' | 'direct' | 'delayed' | 'on_time';
  priority: number;
  representativeFlightId: string;
  totalPax: number;
  maxDelay: number;
}

function buildCurvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curveBias = 1
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const nx = -dy / dist;
  const ny = dx / dist;
  const offset = Math.min(46, Math.max(10, dist * 0.14)) * curveBias;
  const cx = mx + nx * offset;
  const cy = my + ny * offset;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

export const IndiaNetworkMap: React.FC<IndiaNetworkMapProps> = ({
  airports,
  simulation,
  replaySnapshot,
  isReplaying,
  selectedAirportCode,
  selectedFlightId,
  selectedStateName,
  onSelectAirport,
  onSelectFlight,
  onSelectState,
  isDemoDataset,
}) => {
  const [hoveredAirport, setHoveredAirport] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [hoveredRoute, setHoveredRoute] = useState<CorridorRoute | null>(null);
  const [showStateLabels, setShowStateLabels] = useState(false);

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
    moved: boolean;
  }>({ active: false, startX: 0, startY: 0, origPanX: 0, origPanY: 0, moved: false });
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [airports]);

  const isIndiaGeo = useMemo(() => {
    if (airports.length === 0) return true;
    const inIndia = airports.filter(
      (a) => a.lat >= 6 && a.lat <= 38 && a.lon >= 67 && a.lon <= 98
    ).length;
    return inIndia >= Math.ceil(airports.length * 0.6);
  }, [airports]);

  const geo = useMemo(() => {
    const stateCollection = feature(indiaTopo, indiaTopo.objects.states);
    const innerBorders = mesh(indiaTopo, indiaTopo.objects.states, (a, b) => a !== b);
    const outerBoundary = mesh(indiaTopo, indiaTopo.objects.states, (a, b) => a === b);

    const projection = geoMercator();
    if (isIndiaGeo) {
      projection.fitExtent(
        [
          [34, 22],
          [SVG_W - 34, SVG_H - 26],
        ],
        stateCollection
      );
    } else {
      const airportCollection = {
        type: 'FeatureCollection' as const,
        features: airports.map((a) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [a.lon, a.lat] as [number, number] },
          properties: { code: a.code },
        })),
      };
      projection.fitExtent(
        [
          [64, 52],
          [SVG_W - 64, SVG_H - 52],
        ],
        airportCollection
      );
    }

    const pathGen = geoPath(projection);
    const graticulePath = pathGen(geoGraticule10()) ?? '';

    const stateFeatures = stateCollection.features.map((f) => ({
      name: f.properties.st_nm,
      code: f.properties.st_code,
      d: pathGen(f) ?? '',
      centroid: pathGen.centroid(f),
    }));

    return {
      projection,
      graticulePath,
      innerBordersPath: pathGen(innerBorders) ?? '',
      outerBoundaryPath: pathGen(outerBoundary) ?? '',
      stateFeatures,
    };
  }, [isIndiaGeo, airports]);

  const airportPoints = useMemo(() => {
    const map = new Map<string, { x: number; y: number; airport: Airport }>();
    for (const ap of airports) {
      const pt = geo.projection([ap.lon, ap.lat]);
      if (pt) {
        map.set(ap.code, { x: pt[0], y: pt[1], airport: ap });
      }
    }
    return map;
  }, [airports, geo.projection]);

  const activeSim = replaySnapshot ? replaySnapshot.simulation : simulation;
  const hasScenario = Boolean(activeSim.scenario);
  const activeStage = replaySnapshot?.stage ?? 5;

  const corridors = useMemo<CorridorRoute[]>(() => {
    const grouped = new Map<string, FlightSimState[]>();
    for (const f of activeSim.flights) {
      const key = `${f.origin}->${f.destination}`;
      const list = grouped.get(key) ?? [];
      list.push(f);
      grouped.set(key, list);
    }

    const routes: CorridorRoute[] = [];
    for (const [key, list] of grouped.entries()) {
      const [origin, destination] = key.split('->');
      if (!airportPoints.has(origin) || !airportPoints.has(destination)) continue;

      const hasRecovered = list.some((f) =>
        replaySnapshot ? replaySnapshot.recoveredFlightIds.has(f.id) : f.status === 'recovered'
      );
      const hasCancelled = list.some((f) =>
        replaySnapshot ? replaySnapshot.cancelledFlightIds.has(f.id) : f.status === 'cancelled'
      );
      const hasCascade = list.some((f) =>
        replaySnapshot
          ? replaySnapshot.cascadeFlightIds.has(f.id)
          : f.affectedByRotation && f.status === 'delayed'
      );
      const hasDirect = list.some((f) =>
        replaySnapshot
          ? replaySnapshot.directFlightIds.has(f.id)
          : !f.affectedByRotation && f.status === 'delayed'
      );
      const hasAnyDelayed = list.some((f) => f.status === 'delayed');

      let status: CorridorRoute['status'] = 'on_time';
      let priority = 1;

      if (hasScenario && replaySnapshot) {
        if (replaySnapshot.stage === 6 && hasRecovered) {
          status = 'recovered';
          priority = 6;
        } else if (hasCancelled && replaySnapshot.stage >= 2) {
          status = 'cancelled';
          priority = 5;
        } else if (hasCascade && replaySnapshot.stage >= 3) {
          status = 'cascade';
          priority = 4;
        } else if (hasDirect && replaySnapshot.stage >= 2) {
          status = 'direct';
          priority = 3;
        }
      } else if (hasScenario) {
        if (hasRecovered) {
          status = 'recovered';
          priority = 6;
        } else if (hasCancelled) {
          status = 'cancelled';
          priority = 5;
        } else if (hasCascade) {
          status = 'cascade';
          priority = 4;
        } else if (hasAnyDelayed) {
          status = 'delayed';
          priority = 3;
        }
      }

      const sortedFlights = [...list].sort(
        (a, b) =>
          (b.status === 'cancelled' ? 300 : b.depDelayMin) -
          (a.status === 'cancelled' ? 300 : a.depDelayMin)
      );
      const rep = sortedFlights[0];
      routes.push({
        key,
        origin,
        destination,
        flights: sortedFlights,
        status,
        priority,
        representativeFlightId: rep.id,
        totalPax: list.reduce((s, f) => s + f.passengerCount, 0),
        maxDelay: Math.max(...list.map((f) => Math.max(f.depDelayMin, f.arrDelayMin))),
      });
    }

    return routes.sort((a, b) => a.priority - b.priority);
  }, [activeSim.flights, airportPoints, hasScenario, replaySnapshot]);

  const selectedFlight = useMemo(
    () => activeSim.flights.find((f) => f.id === selectedFlightId) ?? null,
    [activeSim.flights, selectedFlightId]
  );

  const airportsInSelectedState = useMemo(() => {
    if (!selectedStateName) return new Set<string>();
    return new Set(
      airports
        .filter((a) => (a.state ?? '').toLowerCase() === selectedStateName.toLowerCase())
        .map((a) => a.code)
    );
  }, [airports, selectedStateName]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current.active || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = SVG_W / Math.max(1, rect.width);
    const scaleY = SVG_H / Math.max(1, rect.height);
    const dx = (e.clientX - dragRef.current.startX) * scaleX;
    const dy = (e.clientY - dragRef.current.startY) * scaleY;
    if (Math.hypot(dx, dy) > 4) {
      dragRef.current.moved = true;
    }
    const bound = 260 * zoom;
    setPan({
      x: Math.max(-bound, Math.min(bound, dragRef.current.origPanX + dx)),
      y: Math.max(-bound, Math.min(bound, dragRef.current.origPanY + dy)),
    });
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => {
      const next = Math.max(1, Math.min(2.8, Number((prev + delta).toFixed(2))));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  return (
    <div className="relative bg-[#0B0E12] flex-1 flex flex-col min-h-[420px] lg:min-h-0 select-none overflow-hidden">
      {/* Hover Readout (Bottom-Right above Legend or Top-Center) */}
      {(hoveredState || hoveredRoute || hoveredAirport) && (
        <div className="absolute bottom-14 right-3.5 z-20 pointer-events-none bg-[#151B22] border border-[#28313B] rounded-md px-3 py-2 text-xs max-w-xs">
          {hoveredRoute ? (
            <div className="space-y-0.5">
              <div className="font-mono font-semibold text-[#E8EDF2]">
                {hoveredRoute.origin} → {hoveredRoute.destination}
                <span className="ml-2 font-sans font-normal text-[#8B98A7]">
                  {hoveredRoute.flights.length} sector{hoveredRoute.flights.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-[11px] text-[#8B98A7] font-mono tabular-nums">
                {hoveredRoute.flights.map((f) => f.flightNumber).join(', ')} · {hoveredRoute.totalPax} pax
                {hoveredRoute.maxDelay >= 15 ? ` · +${hoveredRoute.maxDelay}m` : ''}
              </div>
            </div>
          ) : hoveredAirport && activeSim.airports[hoveredAirport] ? (
            <div className="space-y-0.5">
              <div className="font-mono font-semibold text-[#E8EDF2]">
                {hoveredAirport} · {activeSim.airports[hoveredAirport].city}
              </div>
              <div className="text-[11px] text-[#8B98A7] tabular-nums">
                {activeSim.airports[hoveredAirport].totalFlights} flights ·{' '}
                {activeSim.airports[hoveredAirport].delayedFlights} delayed ·{' '}
                {activeSim.airports[hoveredAirport].cancelledFlights} cancelled
              </div>
            </div>
          ) : (
            <div className="text-[#E8EDF2] font-medium">
              {hoveredState}{' '}
              <span className="text-[11px] font-normal text-[#8B98A7]">(click to filter state)</span>
            </div>
          )}
        </div>
      )}

      {/* Top-Right Compact Instrument Zoom Controls */}
      <div className="absolute top-3 right-3.5 z-10 flex items-center gap-1.5">
        {isIndiaGeo && (
          <button
            type="button"
            onClick={() => setShowStateLabels((s) => !s)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium border transition-colors ${
              showStateLabels
                ? 'bg-[#151B22] border-[#5EC8D8] text-[#E8EDF2]'
                : 'bg-[#151B22] border-[#28313B] text-[#8B98A7] hover:text-[#E8EDF2]'
            }`}
            title="Toggle Indian state labels"
          >
            <Layers className="h-3 w-3 text-[#5EC8D8]" />
            <span>States</span>
          </button>
        )}

        <div className="inline-flex items-center rounded border border-[#28313B] bg-[#151B22] overflow-hidden">
          <button
            type="button"
            onClick={() => handleZoom(-0.3)}
            disabled={zoom <= 1}
            className="p-1.5 text-[#8B98A7] hover:text-[#E8EDF2] hover:bg-[#1C242E] disabled:opacity-35 transition-colors"
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="px-2 font-mono text-[11px] text-[#E8EDF2] tabular-nums border-x border-[#28313B]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => handleZoom(0.3)}
            disabled={zoom >= 2.8}
            className="p-1.5 text-[#8B98A7] hover:text-[#E8EDF2] hover:bg-[#1C242E] disabled:opacity-35 transition-colors"
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {(zoom > 1 || pan.x !== 0 || pan.y !== 0) && (
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded border border-[#28313B] bg-[#151B22] text-[#8B98A7] hover:text-[#E8EDF2] hover:bg-[#1C242E] transition-colors"
            title="Reset zoom & pan"
            aria-label="Reset map view"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Main SVG India Map Canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full h-full flex-1 block cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          handlePointerUp();
          setHoveredState(null);
          setHoveredRoute(null);
          setHoveredAirport(null);
        }}
      >
        <defs>
          <marker
            id="atlas-arrow-cyan"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="4.5"
            markerHeight="4.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 7 4 L 0 7 z" fill="#5EC8D8" fillOpacity="0.65" />
          </marker>
          <marker
            id="atlas-arrow-direct"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 7 4 L 0 7 z" fill="#F2A93B" />
          </marker>
          <marker
            id="atlas-arrow-cascade"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 7 4 L 0 7 z" fill="#D97D45" />
          </marker>
          <marker
            id="atlas-arrow-critical"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 7 4 L 0 7 z" fill="#E05D5D" />
          </marker>
          <marker
            id="atlas-arrow-recovered"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 7 4 L 0 7 z" fill="#75B798" />
          </marker>
          <marker
            id="atlas-arrow-selected"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 7 4 L 0 7 z" fill="#E8EDF2" />
          </marker>
        </defs>

        <g
          transform={`translate(${SVG_W / 2 + pan.x}, ${SVG_H / 2 + pan.y}) scale(${zoom}) translate(${-SVG_W / 2}, ${-SVG_H / 2})`}
        >
          {/* Cartographic Coordinate Graticule */}
          <path
            d={geo.graticulePath}
            fill="none"
            stroke="#171C24"
            strokeWidth={0.75 / zoom}
          />

          {/* India States & Union Territories */}
          {isIndiaGeo && (
            <g>
              {geo.stateFeatures.map((st) => {
                const isStateSelected =
                  selectedStateName?.toLowerCase() === st.name.toLowerCase();
                const isStateHovered =
                  hoveredState?.toLowerCase() === st.name.toLowerCase();
                const hasPrimaryAirport = airports.some(
                  (a) =>
                    a.code === activeSim.scenario?.airportCode &&
                    (a.state ?? '').toLowerCase() === st.name.toLowerCase()
                );

                let fillColor = '#131820';
                if (isStateSelected) {
                  fillColor = '#1B2531';
                } else if (hasPrimaryAirport && hasScenario) {
                  fillColor = '#211819';
                } else if (isStateHovered) {
                  fillColor = '#18202B';
                }

                return (
                  <path
                    key={st.name}
                    d={st.d}
                    fill={fillColor}
                    stroke="none"
                    className="transition-colors duration-150 cursor-pointer"
                    onMouseEnter={() => setHoveredState(st.name)}
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={(e) => {
                      if (dragRef.current.moved) return;
                      e.stopPropagation();
                      onSelectState(isStateSelected ? null : st.name);
                    }}
                  />
                );
              })}

              {/* Internal State Hairline Borders */}
              <path
                d={geo.innerBordersPath}
                fill="none"
                stroke="#28313B"
                strokeWidth={0.8 / zoom}
                strokeLinejoin="round"
                pointerEvents="none"
              />

              {/* India Coastline & National Boundary */}
              <path
                d={geo.outerBoundaryPath}
                fill="none"
                stroke="#3E4B5B"
                strokeWidth={1.25 / zoom}
                strokeLinejoin="round"
                pointerEvents="none"
              />

              {/* Optional State Name Labels */}
              {showStateLabels &&
                geo.stateFeatures.map((st) => {
                  if (!Number.isFinite(st.centroid[0]) || !Number.isFinite(st.centroid[1])) {
                    return null;
                  }
                  if (
                    zoom < 1.5 &&
                    ['Chandigarh', 'Delhi', 'Puducherry', 'Dadra and Nagar Haveli and Daman and Diu', 'Goa', 'Lakshadweep'].includes(
                      st.name
                    )
                  ) {
                    return null;
                  }
                  return (
                    <text
                      key={`lbl-${st.name}`}
                      x={st.centroid[0]}
                      y={st.centroid[1]}
                      textAnchor="middle"
                      fontSize={8 / Math.sqrt(zoom)}
                      fill="#6D7484"
                      fontWeight={500}
                      pointerEvents="none"
                    >
                      {st.name}
                    </text>
                  );
                })}
            </g>
          )}

          {/* Flight Corridors (Intensity Weighted + Direct vs Cascade Distinction) */}
          <g>
            {corridors.map((route) => {
              const fromPt = airportPoints.get(route.origin);
              const toPt = airportPoints.get(route.destination);
              if (!fromPt || !toPt) return null;

              const isSelectedFlightOnRoute = Boolean(
                selectedFlight &&
                  selectedFlight.origin === route.origin &&
                  selectedFlight.destination === route.destination
              );
              const touchesSelectedAirport =
                selectedAirportCode === route.origin ||
                selectedAirportCode === route.destination;
              const isHoveredRoute = hoveredRoute?.key === route.key;

              const curveBias = route.origin < route.destination ? 1 : -1;
              const d = buildCurvedPath(fromPt.x, fromPt.y, toPt.x, toPt.y, curveBias);

              // Route intensity weight based on sector frequency on this corridor
              const intensityBoost = Math.min(0.9, (route.flights.length - 1) * 0.35);

              let stroke = '#5EC8D8';
              let strokeOpacity =
                selectedAirportCode && !touchesSelectedAirport
                  ? 0.1
                  : touchesSelectedAirport
                  ? 0.55
                  : 0.22 + Math.min(0.16, intensityBoost * 0.14);
              let strokeWidth = 1.0 + intensityBoost;
              let dashArray: string | undefined;
              let markerEnd = 'url(#atlas-arrow-cyan)';

              if (route.status === 'recovered') {
                stroke = '#75B798';
                strokeOpacity = 0.92;
                strokeWidth = 2.0 + intensityBoost * 0.6;
                markerEnd = 'url(#atlas-arrow-recovered)';
              } else if (route.status === 'cancelled') {
                stroke = '#E05D5D';
                strokeOpacity = 0.88;
                strokeWidth = 1.8 + intensityBoost * 0.4;
                dashArray = '3 3';
                markerEnd = 'url(#atlas-arrow-critical)';
              } else if (route.status === 'cascade') {
                stroke = '#D97D45';
                strokeOpacity = 0.88;
                strokeWidth = 1.8 + intensityBoost * 0.5;
                dashArray = '6 3';
                markerEnd = 'url(#atlas-arrow-cascade)';
              } else if (route.status === 'direct' || route.status === 'delayed') {
                stroke = '#F2A93B';
                strokeOpacity = 0.9;
                strokeWidth = 1.9 + intensityBoost * 0.5;
                markerEnd = 'url(#atlas-arrow-direct)';
              }

              if (isSelectedFlightOnRoute || isHoveredRoute) {
                stroke = route.status === 'recovered' ? '#75B798' : '#E8EDF2';
                strokeOpacity = 1;
                strokeWidth = 2.6;
                markerEnd =
                  route.status === 'recovered'
                    ? 'url(#atlas-arrow-recovered)'
                    : 'url(#atlas-arrow-selected)';
              }

              return (
                <g key={route.key}>
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={11 / zoom}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredRoute(route)}
                    onMouseLeave={() => setHoveredRoute(null)}
                    onClick={(e) => {
                      if (dragRef.current.moved) return;
                      e.stopPropagation();
                      onSelectFlight(isSelectedFlightOnRoute ? null : route.representativeFlightId);
                    }}
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeOpacity={strokeOpacity}
                    strokeWidth={strokeWidth / Math.sqrt(zoom)}
                    strokeDasharray={dashArray}
                    markerEnd={markerEnd}
                    pointerEvents="none"
                  />
                </g>
              );
            })}
          </g>

          {/* Airport Markers */}
          <g>
            {airports.map((ap) => {
              const pt = airportPoints.get(ap.code);
              if (!pt) return null;

              const impact = activeSim.airports[ap.code];
              const isSelected = selectedAirportCode === ap.code;
              const isHovered = hoveredAirport === ap.code;
              const isStateMember = airportsInSelectedState.has(ap.code);
              const isPrimary = hasScenario && activeSim.scenario?.airportCode === ap.code;

              const isHighlightedInStage = replaySnapshot
                ? replaySnapshot.highlightedAirportCodes.has(ap.code)
                : true;
              const isConnectionHubInStage =
                replaySnapshot && activeStage >= 4 && replaySnapshot.connectionHubCodes.has(ap.code);

              let fill = ap.isHub ? '#5EC8D8' : '#7C8A9A';
              let ringStroke = '#0B0E12';

              if (hasScenario && isHighlightedInStage && impact) {
                if (isPrimary || (impact.cancelledFlights > 0 && activeStage >= 2)) {
                  fill = '#E05D5D';
                } else if (
                  activeStage === 6 &&
                  impact.recoveredFlights > 0 &&
                  impact.delayedFlights === 0
                ) {
                  fill = '#75B798';
                } else if (impact.severity === 'severe' && activeStage >= 3) {
                  fill = '#E05D5D';
                } else if (
                  (impact.severity === 'moderate' ||
                    impact.delayedFlights > 0 ||
                    isConnectionHubInStage) &&
                  activeStage >= 2
                ) {
                  fill = '#F2A93B';
                }
              }

              if (isSelected) {
                fill = '#F2A93B';
              }

              const baseRadius = ap.isHub ? 5.8 : 4.2;
              const r = (isSelected || isHovered ? baseRadius + 1.4 : baseRadius) / Math.sqrt(zoom);

              let labelDx = 9 / Math.sqrt(zoom);
              let labelDy = 3 / Math.sqrt(zoom);
              let textAnchor: 'start' | 'end' = 'start';
              if (['BOM', 'AMD', 'GOI', 'COK'].includes(ap.code)) {
                labelDx = -9 / Math.sqrt(zoom);
                textAnchor = 'end';
              } else if (ap.code === 'PNQ') {
                labelDx = 9 / Math.sqrt(zoom);
                labelDy = 8 / Math.sqrt(zoom);
              }

              return (
                <g
                  key={ap.code}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select airport ${ap.code} ${ap.city}`}
                  className="cursor-pointer focus:outline-none"
                  onMouseEnter={() => setHoveredAirport(ap.code)}
                  onMouseLeave={() => setHoveredAirport(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectAirport(isSelected ? null : ap.code);
                    }
                  }}
                  onClick={(e) => {
                    if (dragRef.current.moved) return;
                    e.stopPropagation();
                    onSelectAirport(isSelected ? null : ap.code);
                  }}
                >
                  {/* Primary Source Target Rings */}
                  {isPrimary && hasScenario && (
                    <>
                      <circle
                        r={18 / Math.sqrt(zoom)}
                        fill="none"
                        stroke="#E05D5D"
                        strokeOpacity={isReplaying ? 0.55 : 0.35}
                        strokeWidth={1 / Math.sqrt(zoom)}
                      />
                      <circle
                        r={11.5 / Math.sqrt(zoom)}
                        fill="#E05D5D"
                        fillOpacity={0.14}
                        stroke="#E05D5D"
                        strokeOpacity={0.8}
                        strokeWidth={1.1 / Math.sqrt(zoom)}
                      />
                    </>
                  )}

                  {/* Hub Connection Breach Ring */}
                  {isConnectionHubInStage && !isPrimary && (
                    <circle
                      r={12 / Math.sqrt(zoom)}
                      fill="none"
                      stroke="#F2A93B"
                      strokeOpacity={0.75}
                      strokeDasharray="2.5 2"
                      strokeWidth={1.1 / Math.sqrt(zoom)}
                    />
                  )}

                  {/* Selection Amber Halo */}
                  {(isSelected || isStateMember) && (
                    <circle
                      r={11 / Math.sqrt(zoom)}
                      fill="none"
                      stroke="#F2A93B"
                      strokeWidth={1.5 / Math.sqrt(zoom)}
                    />
                  )}

                  <circle
                    r={r}
                    fill={fill}
                    stroke={ringStroke}
                    strokeWidth={1.5 / Math.sqrt(zoom)}
                  />

                  <text
                    x={labelDx}
                    y={labelDy}
                    textAnchor={textAnchor}
                    fontSize={(ap.isHub ? 11 : 9.5) / Math.sqrt(zoom)}
                    fontWeight={ap.isHub || isSelected || isPrimary ? 600 : 500}
                    fontFamily="JetBrains Mono, ui-monospace, monospace"
                    fill={
                      isSelected
                        ? '#F2A93B'
                        : isPrimary && hasScenario
                        ? '#E05D5D'
                        : ap.isHub
                        ? '#E8EDF2'
                        : '#8B98A7'
                    }
                    stroke="#0B0E12"
                    strokeWidth={2.8 / Math.sqrt(zoom)}
                    paintOrder="stroke"
                  >
                    {ap.code}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Bottom Map Legend Bar */}
      <div className="px-4 py-2 border-t border-[#28313B] bg-[#10151B] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#8B98A7]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs bg-[#5EC8D8]" />
            <span>Normal / Hub</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs bg-[#F2A93B]" />
            <span>Selected / Direct Impact</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-2 border-dashed border-[#D97D45]" />
            <span>Rotation Cascade</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs bg-[#E05D5D]" />
            <span>Critical / Cancelled</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-[#75B798]" />
            <span>Recovered</span>
          </span>
        </div>

        {selectedFlight ? (
          <div className="font-mono text-[#E8EDF2] tabular-nums">
            Selected: {selectedFlight.flightNumber} ({selectedFlight.origin}→{selectedFlight.destination}) ·{' '}
            {formatMinutesToHHMM(selectedFlight.scheduledDepMin)}
          </div>
        ) : (
          <span className="text-[#8B98A7]">
            {isDemoDataset ? 'Demo Schedule' : 'Official Dataset'} · Click airport, route, or state
          </span>
        )}
      </div>
    </div>
  );
};
