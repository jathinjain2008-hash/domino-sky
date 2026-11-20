export type DisruptionType = 'closure' | 'thunderstorm' | 'runway_restriction';

export type FlightStatus = 'on_time' | 'delayed' | 'cancelled' | 'recovered';

export type RecoveryActionType =
  | 'assign_spare'
  | 'swap_aircraft'
  | 'prioritize_turnaround'
  | 'hold_for_connections'
  | 'cancel_flight';

export interface Airport {
  code: string;
  name: string;
  city: string;
  state?: string;
  region: string;
  lat: number;
  lon: number;
  gates: number;
  runways: number;
  isHub: boolean;
}

export interface Aircraft {
  id: string;
  tailNumber: string;
  model: string;
  capacity: number;
  baseAirport: string;
  minTurnaroundMin: number;
  isSpare: boolean;
}

export interface CrewAssignment {
  id: string;
  callsign: string;
  captain: string;
  firstOfficer: string;
  baseAirport: string;
  dutyStartMin: number;
  maxDutyMin: number;
}

export interface Flight {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  scheduledDepMin: number;
  scheduledArrMin: number;
  aircraftId: string;
  crewId: string;
  passengerCount: number;
  rotationOrder: number;
}

export interface PassengerConnection {
  id: string;
  fromFlightId: string;
  toFlightId: string;
  airportCode: string;
  passengerCount: number;
  minConnectTimeMin: number;
}

export interface DatasetMetadata {
  label: string;
  isDemo: boolean;
  version: string;
  source: string;
  notes: string;
}

export interface AirlineDataset {
  metadata: DatasetMetadata;
  airports: Airport[];
  aircraft: Aircraft[];
  crew: CrewAssignment[];
  flights: Flight[];
  connections: PassengerConnection[];
}

export interface DisruptionScenario {
  id: string;
  airportCode: string;
  type: DisruptionType;
  startTimeMin: number;
  durationMin: number;
}

export interface FlightSimState extends Flight {
  status: FlightStatus;
  actualDepMin: number;
  actualArrMin: number;
  depDelayMin: number;
  arrDelayMin: number;
  effectiveAircraftId: string;
  delayCause: string | null;
  propagationChain: string[];
  affectedByRotation: boolean;
  affectedByCrewDuty: boolean;
  recoveredByActionIds: string[];
  missedInboundConnections: number;
  outboundPassengersSaved: number;
}

export interface ConnectionImpact {
  connection: PassengerConnection;
  fromFlightNumber: string;
  toFlightNumber: string;
  fromOrigin: string;
  toDestination: string;
  status: 'intact' | 'missed' | 'saved';
  availableConnectMin: number;
  requiredConnectMin: number;
  affectedPassengers: number;
}

export interface AirportImpact {
  code: string;
  name: string;
  city: string;
  isHub: boolean;
  totalFlights: number;
  onTimeFlights: number;
  delayedFlights: number;
  cancelledFlights: number;
  recoveredFlights: number;
  totalDelayMin: number;
  affectedPassengers: number;
  isPrimaryDisrupted: boolean;
  severity: 'normal' | 'moderate' | 'severe';
}

export interface TimelineEvent {
  id: string;
  timeMin: number;
  category: 'disruption' | 'rotation' | 'crew' | 'connection' | 'cancellation' | 'recovery';
  severity: 'info' | 'warning' | 'critical' | 'recovered';
  airportCode: string;
  flightId?: string;
  flightNumber?: string;
  title: string;
  detail: string;
  impactCount?: number;
}

export interface SimulationMetrics {
  totalAirports: number;
  totalFlights: number;
  totalAircraft: number;
  activeAircraft: number;
  spareAircraft: number;
  onTimeFlights: number;
  delayedFlights: number;
  cancelledFlights: number;
  recoveredFlights: number;
  totalDelayMin: number;
  avgDelayMin: number;
  maxDelayMin: number;
  affectedPassengers: number;
  passengersDelayed: number;
  passengersCancelled: number;
  missedConnections: number;
  missedConnectionEvents: number;
  networkHealthPct: number;
}

export interface SimulationResult {
  scenario: DisruptionScenario | null;
  flights: FlightSimState[];
  connections: ConnectionImpact[];
  airports: Record<string, AirportImpact>;
  events: TimelineEvent[];
  metrics: SimulationMetrics;
  assumptions: string[];
}

export interface RecoveryAction {
  id: string;
  type: RecoveryActionType;
  title: string;
  subtitle: string;
  description: string;
  airportCode: string;
  targetFlightId: string;
  secondaryFlightId?: string;
  spareAircraftId?: string;
  holdMinutes?: number;
  turnaroundSavingsMin?: number;
  tradeoff: string;
}

export interface EvaluatedRecoveryAction extends RecoveryAction {
  impact: {
    delayedFlightsReduced: number;
    cancelledFlightsReduced: number;
    delayMinutesSaved: number;
    affectedPassengersSaved: number;
    missedConnectionsSaved: number;
    networkHealthGainPct: number;
  };
  score: number;
}

export interface ComparisonMetrics {
  delayedFlightsBefore: number;
  delayedFlightsAfter: number;
  totalDelayMinBefore: number;
  totalDelayMinAfter: number;
  affectedPassengersBefore: number;
  affectedPassengersAfter: number;
  missedConnectionsBefore: number;
  missedConnectionsAfter: number;
  cancelledFlightsBefore: number;
  cancelledFlightsAfter: number;
  networkRecoveryPct: number;
  networkHealthBefore: number;
  networkHealthAfter: number;
  aircraftUtilisationBefore: number;
  aircraftUtilisationAfter: number;
}
