const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./src/db');
require('dotenv').config();
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_sticker_printing_key_987654321';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Pastikan folder uploads ada (gunakan /tmp di lingkungan serverless Vercel)
const isVercel = process.env.VERCEL === '1' || process.env.NOW_BUILDER;
const uploadDesainDir = isVercel ? path.join('/tmp', 'uploads', 'desain') : path.join(__dirname, 'uploads', 'desain');
const uploadPembayaranDir = isVercel ? path.join('/tmp', 'uploads', 'pembayaran') : path.join(__dirname, 'uploads', 'pembayaran');
if (!fs.existsSync(uploadDesainDir)) fs.mkdirSync(uploadDesainDir, { recursive: true });
if (!fs.existsSync(uploadPembayaranDir)) fs.mkdirSync(uploadPembayaranDir, { recursive: true });

// Konfigurasi Multer
const storageDesain = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDesainDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'desain-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const storagePembayaran = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPembayaranDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bukti-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadDesain = multer({ storage: storageDesain, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadPembayaran = multer({ storage: storagePembayaran, limits: { fileSize: 5 * 1024 * 1024 } });

// Middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads')));

// ==========================================
// ADMIN ACCOUNT BOOTSTRAP
// ==========================================
const ADMIN_EMAIL = 'paridisan150@gmail.com';
const ADMIN_PASSWORD = 'Santuy01';
const ADMIN_NAME = 'Pari Disan';

const ensureAdminAccount = async () => {
  try {
    const [rows] = await db.query('SELECT * FROM pelanggan WHERE email = ?', [ADMIN_EMAIL]);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    if (rows.length === 0) {
      await db.query(
        'INSERT INTO pelanggan (nama_pelanggan, email, password, no_telepon, alamat, role) VALUES (?, ?, ?, ?, ?, ?)',
        [ADMIN_NAME, ADMIN_EMAIL, hashedPassword, '085783628414', 'Kantor Admin StickerPrint', 'admin']
      );
      console.log(`✅ Akun admin baru dibuat: ${ADMIN_EMAIL}`);
    } else {
      // Always update password and ensure role=admin
      await db.query(
        'UPDATE pelanggan SET password = ?, role = ?, nama_pelanggan = ? WHERE email = ?',
        [hashedPassword, 'admin', ADMIN_NAME, ADMIN_EMAIL]
      );
      console.log(`✅ Akun admin diperbarui: ${ADMIN_EMAIL}`);
    }
  } catch (error) {
    console.error('Gagal memastikan akun admin:', error.message);
  }
};

const migrate = require('./migrate');
const seed = require('./fix-and-seed');

const bootstrap = async () => {
  try {
    await migrate();
    await seed();
    await ensureAdminAccount();
  } catch (error) {
    console.error('❌ Gagal melakukan bootstrap database:', error.message);
  }
};

bootstrap();

// ==========================================
// MIDDLEWARE AUTH
// ==========================================
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(403).json({ message: 'Token tidak valid atau telah kedaluwarsa.' });
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ message: 'Akses ditolak. Hanya untuk Admin.' });
};

// ==========================================
// HELPERS
// ==========================================
const createNotification = async ({ id_pelanggan = null, role = 'all', title, message, link = null }) => {
  try {
    await db.query(
      'INSERT INTO notifications (id_pelanggan, role, title, message, link) VALUES (?, ?, ?, ?, ?)',
      [id_pelanggan, role, title, message, link]
    );
  } catch (error) {
    console.error('Gagal membuat notifikasi:', error);
  }
};

const insertOrderStatusHistory = async (id_pesanan, status_pesanan, catatan = '') => {
  try {
    await db.query(
      'INSERT INTO order_status_history (id_pesanan, status_pesanan, catatan) VALUES (?, ?, ?)',
      [id_pesanan, status_pesanan, catatan]
    );
  } catch (error) {
    console.error('Gagal menyimpan riwayat status pesanan:', error);
  }
};

const validateCoupon = async (code) => {
  if (!code) return null;
  const [rows] = await db.query('SELECT * FROM coupons WHERE code = ? AND active = 1', [code.trim().toUpperCase()]);
  if (rows.length === 0) return null;
  const coupon = rows[0];
  const now = new Date();
  if (coupon.expires_at && new Date(coupon.expires_at) < now) return null;
  if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) return null;
  return coupon;
};

// ==========================================
// API: AUTH
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  const { nama, email, password, no_telepon, alamat } = req.body;
  if (!nama || !email || !password) return res.status(400).json({ message: 'Nama, email, dan password wajib diisi.' });
  try {
    const [existingUser] = await db.query('SELECT * FROM pelanggan WHERE email = ?', [email]);
    if (existingUser.length > 0) return res.status(400).json({ message: 'Email sudah terdaftar.' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await db.query(
      'INSERT INTO pelanggan (nama_pelanggan, email, password, no_telepon, alamat, role) VALUES (?, ?, ?, ?, ?, ?)',
      [nama, email, hashedPassword, no_telepon || null, alamat || null, 'pelanggan']
    );
    res.status(201).json({ success: true, message: 'Registrasi berhasil. Silakan login.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email dan password wajib diisi.' });
  try {
    const [users] = await db.query('SELECT * FROM pelanggan WHERE email = ?', [email]);
    if (users.length === 0) return res.status(400).json({ message: 'Email atau password salah.' });
    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Email atau password salah.' });
    const token = jwt.sign(
      { id_pelanggan: user.id_pelanggan, nama: user.nama_pelanggan, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ success: true, message: 'Login berhasil.', token, user: { id_pelanggan: user.id_pelanggan, nama: user.nama_pelanggan, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id_pelanggan, nama_pelanggan, email, no_telepon, alamat, role, created_at FROM pelanggan WHERE id_pelanggan = ?',
      [req.user.id_pelanggan]
    );
    if (users.length === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data user.' });
  }
});

app.put('/api/auth/profile', verifyToken, async (req, res) => {
  const { nama, no_telepon, alamat } = req.body;
  try {
    await db.query(
      'UPDATE pelanggan SET nama_pelanggan = ?, no_telepon = ?, alamat = ? WHERE id_pelanggan = ?',
      [nama, no_telepon, alamat, req.user.id_pelanggan]
    );
    res.json({ success: true, message: 'Profil berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui profil.' });
  }
});

app.put('/api/auth/change-password', verifyToken, async (req, res) => {
  const { current_password, new_password } = req.body;
  try {
    const [users] = await db.query('SELECT * FROM pelanggan WHERE id_pelanggan = ?', [req.user.id_pelanggan]);
    if (users.length === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });
    const validPassword = await bcrypt.compare(current_password, users[0].password);
    if (!validPassword) return res.status(400).json({ message: 'Password lama tidak sesuai.' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);
    await db.query('UPDATE pelanggan SET password = ? WHERE id_pelanggan = ?', [hashedPassword, req.user.id_pelanggan]);
    res.json({ success: true, message: 'Password berhasil diubah.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengubah password.' });
  }
});

// ==========================================
// API: PRODUK
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM produk ORDER BY id_produk DESC');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data produk.' });
  }
});

app.post('/api/products', verifyToken, verifyAdmin, async (req, res) => {
  const { nama_produk, deskripsi, harga_per_pcs, min_order } = req.body;
  if (!nama_produk || !harga_per_pcs) return res.status(400).json({ message: 'Nama produk dan harga wajib diisi.' });
  try {
    const [result] = await db.query(
      'INSERT INTO produk (nama_produk, deskripsi, harga_per_pcs, min_order) VALUES (?, ?, ?, ?)',
      [nama_produk, deskripsi || null, harga_per_pcs, min_order || 1]
    );
    res.status(201).json({ success: true, message: 'Produk berhasil ditambahkan.', productId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambahkan produk.' });
  }
});

app.put('/api/products/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { nama_produk, deskripsi, harga_per_pcs, min_order } = req.body;
  if (!nama_produk || !harga_per_pcs) return res.status(400).json({ message: 'Nama produk dan harga wajib diisi.' });
  try {
    const [result] = await db.query(
      'UPDATE produk SET nama_produk = ?, deskripsi = ?, harga_per_pcs = ?, min_order = ? WHERE id_produk = ?',
      [nama_produk, deskripsi || null, harga_per_pcs, min_order || 1, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    res.json({ success: true, message: 'Produk berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui produk.' });
  }
});

app.delete('/api/products/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM produk WHERE id_produk = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    res.json({ success: true, message: 'Produk berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus produk. Kemungkinan sudah digunakan dalam transaksi.' });
  }
});

// ==========================================
// API: PESANAN
// ==========================================
app.post('/api/orders', verifyToken, uploadDesain.single('file_desain'), async (req, res) => {
  const { id_produk, jumlah, catatan, coupon_code, payment_method } = req.body;
  const panjang = parseFloat(req.body.panjang || 5.00);
  const lebar = parseFloat(req.body.lebar || 5.00);
  const id_pelanggan = req.user.id_pelanggan;
  if (!id_produk || !jumlah) return res.status(400).json({ message: 'Produk dan jumlah wajib ditentukan.' });
  try {
    const [products] = await db.query('SELECT * FROM produk WHERE id_produk = ?', [id_produk]);
    if (products.length === 0) return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    const produk = products[0];
    if (parseInt(jumlah) < produk.min_order) {
      return res.status(400).json({ message: `Minimal pembelian untuk ${produk.nama_produk} adalah ${produk.min_order} pcs.` });
    }
    const multiplier = (panjang * lebar) / 25.0;
    const harga_per_pcs_kustom = parseFloat(produk.harga_per_pcs) * multiplier;
    const subtotal = harga_per_pcs_kustom * parseInt(jumlah);
    let discount_amount = 0;
    let coupon = null;
    let couponCodeNormalized = null;
    if (coupon_code) {
      coupon = await validateCoupon(coupon_code);
      if (!coupon) return res.status(400).json({ message: 'Kupon tidak valid atau sudah kadaluarsa.' });
      couponCodeNormalized = coupon.code;
      discount_amount = coupon.type === 'percentage'
        ? parseFloat(((subtotal * coupon.discount_value) / 100).toFixed(2))
        : parseFloat(coupon.discount_value);
      if (discount_amount > subtotal) discount_amount = subtotal;
    }
    const total_harga = parseFloat((subtotal - discount_amount).toFixed(2));
    const file_desain = req.file ? req.file.filename : null;
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [orderResult] = await conn.query(
        'INSERT INTO pesanan (id_pelanggan, status_pesanan, payment_status, payment_method, coupon_code, discount_amount, total_harga, catatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id_pelanggan, 'Pending', 'Belum Bayar', payment_method || 'Transfer Bank', couponCodeNormalized, discount_amount, total_harga, catatan || '']
      );
      const id_pesanan = orderResult.insertId;
      await conn.query(
        'INSERT INTO detail_pesanan (id_pesanan, id_produk, jumlah, subtotal, file_desain, panjang, lebar) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id_pesanan, id_produk, parseInt(jumlah), subtotal, file_desain, panjang, lebar]
      );
      await conn.query(
        'INSERT INTO order_status_history (id_pesanan, status_pesanan, catatan) VALUES (?, ?, ?)',
        [id_pesanan, 'Pending', 'Pesanan dibuat dan menunggu pembayaran.']
      );
      if (coupon) await conn.query('UPDATE coupons SET used_count = used_count + 1 WHERE id_coupon = ?', [coupon.id_coupon]);
      await conn.commit();
      conn.release();
      await createNotification({ role: 'admin', title: 'Pesanan Baru Diterima', message: `Pesanan #TR-${id_pesanan} telah dibuat oleh ${req.user.nama}.`, link: null });
      await createNotification({ id_pelanggan, role: 'pelanggan', title: 'Pesanan Anda Telah Dibuat', message: `Pesanan #TR-${id_pesanan} berhasil dibuat, mohon unggah bukti pembayaran.`, link: null });
      res.status(201).json({ success: true, message: 'Pesanan berhasil dibuat.', id_pesanan, total_harga, discount_amount, coupon_code: couponCodeNormalized });
    } catch (txError) {
      await conn.rollback();
      conn.release();
      throw txError;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal membuat pesanan.' });
  }
});

app.get('/api/orders', verifyToken, async (req, res) => {
  const { role, id_pelanggan } = req.user;
  try {
    let sql = `
      SELECT p.id_pesanan, p.tanggal_pesanan, p.status_pesanan, p.payment_status, p.payment_method,
             p.coupon_code, p.discount_amount, p.total_harga, p.catatan, p.bukti_pembayaran,
             pl.nama_pelanggan, pl.email, pl.no_telepon,
             dp.jumlah, dp.subtotal, dp.file_desain, dp.panjang, dp.lebar,
             pr.nama_produk, pr.harga_per_pcs
      FROM pesanan p
      JOIN pelanggan pl ON p.id_pelanggan = pl.id_pelanggan
      JOIN detail_pesanan dp ON p.id_pesanan = dp.id_pesanan
      JOIN produk pr ON dp.id_produk = pr.id_produk
    `;
    let params = [];
    if (role !== 'admin') {
      sql += ' WHERE p.id_pelanggan = ?';
      params.push(id_pelanggan);
    }
    sql += ' ORDER BY p.tanggal_pesanan DESC';
    const [orders] = await db.query(sql, params);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil riwayat pesanan.' });
  }
});

app.get('/api/orders/:id/history', verifyToken, async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const { role, id_pelanggan } = req.user;
  try {
    const [orders] = await db.query('SELECT id_pelanggan FROM pesanan WHERE id_pesanan = ?', [orderId]);
    if (orders.length === 0) return res.status(404).json({ message: 'Pesanan tidak ditemukan.' });
    if (role !== 'admin' && orders[0].id_pelanggan !== id_pelanggan) return res.status(403).json({ message: 'Akses ditolak.' });
    const [history] = await db.query(
      'SELECT status_pesanan, catatan, changed_at FROM order_status_history WHERE id_pesanan = ? ORDER BY changed_at ASC',
      [orderId]
    );
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil riwayat status pesanan.' });
  }
});

app.put('/api/orders/:id/status', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status_pesanan } = req.body;
  const validStatuses = ['Pending', 'Diproses', 'Dicetak', 'Dikirim', 'Selesai', 'Dibatalkan'];
  if (!validStatuses.includes(status_pesanan)) return res.status(400).json({ message: 'Status pesanan tidak valid.' });
  try {
    const [orderRows] = await db.query('SELECT id_pelanggan FROM pesanan WHERE id_pesanan = ?', [id]);
    if (orderRows.length === 0) return res.status(404).json({ message: 'Pesanan tidak ditemukan.' });
    const customerId = orderRows[0].id_pelanggan;
    await db.query('UPDATE pesanan SET status_pesanan = ? WHERE id_pesanan = ?', [status_pesanan, id]);
    await insertOrderStatusHistory(id, status_pesanan, `Status diperbarui menjadi ${status_pesanan}.`);
    await createNotification({ id_pelanggan: customerId, role: 'pelanggan', title: 'Status Pesanan Diperbarui', message: `Pesanan #TR-${id} sekarang berstatus ${status_pesanan}.`, link: null });
    res.json({ success: true, message: `Status pesanan berhasil diubah menjadi ${status_pesanan}.` });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui status pesanan.' });
  }
});

app.put('/api/orders/:id/payment-status', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { payment_status } = req.body;
  const validStatuses = ['Belum Bayar', 'Menunggu Konfirmasi', 'Lunas'];
  if (!validStatuses.includes(payment_status)) return res.status(400).json({ message: 'Status pembayaran tidak valid.' });
  try {
    const [orderRows] = await db.query('SELECT id_pelanggan FROM pesanan WHERE id_pesanan = ?', [id]);
    if (orderRows.length === 0) return res.status(404).json({ message: 'Pesanan tidak ditemukan.' });
    await db.query('UPDATE pesanan SET payment_status = ? WHERE id_pesanan = ?', [payment_status, id]);
    await createNotification({ id_pelanggan: orderRows[0].id_pelanggan, role: 'pelanggan', title: 'Status Pembayaran Diperbarui', message: `Status pembayaran pesanan #TR-${id} menjadi ${payment_status}.`, link: null });
    res.json({ success: true, message: `Status pembayaran berhasil diubah.` });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui status pembayaran.' });
  }
});

app.post('/api/orders/:id/upload-payment', verifyToken, uploadPembayaran.single('bukti_pembayaran'), async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ message: 'File bukti pembayaran wajib diunggah.' });
  try {
    const [orders] = await db.query('SELECT id_pelanggan FROM pesanan WHERE id_pesanan = ?', [id]);
    if (orders.length === 0) return res.status(404).json({ message: 'Pesanan tidak ditemukan.' });
    if (req.user.role !== 'admin' && orders[0].id_pelanggan !== req.user.id_pelanggan) return res.status(403).json({ message: 'Akses ditolak.' });
    await db.query('UPDATE pesanan SET bukti_pembayaran = ?, payment_status = ? WHERE id_pesanan = ?', [req.file.filename, 'Menunggu Konfirmasi', id]);
    await createNotification({ role: 'admin', title: 'Bukti Pembayaran Diunggah', message: `Pelanggan telah mengunggah bukti pembayaran untuk pesanan #TR-${id}.`, link: null });
    res.json({ success: true, message: 'Bukti pembayaran berhasil diunggah.', filename: req.file.filename });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengunggah bukti pembayaran.' });
  }
});

app.delete('/api/orders/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { role, id_pelanggan } = req.user;
  try {
    const [orders] = await db.query('SELECT id_pelanggan, status_pesanan FROM pesanan WHERE id_pesanan = ?', [id]);
    if (orders.length === 0) return res.status(404).json({ message: 'Pesanan tidak ditemukan.' });
    if (role !== 'admin' && orders[0].id_pelanggan !== id_pelanggan) {
      return res.status(403).json({ message: 'Akses ditolak.' });
    }
    if (role !== 'admin' && orders[0].status_pesanan !== 'Pending') {
      return res.status(400).json({ message: 'Hanya pesanan berstatus Pending yang dapat dibatalkan.' });
    }
    await db.query('DELETE FROM pesanan WHERE id_pesanan = ?', [id]);
    res.json({ success: true, message: 'Pesanan berhasil dibatalkan.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal membatalkan pesanan.' });
  }
});

// ==========================================
// API: KUPON
// ==========================================
app.get('/api/coupons/validate', verifyToken, async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ message: 'Kode kupon wajib diberikan.' });
  try {
    const coupon = await validateCoupon(code);
    if (!coupon) return res.status(404).json({ message: 'Kupon tidak valid atau tidak tersedia.' });
    res.json({ success: true, coupon: { code: coupon.code, type: coupon.type, discount_value: coupon.discount_value, min_order_amount: coupon.min_order_amount } });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memvalidasi kupon.' });
  }
});

app.get('/api/coupons', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [coupons] = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil daftar kupon.' });
  }
});

app.post('/api/coupons', verifyToken, verifyAdmin, async (req, res) => {
  const { code, type, discount_value, min_order_amount, usage_limit, expires_at } = req.body;
  if (!code || !type || !discount_value) return res.status(400).json({ message: 'Kode, tipe, dan nilai diskon wajib diisi.' });
  try {
    await db.query(
      'INSERT INTO coupons (code, type, discount_value, min_order_amount, usage_limit, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [code.trim().toUpperCase(), type, discount_value, min_order_amount || 0, usage_limit || 0, expires_at || null]
    );
    res.status(201).json({ success: true, message: 'Kupon berhasil dibuat.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat kupon.' });
  }
});

app.put('/api/coupons/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { code, type, discount_value, min_order_amount, usage_limit, active, expires_at } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE coupons SET code = ?, type = ?, discount_value = ?, min_order_amount = ?, usage_limit = ?, active = ?, expires_at = ? WHERE id_coupon = ?',
      [code.trim().toUpperCase(), type, discount_value, min_order_amount || 0, usage_limit || 0, active ? 1 : 0, expires_at || null, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Kupon tidak ditemukan.' });
    res.json({ success: true, message: 'Kupon berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui kupon.' });
  }
});

app.delete('/api/coupons/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM coupons WHERE id_coupon = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Kupon tidak ditemukan.' });
    res.json({ success: true, message: 'Kupon berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus kupon.' });
  }
});

// ==========================================
// API: NOTIFIKASI
// ==========================================
app.get('/api/notifications', verifyToken, async (req, res) => {
  const { role, id_pelanggan } = req.user;
  try {
    let sql = 'SELECT id_notification, title, message, link, is_read, created_at FROM notifications WHERE role = ? OR role = ?';
    let params = [role, 'all'];
    if (role === 'pelanggan') { sql += ' OR id_pelanggan = ?'; params.push(id_pelanggan); }
    sql += ' ORDER BY created_at DESC LIMIT 50';
    const [notifications] = await db.query(sql, params);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil notifikasi.' });
  }
});

app.put('/api/notifications/:id/read', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE id_notification = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui notifikasi.' });
  }
});

app.put('/api/notifications/read-all', verifyToken, async (req, res) => {
  const { role, id_pelanggan } = req.user;
  try {
    if (role === 'admin') {
      await db.query("UPDATE notifications SET is_read = 1 WHERE role = 'admin' OR role = 'all'");
    } else {
      await db.query("UPDATE notifications SET is_read = 1 WHERE id_pelanggan = ? OR (role = 'pelanggan' OR role = 'all')", [id_pelanggan]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui notifikasi.' });
  }
});

// ==========================================
// API: TIKET SUPPORT
// ==========================================
app.post('/api/support/tickets', verifyToken, async (req, res) => {
  const { subject, message, priority } = req.body;
  if (!subject || !message) return res.status(400).json({ message: 'Subjek dan pesan wajib diisi.' });
  try {
    const [result] = await db.query(
      'INSERT INTO support_tickets (id_pelanggan, subject, message, priority) VALUES (?, ?, ?, ?)',
      [req.user.id_pelanggan, subject, message, priority || 'Normal']
    );
    await createNotification({ role: 'admin', title: 'Tiket Dukungan Baru', message: `${req.user.nama} mengirim tiket: ${subject}`, link: null });
    res.status(201).json({ success: true, message: 'Tiket dukungan berhasil dikirim.', id_ticket: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat tiket dukungan.' });
  }
});

app.get('/api/support/tickets', verifyToken, async (req, res) => {
  const { role, id_pelanggan } = req.user;
  try {
    if (role === 'admin') {
      const [tickets] = await db.query(
        `SELECT t.*, p.nama_pelanggan, p.email FROM support_tickets t JOIN pelanggan p ON t.id_pelanggan = p.id_pelanggan ORDER BY t.updated_at DESC`
      );
      return res.json(tickets);
    }
    const [tickets] = await db.query('SELECT * FROM support_tickets WHERE id_pelanggan = ? ORDER BY updated_at DESC', [id_pelanggan]);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil tiket dukungan.' });
  }
});

app.put('/api/support/tickets/:id/status', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
  if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Status tiket tidak valid.' });
  try {
    const [result] = await db.query('UPDATE support_tickets SET status = ? WHERE id_ticket = ?', [status, id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });
    res.json({ success: true, message: 'Status tiket berhasil diperbarui.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui status tiket.' });
  }
});

// ==========================================
// API: STATISTIK ADMIN
// ==========================================
app.get('/api/admin/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [[{ total_pesanan }]] = await db.query('SELECT COUNT(*) as total_pesanan FROM pesanan');
    const [[{ total_pelanggan }]] = await db.query("SELECT COUNT(*) as total_pelanggan FROM pelanggan WHERE role = 'pelanggan'");
    const [[{ total_pendapatan }]] = await db.query("SELECT COALESCE(SUM(total_harga), 0) as total_pendapatan FROM pesanan WHERE payment_status = 'Lunas'");
    const [[{ pesanan_pending }]] = await db.query("SELECT COUNT(*) as pesanan_pending FROM pesanan WHERE status_pesanan = 'Pending'");

    const [statusChart] = await db.query(`
      SELECT status_pesanan, COUNT(*) as count FROM pesanan GROUP BY status_pesanan
    `);

    const [revenueChart] = await db.query(`
      SELECT DATE_FORMAT(tanggal_pesanan, '%Y-%m') as bulan,
             COALESCE(SUM(total_harga), 0) as pendapatan,
             COUNT(*) as jumlah_pesanan
      FROM pesanan
      WHERE payment_status = 'Lunas'
      GROUP BY DATE_FORMAT(tanggal_pesanan, '%Y-%m')
      ORDER BY bulan ASC
      LIMIT 12
    `);

    res.json({ total_pesanan, total_pelanggan, total_pendapatan, pesanan_pending, statusChart, revenueChart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil statistik.' });
  }
});

// API: Daftar Pelanggan (Admin)
app.get('/api/admin/customers', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [customers] = await db.query(
      `SELECT p.id_pelanggan, p.nama_pelanggan, p.email, p.no_telepon, p.alamat, p.role, p.created_at,
              COUNT(ps.id_pesanan) as total_pesanan,
              COALESCE(SUM(ps.total_harga), 0) as total_belanja
       FROM pelanggan p
       LEFT JOIN pesanan ps ON p.id_pelanggan = ps.id_pelanggan
       WHERE p.role = 'pelanggan'
       GROUP BY p.id_pelanggan
       ORDER BY p.created_at DESC`
    );
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data pelanggan.' });
  }
});

// ==========================================
// START SERVER
// ==========================================
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server backend berjalan di http://localhost:${PORT}`);
    console.log(`📡 API tersedia di http://localhost:${PORT}/api`);
  });
}

module.exports = app;
