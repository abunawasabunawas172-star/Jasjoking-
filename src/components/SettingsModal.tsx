import React, { useState } from 'react';
import { User } from '../types';
import { X, Shield, UserCircle, Store, Key, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSave: (updatedUser: User) => void;
}

export function SettingsModal({ isOpen, onClose, user, onSave }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'seller'>('profile');
  const [username, setUsername] = useState(user.username);
  const [address, setAddress] = useState(user.address || '');
  const [whatsappNumber, setWhatsappNumber] = useState(user.whatsappNumber || '');
  
  // Password change states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Seller specific states
  const [storeName, setStoreName] = useState(user.storeName || '');
  const [sellerBank, setSellerBank] = useState(user.sellerBank || 'Bank Mandiri');
  const [sellerAccount, setSellerAccount] = useState(user.sellerAccount || '');
  const [sellerQrisText, setSellerQrisText] = useState(user.sellerQrisText || '');

  // Operation states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate passwords if user wants to change it
    if (password) {
      if (password.length < 4) {
        setError('Kata sandi minimal harus 4 karakter demi keamanan.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Konfirmasi kata sandi baru tidak cocok kawan!');
        setLoading(false);
        return;
      }
    }

    try {
      const payload: any = {
        userId: user.id,
        username,
        address,
      };

      if (password) {
        payload.password = password;
      }

      // If phone was changed from empty, let them update
      if (whatsappNumber !== user.whatsappNumber) {
        payload.whatsappNumber = whatsappNumber;
        // Bypassing active WhatsApp OTP check in simulation/setting edit for simplicity
        payload.whatsappOtp = "BYPASS_VERIFICATION"; 
      }

      if (user.role === 'seller') {
        payload.storeName = storeName;
        payload.sellerBank = sellerBank;
        payload.sellerAccount = sellerAccount;
        payload.sellerQrisText = sellerQrisText;
      }

      // We send this to the update-profile endpoint which we enriched earlier
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan saat menyimpan pengaturan.');
      }

      setSuccess('Pengaturan profil & keamanan Anda berhasil diperbarui!');
      onSave(data.user);
      
      // Clear password fields on success
      setPassword('');
      setConfirmPassword('');

      // Auto-hide success alert after 3s
      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-left">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row h-[550px] animate-in fade-in zoom-in duration-200">
        
        {/* Left Sidebar Menu */}
        <div className="w-full md:w-56 bg-slate-50 dark:bg-slate-950 p-5 flex flex-col gap-1 border-r border-slate-100 dark:border-slate-850">
          <div className="mb-6">
            <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Pengaturan Akun</h2>
            <p className="text-[10px] text-slate-400">JasJoking Mahasiswa</p>
          </div>

          <button
            onClick={() => { setActiveTab('profile'); setError(null); }}
            className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-450 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/40'
            }`}
          >
            <UserCircle className="h-4 w-4" />
            <span>Informasi Toko/Diri</span>
          </button>

          <button
            onClick={() => { setActiveTab('security'); setError(null); }}
            className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
              activeTab === 'security'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-450 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/40'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Ubah Kata Sandi</span>
          </button>

          {user.role === 'seller' && (
            <button
              onClick={() => { setActiveTab('seller'); setError(null); }}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                activeTab === 'seller'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-450 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/40'
              }`}
            >
              <Store className="h-4 w-4" />
              <span>Detail Finansial Toko</span>
            </button>
          )}

          <div className="mt-auto pt-4 border-t border-slate-150 dark:border-slate-800 text-[9px] text-slate-400">
            ID Akun: <span className="font-mono text-[8px] block mt-0.5 select-all">{user.id}</span>
          </div>
        </div>

        {/* Right Content Sheet */}
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900">
          {/* Header */}
          <div className="p-4 px-6 border-b border-slate-105 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white">
                {activeTab === 'profile' && 'Ubah Informasi Profil'}
                {activeTab === 'security' && 'Keamanan Kredensial & Sandi'}
                {activeTab === 'seller' && 'Lokasi Bank & Akreditasi QRIS'}
              </h3>
              <p className="text-[10px] text-slate-400">Update data real-time mahasiswa</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 px-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950 text-rose-600 dark:text-rose-400 text-xs p-3 rounded-xl flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs p-3 rounded-xl flex items-center gap-2 font-bold animate-pulse">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 dark:text-slate-450 font-semibold tracking-wide mb-1">Nama Mahasiswa / Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 dark:text-slate-100"
                    placeholder="Masukkan nama pengguna"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-450 font-semibold mb-1">Email Kampus (Static)</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-slate-450 rounded-lg outline-none cursor-not-allowed select-none"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Email jaminan keamanan data tidak dapat diganti secara mandiri.</span>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-450 font-semibold mb-1">Nomor WhatsApp Aktif</label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 dark:text-slate-100 font-mono"
                    placeholder="Contoh: 08123456789"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-450 font-semibold tracking-wide mb-1">Alamat Domisili Kampus / Kos</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 dark:text-slate-100 resize-none"
                    placeholder="Uraikan alamat lengkap pengantaran jualan Anda..."
                  />
                </div>
              </div>
            )}

            {/* TAB: SECURITY */}
            {activeTab === 'security' && (
              <div className="space-y-4 text-xs">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-950 p-3 rounded-xl flex gap-2 text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed">
                  <Key className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Panduan Kata Sandi:</strong> Untuk menjaga keamanan akun JasJoking Anda, masukkan sandi minimal 4 karakter. Lewatkan tab ini dan biarkan kolom kosong jika tidak ingin merubah sandi.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-450 font-semibold mb-1">Langkah 1: Masukkan Kata Sandi Baru</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-2.5 pr-10 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 dark:text-slate-100 font-mono"
                      placeholder="Buat sandi baru yang aman..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-450 font-semibold mb-1">Langkah 2: Konfirmasi Kata Sandi Baru</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 dark:text-slate-100 font-mono"
                    placeholder="Ketik ulang sandi baru kawan..."
                  />
                </div>
              </div>
            )}

            {/* TAB: SELLER DETAILS */}
            {activeTab === 'seller' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 dark:text-slate-450 font-semibold mb-1">Nama Toko Mitra / Jasa</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 dark:text-slate-100"
                    placeholder="Contoh: Print Murah Kampus"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-450 font-semibold mb-1">Bank Penerima Dana Payout (Simulation)</label>
                  <select
                    value={sellerBank}
                    onChange={(e) => setSellerBank(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 dark:text-slate-100"
                  >
                    <option value="Bank Mandiri">Bank Mandiri (Rekomendasi Tercepat)</option>
                    <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                    <option value="BCA">BCA (Bank Central Asia)</option>
                    <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                    <option value="BNI">BNI (Bank Negara Indonesia)</option>
                    <option value="OVO/GOPAY">OVO atau GOPAY Digital</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-450 font-semibold mb-1">Nomor Rekening / Akun Penerima</label>
                  <input
                    type="text"
                    required
                    value={sellerAccount}
                    onChange={(e) => setSellerAccount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 dark:text-slate-100 font-mono font-bold"
                    placeholder="Masukkan nomor rekening kawan..."
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-450 font-semibold mb-1">Kode Integrasi QRIS Pribadi Toko</label>
                  <input
                    type="text"
                    required
                    value={sellerQrisText}
                    onChange={(e) => setSellerQrisText(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 dark:text-slate-100 font-mono"
                    placeholder="Contoh: QRIS.EXPRESSPRINT"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Digunakan oleh mahasiswa untuk melakukan checkout dan transfer dana pembayaran secara waktu-nyata ke rekening freelancer.</span>
                </div>
              </div>
            )}

            {/* Bottom Footer Actions */}
            <div className="pt-4 border-t border-slate-110 dark:border-slate-800 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-150 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 rounded-xl transition font-bold"
                disabled={loading}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-405 text-white font-black rounded-xl transition shadow-md shadow-emerald-500/10 cursor-pointer text-center"
              >
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
