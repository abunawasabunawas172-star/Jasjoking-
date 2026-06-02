import React, { useState, useEffect } from 'react';
import { User, Product, Order, CategoryType, Message, AppNotification } from '../types';
import { ProductCard, CATEGORY_LABELS } from './ProductCard';
import { Search, ShoppingBag, Eye, Calendar, UserCheck, Armchair, ChevronRight, MessageSquare, Send, CheckCircle, Star, QrCode, AlertCircle, RefreshCw, X } from 'lucide-react';

interface BuyerPanelProps {
  user: User;
  onLogout: () => void;
  products: Product[];
  refreshProducts: () => void;
}

export function BuyerPanel({ user, onLogout, products, refreshProducts }: BuyerPanelProps) {
  // State lists
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'rating'>('default');
  const [activePartnerTab, setActivePartnerTab] = useState<'mahasiswa' | 'mitra'>('mahasiswa');
  
  // Selection and booking modal
  const [bookingProduct, setBookingProduct] = useState<Product | null>(null);
  const [bookingQuantity, setBookingQuantity] = useState(1);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [seatingRequest, setSeatingRequest] = useState('');
  const [errorBooking, setErrorBooking] = useState('');
  const [successBooking, setSuccessBooking] = useState('');

  // Selected active order for Chat Context or Detail View
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [chatMessage, setChatMessage] = useState('');

  // Review states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Loading indicators
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Payment Verification Interface States
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'bank_transfer'>('qris');
  const [senderBank, setSenderBank] = useState('Bank Mandiri');
  const [senderName, setSenderName] = useState('');
  const [transRef, setTransRef] = useState('');
  const [rawScreenshotText, setRawScreenshotText] = useState('');
  const [networkQuality, setNetworkQuality] = useState<'bagus' | 'lelet' | 'buruk' | 'offline'>('bagus');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verificationError, setVerificationError] = useState('');

  // Fetch orders
  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders?userId=${user.id}&role=buyer`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        
        // Keep active viewing order details updated if open
        if (viewingOrder) {
          const updated = data.find((o: Order) => o.id === viewingOrder.id);
          if (updated) setViewingOrder(updated);
        }
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000); // Poll orders every 4s for mock real-time
    return () => clearInterval(interval);
  }, [viewingOrder]);

  // Handle new booking submit
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingProduct) return;
    setErrorBooking('');
    setSuccessBooking('');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: user.id,
          productId: bookingProduct.id,
          quantity: bookingQuantity,
          selectedStaff,
          scheduledTime,
          seatingRequest
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat pesanan');

      setSuccessBooking('Pesanan baru berhasil dibuat! Membuka gerbang pembayaran QRIS...');
      fetchOrders();
      refreshProducts();
      
      // Reset form
      setBookingQuantity(1);
      setSelectedStaff('');
      setScheduledTime('');
      setSeatingRequest('');

      // Auto-focus on this new order for details and payment
      setTimeout(() => {
        setBookingProduct(null);
        setSuccessBooking('');
        if (data.order) {
          setViewingOrder(data.order);
        }
      }, 1500);
    } catch (err: any) {
      setErrorBooking(err.message);
    }
  };

  // Automated instant payment QRIS simulation
  const handleSimulatePayment = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/payment`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          fetchOrders(); // Refresh status immediately
        }
      }
    } catch (e) {
      console.error('Error sending mock payment:', e);
    }
  };

  // Reset payment states when active order selection changes
  useEffect(() => {
    setVerificationResult(null);
    setVerificationError('');
    setTransRef('');
    setSenderName('');
    setRawScreenshotText('');
  }, [viewingOrder?.id]);

  // Handle AI validation submission + simulated network errors
  const handleVerifyPayment = async (orderId: string) => {
    setVerificationLoading(true);
    setVerificationResult(null);
    setVerificationError('');
    
    try {
      const res = await fetch(`/api/orders/${orderId}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          senderBank: paymentMethod === 'bank_transfer' ? senderBank : undefined,
          senderName: paymentMethod === 'bank_transfer' ? senderName : undefined,
          transRef,
          rawScreenshotText,
          networkQuality
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.warning || data.error || "Gagal memverifikasi pembayaran dengan AI.");
      }

      setVerificationResult(data);
      if (data.success) {
        fetchOrders(); // Refresh immediately
      }
    } catch (err: any) {
      console.error(err);
      setVerificationError(err.message || "Gagal terhubung ke modul deteksi AI.");
    } finally {
      setVerificationLoading(false);
    }
  };

  // Send message in active Order chat channel
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingOrder || !chatMessage.trim()) return;

    try {
      const res = await fetch(`/api/orders/${viewingOrder.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          content: chatMessage.trim()
        })
      });
      if (res.ok) {
        const data = await res.json();
        setViewingOrder({ ...viewingOrder, chatHistory: data.chatHistory });
        setChatMessage('');
        fetchOrders();
      }
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  };

  // Submit product review/comments
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingOrder) return;
    setReviewSuccess('');

    try {
      const res = await fetch(`/api/orders/${viewingOrder.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: reviewRating,
          review: reviewText
        })
      });
      if (res.ok) {
        setReviewSuccess('Terima kasih atas ulasan bintang ' + reviewRating + ' Anda!');
        setReviewText('');
        fetchOrders();
        setTimeout(() => {
          setReviewSuccess('');
        }, 3000);
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  };

  // Filtering products
  const filteredProducts = products.filter(p => {
    const pType = p.sellerType || 'mahasiswa';
    const matchesPartnerTab = pType === activePartnerTab;
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.sellerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPartnerTab && matchesCategory && matchesSearch;
  });

  // Sorting products based on selected criteria
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'rating') {
      const ratingA = a.sellerRating || 0;
      const ratingB = b.sellerRating || 0;
      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }
      return (b.sellerReviewCount || 0) - (a.sellerReviewCount || 0);
    }
    return 0; // Maintain original database order
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Shopper Dashboard LHS: Products listings - Span 8 */}
      <div className="lg:col-span-8 space-y-6">

        {/* 📚 GORGEOUS MAHASISWA WELCOME & PRACTICAL TIPS HERO BANNER */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-650 to-emerald-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none text-[150px] select-none font-black lg:block hidden">🎓</div>
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] bg-white/20 font-mono tracking-widest text-emerald-100 uppercase px-2.5 py-0.5 rounded-full font-black">
                  🎓 PENGGUNA MAHASISWA UMSU
                </span>
                <h1 className="text-xl sm:text-2xl font-black mt-1.5">
                  Halo kawan, @{user.username}! 👋
                </h1>
                <p className="text-xs text-emerald-105 font-sans mt-0.5 leading-relaxed">
                  Solusi jitu &amp; platform marketplace jasa kawan mahasiswa Kampus UMSU. Yuk penuhi kebutuhan kuliahmu!
                </p>
              </div>
              <div className="bg-emerald-900/40 p-3 px-4 rounded-2xl border border-emerald-500/20 text-center shrink-0">
                <span className="block text-[9px] text-emerald-350 font-bold uppercase">Transaksi Anda kawan</span>
                <div className="text-lg font-black">{orders.length} Pesanan</div>
              </div>
            </div>

            {/* Practical Student tips / "Saran Praktis, Efektif & Efisien" layout */}
            <div className="bg-emerald-950/40 backdrop-blur-xs rounded-2xl p-4 border border-white/10 space-y-3">
              <h3 className="text-xs font-extrabold flex items-center gap-1.5 text-emerald-300">
                💡 Saran Kunci Memesan Jasa yang Efektif, Efisien &amp; Praktis
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-[11px] leading-relaxed text-emerald-50">
                <div className="flex gap-2 items-start">
                  <div className="p-0.5 px-1.5 bg-emerald-500/30 rounded-lg text-emerald-200 font-extrabold shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white">Buat Brif Spesifikasi yang Jelas kawan</h4>
                    <p className="text-[10px] text-emerald-100/90 leading-normal mt-0.5">
                      Berikan spesifikasi naskah, format skripsi, tema poster, atau instruksi kawan selengkap mungkin lewat chat.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <div className="p-0.5 px-1.5 bg-emerald-500/30 rounded-lg text-emerald-200 font-extrabold shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white">Gunakan Simulasi QRIS Instan</h4>
                    <p className="text-[10px] text-emerald-100/90 leading-normal mt-0.5">
                      Lakukan transaksi instan kawan lewat simulator QRIS yang langsung lunas otomatis untuk melompati waktu tunggu.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <div className="p-0.5 px-1.5 bg-emerald-500/30 rounded-lg text-emerald-200 font-extrabold shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white">Delegasikan Spesialis &amp; Jadwal</h4>
                    <p className="text-[10px] text-emerald-100/90 leading-normal mt-0.5">
                      Pilih personil ahli terpercaya dan tetapkan jadwal pengerjaan agar revisi berkala kawan tepat sasaran.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <div className="p-0.5 px-1.5 bg-emerald-500/30 rounded-lg text-emerald-200 font-extrabold shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white">Diskusi Aman via Pesan Terpantau</h4>
                    <p className="text-[10px] text-emerald-100/90 leading-normal mt-0.5">
                      Selalu gunakan obrolan chat platform. Transaksi dipantau penuh oleh admin demi kepuasan dan pelindungan kawan.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
        
        {/* 🏢 DUAL PORTAL SEPARATION SEGMENTS */}
        <div className="bg-slate-100 p-1.5 rounded-2xl grid grid-cols-2 gap-2 border border-slate-200 shadow-xs text-left">
          <button
            type="button"
            onClick={() => {
              setActivePartnerTab('mahasiswa');
              setSelectedCategory('all');
            }}
            className={`py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 transition duration-200 cursor-pointer ${
              activePartnerTab === 'mahasiswa'
                ? 'bg-emerald-600 text-white shadow-md border border-emerald-500 font-bold'
                : 'bg-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            <span className="text-lg">🎓</span>
            <div className="text-left">
              <span className="block font-black tracking-wide text-[10.5px]">JASA MAHASISWA</span>
              <span className="block text-[8px] opacity-80 font-medium">Freelance, Coding, Desain, Foto</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActivePartnerTab('mitra');
              setSelectedCategory('all');
            }}
            className={`py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 transition duration-200 cursor-pointer ${
              activePartnerTab === 'mitra'
                ? 'bg-amber-600 text-white shadow-md border border-amber-500 font-bold'
                : 'bg-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            <span className="text-lg">🏪</span>
            <div className="text-left">
              <span className="block font-black tracking-wide text-[10.5px]">MITRA KAMPUS & UMKM</span>
              <span className="block text-[8px] opacity-80 font-medium">Kantin, Kopi, Print & ATK Toko</span>
            </div>
          </button>
        </div>

        {/* Search and Category Badges */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-left">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4.5 w-4.5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activePartnerTab === 'mahasiswa'
                  ? "Cari jasa desain poster, pembuatan slide PPT, coding kawan, pengetikan..."
                  : "Cari nasi ayam, kopi susu gula aren, risoles, print laser, fotokopi skripsi..."
              }
              className="w-full pl-10 pr-4 py-3 bg-slate-55 border border-slate-200 focus:border-emerald-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Quick Categories Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
                selectedCategory === 'all'
                  ? activePartnerTab === 'mahasiswa' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua Kategori
            </button>
            {Object.keys(CATEGORY_LABELS).filter((key) => {
              const labelKey = key as CategoryType;
              if (activePartnerTab === 'mahasiswa') {
                return ['desain', 'coding', 'print', 'fotografi'].includes(labelKey);
              } else {
                return ['makanan', 'kebutuhan'].includes(labelKey);
              }
            }).map((key) => {
              const labelKey = key as CategoryType;
              const catItem = CATEGORY_LABELS[labelKey];
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(labelKey)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
                    selectedCategory === labelKey
                      ? activePartnerTab === 'mahasiswa' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {catItem.icon}
                  {catItem.label}
                </button>
              );
            })}
          </div>

          {/* Sorting and Reputation Filter controls */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2 text-left">
            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <span className="font-bold text-slate-700">Urutkan:</span>
              <button
                type="button"
                onClick={() => setSortBy('default')}
                className={`py-1.5 px-3.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition ${
                  sortBy === 'default'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-805'
                }`}
              >
                Semua Produk
              </button>
              <button
                type="button"
                onClick={() => setSortBy('rating')}
                className={`py-1.5 px-3.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition flex items-center gap-1.5 ${
                  sortBy === 'rating'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-amber-50/50 text-amber-700 border-amber-200 hover:bg-amber-55'
                }`}
              >
                <span>⭐ Reputasi Terbaik (Rating Seller)</span>
              </button>
            </div>

            {sortBy === 'rating' && (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1 rounded-full font-black animate-pulse">
                Menampilkan seller dengan rating ⭐ tertinggi terlebih dahulu
              </span>
            )}
          </div>
        </div>

        {/* Product Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              {activePartnerTab === 'mahasiswa' ? (
                <>
                  <span className="text-lg">🎓</span>
                  <span>Katalog Jasa Mahasiswa ({sortedProducts.length})</span>
                </>
              ) : (
                <>
                  <span className="text-lg">🏪</span>
                  <span>Antrean Mitra Kampus & UMKM ({sortedProducts.length})</span>
                </>
              )}
            </h2>
            <button
              onClick={refreshProducts}
              className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition ${
                activePartnerTab === 'mahasiswa'
                  ? 'text-emerald-600 hover:text-emerald-700'
                  : 'text-amber-600 hover:text-amber-700'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {sortedProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">Tidak ada produk ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Gunakan kata kunci atau filter kategori lainnya</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onSelect={(product) => setBookingProduct(product)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Shopper Dashboard RHS: Orders History & Interaction Panel - Span 4 */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Active Order / Chat Interaction Room */}
        {viewingOrder ? (
          <div className="bg-white rounded-2xl border border-emerald-250 shadow-md overflow-hidden flex flex-col max-h-[85vh] ring-2 ring-emerald-500/10">
            {/* Header */}
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono uppercase">
                  {viewingOrder.id}
                </span>
                <h3 className="font-bold text-sm line-clamp-1 mt-1">{viewingOrder.productTitle}</h3>
                <span className="text-xs text-teal-100">{viewingOrder.sellerName}</span>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="p-1 text-white hover:bg-white/10 rounded-full transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Order Status Timeline Banner */}
            <div className="bg-slate-100 p-3 px-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Status Pesanan:</span>
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded uppercase ${
                  viewingOrder.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                  viewingOrder.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                  viewingOrder.status === 'awaiting_payment' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                  viewingOrder.status === 'paid' ? 'bg-indigo-100 text-indigo-800' : 'bg-cyan-100 text-cyan-800'
                }`}>
                  {viewingOrder.status.replace('_', ' ')}
                </span>
              </div>

              {/* Display Assigned scheduling parameters */}
              {(viewingOrder.selectedStaff || viewingOrder.scheduledTime || viewingOrder.seatingRequest) && (
                <div className="mt-2.5 p-2 bg-white rounded-lg border border-slate-200 space-y-1 text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                  {viewingOrder.selectedStaff && (
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Spesialis Jasa: <span className="font-semibold text-slate-900 dark:text-white">{viewingOrder.selectedStaff}</span></span>
                    </div>
                  )}
                  {viewingOrder.seatingRequest && (
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Armchair className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Sajian Meja / Cara Ambil: <span className="font-semibold text-slate-900 dark:text-white">{viewingOrder.seatingRequest}</span></span>
                    </div>
                  )}
                  {viewingOrder.scheduledTime && (
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Jadwal Pengiriman / Siap: <span className="font-semibold text-slate-900 dark:text-white">{viewingOrder.scheduledTime}</span></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Merchant Location & WhatsApp Speedline */}
            <div className="bg-slate-50 p-3 px-4 border-b border-slate-200 text-xs space-y-1.5">
              {viewingOrder.sellerAddress && (
                <div className="flex gap-1.5 text-slate-700">
                  <span className="shrink-0 text-rose-500">📍</span>
                  <span><strong>Lokasi Jasa/Tempat:</strong> {viewingOrder.sellerAddress}</span>
                </div>
              )}
              {viewingOrder.sellerWhatsapp && (
                <div className="flex justify-between items-center bg-emerald-50/70 text-emerald-800 p-2 rounded-lg border border-emerald-150">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-emerald-500 text-xs">🟢</span>
                    <span>No. WhatsApp: {viewingOrder.sellerWhatsapp}</span>
                  </div>
                  <a
                    href={`https://wa.me/${viewingOrder.sellerWhatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1 rounded text-[10px] uppercase tracking-wide transition cursor-pointer"
                  >
                    Koneksi WA
                  </a>
                </div>
              )}
            </div>

            {/* CORE INTERACTION SPACE (Dynamic depending on order stage) */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4 max-h-[40vh] bg-slate-50/50">
              
              {/* 1. Payment QRIS Automatic Interface */}
              {viewingOrder.status === 'awaiting_payment' && (
                <div className="text-left p-4 bg-white border border-slate-200 rounded-2xl shadow-md space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <QrCode className="h-5 w-5 text-amber-500 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-black text-slate-800 tracking-tight uppercase">Pembayaran Instan & Aman AI</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Silakan kirim pembayaran & klik "Selesaikan Pembayaran"</p>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-500 font-bold uppercase">Pilih Metode Pembayaran</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('qris')}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 cursor-pointer ${
                          paymentMethod === 'qris'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-lg">📱</span>
                        <span>QRIS Kampus</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bank_transfer')}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 cursor-pointer ${
                          paymentMethod === 'bank_transfer'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-lg">🏦</span>
                        <span>Transfer Bank</span>
                      </button>
                    </div>
                  </div>

                  {paymentMethod === 'qris' ? (
                    <div className="text-center bg-slate-50 p-3 rounded-2xl space-y-3">
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        Scan QRIS Pribadi Toko <strong>{viewingOrder.sellerName}</strong> di bawah ini:
                      </p>
                      <p className="text-[9px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-mono break-all inline-block">
                        ID QRIS: {viewingOrder.sellerQrisCode || `QRIS.MID-${viewingOrder.sellerId.toUpperCase()}`}
                      </p>
                      
                      {/* Styled QRIS code container visual representation */}
                      <div className="w-36 h-36 mx-auto border-4 border-slate-900 p-2 bg-white relative flex flex-col justify-between shadow-sm">
                        <div className="flex justify-between">
                          <span className="w-4.5 h-4.5 bg-slate-900"></span>
                          <span className="w-4.5 h-4.5 bg-slate-900"></span>
                        </div>
                        {/* QR Code Pixel Matrix mockup representation */}
                        <div className="absolute inset-4.5 border border-emerald-500 leading-none">
                          <div className="grid grid-cols-4 gap-0.5 p-1 h-full w-full">
                            {Array.from({ length: 16 }).map((_, i) => (
                              <div key={i} className={`rounded-sm ${(i * 7 + 3) % 2 === 0 ? 'bg-slate-900' : 'bg-transparent'}`} />
                            ))}
                          </div>
                        </div>
                        {/* QRIS tiny tag logo overlay */}
                        <div className="absolute inset-0 m-auto w-10 h-6 bg-slate-900 text-white font-black text-[7px] flex items-center justify-center rounded uppercase tracking-wider">
                          QRIS
                        </div>
                        <div className="flex justify-between">
                          <span className="w-4.5 h-4.5 bg-slate-900"></span>
                          <span className="w-2.5 h-2.5 bg-slate-900 self-end"></span>
                        </div>
                      </div>

                      <div className="pt-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const genId = 'TX-' + Math.floor(1000 + Math.random() * 9000);
                            setTransRef(genId);
                            handleSimulatePayment(viewingOrder.id);
                          }}
                          className="mx-auto bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition cursor-pointer shadow-sm"
                        >
                          ⚡ Simulasi Pembayaran QRIS Berhasil (Demo)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-3 rounded-2xl space-y-2.5 text-xs text-slate-700 text-left">
                      <div className="border border-emerald-200 bg-emerald-50/50 p-2 rounded-xl">
                        <p className="font-extrabold text-[10px] text-emerald-800 uppercase tracking-wide">REKENING RESMI MITRA PENJUAL (DILINDUNGI AI)</p>
                        <p className="font-bold text-xs mt-0.5 select-all">
                          {viewingOrder.sellerBankName || "Bank Mandiri"}: {viewingOrder.sellerBankAccount || "106-00-14220-432"}
                        </p>
                        <p className="text-[10px] text-slate-600 font-bold">A.n. {viewingOrder.sellerName}</p>
                        <span className="text-[9px] text-emerald-600 block mt-1">✓ Didukung oleh AI Automat untuk transfer langsung terpecah</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Bank Pengirim</label>
                          <select
                            value={senderBank}
                            onChange={(e) => setSenderBank(e.target.value)}
                            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          >
                            <option value="Bank Mandiri">Mandiri</option>
                            <option value="BSI">BSI (Syariah)</option>
                            <option value="BRI">BRI</option>
                            <option value="BCA">BCA</option>
                            <option value="BNI">BNI</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Nama Rek Pengirim</label>
                          <input
                            type="text"
                            placeholder="A.n. Pengirim"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Reference Identifier (Prevention of empty careless clicks!) */}
                  <div className="space-y-1 bg-amber-50/50 p-3 rounded-2xl border border-amber-100 text-left">
                    <label className="block text-[10px] text-amber-900 font-bold uppercase flex items-center gap-1">
                      <span>🔑 ID / Nomor Referensi Transaksi (Wajib)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan 4+ digit nomor referensi resi..."
                      value={transRef}
                      onChange={(e) => setTransRef(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 rounded-xl font-mono text-center"
                    />
                    <p className="text-[9px] text-slate-400">Silakan ketik angka/huruf acak (misal: TX1024) atau klik tombol simulasi di atas untuk mengisi otomatis.</p>
                  </div>

                  {/* Network Quality Simulator Widget */}
                  <div className="bg-slate-100/75 p-2.5 rounded-2xl border border-slate-200 space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide">📡 Simulasi Kondisi Sinyal / Jaringan</span>
                      <span className={`text-[9px] px-2 py-0.2 rounded font-black ${
                        networkQuality === 'bagus' ? 'bg-emerald-100 text-emerald-800' :
                        networkQuality === 'lelet' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                        networkQuality === 'buruk' ? 'bg-orange-100 text-orange-900' : 'bg-red-100 text-red-800'
                      }`}>
                        {networkQuality.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-[9px] text-slate-600 font-semibold text-center">
                      <button
                        type="button"
                        onClick={() => setNetworkQuality('bagus')}
                        className={`p-1 rounded transition border cursor-pointer ${
                          networkQuality === 'bagus' ? 'bg-white border-emerald-500 text-emerald-850 font-black' : 'border-slate-200 hover:bg-white'
                        }`}
                      >
                        Bagus (4G)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNetworkQuality('lelet')}
                        className={`p-1 rounded transition border cursor-pointer ${
                          networkQuality === 'lelet' ? 'bg-white border-amber-500 text-amber-850 font-black' : 'border-slate-200 hover:bg-white'
                        }`}
                      >
                        Lelet (Edge)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNetworkQuality('buruk')}
                        className={`p-1 rounded transition border cursor-pointer ${
                          networkQuality === 'buruk' ? 'bg-white border-orange-500 text-orange-850 font-black' : 'border-slate-200 hover:bg-white'
                        }`}
                      >
                        Buruk
                      </button>
                      <button
                        type="button"
                        onClick={() => setNetworkQuality('offline')}
                        className={`p-1 rounded transition border cursor-pointer ${
                          networkQuality === 'offline' ? 'bg-white border-rose-500 text-rose-850 font-black' : 'border-slate-200 hover:bg-white'
                        }`}
                      >
                        Offline
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Alert Banner for Signal Losses or Connection Latency Warnings */}
                  {verificationError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex gap-2 text-[11px] leading-relaxed text-left">
                      <span className="text-sm shrink-0">⚠️</span>
                      <p>{verificationError}</p>
                    </div>
                  )}

                  {verificationResult && !verificationResult.success && (
                    <div className="p-3 bg-orange-50 border border-orange-150 text-orange-950 rounded-xl flex gap-1.5 text-[11px] leading-relaxed text-left">
                      <span className="text-sm shrink-0">🤖</span>
                      <div>
                        <p className="font-extrabold text-[10px] text-orange-900 uppercase">AUDIT AI: GAGAL VERIFIKASI</p>
                        <p className="mt-0.5">{verificationResult.analysis}</p>
                        {verificationResult.actionRequired && (
                          <p className="mt-1 font-bold text-slate-700">Tindakan: {verificationResult.actionRequired}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1.5 text-slate-700 border border-slate-100 shadow-inner">
                    {viewingOrder.discountAmount ? (
                      <>
                        <div className="flex justify-between text-[11px]">
                          <span>Subtotal:</span>
                          <span className="line-through text-slate-400">Rp {(viewingOrder.originalPrice || (viewingOrder.price * viewingOrder.quantity)).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600 text-[11px] font-bold">
                          <span>Diskon Loyalis (30%):</span>
                          <span>-Rp {viewingOrder.discountAmount.toLocaleString('id-ID')}</span>
                        </div>
                      </>
                    ) : null}
                    <div className="flex justify-between text-sm font-black text-slate-950 border-t border-slate-205 pt-1.5 dark:text-white">
                      <span>Total Bayar:</span>
                      <span>Rp {((viewingOrder.price * viewingOrder.quantity) - (viewingOrder.discountAmount || 0)).toLocaleString('id-ID')}</span>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-500 italic block leading-relaxed dark:text-slate-400">
                      *Silakan simpan &amp; transfer dana persis sesuai nominal total di atas.
                    </div>
                  </div>

                  {/* Selesaikan Pembayaran button: disabled if transRef is short or simulation state is false */}
                  <button
                    type="button"
                    disabled={verificationLoading || !transRef || transRef.trim().length < 4}
                    onClick={() => handleVerifyPayment(viewingOrder.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                      !transRef || transRef.trim().length < 4
                        ? 'bg-slate-200 text-slate-400 border border-slate-300/30 cursor-not-allowed'
                        : verificationLoading
                        ? 'bg-amber-500 text-white cursor-wait animate-pulse'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                    }`}
                  >
                    {verificationLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>JasJoking AI memeriksa transaksi...</span>
                      </>
                    ) : (
                      <>
                        <span>✅ Selesaikan Pembayaran (Deteksi AI)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* 2. Chat history box between buyer & seller */}
              <div className="space-y-2">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Ruang Chat Penjual</span>
                {viewingOrder.chatHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2 italic">Belum ada obrolan. Kirim pesan di bawah untuk memulai chat...</p>
                ) : (
                  <div className="space-y-2">
                    {viewingOrder.chatHistory.map((m, idx) => {
                      const isSystem = m.senderRole === 'system';
                      const isMe = m.senderId === user.id;
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col ${isSystem ? 'items-center' : isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className={`max-w-[85%] rounded-lg p-2.5 text-xs ${
                            isSystem ? 'bg-slate-100 text-slate-500 border border-slate-200 text-center' :
                            isMe ? 'bg-emerald-600 text-white' : 'bg-white text-slate-800 border border-slate-100'
                          }`}>
                            {!isSystem && (
                              <span className="block text-[9px] font-black opacity-80 mb-0.5">
                                {m.senderName}
                              </span>
                            )}
                            <p className="leading-relaxed">{m.content}</p>
                          </div>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            {new Date(m.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Review Feedback section */}
              {viewingOrder.status === 'completed' && (
                <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                    <span>Beri Ulasan Pembelian</span>
                  </div>
                  {viewingOrder.rating ? (
                    <div className="text-xs text-emerald-800 p-2 bg-white rounded-lg">
                      <div className="flex items-center gap-0.5 text-amber-400 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < viewingOrder.rating! ? 'fill-current' : 'text-slate-200'}`} />
                        ))}
                      </div>
                      <p className="font-semibold">Review Anda:</p>
                      <p className="italic text-slate-500 mt-0.5">"{viewingOrder.review}"</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="space-y-2">
                      {reviewSuccess && <p className="text-xs text-emerald-700 font-bold">{reviewSuccess}</p>}
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Bintang</label>
                        <div className="flex gap-1 text-amber-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="focus:outline-none hover:scale-110 transition cursor-pointer"
                            >
                              <Star className={`h-6 w-6 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Isi Masukan</label>
                        <textarea
                          placeholder="Sangat puas! Pengerjaannya cepat..."
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-250 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          rows={2}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded text-xs font-semibold cursor-pointer transition"
                      >
                        Kirim Review Ke Seller & Discord
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Message input footer */}
            <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                placeholder="Tulis chat untuk penjual..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg transition cursor-pointer flex items-center justify-center shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-center">
            <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Klik tombol pesan untuk membuka layar bayar QRIS & Live Chat</p>
          </div>
        )}

        {/* History of Bookings List */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <span className="font-bold text-sm text-slate-800">Riwayat Pemesanan ({orders.length})</span>
            <button
              onClick={fetchOrders}
              className="text-emerald-600 p-1 hover:bg-emerald-50 rounded-full transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {isLoadingOrders && orders.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Memuat riwayat...</p>
          ) : orders.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-slate-400 italic">Belum ada riwayat pesanan.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
              {orders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => setViewingOrder(o)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between group ${
                    viewingOrder?.id === o.id
                      ? 'border-emerald-600 bg-emerald-50/20'
                      : 'border-slate-105 bg-slate-50/50 hover:bg-slate-55'
                  }`}
                >
                  <div className="space-y-1 pr-2 flex-1">
                    <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {o.id}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition">
                      {o.productTitle}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>Store: {o.sellerName}</span>
                      <span className="font-semibold text-slate-700">Rp {(o.price * o.quantity).toLocaleString('id-ID')}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        o.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                        o.status === 'cancelled' ? 'bg-rose-50 text-rose-700' :
                        o.status === 'awaiting_payment' ? 'bg-amber-50 text-amber-700 animate-pulse' :
                        'bg-indigo-55 text-indigo-705'
                      }`}>
                        {o.status.replace('_', ' ')}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(o.createdAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SUBMIT BOOKING MODAL */}
      {bookingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-teal-100">FORM PEMESANAN & RESERVASI</span>
                <h3 className="font-bold text-base">{bookingProduct.title}</h3>
              </div>
              <button
                onClick={() => setBookingProduct(null)}
                className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Wide image preview right inside the booking modal */}
            <div className="relative h-48 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
              <img
                src={bookingProduct.imageUrl}
                alt={bookingProduct.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-4">
                <p className="text-white text-xs font-medium leading-relaxed drop-shadow-md">
                  {bookingProduct.description}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handlePlaceOrder} className="p-5 space-y-4 text-left">
              {errorBooking && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded border border-rose-100">{errorBooking}</p>}
              {successBooking && <p className="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded border border-emerald-100 font-bold">{successBooking}</p>}

              <div className="grid grid-cols-2 gap-4">
                {/* Price Label */}
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Harga Satuan</span>
                  <span className="text-lg font-bold text-slate-800">Rp {bookingProduct.price.toLocaleString('id-ID')}</span>
                </div>
                {/* Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Jumlah Pesanan</label>
                  <input
                    type="number"
                    min={1}
                    max={bookingProduct.stock}
                    required
                    value={bookingQuantity}
                    onChange={(e) => setBookingQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full text-sm p-1.5 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* SERVICE PARAMETER: STAFF CHOOSER */}
              {bookingProduct.staffOptions && bookingProduct.staffOptions.length > 0 && (
                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 space-y-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-800">
                    <UserCheck className="h-4 w-4" />
                    Pilih Staf Kreatif / Pelaksana
                  </span>
                  <select
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Pilih Staf Kampus Pendamping --</option>
                    {bookingProduct.staffOptions.map(staf => (
                      <option key={staf} value={staf}>{staf}</option>
                    ))}
                  </select>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Pilih Waktu / Jadwal Pengerjaan</label>
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      required
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">-- Pilih Slot Jadwal --</option>
                      <option value="Kamis, 09:00 - 11:00">Kamis, 09:00 - 11:00 (Slot Pagi)</option>
                      <option value="Kamis, 13:00 - 15:00">Kamis, 13:00 - 15:00 (Slot Siang)</option>
                      <option value="Jumat, 10:05 - 12:00">Jumat, 10:05 - 12:00 (Slot Pagi)</option>
                      <option value="Jumat, 15:00 - 17:00">Jumat, 15:00 - 17:00 (Slot Sore)</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-400">Admin/Seller dapat mengganti pelaksana jika staf utama sibuk.</p>
                </div>
              )}

              {/* TABLE/SEATING RESERVATION FOR UMKM PLACES */}
              {(bookingProduct.sellerType === 'mitra' || bookingProduct.category === 'makanan' || bookingProduct.category === 'kebutuhan') && (
                <div className="bg-amber-55/60 p-3.5 rounded-xl border border-amber-200/60 space-y-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Armchair className="h-4 w-4" />
                    Opsi Pemesanan / Reservasi Meja
                  </span>
                  <select
                    value={seatingRequest}
                    onChange={(e) => setSeatingRequest(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-white border border-slate-250 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="">-- Pilih Nomor Meja / Cara Ambil --</option>
                    <option value="Makan di Kantin (Meja No. 1)">Makan di Kantin (Meja No. 1)</option>
                    <option value="Makan di Kantin (Meja No. 2)">Makan di Kantin (Meja No. 2)</option>
                    <option value="Makan di Kantin (Meja No. 3)">Makan di Kantin (Meja No. 3)</option>
                    <option value="Bungkus / Takeaway Mandiri">Bungkus / Takeaway Mandiri</option>
                    <option value="Kirim ke Kelas (Tulis Detil di Chat)">Kirim ke Kelas (Tulis Detil di Chat)</option>
                  </select>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Jadwal Pembuatan / Pengantaran</label>
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      required
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">-- Hubungkan dengan Jadwal --</option>
                      <option value="Segera / Sekarang Juga (10-15 Menit)">Segera / Sekarang Juga (10-15 Menit)</option>
                      <option value="Istirahat Jam Kuliah Pagi (10:00)">Istirahat Jam Kuliah Pagi (10:00)</option>
                      <option value="Makan Siang (12:15 - 13:00)">Makan Siang (12:15 - 13:00)</option>
                      <option value="Kuliah Sore (15:30)">Kuliah Sore (15:30)</option>
                    </select>
                  </div>
                  <p className="text-[9px] text-amber-800 leading-relaxed">
                    💡 Pesanan Anda akan dipersiapkan hangat-hangat oleh mitra kampus UMSU sesuai jam yang Anda jadwalkan.
                  </p>
                </div>
              )}


              {/* PRICE DETAIL WITH MULTIPLE OF 3 LOYALTY DISCOUNT */}
              {(() => {
                const targetQty = Number(bookingQuantity) || 1;
                const isDiscountOrder = (orders.length + 1) % 3 === 0;
                const originalPrice = bookingProduct ? (bookingProduct.price * targetQty) : 0;
                const discountAmount = isDiscountOrder ? Math.round(originalPrice * 0.30) : 0;
                const finalPrice = originalPrice - discountAmount;
                const existingCount = orders.length;

                return (
                  <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2 text-xs">
                    <span className="block text-[10px] text-emerald-800 font-extrabold uppercase tracking-wide">RINCIAN BIAYA</span>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Subtotal ({targetQty}x)</span>
                      <span className="font-semibold">Rp {originalPrice.toLocaleString('id-ID')}</span>
                    </div>
                    
                    {isDiscountOrder ? (
                      <div className="space-y-1 pt-1 border-t border-dashed border-emerald-200">
                        <div className="flex justify-between items-center text-emerald-700 font-bold">
                          <span className="flex items-center gap-1">
                            🎁 Loyalty Diskon 3x (30%)
                          </span>
                          <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                        </div>
                        <p className="text-[10px] text-emerald-600 leading-relaxed font-semibold">
                          Hebat! Ini adalah pesanan ke-{(existingCount + 1)} Anda. Anda berhak mendapatkan diskon loyalis sebesar 30% untuk pesanan ini!
                        </p>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 leading-relaxed font-medium">
                        💡 <strong>Program Loyalis:</strong> Pesan <strong>{(3 - (existingCount % 3))} kali lagi</strong> untuk mendapatkan diskon 30% di pemesanan berikutnya!
                      </div>
                    )}

                    <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1.5 border-t border-emerald-200">
                      <span>Total Tagihan</span>
                      <span className="text-emerald-700 font-extrabold text-base">Rp {finalPrice.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                );
              })()}

              {/* PAYMENT METHOD INFORMATION */}
              <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Metode Pembayaran</span>
                <span className="text-xs text-slate-700 flex items-center gap-1 font-semibold">
                  📲 QRIS Berbayar Otomatis (Simulasi Instan Sukses)
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Pembayaran diproses dan diverifikasi oleh asisten virtual seketika setelah pembayaran di-claim.</p>
              </div>

              {/* Confirm actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingProduct(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold py-2.5 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold py-2.5 transition cursor-pointer"
                >
                  Konfirmasi Pesan (Hasilkan QRIS)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
