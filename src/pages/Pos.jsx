import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Search, ScanLine, LayoutGrid, Clock, Settings, User, 
  ShoppingCart, Plus, Minus, CreditCard, ChevronRight, 
  Home, Trash2, Percent, FileText, Camera, PauseCircle,
  FileBarChart, Fingerprint, Globe, Unlock, QrCode,
  CheckCircle, MessageCircle, BookOpen, Package, Printer, Tag, StickyNote
} from 'lucide-react';
import './Pos.css';

const WHOLESALE_RULES = {
  3: 0.05,   // 5% off at qty 3+
  6: 0.10,   // 10% off at qty 6+
  12: 0.15,  // 15% off at qty 12+
};

const MOCK_PRODUCTS = [
  { id: 1, name: 'Espresso Core',       category: 'Drinks', cost_price: 15000, price: 25000, stock: 45, unit: 'Cup' },
  { id: 2, name: 'Cyber Matcha Latte',  category: 'Drinks', cost_price: 20000, price: 35000, stock: 12, unit: 'Cup' },
  { id: 3, name: 'Neon Glitch Burger',  category: 'Food',   cost_price: 25000, price: 45000, stock: 5,  unit: 'Pcs' },
  { id: 4, name: 'Quantum Fries',       category: 'Snacks', cost_price: 12000, price: 20000, stock: 80, unit: 'Pack' },
  { id: 5, name: 'Zero-G Water',        category: 'Drinks', cost_price: 5000,  price: 10000, stock: 120, unit: 'Botol' },
  { id: 6, name: 'Holo-Donut',          category: 'Snacks', cost_price: 8000,  price: 15000, stock: 2,  unit: 'Pcs' },
  { id: 7, name: 'Void Coffee',         category: 'Drinks', cost_price: 15000, price: 28000, stock: 34, unit: 'Cup' },
  { id: 8, name: 'Synthwave Pasta',     category: 'Food',   cost_price: 30000, price: 55000, stock: 15, unit: 'Porsi' },
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

function SuccessModal({ text, total, cart, payMethod, customer, onClose }) {
  const [waNum, setWaNum] = useState(customer?.phone || '');

  const buildWAMessage = () => {
    const now = new Date();
    const txId = 'SL' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + String(now.getTime()).slice(-5);
    const itemLines = (cart || []).map(item => {
      const p = item.price * (1 - (item.discount || 0));
      return `• ${item.name} x${item.qty} = ${formatIDR(p * item.qty)}`;
    }).join('\n');
    const subtotalAmt = (cart || []).reduce((s, i) => s + i.price * (1 - (i.discount || 0)) * i.qty, 0);
    const taxAmt = Math.round(subtotalAmt * 0.11);
    return encodeURIComponent(
`🏮 *Si Lentera - by MDYB Store*
━━━━━━━━━━━━━━━━━━
Struk Belanja #${txId}
📅 ${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
${customer ? `👤 Pelanggan: ${customer.name}` : ''}
━━━━━━━━━━━━━━━━━━
${itemLines}
━━━━━━━━━━━━━━━━━━
Subtotal: ${formatIDR(subtotalAmt)}
Pajak (11%): ${formatIDR(taxAmt)}
*TOTAL: ${formatIDR(total)}*
Metode: ${(payMethod || '').toUpperCase()}
━━━━━━━━━━━━━━━━━━
🙏 Terima kasih sudah berbelanja!
_Si Lentera · Solusi Kasir Ringan_`);
  };

  const sendWA = () => {
    if (!waNum.trim()) return alert('Masukkan nomor WhatsApp pelanggan');
    const num = waNum.replace(/^0/, '62').replace(/\D/g, '');
    window.open(`https://wa.me/${num}?text=${buildWAMessage()}`, '_blank');
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

export default function Pos({ isAdmin = false }) {
  const navigate = useNavigate();
  const [activeUser, setActiveUser] = useState(null); // Tracks logged in user
  const [lang, setLang] = useState('ID');
  const [activeMenu, setActiveMenu] = useState('pos'); // Menampung halaman yang dikunjungi
  const [isOffline, setIsOffline] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [cart, setCart] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [donation, setDonation] = useState(0);

  // Modals
  const [modal, setModal] = useState(null);
  const [lastTotal, setLastTotal] = useState(0);
  const [lastMethod, setLastMethod] = useState('cash');
  const [lastCart, setLastCart] = useState([]);

  // Settings
  const [viewMode, setViewMode] = useState(localStorage.getItem('viewMode') || 'website');
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [paperSize, setPaperSize] = useState(localStorage.getItem('paperSize') || '80mm');

  // Sync to localStorage and body
  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
    localStorage.setItem('darkMode', isDarkMode);
    localStorage.setItem('paperSize', paperSize);
    if (isDarkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
  }, [viewMode, isDarkMode, paperSize]);

  // Modul state
  const [members, setMembers] = useState([]);
  const [memberForm, setMemberForm] = useState({ name: '', phone: '', debt_balance: '' });
  const [memberSaving, setMemberSaving] = useState(false);
  const [stockForm, setStockForm] = useState({ name: '', category: '', cost_price: '', price: '', stock: '', unit: 'Pcs' });
  const [stockSaving, setStockSaving] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [drawerAmount, setDrawerAmount] = useState('');

  // Cart extra states
  const [discountInput, setDiscountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [showDiscountBox, setShowDiscountBox] = useState(false);
  const [showNoteBox, setShowNoteBox] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

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

        const { data: memberData } = await supabase.from('members').select('*').order('created_at', { ascending: false });
        if (memberData) setMembers(memberData);

        const { data: txData } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);
        if (txData) setTransactions(txData);
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
  const finishUI = (amount, method) => {
    setLastTotal(amount);
    setLastMethod(method || 'cash');
    setLastCart([...cart]);
    setCart([]);
    setDonation(0);
    setDiscountInput('');
    setNoteInput('');
    setModal('success');
  };

  const saveToSupabase = async (method, extra = {}) => {
    const txData = {
      items: cart,
      subtotal,
      tax,
      total: Math.round(total),
      payment_method: method,
      cash_amount: extra.cash || (method === 'cash' ? Math.round(total) : 0),
      qris_amount: extra.qris || (method === 'qris' ? Math.round(total) : 0),
      donation_amount: donationAmt,
      cashier_id: activeUser ? activeUser.id : null
    };

    // Optimistic: show success immediately, sync in background
    finishUI(Math.round(total), method);

    try {
      const { data, error } = await supabase.from('transactions').insert([txData]).select();
      if (error) { console.warn('Supabase sync failed (non-blocking):', error.message); return; }

      if (method === 'kasbon' && extra.name) {
        const { error: kasbonErr } = await supabase.from('members')
          .upsert([{ name: extra.name, phone: extra.phone || null, debt_balance: Math.round(total) }], { onConflict: 'phone' });
        if (kasbonErr) console.warn('Kasbon upsert failed:', kasbonErr.message);
      }

      // Refresh transaction list
      const { data: txList } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);
      if (txList) setTransactions(txList);
    } catch (err) {
      console.warn('Unexpected error (non-blocking):', err.message);
    }
  };

  // ── print receipt ──
  const printReceipt = (payMethod) => {
    const now = new Date();
    const txId = 'SL' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + String(now.getTime()).slice(-5);
    const manualDisc = Number(discountInput) || 0;
    const rawSub = cart.reduce((s, i) => s + i.price * (1 - (i.discount || 0)) * i.qty, 0);
    const taxAmt = Math.round(rawSub * 0.11);
    const grandTotal = rawSub - manualDisc + taxAmt;

    const itemRows = cart.map(item => {
      const discPrice = item.price * (1 - (item.discount || 0));
      const lineTotal = discPrice * item.qty;
      return `
        <div class="item-row">
          <div>
            <span class="item-name">${item.name} x${item.qty}</span>
            ${item.discount > 0 ? `<br/><span class="item-note">Grosir -${(item.discount*100).toFixed(0)}%</span>` : ''}
            ${noteInput && item === cart[cart.length-1] ? `<br/><span class="item-note">Catatan: ${noteInput}</span>` : ''}
          </div>
          <span class="item-price">${formatIDR(lineTotal)}</span>
        </div>`;
    }).join('');

    const printContent = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Nota Si Lentera</title>
<style>
  @page { margin: 0; size: ${paperSize} auto; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; color: #111; width: ${paperSize === '80mm' ? '80mm' : '58mm'}; background: #fff; padding: 10px 8px 20px; }

  /* Header */
  .logo-wrap { text-align: center; margin-bottom: 10px; }
  .logo-img { width: 70px; height: 70px; border-radius: 50%; object-fit: contain; }
  .store-name { text-align: center; font-size: 15pt; font-weight: 800; margin: 4px 0 2px; letter-spacing: 0.5px; }
  .store-sub { text-align: center; font-size: 9pt; color: #6b7280; }
  .order-type { text-align: center; font-size: 11pt; font-weight: 700; margin: 10px 0 8px; }

  /* Divider */
  .dash { border: none; border-top: 1.5px dashed #d1d5db; margin: 8px 0; }
  .solid { border: none; border-top: 1.5px solid #374151; margin: 8px 0; }

  /* Info grid */
  .info-grid { display: flex; justify-content: space-between; margin: 4px 0; }
  .info-label { font-size: 8.5pt; color: #6b7280; margin-bottom: 1px; }
  .info-value { font-size: 10pt; font-weight: 700; }
  .info-right { text-align: right; }

  /* Items */
  .item-row { display: flex; justify-content: space-between; align-items: flex-start; margin: 6px 0; gap: 4px; }
  .item-name { font-size: 10pt; font-weight: 500; }
  .item-note { font-size: 8pt; color: #6b7280; }
  .item-price { font-size: 10pt; white-space: nowrap; }

  /* Payment */
  .section-title { font-size: 10pt; font-weight: 700; margin: 8px 0 4px; }
  .pay-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10pt; }
  .pay-row.total { font-size: 12pt; font-weight: 800; margin-top: 6px; }
  .pay-row.discount { color: #dc2626; }

  /* Footer */
  .paid-box { text-align: center; margin: 12px 0 6px; }
  .paid-badge { font-size: 13pt; font-weight: 800; letter-spacing: 3px; }
  .paid-time { font-size: 9pt; color: #374151; margin-top: 2px; }
  .thank-you { text-align: center; font-size: 9.5pt; color: #374151; margin-top: 8px; }
  .footer-brand { text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 4px; }
</style>
</head><body>

  <div class="logo-wrap">
    <img src="https://res.cloudinary.com/dsichsufc/image/upload/e_make_transparent:20/v1774079104/logo_silentera_l5nepu.png" class="logo-img" alt="Logo" />
  </div>
  <div class="store-name">Si Lentera</div>
  <div class="store-sub">by MDYB Store</div>
  <div class="order-type">Kasir / ${payMethod.toUpperCase()}</div>

  <div class="dash"></div>
  <div class="info-grid">
    <div>
      <div class="info-label">Tanggal</div>
      <div class="info-value">${now.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}</div>
    </div>
    <div class="info-right">
      <div class="info-label">Kasir</div>
      <div class="info-value">${activeUser?.name || '-'}</div>
    </div>
  </div>
  <div class="info-grid">
    <div>
      <div class="info-label">Trx ID</div>
      <div class="info-value">${txId}</div>
    </div>
    <div class="info-right">
      <div class="info-label">Pelanggan</div>
      <div class="info-value">${selectedCustomer ? selectedCustomer.name : '-'}</div>
    </div>
  </div>

  <div class="dash"></div>
  ${itemRows}

  <div class="dash"></div>
  <div class="section-title">Payment Details</div>
  <div class="pay-row"><span>Subtotal</span><span>${formatIDR(rawSub)}</span></div>
  ${manualDisc > 0 ? `<div class="pay-row discount"><span>Discount</span><span>-${formatIDR(manualDisc)}</span></div>` : ''}
  <div class="pay-row"><span>Pajak (11%)</span><span>${formatIDR(taxAmt)}</span></div>
  <div class="solid"></div>
  <div class="pay-row total"><span>Total</span><span>${formatIDR(grandTotal)}</span></div>

  <div class="dash"></div>
  <div class="section-title">Payment Method</div>
  <div class="pay-row"><span>${payMethod}</span><span>${formatIDR(grandTotal)}</span></div>
  <div class="pay-row"><span>Kembalian</span><span>${formatIDR(0)}</span></div>

  <div class="dash"></div>
  <div class="paid-box">
    <div class="paid-badge">PAID</div>
    <div class="paid-time">${now.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })} - ${now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}</div>
  </div>
  <div class="dash"></div>
  <div class="thank-you">Thank you for your order!</div>
  <div class="footer-brand">★ Si Lentera · Solusi Kasir Ringan ★</div>
  <br/><br/>
</body></html>`;

    const w = window.open('', '_blank', 'width=450,height=750,left=100,top=60');
    if (w) { w.document.write(printContent); w.document.close(); w.focus(); setTimeout(() => { w.print(); }, 400); }
  };

  if (isAdmin && !activeUser) {
    return <LoginScreen cashiers={dbCashiers} onLogin={(user) => setActiveUser(user)} />;
  }

  return (
    <div className={`pos-container visible view-${viewMode} ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="motion-lines" />

      {/* ── Modals ── */}
      {modal === 'qris'   && <QRISModal   total={total}  text={text} onClose={() => setModal(null)} />}
      {modal === 'split'  && <SplitModal  total={total}  text={text} onClose={() => setModal(null)}
        onConfirm={(cash, rest) => { setModal(null); saveToSupabase('split', { cash, qris: rest }); }} />}
      {modal === 'kasbon' && <KasbonModal text={text} onClose={() => setModal(null)}
        onConfirm={(name, phone) => { setModal(null); saveToSupabase('kasbon', { name, phone }); }} />}
      {modal === 'success' && <SuccessModal text={text} total={lastTotal} cart={lastCart} payMethod={lastMethod} customer={selectedCustomer} onClose={() => setModal(null)} />}

      {/* ── Left Sidebar ── */}
      <aside className="pos-sidebar-left glass">
        <div 
          className="nav-icon" 
          onClick={() => {
            if (window.confirm('Apakah Anda yakin ingin kembali ke menu utama (Home)? \n⚠ Perhatian: Data pesanan kasir yang belum disimpan ke database mungkin akan dikosongkan.')) {
              navigate('/');
            }
          }} 
          title="Home"
        >
          <Home size={26}/>
          <span className="nav-label">HOME</span>
        </div>
        <div style={{ marginTop: '1rem' }}/>
        <div className={`nav-icon ${activeMenu === 'pos' ? 'active' : ''}`} onClick={() => setActiveMenu('pos')}><LayoutGrid size={26}/><span className="nav-label">POS</span></div>
        {isAdmin && (
          <>
            <div className={`nav-icon ${activeMenu === 'history' ? 'active' : ''}`} onClick={() => setActiveMenu('history')}><Clock size={26}/><span className="nav-label">HISTORY</span></div>
            <div className={`nav-icon ${activeMenu === 'members' ? 'active' : ''}`} onClick={() => setActiveMenu('members')}><User size={26}/><span className="nav-label">MEMBERS</span></div>
            <div className={`nav-icon ${activeMenu === 'report' ? 'active' : ''}`} onClick={() => setActiveMenu('report')}><FileBarChart size={26}/><span className="nav-label">REPORT</span></div>
            <div className={`nav-icon ${activeMenu === 'stock' ? 'active' : ''}`} onClick={() => setActiveMenu('stock')}><Package size={26}/><span className="nav-label">STOCK</span></div>
            <div className={`nav-icon ${activeMenu === 'drawer' ? 'active' : ''}`} onClick={() => setActiveMenu('drawer')}><Unlock size={26}/><span className="nav-label">DRAWER</span></div>
          </>
        )}
        <div className={`nav-icon ${activeMenu === 'options' ? 'active' : ''}`} style={{ marginTop: 'auto' }} onClick={() => setActiveMenu('options')}><Settings size={26}/><span className="nav-label">OPTIONS</span></div>
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
          {activeMenu === 'pos' && (
            <>
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

            {/* Customer Selector */}
            <div className="customer-card" onClick={() => setShowCustomerPicker(p => !p)} style={{ cursor: 'pointer' }}>
              <User size={28} color="var(--accent-blue)" opacity={0.7} />
              <div className="customer-info">
                <h5>{text.customerSelect}</h5>
                <p>{selectedCustomer ? `${selectedCustomer.name} · ${selectedCustomer.phone || 'No WA'}` : '+62812... / Nama Pelanggan'}</p>
              </div>
              <ChevronRight size={20} opacity={0.3} />
            </div>
            {showCustomerPicker && (
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.5rem', margin: '0 0 0.5rem', border: '1px solid #e2e8f0', maxHeight: '150px', overflowY: 'auto' }}>
                <div style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem' }}
                  onClick={() => { setSelectedCustomer(null); setShowCustomerPicker(false); }}>— Tanpa Pelanggan</div>
                {members.map(m => (
                  <div key={m.id} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem' }}
                    onClick={() => { setSelectedCustomer(m); setShowCustomerPicker(false); }}
                    onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {m.name} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{m.phone ? `· ${m.phone}` : ''}</span>
                  </div>
                ))}
                {members.length === 0 && <div style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Belum ada pelanggan terdaftar.</div>}
              </div>
            )}

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
              <button className="tool-btn" onClick={() => { setShowDiscountBox(d => !d); setShowNoteBox(false); }}>
                <Percent size={18} /> {text.discount}
              </button>
              <button className="tool-btn" onClick={() => { setShowNoteBox(n => !n); setShowDiscountBox(false); }}>
                <StickyNote size={18} /> {text.note}
              </button>
            </div>
            {showDiscountBox && (
              <div style={{ padding: '0 1rem 0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Tag size={16} color="var(--accent-blue)" />
                <input type="number" placeholder="Nominal diskon (Rp)" value={discountInput}
                  onChange={e => setDiscountInput(e.target.value)}
                  style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' }} />
                <button onClick={() => setShowDiscountBox(false)} style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600 }}>OK</button>
              </div>
            )}
            {showNoteBox && (
              <div style={{ padding: '0 1rem 0.5rem' }}>
                <textarea placeholder="Catatan pesanan..." value={noteInput} onChange={e => setNoteInput(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', resize: 'vertical', outline: 'none', minHeight: '60px' }} />
              </div>
            )}

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
                <button className="checkout-btn" onClick={() => { saveToSupabase('cash'); printReceipt('Tunai'); }} disabled={cart.length === 0}>
                  <CreditCard size={18} /> {text.charge}
                </button>
                <button className="checkout-btn qris" onClick={() => { saveToSupabase('qris'); printReceipt('QRIS'); }} disabled={cart.length === 0}>
                  <QrCode size={18} /> {text.qrisBtn}
                </button>
                <button className="checkout-btn split" onClick={() => setModal('split')} disabled={cart.length === 0}>
                  <CreditCard size={18} /> {text.splitBtn}
                </button>
                <button className="checkout-btn kasbon" onClick={() => setModal('kasbon')} disabled={cart.length === 0}>
                  <BookOpen size={18} /> {text.kasbonBtn}
                </button>
              </div>
              {/* Print Button */}
              <button
                onClick={() => printReceipt('Manual')}
                disabled={cart.length === 0}
                style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.7rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: cart.length === 0 ? '#94a3b8' : 'var(--text-primary)', fontWeight: 600, cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}
                onMouseEnter={e => { if (cart.length > 0) e.currentTarget.style.background = '#eff6ff'; }}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                <Printer size={18} color={cart.length === 0 ? '#94a3b8' : 'var(--accent-blue)'} /> Cetak Nota Thermal
              </button>
            </div>
          </aside>
            </>
          )}

          {activeMenu !== 'pos' && (
            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>

              {/* ── MEMBERS Panel ── */}
              {activeMenu === 'members' && (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  <h2 style={{ color: 'var(--accent-blue)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><User size={28}/> Database Pelanggan & Kasbon</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Tambah pelanggan baru dan pantau saldo hutang (kasbon) mereka.</p>

                  <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>➕ Tambah Pelanggan Baru</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nama Pelanggan *</label>
                        <input
                          style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #bfdbfe', fontSize: '0.95rem', outline: 'none', background: '#fff', color: '#0f172a', cursor: 'text', zIndex: 10, position: 'relative' }}
                          placeholder="Budi Santoso"
                          value={memberForm.name}
                          onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
                          onBlur={e => e.target.style.borderColor = '#bfdbfe'}
                          onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>No. WhatsApp</label>
                        <input
                          style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #bfdbfe', fontSize: '0.95rem', outline: 'none', background: '#fff', color: '#0f172a', cursor: 'text', zIndex: 10, position: 'relative' }}
                          placeholder="08xxxxxxxxxx"
                          value={memberForm.phone}
                          onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
                          onBlur={e => e.target.style.borderColor = '#bfdbfe'}
                          onChange={e => setMemberForm(f => ({ ...f, phone: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Hutang Awal (Rp)</label>
                        <input
                          type="number"
                          style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #bfdbfe', fontSize: '0.95rem', outline: 'none', background: '#fff', color: '#0f172a', cursor: 'text', zIndex: 10, position: 'relative' }}
                          placeholder="0"
                          value={memberForm.debt_balance}
                          onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
                          onBlur={e => e.target.style.borderColor = '#bfdbfe'}
                          onChange={e => setMemberForm(f => ({ ...f, debt_balance: e.target.value }))} />
                      </div>
                    </div>
                    <button
                      style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))', color: '#fff', border: 'none', borderRadius: '99px', padding: '0.75rem 2.5rem', fontWeight: 700, cursor: memberSaving ? 'not-allowed' : 'pointer', opacity: memberSaving ? 0.7 : 1, fontSize: '0.95rem' }}
                      onClick={async () => {
                        if (!memberForm.name.trim()) return alert('Nama pelanggan wajib diisi');
                        setMemberSaving(true);
                        const { error } = await supabase.from('members').insert([{ name: memberForm.name.trim(), phone: memberForm.phone.trim() || null, debt_balance: Number(memberForm.debt_balance) || 0 }]);
                        if (error) alert('Gagal simpan: ' + error.message);
                        else {
                          setMemberForm({ name: '', phone: '', debt_balance: '' });
                          const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false });
                          if (data) setMembers(data);
                          alert('✅ Pelanggan berhasil ditambahkan!');
                        }
                        setMemberSaving(false);
                      }}>
                      {memberSaving ? 'Menyimpan...' : '💾 Simpan Pelanggan'}
                    </button>
                  </div>

                  <div className="glass" style={{ padding: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>📋 Daftar Pelanggan ({members.length})</h4>
                    {members.length === 0
                      ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Belum ada pelanggan terdaftar.</p>
                      : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                          <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ textAlign: 'left', padding: '0.6rem', color: 'var(--text-secondary)' }}>Nama</th>
                            <th style={{ textAlign: 'left', padding: '0.6rem', color: 'var(--text-secondary)' }}>No. WA</th>
                            <th style={{ textAlign: 'right', padding: '0.6rem', color: 'var(--text-secondary)' }}>Hutang</th>
                            <th style={{ textAlign: 'center', padding: '0.6rem', color: 'var(--text-secondary)' }}>Hapus</th>
                          </tr></thead>
                          <tbody>{members.map(m => (
                            <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.7rem 0.6rem', fontWeight: 600 }}>{m.name}</td>
                              <td style={{ padding: '0.7rem 0.6rem', color: 'var(--text-secondary)' }}>{m.phone || '-'}</td>
                              <td style={{ padding: '0.7rem 0.6rem', textAlign: 'right', color: m.debt_balance > 0 ? '#e74c3c' : '#27ae60', fontWeight: 700 }}>{formatIDR(m.debt_balance || 0)}</td>
                              <td style={{ textAlign: 'center', padding: '0.4rem' }}>
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(`Hapus pelanggan "${m.name}"?`)) return;
                                    const { error } = await supabase.from('members').delete().eq('id', m.id);
                                    if (error) alert('Gagal hapus: ' + error.message);
                                    else setMembers(prev => prev.filter(x => x.id !== m.id));
                                  }}
                                  style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '0.4rem 0.65rem', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem' }}
                                  title="Hapus Pelanggan">
                                  🗑
                                </button>
                              </td>
                            </tr>
                          ))}</tbody>
                        </table>
                    }
                  </div>
                </div>
              )}

              {/* ── STOCK Panel ── */}
              {activeMenu === 'stock' && (
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                  <h2 style={{ color: 'var(--accent-blue)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Package size={28}/> Manajemen Stok & Produk</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Tambah produk baru atau update stok yang sudah ada di database.</p>

                  <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>
                        {editProductId ? '✏️ Edit Produk' : '➕ Tambah Produk Baru'}
                      </h4>
                      {editProductId && (
                        <button onClick={() => { setEditProductId(null); setStockForm({ name: '', category: '', cost_price: '', price: '', stock: '', unit: 'Pcs' }); }} style={{ background: '#f1f5f9', color: 'var(--text-secondary)', border: 'none', padding: '0.4rem 1rem', borderRadius: '99px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                          Batal Edit
                        </button>
                      )}
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nama Produk *</label>
                        <input
                          style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #bfdbfe', fontSize: '0.95rem', outline: 'none', background: '#fff', color: '#0f172a' }}
                          placeholder="Misal: Es Teh Manis" value={stockForm.name}
                          onChange={e => setStockForm(f => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Kategori *</label>
                        <input
                          style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #bfdbfe', fontSize: '0.95rem', outline: 'none', background: '#fff', color: '#0f172a' }}
                          placeholder="Minuman, Makanan, dsb." value={stockForm.category}
                          onChange={e => setStockForm(f => ({ ...f, category: e.target.value }))} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.8rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Harga Asli / Modal (Rp) *</label>
                        <input
                          type="number"
                          style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #bfdbfe', fontSize: '0.95rem', outline: 'none', background: '#fff', color: '#0f172a' }}
                          placeholder="3000" value={stockForm.cost_price}
                          onChange={e => setStockForm(f => ({ ...f, cost_price: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Harga Jual (Rp) *</label>
                        <input
                          type="number"
                          style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #bfdbfe', fontSize: '0.95rem', outline: 'none', background: '#fff', color: '#0f172a' }}
                          placeholder="5000" value={stockForm.price}
                          onChange={e => setStockForm(f => ({ ...f, price: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Satuan (Unit)</label>
                        <select
                          style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #bfdbfe', fontSize: '0.95rem', outline: 'none', background: '#fff', color: '#0f172a', cursor: 'pointer' }}
                          value={stockForm.unit}
                          onChange={e => setStockForm(f => ({ ...f, unit: e.target.value }))}>
                          <option value="Pcs">Pcs</option>
                          <option value="Pack">Pack</option>
                          <option value="Karton">Karton</option>
                          <option value="Dus">Dus</option>
                          <option value="Lusin">Lusin</option>
                          <option value="Gram">Gram</option>
                          <option value="Kg">Kg</option>
                          <option value="Liter">Liter</option>
                          <option value="Botol">Botol</option>
                          <option value="Cup">Cup</option>
                          <option value="Porsi">Porsi</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Jumlah Stok *</label>
                        <input
                          type="number"
                          style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #bfdbfe', fontSize: '0.95rem', outline: 'none', background: '#fff', color: '#0f172a' }}
                          placeholder="100" value={stockForm.stock}
                          onChange={e => setStockForm(f => ({ ...f, stock: e.target.value }))} />
                      </div>
                    </div>
                    
                    <button
                      style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))', color: '#fff', border: 'none', borderRadius: '99px', padding: '0.8rem 2.5rem', fontWeight: 700, cursor: stockSaving ? 'not-allowed' : 'pointer', opacity: stockSaving ? 0.7 : 1, width: '100%' }}
                      onClick={async () => {
                        if (!stockForm.name || !stockForm.price || !stockForm.stock || !stockForm.cost_price) return alert('Nama, harga modal, harga jual, dan stok wajib diisi');
                        setStockSaving(true);
                        const insertData = { 
                          name: stockForm.name, 
                          category: stockForm.category || 'Lainnya', 
                          cost_price: Number(stockForm.cost_price),
                          price: Number(stockForm.price), 
                          stock: Number(stockForm.stock),
                          unit: stockForm.unit || 'Pcs'
                        };
                        
                        let reqError = null;
                        if (editProductId) {
                          const { error } = await supabase.from('products').update(insertData).eq('id', editProductId);
                          reqError = error;
                        } else {
                          const { error } = await supabase.from('products').insert([insertData]);
                          reqError = error;
                        }

                        if (reqError) {
                          if (reqError.message.includes('column "unit"')) {
                            alert("Gagal: Kolom 'unit' belum ada di Supabase.");
                          } else if (reqError.message.includes('column "cost_price"')) {
                            alert("Gagal: Kolom 'cost_price' belum ada di Supabase.");
                          } else {
                            alert('Gagal simpan: ' + reqError.message);
                          }
                        }
                        else { 
                          setStockForm({ name: '', category: '', cost_price: '', price: '', stock: '', unit: 'Pcs' }); 
                          setEditProductId(null);
                          const { data } = await supabase.from('products').select('*'); 
                          if (data && data.length > 0) setDbProducts(data); 
                          alert(editProductId ? '✅ Produk berhasil diupdate!' : '✅ Produk berhasil ditambahkan!'); 
                        }
                        setStockSaving(false);
                      }}>
                      {stockSaving ? 'Menyimpan...' : (editProductId ? '🔄 Update Produk' : '📦 Simpan Produk')}
                    </button>
                  </div>

                  <div className="glass" style={{ padding: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>📋 Daftar Produk ({dbProducts.length})</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', padding: '0.6rem', color: 'var(--text-secondary)' }}>Nama Produk</th>
                        <th style={{ textAlign: 'left', padding: '0.6rem', color: 'var(--text-secondary)' }}>Kategori</th>
                        <th style={{ textAlign: 'right', padding: '0.6rem', color: 'var(--text-secondary)' }}>H. Modal</th>
                        <th style={{ textAlign: 'right', padding: '0.6rem', color: 'var(--text-secondary)' }}>H. Jual</th>
                        <th style={{ textAlign: 'right', padding: '0.6rem', color: 'var(--text-secondary)' }}>Laba</th>
                        <th style={{ textAlign: 'right', padding: '0.6rem', color: 'var(--text-secondary)' }}>Satuan</th>
                        <th style={{ textAlign: 'right', padding: '0.6rem', color: 'var(--text-secondary)' }}>Stok</th>
                        <th style={{ textAlign: 'center', padding: '0.6rem', color: 'var(--text-secondary)' }}>Aksi</th>
                      </tr></thead>
                      <tbody>{dbProducts.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.7rem 0.6rem', fontWeight: 600 }}>{p.name}</td>
                          <td style={{ padding: '0.7rem 0.6rem' }}><span style={{ background: 'rgba(37,99,235,0.08)', color: 'var(--accent-blue)', borderRadius: '99px', padding: '0.2rem 0.7rem', fontSize: '0.8rem' }}>{p.category}</span></td>
                          <td style={{ padding: '0.7rem 0.6rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>{formatIDR(p.cost_price || 0)}</td>
                          <td style={{ padding: '0.7rem 0.6rem', textAlign: 'right', fontWeight: 700 }}>{formatIDR(p.price)}</td>
                          <td style={{ padding: '0.7rem 0.6rem', textAlign: 'right', fontWeight: 700, color: '#2ed573' }}>{formatIDR(p.price - (p.cost_price || 0))}</td>
                          <td style={{ padding: '0.7rem 0.6rem', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{p.unit || 'Pcs'}</td>
                          <td style={{ padding: '0.7rem 0.6rem', textAlign: 'right', color: p.stock <= 5 ? '#e74c3c' : '#27ae60', fontWeight: 700 }}>{p.stock}</td>
                          <td style={{ padding: '0.4rem', textAlign: 'center', display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                if (typeof p.id === 'number') {
                                  alert('❌ Ini adalah produk contoh bawaan (Mock Data). Tidak bisa diedit.');
                                  return;
                                }
                                setEditProductId(p.id);
                                setStockForm({ name: p.name, category: p.category, cost_price: p.cost_price || '', price: p.price, stock: p.stock, unit: p.unit || 'Pcs' });
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              style={{ background: '#e0f2fe', border: 'none', borderRadius: '8px', padding: '0.4rem 0.65rem', cursor: 'pointer', color: '#0284c7', fontWeight: 700, fontSize: '0.85rem' }}
                              title="Edit Produk">
                              ✏️
                            </button>
                            <button
                              onClick={async () => {
                                if (typeof p.id === 'number') {
                                  alert('❌ Ini adalah produk contoh bawaan (Mock Data). Anda hanya dapat menghapus produk yang Anda buat sendiri di Supabase.');
                                  return;
                                }
                                if (!window.confirm(`Hapus produk "${p.name}" secara permanen?`)) return;
                                const { error } = await supabase.from('products').delete().eq('id', p.id);
                                if (error) alert('Gagal hapus: ' + error.message);
                                else {
                                  setDbProducts(prev => prev.filter(x => x.id !== p.id));
                                }
                              }}
                              style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '0.4rem 0.65rem', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem' }}
                              title="Hapus Produk">
                              🗑
                            </button>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── HISTORY Panel ── */}
              {activeMenu === 'history' && (
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                  <h2 style={{ color: 'var(--accent-blue)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Clock size={28}/> Riwayat Transaksi</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Semua pesanan yang sudah diselesaikan tercatat di sini secara otomatis.</p>
                  <div className="glass" style={{ padding: '1.5rem' }}>
                    {transactions.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Belum ada transaksi tercatat.</p> :
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ textAlign: 'left', padding: '0.6rem', color: 'var(--text-secondary)' }}>Waktu</th>
                          <th style={{ textAlign: 'left', padding: '0.6rem', color: 'var(--text-secondary)' }}>Metode</th>
                          <th style={{ textAlign: 'right', padding: '0.6rem', color: 'var(--text-secondary)' }}>Total</th>
                        </tr></thead>
                        <tbody>{transactions.map(t => (
                          <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.7rem 0.6rem', color: 'var(--text-secondary)' }}>{new Date(t.created_at).toLocaleString('id-ID')}</td>
                            <td style={{ padding: '0.7rem 0.6rem' }}><span style={{ background: t.payment_method === 'cash' ? 'rgba(39,174,96,0.1)' : 'rgba(37,99,235,0.1)', color: t.payment_method === 'cash' ? '#27ae60' : 'var(--accent-blue)', borderRadius: '99px', padding: '0.2rem 0.8rem', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>{t.payment_method}</span></td>
                            <td style={{ padding: '0.7rem 0.6rem', textAlign: 'right', fontWeight: 700 }}>{formatIDR(t.total_amount)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    }
                  </div>
                </div>
              )}

              {/* ── REPORT Panel ── */}
              {activeMenu === 'report' && (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  <h2 style={{ color: 'var(--accent-blue)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><FileBarChart size={28}/> Laporan Penjualan</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Ringkasan omset dan transaksi yang tercatat hari ini.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    {[{ label: 'Total Transaksi', value: transactions.length + ' pesanan', icon: '🧾' },
                      { label: 'Omset Hari Ini', value: formatIDR(transactions.filter(t => new Date(t.created_at).toDateString() === new Date().toDateString()).reduce((s, t) => s + (t.total_amount || 0), 0)), icon: '💰' },
                      { label: 'Pelanggan Terdaftar', value: members.length + ' orang', icon: '👥' }].map((s, i) => (
                      <div key={i} className="glass" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{s.value}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="glass" style={{ padding: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1rem' }}>5 Transaksi Terakhir</h4>
                    {transactions.slice(0, 5).map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date(t.created_at).toLocaleString('id-ID')}</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{formatIDR(t.total_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── DRAWER Panel ── */}
              {activeMenu === 'drawer' && (
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <h2 style={{ color: 'var(--accent-blue)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Unlock size={28}/> Laci Kasir (Drawer)</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Catat saldo awal shift dan rekap tutup toko hari ini.</p>
                  <div className="glass" style={{ padding: '2rem' }}>
                    <h4 style={{ marginBottom: '1rem' }}>💼 Mulai Shift Baru</h4>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Modal Awal Laci (Rp)</label>
                    <input type="number" style={{ width: '100%', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1rem', marginBottom: '1rem', outline: 'none' }}
                      placeholder="100000" value={drawerAmount} onChange={e => setDrawerAmount(e.target.value)} />
                    <button
                      style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))', color: '#fff', border: 'none', borderRadius: '99px', padding: '0.9rem', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}
                      onClick={() => alert(`✅ Shift dimulai dengan modal Rp ${Number(drawerAmount).toLocaleString('id-ID')}`)}>Mulai Shift →</button>
                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h5 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Ringkasan Shift Hari Ini</h5>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Total Masuk (Tunai)</span><span style={{ fontWeight: 700 }}>{formatIDR(transactions.filter(t => t.payment_method === 'cash').reduce((s, t) => s + (t.total_amount || 0), 0))}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Total Masuk (QRIS)</span><span style={{ fontWeight: 700 }}>{formatIDR(transactions.filter(t => t.payment_method === 'qris').reduce((s, t) => s + (t.total_amount || 0), 0))}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}><span style={{ fontWeight: 700 }}>Grand Total</span><span style={{ fontWeight: 800, color: 'var(--accent-blue)' }}>{formatIDR(transactions.reduce((s, t) => s + (t.total_amount || 0), 0))}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── OPTIONS Panel ── */}
              {activeMenu === 'options' && (
                <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                  <h2 style={{ color: 'var(--accent-blue)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Settings size={28}/> Pengaturan Sistem</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Sesuaikan tampilan dan fitur POS sesuai kebutuhan toko Anda.</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                    {/* Tampilan */}
                    <div className="glass" style={{ padding: '1.5rem' }}>
                      <h4 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LayoutGrid size={20}/> Mode Tampilan (Layout)</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        {['mobile', 'notebook', 'website'].map((mode) => (
                          <div 
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            style={{ 
                              padding: '1rem', textAlign: 'center', borderRadius: '12px', cursor: 'pointer',
                              border: viewMode === mode ? '2px solid var(--accent-blue)' : '1px solid #e2e8f0',
                              background: viewMode === mode ? 'rgba(37,99,235,0.05)' : 'transparent',
                              transition: 'all 0.2s'
                            }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{mode === 'mobile' ? '📱' : mode === 'notebook' ? '💻' : '🌐'}</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'capitalize' }}>{mode}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mode Gelap */}
                    <div className="glass" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ marginBottom: '0.3rem' }}>🌗 Mode Gelap / Terang</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ubah nuansa aplikasi untuk kenyamanan mata.</p>
                      </div>
                      <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        style={{ 
                          padding: '0.6rem 1.5rem', borderRadius: '99px', border: 'none', fontWeight: 700, cursor: 'pointer',
                          background: isDarkMode ? '#334155' : '#f1f5f9', color: isDarkMode ? '#fff' : '#0f172a'
                        }}>
                        {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                      </button>
                    </div>

                    {/* Printer */}
                    <div className="glass" style={{ padding: '1.5rem' }}>
                      <h4 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Printer size={20}/> Ukuran Kertas Printer (Thermal)</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {['58mm', '80mm'].map((size) => (
                          <div 
                            key={size}
                            onClick={() => setPaperSize(size)}
                            style={{ 
                              padding: '1rem', textAlign: 'center', borderRadius: '12px', cursor: 'pointer',
                              border: paperSize === size ? '2px solid var(--accent-blue)' : '1px solid #e2e8f0',
                              background: paperSize === size ? 'rgba(37,99,235,0.05)' : 'transparent',
                              transition: 'all 0.2s'
                            }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{size}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kertas Thermal Umum</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
