import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Lock, Save, Loader2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import { getMe, updateProfile, changePassword, createTicket, formatDate } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

export default function CustomerProfile() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({ nama_pelanggan: '', email: '', no_telepon: '', alamat: '' });
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [ticketModal, setTicketModal] = useState(false);
  const [ticket, setTicket] = useState({ subject: '', message: '', priority: 'Normal' });
  const [sendingTicket, setSendingTicket] = useState(false);

  useEffect(() => {
    getMe().then(res => {
      setProfile({
        nama_pelanggan: res.data.nama_pelanggan || '',
        email: res.data.email || '',
        no_telepon: res.data.no_telepon || '',
        alamat: res.data.alamat || '',
      });
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.nama_pelanggan) return toast.error('Nama tidak boleh kosong.');
    setSavingProfile(true);
    try {
      await updateProfile({ nama: profile.nama_pelanggan, no_telepon: profile.no_telepon, alamat: profile.alamat });
      toast.success('Profil berhasil diperbarui!');
      if (setUser) setUser(prev => ({ ...prev, nama_pelanggan: profile.nama_pelanggan }));
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan profil.'); }
    setSavingProfile(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwords.current_password || !passwords.new_password) return toast.error('Semua field wajib diisi.');
    if (passwords.new_password.length < 6) return toast.error('Password baru minimal 6 karakter.');
    if (passwords.new_password !== passwords.confirm) return toast.error('Konfirmasi password tidak cocok.');
    setSavingPass(true);
    try {
      await changePassword({ current_password: passwords.current_password, new_password: passwords.new_password });
      toast.success('Password berhasil diubah!');
      setPasswords({ current_password: '', new_password: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal mengubah password.'); }
    setSavingPass(false);
  };

  const handleSendTicket = async (e) => {
    e.preventDefault();
    if (!ticket.subject || !ticket.message) return toast.error('Subjek dan pesan wajib diisi.');
    setSendingTicket(true);
    try {
      await createTicket(ticket);
      toast.success('Tiket dukungan berhasil dikirim!');
      setTicketModal(false);
      setTicket({ subject: '', message: '', priority: 'Normal' });
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal mengirim tiket.'); }
    setSendingTicket(false);
  };

  const initial = (profile.nama_pelanggan || 'U').charAt(0).toUpperCase();

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title="Profil Saya" />
        <div className="page-content animate-fade-in">
          <div className="page-header">
            <h1 className="page-header-title"><User size={22} /> Profil Saya</h1>
          </div>

          {/* Profile Header Card */}
          <div style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(0,212,170,0.06) 100%)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-xl)', padding: '28px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 28, flexShrink: 0, boxShadow: 'var(--shadow-glow)' }}>
              {initial}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{profile.nama_pelanggan}</h2>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={13} />{profile.email}</span>
                {profile.no_telepon && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={13} />{profile.no_telepon}</span>}
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => setTicketModal(true)}>
              <MessageSquare size={15} /> Kirim Tiket Support
            </button>
          </div>

          <div className="grid-2">
            {/* Edit Profil */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 20 }}><User size={16} style={{ display: 'inline', marginRight: 8, color: 'var(--color-primary)' }} />Edit Profil</h3>
              <form onSubmit={handleSaveProfile}>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <div className="input-with-icon">
                    <User className="input-icon" size={15} />
                    <input className="form-input" placeholder="Nama lengkap" value={profile.nama_pelanggan} onChange={e => setProfile({ ...profile, nama_pelanggan: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <div className="input-with-icon">
                    <Mail className="input-icon" size={15} />
                    <input className="form-input" type="email" value={profile.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Email tidak dapat diubah</div>
                </div>
                <div className="form-group">
                  <label className="form-label">No. Telepon</label>
                  <div className="input-with-icon">
                    <Phone className="input-icon" size={15} />
                    <input className="form-input" placeholder="08xxxxxxxxxx" value={profile.no_telepon} onChange={e => setProfile({ ...profile, no_telepon: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Alamat</label>
                  <div className="input-with-icon">
                    <MapPin className="input-icon" size={15} style={{ top: 14, transform: 'none' }} />
                    <textarea className="form-textarea" placeholder="Alamat lengkap..." value={profile.alamat} onChange={e => setProfile({ ...profile, alamat: e.target.value })} style={{ paddingLeft: 38, minHeight: 80 }} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={savingProfile}>
                  {savingProfile ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Menyimpan...</> : <><Save size={14} /> Simpan Profil</>}
                </button>
              </form>
            </div>

            {/* Ganti Password */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 20 }}><Lock size={16} style={{ display: 'inline', marginRight: 8, color: 'var(--color-accent)' }} />Ganti Password</h3>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label className="form-label">Password Saat Ini</label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" size={15} />
                    <input className="form-input" type="password" placeholder="Password lama" value={passwords.current_password} onChange={e => setPasswords({ ...passwords, current_password: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Password Baru</label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" size={15} />
                    <input className="form-input" type="password" placeholder="Min. 6 karakter" value={passwords.new_password} onChange={e => setPasswords({ ...passwords, new_password: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Konfirmasi Password</label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" size={15} />
                    <input className="form-input" type="password" placeholder="Ulangi password baru" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} />
                  </div>
                  {passwords.confirm && passwords.new_password !== passwords.confirm && (
                    <div className="form-error">Password tidak cocok</div>
                  )}
                </div>

                <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.07)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)', marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                  ️ Pastikan password baru minimal 6 karakter dan mudah Anda ingat.
                </div>

                <button type="submit" className="btn btn-full" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.3)' }} disabled={savingPass}>
                  {savingPass ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Mengubah...</> : <><Lock size={14} /> Ubah Password</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Modal */}
      {ticketModal && (
        <Modal title=" Kirim Tiket Dukungan" onClose={() => setTicketModal(false)}>
          <form onSubmit={handleSendTicket}>
            <div className="form-group">
              <label className="form-label">Subjek</label>
              <input className="form-input" placeholder="Apa yang dapat kami bantu?" value={ticket.subject} onChange={e => setTicket({ ...ticket, subject: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Prioritas</label>
              <select className="form-select" value={ticket.priority} onChange={e => setTicket({ ...ticket, priority: e.target.value })}>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Pesan</label>
              <textarea className="form-textarea" rows={5} placeholder="Deskripsikan masalah atau pertanyaan Anda secara detail..." value={ticket.message} onChange={e => setTicket({ ...ticket, message: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setTicketModal(false)}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={sendingTicket}>
                {sendingTicket ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Mengirim...</> : ' Kirim Tiket'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
