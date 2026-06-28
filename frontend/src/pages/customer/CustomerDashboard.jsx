import { useState, useEffect } from 'react';
import { ShoppingBag, ClipboardList, PlusCircle, User, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { getOrders, formatRupiah, formatDate } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

function getStatusBadge(s) {
  const map = { 'Pending': 'badge-pending', 'Diproses': 'badge-diproses', 'Dicetak': 'badge-dicetak', 'Dikirim': 'badge-dikirim', 'Selesai': 'badge-selesai', 'Dibatalkan': 'badge-dibatalkan' };
  return map[s] || 'badge-pending';
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders().then(res => { setOrders(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const totalBelanja = orders.filter(o => o.payment_status === 'Lunas').reduce((a, b) => a + parseFloat(b.total_harga || 0), 0);
  const pending = orders.filter(o => o.status_pesanan === 'Pending').length;
  const selesai = orders.filter(o => o.status_pesanan === 'Selesai').length;
  const recentOrders = orders.slice(0, 5);

  const statCards = [
    { label: 'Total Pesanan', value: orders.length, icon: ShoppingBag, color: '#6C63FF', bg: 'rgba(108,99,255,0.15)' },
    { label: 'Pesanan Selesai', value: selesai, icon: TrendingUp, color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Total Belanja', value: formatRupiah(totalBelanja), icon: TrendingUp, color: '#00D4AA', bg: 'rgba(0,212,170,0.15)' },
    { label: 'Pending', value: pending, icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  ];

  const quickActions = [
    { label: 'Buat Pesanan', desc: 'Pesan stiker custom sekarang', icon: '', color: 'var(--color-primary)', path: '/customer/new-order' },
    { label: 'Riwayat Pesanan', desc: 'Lihat semua pesanan Anda', icon: '', color: 'var(--color-secondary)', path: '/customer/orders' },
    { label: 'Edit Profil', desc: 'Perbarui data akun Anda', icon: '', color: 'var(--color-accent)', path: '/customer/profile' },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Dasbor Pelanggan" />
        <div className="page-content animate-fade-in">
          {/* Welcome */}
          <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(0,212,170,0.08) 100%)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-xl)', padding: '28px 32px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: 20, top: -20, fontSize: 80, opacity: 0.08 }}></div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
              Hai, {user?.nama_pelanggan || user?.nama}! 
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Selamat datang di StickerPrint. Yuk buat stiker impian Anda!</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/customer/new-order')}>
              <PlusCircle size={16} /> Buat Pesanan Baru
            </button>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            {statCards.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="stat-card" style={{ '--stat-color': s.color, '--stat-bg': s.bg }}>
                  <div className="stat-card-icon"><Icon size={20} /></div>
                  <div className="stat-card-value">{s.value}</div>
                  <div className="stat-card-label">{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-grid">
            {quickActions.map(a => (
              <button key={a.path} onClick={() => navigate(a.path)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)', display: 'flex', alignItems: 'center', gap: 14 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `rgba(${a.color === 'var(--color-primary)' ? '108,99,255' : a.color === 'var(--color-secondary)' ? '0,212,170' : '255,101,132'},0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {a.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>{a.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Recent Orders */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Pesanan Terbaru</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/customer/orders')}>Lihat Semua</button>
            </div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner-lg" /></div>
            ) : recentOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"></div>
                <div className="empty-title">Belum ada pesanan</div>
                <div className="empty-desc">Mulai pesan stiker pertama Anda!</div>
                <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => navigate('/customer/new-order')}>
                  <PlusCircle size={15} /> Buat Pesanan
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Produk</th>
                      <th>Qty</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Pembayaran</th>
                      <th>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(o => (
                      <tr key={o.id_pesanan}>
                        <td style={{ color: 'var(--color-primary-light)', fontWeight: 700 }}>#TR-{o.id_pesanan}</td>
                        <td>{o.nama_produk}</td>
                        <td>{o.jumlah} pcs</td>
                        <td style={{ color: 'var(--color-secondary)', fontWeight: 700 }}>{formatRupiah(o.total_harga)}</td>
                        <td><span className={`badge ${getStatusBadge(o.status_pesanan)}`}>{o.status_pesanan}</span></td>
                        <td>
                          <span className={`badge ${o.payment_status === 'Lunas' ? 'badge-lunas' : o.payment_status === 'Menunggu Konfirmasi' ? 'badge-menunggu' : 'badge-belum-bayar'}`}>
                            {o.payment_status}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(o.tanggal_pesanan)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
