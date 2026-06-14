import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Product, Order, CategoryType, Message, AppNotification } from '../types';
import { ProductCard, CATEGORY_LABELS, cleanSellerName } from './ProductCard';
import { Search, ShoppingBag, Eye, Calendar, UserCheck, Armchair, ChevronRight, MessageSquare, Send, CheckCircle, Star, QrCode, AlertCircle, RefreshCw, X, Compass, Heart, User as UserIcon } from 'lucide-react';
import { BuyerChatInbox } from './BuyerChatInbox';

interface BuyerPanelProps {
  user: User;
  onLogout: () => void;
  products: Product[];
  refreshProducts: () => void;
  onOpenProfile?: () => void;
}

export function BuyerPanel({ user, onLogout, products, refreshProducts, onOpenProfile }: BuyerPanelProps) {
  // State lists
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'rating'>('default');
  const [activePartnerTab, setActivePartnerTab] = useState<'mahasiswa' | 'mitra'>('mahasiswa');

  // Instagram-style navigation active tab state kawan
  const [activeTab, setActiveTab] = useState<'explore' | 'wishlist' | 'orders' | 'profile'>('explore');

  // Wishlist feature states kawan
  const [wishlistedIds, setWishlistedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`wishlist_${user.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showOnlyWishlist, setShowOnlyWishlist] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(`wishlist_${user.id}`, JSON.stringify(wishlistedIds));
    } catch (e) {
      console.error('Error saving wishlist to localStorage:', e);
    }
  }, [wishlistedIds, user.id]);

  const handleToggleWishlist = (product: Product) => {
    setWishlistedIds(prev => 
      prev.includes(product.id)
        ? prev.filter(id => id !== product.id)
        : [...prev, product.id]
    );
  };
  
  // Selection and booking modal
  const [bookingProduct, setBookingProduct] = useState<Product | null>(null);
  const [bookingQuantity, setBookingQuantity] = useState(1);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [seatingRequest, setSeatingRequest] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [paymentSchema, setPaymentSchema] = useState<'full' | 'dp'>('full');
  const [titleSelectionMethod, setTitleSelectionMethod] = useState<'self' | 'seller_suggest'>('self');
  const [userSuggestedTitle, setUserSuggestedTitle] = useState('');
  const [errorBooking, setErrorBooking] = useState('');
  const [successBooking, setSuccessBooking] = useState('');

  // Jasa feedback review list data and auto loading states
  const [productReviewsData, setProductReviewsData] = useState<{
    productId: string;
    sellerId: string;
    productReviews: any[];
    sellerReviews: any[];
  } | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (!bookingProduct) {
      setProductReviewsData(null);
      return;
    }
    const loadProductReviews = async () => {
      setLoadingReviews(true);
      try {
        const res = await fetch(`/api/products/${bookingProduct.id}/reviews`);
        if (res.ok) {
          const data = await res.json();
          setProductReviewsData(data);
        }
      } catch (err) {
        console.error('Error fetching services reviews list', err);
      } finally {
        setLoadingReviews(false);
      }
    };
    loadProductReviews();
  }, [bookingProduct?.id]);

  // Selected active order for Chat Context or Detail View
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [viewingOrderSubTab, setViewingOrderSubTab] = useState<'payment' | 'chat'>('payment');
  const [chatMessage, setChatMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [viewingOrder?.chatHistory, viewingOrder?.id]);

  // Review states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Loading indicators
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [viewingSellerProfile, setViewingSellerProfile] = useState<any | null>(null);
  const [loadingSellerProfile, setLoadingSellerProfile] = useState(false);

  // Tab state in Right-Hand Column for switching between transaction updates/status and chat rooms
  const [activeRhsTab, setActiveRhsTab] = useState<'orders' | 'chats'>('orders');

  const fetchSellerProfile = async (id: string) => {
    setLoadingSellerProfile(true);
    try {
      const res = await fetch(`/api/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingSellerProfile(data);
      } else {
        console.error('Gagal memuat profil merchant');
      }
    } catch (err) {
      console.error('Error fetching seller profile', err);
    } finally {
      setLoadingSellerProfile(false);
    }
  };

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

  // Skenario Simulasi Gerbang Pembayaran QRIS Kawan
  const [activeQrisModalOrder, setActiveQrisModalOrder] = useState<Order | null>(null);
  const [simulatingQrisLoading, setSimulatingQrisLoading] = useState(false);
  const [selectedQrisChannel, setSelectedQrisChannel] = useState<'gopay' | 'dana' | 'seabank' | 'bca' | 'mandiri' | 'other'>('gopay');

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders?userId=${user.id}&role=buyer`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        
        // Keep active viewing order details updated if open
        setViewingOrder(prev => {
          if (!prev) return null;
          const updated = data.find((o: Order) => o.id === prev.id);
          if (!updated) return prev;
          // Compare strings to prevent reference changes and infinite loop kawan!
          if (JSON.stringify(updated) !== JSON.stringify(prev)) {
            return updated;
          }
          return prev;
        });
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000); // Poll orders every 4s for mock real-time
    return () => clearInterval(interval);
  }, [fetchOrders]);

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
          seatingRequest,
          customNotes,
          paymentSchema,
          titleSelectionMethod,
          userSuggestedTitle: titleSelectionMethod === 'self' ? userSuggestedTitle : undefined
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
      setCustomNotes('');
      setPaymentSchema('full');
      setTitleSelectionMethod('self');
      setUserSuggestedTitle('');

      // Auto-focus on this new order for details and show QRIS simulator modal kawan!
      setTimeout(() => {
        setBookingProduct(null);
        setSuccessBooking('');
        if (data.order) {
          setViewingOrder(data.order);
          setActiveQrisModalOrder(data.order); // DIRECTLY POP THE SUCCESS REAL-TIME QRIS GATEWAY MODAL!
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

  // Cancel active order kawan
  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          fetchOrders();
          if (viewingOrder && viewingOrder.id === orderId) {
            setViewingOrder({ ...viewingOrder, status: 'cancelled' });
          }
          setConfirmCancelId(null);
        }
      }
    } catch (err) {
      console.error("Gagal membatalkan pesanan kawan:", err);
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
    const matchesPartnerTab = showOnlyWishlist || pType === activePartnerTab;
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.sellerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesWishlist = !showOnlyWishlist || wishlistedIds.includes(p.id);
    return matchesPartnerTab && matchesCategory && matchesSearch && matchesWishlist;
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
              <div className="flex items-center gap-4">
                <img
                  onClick={onOpenProfile}
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                  alt="Avatar Mahasiswa"
                  className="w-14 h-14 rounded-full object-cover border-2 border-white/30 shadow-md cursor-pointer hover:border-emerald-300 hover:scale-105 active:scale-95 transition-all shrink-0 duration-200"
                  title="Klik untuk membuka & mengedit Profil Anda kawan"
                />
                <div>
                  <span className="text-[10px] bg-white/20 font-mono tracking-widest text-emerald-100 uppercase px-2.5 py-0.5 rounded-full font-black">
                    🎓 PENGGUNA MAHASISWA UMSU
                  </span>
                  <h1 
                    onClick={onOpenProfile}
                    className="text-xl sm:text-2xl font-black mt-1 block cursor-pointer hover:text-emerald-250 transition active:scale-98"
                    title="Klik untuk membuka & mengedit Profil Anda kawan"
                  >
                    Halo kawan, <span className="underline decoration-wavy decoration-emerald-450">@{user.username}</span>! 👋
                  </h1>
                  <p className="text-xs text-emerald-105 font-sans mt-0.5 leading-relaxed">
                    Solusi jitu &amp; platform marketplace jasa kawan mahasiswa Kampus UMSU. Yuk penuhi kebutuhan kuliahmu!
                  </p>
                </div>
              </div>
              <div className="bg-emerald-900/40 p-3 px-4 rounded-2xl border border-emerald-500/20 text-center shrink-0">
                <span className="block text-[9px] text-emerald-350 font-bold uppercase font-mono">Transaksi Anda kawan</span>
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
                <span>⭐ Reputasi Terbaik</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOnlyWishlist(!showOnlyWishlist)}
                className={`py-1.5 px-3.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition flex items-center gap-1.5 ${
                  showOnlyWishlist
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm hover:bg-rose-700'
                    : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                }`}
              >
                <span>❤️ Wishlist Saya ({wishlistedIds.length})</span>
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
              <p className="text-slate-600 font-medium">
                {showOnlyWishlist ? 'Wishlist kawan masih kosong' : 'Tidak ada produk ditemukan'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {showOnlyWishlist 
                  ? 'Klik ikon ❤️ pada sudut kanan atas kartu jasa Mahasiswa / Mitra untuk menyimpannya di sini!'
                  : 'Gunakan kata kunci atau filter kategori lainnya'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onSelect={(product) => setBookingProduct(product)}
                  onViewSellerProfile={fetchSellerProfile}
                  isWishlisted={wishlistedIds.includes(p.id)}
                  onToggleWishlist={handleToggleWishlist}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Shopper Dashboard RHS: Orders History & Interaction Panel - Span 4 */}
      <div className="lg:col-span-4 space-y-4">
        
        {/* Navigasi Tab Shopper Right-Hand Side */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 border border-slate-205">
          <button
            type="button"
            onClick={() => setActiveRhsTab('orders')}
            className={`flex-1 py-1.5 rounded-xl text-[11.5px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
              activeRhsTab === 'orders'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-205'
                : 'text-slate-650 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />
            <span>Pesanan & Pembayaran ({orders.length})</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveRhsTab('chats')}
            className={`flex-1 py-1.5 rounded-xl text-[11.5px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer relative select-none ${
              activeRhsTab === 'chats'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-205'
                : 'text-slate-650 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
            <span>Kotak Masuk Chat ({orders.filter(o => o.chatHistory && o.chatHistory.length > 0).length})</span>
            {orders.some(o => o.chatHistory && o.chatHistory.length > 0) && (
              <span className="absolute top-1.5 right-3 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>

        {activeRhsTab === 'orders' ? (
          <>
            {/* Active Order / Chat Interaction Room */}
            {viewingOrder ? (
          <div className="bg-white rounded-2xl border border-emerald-250 shadow-md overflow-hidden flex flex-col h-[580px] xl:h-[645px] ring-2 ring-emerald-500/10">
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

            {/* Sub-Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1 shadow-inner shrink-0">
              <button
                type="button"
                onClick={() => setViewingOrderSubTab('payment')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
                  viewingOrderSubTab === 'payment'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-205'
                    : 'text-slate-550 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <span>💳 Proses &amp; Status Bayar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewingOrderSubTab('chat');
                  setTimeout(() => {
                    if (chatEndRef.current) {
                      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 80);
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer relative select-none ${
                  viewingOrderSubTab === 'chat'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-205'
                    : 'text-slate-550 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <span>💬 Chat Live Mitra</span>
                {viewingOrder.chatHistory && viewingOrder.chatHistory.length > 0 && (
                  <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                    {viewingOrder.chatHistory.length}
                  </span>
                )}
              </button>
            </div>

            {viewingOrderSubTab === 'payment' ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                {/* Order Status Timeline Banner */}
                <div className="bg-slate-100 p-3 px-4 border-b border-slate-200 shrink-0">
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
                  {viewingOrder.customNotes && (
                    <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300 border-t border-slate-100 mt-1.5 pt-1.5">
                      <span className="shrink-0 text-amber-600">📝</span>
                      <span><strong>Instruksi Khusus Jasa:</strong> <span className="italic">"{viewingOrder.customNotes}"</span></span>
                    </div>
                  )}
                  {viewingOrder.titleSelectionMethod && (
                    <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300 border-t border-slate-100 mt-1.5 pt-1.5">
                      <span className="shrink-0 text-indigo-600">💡</span>
                      <span>
                        <strong>Penentuan Judul:</strong>{' '}
                        {viewingOrder.titleSelectionMethod === 'self' ? (
                          <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.5 rounded font-medium">
                            Pilih Sendiri: "{viewingOrder.userSuggestedTitle || '-'}"
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                            Dicarikan oleh Pembuat/Mitra Jasa kawan
                          </span>
                        )}
                      </span>
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
            <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-slate-50/50">
              
              {/* SPECIAL DEPOSIT (DP 50%) TRACKING & PAYOUT MODAL */}
              {viewingOrder.paymentSchema === 'dp' && (
                <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-black uppercase tracking-wider block">📊 Skema Pembayaran: DP 50%</span>
                    {viewingOrder.repaymentStatus === 'paid' ? (
                      <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-450 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full">✅ Lunas 100%</span>
                    ) : (
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-450 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full animate-pulse">⏳ DP Telah Dibayar</span>
                    )}
                  </div>
                  
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span>Total Biaya Pesanan:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">Rp {((viewingOrder.price * viewingOrder.quantity) - (viewingOrder.discountAmount || 0)).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-450">
                      <span>Uang Muka / DP 50% (Sudah):</span>
                      <span className="font-bold">Rp {viewingOrder.dpPaidAmount?.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between font-black text-rose-600 dark:text-rose-455">
                      <span>Sisa Pelunasan (50%):</span>
                      <span>Rp {viewingOrder.remainingAmount?.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {viewingOrder.repaymentStatus === 'unpaid' && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400">
                        <span className="text-sm">⚠️</span>
                        <p className="text-[10px] font-bold uppercase leading-snug">
                          {viewingOrder.status === 'completed' 
                            ? 'Pesanan Sudah Siap! Silakan Lunasi kawan' 
                            : 'Pelunasan sisa 50%'}
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
                        Aturan JasJoking: Pelunasan sisa 50% dapat Anda bayar sekarang atau begitu status pesanan Anda sudah dimasukkan ke siap uji (**SIAP / Completed**) oleh mitra penjual kawan.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          const confirmPay = window.confirm(`Apakah Anda ingin mendemonstrasikan pelunasan sisa 50% sebesar Rp ${viewingOrder.remainingAmount?.toLocaleString('id-ID')} ?`);
                          if (!confirmPay) return;
                          try {
                            const res = await fetch(`/api/orders/${viewingOrder.id}/repay`, { method: 'POST' });
                            if (res.ok) {
                              const data = await res.json();
                              if (data.order) {
                                setViewingOrder(data.order);
                                fetchOrders();
                              }
                            }
                          } catch (err) {
                            console.error("Gagal bayar sisa 50%", err);
                          }
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] py-2 rounded-lg cursor-pointer active:scale-95 transition flex items-center justify-center gap-1"
                      >
                        <span>📲 Bayar Pelunasan Rp {viewingOrder.remainingAmount?.toLocaleString('id-ID')} kawan</span>
                      </button>
                    </div>
                  )}

                  {viewingOrder.repaymentStatus === 'paid' && (
                    <div className="bg-emerald-55 dark:bg-emerald-950/20 border border-emerald-200 rounded-xl p-2.5 text-center text-[10px] text-emerald-800 dark:text-emerald-400 font-bold">
                      🎉 Selamat! Seluruh pembayaran (DP + Pelunasan) telah divalidasi lunas 100% kawan. Terima kasih banyak telah mendukung UMKM sesama mahasiswa!
                    </div>
                  )}
                </div>
              )}

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

                      <div className="pt-1.5 flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveQrisModalOrder(viewingOrder)}
                          className="mx-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center gap-1 transition cursor-pointer shadow-xs"
                        >
                          📱 Buka Gerbang QRIS Terpadu (Layar Penuh)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const genId = 'TX-' + Math.floor(1000 + Math.random() * 9000);
                            setTransRef(genId);
                            handleSimulatePayment(viewingOrder.id);
                          }}
                          className="mx-auto bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition cursor-pointer shadow-xs"
                        >
                          ⚡ Simulasi Pembayaran QRIS Cepat (Instan)
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

              {/* ⭐ SEKSI PEMBATALAN TRANSAKSI (CANCEL ORDER ACTION) kawan */}
              {viewingOrder.status !== 'cancelled' && viewingOrder.status !== 'completed' && (
                <div className="p-4 bg-white rounded-2xl border border-slate-205 shadow-xs text-center space-y-2 mt-4 shrink-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bantuan &amp; Pembatalan</p>
                  
                  {confirmCancelId === viewingOrder.id ? (
                    <div className="space-y-2 animate-in fade-in duration-200 text-left">
                      <p className="text-[11px] text-rose-600 font-extrabold leading-normal select-none">
                        ⚠️ Kawan, apakah Anda benar-benar yakin ingin membatalkan pesanan ini?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmCancelId(null)}
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition cursor-pointer text-center"
                        >
                          Batal, Balik
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(viewingOrder.id)}
                          className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-extrabold transition cursor-pointer text-center"
                        >
                          Ya, Batalkan kawan!
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmCancelId(viewingOrder.id)}
                      className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 border border-rose-200 cursor-pointer"
                    >
                      <span>❌ Ajukan Pembatalan Pesanan kawan</span>
                    </button>
                  )}
                </div>
              )}

                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-50/20">
                {/* Chat History Box (stretches to fill remaining layout height beautifully) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
                  {viewingOrder.chatHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
                      <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">💬</div>
                      <p className="text-xs text-slate-600 font-extrabold font-sans">Belum ada obrolan terbaru kawan</p>
                      <p className="text-[10px] text-slate-400 max-w-[210px] leading-relaxed">Kirim obrolan/pesan di bawah untuk memulai chat langsung dengan mitra kawan.</p>
                    </div>
                  ) : (
                    viewingOrder.chatHistory.map((m, idx) => {
                      const isSystem = m.senderId === 'system';
                      const isMe = m.senderId === user.id;
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col ${isSystem ? 'items-center' : isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className={`max-w-[85%] rounded-2xl p-2.5 text-xs shadow-xs transition duration-150 ${
                            isSystem 
                              ? 'bg-slate-105 text-slate-550 border border-slate-200 text-center rounded-lg max-w-[95%] py-1.5 font-medium' 
                              : isMe 
                              ? 'bg-emerald-600 text-white rounded-br-none font-medium' 
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none font-medium'
                          }`}>
                            {!isSystem && (
                              <span className="block text-[9px] font-extrabold opacity-85 mb-0.5 uppercase tracking-wide">
                                {m.senderName}
                              </span>
                            )}
                            <p className="leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1 px-1.5 font-mono">
                            {new Date(m.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Message input footer */}
                <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-200 flex gap-2 shrink-0">
                  <input
                    type="text"
                    placeholder="Tulis pesan obrolan untuk penjual..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    disabled={!chatMessage.trim()}
                    className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
                      chatMessage.trim() 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-350 border border-slate-100 cursor-not-allowed'
                    }`}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-center">
              <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Pilih pesanan Anda di bawah untuk membuka layar bayar QRIS kawan & Ruang Chat Live</p>
            </div>

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
                  onClick={() => {
                    setViewingOrder(o);
                    setViewingOrderSubTab('payment');
                  }}
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
          </>
        )}
      </>
        ) : (
          <BuyerChatInbox 
            orders={orders}
            currentUserId={user.id}
            viewingOrderId={viewingOrder?.id}
            onSelectChat={(order) => {
              setViewingOrder(order);
              setActiveRhsTab('orders');
              setViewingOrderSubTab('chat');
            }}
          />
        )}
      </div>

      {/* SUBMIT BOOKING MODAL */}
      {bookingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
            <form onSubmit={handlePlaceOrder} className="p-5 space-y-4 text-left flex-1 overflow-y-auto">
              {errorBooking && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded border border-rose-100">{errorBooking}</p>}
              {successBooking && <p className="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded border border-emerald-100 font-bold">{successBooking}</p>}

              {/* SELLER QUALITY/PROFILE VERIFICATION CARD TO PREVENT ERRORS */}
              <div className="p-3 bg-emerald-50 text-emerald-950 rounded-xl border border-emerald-150 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="block text-[8px] font-black tracking-wider text-emerald-700 uppercase">PENYEDIA JASA/TOKO TERPERCAYA</span>
                  <div className="font-extrabold text-slate-800 flex items-center gap-1 uppercase">
                    👤 {cleanSellerName(bookingProduct.sellerName)}
                  </div>
                  {bookingProduct.address && (
                    <div className="text-[10px] text-slate-500 line-clamp-1">📍 {bookingProduct.address}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    fetchSellerProfile(bookingProduct.sellerId);
                  }}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[10px] uppercase transition cursor-pointer select-none shrink-0"
                >
                  Cek Profil Jasa
                </button>
              </div>

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
                    {bookingProduct.tableOptions && bookingProduct.tableOptions.length > 0 ? (
                      bookingProduct.tableOptions.map((tbl, idx) => (
                        <option key={idx} value={`Makan di Tempat (${tbl})`}>Makan di Tempat — {tbl}</option>
                      ))
                    ) : (
                      <>
                        <option value="Makan di Kantin (Meja No. 1)">Makan di Kantin (Meja No. 1)</option>
                        <option value="Makan di Kantin (Meja No. 2)">Makan di Kantin (Meja No. 2)</option>
                        <option value="Makan di Kantin (Meja No. 3)">Makan di Kantin (Meja No. 3)</option>
                      </>
                    )}
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


              {/* TITLE & TOPIC METHOD SELECTION (PILIH SENDIRI VS DICARIKAN PEMBUAT) */}
              {bookingProduct.category !== 'makanan' && bookingProduct.category !== 'kebutuhan' && (
                <div className="bg-gradient-to-br from-indigo-50/50 to-emerald-50/50 dark:from-slate-800 dark:to-slate-900 p-3.5 rounded-xl border border-indigo-100/80 dark:border-indigo-950/60 space-y-2.5 text-left">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                    <span>💡</span>
                    Metode Penentuan Judul & Topik Jasa
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTitleSelectionMethod('self')}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition ${
                        titleSelectionMethod === 'self'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 ring-1 ring-indigo-600/30'
                          : 'border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-805 dark:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Pilih Sendiri</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                        Saya menentukan judul/topik sendiri kawan.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTitleSelectionMethod('seller_suggest');
                        setUserSuggestedTitle('');
                      }}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition ${
                        titleSelectionMethod === 'seller_suggest'
                          ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20 ring-1 ring-emerald-600/30'
                          : 'border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-805 dark:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Dicarikan Pembuat</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                        Tinggal terima beres dicarikan oleh mitra jasa.
                      </div>
                    </button>
                  </div>

                  {titleSelectionMethod === 'self' ? (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Ketik Judul / Topik Pilihan Anda:
                      </label>
                      <input
                        type="text"
                        value={userSuggestedTitle}
                        onChange={(e) => setUserSuggestedTitle(e.target.value)}
                        placeholder="Contoh: Desain Brosur IMM UMSU atau Analisis UU Ekonomi"
                        required={titleSelectionMethod === 'self'}
                        className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-250 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:text-white"
                      />
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-50/55 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-950 rounded text-[10px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      ✨ <b>Riset Judul Otomatis:</b> Pembuat kawan kami akan meneliti dan menentukan judul/topik tugas yang paling optimal, orisinal, serta kreatif agar bebas plagiat kawan!
                    </div>
                  )}
                </div>
              )}

              {/* CUSTOM INSTRUCTION SPECIFICATION AREA */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-left">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <span>📝</span>
                  Instruksi Khusus Jasa / Apa yang Ingin Dibuat?
                </span>
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Contoh: Tolong buatkan PPT isi 10 slide materi AI, atau Ayam Penyet minta sambal dipisah ya kawan..."
                  rows={2}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400">Deskripsikan isi pekerjaan atau modifikasi jasa sejelas mungkin kawan.</p>
              </div>

              {/* PAYMENT SCHEMA SELECTOR (DP VS FULL) */}
              <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-left">
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">💡 Pilih Skema Pembayaran</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentSchema('full')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                      paymentSchema === 'full' 
                        ? 'border-emerald-600 bg-emerald-50/20 ring-1 ring-emerald-600/30' 
                        : 'border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600'
                    }`}
                  >
                    <span className="block text-xs text-slate-800 dark:text-slate-100 font-bold">📢 Lunas Langsung</span>
                    <span className="block text-[9.5px] text-slate-400 leading-tight mt-0.5">Membayar 100% penuh saat pemesanan langsung terkonfirmasi kawan.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentSchema('dp')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                      paymentSchema === 'dp' 
                        ? 'border-amber-550 bg-amber-50/20 ring-1 ring-amber-500/30' 
                        : 'border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600'
                    }`}
                  >
                    <span className="block text-xs text-slate-800 dark:text-slate-100 font-bold">⏳ Uang Muka (DP 50%)</span>
                    <span className="block text-[9.5px] text-slate-400 leading-tight mt-0.5">Membayar setengah harga di awal. Sisa 50% setelah pesanan siap kawan.</span>
                  </button>
                </div>
              </div>

              {/* PRICE DETAIL WITH MULTIPLE OF 3 LOYALTY DISCOUNT */}
              {(() => {
                const targetQty = Number(bookingQuantity) || 1;
                const isDiscountOrder = (orders.length + 1) % 3 === 0;
                const originalPrice = bookingProduct ? (bookingProduct.price * targetQty) : 0;
                const discountAmount = isDiscountOrder ? Math.round(originalPrice * 0.30) : 0;
                const finalPrice = originalPrice - discountAmount;
                const existingCount = orders.length;

                const dpPrice = Math.round(finalPrice * 0.5);
                const remainingPrice = finalPrice - dpPrice;

                return (
                  <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2 text-xs">
                    <span className="block text-[10px] text-emerald-850 font-extrabold uppercase tracking-wide">RINCIAN BIAYA MAHASISWA</span>
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

                    {paymentSchema === 'dp' ? (
                      <div className="space-y-1.5 pt-2 border-t border-emerald-200">
                        <div className="flex justify-between items-center text-slate-700 font-bold text-[11px]">
                          <span>Harga Total Layanan:</span>
                          <span className="line-through text-slate-400">Rp {finalPrice.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center text-amber-850 font-extrabold bg-amber-50 p-2 rounded-lg border border-amber-100">
                          <span className="flex items-center gap-1">
                            ⚡ Uang Muka DP (50% Sekarang)
                          </span>
                          <span className="text-sm">Rp {dpPrice.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 font-medium px-1">
                          <span>Sisa Pelunasan (50% Nanti):</span>
                          <span>Rp {remainingPrice.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-sm font-black text-slate-950 pt-1.5 border-t border-emerald-200 bg-emerald-50 p-2 rounded-lg">
                        <span>Total Tagihan (Lunas Penuh)</span>
                        <span className="text-emerald-800 font-extrabold text-base">Rp {finalPrice.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ⭐ ULASAN & RATING PEMBELI (REAL-TIME SOCIAL PROOF) */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-250">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1">
                      <span>⭐</span> Ulasan & Rating Jasa
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Pendapat asli dari pembeli mahasiswa lain.</p>
                  </div>
                  <div className="text-right">
                    {bookingProduct.sellerRating && bookingProduct.sellerRating > 0 ? (
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-amber-800 font-bold text-xs">
                        <span>★</span>
                        <span>{bookingProduct.sellerRating} / 5.0</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-400 italic bg-white px-2 py-0.5 rounded border">Belum ada ulasan</span>
                    )}
                  </div>
                </div>

                {loadingReviews ? (
                  <div className="py-4 text-center space-y-2">
                    <span className="inline-block animate-spin text-emerald-600">⌛</span>
                    <p className="text-[10px] text-slate-400">Memuat upan balik asli...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Render Product Reviews */}
                    {productReviewsData?.productReviews && productReviewsData.productReviews.length > 0 ? (
                      <div className="space-y-2">
                        <span className="block text-[9px] font-black uppercase text-emerald-700 tracking-wider">Ulasan Khusus Layanan Ini ({productReviewsData.productReviews.length})</span>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {productReviewsData.productReviews.map((rev) => (
                            <div key={rev.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 text-[11px] text-left animate-in fade-in slide-in-from-bottom-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-slate-700">{rev.buyerName}</span>
                                <div className="flex text-amber-500 text-[10px] select-none">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className="leading-none">{i < rev.rating ? '★' : '☆'}</span>
                                  ))}
                                </div>
                              </div>
                              <p className="text-slate-600 italic">"{rev.review || 'Pembeli memberikan bintang tanpa menulis teks.'}"</p>
                              <span className="block text-[8px] text-slate-400 text-right mt-1 font-mono">
                                {new Date(rev.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-1">
                        <p className="text-[10.5px] text-slate-500 italic">Belum ada ulasan untuk barang/jasa khusus ini kawan.</p>
                        
                        {/* Fallback to other seller reviews as social proof */}
                        {productReviewsData?.sellerReviews && productReviewsData.sellerReviews.length > 0 ? (
                          <div className="mt-3 text-left space-y-2 pt-2 border-t border-slate-200">
                            <span className="block text-[9px] font-black uppercase text-amber-700 tracking-wider">Mungkin Anda juga ingin melihat ulasan toko lainnya:</span>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {productReviewsData.sellerReviews.slice(0, 3).map((rev) => (
                                <div key={rev.id} className="p-2 bg-white rounded-lg border border-slate-150 text-[10px] transform hover:scale-[1.01] transition">
                                  <div className="flex justify-between items-center mb-0.5">
                                    <span className="font-bold text-slate-700 truncate max-w-[120px]">{rev.buyerName}</span>
                                    <div className="flex text-amber-500 text-[8px] select-none font-black">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <span key={i} className="leading-none">{i < rev.rating ? '★' : '☆'}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <span className="block text-[8px] text-slate-400 font-bold truncate">pada {rev.productTitle}</span>
                                  <p className="text-slate-500 italic mt-0.5">"{rev.review || 'Memberi bintang tanpa ulasan tulis.'}"</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[9px] text-slate-400 font-mono">Penjual ini baru bergabung & siap melayani pesanan perdana Anda kawan!</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

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

      {/* 👤 SHOPEE-STYLE SELLER PROFILE DETAIL DIALOG (REAL-TIME & DEEP DETAIL) */}
      {viewingSellerProfile && (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-100 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col text-left">
            
            {/* Header decor background banner colored by role */}
            <div className={`h-24 w-full ${
              viewingSellerProfile.role === 'admin' ? 'bg-indigo-650' : 'bg-emerald-600'
            } relative`}>
              {/* Close button icon */}
              <button
                type="button"
                onClick={() => setViewingSellerProfile(null)}
                className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 h-8 w-8 flex items-center justify-center transition cursor-pointer font-black text-xs shadow-md"
              >
                ✕
              </button>
            </div>

            {/* Main content body inside scroll container wrapper */}
            <div className="px-6 pb-6 relative flex-1 overflow-y-auto">
              
              {/* Overlapping Avatar details positioning */}
              <div className="flex justify-between items-end -mt-10 mb-4 flex-wrap gap-4">
                <div className="relative">
                  {viewingSellerProfile.avatarUrl ? (
                    <img 
                      src={viewingSellerProfile.avatarUrl} 
                      alt={viewingSellerProfile.username} 
                      className="h-20 w-20 object-cover rounded-full border-4 border-white bg-white shadow-md block"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-slate-100 border-4 border-white shadow-md flex items-center justify-center text-3xl font-black uppercase text-slate-500">
                      {viewingSellerProfile.username.substring(0, 2)}
                    </div>
                  )}
                  {viewingSellerProfile.whatsappVerified && (
                    <span 
                      className="absolute bottom-0 right-0 h-5 w-5 bg-emerald-500 text-white rounded-full text-[10px] font-black border-2 border-white flex items-center justify-center shadow-xs"
                      title="WhatsApp Seller Resmi Terverifikasi"
                    >
                      ✓
                    </span>
                  )}
                </div>

                <div className="flex gap-2 select-none">
                  {viewingSellerProfile.whatsappNumber ? (
                    <a
                      href={`https://wa.me/${viewingSellerProfile.whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-xs border border-emerald-250"
                    >
                      <span>🟢 Hubungi WA</span>
                    </a>
                  ) : (
                    <span className="py-2 px-3 bg-slate-50 text-slate-400 rounded-xl text-[10px] italic border">Belum ada WA</span>
                  )}
                </div>
              </div>

              {/* Title Store Info text stack */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    {viewingSellerProfile.storeName || viewingSellerProfile.username}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    viewingSellerProfile.role === 'admin' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                    'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {viewingSellerProfile.role === 'admin' ? '👑 Admin Kampus' : '🎓 Jasa Mahasiswa'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium font-mono">@{viewingSellerProfile.username} • {viewingSellerProfile.email}</p>
                <p className="text-[10px] text-slate-400">Bergabung: {viewingSellerProfile.createdAt ? new Date(viewingSellerProfile.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Baru'}</p>
                {viewingSellerProfile.address && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 inline-block mt-2">
                    📍 <strong>Alamat Kantor/Markas:</strong> {viewingSellerProfile.address}
                  </p>
                )}
              </div>

              {/* Related Services/Food lists of this merchant */}
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <span>🏪</span> KATALOG LAIN DARI SELLER INI ({products.filter(p => p.sellerId === viewingSellerProfile.id).length})
                </h3>
                
                {(() => {
                  const sellerProds = products.filter(p => p.sellerId === viewingSellerProfile.id);
                  if (sellerProds.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 italic">Belum ada daftar jualan/jasa aktif di kampus kawan.</p>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
                      {sellerProds.map(p => {
                        const catItem = CATEGORY_LABELS[p.category] || { label: 'Lainnya', icon: '🏷️' };
                        return (
                          <div 
                            key={p.id} 
                            onClick={() => {
                              setBookingProduct(p);
                              setViewingSellerProfile(null);
                            }}
                            className="bg-slate-50/50 hover:bg-emerald-50/40 cursor-pointer border border-slate-150 rounded-xl p-3 flex gap-2.5 items-center transition duration-150 select-none hover:border-emerald-250 hover:shadow-xs group/item text-left"
                          >
                            <img 
                              src={p.imageUrl} 
                              alt={p.title} 
                              className="h-11 w-11 object-cover rounded-lg border border-slate-200 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="block text-[8px] font-extrabold uppercase tracking-widest text-slate-400">{catItem.label}</span>
                              <h4 className="text-xs font-bold text-slate-800 truncate line-clamp-1 group-hover/item:text-emerald-600">{p.title}</h4>
                              <span className="block text-xs font-mono font-black text-emerald-700 mt-0.5">Rp {p.price.toLocaleString('id-ID')}</span>
                            </div>
                            <span className="text-slate-300 font-bold text-xs shrink-0 bg-white h-7 w-7 rounded-full border border-slate-100 flex items-center justify-center transition group-hover/item:text-emerald-750 group-hover/item:border-emerald-300 shadow-2xs">→</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Bottom action wrapper */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setViewingSellerProfile(null)}
                className="py-2 px-5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                    Tutup Profil
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📱 SIMULASI GERBANG PEMBAYARAN QRIS (DEDICATED GATEWAY MODAL) */}
      {activeQrisModalOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-150 dark:border-slate-800 max-w-md w-full overflow-hidden flex flex-col text-left transform scale-100 transition-all">
            {/* Header / Brand */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 px-1.5 bg-white text-emerald-700 rounded-lg font-black text-xs select-none">
                  QRIS
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight">JasJoking Pay Gateway</h3>
                  <p className="text-[9px] text-teal-100">Gerbang Layanan Pembayaran Digital Kampus</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveQrisModalOrder(null)}
                className="p-1 hover:bg-white/10 rounded-full transition cursor-pointer text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Gateway Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Order Transaction Detail Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">ID TRANSAKSI</span>
                  <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">{activeQrisModalOrder.id}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/60 pt-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">NAMA BARANG/JASA</span>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-150 max-w-[180px] truncate">{activeQrisModalOrder.productTitle}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/60 pt-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">MITRA / SELLER</span>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-450">{activeQrisModalOrder.sellerName}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/60 pt-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">JUMLAH</span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">{activeQrisModalOrder.quantity} Unit / Item</span>
                </div>
              </div>

              {/* PAYMENT CHANNEL SELECTOR */}
              <div className="space-y-2 text-left bg-slate-50 dark:bg-slate-805 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] text-slate-505 dark:text-slate-400 font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span>💳</span> Opsi Saluran Pembayaran (Pilih Salah Satu):
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedQrisChannel('gopay')}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer select-none leading-none ${
                      selectedQrisChannel === 'gopay'
                        ? 'border-emerald-500 bg-emerald-50/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase">GoPay</div>
                    <div className="text-[8px] opacity-75 mt-1 font-sans">E-Wallet</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedQrisChannel('dana')}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer select-none leading-none ${
                      selectedQrisChannel === 'dana'
                        ? 'border-sky-500 bg-sky-50/40 text-sky-800 dark:text-sky-300 ring-2 ring-sky-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase">DANA</div>
                    <div className="text-[8px] opacity-75 mt-1 font-sans">E-Wallet</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedQrisChannel('seabank')}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer select-none leading-none ${
                      selectedQrisChannel === 'seabank'
                        ? 'border-orange-500 bg-orange-50/40 text-orange-900 dark:text-orange-300 ring-2 ring-orange-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase">SeaBank</div>
                    <div className="text-[8px] opacity-75 mt-1 font-sans">Digital Bank</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedQrisChannel('bca')}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer select-none leading-none ${
                      selectedQrisChannel === 'bca'
                        ? 'border-blue-600 bg-blue-50/40 text-blue-800 dark:text-blue-300 ring-2 ring-blue-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase">m-BCA</div>
                    <div className="text-[8px] opacity-75 mt-1 font-sans">m-Banking</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedQrisChannel('mandiri')}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer select-none leading-none ${
                      selectedQrisChannel === 'mandiri'
                        ? 'border-yellow-500 bg-yellow-50/40 text-yellow-800 dark:text-yellow-300 ring-2 ring-yellow-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase">Mandiri</div>
                    <div className="text-[8px] opacity-75 mt-1 font-sans">Livin' App</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedQrisChannel('other')}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer select-none leading-none ${
                      selectedQrisChannel === 'other'
                        ? 'border-indigo-500 bg-indigo-50/40 text-indigo-800 dark:text-indigo-300 ring-2 ring-indigo-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase">Bank Lain</div>
                    <div className="text-[8px] opacity-75 mt-1 font-sans">OVO/LinkAja</div>
                  </button>
                </div>
              </div>

              {/* QRIS BRAND MATRIX VISUALIZER */}
              <div className="text-center space-y-3">
                <div className="inline-block bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-md col-span-1">
                  {/* Styled QRIS code container visual representation */}
                  <div className={`w-48 h-48 mx-auto border-4 p-2.5 bg-white relative flex flex-col justify-between shadow-2xs transition-colors duration-300 ${
                    selectedQrisChannel === 'gopay' ? 'border-emerald-500' :
                    selectedQrisChannel === 'dana' ? 'border-sky-500' :
                    selectedQrisChannel === 'seabank' ? 'border-orange-500' :
                    selectedQrisChannel === 'bca' ? 'border-blue-600' :
                    selectedQrisChannel === 'mandiri' ? 'border-yellow-500' : 'border-indigo-600'
                  }`}>
                    <div className="flex justify-between">
                      <span className="w-5.5 h-5.5 bg-slate-950"></span>
                      <span className="w-5.5 h-5.5 bg-slate-950"></span>
                    </div>
                    {/* QR Code Pixel Matrix mockup representation */}
                    <div className="absolute inset-5.5 border border-slate-200 leading-none">
                      <div className="grid grid-cols-5 gap-0.5 p-1 h-full w-full">
                        {Array.from({ length: 25 }).map((_, i) => (
                          <div key={i} className={`rounded-xs ${(i * 11 + 7) % 3 === 0 || (i * 3) % 2 === 0 ? 'bg-slate-900' : 'bg-transparent'}`} />
                        ))}
                      </div>
                    </div>
                    {/* QRIS tiny tag logo overlay */}
                    <div className="absolute inset-0 m-auto w-14 h-7 bg-slate-950 text-white font-black text-[8px] flex flex-col items-center justify-center rounded uppercase tracking-wider scale-110 shadow-md">
                      <span className="text-[5px] text-slate-300 leading-none">QRIS</span>
                      <span className="font-extrabold text-[7px] leading-none text-emerald-400">
                        {selectedQrisChannel === 'gopay' ? 'GOPAY' :
                         selectedQrisChannel === 'dana' ? 'DANA' :
                         selectedQrisChannel === 'seabank' ? 'SEABANK' :
                         selectedQrisChannel === 'bca' ? 'BCA' :
                         selectedQrisChannel === 'mandiri' ? 'MANDIRI' : 'CUSTOM'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="w-5.5 h-5.5 bg-slate-950"></span>
                      <span className="w-3.5 h-3.5 bg-slate-950 self-end"></span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-805 rounded-2xl border border-slate-100 dark:border-slate-805 text-center">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    👉 PETUNJUK AKSES BERES (SIMULASI):
                  </p>
                  <p className="text-[11px] font-black text-slate-800 dark:text-slate-150 leading-relaxed">
                    {selectedQrisChannel === 'gopay' && "🟢 Buka Aplikasi GoPay / Gojek Anda kawan. Tekan tombol 'Bayar / Scan', arahkan kamera ke QRIS di atas."}
                    {selectedQrisChannel === 'dana' && "🔵 Buka Aplikasi DANA Anda kawan. Tekan menu 'Pay' di baris tengah bawah, pindai QRIS di atas."}
                    {selectedQrisChannel === 'seabank' && "🟠 Buka Aplikasi SeaBank Anda kawan. Pilih menu 'Bayar' di beranda utama untuk memindai."}
                    {selectedQrisChannel === 'bca' && "🔵 Buka Aplikasi m-BCA Anda kawan. Tekan tombol biru QRIS di bagian bawah beranda untuk memindai."}
                    {selectedQrisChannel === 'mandiri' && "🟡 Buka Aplikasi Livin' by Mandiri kawan. Klik shortcut 'QR Bayar' di baris bawah untuk memindai."}
                    {selectedQrisChannel === 'other' && "🟣 Buka aplikasi e-wallet (OVO, LinkAja, ShopeePay) atau m-Banking pilihan Anda untuk memindai."}
                  </p>
                  <p className="text-[9px] text-slate-405 dark:text-slate-400 leading-snug">
                    Sistem JasJoking akan mendeteksi perpindahan dana secara real-time dari platform {selectedQrisChannel.toUpperCase()} Anda demi jaminan keamanan ganda!
                  </p>
                </div>
              </div>

              {/* Total Price Billboard */}
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-center space-y-1">
                {activeQrisModalOrder.paymentSchema === 'dp' ? (
                  <>
                    <span className="text-[9.5px] text-amber-800 dark:text-amber-400 font-extrabold uppercase tracking-wider block">⚠️ NO NOMINAL PEMBAYARAN DP (50%)</span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-450 block font-mono">
                      Rp {activeQrisModalOrder.dpPaidAmount?.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-slate-550 block italic font-sans">
                      *Harga total Rp {((activeQrisModalOrder.price * activeQrisModalOrder.quantity) - (activeQrisModalOrder.discountAmount || 0)).toLocaleString('id-ID')}. Sisa pelunasan 50% sebesar Rp {activeQrisModalOrder.remainingAmount?.toLocaleString('id-ID')} dibayar saat siap kawan.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] text-emerald-800 dark:text-emerald-400 font-black uppercase tracking-wider block">TOTAL TAGIHAN MAHASISWA</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white block font-mono">
                      Rp {((activeQrisModalOrder.price * activeQrisModalOrder.quantity) - (activeQrisModalOrder.discountAmount || 0)).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block italic font-sans">*Nominal sudah dikurangi loyalty program otomatis</span>
                  </>
                )}
              </div>

              {/* Simulated Notification & Confirmation Status Banner */}
              <div className="p-1 rounded-2xl text-center space-y-1.5 transition">
                {activeQrisModalOrder.status === 'awaiting_payment' ? (
                  <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30 text-amber-905 dark:text-amber-400 rounded-xl p-3 text-xs flex flex-col items-center gap-1.5 text-center font-sans">
                    <span className="inline-block animate-bounce text-lg">⏳</span>
                    <p className="font-extrabold uppercase text-[10px] tracking-wide">Menunggu Pembayaran kawan...</p>
                    <p className="text-[10px] text-slate-500 max-w-[280px]">Silakan klik tombol simulasi di bawah untuk mengonfirmasikan pembayaran lunas secara otomatis.</p>
                  </div>
                ) : (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-400 rounded-xl p-3 text-xs flex flex-col items-center gap-1.5 text-center font-sans">
                    <span className="inline-block animate-pulse text-lg">✅</span>
                    <p className="font-extrabold uppercase text-[10px] tracking-wide">
                      {activeQrisModalOrder.paymentSchema === 'dp' ? 'PEMBAYARAN DP 50% QRIS SUKSES!' : 'PEMBAYARAN QRIS SUKSES (LUNAS!)'}
                    </p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-350 max-w-[300px]">JasJoking AI Splitter mendistribusikan dana secara asinkron :</p>
                    <div className="text-[9px] text-left text-slate-550 space-y-0.5 border-t border-emerald-100 dark:border-emerald-900/30 pt-1.5 w-full">
                      <div className="flex justify-between">
                        <span>Hak Mitra Penjual (95%):</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Rp {Math.round((activeQrisModalOrder.paymentSchema === 'dp' ? (activeQrisModalOrder.dpPaidAmount || 0) : ((activeQrisModalOrder.price * activeQrisModalOrder.quantity) - (activeQrisModalOrder.discountAmount || 0))) * 0.95).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pemberdayaan Kampus (5%):</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Rp {Math.round((activeQrisModalOrder.paymentSchema === 'dp' ? (activeQrisModalOrder.dpPaidAmount || 0) : ((activeQrisModalOrder.price * activeQrisModalOrder.quantity) - (activeQrisModalOrder.discountAmount || 0))) * 0.05).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Simulation Action Buttons */}
              <div className="space-y-2">
                {activeQrisModalOrder.status === 'awaiting_payment' && (
                  <button
                    type="button"
                    disabled={simulatingQrisLoading}
                    onClick={async () => {
                      setSimulatingQrisLoading(true);
                      await new Promise(resolve => setTimeout(resolve, 1500));
                      try {
                        const res = await fetch(`/api/orders/${activeQrisModalOrder.id}/payment`, { method: 'POST' });
                        if (res.ok) {
                          const data = await res.json();
                          if (data.order) {
                            setActiveQrisModalOrder(data.order);
                            setViewingOrder(data.order);
                            fetchOrders(); // Sync real list
                          }
                        }
                      } catch (err) {
                        console.error("Gagal melakukan simulasi bayar qris", err);
                      } finally {
                        setSimulatingQrisLoading(false);
                      }
                    }}
                    className={`w-full py-3 rounded-2xl text-xs font-black transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md select-none ${
                      simulatingQrisLoading
                        ? 'bg-amber-400 text-white cursor-wait animate-pulse'
                        : 'bg-amber-500 hover:bg-amber-600 text-slate-950 active:scale-95'
                    }`}
                  >
                    {simulatingQrisLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Koneksi Gerbang {selectedQrisChannel.toUpperCase()} (Memverifikasi Saldo)...</span>
                      </>
                    ) : (
                      <>
                        <span>📲 Simulasi Bayar QRIS Sekarang (Seketika Lunas via {selectedQrisChannel.toUpperCase()}!)</span>
                      </>
                    )}
                  </button>
                )}

                <div className="flex gap-2">
                  {activeQrisModalOrder.status !== 'awaiting_payment' && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewingOrder(activeQrisModalOrder);
                        setActiveRhsTab('orders');
                        setActiveQrisModalOrder(null);
                      }}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition text-center cursor-pointer select-none"
                    >
                      Buka Detil Pesanan &amp; Chat
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveQrisModalOrder(null)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold text-center cursor-pointer select-none ${
                      activeQrisModalOrder.status === 'awaiting_payment'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-755 dark:text-slate-300'
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    {activeQrisModalOrder.status === 'awaiting_payment' ? 'Bayar Nanti' : 'Selesai'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
