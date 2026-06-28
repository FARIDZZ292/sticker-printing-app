import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Tag, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon, formatDate, formatRupiah } from '../../api/api';

const emptyForm = { code: '', type: 'percentage', discount_value: '', min_order_amount: '', usage_limit: '', expires_at: '', active: true };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const res = await getCoupons(); setCoupons(res.data); } catch { toast.error('Gagal memuat kupon.'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (c) => {
    setEditItem(c);
    setForm({ code: c.code, type: c.type, discount_value: c.discount_value, min_order_amount: c.min_order_amount, usage_limit: c.usage_limit, expires_at: c.expires_at ? c.expires_at.split('T')[0] : '', active: !!c.active });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code || !form.discount_value) return toast.error('Kode dan nilai diskon wajib diisi.');
    setSaving(true);
    try {
      if (editItem) {
        await updateCoupon(editItem.id_coupon, form);
        toast.success('Kupon diperbarui.');
      } else {
        await createCoupon(form);
        toast.success('Kupon berhasil dibuat.');
      }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan.'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try { await deleteCoupon(id); toast.success('Kupon dihapus.'); setDeleteConfirm(null); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Gagal menghapus.'); }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Manajemen Kupon" />
        <div className="page-content animate-fade-in">
          <div className="page-header page-header-flex">
            <div>
              <h1 className="page-header-title"><Tag size={22} /> Kelola Kupon Diskon</h1>
              <p className="page-header-subtitle">{coupons.length} kupon tersedia</p>
            </div>
            <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Buat Kupon</button>
          </div>

          <div className="card" style={{ padding: 0 }}>
            {loading ? (
              <div className="loading-screen" style={{ height: 300 }}><div className="loading-spinner-lg" /></div>
            ) : coupons.length === 0 ? (
              <div className="empty-state">
                <Tag size={40} style={{ opacity: 0.2, marginBottom: 10 }} />
                <div className="empty-title">Belum ada kupon</div>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Tipe</th>
                      <th>Nilai Diskon</th>
                      <th>Min. Order</th>
                      <th>Penggunaan</th>
                      <th>Berlaku s/d</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map(c => (
                      <tr key={c.id_coupon}>
                        <td>
                          <span style={{ fontFamily: 'monospace', background: 'rgba(108,99,255,0.12)', color: 'var(--color-primary-light)', padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>{c.code}</span>
                        </td>
                        <td><span className={`badge ${c.type === 'percentage' ? 'badge-diproses' : 'badge-selesai'}`}>{c.type === 'percentage' ? 'Persentase' : 'Nominal'}</span></td>
                        <td style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                          {c.type === 'percentage' ? `${c.discount_value}%` : formatRupiah(c.discount_value)}
                        </td>
                        <td>{c.min_order_amount > 0 ? formatRupiah(c.min_order_amount) : '-'}</td>
                        <td>
                          <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{c.used_count}</span>
                          {c.usage_limit > 0 && <span style={{ color: 'var(--text-muted)' }}> / {c.usage_limit}</span>}
                          {c.usage_limit === 0 && <span style={{ color: 'var(--text-muted)' }}> / ∞</span>}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString('id-ID') : '∞'}</td>
                        <td>
                          <span className={`badge ${c.active ? 'badge-selesai' : 'badge-dibatalkan'}`}>
                            {c.active ? '✓ Aktif' : '✗ Nonaktif'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><Pencil size={13} /></button>
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(c)}><Trash2 size={13} /></button>
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

      {showModal && (
        <Modal title={editItem ? '️ Edit Kupon' : '️ Buat Kupon Baru'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Kode Kupon</label>
              <input className="form-input" placeholder="cth: DISKON20" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} style={{ fontFamily: 'monospace', letterSpacing: 2, fontWeight: 700 }} />
            </div>
            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tipe Diskon</label>
                <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="percentage">Persentase (%)</option>
                  <option value="fixed">Nominal (Rp)</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nilai Diskon</label>
                <input className="form-input" type="number" min="0" placeholder={form.type === 'percentage' ? '20' : '10000'} value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} />
              </div>
            </div>
            <div className="grid-2" style={{ marginTop: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Min. Order (Rp)</label>
                <input className="form-input" type="number" min="0" placeholder="0 = tidak ada" value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Batas Penggunaan</label>
                <input className="form-input" type="number" min="0" placeholder="0 = unlimited" value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: e.target.value })} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Berlaku Sampai</label>
              <input className="form-input" type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
            </div>
            {editItem && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className={`btn ${form.active ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setForm({ ...form, active: true })}>Aktif</button>
                  <button type="button" className={`btn ${!form.active ? 'btn-danger' : 'btn-ghost'}`} onClick={() => setForm({ ...form, active: false })}>Nonaktif</button>
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Menyimpan...</> : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="️ Hapus Kupon" onClose={() => setDeleteConfirm(null)}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Yakin hapus kupon <strong style={{ color: 'var(--color-primary-light)', fontFamily: 'monospace' }}>{deleteConfirm.code}</strong>?</p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Batal</button>
            <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id_coupon)}><Trash2 size={14} /> Hapus</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
