import React, { useEffect, useState } from 'react';
import { REPLAY_STAGES, ReplayStage, ReplayStageSnapshot } from '../types/replay';
import { TimelineEvent } from '../types/aviation';
import { formatMinutesToHHMM } from '../utils/time';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';

interface HorizontalIncidentTimelineProps {
  hasScenario: boolean;
  stage: ReplayStage;
  isPlaying: boolean;
  snapshot: ReplayStageSnapshot;
  events: TimelineEvent[];
  appliedActionsCount: number;
  onChangeStage: (stage: ReplayStage) => void;
  onTogglePlay: () => void;
  onReplayFromStart: () => void;
  onSelectFlight: (flightId: string) => void;
  onSelectAirport: (code: string) => void;
}

const DAY_START_MIN = 360;
const DAY_END_MIN = 1320;
const AXIS_HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22];

export const HorizontalIncidentTimeline: React.FC<HorizontalIncidentTimelineProps> = ({
  hasScenario,
  stage,
  isPlaying,
  snapshot,
  events,
  appliedActionsCount,
  onChangeStage,
  onTogglePlay,
  onReplayFromStart,
  onSelectFlight,
  onSelectAirport,
}) => {
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);

  useEffect(() => {
    setHoveredEvent(null);
  }, [events, hasScenario]);

  const maxAutoStage: ReplayStage = appliedActionsCount > 0 ? 6 : 5;

  useEffect(() => {
    if (!isPlaying || !hasScenario) return;
    if (stage >= maxAutoStage) return;
    const timer = window.setInterval(() => {
      onChangeStage(Math.min(maxAutoStage, stage + 1) as ReplayStage);
    }, 2400);
    return () => window.clearInterval(timer);
  }, [isPlaying, hasScenario, stage, maxAutoStage, onChangeStage]);

  useEffect(() => {
    if (isPlaying && stage >= maxAutoStage) {
      const stopTimer = window.setTimeout(() => {
        onTogglePlay();
      }, 2200);
      return () => window.clearTimeout(stopTimer);
    }
  }, [isPlaying, stage, maxAutoStage, onTogglePlay]);

  const currentStageMeta = REPLAY_STAGES[stage - 1];

  const getEventColor = (ev: TimelineEvent) => {
    if (ev.category === 'recovery') return '#75B798';
    if (ev.category === 'cancellation' || ev.category === 'crew') return '#E05D5D';
    if (ev.category === 'rotation') return '#D97D45';
    return '#F2A93B';
  };

  return (
    <section
      aria-label="Incident progression timeline"
      className="shrink-0 border-t border-[#28313B] bg-[#10151B] px-3.5 py-2 space-y-1.5"
    >
      {/* Top Row: Stage Stepper + Playback Transport */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {REPLAY_STAGES.map((def) => {
            const isCurrent = hasScenario && stage === def.stage;
            const isPast = hasScenario && def.stage < stage;
            const isRecovery = def.stage === 6;

            return (
              <button
                key={def.stage}
                type="button"
                disabled={!hasScenario}
                onClick={() => onChangeStage(def.stage)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors whitespace-nowrap disabled:opacity-35 disabled:cursor-not-allowed ${
                  isCurrent
                    ? isRecovery && appliedActionsCount > 0
                      ? 'bg-[#12221D] border-[#75B798] text-[#E8EDF2]'
                      : 'bg-[#221A10] border-[#F2A93B] text-[#E8EDF2]'
                    : isPast
                    ? 'bg-[#151B22] border-[#28313B] text-[#8B98A7] hover:text-[#E8EDF2]'
                    : 'bg-transparent border-transparent text-[#8B98A7]/70 hover:text-[#E8EDF2]'
                }`}
              >
                {def.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Transport Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!hasScenario || stage === 1}
            onClick={() => onChangeStage(Math.max(1, stage - 1) as ReplayStage)}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-medium text-[#8B98A7] hover:text-[#E8EDF2] border border-[#28313B] bg-[#151B22] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
            title="Step backward"
          >
            <ChevronLeft className="h-3 w-3" />
            <span>Back</span>
          </button>

          <button
            type="button"
            disabled={!hasScenario}
            onClick={onTogglePlay}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold text-[#0B0E12] bg-[#5EC8D8] hover:bg-[#76D4E2] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3 w-3" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={!hasScenario || stage === 6}
            onClick={() => onChangeStage(Math.min(6, stage + 1) as ReplayStage)}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-medium text-[#8B98A7] hover:text-[#E8EDF2] border border-[#28313B] bg-[#151B22] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
            title="Step forward"
          >
            <span>Next</span>
            <ChevronRight className="h-3 w-3" />
          </button>

          <button
            type="button"
            disabled={!hasScenario}
            onClick={onReplayFromStart}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-[#8B98A7] hover:text-[#E8EDF2] border border-[#28313B] bg-[#151B22] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
            title="Replay from Stage 1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Replay</span>
          </button>
        </div>
      </div>

      {/* Stage Narrative Line */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[11px]">
        <div className="text-[#8B98A7] truncate max-w-3xl">
          <span className="font-semibold text-[#E8EDF2] mr-1.5">
            {hasScenario ? `Stage ${stage}: ${currentStageMeta.title}` : 'Baseline Window'}
          </span>
          <span>{snapshot.narrative}</span>
        </div>
        <span className="font-mono text-[11px] text-[#5EC8D8] tabular-nums shrink-0">
          {snapshot.headlineMetricLabel}: {snapshot.headlineMetricValue}
        </span>
      </div>

      {/* Analytical Horizontal Time-Axis Ruler (06:00 -> 22:00) */}
      <div className="relative pt-1.5">
        <div className="relative h-6 border-t border-[#28313B]">
          {AXIS_HOURS.map((hr) => {
            const pct = ((hr * 60 - DAY_START_MIN) / (DAY_END_MIN - DAY_START_MIN)) * 100;
            return (
              <div
                key={hr}
                style={{ left: `${pct}%` }}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-none"
              >
                <div className="h-1.5 w-px bg-[#374351]" />
                <span className="font-mono text-[10px] text-[#8B98A7] mt-0.5 tabular-nums">
                  {String(hr).padStart(2, '0')}:00
                </span>
              </div>
            );
          })}

          {events.map((ev) => {
            const clamped = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN, ev.timeMin));
            const pct = ((clamped - DAY_START_MIN) / (DAY_END_MIN - DAY_START_MIN)) * 100;
            const color = getEventColor(ev);
            const isActive = hoveredEvent?.id === ev.id;
            return (
              <button
                key={ev.id}
                type="button"
                style={{ left: `${pct}%`, backgroundColor: color }}
                onMouseEnter={() => setHoveredEvent(ev)}
                onMouseLeave={() => setHoveredEvent(null)}
                onClick={() => {
                  if (ev.flightId) onSelectFlight(ev.flightId);
                  else onSelectAirport(ev.airportCode);
                }}
                aria-label={`${formatMinutesToHHMM(ev.timeMin)} ${ev.title}`}
                className={`absolute -top-[4px] -translate-x-1/2 w-1.5 rounded-xs transition-transform ${
                  isActive ? 'h-3.5 scale-125 z-10' : 'h-2 opacity-85 hover:opacity-100'
                }`}
              />
            );
          })}
        </div>

        {hoveredEvent && (
          <div className="mt-1 flex items-center justify-between text-[11px] bg-[#151B22] border border-[#28313B] rounded px-2.5 py-1">
            <span className="font-mono text-[#F2A93B] tabular-nums mr-2 shrink-0">
              {formatMinutesToHHMM(hoveredEvent.timeMin)}
            </span>
            <span className="text-[#E8EDF2] font-medium truncate flex-1">{hoveredEvent.title}</span>
            <span className="text-[#8B98A7] ml-2 truncate hidden sm:inline">
              {hoveredEvent.detail}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
