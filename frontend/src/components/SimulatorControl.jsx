import React, { useState, useEffect } from 'react';
import { Play, Square, Zap, Droplet } from 'lucide-react';

export default function SimulatorControl({
  onSimulateIncident,
  onSimulateResourceDrop
}) {
  const [isLooping, setIsLooping] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(10); // seconds

  useEffect(() => {
    if (!isLooping) return;

    const timer = setInterval(() => {
      // Simulate incident
      onSimulateIncident();
      
      // Occasionally drop resources as well (30% chance per tick)
      if (Math.random() > 0.7) {
        onSimulateResourceDrop();
      }
    }, simulationSpeed * 1000);

    return () => clearInterval(timer);
  }, [isLooping, simulationSpeed]);

  return (
    <div className="simulator-control card glass">
      <div className="simulator-header">
        <div className="flex-align">
          <Zap size={16} className="text-warning animate-pulse" />
          <h3>Interactive Demo Control Panel</h3>
        </div>
        <span className="live-pill">SIMULATOR ACTIVE</span>
      </div>

      <p className="description">
        Use these controls during your hackathon presentation to inject simulated incidents and test the portal's real-time triage scoring, mapping, and resource routing.
      </p>

      <div className="simulator-actions">
        <button className="btn btn-warning" onClick={onSimulateIncident}>
          <Zap size={14} />
          <span>Inject Random Incident</span>
        </button>

        <button className="btn btn-secondary" onClick={onSimulateResourceDrop}>
          <Droplet size={14} />
          <span>Simulate Resource Drain</span>
        </button>
      </div>

      <div className="simulation-loop-section">
        <div className="loop-controls">
          <button
            className={`btn ${isLooping ? 'btn-danger' : 'btn-success'}`}
            onClick={() => setIsLooping(!isLooping)}
          >
            {isLooping ? <Square size={14} /> : <Play size={14} />}
            <span>{isLooping ? 'Stop Auto-Feed' : 'Start Auto-Feed Demo'}</span>
          </button>

          {isLooping && (
            <div className="speed-control">
              <label>Tick Rate: {simulationSpeed}s</label>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={simulationSpeed}
                onChange={(e) => setSimulationSpeed(Number(e.target.value))}
              />
            </div>
          )}
        </div>
        
        {isLooping && (
          <div className="active-loop-banner animate-pulse">
            Simulator loop running. Generating live incidents and depleting stocks automatically.
          </div>
        )}
      </div>
    </div>
  );
}
