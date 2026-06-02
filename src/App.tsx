import React, { useState, useEffect, useCallback } from 'react';
import { User, Product, AppNotification } from './types';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { BuyerPanel } from './components/BuyerPanel';
import { SellerPanel } from './components/SellerPanel';
import { AdminPanel } from './components/AdminPanel';
import { SettingsModal } from './components/SettingsModal';
import { BookOpen, Palette, Code, Printer, Coffee, AlertCircle, ShoppingBag, Terminal, ExternalLink, Sparkles, X, Send, Bot } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Light/Dark Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('jasjoking_theme') as 'light' | 'dark') || 'light';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('jasjoking_theme', theme);
  }, [theme]);

  // Global AI Floating Chat states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai', text: string }>>([
    { sender: 'ai', text: 'Halo kawan-kawan mahasiswa! Saya JasJoking AI, asisten pintarmu. Ada yang bisa saya bantu hari ini? Tanya saya tentang rekomendasi menu kantin mahasiswa, saringan harga jualan mitra, atau panduan tugas kampus!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Attempt to restore user session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('mahasiswa_marketplace_user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse saved user:', e);
      }
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('mahasiswa_marketplace_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('mahasiswa_marketplace_user');
  };

  // Fetch product list
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  // Sync state loop
  useEffect(() => {
    fetchProducts();
    fetchNotifications();

    const interval = setInterval(() => {
      fetchProducts();
      fetchNotifications();
    }, 5000); // Pull logs every 5s

    return () => clearInterval(interval);
  }, [fetchProducts, fetchNotifications]);

  const clearNotifications = async () => {
    try {
      const res = await fetch('/api/notifications/clear', { method: 'POST' });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
          mode: currentUser?.role === 'seller' ? 'pricing' : 'recommendation'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan sistem AI');

      setChatMessages(prev => [...prev, { sender: 'ai', text: data.text }]);
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Waduh kawan, koneksi asisten AI sedang sibuk. Silakan coba lagi sebentar ya!' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const getSlogan = () => {
    if (!currentUser) return '';
    switch (currentUser.role) {
      case 'admin':
        return 'Panel Kendali Administrator Kampus Utama';
      case 'seller':
        return `Dasbor Penjual Mahasiswa & Mitra UMKM - ${currentUser.storeName || 'Toko Mandiri'}`;
      default:
        return 'Belanja Kebutuhan Kuliah & Reservasi Kantin dengan QRIS Instan';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Memulai Mading Kampus...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Auth Screen
  if (!currentUser) {
    return (
      <AuthScreen 
        onLoginSuccess={handleLoginSuccess} 
        theme={theme} 
        onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/75 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        notifications={notifications}
        onClearNotifications={clearNotifications}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Welcome Jumbotron Cover Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-white/5 text-left">
          {/* Visual backgrounds lines decoration */}
          <div className="absolute inset-x-0 -top-40 -bottom-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase font-black tracking-wider bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-full">
               Halo {currentUser.username}!
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              Selamat Datang di JasJoking Mahasiswa & Mitra Kampus
            </h1>
            <p className="text-slate-350 text-xs sm:text-sm font-medium leading-relaxed">
              {getSlogan()}
            </p>
          </div>

          {/* Quick Stats overview inside banner */}
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-white/10 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-white/5 rounded-md text-emerald-400">📖</span>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-sans font-extrabold">Buku Bekas</span>
                <span className="font-bold text-slate-205">Saring & Cari Cepat</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-white/5 rounded-md text-emerald-400">🎨</span>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-sans font-extrabold">Jasa Desain IT</span>
                <span className="font-bold text-slate-205">Koding & Slide PPT</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-white/5 rounded-md text-emerald-400">🪑</span>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-sans font-extrabold">Reservasi Meja</span>
                <span className="font-bold text-slate-205">Kantin & Food Court</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-white/5 rounded-md text-emerald-400">📲</span>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-sans font-extrabold">Gerbang QRIS</span>
                <span className="font-bold text-slate-205">Bayar Lunas Otomatis</span>
              </div>
            </div>
          </div>
        </div>

        {/* CORE WORKSPACE PANEL PER ROLE */}
        <div id="core-application-workspace" className="animate-in fade-in duration-300">
          {currentUser.role === 'buyer' && (
            <BuyerPanel
              user={currentUser}
              onLogout={handleLogout}
              products={products}
              refreshProducts={fetchProducts}
            />
          )}

          {currentUser.role === 'seller' && (
            <SellerPanel
              user={currentUser}
              refreshProducts={fetchProducts}
              onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)}
            />
          )}

          {currentUser.role === 'admin' && (
            <AdminPanel
              user={currentUser}
            />
          )}
        </div>

      </main>

      {/* ========================================================= */}
      {/* ✨ GLOBAL FLOATING JASJOKING AI CHAT ASSISTANT WIDGET ✨ */}
      {/* ========================================================= */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
        {chatOpen && (
          <div className="w-[340px] h-[450px] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
            {/* Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-850 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="p-1 px-1.5 bg-emerald-600 rounded-lg text-white font-black text-xs">
                  AI
                </div>
                <div>
                  <h3 className="font-extrabold text-xs tracking-tight">JasJoking AI Assistant</h3>
                  <p className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wider">Mitra & Solusi Kampus</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50 text-xs">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl leading-relaxed shadow-sm text-left ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none font-medium'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 text-slate-400 p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input form */}
            <form onSubmit={handleSendChatMessage} className="p-2.5 bg-white border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tanya harga, deskripsi, atau rekomendasi..."
                className="flex-1 p-2 bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 rounded-xl text-xs"
              />
              <button
                type="submit"
                className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition cursor-pointer active:scale-95 flex items-center justify-center"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Bubble Trigger Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="flex items-center gap-2 p-3.5 bg-slate-900 border border-slate-800 text-white rounded-full hover:bg-slate-800 shadow-xl transition-all select-none active:scale-95 cursor-pointer"
        >
          <Sparkles className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
          <span className="text-xs font-bold tracking-tight pr-1">Tanya JasJoking AI</span>
        </button>
      </div>

      {/* Outer humble descriptive credit, avoiding low-tier boilerplate indicators */}
      <footer className="py-8 bg-slate-900 text-slate-500 border-t border-slate-800 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-bold text-slate-450 text-emerald-500">JasJoking Mahasiswa</p>
          <p className="text-[10px] text-slate-600">Terbuka untuk kolaborasi antrian tugas, buku teks bekas, desain visual, koding software, dan digitalisasi kantin.</p>
        </div>
      </footer>

      {/* Settings Modal Component */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={currentUser}
        onSave={(updatedUser) => {
          setCurrentUser(updatedUser);
          localStorage.setItem('mahasiswa_marketplace_user', JSON.stringify(updatedUser));
        }}
      />
    </div>
  );
}
