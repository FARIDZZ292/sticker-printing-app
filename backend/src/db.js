const mysql = require('mysql2/promise');
require('dotenv').config();

const isVercel = process.env.VERCEL === '1' || process.env.NOW_BUILDER;
const databaseName = isVercel
  ? (process.env.DB_NAME === 'cetak_stiker' || !process.env.DB_NAME ? 'defaultdb' : process.env.DB_NAME)
  : (process.env.DB_NAME || 'cetak_stiker');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: databaseName,
  port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306'),
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
