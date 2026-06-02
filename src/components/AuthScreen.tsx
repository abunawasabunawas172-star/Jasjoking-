import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { 
  ShieldCheck, 
  GraduationCap, 
  Store, 
  Mail, 
  Lock, 
  User as UserIcon, 
  LogIn, 
  Sparkles, 
  Phone, 
  CheckCircle, 
  Navigation, 
  ArrowRight, 
  ShieldAlert, 
  HelpCircle, 
  Eye, 
  EyeOff, 
  Smartphone, 
  ArrowLeft, 
  Copy, 
  Check, 
  MessageSquare,
  Menu,
  X,
  Sun,
  Moon,
  Info,
  BookOpen,
  ShoppingBag,
  FileText,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Play
} from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

type PortalType = 'buyer' | 'seller' | 'admin';
type ActiveViewType = 'beranda' | 'proposal' | 'auth' | 'peringatan';

export function AuthScreen({ onLoginSuccess, theme, onToggleTheme }: AuthScreenProps) {
  const [activeView, setActiveView] = useState<ActiveViewType>('beranda');
  const [menuOpen, setMenuOpen] = useState(false);
  const [portal, setPortal] = useState<PortalType>('buyer');
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<UserRole>('buyer');
  
  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  
  // Verification OTP tokens
  const [emailOtp, setEmailOtp] = useState('');
  const [whatsappOtp, setWhatsappOtp] = useState('');
  
  // States of OTP triggers
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [sendingWhatsappOtp, setSendingWhatsappOtp] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [whatsappOtpSent, setWhatsappOtpSent] = useState(false);

  // Cooldown timers (1 minute / 60 seconds)
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [whatsappCooldown, setWhatsappCooldown] = useState(0);

  // Error/Success feedbacks
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Phone simulation states (kept declared to avoid breaking references)
  const [simulatedEmails, setSimulatedEmails] = useState<Array<{ id: string; sender: string; subject: string; body: string; time: string; code: string; read: boolean }>>([]);
  const [simulatedWhatsapp, setSimulatedWhatsapp] = useState<Array<{ id: string; sender: string; message: string; time: string; code: string; read: boolean }>>([]);
  const [phoneTab, setPhoneTab] = useState<'gmail' | 'whatsapp'>('gmail');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedWhatsappId, setSelectedWhatsappId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Timer effect to decrement cooldowns
  useEffect(() => {
    let intervalId: any;
    if (emailCooldown > 0 || whatsappCooldown > 0) {
      intervalId = setInterval(() => {
        if (emailCooldown > 0) {
          setEmailCooldown((prev) => prev - 1);
        }
        if (whatsappCooldown > 0) {
          setWhatsappCooldown((prev) => prev - 1);
        }
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [emailCooldown, whatsappCooldown]);

  // Auto-sync role when portal changes
  useEffect(() => {
    if (portal === 'admin') {
      setRole('admin');
      setIsRegister(false); // Disallow registration for global admins
    } else {
      setRole(portal as UserRole);
    }
    setError('');
    setSuccess('');
  }, [portal]);

  // Force student register mode when register screen is enabled (Disabled to support Mitra Jasa registration)
  /* useEffect(() => {
    if (isRegister) {
      setPortal('buyer');
      setRole('buyer');
    }
  }, [isRegister]); */

  const handleSendOtp = async (targetType: 'email' | 'whatsapp') => {
    if (targetType === 'email' && emailCooldown > 0) return;
    if (targetType === 'whatsapp' && whatsappCooldown > 0) return;

    const targetValue = targetType === 'email' ? email : whatsappNumber;
    if (!targetValue) {
      setError(`Silakan masukkan ${targetType === 'email' ? 'alamat email Gmail' : 'nomor WhatsApp'} terlebih dahulu sebelum meminta kode verifikasi.`);
      return;
    }

    if (targetType === 'email' && !targetValue.toLowerCase().endsWith("@gmail.com")) {
      setError("Silakan masukkan email Gmail (@gmail.com) yang valid.");
      return;
    }

    if (targetType === 'email') {
      setSendingEmailOtp(true);
    } else {
      setSendingWhatsappOtp(true);
    }
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: targetValue.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengirimkan kode verifikasi.');
      }

      // Customize the message displayed on screen to show the code directly if not sent via real Gmail SMTP
      let customMessage = data.message;
      if (!data.realEmailSent) {
        if (targetType === 'email') {
          customMessage = `Kode OTP Gmail untuk Pendaftaran: 👉 [ ${data.code} ] 👈 (Gunakan kode ini untuk melanjutkan, atau masukkan kredensial SMTP_USER & SMTP_PASS di Settings -> Secrets kawan!)`;
        } else {
          customMessage = `Kode OTP WhatsApp untuk Pendaftaran: 👉 [ ${data.code} ] 👈 (Gunakan kode ini untuk melanjutkan verifikasi kawan!)`;
        }
      }
      setSuccess(customMessage);
      
      const currentTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      if (targetType === 'email') {
        setEmailCooldown(60);
        setEmailOtpSent(true);
        setEmailOtp(data.code); // Autofill OTP kawan for instant seamless testing!

        const newMail = {
          id: `em-${Date.now()}`,
          sender: 'Keamanan Akun JasJoking <security@jasjoking.mhs.umsu.ac.id>',
          subject: '🔐 VERIFIKASI AKUN PENGGUNA MAHASISWA & MITRA',
          body: `Halo mahasiswa/mitra pejuang JasJoking UMSU,\n\nTerima kasih telah mencoba mendaftar pada platform JasJoking Mahasiswa.\nBerikut adalah Kode OTP Rahasia Anda untuk menyelesaikan verifikasi email Gmail:\n\n👉 [ ${data.code} ] 👈\n\nMasukkan 4 angka di atas pada kolom verifikasi registrasi.\nJangan berikan kode ini kepada siapa pun!\n\nSalam Hangat,\nTim Sistem JasJoking Kampus`,
          time: currentTimeStr,
          code: data.code,
          read: false
        };
        setSimulatedEmails(prev => [newMail, ...prev]);
        setPhoneTab('gmail');
        setSelectedEmailId(newMail.id);
      } else {
        setWhatsappCooldown(60);
        setWhatsappOtpSent(true);
        setWhatsappOtp(data.code); // Autofill OTP kawan for instant seamless testing!

        const newChat = {
          id: `wa-${Date.now()}`,
          sender: 'JasJoking OTP Center (+62 811-1922-882)',
          message: `*🔐 KODE VERIFIKASI WHATSAPP*\n\nHalo Rekan Mitra! Terima kasih telah mendaftarkan nomor Anda.\n\nBerikut kode OTP transaksi pendaftaran WhatsApp Anda:\n\n👉 *${data.code}*\n\nBerlaku selama 5 menit. Masukkan angka ini pada form pendaftaran.\n\n_Pesan otomatis - UMSU Digitalization Team_`,
          time: currentTimeStr,
          code: data.code,
          read: false
        };
        setSimulatedWhatsapp(prev => [newChat, ...prev]);
        setPhoneTab('whatsapp');
        setSelectedWhatsappId(newChat.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingEmailOtp(false);
      setSendingWhatsappOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        if (password.length < 8) {
          throw new Error('Kata sandi pendaftaran minimal harus 8 karakter demi keamanan!');
        }
        if (password !== confirmPassword) {
          throw new Error('Konfirmasi kata sandi tidak cocok. Silakan ulangi dengan benar kawan!');
        }
        // Run Register request
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username, 
            email, 
            password, 
            role, 
            storeName, 
            address, 
            whatsappNumber, 
            emailOtp, 
            whatsappOtp 
          }),
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Terjadi kesalahan registrasi.');
        }

        setSuccess('Pendaftaran berhasil diverifikasi! Silakan gunakan email & kata sandi tersebut untuk masuk.');
        setIsRegister(false);
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setEmailOtp('');
        setWhatsappOtp('');
        setEmailOtpSent(false);
        setWhatsappOtpSent(false);
      } else {
        // Login flow
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: email, password }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Kredensial salah atau akun tidak ditemukan.');
        }

        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInstantLogin = async (demoEmail: string, demoPortal: 'buyer' | 'seller' | 'admin') => {
    setError('');
    setSuccess('');
    setLoading(true);
    setPortal(demoPortal);
    setEmail(demoEmail);
    setPassword('Admin123');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: demoEmail, password: 'Admin123' }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Kredensial demo tidak valid.');
      }
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Sleek Top Navigation Bar */}
      <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 px-4 sm:px-6 py-3.5 shadow-xs shrink-0 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-left cursor-pointer" onClick={() => setActiveView('beranda')}>
            <div className="p-2 bg-emerald-600 dark:bg-emerald-750 text-white rounded-xl">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-800 dark:text-slate-100 block">
                JasJoking Mahasiswa
              </span>
              <span className="hidden md:block text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">
                Platform Pemesanan Jasa & Freelance Mahasiswa Kampus UMSU
              </span>
              <span className="block md:hidden text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                UMSU Jl. Kapten Mukhtar Basri
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Theme Toggle in Header for Instant Access */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer flex items-center justify-center shadow-xs"
              title="Ganti Tema"
            >
              {theme === 'light' ? <Moon className="h-4.5 w-4.5 text-slate-600" /> : <Sun className="h-4.5 w-4.5 text-amber-500" />}
            </button>

            {/* UPGRADED burger menu button: REMOVED TEXT! ONLY THE ICON BUTTON AS REQUESTED kawan */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer flex items-center justify-center shadow-xs"
              id="menu-trigger-btn"
              title="Buka Menu Utama"
            >
              <Menu className="h-4.5 w-4.5 text-emerald-500" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-6 items-start">
        
        {/* LEFT / CENTER VIEW DYNAMIC AREA based on activeView */}
        <div className="flex-1 w-full space-y-6">
          
          {/* VIEW: BERANDA (Default Landing showing usage guidelines & gorgeous flowchart) */}
          {activeView === 'beranda' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-250">
              
              {/* Cover Banner Hero */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-emerald-950 text-white relative overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-65 pointer-events-none" />
                <div className="relative z-10 space-y-2.5 max-w-2xl text-left">
                  <span className="inline-block text-[9px] font-black tracking-widest text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full uppercase border border-emerald-500/30">
                    KAMPUS FREE-ECONOMY DIGITAL PORTAL
                  </span>
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-none text-white">
                    JasJoking <span className="text-emerald-400">Mahasiswa</span>
                  </h1>
                  <p className="text-slate-350 text-xs sm:text-sm font-medium leading-relaxed font-sans">
                    Layanan digitalisasi transaksi mandiri & pemesanan jasa freelance kreatif/akademis yang ditawarkan oleh mahasiswa kreatif Kampus Utama Universitas Muhammadiyah Sumatera Utara (UMSU) Jl. Kapten Mukhtar Basri.
                  </p>
                  
                  <div className="pt-2 flex flex-wrap gap-2.5">
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono text-slate-300">#DesainGrafis</span>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono text-slate-300">#EditVideo</span>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono text-slate-300">#FormatSkripsi</span>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono text-slate-300">#BimbinganCoding</span>
                  </div>
                </div>
              </div>

              {/* FLOWCHART ARAHAN PENGGUNAAN APLIKASI (Visually jaw-dropping vector roadmap) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-left">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-lg">
                    <Navigation className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
                      Flowchart Berjalan / Alur Sistem JasJoking
                    </h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Ikuti alur prosedural berikut untuk kelancaran transaksi jasa mahasiswa kawan.
                    </p>
                  </div>
                </div>

                {/* RoadMap Layout Timeline nodes */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 relative">
                  
                  {/* Flow Steps 1 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-150 dark:border-slate-800 relative z-10 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        01
                      </div>
                      <h3 className="font-extrabold text-xs text-slate-800 dark:text-emerald-400 uppercase tracking-wider">
                        PILIH PORTAL
                      </h3>
                      <p className="text-[10.5px] font-sans text-slate-600 dark:text-slate-400 leading-relaxed">
                        Klik tombol menu (garis 3) dari sidebar lalu tentukan peran: <b>Mahasiswa</b> atau <b>Admin Jasa</b>.
                      </p>
                    </div>
                    <span className="block text-[8px] font-bold text-slate-400 mt-3 font-mono">STEP 1</span>
                  </div>

                  {/* Flow Steps 2 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-150 dark:border-slate-800 relative z-10 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        02
                      </div>
                      <h3 className="font-extrabold text-xs text-slate-800 dark:text-teal-400 uppercase tracking-wider">
                        OTP SMS/GMAIL
                      </h3>
                      <p className="text-[10.5px] font-sans text-slate-600 dark:text-slate-400 leading-relaxed">
                        Daftar akun memakai Gmail & WhatsApp. Ambil OTP via simulasi telepon di bagian bawah untuk aktivasi.
                      </p>
                    </div>
                    <span className="block text-[8px] font-bold text-slate-400 mt-3 font-mono">STEP 2</span>
                  </div>

                  {/* Flow Steps 3 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-150 dark:border-slate-800 relative z-10 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        03
                      </div>
                      <h3 className="font-extrabold text-xs text-slate-800 dark:text-indigo-400 uppercase tracking-wider">
                        EKSPLOR LAYANAN
                      </h3>
                      <p className="text-[10.5px] font-sans text-slate-600 dark:text-slate-400 leading-relaxed">
                        Masuk dashboard dan cari jasa freelance mahasiswa: pembuatan desain poster, PPT, coding, skripsi, dsb.
                      </p>
                    </div>
                    <span className="block text-[8px] font-bold text-slate-400 mt-3 font-mono">STEP 3</span>
                  </div>

                  {/* Flow Steps 4 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-150 dark:border-slate-800 relative z-10 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        04
                      </div>
                      <h3 className="font-extrabold text-xs text-slate-800 dark:text-amber-400 uppercase tracking-wider">
                        QRIS OTOMATIS
                      </h3>
                      <p className="text-[10.5px] font-sans text-slate-600 dark:text-slate-400 leading-relaxed">
                        Bayar via simulasi QRIS lunas instan sistem. Pencatatan transaksi dan konfirmasi instan berlangsung otomatis tanpa ribet kawan.
                      </p>
                    </div>
                    <span className="block text-[8px] font-bold text-slate-400 mt-3 font-mono">STEP 4</span>
                  </div>

                  {/* Flow Steps 5 */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-150 dark:border-slate-800 relative z-10 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        05
                      </div>
                      <h3 className="font-extrabold text-xs text-slate-800 dark:text-rose-400 uppercase tracking-wider">
                        LIVE CHAT PANEL
                      </h3>
                      <p className="text-[10.5px] font-sans text-slate-600 dark:text-slate-400 leading-relaxed">
                        Mahasiswa & penyedia jasa berdiskusia langsung di ruang chat terpantau owner admin guna menangkal scam.
                      </p>
                    </div>
                    <span className="block text-[8px] font-bold text-slate-400 mt-3 font-mono">STEP 5</span>
                  </div>

                </div>

                {/* Call-to-Action Card for Navigation */}
                <div className="mt-6 p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl border border-slate-800 shadow-lg space-y-5 text-left">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shrink-0 mt-0.5">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-white">Sudah Siap Memulai Transaksi kawan?</h4>
                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                        Pilih jenis portal akses di bawah ini secara instan kawan. Tanpa perlu repot mencari di menu samping kanan, klik langsung untuk masuk/daftar!
                      </p>
                    </div>
                  </div>
                  
                  {/* Grid of Direct and Logical Portal Entry Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* Buyer portal button */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('auth');
                        setIsRegister(false);
                        setPortal('buyer');
                        setRole('buyer');
                        setError('');
                        setSuccess('');
                      }}
                      className="p-3.5 bg-emerald-600 hover:bg-emerald-555 text-white rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition duration-150 active:scale-95 shadow-sm cursor-pointer border border-emerald-500/30"
                    >
                      <GraduationCap className="h-5 w-5 text-emerald-100" />
                      <div className="text-center">
                        <span className="block font-black text-xs">🎓 Pengguna Mahasiswa</span>
                        <span className="block text-[9px] text-emerald-100/80 font-medium">Cari &amp; Pesan Jasa Kuliah</span>
                      </div>
                    </button>

                    {/* Seller portal button */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('auth');
                        setIsRegister(false);
                        setPortal('seller');
                        setRole('seller');
                        setError('');
                        setSuccess('');
                      }}
                      className="p-3.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition duration-150 active:scale-95 shadow-sm cursor-pointer border border-indigo-500/30"
                    >
                      <Store className="h-5 w-5 text-indigo-200" />
                      <div className="text-center">
                        <span className="block font-black text-xs">🏪 Admin Jasa/Tempat</span>
                        <span className="block text-[9px] text-indigo-150/80 font-medium font-sans">Kelola Jasa &amp; Order</span>
                      </div>
                    </button>

                    {/* Admin portal button */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('auth');
                        setIsRegister(false);
                        setPortal('admin');
                        setRole('admin');
                        setError('');
                        setSuccess('');
                      }}
                      className="p-3.5 bg-slate-800 hover:bg-slate-750 text-slate-100 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition duration-150 active:scale-95 shadow-xs cursor-pointer border border-slate-700"
                    >
                      <ShieldCheck className="h-5 w-5 text-amber-400" />
                      <div className="text-center">
                        <span className="block font-black text-xs">🛡️ Admin Utama</span>
                        <span className="block text-[9px] text-slate-400 font-medium font-sans">Sistem Database &amp; Audit</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* HOW TO USE DETAILS ACCORDING TO ROLE REQUIREMENT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Rules for Mahasiswa */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-left">
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    ROLE: MAHASISWA / KONSUMEN
                  </span>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-2.5 mb-2 flex items-center gap-1.5">
                    <GraduationCap className="h-4.5 w-4.5 text-emerald-500" />
                    Cara Penggunaan / Pembelian Jasa
                  </h3>
                  <ol className="list-decimal pl-4 text-xs text-slate-600 dark:text-slate-400 space-y-2 font-sans leading-relaxed">
                    <li>Buka menu samping kanan, pilih <b>Pengguna Mahasiswa</b>.</li>
                    <li>Lakukan pendaftaran akun jika belum punya, verifikasi OTP WhatsApp & Email.</li>
                    <li>Atau login dengan user demo default (misal mahasiswa: <b>aputrawan666@gmail.com</b>, sandi <b>Admin123</b>).</li>
                    <li>Telusuri jasa edit video reels, penulisan slide presentasi, bimbingan coding, atau fotografer wisuda.</li>
                    <li>Tentukan staf ahli yang diinginkan, lakukan simulasi bayar lewat QRIS otomatis.</li>
                    <li>Koordinasi file final lewat panel <b>Live Chat</b> yang interaktif.</li>
                  </ol>
                </div>

                {/* Rules for Admin Jasa */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-left">
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    ROLE: ADMIN JASA / TEMPAT (FREELANCER)
                  </span>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-2.5 mb-2 flex items-center gap-1.5">
                    <Store className="h-4.5 w-4.5 text-indigo-500" />
                    Cara Kelola Penawaran & Layanan Jasa
                  </h3>
                  <ol className="list-decimal pl-4 text-xs text-slate-600 dark:text-slate-400 space-y-2 font-sans leading-relaxed">
                    <li>Pilih <b>Admin Jasa/Tempat</b> dari menu, login dengan akun jasa yang sudah didaftarkan.</li>
                    <li>Atau mendaftarkan sebagai Mitra baru (mitra langsung mendapatkan ruang etalase jasa).</li>
                    <li>Posting foto contoh portofolio Anda, tetapkan kategori jualan serta rentang harga.</li>
                    <li>Terima chat notifikasi otomatis ketika ada pesanan reservasi freelance dari mahasiswa lain.</li>
                    <li>Update status reservasi secara langsung: <i>Pending</i> (Menunggu) &rarr; <i>Diproses</i> &rarr; <i>Selesai</i> kawan.</li>
                    <li>Kirimkan bukti pengerjaan lewat room chat demi menjaga reputasi bintang bintang Anda.</li>
                  </ol>
                </div>

              </div>

            </div>
          )}

          {/* VIEW: PROPOSAL PROYEK ACADEMIC SHEET PRECISE DETAIL (Jaw dropping formal PDF mockup) */}
          {activeView === 'proposal' && (
            <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-left font-serif space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-250">
              
              {/* Proposal Document Header */}
              <div className="pb-6 border-b-2 border-slate-800 dark:border-slate-700 font-sans">
                <span className="text-[10px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                  DOKUMEN PROPOSAL AKADEMIS PROJEK MAHASISWA
                </span>
                <h1 className="text-xl sm:text-2xl font-black mt-3 text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  JasJoking: Platform Pemesanan Jasa & Freelance Mahasiswa Kampus UMSU
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-sans">
                  Studi Kasus: Optimalisasi Ekonomi Kreatif Pengguna Terdaftar Sekitar Kampus Utama Jl. Kapten Mukhtar Basri Medan.
                </p>
                
                {/* Structured Metadata Box */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl text-[10px] text-slate-600 dark:text-slate-300 font-sans border border-slate-150 dark:border-slate-800 leading-relaxed font-bold">
                  <div>
                    <span className="block text-slate-400 text-[9px] uppercase">Dosen Penguji</span>
                    <span className="text-slate-800 dark:text-slate-100 font-black">Tim Penguji TI UMSU</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[9px] uppercase">Rancangan Aplikasi</span>
                    <span className="text-slate-800 dark:text-slate-100 font-black">Freelance Ecosystem portal</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[9px] uppercase">Metode Verifikasi</span>
                    <span className="text-slate-800 dark:text-slate-100 font-black">Dual-Auth WhatsApp & Gmail OTP</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[9px] uppercase">Metode Pembayaran</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">Virtual QRIS Instant Auto-Clear</span>
                  </div>
                </div>
              </div>

              {/* Proposal Body (Scrollable Elegant Typewriter Text) */}
              <div className="space-y-6 text-xs text-slate-700 dark:text-slate-350 leading-relaxed font-sans">
                
                {/* Abstrak */}
                <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border-l-4 border-slate-800 dark:border-slate-605 italic">
                  <h4 className="font-extrabold not-italic text-xs text-slate-800 dark:text-slate-200">Abstrak Projek (Executive Summary)</h4>
                  <p className="mt-1">
                    Rancangan sistem ini bertujuan untuk membangun portal transaksi mandiri yang mempertemukan mahasiswa UMSU yang memiliki talenta di bidang kepenulisan skripsi, desain poster, editing video, coding tugas, dan fotografi dengan para pencari jasa di lingkungan Kampus Utama. Dengan mengesampingkan fitur yang tidak produktif dan berfokus pada ekonomi kreatif mahasiswa, JasJoking dirancang guna menyajikan pengalaman booking modern, di mana setiap order dikunci melalui autentikasi OTP ganda WhatsApp dan Gmail, didukung pembayaran simulator QRIS instan dan monitoring live-chat terpusat oleh pemilik.
                  </p>
                </div>

                {/* Bab 1 */}
                <div className="space-y-2">
                  <h3 className="font-black text-sm text-slate-850 dark:text-slate-100 uppercase border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5 font-sans">
                    <FileText className="h-4 w-4 text-emerald-500" />
                    Bab I: Latar Belakang & Ruang Lingkup Sistem (Refokus Projek)
                  </h3>
                  <p>
                    Sebelumnya, banyak aplikasi di lingkungan perkuliahan mencoba menyajikan terlalu banyak kategori bisnis non-akademis (seperti makanan/minum UMKM umum, saringan katering, joki titip tugas kuliah, atau cash-splitter AI yang kompleks). Akibat sistem yang terlalu luas, dosen kerap menganggap pengerjaan projek tidak fokus dan kurang realistis. 
                  </p>
                  <p>
                    Projek ini merevolusi JasJoking dengan berfokus penuh pada: <strong>Platform Pemesanan Jasa Freelance Mahasiswa Kampus</strong>. Fokus ini mengeliminasi fitur-fitur yang tidak sensitif terhadap akademik dan menitikberatkan pada perputaran sirkular talenta mahasiswa. Dengan demikian, kejelasan alur pengiriman dokumen tugas, kepatuhan pengerjaan tepat waktu oleh mahasiswa penyedia jasa (staf), dan keselarasan rating bintang dapat teruji secara empiris kawan.
                  </p>
                </div>

                {/* Bab 2 */}
                <div className="space-y-2">
                  <h3 className="font-black text-sm text-slate-850 dark:text-slate-100 uppercase border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5 font-sans">
                    <FileText className="h-4 w-4 text-emerald-500" />
                    Bab II: Kegunaan Sistem & Manfaat Untuk Mahasiswa
                  </h3>
                  <p>
                    Konsep JasJoking menyajikan aneka manfaat strategis berjenjang bagi sivitas akademika Universitas Muhammadiyah Sumatera Utara sebagai berikut:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-650 dark:text-slate-400">
                    <li><strong>Meningkatkan Kemandirian Finansial:</strong> Mahasiswa bertalenta dapat merintis usaha freelancer mandiri bermodalkan portofolio poster, slides, coding, dan dokumentasi.</li>
                    <li><strong>Transparansi Transaksi Kuliah:</strong> Pembelian dokumen jilid dan skripsi terdata secara otomatis lewat QRIS simulator ketersediaan instan di sistem.</li>
                    <li><strong>Keamanan Obrolan:</strong> Mahasiswa dapat mengomunikasikan instruksi tugas dan materi file secara terintegrasi lewat live chat, menghindarkan kebocoran data privasi ke media chat luar.</li>
                  </ul>
                </div>

                {/* Bab 3 */}
                <div className="space-y-2">
                  <h3 className="font-black text-sm text-slate-850 dark:text-slate-100 uppercase border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5 font-sans">
                    <FileText className="h-4 w-4 text-emerald-500" />
                    Bab III: Rancangan Fitur Utama Transaksi & Arsitektur Keamanan
                  </h3>
                  <p>
                    Aplikasi JasJoking ditenagai infrastruktur pengelolan data real-time, meliputi modul fungsional:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-slate-650 dark:text-slate-400">
                    <li><strong>Modul Reservasi Detail (Booking Cart):</strong> Konsumen dapat menambahkan jasa tertentu pada keranjang transaksi, menjabarkan detail kebutuhan file, menunjuk staf pengerjaan khusus dari agen, dan mengupload bukti rincian order.</li>
                    <li><strong>Modul Verifikasi Real OTP:</strong> Menangkal spam pemesanan palsu (faktur fiktif) kawan dengan mengintegrasikan token numerik acak baik via Google Gmail SMTP maupun via robot pengiriman otomatis WhatsApp API.</li>
                    <li><strong>Simulator QRIS Terotomatisasi (Instant Payment Cleared):</strong> Setiap transaksi checkout langsung memunculkan grafis kode batang dinamis yang mendeteksi pelunasan real-time.</li>
                    <li><strong>Monitoring Percakapan (Mirroring Panel):</strong> Admin Pemilik sistem berhak melacak loging dan jalannya tawar-menawar jasa, meminimalkan modus tindakan penipuan akademis.</li>
                  </ol>
                </div>

                {/* Bab 4 */}
                <div className="space-y-2">
                  <h3 className="font-black text-sm text-slate-850 dark:text-slate-100 uppercase border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5 font-sans">
                    <FileText className="h-4 w-4 text-emerald-500" />
                    Bab IV: Produk Jasa Freelance Mahasiswa Kampus Realistis
                  </h3>
                  <p>
                    Sebagai pengganti menu makanan sayuran yang kurang realistis untuk platform karir akademik, JasJoking meluncurkan 6 (enam) rintisan etalase jasa mahasiswa andalan:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-emerald-400">1. Jasa Desain Poster & Event</h4>
                      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Layanan pembuatan poster seminar harian, banner organisasi IMM/BEM/HMJ UMSU, dan pamflet lomba estetik kilat.</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-emerald-400">2. Jasa Edit Video Reels & TikTok</h4>
                      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Penyuntingan video sinematik wisuda, profil promo ukm, audio mixing, subtitle dinamis, kawan.</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-emerald-400">3. Pembuatan Slide PPT Skripsi</h4>
                      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Penyusunan slide Canva dan PPT Sidang Meja Hijau estetik agar lancar meyakinkan dosen penguji.</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-emerald-400">4. Pengetikan Skripsi & Rapikan Format</h4>
                      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Merapikan dokumen skripsi sesuai Buku Panduan UMSU, menyertakan penulisan daftar isi otomatis.</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-emerald-400">5. Bimbingan Coding IT & Logis</h4>
                      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Tutor pemrograman React, PHP Laravel, Java, C++ untuk mahasiswa ilmu komputer.</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-emerald-400">6. Jasa Fotografi Wisuda & Sidang</h4>
                      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Sesi foto outdoor wisuda atau sidang meja hijau mahasiswa, file premium teredit cepat.</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Cover Footer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-sans">
                <span>Diajukan & Disahkan oleh Pengembang UMSU &copy; 2026</span>
                <button
                  type="button"
                  onClick={() => setActiveView('beranda')}
                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  Kembali ke Beranda &rarr;
                </button>
              </div>

            </div>
          )}

          {/* VIEW: ATURAN KEAMANAN & WARNINGS (Detailing the dual OTP security justification) */}
          {activeView === 'peringatan' && (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-left space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-250">
              
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-850">
                <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Sistem Pencegahan Fraud & Pesanan Palsu (Anti Fake-Order)
                  </h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Arsitektur pengamanan transaksi kampus terintegrasi demi kenyamanan bersama.
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-slate-650 dark:text-slate-350">
                
                <p>
                  Mengapa platform <strong>JasJoking</strong> menerapkan verifikasi identitas yang ketat berupa <strong>Verifikasi OTP WhatsApp DAN Email Gmail Ganda</strong> saat melakukan pendaftaran akun baru kawan?
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 text-left space-y-2">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                      <Mail className="h-4 w-4 text-emerald-500" />
                      1. Verifikasi Email Gmail
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                      Menjamin bahwa pengguna yang terdaftar adalah mahasiswa atau civitas akademika aktif kawan, karena email digunakan sebagai identifikasi akun primer saat login masuk sistem.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 text-left space-y-2">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                      <Phone className="h-4 w-4 text-indigo-500" />
                      2. Verifikasi WhatsApp
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                      Mencegah aksi pendaftaran massal memakai robot (spamming) dan menekan peluang pesanan fiktif. Nomor WhatsApp langsung diintegrasikan dengan tombol kontak pembuat untuk komunikasi darurat.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-800 dark:text-rose-400 border border-rose-500/20 space-y-2 text-left font-sans">
                  <h4 className="font-extrabold text-xs uppercase text-rose-700 dark:text-rose-300">Pemberitahuan Penyadapan Chat (Mirroring System)</h4>
                  <p className="text-[11px]">
                    Sesuai kesepakatan lisensi, seluruh riwayat percakapan didalam aplikasi bersifat <strong>transparan</strong> dan dipantau kawan. Admin Pemilik memiliki dashboard sadap (mirroring) guna melacak log obrolan antara Mahasiswa (Pembeli) dengan Admin Jasa (Penyedia) agar tidak terjadi pembayaran di luar platform yang berpotensi penipuan.
                  </p>
                  <p className="text-[11px]">
                    Tindakan berupa penginputan token saringan palsu, provokasi, atau transaksi terlarang akan berujung pemblokiran permanen alamat IP dari jaringan server Kampus UMSU.
                  </p>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-right">
                <button
                  type="button"
                  onClick={() => setActiveView('beranda')}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-805 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-100 px-5 py-2 rounded-xl text-xs font-black transition cursor-pointer"
                >
                  Paham &amp; Kembali ke Beranda
                </button>
              </div>

            </div>
          )}

          {/* VIEW: AUTH FORM DISPLAY (Only renders when parent triggers login/daftar) */}
          {activeView === 'auth' && (
            <div className={`w-full ${isRegister ? 'max-w-lg' : 'max-w-md'} mx-auto transition-all duration-300 animate-in fade-in zoom-in-95 duration-200`}>
              
              {/* Card Container */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-left flex flex-col relative animate-fade-in">
                
                {/* Header info bar */}
                <div className="p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <span className="text-[8px] font-black uppercase text-slate-400 select-none pb-0.5 block tracking-widest">
                        JasJoking Mahasiswa kawan
                      </span>
                      <h1 className="text-xl font-extrabold tracking-tight text-white mb-0.5">
                        {isRegister ? 'Daftar Akun Baru' : 'Masuk ke Portal'}
                      </h1>
                      <p className="text-slate-300 text-[10px] max-w-sm font-sans font-medium leading-relaxed">
                        {isRegister ? 'Isi form di bawah untuk registrasi akun secara instan kawan.' : 'Silakan masukkan kredensial terdaftar UMSU'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView('beranda')}
                      className="p-1 px-2.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded text-[9px] uppercase tracking-wider font-extrabold font-mono transition flex items-center gap-1 cursor-pointer"
                      title="Kembali ke Beranda"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Mundur
                    </button>
                  </div>
                </div>

                {/* Sub Portal Switcher (Hidden during registration - default buyer) */}
                {!isRegister && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 tracking-wider uppercase select-none font-sans">
                      SEGMEN PORTAL:
                    </span>
                    <div className="flex gap-1.5 p-1 bg-slate-200 dark:bg-slate-800 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setPortal('buyer');
                          setRole('buyer');
                          setError('');
                          setSuccess('');
                        }}
                        className={`py-1 px-3 rounded-md text-[10px] font-bold transition duration-200 cursor-pointer ${
                          portal === 'buyer'
                            ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        🎓 Mahasiswa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPortal('seller');
                          setRole('seller');
                          setError('');
                          setSuccess('');
                        }}
                        className={`py-1 px-3 rounded-md text-[10px] font-bold transition duration-200 cursor-pointer ${
                          portal === 'seller'
                            ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        🏪 Mitra Jasa
                      </button>
                    </div>
                  </div>
                )}

                {/* Form Wrapper */}
                <div className="p-6 space-y-4 font-sans">
                  
                  {/* Small Context Box */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 border border-slate-150 dark:border-slate-800">
                    {portal === 'buyer' && !isRegister && (
                      <p>🎓 <strong>Pengguna Mahasiswa:</strong> Hubungi tim freelancer desain poster, format skripsi Word, edit reels wisuda, duka bimbingan coding di Kampus UMSU.</p>
                    )}
                    {portal === 'seller' && (
                      <p>🏪 <strong>Portal Admin Jasa:</strong> Kelola portofolio kreasi, atur estimasi wisuda, respons pesanan order via live chat untuk reputasi kawan.</p>
                    )}
                    {portal === 'admin' && (
                      <p>🔑 <strong>Akses Admin Pemilih:</strong> Gunakan kredensial monitoring sah kawan guna menyadap obrolan terpusat.</p>
                    )}
                    {isRegister && (
                      <p>📝 <strong>Daftar Baru:</strong> Daftarkan akun baru Anda sebagai mahasiswa/mitra jasa untuk mulai bertransaksi di platform JasJoking kawan.</p>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 text-rose-700 dark:text-rose-400 text-xs rounded-r-md font-bold text-left animate-shake leading-snug font-sans">
                      ⚠️ {error}
                    </div>
                  )}
                  {success && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 text-emerald-750 dark:text-emerald-450 text-xs rounded-r-md font-bold text-left leading-snug font-sans">
                      🎉 {success}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4 font-sans">
                    
                    {/* Role Selection inside registration form */}
                    {isRegister && (
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">
                          🔑 TIPE KEANGGOTAAN PORTAL
                        </label>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setPortal('buyer');
                              setRole('buyer');
                            }}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
                              role === 'buyer'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-extrabold shadow-sm dark:bg-emerald-950/30 dark:text-emerald-400'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <span>🎓 Mahasiswa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPortal('seller');
                              setRole('seller');
                            }}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
                              role === 'seller'
                                ? 'bg-[#075e54]/10 text-[#075e54] border-emerald-500 font-extrabold shadow-sm dark:bg-emerald-950/20 dark:text-emerald-400'
                                : 'bg-white dark:bg-slate-800 text-slate-650 dark:text-slate-350 border-slate-205 dark:border-slate-800'
                            }`}
                          >
                            <span>🏪 Mitra Jasa</span>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {isRegister && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Username Unik Kampus</label>
                        <div className="relative text-xs">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                            <UserIcon className="h-4 w-4" />
                          </span>
                          <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Contoh: andipradana"
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/45 transition"
                          />
                        </div>
                      </div>
                    )}

                    {/* Email Field - Standard Single Field */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-705 dark:text-slate-300 mb-1">
                        {isRegister ? 'Alamat Email Gmail' : 'Email / Login Identifier'}
                      </label>
                      <div className="relative text-xs">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                          <Mail className="h-4 w-4" />
                        </span>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Contoh: andipradana@gmail.com"
                          className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/45 transition"
                        />
                      </div>
                    </div>

                    {/* Conditional Merchant Fields if role is seller */}
                    {isRegister && role === 'seller' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs animate-in slide-in-from-top-1 duration-150">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wide">💼 NAMA TOKO JASA / MITRA</label>
                          <input
                            type="text"
                            required
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            placeholder="Contoh: Pratama Copy & Poster"
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/45"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wide">📍 LOKASI STAND DI KAMPUS</label>
                          <input
                            type="text"
                            required
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Contoh: Kantin Gd. C Kampus UMSU"
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/45 transition"
                          />
                        </div>
                      </div>
                    )}

                    {/* Kata Sandi Password */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Kata Sandi (Min 8 karakter)</label>
                      </div>
                      <div className="relative text-xs">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                          <Lock className="h-4 w-4" />
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/45 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-355 focus:outline-none cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {isRegister && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Konfirmasi Kata Sandi</label>
                        <div className="relative text-xs">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                            <Lock className="h-4 w-4" />
                          </span>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Ulangi kata sandi kawan"
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/45 transition"
                          />
                        </div>
                      </div>
                    )}

                    {/* WhatsApp fields for registration */}
                    {isRegister && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Nomor WhatsApp Aktif kawan
                        </label>
                        <div className="relative text-xs">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500 font-bold font-sans">
                            +62
                          </span>
                          <input
                            type="tel"
                            required
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="812xxxxxxxx"
                            className="w-full pl-12 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/45 transition"
                          />
                        </div>
                      </div>
                    )}

                    {/* SUBMIT BUTTON */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold transition cursor-pointer select-none active:scale-98 shadow-md flex items-center justify-center gap-1.5"
                    >
                      {loading ? (
                        <span>MENGHUBUNGKAN...</span>
                      ) : (
                        <>
                          <LogIn className="h-4.5 w-4.5" />
                          <span>{isRegister ? 'VERIFIKASI & DAFTARKAN SEKARANG' : 'MASUK SEKARANG'}</span>
                        </>
                      )}
                    </button>

                  </form>

                  {/* BOTTOM RE-DIRECT SIGNUP/SIGNIN PATHS */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-850 text-center">
                    {isRegister ? (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Sudah memiliki akun terdaftar?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setIsRegister(false);
                            setError('');
                            setSuccess('');
                          }}
                          className="font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                        >
                          Masuk Portal kawan
                        </button>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Belum punya akun Portal? Khusus Mahasiswa silakan{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setIsRegister(true);
                            setPortal('buyer');
                            setRole('buyer');
                            setError('');
                            setSuccess('');
                          }}
                          className="font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                        >
                          Daftar Akun Baru
                        </button>
                      </p>
                    )}
                  </div>

                  {/* Simple Defaults Preview Box for Fast Reviewing */}
                  {!isRegister && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-[10px] text-slate-650 dark:text-slate-400 leading-normal border border-dashed border-slate-200 dark:border-slate-800 space-y-2.5">
                      <span className="font-extrabold uppercase text-slate-400 dark:text-slate-500 block text-[9px] tracking-wider text-center">
                        ⚡ AKUN DEMO INSTAN (KLIK UNTUK MASUK TANPA KETIK)
                      </span>
                      
                      <div className="grid grid-cols-1 gap-2">
                        {/* Instant buyer */}
                        <button
                          type="button"
                          onClick={() => handleInstantLogin('aputrawan666@gmail.com', 'buyer')}
                          className="w-full py-1.5 px-3 bg-white hover:bg-emerald-50 dark:bg-slate-900 dark:hover:bg-emerald-950/20 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 rounded-xl transition text-left cursor-pointer flex items-center justify-between text-[10px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold block text-slate-850 dark:text-slate-200 text-left">
                              🎓 Pengguna Mahasiswa
                            </span>
                          </div>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold shrink-0">aputrawan &rarr;</span>
                        </button>

                        {/* Instant seller */}
                        <button
                          type="button"
                          onClick={() => handleInstantLogin('hafizalrasyid8@gmail.com', 'seller')}
                          className="w-full py-1.5 px-3 bg-white hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-indigo-950/20 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 rounded-xl transition text-left cursor-pointer flex items-center justify-between text-[10px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold block text-slate-850 dark:text-slate-200 text-left">
                              🏪 Admin Jasa / Tempat (Hafiz)
                            </span>
                          </div>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold shrink-0 font-sans">hafizalrasyid &rarr;</span>
                        </button>

                        {/* Instant admin */}
                        <button
                          type="button"
                          onClick={() => handleInstantLogin('abunawasabunawas172@gmail.com', 'admin')}
                          className="w-full py-1.5 px-3 bg-white hover:bg-amber-50 dark:bg-slate-900 dark:hover:bg-amber-950/20 border border-slate-200 dark:border-slate-800 hover:border-amber-300 rounded-xl transition text-left cursor-pointer flex items-center justify-between text-[10px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold block text-slate-850 dark:text-slate-200 text-left">
                              🛡️ Admin Utama (Abunawas)
                            </span>
                          </div>
                          <span className="font-mono text-amber-600 dark:text-amber-500 font-extrabold shrink-0">abunawas &rarr;</span>
                        </button>
                      </div>

                      <p className="text-[9px] text-slate-400 dark:text-slate-505 font-medium text-center mt-1">
                        Sandi demo default untuk semua akun di atas adalah <strong className="font-mono">Admin123</strong>
                      </p>
                    </div>
                  )}

                </div>

              </div>
            </div>
          )}

        </div>

      </div>

      {/* ☰ Sleek Sliding Side Drawer (Burger Menu Content Upgrade) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end font-sans">
          {/* Backdrop blur overlay */}
          <div 
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity cursor-pointer duration-200 animate-in fade-in" 
          />
          
          {/* Main Sidebar drawer card */}
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl relative z-10 flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-205 text-left">
            {/* Drawer Header */}
            <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Menu className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-white">Menu Utama Sistem</h3>
                  <p className="text-[9px] text-slate-350 font-medium uppercase font-mono">JasJoking Freelance Kampus</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-350 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Drawer Body (Scrollable content) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              
              {/* Theme Settings Mode Malam / Siang (Dual Explicit buttons for clear readability kawan) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-left">
                <span className="block text-[9px] font-black text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                  🌓 PILIH TEMA TAMPILAN (SIANG / MALAM)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (theme === 'dark' && onToggleTheme) onToggleTheme();
                    }}
                    className={`flex-1 py-1.5 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      theme === 'light'
                        ? 'border-emerald-605 bg-emerald-50 text-emerald-800 font-extrabold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>Siang ({theme === 'light' ? 'Aktif' : 'Pilih'})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (theme === 'light' && onToggleTheme) onToggleTheme();
                    }}
                    className={`flex-1 py-1.5 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      theme === 'dark'
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400 font-extrabold shadow-xs'
                        : 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <Moon className="h-4 w-4 text-indigo-400" />
                    <span>Malam ({theme === 'dark' ? 'Aktif' : 'Pilih'})</span>
                  </button>
                </div>
              </div>

              {/* Navigation Links inside Burger Menu (Includes direct trigger to logins kawan) */}
              <div className="space-y-2.5 text-left">
                <span className="block text-[9px] font-black text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                  📌 NAVIGASI INFORMASI PROJEK
                </span>
                
                <div className="space-y-1.5">
                  {/* Beranda Page Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('beranda');
                      setMenuOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left transition text-xs font-bold flex items-center gap-2.5 cursor-pointer ${
                      activeView === 'beranda'
                        ? 'border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-800 dark:text-emerald-400'
                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <ShoppingBag className="h-4 w-4 text-emerald-500" />
                    <span>📖 Cara Penggunaan &amp; Flowchart</span>
                  </button>

                  {/* Academic Proposal Page Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('proposal');
                      setMenuOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left transition text-xs font-bold flex items-center gap-2.5 cursor-pointer ${
                      activeView === 'proposal'
                        ? 'border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-800 dark:text-emerald-400'
                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <FileText className="h-4 w-4 text-indigo-500" />
                    <span>📄 Proposal Dokumen Projek</span>
                  </button>

                  {/* Warning Security page Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('peringatan');
                      setMenuOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left transition text-xs font-bold flex items-center gap-2.5 cursor-pointer ${
                      activeView === 'peringatan'
                        ? 'border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-800 dark:text-emerald-400'
                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4 text-rose-500" />
                    <span>🛡️ Kebijakan Safe Campus OTP</span>
                  </button>
                </div>
              </div>

              {/* Direct Portal Switchers in Burger (Will switch view to Auth form, set role, and close drawer instantly!) */}
              <div className="space-y-3">
                <span className="block text-[9px] font-black text-slate-500 dark:text-slate-400 tracking-wider uppercase select-none">
                  🔑 MASUK / DAFTAR AKUN PORTAL
                </span>
                <div className="space-y-2">
                  
                  {/* Student portal direct gate */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('auth');
                      setIsRegister(false);
                      setPortal('buyer');
                      setRole('buyer');
                      setMenuOpen(false);
                      setError('');
                      setSuccess('');
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      activeView === 'auth' && portal === 'buyer' && !isRegister
                        ? 'border-emerald-500/60 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-900 dark:text-emerald-400 font-extrabold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className="h-4 w-4 text-emerald-500" />
                      <div className="text-xs text-left">
                        <span className="block font-black text-slate-800 dark:text-slate-100">🎓 Pengguna Mahasiswa (Pencari Jasa)</span>
                        <span className="text-[9.5px] text-slate-500 dark:text-slate-400 block font-normal leading-normal">Pesan jasa poster, PPT, coding, CV kawan</span>
                      </div>
                    </div>
                  </button>

                  {/* Mitra Freelancer Portal gate */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('auth');
                      setIsRegister(false);
                      setPortal('seller');
                      setRole('seller');
                      setMenuOpen(false);
                      setError('');
                      setSuccess('');
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      activeView === 'auth' && portal === 'seller' && !isRegister
                        ? 'border-indigo-500/60 bg-indigo-500/10 dark:bg-indigo-500/5 text-indigo-900 dark:text-indigo-400 font-extrabold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="h-4 w-4 text-indigo-500" />
                      <div className="text-xs text-left">
                        <span className="block font-black text-slate-800 dark:text-slate-100">🏪 Admin Jasa / Tempat (Freelancer)</span>
                        <span className="text-[9.5px] text-slate-500 dark:text-slate-400 block font-normal leading-normal">Buka jasa editing, copywriting &amp; terima order</span>
                      </div>
                    </div>
                  </button>

                  {/* Owner Master Portal gate */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('auth');
                      setIsRegister(false);
                      setPortal('admin');
                      setRole('admin');
                      setMenuOpen(false);
                      setError('');
                      setSuccess('');
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      activeView === 'auth' && portal === 'admin'
                        ? 'border-amber-500/60 bg-amber-500/10 dark:bg-amber-950/10 text-amber-900 dark:text-amber-400 font-extrabold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-amber-500" />
                      <div className="text-xs text-left">
                        <span className="block font-black text-slate-805 dark:text-slate-100">🛡️ Admin Utama Sistem (Owner)</span>
                        <span className="text-[9.5px] text-slate-550 dark:text-slate-400 block font-normal leading-normal">Override pengerjaan, sadap chat monitoring</span>
                      </div>
                    </div>
                  </button>

                </div>
              </div>

            </div>
            
            {/* Drawer Footer info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 shrink-0 text-center text-[9px] text-slate-400 dark:text-slate-500 border-t border-slate-150 dark:border-slate-800">
              Universitas Muhammadiyah Sumatera Utara &copy; 2026
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
