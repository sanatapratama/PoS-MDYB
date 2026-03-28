import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Search, ScanLine, LayoutGrid, Clock, Settings, User, 
  ShoppingCart, Plus, Minus, CreditCard, ChevronRight, 
  Home, Trash2, Percent, FileText, Camera, PauseCircle,
  FileBarChart, Fingerprint, Globe, Unlock, QrCode,
  CheckCircle, MessageCircle, BookOpen, Package, Printer, Tag, StickyNote, Bluetooth
} from 'lucide-react';
import './Pos.css';

// Wholesale Removed

// ──────────────────────── UTILS BT PRINT ────────────────────────

// Logo URL for receipt header
const LOGO_URL = 'https://res.cloudinary.com/dvz0zvpwr/image/upload/v1774077332/mdyb_logo_dark_pos_txlz5.png';

// Convert image URL to ESC/POS raster bitmap (GS v 0)
async function imageToEscPosBitmap(imageUrl, maxWidth = 384) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        // Scale image to fit printer width (384 dots for 58mm)
        const scale = Math.min(maxWidth / img.width, 1);
        const w = Math.floor(img.width * scale);
        const h = Math.floor(img.height * scale);
        
        // Width must be multiple of 8 (8 pixels per byte)
        const byteWidth = Math.ceil(w / 8);
        const pixelWidth = byteWidth * 8;
        
        // Draw to offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = pixelWidth;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, pixelWidth, h);
        ctx.drawImage(img, (pixelWidth - w) / 2, 0, w, h); // Center image
        
        const imageData = ctx.getImageData(0, 0, pixelWidth, h);
        const pixels = imageData.data;
        
        // Convert to 1-bit monochrome bitmap
        const bitmapData = new Uint8Array(byteWidth * h);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < pixelWidth; x++) {
            const idx = (y * pixelWidth + x) * 4;
            const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2], a = pixels[idx + 3];
            // Grayscale with alpha consideration
            const gray = a < 128 ? 255 : (0.299 * r + 0.587 * g + 0.114 * b);
            // Threshold: dark pixels = black (bit=1)
            if (gray < 128) {
              const bytePos = y * byteWidth + Math.floor(x / 8);
              const bitPos = 7 - (x % 8);
              bitmapData[bytePos] |= (1 << bitPos);
            }
          }
        }
        
        // Build GS v 0 command: \x1d\x76\x30 m xL xH yL yH d1...dk
        const cmd = new Uint8Array(8 + bitmapData.length);
        cmd[0] = 0x1d; // GS
        cmd[1] = 0x76; // v
        cmd[2] = 0x30; // 0
        cmd[3] = 0x00; // m = normal mode
        cmd[4] = byteWidth & 0xFF;        // xL
        cmd[5] = (byteWidth >> 8) & 0xFF;  // xH
        cmd[6] = h & 0xFF;                 // yL
        cmd[7] = (h >> 8) & 0xFF;          // yH
        cmd.set(bitmapData, 8);
        
        resolve(cmd);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Gagal memuat logo'));
    img.src = imageUrl;
  });
}

// Write data to BLE characteristic in safe chunks
async function writeBTChunks(characteristic, data, chunkSize = 20, delayMs = 50) {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValueWithResponse(chunk);
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
}

async function printViaBluetooth(cartData, totalAmount, payMethod, txId, now, activeUserName) {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb']
    });

    const server = await device.gatt.connect();
    let service;
    try { service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb'); } 
    catch(e) { service = await server.getPrimaryService('0000ff00-0000-1000-8000-00805f9b34fb'); }

    const characteristics = await service.getCharacteristics();
    const characteristic = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);
    if (!characteristic) throw new Error('Karakteristik Write tidak ditemukan.');

    const encoder = new TextEncoder();
    let r = "\x1b\x40"; // ESC @ (Reset)
    r += "\x1b\x61\x01"; // Center
    r += "SI LENTERA\n";
    r += "by MDYB STORE\n";
    r += "--------------------------------\n";
    r += "\x1b\x61\x00"; // Left
    r += `No: ${txId}\n`;
    r += `Tgl: ${now.toLocaleDateString('id-ID')} ${now.getHours()}:${now.getMinutes()}\n`;
    r += `Kasir: ${activeUserName || '-'}\n`;
    r += "--------------------------------\n";
    
    cartData.forEach(item => {
       const lineTotal = item.price * item.qty;
       r += `${item.name.substring(0, 20)}\n`;
       r += `${item.qty} ${item.unit || ''} x ${item.price.toLocaleString()} = ${lineTotal.toLocaleString()}\n`;
    });

    r += "--------------------------------\n";
    r += `TOTAL       : Rp ${totalAmount.toLocaleString()}\n`;
    r += `BAYAR       : ${payMethod}\n`;
    r += "--------------------------------\n";
    r += "\x1b\x61\x01"; // Center
    r += "Terima Kasih!\n";
    r += "Mdyb Store - Solusi Kasir\n\n\n\n\n";

    await writeBTChunks(characteristic, encoder.encode(r));
    alert('Struk Bluetooth Berhasil Dicetak!');
  } catch (error) {
    console.error('BT Error:', error);
    alert('Gagal cetak: ' + error.message);
  }
}

// ──────────────────────── UTILS WEB PRINT (NOTA) ────────────────────────
function printReceiptBrowser(items, methodLabel, grandTotal, customer, cashierName, txId, now) {
  const subtotalAmt = items.reduce((s, i) => s + (i.price * i.qty), 0);
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }) + ' WIB';

  // Format IDR Helper
  const fmt = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Browser memblokir pop-up print. Izinkan pop-up untuk mencetak!');
    return;
  }

  printWindow.document.write(`
    <html>
    <head>
      <title>Nota Si Lentera</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @media print { margin: 0; }
        body { font-family: 'Inter', sans-serif; font-size: 10pt; color: #111; margin: 0; padding: 15px; width: 300px; max-width: 100%; display: flex; flex-direction: column; align-items: center; }
        .logo { max-width: 180px; margin-bottom: 5px; }
        .title { font-size: 13pt; font-weight: 800; text-align: center; margin-bottom: 8px; }
        .line-dash { border-top: 1.5px dashed #cbd5e1; width: 100%; margin: 10px 0; }
        .line-solid { border-top: 1.5px solid #111; width: 100%; margin: 8px 0; }
        .flex-between { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; margin: 3px 0; }
        small { font-size: 8pt; color: #64748b; }
        .bold { font-weight: 700; font-size: 9.5pt; }
        .text-right { text-align: right; }
        .items { width: 100%; margin: 8px 0; }
        .total-row { font-size: 14pt; font-weight: 900; display: flex; justify-content: space-between; width: 100%; margin: 10px 0; }
        .paid-badge { font-size: 18pt; font-weight: 900; color: #dc2626; text-shadow: 1px 1px 0 #000; letter-spacing: 2px; text-align: center; margin-top: 15px; position:relative; }
        .paid-badge::before { content: ''; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 120%; height: 3px; background: #dc2626; z-index: -1; opacity: 0.5; }
        .footer { text-align: center; width: 100%; font-size: 8.5pt; color: #475569; margin-top: 15px; line-height: 1.4; }
      </style>
    </head>
    <body>
      <img src="https://res.cloudinary.com/dvz0zvpwr/image/upload/v1774077332/mdyb_logo_dark_pos_txlz5.png" class="logo" />
      <div class="title">Kasir / ${methodLabel.toUpperCase()}</div>
      
      <div class="flex-between" style="margin-top:5px;">
        <div><small>Tanggal</small><br/><span class="bold">${dateStr}</span></div>
        <div class="text-right"><small>Kasir</small><br/><span class="bold">${cashierName}</span></div>
      </div>
      <div class="flex-between" style="margin-top: 8px;">
        <div><small>Trx ID</small><br/><span class="bold">${txId}</span></div>
        <div class="text-right"><small>Pelanggan</small><br/><span class="bold">${customer?.name || 'Anonim'}</span></div>
      </div>
      
      <div class="line-dash"></div>
      
      <div class="items">
        ${items.map(item => `
          <div class="flex-between" style="margin-bottom:6px;">
            <div style="flex:1; padding-right:10px;">${item.name} x${item.qty}</div>
            <div style="white-space:nowrap;">${fmt(item.price * item.qty)}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="line-dash"></div>
      
      <div class="items" style="width: 100%;">
        <div class="bold" style="margin-bottom: 6px; font-size:10pt;">Payment Details</div>
        <div class="flex-between">
          <div>Subtotal</div>
          <div>${fmt(subtotalAmt)}</div>
        </div>
      </div>
      
      <div class="line-solid"></div>
      
      <div class="total-row">
        <div>Total</div>
        <div>${fmt(grandTotal)}</div>
      </div>
      
      <div class="line-dash"></div>
      
      <div class="items" style="width: 100%;">
        <div class="bold" style="margin-bottom: 6px; font-size:10pt;">Payment Method</div>
        <div class="flex-between">
          <div>${methodLabel}</div>
          <div>${fmt(grandTotal)}</div>
        </div>
        <div class="flex-between">
          <div>Kembalian</div>
          <div>Rp 0</div>
        </div>
      </div>
      
      <div class="line-dash"></div>
      
      <div class="paid-badge">
        <span style="position:relative; z-index:2; background:#fff; padding:0 8px;">PAID</span>
        <div style="position:absolute; width:100%; height:2px; background:#dc2626; top:50%; left:0; z-index:1;"></div>
      </div>
      
      <div class="footer">
        <div style="margin-bottom:8px">${dateStr} - ${timeStr}</div>
        Thank you for your order!<br/>
        <span style="font-size:7pt; margin-top:4px; display:inline-block;">★ Si Lentera · Solusi Kasir Ringan ★</span>
      </div>
      
      <script>
        window.onload = function() { 
          setTimeout(() => {
            window.print(); 
            // Optional: window.close() after print dialog closes
            // window.close(); 
          }, 300);
        }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

const DICT = {

  ID: {
    searchPlaceholder: "Cari produk, SKU atau scan barcode...",
    online: "Supabase Synced", offline: "Tersimpan Lokal (Offline)",
    admin: "Kasir Shift A", all: "Semua", currentOrder: "Pesanan Saat Ini",
    emptyCart: "Keranjang Kosong", discount: "Diskon", note: "Catatan",
    subtotal: "Subtotal", tax: "Pajak (0%)", total: "Total", charge: "Bayar Tunai",
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
    subtotal: "Subtotal", tax: "Tax (0%)", total: "Total", charge: "Pay Cash",
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

function formatIDR(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

function PaymentModal({ total, selectedCustomer, onClose, onConfirm }) {
  const [method, setMethod] = useState('cash');
  const [cashGiven, setCashGiven] = useState('');

  const cashNum = parseFloat(cashGiven.replace(/\D/g, '')) || 0;
  const denominations = [10000, 20000, 50000, 100000, 'Pas'];

  let change = 0;
  let remaining = 0;
  if (method === 'cash') {
    change = Math.max(cashNum - total, 0);
    remaining = Math.max(total - cashNum, 0);
  } else if (method === 'split') {
    remaining = Math.max(total - cashNum, 0);
  }

  const handlePay = () => {
    if (method === 'cash' && cashNum > 0 && cashNum < total) {
      return alert('Uang tunai kurang dari total tagihan!');
    }
    if (method === 'split' && cashNum >= total) {
      return alert('Bayar tunai melebihi/sama dengan tagihan. Gunakan metode Tunai.');
    }
    if (method === 'kasbon' && !selectedCustomer) {
      if (!window.confirm('Belum ada pelanggan dipilih. Yakin catat kasbon ke pelanggan anonim?')) return;
    }
    onConfirm({ method, cashGiven: cashNum, splitQris: remaining });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ width: '450px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Proses Bayar</h3>
          <span style={{ background: 'var(--accent-blue)', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800 }}>Total: {formatIDR(total)}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginBottom: '1.2rem' }}>
          {['cash', 'qris', 'split', 'kasbon'].map(m => (
            <button key={m} onClick={() => setMethod(m)}
              style={{
                padding: '0.8rem 0.4rem', borderRadius: '12px', border: method === m ? '2px solid var(--accent-blue)' : '1px solid #e2e8f0',
                background: method === m ? '#eff6ff' : 'white', color: method === m ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'
              }}>
              {m === 'cash' && <CreditCard size={18} />}
              {m === 'qris' && <QrCode size={18} />}
              {m === 'split' && <LayoutGrid size={18} />}
              {m === 'kasbon' && <BookOpen size={18} />}
              {m === 'split' ? 'Mix' : m === 'cash' ? 'Tunai' : m === 'qris' ? 'QRIS' : 'Hutang'}
            </button>
          ))}
        </div>

        {(method === 'cash' || method === 'split') && (
          <div className="split-inputs" style={{ marginBottom: '1.2rem', textAlign: 'left', background: '#f8fafc', padding: '1rem', borderRadius: '16px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
              {method === 'cash' ? 'Uang Diterima' : 'Tunai Dimuka'}
            </label>
            <input type="number" autoFocus placeholder="0" value={cashGiven} onChange={e => setCashGiven(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', fontSize: '1.5rem', fontWeight: 800, borderRadius: '12px', border: '2px solid #cbd5e1', outline: 'none', color: 'var(--accent-blue)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', marginTop: '0.8rem' }}>
              {denominations.map(d => (
                <button key={d} onClick={() => setCashGiven(d === 'Pas' ? String(total) : String(d))}
                  style={{ padding: '0.5rem 0.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                  {d === 'Pas' ? 'PAS' : (d/1000) + 'k'}
                </button>
              ))}
            </div>
            {method === 'cash' && cashGiven && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: remaining > 0 ? '#fff1f2' : '#f0fdf4', borderRadius: '12px', marginTop: '1rem', border: remaining > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0' }}>
                <span style={{ fontWeight: 600, color: remaining > 0 ? '#e11d48' : '#16a34a' }}>{remaining > 0 ? 'Kurang' : 'Kembali'}</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: remaining > 0 ? '#e11d48' : '#16a34a' }}>{formatIDR(remaining > 0 ? remaining : change)}</span>
              </div>
            )}
            {method === 'split' && cashGiven && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: '#f0f9ff', borderRadius: '12px', marginTop: '1rem', border: '1px solid #bae6fd' }}>
                <span style={{ fontWeight: 600, color: '#0284c7' }}>Sisa QRIS</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0284c7' }}>{formatIDR(remaining)}</span>
              </div>
            )}
          </div>
        )}

        {method === 'qris' && (
          <div style={{ background: '#fef2f2', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.2rem', border: '1px solid #fee2e2' }}>
            <QrCode size={48} color="#e11d48" style={{ margin: '0 auto 0.5rem', display: 'block' }}/>
            <p style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600 }}>Bayar penuh {formatIDR(total)} dengan QRIS.</p>
          </div>
        )}

        {method === 'kasbon' && (
          <div style={{ background: '#fffbeb', padding: '1.2rem', borderRadius: '16px', marginBottom: '1.2rem', border: '1px solid #fde68a', textAlign: 'left' }}>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <BookOpen size={24} color="#d97706" />
              <div>
                <h4 style={{ color: '#d97706', margin: 0, fontSize: '0.9rem' }}>Mode Kasbon</h4>
                {selectedCustomer ? (
                  <p style={{ fontSize: '0.8rem', margin: '2px 0 0' }}>Pelanggan: <strong>{selectedCustomer.name}</strong></p>
                ) : (
                  <p style={{ fontSize: '0.8rem', margin: '2px 0 0', color: '#dc2626' }}>⚠ Pilih pelanggan dulu!</p>
                )}
              </div>
            </div>
          </div>
        )}

        <button onClick={handlePay}
          disabled={method === 'kasbon' && !selectedCustomer}
          style={{ width: '100%', padding: '1.2rem', borderRadius: '14px', background: (method === 'kasbon' && !selectedCustomer) ? '#cbd5e1' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: 800, fontSize: '1rem', border: 'none', cursor: (method === 'kasbon' && !selectedCustomer) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', marginBottom: '0.6rem' }}>
          💳 {method === 'qris' ? 'KONFIRMASI BAYAR QRIS' : method === 'kasbon' ? 'CATAT SEBAGAI HUTANG' : 'SELESAIKAN TRANSAKSI'}
        </button>
        <button onClick={onClose} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'transparent', border: '1px solid #e2e8f0', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Batal &amp; Kembali</button>
      </div>
    </div>
  );
}

function SuccessModal({ total, onClose, onBluetoothPrint, onSendWA, onWebPrint }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="success-icon"><CheckCircle size={48} color="#10b981" /></div>
        <h3 style={{ color: '#10b981', marginBottom: '0.3rem' }}>Transaksi Berhasil! ✅</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Total: <strong style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>{formatIDR(total)}</strong>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <button onClick={onWebPrint}
            style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#0ea5e9', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.95rem' }}>
            <Printer size={20} /> Cetak Struk Web (Nota)
          </button>
          <button onClick={onBluetoothPrint}
            style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.95rem' }}>
            <Bluetooth size={20} /> Cetak Bluetooth (Thermal)
          </button>
          <button onClick={onSendWA}
            style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#25D366', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.95rem' }}>
            <MessageCircle size={20} /> Kirim Bukti ke WA
          </button>
          <button onClick={onClose}
            style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', background: '#f1f5f9', color: '#334155', fontWeight: 600, border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.9rem' }}>
            Tutup &amp; Transaksi Baru
          </button>
        </div>
      </div>
    </div>
  );
}


function WAQuickSend({ total, cart, payMethod, customer, waNum, onClose }) {
  const buildWAMessage = () => {
    const now = new Date();
    const txId = 'SL' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + String(now.getTime()).slice(-5);
    const itemLines = (cart || []).map(item => {
      return `• ${item.name} x${item.qty}  ${formatIDR(item.price * item.qty)}`;
    }).join('\n');
    const subtotalAmt = (cart || []).reduce((s, i) => s + i.price * i.qty, 0);
    return encodeURIComponent(
`*Nota Si Lentera*
${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB${customer ? `\nPlg: ${customer.name}` : ''}
─────────────────
${itemLines}
─────────────────
Total: *${formatIDR(subtotalAmt)}*
Metode: ${(payMethod || '').toUpperCase()}
─────────────────
Terima kasih! 🙏`);
  };

  const send = () => {
    if (!waNum) {
      alert('Nomor WA pelanggan tidak tersedia. Pilih pelanggan terlebih dahulu.');
      onClose();
      return;
    }
    const num = waNum.replace(/^0/, '62').replace(/\D/g, '');
    window.open(`https://wa.me/${num}?text=${buildWAMessage()}`, '_blank');
    onClose();
  };

  // Auto-open WA directly
  useEffect(() => { send(); }, []);

  return null; // No modal rendered, directly opens WA
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
  const location = useLocation();
  const [activeUser, setActiveUser] = useState(() => {
    const saved = localStorage.getItem('activeUser');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (!activeUser && location.pathname === '/pos') {
      navigate('/admin');
    } else if (activeUser && location.pathname === '/admin') {
      navigate('/pos');
    }
  }, [activeUser, location.pathname, navigate]);
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
  const [editMemberId, setEditMemberId] = useState(null);
  const [stockForm, setStockForm] = useState({ name: '', category: '', cost_price: '', price: '', stock: '', unit: 'Pcs' });
  const [stockSaving, setStockSaving] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txForm, setTxForm] = useState({ total: '', payment_method: 'cash' });
  const [txSaving, setTxSaving] = useState(false);
  const [editTxId, setEditTxId] = useState(null);
  const [drawerAmount, setDrawerAmount] = useState('');

  // Cart extra states
  const [discountInput, setDiscountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [showNoteBox, setShowNoteBox] = useState(false);
  const [editPrices, setEditPrices] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  // Supabase Data
  const [dbCategories, setDbCategories] = useState([]);
  const [dbCashiers, setDbCashiers] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);

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
        return prev.map(i => i.id === product.id ? { ...i, qty: existing.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta, e) => {
    e.stopPropagation();
    setCart(prev => prev.flatMap(item => {
      if (item.id !== id) return [item];
      const newQty = item.qty + delta;
      if (newQty <= 0) return [];
      return [{ ...item, qty: newQty }];
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const raw = subtotal;
  const rounded = Math.ceil(raw / 500) * 500;
  const donationAmt = donation ? rounded - raw : 0;
  const total = donation ? rounded : raw;

  // ── checkout flows ──
  const finishUI = (amount, method, cartSnapshot = []) => {
    setLastTotal(amount);
    setLastMethod(method || 'cash');
    setLastCart([...(cartSnapshot.length > 0 ? cartSnapshot : cart)]);
    setCart([]);
    setDonation(0);
    setDiscountInput('');
    setNoteInput('');
    setModal('success');
  };

  const saveToSupabase = async (itemsToSave, totalToSave, method, extra = {}) => {
    const txData = {
      items: itemsToSave,
      subtotal: itemsToSave.reduce((s, i) => s + (i.price * i.qty), 0),
      tax: 0,
      total: totalToSave,
      payment_method: method,
      cash_amount: extra.cash || (method === 'cash' ? totalToSave : 0),
      qris_amount: extra.qris || (method === 'qris' ? totalToSave : 0),
      donation_amount: donationAmt,
      cashier_id: activeUser ? activeUser.id : null
    };

    // Optimistic: show success immediately
    finishUI(totalToSave, method, itemsToSave);

    try {
      const { data, error } = await supabase.from('transactions').insert([txData]).select();
      if (error) { console.warn('Supabase sync failed:', error.message); return; }

      if (method === 'kasbon' && extra.name) {
        await supabase.from('members')
          .upsert([{ name: extra.name, phone: extra.phone || null, debt_balance: totalToSave }], { onConflict: 'phone' });
      }

      const { data: txList } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);
      if (txList) setTransactions(txList);
    } catch (err) {
      console.warn('Unexpected error:', err.message);
    }
  };

  // ── web print (Format Nota HTML) ──
  const handleWebPrint = () => {
    if (!lastCart || lastCart.length === 0) return;
    const now = new Date();
    const txId = 'SL' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + String(now.getTime()).slice(-5);
    const cashierName = activeUser ? activeUser.name : text.admin;
    printReceiptBrowser(lastCart, lastMethod, lastTotal, selectedCustomer, cashierName, txId, now);
  };

  // ── bluetooth print (Direct ESC/POS - Optimized for Woya WP801 58mm) ──
  const printBluetooth = async (cartToPrint, method, totalToPrint, customer) => {
    if (!cartToPrint || cartToPrint.length === 0) {
      console.warn('No items to print');
      return;
    }

    try {
      const now = new Date();
      const txId = 'SL' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + String(now.getTime()).slice(-5);
      const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      const cashierName = activeUser ? activeUser.name : 'Kasir';
      const customerName = customer?.name || 'Anonim';
      const subtotalAmt = cartToPrint.reduce((s, i) => s + (i.price * i.qty), 0);
      const fmtRp = (n) => 'Rp ' + n.toLocaleString('id-ID');
      
      const encoder = new TextEncoder();
      
      // ─── ESC/POS Command Constants ───
      const INIT          = '\x1b\x40';       // Reset printer
      const CENTER        = '\x1b\x61\x01';   // Align center  
      const LEFT          = '\x1b\x61\x00';   // Align left
      const BOLD_ON       = '\x1b\x45\x01';   // Bold on
      const BOLD_OFF      = '\x1b\x45\x00';   // Bold off
      const DBL_H_ON      = '\x1b\x21\x10';   // Double height on
      const DBL_H_OFF     = '\x1b\x21\x00';   // Double height off
      const DBL_WH_ON     = '\x1b\x21\x30';   // Double width+height on
      const UNDERLINE_ON  = '\x1b\x2d\x01';   // Underline on
      const UNDERLINE_OFF = '\x1b\x2d\x00';   // Underline off
      const FEED_CUT      = '\n\n\n\n\x1d\x56\x00'; // Feed + partial cut
      
      // 48 chars per line for 80mm thermal
      const W = 48;
      const LINE_DASH  = '-'.repeat(W) + '\n';
      const LINE_EQUAL = '='.repeat(W) + '\n';
      
      // Helper: pad left+right on same line
      const lr = (l, r, width = W) => {
        const ls = String(l), rs = String(r);
        const gap = width - ls.length - rs.length;
        return gap > 0 ? ls + ' '.repeat(gap) + rs : ls + ' ' + rs;
      };
      
      // ─── Build Receipt ───
      let r = INIT;
      
      // === HEADER ===
      r += CENTER;
      r += '\n';
      r += BOLD_ON + DBL_H_ON;
      r += 'SI LENTERA\n';
      r += DBL_H_OFF + BOLD_OFF;
      r += 'by MDYB Store\n';
      r += '\n';
      
      // === TITLE (Kasir / METHOD) ===
      r += BOLD_ON + DBL_H_ON;
      r += `Kasir / ${method.toUpperCase()}\n`;
      r += DBL_H_OFF + BOLD_OFF;
      r += LINE_EQUAL;
      
      // === INFO SECTION (2 columns) ===
      r += LEFT;
      r += lr('Tanggal', 'Kasir') + '\n';
      r += BOLD_ON;
      r += lr(dateStr, cashierName) + '\n';
      r += BOLD_OFF + '\n';
      r += lr('Trx ID', 'Pelanggan') + '\n';
      r += BOLD_ON;
      const txShort = txId.length > 24 ? txId.substring(0, 24) : txId;
      const custShort = customerName.length > 20 ? customerName.substring(0, 20) : customerName;
      r += lr(txShort, custShort) + '\n';
      r += BOLD_OFF;
      r += LINE_DASH;
      
      // === ITEMS ===
      cartToPrint.forEach(item => {
        const name = item.name.length > 34 ? item.name.substring(0, 34) : item.name;
        const qty = `x${item.qty}`;
        const lineTotal = fmtRp(item.price * item.qty);
        r += lr(`${name} ${qty}`, lineTotal) + '\n';
      });
      
      r += LINE_DASH;
      
      // === PAYMENT DETAILS ===
      r += BOLD_ON + 'Payment Details\n' + BOLD_OFF;
      r += lr('Subtotal', fmtRp(subtotalAmt)) + '\n';
      r += LINE_EQUAL;
      
      // === TOTAL (bold, normal size) ===
      r += BOLD_ON;
      r += lr('Total', fmtRp(totalToPrint)) + '\n';
      r += BOLD_OFF;
      r += LINE_DASH;
      
      // === PAYMENT METHOD ===
      r += BOLD_ON + 'Payment Method\n' + BOLD_OFF;
      r += lr(method, fmtRp(totalToPrint)) + '\n';
      r += lr('Kembalian', 'Rp 0') + '\n';
      r += LINE_DASH;
      
      // === FOOTER ===
      r += CENTER;
      r += `${dateStr} - ${timeStr}\n`;
      r += '\n';
      r += 'Terima kasih atas pesanan Anda!\n';
      r += '\n';
      r += BOLD_ON;
      r += '*silentera by mdybstore*\n';
      r += BOLD_OFF;
      
      // === FEED & CUT ===
      r += FEED_CUT;
      
      const textData = encoder.encode(r);
      
      // ─── Load Logo Bitmap ───
      let logoBitmap = null;
      try {
        logoBitmap = await imageToEscPosBitmap(LOGO_URL, 300); // 300 dots wide for nice size
      } catch(logoErr) {
        console.warn('Logo tidak bisa dimuat untuk cetak:', logoErr.message);
        // Will print without logo
      }
      
      // ─── Connect to Bluetooth Printer ───
      if (!navigator.bluetooth) {
        alert("Browser tidak mendukung Web Bluetooth.\nGunakan Chrome atau Edge.");
        return;
      }
      
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ff00-0000-1000-8000-00805f9b34fb'
        ]
      });
      
      const server = await device.gatt.connect();
      let service;
      try { 
        service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb'); 
      } catch(e) { 
        service = await server.getPrimaryService('0000ff00-0000-1000-8000-00805f9b34fb'); 
      }
      
      const characteristics = await service.getCharacteristics();
      const characteristic = characteristics.find(c => 
        c.properties.writeWithoutResponse || c.properties.write
      );
      if (!characteristic) throw new Error('Karakteristik Write tidak ditemukan pada printer.');
      
      // ─── Send to Printer ───
      // 1. Send INIT + CENTER alignment for logo
      const initCenter = encoder.encode(INIT + CENTER);
      await writeBTChunks(characteristic, initCenter);
      
      // 2. Send Logo bitmap (if loaded)
      if (logoBitmap) {
        await writeBTChunks(characteristic, logoBitmap, 20, 80); // Slower for image data
        // Small feed after logo
        await writeBTChunks(characteristic, encoder.encode('\n'));
      }
      
      // 3. Send text receipt
      await writeBTChunks(characteristic, textData);
      
      // Disconnect cleanly
      if (device.gatt.connected) device.gatt.disconnect();
      console.log('✅ Bluetooth print with logo complete');
      
    } catch (error) {
      console.error('Bluetooth Print Error:', error);
      if (error.name !== 'NotFoundError') {
        alert('Gagal cetak bluetooth: ' + error.message);
      }
    }
  };

  // ── print receipt (Virtual / Ctrl+P fallback) ──
  const printReceipt = (payMethod) => {
    const now = new Date();
    const txId = 'SL' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + String(now.getTime()).slice(-5);
    const manualDisc = Number(discountInput) || 0;
    const rawSub = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const taxAmt = 0;
    const grandTotal = rawSub + taxAmt;

    const itemRows = cart.map(item => {
      const lineTotal = item.price * item.qty;
      return `
        <div class="item-row">
          <div>
            <span class="item-name">${item.name} x${item.qty} ${item.unit || ''}</span>
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
  .logo-wrap { text-align: center; margin-bottom: 5px; }
  .logo-img { width: 180px; height: auto; object-fit: contain; }
  .store-name, .store-sub { display: none !important; }
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
    <img src="https://res.cloudinary.com/dsichsufc/image/upload/v1774079104/logo_silentera_l5nepu.png" class="logo-img" alt="Logo" />
  </div>
  <div class="store-name" style="display:none">Si Lentera</div>
  <div class="store-sub" style="display:none">by MDYB Store</div>
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
  <div class="solid"></div>
  <div class="pay-row total"><span>Total</span><span>${formatIDR(grandTotal)}</span></div>

  <div class="dash"></div>
  <div class="section-title">Payment Method</div>
  <div class="pay-row"><span>${payMethod}</span><span>${formatIDR(grandTotal)}</span></div>
  <div class="pay-row"><span>Kembalian</span><span>${formatIDR(0)}</span></div>

  <div class="thank-you">Thank you for your order!</div>
  <div class="footer-brand">★ Si Lentera by Mdyb Store ★</div>
  <div class="dash"></div>
  <div class="paid-box">
    <div class="paid-time">${now.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })} - ${now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })} WIB</div>
  </div>
  <br/><br/>
</body></html>`;

    // Modern hidden iframe approach blocks browsers from interpreting it as random popup blocking
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(printContent);
    iframe.contentWindow.document.close();
    iframe.contentWindow.focus();
    setTimeout(() => { 
      iframe.contentWindow.print(); 
      setTimeout(() => document.body.removeChild(iframe), 1500);
    }, 400);
  };

  if (!activeUser && location.pathname === '/admin') {
    return <LoginScreen cashiers={dbCashiers} onLogin={(user) => {
      setActiveUser(user);
      localStorage.setItem('activeUser', JSON.stringify(user));
      navigate('/pos');
    }} />;
  }

  if (!activeUser) return null; // Avoid render flash during redirect

  return (
    <div className={`pos-container visible view-${viewMode} ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="motion-lines" />

      {/* ── Modals ── */}
      {modal === 'payment' && <PaymentModal total={total} selectedCustomer={selectedCustomer} onClose={() => setModal(null)} onConfirm={({ method, cashGiven, splitQris }) => {
        // Capture snapshot BEFORE state reset
        const itemsToSave = [...cart];
        const grandTotal = Math.round(total);
        const customerSnapshot = selectedCustomer;

        // saveToSupabase calls finishUI() which sets modal='success' automatically
        // DO NOT call setModal(null) here - it would overwrite 'success'!
        saveToSupabase(itemsToSave, grandTotal, method, {
          cash: cashGiven,
          qris: splitQris,
          name: customerSnapshot?.name,
          phone: customerSnapshot?.phone
        });
      }} />}
      {modal === 'success' && <SuccessModal
        total={lastTotal}
        onClose={() => setModal(null)}
        onWebPrint={handleWebPrint}
        onBluetoothPrint={() => printBluetooth(lastCart, lastMethod, lastTotal, selectedCustomer)}
        onSendWA={() => {
          if (!selectedCustomer?.phone) {
            alert('Pilih pelanggan dengan nomor WA terlebih dahulu.');
            return;
          }
          const now = new Date();
          const items = (lastCart || []).map(i => `• ${i.name} x${i.qty}  ${formatIDR(i.price * i.qty)}`).join('\n');
          const sub = (lastCart || []).reduce((s, i) => s + i.price * i.qty, 0);
          const msg = encodeURIComponent(
`*Nota Si Lentera*
${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
Plg: ${selectedCustomer.name}
─────────────────
${items}
─────────────────
Total: *${formatIDR(sub)}*
Metode: ${(lastMethod || '').toUpperCase()}
─────────────────
Terima kasih! 🙏`);
          const num = selectedCustomer.phone.replace(/^0/, '62').replace(/\D/g, '');
          window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
        }}
      />}

      {/* ── Left Sidebar ── */}
      <aside className="pos-sidebar-left glass">
        <div 
          className="nav-icon" 
          onClick={() => {
            if (window.confirm('Apakah Anda yakin ingin logout dan kembali ke menu utama (Home)? \n⚠ Perhatian: Data pesanan kasir yang belum disimpan ke database mungkin akan dikosongkan.')) {
              localStorage.removeItem('activeUser');
              setActiveUser(null);
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
        <div className={`nav-icon ${activeMenu === 'history' ? 'active' : ''}`} onClick={() => setActiveMenu('history')}><Clock size={26}/><span className="nav-label">HISTORY</span></div>
        <div className={`nav-icon ${activeMenu === 'members' ? 'active' : ''}`} onClick={() => setActiveMenu('members')}><User size={26}/><span className="nav-label">MEMBERS</span></div>
        <div className={`nav-icon ${activeMenu === 'report' ? 'active' : ''}`} onClick={() => setActiveMenu('report')}><FileBarChart size={26}/><span className="nav-label">REPORT</span></div>
        <div className={`nav-icon ${activeMenu === 'stock' ? 'active' : ''}`} onClick={() => setActiveMenu('stock')}><Package size={26}/><span className="nav-label">STOCK</span></div>
        <div className={`nav-icon ${activeMenu === 'drawer' ? 'active' : ''}`} onClick={() => setActiveMenu('drawer')}><Unlock size={26}/><span className="nav-label">DRAWER</span></div>
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
              ) : cart.map((item, index) => {
                return (
                  <div key={item.id + '_' + index} className="cart-item">
                    <div className="item-details" style={{ flex: 1 }}>
                      <h5>{item.name}</h5>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.qty} {item.unit || ''}</span>
                      {editPrices ? (
                        <input type="number" defaultValue={item.price} autoFocus={index === cart.length - 1}
                          style={{ width: '100px', padding: '0.3rem', fontSize: '0.9rem', border: '1px solid var(--accent-blue)', borderRadius: '6px', outline: 'none' }}
                          onBlur={e => {
                            const v = Number(e.target.value);
                            if (v >= 0) setCart(prev => prev.map(i => i.id === item.id ? { ...i, price: v } : i));
                          }}
                        />
                      ) : (
                        <p>{formatIDR(item.price)}</p>
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
            <div className="cart-tools" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <button className="tool-btn" onClick={() => { setShowNoteBox(false); setEditPrices(p => !p); }} style={{ width: '100%', background: editPrices ? '#eff6ff' : 'transparent', border: editPrices ? '1px solid var(--accent-blue)' : '1px dashed #cbd5e1' }}>
                <Tag size={18} color={editPrices ? "var(--accent-blue)" : "inherit"} /> {editPrices ? 'Selesai Edit' : 'Edit Harga'}
              </button>
              <button className="tool-btn" onClick={() => { setEditPrices(false); setShowNoteBox(n => !n); }} style={{ width: '100%', border: '1px dashed #cbd5e1' }}>
                <StickyNote size={18} /> {text.note}
              </button>
            </div>
            {showNoteBox && (
              <div style={{ padding: '0 1rem 0.5rem' }}>
                <textarea placeholder="Catatan pesanan..." value={noteInput} onChange={e => setNoteInput(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', resize: 'vertical', outline: 'none', minHeight: '60px' }} />
              </div>
            )}

            {/* Summary */}
            <div className="cart-summary">
              <div className="summary-row"><span>{text.subtotal}</span><span>{formatIDR(subtotal)}</span></div>
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

              <div style={{ marginTop: '0.5rem' }}>
                <button
                  className="checkout-btn"
                  onClick={() => setModal('payment')}
                  disabled={cart.length === 0}
                  style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  💳 BAYAR TEPAT / UBAH NOMINAL
                </button>
              </div>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>
                        {editMemberId ? '✏️ Edit Data Pelanggan' : '➕ Tambah Pelanggan Baru'}
                      </h4>
                      {editMemberId && (
                        <button onClick={() => { setEditMemberId(null); setMemberForm({ name: '', phone: '', debt_balance: '' }); }} style={{ background: '#f1f5f9', color: 'var(--text-secondary)', border: 'none', padding: '0.4rem 1rem', borderRadius: '99px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                          Batal Edit
                        </button>
                      )}
                    </div>
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
                        const dataPayload = { name: memberForm.name.trim(), phone: memberForm.phone.trim() || null, debt_balance: Number(memberForm.debt_balance) || 0, created_at: new Date().toISOString() };
                        let reqError = null;
                        
                        if (editMemberId) {
                          const { error } = await supabase.from('members').update(dataPayload).eq('id', editMemberId);
                          reqError = error;
                        } else {
                          const { error } = await supabase.from('members').insert([dataPayload]);
                          reqError = error;
                        }

                        if (reqError) alert('Gagal simpan: ' + reqError.message);
                        else {
                          setMemberForm({ name: '', phone: '', debt_balance: '' });
                          setEditMemberId(null);
                          const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false });
                          if (data) setMembers(data);
                          alert(editMemberId ? '✅ Pelanggan berhasil diupdate!' : '✅ Pelanggan berhasil ditambahkan!');
                        }
                        setMemberSaving(false);
                      }}>
                      {memberSaving ? 'Menyimpan...' : (editMemberId ? '🔄 Update Pelanggan' : '💾 Simpan Pelanggan')}
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
                            <th style={{ textAlign: 'left', padding: '0.6rem', color: 'var(--text-secondary)' }}>Perubahan Terakhir</th>
                            <th style={{ textAlign: 'center', padding: '0.6rem', color: 'var(--text-secondary)' }}>Aksi</th>
                          </tr></thead>
                          <tbody>{members.map(m => (
                            <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.7rem 0.6rem', fontWeight: 600 }}>{m.name}</td>
                              <td style={{ padding: '0.7rem 0.6rem', color: 'var(--text-secondary)' }}>{m.phone || '-'}</td>
                              <td style={{ padding: '0.7rem 0.6rem', textAlign: 'right', color: m.debt_balance > 0 ? '#e74c3c' : '#27ae60', fontWeight: 700 }}>{formatIDR(m.debt_balance || 0)}</td>
                              <td style={{ padding: '0.7rem 0.6rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(m.created_at).toLocaleString('id-ID')}</td>
                              <td style={{ textAlign: 'center', padding: '0.4rem', display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                <button
                                  onClick={() => {
                                    setEditMemberId(m.id);
                                    setMemberForm({ name: m.name, phone: m.phone || '', debt_balance: m.debt_balance || 0 });
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  style={{ background: '#e0f2fe', border: 'none', borderRadius: '8px', padding: '0.4rem 0.65rem', cursor: 'pointer', color: '#0284c7', fontWeight: 700, fontSize: '0.85rem' }}
                                  title="Edit Pelanggan">
                                  ✏️
                                </button>
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
                  <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>
                        {editTxId ? '✏️ Edit Riwayat Transaksi' : '➕ Tambah Riwayat Manual'} 
                      </h4>
                      {editTxId && (
                        <button onClick={() => { setEditTxId(null); setTxForm({ total: '', payment_method: 'cash' }); }} style={{ background: '#f1f5f9', color: 'var(--text-secondary)', border: 'none', padding: '0.4rem 1rem', borderRadius: '99px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                          Batal Edit
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Total Transaksi (Rp) *</label>
                        <input
                          type="number"
                          style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #bfdbfe', fontSize: '0.95rem', outline: 'none', background: '#fff', color: '#0f172a' }}
                          placeholder="Misal: 50000" value={txForm.total}
                          onChange={e => setTxForm(f => ({ ...f, total: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Metode Pembayaran *</label>
                        <select
                          style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #bfdbfe', fontSize: '0.95rem', outline: 'none', background: '#fff', color: '#0f172a' }}
                          value={txForm.payment_method}
                          onChange={e => setTxForm(f => ({ ...f, payment_method: e.target.value }))}>
                          <option value="cash">Tunai (Cash)</option>
                          <option value="qris">QRIS</option>
                          <option value="split">Campuran (Split)</option>
                          <option value="kasbon">Kasbon (Hutang)</option>
                        </select>
                      </div>
                    </div>
                    <button
                      style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))', color: '#fff', border: 'none', borderRadius: '99px', padding: '0.75rem 2.5rem', fontWeight: 700, cursor: txSaving ? 'not-allowed' : 'pointer', opacity: txSaving ? 0.7 : 1, fontSize: '0.95rem' }}
                      onClick={async () => {
                        if (!txForm.total) return alert('Total transaksi wajib diisi!');
                        setTxSaving(true);
                        const dataPayload = { 
                          total: Number(txForm.total), 
                          subtotal: Number(txForm.total), 
                          tax: 0, 
                          items: editTxId ? (transactions.find(t=>t.id===editTxId)?.items || []) : [{ name: 'Transaksi Manual', qty: 1, price: Number(txForm.total) }],
                          payment_method: txForm.payment_method,
                          created_at: new Date().toISOString()
                        };
                        let reqErr = null;
                        if (editTxId) {
                          const { error } = await supabase.from('transactions').update(dataPayload).eq('id', editTxId);
                          reqErr = error;
                        } else {
                          const { error } = await supabase.from('transactions').insert([dataPayload]);
                          reqErr = error;
                        }
                        if (reqErr) alert('Gagal: ' + reqErr.message);
                        else {
                          setTxForm({ total: '', payment_method: 'cash' });
                          setEditTxId(null);
                          const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);
                          if (data) setTransactions(data);
                          alert(editTxId ? '✅ Transaksi berhasil diupdate!' : '✅ Transaksi manual berhasil ditambahkan!');
                        }
                        setTxSaving(false);
                      }}>
                      {txSaving ? 'Menyimpan...' : (editTxId ? '🔄 Update Transaksi' : '💾 Simpan Transaksi')}
                    </button>
                  </div>

                  <div className="glass" style={{ padding: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>📋 Daftar Riwayat</h4>
                    {transactions.length === 0 ? <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Belum ada transaksi tercatat.</p> :
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ textAlign: 'left', padding: '0.6rem', color: 'var(--text-secondary)' }}>Waktu</th>
                          <th style={{ textAlign: 'left', padding: '0.6rem', color: 'var(--text-secondary)' }}>Metode</th>
                          <th style={{ textAlign: 'right', padding: '0.6rem', color: 'var(--text-secondary)' }}>Total</th>
                          <th style={{ textAlign: 'center', padding: '0.6rem', color: 'var(--text-secondary)' }}>Aksi</th>
                        </tr></thead>
                        <tbody>{transactions.map(t => (
                          <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.7rem 0.6rem', color: 'var(--text-secondary)' }}>{new Date(t.created_at).toLocaleString('id-ID')}</td>
                            <td style={{ padding: '0.7rem 0.6rem' }}><span style={{ background: t.payment_method === 'cash' ? 'rgba(39,174,96,0.1)' : (t.payment_method === 'kasbon' ? '#fee2e2' : 'rgba(37,99,235,0.1)'), color: t.payment_method === 'cash' ? '#27ae60' : (t.payment_method === 'kasbon' ? '#dc2626' : 'var(--accent-blue)'), borderRadius: '99px', padding: '0.2rem 0.8rem', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>{t.payment_method}</span></td>
                            <td style={{ padding: '0.7rem 0.6rem', textAlign: 'right', fontWeight: 700 }}>{formatIDR(t.total)}</td>
                            <td style={{ textAlign: 'center', padding: '0.4rem', display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                              <button
                                onClick={() => {
                                  setEditTxId(t.id);
                                  setTxForm({ total: t.total || '', payment_method: t.payment_method || 'cash' });
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                style={{ background: '#e0f2fe', border: 'none', borderRadius: '8px', padding: '0.4rem 0.65rem', cursor: 'pointer', color: '#0284c7', fontWeight: 700, fontSize: '0.85rem' }}
                                title="Edit Laporan">
                                ✏️
                              </button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm('Hapus transaksi ini permanen? Peringatan: Hapus manual tidak akan me-revert stok otomatis secara lokal namun data laporan akan terhapus bersih.')) return;
                                  const { error } = await supabase.from('transactions').delete().eq('id', t.id);
                                  if (error) alert('Gagal hapus: ' + error.message);
                                  else setTransactions(prev => prev.filter(x => x.id !== t.id));
                                }}
                                style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '0.4rem 0.65rem', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem' }}
                                title="Hapus Laporan">
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

              {/* ── REPORT Panel ── */}
              {activeMenu === 'report' && (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  <h2 style={{ color: 'var(--accent-blue)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><FileBarChart size={28}/> Laporan Penjualan</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Ringkasan omset dan transaksi yang tercatat hari ini.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    {[{ label: 'Total Transaksi', value: transactions.length + ' pesanan', icon: '🧾' },
                      { label: 'Omset Hari Ini', value: formatIDR(transactions.filter(t => new Date(t.created_at).toDateString() === new Date().toDateString()).reduce((s, t) => s + (t.total || 0), 0)), icon: '💰' },
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
                    {transactions.slice(0, 5).map(t => {
                      const cashierName = dbCashiers.find(u => u.id === t.cashier_id)?.name || 'Admin / Manual';
                      return (
                        <div key={t.id} style={{ display: 'flex', flexDirection: 'column', padding: '1rem 0', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Kasir: {cashierName}</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Diubah: {new Date(t.created_at).toLocaleString('id-ID')}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: 'var(--accent-blue)', fontSize: '1.1rem' }}>{formatIDR(t.total)}</div>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.6rem' }}>
                                <button
                                  onClick={() => {
                                    setEditTxId(t.id);
                                    setTxForm({ total: t.total || '', payment_method: t.payment_method || 'cash' });
                                    setActiveMenu('history');
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  style={{ background: '#e0f2fe', border: 'none', borderRadius: '6px', padding: '0.4rem 0.6rem', cursor: 'pointer', color: '#0284c7', fontSize: '0.8rem', fontWeight: 600 }}>
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!window.confirm('Hapus laporan ini secara permanen?')) return;
                                    const { error } = await supabase.from('transactions').delete().eq('id', t.id);
                                    if (error) alert('Gagal hapus: ' + error.message);
                                    else setTransactions(prev => prev.filter(x => x.id !== t.id));
                                  }}
                                  style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '0.4rem 0.6rem', cursor: 'pointer', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
                                  🗑 Hapus
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Total Masuk (Tunai)</span><span style={{ fontWeight: 700 }}>{formatIDR(transactions.filter(t => t.payment_method === 'cash').reduce((s, t) => s + (t.total || 0), 0))}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Total Masuk (QRIS)</span><span style={{ fontWeight: 700 }}>{formatIDR(transactions.filter(t => t.payment_method === 'qris').reduce((s, t) => s + (t.total || 0), 0))}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}><span style={{ fontWeight: 700 }}>Grand Total</span><span style={{ fontWeight: 800, color: 'var(--accent-blue)' }}>{formatIDR(transactions.reduce((s, t) => s + (t.total || 0), 0))}</span></div>
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
