import { useState, useEffect } from 'react';
import { Search, RefreshCw, ChevronDown, Upload, History, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import { getOrders, updateOrderStatus, updatePaymentStatus, getOrderHistory, formatRupiah, formatDate, getStatusBadgeClass, getUploadUrl } from '../../api/api';

const ORDER_STATUSES = ['Pending', 'Diproses', 'Dicetak', 'Dikirim', 'Selesai', 'Dibatalkan'];
const PAYMENT_STATUSES = ['Belum Bayar', 'Menunggu Konfirmasi', 'Lunas'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [history, setHistory] = useState([]);
  const [detailModal, setDetailModal] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getOrders();
      setOrders(res.data);
      setFiltered(res.data);
    } catch { toast.error('Gagal memuat pesanan.'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let result = orders;
    if (search) result = result.filter(o =>
      o.nama_pelanggan?.toLowerCase().includes(search.toLowerCase()) ||
      o.nama_produk?.toLowerCase().includes(search.toLowerCase()) ||
      `#TR-${o.id_pesanan}`.includes(search)
    );
    if (filterStatus) result = result.filter(o => o.status_pesanan === filterStatus);
    setFiltered(result);
  }, [search, filterStatus, orders]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Status diubah ke ${newStatus}`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal update status.'); }
  };

  const handlePaymentStatusChange = async (orderId, newStatus) => {
    try {
      await updatePaymentStatus(orderId, newStatus);
      toast.success(`Status pembayaran diubah ke ${newStatus}`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal update pembayaran.'); }
  };

  const openHistory = async (order) => {
    setHistoryModal(order);
    try {
      const res = await getOrderHistory(order.id_pesanan);
      setHistory(res.data);
    } catch { toast.error('Gagal memuat riwayat.'); }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Manajemen Pesanan" />
        <div className="page-content animate-fade-in">
          <div className="page-header page-header-flex">
            <div>
              <h1 className="page-header-title"> Kelola Pesanan</h1>
              <p className="page-header-subtitle">{filtered.length} pesanan ditemukan</p>
            </div>
            <button className="btn btn-ghost" onClick={load}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>

          {/* Search & Filter */}
          <div className="search-filter-bar">
            <div className="search-input-wrap">
              <Search className="search-icon" size={16} />
              <input placeholder="Cari ID, pelanggan, produk..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 180 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0 }}>
            {loading ? (
              <div className="loading-screen" style={{ height: 300 }}><div className="loading-spinner-lg" /></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"></div>
                <div className="empty-title">Tidak ada pesanan</div>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Pelanggan</th>
                      <th>Produk</th>
                      <th>Ukuran</th>
                      <th>Qty</th>
                      <th>Total</th>
                      <th>Status Pesanan</th>
                      <th>Status Bayar</th>
                      <th>Bukti Bayar</th>
                      <th>Tanggal</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(o => (
                      <tr key={o.id_pesanan}>
                        <td style={{ color: 'var(--color-primary-light)', fontWeight: 700, whiteSpace: 'nowrap' }}>#TR-{o.id_pesanan}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.nama_pelanggan}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.email}</div>
                        </td>
                        <td style={{ maxWidth: 140 }} className="truncate">{o.nama_produk}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{o.panjang} × {o.lebar} cm</td>
                        <td>{o.jumlah} pcs</td>
                        <td style={{ color: 'var(--color-secondary)', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatRupiah(o.total_harga)}</td>
                        <td>
                          <select
                            className="form-select"
                            style={{ padding: '5px 8px', fontSize: 12, width: 130 }}
                            value={o.status_pesanan}
                            onChange={e => handleStatusChange(o.id_pesanan, e.target.value)}
                          >
                            {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-select"
                            style={{ padding: '5px 8px', fontSize: 12, width: 160 }}
                            value={o.payment_status}
                            onChange={e => handlePaymentStatusChange(o.id_pesanan, e.target.value)}
                          >
                            {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td>
                          {o.bukti_pembayaran ? (
                            <button
                              className="btn btn-sm"
                              style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--color-success)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 11 }}
                              onClick={() => setDetailModal(o)}
                            >
                               Ada
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '3px 8px', borderRadius: 6 }}> Belum</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(o.tanggal_pesanan)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setDetailModal(o)} title="Detail"></button>
                            <button className="btn btn-ghost btn-sm" onClick={() => openHistory(o)} title="Riwayat"><History size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <Modal title={`Detail Pesanan #TR-${detailModal.id_pesanan}`} onClose={() => setDetailModal(null)} size="lg">
          <div className="detail-grid">
            {[
              ['Pelanggan', detailModal.nama_pelanggan],
              ['Email', detailModal.email],
              ['No. Telepon', detailModal.no_telepon || '-'],
              ['Produk', detailModal.nama_produk],
              ['Ukuran', `${detailModal.panjang} × ${detailModal.lebar} cm`],
              ['Jumlah', `${detailModal.jumlah} pcs`],
              ['Metode Bayar', detailModal.payment_method],
              ['Kupon', detailModal.coupon_code || 'Tidak ada'],
              ['Diskon', formatRupiah(detailModal.discount_amount || 0)],
              ['Total', formatRupiah(detailModal.total_harga)],
            ].map(([label, val]) => (
              <div key={label} style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{val}</div>
              </div>
            ))}
          </div>
          {detailModal.catatan && (
            <div style={{ marginTop: 12, background: 'var(--bg-input)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Catatan</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{detailModal.catatan}</div>
            </div>
          )}
          {/* Payment Proof Section */}
          <div style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden', border: detailModal.bukti_pembayaran ? '1px solid rgba(16,185,129,0.4)' : '1px dashed var(--border-color)' }}>
            <div style={{ padding: '12px 16px', background: detailModal.bukti_pembayaran ? 'rgba(16,185,129,0.1)' : 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{detailModal.bukti_pembayaran ? '' : ''}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: detailModal.bukti_pembayaran ? 'var(--color-success)' : 'var(--text-muted)' }}>
                    {detailModal.bukti_pembayaran ? 'Bukti Pembayaran Sudah Dikirim' : 'Belum Ada Bukti Pembayaran'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>Metode: {detailModal.payment_method || '-'}</div>
                </div>
              </div>
              {detailModal.bukti_pembayaran && (
                <a
                  href={getUploadUrl(`/uploads/pembayaran/${detailModal.bukti_pembayaran}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                  style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--color-success)', border: '1px solid rgba(16,185,129,0.3)', textDecoration: 'none' }}
                >
                   Buka Full
                </a>
              )}
            </div>
            {detailModal.bukti_pembayaran ? (
              <a href={getUploadUrl(`/uploads/pembayaran/${detailModal.bukti_pembayaran}`)} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                <img
                  src={getUploadUrl(`/uploads/pembayaran/${detailModal.bukti_pembayaran}`)}
                  alt="Bukti Pembayaran"
                  style={{ width: '100%', maxHeight: 400, objectFit: 'contain', display: 'block', background: '#111', padding: 8 }}
                />
              </a>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Pelanggan belum mengupload bukti pembayaran.
                <div style={{ marginTop: 6, fontSize: 12 }}>Anda dapat mengubah status pembayaran secara manual jika sudah dikonfirmasi melalui WhatsApp.</div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* History Modal */}
      {historyModal && (
        <Modal title={`Riwayat #TR-${historyModal.id_pesanan}`} onClose={() => setHistoryModal(null)}>
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
