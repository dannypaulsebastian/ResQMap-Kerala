import React from 'react';
import { Shield, Battery, RefreshCw, Layers } from 'lucide-react';

export default function ResourceDashboard({
  shelters,
  auditLogs,
  selectedShelterId,
  onSelectShelter,
  onAdjustCapacity,
  onRefillResources
}) {
  const getCapacityBarClass = (current, max) => {
    const ratio = current / max;
    if (ratio >= 0.85) return 'progress-red';
    if (ratio >= 0.6) return 'progress-orange';
    return 'progress-green';
  };

  const getResourceStatusClass = (value) => {
    if (value <= 25) return 'resource-low';
    if (value <= 60) return 'resource-med';
    return 'resource-high';
  };

  return (
    <div className="resource-dashboard card glass">
      <div className="card-header">
        <div className="portal-badge badge-resources">Resource & Safe Zone Hub</div>
        <h2>Regional Safety Zones</h2>
        <p className="subtitle">Real-time status of emergency shelters, triage capacities, and survival resource stocks.</p>
      </div>

      <div className="shelter-grid">
        {shelters.map(shelter => {
          const isSelected = selectedShelterId === shelter.id;
          const occupancyPercent = Math.round((shelter.capacity.current / shelter.capacity.max) * 100);
          
          return (
            <div
              key={shelter.id}
              className={`shelter-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectShelter(shelter.id)}
            >
              <div className="shelter-header">
                <div>
                  <h4>{shelter.name}</h4>
                  <span className="shelter-type">{shelter.type}</span>
                </div>
                <div className="shelter-contact">{shelter.contacts}</div>
              </div>

              {/* Occupancy Progress Bar */}
              <div className="occupancy-section">
                <div className="occupancy-labels">
                  <span>Occupancy Capacity</span>
                  <strong>{shelter.capacity.current} / {shelter.capacity.max} beds ({occupancyPercent}%)</strong>
                </div>
                <div className="progress-bg">
                  <div
                    className={`progress-fill ${getCapacityBarClass(shelter.capacity.current, shelter.capacity.max)}`}
                    style={{ width: `${occupancyPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Resource stock list */}
              <div className="resource-stocks">
                <div className="resource-item">
                  <span className="res-label">Food Supply</span>
                  <div className="res-bar-container">
                    <div className={`res-bar-fill ${getResourceStatusClass(shelter.resources.food)}`} style={{ width: `${shelter.resources.food}%` }}></div>
                  </div>
                  <span className="res-value">{shelter.resources.food}%</span>
                </div>
                
                <div className="resource-item">
                  <span className="res-label">Clean Water</span>
                  <div className="res-bar-container">
                    <div className={`res-bar-fill ${getResourceStatusClass(shelter.resources.water)}`} style={{ width: `${shelter.resources.water}%` }}></div>
                  </div>
                  <span className="res-value">{shelter.resources.water}%</span>
                </div>

                <div className="resource-item">
                  <span className="res-label">Medical Kits</span>
                  <div className="res-bar-container">
                    <div className={`res-bar-fill ${getResourceStatusClass(shelter.resources.medicine)}`} style={{ width: `${shelter.resources.medicine}%` }}></div>
                  </div>
                  <span className="res-value">{shelter.resources.medicine}%</span>
                </div>
              </div>

              {/* Manual adjust buttons */}
              <div className="shelter-actions" onClick={e => e.stopPropagation()}>
                <div className="action-row">
                  <button className="btn btn-xs" onClick={() => onAdjustCapacity(shelter.id, 5)}>+5 Beds</button>
                  <button className="btn btn-xs" onClick={() => onAdjustCapacity(shelter.id, -5)}>-5 Beds</button>
                  <button className="btn btn-xs btn-primary-outline" onClick={() => onRefillResources(shelter.id)}>
                    <RefreshCw size={10} /> Restock (100%)
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Communications Trail / Audit Log Section */}
      <div className="audit-log-section">
        <h3>
          <Layers size={14} />
          <span>Emergency Communication Logs (Audit Trail)</span>
        </h3>
        <div className="log-list">
          {auditLogs.map(log => {
            const logTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <div key={log.id} className="log-item">
                <span className="log-time">[{logTime}]</span>
                <span className="log-msg">{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
