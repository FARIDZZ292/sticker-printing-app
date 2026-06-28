import { useState, useEffect, useRef, useContext, createContext } from 'react';
import { Bell, X, CheckCheck, Menu } from 'lucide-react';
import { getNotifications, markAllNotifRead, formatDate } from '../api/api';

// Context untuk mengontrol sidebar dari mana saja
export const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);
  return (
    <SidebarContext.Provider value={{ sidebarOpen, toggleSidebar, closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

export default function Navbar({ title }) {
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { toggleSidebar } = useSidebar() || {};

  const fetchNotifs = async () => {
    try {
      const res = await getNotifications();
      setNotifs(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifs.filter(n => !n.is_read).length;

  const handleMarkAll = async () => {
    try {
      await markAllNotifRead();
      setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {}
  };

  return (
    <header className="navbar">
      {/* Hamburger button — hanya tampil di mobile */}
      <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Toggle menu">
        <Menu size={20} />
      </button>

      <h1 className="navbar-title">{title}</h1>
      <div className="navbar-right">
        {/* Notification Bell */}
        <div style={{ position: 'relative' }} ref={ref}>
          <button className="navbar-notif-btn" onClick={() => setOpen(!open)}>
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {open && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span>Notifikasi {unreadCount > 0 && `(${unreadCount})`}</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAll}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-primary-light)', background: 'none', cursor: 'pointer' }}
                  >
                    <CheckCheck size={14} /> Baca Semua
                  </button>
                )}
              </div>
              <div className="notif-list">
                {notifs.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px 16px' }}>
                    <Bell size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p className="text-sm text-muted">Tidak ada notifikasi</p>
                  </div>
                ) : (
                  notifs.map(n => (
                    <div key={n.id_notification} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
                      {!n.is_read && <div className="notif-dot" />}
                      <div style={{ flex: 1, paddingLeft: n.is_read ? 18 : 0 }}>
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-time">{formatDate(n.created_at)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
