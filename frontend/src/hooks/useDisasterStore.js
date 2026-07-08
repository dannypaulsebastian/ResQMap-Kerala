import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:8080/api';

// Haversine distance in km between two lat/lng points
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Normalise backend ticket to frontend shape
function normaliseTicket(t) {
  const score = t.urgencyScore ?? 0;
  let priorityLabel = 'LOW';
  if (score >= 75) priorityLabel = 'CRITICAL';
  else if (score >= 50) priorityLabel = 'HIGH';
  else if (score >= 25) priorityLabel = 'MEDIUM';

  return {
    id: String(t.id),
    backendId: t.id,
    reporter: t.reporterName || 'Unknown',
    phone: t.phone || '—',
    category: (t.needType || 'rescue').toLowerCase(),
    description: t.description || '',
    lat: t.latitude,
    lng: t.longitude,
    urgency: score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low',
    vulnerability: {
      infantsOrChildren: t.child || false,
      elderly: t.elderly || false,
      pregnant: t.pregnant || false,
      disabled: t.disabled || false,
    trapped: t.trapped || false,
    },
    status: (t.status || 'PENDING').toLowerCase(),
    priorityScore: score,
    scoreBreakdown: t.scoreBreakdown || '',
    priorityLabel,
    assignedZoneId: t.assignedZoneId ? String(t.assignedZoneId) : null,
    assignedZoneName: t.assignedZoneName || null,
    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
  };
}

// Normalise backend resource zone to frontend shelter shape
function normaliseZone(z) {
  const used = z.currentlyUsed ?? 0;
  const cap = z.capacity ?? 100;
  // Color hint by type
  const typeColorMap = {
    medical: '#ef4444',
    shelter: '#3b82f6',
    food: '#f97316',
    water: '#06b6d4',
  };
  return {
    id: String(z.id),
    backendId: z.id,
    name: z.name,
    type: z.type,
    lat: z.latitude,
    lng: z.longitude,
    color: typeColorMap[z.type] || '#8b5cf6',
    capacity: { max: cap, current: used },
    resources: { food: 100, water: 100, medicine: 100 }, // not tracked in backend yet
    contacts: z.contacts || '—',
  };
}

export function useDisasterStore() {
  const [tickets, setTickets] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [auditLogs, setAuditLogs] = useState([
    { id: 'log-0', timestamp: new Date().toISOString(), message: 'ResQMap system connected to live Kerala backend.' },
  ]);

  const addLog = useCallback((msg) => {
    setAuditLogs((prev) => [
      { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), message: msg },
      ...prev,
    ]);
  }, []);

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [tRes, zRes] = await Promise.all([
        fetch(`${API_BASE}/tickets`),
        fetch(`${API_BASE}/resources`),
      ]);
      const [tData, zData] = await Promise.all([tRes.json(), zRes.json()]);
      setTickets(tData.map(normaliseTicket));
      setZones(zData.map(normaliseZone));
      setError(null);
    } catch (e) {
      setError('Cannot reach backend – make sure Spring Boot is running on :8080');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // ── Find nearest zone (haversine, with type preference) ───────────────────
  const findNearestZone = useCallback(
    (lat, lng, needType) => {
      let nearest = null;
      let minDist = Infinity;
      zones.forEach((z) => {
        const hasCapacity = z.capacity.current < z.capacity.max;
        if (!hasCapacity) return;
        let dist = haversineDistance(lat, lng, z.lat, z.lng);
        // Prefer matching type zone
        if (z.type === needType) dist *= 0.6;
        if (z.type === 'medical' && needType === 'medical') dist *= 0.5;
        if (dist < minDist) {
          minDist = dist;
          nearest = z;
        }
      });
      return nearest;
    },
    [zones]
  );

  // ── Create ticket (citizen reporting) ────────────────────────────────────
  const addTicket = useCallback(
    async (formData) => {
      try {
        const payload = {
          reporterName: formData.reporter,
          needType: formData.category,
          description: formData.description,
          latitude: formData.lat,
          longitude: formData.lng,
          elderly: formData.vulnerability?.elderly || false,
          child: formData.vulnerability?.infantsOrChildren || false,
          pregnant: formData.vulnerability?.pregnant || false,
          disabled: formData.vulnerability?.disabled || false,
          phone: formData.phone,
          trapped: formData.vulnerability?.trapped || false,
        };
        const res = await fetch(`${API_BASE}/tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const created = await res.json();
        const normalised = normaliseTicket(created);
        setTickets((prev) =>
          [normalised, ...prev].sort((a, b) => b.priorityScore - a.priorityScore)
        );
        setSelectedTicketId(normalised.id);
        addLog(`New ticket #${created.id} submitted by ${payload.reporterName} (${payload.needType.toUpperCase()}) – score ${created.urgencyScore}`);
        return normalised;
      } catch (e) {
        addLog('ERROR: Failed to submit ticket to backend.');
      }
    },
    [addLog]
  );

  // ── Update status ────────────────────────────────────────────────────────
  const updateTicketStatus = useCallback(
    async (frontendId, newStatus) => {
      const ticket = tickets.find((t) => t.id === frontendId);
      if (!ticket) return;
      try {
        await fetch(`${API_BASE}/tickets/${ticket.backendId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newStatus.toUpperCase()),
        });
        setTickets((prev) =>
          prev.map((t) => (t.id === frontendId ? { ...t, status: newStatus.toLowerCase() } : t))
        );
        addLog(`Ticket #${ticket.backendId} status changed to ${newStatus.toUpperCase()}`);
      } catch (e) {
        addLog(`ERROR: Could not update ticket #${ticket.backendId} status.`);
      }
    },
    [tickets, addLog]
  );

  // ── Assign to nearest zone ────────────────────────────────────────────────
  const assignTicketToZone = useCallback(
    async (frontendTicketId, zone) => {
      const ticket = tickets.find((t) => t.id === frontendTicketId);
      if (!ticket) return;
      try {
        const res = await fetch(`${API_BASE}/tickets/${ticket.backendId}/assign`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zoneId: zone.backendId, zoneName: zone.name }),
        });
        const updated = await res.json();
        const normalised = normaliseTicket(updated);
        setTickets((prev) =>
          prev.map((t) => (t.id === frontendTicketId ? normalised : t))
        );
        // Increment zone usage
        setZones((prev) =>
          prev.map((z) =>
            z.id === zone.id
              ? { ...z, capacity: { ...z.capacity, current: Math.min(z.capacity.max, z.capacity.current + 1) } }
              : z
          )
        );
        addLog(
          `✅ Ticket #${ticket.backendId} ASSIGNED → ${zone.name} (${haversineDistance(ticket.lat, ticket.lng, zone.lat, zone.lng).toFixed(1)} km away)`
        );
      } catch (e) {
        addLog(`ERROR: Failed to assign ticket #${ticket.backendId}.`);
      }
    },
    [tickets, addLog]
  );

  // ── Delete ticket ────────────────────────────────────────────────────────
  const deleteTicket = useCallback(
    async (frontendId) => {
      const ticket = tickets.find((t) => t.id === frontendId);
      if (!ticket) return;
      try {
        await fetch(`${API_BASE}/tickets/${ticket.backendId}`, { method: 'DELETE' });
        setTickets((prev) => prev.filter((t) => t.id !== frontendId));
        if (selectedTicketId === frontendId) setSelectedTicketId(null);
        addLog(`🗑️ Ticket #${ticket.backendId} deleted.`);
      } catch (e) {
        addLog(`ERROR: Could not delete ticket #${ticket.backendId}.`);
      }
    },
    [tickets, selectedTicketId, addLog]
  );

  // ── Update zone capacity ─────────────────────────────────────────────────
  const updateZoneUsage = useCallback(
    async (frontendZoneId, delta) => {
      const zone = zones.find((z) => z.id === frontendZoneId);
      if (!zone) return;
      const newUsed = Math.max(0, Math.min(zone.capacity.max, zone.capacity.current + delta));
      try {
        await fetch(`${API_BASE}/resources/${zone.backendId}/usage`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentlyUsed: newUsed }),
        });
        setZones((prev) =>
          prev.map((z) =>
            z.id === frontendZoneId ? { ...z, capacity: { ...z.capacity, current: newUsed } } : z
          )
        );
        addLog(`Zone "${zone.name}" usage updated to ${newUsed}/${zone.capacity.max}`);
      } catch (e) {
        addLog(`ERROR: Could not update zone "${zone.name}" usage.`);
      }
    },
    [zones, addLog]
  );


  // ── Restock resources (food/water/medicine) to 100% ─────────────────────
  const refillZoneResources = useCallback(
    (frontendZoneId) => {
      const zone = zones.find((z) => z.id === frontendZoneId);
      if (!zone) return;
      setZones((prev) =>
        prev.map((z) =>
          z.id === frontendZoneId
            ? { ...z, resources: { food: 100, water: 100, medicine: 100 } }
            : z
        )
      );
      addLog(`🔄 Zone "${zone.name}" resources restocked to 100% (food, water, medicine).`);
    },
    [zones, addLog]
  );

  // ── Demo simulator helpers ───────────────────────────────────────────────
  const KERALA_DEMO_LOCATIONS = [
    { lat: 9.9312, lng: 76.2673, city: 'Kochi' },
    { lat: 8.5241, lng: 76.9366, city: 'Trivandrum' },
    { lat: 10.5276, lng: 76.2144, city: 'Thrissur' },
    { lat: 11.2588, lng: 75.7804, city: 'Kozhikode' },
    { lat: 9.4981, lng: 76.3388, city: 'Alappuzha' },
    { lat: 9.5916, lng: 76.5222, city: 'Kottayam' },
    { lat: 8.8932, lng: 76.6141, city: 'Kollam' },
  ];
  const DEMO_NAMES = ['Rajan V.', 'Meera K.', 'Arun P.', 'Sitha R.', 'Vijayan N.', 'Anu M.', 'Thomas J.'];
  const DEMO_SCENARIOS = {
    rescue: ['Flood water rising, family trapped on rooftop', 'Tree fell on house, exit blocked', 'Flash flood swept vehicle off road'],
    medical: ['Elderly patient needs oxygen supply', 'Pregnant woman in labor, roads blocked', 'Child with high fever – no hospital access'],
    food_water: ['No clean drinking water for 2 days', 'Stranded community needs dry rations', 'Baby formula urgently needed'],
    shelter: ['Roof blown off by storm', 'House wall cracked after rain – unsafe to stay'],
  };

  const triggerSimulatedIncident = useCallback(async () => {
    const categories = ['rescue', 'medical', 'food_water', 'shelter'];
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const loc = KERALA_DEMO_LOCATIONS[Math.floor(Math.random() * KERALA_DEMO_LOCATIONS.length)];
    const descs = DEMO_SCENARIOS[cat];
    const desc = descs[Math.floor(Math.random() * descs.length)];
    const name = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
    // Add slight jitter to coords
    await addTicket({
      reporter: name,
      category: cat,
      description: `[DEMO – ${loc.city}] ${desc}`,
      lat: loc.lat + (Math.random() - 0.5) * 0.05,
      lng: loc.lng + (Math.random() - 0.5) * 0.05,
      vulnerability: {
        infantsOrChildren: Math.random() > 0.6,
        elderly: Math.random() > 0.7,
        pregnant: Math.random() > 0.9,
        disabled: Math.random() > 0.8,
      },
    });
  }, [addTicket]);

  const triggerSimulatedResourceDrop = useCallback(() => {
    // Just a visual log – capacity updates would need backend calls
    addLog('⚡ Simulated Environmental Stress: Resource levels under pressure across Kerala zones.');
    setZones((prev) =>
      prev.map((z) => ({
        ...z,
        capacity: {
          ...z.capacity,
          current: Math.min(z.capacity.max, z.capacity.current + Math.floor(Math.random() * 3)),
        },
      }))
    );
  }, [addLog]);

  return {
    // data
    tickets,
    zones,
    loading,
    error,
    auditLogs,
    // selection
    selectedTicketId,
    selectedZoneId,
    setSelectedTicketId,
    setSelectedZoneId,
    // actions
    addTicket,
    updateTicketStatus,
    assignTicketToZone,
    deleteTicket,
    updateZoneUsage,
    refillZoneResources,
    findNearestZone,
    refreshAll: fetchAll,
    triggerSimulatedIncident,
    triggerSimulatedResourceDrop,
    // Legacy aliases used in App.jsx (shelter = zone in old code)
    incidents: tickets,
    shelters: zones,
    selectedIncidentId: selectedTicketId,
    selectedShelterId: selectedZoneId,
    setSelectedIncidentId: setSelectedTicketId,
    setSelectedShelterId: setSelectedZoneId,
    addIncident: addTicket,
    dispatchIncident: (id) => {
      const ticket = tickets.find((t) => t.id === id);
      if (!ticket) return;
      const nearest = findNearestZone(ticket.lat, ticket.lng, ticket.category);
      if (nearest) assignTicketToZone(id, nearest);
      else updateTicketStatus(id, 'assigned');
    },
    resolveIncident: (id) => updateTicketStatus(id, 'resolved'),
    findNearestShelter: findNearestZone,
  };
}

