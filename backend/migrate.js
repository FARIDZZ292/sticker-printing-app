const db = require('./src/db');
require('dotenv').config();

async function migrate() {
  console.log('Running full migration...');

  const sqls = [
    // 1. pelanggan
    `CREATE TABLE IF NOT EXISTS pelanggan (
        id_pelanggan INT AUTO_INCREMENT PRIMARY KEY,
        nama_pelanggan VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        no_telepon VARCHAR(20),
        alamat TEXT,
        role ENUM('pelanggan', 'admin') DEFAULT 'pelanggan',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // 2. produk
    `CREATE TABLE IF NOT EXISTS produk (
        id_produk INT AUTO_INCREMENT PRIMARY KEY,
        nama_produk VARCHAR(100) NOT NULL,
        deskripsi TEXT,
        harga_per_pcs DECIMAL(10, 2) NOT NULL,
        min_order INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // 3. pesanan
    `CREATE TABLE IF NOT EXISTS pesanan (
        id_pesanan INT AUTO_INCREMENT PRIMARY KEY,
        id_pelanggan INT NOT NULL,
        tanggal_pesanan TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status_pesanan ENUM('Pending', 'Diproses', 'Dicetak', 'Dikirim', 'Selesai', 'Dibatalkan') DEFAULT 'Pending',
        payment_status ENUM('Belum Bayar', 'Menunggu Konfirmasi', 'Lunas') DEFAULT 'Belum Bayar',
        payment_method VARCHAR(50) DEFAULT 'Transfer Bank',
        coupon_code VARCHAR(50) DEFAULT NULL,
        discount_amount DECIMAL(12, 2) DEFAULT 0.00,
        total_harga DECIMAL(12, 2) DEFAULT 0.00,
        catatan TEXT,
        bukti_pembayaran VARCHAR(255) DEFAULT NULL,
        FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id_pelanggan) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // 4. detail_pesanan
    `CREATE TABLE IF NOT EXISTS detail_pesanan (
        id_detail INT AUTO_INCREMENT PRIMARY KEY,
        id_pesanan INT NOT NULL,
        id_produk INT NOT NULL,
        jumlah INT NOT NULL,
        subtotal DECIMAL(12, 2) NOT NULL,
        file_desain VARCHAR(255) DEFAULT NULL,
        panjang DECIMAL(5,2) DEFAULT 5.00,
        lebar DECIMAL(5,2) DEFAULT 5.00,
        FOREIGN KEY (id_pesanan) REFERENCES pesanan(id_pesanan) ON DELETE CASCADE,
        FOREIGN KEY (id_produk) REFERENCES produk(id_produk) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // 5. order_status_history
    `CREATE TABLE IF NOT EXISTS order_status_history (
      id_history INT AUTO_INCREMENT PRIMARY KEY,
      id_pesanan INT NOT NULL,
      status_pesanan ENUM('Pending','Diproses','Dicetak','Dikirim','Selesai','Dibatalkan') NOT NULL,
      catatan TEXT,
      changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_pesanan) REFERENCES pesanan(id_pesanan) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // 6. coupons
    `CREATE TABLE IF NOT EXISTS coupons (
      id_coupon INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      type ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
      discount_value DECIMAL(10,2) NOT NULL,
      min_order_amount DECIMAL(12,2) DEFAULT 0.00,
      usage_limit INT DEFAULT 0,
      used_count INT DEFAULT 0,
      expires_at DATETIME DEFAULT NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // 7. support_tickets
    `CREATE TABLE IF NOT EXISTS support_tickets (
      id_ticket INT AUTO_INCREMENT PRIMARY KEY,
      id_pelanggan INT NOT NULL,
      subject VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      status ENUM('Open','In Progress','Resolved','Closed') DEFAULT 'Open',
      priority ENUM('Normal','High','Urgent') DEFAULT 'Normal',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id_pelanggan) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // 8. notifications
    `CREATE TABLE IF NOT EXISTS notifications (
      id_notification INT AUTO_INCREMENT PRIMARY KEY,
      id_pelanggan INT DEFAULT NULL,
      role ENUM('admin','pelanggan','all') DEFAULT 'all',
      title VARCHAR(120) NOT NULL,
      message TEXT NOT NULL,
      link VARCHAR(255) DEFAULT NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // 9. chat_messages
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dari VARCHAR(100) NOT NULL,
      ke VARCHAR(100) NOT NULL,
      pesan TEXT NOT NULL,
      waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dibaca TINYINT(1) DEFAULT 0,
      id_pelanggan INT NOT NULL,
      pengirim_role ENUM('pelanggan','admin') NOT NULL,
      FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id_pelanggan) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // Fix ENUM columns
    `ALTER TABLE pesanan MODIFY COLUMN status_pesanan ENUM('Pending','Diproses','Dicetak','Dikirim','Selesai','Dibatalkan') DEFAULT 'Pending'`,

    // Add missing columns to pesanan
    `ALTER TABLE pesanan ADD COLUMN IF NOT EXISTS payment_status ENUM('Belum Bayar','Menunggu Konfirmasi','Lunas') DEFAULT 'Belum Bayar'`,
    `ALTER TABLE pesanan ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Transfer Bank'`,
    `ALTER TABLE pesanan ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50) DEFAULT NULL`,
    `ALTER TABLE pesanan ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0.00`,
    `ALTER TABLE pesanan ADD COLUMN IF NOT EXISTS bukti_pembayaran VARCHAR(255) DEFAULT NULL`,

    // Add missing columns to detail_pesanan
    `ALTER TABLE detail_pesanan ADD COLUMN IF NOT EXISTS file_desain VARCHAR(255) DEFAULT NULL`,
    `ALTER TABLE detail_pesanan ADD COLUMN IF NOT EXISTS panjang DECIMAL(5,2) DEFAULT 5.00`,
    `ALTER TABLE detail_pesanan ADD COLUMN IF NOT EXISTS lebar DECIMAL(5,2) DEFAULT 5.00`,
  ];

  for (const sql of sqls) {
    try {
      await db.query(sql);
      const label = sql.trim().substring(0, 55).replace(/\s+/g, ' ');
      console.log('  OK:', label + '...');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        // column already exists, skip
      } else {
        console.error('  ERR:', err.message);
      }
    }
  }

  console.log('Migration done!');
}

module.exports = migrate;

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });
}
