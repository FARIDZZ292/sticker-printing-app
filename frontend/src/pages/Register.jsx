import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, MapPin, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { register } from '../api/api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nama: '', email: '', password: '', no_telepon: '', alamat: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama || !form.email || !form.password) return toast.error('Nama, email, dan password wajib diisi.');
    if (form.password.length < 6) return toast.error('Password minimal 6 karakter.');
    setLoading(true);
    try {
      await register(form);
      toast.success('Registrasi berhasil! Silakan login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registrasi gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card animate-slide-up" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon"></div>
          <div>
            <div className="auth-logo-text">StickerPrint</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sistem Cetak Stiker Premium</div>
          </div>
        </div>

        <h2 className="auth-title">Buat Akun Baru </h2>
        <p className="auth-subtitle">Daftar gratis dan mulai pesan stiker premium</p>

        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nama Lengkap</label>
              <div className="input-with-icon">
                <User className="input-icon" size={16} />
                <input className="form-input" placeholder="Nama Anda" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">No. Telepon</label>
              <div className="input-with-icon">
                <Phone className="input-icon" size={16} />
                <input className="form-input" placeholder="08xxxxxxxxxx" value={form.no_telepon} onChange={e => setForm({ ...form, no_telepon: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Email</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={16} />
              <input className="form-input" type="email" placeholder="email@contoh.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <Lock className="input-icon" size={16} />
              <input
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="Min. 6 karakter"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ paddingLeft: 38, paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Alamat (Opsional)</label>
            <div className="input-with-icon">
              <MapPin className="input-icon" size={16} style={{ top: 14, transform: 'none' }} />
              <textarea className="form-textarea" placeholder="Alamat lengkap..." value={form.alamat} onChange={e => setForm({ ...form, alamat: e.target.value })} style={{ paddingLeft: 38, minHeight: 70, resize: 'none' }} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Mendaftarkan...</> : 'Daftar Sekarang'}
          </button>
        </form>

        <div className="auth-footer">
          Sudah punya akun? <Link to="/login">Masuk sekarang</Link>
        </div>
      </div>
    </div>
  );
}
