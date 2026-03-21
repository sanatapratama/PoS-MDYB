import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const LANGS = ['ID', 'EN', 'JV'];

const CONTENT = {
  ID: {
    badge: 'v2.0 Beta Live',
    title1: 'Si ',
    title2: 'Lentera.',
    subtitle: 'Solusi Kasir Ringan, Setulus Hati, Setajam Akurasi.',
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
    title1: 'Si ',
    title2: 'Lentera.',
    subtitle: 'Solusi Kasir Ringan, Setulus Hati, Setajam Akurasi.',
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
    title1: 'Si ',
    title2: 'Lentera.',
    subtitle: 'Solusi Kasir Ringan, Setulus Hati, Setajam Akurasi.',
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
    <div className="app-container visible">
      <div className="motion-lines" />
      <div className="glow-orb orb-1" />
      <div className="glow-orb orb-2" />

      {/* ── NAVBAR ── */}
      <nav className="navbar glass">
        <div className="nav-brand" style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src="https://res.cloudinary.com/dsichsufc/image/upload/v1774077572/Gemini_Generated_Image_8kdszf8kdszf8kds_n5l2gf.png" 
            alt="Si Lentera Logo" 
            style={{ height: '40px', objectFit: 'contain', mixBlendMode: 'multiply' }} 
          />
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
        {/* Badge moved to H1 */}

        {/* Title */}
        <h1 style={{ maxWidth: '750px', margin: '0 auto', marginBottom: '1.5rem' }}>
          <img 
            src="https://res.cloudinary.com/dsichsufc/image/upload/v1774077572/Gemini_Generated_Image_8kdszf8kdszf8kds_n5l2gf.png" 
            alt="Si Lentera Logo" 
            style={{ width: '100%', maxWidth: '500px', objectFit: 'contain', mixBlendMode: 'multiply' }} 
          />
        </h1>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn-primary float-element" onClick={() => navigate('/pos')}
            style={{ padding: '0.9rem 2.5rem', fontSize: '1.05rem', boxShadow: '0 15px 30px -10px rgba(37,99,235,0.4)', letterSpacing: '0.02em', fontWeight: 'bold' }}>
            {text.cta} →
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

        {/* Floating device art clustered */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '800px', height: '320px', marginTop: '3rem', perspective: '1200px', display: 'flex', justifyContent: 'center' }}>
          
          {/* Main App Mockup (Laptop) */}
          <div className="glass float-antigravity" style={{
            position: 'absolute', top: 0,
            width: '560px', height: '280px',
            padding: '1.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.8rem',
            animationDelay: '0s', zIndex: 10,
            background: 'rgba(255, 255, 255, 0.95)'
          }}>
            <div style={{ height: '20px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.1)', width: '40%' }} />
            <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
              <div style={{ width: '20%', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.05)' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem', flex: 1 }}>
                  {[1,2,3].map(i => <div key={i} style={{ flex: 1, borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)' }} />)}
                </div>
                <div style={{ flex: 1.5, borderRadius: '8px', background: 'rgba(241, 245, 249, 1)' }} />
              </div>
            </div>
          </div>
          
          {/* Tablet / POS Screen Mockup (Overlapping Bottom Right) */}
          <div className="glass float-antigravity" style={{
            position: 'absolute', right: '5%', bottom: '-20px',
            width: '200px', height: '240px',
            padding: '1rem',
            display: 'flex', flexDirection: 'column', gap: '0.6rem',
            animationDelay: '-2s', zIndex: 20,
            background: 'rgba(255, 255, 255, 0.95)'
          }}>
            <div style={{ height: '16px', borderRadius: '4px', background: 'rgba(37, 99, 235, 0.15)' }} />
            <div style={{ flex: 1, borderRadius: '6px', background: 'rgba(241, 245, 249, 1)' }} />
            <div style={{ height: '40px', borderRadius: '6px', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))' }} />
          </div>

          {/* Phone Payment Mockup (Overlapping Bottom Left) */}
          <div className="glass float-antigravity" style={{
            position: 'absolute', left: '15%', bottom: '20px',
            width: '120px', height: '220px',
            padding: '0.8rem',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
            animationDelay: '-4s', zIndex: 15,
            background: 'rgba(255, 255, 255, 0.95)'
          }}>
            <div style={{ height: '40px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)' }} />
            <div style={{ flex: 1, borderRadius: '8px', background: 'rgba(241, 245, 249, 1)' }} />
            <div style={{ height: '30px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)' }} />
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
        <button className="btn-primary" onClick={() => navigate('/admin2026')}
          style={{ marginTop: '1rem', padding: '1rem 3rem', fontSize: '1.1rem' }}>
          {text.cta} →
        </button>
      </section>
    </div>
  );
}
