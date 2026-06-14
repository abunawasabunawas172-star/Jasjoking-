import React from 'react';
import { Product, CategoryType } from '../types';
import { Palette, Code, Printer, Camera, Tag, Utensils, Store, Heart } from 'lucide-react';

export function cleanSellerName(name: string): string {
  if (!name) return "";
  return name.replace(/\s*\([Mm]hs[^\)]*\)/g, '').replace(/\s*\([Mm]itra[^\)]*\)/g, '').replace(/\s*\(Kantin[^\)]*\)/g, '').trim();
}

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onViewSellerProfile?: (sellerId: string) => void;
  key?: string | number;
  isWishlisted?: boolean;
  onToggleWishlist?: (product: Product) => void;
}

export const CATEGORY_LABELS: Record<CategoryType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  desain: {
    label: 'Jasa Desain Poster/Video/CV',
    icon: <Palette className="h-3 w-3" />,
    color: 'text-purple-700 border-purple-200 dark:text-purple-400 dark:border-purple-800',
    bg: 'bg-purple-50 dark:bg-purple-950/20',
  },
  coding: {
    label: 'Jasa Coding & Project IT',
    icon: <Code className="h-3 w-3" />,
    color: 'text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
  print: {
    label: 'Jasa Pengetikan & Makalah',
    icon: <Printer className="h-3 w-3" />,
    color: 'text-rose-700 border-rose-200 dark:text-rose-400 dark:border-rose-800',
    bg: 'bg-rose-50 dark:bg-rose-950/20',
  },
  fotografi: {
    label: 'Jasa Fotografi Kampus',
    icon: <Camera className="h-3 w-3" />,
    color: 'text-sky-700 border-sky-200 dark:text-sky-400 dark:border-sky-800',
    bg: 'bg-sky-50 dark:bg-sky-950/20',
  },
  makanan: {
    label: 'Kantin / Makanan & Minuman',
    icon: <Utensils className="h-3 w-3" />,
    color: 'text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
  },
  kebutuhan: {
    label: 'Kebutuhan Mahasiswa & Atk',
    icon: <Store className="h-3 w-3" />,
    color: 'text-indigo-700 border-indigo-200 dark:text-indigo-400 dark:border-indigo-800',
    bg: 'bg-indigo-50 dark:bg-indigo-950/20',
  },
};

export function ProductCard({ product, onSelect, onViewSellerProfile, isWishlisted, onToggleWishlist }: ProductCardProps) {
  const [isZoomed, setIsZoomed] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const cat = CATEGORY_LABELS[product.category] || {
    label: 'Lainnya',
    icon: <Tag className="h-3 w-3" />,
    color: 'text-slate-700 border-slate-200',
    bg: 'bg-slate-50',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition duration-200 flex flex-col h-full group">
      {/* Product Image Section */}
      <div className="relative aspect-video w-full bg-slate-100 overflow-hidden cursor-zoom-in">
        {imageError || !product.imageUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 p-4 select-none">
            <div className={`p-3.5 rounded-full bg-white dark:bg-slate-900 shadow-md border border-slate-100 dark:border-slate-700 font-bold ${cat.color.split(' ')[0]}`}>
              {cat.icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-450 mt-2 font-mono text-center leading-normal">{cat.label}</span>
          </div>
        ) : (
          <img
            src={product.imageUrl}
            alt={product.title}
            referrerPolicy="no-referrer"
            className="object-cover w-full h-full group-hover:scale-105 transition duration-300"
            onClick={() => setIsZoomed(true)}
            onError={() => setImageError(true)}
          />
        )}
        {/* Hover overlay hint */}
        <div 
          onClick={() => setIsZoomed(true)}
          className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-1.5 text-white text-xs font-bold"
        >
          <span>🔍 Perbesar Detail Gambar</span>
        </div>

        {/* Category Badge */}
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${cat.color} ${cat.bg}`}>
          {cat.icon}
          <span>{cat.label}</span>
        </div>

        {/* Wishlist Heart Button overlay */}
        {onToggleWishlist && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product);
            }}
            className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-xs rounded-full hover:bg-white text-rose-600 border border-slate-100 hover:scale-110 active:scale-95 transition cursor-pointer shadow-xs z-10"
            title={isWishlisted ? "Hapus dari Wishlist kawan" : "Simpan ke Wishlist kawan"}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current text-rose-600' : 'text-slate-400 hover:text-rose-650'}`} />
          </button>
        )}
      </div>

      {/* Product Text Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-1 text-left">
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => onViewSellerProfile && onViewSellerProfile(product.sellerId)}
                className={`text-[10.5px] text-slate-400 hover:text-emerald-650 hover:underline font-black text-left block uppercase tracking-wider line-clamp-1 max-w-[170px] cursor-pointer transition flex items-center gap-0.5`}
                title="Klik untuk melihat profil lengkap"
              >
                👤 {cleanSellerName(product.sellerName)}
              </button>
              <span className={`inline-block text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full w-max mt-0.5 ${
                (product.sellerType || 'mahasiswa') === 'mitra'
                  ? 'bg-amber-150 text-amber-800 border border-amber-200 font-black'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-black'
              }`}>
                {(product.sellerType || 'mahasiswa') === 'mitra' ? '🏪 Mitra Kampus' : '🎓 Jasa Mahasiswa'}
              </span>
            </div>
            {typeof product.productRating === 'number' && product.productRating > 0 ? (
              <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] text-amber-700 font-bold border border-amber-100" title="Rating spesifik untuk jasa ini">
                <span>⭐</span>
                <span>{product.productRating}</span>
                <span className="text-slate-400 font-normal">({product.productReviewCount})</span>
              </div>
            ) : typeof product.sellerRating === 'number' && product.sellerRating > 0 ? (
              <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded text-[10px] text-slate-600 font-semibold border border-slate-100" title="Rating rata-rata dari seluruh jasa toko ini">
                <span>⭐</span>
                <span>{product.sellerRating}</span>
                <span className="text-slate-400 font-normal">({product.sellerReviewCount} toko)</span>
              </div>
            ) : (
              <span className="text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 italic">Belum ada ulasan</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition duration-150">
            {product.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-50 space-y-2">
          {product.address && (
            <div className="text-[11px] text-slate-500 font-medium flex items-start gap-1">
              <span className="text-rose-500 shrink-0">📍</span>
              <span className="line-clamp-2 leading-tight">Alamat: {product.address}</span>
            </div>
          )}

          {product.whatsappContact && (
            <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
              <span className="shrink-0">🟢</span>
              <span>WhatsApp: <a href={`https://wa.me/${product.whatsappContact}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-700">{product.whatsappContact}</a></span>
            </div>
          )}

          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium font-sans">Harga</span>
            <span className="text-base font-bold text-slate-900 font-mono">
              Rp {product.price.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Inline special values */}
          {(product.staffOptions && product.staffOptions.length > 0) && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                👥 {product.staffOptions.length} Spesialis Ready
              </span>
            </div>
          )}



          <button
            type="button"
            onClick={() => onSelect(product)}
            className="w-full mt-3 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-100 hover:border-emerald-200 py-2 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer text-center block"
          >
            Pesan Sekarang
          </button>
        </div>
      </div>

      {/* DETAIL IMAGE LIGHTBOX LIGHTWEIGHT PORTAL */}
      {isZoomed && (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="absolute top-4 right-4 z-110 flex gap-2">
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer font-bold text-sm flex items-center gap-1 shadow-lg"
            >
              <span>✕</span> <span>Tutup</span>
            </button>
          </div>

          <div className="max-w-4xl w-full flex flex-col gap-4 text-left p-2.5">
            {/* Main high detail object fit container containing full scale graphic inside */}
            <div className="bg-slate-900/60 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center h-[55vh] md:h-[65vh] w-full shadow-2xl relative">
              {imageError || !product.imageUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center select-none dark:bg-slate-900/40">
                  <div className={`p-6 rounded-full bg-slate-800/80 border border-slate-700 font-bold mb-4 ${cat.color.split(' ')[0]}`}>
                    {React.cloneElement(cat.icon as React.ReactElement, { className: 'h-10 w-10' })}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono">{cat.label}</span>
                </div>
              ) : (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain selection:bg-transparent"
                  onError={() => setImageError(true)}
                />
              )}
              <span className="absolute bottom-3 left-3 bg-slate-950/80 px-2.5 py-1 text-[10px] font-mono rounded text-slate-300 font-bold uppercase tracking-wider">
                Foto Resolusi Asli (Tampilan Penuh)
              </span>
            </div>

            {/* Extra Context Details Card underneath */}
            <div className="bg-white/10 border border-white/10 backdrop-blur-xs rounded-2xl p-4 sm:p-5 text-white shadow-xl space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${cat.color} ${cat.bg}`}>
                  {cat.icon} {cat.label}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsZoomed(false);
                    onViewSellerProfile && onViewSellerProfile(product.sellerId);
                  }}
                  className="text-[10px] text-slate-100 hover:text-emerald-300 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded cursor-pointer font-bold flex items-center gap-1 transition"
                  title="Klik lihat profil penjual ini"
                >
                  👤 Seller: {product.sellerName}
                </button>
                {typeof product.productRating === 'number' && product.productRating > 0 && (
                  <span className="text-[10px] text-emerald-300 bg-slate-900/45 px-2 py-0.5 rounded flex items-center gap-1 font-bold" title="Rating Jasa Ini">
                    ⭐ Jasa: {product.productRating} ({product.productReviewCount} Ulas)
                  </span>
                )}
                {typeof product.sellerRating === 'number' && product.sellerRating > 0 && (
                  <span className="text-[10px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded flex items-center gap-1 font-bold" title="Rating Toko Penjual">
                    ★ Penjual: {product.sellerRating} ({product.sellerReviewCount} Ulas)
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">{product.title}</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">{product.description}</p>
              
              {product.address && (
                <p className="text-xs text-rose-350">
                  📍 <strong>Lokasi Mitra:</strong> {product.address}
                </p>
              )}
              {product.whatsappContact && (
                <p className="text-xs text-emerald-450">
                  🟢 <strong>WhatsApp Contact:</strong> {product.whatsappContact}
                </p>
              )}

              <div className="pt-2 flex justify-between items-center text-sm font-bold border-t border-white/5">
                <span className="text-slate-400">Harga Layanan Jasa/Beli</span>
                <span className="text-emerald-400 font-black text-base sm:text-lg">Rp {product.price.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
