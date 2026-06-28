-- Hapus database jika sudah ada
DROP DATABASE IF EXISTS cetak_stiker;

-- Buat database baru
CREATE DATABASE cetak_stiker;
USE cetak_stiker;

-- 1. Tabel Pelanggan
CREATE TABLE pelanggan (
    id_pelanggan INT AUTO_INCREMENT PRIMARY KEY,
    nama_pelanggan VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    no_telepon VARCHAR(20),
    alamat TEXT,
    role ENUM('pelanggan', 'admin') DEFAULT 'pelanggan',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel Produk (Stiker)
CREATE TABLE produk (
    id_produk INT AUTO_INCREMENT PRIMARY KEY,
    nama_produk VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    harga_per_pcs DECIMAL(10, 2) NOT NULL,
    min_order INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabel Pesanan
CREATE TABLE pesanan (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabel Detail Pesanan
CREATE TABLE detail_pesanan (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabel Chat Messages untuk Live Chat Pelanggan dan Admin
CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dari VARCHAR(100) NOT NULL,
    ke VARCHAR(100) NOT NULL,
    pesan TEXT NOT NULL,
    waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dibaca TINYINT(1) DEFAULT 0,
    id_pelanggan INT NOT NULL,
    pengirim_role ENUM('pelanggan', 'admin') NOT NULL,
    FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id_pelanggan) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Tabel Kupon Diskon
CREATE TABLE coupons (
    id_coupon INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(12, 2) DEFAULT 0.00,
    usage_limit INT DEFAULT 0,
    used_count INT DEFAULT 0,
    expires_at DATETIME DEFAULT NULL,
    active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Tabel Riwayat Status Pesanan
CREATE TABLE order_status_history (
    id_history INT AUTO_INCREMENT PRIMARY KEY,
    id_pesanan INT NOT NULL,
    status_pesanan ENUM('Pending', 'Diproses', 'Dicetak', 'Dikirim', 'Selesai', 'Dibatalkan') NOT NULL,
    catatan TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pesanan) REFERENCES pesanan(id_pesanan) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Tabel Tiket Dukungan Pelanggan
CREATE TABLE support_tickets (
    id_ticket INT AUTO_INCREMENT PRIMARY KEY,
    id_pelanggan INT NOT NULL,
    subject VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('Open', 'In Progress', 'Resolved', 'Closed') DEFAULT 'Open',
    priority ENUM('Normal', 'High', 'Urgent') DEFAULT 'Normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id_pelanggan) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Tabel Notifikasi In-App
CREATE TABLE notifications (
    id_notification INT AUTO_INCREMENT PRIMARY KEY,
    id_pelanggan INT DEFAULT NULL,
    role ENUM('admin', 'pelanggan', 'all') DEFAULT 'all',
    title VARCHAR(120) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255) DEFAULT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id_pelanggan) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SEED DATA AWAL

-- 1. Pelanggan & Admin
-- Password terenkripsi bcrypt untuk:
-- admin@cetakstiker.com -> 'admin123' -> $2a$10$3MHjHCAhQcC3ef5xcKGUHuTDc9B8TWytNzJuuDSVNhki25w8tax0K
-- budi@gmail.com -> 'user123' -> $2a$10$3MHjHCAhQcC3ef5xcKGUHu/2L0QM3jXkWk03lhwB/ML0PDeIhXvg.
INSERT INTO pelanggan (nama_pelanggan, email, password, no_telepon, alamat, role) VALUES
('Admin Utama Percetakan', 'admin@cetakstiker.com', '$2a$10$3MHjHCAhQcC3ef5xcKGUHuTDc9B8TWytNzJuuDSVNhki25w8tax0K', '081234567890', 'Kantor Percetakan Stiker, Jl. Raya No. 12', 'admin'),
('Budi Cahyono', 'budi@gmail.com', '$2a$10$3MHjHCAhQcC3ef5xcKGUHu/2L0QM3jXkWk03lhwB/ML0PDeIhXvg.', '089876543210', 'Perumahan Indah Permai Blok B-5, Jakarta', 'pelanggan');

-- 2. Produk Stiker
INSERT INTO produk (nama_produk, deskripsi, harga_per_pcs, min_order) VALUES
('Stiker Vinyl Glossy A3+', 'Stiker berbahan plastik anti air dengan permukaan mengkilap (glossy). Sangat cocok untuk label kemasan makanan/minuman dingin atau outdoor.', 12000.00, 5),
('Stiker Vinyl Matte/Doff A3+', 'Stiker anti air berbahan plastik dengan tampilan permukaan redup/doff yang elegan. Cocok untuk produk kosmetik premium.', 13000.00, 5),
('Stiker Chromo A3+', 'Stiker berbahan kertas dengan permukaan semi-glossy. Pilihan ekonomis untuk label kemasan kering (tidak terkena air/minyak).', 7000.00, 5),
('Stiker HVS A3+', 'Stiker berbahan kertas biasa yang bisa ditulis dengan pulpen. Cocok untuk stiker alamat pengiriman atau label inventaris ruangan.', 6000.00, 5),
('Stiker Hologram Premium A3+', 'Stiker plastik dengan efek pelangi/hologram yang memantulkan cahaya. Memberikan kesan futuristik dan proteksi eksklusif produk.', 25000.00, 10),
('Stiker Kraft Coklat A3+', 'Stiker kertas daur ulang berwarna coklat bertekstur. Sangat pas untuk produk ramah lingkungan (eco-friendly) atau bernuansa vintage.', 9000.00, 5),
('Stiker Transparan A3+', 'Stiker plastik bening yang tembus pandang. Bagus untuk botol kaca bening agar warna cairan di dalamnya tetap terlihat jelas.', 14000.00, 5);

-- 3. Pesanan Contoh
INSERT INTO pesanan (id_pelanggan, status_pesanan, total_harga, catatan) VALUES
(2, 'Pending', 60000.00, 'Potong die cut bentuk lingkaran diameter 5cm.');

-- 4. Detail Pesanan Contoh
INSERT INTO detail_pesanan (id_pesanan, id_produk, jumlah, subtotal) VALUES
(1, 1, 5, 60000.00);
