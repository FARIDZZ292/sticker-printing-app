const mysql = require('mysql2/promise');
require('dotenv').config();

// Buat pool koneksi ke database MySQL XAMPP
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cetak_stiker',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Fungsi untuk mengecek koneksi database saat start server
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Berhasil terhubung ke database MySQL (XAMPP/phpMyAdmin).');
    connection.release();
  } catch (error) {
    console.error('❌ Gagal terhubung ke database MySQL:');
    console.error(error.message);
    console.log('👉 Petunjuk: Pastikan XAMPP Anda sudah berjalan dan modul MySQL telah diaktifkan (START).');
    console.log('👉 Petunjuk: Pastikan Anda telah membuat database "cetak_stiker" dan mengimpor file "database.sql".');
  }
}

testConnection();

module.exports = pool;
