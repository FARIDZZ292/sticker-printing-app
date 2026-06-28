import { useState, useEffect } from 'react';
import { ClipboardList, Upload, History, Search, Loader2, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import { getOrders, uploadPaymentProof, getOrderHistory, formatRupiah, formatDate, getUploadUrl } from '../../api/api';
import api from '../../api/api';

function getStatusBadge(s) {
  const map = { 'Pending': 'badge-pending', 'Diproses': 'badge-diproses', 'Dicetak': 'badge-dicetak', 'Dikirim': 'badge-dikirim', 'Selesai': 'badge-selesai', 'Dibatalkan': 'badge-dibatalkan' };
  return map[s] || 'badge-pending';
}

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [uploadModal, setUploadModal] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [historyModal, setHistoryModal] = useState(null);
  const [history, setHistory] = useState([]);
  const [detailModal, setDetailModal] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const res = await getOrders(); setOrders(res.data); setFiltered(res.data); } catch { toast.error('Gagal memuat pesanan.'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    let r = orders;
    if (search) r = r.filter(o => `#TR-${o.id_pesanan}`.includes(search) || o.nama_produk?.toLowerCase().includes(search.toLowerCase()));
    if (filterStatus) r = r.filter(o => o.status_pesanan === filterStatus);
    setFiltered(r);
  }, [search, filterStatus, orders]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return toast.error('Pilih file bukti pembayaran.');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('bukti_pembayaran', uploadFile);
      await uploadPaymentProof(uploadModal.id_pesanan, fd);
      toast.success('Bukti pembayaran berhasil diunggah!');
      setUploadModal(null);
      setUploadFile(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal mengunggah.'); }
    setUploading(false);
  };

  const openHistory = async (order) => {
    setHistoryModal(order);
    try { const res = await getOrderHistory(order.id_pesanan); setHistory(res.data); } catch {}
  };

  const cancelOrder = async (order) => {
    if (!window.confirm(`Yakin ingin membatalkan pesanan #TR-${order.id_pesanan}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await api.delete(`/orders/${order.id_pesanan}`);
      toast.success(`Pesanan #TR-${order.id_pesanan} berhasil dibatalkan.`);
      setDetailModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membatalkan pesanan.');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Riwayat Pesanan" />
        <div className="page-content animate-fade-in">
          <div className="page-header">
            <h1 className="page-header-title"><ClipboardList size={22} /> Riwayat Pesanan</h1>
            <p className="page-header-subtitle">{filtered.length} pesanan ditemukan</p>
          </div>

          <div className="search-filter-bar">
            <div className="search-input-wrap">
              <Search className="search-icon" size={16} />
              <input placeholder="Cari ID atau produk..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 170 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              {['Pending','Diproses','Dicetak','Dikirim','Selesai','Dibatalkan'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              <div className="loading-screen" style={{ height: 300 }}><div className="loading-spinner-lg" /></div>
            ) : filtered.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-icon"></div>
                  <div className="empty-title">Belum ada pesanan</div>
                  <div className="empty-desc">Buat pesanan pertama Anda sekarang!</div>
                </div>
              </div>
            ) : (
              filtered.map(o => (
                <div key={o.id_pesanan} className="card" style={{ padding: '18px 20px' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-primary-light)' }}>#TR-{o.id_pesanan}</span>
                        <span className={`badge ${getStatusBadge(o.status_pesanan)}`}>{o.status_pesanan}</span>
                        <span className={`badge ${o.payment_status === 'Lunas' ? 'badge-lunas' : o.payment_status === 'Menunggu Konfirmasi' ? 'badge-menunggu' : 'badge-belum-bayar'}`}>{o.payment_status}</span>
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{o.nama_produk}</div>
                      <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                        <span> {o.panjang} × {o.lebar} cm</span>
                        <span> {o.jumlah} pcs</span>
                        <span> {o.payment_method}</span>
                        {o.coupon_code && <span>️ {o.coupon_code}</span>}
                      </div>
                      {o.catatan && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}> {o.catatan}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-secondary)', marginBottom: 6 }}>{formatRupiah(o.total_harga)}</div>
                      {o.discount_amount > 0 && <div style={{ fontSize: 12, color: 'var(--color-success)', marginBottom: 4 }}>Hemat {formatRupiah(o.discount_amount)}</div>}
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(o.tanggal_pesanan)}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDetailModal(o)}> Detail</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openHistory(o)}><History size={13} /> Riwayat</button>
                    {o.payment_status === 'Belum Bayar' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => { setUploadModal(o); setUploadFile(null); }}>
                        <Upload size={13} /> Upload Bukti Bayar
                      </button>
                    )}
                    {o.payment_status === 'Menunggu Konfirmasi' && (
                      <span style={{ fontSize: 12, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 5 }}>
                         Menunggu konfirmasi admin
                      </span>
                    )}
                    {o.bukti_pembayaran && (
                      <a href={getUploadUrl(`/uploads/pembayaran/${o.bukti_pembayaran}`)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                         Lihat Bukti
                      </a>
                    )}
                    {o.status_pesanan === 'Pending' && (
                      <button
                        className="btn btn-sm"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', marginLeft: 'auto' }}
                        onClick={() => cancelOrder(o)}
                      >
                        <Trash2 size={13} /> Batalkan
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {uploadModal && (
        <Modal title={`Upload Bukti Bayar #TR-${uploadModal.id_pesanan}`} onClose={() => setUploadModal(null)}>
          <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(0,212,170,0.07)', borderRadius: 10, border: '1px solid rgba(0,212,170,0.2)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total yang harus dibayar:</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-secondary)' }}>{formatRupiah(uploadModal.total_harga)}</div>
          </div>
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label className="form-label">File Bukti Pembayaran</label>
              <div
                style={{ border: '2px dashed var(--border-color)', borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer', background: uploadFile ? 'rgba(16,185,129,0.05)' : 'transparent' }}
                onClick={() => document.getElementById('buktiInput').click()}
              >
                {uploadFile ? (
                  <>
                    <CheckCircle size={28} style={{ color: 'var(--color-success)', marginBottom: 6, display: 'block', margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 600 }}>{uploadFile.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{(uploadFile.size / 1024).toFixed(0)} KB</div>
                  </>
                ) : (
                  <>
                    <Upload size={28} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 8px' }} />
                    <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Klik untuk pilih file</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG, PDF • Max 5 MB</div>
                  </>
                )}
              </div>
              <input id="buktiInput" type="file" style={{ display: 'none' }} accept=".jpg,.jpeg,.png,.pdf" onChange={e => setUploadFile(e.target.files[0])} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setUploadModal(null)}>Batal</button>
              <button type="submit" className="btn btn-secondary" disabled={uploading || !uploadFile}>
                {uploading ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Mengupload...</> : <><Upload size={14} /> Upload</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {detailModal && (
        <Modal title={`Detail Pesanan #TR-${detailModal.id_pesanan}`} onClose={() => setDetailModal(null)} size="lg">
          <div className="detail-grid">
            {[
              ['Produk', detailModal.nama_produk],
              ['Ukuran', `${detailModal.panjang} × ${detailModal.lebar} cm`],
              ['Jumlah', `${detailModal.jumlah} pcs`],
              ['Metode Bayar', detailModal.payment_method],
              ['Kupon', detailModal.coupon_code || 'Tidak ada'],
              ['Diskon', formatRupiah(detailModal.discount_amount || 0)],
            ].map(([label, val]) => (
              <div key={label} style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: '14px', background: 'rgba(0,212,170,0.07)', borderRadius: 10, border: '1px solid rgba(0,212,170,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL BAYAR</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-secondary)' }}>{formatRupiah(detailModal.total_harga)}</span>
          </div>
          {detailModal.catatan && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Catatan</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{detailModal.catatan}</div>
            </div>
          )}
          {detailModal.status_pesanan === 'Pending' && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                onClick={() => cancelOrder(detailModal)}
              >
                <Trash2 size={15} /> Batalkan Pesanan
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* History Modal */}
      {historyModal && (
        <Modal title={`Riwayat Status #TR-${historyModal.id_pesanan}`} onClose={() => setHistoryModal(null)}>
          <div className="timeline">
            {history.length === 0 ? (
              <div className="empty-state"><p className="text-sm text-muted">Belum ada riwayat</p></div>
            ) : history.map((h, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-dot" style={{ background: i === history.length - 1 ? 'var(--color-secondary)' : 'var(--color-primary)' }} />
                <div className="timeline-content">
                  <div className="timeline-status">{h.status_pesanan}</div>
                  <div className="timeline-date">{formatDate(h.changed_at)}</div>
                  {h.catatan && <div className="timeline-note">{h.catatan}</div>}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
