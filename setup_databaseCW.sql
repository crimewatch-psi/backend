-- Hapus tabel jika sudah ada
DROP TABLE IF EXISTS `data_kriminal`;
DROP TABLE IF EXISTS `heatmap`;
DROP TABLE IF EXISTS `user`;

-- MEMBUAT STRUKTUR TABEL

-- Tabel: user
CREATE TABLE `user` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `nama` VARCHAR(255),
  `email` VARCHAR(255) UNIQUE,
  `password` VARCHAR(255),
  `role` ENUM('admin', 'manager', 'polri'),
  `status` ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabel: manager_details
CREATE TABLE `manager_details` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `organization` VARCHAR(255) NOT NULL,
  `location_url` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_manager` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabel: heatmap
CREATE TABLE `heatmap` (
  `mapid` INT PRIMARY KEY AUTO_INCREMENT,
  `nama_lokasi` VARCHAR(255),
  `latitude` FLOAT,
  `longitude` FLOAT,
  `gmaps_url` TEXT,
  `status` ENUM('aktif', 'mati')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabel: data_kriminal
CREATE TABLE `data_kriminal` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `mapid` INT,
  `jenis_kejahatan` VARCHAR(255),
  `waktu` TIMESTAMP,
  `deskripsi` TEXT,
  FOREIGN KEY (`mapid`) REFERENCES `heatmap`(`mapid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- (SEEDING)

-- Mengisi tabel 'user'
INSERT INTO `user` (`id`, `nama`, `email`, `password`, `role`) VALUES
(1, 'Afifuddin Mahfud', 'afifuddin.m@example.com', 'password123', 'admin'),
(2, 'Amelia Zakiya Sabrina', 'amelia.zs@example.com', 'password123', 'manager'),
(3, 'Arvindra Ahmad Ramadhan', 'arvindra.ar@example.com', 'password123', 'manager'),
(4, 'Muhammad Radja Fikri Nafis', 'radja.fn@example.com', 'password123', 'manager'),
(5, 'Fawwaz Akbar Wibowo', 'fawwaz.aw@example.com', 'password123', 'manager'),
(6, 'Polisi Pariwisata DIY', 'polpar.diy@example.com', 'password123', 'polri');

-- Mengisi tabel 'manager_details'
INSERT INTO `manager_details` (`user_id`, `organization`, `location_url`) VALUES
(2, 'Wisata Malioboro', 'https://maps.app.goo.gl/fogdpdpdStaskSkz5'),
(3, 'Wisata Candi Prambanan', 'https://maps.app.goo.gl/jSVj35B4564SBjLV7'),
(4, 'Wisata Alun-Alun Kidul', 'https://maps.app.goo.gl/5sdEdxKKYdhxUZkH8'),
(5, 'Wisata Titik Nol', 'https://maps.app.goo.gl/PLa3bEhKqJXsmAv9');

-- Mengisi tabel 'heatmap'
INSERT INTO `heatmap` (`mapid`, `nama_lokasi`, `latitude`, `longitude`, `gmaps_url`, `status`) VALUES
(1, 'Jalan Malioboro', -7.7924, 110.3659, 'https://maps.app.goo.gl/fogdpdpdStaskSkz5', 'aktif'),
(2, 'Kawasan Candi Prambanan', -7.7520, 110.4915, 'https://maps.app.goo.gl/jSVj35B4564SBjLV7', 'aktif'),
(3, 'Alun-Alun Kidul Yogyakarta', -7.8124, 110.3638, 'https://maps.app.goo.gl/5sdEdxKKYdhxUZkH8', 'aktif'),
(4, 'Titik Nol Kilometer Yogyakarta', -7.7998, 110.3657, 'https://maps.app.goo.gl/PLa3bEhKqJXsmAv9', 'aktif');

-- Mengisi tabel 'data_kriminal'
-- Data untuk Jalan Malioboro (mapid=1)
INSERT INTO `data_kriminal` (`mapid`, `jenis_kejahatan`, `waktu`, `deskripsi`) VALUES
(1, 'Pencopetan', '2023-07-15 19:30:00', 'Seorang wisatawan kehilangan dompet di tengah keramaian. Pelaku tidak teridentifikasi.'),
(1, 'Penipuan', '2023-09-22 14:00:00', 'Wisatawan ditawari paket tur palsu oleh oknum tidak bertanggung jawab.'),
(1, 'Pencopetan', '2024-01-05 20:00:00', 'Laporan kehilangan ponsel di dekat area pedagang kaki lima.'),
(1, 'Jambret', '2022-11-20 20:15:00', 'Tas selempang milik pengunjung ditarik oleh pengendara motor yang melintas cepat.'),
(1, 'Pemalakan', '2023-02-18 21:00:00', 'Sekelompok oknum meminta uang secara paksa kepada pedagang kaki lima.'),
(1, 'Hipnotis (Gendam)', '2023-04-05 15:30:00', 'Wisatawan tidak sadar menyerahkan perhiasan setelah diajak bicara oleh orang tak dikenal.'),
(1, 'Pencurian', '2023-06-25 19:45:00', 'Barang belanjaan hilang dari kantong saat suasana sangat ramai.'),
(1, 'Vandalisme', '2023-10-11 02:00:00', 'Coretan cat semprot ditemukan di beberapa bangku taman umum.'),
(1, 'Perkelahian', '2024-02-14 23:00:00', 'Keributan antar dua kelompok pemuda di area angkringan.'),
(1, 'Penipuan', '2024-04-22 11:00:00', 'Oknum menawarkan jasa foto dengan tarif tidak wajar dan memaksa.');

-- Data untuk Kawasan Candi Prambanan (mapid=2)
INSERT INTO `data_kriminal` (`mapid`, `jenis_kejahatan`, `waktu`, `deskripsi`) VALUES
(2, 'Pencurian Barang Bawaan', '2023-08-10 11:45:00', 'Tas pengunjung hilang saat ditinggal untuk berfoto.'),
(2, 'Pencurian Kendaraan Bermotor', '2022-12-15 14:00:00', 'Satu unit sepeda motor hilang di area parkir resmi.'),
(2, 'Penipuan Tiket', '2023-01-29 10:30:00', 'Upaya penjualan tiket masuk palsu di dekat pintu masuk.'),
(2, 'Pencurian', '2023-03-17 12:00:00', 'Kamera milik pengunjung hilang saat diletakkan di gazebo untuk beristirahat.'),
(2, 'Pemalakan', '2023-05-21 16:00:00', 'Oknum mengaku petugas meminta bayaran parkir tambahan dengan alasan tidak jelas.'),
(2, 'Pencopetan', '2023-07-08 11:00:00', 'Dompet hilang saat berdesakan di area relief candi.'),
(2, 'Jambret', '2023-09-02 15:45:00', 'Ponsel pengunjung dirampas saat sedang mengambil foto selfie.'),
(2, 'Pencurian Barang Bawaan', '2024-01-20 13:15:00', 'Tas yang berisi laptop hilang dari dalam mobil yang diparkir.'),
(2, 'Hipnotis (Gendam)', '2024-03-30 14:20:00', 'Wisatawan asing melaporkan kehilangan uang tunai setelah didekati oleh sekelompok orang.'),
(2, 'Vandalisme', '2024-05-18 17:00:00', 'Ditemukan goresan pada salah satu batu candi di area terluar.');

-- Data untuk Alun-Alun Kidul Yogyakarta (mapid=3)
INSERT INTO `data_kriminal` (`mapid`, `jenis_kejahatan`, `waktu`, `deskripsi`) VALUES
(3, 'Pencurian Kendaraan Bermotor', '2023-11-30 22:10:00', 'Satu unit sepeda motor dilaporkan hilang dari area parkir.'),
(3, 'Pencopetan', '2024-03-12 21:00:00', 'Pengunjung kehilangan dompet saat sedang menikmati suasana malam.'),
(3, 'Perkelahian', '2023-02-25 23:30:00', 'Adu mulut yang berujung perkelahian antar pengunjung di dekat pohon beringin kembar.'),
(3, 'Pencurian', '2023-04-14 21:45:00', 'Helm standar pabrikan hilang dari atas sepeda motor.'),
(3, 'Penipuan', '2023-06-10 22:00:00', 'Penipuan berkedok sewa sepeda hias tandem dengan tarif yang sangat tinggi.'),
(3, 'Pemalakan', '2023-08-19 01:00:00', 'Pengamen memaksa meminta uang dengan jumlah tertentu kepada pengunjung.'),
(3, 'Vandalisme', '2023-11-04 03:00:00', 'Fasilitas tempat duduk umum dirusak oleh orang tidak dikenal.'),
(3, 'Jambret', '2024-02-17 22:45:00', 'Kalung milik seorang ibu dirampas oleh pengendara motor.'),
(3, 'Pencopetan', '2024-04-06 21:00:00', 'Ponsel hilang dari saku celana saat sedang ramai pengunjung.'),
(3, 'Pencurian Kendaraan Bermotor', '2024-05-25 23:50:00', 'Upaya pencurian sepeda motor berhasil digagalkan oleh petugas keamanan.');

-- Data untuk Titik Nol Kilometer Yogyakarta (mapid=4)
INSERT INTO `data_kriminal` (`mapid`, `jenis_kejahatan`, `waktu`, `deskripsi`) VALUES
(4, 'Penipuan', '2024-05-20 16:20:00', 'Modus penjualan souvenir dengan harga tidak wajar kepada wisatawan asing.'),
(4, 'Pencopetan', '2022-12-31 22:30:00', 'Banyak laporan kehilangan dompet dan ponsel saat perayaan malam tahun baru.'),
(4, 'Jambret', '2023-03-25 20:00:00', 'Tas tangan wisatawan dijambret saat sedang berjalan kaki di trotoar.'),
(4, 'Hipnotis (Gendam)', '2023-05-14 16:00:00', 'Seorang mahasiswa mengaku kehilangan laptop setelah ditepuk pundaknya oleh orang asing.'),
(4, 'Perkelahian', '2023-07-22 23:15:00', 'Keributan terjadi antara dua kelompok remaja di area Monumen Serangan Umum 1 Maret.'),
(4, 'Pemalakan', '2023-09-16 19:30:00', 'Oknum berpura-pura menjadi "manusia silver" dan memaksa meminta uang.'),
(4, 'Pencurian', '2024-02-10 21:00:00', 'Beberapa pengunjung melaporkan kehilangan helm di area parkir sekitar.'),
(4, 'Vandalisme', '2024-04-13 01:30:00', 'Sampah sengaja dibuang sembarangan dan merusak tanaman hias oleh sekelompok orang.'),
(4, 'Pencopetan', '2024-05-11 19:00:00', 'Wisatawan kehilangan kacamata dan ponsel saat asyik menonton pertunjukan seni jalanan.'),
(4, 'Penipuan', '2024-06-01 17:00:00', 'Modus sumbangan palsu yang mengatasnamakan panti asuhan.');
