import React, { useState } from 'react';
import {
  AlertCircle, CheckCircle, ShieldAlert, Phone, Calendar,
  Search, Filter, Zap, Trash2, Navigation
} from 'lucide-react';

export default function CoordinatorPanel({
  incidents,
  shelters,
  selectedIncidentId,
  onSelectIncident,
  onDispatchIncident,
  onResolveIncident,
  findNearestShelter,
  onAssignToZone,
  onDeleteTicket,
}) {
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIncidents = incidents.filter((inc) => {
    const matchCategory = filterCategory === 'all' || inc.category === filterCategory;
    const matchPriority =
      filterPriority === 'all' || inc.priorityLabel.toLowerCase() === filterPriority;
    const matchStatus = filterStatus === 'all' || inc.status === filterStatus;
    const searchLower = searchQuery.toLowerCase();
    const matchSearch =
      String(inc.id).toLowerCase().includes(searchLower) ||
      (inc.description || '').toLowerCase().includes(searchLower) ||
      (inc.reporter || '').toLowerCase().includes(searchLower);
    return matchCategory && matchPriority && matchStatus && matchSearch;
  });

  const totalPending = incidents.filter((i) => i.status === 'pending').length;
  const totalAssigned = incidents.filter((i) => i.status === 'assigned').length;
  const totalResolved = incidents.filter((i) => i.status === 'resolved').length;

  const getPriorityBadgeClass = (label) => {
    switch ((label || '').toUpperCase()) {
      case 'CRITICAL': return 'badge-critical';
      case 'HIGH': return 'badge-high';
      case 'MEDIUM': return 'badge-medium';
      default: return 'badge-low';
    }
  };

  const getCategoryIcon = (cat) => {
    const icons = { medical: '✙', rescue: '⚓', food_water: '🍚', shelter: '⛺' };
    return icons[cat] || '⚙';
  };

  const formatTime = (isoString) => {
    if (!isoString) return '—';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  const handleAutoAssign = (e, incident) => {
    e.stopPropagation();
    const nearest = findNearestShelter
      ? findNearestShelter(incident.lat, incident.lng, incident.category)
      : null;
    if (nearest && onAssignToZone) {
      onAssignToZone(incident.id, nearest);
    } else if (onDispatchIncident) {
      onDispatchIncident(incident.id);
    }
  };

  return (
    <div className="coordinator-panel card glass">
      <div className="card-header">
        <div className="portal-badge badge-coordinator">Coordinator Command Center</div>
        <h2>Active Incident Dashboard</h2>

        <div className="stats-row">
          <div className="stat-card pending" onClick={() => setFilterStatus('pending')}>
            <span className="stat-number">{totalPending}</span>
            <span className="stat-label">Pending Triage</span>
          </div>
          <div className="stat-card active" onClick={() => setFilterStatus('assigned')}>
            <span className="stat-number">{totalAssigned}</span>
            <span className="stat-label">Assigned</span>
          </div>
          <div className="stat-card completed" onClick={() => setFilterStatus('resolved')}>
            <span className="stat-number">{totalResolved}</span>
            <span className="stat-label">Resolved</span>
          </div>
        </div>
      </div>

      <div className="controls-section">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by ID, name, description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label><Filter size={12} /> Category</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="rescue">Rescue</option>
              <option value="medical">Medical</option>
              <option value="food_water">Food & Water</option>
              <option value="shelter">Shelter</option>
            </select>
          </div>

          <div className="filter-group">
            <label><Filter size={12} /> Severity</label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="all">All Severities</option>
              <option value="critical">Critical (75+)</option>
              <option value="high">High (50-74)</option>
              <option value="medium">Medium (25-49)</option>
              <option value="low">Low (0-24)</option>
            </select>
          </div>

          <div className="filter-group">
            <label><Filter size={12} /> Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      <div className="incident-list-container">
        {filteredIncidents.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={32} />
            <p>No incidents match these filters.</p>
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const isSelected = selectedIncidentId === incident.id;
            const nearest = findNearestShelter
              ? findNearestShelter(incident.lat, incident.lng, incident.category)
              : null;
            const assignedZoneName = incident.assignedZoneName
              || (incident.assignedZoneId ? shelters.find((s) => s.id === incident.assignedZoneId)?.name : null);

            return (
              <div
                key={incident.id}
                className={`incident-list-card ${isSelected ? 'selected' : ''} priority-${incident.priorityLabel.toLowerCase()} status-${incident.status}`}
                onClick={() => onSelectIncident(incident.id)}
              >
                <div className="priority-side-badge">
                  <div className="score-number">{Math.round(incident.priorityScore)}</div>
                  <div className="score-label">SCORE</div>
                </div>

                <div className="incident-card-content">
                  <div className="incident-card-header">
                    <div className="title-left">
                      <span className="cat-icon">{getCategoryIcon(incident.category)}</span>
                      <span className="card-id">#{incident.backendId || incident.id}</span>
                      <span className={`priority-badge ${getPriorityBadgeClass(incident.priorityLabel)}`}>
                        {incident.priorityLabel}
                      </span>
                    </div>
                    <span className="card-time">
                      <Calendar size={12} />
                      {formatTime(incident.createdAt)}
                    </span>
                  </div>

                  <p className="card-desc">{incident.description || <em style={{ opacity: 0.5 }}>No description</em>}</p>
                  {incident.scoreBreakdown && (
                    <p className="score-breakdown-text" style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "2px" }}>
                      {incident.scoreBreakdown}
                    </p>
                  )}


                  {/* Vulnerability tags */}
                  <div className="vulnerability-tags-row">
                    {incident.vulnerability?.trapped && <span className="vuln-tag red-tag">Trapped</span>}
                    {incident.vulnerability?.elderly && <span className="vuln-tag">Elderly</span>}
                    {incident.vulnerability?.infantsOrChildren && <span className="vuln-tag">Child</span>}
                    {incident.vulnerability?.pregnant && <span className="vuln-tag">Pregnant</span>}
                    {incident.vulnerability?.disabled && <span className="vuln-tag">Disabled</span>}
                  </div>

                  <div className="reporter-details">
                    <span><strong>Reporter:</strong> {incident.reporter}</span>
                    {incident.phone && incident.phone !== '—' && (
                      <span className="phone-link"><Phone size={11} /> {incident.phone}</span>
                    )}
                  </div>

                  {/* Zone assignment info */}
                  {incident.status === 'assigned' && assignedZoneName && (
                    <div className="route-info-box">
                      <span className="route-dot green-dot"></span>
                      <span>Assigned → <strong>{assignedZoneName}</strong></span>
                    </div>
                  )}
                  {incident.status === 'pending' && nearest && (
                    <div className="route-info-box recommended">
                      <span className="route-dot orange-dot"></span>
                      <Navigation size={11} style={{ display: 'inline', marginRight: 4 }} />
                      <span>Nearest: <strong>{nearest.name}</strong></span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                    {incident.status === 'pending' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={(e) => handleAutoAssign(e, incident)}
                        title={nearest ? `Assign to ${nearest.name}` : 'Dispatch team'}
                      >
                        <Zap size={12} />
                        <span>Auto-Assign</span>
                      </button>
                    )}
                    {incident.status === 'assigned' && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => onResolveIncident(incident.id)}
                      >
                        <CheckCircle size={12} />
                        <span>Mark Resolved</span>
                      </button>
                    )}
                    {incident.status === 'resolved' && (
                      <span className="resolution-indicator">✓ Case Resolved</span>
                    )}
                    {/* Delete button for junk tickets */}
                    {onDeleteTicket && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={(e) => { e.stopPropagation(); onDeleteTicket(incident.id); }}
                        title="Delete ticket"
                        style={{ marginLeft: 'auto', opacity: 0.6 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
