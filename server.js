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
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_sticker_printing_key_987654321';

// Pastikan folder uploads ada
const uploadDesainDir = path.join(__dirname, 'public', 'uploads', 'desain');
const uploadPembayaranDir = path.join(__dirname, 'public', 'uploads', 'pembayaran');

if (!fs.existsSync(uploadDesainDir)) {
  fs.mkdirSync(uploadDesainDir, { recursive: true });
}
if (!fs.existsSync(uploadPembayaranDir)) {
  fs.mkdirSync(uploadPembayaranDir, { recursive: true });
}

// Konfigurasi Multer Penyimpanan
const storageDesain = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDesainDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'desain-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const storagePembayaran = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPembayaranDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bukti-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadDesain = multer({ 
  storage: storageDesain,
  limits: { fileSize: 10 * 1024 * 1024 } // limit 10MB
});

const uploadPembayaran = multer({ 
  storage: storagePembayaran,
  limits: { fileSize: 5 * 1024 * 1024 } // limit 5MB
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_EMAIL = 'paridisan150@gmail.com';
const ADMIN_PASSWORD = 'Santuy01';
const ADMIN_NAME = 'Pari Disan';

const ensureAdminAccount = async () => {
  try {
    const [rows] = await db.query('SELECT * FROM pelanggan WHERE email = ?', [ADMIN_EMAIL]);

    if (rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
      await db.query(
        'INSERT INTO pelanggan (nama_pelanggan, email, password, no_telepon, alamat, role) VALUES (?, ?, ?, ?, ?, ?)',
        [ADMIN_NAME, ADMIN_EMAIL, hashedPassword, '081234567890', 'Kantor Admin StickerPrint', 'admin']
      );
      console.log(`✅ Akun admin baru dibuat: ${ADMIN_EMAIL}`);
    } else {
      const existingAdmin = rows[0];
      if (existingAdmin.role !== 'admin') {
        await db.query('UPDATE pelanggan SET role = ? WHERE email = ?', ['admin', ADMIN_EMAIL]);
        console.log(`✅ Akun ${ADMIN_EMAIL} diubah menjadi admin.`);
      }
      const passwordMatches = await bcrypt.compare(ADMIN_PASSWORD, existingAdmin.password);
      if (!passwordMatches) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
        await db.query('UPDATE pelanggan SET password = ? WHERE email = ?', [hashedPassword, ADMIN_EMAIL]);
        console.log(`✅ Password akun admin ${ADMIN_EMAIL} diperbarui.`);
      } else {
        console.log(`✅ Akun admin sudah ada: ${ADMIN_EMAIL}`);
      }
    }
  } catch (error) {
    console.error('Gagal memastikan akun admin:', error.message);
  }
};

ensureAdminAccount();

// ==========================================
// MIDDLEWARE AUTENTIKASI & OTORISASI
// ==========================================

// Verifikasi token JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Token tidak valid atau telah kedaluwarsa.' });
  }
};

// Verifikasi role Admin
const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Akses ditolak. Hanya untuk Admin.' });
  }
};

// Helper untuk membuat notifikasi internal
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

// Helper untuk menyimpan riwayat status pesanan
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

// Helper untuk validasi kupon
const validateCoupon = async (code) => {
  if (!code) return null;
  const [rows] = await db.query(
    'SELECT * FROM coupons WHERE code = ? AND active = 1',
    [code.trim().toUpperCase()]
  );
  if (rows.length === 0) return null;
  const coupon = rows[0];
  const now = new Date();
  if (coupon.expires_at && new Date(coupon.expires_at) < now) return null;
  if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) return null;
  return coupon;
};

// ==========================================
// API AUTENTIKASI (AUTH)
// ==========================================

// 1. Registrasi Pelanggan Baru
app.post('/api/auth/register', async (req, res) => {
  const { nama, email, password, no_telepon, alamat } = req.body;

  if (!nama || !email || !password) {
    return res.status(400).json({ message: 'Nama, email, dan password wajib diisi.' });
  }

  try {
    // Cek apakah email sudah terdaftar
    const [existingUser] = await db.query('SELECT * FROM pelanggan WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email sudah terdaftar.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Simpan ke database
    await db.query(
      'INSERT INTO pelanggan (nama_pelanggan, email, password, no_telepon, alamat, role) VALUES (?, ?, ?, ?, ?, ?)',
      [nama, email, hashedPassword, no_telepon || null, alamat || null, 'pelanggan']
    );

    res.status(201).json({ success: true, message: 'Registrasi berhasil. Silakan login.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat registrasi.' });
  }
});

// 2. Login (Pelanggan / Admin)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password wajib diisi.' });
  }

  try {
    // Cek user berdasarkan email
    const [users] = await db.query('SELECT * FROM pelanggan WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Email atau password salah.' });
    }

    const user = users[0];

    // Bandingkan password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Email atau password salah.' });
    }

    // Buat JWT Token
    const token = jwt.sign(
      { id_pelanggan: user.id_pelanggan, nama: user.nama_pelanggan, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: {
        id_pelanggan: user.id_pelanggan,
        nama: user.nama_pelanggan,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat login.' });
  }
});

// 3. Get Me (Informasi Pengguna yang Sedang Login)
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id_pelanggan, nama_pelanggan, email, no_telepon, alamat, role, created_at FROM pelanggan WHERE id_pelanggan = ?',
      [req.user.id_pelanggan]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil data user.' });
  }
});


// ==========================================
// API PRODUK (CRUD)
// ==========================================

// 1. Get Semua Produk (Umum / Pelanggan / Admin)
app.get('/api/products', async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM produk ORDER BY id_produk DESC');
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil data produk.' });
  }
});

// 2. Tambah Produk Baru (Admin Only)
app.post('/api/products', verifyToken, verifyAdmin, async (req, res) => {
  const { nama_produk, deskripsi, harga_per_pcs, min_order } = req.body;

  if (!nama_produk || !harga_per_pcs) {
    return res.status(400).json({ message: 'Nama produk dan harga wajib diisi.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO produk (nama_produk, deskripsi, harga_per_pcs, min_order) VALUES (?, ?, ?, ?)',
      [nama_produk, deskripsi || null, harga_per_pcs, min_order || 1]
    );

    res.status(201).json({
      success: true,
      message: 'Produk berhasil ditambahkan.',
      productId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menambahkan produk.' });
  }
});

// 3. Edit Produk (Admin Only)
app.put('/api/products/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { nama_produk, deskripsi, harga_per_pcs, min_order } = req.body;

  if (!nama_produk || !harga_per_pcs) {
    return res.status(400).json({ message: 'Nama produk dan harga wajib diisi.' });
  }

  try {
    const [result] = await db.query(
      'UPDATE produk SET nama_produk = ?, deskripsi = ?, harga_per_pcs = ?, min_order = ? WHERE id_produk = ?',
      [nama_produk, deskripsi || null, harga_per_pcs, min_order || 1, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    }

    res.json({ success: true, message: 'Produk berhasil diperbarui.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memperbarui produk.' });
  }
});

// 4. Hapus Produk (Admin Only)
app.delete('/api/products/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM produk WHERE id_produk = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    }

    res.json({ success: true, message: 'Produk berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menghapus produk. Kemungkinan produk ini sudah digunakan dalam transaksi.' });
  }
});


// ==========================================
// API PESANAN (ORDERS & ORDER DETAILS)
// ==========================================

// 1. Buat Pesanan Baru (Pelanggan Only) - Dengan Upload Desain, Kupon, dan Kalkulator Luas Kustom
app.post('/api/orders', verifyToken, uploadDesain.single('file_desain'), async (req, res) => {
  const { id_produk, jumlah, catatan, coupon_code, payment_method } = req.body;
  const panjang = parseFloat(req.body.panjang || 5.00);
  const lebar = parseFloat(req.body.lebar || 5.00);
  const id_pelanggan = req.user.id_pelanggan;

  if (!id_produk || !jumlah) {
    return res.status(400).json({ message: 'Produk dan jumlah wajib ditentukan.' });
  }

  try {
    // Ambil harga produk dari DB
    const [products] = await db.query('SELECT * FROM produk WHERE id_produk = ?', [id_produk]);
    if (products.length === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    }

    const produk = products[0];
    if (parseInt(jumlah) < produk.min_order) {
      return res.status(400).json({ message: `Minimal pembelian untuk ${produk.nama_produk} adalah ${produk.min_order} pcs.` });
    }

    // Kalkulasi Harga berdasarkan Luas Kustom (Base ukuran standar: 5x5 cm = 25 cm2)
    const multiplier = (panjang * lebar) / 25.0;
    const harga_per_pcs_kustom = parseFloat(produk.harga_per_pcs) * multiplier;
    const subtotal = harga_per_pcs_kustom * parseInt(jumlah);

    let discount_amount = 0;
    let coupon = null;
    let couponCodeNormalized = null;
    if (coupon_code) {
      coupon = await validateCoupon(coupon_code);
      if (!coupon) {
        return res.status(400).json({ message: 'Kupon tidak valid, sudah kadaluarsa, atau sudah mencapai batas penggunaan.' });
      }
      couponCodeNormalized = coupon.code;
      if (coupon.type === 'percentage') {
        discount_amount = parseFloat(((subtotal * coupon.discount_value) / 100).toFixed(2));
      } else {
        discount_amount = parseFloat(coupon.discount_value);
      }
      if (discount_amount > subtotal) {
        discount_amount = subtotal;
      }
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

      if (coupon) {
        await conn.query('UPDATE coupons SET used_count = used_count + 1 WHERE id_coupon = ?', [coupon.id_coupon]);
      }

      await conn.commit();
      conn.release();

      await createNotification({
        role: 'admin',
        title: 'Pesanan Baru Diterima',
        message: `Pesanan #TR-${id_pesanan} telah dibuat oleh pelanggan ${req.user.nama}.`,
        link: `/dashboard-admin.html?tab=pesanan`
      });
      await createNotification({
        id_pelanggan,
        role: 'pelanggan',
        title: 'Pesanan Anda Telah Dibuat',
        message: `Pesanan #TR-${id_pesanan} berhasil dibuat, mohon unggah bukti pembayaran.`,
        link: `/dashboard-pelanggan.html?tab=riwayat`
      });

      res.status(201).json({
        success: true,
        message: 'Pesanan berhasil dibuat.',
        id_pesanan,
        total_harga,
        discount_amount,
        coupon_code: couponCodeNormalized
      });
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

// 2. Dapatkan Semua Pesanan (Relasional JOIN)
// Jika Admin: mengembalikan semua pesanan yang terdaftar
// Jika Pelanggan: hanya mengembalikan pesanan milik sendiri
app.get('/api/orders', verifyToken, async (req, res) => {
  const { role, id_pelanggan } = req.user;

  try {
    let sql = `
      SELECT 
        p.id_pesanan, 
        p.tanggal_pesanan, 
        p.status_pesanan, 
        p.payment_status,
        p.payment_method,
        p.coupon_code,
        p.discount_amount,
        p.total_harga, 
        p.catatan,
        p.bukti_pembayaran,
        pl.nama_pelanggan,
        pl.email,
        pl.no_telepon,
        dp.jumlah,
        dp.subtotal,
        dp.file_desain,
        dp.panjang,
        dp.lebar,
        pr.nama_produk,
        pr.harga_per_pcs
      FROM pesanan p
      JOIN pelanggan pl ON p.id_pelanggan = pl.id_pelanggan
      JOIN detail_pesanan dp ON p.id_pesanan = dp.id_pesanan
      JOIN produk pr ON dp.id_produk = pr.id_produk
    `;

    let params = [];

    // Jika bukan admin, filter berdasarkan id_pelanggan
    if (role !== 'admin') {
      sql += ' WHERE p.id_pelanggan = ?';
      params.push(id_pelanggan);
    }

    sql += ' ORDER BY p.tanggal_pesanan DESC';

    const [orders] = await db.query(sql, params);
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil riwayat pesanan.' });
  }
});

// 3. Dapatkan Riwayat Status Pesanan
app.get('/api/orders/:id/history', verifyToken, async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const { role, id_pelanggan } = req.user;

  try {
    const [orders] = await db.query('SELECT id_pelanggan FROM pesanan WHERE id_pesanan = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan.' });
    }

    if (role !== 'admin' && orders[0].id_pelanggan !== id_pelanggan) {
      return res.status(403).json({ message: 'Akses ditolak.' });
    }

    const [history] = await db.query(
      'SELECT status_pesanan, catatan, changed_at FROM order_status_history WHERE id_pesanan = ? ORDER BY changed_at ASC',
      [orderId]
    );

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil riwayat status pesanan.' });
  }
});

// 4. Validasi Kupon Diskon
app.get('/api/coupons/validate', verifyToken, async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ message: 'Kode kupon wajib diberikan.' });
  }

  try {
    const coupon = await validateCoupon(code);
    if (!coupon) {
      return res.status(404).json({ message: 'Kupon tidak valid atau tidak tersedia.' });
    }

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        discount_value: coupon.discount_value,
        min_order_amount: coupon.min_order_amount
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memvalidasi kupon.' });
  }
});

// 5. Kelola Kupon (Admin Only)
app.get('/api/coupons', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [coupons] = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(coupons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil daftar kupon.' });
  }
});

app.post('/api/coupons', verifyToken, verifyAdmin, async (req, res) => {
  const { code, type, discount_value, min_order_amount, usage_limit, expires_at } = req.body;
  if (!code || !type || !discount_value) {
    return res.status(400).json({ message: 'Kode, tipe, dan nilai diskon wajib diisi.' });
  }

  try {
    await db.query(
      'INSERT INTO coupons (code, type, discount_value, min_order_amount, usage_limit, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [code.trim().toUpperCase(), type, discount_value, min_order_amount || 0, usage_limit || 0, expires_at || null]
    );
    res.status(201).json({ success: true, message: 'Kupon berhasil dibuat.' });
  } catch (error) {
    console.error(error);
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

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Kupon tidak ditemukan.' });
    }

    res.json({ success: true, message: 'Kupon berhasil diperbarui.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memperbarui kupon.' });
  }
});

app.delete('/api/coupons/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM coupons WHERE id_coupon = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Kupon tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Kupon berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menghapus kupon.' });
  }
});

// 6. Notifikasi In-App
app.get('/api/notifications', verifyToken, async (req, res) => {
  const { role, id_pelanggan } = req.user;
  try {
    let sql = 'SELECT id_notification, title, message, link, is_read, created_at FROM notifications WHERE role = ? OR role = ?';
    let params = [role, 'all'];
    if (role === 'pelanggan') {
      sql += ' OR id_pelanggan = ?';
      params.push(id_pelanggan);
    }
    sql += ' ORDER BY created_at DESC LIMIT 50';
    const [notifications] = await db.query(sql, params);
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil notifikasi.' });
  }
});

app.put('/api/notifications/:id/read', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('UPDATE notifications SET is_read = 1 WHERE id_notification = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notifikasi tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Notifikasi ditandai sudah dibaca.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memperbarui notifikasi.' });
  }
});

// 7. Support Ticket Pelanggan
app.post('/api/support/tickets', verifyToken, async (req, res) => {
  const { subject, message, priority } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ message: 'Subjek dan pesan wajib diisi.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO support_tickets (id_pelanggan, subject, message, priority) VALUES (?, ?, ?, ?)',
      [req.user.id_pelanggan, subject, message, priority || 'Normal']
    );

    await createNotification({
      role: 'admin',
      title: 'Tiket Dukungan Baru',
      message: `Pelanggan ${req.user.nama} mengirim tiket baru: ${subject}`,
      link: '/dashboard-admin.html?tab=pelanggan'
    });

    res.status(201).json({ success: true, message: 'Tiket dukungan berhasil dikirim.', id_ticket: result.insertId });
  } catch (error) {
    console.error(error);
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

    const [tickets] = await db.query(
      'SELECT * FROM support_tickets WHERE id_pelanggan = ? ORDER BY updated_at DESC',
      [id_pelanggan]
    );
    res.json(tickets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil tiket dukungan.' });
  }
});

app.put('/api/support/tickets/:id/status', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Status tiket tidak valid.' });
  }

  try {
    const [result] = await db.query('UPDATE support_tickets SET status = ? WHERE id_ticket = ?', [status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Tiket tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Status tiket berhasil diperbarui.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memperbarui status tiket.' });
  }
});

// 8. Update Status Pesanan (Admin Only)
app.put('/api/orders/:id/status', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status_pesanan } = req.body;

  const validStatuses = ['Pending', 'Diproses', 'Dicetak', 'Dikirim', 'Selesai', 'Dibatalkan'];
  if (!validStatuses.includes(status_pesanan)) {
    return res.status(400).json({ message: 'Status pesanan tidak valid.' });
  }

  try {
    const [orderRows] = await db.query('SELECT id_pelanggan FROM pesanan WHERE id_pesanan = ?', [id]);
    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan.' });
    }

    const customerId = orderRows[0].id_pelanggan;
    const [result] = await db.query('UPDATE pesanan SET status_pesanan = ? WHERE id_pesanan = ?', [status_pesanan, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan.' });
    }

    await insertOrderStatusHistory(id, status_pesanan, `Status diperbarui menjadi ${status_pesanan}.`);
    await createNotification({
      id_pelanggan: customerId,
      role: 'pelanggan',
      title: 'Status Pesanan Diperbarui',
      message: `Pesanan #TR-${id} sekarang ${status_pesanan}.`,
      link: '/dashboard-pelanggan.html?tab=riwayat'
    });

    res.json({ success: true, message: `Status pesanan berhasil diubah menjadi ${status_pesanan}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memperbarui status pesanan.' });
  }
});

// 9. Update Status Pembayaran Pesanan (Admin Only)
app.put('/api/orders/:id/payment-status', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { payment_status } = req.body;
  const validStatuses = ['Belum Bayar', 'Menunggu Konfirmasi', 'Lunas'];
  if (!validStatuses.includes(payment_status)) {
    return res.status(400).json({ message: 'Status pembayaran tidak valid.' });
  }

  try {
    const [orderRows] = await db.query('SELECT id_pelanggan FROM pesanan WHERE id_pesanan = ?', [id]);
    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan.' });
    }
    const customerId = orderRows[0].id_pelanggan;
    const [result] = await db.query('UPDATE pesanan SET payment_status = ? WHERE id_pesanan = ?', [payment_status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan.' });
    }

    await createNotification({
      id_pelanggan: customerId,
      role: 'pelanggan',
      title: 'Status Pembayaran Diperbarui',
      message: `Pembayaran untuk pesanan #TR-${id} sekarang ${payment_status}.`,
      link: '/dashboard-pelanggan.html?tab=riwayat'
    });

    res.json({ success: true, message: `Status pembayaran berhasil diubah menjadi ${payment_status}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memperbarui status pembayaran.' });
  }
});

// 3. Update Status Pesanan (Admin Only)
app.put('/api/orders/:id/status', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status_pesanan } = req.body;

  const validStatuses = ['Pending', 'Diproses', 'Selesai', 'Dibatalkan'];
  if (!validStatuses.includes(status_pesanan)) {
    return res.status(400).json({ message: 'Status pesanan tidak valid.' });
  }

  try {
    const [result] = await db.query('UPDATE pesanan SET status_pesanan = ? WHERE id_pesanan = ?', [
      status_pesanan,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan.' });
    }

    res.json({ success: true, message: `Status pesanan berhasil diubah menjadi ${status_pesanan}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memperbarui status pesanan.' });
  }
});

// 4. Upload Bukti Pembayaran (Pelanggan Only)
app.post('/api/orders/:id/bukti-pembayaran', verifyToken, uploadPembayaran.single('bukti_pembayaran'), async (req, res) => {
  const { id } = req.params;
  const id_pelanggan = req.user.id_pelanggan;

  if (!req.file) {
    return res.status(400).json({ message: 'Bukti pembayaran wajib diunggah.' });
  }

  try {
    const [result] = await db.query(
      'UPDATE pesanan SET bukti_pembayaran = ? WHERE id_pesanan = ? AND id_pelanggan = ?',
      [req.file.filename, id, id_pelanggan]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan atau Anda tidak berhak.' });
    }

    res.json({
      success: true,
      message: 'Bukti pembayaran berhasil diunggah.',
      filename: req.file.filename
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengunggah bukti pembayaran.' });
  }
});


// ==========================================
// API PELANGGAN (ADMIN ONLY)
// ==========================================

// 1. Get Semua Pelanggan (Admin Only)
app.get('/api/customers', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [customers] = await db.query(
      'SELECT id_pelanggan, nama_pelanggan, email, no_telepon, alamat, role, created_at FROM pelanggan ORDER BY id_pelanggan DESC'
    );
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil data pelanggan.' });
  }
});


// ==========================================
// API CHAT / LIVE MESSAGE

// 1. Get Semua Percakapan Chat (Admin Only)
app.get('/api/chat/conversations', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [conversations] = await db.query(`
      SELECT
        cm.id_pelanggan,
        pl.nama_pelanggan,
        pl.email,
        MAX(cm.waktu) AS last_time,
        SUM(CASE WHEN cm.ke = 'admin' AND cm.dibaca = 0 THEN 1 ELSE 0 END) AS unread_count
      FROM chat_messages cm
      JOIN pelanggan pl ON cm.id_pelanggan = pl.id_pelanggan
      GROUP BY cm.id_pelanggan
      ORDER BY last_time DESC
    `);

    res.json(conversations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil daftar percakapan.' });
  }
});

// 2. Get Pesan Chat untuk Customer tertentu
app.get('/api/chat/messages/:customerId', verifyToken, async (req, res) => {
  const { role, id_pelanggan } = req.user;
  const customerId = parseInt(req.params.customerId, 10);

  if (role === 'pelanggan' && customerId !== id_pelanggan) {
    return res.status(403).json({ message: 'Akses chat tidak diizinkan.' });
  }

  try {
    const [messages] = await db.query(
      'SELECT * FROM chat_messages WHERE id_pelanggan = ? ORDER BY waktu ASC',
      [customerId]
    );

    const recipientKey = role === 'admin' ? 'admin' : `pelanggan:${customerId}`;
    await db.query(
      'UPDATE chat_messages SET dibaca = 1 WHERE id_pelanggan = ? AND ke = ? AND dibaca = 0',
      [customerId, recipientKey]
    );

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil pesan chat.' });
  }
});

// 3. Get unread chat count for customer
app.get('/api/chat/unread', verifyToken, async (req, res) => {
  const { role, id_pelanggan } = req.user;
  if (role !== 'pelanggan') {
    return res.status(403).json({ message: 'Hanya pelanggan yang dapat melihat notifikasi chat ini.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT COUNT(*) AS total FROM chat_messages WHERE id_pelanggan = ? AND ke = ? AND dibaca = 0',
      [id_pelanggan, `pelanggan:${id_pelanggan}`]
    );

    res.json({ unread: rows[0].total || 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil jumlah chat belum dibaca.' });
  }
});

// 4. Kirim Pesan Chat
app.post('/api/chat/messages', verifyToken, async (req, res) => {
  const { message, customerId } = req.body;
  const { role, id_pelanggan } = req.user;

  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'Pesan tidak boleh kosong.' });
  }

  let targetCustomerId;
  let dari;
  let ke;

  if (role === 'pelanggan') {
    targetCustomerId = id_pelanggan;
    dari = `pelanggan:${id_pelanggan}`;
    ke = 'admin';
  } else {
    targetCustomerId = parseInt(customerId, 10);
    if (!targetCustomerId) {
      return res.status(400).json({ message: 'Customer ID harus diberikan untuk admin.' });
    }

    const [customerRows] = await db.query('SELECT id_pelanggan FROM pelanggan WHERE id_pelanggan = ?', [targetCustomerId]);
    if (customerRows.length === 0) {
      return res.status(404).json({ message: 'Pelanggan tidak ditemukan.' });
    }

    dari = 'admin';
    ke = `pelanggan:${targetCustomerId}`;
  }

  try {
    await db.query(
      'INSERT INTO chat_messages (dari, ke, pesan, id_pelanggan, pengirim_role) VALUES (?, ?, ?, ?, ?)',
      [dari, ke, message.trim(), targetCustomerId, role]
    );

    res.status(201).json({ success: true, message: 'Pesan chat berhasil dikirim.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengirim pesan chat.' });
  }
});


// ==========================================
// API STATISTIK (DASHBOARD ADMIN STATS)
// ==========================================

app.get('/api/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Total Pendapatan (dari pesanan dengan status 'Selesai' atau semuanya)
    // Mari hitung pendapatan dari pesanan yang tidak dibatalkan
    const [revenueRes] = await db.query("SELECT SUM(total_harga) AS total FROM pesanan WHERE status_pesanan != 'Dibatalkan'");
    const totalRevenue = revenueRes[0].total || 0;

    // Total Pesanan
    const [ordersRes] = await db.query('SELECT COUNT(*) AS total FROM pesanan');
    const totalOrders = ordersRes[0].total || 0;

    // Total Produk
    const [productsRes] = await db.query('SELECT COUNT(*) AS total FROM produk');
    const totalProducts = productsRes[0].total || 0;

    // Total Pelanggan
    const [customersRes] = await db.query("SELECT COUNT(*) AS total FROM pelanggan WHERE role = 'pelanggan'");
    const totalCustomers = customersRes[0].total || 0;

    // Statistik bulanan sederhana (untuk chart / list visual)
    const [recentSales] = await db.query(`
      SELECT 
        DATE_FORMAT(tanggal_pesanan, '%d %b') AS label, 
        SUM(total_harga) AS value 
      FROM pesanan 
      WHERE status_pesanan != 'Dibatalkan'
      GROUP BY DATE_FORMAT(tanggal_pesanan, '%Y-%m-%d')
      ORDER BY tanggal_pesanan DESC 
      LIMIT 7
    `);

    res.json({
      totalRevenue,
      totalOrders,
      totalProducts,
      totalCustomers,
      recentSales: recentSales.reverse()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil data statistik.' });
  }
});

// Arahkan semua request non-API lainnya ke index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Jalankan Server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
