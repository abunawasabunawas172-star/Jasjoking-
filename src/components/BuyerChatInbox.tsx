import React, { useState } from 'react';
import { Order } from '../types';
import { MessageSquare, Search, ChevronRight } from 'lucide-react';

interface BuyerChatInboxProps {
  orders: Order[];
  currentUserId: string;
  viewingOrderId?: string;
  onSelectChat: (order: Order) => void;
}

export function BuyerChatInbox({ orders, currentUserId, viewingOrderId, onSelectChat }: BuyerChatInboxProps) {
  const [inboxSearch, setInboxSearch] = useState('');

  // Saring pesanan sesuai pencarian judul jasa atau nama penjual
  const filteredOrders = orders.filter(o => 
    o.productTitle.toLowerCase().includes(inboxSearch.toLowerCase()) ||
    o.sellerName.toLowerCase().includes(inboxSearch.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
      {/* Header Kotak Chat */}
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
          <span className="text-emerald-600">💬</span> Kotak Obrolan Transaksi
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          History percakapan & detail kordinasi jasa dengan mahasiswa/mitra kampus.
        </p>
      </div>

      {/* Kolom Pencarian Cepat */}
      {orders.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari chat berdasarkan jasa/penjual..."
            value={inboxSearch}
            onChange={(e) => setInboxSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition"
          />
        </div>
      )}

      {/* List Percakapan */}
      {orders.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <MessageSquare className="h-10 w-10 text-slate-350 mx-auto" />
          <p className="text-xs text-slate-500 font-medium italic">Belum ada obrolan.</p>
          <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
            Silakan lakukan pemesanan jasa terlebih dahulu untuk mulai chat langsung dengan penjual kawan.
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-6">
          Tidak ada percakapan yang cocok dengan "{inboxSearch}"
        </p>
      ) : (
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {filteredOrders.map((o) => {
            const chatHistory = o.chatHistory || [];
            const lastMsg = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
            const isSelected = viewingOrderId === o.id;

            return (
              <div
                key={o.id}
                onClick={() => onSelectChat(o)}
                className={`p-3 rounded-xl border text-left transition duration-150 cursor-pointer flex gap-3 items-start select-none group ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/30'
                    : 'border-slate-150 bg-slate-50/50 hover:bg-slate-50 hover:shadow-xs'
                }`}
              >
                {/* Avatar Initials */}
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-[11px] shrink-0 uppercase">
                  {o.sellerName.slice(0, 2)}
                </div>

                {/* Info & Last message */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700 transition pr-2">
                      {o.productTitle}
                    </h4>
                    <span className="text-[8.5px] text-slate-400 font-mono shrink-0">
                      {lastMsg
                        ? new Date(lastMsg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                        : new Date(o.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                      }
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                    <span className="font-semibold text-slate-600 truncate max-w-[120px]">
                      Store: {o.sellerName}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.1 rounded uppercase ${
                      o.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      o.status === 'cancelled' ? 'bg-rose-50 text-rose-700' :
                      o.status === 'awaiting_payment' ? 'bg-amber-50 text-amber-700' :
                      'bg-indigo-50 text-indigo-700'
                    }`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Cuplikan Pesan Terakhir */}
                  <div className="text-[11px] text-slate-500 truncate pt-1 flex items-center gap-1.5">
                    {lastMsg ? (
                      <>
                        <span className="font-bold text-[10px] shrink-0 text-slate-650">
                          {lastMsg.senderId === currentUserId ? 'Anda:' : 'Penjual:'}
                        </span>
                        <span className="italic truncate text-slate-650">"{lastMsg.content}"</span>
                      </>
                    ) : (
                      <span className="text-slate-400 italic">Belum ada obrolan. Ketuk untuk chatting sekarang!</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 self-center">
                  <ChevronRight className="h-4 w-4 text-slate-450 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
