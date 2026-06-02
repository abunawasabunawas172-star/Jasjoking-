import React, { useState, useEffect } from 'react';
import { User, Product, Order, CategoryType, OrderStatus } from '../types';
import { FileUp, ShoppingCart, MessageSquare, Send, CheckCircle, RefreshCw, X, Calendar, UserCheck, Armchair } from 'lucide-react';
import { CATEGORY_LABELS } from './ProductCard';

interface SellerPanelProps {
  user: User;
  refreshProducts: () => void;
  onUserUpdate?: (user: User) => void;
}

export function SellerPanel({ user, refreshProducts, onUserUpdate }: SellerPanelProps) {
  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Product Upload Form Config
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<CategoryType>('desain');
  const [imageUrl, setImageUrl] = useState('');
  const [stock, setStock] = useState('10');
  const [staffOptions, setStaffOptions] = useState('');
  const [tableOptions, setTableOptions] = useState('');
  const [customAddress, setCustomAddress] = useState(user.address || '');
  const [customWhatsapp, setCustomWhatsapp] = useState(user.whatsappNumber || '');
  const [sellerType, setSellerType] = useState<'mahasiswa' | 'mitra'>('mahasiswa');

  // Merchant Custom Bank & QRIS details states
  const [bankName, setBankName] = useState(user.sellerBank || 'Bank Mandiri');
  const [accountNo, setAccountNo] = useState(user.sellerAccount || '');
  const [qrisText, setQrisText] = useState(user.sellerQrisText || `QRIS.MID-${user.id.toUpperCase()}`);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Status updates/Re-scheduling Form
  const [editStaff, setEditStaff] = useState('');
  const [editSchedule, setEditSchedule] = useState('');
  
  const [chatReplyMsg, setChatReplyMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // AI Assistant Integration States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPricingResult, setAiPricingResult] = useState('');
  const [aiDescriptionResult, setAiDescriptionResult] = useState('');
  const [aiError, setAiError] = useState('');

  // Handle Save Merchant Payment Configuration Profile
  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setProfileSaving(true);
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          sellerBank: bankName,
          sellerAccount: accountNo,
          sellerQrisText: qrisText
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan konfigurasi merchant.');

      setProfileSuccess('✅ Berhasil memperbarui Rekening & QRIS Toko Anda!');
      if (onUserUpdate) {
        onUserUpdate(data.user);
      }
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setProfileError(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Fetch received orders
  const fetchSellerOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders?userId=${user.id}&role=seller`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        
        // Update selected order details on the fly
        if (selectedOrder) {
          const fresh = data.find((o: Order) => o.id === selectedOrder.id);
          if (fresh) setSelectedOrder(fresh);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // AI Assistant integration handler methods
  const getAiPricingRecommendation = async () => {
    if (!title.trim()) {
      alert("Harap isi Judul Jualan terlebih dahulu sebagai acuan analisis AI.");
      return;
    }
    setAiLoading(true);
    setAiPricingResult('');
    setAiError('');
    try {
      const res = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Produk: "${title}". Berikan analisis kelayakan harga, rincian biaya pokok mahasiswa, dan tips promosi jualan di platform.`,
          mode: 'pricing'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghubungi AI.");
      setAiPricingResult(data.text);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Gagal tersambung dengan AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const getAiDescriptionRecommendation = async () => {
    if (!title.trim()) {
      alert("Harap isi Judul Jualan terlebih dahulu sebagai acuan penulisan AI.");
      return;
    }
    setAiLoading(true);
    setAiDescriptionResult('');
    setAiError('');
    try {
      const res = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Judul Produk: "${title}". Kategori: "${CATEGORY_LABELS[category]?.label || category}". Buat deskripsi promo kampus yang menarik, asyik, persuasif dan informatif untuk mahasiswa.`,
          mode: 'description'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghubungi AI.");
      setAiDescriptionResult(data.text);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Gagal tersambung dengan AI.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerOrders();
    const interval = setInterval(fetchSellerOrders, 4000);
    return () => clearInterval(interval);
  }, [selectedOrder]);

  // Handle Product upload submission
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!title || !price || !stock) {
      setFormError('Lengkapi judul, harga, dan jumlah stok.');
      return;
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: user.id,
          title,
          description,
          price: Number(price),
          category,
          imageUrl,
          stock: Number(stock),
          staffOptions,
          tableOptions,
          address: customAddress,
          whatsappContact: customWhatsapp,
          sellerType
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan produk baru');

      setFormSuccess('Sukses! Produk baru Anda berhasil diterbitkan di kampus!');
      refreshProducts();
      
      // Clear fields
      setTitle('');
      setDescription('');
      setPrice('');
      setCategory('desain');
      setImageUrl('');
      setStock('10');
      setStaffOptions('');
      setTableOptions('');
      setSellerType('mahasiswa');

      setTimeout(() => {
        setFormSuccess('');
      }, 3000);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Status transitions
  const updateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const payload: any = { status: nextStatus };
      if (editStaff) payload.selectedStaff = editStaff;
      if (editSchedule) payload.scheduledTime = editSchedule;

      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchSellerOrders();
        setEditStaff('');
        setEditSchedule('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Seller Chat replay message
  const handleSendChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !chatReplyMsg.trim()) return;

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          content: chatReplyMsg.trim()
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder({ ...selectedOrder, chatHistory: data.chatHistory });
        setChatReplyMsg('');
        fetchSellerOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper placeholder generators
  const populatePlaceholderImage = (categoryName: CategoryType) => {
    const images: Record<CategoryType, string> = {
      desain: 'https://images.unsplash.com/photo-1541462608141-27b297b15575?w=600',
      coding: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600',
      print: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600',
      fotografi: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600',
      makanan: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
      kebutuhan: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600'
    };
    setImageUrl(images[categoryName] || '');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
      
      {/* 4 columns: Adding and Editing products */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <FileUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-800">Tambahkan Jasa Baru kawan</h2>
              <p className="text-[11px] text-slate-400">Tawarkan jasa poster, PPT, cv, coding, pengetikan, atau fotografi kampus</p>
            </div>
          </div>

          {formError && <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded">{formError}</p>}
          {formSuccess && <p className="text-xs text-emerald-600 bg-emerald-50 p-2 font-bold rounded">{formSuccess}</p>}

          <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
            
            {/* Title */}
            <div>
              <label className="block text-slate-500 font-medium tracking-wide mb-1">Judul Jualan / Layanan</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="cth: Cetak Jilid Kilat Skripsi, Nasi Goreng Gila"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* AI Assistant Controls */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-black flex items-center gap-1">✨ JasJoking AI Assistant</span>
                {aiLoading && <span className="text-[10px] text-emerald-600 animate-pulse font-bold">Berpikir...</span>}
              </div>
              <p className="text-[10px] text-slate-450 leading-relaxed">Gunakan kecerdasan buatan untuk merancang harga jualan & deskripsi promosi yang efisien, logis, dan menarik.</p>
              
              <div className="flex gap-2 pt-1 border-t border-slate-100/60">
                <button
                  type="button"
                  onClick={getAiPricingRecommendation}
                  disabled={aiLoading}
                  className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-lg text-[10px] font-bold tracking-wide transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>💡</span> Taksir Harga AI
                </button>
                <button
                  type="button"
                  onClick={getAiDescriptionRecommendation}
                  disabled={aiLoading}
                  className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-lg text-[10px] font-bold tracking-wide transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>✍️</span> Deskripsi AI
                </button>
              </div>

              {aiError && (
                <div className="p-2 text-[10px] bg-rose-50 border border-rose-100 text-rose-600 rounded">
                  {aiError}
                </div>
              )}

              {aiPricingResult && (
                <div className="p-2.5 bg-amber-50/70 border border-amber-205 rounded-lg space-y-1.5 text-left text-[11px] text-slate-700">
                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-1">
                    <span className="font-bold text-amber-900 text-[10px]">💡 Analisis Kelayakan Harga:</span>
                    <button
                      type="button"
                      onClick={() => setAiPricingResult('')}
                      className="text-[10px] text-amber-700 hover:underline hover:font-bold cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto whitespace-pre-line leading-relaxed pb-1 text-slate-800 font-medium">
                    {aiPricingResult}
                  </div>
                </div>
              )}

              {aiDescriptionResult && (
                <div className="p-2.5 bg-teal-55/40 border border-teal-200 rounded-lg space-y-1.5 text-left text-[11px] text-slate-700">
                  <div className="flex items-center justify-between border-b border-teal-200/60 pb-1">
                    <span className="font-bold text-teal-900 text-[10px]">✍️ Buat Deskripsi Promosi:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDescription(aiDescriptionResult);
                          setAiDescriptionResult('');
                        }}
                        className="text-[10px] text-teal-700 font-bold hover:underline cursor-pointer"
                      >
                        Terapkan
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setAiDescriptionResult('')}
                        className="text-[10px] text-slate-400 hover:underline cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                  <div className="max-h-36 overflow-y-auto whitespace-pre-line leading-relaxed pb-1 text-slate-800 font-medium">
                    {aiDescriptionResult}
                  </div>
                </div>
              )}
            </div>

            {/* Description Textarea element */}
            <div>
              <label className="block text-slate-500 font-medium tracking-wide mb-1">Deskripsi Produk (Materi Promosi)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail jualan, rincian produk, atau cara pemesanan (Bisa buat otomatis dengan Asisten AI di atas!)"
                rows={3}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            {/* Price & Stock */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Harga (Rupiah)</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="cth: 35000"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Stok Tersedia</label>
                <input
                  type="number"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="cth: 1"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Tipe Merchant */}
            <div>
              <label className="block text-slate-500 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">Tipe Merchant / Penyedia</label>
              <div className="grid grid-cols-2 gap-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setSellerType('mahasiswa');
                    // Automatically switch to standard category if current is partner-only
                    if (category === 'makanan' || category === 'kebutuhan') {
                      setCategory('desain');
                      populatePlaceholderImage('desain');
                    }
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    sellerType === 'mahasiswa'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-black shadow-sm'
                      : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50/50'
                  }`}
                >
                  <span>🎓</span> Mahasiswa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSellerType('mitra');
                    // Automatically switch to partner category if current is student-only
                    if (category !== 'makanan' && category !== 'kebutuhan') {
                      setCategory('makanan');
                      populatePlaceholderImage('makanan');
                    }
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    sellerType === 'mitra'
                      ? 'bg-amber-50 text-amber-800 border-amber-400 font-black shadow-sm'
                      : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50/50'
                  }`}
                >
                  <span>🏪</span> Mitra Kampus (Kantin)
                </button>
              </div>
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Kategori Layanan</label>
              <select
                value={category}
                onChange={(e) => {
                  const catVal = e.target.value as CategoryType;
                  setCategory(catVal);
                  populatePlaceholderImage(catVal);
                  // Contextually sync merchant types
                  if (catVal === 'makanan' || catVal === 'kebutuhan') {
                    setSellerType('mitra');
                  } else {
                    setSellerType('mahasiswa');
                  }
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              >
                {Object.keys(CATEGORY_LABELS).map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key as CategoryType].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Image URL with auto-placeholder option */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-500 font-medium">Link Gambar Produk</label>
                <button
                  type="button"
                  onClick={() => populatePlaceholderImage(category)}
                  className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer"
                >
                  Pakai Gambar Bawaan
                </button>
              </div>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* ADVANCED CREATIVE SPECIALISTS LIST */}
            {(category === 'desain' || category === 'coding' || category === 'print' || category === 'fotografi') && (
              <div className="p-3 bg-indigo-50 dark:bg-slate-800/60 rounded-lg border border-indigo-100 dark:border-slate-800 space-y-2">
                <span className="block text-[11px] font-bold text-indigo-800 dark:text-indigo-400">👥 Tambahkan Staf Kampus / Spesialis Jasa (Opsional)</span>
                <input
                  type="text"
                  value={staffOptions}
                  onChange={(e) => setStaffOptions(e.target.value)}
                  placeholder="cth: Genta Wardana, Gaby (UI/UX), Wahyu (PHP)"
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded focus:outline-none text-xs"
                />
                <p className="text-[10px] text-slate-400">Pisahkan nama spesialis dengan tanda koma kawan.</p>
              </div>
            )}

            {/* PHYSICAL SHOP LOCATION COORDINATES & WHATSAPP OVERRIDE */}
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 space-y-2">
              <span className="block text-[11px] font-black text-rose-800 uppercase tracking-wide">📍 Alamat Fisik Toko Sekitar UMSU</span>
              <input
                type="text"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder="cth: Gg. Rukun No.5, Jl. Kapten Mukhtar Basri"
                className="w-full p-2 bg-white border border-slate-200 rounded focus:outline-none text-xs"
              />
              <p className="text-[9px] text-slate-400">Membantu mahasiswa menemukan lokasi fisik jualan Anda.</p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 space-y-2">
              <span className="block text-[11px] font-black text-emerald-800 uppercase tracking-wide">🟢 No. WhatsApp Aktif (Speed Link WA)</span>
              <input
                type="tel"
                value={customWhatsapp}
                onChange={(e) => setCustomWhatsapp(e.target.value)}
                placeholder="cth: 62812345678"
                className="w-full p-2 bg-white border border-slate-200 rounded focus:outline-none text-xs font-mono font-bold"
              />
              <p className="text-[9px] text-slate-400">Gunakan format internasional diawali 62 tanpa spasi.</p>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition cursor-pointer"
            >
              Terbitkan Produk
            </button>
          </form>
        </div>

        {/* 📋 PENGATURAN REKENING & QRIS MANDIRI TOKO (WITH SPLIT FEE SYSTEM VISUALIZATION) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <span className="text-lg">🏦</span>
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-800">Keuangan & Rekening Pembayaran</h2>
              <p className="text-[11px] text-slate-400">Atur bank penerima dan QRIS pribadi tempat pembayaran jasa kawan masuk</p>
            </div>
          </div>

          {profileError && <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded">{profileError}</p>}
          {profileSuccess && <p className="text-xs text-emerald-600 bg-emerald-50 p-2 font-bold rounded">{profileSuccess}</p>}

          <form onSubmit={handleSavePaymentConfig} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-500 font-medium tracking-wide mb-1">Bank Penerima / Penyelesaian</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              >
                <option value="Bank Mandiri">Mandiri (Direkomendasikan)</option>
                <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                <option value="BCA">BCA (Bank Central Asia)</option>
                <option value="BNI">BNI (Bank Negara Indonesia)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium tracking-wide mb-1">Nomor Rekening / Gopay / OVO</label>
              <input
                type="text"
                required
                placeholder="Masukkan nomor rekening Anda..."
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium tracking-wide mb-1">Kode Identitas QRIS Unik Anda</label>
              <input
                type="text"
                required
                placeholder="Masukkan kode unik QRIS contoh: QRIS.FREELANCE"
                value={qrisText}
                onChange={(e) => setQrisText(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
              />
              <p className="text-[9px] text-slate-400 mt-1">Digunakan oleh mahasiswa pengorder untuk mengidentifikasi pembayaran langsung ke QRIS atau Rekening Anda kawan.</p>
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl transition cursor-pointer"
            >
              {profileSaving ? 'Menyimpan...' : 'Simpan Pengaturan Payout'}
            </button>
          </form>
        </div>
      </div>

      {/* 7 columns: Orders feed and operations */}
      <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* LHS list of seller orders - span 5 */}
        <div className="md:col-span-12 lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">Penerimaan Pesanan ({orders.length})</span>
            <button
              onClick={fetchSellerOrders}
              className="p-1 text-slate-400 hover:text-emerald-600 rounded-full cursor-pointer hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 space-y-1.5">
              <ShoppingCart className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Belum ada orderan masuk.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
              {orders.map(o => (
                <div
                  key={o.id}
                  onClick={() => {
                    setSelectedOrder(o);
                    setEditStaff(o.selectedStaff || '');
                    setEditSchedule(o.scheduledTime || '');
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                    selectedOrder?.id === o.id
                      ? 'border-emerald-600 bg-emerald-50/10'
                      : 'border-slate-100 bg-slate-50/50 hover:bg-slate-55'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-mono bg-slate-200 px-1.5 rounded">{o.id}</span>
                    <span>{new Date(o.createdAt).toLocaleDateString('id', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-800 line-clamp-1">{o.productTitle}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-semibold text-slate-600">Oleh: {o.buyerName}</span>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-900 block">Rp {(o.price * o.quantity).toLocaleString('id')}</span>
                      <span className="text-[9px] text-emerald-600 font-bold block">Net Pokok: Rp {(o.payoutToSeller || Math.round((o.price * o.quantity) * 0.95)).toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                      o.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      o.status === 'cancelled' ? 'bg-rose-50 text-rose-700' :
                      o.status === 'awaiting_payment' ? 'bg-amber-50 text-amber-700' :
                      o.status === 'paid' ? 'bg-indigo-50 text-indigo-700 animate-pulse' :
                      'bg-sky-50 text-sky-700'
                    }`}>
                      {o.status.replace('_', ' ')}
                    </span>

                    {/* Quick review indicator */}
                    {o.rating && (
                      <span className="text-[9px] font-bold text-amber-500">
                        ⭐ {o.rating} Selesai
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RHS action panel and Chat context - span 7 */}
        <div className="md:col-span-12 lg:col-span-7 space-y-4">
          {selectedOrder ? (
            <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-emerald-600 text-white flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-teal-100 uppercase bg-white/10 px-2 py-0.5 rounded leading-none">
                    PENGAWASAN ORDER {selectedOrder.id}
                  </span>
                  <h3 className="font-bold text-sm truncate mt-1">{selectedOrder.productTitle}</h3>
                  <p className="text-xs text-teal-100">Pemesan: {selectedOrder.buyerName}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-white bg-white/10 hover:bg-white/20 p-1 rounded-full cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* DIRECT FREELANCE PAYMENT INFO PANEL */}
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between text-[11px] border-b border-slate-800 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🪙</span>
                  <div>
                    <span className="block font-black text-[9px] uppercase tracking-wider text-emerald-400">Pendapatan Total Jasa (100% Milik Anda)</span>
                    <strong className="text-xs font-mono text-emerald-400">Rp {(selectedOrder.price * selectedOrder.quantity - (selectedOrder.discountAmount || 0)).toLocaleString('id-ID')}</strong>
                  </div>
                </div>
                <div className="text-right border-l border-slate-800 pl-3">
                  <span className="block text-[8px] text-emerald-400 font-extrabold uppercase">Biaya Transaksi</span>
                  <span className="font-mono font-bold text-emerald-400 text-[10px]">Rp 0 (Gratis)</span>
                </div>
              </div>

              {/* Order management actions depending on status */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs space-y-4">
                
                {/* 1. Set / Override staff and booking slots */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Pengaturan Staf & Jadwal Kerja Kampus
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold mb-1">Pilih / Ganti Staf</label>
                      <input
                        type="text"
                        placeholder="cth: Siti Pradana"
                        value={editStaff}
                        onChange={(e) => setEditStaff(e.target.value)}
                        className="w-full text-xs p-1.5 focus:border-emerald-500 border border-slate-200 rounded bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold mb-1">Ganti Jadwal / Slot</label>
                      <input
                        type="text"
                        placeholder="cth: Kamis, 14:00 - 16:00"
                        value={editSchedule}
                        onChange={(e) => setEditSchedule(e.target.value)}
                        className="w-full text-xs p-1.5 focus:border-emerald-500 border border-slate-200 rounded bg-slate-50"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400">Isi kolom di atas, lalu klik salah satu tombol status di bawah untuk sekaligus memperbarui jadwal.</p>
                </div>

                {/* 2. Process status advance buttons */}
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Perbarui Status Pelaksanaan</span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedOrder.status === 'awaiting_payment' && (
                      <div className="col-span-2 text-center p-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs leading-relaxed mb-1">
                        Menunggu pembeli melakukan scan/claim pembayaran QRIS Berbayar Otomatis. Anda dapat mumpung menyatukan setting jadwal/staf pendamping sekalian.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-3 rounded-lg text-center transition cursor-pointer"
                    >
                      ✓ Konfirmasi & Set Jadwal
                    </button>

                    <button
                      type="button"
                      onClick={() => updateOrderStatus(selectedOrder.id, 'processing')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-center transition cursor-pointer"
                    >
                      ⚙ Proses Pengerjaan
                    </button>

                    <button
                      type="button"
                      onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-center transition cursor-pointer"
                    >
                      ☀ Selesaikan Orderan
                    </button>

                    <button
                      type="button"
                      onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                      className="bg-rose-50 hover:bg-rose-105 text-rose-700 font-bold py-2 px-3 rounded-lg text-center transition cursor-pointer border border-rose-200"
                    >
                      ⚡ Tolak / Batalkan
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat panel for communications */}
              <div className="p-4 bg-white space-y-3">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Perbincangan Dengan Pembeli</span>
                
                <div className="max-h-[30vh] overflow-y-auto space-y-2.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  {selectedOrder.chatHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center italic py-4">Belum ada obrolan terbaru.</p>
                  ) : (
                    selectedOrder.chatHistory.map((m, idx) => {
                      const isMe = m.senderId === user.id;
                      const isSystem = m.senderId === 'system';
                      return (
                        <div key={idx} className={`flex flex-col ${isSystem ? 'items-center' : isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`p-2.5 rounded-lg text-xs leading-relaxed max-w-[85%] ${
                            isSystem ? 'bg-slate-150 text-slate-500 border border-slate-200 text-center' :
                            isMe ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-205 text-slate-800'
                          }`}>
                            {!isSystem && <span className="block text-[9px] font-black opacity-85 mb-0.5">{m.senderName}</span>}
                            <p>{m.content}</p>
                          </div>
                          <span className="text-[9px] text-slate-450 mt-0.5">
                            {new Date(m.timestamp).toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Form sending reply */}
                <form onSubmit={handleSendChatReply} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={chatReplyMsg}
                    onChange={(e) => setChatReplyMsg(e.target.value)}
                    placeholder="Beri jawaban ramah ke pembeli..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  <button type="submit" className="bg-emerald-600 text-white rounded-lg px-4.5 py-2 hover:bg-emerald-700 transition cursor-pointer shrink-0">
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </form>
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 p-12 text-center rounded-2xl">
              <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-600 font-medium">Klik pada salah satu pesanan masuk untuk menyetujui jadwal, menunjuk staf, menerima QRIS lunas, atau memulai kordinasi chat.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
