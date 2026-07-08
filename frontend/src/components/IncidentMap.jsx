import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Haversine distance helper (km)
function haversineKm(lat1, lng1, lat2, lng2) {
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

// Zone type colors
const ZONE_COLORS = {
  medical: '#ef4444',
  shelter: '#3b82f6',
  food: '#f97316',
  water: '#06b6d4',
};

export default function IncidentMap({
  incidents,
  shelters,
  selectedIncidentId,
  selectedShelterId,
  onSelectIncident,
  onSelectShelter,
  pickLocationMode,
  onMapClickLocation,
  findNearestShelter,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const incidentLayerRef = useRef(null);
  const shelterLayerRef = useRef(null);
  const routingLayerRef = useRef(null);

  // ── Initialize Map (centered on Kerala) ────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [10.5, 76.2], // Kerala center
      zoom: 8,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    incidentLayerRef.current = L.layerGroup().addTo(map);
    shelterLayerRef.current = L.layerGroup().addTo(map);
    routingLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e) => {
      if (mapContainerRef.current.dataset.pickmode === 'true') {
        const { lat, lng } = e.latlng;
        onMapClickLocation(lat, lng);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Pick mode toggle
  useEffect(() => {
    if (mapContainerRef.current) {
      mapContainerRef.current.dataset.pickmode = pickLocationMode ? 'true' : 'false';
      if (pickLocationMode) {
        mapContainerRef.current.style.cursor = 'crosshair';
      } else {
        mapContainerRef.current.style.cursor = '';
      }
    }
  }, [pickLocationMode]);

  // ── Render Markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    incidentLayerRef.current.clearLayers();
    shelterLayerRef.current.clearLayers();

    // Resource Zones (shelters)
    (shelters || []).forEach((zone) => {
      const pct = Math.round((zone.capacity.current / zone.capacity.max) * 100);
      const isSelected = selectedShelterId === zone.id;
      const color = ZONE_COLORS[zone.type] || '#8b5cf6';

      const html = `
        <div class="zone-marker-wrap ${isSelected ? 'selected' : ''}" style="--zone-color:${color}">
          <div class="zone-dot" style="background:${color};box-shadow:0 0 8px ${color}88"></div>
          <span class="zone-pulse" style="border-color:${color}88"></span>
        </div>
      `;

      const icon = L.divIcon({ className: 'zone-marker', html, iconSize: [28, 28], iconAnchor: [14, 14] });

      const marker = L.marker([zone.lat, zone.lng], { icon })
        .addTo(shelterLayerRef.current)
        .on('click', () => onSelectShelter(zone.id));

      marker.bindTooltip(
        `<div class="map-tooltip dark-theme">
          <strong>${zone.name}</strong><br/>
          Type: <b>${zone.type.toUpperCase()}</b><br/>
          Capacity: ${zone.capacity.current}/${zone.capacity.max} (${pct}% used)
        </div>`,
        { direction: 'top', className: 'dark-tooltip' }
      );
    });

    // Tickets (incidents)
    (incidents || []).filter((t) => t.status !== 'resolved').forEach((ticket) => {
      const isSelected = selectedIncidentId === ticket.id;
      const severity = ticket.priorityLabel.toLowerCase();

      const html = `
        <div class="custom-map-incident severity-${severity} ${isSelected ? 'selected' : ''}">
          <div class="incident-inner"></div>
          <span class="incident-pulse"></span>
        </div>
      `;

      const icon = L.divIcon({ className: 'incident-marker', html, iconSize: [24, 24], iconAnchor: [12, 12] });

      const marker = L.marker([ticket.lat, ticket.lng], { icon })
        .addTo(incidentLayerRef.current)
        .on('click', () => onSelectIncident(ticket.id));

      marker.bindTooltip(
        `<div class="map-tooltip">
          <strong>#${ticket.backendId || ticket.id} [${ticket.priorityLabel}]</strong><br/>
          ${ticket.reporter}<br/>
          ${ticket.category.toUpperCase()}: ${(ticket.description || '').substring(0, 50)}${ticket.description?.length > 50 ? '…' : ''}
        </div>`,
        { direction: 'top', className: 'dark-tooltip' }
      );
    });
  }, [incidents, shelters, selectedIncidentId, selectedShelterId]);

  // ── Routing Line ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    routingLayerRef.current.clearLayers();

    if (!selectedIncidentId) return;

    const ticket = (incidents || []).find((t) => t.id === selectedIncidentId);
    if (!ticket || ticket.status === 'resolved') return;

    mapRef.current.panTo([ticket.lat, ticket.lng]);

    let zone = null;
    if (ticket.assignedZoneId) {
      zone = (shelters || []).find((z) => z.id === ticket.assignedZoneId || String(z.backendId) === String(ticket.assignedZoneId));
    } else {
      zone = findNearestShelter ? findNearestShelter(ticket.lat, ticket.lng, ticket.category) : null;
    }

    if (zone) {
      const isAssigned = !!ticket.assignedZoneId;
      const lineColor = isAssigned ? '#10b981' : '#f59e0b';
      const distKm = haversineKm(ticket.lat, ticket.lng, zone.lat, zone.lng).toFixed(1);

      const latlngs = [
        [ticket.lat, ticket.lng],
        [zone.lat, zone.lng],
      ];

      L.polyline(latlngs, {
        color: lineColor,
        weight: 3,
        dashArray: isAssigned ? null : '5, 8',
        opacity: 0.85,
      }).addTo(routingLayerRef.current);

      L.circle([zone.lat, zone.lng], {
        radius: 2000, // ~2km visual radius in metres
        color: lineColor,
        fillColor: lineColor,
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(routingLayerRef.current);

      // Distance label midpoint
      const midLat = (ticket.lat + zone.lat) / 2;
      const midLng = (ticket.lng + zone.lng) / 2;
      L.marker([midLat, midLng], {
        icon: L.divIcon({
          className: 'dist-label',
          html: `<div style="background:${lineColor};color:#000;font-size:10px;font-weight:700;padding:2px 5px;border-radius:8px;white-space:nowrap">${distKm} km</div>`,
          iconAnchor: [20, 10],
        }),
      }).addTo(routingLayerRef.current);

      const bounds = L.latLngBounds(latlngs);
      mapRef.current.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [selectedIncidentId, incidents, shelters]);

  return (
    <div className="map-wrapper card glass">
      {pickLocationMode && (
        <div className="map-banner picker-mode animate-pulse">
          🎯 Click anywhere on the map to pin the incident location
        </div>
      )}
      <div
        ref={mapContainerRef}
        className="leaflet-map-container"
        style={{ height: '100%', width: '100%', minHeight: '380px' }}
      />
    </div>
  );
}
