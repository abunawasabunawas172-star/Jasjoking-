export type UserRole = 'buyer' | 'seller' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  password?: string;
  storeName?: string;
  avatarUrl?: string;
  createdAt: string;
  address?: string;
  whatsappNumber?: string;
  whatsappVerified?: boolean;
  sellerBank?: string;
  sellerAccount?: string;
  sellerQrisText?: string;
}

export type CategoryType = 'desain' | 'coding' | 'print' | 'fotografi' | 'makanan' | 'kebutuhan';

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  price: number;
  category: CategoryType;
  imageUrl: string;
  stock: number;
  staffOptions?: string[]; // E.g., designers/coders list
  tableOptions?: string[]; // E.g., for UMKM desk/seats selection
  address?: string;
  whatsappContact?: string;
  sellerRating?: number;
  sellerReviewCount?: number;
  sellerType?: 'mahasiswa' | 'mitra'; // Categorize product vendor
}

export type OrderStatus = 
  | 'awaiting_payment' // QRIS is prepared
  | 'paid'             // Paid automatically via QRIS
  | 'confirmed'        // Scheduled & confirmed by admin/seller
  | 'processing'       // Currently processed
  | 'completed'        // Done and ready for review
  | 'cancelled';

export interface Message {
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  productId: string;
  productTitle: string;
  price: number;
  category: CategoryType;
  quantity: number;
  status: OrderStatus;
  qrisUrl: string; // Dynamic simulated QRIS payload
  createdAt: string;
  selectedStaff?: string; // e.g. "Riko (UI Specialist)"
  scheduledTime?: string; // e.g. "Kamis, 14:00 - 16:00"
  seatingRequest?: string; // e.g. "Meja 12"
  chatHistory: Message[];
  rating?: number;
  review?: string;
  discountAmount?: number;
  originalPrice?: number;
  sellerAddress?: string;
  sellerWhatsapp?: string;
  sellerBankName?: string;
  sellerBankAccount?: string;
  sellerQrisCode?: string;
  payoutToSeller?: number;
  payoutToPlatform?: number;
}

export interface DiscordLog {
  id: string;
  timestamp: string;
  event: string;
  message: string;
  webhookUrl: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}
