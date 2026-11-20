import React from 'react';
import { AirlineDataset, DisruptionScenario, SimulationResult } from '../types/aviation';
import { formatDuration, formatMinutesToHHMM } from '../utils/time';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Compass,
  Database,
  FileSpreadsheet,
  GitBranch,
  Info,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';

export type NavSection =
  | 'network'
  | 'disruption'
  | 'cascade'
  | 'passengers'
  | 'recovery'
  | 'analytics';

export interface FeedbackNotice {
  type: 'success' | 'warning' | 'info';
  message: string;
}

interface LayoutShellProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  scenario: DisruptionScenario | null;
  simulation: SimulationResult;
  dataset: AirlineDataset;
  appliedActionsCount: number;
  onRequestReset: () => void;
  onOpenDatasetModal: () => void;
  feedback: FeedbackNotice | null;
  onDismissFeedback: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'network', label: 'NETWORK', title: 'India Network Workspace', icon: Compass },
  { id: 'disruption', label: 'SIMULATE', title: 'Disruption Simulation Builder', icon: SlidersHorizontal },
  { id: 'cascade', label: 'CASCADE', title: 'Propagation & Rotation Cascade', icon: GitBranch },
  { id: 'passengers', label: 'PASSENGERS', title: 'Passenger Impact & Schedule Ledger', icon: Users },
  { id: 'recovery', label: 'RECOVERY', title: 'Recovery Decision Workspace', icon: ShieldCheck },
  { id: 'analytics', label: 'REPORTS', title: 'Before/After & Station Reports', icon: BarChart3 },
];

export const LayoutShell: React.FC<LayoutShellProps> = ({
  activeSection,
  onNavigate,
  scenario,
  simulation,
  dataset,
  appliedActionsCount,
  onRequestReset,
  onOpenDatasetModal,
  feedback,
  onDismissFeedback,
  children,
}) => {
  const { metrics } = simulation;

  const networkStatusLabel =
    metrics.networkHealthPct >= 85
      ? 'Nominal'
      : metrics.networkHealthPct >= 60
      ? 'Strained'
      : 'Critical';

  const statusColor =
    metrics.networkHealthPct >= 85
      ? 'text-[#75B798]'
      : metrics.networkHealthPct >= 60
      ? 'text-[#F2A93B]'
      : 'text-[#E05D5D]';

  return (
    <div className="min-h-screen lg:h-screen bg-[#0B0E12] text-[#E8EDF2] flex flex-col lg:overflow-hidden">
      {/* 1. Slim 56px Top System Bar */}
      <header className="h-14 shrink-0 bg-[#10151B] border-b border-[#28313B] px-4 flex items-center justify-between gap-4 z-30">
        {/* Left: DOMINO SKY Wordmark + Aviation Symbol */}
        <button
          type="button"
          onClick={() => onNavigate('network')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 group"
        >
          <span className="h-7 w-7 rounded bg-[#151B22] border border-[#28313B] flex items-center justify-center group-hover:border-[#5EC8D8] transition-colors">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                d="M3 17 C8 10, 14 8, 21 6"
                fill="none"
                stroke="#5EC8D8"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="3" cy="17" r="2" fill="#F2A93B" />
              <circle cx="12" cy="10.5" r="1.7" fill="#E8EDF2" />
              <circle cx="21" cy="6" r="2" fill="#5EC8D8" />
            </svg>
          </span>
          <span className="font-display text-sm font-semibold tracking-wide text-[#E8EDF2]">
            DOMINO SKY
          </span>
        </button>

        {/* Center: INDIA NETWORK | SIMULATION WORKSPACE */}
        <div className="hidden md:flex items-center gap-2.5 text-[11px] font-mono tracking-wider text-[#8B98A7] uppercase whitespace-nowrap">
          <span className="text-[#E8EDF2] font-medium">INDIA NETWORK</span>
          <span className="text-[#28313B]">|</span>
          <span>SIMULATION WORKSPACE</span>
        </div>

        {/* Right: DEMO DATA badge, Network status, Reset control, Compact utility icons */}
        <div className="flex items-center gap-2.5 shrink-0 text-xs">
          <button
            type="button"
            onClick={onOpenDatasetModal}
            className="px-2 py-1 rounded border border-[#28313B] bg-[#151B22] hover:border-[#5EC8D8] font-mono text-[11px] text-[#8B98A7] hover:text-[#E8EDF2] transition-colors whitespace-nowrap"
            title="Inspect or import airline schedule dataset"
          >
            {dataset.metadata.isDemo ? 'DEMO DATA' : 'OFFICIAL DATA'}
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#28313B] bg-[#151B22] whitespace-nowrap">
            <Activity className={`h-3.5 w-3.5 ${statusColor}`} />
            <span className={`font-medium ${statusColor}`}>{networkStatusLabel}</span>
          </div>

          <button
            type="button"
            disabled={!scenario && appliedActionsCount === 0}
            onClick={onRequestReset}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#28313B] bg-[#151B22] hover:border-[#F2A93B] hover:text-[#F2A93B] disabled:opacity-40 disabled:hover:border-[#28313B] disabled:hover:text-[#8B98A7] disabled:cursor-not-allowed text-xs font-medium text-[#E8EDF2] transition-colors whitespace-nowrap"
            title="Reset active disruption and recovery actions"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>

          <div className="hidden sm:flex items-center gap-1 border-l border-[#28313B] pl-2">
            <button
              type="button"
              onClick={onOpenDatasetModal}
              className="p-1.5 rounded text-[#8B98A7] hover:text-[#E8EDF2] hover:bg-[#151B22] transition-colors"
              aria-label="Dataset Inspector"
              title="Dataset Inspector & JSON Import"
            >
              <Database className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className={`p-1.5 rounded transition-colors ${
                activeSection === 'analytics'
                  ? 'text-[#5EC8D8] bg-[#151B22]'
                  : 'text-[#8B98A7] hover:text-[#E8EDF2] hover:bg-[#151B22]'
              }`}
              aria-label="Station Reports"
              title="Open Station & Fleet Reports"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Compact Navigation Bar (< lg) */}
      <nav
        aria-label="Mobile workspace navigation"
        className="lg:hidden grid grid-cols-3 sm:grid-cols-6 border-b border-[#28313B] bg-[#0B0E12]"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`py-2 px-1 flex flex-col items-center justify-center gap-1 text-[10px] font-mono tracking-wide border-b-2 transition-colors ${
                isActive
                  ? 'border-[#5EC8D8] bg-[#151B22] text-[#E8EDF2]'
                  : 'border-transparent text-[#8B98A7] hover:text-[#E8EDF2]'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#5EC8D8]' : 'text-current'}`} />
              <span className="truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Middle Workstation Shell: Fixed 72px Left Rail + Main Workspace */}
      <div className="flex-1 flex min-h-0">
        {/* 2. Fixed Narrow 72px Vertical Navigation Rail (Desktop) */}
        <aside
          aria-label="Workstation navigation rail"
          className="hidden lg:flex w-[72px] shrink-0 bg-[#0B0E12] border-r border-[#28313B] flex-col items-center justify-between py-2.5 select-none"
        >
          <nav className="w-full flex flex-col items-center gap-1 px-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  title={item.title}
                  className={`relative w-full py-2.5 px-1 rounded flex flex-col items-center justify-center gap-1.5 transition-colors ${
                    isActive
                      ? 'bg-[#151B22] text-[#E8EDF2]'
                      : 'text-[#8B98A7] hover:bg-[#10151B] hover:text-[#E8EDF2]'
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#5EC8D8] rounded-r"
                    />
                  )}
                  <Icon
                    className={`h-4 w-4 ${isActive ? 'text-[#5EC8D8]' : 'text-current'}`}
                  />
                  <span className="text-[9px] font-mono font-medium tracking-wider leading-none">
                    {item.label}
                  </span>
                  {item.id === 'recovery' && scenario && appliedActionsCount > 0 && (
                    <span className="font-mono text-[9px] text-[#75B798] leading-none tabular-nums">
                      {appliedActionsCount} ON
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="w-full px-1.5 flex flex-col items-center gap-1.5 pt-2 border-t border-[#28313B]">
            <button
              type="button"
              onClick={onOpenDatasetModal}
              title="Inspect Dataset"
              className="w-full py-2 rounded flex flex-col items-center justify-center gap-1 text-[#8B98A7] hover:text-[#E8EDF2] hover:bg-[#151B22] transition-colors"
            >
              <Database className="h-3.5 w-3.5 text-[#5EC8D8]" />
              <span className="text-[9px] font-mono tracking-wider leading-none">DATA</span>
            </button>
          </div>
        </aside>

        {/* Main Column: Feedback + Active View + Slim Bottom Analytical Strip */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#10151B] min-h-0">
          {feedback && (
            <div
              role="status"
              className={`shrink-0 px-4 py-2 border-b flex items-center justify-between gap-3 text-xs ${
                feedback.type === 'success'
                  ? 'bg-[#12221D] border-[#2C5446] text-[#75B798]'
                  : feedback.type === 'warning'
                  ? 'bg-[#221A10] border-[#523B1B] text-[#F2A93B]'
                  : 'bg-[#151B22] border-[#28313B] text-[#E8EDF2]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Info className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={onDismissFeedback}
                className="p-0.5 rounded hover:bg-[#28313B]/60 shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Active View Canvas */}
          <main className="flex-1 min-h-0 flex flex-col overflow-y-auto lg:overflow-hidden">
            {children}
          </main>

          {/* 5. Slim Bottom Analytical Metrics Strip */}
          <footer className="shrink-0 bg-[#0B0E12] border-t border-[#28313B] px-4 py-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono tabular-nums">
              <div className="flex items-center gap-2">
                <span className="font-sans text-[11px] uppercase tracking-wider text-[#8B98A7]">
                  Network Health
                </span>
                <span className={`font-semibold ${statusColor}`}>
                  {metrics.networkHealthPct}%
                </span>
              </div>

              <span className="text-[#28313B] hidden sm:inline">|</span>

              <div className="flex items-center gap-2">
                <span className="font-sans text-[11px] uppercase tracking-wider text-[#8B98A7]">
                  Delayed Flights
                </span>
                <span
                  className={
                    metrics.delayedFlights > 0 ? 'font-semibold text-[#F2A93B]' : 'text-[#E8EDF2]'
                  }
                >
                  {metrics.delayedFlights}
                </span>
                <span className="text-[#8B98A7]">/ {metrics.totalFlights}</span>
              </div>

              <span className="text-[#28313B] hidden sm:inline">|</span>

              <div className="flex items-center gap-2">
                <span className="font-sans text-[11px] uppercase tracking-wider text-[#8B98A7]">
                  Cancelled Flights
                </span>
                <span
                  className={
                    metrics.cancelledFlights > 0 ? 'font-semibold text-[#E05D5D]' : 'text-[#E8EDF2]'
                  }
                >
                  {metrics.cancelledFlights}
                </span>
              </div>

              <span className="text-[#28313B] hidden sm:inline">|</span>

              <div className="flex items-center gap-2">
                <span className="font-sans text-[11px] uppercase tracking-wider text-[#8B98A7]">
                  Delay Minutes
                </span>
                <span
                  className={
                    metrics.totalDelayMin > 0 ? 'font-semibold text-[#F2A93B]' : 'text-[#E8EDF2]'
                  }
                >
                  {metrics.totalDelayMin.toLocaleString()}m
                </span>
                {metrics.totalDelayMin > 0 && (
                  <span className="text-[#8B98A7] hidden md:inline">
                    ({formatDuration(metrics.totalDelayMin)})
                  </span>
                )}
              </div>

              <span className="text-[#28313B] hidden sm:inline">|</span>

              <div className="flex items-center gap-2">
                <span className="font-sans text-[11px] uppercase tracking-wider text-[#8B98A7]">
                  Affected Passengers
                </span>
                <span
                  className={
                    metrics.affectedPassengers > 0 ? 'font-semibold text-[#F2A93B]' : 'text-[#E8EDF2]'
                  }
                >
                  {metrics.affectedPassengers.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Right Status Readout */}
            <div className="flex items-center gap-3 text-[11px] font-mono text-[#8B98A7] tabular-nums">
              {scenario ? (
                <span>
                  ACTIVE:{' '}
                  <span className="text-[#F2A93B] font-medium">
                    {scenario.airportCode} {formatMinutesToHHMM(scenario.startTimeMin)} (
                    {formatDuration(scenario.durationMin)})
                  </span>
                  {appliedActionsCount > 0 && (
                    <span className="text-[#75B798] ml-2">
                      · {appliedActionsCount} RECOVERY APPLIED
                    </span>
                  )}
                </span>
              ) : (
                <span>BASELINE SCHEDULE · {metrics.totalAirports} INDIAN STATIONS</span>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
