import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const LANGS = ['ID', 'EN', 'JV'];

const CONTENT = {
  ID: {
    badge: 'v2.0 Beta Live',
    title1: 'MDYB - ',
    title2: 'SILENTERA.',
    subtitle: '(Si Layanan Entheng Teknologi Rekap Akurat) — Kelola toko Anda lebih cepat, mudah, dan akurat.',
    cta: 'Masuk ke Kasir',
    demo: 'Lihat Demo',
    nav: {
      features: 'Fitur',
      inventory: 'Inventaris',
      reports: 'Laporan',
      pricing: 'Harga'
    },
    stats: [
      { value: '100%', label: 'Cashless Ready' },
      { value: 'QRIS', label: 'Terintegrasi' },
      { value: 'Real-time', label: 'Sinkronisasi' },
    ],
    features: [
      { icon: '🏪', title: 'Terminal POS', desc: 'Grid produk, filter kategori, keranjang cepat' },
      { icon: '📱', title: 'QRIS Dinamis', desc: 'QR otomatis sesuai nominal transaksi' },
      { icon: '💸', title: 'Bayar Campuran', desc: 'Tunai + QRIS dalam satu transaksi' },
      { icon: '📒', title: 'Kasbon / Hutang', desc: 'Catat piutang pelanggan tetap' },
      { icon: '🏷️', title: 'Harga Grosir', desc: 'Diskon otomatis saat beli banyak' },
      { icon: '💬', title: 'Struk WhatsApp', desc: 'Kirim struk digital ke HP pelanggan' },
    ],
  },
  EN: {
    badge: 'v2.0 Beta Live',
    title1: 'MDYB - ',
    title2: 'SILENTERA.',
    subtitle: '(Si Layanan Entheng Teknologi Rekap Akurat) — Manage your store faster, easier, and more accurately.',
    cta: 'Open Cashier',
    demo: 'View Demo',
    nav: {
      features: 'Features',
      inventory: 'Inventory',
      reports: 'Reports',
      pricing: 'Pricing'
    },
    stats: [
      { value: '100%', label: 'Cashless Ready' },
      { value: 'QRIS', label: 'Integrated' },
      { value: 'Real-time', label: 'Sync' },
    ],
    features: [
      { icon: '🏪', title: 'POS Terminal', desc: 'Product grid, category filter, quick cart' },
      { icon: '📱', title: 'Dynamic QRIS', desc: 'Auto QR code per transaction amount' },
      { icon: '💸', title: 'Split Payment', desc: 'Cash + QRIS in one transaction' },
      { icon: '📒', title: 'Kasbon / Debt', desc: 'Record debt for loyal customers' },
      { icon: '🏷️', title: 'Wholesale Price', desc: 'Auto discount on bulk purchases' },
      { icon: '💬', title: 'WA Receipt', desc: 'Send digital receipt to customer phone' },
    ],
  },
  JV: {
    badge: 'v2.0 Beta Anyar',
    title1: 'MDYB - ',
    title2: 'SILENTERA.',
    subtitle: '(Si Layanan Entheng Teknologi Rekap Akurat) — Atur toko sampeyan kanthi luwih cepet, gampang, lan akurat.',
    cta: 'Mlebu Kasir',
    demo: 'Delok Demo',
    nav: {
      features: 'Fitur',
      inventory: 'Stok Barang',
      reports: 'Laporan',
      pricing: 'Regane'
    },
    stats: [
      { value: '100%', label: 'Cashless Siyap' },
      { value: 'QRIS', label: 'Wis Nduwe' },
      { value: 'Real-time', label: 'Sinkronisasi' },
    ],
    features: [
      { icon: '🏪', title: 'Terminal Kasir', desc: 'Dhaptar produk, saringan, keranjang cepet' },
      { icon: '📱', title: 'QRIS Otomatis', desc: 'QR kode langsung sesuai jumlah bayar' },
      { icon: '💸', title: 'Bayar Campuran', desc: 'Tunai + QRIS dadi siji transaksi' },
      { icon: '📒', title: 'Kasbon / Utang', desc: 'Nyathet utange pelanggan tetap' },
      { icon: '🏷️', title: 'Rega Grosir', desc: 'Diskon otomatis yen tuku akeh' },
      { icon: '💬', title: 'Struk WhatsApp', desc: 'Kirim struk digital ning HP pelanggan' },
    ],
  },
};

export default function Landing() {
  const navigate = useNavigate();
  const [lang, setLang] = useState('ID');
  const text = CONTENT[lang];

  const cycleLang = () => {
    setLang(prev => {
      const idx = LANGS.indexOf(prev);
      return LANGS[(idx + 1) % LANGS.length];
    });
  };

  return (
    <div className="app-container visible" style={{ background: 'var(--bg-gradient)' }}>
      <div className="motion-lines" />
      <div className="glow-orb orb-1" />
      <div className="glow-orb orb-2" />

      {/* ── NAVBAR ── */}
      <nav className="navbar glass">
        <div className="nav-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="url(#ng)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="ng" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--accent-blue)" />
                <stop offset="100%" stopColor="var(--accent-cyan)" />
              </linearGradient>
            </defs>
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem' }}>
            MDYB <span style={{
              background: 'linear-gradient(45deg, var(--accent-blue), var(--accent-cyan))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>- SILENTERA</span>
          </span>
        </div>

        <div className="nav-links">
          <a href="#features" className="nav-item">{text.nav.features}</a>
          <a href="#inventory" className="nav-item">{text.nav.inventory}</a>
          <a href="#reports" className="nav-item">{text.nav.reports}</a>
          <a href="#pricing" className="nav-item">{text.nav.pricing}</a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Language Toggle */}
          <button onClick={cycleLang} style={{
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(58,123,213,0.25)',
            borderRadius: '20px',
            padding: '0.45rem 1rem',
            fontWeight: 700,
            fontSize: '0.85rem',
            color: 'var(--accent-blue)',
            cursor: 'pointer',
            transition: 'all 0.3s',
            display: 'flex', alignItems: 'center', gap: '0.4rem'
          }}>
            🌐 {lang}
          </button>

          <button className="btn-primary" onClick={() => navigate('/pos')}>
            {text.cta}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '8rem 2rem 4rem',
        gap: '1.5rem',
        position: 'relative',
      }}>
        {/* Badge */}
        <span className="hero-badge float-slow">{text.badge}</span>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(2.5rem, 6vw, 5rem)',
          lineHeight: 1.1,
          fontWeight: 700,
          color: 'var(--text-primary)',
          maxWidth: '750px',
        }}>
          <span style={{
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{text.title1} </span>
          {text.title2}
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '1.15rem',
          color: 'var(--text-secondary)',
          maxWidth: '520px',
          lineHeight: 1.7,
        }}>{text.subtitle}</p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn-primary float-element" onClick={() => navigate('/pos')}
            style={{ padding: '0.9rem 2.5rem', fontSize: '1.05rem' }}>
            {text.cta} →
          </button>
          <button className="btn-secondary" style={{ padding: '0.9rem 2.5rem', fontSize: '1.05rem' }}>
            {text.demo}
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '3rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {text.stats.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '1.75rem', fontWeight: 800,
                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{s.value}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Floating device art */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '700px', height: '220px', marginTop: '1rem' }}>
          {/* Laptop mockup */}
          <div className="glass float-element" style={{
            position: 'absolute', left: '50%', top: '10%',
            transform: 'translateX(-50%)',
            width: '380px', height: '160px',
            padding: '1rem',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
            animationDelay: '0s',
          }}>
            <div style={{ height: '16px', borderRadius: '6px', background: 'rgba(58,123,213,0.12)', width: '100%' }} />
            <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
              <div style={{ width: '22%', borderRadius: '6px', background: 'rgba(58,123,213,0.07)' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem', flex: 1 }}>
                  <div style={{ flex: 1, borderRadius: '6px', background: 'rgba(255,255,255,0.8)' }} />
                  <div style={{ flex: 1, borderRadius: '6px', background: 'rgba(255,255,255,0.8)' }} />
                  <div style={{ flex: 1, borderRadius: '6px', background: 'rgba(255,255,255,0.8)' }} />
                </div>
                <div style={{ flex: 1.5, borderRadius: '6px', background: 'rgba(255,255,255,0.8)' }} />
              </div>
            </div>
          </div>
          {/* Phone mockup */}
          <div className="glass float-element" style={{
            position: 'absolute', left: '5%', bottom: '0',
            width: '90px', height: '170px',
            padding: '0.75rem',
            display: 'flex', flexDirection: 'column', gap: '0.4rem',
            animationDelay: '-2s',
          }}>
            <div style={{ height: '14px', borderRadius: '5px', background: 'rgba(58,123,213,0.12)' }} />
            {[1, 2, 3].map(i => (
              <div key={i} style={{ flex: 1, borderRadius: '5px', background: 'rgba(255,255,255,0.8)' }} />
            ))}
          </div>
          {/* Tablet mockup */}
          <div className="glass float-element" style={{
            position: 'absolute', right: '5%', bottom: '0',
            width: '150px', height: '180px',
            padding: '0.75rem',
            display: 'flex', flexDirection: 'column', gap: '0.4rem',
            animationDelay: '-4s',
          }}>
            <div style={{ height: '14px', borderRadius: '5px', background: 'rgba(58,123,213,0.12)' }} />
            <div style={{ flex: 1, borderRadius: '5px', background: 'rgba(255,255,255,0.8)' }} />
            <div style={{ display: 'flex', gap: '0.4rem', flex: 1.2 }}>
              <div style={{ flex: 1, borderRadius: '5px', background: 'rgba(255,255,255,0.8)' }} />
              <div style={{ flex: 1, borderRadius: '5px', background: 'rgba(255,255,255,0.8)' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section id="features" style={{
        padding: '4rem 2rem 6rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3rem',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '2rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          textAlign: 'center',
        }}>
          {lang === 'ID' ? 'Fitur Unggulan' : lang === 'EN' ? 'Key Features' : 'Fitur Andalan'}
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1.5rem',
          width: '100%',
          maxWidth: '900px',
        }}>
          {text.features.map((f, i) => (
            <div key={i} className="glass" style={{
              padding: '1.5rem',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              transition: 'all 0.3s',
              cursor: 'default',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span style={{ fontSize: '2rem' }}>{f.icon}</span>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{f.title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <button className="btn-primary" onClick={() => navigate('/pos')}
          style={{ marginTop: '1rem', padding: '1rem 3rem', fontSize: '1.1rem' }}>
          {text.cta} →
        </button>
      </section>
    </div>
  );
}
