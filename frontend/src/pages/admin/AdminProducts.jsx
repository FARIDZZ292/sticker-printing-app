import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Package, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import { getProducts, createProduct, updateProduct, deleteProduct, formatRupiah } from '../../api/api';

const emptyForm = { nama_produk: '', deskripsi: '', harga_per_pcs: '', min_order: 5 };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getProducts();
      setProducts(res.data);
      setFiltered(res.data);
    } catch { toast.error('Gagal memuat produk.'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    setFiltered(products.filter(p => p.nama_produk.toLowerCase().includes(search.toLowerCase())));
  }, [search, products]);

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (p) => { setEditItem(p); setForm({ nama_produk: p.nama_produk, deskripsi: p.deskripsi || '', harga_per_pcs: p.harga_per_pcs, min_order: p.min_order }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nama_produk || !form.harga_per_pcs) return toast.error('Nama produk dan harga wajib diisi.');
    setSaving(true);
    try {
      if (editItem) {
        await updateProduct(editItem.id_produk, form);
        toast.success('Produk berhasil diperbarui.');
      } else {
        await createProduct(form);
        toast.success('Produk berhasil ditambahkan.');
      }
      setShowModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan.'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      toast.success('Produk berhasil dihapus.');
      setDeleteConfirm(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menghapus produk.'); }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Manajemen Produk" />
        <div className="page-content animate-fade-in">
          <div className="page-header page-header-flex">
            <div>
              <h1 className="page-header-title"> Kelola Produk</h1>
              <p className="page-header-subtitle">{filtered.length} produk tersedia</p>
            </div>
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={16} /> Tambah Produk
            </button>
          </div>

          <div className="search-filter-bar">
            <div className="search-input-wrap">
              <Search className="search-icon" size={16} />
              <input placeholder="Cari nama produk..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            {loading ? (
              <div className="loading-screen" style={{ height: 300 }}><div className="loading-spinner-lg" /></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <Package size={40} style={{ opacity: 0.2, marginBottom: 10 }} />
                <div className="empty-title">Tidak ada produk</div>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nama Produk</th>
                      <th>Deskripsi</th>
                      <th>Harga/pcs</th>
                      <th>Min Order</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <tr key={p.id_produk}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>️</div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.nama_produk}</span>
                          </div>
                        </td>
                        <td style={{ maxWidth: 250, color: 'var(--text-secondary)', fontSize: 13 }} className="truncate">{p.deskripsi || '-'}</td>
                        <td style={{ color: 'var(--color-secondary)', fontWeight: 700 }}>{formatRupiah(p.harga_per_pcs)}</td>
                        <td><span className="badge" style={{ background: 'rgba(108,99,255,0.1)', color: 'var(--color-primary-light)', border: '1px solid var(--border-accent)' }}>{p.min_order} pcs</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Pencil size={13} /> Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(p)}><Trash2 size={13} /></button>
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

      {/* Form Modal */}
      {showModal && (
        <Modal title={editItem ? '️ Edit Produk' : ' Tambah Produk Baru'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Nama Produk</label>
              <input className="form-input" placeholder="cth: Stiker Vinyl Glossy A3+" value={form.nama_produk} onChange={e => setForm({ ...form, nama_produk: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea className="form-textarea" placeholder="Deskripsi singkat produk..." value={form.deskripsi} onChange={e => setForm({ ...form, deskripsi: e.target.value })} />
            </div>
            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Harga / pcs (Rp)</label>
                <input className="form-input" type="number" min="0" placeholder="12000" value={form.harga_per_pcs} onChange={e => setForm({ ...form, harga_per_pcs: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Min. Order (pcs)</label>
                <input className="form-input" type="number" min="1" placeholder="5" value={form.min_order} onChange={e => setForm({ ...form, min_order: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Menyimpan...</> : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <Modal title="️ Konfirmasi Hapus" onClose={() => setDeleteConfirm(null)}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Yakin ingin menghapus produk <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm.nama_produk}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Batal</button>
            <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id_produk)}><Trash2 size={14} /> Ya, Hapus</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
