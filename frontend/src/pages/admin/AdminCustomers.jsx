import { useState, useEffect } from 'react';
import { Search, Users, Mail, Phone, MapPin, ShoppingBag } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import { getCustomers, formatRupiah, formatDate } from '../../api/api';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getCustomers().then(res => {
      setCustomers(res.data);
      setFiltered(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    setFiltered(customers.filter(c =>
      c.nama_pelanggan.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    ));
  }, [search, customers]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Data Pelanggan" />
        <div className="page-content animate-fade-in">
          <div className="page-header">
            <h1 className="page-header-title"><Users size={22} /> Data Pelanggan</h1>
            <p className="page-header-subtitle">{filtered.length} pelanggan terdaftar</p>
          </div>

          <div className="search-filter-bar">
            <div className="search-input-wrap">
              <Search className="search-icon" size={16} />
              <input placeholder="Cari nama atau email..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            {loading ? (
              <div className="loading-screen" style={{ height: 300 }}><div className="loading-spinner-lg" /></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <Users size={40} style={{ opacity: 0.2, marginBottom: 10 }} />
                <div className="empty-title">Tidak ada pelanggan</div>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Pelanggan</th>
                      <th>No. Telepon</th>
                      <th>Total Pesanan</th>
                      <th>Total Belanja</th>
                      <th>Bergabung</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr key={c.id_pelanggan}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                              {c.nama_pelanggan.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.nama_pelanggan}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{c.no_telepon || '-'}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{c.total_pesanan}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> pesanan</span>
                        </td>
                        <td style={{ color: 'var(--color-secondary)', fontWeight: 700 }}>{formatRupiah(c.total_belanja)}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(c.created_at)}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(c)}>Detail</button>
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
      {selected && (
        <Modal title={`Detail Pelanggan`} onClose={() => setSelected(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px 16px', background: 'rgba(108,99,255,0.08)', borderRadius: 12, border: '1px solid var(--border-accent)' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22 }}>
              {selected.nama_pelanggan.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{selected.nama_pelanggan}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Bergabung {formatDate(selected.created_at)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              [Mail, 'Email', selected.email],
              [Phone, 'Telepon', selected.no_telepon || '-'],
              [MapPin, 'Alamat', selected.alamat || '-'],
              [ShoppingBag, 'Total Pesanan', `${selected.total_pesanan} pesanan`],
            ].map(([Icon, label, value]) => (
              <div key={label} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 10 }}>
                <Icon size={16} style={{ color: 'var(--color-primary-light)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
                </div>
              </div>
            ))}
            <div style={{ padding: '10px 14px', background: 'rgba(0,212,170,0.08)', borderRadius: 10, border: '1px solid rgba(0,212,170,0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Total Belanja</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-secondary)' }}>{formatRupiah(selected.total_belanja)}</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
