import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Clock, Navigation, MapPin, MessageSquare, Phone, Camera } from 'lucide-react';

export default function CitizenPortal({ addIncident, onLocateOnMap, pickCoords, onClearPickCoords }) {
  const [formData, setFormData] = useState({
    reporter: '',
    phone: '',
    category: 'rescue',
    urgency: 'high',
    description: '',
    infantsOrChildren: false,
    elderly: false,
    pregnant: false,
    disabled: false,
    trapped: false
  });

  const [submittedReports, setSubmittedReports] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleQuickLocate = () => {
    const lat = 9.9312 + (Math.random() - 0.5) * 0.05;
    const lng = 76.2673 + (Math.random() - 0.5) * 0.05;
    onLocateOnMap(lat, lng);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.reporter || !formData.phone || !formData.description) {
      alert('Please fill out all required fields.');
      return;
    }

    let lat = pickCoords ? pickCoords.lat : 9.9312 + (Math.random() - 0.5) * 0.05;
    let lng = pickCoords ? pickCoords.lng : 76.2673 + (Math.random() - 0.5) * 0.05;

    const newReport = {
      id: `incident-${Math.floor(1000 + Math.random() * 9000)}`,
      reporter: formData.reporter,
      phone: formData.phone,
      category: formData.category,
      urgency: formData.urgency,
      description: formData.description,
      lat,
      lng,
      vulnerability: {
        infantsOrChildren: formData.infantsOrChildren,
        elderly: formData.elderly,
        pregnant: formData.pregnant,
        disabled: formData.disabled,
        trapped: formData.trapped
      },
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    addIncident(newReport);
    setSubmittedReports(prev => [newReport, ...prev]);
    setShowSuccess(true);
    onClearPickCoords();

    setFormData({
      reporter: '',
      phone: '',
      category: 'rescue',
      urgency: 'high',
      description: '',
      infantsOrChildren: false,
      elderly: false,
      pregnant: false,
      disabled: false,
      trapped: false
    });

    setTimeout(() => {
      setShowSuccess(false);
    }, 4000);
  };

  return (
    <div className="citizen-portal card glass">
      <div className="card-header">
        <div className="portal-badge">Citizen Portal</div>
        <h2>Report Hyper-Local Emergency</h2>
        <p className="subtitle">Submit an immediate distress report. Your report is processed by ResQMap's triage system and routed to nearby shelters.</p>
      </div>

      {/* ── SMS / Voice / MMS reporting alternative ─────────────────────── */}
      <div className="alt-report-banner">
        <div className="alt-report-header">
          <MessageSquare size={18} />
          <span>Can't use this form? Report by phone instead</span>
        </div>
        <div className="alt-report-body">
          <div className="alt-report-row">
            <Phone size={14} />
            <span>Call or text: <strong>+1 XXX XXX XXXX</strong></span>
          </div>
          <div className="alt-report-detail">
            <MessageSquare size={12} />
            <span>
              Just text what's happening and where — e.g.
              <br />
              <em>"Flood water rising fast near Kochi, family trapped, need rescue"</em>
            </span>
          </div>
          <div className="alt-report-detail">
            <Camera size={12} />
            <span>Can't type? Just send a photo or video — no text needed.</span>
          </div>
          <div className="alt-report-detail">
            <Phone size={12} />
            <span>Prefer to talk? Call the same number and describe your emergency after the beep.</span>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="success-banner animate-fade-in">
          <CheckCircle size={20} className="icon-success" />
          <span>Distress report dispatched! Dispatchers have been notified.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="portal-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="reporter">Reporter Name *</label>
            <input
              type="text"
              id="reporter"
              name="reporter"
              required
              placeholder="e.g. John Doe"
              value={formData.reporter}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Contact Number *</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              required
              placeholder="e.g. +91 98765 43210"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="rescue">Trapped / Rescue Required</option>
              <option value="medical">Medical Emergency</option>
              <option value="food_water">Food / Drinking Water Need</option>
              <option value="shelter">Extreme Shelter / Collapse Risk</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="urgency">Urgency Level *</label>
            <div className="radio-group">
              {['low', 'medium', 'high', 'critical'].map((level) => (
                <label key={level} className={`radio-label ${level} ${formData.urgency === level ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="urgency"
                    value={level}
                    checked={formData.urgency === level}
                    onChange={handleChange}
                  />
                  <span>{level.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Situation Details *</label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            placeholder="Describe what is happening, what resources are required, and if anyone is in direct danger..."
            value={formData.description}
            onChange={handleChange}
          ></textarea>
        </div>

        <div className="form-group">
          <label>Vulnerable Populations Present</label>
          <div className="checkbox-grid">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="infantsOrChildren"
                checked={formData.infantsOrChildren}
                onChange={handleChange}
              />
              <span>Infants/Children</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="elderly"
                checked={formData.elderly}
                onChange={handleChange}
              />
              <span>Elderly</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="pregnant"
                checked={formData.pregnant}
                onChange={handleChange}
              />
              <span>Pregnant</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="disabled"
                checked={formData.disabled}
                onChange={handleChange}
              />
              <span>Disabled / Injured</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="trapped"
                checked={formData.trapped}
                onChange={handleChange}
              />
              <span>Trapped/Confined</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Incident Location</label>
          <div className="location-control">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleQuickLocate}
            >
              <Navigation size={16} />
              <span>Simulate GPS Location</span>
            </button>
            <button
              type="button"
              className={`btn ${pickCoords ? 'btn-primary' : 'btn-secondary'}`}
              onClick={onLocateOnMap}
            >
              <MapPin size={16} />
              <span>{pickCoords ? 'Coordinate Locked' : 'Select on Map'}</span>
            </button>
          </div>
          {pickCoords ? (
            <div className="coord-badge animate-pulse">
              Locked Coords: Lat {pickCoords.lat.toFixed(5)}, Lng {pickCoords.lng.toFixed(5)}
              <button type="button" className="clear-coord" onClick={onClearPickCoords}>×</button>
            </div>
          ) : (
            <span className="info-text">If not specified, system generates simulated location.</span>
          )}
        </div>

        <button type="submit" className="btn btn-danger btn-block submit-btn">
          <ShieldAlert size={18} />
          <span>DISPATCH EMERGENCY DISTRESS TICKET</span>
        </button>
      </form>

      {submittedReports.length > 0 && (
        <div className="submitted-reports-section">
          <h3>Your Submitted Tickets</h3>
          <div className="mini-ticket-list">
            {submittedReports.map((report) => (
              <div key={report.id} className={`mini-ticket-card status-${report.status}`}>
                <div className="mini-ticket-header">
                  <span className="ticket-id">{report.id}</span>
                  <span className={`status-pill pill-${report.status}`}>
                    {report.status === 'pending' ? <Clock size={12} /> : <CheckCircle size={12} />}
                    {report.status.toUpperCase()}
                  </span>
                </div>
                <div className="mini-ticket-body">
                  <strong>{report.category.toUpperCase()}</strong>: {report.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}