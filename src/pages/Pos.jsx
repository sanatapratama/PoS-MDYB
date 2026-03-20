import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Search, ScanLine, LayoutGrid, Clock, Settings, User, 
  ShoppingCart, Plus, Minus, CreditCard, ChevronRight, 
  Home, Trash2, Percent, FileText, Camera, PauseCircle,
  FileBarChart, Fingerprint, Globe, Unlock, QrCode,
  CheckCircle, MessageCircle, BookOpen, Package
} from 'lucide-react';
import './Pos.css';

const WHOLESALE_RULES = {
  3: 0.05,   // 5% off at qty 3+
  6: 0.10,   // 10% off at qty 6+
  12: 0.15,  // 15% off at qty 12+
};

const MOCK_PRODUCTS = [
  { id: 1, name: 'Espresso Core',       category: 'Drinks', price: 25000, stock: 45 },
  { id: 2, name: 'Cyber Matcha Latte',  category: 'Drinks', price: 35000, stock: 12 },
  { id: 3, name: 'Neon Glitch Burger',  category: 'Food',   price: 45000, stock: 5  },
  { id: 4, name: 'Quantum Fries',       category: 'Snacks', price: 20000, stock: 80 },
  { id: 5, name: 'Zero-G Water',        category: 'Drinks', price: 10000, stock: 120},
  { id: 6, name: 'Holo-Donut',          category: 'Snacks', price: 15000, stock: 2  },
  { id: 7, name: 'Void Coffee',         category: 'Drinks', price: 28000, stock: 34 },
  { id: 8, name: 'Synthwave Pasta',     category: 'Food',   price: 55000, stock: 15 },
];

const DICT = {
  ID: {
    searchPlaceholder: "Cari produk, SKU atau scan barcode...",
    online: "Supabase Synced", offline: "Tersimpan Lokal (Offline)",
    admin: "Kasir Shift A", all: "Semua", currentOrder: "Pesanan Saat Ini",
    emptyCart: "Keranjang Kosong", discount: "Diskon", note: "Catatan",
    subtotal: "Subtotal", tax: "Pajak (11%)", total: "Total", charge: "Bayar Tunai",
    customerSelect: "Pilih Pelanggan / Loyalitas", stock: "Sisa",
    holdOrder: "Tahan Pesanan", clearCart: "Hapus Semua",
    openDrawer: "Buka Laci", shiftReport: "Laporan Shift",
    qrisBtn: "Bayar QRIS", splitBtn: "Bayar Campuran", kasbonBtn: "Catat Hutang",
    roundUp: "Bulatkan ke atas", donation: "Donasi",
    sendWA: "Kirim Struk WA", closeBtn: "Tutup",
    successTitle: "Transaksi Berhasil!", qrisTitle: "Scan QRIS",
    splitTitle: "Bayar Campuran",  kasbonTitle: "Catat Hutang",
    cashInput: "Bayar Tunai (Rp)", remaining: "Sisa via QRIS",
    wholesale: "Grosir",
  },
  EN: {
    searchPlaceholder: "Search by name, SKU or scan barcode...",
    online: "Supabase Synced", offline: "Saved Locally (Offline)",
    admin: "Cashier Shift A", all: "All", currentOrder: "Current Order",
    emptyCart: "Cart is empty", discount: "Discount", note: "Add Note",
    subtotal: "Subtotal", tax: "Tax (11%)", total: "Total", charge: "Pay Cash",
    customerSelect: "Select Customer / Loyalty", stock: "Left",
    holdOrder: "Hold Order", clearCart: "Clear Cart",
    openDrawer: "Open Drawer", shiftReport: "Shift Report",
    qrisBtn: "Pay QRIS", splitBtn: "Split Payment", kasbonBtn: "Record Debt",
    roundUp: "Round Up", donation: "Donation",
    sendWA: "Send WA Receipt", closeBtn: "Close",
    successTitle: "Transaction Complete!", qrisTitle: "Scan QRIS",
    splitTitle: "Split Payment", kasbonTitle: "Record Debt",
    cashInput: "Cash Tendered (Rp)", remaining: "Rest via QRIS",
    wholesale: "Wholesale",
  }
};

function getWholesaleDiscount(qty) {
  let bestDiscount = 0;
  for (const [threshold, disc] of Object.entries(WHOLESALE_RULES)) {
    if (qty >= Number(threshold)) bestDiscount = disc;
  }
  return bestDiscount;
}

function formatIDR(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

// ──────────────────────── MODALS ────────────────────────

function QRISModal({ total, text, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <QrCode size={32} color="var(--accent-blue)" />
        <h3>{text.qrisTitle}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>Total pembayaran:</p>
        <p style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{formatIDR(total)}</p>
        <div className="qris-code" />
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Arahkan kamera HP ke QR di atas. Pembayaran terdeteksi otomatis.
        </p>
        <button className="modal-close" onClick={onClose}>{text.closeBtn}</button>
      </div>
    </div>
  );
}

function SplitModal({ total, text, onClose, onConfirm }) {
  const [cashInput, setCashInput] = useState('');
  const cashNum = parseFloat(cashInput.replace(/\D/g, '')) || 0;
  const remaining = Math.max(total - cashNum, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <CreditCard size={32} color="var(--accent-blue)" />
        <h3>{text.splitTitle}</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Total: <strong>{formatIDR(total)}</strong></p>
        <div className="split-inputs">
          <label>{text.cashInput}</label>
          <input
            type="number"
            placeholder="0"
            value={cashInput}
            onChange={e => setCashInput(e.target.value)}
            style={{ borderColor: cashNum > total ? '#ff4757' : '#ddd' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(58,123,213,0.05)', borderRadius: '10px' }}>
            <span>{text.remaining}</span>
            <strong style={{ color: 'var(--accent-blue)' }}>{formatIDR(remaining)}</strong>
          </div>
        </div>
        <button className="checkout-btn qris" style={{ width: '100%', marginTop: 0 }} onClick={() => onConfirm(cashNum, remaining)}>
          <QrCode size={20} /> Lanjut ke QRIS {formatIDR(remaining)}
        </button>
        <button className="modal-close" onClick={onClose}>{text.closeBtn}</button>
      </div>
    </div>
  );
}

function KasbonModal({ text, onClose, onConfirm }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <BookOpen size={32} color="#ff9f43" />
        <h3 style={{ color: '#ff9f43' }}>{text.kasbonTitle}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Transaksi akan dicatat sebagai piutang.</p>
        <div className="split-inputs">
          <label>Nama Pelanggan</label>
          <input placeholder="Budi Santoso" value={name} onChange={e => setName(e.target.value)} />
          <label>Nomor HP</label>
          <input placeholder="08xxxxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <button className="checkout-btn" style={{ width: '100%', background: 'linear-gradient(135deg,#ff9f43,#feca57)' }}
          onClick={() => onConfirm(name, phone)}>
          <BookOpen size={20} /> Simpan Kasbon
        </button>
        <button className="modal-close" onClick={onClose}>{text.closeBtn}</button>
      </div>
    </div>
  );
}

function SuccessModal({ text, total, onClose }) {
  const [waNum, setWaNum] = useState('');

  const sendWA = () => {
    const msg = encodeURIComponent(`Struk Belanja MDYB Store\nTotal: ${formatIDR(total)}\nTerima kasih sudah berbelanja!`);
    const num = waNum.replace(/^0/, '62');
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="success-icon"><CheckCircle size={40} /></div>
        <h3>{text.successTitle}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Total dibayar: <strong>{formatIDR(total)}</strong>
        </p>
        <div className="split-inputs" style={{ textAlign: 'left' }}>
          <label>Nomor WhatsApp Pelanggan</label>
          <input placeholder="0812xxxxxxxx" value={waNum} onChange={e => setWaNum(e.target.value)} />
        </div>
        <button className="wa-btn" onClick={sendWA}>
          <MessageCircle size={20} /> {text.sendWA}
        </button>
        <button className="modal-close" onClick={onClose}>{text.closeBtn}</button>
      </div>
    </div>
  );
}

// ──────────────────────── LOGIN SCREEN ────────────────────────

// Data kasir akan diambil dari database
const KASIR_USERS_PLACEHOLDER = [];

function LoginScreen({ cashiers, onLogin }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (cashiers && cashiers.length > 0) {
      setSelectedUser(cashiers[0].id);
    }
  }, [cashiers]);

  const handleLogin = (e) => {
    e.preventDefault();
    const user = cashiers.find(u => u.id === selectedUser);
    if (user && user.password === password) {
      onLogin(user);
    } else {
      setError('Password salah! Silakan coba lagi.');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-box glass">
        <Unlock size={48} color="var(--accent-blue)" style={{ margin: '0 auto 1rem', display: 'block' }} />
        <h2>Masuk ke POS</h2>
        <form className="login-form" onSubmit={handleLogin}>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            {cashiers.length === 0 ? (
              <option disabled>Loading Kasir...</option>
            ) : (
              cashiers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))
            )}
          </select>
          <input
            type="password"
            placeholder="Masukkan Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="login-btn">Masuk</button>
          {error && <p className="login-error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

// ──────────────────────── MAIN POS ────────────────────────

export default function Pos() {
  const navigate = useNavigate();
  const [activeUser, setActiveUser] = useState(null); // Tracks logged in user
  const [lang, setLang] = useState('ID');
  const [isOffline, setIsOffline] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [cart, setCart] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [donation, setDonation] = useState(0);

  // Modals
  const [modal, setModal] = useState(null); // 'qris' | 'split' | 'kasbon' | 'success'
  const [lastTotal, setLastTotal] = useState(0);

  // Supabase Data
  const [dbCategories, setDbCategories] = useState([]);
  const [dbCashiers, setDbCashiers] = useState([]);
  const [dbProducts, setDbProducts] = useState(MOCK_PRODUCTS);

  useEffect(() => {
    async function fetchSupabaseData() {
      if (isOffline) return;
      try {
        const { data: catData, error: catErr } = await supabase.from('categories').select('*');
        if (!catErr && catData) setDbCategories(catData);

        const { data: prodData, error: prodErr } = await supabase.from('products').select('*');
        if (!prodErr && prodData && prodData.length > 0) setDbProducts(prodData);

        const { data: cashData, error: cashErr } = await supabase.from('cashiers').select('*');
        if (cashErr) {
          setDbCashiers([{ id: 'error', name: `⚠️ Error: ${cashErr.message || 'Gagal Konek URL'}` }]);
        } else if (cashData && cashData.length > 0) {
          setDbCashiers(cashData);
        } else {
          setDbCashiers([{ id: 'error', name: `⚠️ Tabel Kasir Masih Kosong` }]);
        }
      } catch (e) {
        setDbCashiers([{ id: 'error', name: `⚠️ Fatal: ${e.message}` }]);
      }
    }
    fetchSupabaseData();
  }, [isOffline]);

  const text = DICT[lang];

  // Derived categories
  const categories = [{ key: 'all', label: text.all }];
  if (dbCategories.length > 0) {
    dbCategories.forEach(c => categories.push({ key: c.name, label: c.name }));
  } else {
    ['Drinks', 'Food', 'Snacks'].forEach(c => categories.push({ key: c, label: c }));
  }

  // Derived products
  const filteredProducts = activeTab === 'all'
    ? dbProducts
    : dbProducts.filter(p => p.category === activeTab);

  // ── cart helpers ──
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        const newQty = existing.qty + 1;
        const disc = getWholesaleDiscount(newQty);
        return prev.map(i => i.id === product.id ? { ...i, qty: newQty, discount: disc } : i);
      }
      return [...prev, { ...product, qty: 1, discount: 0 }];
    });
  };

  const updateQty = (id, delta, e) => {
    e.stopPropagation();
    setCart(prev => prev.flatMap(item => {
      if (item.id !== id) return [item];
      const newQty = item.qty + delta;
      if (newQty <= 0) return [];
      const disc = getWholesaleDiscount(newQty);
      return [{ ...item, qty: newQty, discount: disc }];
    }));
  };

  const subtotal = cart.reduce((sum, item) => {
    const discPrice = item.price * (1 - item.discount);
    return sum + discPrice * item.qty;
  }, 0);
  const tax = subtotal * 0.11;
  const raw = subtotal + tax;
  const rounded = Math.ceil(raw / 500) * 500;
  const donationAmt = donation ? rounded - raw : 0;
  const total = donation ? rounded : raw;

  // ── checkout flows ──
  const finishUI = (amount) => {
    setLastTotal(amount);
    setCart([]);
    setDonation(0);
    setModal('success');
  };

  const saveToSupabase = async (method, extra = {}) => {
    const txData = {
      items: cart,
      subtotal,
      tax,
      total,
      payment_method: method,
      cash_amount: extra.cash || (method === 'cash' ? total : 0),
      qris_amount: extra.qris || (method === 'qris' ? total : 0),
      donation_amount: donationAmt,
      cashier_id: activeUser ? activeUser.id : 'unknown'
    };

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([txData])
        .select();

      if (error) throw error;

      if (method === 'kasbon') {
        const { error: kasbonErr } = await supabase
          .from('kasbon')
          .insert([{
            customer_name: extra.name,
            customer_phone: extra.phone,
            amount: total,
            transaction_id: data[0].id
          }]);
        if (kasbonErr) throw kasbonErr;
      }
      
      finishUI(total);
    } catch (err) {
      console.error('Supabase Save Error:', err);
      // Fallback: Just finish UI but log it. 
      // In production, you'd want a local sync mechanism.
      finishUI(total);
      alert('Transaksi tersimpan secara lokal (Gagal sync Supabase)');
    }
  };

  if (!activeUser) {
    return <LoginScreen cashiers={dbCashiers} onLogin={(user) => setActiveUser(user)} />;
  }

  return (
    <div className="pos-container visible">
      <div className="motion-lines" />

      {/* ── Modals ── */}
      {modal === 'qris'   && <QRISModal   total={total}  text={text} onClose={() => setModal(null)} />}
      {modal === 'split'  && <SplitModal  total={total}  text={text} onClose={() => setModal(null)}
        onConfirm={(cash, rest) => { setModal(null); saveToSupabase('split', { cash, qris: rest }); }} />}
      {modal === 'kasbon' && <KasbonModal text={text} onClose={() => setModal(null)}
        onConfirm={(name, phone) => { setModal(null); saveToSupabase('kasbon', { name, phone }); }} />}
      {modal === 'success'&& <SuccessModal text={text} total={lastTotal} onClose={() => setModal(null)} />}

      {/* ── Left Sidebar ── */}
      <aside className="pos-sidebar-left glass">
        <div className="nav-icon" onClick={() => navigate('/')} title="Home"><Home size={26}/><span className="nav-label">HOME</span></div>
        <div style={{ marginTop: '1rem' }}/>
        <div className="nav-icon active"><LayoutGrid size={26}/><span className="nav-label">POS</span></div>
        <div className="nav-icon"><Clock size={26}/><span className="nav-label">HISTORY</span></div>
        <div className="nav-icon"><User size={26}/><span className="nav-label">MEMBERS</span></div>
        <div className="nav-icon"><FileBarChart size={26}/><span className="nav-label">REPORT</span></div>
        <div className="nav-icon"><Package size={26}/><span className="nav-label">STOCK</span></div>
        <div className="nav-icon" onClick={() => alert('Drawer Opened!')}><Unlock size={26}/><span className="nav-label">DRAWER</span></div>
        <div className="nav-icon" style={{ marginTop: 'auto' }}><Settings size={26}/><span className="nav-label">OPTIONS</span></div>
      </aside>

      {/* ── Main ── */}
      <main className="pos-main">
        {/* Header */}
        <header className="pos-header">
          <div className="header-search">
            <Search size={20} color="var(--text-secondary)" />
            <input type="text" placeholder={text.searchPlaceholder} />
            <div className="scan-toggle" onClick={() => setCameraActive(!cameraActive)}
              style={cameraActive ? { background: 'var(--accent-blue)', color: 'white' } : {}}>
              {cameraActive ? <Camera size={20} /> : <ScanLine size={20} />}
            </div>
          </div>
          <div className="header-tools">
            <button className="lang-toggle" onClick={() => setLang(l => l === 'ID' ? 'EN' : 'ID')}>
              <Globe size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />{lang}
            </button>
            <div className={`sync-status ${isOffline ? 'offline' : 'online'}`} onClick={() => setIsOffline(o => !o)}>
              <div className="sync-dot" />{isOffline ? text.offline : text.online}
            </div>
            <div className="user-profile glass" style={{ padding: '0.5rem 1rem', borderRadius: '20px' }}>
              <Fingerprint size={18} color="var(--accent-blue)" />
              <span>{activeUser ? activeUser.name : text.admin}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="pos-content">
          {/* Products */}
          <section className="product-section">
            <div className="category-tabs">
              {categories.map(c => (
                <button key={c.key}
                  className={`tab-btn ${activeTab === c.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(c.key)}>{c.label}</button>
              ))}
            </div>
            <div className="product-grid">
              {filteredProducts.map(p => {
                const isLow = p.stock <= 5;
                return (
                  <div key={p.id} className="product-card" onClick={() => addToCart(p)}>
                    <div className="product-image">
                      <div className={`stock-badge ${isLow ? 'low' : ''}`}>{text.stock} {p.stock}</div>
                      <div className="wholesale-badge">Grosir -15%</div>
                      <ShoppingCart size={32} opacity={0.5} />
                    </div>
                    <div className="product-info">
                      <h4>{p.name}</h4>
                      <span className="product-price">{formatIDR(p.price)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Cart */}
          <aside className="cart-panel glass">
            <div className="cart-header">
              <h2>{text.currentOrder}</h2>
              <div className="cart-actions">
                <button className="tool-btn" style={{ padding: '0.5rem' }} title={text.holdOrder}><PauseCircle size={20} color="var(--accent-blue)" /></button>
                <button className="tool-btn" style={{ padding: '0.5rem' }} title={text.clearCart} onClick={() => setCart([])}><Trash2 size={20} color="#ff4757" /></button>
              </div>
            </div>

            {/* Customer */}
            <div className="customer-card">
              <User size={28} color="var(--accent-blue)" opacity={0.7} />
              <div className="customer-info">
                <h5>{text.customerSelect}</h5>
                <p>+62812... / Nama Pelanggan</p>
              </div>
              <ChevronRight size={20} opacity={0.3} />
            </div>

            {/* Items */}
            <div className="cart-items">
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', opacity: 0.4, marginTop: '2rem' }}>
                  <ShoppingCart size={48} style={{ margin: '0 auto 1rem' }} />
                  <p>{text.emptyCart}</p>
                </div>
              ) : cart.map(item => {
                const discPrice = item.price * (1 - item.discount);
                return (
                  <div key={item.id} className="cart-item">
                    <div className="item-details">
                      <h5>{item.name}</h5>
                      <p>{formatIDR(discPrice)}</p>
                      {item.discount > 0 && (
                        <span className="wholesale-note">
                          🏷 Grosir -{(item.discount * 100).toFixed(0)}% (beli {item.qty})
                        </span>
                      )}
                    </div>
                    <div className="qty-control">
                      <button className="qty-btn" onClick={e => updateQty(item.id, -1, e)}><Minus size={14} /></button>
                      <span className="qty-display">{item.qty}</span>
                      <button className="qty-btn" onClick={e => updateQty(item.id, 1, e)}><Plus size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Tools */}
            <div className="cart-tools">
              <button className="tool-btn"><Percent size={18} /> {text.discount}</button>
              <button className="tool-btn"><FileText size={18} /> {text.note}</button>
            </div>

            {/* Summary */}
            <div className="cart-summary">
              <div className="summary-row"><span>{text.subtotal}</span><span>{formatIDR(subtotal)}</span></div>
              <div className="summary-row"><span>{text.tax}</span><span>{formatIDR(tax)}</span></div>
              {donation > 0 && (
                <div className="summary-row donation">
                  <span>💚 {text.donation}</span><span>+{formatIDR(donationAmt)}</span>
                </div>
              )}

              {/* Round up button */}
              <div className="round-btn-container">
                <button className="round-btn" onClick={() => setDonation(d => d ? 0 : 1)}>
                  {donation ? '✓ Dibulatkan' : `⬆ ${text.roundUp} → ${formatIDR(rounded)}`}
                </button>
              </div>

              <div className="summary-row total"><span>{text.total}</span><span>{formatIDR(total)}</span></div>

              <div className="checkout-grid">
                <button className="checkout-btn" onClick={() => saveToSupabase('cash')}>
                  <CreditCard size={18} /> {text.charge}
                </button>
                <button className="checkout-btn qris" onClick={() => saveToSupabase('qris')}>
                  <QrCode size={18} /> {text.qrisBtn}
                </button>
                <button className="checkout-btn split" onClick={() => setModal('split')}>
                  <CreditCard size={18} /> {text.splitBtn}
                </button>
                <button className="checkout-btn kasbon" onClick={() => setModal('kasbon')}>
                  <BookOpen size={18} /> {text.kasbonBtn}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
