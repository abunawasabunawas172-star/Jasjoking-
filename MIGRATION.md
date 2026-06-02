# Panduan Migrasi Database JasJoking Mahasiswa ke phpMyAdmin & MySQL (XAMPP)

Panduan ini berisi langkah-langkah praktis dan kode DDL SQL lengkap untuk bermigrasi dari sistem database file lokal (`database_store.json`) ke database relasional **MySQL** menggunakan **phpMyAdmin** (seperti yang terdapat pada XAMPP).

---

## Langkah 1: Membuat Database di phpMyAdmin

1. Aktifkan **Apache** dan **MySQL** pada panel kontrol XAMPP Anda.
2. Buka browser Anda dan akses: `http://localhost/phpmyadmin`
3. Klik menu **"New"** atau **"Baru"** di kolom sebelah kiri untuk membuat database baru.
4. Masukkan nama database: `jasjoking_mahasiswa` lalu pilih penyandian `utf8mb4_general_ci` dan klik **"Create / Buat"**.

---

## Langkah 2: Menjalankan Perintah SQL (DDL)

Klik tab **"SQL"** pada database `jasjoking_mahasiswa` yang baru saja Anda buat, lalu salin dan jalankan seluruh query SQL berikut untuk membuat tabel-tabel terstruktur:

```sql
-- 1. Membuat Tabel Pengguna (Users)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('buyer', 'seller', 'admin') NOT NULL DEFAULT 'buyer',
  `storeName` VARCHAR(150) NULL,
  `avatarUrl` TEXT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Memasukkan Akun Template Default & Akun Master Admin JasJoking Mahasiswa
INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `storeName`, `avatarUrl`) VALUES
('u-admin', 'admin', 'admin@gmail.com', 'admin123', 'admin', NULL, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'),
('u-master-admin', 'JasJoking Mhs', 'jasjokingmhs@gmail.com', 'JasJoking215', 'admin', NULL, 'https://api.dicebear.com/7.x/bottts/svg?seed=JasJokingMhs'),
('u-budi', 'budi', 'budi@gmail.com', 'budi123', 'seller', 'Budi Campus Book Store', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120'),
('u-siti', 'siti', 'siti@gmail.com', 'siti123', 'seller', 'Siti Creative & Code', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120'),
('u-kantin', 'kantin_bu_joko', 'kantin@gmail.com', 'kantin123', 'seller', 'Kantin Bu Joko (Sejahtera UMKM)', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120'),
('u-anton', 'anton', 'anton@gmail.com', 'anton123', 'buyer', NULL, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120');

-- 3. Membuat Tabel Jualan / Katalog Jasa & Produk
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `sellerId` VARCHAR(50) NOT NULL,
  `sellerName` VARCHAR(150) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `price` INT NOT NULL,
  `imageUrl` TEXT NOT NULL,
  `category` ENUM('buku', 'alat', 'desain', 'coding', 'print', 'umkm_food') NOT NULL,
  `stock` INT NOT NULL DEFAULT 99,
  `staffOptions` TEXT NULL, -- Disimpan sebagai JSON string list staf
  `tableOptions` TEXT NULL, -- Disimpan sebagai JSON string list nomor meja
  FOREIGN KEY (`sellerId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Membuat Tabel Transaksi Pemesanan (Orders)
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `buyerId` VARCHAR(50) NOT NULL,
  `buyerName` VARCHAR(100) NOT NULL,
  `sellerId` VARCHAR(50) NOT NULL,
  `sellerName` VARCHAR(150) NOT NULL,
  `productId` VARCHAR(50) NOT NULL,
  `productTitle` VARCHAR(150) NOT NULL,
  `price` INT NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `status` ENUM('awaiting_payment', 'paid', 'processing', 'completed', 'cancelled') NOT NULL DEFAULT 'awaiting_payment',
  `qrisUrl` TEXT NOT NULL,
  `selectedStaff` VARCHAR(100) NULL,
  `scheduledTime` VARCHAR(100) NULL,
  `seatingRequest` VARCHAR(100) NULL,
  `discountAmount` INT NULL DEFAULT 0,
  `originalPrice` INT NULL DEFAULT 0,
  `rating` INT NULL,
  `review` TEXT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`buyerId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sellerId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Membuat Tabel Riwayat Chat Pemesanan (Order Chat History)
CREATE TABLE IF NOT EXISTS `order_chats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `orderId` VARCHAR(50) NOT NULL,
  `senderId` VARCHAR(50) NOT NULL,
  `senderName` VARCHAR(100) NOT NULL,
  `senderRole` VARCHAR(50) NOT NULL,
  `content` TEXT NOT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Langkah 3: Menghubungkan Backend Node.js Express ke MySQL

Supaya server Node.js Anda dapat berkomunikasi dengan database MySQL di phpMyAdmin, ikuti langkah integrasi ini:

1. install package `mysql2` di direktori proyek Anda:
   ```bash
   npm install mysql2
   ```

2. Ganti kode in-memory array di `server.ts` dengan pool koneksi berikut:
   ```typescript
   import mysql from 'mysql2/promise';

   const dbPool = mysql.createPool({
     host: 'localhost',
     user: 'root',      // Default user XAMPP
     password: '',      // Default password XAMPP kosong
     database: 'jasjoking_mahasiswa',
     waitForConnections: true,
     connectionLimit: 10,
     queueLimit: 0
   });
   ```

3. Ganti cara pengambilan data dengan sintaks query SQL (Promise-based).
   
   *Contoh Login user:*
   ```typescript
   app.post("/api/auth/login", async (req, res) => {
     const { email, password } = req.body;
     const [rows]: any = await dbPool.query("SELECT * FROM users WHERE email = ?", [email]);
     
     if (rows.length === 0 || rows[0].password !== password) {
       return res.status(401).json({ error: "Email atau Password salah!" });
     }
     
     res.json({ success: true, user: rows[0] });
   });
   ```

---

## Keuntungan Desain Database phpMyAdmin Ini:
1. **Lebih Aman & Stabil**: Data pesanan jasa, reservasi meja, dan chat tidak akan hilang sekalipun server dimatikan.
2. **Koneksi Real-time**: Memungkinkan pencatatan rating dan klaim diskon otomatis terintegrasi erat dengan query relasional SQL.
3. **Admin Monitor Dashboard**: Melalui phpMyAdmin Anda dapat langsung mengekspor seluruh tabel di atas ke format **Excel / PDF** dalam satu klik untuk rekapitulasi laporan berkala fakultas!
