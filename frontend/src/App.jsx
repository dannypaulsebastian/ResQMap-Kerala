import React, { useState } from 'react';
import { useDisasterStore } from './hooks/useDisasterStore';
import CitizenPortal from './components/CitizenPortal';
import IncidentMap from './components/IncidentMap';
import CoordinatorPanel from './components/CoordinatorPanel';
import ResourceDashboard from './components/ResourceDashboard';
import SimulatorControl from './components/SimulatorControl';
import { Shield, Users, Radio, MapPin, RefreshCw, AlertTriangle } from 'lucide-react';

export default function App() {
  const store = useDisasterStore();
  const [view, setView] = useState('citizen'); // Default to citizen portal for demo flow
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Location picking for citizen portal
  const [pickLocationMode, setPickLocationMode] = useState(false);
  const [pickCoords, setPickCoords] = useState(null);
  const handleLocateOnMapTrigger = (lat, lng) => {
    if (lat !== undefined && lng !== undefined) {
      setPickCoords({ lat, lng });
      setPickLocationMode(false);
    } else {
      setPickLocationMode(true);
    }
  };

  const handleMapClickLocation = (lat, lng) => {
    setPickCoords({ lat, lng });
    setPickLocationMode(false);
  };

  const handleClearPickCoords = () => {
    setPickCoords(null);
    setPickLocationMode(false);
  };

  const handleToggleCoordinator = () => {
    if (isAuthenticated) {
      setView('coordinator');
      handleClearPickCoords();
    } else {
      setPin('');
      setLoginError(false);
      setShowLoginModal(true);
    }
  };

  const handleLoginSubmit = (e) => {
    if (e) e.preventDefault();
    if (pin === '1234') { // Simple demo PIN
      setIsAuthenticated(true);
      setShowLoginModal(false);
      setView('coordinator');
      handleClearPickCoords();
    } else {
      setLoginError(true);
      setPin('');
    }
  };


  return (
    <div className="app-container">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="main-header glass">
        <div className="logo-section">
          <div className="logo-icon-pulse">
            <Shield size={24} className="logo-svg" />
          </div>
          <div>
            <h1>ResQMap Kerala</h1>
            <span className="subtitle">Live Disaster Relief Coordination Platform</span>
          </div>
        </div>

        {/* Live ticker */}
      <div className="header-ticker hide-mobile">
  <span className="ticker-badge">LIVE</span>
  <div className="ticker-scroll">
    <div className="ticker-text animate-marquee">
      {store.loading
        ? '⟳ Connecting to Kerala backend…'
        : store.error
        ? `⚠ ${store.error}`
        : `🚨 ${store.tickets.filter(t=>t.status==='pending').length} pending tickets · ⛺ ${store.zones.length} resource zones active across Kerala`
      }
    </div>
  </div>
</div>

        <div className="view-toggles">
          <button
            className={`btn-toggle ${view === 'citizen' ? 'active' : ''}`}
            onClick={() => { setView('citizen'); handleClearPickCoords(); }}
          >
            <Users size={16} />
            <span>Citizen Reporter</span>
          </button>

          <button
            className={`btn-toggle ${view === 'coordinator' ? 'active' : ''}`}
            onClick={handleToggleCoordinator}
          >
            <Radio size={16} />
            <span>Command Dashboard</span>
          </button>

          <button
            className="btn-toggle"
            onClick={store.refreshAll}
            title="Refresh from backend"
            style={{ minWidth: 'unset', padding: '0.4rem 0.6rem' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {store.error && (
        <div style={{
          background: 'linear-gradient(90deg,#7f1d1d,#450a0a)',
          color: '#fca5a5',
          padding: '0.5rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
        }}>
          <AlertTriangle size={16} />
          {store.error}
        </div>
      )}

      {/* Loading overlay */}
      {store.loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(3,7,18,0.85)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '1rem',
          color: '#e2e8f0',
        }}>
          <div style={{ width: 48, height: 48, border: '4px solid #1e40af', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div>Connecting to Kerala backend…</div>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="content-body">
        {view === 'citizen' ? (
          <div className="citizen-layout grid-2">
            <CitizenPortal
              addIncident={store.addIncident}
              onLocateOnMap={handleLocateOnMapTrigger}
              pickCoords={pickCoords}
              onClearPickCoords={handleClearPickCoords}
            />

            <div className="citizen-map-section flex-col">
              <div className="section-title-bar">
                <h3>
                  <MapPin size={16} />
                  <span>Kerala Relief Zones Map</span>
                </h3>
                <span className="help-badge">Click map to pin your location</span>
              </div>
              <IncidentMap
                incidents={store.tickets}
                shelters={store.zones}
                selectedIncidentId={store.selectedTicketId}
                selectedShelterId={store.selectedZoneId}
                onSelectIncident={store.setSelectedTicketId}
                onSelectShelter={store.setSelectedZoneId}
                pickLocationMode={pickLocationMode}
                onMapClickLocation={handleMapClickLocation}
                findNearestShelter={store.findNearestZone}
              />
            </div>
          </div>
        ) : (
          <div className="coordinator-layout grid-3">
            {/* Col 1 – Incidents */}
            <div className="col-incidents">
              <CoordinatorPanel
                incidents={store.tickets}
                shelters={store.zones}
                selectedIncidentId={store.selectedTicketId}
                onSelectIncident={store.setSelectedTicketId}
                onDispatchIncident={store.dispatchIncident}
                onResolveIncident={store.resolveIncident}
                findNearestShelter={store.findNearestZone}
                onAssignToZone={store.assignTicketToZone}
                onDeleteTicket={store.deleteTicket}
              />
            </div>

            {/* Col 2 – Map */}
            <div className="col-center flex-col">
              <div className="map-container-flex">
                <IncidentMap
                  incidents={store.tickets}
                  shelters={store.zones}
                  selectedIncidentId={store.selectedTicketId}
                  selectedShelterId={store.selectedZoneId}
                  onSelectIncident={store.setSelectedTicketId}
                  onSelectShelter={store.setSelectedZoneId}
                  pickLocationMode={pickLocationMode}
                  onMapClickLocation={handleMapClickLocation}
                  findNearestShelter={store.findNearestZone}
                />
              </div>
            </div>

            {/* Col 3 – Resource Zones */}
            <div className="col-resources">
              <ResourceDashboard
                shelters={store.zones}
                auditLogs={store.auditLogs}
                selectedShelterId={store.selectedZoneId}
                onSelectShelter={store.setSelectedZoneId}
                onAdjustCapacity={(id, delta) => store.updateZoneUsage(id, delta)}
                onRefillResources={store.refillZoneResources}
              />
              <SimulatorControl
                onSimulateIncident={store.triggerSimulatedIncident}
                onSimulateResourceDrop={store.triggerSimulatedResourceDrop}
              />
            </div>
          </div>
        )}
      </main>

      {showLoginModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(3,7,18,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <form onSubmit={handleLoginSubmit} style={{
            background: '#0f172a', padding: '2rem', borderRadius: '12px',
            display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 280,
            border: '1px solid #1e293b'
          }}>
            <h3 style={{ color: '#e2e8f0', margin: 0 }}>Coordinator Login</h3>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              autoFocus
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0' }}
            />
            {loginError && <span style={{ color: '#fca5a5', fontSize: '0.85rem' }}>Incorrect PIN. Try again.</span>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Login</button>
              <button type="button" className="btn" onClick={() => setShowLoginModal(false)} style={{ flex: 1 }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}