-- =================================================================
-- 1. MENGISI TABEL 'user'
-- =================================================================
INSERT INTO `user` (`id`, `nama`, `email`, `password`, `role`) VALUES
(1, 'Afifuddin Mahfud', 'afifuddin.m@example.com', 'password123', 'admin'),
(2, 'Amelia Zakiya Sabrina', 'amelia.zs@example.com', 'password123', 'manager'),
(3, 'Arvindra Ahmad Ramadhan', 'arvindra.ar@example.com', 'password123', 'manager'),
(4, 'Muhammad Radja Fikri Nafis', 'radja.fn@example.com', 'password123', 'manager'),
(5, 'Fawwaz Akbar Wibowo', 'fawwaz.aw@example.com', 'password123', 'manager'),
(6, 'Polisi Pariwisata DIY', 'polpar.diy@example.com', 'password123', 'polri');

-- =================================================================
-- 2. MENGISI TABEL 'heatmap'
-- =================================================================
INSERT INTO `heatmap` (`mapid`, `nama_lokasi`, `latitude`, `longitude`, `gmaps_url`, `status`) VALUES
(1, 'Jalan Malioboro', -7.7924, 110.3659, 'https://maps.app.goo.gl/fogdpdpdStaskSkz5', 'aktif'),
(2, 'Kawasan Candi Prambanan', -7.7520, 110.4915, 'https://maps.app.goo.gl/jSVj35B4564SBjLV7', 'aktif'),
(3, 'Alun-Alun Kidul Yogyakarta', -7.8124, 110.3638, 'https://maps.app.goo.gl/5sdEdxKKYdhxUZkH8', 'aktif'),
(4, 'Titik Nol Kilometer Yogyakarta', -7.7998, 110.3657, 'https://maps.app.goo.gl/PLa3bEhKqJXsmAv9', 'aktif');

-- =================================================================
-- 3. MENGISI TABEL 'data_kriminal'
-- =================================================================
INSERT INTO `data_kriminal` (`mapid`, `jenis_kejahatan`, `waktu`, `deskripsi`) VALUES
(1, 'Pencopetan', '2023-07-15 19:30:00', 'Seorang wisatawan kehilangan dompet di tengah keramaian. Pelaku tidak teridentifikasi.'),
(1, 'Penipuan', '2023-09-22 14:00:00', 'Wisatawan ditawari paket tur palsu oleh oknum tidak bertanggung jawab.'),
(1, 'Pencopetan', '2024-01-05 20:00:00', 'Laporan kehilangan ponsel di dekat area pedagang kaki lima.'),
(2, 'Pencurian Barang Bawaan', '2023-08-10 11:45:00', 'Tas pengunjung hilang saat ditinggal untuk berfoto.'),
(3, 'Pencurian Kendaraan Bermotor', '2023-11-30 22:10:00', 'Satu unit sepeda motor dilaporkan hilang dari area parkir.'),
(3, 'Pencopetan', '2024-03-12 21:00:00', 'Pengunjung kehilangan dompet saat sedang menikmati suasana malam.'),
(4, 'Penipuan', '2024-05-20 16:20:00', 'Modus penjualan souvenir dengan harga tidak wajar kepada wisatawan asing.');