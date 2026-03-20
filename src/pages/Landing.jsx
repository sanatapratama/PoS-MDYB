import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function Landing() {
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={`app-container ${mounted ? 'visible' : ''}`}>
      <div className="motion-lines"></div>
      
      {/* Background Orbs */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      <nav className="navbar glass">
        <div className="nav-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'url(#gradient)'}}>
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--accent-blue)" />
                <stop offset="100%" stopColor="var(--accent-cyan)" />
              </linearGradient>
            </defs>
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <span>MDYB Store</span>
        </div>
        <div className="nav-links">
          <a href="#features" className="nav-item">Features</a>
          <a href="#inventory" className="nav-item">Inventory</a>
          <a href="#reports" className="nav-item">Reports</a>
          <a href="#pricing" className="nav-item">Pricing</a>
        </div>
        <div className="nav-actions">
          <button className="btn-primary" onClick={() => navigate('/pos')}>Go to POS</button>
        </div>
      </nav>

      <main className="hero">
        <div className="hero-content">
          <div className="hero-badge float-slow">v2.0 Beta Live</div>
          <h1 className="hero-title">
            <span className="gradient-text">Weightless</span> Retail<br />
            Terminal.
          </h1>
          <p className="hero-subtitle">
            A multi-device visualization of the MDYB Store Point of Sale system. 
            Experience adaptive, robust interface design featuring floating panels, 
            clean typography, and seamless data syncing.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => navigate('/pos')}>Start Selling</button>
            <button className="btn-secondary">View Demo</button>
          </div>
        </div>

        <div className="hero-visuals">
          <div className="mockup mockup-main glass float-element" style={{ animationDelay: '0s' }}>
            <div className="m-header"></div>
            <div className="m-body">
              <div className="m-sidebar"></div>
              <div className="m-content">
                <div className="m-row">
                  <div className="m-card"></div>
                  <div className="m-card"></div>
                  <div className="m-card"></div>
                </div>
                <div className="m-card" style={{ flex: 2 }}></div>
              </div>
            </div>
          </div>
          
          <div className="mockup mockup-tablet glass float-element" style={{ animationDelay: '-2s' }}>
            <div className="m-header"></div>
            <div className="m-body" style={{ flexDirection: 'column' }}>
              <div className="m-card"></div>
              <div className="m-row">
                 <div className="m-card"></div>
                 <div className="m-card"></div>
              </div>
            </div>
          </div>

          <div className="mockup mockup-phone glass float-element" style={{ animationDelay: '-4s' }}>
            <div className="m-header" style={{ height: '30px' }}></div>
            <div className="m-body" style={{ flexDirection: 'column' }}>
              <div className="m-card" style={{ flex: 1 }}></div>
              <div className="m-card" style={{ flex: 1 }}></div>
              <div className="m-card" style={{ flex: 1 }}></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Landing;
