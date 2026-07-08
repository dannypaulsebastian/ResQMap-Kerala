// Bangalore city center coords: Lat 12.9716, Lng 77.5946
const MAP_CENTER = { lat: 12.9716, lng: 77.5946 };

export const INITIAL_SHELTERS = [
  {
    id: 'shelter-1',
    name: 'Kanteerava Indoor Stadium (Mega Center)',
    lat: 12.9698,
    lng: 77.5928,
    type: 'Stadium',
    capacity: { max: 500, current: 124 },
    resources: { food: 85, water: 90, medicine: 70 },
    contacts: '080-2222-0001'
  },
  {
    id: 'shelter-2',
    name: 'St. Martha\'s Hospital Stabilization Hub',
    lat: 12.9725,
    lng: 77.5962,
    type: 'Hospital',
    capacity: { max: 150, current: 89 },
    resources: { food: 40, water: 65, medicine: 98 },
    contacts: '080-2222-0002'
  },
  {
    id: 'shelter-3',
    name: 'Cubbon Park Community Relief Hall',
    lat: 12.9772,
    lng: 77.5955,
    type: 'Community Hall',
    capacity: { max: 200, current: 42 },
    resources: { food: 60, water: 55, medicine: 30 },
    contacts: '080-2222-0003'
  },
  {
    id: 'shelter-4',
    name: 'Richmond Town Government School',
    lat: 12.9610,
    lng: 77.5985,
    type: 'School',
    capacity: { max: 100, current: 15 },
    resources: { food: 50, water: 45, medicine: 20 },
    contacts: '080-2222-0004'
  }
];

export const INITIAL_INCIDENTS = [
  {
    id: 'incident-1',
    reporter: 'Amit Sharma',
    phone: '+91 98765 43210',
    category: 'rescue',
    description: 'First floor flooded, water level rising quickly. 5 people trapped on the roof.',
    lat: 12.9685,
    lng: 77.5890,
    urgency: 'critical',
    vulnerability: {
      infantsOrChildren: true,
      elderly: true,
      pregnant: false,
      disabled: false,
      trapped: true
    },
    status: 'pending',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString() // 45 mins ago
  },
  {
    id: 'incident-2',
    reporter: 'Priya Nair',
    phone: '+91 87654 32109',
    category: 'medical',
    description: 'Elderly patient with high fever and respiratory distress needs immediate oxygen.',
    lat: 12.9750,
    lng: 77.6010,
    urgency: 'high',
    vulnerability: {
      infantsOrChildren: false,
      elderly: true,
      pregnant: false,
      disabled: true,
      trapped: false
    },
    status: 'pending',
    createdAt: new Date(Date.now() - 25 * 60000).toISOString() // 25 mins ago
  },
  {
    id: 'incident-3',
    reporter: 'Ravi Kumar',
    phone: '+91 76543 21098',
    category: 'food_water',
    description: 'Relief supplies needed for a group of 30 workers stranded near the metro construction.',
    lat: 12.9630,
    lng: 77.5920,
    urgency: 'medium',
    vulnerability: {
      infantsOrChildren: false,
      elderly: false,
      pregnant: false,
      disabled: false,
      trapped: false
    },
    status: 'pending',
    createdAt: new Date(Date.now() - 90 * 60000).toISOString() // 90 mins ago
  },
  {
    id: 'incident-4',
    reporter: 'Srinivas Murthy',
    phone: '+91 65432 10987',
    category: 'shelter',
    description: 'Wall collapsed, house unstable. Family of 4 needs immediate shelter support.',
    lat: 12.9710,
    lng: 77.6045,
    urgency: 'medium',
    vulnerability: {
      infantsOrChildren: true,
      elderly: false,
      pregnant: false,
      disabled: false,
      trapped: false
    },
    status: 'assigned',
    assignedShelterId: 'shelter-3',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString() // 15 mins ago
  }
];

const INCIDENT_DESCRIPTIONS = {
  rescue: [
    'Basement flooding, elevator jammed with passengers.',
    'Tree collapsed on structural support, blocking exits.',
    'Heavy waterlogging in the street, water flowing into ground floor.',
    'Flash flood sweeped away motorbikes, people stuck on compound walls.'
  ],
  medical: [
    'Pregnant woman in labor, roads flooded, ambulance unable to reach.',
    'Traumatic leg injury from falling debris, active bleeding.',
    'Asthma attack, inhaler finished, electricity outage.',
    'Child with high fever and seizure activity.'
  ],
  food_water: [
    'No drinking water for 24 hours in local tenement blocks.',
    'Stranded community kitchen needs dry rations (rice, lentils, oil).',
    'Baby formula and clean drinking water urgently required for 10 families.'
  ],
  shelter: [
    'Tin roof blown away by storm winds, high rain entering rooms.',
    'Cracks in brick wall after tremor, family evacuated to local park.'
  ]
};

const NAMES = ['Rajesh Patel', 'Anjali Gupta', 'Deepak Verma', 'Sneha Rao', 'Vikram Singh', 'Meera Joshi', 'Arjun Reddy', 'Kavitha Hegde'];

export function generateRandomIncident() {
  const categories = ['rescue', 'medical', 'food_water', 'shelter'];
  const urgencies = ['critical', 'high', 'medium', 'low'];
  
  const category = categories[Math.floor(Math.random() * categories.length)];
  const urgency = urgencies[Math.floor(Math.random() * urgencies.length)];
  
  const descOptions = INCIDENT_DESCRIPTIONS[category];
  const description = descOptions[Math.floor(Math.random() * descOptions.length)];
  
  const reporter = NAMES[Math.floor(Math.random() * NAMES.length)];
  const phone = `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;
  
  // Random position within ~1.5km of city center
  const lat = MAP_CENTER.lat + (Math.random() - 0.5) * 0.03;
  const lng = MAP_CENTER.lng + (Math.random() - 0.5) * 0.03;

  return {
    id: `incident-${Math.floor(1000 + Math.random() * 9000)}`,
    reporter,
    phone,
    category,
    description,
    lat,
    lng,
    urgency,
    vulnerability: {
      infantsOrChildren: Math.random() > 0.6,
      elderly: Math.random() > 0.7,
      pregnant: Math.random() > 0.9,
      disabled: Math.random() > 0.8,
      trapped: category === 'rescue' && Math.random() > 0.4
    },
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}
