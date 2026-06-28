import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from './Navbar';
import {
  LayoutDashboard, ShoppingBag, Package, Users, Tag, Ticket,
  LogOut, ShoppingCart, User, PlusCircle, ClipboardList
} from 'lucide-react';

const adminNav = [
  { label: 'MENU UTAMA', items: [
    { icon: LayoutDashboard, label: 'Dasbor', path: '/admin' },
    { icon: ShoppingBag, label: 'Pesanan', path: '/admin/orders' },
    { icon: Package, label: 'Produk', path: '/admin/products' },
  ]},
  { label: 'MANAJEMEN', items: [
    { icon: Users, label: 'Pelanggan', path: '/admin/customers' },
    { icon: Tag, label: 'Kupon Diskon', path: '/admin/coupons' },
    { icon: Ticket, label: 'Tiket Support', path: '/admin/tickets' },
  ]},
];

const customerNav = [
  { label: 'MENU', items: [
    { icon: LayoutDashboard, label: 'Beranda', path: '/customer' },
    { icon: PlusCircle, label: 'Buat Pesanan', path: '/customer/new-order' },
    { icon: ClipboardList, label: 'Riwayat Pesanan', path: '/customer/orders' },
    { icon: User, label: 'Profil Saya', path: '/customer/profile' },
  ]},
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logoutUser } = useAuth();
  const { sidebarOpen, closeSidebar } = useSidebar() || {};

  const isAdmin = user?.role === 'admin';
  const navSections = isAdmin ? adminNav : customerNav;

  const isActive = (path) => {
    if (path === '/admin' || path === '/customer') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path) => {
    navigate(path);
    closeSidebar?.(); // tutup sidebar saat navigasi di mobile
  };

  const initial = (user?.nama_pelanggan || user?.nama || 'U').charAt(0).toUpperCase();

  return (
    <>
      {/* Overlay gelap di belakang sidebar saat mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"></div>
          <div>
            <div className="sidebar-logo-text">StickerPrint</div>
            <div className="sidebar-logo-sub">Sistem Cetak Stiker</div>
          </div>
        </div>

        {/* User info */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initial}</div>
          <div style={{ overflow: 'hidden' }}>
            <div className="sidebar-user-name">{user?.nama_pelanggan || user?.nama}</div>
            <div className="sidebar-user-role">
              {isAdmin ? ' Administrator' : ' Pelanggan'}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navSections.map(section => (
            <div key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => handleNavigate(item.path)}
                  >
                    <Icon className="nav-icon" size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={logoutUser}>
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
