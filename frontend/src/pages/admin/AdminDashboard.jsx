import { useState, useEffect } from 'react';
import { ShoppingBag, Users, DollarSign, Clock, TrendingUp, Package } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { getAdminStats, getOrders, formatRupiah } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const COLORS = ['#F59E0B','#6C63FF','#A78BFA','#00D4AA','#10B981','#EF4444'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 600 }}>
            {p.name === 'pendapatan' ? formatRupiah(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([getAdminStats(), getOrders()]);
        setStats(statsRes.data);
        setRecentOrders(ordersRes.data.slice(0, 5));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <div className="loading-screen"><div className="loading-spinner-lg" /></div>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Pesanan', value: stats?.total_pesanan || 0, icon: ShoppingBag, color: '#6C63FF', bg: 'rgba(108,99,255,0.15)' },
    { label: 'Total Pelanggan', value: stats?.total_pelanggan || 0, icon: Users, color: '#00D4AA', bg: 'rgba(0,212,170,0.15)' },
    { label: 'Total Pendapatan', value: formatRupiah(stats?.total_pendapatan || 0), icon: DollarSign, color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Pesanan Pending', value: stats?.pesanan_pending || 0, icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  ];

  const statusData = (stats?.statusChart || []).map(s => ({
    name: s.status_pesanan,
    value: parseInt(s.count),
  }));

  const revenueData = (stats?.revenueChart || []).map(r => ({
    name: r.bulan,
    pendapatan: parseFloat(r.pendapatan),
    pesanan: parseInt(r.jumlah_pesanan),
  }));

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Dasbor Admin" />
        <div className="page-content animate-fade-in">
          {/* Welcome */}
          <div className="page-header">
            <h1 className="page-header-title">
              <span></span> Selamat datang, {user?.nama_pelanggan || user?.nama}!
            </h1>
            <p className="page-header-subtitle">Berikut ringkasan performa bisnis Anda hari ini</p>
          </div>

          {/* Stat Cards */}
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

          {/* Charts */}
          <div className="grid-charts" style={{ marginBottom: 24 }}>
            {/* Revenue Chart */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title"><TrendingUp size={16} style={{ display: 'inline', marginRight: 8, color: 'var(--color-primary)' }} />Grafik Pendapatan</h3>
              </div>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="gradPendapatan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="pendapatan" name="pendapatan" stroke="#6C63FF" strokeWidth={2} fill="url(#gradPendapatan)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ height: 240 }}>
                  <TrendingUp size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
                  <p className="text-sm text-muted">Belum ada data pendapatan</p>
                </div>
              )}
            </div>

            {/* Status Pie Chart */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title"><Package size={16} style={{ display: 'inline', marginRight: 8, color: 'var(--color-secondary)' }} />Status Pesanan</h3>
              </div>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="45%" outerRadius={80} dataKey="value" strokeWidth={0}>
                      {statusData.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value + ' pesanan', name]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)', borderRadius: 10, fontSize: 12 }} />
                    <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ height: 240 }}>
                  <Package size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
                  <p className="text-sm text-muted">Belum ada pesanan</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Pesanan Terbaru</h3>
            </div>
            {recentOrders.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID Pesanan</th>
                      <th>Pelanggan</th>
                      <th>Produk</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Pembayaran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(o => (
                      <tr key={o.id_pesanan}>
                        <td style={{ color: 'var(--color-primary-light)', fontWeight: 700 }}>#TR-{o.id_pesanan}</td>
                        <td>{o.nama_pelanggan}</td>
                        <td style={{ maxWidth: 150 }} className="truncate">{o.nama_produk}</td>
                        <td style={{ color: 'var(--color-secondary)', fontWeight: 600 }}>{formatRupiah(o.total_harga)}</td>
                        <td><span className={`badge ${getStatusBadge(o.status_pesanan)}`}>{o.status_pesanan}</span></td>
                        <td><span className={`badge ${getPayBadge(o.payment_status)}`}>{o.payment_status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <ShoppingBag size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
                <p className="empty-title">Belum ada pesanan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusBadge(s) {
  const map = { 'Pending': 'badge-pending', 'Diproses': 'badge-diproses', 'Dicetak': 'badge-dicetak', 'Dikirim': 'badge-dikirim', 'Selesai': 'badge-selesai', 'Dibatalkan': 'badge-dibatalkan' };
  return map[s] || 'badge-pending';
}
function getPayBadge(s) {
  const map = { 'Lunas': 'badge-lunas', 'Belum Bayar': 'badge-belum-bayar', 'Menunggu Konfirmasi': 'badge-menunggu' };
  return map[s] || 'badge-belum-bayar';
}
