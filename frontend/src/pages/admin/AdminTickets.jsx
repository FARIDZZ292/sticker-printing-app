import { useState, useEffect } from 'react';
import { Ticket, Search, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import { getTickets, updateTicketStatus, formatDate } from '../../api/api';

const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

function getTicketBadge(s) {
  const map = { 'Open': 'badge-open', 'In Progress': 'badge-in-progress', 'Resolved': 'badge-resolved', 'Closed': 'badge-closed' };
  return map[s] || 'badge-open';
}

function getPriorityBadge(p) {
  const map = { 'Normal': 'badge-diproses', 'High': 'badge-menunggu', 'Urgent': 'badge-dibatalkan' };
  return map[p] || 'badge-diproses';
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const res = await getTickets(); setTickets(res.data); setFiltered(res.data); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    let r = tickets;
    if (search) r = r.filter(t => t.subject.toLowerCase().includes(search.toLowerCase()) || t.nama_pelanggan?.toLowerCase().includes(search.toLowerCase()));
    if (filterStatus) r = r.filter(t => t.status === filterStatus);
    setFiltered(r);
  }, [search, filterStatus, tickets]);

  const handleStatusChange = async (id, status) => {
    try {
      await updateTicketStatus(id, status);
      toast.success(`Status tiket diubah ke ${status}`);
      load();
      if (selected?.id_ticket === id) setSelected(prev => ({ ...prev, status }));
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal update.'); }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Tiket Support" />
        <div className="page-content animate-fade-in">
          <div className="page-header">
            <h1 className="page-header-title"><Ticket size={22} /> Tiket Dukungan</h1>
            <p className="page-header-subtitle">{filtered.length} tiket</p>
          </div>

          <div className="search-filter-bar">
            <div className="search-input-wrap">
              <Search className="search-icon" size={16} />
              <input placeholder="Cari subjek atau nama pelanggan..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              {TICKET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="card" style={{ padding: 0 }}>
            {loading ? (
              <div className="loading-screen" style={{ height: 300 }}><div className="loading-spinner-lg" /></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <Ticket size={40} style={{ opacity: 0.2, marginBottom: 10 }} />
                <div className="empty-title">Tidak ada tiket</div>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Pelanggan</th>
                      <th>Subjek</th>
                      <th>Prioritas</th>
                      <th>Status</th>
                      <th>Terakhir Update</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t, i) => (
                      <tr key={t.id_ticket}>
                        <td style={{ color: 'var(--text-muted)' }}>#{t.id_ticket}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.nama_pelanggan}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.email}</div>
                        </td>
                        <td style={{ fontWeight: 500 }}>{t.subject}</td>
                        <td><span className={`badge ${getPriorityBadge(t.priority)}`}>{t.priority}</span></td>
                        <td>
                          <select className="form-select" style={{ padding: '5px 8px', fontSize: 12, width: 130 }} value={t.status} onChange={e => handleStatusChange(t.id_ticket, e.target.value)}>
                            {TICKET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(t.updated_at)}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(t)}>Baca</button>
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

      {selected && (
        <Modal title={`Tiket #${selected.id_ticket}`} onClose={() => setSelected(null)} size="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 14px', background: 'rgba(108,99,255,0.07)', borderRadius: 10, border: '1px solid var(--border-accent)' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
              {(selected.nama_pelanggan || 'U').charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{selected.nama_pelanggan}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.email} · {formatDate(selected.created_at)}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <span className={`badge ${getPriorityBadge(selected.priority)}`}>{selected.priority}</span>
              <span className={`badge ${getTicketBadge(selected.status)}`}>{selected.status}</span>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subjek</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.subject}</div>
          </div>
          <div style={{ padding: '14px', background: 'var(--bg-input)', borderRadius: 10, marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {selected.message}
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ubah Status</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TICKET_STATUSES.map(s => (
                <button key={s} className={`btn btn-sm ${selected.status === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleStatusChange(selected.id_ticket, s)}>{s}</button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
