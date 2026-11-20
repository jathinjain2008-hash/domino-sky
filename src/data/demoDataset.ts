import {
  Aircraft,
  AirlineDataset,
  Airport,
  CrewAssignment,
  Flight,
  PassengerConnection,
} from '../types/aviation';

export const DEMO_AIRPORTS: Airport[] = [
  { code: 'DEL', name: 'Indira Gandhi Intl', city: 'New Delhi', state: 'Delhi', region: 'North', lat: 28.5562, lon: 77.1000, gates: 44, runways: 4, isHub: true },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj Intl', city: 'Mumbai', state: 'Maharashtra', region: 'West', lat: 19.0896, lon: 72.8656, gates: 38, runways: 2, isHub: true },
  { code: 'BLR', name: 'Kempegowda Intl', city: 'Bengaluru', state: 'Karnataka', region: 'South', lat: 13.1986, lon: 77.7066, gates: 32, runways: 2, isHub: true },
  { code: 'HYD', name: 'Rajiv Gandhi Intl', city: 'Hyderabad', state: 'Telangana', region: 'South', lat: 17.2403, lon: 78.4294, gates: 26, runways: 2, isHub: true },
  { code: 'MAA', name: 'Chennai Intl', city: 'Chennai', state: 'Tamil Nadu', region: 'South', lat: 12.9941, lon: 80.1709, gates: 24, runways: 2, isHub: false },
  { code: 'CCU', name: 'Netaji Subhas Chandra Bose Intl', city: 'Kolkata', state: 'West Bengal', region: 'East', lat: 22.6547, lon: 88.4467, gates: 22, runways: 2, isHub: false },
  { code: 'AMD', name: 'Sardar Vallabhbhai Patel Intl', city: 'Ahmedabad', state: 'Gujarat', region: 'West', lat: 23.0772, lon: 72.6347, gates: 16, runways: 1, isHub: false },
  { code: 'PNQ', name: 'Pune Intl', city: 'Pune', state: 'Maharashtra', region: 'West', lat: 18.5822, lon: 73.9197, gates: 12, runways: 1, isHub: false },
  { code: 'GOI', name: 'Goa Dabolim Intl', city: 'Vasco da Gama', state: 'Goa', region: 'West', lat: 15.3808, lon: 73.8314, gates: 12, runways: 1, isHub: false },
  { code: 'COK', name: 'Cochin Intl', city: 'Kochi', state: 'Kerala', region: 'South', lat: 10.1520, lon: 76.4019, gates: 16, runways: 1, isHub: false },
  { code: 'JAI', name: 'Jaipur Intl', city: 'Jaipur', state: 'Rajasthan', region: 'North', lat: 26.8242, lon: 75.8122, gates: 12, runways: 1, isHub: false },
  { code: 'LKO', name: 'Chaudhary Charan Singh Intl', city: 'Lucknow', state: 'Uttar Pradesh', region: 'North', lat: 26.7606, lon: 80.8893, gates: 14, runways: 1, isHub: false },
  { code: 'ATQ', name: 'Sri Guru Ram Dass Jee Intl', city: 'Amritsar', state: 'Punjab', region: 'North', lat: 31.7096, lon: 74.7973, gates: 10, runways: 1, isHub: false },
  { code: 'SXR', name: 'Sheikh ul-Alam Intl', city: 'Srinagar', state: 'Jammu and Kashmir', region: 'North', lat: 33.9871, lon: 74.7742, gates: 10, runways: 1, isHub: false },
  { code: 'BBI', name: 'Biju Patnaik Intl', city: 'Bhubaneswar', state: 'Odisha', region: 'East', lat: 20.2444, lon: 85.8178, gates: 12, runways: 1, isHub: false },
  { code: 'GAU', name: 'Lokpriya Gopinath Bordoloi Intl', city: 'Guwahati', state: 'Assam', region: 'Northeast', lat: 26.1061, lon: 91.5859, gates: 14, runways: 1, isHub: false },
];

export const DEMO_AIRCRAFT: Aircraft[] = [
  { id: 'AC-01', tailNumber: 'VT-DSA', model: 'Airbus A321neo', capacity: 222, baseAirport: 'DEL', minTurnaroundMin: 45, isSpare: false },
  { id: 'AC-02', tailNumber: 'VT-DSB', model: 'Airbus A320neo', capacity: 180, baseAirport: 'DEL', minTurnaroundMin: 40, isSpare: false },
  { id: 'AC-03', tailNumber: 'VT-DSC', model: 'Boeing 737 MAX 8', capacity: 178, baseAirport: 'BOM', minTurnaroundMin: 45, isSpare: false },
  { id: 'AC-04', tailNumber: 'VT-DSD', model: 'Airbus A320neo', capacity: 180, baseAirport: 'BOM', minTurnaroundMin: 40, isSpare: false },
  { id: 'AC-05', tailNumber: 'VT-DSE', model: 'Airbus A321neo', capacity: 222, baseAirport: 'BLR', minTurnaroundMin: 45, isSpare: false },
  { id: 'AC-06', tailNumber: 'VT-DSF', model: 'Airbus A320neo', capacity: 180, baseAirport: 'BLR', minTurnaroundMin: 35, isSpare: false },
  { id: 'AC-07', tailNumber: 'VT-DSG', model: 'Boeing 737 MAX 8', capacity: 178, baseAirport: 'HYD', minTurnaroundMin: 45, isSpare: false },
  { id: 'AC-08', tailNumber: 'VT-DSH', model: 'Airbus A220-300', capacity: 145, baseAirport: 'HYD', minTurnaroundMin: 35, isSpare: false },
  { id: 'AC-09', tailNumber: 'VT-DSI', model: 'Airbus A320neo', capacity: 180, baseAirport: 'CCU', minTurnaroundMin: 45, isSpare: false },
  { id: 'AC-10', tailNumber: 'VT-DSJ', model: 'Airbus A320neo', capacity: 180, baseAirport: 'MAA', minTurnaroundMin: 40, isSpare: false },
  { id: 'AC-11', tailNumber: 'VT-DSK', model: 'Airbus A321neo', capacity: 222, baseAirport: 'AMD', minTurnaroundMin: 45, isSpare: false },
  { id: 'AC-12', tailNumber: 'VT-DSL', model: 'Airbus A220-300', capacity: 145, baseAirport: 'COK', minTurnaroundMin: 35, isSpare: false },
  { id: 'AC-13', tailNumber: 'VT-DSM', model: 'Airbus A320neo', capacity: 180, baseAirport: 'PNQ', minTurnaroundMin: 40, isSpare: false },
  { id: 'AC-14', tailNumber: 'VT-DSN', model: 'Boeing 737 MAX 8', capacity: 178, baseAirport: 'GAU', minTurnaroundMin: 45, isSpare: false },
  // 2 Standby Spare Aircraft (Total Fleet = 16 Aircraft)
  { id: 'SP-01', tailNumber: 'VT-SP1', model: 'Airbus A320neo', capacity: 180, baseAirport: 'DEL', minTurnaroundMin: 40, isSpare: true },
  { id: 'SP-02', tailNumber: 'VT-SP2', model: 'Airbus A320neo', capacity: 180, baseAirport: 'BOM', minTurnaroundMin: 40, isSpare: true },
];

// Realistic Indian domestic block times (minutes) between airport pairs
const BLOCK_MINUTES: Record<string, number> = {
  'DEL-BOM': 130, 'BOM-DEL': 135,
  'DEL-BLR': 165, 'BLR-DEL': 170,
  'DEL-HYD': 135, 'HYD-DEL': 140,
  'DEL-MAA': 170, 'MAA-DEL': 175,
  'DEL-CCU': 135, 'CCU-DEL': 145,
  'DEL-AMD': 95,  'AMD-DEL': 95,
  'DEL-PNQ': 125, 'PNQ-DEL': 130,
  'DEL-GOI': 155, 'GOI-DEL': 160,
  'DEL-COK': 195, 'COK-DEL': 200,
  'DEL-JAI': 60,  'JAI-DEL': 60,
  'DEL-LKO': 75,  'LKO-DEL': 75,
  'DEL-ATQ': 75,  'ATQ-DEL': 75,
  'DEL-SXR': 90,  'SXR-DEL': 90,
  'DEL-BBI': 135, 'BBI-DEL': 140,
  'DEL-GAU': 155, 'GAU-DEL': 165,
  'BOM-BLR': 105, 'BLR-BOM': 105,
  'BOM-HYD': 85,  'HYD-BOM': 85,
  'BOM-MAA': 115, 'MAA-BOM': 115,
  'BOM-CCU': 160, 'CCU-BOM': 165,
  'BOM-AMD': 75,  'AMD-BOM': 75,
  'BOM-PNQ': 55,  'PNQ-BOM': 55,
  'BOM-GOI': 70,  'GOI-BOM': 70,
  'BOM-COK': 115, 'COK-BOM': 120,
  'BOM-JAI': 110, 'JAI-BOM': 115,
  'BOM-LKO': 130, 'LKO-BOM': 135,
  'BOM-BBI': 135, 'BBI-BOM': 140,
  'BOM-GAU': 195, 'GAU-BOM': 205,
  'BLR-HYD': 75,  'HYD-BLR': 75,
  'BLR-MAA': 60,  'MAA-BLR': 60,
  'BLR-CCU': 155, 'CCU-BLR': 160,
  'BLR-AMD': 130, 'AMD-BLR': 135,
  'BLR-PNQ': 90,  'PNQ-BLR': 90,
  'BLR-GOI': 75,  'GOI-BLR': 75,
  'BLR-COK': 70,  'COK-BLR': 70,
  'BLR-JAI': 155, 'JAI-BLR': 160,
  'BLR-BBI': 125, 'BBI-BLR': 130,
  'BLR-GAU': 185, 'GAU-BLR': 195,
  'HYD-MAA': 75,  'MAA-HYD': 75,
  'HYD-CCU': 125, 'CCU-HYD': 130,
  'HYD-AMD': 105, 'AMD-HYD': 105,
  'HYD-PNQ': 75,  'PNQ-HYD': 75,
  'HYD-GOI': 80,  'GOI-HYD': 80,
  'HYD-COK': 105, 'COK-HYD': 105,
  'HYD-JAI': 125, 'JAI-HYD': 130,
  'HYD-BBI': 95,  'BBI-HYD': 95,
  'CCU-GAU': 75,  'GAU-CCU': 75,
  'CCU-BBI': 70,  'BBI-CCU': 70,
  'CCU-MAA': 140, 'MAA-CCU': 140,
  'CCU-LKO': 110, 'LKO-CCU': 110,
  'MAA-COK': 75,  'COK-MAA': 75,
  'MAA-BBI': 110, 'BBI-MAA': 110,
  'AMD-JAI': 75,  'JAI-AMD': 75,
  'AMD-GOI': 105, 'GOI-AMD': 105,
  'SXR-ATQ': 60,  'ATQ-SXR': 60,
  'JAI-LKO': 70,  'LKO-JAI': 70,
};

function getBlockMin(origin: string, dest: string): number {
  return BLOCK_MINUTES[`${origin}-${dest}`] ?? 120;
}

interface RotationBlueprint {
  aircraftId: string;
  startMin: number;
  stops: [string, string, string, string, string, string];
  gaps: [number, number, number, number];
  flightNumbers: [string, string, string, string, string];
  basePax: number;
}

// 14 Active Aircraft x 5 Legs = 70 Flights across India
const ROTATIONS: RotationBlueprint[] = [
  {
    aircraftId: 'AC-01',
    startMin: 375, // 06:15
    stops: ['DEL', 'BOM', 'BLR', 'HYD', 'CCU', 'DEL'],
    gaps: [50, 50, 55, 50],
    flightNumbers: ['DS101', 'DS102', 'DS103', 'DS104', 'DS105'],
    basePax: 188,
  },
  {
    aircraftId: 'AC-02',
    startMin: 390, // 06:30
    stops: ['DEL', 'SXR', 'ATQ', 'DEL', 'LKO', 'DEL'],
    gaps: [45, 50, 50, 48],
    flightNumbers: ['DS111', 'DS112', 'DS113', 'DS114', 'DS115'],
    basePax: 162,
  },
  {
    aircraftId: 'AC-03',
    startMin: 380, // 06:20
    stops: ['BOM', 'DEL', 'AMD', 'BLR', 'HYD', 'BOM'],
    gaps: [50, 52, 50, 50],
    flightNumbers: ['DS201', 'DS202', 'DS203', 'DS204', 'DS205'],
    basePax: 164,
  },
  {
    aircraftId: 'AC-04',
    startMin: 405, // 06:45
    stops: ['BOM', 'GOI', 'BLR', 'MAA', 'CCU', 'BOM'],
    gaps: [45, 50, 48, 52],
    flightNumbers: ['DS211', 'DS212', 'DS213', 'DS214', 'DS215'],
    basePax: 158,
  },
  {
    aircraftId: 'AC-05',
    startMin: 370, // 06:10
    stops: ['BLR', 'HYD', 'DEL', 'JAI', 'BOM', 'BLR'],
    gaps: [50, 50, 52, 52],
    flightNumbers: ['DS301', 'DS302', 'DS303', 'DS304', 'DS305'],
    basePax: 184,
  },
  {
    aircraftId: 'AC-06',
    startMin: 420, // 07:00
    stops: ['BLR', 'COK', 'BOM', 'PNQ', 'HYD', 'BLR'],
    gaps: [45, 48, 48, 50],
    flightNumbers: ['DS311', 'DS312', 'DS313', 'DS314', 'DS315'],
    basePax: 152,
  },
  {
    aircraftId: 'AC-07',
    startMin: 385, // 06:25
    stops: ['HYD', 'BBI', 'CCU', 'DEL', 'BLR', 'HYD'],
    gaps: [50, 52, 52, 50],
    flightNumbers: ['DS401', 'DS402', 'DS403', 'DS404', 'DS405'],
    basePax: 160,
  },
  {
    aircraftId: 'AC-08',
    startMin: 430, // 07:10
    stops: ['HYD', 'MAA', 'COK', 'BLR', 'PNQ', 'HYD'],
    gaps: [45, 50, 48, 50],
    flightNumbers: ['DS411', 'DS412', 'DS413', 'DS414', 'DS415'],
    basePax: 128,
  },
  {
    aircraftId: 'AC-09',
    startMin: 395, // 06:35
    stops: ['CCU', 'GAU', 'DEL', 'BOM', 'HYD', 'CCU'],
    gaps: [52, 52, 50, 50],
    flightNumbers: ['DS501', 'DS502', 'DS503', 'DS504', 'DS505'],
    basePax: 166,
  },
  {
    aircraftId: 'AC-10',
    startMin: 410, // 06:50
    stops: ['MAA', 'BLR', 'DEL', 'LKO', 'CCU', 'MAA'],
    gaps: [48, 50, 50, 48],
    flightNumbers: ['DS511', 'DS512', 'DS513', 'DS514', 'DS515'],
    basePax: 154,
  },
  {
    aircraftId: 'AC-11',
    startMin: 365, // 06:05
    stops: ['AMD', 'DEL', 'BOM', 'COK', 'HYD', 'AMD'],
    gaps: [50, 52, 52, 52],
    flightNumbers: ['DS601', 'DS602', 'DS603', 'DS604', 'DS605'],
    basePax: 186,
  },
  {
    aircraftId: 'AC-12',
    startMin: 415, // 06:55
    stops: ['COK', 'MAA', 'BBI', 'BLR', 'GOI', 'COK'],
    gaps: [45, 48, 48, 48],
    flightNumbers: ['DS611', 'DS612', 'DS613', 'DS614', 'DS615'],
    basePax: 124,
  },
  {
    aircraftId: 'AC-13',
    startMin: 400, // 06:40
    stops: ['PNQ', 'DEL', 'JAI', 'HYD', 'BOM', 'PNQ'],
    gaps: [48, 50, 52, 50],
    flightNumbers: ['DS701', 'DS702', 'DS703', 'DS704', 'DS705'],
    basePax: 156,
  },
  {
    aircraftId: 'AC-14',
    startMin: 375, // 06:15
    stops: ['GAU', 'CCU', 'BLR', 'BOM', 'DEL', 'GAU'],
    gaps: [52, 52, 52, 50],
    flightNumbers: ['DS711', 'DS712', 'DS713', 'DS714', 'DS715'],
    basePax: 162,
  },
];

const CREW_NAMES: Array<[string, string]> = [
  ['Capt. R. Deshmukh', 'FO M. Iyer'],
  ['Capt. A. Sharma', 'FO D. Patel'],
  ['Capt. S. Nair', 'FO K. Kulkarni'],
  ['Capt. V. Menon', 'FO T. Chatterjee'],
  ['Capt. P. Malhotra', 'FO R. Reddy'],
  ['Capt. N. Kapoor', 'FO A. Sen'],
  ['Capt. K. Rao', 'FO B. Verma'],
  ['Capt. H. Singhania', 'FO G. Joshi'],
  ['Capt. M. Krishnan', 'FO S. Banerjee'],
  ['Capt. D. Bhatia', 'FO N. Hegde'],
  ['Capt. T. Subramanian', 'FO J. Bose'],
  ['Capt. R. Chawla', 'FO A. Gokhale'],
  ['Capt. S. Mukherjee', 'FO P. Saxena'],
  ['Capt. C. Venkataraman', 'FO E. Thomas'],
  ['Capt. B. Goswami', 'FO L. Mishra'],
  ['Capt. G. Ahluwalia', 'FO H. Kaur'],
  ['Capt. F. Contractor', 'FO W. Dsouza'],
  ['Capt. Y. Kulkarni', 'FO R. Tiwari'],
  ['Capt. V. Rajagopal', 'FO M. Bhatt'],
  ['Capt. A. Chowdhury', 'FO I. Qureshi'],
  ['Capt. O. Bedi', 'FO K. Sinha'],
  ['Capt. I. Rathore', 'FO Z. Khan'],
  ['Capt. N. Parekh', 'FO P. Nambiar'],
  ['Capt. R. Chauhan', 'FO T. Dasgupta'],
  ['Capt. S. Gill', 'FO J. Mathew'],
  ['Capt. E. Fernandes', 'FO D. Roy'],
  ['Capt. L. Narayanan', 'FO S. Gupta'],
  ['Capt. K. Mahajan', 'FO C. Agarwal'],
];

function buildFlightsAndCrew(): { flights: Flight[]; crew: CrewAssignment[] } {
  const flights: Flight[] = [];
  const crew: CrewAssignment[] = [];

  let crewIndex = 0;

  ROTATIONS.forEach((rot, rotIdx) => {
    const crewAId = `CR-${String(crewIndex + 1).padStart(2, '0')}`;
    const [capA, foA] = CREW_NAMES[crewIndex % CREW_NAMES.length];
    crewIndex++;

    const crewBId = `CR-${String(crewIndex + 1).padStart(2, '0')}`;
    const [capB, foB] = CREW_NAMES[crewIndex % CREW_NAMES.length];
    crewIndex++;

    let currentDep = rot.startMin;
    let leg3ScheduledArr = 0;
    let leg4ScheduledDep = 0;
    let leg5ScheduledArr = 0;

    for (let leg = 0; leg < 5; leg++) {
      const origin = rot.stops[leg];
      const destination = rot.stops[leg + 1];
      const block = getBlockMin(origin, destination);
      const scheduledDepMin = currentDep;
      const scheduledArrMin = currentDep + block;
      const paxVariation = ((rotIdx * 7 + leg * 11) % 23) - 10;

      const flightId = `FL-${rot.flightNumbers[leg]}`;
      const assignedCrewId = leg < 3 ? crewAId : crewBId;

      flights.push({
        id: flightId,
        flightNumber: rot.flightNumbers[leg],
        origin,
        destination,
        scheduledDepMin,
        scheduledArrMin,
        aircraftId: rot.aircraftId,
        crewId: assignedCrewId,
        passengerCount: Math.max(95, rot.basePax + paxVariation),
        rotationOrder: leg + 1,
      });

      if (leg === 2) leg3ScheduledArr = scheduledArrMin;
      if (leg === 3) leg4ScheduledDep = scheduledDepMin;
      if (leg === 4) leg5ScheduledArr = scheduledArrMin;

      if (leg < 4) {
        currentDep = scheduledArrMin + rot.gaps[leg];
      }
    }

    const crewAStart = rot.startMin - 45;
    const crewAMaxDuty = Math.max(600, leg3ScheduledArr - crewAStart + 165);
    crew.push({
      id: crewAId,
      callsign: `CREW-${rot.aircraftId}-AM`,
      captain: capA,
      firstOfficer: foA,
      baseAirport: rot.stops[0],
      dutyStartMin: crewAStart,
      maxDutyMin: crewAMaxDuty,
    });

    const crewBStart = leg4ScheduledDep - 45;
    const crewBMaxDuty = Math.max(540, leg5ScheduledArr - crewBStart + 180);
    crew.push({
      id: crewBId,
      callsign: `CREW-${rot.aircraftId}-PM`,
      captain: capB,
      firstOfficer: foB,
      baseAirport: rot.stops[3],
      dutyStartMin: crewBStart,
      maxDutyMin: crewBMaxDuty,
    });
  });

  return { flights, crew };
}

function buildPassengerConnections(flights: Flight[]): PassengerConnection[] {
  const connections: PassengerConnection[] = [];
  const hubPriority = new Set(['DEL', 'BOM', 'BLR', 'HYD', 'CCU', 'MAA']);
  let connIdx = 1;

  for (const inbound of flights) {
    if (!hubPriority.has(inbound.destination)) continue;

    const candidates = flights
      .filter(
        (outbound) =>
          outbound.origin === inbound.destination &&
          outbound.aircraftId !== inbound.aircraftId &&
          outbound.destination !== inbound.origin &&
          outbound.scheduledDepMin - inbound.scheduledArrMin >= 35 &&
          outbound.scheduledDepMin - inbound.scheduledArrMin <= 180
      )
      .sort(
        (a, b) =>
          a.scheduledDepMin - inbound.scheduledArrMin - (b.scheduledDepMin - inbound.scheduledArrMin)
      )
      .slice(0, 3);

    for (const outbound of candidates) {
      const paxCount = 12 + ((connIdx * 7) % 24);
      connections.push({
        id: `CONN-${String(connIdx).padStart(3, '0')}`,
        fromFlightId: inbound.id,
        toFlightId: outbound.id,
        airportCode: inbound.destination,
        passengerCount: paxCount,
        minConnectTimeMin: 35,
      });
      connIdx++;
    }
  }

  return connections;
}

const { flights: DEMO_FLIGHTS, crew: DEMO_CREW } = buildFlightsAndCrew();
const DEMO_CONNECTIONS = buildPassengerConnections(DEMO_FLIGHTS);

export const DEMO_DATASET: AirlineDataset = {
  metadata: {
    label: 'DEMO DATA — India Domestic Network Schedule',
    isDemo: true,
    version: '2.0.0-demo',
    source: 'Built-in India demonstration schedule (ready to swap with official organiser JSON)',
    notes:
      '16 Indian airports across 15 states/UTs (4 primary hubs: DEL, BOM, BLR, HYD; 12 regional stations), 70 flights across 14 active 5-leg aircraft rotations + 2 standby spares, 28 crew pairings, and hub passenger connections.',
  },
  airports: DEMO_AIRPORTS,
  aircraft: DEMO_AIRCRAFT,
  crew: DEMO_CREW,
  flights: DEMO_FLIGHTS,
  connections: DEMO_CONNECTIONS,
};

export interface DatasetValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateAirlineDataset(dataset: AirlineDataset): DatasetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(dataset.airports) || dataset.airports.length === 0) {
    errors.push('Dataset must contain a non-empty airports array.');
  }
  if (!Array.isArray(dataset.aircraft) || dataset.aircraft.length === 0) {
    errors.push('Dataset must contain a non-empty aircraft array.');
  }
  if (!Array.isArray(dataset.flights) || dataset.flights.length === 0) {
    errors.push('Dataset must contain a non-empty flights array.');
  }
  if (!Array.isArray(dataset.crew)) {
    errors.push('Dataset must contain a crew array (may be empty if unavailable).');
  }
  if (!Array.isArray(dataset.connections)) {
    errors.push('Dataset must contain a connections array (may be empty if unavailable).');
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const airportCodes = new Set<string>();
  for (const ap of dataset.airports) {
    if (
      !ap.code ||
      typeof ap.lat !== 'number' ||
      typeof ap.lon !== 'number' ||
      !Number.isFinite(ap.lat) ||
      !Number.isFinite(ap.lon) ||
      ap.lat < -90 ||
      ap.lat > 90 ||
      ap.lon < -180 ||
      ap.lon > 180
    ) {
      errors.push(`Airport ${ap.code || '(unnamed)'} requires code and valid finite lat/lon coordinates.`);
      continue;
    }
    if (airportCodes.has(ap.code)) {
      errors.push(`Duplicate airport code ${ap.code}.`);
    }
    airportCodes.add(ap.code);
  }

  const aircraftMap = new Map<string, Aircraft>();
  for (const ac of dataset.aircraft) {
    if (!ac.id) {
      errors.push('Every aircraft requires a non-empty id.');
      continue;
    }
    if (aircraftMap.has(ac.id)) {
      errors.push(`Duplicate aircraft id ${ac.id}.`);
    }
    aircraftMap.set(ac.id, ac);
  }

  const flightIds = new Set<string>();
  for (const flight of dataset.flights) {
    if (!flight.id) {
      errors.push(`Flight ${flight.flightNumber || '(unnamed)'} requires a non-empty id.`);
      continue;
    }
    if (flightIds.has(flight.id)) {
      errors.push(`Duplicate flight id ${flight.id}.`);
    }
    flightIds.add(flight.id);
    if (!airportCodes.has(flight.origin)) {
      errors.push(`Flight ${flight.flightNumber} references unknown origin ${flight.origin}.`);
    }
    if (!airportCodes.has(flight.destination)) {
      errors.push(`Flight ${flight.flightNumber} references unknown destination ${flight.destination}.`);
    }
    if (!aircraftMap.has(flight.aircraftId)) {
      errors.push(`Flight ${flight.flightNumber} references unknown aircraft ${flight.aircraftId}.`);
    }
    if (
      typeof flight.scheduledDepMin !== 'number' ||
      typeof flight.scheduledArrMin !== 'number' ||
      !Number.isFinite(flight.scheduledDepMin) ||
      !Number.isFinite(flight.scheduledArrMin) ||
      flight.scheduledArrMin <= flight.scheduledDepMin
    ) {
      errors.push(`Flight ${flight.flightNumber} has invalid scheduled departure/arrival times.`);
    }
    if (
      typeof flight.passengerCount !== 'number' ||
      !Number.isFinite(flight.passengerCount) ||
      flight.passengerCount < 0
    ) {
      errors.push(`Flight ${flight.flightNumber} has an invalid passengerCount.`);
    }
  }

  // Verify rotation continuity per aircraft
  const byAircraft = new Map<string, Flight[]>();
  for (const flight of dataset.flights) {
    const list = byAircraft.get(flight.aircraftId) ?? [];
    list.push(flight);
    byAircraft.set(flight.aircraftId, list);
  }
  for (const [acId, legs] of byAircraft.entries()) {
    const sorted = [...legs].sort((a, b) => a.rotationOrder - b.rotationOrder);
    const ac = aircraftMap.get(acId);
    const minTurn = ac?.minTurnaroundMin ?? 40;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.destination !== curr.origin) {
        warnings.push(`Aircraft ${acId} rotation gap: ${prev.flightNumber} ends at ${prev.destination}, ${curr.flightNumber} starts at ${curr.origin}.`);
      }
      if (curr.scheduledDepMin - prev.scheduledArrMin < minTurn) {
        warnings.push(`Aircraft ${acId} tight turn between ${prev.flightNumber} and ${curr.flightNumber}.`);
      }
    }
  }

  for (const conn of dataset.connections) {
    if (!flightIds.has(conn.fromFlightId) || !flightIds.has(conn.toFlightId)) {
      warnings.push(`Connection ${conn.id} references missing flight.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
