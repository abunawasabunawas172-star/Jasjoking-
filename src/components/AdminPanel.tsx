import React, { useState, useEffect, useCallback } from 'react';
import { User, Order, DiscordLog, CategoryType, Product } from '../types';
import { ShieldAlert, BarChart3, Settings, HelpCircle, Save, CheckCircle, RefreshCw, X, Radio, Trash2, Calendar, UserCheck, MessageSquare, Send } from 'lucide-react';
import { CATEGORY_LABELS } from './ProductCard';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';

interface AdminPanelProps {
  user: User;
}

interface AnalyticsData {
  totalVolume: number;
  totalRegisteredUsers: number;
  totalListedProducts: number;
  totalTransactionsCount: number;
  categoryBreakdown: Record<CategoryType, number>;
  recentOrdersCount: number;
  activeSellersCount: number;
}

export function AdminPanel({ user }: AdminPanelProps) {
  const allowedAdminEmails = [
    'rezekisalsabilah06@gmail.com',
    'dianmarifas@gmail.com',
    'hafizrasyid23@gmail.com',
    'alifputrawan23@gmail.com',
    'marvinsyahid23@gmail.com'
  ];
  const isAdminUtama = allowedAdminEmails.includes(user.email?.toLowerCase() || '');
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [discordLogs, setDiscordLogs] = useState<DiscordLog[]>([]);
  
  // High fidelity database integration state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'migration' | 'raw_db'>('orders');
  
  // Stored raw JSON DB file states
  const [rawDbData, setRawDbData] = useState<any>(null);
  const [rawDbJsonString, setRawDbJsonString] = useState<string>('');
  const [saveDbStatus, setSaveDbStatus] = useState<string>('');
  const [isDbEditing, setIsDbEditing] = useState<boolean>(false);

  // Dynamic Admin controllers
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [overrideStaff, setOverrideStaff] = useState('');
  const [overrideTime, setOverrideTime] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [webhookSuccess, setWebhookSuccess] = useState('');
  const [testSuccess, setTestSuccess] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  // Fetch secure raw database content
  const fetchRawDb = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/raw-db?role=admin`);
      if (res.ok) {
        const data = await res.json();
        setRawDbData(data);
        setRawDbJsonString(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error("Gagal mendapatkan raw database:", err);
    }
  }, []);

  // Save changes to database
  const handleSaveRawDb = async () => {
    setSaveDbStatus('');
    try {
      // Validate JSON syntax first
      const parsedData = JSON.parse(rawDbJsonString);
      const res = await fetch('/api/admin/raw-db/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin', data: parsedData })
      });
      const resData = await res.json();
      if (res.ok) {
        setSaveDbStatus('🎉 DB Berhasil diperbarui secara langsung!');
        setRawDbData(parsedData);
        setIsDbEditing(false);
        fetchAdminData();
        setTimeout(() => setSaveDbStatus(''), 4000);
      } else {
        throw new Error(resData.error || 'Server error.');
      }
    } catch (err: any) {
      setSaveDbStatus(`❌ Gagal: ${err.message || 'Sintaks JSON tidak valid!'}`);
    }
  };

  // Fetch admin stats and listings
  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      // Get all global orders
      const resOrders = await fetch(`/api/orders?userId=${user.id}&role=admin`);
      if (resOrders.ok) {
        const data = await resOrders.json();
        setOrders(data);
        setSelectedOrder(prev => {
          if (!prev) return null;
          const fresh = data.find((o: Order) => o.id === prev.id);
          if (!fresh) return prev;
          // Compare strings to prevent reference changes and infinite loop kawan!
          if (JSON.stringify(fresh) !== JSON.stringify(prev)) {
            return fresh;
          }
          return prev;
        });
      }

      // Get users list securely as admin
      const resUsers = await fetch(`/api/admin/users?role=admin`);
      if (resUsers.ok) {
        const du = await resUsers.json();
        setUsersList(du);
      }

      // Get products list
      const resProds = await fetch(`/api/products`);
      if (resProds.ok) {
        const dp = await resProds.json();
        setProductsList(dp);
      }

      // Get analytics
      const resAnal = await fetch('/api/analytics');
      if (resAnal.ok) {
        const data = await resAnal.json();
        setAnalytics(data);
      }

      // Get webhook configuration
      const resWeb = await fetch('/api/discord/config');
      if (resWeb.ok) {
        const data = await resWeb.json();
        setWebhookUrl(data.webhookUrl || '');
        setDiscordLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 5000);
    return () => clearInterval(interval);
  }, [fetchAdminData]);

  useEffect(() => {
    if (activeTab === 'raw_db') {
      fetchRawDb();
    }
  }, [activeTab, fetchRawDb]);

  // Save Webhook configuration
  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookSuccess('');
    try {
      const res = await fetch('/api/discord/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl })
      });
      if (res.ok) {
        setWebhookSuccess('Webhook Discord tersimpan & diaktifkan!');
        fetchAdminData();
        setTimeout(() => setWebhookSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestDiscord = async () => {
    setTestSuccess('');
    setTestLoading(true);
    try {
      const res = await fetch('/api/discord/test', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setTestSuccess('Pesan uji coba sukses dikirim ke Discord Anda!');
        fetchAdminData();
        setTimeout(() => setTestSuccess(''), 4000);
      } else {
        setTestSuccess('Gagal: ' + (data.error || 'Terjadi kesalahan.'));
      }
    } catch (err: any) {
      setTestSuccess('Error koneksi: ' + err.message);
    } finally {
      setTestLoading(false);
    }
  };

  // Override order (change staff and schedule)
  const handleOverrideOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedStaff: overrideStaff,
          scheduledTime: overrideTime
        })
      });
      if (res.ok) {
        fetchAdminData();
        setOverrideStaff('');
        setOverrideTime('');
        setSelectedOrder(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Simulated push update notification dispatch helper
  const handleQuickStatusChange = async (orderId: string, statusVal: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusVal })
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const executeSqlDumpDownload = () => {
    let sql = `-- ========================================================\n`;
    sql += `-- DATABASE MIGRATION SCRIPT FOR phpMyAdmin & MySQL (XAMPP)\n`;
    sql += `-- Generated live on: ${new Date().toLocaleString('id-ID')} WIB\n`;
    sql += `-- JasJoking Mahasiswa Portal - Export Utility\n`;
    sql += `-- ========================================================\n\n`;
    
    sql += `CREATE DATABASE IF NOT EXISTS \`jasjoking_mahasiswa\`;\n`;
    sql += `USE \`jasjoking_mahasiswa\`;\n\n`;

    // 1. Users Table DDL
    sql += `-- [TABLE 1]: users --\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`users\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
    sql += `  \`username\` VARCHAR(100) NOT NULL,\n`;
    sql += `  \`email\` VARCHAR(150) NOT NULL UNIQUE,\n`;
    sql += `  \`role\` ENUM('buyer', 'seller', 'admin') NOT NULL DEFAULT 'buyer',\n`;
    sql += `  \`storeName\` VARCHAR(150) NULL,\n`;
    sql += `  \`avatarUrl\` TEXT NULL,\n`;
    sql += `  \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

    sql += `-- Seed users data --\n`;
    usersList.forEach(u => {
      const sn = u.storeName ? `'${u.storeName.replace(/'/g, "''")}'` : 'NULL';
      const av = u.avatarUrl ? `'${u.avatarUrl.replace(/'/g, "''")}'` : 'NULL';
      sql += `INSERT INTO \`users\` (\`id\`, \`username\`, \`email\`, \`role\`, \`storeName\`, \`avatarUrl\`) VALUES \n`;
      sql += `('${u.id}', '${u.username.replace(/'/g, "''")}', '${u.email.replace(/'/g, "''")}', '${u.role}', ${sn}, ${av})\n`;
      sql += `ON DUPLICATE KEY UPDATE \`username\`=VALUES(\`username\`), \`storeName\`=VALUES(\`storeName\`);\n\n`;
    });

    // 2. Products Table DDL
    sql += `\n-- [TABLE 2]: products --\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`products\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
    sql += `  \`sellerId\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`sellerName\` VARCHAR(150) NOT NULL,\n`;
    sql += `  \`title\` VARCHAR(150) NOT NULL,\n`;
    sql += `  \`description\` TEXT NOT NULL,\n`;
    sql += `  \`price\` INT NOT NULL,\n`;
    sql += `  \`imageUrl\` TEXT NOT NULL,\n`;
    sql += `  \`category\` ENUM('desain', 'coding', 'print', 'fotografi') NOT NULL,\n`;
    sql += `  \`stock\` INT NOT NULL DEFAULT 99,\n`;
    sql += `  FOREIGN KEY (\`sellerId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

    sql += `-- Seed products data --\n`;
    productsList.forEach(p => {
      sql += `INSERT INTO \`products\` (\`id\`, \`sellerId\`, \`sellerName\`, \`title\`, \`description\`, \`price\`, \`imageUrl\`, \`category\`, \`stock\`) VALUES \n`;
      sql += `('${p.id}', '${p.sellerId}', '${p.sellerName.replace(/'/g, "''")}', '${p.title.replace(/'/g, "''")}', '${p.description.replace(/'/g, "''")}', ${p.price}, '${p.imageUrl.replace(/'/g, "''")}', '${p.category}', ${p.stock || 1})\n`;
      sql += `ON DUPLICATE KEY UPDATE \`title\`=VALUES(\`title\`), \`price\`=VALUES(\`price\`);\n\n`;
    });

    // 3. Orders Table DDL
    sql += `\n-- [TABLE 3]: orders --\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`orders\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
    sql += `  \`buyerId\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`buyerName\` VARCHAR(100) NOT NULL,\n`;
    sql += `  \`sellerId\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`sellerName\` VARCHAR(150) NOT NULL,\n`;
    sql += `  \`productId\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`productTitle\` VARCHAR(150) NOT NULL,\n`;
    sql += `  \`price\` INT NOT NULL,\n`;
    sql += `  \`category\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`quantity\` INT NOT NULL DEFAULT 1,\n`;
    sql += `  \`status\` ENUM('awaiting_payment', 'paid', 'processing', 'completed', 'cancelled') NOT NULL DEFAULT 'awaiting_payment',\n`;
    sql += `  \`qrisUrl\` TEXT NOT NULL,\n`;
    sql += `  \`selectedStaff\` VARCHAR(100) NULL,\n`;
    sql += `  \`scheduledTime\` VARCHAR(100) NULL,\n`;
    sql += `  \`seatingRequest\` VARCHAR(100) NULL,\n`;
    sql += `  \`discountAmount\` INT NULL DEFAULT 0,\n`;
    sql += `  \`originalPrice\` INT NULL DEFAULT 0,\n`;
    sql += `  \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  FOREIGN KEY (\`buyerId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,\n`;
    sql += `  FOREIGN KEY (\`sellerId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,\n`;
    sql += `  FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

    if (orders.length > 0) {
      sql += `-- Seed existing orders data --\n`;
      orders.forEach(o => {
        const staff = o.selectedStaff ? `'${o.selectedStaff.replace(/'/g, "''")}'` : 'NULL';
        const sched = o.scheduledTime ? `'${o.scheduledTime.replace(/'/g, "''")}'` : 'NULL';
        const seat = o.seatingRequest ? `'${o.seatingRequest.replace(/'/g, "''")}'` : 'NULL';
        const disc = o.discountAmount || 0;
        const orig = o.originalPrice || (o.price * o.quantity);
        sql += `INSERT INTO \`orders\` (\`id\`, \`buyerId\`, \`buyerName\`, \`sellerId\`, \`sellerName\`, \`productId\`, \`productTitle\`, \`price\`, \`category\`, \`quantity\`, \`status\`, \`qrisUrl\`, \`selectedStaff\`, \`scheduledTime\`, \`seatingRequest\`, \`discountAmount\`, \`originalPrice\`) VALUES \n`;
        sql += `('${o.id}', '${o.buyerId}', '${o.buyerName}', '${o.sellerId}', '${o.sellerName.replace(/'/g, "''")}', '${o.productId}', '${o.productTitle.replace(/'/g, "''")}', ${o.price}, '${o.category}', ${o.quantity}, '${o.status}', '${o.qrisUrl}', ${staff}, ${sched}, ${seat}, ${disc}, ${orig});\n\n`;
      });
    }

    const blob = new Blob([sql], { type: 'text/sql;charset=utf-8;' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `jasjoking_mahasiswa_mysql_dump.sql`;
    a.click();
    URL.revokeObjectURL(u);
  };

  // Helper to compile daily trends data from real orders
  const getDailyTrendData = () => {
    const tempMap: Record<string, { rawDate: string, date: string, count: number, revenue: number }> = {};
    
    // Sort all orders by chronological creation date
    const sortedOrders = [...orders]
      .filter(o => o.status !== 'cancelled')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    sortedOrders.forEach(o => {
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) return;
      
      // Grouping key: YYYY-MM-DD
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      
      // Formatting label for XAxis: "DD MMM" (e.g. 08 Jun)
      const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
      const formattedLabel = d.toLocaleDateString('id-ID', options);
      
      const priceVal = o.price || 0;
      const qty = o.quantity || 1;
      const disc = o.discountAmount || 0;
      const orderRevenue = (priceVal * qty) - disc;
      
      if (!tempMap[key]) {
        tempMap[key] = {
          rawDate: key,
          date: formattedLabel,
          count: 0,
          revenue: 0
        };
      }
      
      tempMap[key].count += 1;
      tempMap[key].revenue += orderRevenue;
    });
    
    const dataList = Object.values(tempMap).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
    
    if (dataList.length === 0) {
      // Return high fidelity realistic mock data so that the admin has an immediate visual baseline
      return [
        { date: '02 Jun', count: 4, revenue: 120000 },
        { date: '03 Jun', count: 8, revenue: 310000 },
        { date: '04 Jun', count: 6, revenue: 215000 },
        { date: '05 Jun', count: 11, revenue: 540000 },
        { date: '06 Jun', count: 9, revenue: 380500 },
        { date: '07 Jun', count: 15, revenue: 686000 },
        { date: '08 Jun', count: 21, revenue: 1245000 },
      ];
    }
    
    return dataList;
  };

  // Helper to compile best selling product categories
  const getCategoryChartData = () => {
    const tempMap: Record<CategoryType, { name: string, label: string, sales: number, revenue: number, fill: string }> = {
      desain: { name: 'desain', label: 'Desain Grafis / IT', sales: 0, revenue: 0, fill: '#6366f1' }, // Indigo
      coding: { name: 'coding', label: 'Tutor & Coding', sales: 0, revenue: 0, fill: '#3b82f6' }, // Blue
      print: { name: 'print', label: 'Pengetikan & Print', sales: 0, revenue: 0, fill: '#0a9396' }, // Teal
      fotografi: { name: 'fotografi', label: 'Fotografi', sales: 0, revenue: 0, fill: '#00b4d8' }, // Cyan
      makanan: { name: 'makanan', label: 'Makanan / Kantin', sales: 0, revenue: 0, fill: '#10b981' }, // Emerald
      kebutuhan: { name: 'kebutuhan', label: 'ATK & Kebutuhan', sales: 0, revenue: 0, fill: '#f59e0b' } // Amber
    };
    
    orders.forEach(o => {
      if (o.status === 'cancelled') return;
      const cat = o.category;
      if (tempMap[cat]) {
        tempMap[cat].sales += o.quantity || 1;
        
        const priceVal = o.price || 0;
        const qty = o.quantity || 1;
        const disc = o.discountAmount || 0;
        tempMap[cat].revenue += (priceVal * qty) - disc;
      }
    });
    
    const dataList = Object.values(tempMap).filter(item => item.sales > 0 || item.revenue > 0);
    
    if (dataList.length === 0) {
      // Return high fidelity realistic mock data so that the admin has an immediate visual baseline
      return [
        { name: 'desain', label: 'Desain Grafis / IT', sales: 14, revenue: 490000, fill: '#6366f1' },
        { name: 'coding', label: 'Tutor & Coding', sales: 8, revenue: 1600000, fill: '#3b82f6' },
        { name: 'print', label: 'Pengetikan & Print', sales: 35, revenue: 525000, fill: '#0a9396' },
        { name: 'fotografi', label: 'Fotografi', sales: 5, revenue: 750000, fill: '#00b4d8' },
        { name: 'makanan', label: 'Makanan / Kantin', sales: 62, revenue: 1116000, fill: '#10b981' },
        { name: 'kebutuhan', label: 'ATK & Kebutuhan', sales: 41, revenue: 492000, fill: '#f59e0b' }
      ];
    }
    
    return dataList;
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      
      {/* Segmented Head Tab Controller */}
      <div className="flex border-b border-slate-200 gap-1.5 p-1 bg-slate-100 rounded-xl max-w-sm sm:max-w-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-2 px-3 text-[10px] sm:text-xs font-black rounded-lg tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'orders'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
          }`}
        >
          📈 Monitoring & Transaksi
        </button>
        {isAdminUtama && (
          <button
            onClick={() => setActiveTab('migration')}
            className={`py-2 px-3 text-[10px] sm:text-xs font-black rounded-lg tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none ${
              activeTab === 'migration'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            🗄️ phpMyAdmin & MySQL (XAMPP)
          </button>
        )}
        {isAdminUtama && (
          <button
            onClick={() => setActiveTab('raw_db')}
            className={`py-2 px-3 text-[10px] sm:text-xs font-black rounded-lg tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none ${
              activeTab === 'raw_db'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            💾 Live JSON DB
          </button>
        )}
      </div>

      {activeTab === 'orders' && (
        <>
          {/* 1. Header Admin Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Akumulasi Omset Kampus
          </span>
          <span className="text-xl font-bold text-slate-900 block mt-1">
            Rp {(analytics?.totalVolume || 0).toLocaleString('id-ID')}
          </span>
          <span className="text-[9px] text-emerald-650 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded mt-2 inline-block">
            📈 Volume Transaksi Riil
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Anggota Terdaftar
          </span>
          <span className="text-xl font-bold text-slate-900 block mt-1">
            {analytics?.totalRegisteredUsers || 0} Pengguna
          </span>
          <span className="text-[9px] text-indigo-650 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded mt-2 inline-block">
            👥 Buyer, Seller & UMKM
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">
            Jumlah Jualan Aktif
          </span>
          <span className="text-xl font-bold text-slate-900 block mt-1">
            {analytics?.totalListedProducts || 0} Katalog
          </span>
          <span className="text-[9px] text-teal-650 font-semibold bg-teal-50 px-1.5 py-0.5 rounded mt-2 inline-block">
            📦 Buku, Jasa, UMKM
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Total Antrian Orderan
          </span>
          <span className="text-xl font-bold text-slate-900 block mt-1">
            {orders.length} Pemesanan
          </span>
          <span className="text-[9px] text-amber-650 font-semibold bg-amber-50 px-1.5 py-0.5 rounded mt-2 inline-block">
            ⚙️ Sedang Dipantau Admin
          </span>
        </div>

      </div>

      {/* Recharts Data Visualization Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div>
          <h3 className="font-bold text-sm text-slate-850 flex items-center gap-1.5">
            <span className="p-1 px-1.5 bg-indigo-50 text-indigo-600 rounded">📊</span>
            <span>Dashboard Visualisasi Keuangan & Tren Transaksi</span>
          </h3>
          <p className="text-[10px] text-slate-400">Analisis metrik keuangan, tren pesanan harian, dan akumulasi omset per kategori produk jasa/UMKM secara grafis</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Chart 1: Tren Pendapatan & Vol Transaksi Harian */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-3.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-205/40">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest flex items-center gap-1">
                📅 Tren Harian: Pendapatan & Transaksi
              </span>
              <span className="text-[9px] bg-emerald-100 text-emerald-805 font-black px-1.5 py-0.2 rounded uppercase">Live Sync</span>
            </div>
            
            <div className="h-64 sm:h-72 w-full pr-2">
              <ResponsiveContainer width="100%" height={260} minWidth={0}>
                <AreaChart data={getDailyTrendData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickStyle={{ fontSize: 9, fontWeight: 500, fill: '#64748b' }} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} tickStyle={{ fontSize: 9, fill: '#10b981' }} tickFormatter={(value) => `Rp ${(value / 1000).toLocaleString('id')}k`} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickStyle={{ fontSize: 9, fill: '#6366f1' }} />
                  <Tooltip
                    contentStyle={{ fontSize: 10, fontFamily: 'sans-serif', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                    formatter={(value: any, name: string) => {
                      if (name === "revenue") return [`Rp ${value.toLocaleString('id-ID')}`, 'Omset Harian'];
                      if (name === "count") return [`${value} Transaksi`, 'Jumlah Order'];
                      return [value, name];
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9, fontWeight: 700, paddingBottom: 10 }} />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" name="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area yAxisId="right" type="monotone" dataKey="count" name="count" stroke="#6366f1" strokeWidth={1.5} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Kategori Terlaris */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-3.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-205/40">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest flex items-center gap-1">
                🛍️ Kategori Terlaris (Qty Item Terjual)
              </span>
              <span className="text-[9px] bg-indigo-100 text-indigo-805 font-black px-1.5 py-0.2 rounded uppercase">UMKM & Jasa</span>
            </div>

            <div className="h-64 sm:h-72 w-full pr-2">
              <ResponsiveContainer width="100%" height={260} minWidth={0}>
                <BarChart data={getCategoryChartData()} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickStyle={{ fontSize: 8, fontWeight: 600, fill: '#64748b' }} />
                  <YAxis tickLine={false} axisLine={false} tickStyle={{ fontSize: 9, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ fontSize: 10, fontFamily: 'sans-serif', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                    formatter={(value: any, name: string) => {
                      if (name === "sales") return [`${value} Unit`, 'Pemesanan'];
                      if (name === "revenue") return [`Rp ${value.toLocaleString('id-ID')}`, 'Akumulasi Uang'];
                      return [value, name];
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9, fontWeight: 700, paddingBottom: 10 }} />
                  <Bar dataKey="sales" name="sales" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {getCategoryChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Visual Bento-Grid Category Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Category Breakdown (Visual custom bar meters) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-800">Pembagian Berdasarkan Nilai Kategori</h3>
            <p className="text-[10px] text-slate-400">Total volume uang yang beredar dari masing-masing jenis jualan</p>
          </div>

          <div className="space-y-3">
            {analytics && Object.keys(analytics.categoryBreakdown).map((key) => {
              const val = analytics.categoryBreakdown[key as CategoryType] || 0;
              const maxVal = Math.max(...(Object.values(analytics.categoryBreakdown) as number[]), 1);
              const percent = Math.min(100, Math.round((val / maxVal) * 100));
              const catConfig = CATEGORY_LABELS[key as CategoryType] || { label: key };
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{catConfig.label}</span>
                    <span className="font-bold text-slate-900">Rp {val.toLocaleString('id-ID')}</span>
                  </div>
                  {/* Styled meter bar */}
                  <div className="h-2 w-full bg-slate-105 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Discord Webhook Manager Console */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Discord Notification Service</h3>
              <p className="text-[10px] text-slate-400">Integrasikan pesanan & payment ke server Discord mading kampus</p>
            </div>
          </div>

          <form onSubmit={handleSaveWebhook} className="space-y-3">
            {webhookSuccess && <p className="text-xs text-emerald-700 font-bold bg-emerald-50 p-1.5 rounded">{webhookSuccess}</p>}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Webhook URL</label>
              <input
                type="url"
                required
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full text-xs p-2 bg-slate-50 border border-slate-205 rounded focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded text-xs font-semibold cursor-pointer transition flex items-center gap-1"
              >
                <Save className="h-3.5 w-3.5" />
                Simpan Webhook
              </button>
              
              <button
                type="button"
                onClick={handleTestDiscord}
                disabled={testLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded text-xs font-semibold cursor-pointer transition flex items-center gap-1"
              >
                {testLoading ? 'Mengirim...' : 'Kirim Uji Coba'}
              </button>
            </div>
            {testSuccess && <p className="text-[10px] text-indigo-700 font-bold bg-indigo-50 p-1.5 rounded">{testSuccess}</p>}
          </form>

          {/* Webhook Dispatch History console log output */}
          <div className="space-y-2">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Log Trigger Notifikasi ({discordLogs.length})
            </span>
            <div className="bg-slate-900 text-slate-300 font-mono text-[9px] p-2.5 rounded-lg max-h-[140px] overflow-y-auto space-y-1.5 leading-relaxed">
              {discordLogs.length === 0 ? (
                <p className="text-slate-500 italic text-center">Belum ada aktivitas webhook terkirim.</p>
              ) : (
                discordLogs.map((log) => (
                  <div key={log.id} className="border-b border-slate-800 pb-1.5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-yellow-500">
                      <span>[{new Date(log.timestamp).toLocaleTimeString()}] EVENT: {log.event}</span>
                      <span className="text-emerald-400 font-bold">SUKSES</span>
                    </div>
                    <p className="text-slate-400 break-all">{log.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 3. Global Orders Monitor & Queue Scheduler Controller */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-800">Oversight Semua Pesanan Kampus</h3>
            <p className="text-[10px] text-slate-400">Sebagai administrator, Anda dapat meraba jadwal pengerjaan, mengganti pelaksana, atau mempercepat selesainya transaksi.</p>
          </div>
          <button onClick={fetchAdminData} className="p-1 px-3 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg flex items-center gap-1 font-semibold cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5" />
            Reload Antrian
          </button>
        </div>

        {orders.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-12">Belum ada orderan masuk dalam sistem.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <th className="p-2 py-3 font-semibold">Order ID</th>
                  <th className="p-2 py-3 font-semibold">Pembeli</th>
                  <th className="p-2 py-3 font-semibold">Mitra & Jasa kawan</th>
                  <th className="p-2 py-3 font-semibold">Spesialis & Jadwal</th>
                  <th className="p-2 py-3 font-semibold">Total harga</th>
                  <th className="p-2 py-3 font-semibold">Status</th>
                  <th className="p-2 py-3 pr-3 text-right font-semibold">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-2 pl-3 font-mono text-slate-500">{o.id}</td>
                    <td className="p-2 font-semibold text-slate-800">{o.buyerName}</td>
                    <td className="p-2">
                      <div className="font-bold text-slate-900">{o.productTitle}</div>
                      <div className="text-[10px] text-slate-400">{o.sellerName}</div>
                    </td>
                    <td className="p-2 space-y-0.5 text-left">
                      {o.selectedStaff && (
                        <span className="block text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-medium">
                          👤 {o.selectedStaff}
                        </span>
                      )}
                      {o.scheduledTime && (
                        <span className="block text-[10px] text-slate-500">
                          📅 {o.scheduledTime}
                        </span>
                      )}
                      {!o.selectedStaff && <span className="text-slate-300">-</span>}
                    </td>
                    <td className="p-2 font-bold text-slate-900">
                      Rp {(o.price * o.quantity).toLocaleString('id')}
                    </td>
                    <td className="p-2">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                        o.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        o.status === 'cancelled' ? 'bg-rose-100 text-rose-850' :
                        o.status === 'awaiting_payment' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                        'bg-slate-100 text-indigo-805'
                      }`}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-2 pr-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedOrder(o);
                          setOverrideStaff(o.selectedStaff || '');
                          setOverrideTime(o.scheduledTime || '');
                        }}
                        className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold cursor-pointer transition"
                      >
                        🕒 Atur Jadwal
                      </button>
                      
                      {o.status !== 'completed' && (
                        <button
                          onClick={() => handleQuickStatusChange(o.id, 'completed')}
                          className="p-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold cursor-pointer transition"
                        >
                          Selesai
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CHAT MONITORING & MIRRORING RADAR */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-rose-500/10 text-rose-505 rounded-xl relative">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-sans font-black text-sm text-white flex items-center gap-2 uppercase tracking-wide">
              <span>🛰️ Radar Sadap Chatting (Real-time Mirroring Panel)</span>
            </h3>
            <p className="text-[10px] text-slate-400">Panel peninjau mading utama untuk menyadap percakapan Mahasiswa dan Mitra Jasa agar meniadakan kesilapan transaksional.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs text-left">
          {/* List of ongoing chats */}
          <div className="md:col-span-4 bg-slate-950/60 p-3 rounded-2xl border border-white/5 space-y-2 max-h-[300px] overflow-y-auto">
            <span className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1">Daftar Kanal Chat Aktif ({orders.length})</span>
            {orders.length === 0 ? (
              <p className="text-slate-500 italic text-[10px] text-center py-4">Tidak ada chat terdeteksi.</p>
            ) : (
              orders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedOrder(o)}
                  className={`w-full text-left p-2.5 rounded-xl transition duration-150 flex flex-col gap-0.5 cursor-pointer ${
                    selectedOrder?.id === o.id
                      ? 'bg-rose-950/40 text-rose-300 border border-rose-900/60 ring-1 ring-rose-900/40'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center w-full font-bold">
                    <span className="font-mono text-[9px] text-slate-400 uppercase">{o.id}</span>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-300 px-1.5 py-0.2 rounded font-semibold font-mono">
                      {o.chatHistory.length} Msg
                    </span>
                  </div>
                  <span className="font-bold truncate text-[11px] text-slate-250 font-sans">{o.productTitle}</span>
                  <span className="text-[10px] text-slate-400 truncate font-sans block mt-0.5">Mhs: {o.buyerName} &rarr; {o.sellerName}</span>
                </button>
              ))
            )}
          </div>

          {/* Chat mirror stream viewer */}
          <div className="md:col-span-8 bg-slate-950/30 p-4 rounded-2xl border border-white/5 flex flex-col justify-between max-h-[300px]">
            {selectedOrder ? (
              <>
                <div className="border-b border-white/5 pb-2 mb-3">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Kanal Penyadapan Aktivitas {selectedOrder.id}</span>
                  <h4 className="font-black text-rose-350 font-sans text-sm">{selectedOrder.productTitle}</h4>
                  <p className="text-[10px] text-slate-405 mt-0.5">Pembeli: <strong className="text-white">{selectedOrder.buyerName}</strong> | Penjual: <strong className="text-white">{selectedOrder.sellerName}</strong></p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin max-h-[160px] pb-3 text-left">
                  {selectedOrder.chatHistory.length === 0 ? (
                    <p className="text-slate-500 italic text-center text-xs py-4">Belum ada obrolan terkirim pada obyek orderan ini.</p>
                  ) : (
                    selectedOrder.chatHistory.map((m, idx) => {
                      const isSystem = m.senderRole === 'system';
                      const isSeller = m.senderRole === 'seller';
                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl border flex flex-col gap-0.5 leading-snug font-sans text-[11px] ${
                            isSystem ? 'bg-slate-900 border-slate-800 text-slate-400 text-center font-mono' :
                            isSeller ? 'bg-indigo-950/40 border-indigo-900/40 text-indigo-200' :
                            'bg-emerald-950/40 border-emerald-900/40 text-emerald-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold uppercase text-[9px] tracking-wider">
                              {isSystem ? '💻 SYSTEM EVENT' : isSeller ? `🏪 SELLER: ${m.senderName}` : `👦 BUYER: ${m.senderName}`}
                            </span>
                            <span className="text-[8px] opacity-60 font-mono">
                              {new Date(m.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Operational system command intervention mock tool */}
                <div className="border-t border-white/5 pt-2 mt-2 flex items-center justify-between text-[10px] text-slate-500 font-sans">
                  <span>🔴 Mode Mirroring Penyadapan Pembicaraan Aktif: 100% Terpantau Pemilik</span>
                  <span className="text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded font-mono select-none">
                    Oversight Audited
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 italic py-10 space-y-1 bg-slate-950/40 rounded-xl border border-dashed border-white/5">
                <span>pilih kanal chat di sebelah kiri untuk menyadap aktivitas percakapan secara teratur...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      </>
      )}

      {activeTab === 'migration' && isAdminUtama && (
        /* DATABASE MIGRATION TAB CONTENT LAYOUT */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Hero Card for Migration */}
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 space-y-3 max-w-xl">
              <span className="text-[10px] font-mono tracking-widest text-indigo-200 uppercase bg-white/20 px-2 py-0.5 rounded font-bold">
                DILENGKAPI EKSPOR DATA OTOMATIS
              </span>
              <h2 className="text-xl sm:text-2xl font-black">Interkoneksi Sistem ke phpMyAdmin MySQL</h2>
              <p className="text-xs text-indigo-100 leading-relaxed font-sans">
                Anda ingin mendeploy atau memindahkan data platform JasJoking Mahasiswa ke sistem database phpMyAdmin / XAMPP lokal Anda? 
                Gunakan utilitas kami untuk mengunduh skrip SQL lengkap yang langsung siap di-import!
              </p>
              
              <div className="pt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={executeSqlDumpDownload}
                  className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  📥 Download File SQL Migrasi (.sql)
                </button>
              </div>
            </div>
            
            {/* Ambient Graphic Accent */}
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 text-[120px] select-none pointer-events-none font-bold font-mono">
              SQL
            </div>
          </div>

          {/* Step-by-Step setup instruction cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-black">1</span>
                <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-800">Nyalakan Apache & MySQL</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Buka aplikasi <strong>XAMPP Control Panel</strong> Anda, lalu klik tombol <strong>Start</strong> pada modul <strong>Apache</strong> dan <strong>MySQL</strong> hingga berwarna hijau.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-black">2</span>
                <h3 className="font-extrabold text-xs uppercase tracking-wide text-indigo-700">Buat Database Lokal</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Buka browser ke <strong>http://localhost/phpmyadmin</strong>. Buat database baru bernama <strong className="font-mono text-indigo-700">jasjoking_mahasiswa</strong> dengan Collation default.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black">3</span>
                <h3 className="font-extrabold text-xs uppercase tracking-wide text-emerald-700">Import File SQL</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Klik database baru tersebut, pilih menu <strong>Import</strong> di toolbar atas, upload file <strong className="font-mono text-slate-600">.sql</strong> yang Anda unduh, lalu klik <strong>Go/Import</strong>.
              </p>
            </div>
          </div>

          {/* SQL Preview Code Block Widget */}
          <div className="bg-slate-900 rounded-xl p-4 text-white shadow-inner space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                <span className="inline-block w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider ml-1">
                  Preview Skema SQL (DDL) phpMyAdmin
                </span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded font-bold uppercase">
                MySQL Syntax
              </span>
            </div>
            
            <pre className="text-[11px] font-mono leading-relaxed text-slate-300 overflow-x-auto max-h-[200px] p-2 bg-slate-950/80 rounded border border-white/5 text-left whitespace-pre">
{`-- ==========================================
-- CREATE DATABASE & CONNECTIVITY RULES
-- ==========================================
CREATE DATABASE IF NOT EXISTS \`jasjoking_mahasiswa\`;
USE \`jasjoking_mahasiswa\`;

-- [1] TABEL USERS (Pembeli & Mitra UMKM)
CREATE TABLE \`users\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`username\` varchar(100) NOT NULL,
  \`email\` varchar(150) NOT NULL UNIQUE,
  \`role\` enum('buyer','seller','admin') NOT NULL DEFAULT 'buyer',
  \`storeName\` varchar(150) DEFAULT NULL,
  \`avatarUrl\` text DEFAULT NULL,
  \`createdAt\` timestamp DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- [2] TABEL PRODUCTS (Katalog Buku, Jasa, UMKM)
CREATE TABLE \`products\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`sellerId\` varchar(50) NOT NULL,
  \`sellerName\` varchar(150) NOT NULL,
  \`title\` varchar(150) NOT NULL,
  \`description\` text NOT NULL,
  \`price\` int(11) NOT NULL,
  \`imageUrl\` text NOT NULL,
  \`category\` enum('desain','coding','print','fotografi') NOT NULL,
  \`stock\` int(11) NOT NULL DEFAULT 1,
  FOREIGN KEY (\`sellerId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- [3] TABEL ORDERS (Semua Transaksi Kampus)
CREATE TABLE \`orders\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`buyerId\` varchar(50) NOT NULL,
  \`buyerName\` varchar(100) NOT NULL,
  \`sellerId\` varchar(50) NOT NULL,
  \`sellerName\` varchar(150) NOT NULL,
  \`productId\` varchar(50) NOT NULL,
  \`productTitle\` varchar(150) NOT NULL,
  \`price\` int(11) NOT NULL,
  \`category\` varchar(50) NOT NULL,
  \`quantity\` int(11) NOT NULL DEFAULT 1,
  \`status\` enum('awaiting_payment','paid','processing','completed','cancelled') NOT NULL,
  \`qrisUrl\` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`}
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'raw_db' && isAdminUtama && (
        <div className="space-y-6 animate-in fade-in duration-200 text-slate-800">
          {/* Database Banner Card */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 space-y-3 max-w-xl text-left">
              <span className="text-[10px] font-mono tracking-widest text-emerald-200 bg-white/20 px-2.5 py-0.5 rounded font-bold uppercase">
                Akses & Transparansi Data Riil
              </span>
              <h2 className="text-xl sm:text-2xl font-black">Live JSON Database Server (`database_store.json`)</h2>
              <p className="text-xs text-emerald-100 leading-relaxed font-sans">
                Berikut adalah visualisasi dan isi file penyimpanan fisik server Anda. Di platform nyata, data tersimpan aman di berkas <strong className="font-mono text-white underline">database_store.json</strong> agar data transaksi, chat, sandi, dan status verifikasi tidak hilang ketika server di-refresh.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 translate-y-6 translate-x-4 opacity-10 pointer-events-none text-9xl select-none">💾</div>
          </div>

          {/* Database Metadata Summary Badges */}
          {rawDbData ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
                <span className="block text-[10px] text-slate-400 font-extrabold uppercase">👥 Users</span>
                <span className="text-lg font-black text-slate-800 block mt-0.5">{rawDbData.users?.length || 0}</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
                <span className="block text-[10px] text-slate-400 font-extrabold uppercase">📦 Products</span>
                <span className="text-lg font-black text-indigo-700 block mt-0.5">{rawDbData.products?.length || 0}</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
                <span className="block text-[10px] text-slate-400 font-extrabold uppercase">🛒 Orders</span>
                <span className="text-lg font-black text-rose-700 block mt-0.5">{rawDbData.orders?.length || 0}</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
                <span className="block text-[10px] text-slate-400 font-extrabold uppercase">🔔 Notifications</span>
                <span className="text-lg font-black text-amber-700 block mt-0.5">{rawDbData.globalNotifications?.length || 0}</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
                <span className="block text-[10px] text-slate-400 font-extrabold uppercase">🛰️ Discord Logs</span>
                <span className="text-lg font-black text-blue-750 block mt-0.5">{rawDbData.discordLogs?.length || 0}</span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 font-sans italic bg-slate-50 border border-slate-200 rounded-xl">
              Memuat isi database server...
            </div>
          )}

          {/* Table Lists and JSON editor */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Left Side: Interactive Table lists for easy human understanding */}
            <div className="space-y-6">
              
              {/* Users Live Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-800">Live Member & No. HP (Users)</h3>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">Total: {rawDbData?.users?.length || 0}</span>
                </div>
                <div className="overflow-x-auto max-h-[220px] scrollbar-thin">
                  <table className="w-full text-left text-[11px] font-sans">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <th className="p-2">User/Toko</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Akses</th>
                        <th className="p-2">WhatsApp / Lokasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rawDbData?.users?.map((u: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-black text-slate-800">
                            {u.username}
                            {u.storeName && (
                              <span className="block text-[9px] text-indigo-650 font-semibold">{u.storeName}</span>
                            )}
                          </td>
                          <td className="p-2 text-slate-500 font-mono text-[10px]">{u.email}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              u.role === 'admin' ? 'bg-amber-100 text-amber-800' :
                              u.role === 'seller' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-2">
                            {u.whatsappNumber ? (
                              <div className="text-emerald-700 font-bold block text-[10px]">🟢 {u.whatsappNumber}</div>
                            ) : (
                              <span className="text-slate-400 italic block text-[9px]">Belum Verifikasi</span>
                            )}
                            {u.address && (
                              <span className="text-slate-400 block text-[9px] truncate max-w-[120px]">{u.address}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Products Catalog Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-800">Live Katalog Produk & Jasa</h3>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">Total: {rawDbData?.products?.length || 0}</span>
                </div>
                <div className="overflow-x-auto max-h-[220px] scrollbar-thin">
                  <table className="w-full text-left text-[11px] font-sans">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <th className="p-2">Mitra / Kios</th>
                        <th className="p-2">Judul Jualan</th>
                        <th className="p-2">Harga</th>
                        <th className="p-2">Stok</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rawDbData?.products?.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-semibold text-slate-500 text-[10px] select-none truncate max-w-[100px]">{p.sellerName}</td>
                          <td className="p-2 font-black text-slate-800 truncate max-w-[150px]">{p.title}</td>
                          <td className="p-2 text-slate-700 font-bold font-mono text-[10px]">Rp {p.price?.toLocaleString('id-ID')}</td>
                          <td className="p-2 font-bold text-emerald-700 font-mono text-[10px]">{p.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Side: Raw JSON interactive Code Editor */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-5 text-white flex flex-col justify-between">
              
              <div className="border-b border-white/5 pb-3 mb-3 text-left">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="font-sans font-black text-xs text-white uppercase tracking-wider">
                      Console Editor database_store.json
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(rawDbJsonString);
                        setSaveDbStatus('📋 Disalin ke Clipboard!');
                        setTimeout(() => setSaveDbStatus(''), 2500);
                      }}
                      className="bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[10px] font-bold rounded transition text-slate-200 cursor-pointer"
                    >
                      Copy JSON
                    </button>
                    {!isDbEditing ? (
                      <button
                        type="button"
                        onClick={() => setIsDbEditing(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-[10px] font-black rounded transition text-white uppercase tracking-wide cursor-pointer animate-pulse"
                      >
                        Buka Mode Edit
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsDbEditing(false);
                          setRawDbJsonString(JSON.stringify(rawDbData, null, 2));
                        }}
                        className="bg-rose-600/30 hover:bg-rose-600/50 px-2.5 py-1 text-[10px] font-bold rounded transition text-rose-200 cursor-pointer"
                      >
                        Batal Edit
                      </button>
                    )}
                  </div>
                </div>
                {saveDbStatus && (
                  <p className="text-[11px] font-semibold text-center mt-2.5 p-2 bg-white/5 rounded text-emerald-300">
                    {saveDbStatus}
                  </p>
                )}
              </div>

              <div className="flex-grow mt-1 text-left">
                {isDbEditing ? (
                  <div className="space-y-2 flex flex-col">
                    <span className="text-[9px] text-amber-400 font-extrabold uppercase block select-none">
                      ⚠️ PERINGATAN: Perubahan yang disimpan di sini langsung mengubah state server! Pastikan struktur JSON tidak patah.
                    </span>
                    <textarea
                      rows={14}
                      value={rawDbJsonString}
                      onChange={(e) => setRawDbJsonString(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-[10px] font-mono leading-relaxed text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 overflow-y-auto resize-y min-h-[355px]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveRawDb}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 rounded-lg transition text-xs uppercase tracking-wider cursor-pointer"
                    >
                      💾 Simpan & Sinkronisasi DB Server
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <pre className="p-3 bg-slate-950 rounded-lg text-[10px] font-mono leading-relaxed text-slate-300 overflow-auto max-h-[420px] select-text">
                      {rawDbJsonString || '// Sedang membaca database...'}
                    </pre>
                    <p className="text-[9px] text-slate-500 italic mt-2">Mode view-only. Silakan klik tombol "Buka Mode Edit" untuk memodifikasi array pengguna atau pesanan.</p>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* OVERRIDE SCHEDULER DIALOG */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-indigo-650 text-white flex justify-between items-center">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-indigo-200 uppercase bg-white/20 px-2 py-0.5 rounded">
                  OVERRIDE JADWAL/STAF ADMIN
                </span>
                <h3 className="font-bold text-sm mt-1">{selectedOrder.productTitle}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-white/10 rounded-full transition cursor-pointer text-white">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleOverrideOrder} className="p-4 space-y-4 text-left text-xs">
              <div>
                <label className="block text-slate-500 font-bold uppercase text-[9px] mb-1">
                  Re-alokasi Staf Pelaksana
                </label>
                <input
                  type="text"
                  value={overrideStaff}
                  onChange={(e) => setOverrideStaff(e.target.value)}
                  placeholder="Ganti pelaksana penanggung jawab..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase text-[9px] mb-1">
                  Jadwal Waktu Pengerjaan
                </label>
                <input
                  type="text"
                  value={overrideTime}
                  onChange={(e) => setOverrideTime(e.target.value)}
                  placeholder="cth: Jumat, 13:00 - 15:00"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 bg-slate-100 py-2 rounded text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 py-2 rounded text-white font-bold cursor-pointer hover:bg-indigo-700"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
