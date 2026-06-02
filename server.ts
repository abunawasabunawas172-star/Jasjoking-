import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import { User, Product, Order, DiscordLog, AppNotification, Message, CategoryType, OrderStatus } from "./src/types.js";

const app = express();
const PORT = 3000;

// Express JSON and urlencoded parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Server In-Memory Database / JSON File Persistence ---
let users: User[] = [
  { id: "u-buyer-aputrawan", username: "aputrawan", email: "aputrawan666@gmail.com", role: "buyer", avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=aputrawan", createdAt: "2026-05-21T10:00:00Z" },
  { id: "u-admin-abunawas", username: "abunawas", email: "abunawasabunawas172@gmail.com", role: "admin", avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=abunawas", createdAt: "2026-05-21T10:00:00Z" },
  { id: "u-seller-hafiz", username: "hafiz", email: "hafizalrasyid8@gmail.com", role: "seller", storeName: "Hafiz Creative Agency", sellerQrisText: "QRIS.HAFIZ", avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=hafiz", createdAt: "2026-05-21T10:00:00Z" },
  { id: "u-seller-dian", username: "dian", email: "dian@gmail.com", role: "seller", storeName: "Dian Photography UMSU", sellerQrisText: "QRIS.DIAN", avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=dian", createdAt: "2026-05-21T10:00:00Z" }
];

// Simple plaintext password store for mock database demo safety
const passwordStore: Record<string, string> = {
  "aputrawan666@gmail.com": "Admin123",
  "abunawasabunawas172@gmail.com": "Admin123",
  "hafizalrasyid8@gmail.com": "Admin123",
  "dian@gmail.com": "Admin123"
};

let products: Product[] = [
  {
    id: "p-desain-poster",
    sellerId: "u-andi-freelance",
    sellerName: "Andi Kreatif (Mhs Ilmu Komunikasi UMSU)",
    title: "Jasa Desain Poster, Flyer & Banner Kegiatan Kampus",
    description: "Layanan desain grafis profesional untuk poster kegiatan, seminar harian, pamflet organisasi, hingga banner acara IMM/BEM/HMJ UMSU. Desain modern, estetis, revisi tak terbatas, dan pengerjaan kilat 1 hari kawan.",
    price: 35000,
    category: "desain",
    imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600",
    stock: 100,
    staffOptions: ["Andi (UI Designer)", "Reza (Illustrator)"],
    address: "Gedung FISIP Lantai 2, Kampus Utama UMSU, Jl. Kapten Mukhtar Basri",
    whatsappContact: "6282274991122",
    sellerType: "mahasiswa"
  },
  {
    id: "p-edit-video",
    sellerId: "u-budi-multimedia",
    sellerName: "Budi Creative Studio (Mhs Teknik UMSU)",
    title: "Jasa Edit Video Reels, TikTok & Dokumentasi Kegiatan Kampus",
    description: "Jasa edit video sinematik untuk reels Instagram, TikTok viral, rekaman wisuda, profil organisasi, atau tugas mata kuliah. Termasuk color grading, audio mixing, subtitle dinamis, dan efek transisi kekinian.",
    price: 75000,
    category: "desain",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600",
    stock: 50,
    staffOptions: ["Budi (Video Editor)", "Sarah (Motion Designer)"],
    address: "Fakultas Teknik Kampus Utama UMSU, Jl. Kapten Mukhtar Basri",
    whatsappContact: "6281260408890",
    sellerType: "mahasiswa"
  },
  {
    id: "p-jasa-ppt",
    sellerId: "u-budi-multimedia",
    sellerName: "Budi Creative Studio (Mhs Teknik UMSU)",
    title: "Jasa Pembuatan Slide PPT Presentasi Kuliah & Sidang Skripsi Estetik",
    description: "Bantu buat slide presentasi PPT/Canva super estetik, minimalis, dan komunikatif untuk tugas harian, proposal PKM, proposal penelitian, hingga Sidang Skripsi UMSU agar terlihat profesional di mata dosen kawan.",
    price: 50000,
    category: "desain",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600",
    stock: 80,
    staffOptions: ["Budi (Canva Specialist)", "Rina (Copywriter)"],
    address: "Fakultas Teknik Kampus Utama UMSU, Jl. Kapten Mukhtar Basri",
    whatsappContact: "6281260408890",
    sellerType: "mahasiswa"
  },
  {
    id: "p-desain-cv",
    sellerId: "u-andi-freelance",
    sellerName: "Andi Kreatif (Mhs Ilmu Komunikasi UMSU)",
    title: "Jasa Desain CV (Curriculum Vitae) ATS-Friendly & Kreatif",
    description: "Pembuatan personal resume / CV profesional dengan format standar ATS (Applicant Tracking System) untuk lamaran magang atau kerja fresh graduate. Pilihan template kreatif, asyik, dan terarah kawan.",
    price: 30000,
    category: "desain",
    imageUrl: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600",
    stock: 120,
    staffOptions: ["Andi (CV Expert)"],
    address: "Gedung FISIP Lantai 2, Kampus Utama UMSU, Jl. Kapten Mukhtar Basri",
    whatsappContact: "6282274991122",
    sellerType: "mahasiswa"
  },
  {
    id: "p-pengetikan",
    sellerId: "u-cindy-typing",
    sellerName: "Cindy Typing Center (Mhs Ekonomi UMSU)",
    title: "Jasa Pengetikan Kilat & Rapikan Format Skripsi",
    description: "Jasa pengetikan transkripsi wawancara, entri data excel, merapikan dokumen tugas kuliah, daftar isi otomatis, penomoran halaman berbeda, serta perbaikan format penulisan skripsi sesuai Buku Panduan UMSU.",
    price: 15000,
    category: "print",
    imageUrl: "https://images.unsplash.com/photo-1516116211223-5c359a36298a?w=600",
    stock: 200,
    staffOptions: ["Cindy (Spesialis MS Word)", "Gerry (Data Entry)"],
    address: "Gang Rukun (Samping Pascasarjana UMSU), Jl. Kapten Mukhtar Basri",
    whatsappContact: "6289561011223",
    sellerType: "mahasiswa"
  },
  {
    id: "p-penulisan-makalah",
    sellerId: "u-cindy-typing",
    sellerName: "Cindy Typing Center (Mhs Ekonomi UMSU)",
    title: "Jasa Penyusunan Makalah, Resume Buku & Laporan Tugas",
    description: "Membantu bimbingan atau asistensi perapian draft makalah, resume artikel jurnal, rangkuman bab buku, dan pengetikan laporan tugas akademik secara rinci sesuai EYD/PUEBI kawan.",
    price: 40000,
    category: "print",
    imageUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600",
    stock: 60,
    staffOptions: ["Cindy (Academic Assistant)"],
    address: "Gang Rukun (Samping Pascasarjana UMSU), Jl. Kapten Mukhtar Basri",
    whatsappContact: "6289561011223",
    sellerType: "mahasiswa"
  },
  {
    id: "p-bimbingan-coding",
    sellerId: "u-hafiz-tech",
    sellerName: "Hafiz Tech Support (Mhs Ilmu Komputer UMSU)",
    title: "Jasa Bimbingan Coding Website & Aplikasi Tugas Kuliah",
    description: "Butuh tutor atau bantuan pengerjaan project website (React/Vite/Tailwind, PHP Laravel) atau coding Java/C++ untuk tugas besar ilmu komputer? Sesi bimbingan tatap muka online/offline didampingi penjelasan logic baris-per-baris.",
    price: 200000,
    category: "coding",
    imageUrl: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=600",
    stock: 30,
    staffOptions: ["Hafiz (Frontend Dev)", "Dian (Backend Engineer)"],
    address: "Laboratorium Komputer UMSU Lantai 3, Jl. Kapten Mukhtar Basri",
    whatsappContact: "6282165432109",
    sellerType: "mahasiswa"
  },
  {
    id: "p-fotografi",
    sellerId: "u-lensa-basri",
    sellerName: "Lensa Basri Photography (Mhs FISIP UMSU)",
    title: "Jasa Fotografi Kampus (Wisuda, Sidang Meja Hijau & Event)",
    description: "Sesi foto outdoor/indoor wisuda mahasiswa UMSU, pendampingan foto sidang meja hijau, foto studio mini kelompok organisasi BEM/PKM, atau liputan dokumentasi kegiatan ormawa. Sudah termasuk 10 file edit premium & seluruh file raw kawan.",
    price: 150000,
    category: "fotografi",
    imageUrl: "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=600",
    stock: 15,
    staffOptions: ["Rico (Fotografer Utama)", "Fira (Photo Editor)"],
    address: "Jl. Kapten Mukhtar Basri No.12 (Samping Gerbang Utama UMSU)",
    whatsappContact: "6281122334455",
    sellerType: "mahasiswa"
  },
  {
    id: "p-mitra-ayampenyet",
    sellerId: "u-mitra-ayampenyet",
    sellerName: "Ayam Penyet Mbak Sri (Kantin Utama UMSU)",
    title: "Ayam Penyet Sambal Korek Gurih + Es Teh Manis Jumbo",
    description: "Menu makan siang favorit mahasiswa UMSU! Ayam goreng cripsy renyah dipadukan sambal korek pedas mampus khas Mbak Sri. Sudah termasuk nasi hangat, lalapan segar, kriukan gurih and Es Teh Manis dingin kawan. Siap makan di tempat atau antar kelas.",
    price: 18000,
    category: "makanan",
    imageUrl: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600",
    stock: 150,
    tableOptions: ["Meja Kantin B1", "Meja Kantin B2", "Meja Kantin B3", "Bungkus / Delivery Kelas"],
    address: "Stand Kantin Utama UMSU No. 3 (Samping Koperasi Mahasiswa)",
    whatsappContact: "6281355443322",
    sellerType: "mitra",
    sellerRating: 4.9,
    sellerReviewCount: 12
  },
  {
    id: "p-mitra-kopi",
    sellerId: "u-mitra-kopi",
    sellerName: "Kopi Mahasiswa & Snack Corner UMSU",
    title: "Es Kopi Susu Creamy Gula Aren & Risoles Lumbut Spesial (Bundle)",
    description: "Booster fokus kuliah untuk begadang nugas! Perpaduan mantap kopi instan arabika, susu krim tebal, dan sirup gula aren pilihan. Ditambah 2 pcs risoles sayur/mayo isi daging ayam suwir hangat gratis.",
    price: 15000,
    category: "makanan",
    imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600",
    stock: 100,
    tableOptions: ["Cangkrukan Kopi Meja 1", "Cangkrukan Kopi Meja 2", "Ambil Sendiri/Takeaway"],
    address: "Paviliun Taman Kampus UMSU, Depan Masjid Jami' UMSU",
    whatsappContact: "6285299887766",
    sellerType: "mitra",
    sellerRating: 4.8,
    sellerReviewCount: 8
  },
  {
    id: "p-mitra-fotokopi",
    sellerId: "u-mitra-fotokopi",
    sellerName: "Pratama Copy Center & ATK Mitra Kampus",
    title: "Satu Paket Print Dokumen Tugas / Skripsi HVS 80gr + Jilid Lux",
    description: "Layanan cetak tugas, diktat kuliah, handout dsb. Cetak laser hemat berkualitas tinggi, hitam putih maupun warna. Jaminan jilid rapi bersampul mika tebal, pengerjaan di tempat langsung jadi kawan.",
    price: 12000,
    category: "kebutuhan",
    imageUrl: "https://images.unsplash.com/photo-1612815154858-60aa4c59eae6?w=600",
    stock: 500,
    tableOptions: ["Antrean Cepat A", "Ditinggal Besok", "Kirim via PDF/WA"],
    address: "Gedung Utama UMSU Lantai Dasar (Samping ATM Center)",
    whatsappContact: "6281233221100",
    sellerType: "mitra",
    sellerRating: 4.7,
    sellerReviewCount: 15
  }
];

let orders: Order[] = [];

let discordWebhookUrl = "https://discord.com/api/webhooks/1506966245835280497/V7wJxSfRS4_i31Uk7tb78K_8xIjxPZdjYZN0D-caeXnYvQTN-bN4vFhVGLSPa-GiilqB";
let discordLogs: DiscordLog[] = [];
let globalNotifications: AppNotification[] = [
  {
    id: "n-welcome",
    title: "Selamat datang di JasJoking Mahasiswa!",
    body: "Temukan kebutuhan perkuliahanmu, tawarkan jasamu, atau mulailah berbisnis sebagai mahasiswa/UMKM hari ini.",
    timestamp: new Date().toISOString(),
    read: false
  }
];

// --- Persistent File Store Engine ---
const DB_FILE = path.join(process.cwd(), "database_store.json");

function saveDb() {
  try {
    const data = {
      users,
      passwordStore,
      products,
      orders,
      discordWebhookUrl,
      discordLogs,
      globalNotifications
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[DATABASE ERROR] Failed writing payload:", err);
  }
}

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const payloadStr = fs.readFileSync(DB_FILE, "utf-8");
      if (payloadStr.trim()) {
        const parsed = JSON.parse(payloadStr);
        const LEGACY_EMAILS = ["admin@gmail.com", "jasjokingmhs@gmail.com", "budi@gmail.com", "siti@gmail.com", "kantin@gmail.com", "anton@gmail.com"];

        if (parsed.users) {
          users = parsed.users.filter((u: any) => !LEGACY_EMAILS.includes(u.email));
        }
        
        // Ensure the 4 requested admins exist in users
        const adminSeeds: User[] = [
          { id: "u-buyer-aputrawan", username: "aputrawan", email: "aputrawan666@gmail.com", role: "buyer", avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=aputrawan", createdAt: "2026-05-21T10:00:00Z" },
          { id: "u-admin-abunawas", username: "abunawas", email: "abunawasabunawas172@gmail.com", role: "admin", avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=abunawas", createdAt: "2026-05-21T10:00:00Z" },
          { id: "u-seller-hafiz", username: "hafiz", email: "hafizalrasyid8@gmail.com", role: "seller", storeName: "Hafiz Creative Agency", sellerQrisText: "QRIS.HAFIZ", avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=hafiz", createdAt: "2026-05-21T10:00:00Z" },
          { id: "u-seller-dian", username: "dian", email: "dian@gmail.com", role: "seller", storeName: "Dian Photography UMSU", sellerQrisText: "QRIS.DIAN", avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=dian", createdAt: "2026-05-21T10:00:00Z" }
        ];
        adminSeeds.forEach(adm => {
          const idx = users.findIndex(u => u.email === adm.email);
          if (idx !== -1) {
            users[idx].role = adm.role;
            if (adm.storeName) users[idx].storeName = adm.storeName;
            if (adm.sellerQrisText) users[idx].sellerQrisText = adm.sellerQrisText;
          } else {
            users.push(adm);
          }
        });

        if (parsed.passwordStore) {
          for (const k in parsed.passwordStore) {
            if (!LEGACY_EMAILS.includes(k)) {
              passwordStore[k] = parsed.passwordStore[k];
            }
          }
        }
        passwordStore["aputrawan666@gmail.com"] = "Admin123";
        passwordStore["abunawasabunawas172@gmail.com"] = "Admin123";
        passwordStore["hafizalrasyid8@gmail.com"] = "Admin123";
        passwordStore["dian@gmail.com"] = "Admin123";

        if (parsed.products) {
          const loaded = parsed.products;
          // Merge initial partners products if they are missing
          const defaultSeedIds = ["p-mitra-ayampenyet", "p-mitra-kopi", "p-mitra-fotokopi"];
          const merged = [...loaded];
          
          products.forEach(defProd => {
            if (!merged.some(p => p.id === defProd.id)) {
              merged.push(defProd);
            }
          });
          
          products = merged.map((p: any) => {
            if (!p.sellerType) {
              p.sellerType = p.id.startsWith("p-mitra") || p.category === 'makanan' || p.category === 'kebutuhan' ? "mitra" : "mahasiswa";
            }
            return p;
          });
        }
        if (parsed.orders) {
          orders = parsed.orders.filter((o: any) => o.id !== "o-test1" && o.id !== "o-test2");
        } else {
          orders = [];
        }
        if (parsed.discordWebhookUrl !== undefined) discordWebhookUrl = parsed.discordWebhookUrl;
        // Force upgrade mock URL to the user's real Discord webhook link
        if (!discordWebhookUrl || discordWebhookUrl.includes("1234567890/abcde_mock_url")) {
          discordWebhookUrl = "https://discord.com/api/webhooks/1506966245835280497/V7wJxSfRS4_i31Uk7tb78K_8xIjxPZdjYZN0D-caeXnYvQTN-bN4vFhVGLSPa-GiilqB";
          saveDb();
        }
        if (parsed.discordLogs) discordLogs = parsed.parsedLogs || parsed.discordLogs || [];
        if (parsed.globalNotifications) globalNotifications = parsed.globalNotifications;
        console.log("[DATABASE SUCCESS] Load completed from database_store.json store file.");
      }
    } else {
      saveDb();
    }
  } catch (err) {
    console.warn("[DATABASE WARN] Fallback to mock defaults:", err);
  }
}

// Dry run initial load
loadDb();
saveDb();

// Helper functions
function createNotification(title: string, body: string) {
  const newNotif: AppNotification = {
    id: `n-${Date.now()}`,
    title,
    body,
    timestamp: new Date().toISOString(),
    read: false
  };
  globalNotifications.unshift(newNotif);
  if (globalNotifications.length > 50) globalNotifications.pop();
  saveDb();
}

async function sendDiscordWebhook(event: string, message: string, detailPayload: any) {
  const logId = `dlog-${Date.now()}`;
  const timestamp = new Date().toISOString();
  
  const payloadStr = JSON.stringify({
    content: `🔔 **JasJoking Mahasiswa Event: ${event}**`,
    embeds: [
      {
        title: event,
        description: message,
        color: 3447003,
        fields: Object.keys(detailPayload).map(key => ({
          name: key.toUpperCase(),
          value: String(detailPayload[key]),
          inline: true
        })),
        footer: {
          text: "JasJoking Mahasiswa Integration"
        },
        timestamp: timestamp
      }
    ]
  });

  const logEntry: DiscordLog = {
    id: logId,
    timestamp,
    event,
    message: `${message}. Payload: ${JSON.stringify(detailPayload)}`,
    webhookUrl: discordWebhookUrl
  };

  discordLogs.unshift(logEntry);
  if (discordLogs.length > 40) discordLogs.pop();
  saveDb();

  console.log(`[DISCORD WEBHOOK] Event: ${event}, Message: ${message}`);

  // Only trigger network client if user changed webhook to a seemingly functional URL
  if (discordWebhookUrl && discordWebhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    try {
      const response = await fetch(discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payloadStr
      });
      console.log(`[DISCORD OUTCOME] Webhook hit response code: ${response.status}`);
    } catch (e: any) {
      console.log(`[DISCORD ERROR] Failed to send to external webhook: ${e.message}`);
    }
  }
}

// --- API ENDPOINTS ---

// In-memory OTP store
const activeOtps: Record<string, string> = {};

// Send Simulated or REAL OTP depending on configuration settings
app.post("/api/auth/send-otp", async (req, res) => {
  const { target } = req.body; // email or phone number
  if (!target) {
    return res.status(400).json({ error: "Target alamat email/WhatsApp wajib diisi." });
  }

  // Generate 4-digit code
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  activeOtps[target] = code;

  // Track if real email was sent
  let realEmailSent = false;
  let smtpErrorMsg = "";

  // If target looks like an email and we have SMTP credentials, try to send real email!
  const isEmail = target.includes("@");
  const useSmtp = isEmail && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (useSmtp) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const senderName = process.env.SMTP_SENDER_NAME || "JasJoking Kampus UMSU";
      await transporter.sendMail({
        from: `"${senderName}" <${process.env.SMTP_USER}>`,
        to: target,
        subject: `🔐 Kode OTP Verifikasi Pendaftaran JasJoking UMSU (${code})`,
        text: `Halo Mahasiswa/Mitra pejuang JasJoking UMSU,\n\nTerima kasih atas pendaftaran Anda. Berikut adalah Kode OTP Rahasia Anda untuk menyelesaikan verifikasi:\n\n👉 [ ${code} ] 👈\n\nSilakan masukkan kode ini pada kolom pendaftaran.\nJangan berikan atau bagikan kode keamanan ini kepada siapa pun!\n\nSalam hangat,\nTim JasJoking Digitalization`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="background-color: #0f172a; padding: 15px; border-radius: 8px; text-align: center; color: #ffffff;">
              <h2 style="margin: 0; color: #10b981;">JasJoking Kampus UMSU</h2>
              <p style="margin: 5px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #cbd5e1;">Portal Transaksi & Reservasi</p>
            </div>
            <div style="padding: 20px 0;">
              <p style="font-size: 15px; color: #334155;">Halo Mahasiswa/Mitra Pejuang JasJoking UMSU,</p>
              <p style="font-size: 15px; color: #334155;">Terima kasih telah mencoba mendaftar pada portal JasJoking Mahasiswa. Untuk memverifikasi keamanan pembuatan akun Anda, silakan gunakan Kode OTP Keamanan di bawah ini:</p>
              
              <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0;">
                <span style="font-size: 10px; font-weight: bold; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-bottom: 8px;">KODE VERIFIKASI SEED OTP</span>
                <span style="font-size: 32px; font-weight: 800; font-family: monospace; color: #e11d48; letter-spacing: 0.2em;">${code}</span>
              </div>
              
              <p style="font-size: 12px; color: #ef4444; font-weight: bold;">⚠️ JANGAN BAGIKAN kode ini kepada orang lain atau pihak mana pun termasuk tim administator JasJoking.</p>
              <p style="font-size: 14px; color: #475569; margin-top: 25px;">Terima kasih atas partisipasi Anda dalam program digitalisasi kampus UMSU!</p>
            </div>
            <hr style="border: 0; border-top: 1px solid #f1f5f9;" />
            <div style="text-align: center; font-size: 10px; color: #94a3b8; padding-top: 10px;">
              Pesan dikirim secara otomatis oleh Sistem Portal Mahasiswa UMSU JasJoking.<br/>
              Medan, Sumatera Utara, Indonesia.
            </div>
          </div>
        `
      });
      realEmailSent = true;
    } catch (err: any) {
      console.error("[SMTP OTP ERROR] Gagal mengirim email asli:", err);
      smtpErrorMsg = err.message || JSON.stringify(err);
    }
  }

  // Dispatch an in-app system notification that behaves as a real-time message ticker
  createNotification(
    "🔑 KODE VERIFIKASI ANGKA (OTP)",
    `Kode verifikasi keamanan untuk [${target}] adalah: ${code}. Masukkan angka ini agar pendaftaran Anda valid.`
  );

  res.json({
    success: true,
    code,
    realEmailSent,
    smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
    smtpError: smtpErrorMsg || undefined,
    message: realEmailSent 
      ? `Kode OTP verifikasi asli telah BERHASIL dikirim langsung ke kotak masuk email Anda (${target})! Silakan periksa kotak masuk/spam kawan! 📧✨`
      : `Kode OTP verifikasi berhasil dibuat (${code}). Anda bisa langsung menggunakan simulator handphone atau notifikasi di sebelah kanan untuk menyalin kodenya. (Daftarkan SMTP_USER & SMTP_PASS di env/secrets untuk mengirim email Gmail asli!).`
  });
});

// Auth endpoints
app.post("/api/auth/register", (req, res) => {
  const { username, email, password, role, storeName, address, whatsappNumber, emailOtp, whatsappOtp } = req.body;
  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: "Kolom nama pengguna, email, sandi, dan role harus diisi semua." });
  }

  // Password length validation
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Kata sandi pendaftaran minimal harus 8 karakter demi keamanan kawan!" });
  }

  // Restrict to @gmail.com for notification integration
  const trimmedEmail = String(email).trim().toLowerCase();
  if (!trimmedEmail.endsWith("@gmail.com")) {
    return res.status(400).json({ error: "Registrasi dibatasi: Hanya email Gmail (@gmail.com) yang diizinkan agar notifikasi pengguna aktif." });
  }

  // Enforce WhatsApp input (without OTP)
  if (!whatsappNumber) {
    return res.status(400).json({ error: "Nomor WhatsApp aktif wajib diisi untuk kelancaran transaksi kawan." });
  }
  const trimmedPhone = String(whatsappNumber).trim();
  if (trimmedPhone.length < 5) {
    return res.status(400).json({ error: "Format nomor WhatsApp tidak valid. Masukkan nomor yang benar." });
  }

  const existing = users.find(u => u.email.toLowerCase() === trimmedEmail || u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "Username atau Email sudah terdaftar." });
  }

  const id = `u-${Date.now()}`;
  const newUser: User = {
    id,
    username,
    email: trimmedEmail,
    role,
    storeName: role === "seller" ? storeName || `${username} Store` : undefined,
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
    createdAt: new Date().toISOString(),
    address: address || undefined,
    whatsappNumber: whatsappNumber ? String(whatsappNumber).trim() : undefined,
    whatsappVerified: !!whatsappNumber
  };

  users.push(newUser);
  passwordStore[trimmedEmail] = password;
  saveDb();

  // Clean OTP memory
  delete activeOtps[trimmedEmail];
  if (whatsappNumber) {
    delete activeOtps[String(whatsappNumber).trim()];
  }

  createNotification("Akun Baru Terdaftar", `Selamat bergabung ${username} sebagai ${role}!`);
  res.json({ success: true, user: newUser });
});

app.post("/api/auth/update-profile", (req, res) => {
  const { userId, username, password, address, whatsappNumber, whatsappOtp, storeName, sellerBank, sellerAccount, sellerQrisText } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "Data pengguna tidak ditemukan." });
  }

  if (username) {
    // Ensure uniqueness of new username if changed
    const trimmedUsername = String(username).trim();
    if (trimmedUsername && trimmedUsername !== user.username) {
      const exists = users.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase());
      if (exists) {
        return res.status(400).json({ error: "Username sudah digunakan oleh mahasiswa lain." });
      }
      user.username = trimmedUsername;
    }
  }

  if (password) {
    const trimmedPass = String(password).trim();
    if (trimmedPass.length < 4) {
      return res.status(400).json({ error: "Kata sandi baru minimal harus 4 karakter demi keamanan." });
    }
    user.password = trimmedPass;
  }

  if (whatsappNumber) {
    const trimmedPhone = String(whatsappNumber).trim();
    if (!whatsappOtp || activeOtps[trimmedPhone] !== String(whatsappOtp)) {
      return res.status(400).json({ error: "Kode verifikasi WhatsApp salah atau belum dimasukkan." });
    }
    user.whatsappNumber = trimmedPhone;
    user.whatsappVerified = true;
    delete activeOtps[trimmedPhone];
  }

  if (address) {
    user.address = address;
  }

  if (storeName !== undefined) {
    user.storeName = storeName;
  }
  if (sellerBank !== undefined) {
    user.sellerBank = sellerBank;
  }
  if (sellerAccount !== undefined) {
    user.sellerAccount = sellerAccount;
  }
  if (sellerQrisText !== undefined) {
    user.sellerQrisText = sellerQrisText;
  }

  saveDb();
  res.json({ success: true, user });
});

app.post("/api/auth/login", (req, res) => {
  const { identifier, password } = req.body; // email or username
  if (!identifier || !password) {
    return res.status(400).json({ error: "Email/Username dan Password harus diisi." });
  }

  const user = users.find(u => u.email === identifier || u.username === identifier);
  if (!user) {
    return res.status(404).json({ error: "Akun tidak ditemukan." });
  }

  const dbPassword = passwordStore[user.email];
  if (dbPassword !== password) {
    return res.status(401).json({ error: "Kata sandi salah." });
  }

  res.json({ success: true, user });
});

// Products Endpoints
app.get("/api/products", (req, res) => {
  const productsWithRatings = products.map(product => {
    const sellerOrders = orders.filter(
      o => o.sellerId === product.sellerId && typeof o.rating === "number" && o.rating > 0
    );
    if (sellerOrders.length > 0) {
      const totalRating = sellerOrders.reduce((acc, o) => acc + (o.rating || 0), 0);
      const sellerRating = Number((totalRating / sellerOrders.length).toFixed(1));
      return {
        ...product,
        sellerRating,
        sellerReviewCount: sellerOrders.length
      };
    }
    return {
      ...product,
      sellerRating: 0,
      sellerReviewCount: 0
    };
  });
  res.json(productsWithRatings);
});

app.get("/api/admin/users", (req, res) => {
  const { role } = req.query;
  if (role !== "admin") {
    return res.status(403).json({ error: "Unauthorized access" });
  }
  res.json(users);
});

app.post("/api/products", (req, res) => {
  const { sellerId, title, description, price, category, imageUrl, stock, staffOptions, tableOptions, address, whatsappContact } = req.body;
  if (!sellerId || !title || !price || !category) {
    return res.status(400).json({ error: "Lengkapi data produk utama." });
  }

  const seller = users.find(u => u.id === sellerId);
  const sellerName = seller ? (seller.storeName || seller.username) : "Penjual Kampus";
  const finalAddress = address || (seller ? seller.address : "Kawasan Sekitar Kampus UMSU");
  const finalWhatsapp = whatsappContact || (seller ? seller.whatsappNumber : "");

  const newProd: Product = {
    id: `p-${Date.now()}`,
    sellerId,
    sellerName,
    title,
    description: description || "Tidak ada deskripsi.",
    price: Number(price),
    category: category as CategoryType,
    imageUrl: imageUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500",
    stock: Number(stock) || 1,
    staffOptions: staffOptions ? staffOptions.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0) : undefined,
    tableOptions: tableOptions ? tableOptions.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0) : undefined,
    address: finalAddress,
    whatsappContact: finalWhatsapp
  };

  products.push(newProd);
  createNotification("Produk Baru Ditambahkan", `${sellerName} menambahkan produk baru: ${title}`);
  
  sendDiscordWebhook("Produk Baru!", `Sebuah produk baru telah ditambahkan ke katalog oleh ${sellerName}`, {
    nama_produk: title,
    kategori: category,
    harga: `Rp ${Number(price).toLocaleString("id-ID")}`,
    stok: newProd.stock
  });

  res.json({ success: true, product: newProd });
});

// Orders Endpoints
app.get("/api/orders", (req, res) => {
  const { userId, role } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "UserId is required" });
  }

  if (role === "admin") {
    return res.json(orders);
  } else if (role === "seller") {
    // Return orders containing products owned by this seller
    const filtered = orders.filter(o => o.sellerId === userId);
    return res.json(filtered);
  } else {
    // buyer
    const filtered = orders.filter(o => o.buyerId === userId);
    return res.json(filtered);
  }
});

app.post("/api/orders", (req, res) => {
  const { buyerId, productId, quantity, selectedStaff, scheduledTime, seatingRequest } = req.body;
  if (!buyerId || !productId) {
    return res.status(400).json({ error: "Missing required booking details." });
  }

  const buyer = users.find(u => u.id === buyerId);
  const product = products.find(p => p.id === productId);

  if (!buyer || !product) {
    return res.status(404).json({ error: "Pembeli atau Produk tidak ditemukan." });
  }

  // Calculate discount for loyalty (every 3rd order gets a discount)
  const buyerIdStr = String(buyerId);
  const buyerOrdersCount = orders.filter(o => o.buyerId === buyerIdStr).length;
  const isDiscountOrder = (buyerOrdersCount + 1) % 3 === 0;

  const qty = Number(quantity) || 1;
  const originalPrice = product.price * qty;
  let discountAmount = 0;
  let totalCost = originalPrice;

  if (isDiscountOrder) {
    // 30% loyalty discount
    discountAmount = Math.round(originalPrice * 0.30);
    totalCost = originalPrice - discountAmount;
  }

  const orderId = `o-${Date.now()}`;

  // Fetch individual seller/merchant attributes to ensure they get payouts directly
  const merchant = users.find(u => u.id === product.sellerId);
  const payoutToPlatform = Math.round(totalCost * 0.05);
  const payoutToSeller = totalCost - payoutToPlatform;

  const sellerBankName = merchant?.sellerBank || "Bank Mandiri";
  const sellerBankAccount = merchant?.sellerAccount || "106-00-14220-432";
  const sellerQrisCode = merchant?.sellerQrisText || `QRIS.MID-${product.sellerId.toUpperCase()}`;

  // Generate a random valid QRIS mockup code mimicking standard Indonesian strings with custom merchant identity
  const formattedAmount = String(totalCost).padStart(6, "0");
  const qrisUrl = `00020101021126570011ID.CO.QRIS.WWW011893600521000123456702030015204481153033605802ID5912${product.sellerName.replace(/\s+/g,"").substring(0, 15)}6007Yogyakarta61055512162070703A016304CA23#AMT=${formattedAmount}#MERCHANT=${sellerQrisCode}`;

  const newOrder: Order = {
    id: orderId,
    buyerId,
    buyerName: buyer.username,
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    productId,
    productTitle: product.title,
    price: product.price,
    category: product.category,
    quantity: qty,
    status: "awaiting_payment", // Initial state
    qrisUrl,
    createdAt: new Date().toISOString(),
    selectedStaff: selectedStaff || undefined,
    scheduledTime: scheduledTime || undefined,
    seatingRequest: seatingRequest || undefined,
    discountAmount: isDiscountOrder ? discountAmount : undefined,
    originalPrice: isDiscountOrder ? originalPrice : undefined,
    sellerAddress: product.address || "Kawasan Sekitar Kampus UMSU",
    sellerWhatsapp: product.whatsappContact || "",
    sellerBankName,
    sellerBankAccount,
    sellerQrisCode,
    payoutToSeller,
    payoutToPlatform,
    chatHistory: [
      {
        senderId: "system",
        senderName: "JasJoking Splitter AI",
        senderRole: "system",
        content: isDiscountOrder 
          ? `🎉 SELAMAT! Ini adalah pesanan ke-${buyerOrdersCount + 1} Anda. Potongan 30%: Rp ${discountAmount.toLocaleString("id-ID")}.\n\n📊 REKAPITULASI PEMBAGIAN DANA (AI Split):\n- Hak Penjual (95%): Rp ${payoutToSeller.toLocaleString("id-ID")}\n- Kas Pengembangan Aplikasi (5%): Rp ${payoutToPlatform.toLocaleString("id-ID")}\n\nUang langsung terkirim otomatis masing-masing ke tujuan saat pembayaran diverifikasi!`
          : `Pesanan dibuat.\n\n📊 REKAPITULASI PEMBAGIAN DANA (AI Split):\n- Hak Penjual (95%): Rp ${payoutToSeller.toLocaleString("id-ID")}\n- Kas Pengembangan Aplikasi (5%): Rp ${payoutToPlatform.toLocaleString("id-ID")}\n\nSistem AI kami akan mencocokkan pembayaran ini secara real-time!`,
        timestamp: new Date().toISOString()
      }
    ]
  };

  orders.push(newOrder);
  saveDb();

  // Notification inside app
  createNotification("Pesanan Baru Dibuat", `${buyer.username} melakukan pemesanan ${product.title}${isDiscountOrder ? " [Mendapat Diskon 30%!]" : ""}`);

  // Notification to Discord
  sendDiscordWebhook(
    isDiscountOrder ? "Pemesanan Baru (Diskon 30%)" : "Pemesanan Baru", 
    `Pesanan baru dalam status menunggu pembayaran${isDiscountOrder ? " *[Loyalty Discount Applied]*" : ""}`, 
    {
      id_pesanan: orderId,
      produk: product.title,
      pembeli: buyer.username,
      total_bayar: `Rp ${totalCost.toLocaleString("id-ID")}`,
      harga_asli: isDiscountOrder ? `Rp ${originalPrice.toLocaleString("id-ID")}` : "Tanpa Diskon",
      diskon: isDiscountOrder ? `Rp ${discountAmount.toLocaleString("id-ID")} (30%)` : "0",
      staf_pilihan: selectedStaff || "Bebas/None",
      meja_kursi: seatingRequest || "Tidak Ada/None"
    }
  );

  res.json({ success: true, order: newOrder });
});

// Automated QRIS Payment Confirmation Simulation
app.post("/api/orders/:id/payment", (req, res) => {
  const { id } = req.params;
  const order = orders.find(o => o.id === id);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (order.status !== "awaiting_payment") {
    return res.json({ success: false, message: "Order is already paid or processed.", order });
  }

  order.status = "paid";
  order.chatHistory.push({
    senderId: "system",
    senderName: "Sistem QRIS",
    senderRole: "system",
    content: "✅ Pembayaran QRIS Otomatis Terverifikasi! Status berubah menjadi LUNAS (Paid). Menunggu Konfirmasi Penjual.",
    timestamp: new Date().toISOString()
  });

  createNotification("Pembayaran QRIS Diterima", `Pembayaran QRIS lunas otomatis untuk pesanan ${order.id} sebesar Rp ${(order.price * order.quantity).toLocaleString("id-ID")}`);

  sendDiscordWebhook("Pembayaran Berhasil (QRIS)", `Transaksi QRIS otomatis dinyatakan lunas oleh bank mitra kampus`, {
    id_pesanan: order.id,
    produk: order.productTitle,
    pembeli: order.buyerName,
    status_baruStr: "PAID / LUNAS",
    waktu: new Date().toLocaleTimeString("id-ID")
  });

  res.json({ success: true, message: "Simulasi pembayaran QRIS sukses!", order });
});

// Update order status/scheduling/staff by Seller or Admin
app.post("/api/orders/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, selectedStaff, scheduledTime } = req.body;
  const order = orders.find(o => o.id === id);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (status) {
    order.status = status as OrderStatus;
    
    order.chatHistory.push({
      senderId: "system",
      senderName: "Sistem Kampus",
      senderRole: "system",
      content: `Status pesanan diubah menjadi: ${status.toUpperCase()}`,
      timestamp: new Date().toISOString()
    });
  }

  if (selectedStaff) {
    order.selectedStaff = selectedStaff;
  }

  if (scheduledTime) {
    order.scheduledTime = scheduledTime;
  }

  let statusText = status || 'diupdate jadwalnya';
  if (status === 'completed') {
    statusText = 'SIAP DIAMBIL / SELESAI (Silakan ambil pesanan Anda!) 🚀';
  } else if (status === 'processing') {
    statusText = 'SEDANG DIPROSES PENJUAL ⏳';
  } else if (status === 'confirmed') {
    statusText = 'DIKONFIRMASI KAMPUS & DIJADWALKAN 📅';
  } else if (status === 'cancelled') {
    statusText = 'DIBATALKAN ❌';
  } else if (status === 'awaiting_payment') {
    statusText = 'MENUNGGU PEMBAYARAN 🏦';
  } else if (status === 'paid') {
    statusText = 'LUNAS TERVERIFIKASI 💵';
  }

  createNotification("Status Pesanan Diperbarui", `Pesanan #${order.id} (${order.productTitle}) milik ${order.buyerName} kini statusnya: ${statusText}`);

  sendDiscordWebhook("Status Order Diperbarui", `Perubahan data pesanan oleh Store/Admin`, {
    id_pesanan: order.id,
    produk: order.productTitle,
    status_sekarang: order.status,
    petugas_ditunjuk: order.selectedStaff || "Belum ditentukan",
    jadwal_pelaksanaan: order.scheduledTime || "Belum diatur"
  });

  res.json({ success: true, order });
});

// Chat message within the order context
app.post("/api/orders/:id/chat", (req, res) => {
  const { id } = req.params;
  const { senderId, content } = req.body;
  const order = orders.find(o => o.id === id);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const sender = users.find(u => u.id === senderId);
  if (!sender) {
    return res.status(404).json({ error: "User not found" });
  }

  const senderRole = sender.role;
  const senderName = senderRole === "seller" && sender.storeName ? sender.storeName : sender.username;

  const newMessage: Message = {
    senderId,
    senderName,
    senderRole,
    content,
    timestamp: new Date().toISOString()
  };

  order.chatHistory.push(newMessage);
  saveDb();

  // Quick automated reply logic for fun demo context
  if (senderRole === "buyer") {
    setTimeout(() => {
      const systemReplies = [
        "Terima kasih atas pesannya! Kami sedang menyiapkan detailnya.",
        "Baik kak, orderan diproses ya. Ada request tambahan?",
        "Siap, kami konfirmasi secepatnya!"
      ];
      const randomReply = systemReplies[Math.floor(Math.random() * systemReplies.length)];
      order.chatHistory.push({
        senderId: order.sellerId,
        senderName: order.sellerName,
        senderRole: "seller",
        content: `[Oto-Respon]: ${randomReply}`,
        timestamp: new Date().toISOString()
      });
      saveDb();
    }, 1500);
  }

  res.json({ success: true, chatHistory: order.chatHistory });
});

// Leave review endpoints
app.post("/api/orders/:id/review", (req, res) => {
  const { id } = req.params;
  const { rating, review } = req.body;
  const order = orders.find(o => o.id === id);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  order.rating = Number(rating) || 5;
  order.review = review || "";

  createNotification("Ulasan Baru Diterima", `Pembeli ${order.buyerName} memberikan bintang ${rating} pada ${order.productTitle}`);

  sendDiscordWebhook("Ulasan & Rating Baru", `Pembeli memberikan rating ulasan`, {
    produk: order.productTitle,
    penjual: order.sellerName,
    bintang: "⭐".repeat(order.rating),
    feedback: order.review
  });

  saveDb();

  res.json({ success: true, order });
});

// Notifications
app.get("/api/notifications", (req, res) => {
  res.json(globalNotifications);
});

app.post("/api/notifications/clear", (req, res) => {
  globalNotifications.forEach(n => n.read = true);
  saveDb();
  res.json({ success: true });
});

// Configuration endpoints
app.get("/api/discord/config", (req, res) => {
  res.json({ webhookUrl: discordWebhookUrl, logs: discordLogs });
});

app.post("/api/discord/config", (req, res) => {
  const { webhookUrl } = req.body;
  if (webhookUrl) {
    discordWebhookUrl = webhookUrl;
  }
  saveDb();
  res.json({ success: true, webhookUrl: discordWebhookUrl, logs: discordLogs });
});

app.get("/api/analytics", (req, res) => {
  // Compute key statistics for admin view
  const totalVolume = orders
    .filter(o => o.status !== "cancelled" && o.status !== "awaiting_payment")
    .reduce((sum, o) => sum + ((o.price * o.quantity) - (o.discountAmount || 0)), 0);

  // Count newly-registered live members (excluding the 6 built-in sandboxed accounts) to let counter start from 0
  const totalRegisteredUsers = users.filter(u => !["u-admin", "u-master-admin", "u-budi", "u-siti", "u-kantin", "u-anton"].includes(u.id)).length;
  const totalListedProducts = products.length;
  const totalTransactionsCount = orders.length;

  // Breakdown by category
  const categoryCount: Record<CategoryType, number> = {
    desain: 0,
    coding: 0,
    print: 0,
    fotografi: 0,
    makanan: 0,
    kebutuhan: 0
  };

  orders.forEach(o => {
    if (categoryCount[o.category] !== undefined) {
      categoryCount[o.category] += (o.price * o.quantity);
    }
  });

  // Recent order trends mock
  const recentOrdersCount = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 3);
    return orderDate >= dayAgo;
  }).length;

  res.json({
    totalVolume,
    totalRegisteredUsers,
    totalListedProducts,
    totalTransactionsCount,
    categoryBreakdown: categoryCount,
    recentOrdersCount,
    activeSellersCount: users.filter(u => u.role === "seller").length
  });
});

// --- JasJoking AI Assistant with Gemini & Graceful Simulation Fallback ---
let aiClient: any = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

app.post("/api/gemini/assist", async (req, res) => {
  const { prompt, mode, context } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Permintaan prompt tidak boleh kosong." });
  }

  let systemInstruction = "Anda adalah JasJoking AI, asisten pintar untuk JasJoking Mahasiswa (platform kantin/jasa kampus UMSU). Jawab secara profesional, komunikatif, dan ramah dengan nuansa lokal mahasiswa Medan/kampus. ";
  if (mode === "pricing") {
    systemInstruction += "Tugas Anda adalah memformulasikan taksiran harga jual yang optimal, rincian biaya modal, dan margin keuntungan bagi penjual. Berikan jawaban dalam bentuk markdown terstruktur dengan saran finansial yang logis, hemat namun bermanfaat dan memberi margin yang pantas.";
  } else if (mode === "description") {
    systemInstruction += "Tugas Anda adalah menulis deskripsi produk/jasa yang sangat menarik, persuasif untuk kalangan mahasiswa kampus, dan informatif. Sertakan nilai jual utama (USP) dan jargon kampus yang asyik.";
  } else if (mode === "recommendation") {
    systemInstruction += `Tugas Anda adalah merekomendasikan produk makanan atau jasa terbaik kepada pembeli berdasarkan preferensi mereka. Berikut daftar produk yang tersedia di sistem saat ini: ${JSON.stringify(products.map(p => ({ id: p.id, nama: p.title, harga: p.price, kategori: p.category, deskripsi: p.description, penjual: p.sellerName })))}. Jawab secara interaktif, ramah, dan tunjukkan nama produk & harganya.`;
  } else {
    systemInstruction += "Bantu pengguna (mahasiswa, mitra UMKM, atau penjual) menjawab pertanyaan seputar platform, jualan, promosi, atau kewirausahaan kampus dengan ramah, komunikatif, dan praktis.";
  }

  try {
    const ai = getGeminiClient();
    if (!ai) {
      // Graceful Simulation fallback if GEMINI_API_KEY is not defined.
      console.log("GEMINI_API_KEY tidak ada. Menggunakan simulasi asisten.");
      let simulatedReply = "";
      if (mode === "pricing") {
        simulatedReply = `### 💡 Analisis Harga Jual Pintar (Simulasi JasJoking AI)
Saran untuk produk: **"${prompt}"**

1. **Rekomendasi Kisaran Harga**: Rp15.000 - Rp25.000 (Sesuai rata-rata daya beli kawan-kawan mahasiswa UMSU).
2. **Estimasi Rincian Biaya**:
   - Bahan Mentah/Pokok: Rp8.500
   - Kemasan Premium (Paperbox/Cup): Rp1.500
   - Operational/Gas/Transport: Rp1.000
   - **Total Modal Usaha**: Rp11.000
3. **Persentase Margin Keuntungan**: ~45% - 55% (Sangat ramah kantong tapi tetap menghasilkan profit sehat!).
4. **Tips Finansial**: Gunakan sistem pre-order (PO) di JasJoking UMSU jika barang basah agar stok tidak terbuang percuma!`;
      } else if (mode === "description") {
        simulatedReply = `### ✨ Deskripsi Produk Premium (Simulasi JasJoking AI)
Berikut rancangan deskripsi kreatif untuk **"${prompt}"**:

*Capek habis kelas seharian? Tenang! Nikmati sajian spesial buatan kami yang higienis, lezat, dan ramah di kantong anak kos! Dibuat dengan cinta khusus untuk mahasiswa pejuang kelas pagi dan malam. Dijamin bikin nagih dan siap menemani hari-hari belajarmu di kampus UMSU! 🚀*`;
      } else if (mode === "recommendation") {
        const keyword = prompt.toLowerCase();
        const matches = products.filter(p => p.title.toLowerCase().includes(keyword) || p.description.toLowerCase().includes(keyword));
        if (matches.length > 0) {
          simulatedReply = `### 🍽️ Rekomendasi Jasa JasJoking untuk Anda (Simulasi AI):
Berdasarkan pencarian Anda, berikut mitra terbaik yang kami sarankan:
${matches.slice(0, 3).map(p => `- **${p.title}** oleh *${p.sellerName}* seharga **Rp${p.price.toLocaleString('id-ID')}** (Kategori: ${p.category}).`).join("\n")}
Pesan lewat sistem JasJoking sekarang untuk kemudahan konsultasi kawan!`;
        } else {
          simulatedReply = `### 🍽️ Rekomendasi Jasa JasJoking (Simulasi AI):
Wah, belum ada jasa yang persis cocok dengan kata kunci tersebut. Tapi jangan khawatir, ini dia beberapa jasa terlaris kami:
- **Jasa Desain Poster** (Rp35.000) oleh *Andi Kreatif (Mhs Ilmu Komunikasi UMSU)*
- **Jasa Pembuatan Slide PPT** (Rp50.000) oleh *Budi Creative Studio (Mhs Teknik UMSU)*
Coba pilih jasa terbaik lainnya di Menu navigasi kawan!`;
        }
      } else {
        simulatedReply = `### 🤖 Asisten JasJoking AI
Halo! Saya JasJoking AI. Saya siap membantu Anda mengelola jualan, mendesain promosi, menyusun kalkulasi harga modal, atau sekadar memilih menu hari ini. Silakan tanyakan apa saja yang Anda butuhkan seputar kampus UMSU dan produk mitra kami!`;
      }
      return res.json({ success: true, text: simulatedReply, simulated: true });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
      }
    });

    const reply = response.text || "Mohon maaf, AI tidak dapat memberikan respons saat ini.";
    return res.json({ success: true, text: reply, simulated: false });

  } catch (error: any) {
    console.error("Kesalahan Gemini API:", error);
    res.status(500).json({ error: "Gagal memproses via AI: " + error.message });
  }
});

// AI-powered order payment receipts audit & smart Network/Signal Simulator
app.post("/api/orders/:id/verify-payment", async (req, res) => {
  const { id } = req.params;
  const { paymentMethod, senderBank, senderName, transRef, rawScreenshotText, networkQuality } = req.body;

  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: "Pesanan tidak ditemukan kawan!" });
  }

  // Handle simulated network quality right here so it displays in the UI in real-time
  if (networkQuality === "offline") {
    return res.status(503).json({
      success: false,
      error: "JARINGAN LAPTOP/HP OFFLINE",
      warning: "⚠️ Koneksi bank gagal tersambung. Jaringan server bank kampus UMSU sedang luar talian (offline). Silakan ganti metode atau cari Wi-Fi kampus terdekat!"
    });
  }

  if (networkQuality === "buruk") {
    return res.status(500).json({
      success: false,
      error: "SINYAL BURUK / SIGNAL DOWN",
      warning: "❌ Sinyal buruk di sekitar gedung kuliah! Gagal melakukan sinkronisasi dengan server pusat bank. Coba cari lokasi luar ruangan yang lebih tinggi atau dekati ruter Wi-Fi."
    });
  }

  if (networkQuality === "lelet") {
    // Deliberate artificial slow connection simulation
    await new Promise(resolve => setTimeout(resolve, 3100));
    // Let's decide to fail or succeed with high ping description
    const isLucky = Math.random() > 0.45;
    if (!isLucky) {
      return res.status(408).json({
        success: false,
        error: "TIMEOUT / PING TINGGI",
        warning: "🐌 Hubungan terputus akibat koneksi lelet (Request Timeout). Sinyal BTS kampus sedang down/padat. Silakan coba klik verifikasi kembali sesaat lagi kawan!"
      });
    }
  }

  // Check if they supplied any transfer reference to prevent unauthenticated click mistakes!
  if (!transRef || transRef.trim().length < 4) {
    return res.status(400).json({
      success: false,
      error: "REFERENSI KOSONG",
      warning: "⚠️ Mohon isi nomor referensi transfer atau ID transaksi QRIS dengan benar! Kita butuh bukti otentik minimal 4 digit untuk pertanggungjawaban."
    });
  }

  const totalAmount = (order.price * order.quantity) - (order.discountAmount || 0);

  // Construct a prompt for AI Auditor
  const aiPrompt = `Audit detail pembayaran mahasiswa berikut:
  ID Pesanan: ${order.id}
  Produk: "${order.productTitle}"
  Total Kewajiban Bayar: Rp ${totalAmount.toLocaleString('id-ID')}
  Metode Dipilih: ${paymentMethod === 'qris' ? 'MOCK QRIS' : 'TRANSFER BANK'}
  Nama Pengirim: "${senderName || 'Tidak diisi'}"
  Bank Pengirim: "${senderBank || 'Tidak diisi'}"
  Nomor Ref Transaksi: "${transRef}"
  Catatan Tambahan: "${rawScreenshotText || 'Tidak ada'}"

  Putuskan apakah detail ini valid atau tidak. Jika ini transfer bank atau QRIS, cek apakah nomor kode transaksi terlihat beneran/realistis (min 4-12 digit alfanumerik). Berikan hasil analisis dalam format JSON dengan format persis berikut:
  {
    "verified": true,
    "confidence": 95,
    "analysis": "Penjelasan singkat menggunakan gaya pembicaraan ramah/santai mahasiswa Medan/UMSU dalam bahasa Indonesia",
    "actionRequired": "Instruksi apa yang perlu dilakukan pembeli selanjutnya jika verified false (kosongkan jika true)"
  }`;

  try {
    const ai = getGeminiClient();
    if (!ai) {
      // Offline / Local Audit Simulator if key doesn't exist
      console.log("No GEMINI_API_KEY. Simulating payment audit...");
      const isRefNumeric = /^[a-zA-Z0-9\-]+$/.test(transRef.trim());
      const meetsMinLen = transRef.trim().length >= 4;
      const isVerified = isRefNumeric && meetsMinLen;
      
      const resPayload = {
        verified: isVerified,
        confidence: isVerified ? 98 : 45,
        analysis: isVerified 
          ? `Halo kawan! AI JasJoking sudah mengonfirmasi transfer senilai Rp ${totalAmount.toLocaleString('id-ID')} atas nama ${senderName || 'Rivaldo'} lewat ${senderBank || 'Bank Mandiri'} dengan ID ${transRef}. Mutasi bank kami menyatakan dana AMAN masuk! Mantap kali kawan!`
          : `Waduh bro/sis, ID transaksi "${transRef}" kelihatannya terlalu pendek atau mencurigakan (tidak otentik). Tolong periksa balik ya kawan! Jangan sampai salah ketik biar ga kecolongan.`,
        actionRequired: isVerified 
          ? "" 
          : "Mohon ketik nomor referensi/ID transaksi yang asli dari resi bayar Anda dengan benar (minimal 4 karakter alfanumerik)."
      };

      if (isVerified) {
        order.status = "paid";
        order.chatHistory.push({
          senderId: "system",
          senderName: "JasJoking Payment AI",
          senderRole: "system",
          content: `🟢 AI VERIFIED: Dana transfer Rp ${totalAmount.toLocaleString('id-ID')} terdeteksi dan divalidasi sukses oleh asisten AI! Mutasi Bank dicocokkan dengan referensi: ${transRef}. Status: LUNAS.`,
          timestamp: new Date().toISOString()
        });
        saveDb();
        createNotification("Pembayaran Sukses Diverifikasi AI", `Pesanan ${order.id} berhasil terverifikasi otomatis oleh AI.`);
        sendDiscordWebhook("Pembayaran Berhasil (AI Verified)", `Transaksi diverifikasi lunas oleh robot AI JasJoking`, {
          id_pesanan: order.id,
          produk: order.productTitle,
          metode: paymentMethod === 'qris' ? 'QRIS' : 'Bank Transfer',
          ref_transaksi: transRef,
          pembeli: order.buyerName,
          status_baruStr: "PAID / LUNAS",
          waktu: new Date().toLocaleTimeString("id-ID")
        });
      }

      return res.json({ success: isVerified, ...resPayload });
    }

    // Call real Gemini model
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: aiPrompt,
      config: {
        systemInstruction: "You are the JasJoking Payment Audit AI for Universitas Muhammadiyah Sumatera Utara. Check user transaction references carefully to maintain accountability. Output raw JSON object matches the requested schema.",
        responseMimeType: "application/json"
      }
    });

    const textOutput = response.text || "{}";
    const result = JSON.parse(textOutput.trim());

    if (result.verified) {
      order.status = "paid";
      order.chatHistory.push({
        senderId: "system",
        senderName: "JasJoking Payment AI",
        senderRole: "system",
        content: `🟢 AI VERIFIED: ${result.analysis} (ID Transaksi: ${transRef})`,
        timestamp: new Date().toISOString()
      });
      saveDb();
      createNotification("Pembayaran Sukses Diverifikasi AI", `Pesanan ${order.id} berhasil terverifikasi otomatis oleh AI.`);
      sendDiscordWebhook("Pembayaran Berhasil (AI Verified)", `Transaksi diverifikasi lunas oleh robot AI JasJoking`, {
        id_pesanan: order.id,
        produk: order.productTitle,
        metode: paymentMethod === 'qris' ? 'QRIS' : 'Bank Transfer',
        ref_transaksi: transRef,
        pembeli: order.buyerName,
        status_baruStr: "PAID / LUNAS",
        waktu: new Date().toLocaleTimeString("id-ID")
      });
    }

    return res.json({ success: !!result.verified, ...result });

  } catch (error: any) {
    console.error("Kesalahan Audit Gemini API:", error);
    res.status(500).json({ success: false, error: "Deteksi gagal: Jaringan server AI sedang padat. Silakan coba kembali." });
  }
});

// Secure API to fetch and write raw JSON database payload (for admin/owners)
app.get("/api/admin/raw-db", (req, res) => {
  const { role } = req.query;
  if (role !== "admin") {
    return res.status(403).json({ error: "Unauthorized access" });
  }
  try {
    if (fs.existsSync(DB_FILE)) {
      const dbContent = fs.readFileSync(DB_FILE, "utf-8");
      return res.json(JSON.parse(dbContent));
    } else {
      return res.json({
        users,
        passwordStore,
        products,
        orders,
        discordWebhookUrl,
        discordLogs,
        globalNotifications
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Gagal memuat database: " + err.message });
  }
});

app.post("/api/admin/raw-db/save", (req, res) => {
  const { role, data } = req.body;
  if (role !== "admin") {
    return res.status(403).json({ error: "Unauthorized access" });
  }
  try {
    if (!data) {
      return res.status(400).json({ error: "Payload data kosong." });
    }
    // Update live memory arrays
    if (data.users) users = data.users;
    if (data.products) products = data.products;
    if (data.orders) orders = data.orders;
    if (data.discordWebhookUrl !== undefined) discordWebhookUrl = data.discordWebhookUrl;
    if (data.discordLogs) discordLogs = data.discordLogs;
    if (data.globalNotifications) globalNotifications = data.globalNotifications;

    saveDb();
    res.json({ success: true, message: "Database berhasil diperbarui permanen!" });
  } catch (err: any) {
    res.status(500).json({ error: "Gagal menyimpan database: " + err.message });
  }
});

// --- Vite Dev or Production Server Mounting ---
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  
  if (!isProduction) {
    console.log("==> [SYSTEM] Starting server in development mode (using Vite on-the-fly compiler)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Serve index.html with Vite transforms for local development
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log("==> [SYSTEM] Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    const indexPath = path.join(distPath, "index.html");
    
    if (!fs.existsSync(indexPath)) {
      console.warn("⚠️ WARNING: Folder build 'dist/' atau file 'dist/index.html' tidak ditemukan!");
      console.warn("👉 Jalankan 'npm run build' terlebih dahulu sebelum menjalankan server produksi.");
    }
    
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send(`
          <div style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 30px; text-align: center; border: 1px solid #fecaca; border-radius: 8px; background-color: #fef2f2; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <h1 style="color: #ef4444; margin-top: 0;">404 Not Found - Build Missing</h1>
            <p style="color: #374151; font-size: 16px; line-height: 1.5;">
              Aplikasi Anda mendeteksi variabel lingkungan <strong>NODE_ENV=production</strong> tetapi file hasil build (<code>dist/index.html</code>) belum ada atau folder <strong>dist/</strong> kosong.
            </p>
            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0; text-align: left;">
              <p style="margin-top: 0; font-weight: bold; color: #1f2937;">💡 Cara mengatasi:</p>
              <ol style="margin-bottom: 0; padding-left: 20px; color: #4b5563; line-height: 1.6;">
                <li>
                  <strong>Buka terminal Anda di Cursor/VS Code</strong>, lalu jalankan perintah perakitan proyek terlebih dahulu:
                  <pre style="background: #f3f4f6; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 14px; margin: 8px 0; color: #111827;">npm run build</pre>
                </li>
                <li>
                  Setelah sukses perakitan, jalankan server kembali dengan:
                  <pre style="background: #f3f4f6; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 14px; margin: 8px 0; color: #111827;">npm run dev</pre>
                </li>
                <li>
                  Atau jika Anda ingin menjalankan mode pengembangan (Vite HMR harian), pastikan variabel lingkungan <strong>NODE_ENV</strong> tidak bernilai <code>production</code>. Setel ke mode development dengan menjalankan perintah:
                  <pre style="background: #f3f4f6; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 14px; margin: 8px 0; color: #111827;">$env:NODE_ENV="development"; npm run dev</pre> (di PowerShell)
                </li>
              </ol>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">JasJoking Mahasiswa Portal - Universitas Muhammadiyah Sumatera Utara</p>
          </div>
        `);
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server JasJoking Mahasiswa berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer();
