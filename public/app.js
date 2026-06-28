// CONFIGURATION
const API_URL = '/api';

// UTILITIES & HELPERS
function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Rupiah Formatter
function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(number);
}

// Date Formatter
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Show Alerts in UI
function showAlert(message, type = 'success') {
  const container = document.getElementById('alert-container');
  if (!container) return;

  const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
  const icon = type === 'success' ? '✅' : '❌';

  container.innerHTML = `
    <div class="alert ${alertClass}">
      <span>${icon} ${message}</span>
    </div>
  `;

  // Auto remove setelah 5 detik
  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}

// Logout Handler
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
  });
}

// ==========================================
// AUTHENTICATION CLIENT-SIDE LOGIC
// ==========================================

// 1. Handling Login Form
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        if (data.user.role === 'admin') {
          window.location.href = 'dashboard-admin.html';
        } else {
          window.location.href = 'dashboard-pelanggan.html';
        }
      } else {
        showAlert(data.message || 'Login gagal. Periksa kembali email dan password.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Gagal terhubung ke server.', 'error');
    }
  });
}

// 2. Handling Registration Form
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = document.getElementById('reg-nama').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const no_telepon = document.getElementById('reg-phone').value.trim();
    const alamat = document.getElementById('reg-alamat').value.trim();

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, email, password, no_telepon, alamat })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showAlert('Registrasi berhasil! Silakan masuk.', 'success');
        setTimeout(() => {
          document.getElementById('show-login').click();
        }, 1500);
      } else {
        showAlert(data.message || 'Registrasi gagal.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Gagal terhubung ke server.', 'error');
    }
  });
}


// ==========================================
// CUSTOMER PORTAL LOGIC (PELANGGAN)
// ==========================================

// Global variable temp untuk pemesanan
let selectedProduct = null;
let currentCoupon = null;
// Mapping gambar produk berdasarkan kata kunci nama produk
const PRODUCT_IMAGES = {
  'vinyl glossy': '/images/products/glossy.png',
  'vinyl matte': '/images/products/matte.png',
  'vinyl doff': '/images/products/matte.png',
  'chromo': '/images/products/glossy.png',
  'hvs': '/images/products/matte.png',
  'hologram': '/images/products/hypebeast.png',
  'kraft': '/images/products/matte.png',
  'transparan': '/images/products/glossy.png',
  'kustom': '/images/products/custom.png',
  'custom': '/images/products/custom.png',
  'hypebeast': '/images/products/hypebeast.png',
  'aesthetic': '/images/products/hypebeast.png',
};

function getProductImage(namaProduk) {
  const lower = namaProduk.toLowerCase();
  for (const [keyword, img] of Object.entries(PRODUCT_IMAGES)) {
    if (lower.includes(keyword)) return img;
  }
  return '/images/products/glossy.png';
}

function getProductCategory(namaProduk) {
  const lower = namaProduk.toLowerCase();
  if (lower.includes('kustom') || lower.includes('custom') || lower.includes('hypebeast') || lower.includes('aesthetic')) return 'custom';
  if (lower.includes('vinyl') || lower.includes('hologram') || lower.includes('transparan')) return 'vinyl';
  return 'kertas';
}

function getProductBadge(prod) {
  const lower = prod.nama_produk.toLowerCase();
  if (lower.includes('kustom') || lower.includes('custom')) return { label: '⭐ Kustom', cls: 'custom' };
  if (lower.includes('hologram')) return { label: '🔥 Hot', cls: 'hot' };
  if (lower.includes('vinyl')) return { label: 'Premium', cls: '' };
  return null;
}

// Semua produk tersimpan di sini untuk filtering
let allProducts = [];
let cachedCustomerOrders = [];
let currentProductCategory = 'semua';

// 1. Ambil & Render Produk untuk Pelanggan (Gaya Marketplace)
async function loadProducts() {
  const container = document.getElementById('product-list');
  if (!container) return;

  try {
    const response = await fetch(`${API_URL}/products`, { headers: getHeaders() });
    const products = await response.json();

    if (!response.ok) {
      container.innerHTML = `<div style="color: var(--danger); grid-column:1/-1; text-align:center; padding:40px;">❌ Gagal mengambil katalog produk.</div>`;
      return;
    }

    // Tambahkan produk stiker kustom (hardcoded special)
    const customProduct = {
      id_produk: 'custom',
      nama_produk: 'Stiker Kustom Desain Anda',
      deskripsi: 'Upload desain sendiri! Cocok untuk logo usaha, branding produk, stiker aesthetic, atau desain unik apa pun yang Anda inginkan.',
      harga_per_pcs: 0,
      min_order: 1,
      _is_custom: true
    };

    allProducts = [...products, customProduct];

    if (products.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); grid-column:1/-1; text-align:center; padding:40px;">Tidak ada produk stiker tersedia saat ini.</div>`;
      return;
    }

    renderProducts(allProducts);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div style="color: var(--danger); grid-column:1/-1; text-align:center; padding:40px;">❌ Gagal memuat katalog produk.</div>`;
  }
}

function renderProducts(products) {
  const container = document.getElementById('product-list');
  if (!container) return;

  // Rating palsu agar tampak seperti marketplace nyata
  const fakeRatings = ['4.9', '4.8', '4.7', '5.0', '4.6', '4.8', '4.9', '4.7'];
  const fakeSold = ['6rb+', '3.2rb+', '2rb+', '8rb+', '1.5rb+', '4rb+', '1rb+', '900+'];

  container.innerHTML = products.map((prod, i) => {
    const imgSrc = getProductImage(prod.nama_produk);
    const badge = getProductBadge(prod);
    const rating = fakeRatings[i % fakeRatings.length];
    const sold = fakeSold[i % fakeSold.length];
    const catLabel = getProductCategory(prod.nama_produk) === 'vinyl' ? 'Vinyl Premium'
                   : getProductCategory(prod.nama_produk) === 'custom' ? 'Stiker Kustom' : 'Kertas';

    if (prod._is_custom) {
      return `
        <div class="shop-card" data-category="custom" data-search="${(prod.nama_produk + ' ' + prod.deskripsi).toLowerCase()}" onclick="openCustomOrderInfo()">
          <div class="shop-card-img-wrap">
            <img class="shop-card-img" src="${imgSrc}" alt="Stiker Kustom" loading="lazy" onerror="this.style.background='hsl(252,50%,20%)'; this.style.display='flex'; this.style.alignItems='center'; this.style.justifyContent='center'; this.innerHTML='🎨';">
            <span class="shop-badge custom">🎨 Kustom</span>
          </div>
          <div class="shop-card-body">
            <div class="shop-card-cat">Stiker Kustom</div>
            <div class="shop-card-name">${prod.nama_produk}</div>
            <div class="shop-card-desc">${prod.deskripsi}</div>
            <div class="shop-card-stars">⭐⭐⭐⭐⭐ <span>5.0 • Desain Bebas</span></div>
          </div>
          <div class="shop-card-footer">
            <div class="shop-card-price-wrap">
              <div class="shop-card-price" style="font-size:0.85rem; color: #f59e0b;">Harga menyesuaikan ukuran</div>
              <div class="shop-card-min">Min. 1 pcs</div>
            </div>
            <button class="btn-pesan" onclick="event.stopPropagation(); openCustomOrderInfo()">📋 Pesan</button>
          </div>
        </div>`;
    }

    return `
      <div class="shop-card" data-category="${getProductCategory(prod.nama_produk)}" data-search="${(prod.nama_produk + ' ' + (prod.deskripsi || '')).toLowerCase()}">
        <div class="shop-card-img-wrap">
          <img class="shop-card-img" src="${imgSrc}" alt="${prod.nama_produk}" loading="lazy" onerror="this.style.display='none';">
          ${badge ? `<span class="shop-badge ${badge.cls}">${badge.label}</span>` : ''}
        </div>
        <div class="shop-card-body">
          <div class="shop-card-cat">${catLabel}</div>
          <div class="shop-card-name">${prod.nama_produk}</div>
          <div class="shop-card-desc">${prod.deskripsi || 'Stiker berkualitas tinggi untuk label kemasan dan produk Anda.'}</div>
          <div class="shop-card-stars">⭐ ${rating} <span>• ${sold} Terjual</span></div>
        </div>
        <div class="shop-card-footer">
          <div class="shop-card-price-wrap">
            <div class="shop-card-price">${formatRupiah(prod.harga_per_pcs)}<span style="font-size:0.7rem; font-weight:400; color:var(--text-muted);">/pcs</span></div>
            <div class="shop-card-min">Min. ${prod.min_order} pcs</div>
          </div>
          <button class="btn-pesan" onclick="openOrderModal(${prod.id_produk}, '${prod.nama_produk.replace(/'/g, "\\'")}', ${prod.harga_per_pcs}, ${prod.min_order})">🛒 Pesan</button>
        </div>
      </div>`;
  }).join('');
}

// Filter kategori stiker
function filterCategory(cat) {
  currentProductCategory = cat;
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.getElementById('cat-' + cat);
  if (activeTab) activeTab.classList.add('active');
  filterProducts();
}

function filterProducts() {
  const query = document.getElementById('product-search-input')?.value.toLowerCase().trim() || '';
  const cards = document.querySelectorAll('#product-list .shop-card');

  cards.forEach(card => {
    const matchesCategory = currentProductCategory === 'semua' || card.dataset.category === currentProductCategory;
    const matchesSearch = !query || card.dataset.search?.includes(query);
    card.style.display = matchesCategory && matchesSearch ? '' : 'none';
  });
}

// Informasi Stiker Kustom
function openCustomOrderInfo() {
  // Cari produk dengan harga paling murah sebagai referensi base
  const refProd = allProducts.find(p => !p._is_custom);
  if (refProd) {
    openOrderModal(refProd.id_produk, '⭐ Stiker Kustom - ' + refProd.nama_produk, refProd.harga_per_pcs, refProd.min_order);
    // Set judul lebih jelas
    const title = document.getElementById('order-product-name');
    if (title) title.placeholder = 'Masukkan detail desain di catatan';
  }
}

// 2. Buka Modal Order
function openOrderModal(id, name, price, minOrder) {
  selectedProduct = { id, name, price, minOrder };
  
  document.getElementById('order-product-id').value = id;
  document.getElementById('order-product-name').value = name;
  
  const qtyInput = document.getElementById('order-qty');
  qtyInput.value = minOrder;
  qtyInput.min = minOrder;
  
  document.getElementById('order-panjang').value = 5.0;
  document.getElementById('order-lebar').value = 5.0;
  document.getElementById('order-file').value = '';
  
  document.getElementById('label-min-order').textContent = `Jumlah Pesanan (Min: ${minOrder} Pcs)`;
  document.getElementById('order-notes').value = '';

  calculateTotalOrder();
  
  document.getElementById('order-modal').classList.add('active');
}

// 3. Tutup Modal Order
function closeOrderModal() {
  document.getElementById('order-modal').classList.remove('active');
  selectedProduct = null;
}

// 4. Hitung Total Pesanan Real-time di Modal (Dengan Kalkulator Luas Kustom)
function calculateTotalOrder() {
  if (!selectedProduct) return;
  const qty = parseInt(document.getElementById('order-qty').value) || 0;
  const panjang = parseFloat(document.getElementById('order-panjang').value) || 5.0;
  const lebar = parseFloat(document.getElementById('order-lebar').value) || 5.0;

  // Rasio Luas Stiker terhadap standar 5x5 cm (25 cm2)
  const multiplier = (panjang * lebar) / 25.0;
  const hargaKustom = selectedProduct.price * multiplier;
  const baseTotal = Math.round(hargaKustom * qty);
  let discount = 0;

  if (currentCoupon) {
    if (currentCoupon.type === 'percentage') {
      discount = Math.round((baseTotal * currentCoupon.discount_value) / 100);
    } else {
      discount = parseInt(currentCoupon.discount_value || 0, 10);
    }
    if (discount > baseTotal) {
      discount = baseTotal;
    }
  }

  const finalTotal = Math.max(0, baseTotal - discount);

  document.getElementById('summary-price-pcs').textContent = formatRupiah(Math.round(hargaKustom));
  document.getElementById('summary-qty').textContent = `${qty} pcs (${panjang}x${lebar} cm)`;
  document.getElementById('summary-discount').textContent = discount > 0 ? `- ${formatRupiah(discount)}` : '-';
  document.getElementById('summary-total').textContent = formatRupiah(finalTotal);
}

// 5. Submit Pemesanan (Menggunakan FormData untuk Mendukung Upload File)
const orderForm = document.getElementById('order-form');
if (orderForm) {
  orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id_produk = parseInt(document.getElementById('order-product-id').value);
    const jumlah = parseInt(document.getElementById('order-qty').value);
    const panjang = parseFloat(document.getElementById('order-panjang').value);
    const lebar = parseFloat(document.getElementById('order-lebar').value);
    const catatan = document.getElementById('order-notes').value.trim();
    const fileInput = document.getElementById('order-file');

    if (selectedProduct && jumlah < selectedProduct.minOrder) {
      alert(`Minimal pesanan untuk produk ini adalah ${selectedProduct.minOrder} pcs.`);
      return;
    }

    if (fileInput.files.length === 0) {
      alert('Harap unggah file desain stiker Anda.');
      return;
    }

    const formData = new FormData();
    formData.append('id_produk', id_produk);
    formData.append('jumlah', jumlah);
    formData.append('panjang', panjang);
    formData.append('lebar', lebar);
    formData.append('catatan', catatan);
    formData.append('coupon_code', document.getElementById('order-coupon-code').value.trim());
    formData.append('payment_method', document.getElementById('order-payment-method').value);
    formData.append('file_desain', fileInput.files[0]);

    // Token
    const headers = {};
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        closeOrderModal();
        alert('Pesanan stiker berhasil dibuat! Menuju riwayat pesanan Anda.');
        switchTab('riwayat');
      } else {
        alert(data.message || 'Gagal membuat pesanan.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim pesanan ke server.');
    }
  });
}

// 6. Ambil & Render Riwayat Pesanan Pelanggan (Dengan kolom tambahan)
async function loadCustomerOrders() {
  const container = document.getElementById('orders-list');
  if (!container) return;

  try {
    const response = await fetch(`${API_URL}/orders`, { headers: getHeaders() });
    const orders = await response.json();

    if (!response.ok) {
      container.innerHTML = `<tr><td colspan="14" style="text-align: center; color: var(--danger);">Gagal mengambil riwayat.</td></tr>`;
      cachedCustomerOrders = [];
      return;
    }

    if (!Array.isArray(orders) || orders.length === 0) {
      container.innerHTML = `<tr><td colspan="14" style="text-align: center; color: var(--text-muted);">Anda belum pernah melakukan pemesanan stiker.</td></tr>`;
      cachedCustomerOrders = [];
      return;
    }

    cachedCustomerOrders = orders;
    renderCustomerOrders(orders);
  } catch (err) {
    console.error(err);
    cachedCustomerOrders = [];
    container.innerHTML = `<tr><td colspan="14" style="text-align: center; color: var(--danger);">Gagal memuat data.</td></tr>`;
  }
}

function renderCustomerOrders(orders) {
  const container = document.getElementById('orders-list');
  if (!container) return;

  container.innerHTML = orders.map(ord => {
    let statusBadge = '';
    if (ord.status_pesanan === 'Pending') {
      statusBadge = '<span class="badge badge-pending">Pending</span>';
    } else if (ord.status_pesanan === 'Diproses') {
      statusBadge = '<span class="badge badge-proses">Diproses</span>';
    } else if (ord.status_pesanan === 'Selesai') {
      statusBadge = '<span class="badge badge-selesai">Selesai</span>';
    } else if (ord.status_pesanan === 'Dibatalkan') {
      statusBadge = '<span class="badge badge-batal">Dibatalkan</span>';
    }

    const linkDesain = ord.file_desain 
      ? `<a href="/uploads/desain/${ord.file_desain}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size:0.75rem;">🎨 Lihat</a>`
      : '-';

    let btnBukti = '-';
    if (ord.bukti_pembayaran) {
      btnBukti = `<a href="/uploads/pembayaran/${ord.bukti_pembayaran}" target="_blank" class="btn btn-success btn-sm" style="padding: 4px 8px; font-size:0.75rem;">📄 Lihat</a>`;
    } else if (ord.status_pesanan === 'Pending') {
      btnBukti = `<button class="btn btn-primary btn-sm" style="padding: 4px 8px; font-size:0.75rem;" onclick="openBuktiModal(${ord.id_pesanan})">💳 Upload</button>`;
    }

    return `
      <tr>
        <td><strong>#TR-${ord.id_pesanan}</strong></td>
        <td style="font-size:0.85rem;">${formatDate(ord.tanggal_pesanan)}</td>
        <td>${ord.nama_produk}</td>
        <td style="font-size:0.85rem;">${ord.panjang}x${ord.lebar} cm</td>
        <td>${ord.jumlah} pcs</td>
        <td>${formatRupiah(ord.harga_per_pcs)}</td>
        <td style="font-weight: 700; color: var(--primary);">${formatRupiah(ord.total_harga)}</td>
        <td style="font-size: 0.85rem; color: var(--text-muted); max-width: 150px; overflow-wrap: break-word;">${ord.catatan || '-'}</td>
        <td>${linkDesain}</td>
        <td>${btnBukti}</td>
        <td>${statusBadge}</td>
        <td>${ord.payment_method || '-'}</td>
        <td>${ord.payment_status || '-'}</td>
        <td style="text-align:center;"><button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size:0.75rem;" onclick="openOrderHistoryModal(${ord.id_pesanan})">🕒 Riwayat</button></td>
      </tr>`;
  }).join('');
}

function applyOrderHistoryFilter() {
  const query = document.getElementById('order-search-input')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('order-status-filter')?.value || 'semua';

  const filtered = cachedCustomerOrders.filter(ord => {
    const searchText = `${ord.id_pesanan} ${ord.nama_produk} ${ord.status_pesanan} ${ord.payment_method} ${ord.payment_status}`.toLowerCase();
    const searchMatch = !query || searchText.includes(query);
    const statusMatch = statusFilter === 'semua' || ord.status_pesanan === statusFilter;
    return searchMatch && statusMatch;
  });

  renderCustomerOrders(filtered);
}

// 6a. Validasi Kupon Diskon
async function applyCouponCode() {
  const codeInput = document.getElementById('order-coupon-code');
  const feedback = document.getElementById('coupon-feedback');
  if (!codeInput || !feedback) return;

  const code = codeInput.value.trim();
  if (!code) {
    feedback.textContent = 'Masukkan kode kupon terlebih dahulu.';
    currentCoupon = null;
    calculateTotalOrder();
    return;
  }

  try {
    const response = await fetch(`${API_URL}/coupons/validate?code=${encodeURIComponent(code)}`, {
      headers: getHeaders()
    });
    const data = await response.json();

    if (!response.ok) {
      currentCoupon = null;
      feedback.textContent = data.message || 'Kupon tidak valid atau telah kedaluwarsa.';
      calculateTotalOrder();
      return;
    }

    currentCoupon = data.coupon;
    feedback.textContent = `Kupon ${currentCoupon.code} berhasil diterapkan, diskon ${currentCoupon.type === 'percentage' ? currentCoupon.discount_value + '%' : formatRupiah(currentCoupon.discount_value)}.`;
    calculateTotalOrder();
  } catch (err) {
    console.error(err);
    currentCoupon = null;
    feedback.textContent = 'Gagal memvalidasi kupon, coba lagi.';
    calculateTotalOrder();
  }
}

// 6b. Load Notifikasi Pelanggan
async function loadNotifications() {
  const container = document.getElementById('notification-list');
  const badge = document.getElementById('notif-badge');
  if (!container) return;

  try {
    const response = await fetch(`${API_URL}/notifications`, { headers: getHeaders() });
    const notifications = await response.json();

    if (!response.ok) {
      container.innerHTML = `<p style="color: var(--danger);">Gagal memuat notifikasi.</p>`;
      return;
    }

    if (!Array.isArray(notifications) || notifications.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted);">Belum ada notifikasi terbaru.</p>`;
      if (badge) badge.style.display = 'none';
      return;
    }

    const unreadCount = notifications.filter(item => item.is_read === 0).length;
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    }

    container.innerHTML = notifications.map(item => {
      const readClass = item.is_read ? 'notification-read' : 'notification-unread';
      return `
        <div class="notification-card ${readClass}">
          <div class="notification-body">
            <strong>${item.title}</strong>
            <p>${item.message}</p>
            <small>${new Date(item.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="markNotificationRead(${item.id_notification})">Tandai Dibaca</button>
        </div>`;
    }).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="color: var(--danger);">Terjadi kesalahan saat memuat notifikasi.</p>`;
  }
}

async function markNotificationRead(id) {
  try {
    const response = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders()
    });
    if (response.ok) {
      loadNotifications();
    }
  } catch (err) {
    console.error(err);
  }
}

// 6c. Support Tickets Pelanggan
async function loadSupportTickets() {
  const container = document.getElementById('customer-tickets-list');
  if (!container) return;

  try {
    const response = await fetch(`${API_URL}/support/tickets`, { headers: getHeaders() });
    const tickets = await response.json();

    if (!response.ok) {
      container.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--danger);">Gagal memuat tiket dukungan.</td></tr>`;
      return;
    }

    if (!tickets || tickets.length === 0) {
      container.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">Belum ada tiket dukungan.</td></tr>`;
      return;
    }

    container.innerHTML = tickets.map(ticket => {
      const statusClass = ticket.status === 'Open' ? 'badge badge-pending' : ticket.status === 'In Progress' ? 'badge badge-proses' : ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'badge badge-selesai' : 'badge';
      return `
        <tr>
          <td><strong>#TK-${ticket.id_ticket}</strong></td>
          <td style="font-size:0.95rem;">${ticket.subject}</td>
          <td>${ticket.priority || 'Normal'}</td>
          <td>${ticket.status}</td>
          <td style="font-size:0.85rem; color: var(--text-muted);">${new Date(ticket.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
        </tr>`;
    }).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--danger);">Terjadi kesalahan saat memuat tiket.</td></tr>`;
  }
}

const supportTicketForm = document.getElementById('support-ticket-form');
if (supportTicketForm) {
  supportTicketForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subject = document.getElementById('support-subject').value.trim();
    const priority = document.getElementById('support-priority').value;
    const message = document.getElementById('support-message').value.trim();
    const feedback = document.getElementById('support-feedback');

    if (!subject || !message) {
      if (feedback) feedback.textContent = 'Subjek dan pesan tiket wajib diisi.';
      return;
    }

    try {
      const response = await fetch(`${API_URL}/support/tickets`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, priority, message })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        if (feedback) feedback.textContent = 'Tiket dukungan berhasil dikirim.';
        supportTicketForm.reset();
        loadSupportTickets();
      } else {
        if (feedback) feedback.textContent = data.message || 'Gagal mengirim tiket dukungan.';
      }
    } catch (err) {
      console.error(err);
      if (feedback) feedback.textContent = 'Gagal menghubungi server.';
    }
  });
}

// 6d. Riwayat Status Pesanan
async function openOrderHistoryModal(orderId) {
  const container = document.getElementById('status-history-content');
  if (!container) return;
  container.innerHTML = '<p style="color: var(--text-muted);">Memuat riwayat status...</p>';
  document.getElementById('status-history-modal').classList.add('active');

  try {
    const response = await fetch(`${API_URL}/orders/${orderId}/history`, { headers: getHeaders() });
    const history = await response.json();

    if (!response.ok) {
      container.innerHTML = `<p style="color: var(--danger);">Gagal memuat riwayat status.</p>`;
      return;
    }

    if (!Array.isArray(history) || history.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted);">Tidak ada riwayat status untuk pesanan ini.</p>`;
      return;
    }

    container.innerHTML = history.map(entry => `
      <div class="ticket-history-item">
        <strong>${entry.status_pesanan}</strong>
        <p style="margin: 8px 0 0; color: var(--text-muted);">${entry.catatan || 'Tidak ada catatan tambahan.'}</p>
        <small>${new Date(entry.changed_at).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="color: var(--danger);">Terjadi kesalahan saat memuat riwayat status.</p>`;
  }
}

function closeOrderHistoryModal() {
  document.getElementById('status-history-modal').classList.remove('active');
}

// 7. Submit Bukti Pembayaran
const buktiForm = document.getElementById('bukti-form');
if (buktiForm) {
  buktiForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('bukti-order-id').value;
    const fileInput = document.getElementById('bukti-file');

    if (fileInput.files.length === 0) {
      alert('Harap pilih file bukti transfer Anda.');
      return;
    }

    const formData = new FormData();
    formData.append('bukti_pembayaran', fileInput.files[0]);

    // Token
    const headers = {};
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}/orders/${id}/bukti-pembayaran`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        closeBuktiModal();
        alert('Bukti transfer pembayaran berhasil diunggah! Menunggu verifikasi admin.');
        loadCustomerOrders();
      } else {
        alert(data.message || 'Gagal mengunggah bukti.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghubungi server.');
    }
  });
}

// ==========================================
// CUSTOMER CHAT LOGIC

let customerChatInterval = null;
let customerLastMessages = [];

function renderCustomerChatMessages(messages) {
  const container = document.getElementById('customer-chat-messages');
  if (!container) return;

  if (!messages || messages.length === 0) {
    container.innerHTML = '<div class="chat-empty">Belum ada pesan. Silakan kirim pertanyaan Anda kepada admin.</div>';
    return;
  }

  container.innerHTML = messages.map(msg => {
    const isCustomer = msg.pengirim_role === 'pelanggan';
    const timeText = new Date(msg.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="chat-message ${isCustomer ? 'customer' : 'admin'}">
        ${msg.pesan}
        <small>${isCustomer ? 'Anda' : 'Admin'} • ${timeText}</small>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

async function loadCustomerChat() {
  const statusText = document.getElementById('chat-status-text');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.id_pelanggan) return;

  try {
    const response = await fetch(`${API_URL}/chat/messages/${user.id_pelanggan}`, { headers: getHeaders() });
    const messages = await response.json();

    if (!response.ok) {
      if (statusText) statusText.textContent = 'Gagal memuat percakapan.';
      return;
    }

    renderCustomerChatMessages(messages);
    if (statusText) statusText.textContent = `Terhubung dengan admin • ${messages.length} pesan`;
  } catch (err) {
    console.error(err);
    if (statusText) statusText.textContent = 'Gagal memuat percakapan.';
  }
}

async function loadCustomerChatUnread() {
  const badge = document.getElementById('chat-notice');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.id_pelanggan || !badge) return;

  try {
    const response = await fetch(`${API_URL}/chat/unread`, { headers: getHeaders() });
    const data = await response.json();
    if (!response.ok) return;

    if (data.unread > 0) {
      badge.style.display = 'inline-flex';
      badge.textContent = data.unread;
    } else {
      badge.style.display = 'none';
    }
  } catch (err) {
    console.error(err);
  }
}

const customerChatForm = document.getElementById('customer-chat-form');
if (customerChatForm) {
  customerChatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = document.getElementById('customer-chat-input').value.trim();
    if (!text) return;

    try {
      const response = await fetch(`${API_URL}/chat/messages`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        document.getElementById('customer-chat-input').value = '';
        loadCustomerChat();
        loadCustomerChatUnread();
      } else {
        alert(data.message || 'Gagal mengirim pesan chat.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim pesan. Periksa koneksi Anda.');
    }
  });
}

// Start polling unread chat count and messages
window.addEventListener('DOMContentLoaded', () => {
  loadCustomerChatUnread();
  if (!customerChatInterval) {
    customerChatInterval = setInterval(() => {
      loadCustomerChatUnread();
      const activeSection = document.getElementById('section-chat');
      if (activeSection && activeSection.style.display === 'block') {
        loadCustomerChat();
      }
    }, 3000);
  }
});

// ==========================================
// ADMIN CHAT LOGIC

let adminChatPoll = null;
let currentAdminChatId = null;

function renderAdminChatMessages(messages) {
  const container = document.getElementById('admin-chat-messages');
  if (!container) return;

  if (!messages || messages.length === 0) {
    container.innerHTML = '<div class="chat-empty">Belum ada pesan di percakapan ini.</div>';
    return;
  }

  container.innerHTML = messages.map(msg => {
    const isCustomer = msg.pengirim_role === 'pelanggan';
    const timeText = new Date(msg.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="chat-message ${isCustomer ? 'customer' : 'admin'}">
        ${msg.pesan}
        <small>${isCustomer ? msg.dari.split(':')[1] : 'Admin'} • ${timeText}</small>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

async function loadAdminChatConversations() {
  const listContainer = document.getElementById('admin-chat-list-items');
  const badge = document.getElementById('admin-chat-count');
  if (!listContainer) return;

  try {
    const response = await fetch(`${API_URL}/chat/conversations`, { headers: getHeaders() });
    const conversations = await response.json();
    if (!response.ok) {
      listContainer.innerHTML = '<div class="chat-empty">Gagal memuat percakapan.</div>';
      return;
    }

    if (conversations.length === 0) {
      listContainer.innerHTML = '<div class="chat-empty">Belum ada percakapan pelanggan.</div>';
      if (badge) badge.style.display = 'none';
      return;
    }

    const totalUnread = conversations.reduce((sum, item) => sum + (item.unread_count || 0), 0);
    if (badge) {
      if (totalUnread > 0) {
        badge.style.display = 'inline-flex';
        badge.textContent = totalUnread;
      } else {
        badge.style.display = 'none';
      }
    }

    listContainer.innerHTML = conversations.map(conv => {
      const activeClass = currentAdminChatId === conv.id_pelanggan ? 'active' : '';
      return `
        <div class="chat-item ${activeClass}" onclick="openAdminChatConversation(${conv.id_pelanggan}, '${conv.nama_pelanggan.replace(/'/g, "\\'")}')">
          <div>
            <strong>${conv.nama_pelanggan}</strong>
            <small>${conv.email}</small>
          </div>
          ${conv.unread_count > 0 ? `<span class="chat-badge">${conv.unread_count}</span>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}

async function loadAdminChatMessages(customerId, scroll = true) {
  const title = document.getElementById('admin-chat-title');
  const status = document.getElementById('admin-chat-status');
  const form = document.getElementById('admin-chat-form');

  try {
    const response = await fetch(`${API_URL}/chat/messages/${customerId}`, { headers: getHeaders() });
    const messages = await response.json();
    if (!response.ok) {
      if (status) status.textContent = 'Gagal memuat pesan.';
      return;
    }

    if (title) title.textContent = `Chat: ${customerId}`;
    if (status) status.textContent = `${messages.length} pesan`;
    if (form) form.style.display = 'grid';
    renderAdminChatMessages(messages);
  } catch (err) {
    console.error(err);
    if (status) status.textContent = 'Gagal memuat pesan.';
  }
}

window.openAdminChatConversation = async function(customerId, customerName) {
  currentAdminChatId = customerId;
  const title = document.getElementById('admin-chat-title');
  const status = document.getElementById('admin-chat-status');

  document.querySelectorAll('#admin-chat-list-items .chat-item').forEach(item => item.classList.remove('active'));

  const targetItem = Array.from(document.querySelectorAll('#admin-chat-list-items .chat-item')).find(item => item.textContent.includes(customerName));
  if (targetItem) targetItem.classList.add('active');

  if (title) title.textContent = `Chat: ${customerName}`;
  if (status) status.textContent = 'Muat pesan...';
  await loadAdminChatMessages(customerId);
};

const adminChatForm = document.getElementById('admin-chat-form');
if (adminChatForm) {
  adminChatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentAdminChatId) return;
    const text = document.getElementById('admin-chat-input').value.trim();
    if (!text) return;

    try {
      const response = await fetch(`${API_URL}/chat/messages`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, customerId: currentAdminChatId })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        document.getElementById('admin-chat-input').value = '';
        loadAdminChatMessages(currentAdminChatId);
        loadAdminChatConversations();
      } else {
        alert(data.message || 'Gagal mengirim pesan admin.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim pesan. Periksa koneksi Anda.');
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  if (!adminChatPoll) {
    adminChatPoll = setInterval(() => {
      if (document.getElementById('section-chat')?.style.display === 'block') {
        loadAdminChatConversations();
        if (currentAdminChatId) {
          loadAdminChatMessages(currentAdminChatId, false);
        }
      }
    }, 3000);
  }
});

// ==========================================
// ADMIN PORTAL LOGIC (ADMINISTRATOR)
// ==========================================

// 1. Load Statistik Ringkas Admin
async function loadAdminStats() {
  const revEl = document.getElementById('stat-revenue');
  const ordEl = document.getElementById('stat-orders');
  const prodEl = document.getElementById('stat-products');
  const custEl = document.getElementById('stat-customers');
  const listEl = document.getElementById('recent-orders-list');

  if (!revEl) return;

  try {
    // 1. Fetch Stats API
    const resStats = await fetch(`${API_URL}/stats`, { headers: getHeaders() });
    const stats = await resStats.json();

    if (resStats.ok) {
      revEl.textContent = formatRupiah(stats.totalRevenue);
      ordEl.textContent = stats.totalOrders;
      prodEl.textContent = stats.totalProducts;
      custEl.textContent = stats.totalCustomers;
    }

    // 2. Fetch Recent Orders
    const resOrders = await fetch(`${API_URL}/orders`, { headers: getHeaders() });
    const orders = await resOrders.json();

    if (resOrders.ok) {
      if (orders.length === 0) {
        listEl.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Belum ada transaksi pemesanan stiker.</td></tr>`;
        return;
      }

      // Ambil 5 pesanan teratas saja untuk recent activity
      const recent = orders.slice(0, 5);

      listEl.innerHTML = recent.map(ord => {
        let badge = '';
        if (ord.status_pesanan === 'Pending') badge = '<span class="badge badge-pending">Pending</span>';
        else if (ord.status_pesanan === 'Diproses') badge = '<span class="badge badge-proses">Diproses</span>';
        else if (ord.status_pesanan === 'Selesai') badge = '<span class="badge badge-selesai">Selesai</span>';
        else if (ord.status_pesanan === 'Dibatalkan') badge = '<span class="badge badge-batal">Batal</span>';

        return `
          <tr>
            <td><strong>#TR-${ord.id_pesanan}</strong></td>
            <td>${ord.nama_pelanggan}</td>
            <td style="font-size:0.85rem;">${ord.no_telepon || '-'}</td>
            <td>${ord.nama_produk}</td>
            <td>${ord.jumlah} pcs</td>
            <td style="font-weight: 700; color: var(--success);">${formatRupiah(ord.total_harga)}</td>
            <td>${badge}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

// 2. Ambil & Render Produk (Admin)
async function loadAdminProducts() {
  const container = document.getElementById('admin-products-list');
  if (!container) return;

  try {
    const response = await fetch(`${API_URL}/products`, { headers: getHeaders() });
    const products = await response.json();

    if (!response.ok) {
      container.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--danger)">Gagal mengambil data produk.</td></tr>`;
      return;
    }

    if (products.length === 0) {
      container.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted)">Belum ada varian stiker ditambahkan.</td></tr>`;
      return;
    }

    container.innerHTML = products.map(prod => `
      <tr>
        <td><strong>#PR-${prod.id_produk}</strong></td>
        <td><strong>${prod.nama_produk}</strong></td>
        <td style="font-size: 0.85rem; color: var(--text-muted); max-width: 250px; overflow-wrap: break-word;">${prod.deskripsi || '-'}</td>
        <td style="font-weight: 600; color: var(--primary);">${formatRupiah(prod.harga_per_pcs)}</td>
        <td>${prod.min_order} pcs</td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm" onclick="openProductModal('edit', ${prod.id_produk}, '${prod.nama_produk.replace(/'/g, "\\'")}', '${(prod.deskripsi || '').replace(/'/g, "\\'")}', ${prod.harga_per_pcs}, ${prod.min_order})">
            ✏️ Edit
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct(${prod.id_produk})">
            🗑️ Hapus
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--danger)">Gagal memuat produk.</td></tr>`;
  }
}

// 3. Modal Produk Setup
function openProductModal(action, id = '', name = '', desc = '', price = '', min = '') {
  document.getElementById('product-id-input').value = id;
  document.getElementById('prod-name').value = name;
  document.getElementById('prod-desc').value = desc;
  document.getElementById('prod-price').value = price;
  document.getElementById('prod-min').value = min;

  if (action === 'add') {
    document.getElementById('product-modal-title').textContent = '➕ Tambah Varian Stiker Baru';
    document.getElementById('btn-submit-product').textContent = 'Tambah Produk';
  } else {
    document.getElementById('product-modal-title').textContent = '✏️ Edit Varian Stiker';
    document.getElementById('btn-submit-product').textContent = 'Simpan Perubahan';
  }

  document.getElementById('product-modal').classList.add('active');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('active');
}

// 4. Add / Edit Product Submit
const productForm = document.getElementById('product-form');
if (productForm) {
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('product-id-input').value;
    const nama_produk = document.getElementById('prod-name').value.trim();
    const deskripsi = document.getElementById('prod-desc').value.trim();
    const harga_per_pcs = parseFloat(document.getElementById('prod-price').value);
    const min_order = parseInt(document.getElementById('prod-min').value);

    const body = { nama_produk, deskripsi, harga_per_pcs, min_order };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;

    try {
      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        closeProductModal();
        alert(id ? 'Produk berhasil diupdate!' : 'Produk berhasil ditambahkan!');
        loadAdminProducts();
      } else {
        alert(data.message || 'Gagal menyimpan produk.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghubungi server.');
    }
  });
}

// 5. Hapus Produk
async function deleteProduct(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus produk stiker ini?')) return;

  try {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert('Produk berhasil dihapus!');
      loadAdminProducts();
    } else {
      alert(data.message || 'Gagal menghapus produk. Produk ini mungkin terikat dalam riwayat transaksi.');
    }
  } catch (err) {
    console.error(err);
    alert('Gagal menghubungi server.');
  }
}

// 6. Ambil & Render Semua Pesanan (Admin) - Dengan kolom tambahan
async function loadAdminOrders() {
  const container = document.getElementById('admin-orders-list');
  if (!container) return;

  try {
    const response = await fetch(`${API_URL}/orders`, { headers: getHeaders() });
    const orders = await response.json();

    if (!response.ok) {
      container.innerHTML = `<tr><td colspan="12" style="text-align:center; color:var(--danger)">Gagal mengambil data pesanan.</td></tr>`;
      return;
    }

    if (orders.length === 0) {
      container.innerHTML = `<tr><td colspan="12" style="text-align:center; color:var(--text-muted)">Belum ada pesanan masuk dari pelanggan.</td></tr>`;
      return;
    }

    container.innerHTML = orders.map(ord => {
      // Create options for Select status
      const statuses = ['Pending', 'Diproses', 'Selesai', 'Dibatalkan'];
      const selectOptions = statuses.map(st => {
        const isSelected = ord.status_pesanan === st ? 'selected' : '';
        return `<option value="${st}" ${isSelected}>${st}</option>`;
      }).join('');

      let statusBadge = '';
      if (ord.status_pesanan === 'Pending') statusBadge = '<span class="badge badge-pending">Pending</span>';
      else if (ord.status_pesanan === 'Diproses') statusBadge = '<span class="badge badge-proses">Diproses</span>';
      else if (ord.status_pesanan === 'Selesai') statusBadge = '<span class="badge badge-selesai">Selesai</span>';
      else if (ord.status_pesanan === 'Dibatalkan') statusBadge = '<span class="badge badge-batal">Batal</span>';

      // Link File Desain
      const linkDesain = ord.file_desain 
        ? `<a href="/uploads/desain/${ord.file_desain}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.75rem;">🎨 Desain</a>`
        : '-';

      // Link Bukti Pembayaran
      const linkBukti = ord.bukti_pembayaran
        ? `<a href="/uploads/pembayaran/${ord.bukti_pembayaran}" target="_blank" class="btn btn-success btn-sm" style="padding: 4px 8px; font-size: 0.75rem;">📄 Struk</a>`
        : '<span style="font-size:0.75rem; color:var(--danger); font-weight:700;">Belum Bayar</span>';

      return `
        <tr>
          <td><strong>#TR-${ord.id_pesanan}</strong></td>
          <td style="font-size:0.85rem;">${formatDate(ord.tanggal_pesanan)}</td>
          <td>
            <strong>${ord.nama_pelanggan}</strong><br>
            <span style="font-size:0.75rem; color:var(--text-muted)">Email: ${ord.email}</span><br>
            <span style="font-size:0.75rem; color:var(--text-muted)">WA: ${ord.no_telepon || '-'}</span>
          </td>
          <td><strong>${ord.nama_produk}</strong></td>
          <td style="font-size:0.85rem;">${ord.panjang}x${ord.lebar} cm</td>
          <td>${ord.jumlah} pcs</td>
          <td style="font-weight: 700; color: var(--success);">${formatRupiah(ord.total_harga)}</td>
          <td style="font-size:0.85rem; color:var(--text-muted); max-width:150px; overflow-wrap:break-word;">${ord.catatan || '-'}</td>
          <td>${linkDesain}</td>
          <td>${linkBukti}</td>
          <td>${statusBadge}</td>
          <td style="text-align: center;">
            <select class="form-input" style="padding: 6px 12px; font-size: 0.85rem; width: auto; display: inline-block;" onchange="updateOrderStatus(${ord.id_pesanan}, this.value)">
              ${selectOptions}
            </select>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = `<tr><td colspan="12" style="text-align:center; color:var(--danger)">Gagal memuat data.</td></tr>`;
  }
}

// 7. Update Status Pesanan (Admin)
async function updateOrderStatus(orderId, newStatus) {
  try {
    const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status_pesanan: newStatus })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert(`Status transaksi #TR-${orderId} berhasil diubah menjadi ${newStatus}.`);
      loadAdminOrders();
    } else {
      alert(data.message || 'Gagal mengubah status.');
    }
  } catch (err) {
    console.error(err);
    alert('Gagal menghubungi server.');
  }
}

// 8. Ambil & Render Pelanggan (Admin)
async function loadAdminCustomers() {
  const container = document.getElementById('admin-customers-list');
  if (!container) return;

  try {
    const response = await fetch(`${API_URL}/customers`, { headers: getHeaders() });
    const customers = await response.json();

    if (!response.ok) {
      container.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--danger)">Gagal mengambil data pelanggan.</td></tr>`;
      return;
    }

    // Filter out admins from client-facing lists for clarity, if desired, or show all
    const clientsOnly = customers.filter(c => c.role === 'pelanggan');

    if (clientsOnly.length === 0) {
      container.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted)">Belum ada pelanggan terdaftar.</td></tr>`;
      return;
    }

    container.innerHTML = clientsOnly.map(c => `
      <tr>
        <td><strong>#PL-${c.id_pelanggan}</strong></td>
        <td><strong>${c.nama_pelanggan}</strong></td>
        <td>${c.email}</td>
        <td>${c.no_telepon || '-'}</td>
        <td style="font-size:0.85rem; color:var(--text-muted); max-width:250px; overflow-wrap:break-word;">${c.alamat || '-'}</td>
        <td style="font-size:0.85rem;">${formatDate(c.created_at)}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--danger)">Gagal memuat data pelanggan.</td></tr>`;
  }
}
