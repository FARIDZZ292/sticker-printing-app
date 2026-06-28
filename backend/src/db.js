const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cetak_stiker',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Berhasil terhubung ke database MySQL.');
    connection.release();
  } catch (error) {
    console.error('❌ Gagal terhubung ke database MySQL:');
    console.error(error.message);
    console.log('👉 Pastikan XAMPP berjalan dan database "cetak_stiker" sudah diimport.');
  }
}

testConnection();

module.exports = pool;
