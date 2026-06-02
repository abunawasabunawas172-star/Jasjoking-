import React, { useState } from 'react';
import { User, AppNotification } from '../types';
import { ShoppingBag, Bell, LogOut, Sun, Moon, Settings, Check } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export function Navbar({
  user,
  onLogout,
  notifications,
  onClearNotifications,
  theme,
  onToggleTheme,
  onOpenSettings,
}: NavbarProps) {
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 font-bold px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/50 flex items-center gap-1">
            ⚙️ Admin
          </span>
        );
      case 'seller':
        return (
          <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-900/50 flex items-center gap-1 font-sans">
            🏪 Penjual
          </span>
        );
      default:
        return (
          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1 font-sans">
            🎓 Mahasiswa
          </span>
        );
    }
  };

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 dark:bg-emerald-700 rounded-xl text-white">
              <ShoppingBag className="h-5.5 w-5.5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-800 dark:text-slate-100 bg-clip-text">
                JasJoking Mahasiswa
              </span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">
                Jasa & Marketplace Kampus
              </span>
            </div>
          </div>

          {/* User profile, theme, settings & notifications */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            {/* User credentials */}
            <div className="hidden sm:flex flex-col items-end text-sm text-right">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <img
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={user.username}
                  className="w-5 h-5 rounded-full ring-1 ring-emerald-500/30"
                />
                <span>@{user.username}</span>
              </div>
              <div className="mt-0.5 flex gap-1 items-center">
                {user.storeName && (
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 max-w-[130px] truncate leading-none">
                    {user.storeName}
                  </span>
                )}
                {getRoleBadge(user.role)}
              </div>
            </div>

            {/* Toggle Theme Button */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer"
              title={theme === 'light' ? 'Nyalakan Mode Gelap' : 'Nyalakan Mode Terang'}
              id="theme-toggler"
            >
              {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
            </button>

            {/* Account Settings Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer"
              title="Pengaturan Akun & Keamanan"
              id="account-settings-btn"
            >
              <Settings className="h-4.5 w-4.5" />
            </button>

            {/* Notifications clicker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifDrawer(!showNotifDrawer)}
                className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition relative cursor-pointer"
                id="notifications-bell-btn"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[9px] h-4.5 w-4.5 rounded-full flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown drawer */}
              {showNotifDrawer && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-700 py-3 z-50 animate-in fade-in slide-in-from-top-3 max-h-[80vh] overflow-y-auto">
                  <div className="px-4 pb-2 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Notifikasi Kampus</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={onClearNotifications}
                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-semibold cursor-pointer"
                      >
                        <Check className="h-3 w-3" />
                        Tandai Dibaca
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 italic">
                        Belum ada pemberitahuan baru.
                      </p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-3 px-4 hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition border-l-2 ${
                            n.read
                              ? 'border-transparent opacity-80'
                              : 'border-emerald-600 bg-emerald-50/5 dark:bg-emerald-500/5'
                          }`}
                        >
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-normal">
                            {n.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {n.body}
                          </p>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-1.5">
                            {new Date(n.timestamp).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="p-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/45 text-rose-600 dark:text-rose-400 rounded-xl transition cursor-pointer"
              title="Keluar Aplikasi"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
