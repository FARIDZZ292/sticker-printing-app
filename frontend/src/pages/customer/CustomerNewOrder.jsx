import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Tag, Upload, Loader2, CheckCircle, Copy, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { getProducts, createOrder, validateCoupon, formatRupiah } from '../../api/api';

// =============================================
// Mapping produk ke gambar
// =============================================
const PRODUCT_IMAGES = {
  'Glossy':        '/sticker-glossy.png',
  'Matte':         '/sticker-matte.png',
  'Doff':          '/sticker-matte.png',
  'Hologram':      '/sticker-hologram.png',
  'Kraft':         '/sticker-kraft.png',
  'Transparan':    '/sticker-transparent.png',
  'Cutting':       '/sticker-cutting.png',
  'Foil':          '/sticker-foil.png',
  'Emboss':        '/sticker-foil.png',
  'Glow':          '/sticker-catalog.png',
  'Resin':         '/sticker-glossy.png',
  'Magnetic':      '/sticker-matte.png',
  'Floor':         '/sticker-cutting.png',
  'Dinding':       '/sticker-matte.png',
  'Seal':          '/sticker-hologram.png',
  'Kemasan':       '/sticker-glossy.png',
  'Numbering':     '/sticker-kraft.png',
  'Barcode':       '/sticker-kraft.png',
  'Papan':         '/sticker-glossy.png',
  'Pack':          '/sticker-cutting.png',
  'Bumper':        '/sticker-matte.png',
  'HVS':           '/sticker-kraft.png',
  'Chromo':        '/sticker-glossy.png'
};

function getProductImage(name) {
  for (const [key, img] of Object.entries(PRODUCT_IMAGES)) {
    if (name.includes(key)) return img;
  }
  return '/sticker-catalog.png';
}

// =============================================
// Metode Pembayaran
// =============================================
const PAYMENT_METHODS = [
  { id: 'QRIS',          label: 'QRIS',         desc: 'Scan QR semua e-wallet & bank', type: 'qris' },
  { id: 'Dana',          label: 'DANA',          desc: '085783628414', type: 'ewallet', number: '085783628414', name: 'MUHAMMAD FARID AL IKHSAN' },
  { id: 'GoPay',         label: 'GoPay',         desc: '085783628414', type: 'ewallet', number: '085783628414', name: 'MUHAMMAD FARID AL IKHSAN' },
  { id: 'SeaBank',       label: 'SeaBank',       desc: '901834104651', type: 'bank',    number: '901834104651', name: 'Muhammad Farid Al Ikhsan' },
  { id: 'Transfer Bank', label: 'Transfer Bank', desc: 'BRI / BCA / Mandiri', type: 'bank', number: '-', name: 'Konfirmasi via WhatsApp' },
  { id: 'Tunai',         label: 'Tunai / COD',   desc: 'Bayar saat terima', type: 'cash' },
];

function PaymentDetail({ method, total }) {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Nomor disalin!');
    setTimeout(() => setCopied(false), 2000);
  };
  if (!method) return null;

  if (method.type === 'qris') {
    return (
      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Scan QRIS berikut untuk pembayaran:</div>
        <img
          src="/qris.png"
          alt="QRIS Payment"
          style={{ width: '100%', maxWidth: 260, borderRadius: 12, border: '2px solid var(--border-accent)', display: 'block', margin: '0 auto 8px' }}
        />
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>MUHAMMAD FARID AL IKHSAN</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>NMID: ID1026520415971</div>
        {total > 0 && (
          <div style={{ marginTop: 10, background: 'rgba(108,99,255,0.1)', borderRadius: 10, padding: '8px 12px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Jumlah yang dibayar:</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary-light)' }}>{formatRupiah(total)}</div>
          </div>
        )}
      </div>
    );
  }

  if (method.type === 'ewallet' || method.type === 'bank') {
    return (
      <div style={{ marginTop: 14, background: 'rgba(108,99,255,0.06)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border-accent)' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 10 }}>{method.label}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nomor</div>
            <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, color: 'var(--color-primary-light)', letterSpacing: 1 }}>{method.number}</div>
          </div>
          {method.number !== '-' && (
            <button
              type="button"
              onClick={() => copy(method.number)}
              style={{ background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(108,99,255,0.12)', border: '1px solid var(--border-accent)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: copied ? 'var(--color-success)' : 'var(--color-primary-light)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
              {copied ? 'Disalin' : 'Salin'}
            </button>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>A/N: <strong style={{ color: 'var(--text-primary)' }}>{method.name}</strong></div>
        {total > 0 && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Transfer sebesar:</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-secondary)' }}>{formatRupiah(total)}</div>
          </div>
        )}
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', background: 'rgba(245,158,11,0.07)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(245,158,11,0.2)' }}>
          Setelah transfer, upload bukti pembayaran di halaman Riwayat Pesanan.
        </div>
      </div>
    );
  }
  return null;
}

export default function CustomerNewOrder() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    id_produk: '', jumlah: '', panjang: 5, lebar: 5, catatan: '', payment_method: 'QRIS', coupon_code: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [couponData, setCouponData] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchProduct, setSearchProduct] = useState('');

  useEffect(() => {
    getProducts().then(res => setProducts(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.id_produk) {
      setSelectedProduct(products.find(p => p.id_produk == form.id_produk) || null);
    } else {
      setSelectedProduct(null);
    }
  }, [form.id_produk, products]);

  const filteredProducts = products.filter(p =>
    p.nama_produk.toLowerCase().includes(searchProduct.toLowerCase())
  );

  // Hitung harga
  const calcPrice = () => {
    if (!selectedProduct || !form.jumlah || !form.panjang || !form.lebar)
      return { subtotal: 0, discount: 0, total: 0, hargaCustom: 0 };
    const multiplier = (parseFloat(form.panjang) * parseFloat(form.lebar)) / 25.0;
    const hargaCustom = parseFloat(selectedProduct.harga_per_pcs) * multiplier;
    const subtotal = hargaCustom * parseInt(form.jumlah);
    let discount = 0;
    if (couponData) {
      discount = couponData.type === 'percentage'
        ? (subtotal * couponData.discount_value) / 100
        : parseFloat(couponData.discount_value);
      if (discount > subtotal) discount = subtotal;
    }
    return { subtotal, discount, total: subtotal - discount, hargaCustom };
  };

  const { subtotal, discount, total, hargaCustom } = calcPrice();

  const handleValidateCoupon = async () => {
    if (!form.coupon_code) return;
    setCouponLoading(true);
    try {
      const res = await validateCoupon(form.coupon_code);
      setCouponData(res.data.coupon);
      const c = res.data.coupon;
      toast.success(`Kupon valid! Diskon: ${c.type === 'percentage' ? `${c.discount_value}%` : formatRupiah(c.discount_value)}`);
    } catch (err) {
      setCouponData(null);
      toast.error(err.response?.data?.message || 'Kupon tidak valid.');
    }
    setCouponLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_produk || !form.jumlah) return toast.error('Pilih produk dan masukkan jumlah.');
    if (selectedProduct && parseInt(form.jumlah) < selectedProduct.min_order) {
      return toast.error(`Minimal order ${selectedProduct.min_order} pcs untuk produk ini.`);
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') formData.append(k, v); });
      if (file) formData.append('file_desain', file);
      await createOrder(formData);
      toast.success('Pesanan berhasil dibuat!');
      navigate('/customer/orders');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat pesanan.');
    }
    setLoading(false);
  };

  const selectedPaymentMethod = PAYMENT_METHODS.find(m => m.id === form.payment_method);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Buat Pesanan Baru" />
        <div className="page-content animate-fade-in">
          <div className="page-header">
            <h1 className="page-header-title">Buat Pesanan Baru</h1>
            <p className="page-header-subtitle">Isi formulir di bawah untuk memesan stiker custom</p>
          </div>

          {/* Hero Banner */}
          <div style={{ marginBottom: 24, borderRadius: 'var(--radius-xl)', overflow: 'hidden', position: 'relative', height: 200 }}>
            <img src="/sticker-catalog.png" alt="Stiker Premium" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(10,10,26,0.88) 0%, rgba(10,10,26,0.3) 60%, transparent 100%)' }}>
              <div style={{ padding: '36px 32px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Stiker Premium Custom</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Vinyl · Hologram · Transparan · Matte · Foil · dan 20+ jenis lainnya</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="new-order-grid">

              {/* LEFT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Pilih Produk */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 className="card-title" style={{ margin: 0 }}>Pilih Produk Stiker</h3>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filteredProducts.length} produk tersedia</span>
                  </div>

                  {/* Search produk */}
                  <input
                    className="form-input"
                    placeholder="Cari produk stiker..."
                    value={searchProduct}
                    onChange={e => setSearchProduct(e.target.value)}
                    style={{ marginBottom: 14 }}
                  />

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                    gap: 10,
                    maxHeight: 500,
                    overflowY: 'auto',
                    paddingRight: 4
                  }}>
                    {filteredProducts.map(p => {
                      const isSelected = form.id_produk == p.id_produk;
                      const img = getProductImage(p.nama_produk);
                      return (
                        <button
                          key={p.id_produk}
                          type="button"
                          onClick={() => setForm({ ...form, id_produk: p.id_produk, jumlah: p.min_order })}
                          style={{
                            padding: 0, borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                            transition: 'var(--transition)', overflow: 'hidden',
                            background: isSelected ? 'rgba(108,99,255,0.12)' : 'var(--bg-input)',
                            border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                            position: 'relative'
                          }}
                        >
                          {/* Foto produk */}
                          <div style={{ height: 90, overflow: 'hidden', position: 'relative' }}>
                            <img
                              src={img}
                              alt={p.nama_produk}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {isSelected && (
                              <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--color-primary)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle size={14} color="#fff" />
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div style={{ padding: '10px 10px 12px' }}>
                            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>{p.nama_produk}</div>
                            <div style={{ fontSize: 13, color: 'var(--color-secondary)', fontWeight: 700 }}>{formatRupiah(p.harga_per_pcs)}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>/pcs</span></div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Min. {p.min_order} pcs</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Konfigurasi */}
                {selectedProduct && (
                  <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 16 }}>Konfigurasi Pesanan</h3>
                    <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(108,99,255,0.07)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                      <img src={getProductImage(selectedProduct.nama_produk)} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{selectedProduct.nama_produk}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatRupiah(selectedProduct.harga_per_pcs)}/pcs · Min. {selectedProduct.min_order} pcs</div>
                      </div>
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Jumlah (pcs)</label>
                        <input className="form-input" type="number" min={selectedProduct.min_order} placeholder={`Min. ${selectedProduct.min_order}`} value={form.jumlah} onChange={e => setForm({ ...form, jumlah: e.target.value })} />
                        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Min. {selectedProduct.min_order} pcs</div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Panjang (cm)</label>
                        <input className="form-input" type="number" min="1" max="100" step="0.5" value={form.panjang} onChange={e => setForm({ ...form, panjang: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Lebar (cm)</label>
                        <input className="form-input" type="number" min="1" max="100" step="0.5" value={form.lebar} onChange={e => setForm({ ...form, lebar: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Catatan / Instruksi</label>
                      <textarea className="form-textarea" placeholder="cth: Potong die-cut bentuk lingkaran, warna background putih..." value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} />
                    </div>
                  </div>
                )}

                {/* Metode Pembayaran */}
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: 16 }}>Metode Pembayaran</h3>
                  <div className="payment-methods-grid">
                    {PAYMENT_METHODS.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setForm({ ...form, payment_method: m.id })}
                        style={{
                          padding: '10px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', transition: 'var(--transition)',
                          background: form.payment_method === m.id ? 'rgba(108,99,255,0.12)' : 'var(--bg-input)',
                          border: form.payment_method === m.id ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>
                        {form.payment_method === m.id && (
                          <CheckCircle size={13} style={{ color: 'var(--color-primary)', marginTop: 4, display: 'block', margin: '4px auto 0' }} />
                        )}
                      </button>
                    ))}
                  </div>
                  {selectedPaymentMethod && form.payment_method !== 'Tunai' && (
                    <PaymentDetail method={selectedPaymentMethod} total={total} />
                  )}
                </div>

                {/* Upload Desain */}
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: 14 }}>Upload File Desain</h3>
                  <div
                    style={{ border: '2px dashed var(--border-color)', borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'var(--transition)', background: file ? 'rgba(16,185,129,0.05)' : 'transparent' }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                    onClick={() => document.getElementById('desainInput').click()}
                  >
                    {file ? (
                      <>
                        <CheckCircle size={32} style={{ color: 'var(--color-success)', display: 'block', margin: '0 auto 8px' }} />
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                      </>
                    ) : (
                      <>
                        <Upload size={32} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 10px' }} />
                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Drag & drop atau klik untuk pilih file</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>PNG, JPG, PDF, AI, CDR — Max 10 MB</div>
                      </>
                    )}
                  </div>
                  <input id="desainInput" type="file" style={{ display: 'none' }} accept=".png,.jpg,.jpeg,.pdf,.ai,.cdr,.svg" onChange={e => setFile(e.target.files[0])} />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>File desain opsional, dapat dikirim via WhatsApp/email setelah pemesanan.</div>
                </div>
              </div>

              {/* RIGHT COLUMN — Ringkasan */}
              <div style={{ position: 'sticky', top: 80 }}>
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: 16 }}>
                    <Calculator size={16} style={{ display: 'inline', marginRight: 8, color: 'var(--color-primary)' }} />
                    Ringkasan Pesanan
                  </h3>

                  {selectedProduct && form.jumlah ? (
                    <div className="price-calc-box">
                      <div className="price-calc-row">
                        <span>Produk</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: 160, textAlign: 'right', wordBreak: 'break-word', fontSize: 12 }}>{selectedProduct.nama_produk}</span>
                      </div>
                      <div className="price-calc-row">
                        <span>Ukuran</span>
                        <span>{form.panjang} x {form.lebar} cm</span>
                      </div>
                      <div className="price-calc-row">
                        <span>Harga/pcs (kustom)</span>
                        <span style={{ color: 'var(--text-primary)' }}>{formatRupiah(hargaCustom || 0)}</span>
                      </div>
                      <div className="price-calc-row">
                        <span>Jumlah</span>
                        <span>{form.jumlah} pcs</span>
                      </div>
                      <div className="price-calc-row">
                        <span>Subtotal</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatRupiah(subtotal)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="price-calc-row">
                          <span>Diskon Kupon</span>
                          <span style={{ color: 'var(--color-success)' }}>- {formatRupiah(discount)}</span>
                        </div>
                      )}
                      <div className="price-calc-row total">
                        <span>TOTAL</span>
                        <span>{formatRupiah(total)}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                      <Calculator size={28} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                      Pilih produk dan jumlah untuk melihat estimasi harga
                    </div>
                  )}

                  {/* Kupon */}
                  <div style={{ marginTop: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                    <label className="form-label">
                      <Tag size={12} style={{ display: 'inline', marginRight: 6 }} />
                      Kode Kupon
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="form-input"
                        placeholder="KODE KUPON"
                        value={form.coupon_code}
                        onChange={e => { setForm({ ...form, coupon_code: e.target.value.toUpperCase() }); setCouponData(null); }}
                        style={{ fontFamily: 'monospace', letterSpacing: 1, fontWeight: 700 }}
                      />
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleValidateCoupon} disabled={couponLoading} style={{ whiteSpace: 'nowrap' }}>
                        {couponLoading ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : 'Pakai'}
                      </button>
                    </div>
                    {couponData && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-success)' }}>
                        <CheckCircle size={14} />
                        Kupon valid! Diskon {couponData.type === 'percentage' ? `${couponData.discount_value}%` : formatRupiah(couponData.discount_value)}
                      </div>
                    )}
                  </div>

                  {/* Metode terpilih */}
                  {selectedPaymentMethod && (
                    <div style={{ marginTop: 14, padding: '8px 12px', background: 'rgba(108,99,255,0.07)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <ChevronRight size={14} style={{ color: 'var(--color-primary)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>Bayar via <strong style={{ color: 'var(--text-primary)' }}>{selectedPaymentMethod.label}</strong></span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary btn-full btn-lg"
                    style={{ marginTop: 16 }}
                    disabled={loading || !selectedProduct}
                  >
                    {loading
                      ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Memproses...</>
                      : 'Buat Pesanan'
                    }
                  </button>

                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                    Upload bukti pembayaran di halaman Riwayat Pesanan setelah memesan.
                  </div>
                </div>
              </div>

            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
