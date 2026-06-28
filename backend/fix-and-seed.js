const db = require('./src/db');
require('dotenv').config();

async function fix() {
  // 1. Fix ENUM status_pesanan - add Dicetak & Dikirim
  await db.query(
    "ALTER TABLE pesanan MODIFY COLUMN status_pesanan ENUM('Pending','Diproses','Dicetak','Dikirim','Selesai','Dibatalkan') DEFAULT 'Pending'"
  );
  console.log('✅ ENUM status_pesanan diperbaiki');

  // 2. Add 20 new sticker products
  const products = [
    ['Stiker Vinyl Glossy A4', 'Stiker plastik anti air glossy ukuran A4, cocok untuk label kemasan dan promosi outdoor.', 9500, 10],
    ['Stiker Vinyl Matte A4', 'Stiker plastik matte anti air ukuran A4, tampilan elegan untuk produk premium.', 10500, 10],
    ['Stiker Cutting Custom', 'Stiker potong sesuai bentuk desain, tanpa background. Cocok untuk branding kendaraan dan laptop.', 8000, 20],
    ['Stiker Bumper Besar', 'Stiker ukuran besar untuk bumper mobil atau motor, bahan vinyl outdoor tahan UV.', 18000, 5],
    ['Stiker Label Kemasan Bulat', 'Stiker label berbentuk lingkaran untuk kemasan produk UMKM, tersedia diameter 5-10 cm.', 7500, 50],
    ['Stiker Barcode & QR Code', 'Stiker barcode atau QR code untuk inventaris dan produk retail.', 5000, 100],
    ['Stiker Foil Emas', 'Stiker laminasi foil warna emas mengkilap, kesan mewah untuk kemasan hadiah dan sertifikat.', 20000, 5],
    ['Stiker Foil Perak', 'Stiker laminasi foil warna perak mengkilap, kesan premium untuk produk kosmetik dan fashion.', 20000, 5],
    ['Stiker Emboss Timbul', 'Stiker dengan efek timbul (emboss) 3D, berkesan premium dan eksklusif.', 28000, 5],
    ['Stiker Glow in the Dark', 'Stiker menyala dalam gelap, cocok untuk dekorasi, helm, dan keperluan keselamatan.', 22000, 10],
    ['Stiker Transparan A4', 'Stiker bening/transparan A4, cocok untuk botol kaca dan kemasan modern.', 11000, 10],
    ['Stiker Resin Epoxy 3D', 'Stiker dilapisi resin epoxy, menghasilkan efek kubah 3D yang tebal dan tahan gores.', 35000, 5],
    ['Stiker Magnetic (Kulkas)', 'Stiker berbahan magnet, mudah ditempel dan dilepas, cocok untuk kulkas dan papan besi.', 15000, 10],
    ['Stiker Floor/Lantai', 'Stiker untuk lantai dengan permukaan anti slip, cocok untuk navigasi toko dan pameran.', 30000, 5],
    ['Stiker Dinding (Wallsticker)', 'Stiker untuk dinding interior, mudah dipasang dan tidak merusak cat dinding.', 12000, 5],
    ['Stiker Seal Garansi', 'Stiker segel garansi produk yang rusak jika dibuka paksa, perlindungan produk elektronik.', 6000, 50],
    ['Stiker Kemasan Kotak (Box)', 'Stiker kemasan untuk box produk, ukuran custom sesuai kebutuhan kemasan.', 8500, 20],
    ['Stiker Numbering/Penomoran', 'Stiker nomor urut untuk inventaris, tiket, atau keperluan acara.', 4500, 100],
    ['Stiker Papan Nama Kantor', 'Stiker vinyl untuk papan nama ruangan kantor, tulisan jelas dan tahan lama.', 25000, 2],
    ['Stiker Pack Aesthetic Mix', 'Paket 20 stiker aesthetic campuran berbagai desain tren: aesthetic, vintage, quotes, dan karakter.', 35000, 1],
  ];

  let added = 0;
  for (const [nama, deskripsi, harga, min] of products) {
    const [existing] = await db.query('SELECT id_produk FROM produk WHERE nama_produk = ?', [nama]);
    if (existing.length === 0) {
      await db.query(
        'INSERT INTO produk (nama_produk, deskripsi, harga_per_pcs, min_order) VALUES (?, ?, ?, ?)',
        [nama, deskripsi, harga, min]
      );
      added++;
      console.log('  + ' + nama);
    }
  }
  console.log(`✅ ${added} produk baru berhasil ditambahkan`);
}

module.exports = fix;

if (require.main === module) {
  fix()
    .then(() => process.exit(0))
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}
