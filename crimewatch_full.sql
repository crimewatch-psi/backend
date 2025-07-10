-- MySQL dump 10.13  Distrib 8.0.42, for Linux (aarch64)
--
-- Host: localhost    Database: crimewatch
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `data_kriminal`
--

DROP TABLE IF EXISTS `data_kriminal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `data_kriminal` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mapid` int DEFAULT NULL,
  `jenis_kejahatan` varchar(255) DEFAULT NULL,
  `waktu` timestamp NULL DEFAULT NULL,
  `deskripsi` text,
  PRIMARY KEY (`id`),
  KEY `mapid` (`mapid`),
  CONSTRAINT `data_kriminal_ibfk_1` FOREIGN KEY (`mapid`) REFERENCES `heatmap` (`mapid`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `data_kriminal`
--

LOCK TABLES `data_kriminal` WRITE;
/*!40000 ALTER TABLE `data_kriminal` DISABLE KEYS */;
INSERT INTO `data_kriminal` VALUES (1,1,'Pencopetan','2023-07-15 19:30:00','Seorang wisatawan kehilangan dompet di tengah keramaian. Pelaku tidak teridentifikasi.'),(2,1,'Penipuan','2023-09-22 14:00:00','Wisatawan ditawari paket tur palsu oleh oknum tidak bertanggung jawab.'),(3,1,'Pencopetan','2024-01-05 20:00:00','Laporan kehilangan ponsel di dekat area pedagang kaki lima.'),(4,1,'Jambret','2022-11-20 20:15:00','Tas selempang milik pengunjung ditarik oleh pengendara motor yang melintas cepat.'),(5,1,'Pemalakan','2023-02-18 21:00:00','Sekelompok oknum meminta uang secara paksa kepada pedagang kaki lima.'),(6,1,'Hipnotis (Gendam)','2023-04-05 15:30:00','Wisatawan tidak sadar menyerahkan perhiasan setelah diajak bicara oleh orang tak dikenal.'),(7,1,'Pencurian','2023-06-25 19:45:00','Barang belanjaan hilang dari kantong saat suasana sangat ramai.'),(8,1,'Vandalisme','2023-10-11 02:00:00','Coretan cat semprot ditemukan di beberapa bangku taman umum.'),(9,1,'Perkelahian','2024-02-14 23:00:00','Keributan antar dua kelompok pemuda di area angkringan.'),(10,1,'Penipuan','2024-04-22 11:00:00','Oknum menawarkan jasa foto dengan tarif tidak wajar dan memaksa.'),(11,2,'Pencurian Barang Bawaan','2023-08-10 11:45:00','Tas pengunjung hilang saat ditinggal untuk berfoto.'),(12,2,'Pencurian Kendaraan Bermotor','2022-12-15 14:00:00','Satu unit sepeda motor hilang di area parkir resmi.'),(13,2,'Penipuan Tiket','2023-01-29 10:30:00','Upaya penjualan tiket masuk palsu di dekat pintu masuk.'),(14,2,'Pencurian','2023-03-17 12:00:00','Kamera milik pengunjung hilang saat diletakkan di gazebo untuk beristirahat.'),(15,2,'Pemalakan','2023-05-21 16:00:00','Oknum mengaku petugas meminta bayaran parkir tambahan dengan alasan tidak jelas.'),(16,2,'Pencopetan','2023-07-08 11:00:00','Dompet hilang saat berdesakan di area relief candi.'),(17,2,'Jambret','2023-09-02 15:45:00','Ponsel pengunjung dirampas saat sedang mengambil foto selfie.'),(18,2,'Pencurian Barang Bawaan','2024-01-20 13:15:00','Tas yang berisi laptop hilang dari dalam mobil yang diparkir.'),(19,2,'Hipnotis (Gendam)','2024-03-30 14:20:00','Wisatawan asing melaporkan kehilangan uang tunai setelah didekati oleh sekelompok orang.'),(20,2,'Vandalisme','2024-05-18 17:00:00','Ditemukan goresan pada salah satu batu candi di area terluar.'),(21,3,'Pencurian Kendaraan Bermotor','2023-11-30 22:10:00','Satu unit sepeda motor dilaporkan hilang dari area parkir.'),(22,3,'Pencopetan','2024-03-12 21:00:00','Pengunjung kehilangan dompet saat sedang menikmati suasana malam.'),(23,3,'Perkelahian','2023-02-25 23:30:00','Adu mulut yang berujung perkelahian antar pengunjung di dekat pohon beringin kembar.'),(24,3,'Pencurian','2023-04-14 21:45:00','Helm standar pabrikan hilang dari atas sepeda motor.'),(25,3,'Penipuan','2023-06-10 22:00:00','Penipuan berkedok sewa sepeda hias tandem dengan tarif yang sangat tinggi.'),(26,3,'Pemalakan','2023-08-19 01:00:00','Pengamen memaksa meminta uang dengan jumlah tertentu kepada pengunjung.'),(27,3,'Vandalisme','2023-11-04 03:00:00','Fasilitas tempat duduk umum dirusak oleh orang tidak dikenal.'),(28,3,'Jambret','2024-02-17 22:45:00','Kalung milik seorang ibu dirampas oleh pengendara motor.'),(29,3,'Pencopetan','2024-04-06 21:00:00','Ponsel hilang dari saku celana saat sedang ramai pengunjung.'),(30,3,'Pencurian Kendaraan Bermotor','2024-05-25 23:50:00','Upaya pencurian sepeda motor berhasil digagalkan oleh petugas keamanan.'),(31,4,'Penipuan','2024-05-20 16:20:00','Modus penjualan souvenir dengan harga tidak wajar kepada wisatawan asing.'),(32,4,'Pencopetan','2022-12-31 22:30:00','Banyak laporan kehilangan dompet dan ponsel saat perayaan malam tahun baru.'),(33,4,'Jambret','2023-03-25 20:00:00','Tas tangan wisatawan dijambret saat sedang berjalan kaki di trotoar.'),(34,4,'Hipnotis (Gendam)','2023-05-14 16:00:00','Seorang mahasiswa mengaku kehilangan laptop setelah ditepuk pundaknya oleh orang asing.'),(35,4,'Perkelahian','2023-07-22 23:15:00','Keributan terjadi antara dua kelompok remaja di area Monumen Serangan Umum 1 Maret.'),(36,4,'Pemalakan','2023-09-16 19:30:00','Oknum berpura-pura menjadi \"manusia silver\" dan memaksa meminta uang.'),(37,4,'Pencurian','2024-02-10 21:00:00','Beberapa pengunjung melaporkan kehilangan helm di area parkir sekitar.'),(38,4,'Vandalisme','2024-04-13 01:30:00','Sampah sengaja dibuang sembarangan dan merusak tanaman hias oleh sekelompok orang.'),(39,4,'Pencopetan','2024-05-11 19:00:00','Wisatawan kehilangan kacamata dan ponsel saat asyik menonton pertunjukan seni jalanan.'),(40,4,'Penipuan','2024-06-01 17:00:00','Modus sumbangan palsu yang mengatasnamakan panti asuhan.'),(41,5,'Balapan Liar','2025-07-07 23:38:00','Balapan ngeng ngeng');
/*!40000 ALTER TABLE `data_kriminal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `heatmap`
--

DROP TABLE IF EXISTS `heatmap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `heatmap` (
  `mapid` int NOT NULL AUTO_INCREMENT,
  `nama_lokasi` varchar(255) DEFAULT NULL,
  `latitude` float DEFAULT NULL,
  `longitude` float DEFAULT NULL,
  `gmaps_url` text,
  `status` enum('aktif','mati') DEFAULT NULL,
  PRIMARY KEY (`mapid`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `heatmap`
--

LOCK TABLES `heatmap` WRITE;
/*!40000 ALTER TABLE `heatmap` DISABLE KEYS */;
INSERT INTO `heatmap` VALUES (1,'Jalan Malioboro',-7.7924,110.366,'https://maps.app.goo.gl/fogdpdpdStaskSkz5','aktif'),(2,'Kawasan Candi Prambanan',-7.752,110.492,'https://maps.app.goo.gl/jSVj35B4564SBjLV7','aktif'),(3,'Alun-Alun Kidul Yogyakarta',-7.8124,110.364,'https://maps.app.goo.gl/5sdEdxKKYdhxUZkH8','aktif'),(4,'Titik Nol Kilometer Yogyakarta',-7.7998,110.366,'https://maps.app.goo.gl/PLa3bEhKqJXsmAv9','aktif'),(5,'Candi Prambanan',7.752,110.492,'https://g.co/kgs/n7bdZye','aktif');
/*!40000 ALTER TABLE `heatmap` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `manager_details`
--

DROP TABLE IF EXISTS `manager_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `manager_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `organization` varchar(255) NOT NULL,
  `location_url` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `latitude` float DEFAULT NULL,
  `longitude` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_manager` (`user_id`),
  CONSTRAINT `manager_details_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `manager_details`
--

LOCK TABLES `manager_details` WRITE;
/*!40000 ALTER TABLE `manager_details` DISABLE KEYS */;
INSERT INTO `manager_details` VALUES (1,8,'Hutan Pinus','https://g.co/kgs/2YyUiTn ','2025-07-08 09:00:49','2025-07-08 09:00:49',NULL,NULL),(2,9,'Lava Bantal','https://maps.google.com/@-7.7924,110.3659','2025-07-08 09:55:42','2025-07-08 15:00:17',-7.7924,110.366),(3,2,'Wisata Malioboro','https://maps.google.com/@-7.7924,110.3659','2025-07-08 13:39:03','2025-07-08 15:00:17',-7.7924,110.366),(4,3,'Wisata Candi Prambanan','https://maps.google.com/@-7.7520,110.4915','2025-07-08 13:39:03','2025-07-08 15:00:17',-7.752,110.492),(5,4,'Wisata Alun-Alun Kidul','https://maps.google.com/@-7.8124,110.3638','2025-07-08 13:39:03','2025-07-08 15:00:17',-7.8124,110.364),(6,5,'Wisata Titik Nol','https://maps.google.com/@-7.7998,110.3657','2025-07-08 13:39:03','2025-07-08 15:00:18',-7.7998,110.366);
/*!40000 ALTER TABLE `manager_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('admin','manager','polri') DEFAULT NULL,
  `status` enum('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
  `last_login` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'Afifuddin Mahfud','afifuddin.m@example.com','$2b$10$q9yobGnPDGb3lfty1CelOeXhU4LO8WtSdMZbuHjZfrO0UILblG9ZW','admin','aktif',NULL),(2,'Amelia Zakiya Sabrina','amelia.zs@example.com','$2b$10$laJwr8hPXLQuNO1.Qfj6iOofZFXTOfvxjKoEX7r6In.ytOkmEr0T.','manager','aktif',NULL),(3,'Arvindra Ahmad Ramadhan','arvindra.ar@example.com','$2b$10$3LzlYKSs3rS3iGyno.nL2.DCYHPIzs3UBE/LnpA4MvPTWhJtK4aTG','manager','aktif',NULL),(4,'Muhammad Radja Fikri Nafis','radja.fn@example.com','$2b$10$RKAc9d2kWgsGOiSQdIwvMeK4YPNG7MOloHk6UGHkGJz4Jb0GgxET2','manager','aktif',NULL),(5,'Fawwaz Akbar Wibowo','fawwaz.aw@example.com','$2b$10$QwGXICv3RmoD/V.qjwlaX.BFsxn9XTkXCwvfQT0HlSyvnUfPs/Ab.','manager','aktif',NULL),(6,'Polisi Pariwisata DIY','polpar.diy@example.com','$2b$10$pzjNrkKYcnGIJVtY9RaaxOBMxcXBtJIgXnvkB.Wxj6HJp/HTQGmAu','polri','aktif',NULL),(7,'Test User','test@example.com','$2b$10$LHjR7QGo.DNl.RDe/H82Nudkp7g/ZBw6PoyFmbkRO6saY0YbFjbeu','manager','aktif',NULL),(8,'Budi','budi@example.com','$2b$10$wuVHYoCiRagmDcj5AjYl.OP8IgNXmdi7984Pap7JEzTzOt3XMScQW','manager','aktif','2025-07-08 09:47:23'),(9,'Justin Bieber','justin@example.com','$2b$10$yHZTONJEwNLkdT6uVEZJI.ilgUktaWWZInucF7msqmZm6sIg9wfhm','manager','aktif','2025-07-08 13:37:22');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = latin1 */ ;
/*!50003 SET character_set_results = latin1 */ ;
/*!50003 SET collation_connection  = latin1_swedish_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`crimewatch_user`@`%`*/ /*!50003 TRIGGER `update_last_login` BEFORE UPDATE ON `user` FOR EACH ROW BEGIN
    IF NEW.status = 'aktif' AND OLD.status = 'aktif' THEN
        SET NEW.last_login = CURRENT_TIMESTAMP;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-10 18:02:02
