import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401/403
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ---- AUTH ----
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (data) => api.put('/auth/change-password', data);

// ---- PRODUCTS ----
export const getProducts = () => api.get('/products');
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// ---- ORDERS ----
export const getOrders = () => api.get('/orders');
export const createOrder = (formData) => api.post('/orders', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateOrderStatus = (id, status_pesanan) => api.put(`/orders/${id}/status`, { status_pesanan });
export const updatePaymentStatus = (id, payment_status) => api.put(`/orders/${id}/payment-status`, { payment_status });
export const uploadPaymentProof = (id, formData) => api.post(`/orders/${id}/upload-payment`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getOrderHistory = (id) => api.get(`/orders/${id}/history`);

// ---- COUPONS ----
export const validateCoupon = (code) => api.get(`/coupons/validate?code=${code}`);
export const getCoupons = () => api.get('/coupons');
export const createCoupon = (data) => api.post('/coupons', data);
export const updateCoupon = (id, data) => api.put(`/coupons/${id}`, data);
export const deleteCoupon = (id) => api.delete(`/coupons/${id}`);

// ---- NOTIFICATIONS ----
export const getNotifications = () => api.get('/notifications');
export const markNotifRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotifRead = () => api.put('/notifications/read-all');

// ---- SUPPORT TICKETS ----
export const getTickets = () => api.get('/support/tickets');
export const createTicket = (data) => api.post('/support/tickets', data);
export const updateTicketStatus = (id, status) => api.put(`/support/tickets/${id}/status`, { status });

// ---- ADMIN STATS ----
export const getAdminStats = () => api.get('/admin/stats');
export const getCustomers = () => api.get('/admin/customers');

// ---- HELPERS ----
export const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const getStatusBadgeClass = (status) => {
  const map = {
    'Pending': 'badge-pending',
    'Diproses': 'badge-diproses',
    'Dicetak': 'badge-dicetak',
    'Dikirim': 'badge-dikirim',
    'Selesai': 'badge-selesai',
    'Dibatalkan': 'badge-dibatalkan',
    'Lunas': 'badge-lunas',
    'Belum Bayar': 'badge-belum-bayar',
    'Menunggu Konfirmasi': 'badge-menunggu',
    'Open': 'badge-open',
    'In Progress': 'badge-in-progress',
    'Resolved': 'badge-resolved',
    'Closed': 'badge-closed',
  };
  return map[status] || 'badge-pending';
};

export const getUploadUrl = (path) => {
  const baseUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
    : 'http://localhost:3001';
  return `${baseUrl}${path}`;
};
