import { useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_DATASET } from './data/demoDataset';
import { runSimulation } from './engine/simulationEngine';
import {
  computeBeforeAfterComparison,
  generateRecoveryRecommendations,
} from './engine/recoveryEngine';
import { AirlineDataset, DisruptionScenario, RecoveryAction } from './types/aviation';
import { ReplayStage } from './types/replay';
import { FeedbackNotice, LayoutShell, NavSection } from './components/LayoutShell';
import { NetworkAtlasView } from './components/views/NetworkAtlasView';
import { DisruptionSimulatorView } from './components/views/DisruptionSimulatorView';
import { CascadePropagationView } from './components/views/CascadePropagationView';
import { RecoveryLabView } from './components/views/RecoveryLabView';
import { PassengerImpactView } from './components/views/PassengerImpactView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { DatasetModal } from './components/DatasetModal';
import { ConfirmResetModal } from './components/ConfirmResetModal';
import { formatDuration, formatMinutesToHHMM } from './utils/time';

export default function App() {
  const [dataset, setDataset] = useState<AirlineDataset>(DEMO_DATASET);
  const [activeSection, setActiveSection] = useState<NavSection>('network');
  const [scenario, setScenario] = useState<DisruptionScenario | null>(null);
  const [appliedActions, setAppliedActions] = useState<RecoveryAction[]>([]);
  const [selectedAirportCode, setSelectedAirportCode] = useState<string | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null);
  const [replayStage, setReplayStage] = useState<ReplayStage>(5);
  const [isReplaying, setIsReplaying] = useState(false);
  const [datasetModalOpen, setDatasetModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);

  const simTimerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  const showFeedback = (notice: FeedbackNotice) => {
    setFeedback(notice);
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
    }, 6000);
  };

  useEffect(() => {
    return () => {
      if (simTimerRef.current) window.clearTimeout(simTimerRef.current);
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  // 1. Unrecovered disrupted baseline (or nominal baseline if scenario is null)
  const disruptedBaseline = useMemo(
    () => runSimulation(dataset, scenario, []),
    [dataset, scenario]
  );

  // 2. Current simulation state with any active recovery actions applied
  const currentSimulation = useMemo(() => {
    if (!scenario || appliedActions.length === 0) {
      return disruptedBaseline;
    }
    return runSimulation(dataset, scenario, appliedActions, disruptedBaseline);
  }, [dataset, scenario, appliedActions, disruptedBaseline]);

  // 3. Deterministically evaluated recovery recommendations for the current state
  const recommendations = useMemo(
    () =>
      generateRecoveryRecommendations(
        dataset,
        scenario,
        disruptedBaseline,
        appliedActions
      ),
    [dataset, scenario, disruptedBaseline, appliedActions]
  );

  // 4. Before-and-after recovery comparison metrics
  const comparison = useMemo(
    () => computeBeforeAfterComparison(disruptedBaseline, currentSimulation),
    [disruptedBaseline, currentSimulation]
  );

  const handleApplyScenario = (nextScenario: DisruptionScenario) => {
    if (simTimerRef.current) window.clearTimeout(simTimerRef.current);
    setIsSimulating(true);
    setScenario(nextScenario);
    setAppliedActions([]);
    setSelectedAirportCode(nextScenario.airportCode);
    setSelectedFlightId(null);
    setSelectedStateName(null);
    setReplayStage(1);
    setIsReplaying(true);

    simTimerRef.current = window.setTimeout(() => {
      setIsSimulating(false);
      const typeLabel =
        nextScenario.type === 'closure'
          ? 'Airport Closure'
          : nextScenario.type === 'thunderstorm'
          ? 'Severe Weather Slowdown'
          : 'Runway Restriction';
      showFeedback({
        type: 'warning',
        message: `Simulation active: ${nextScenario.airportCode} ${typeLabel} (${formatMinutesToHHMM(
          nextScenario.startTimeMin
        )}, ${formatDuration(nextScenario.durationMin)}). Replaying cascade across India.`,
      });
    }, 220);
  };

  const handleConfirmResetSimulation = () => {
    setResetModalOpen(false);
    setScenario(null);
    setAppliedActions([]);
    setSelectedAirportCode(null);
    setSelectedFlightId(null);
    setSelectedStateName(null);
    setReplayStage(5);
    setIsReplaying(false);
    showFeedback({
      type: 'info',
      message: 'Network reset: all Indian flights, aircraft rotations, and hub connections returned to baseline.',
    });
  };

  const handleApplyRecoveryAction = (action: RecoveryAction) => {
    if (appliedActions.some((a) => a.id === action.id)) return;
    setAppliedActions((prev) => [...prev, action]);
    setReplayStage(6);
    setIsReplaying(false);
    showFeedback({
      type: 'success',
      message: `Recovery applied: "${action.title}". Before-and-after metrics and India map updated.`,
    });
  };

  const handleRemoveRecoveryAction = (actionId: string) => {
    const removed = appliedActions.find((a) => a.id === actionId);
    const nextCount = appliedActions.filter((a) => a.id !== actionId).length;
    setAppliedActions((prev) => prev.filter((a) => a.id !== actionId));
    if (nextCount === 0) {
      setReplayStage(5);
    }
    showFeedback({
      type: 'info',
      message: removed
        ? `Removed recovery decision: "${removed.title}".`
        : 'Recovery decision removed.',
    });
  };

  const handleClearRecoveryActions = () => {
    setAppliedActions([]);
    setReplayStage(5);
    setIsReplaying(false);
    showFeedback({
      type: 'info',
      message: 'Cleared all active recovery decisions. Showing unrecovered disruption cascade.',
    });
  };

  const handleLoadDataset = (newDataset: AirlineDataset) => {
    setDataset(newDataset);
    setScenario(null);
    setAppliedActions([]);
    setSelectedAirportCode(null);
    setSelectedFlightId(null);
    setSelectedStateName(null);
    setReplayStage(5);
    setIsReplaying(false);
    showFeedback({
      type: 'success',
      message: `Loaded dataset "${newDataset.metadata.label}" (${newDataset.airports.length} airports, ${newDataset.flights.length} flights).`,
    });
  };

  const handleInspectFlightOnMap = (flightId: string) => {
    setSelectedFlightId(flightId);
    setSelectedAirportCode(null);
    setSelectedStateName(null);
    if (appliedActions.length > 0) {
      setReplayStage(6);
      setIsReplaying(false);
    }
    setActiveSection('network');
  };

  const handleInspectAirportOnMap = (code: string) => {
    setSelectedAirportCode(code);
    setSelectedFlightId(null);
    setSelectedStateName(null);
    setActiveSection('network');
  };

  const scenarioLabel = scenario
    ? `${scenario.airportCode} ${
        scenario.type === 'closure'
          ? 'Airport Closure'
          : scenario.type === 'thunderstorm'
          ? 'Severe Weather'
          : 'Runway Restriction'
      } at ${formatMinutesToHHMM(scenario.startTimeMin)}`
    : '';

  return (
    <LayoutShell
      activeSection={activeSection}
      onNavigate={setActiveSection}
      scenario={scenario}
      simulation={currentSimulation}
      dataset={dataset}
      appliedActionsCount={appliedActions.length}
      onRequestReset={() => setResetModalOpen(true)}
      onOpenDatasetModal={() => setDatasetModalOpen(true)}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
    >
      {activeSection === 'network' && (
        <NetworkAtlasView
          airports={dataset.airports}
          scenario={scenario}
          disruptedBaseline={disruptedBaseline}
          currentSimulation={currentSimulation}
          recommendations={recommendations}
          appliedActions={appliedActions}
          isSimulating={isSimulating}
          isDemoDataset={dataset.metadata.isDemo}
          selectedAirportCode={selectedAirportCode}
          selectedFlightId={selectedFlightId}
          selectedStateName={selectedStateName}
          replayStage={replayStage}
          isReplaying={isReplaying}
          onSelectAirport={setSelectedAirportCode}
          onSelectFlight={setSelectedFlightId}
          onSelectState={setSelectedStateName}
          onChangeReplayStage={(nextStage) => setReplayStage(nextStage)}
          onToggleReplayPlay={() => {
            if (!scenario) return;
            if (!isReplaying && replayStage === 6) {
              setReplayStage(1);
            }
            setIsReplaying((prev) => !prev);
          }}
          onReplayFromStart={() => {
            if (!scenario) return;
            setReplayStage(1);
            setIsReplaying(true);
          }}
          onApplyScenario={handleApplyScenario}
          onOpenCascade={() => setActiveSection('cascade')}
          onOpenRecoveryLab={() => setActiveSection('recovery')}
        />
      )}

      {activeSection === 'disruption' && (
        <DisruptionSimulatorView
          airports={dataset.airports}
          scenario={scenario}
          disruptedBaseline={disruptedBaseline}
          currentSimulation={currentSimulation}
          recommendations={recommendations}
          appliedActions={appliedActions}
          isSimulating={isSimulating}
          onApplyScenario={handleApplyScenario}
          onInspectFlightOnMap={handleInspectFlightOnMap}
          onInspectAirportOnMap={handleInspectAirportOnMap}
          onOpenCascade={() => setActiveSection('cascade')}
          onOpenRecovery={() => setActiveSection('recovery')}
        />
      )}

      {activeSection === 'cascade' && (
        <CascadePropagationView
          dataset={dataset}
          scenario={scenario}
          simulation={currentSimulation}
          onInspectFlightOnMap={handleInspectFlightOnMap}
          onInspectAirportOnMap={handleInspectAirportOnMap}
          onOpenNetwork={() => setActiveSection('network')}
          onOpenRecovery={() => setActiveSection('recovery')}
        />
      )}

      {activeSection === 'passengers' && (
        <PassengerImpactView
          airportsList={dataset.airports}
          simulation={currentSimulation}
          selectedFlightId={selectedFlightId}
          onSelectFlight={setSelectedFlightId}
          onInspectFlightOnMap={handleInspectFlightOnMap}
        />
      )}

      {activeSection === 'recovery' && (
        <RecoveryLabView
          scenario={scenario}
          disruptedBaseline={disruptedBaseline}
          recoveredSimulation={currentSimulation}
          comparison={comparison}
          recommendations={recommendations}
          appliedActions={appliedActions}
          onApplyAction={handleApplyRecoveryAction}
          onRemoveAction={handleRemoveRecoveryAction}
          onClearActions={handleClearRecoveryActions}
          onInspectFlightOnMap={handleInspectFlightOnMap}
          onBackToAtlas={() => {
            if (appliedActions.length > 0) setReplayStage(6);
            setActiveSection('network');
          }}
        />
      )}

      {activeSection === 'analytics' && (
        <AnalyticsView
          dataset={dataset}
          scenario={scenario}
          simulation={currentSimulation}
          comparison={comparison}
          appliedActions={appliedActions}
          onSelectAirport={handleInspectAirportOnMap}
          onOpenDatasetModal={() => setDatasetModalOpen(true)}
        />
      )}

      {datasetModalOpen && (
        <DatasetModal
          dataset={dataset}
          onClose={() => setDatasetModalOpen(false)}
          onLoadDataset={handleLoadDataset}
        />
      )}

      <ConfirmResetModal
        open={resetModalOpen}
        scenarioLabel={scenarioLabel}
        appliedActionsCount={appliedActions.length}
        totalFlightsCount={dataset.flights.length}
        onCancel={() => setResetModalOpen(false)}
        onConfirm={handleConfirmResetSimulation}
      />
    </LayoutShell>
  );
}
