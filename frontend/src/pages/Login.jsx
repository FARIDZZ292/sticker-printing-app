import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { login } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Email dan password wajib diisi.');
    setLoading(true);
    try {
      const res = await login(form);
      loginUser(res.data.token, res.data.user);
      toast.success(`Selamat datang, ${res.data.user.nama}! `);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/customer');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card animate-slide-up">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon"></div>
          <div>
            <div className="auth-logo-text">StickerPrint</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sistem Cetak Stiker Premium</div>
          </div>
        </div>

        <h2 className="auth-title">Selamat Datang </h2>
        <p className="auth-subtitle">Masuk ke akun Anda untuk melanjutkan</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={16} />
              <input
                className="form-input"
                type="email"
                placeholder="contoh@email.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <Lock className="input-icon" size={16} />
              <input
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ paddingLeft: 38, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Memproses...</> : 'Masuk'}
          </button>
        </form>

        <div className="auth-footer">
          Belum punya akun?{' '}
          <Link to="/register">Daftar sekarang</Link>
        </div>
      </div>
    </div>
  );
}
