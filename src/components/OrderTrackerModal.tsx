import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Bike, 
  Store as StoreIcon, 
  Phone, 
  MessageSquare, 
  Receipt, 
  Barcode, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles,
  Play,
  RotateCcw,
  Navigation,
  Printer,
  Settings,
  Edit3,
  Copy,
  ExternalLink,
  Check
} from 'lucide-react';
import { Order, OrderStatus, ReceiptInfo, CourierInfo } from '../types';
import { formatRupiah, formatDateTime } from '../utils/formatters';
import { cleanReceiptText } from '../utils/sanitizeReceipt';
import { cleanPhoneNumber, generateOrderWhatsAppMessage, getWhatsAppChatUrl, openWhatsAppDirect } from '../utils/whatsappHelper';

interface OrderTrackerModalProps {
  order: Order | null;
  onClose: () => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  receiptConfigs?: ReceiptInfo[];
  onOpenReceiptManager?: () => void;
  onOpenCourierManager?: () => void;
  couriers?: CourierInfo[];
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  order,
  onClose,
  onUpdateOrderStatus,
  receiptConfigs,
  onOpenReceiptManager,
}) => {
  if (!order) return null;

  const [activeTab, setActiveTab] = useState<'tracking' | 'receipt'>('tracking');
  const [driverMsg, setDriverMsg] = useState('');
  const [chatLog, setChatLog] = useState<{ sender: 'user' | 'driver'; text: string; time: string }[]>([
    {
      sender: 'driver',
      text: 'Halo kak, pesanan dari NusaMart sedang saya antarkan ya. Estimasi 10 menit tiba di lokasi.',
      time: 'Baru saja',
    },
  ]);
  const [showChat, setShowChat] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // WhatsApp interaction handlers
  const handleOpenWhatsAppChat = () => {
    if (!order?.driver) return;
    const phoneToUse = order.driver.whatsapp || order.driver.phone;
    const cleanPhone = cleanPhoneNumber(phoneToUse);
    const message = generateOrderWhatsAppMessage({
      driverName: order.driver.name,
      orderNumber: order.orderNumber,
      storeName: order.store.name,
      destinationAddress: order.address?.fullAddress,
      customerName: order.address?.recipientName,
      isCallRequest: false
    });
    
    // Open WhatsApp directly
    openWhatsAppDirect(cleanPhone, message);
    
    // Also toggle in-app chat for local tracking
    setShowChat(true);
  };

  const handleCallViaWhatsApp = () => {
    if (!order?.driver) return;
    const phoneToUse = order.driver.whatsapp || order.driver.phone;
    const cleanPhone = cleanPhoneNumber(phoneToUse);
    const message = generateOrderWhatsAppMessage({
      driverName: order.driver.name,
      orderNumber: order.orderNumber,
      storeName: order.store.name,
      destinationAddress: order.address?.fullAddress,
      customerName: order.address?.recipientName,
      isCallRequest: true
    });
    
    openWhatsAppDirect(cleanPhone, message);
    setShowPhoneModal(false);
  };

  const handleCopyPhone = () => {
    if (!order?.driver) return;
    const phoneToUse = order.driver.whatsapp || order.driver.phone;
    navigator.clipboard.writeText(phoneToUse);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Dynamic store receipt information resolver
  const resolvedReceipt: ReceiptInfo = (() => {
    let list: ReceiptInfo[] = receiptConfigs || [];
    if (!list || list.length === 0) {
      try {
        const saved = localStorage.getItem('nusamart_receipt_configs');
        if (saved) list = JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    // 1. Match by store id or store name
    const matchByStore = list?.find(
      r => (r.storeId && r.storeId === order?.store.id) || 
           (r.storeName && order?.store.name && r.storeName.toLowerCase() === order?.store.name.toLowerCase())
    );
    if (matchByStore) return matchByStore;

    // 2. Match default receipt
    const defaultOne = list?.find(r => r.isDefault);
    if (defaultOne) return defaultOne;

    // 3. First available
    if (list && list.length > 0) return list[0];

    // 4. Fallback default
    return {
      id: 'default_rcp',
      profileName: 'Struk Standar',
      headerBrand: 'NUSA MART EXPRESS',
      storeName: order?.store.name || 'KuickMart Express - Sudirman Thamrin',
      address: order?.store.address || 'Jl. Jendral Sudirman No. 18, Menteng',
      phone: order?.store.phone || '021-5551234',
      footerMessage1: 'Struk ini adalah bukti pembayaran sah dari NusaMart Express.',
      showBarcode: true,
    };
  })();

  // Status mapping
  const statuses: OrderStatus[] = ['processing', 'picking', 'delivering', 'completed'];
  const currentStatusIdx = statuses.indexOf(order.status) >= 0 ? statuses.indexOf(order.status) : 0;

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending_payment':
        return 'Menunggu Pembayaran';
      case 'processing':
        return 'Toko Menyiapkan Barang';
      case 'picking':
        return 'Pengecekan Kualitas & Packing';
      case 'delivering':
        return order.deliveryType === 'delivery' ? 'Kurir Sedang Mengantar' : 'Siap Diambil di Kasir Toko';
      case 'ready_for_pickup':
        return 'Siap Diambil di Outlet';
      case 'completed':
        return 'Pesanan Selesai';
      case 'cancelled':
        return 'Pesanan Dibatalkan';
      default:
        return status;
    }
  };

  const handleNextStatus = () => {
    if (order.status === 'processing') {
      onUpdateOrderStatus(order.id, 'picking');
    } else if (order.status === 'picking') {
      onUpdateOrderStatus(order.id, 'delivering');
    } else if (order.status === 'delivering' || order.status === 'ready_for_pickup') {
      onUpdateOrderStatus(order.id, 'completed');
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverMsg.trim()) return;

    setChatLog((prev) => [
      ...prev,
      {
        sender: 'user',
        text: driverMsg.trim(),
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    const userText = driverMsg;
    setDriverMsg('');

    setTimeout(() => {
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'driver',
          text: 'Siap kak! Pesanan dipastikan aman & dingin.',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-mono">
                {order.orderNumber}
              </span>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                order.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900 animate-pulse'
              }`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Dipesan pada {formatDateTime(order.createdAt)} • {order.store.name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-stone-200 p-0.5 rounded-xl text-xs">
              <button
                onClick={() => setActiveTab('tracking')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'tracking' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                }`}
              >
                Live Tracking
              </button>
              <button
                onClick={() => setActiveTab('receipt')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'receipt' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                }`}
              >
                Struk Digital
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {activeTab === 'tracking' ? (
            <div className="space-y-5">
              {/* Delivery ETA & Map Simulation Banner */}
              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-stone-900 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-blue-300" />
                      {order.deliveryType === 'delivery' ? 'Live Courier Dispatch' : 'Express Store Pickup'}
                    </span>
                    <span className="text-xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded">
                      {order.status === 'completed' ? 'Tiba di Tujuan' : 'Estimasi: 12 Menit'}
                    </span>
                  </div>

                  <h3 className="text-lg font-black tracking-tight mb-1">
                    {order.status === 'completed'
                      ? 'Pesanan Berhasil Diterima'
                      : order.deliveryType === 'delivery'
                      ? 'Kurir Sedang Menuju Rumahmu'
                      : 'Barang Siap Diambil di Outlet Minimarket'}
                  </h3>

                  <p className="text-xs text-stone-300">
                    {order.deliveryType === 'delivery'
                      ? `Dikirim ke: ${order.address?.fullAddress}`
                      : `Lokasi: ${order.store.address}`}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/20 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-500"
                    style={{
                      width:
                        order.status === 'processing'
                          ? '25%'
                          : order.status === 'picking'
                          ? '50%'
                          : order.status === 'delivering'
                          ? '75%'
                          : '100%',
                    }}
                  />
                </div>
              </div>

              {/* Google Maps Recorded Location Card (if available) */}
              {order.deliveryType === 'delivery' && (order.customerLocation || order.address?.latitude) && (
                <div className="bg-white border border-stone-200 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                      <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Titik Lokasi Rumah (Google Maps Terverifikasi)</span>
                    </div>
                    <a
                      href={order.customerLocation?.mapsUrl || order.address?.mapsUrl || `https://www.google.com/maps?q=${order.address?.latitude},${order.address?.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all"
                    >
                      <span>Buka di Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="h-40 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 relative">
                    <iframe
                      title="Google Maps Tujuan Rumah"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://maps.google.com/maps?q=${order.customerLocation?.latitude || order.address?.latitude},${order.customerLocation?.longitude || order.address?.longitude}&hl=id&z=16&output=embed`}
                      className="w-full h-full"
                      loading="lazy"
                    />
                    <div className="absolute bottom-2 left-2 bg-stone-900/85 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-lg font-mono flex items-center gap-1.5 shadow-sm">
                      <MapPin className="w-3 h-3 text-red-400" />
                      <span>{(order.customerLocation?.latitude || order.address?.latitude)?.toFixed(6)}, {(order.customerLocation?.longitude || order.address?.longitude)?.toFixed(6)}</span>
                      {order.customerLocation?.accuracy && (
                        <span className="text-stone-300 text-[9px]">(±{Math.round(order.customerLocation.accuracy)}m)</span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-stone-600 flex flex-wrap items-center justify-between gap-1 bg-stone-50 p-2 rounded-xl border border-stone-200/80">
                    <span><strong>Alamat Penerima:</strong> {order.address?.fullAddress}</span>
                    {order.customerLocation?.recordedAt && (
                      <span className="font-mono text-[9px] text-stone-400">Direkam {order.customerLocation.recordedAt}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Courier Profile & Contact */}
              {order.deliveryType === 'delivery' && order.driver && (
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={order.driver.photo}
                      alt={order.driver.name}
                      className="w-12 h-12 rounded-xl object-cover border border-stone-300"
                    />
                    <div>
                      <div className="text-xs font-bold text-stone-900">{order.driver.name}</div>
                      <div className="text-[11px] text-stone-500 font-mono">Kurir NusaMart • {order.driver.vehiclePlate}</div>
                      <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Driver Terverifikasi & Vaksin
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Tombol Chat via WhatsApp */}
                    <button
                      type="button"
                      onClick={handleOpenWhatsAppChat}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
                      title="Kirim Pesan WhatsApp ke Kurir"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat WA</span>
                    </button>

                    {/* Tombol Telepon (WhatsApp & Seluler) */}
                    <button
                      type="button"
                      onClick={() => setShowPhoneModal(true)}
                      className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
                      title="Hubungi Kurir via Telepon atau WhatsApp"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Telepon</span>
                    </button>
                  </div>
                </div>
              )}

              {/* MODAL / POPOUT PILIHAN TELEPON KURIR (WHATSAPP & SELULER) */}
              {showPhoneModal && order.deliveryType === 'delivery' && order.driver && (
                <div className="bg-stone-900 text-white rounded-2xl p-4 shadow-xl border border-stone-800 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">Hubungi Kurir {order.driver.name}</h4>
                        <p className="text-[11px] text-stone-400 font-mono">{order.driver.whatsapp || order.driver.phone}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowPhoneModal(false)}
                      className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-stone-300">
                    Pilih metode panggilan untuk berkomunikasi langsung dengan kurir pengiriman pesanan Anda:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* Opsi 1: Telepon via WhatsApp */}
                    <button
                      type="button"
                      onClick={handleCallViaWhatsApp}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-left transition-all group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>Telepon via WhatsApp</span>
                          <span className="text-[9px] bg-white/30 px-1 py-0.2 rounded font-medium">Gratis</span>
                        </div>
                        <div className="text-[10px] text-emerald-100 truncate">Panggilan suara via kuota internet WA</div>
                      </div>
                    </button>

                    {/* Opsi 2: Telepon Seluler Biasa */}
                    <a
                      href={`tel:${order.driver.phone}`}
                      onClick={() => setShowPhoneModal(false)}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-left transition-all border border-stone-700 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold">Panggilan Seluler Biasa</div>
                        <div className="text-[10px] text-stone-400 truncate">Panggilan pulsa HP langsung ke dialer</div>
                      </div>
                    </a>
                  </div>

                  {/* Tombol Salin Nomor & Opsi Chat */}
                  <div className="flex items-center justify-between pt-1 border-t border-stone-800/80 text-[11px]">
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className="text-stone-400 hover:text-stone-200 flex items-center gap-1 py-1"
                    >
                      {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPhone ? 'Nomor Tersalin!' : 'Salin Nomor Kurir'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowPhoneModal(false);
                        handleOpenWhatsAppChat();
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Atau Kirim Chat WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Popout Dialog */}
              {showChat && (
                <div className="bg-white border border-blue-200 rounded-2xl p-3 shadow-md space-y-2">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Chat dengan Kurir ({order.driver?.name})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenWhatsAppChat}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer"
                        title="Buka percakapan langsung di WhatsApp"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Buka di WA</span>
                      </button>
                      <button onClick={() => setShowChat(false)} className="text-stone-400 hover:text-stone-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto p-1 text-xs">
                    {chatLog.map((chat, idx) => (
                      <div
                        key={idx}
                        className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-2 ${
                            chat.sender === 'user'
                              ? 'bg-blue-600 text-white rounded-br-2xs'
                              : 'bg-stone-100 text-stone-800 rounded-bl-2xs'
                          }`}
                        >
                          <p>{chat.text}</p>
                          <span className="text-[9px] opacity-70 block text-right mt-0.5">{chat.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendMessage} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={driverMsg}
                      onChange={(e) => setDriverMsg(e.target.value)}
                      placeholder="Ketik pesan untuk kurir..."
                      className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-blue-700"
                    >
                      Kirim
                    </button>
                  </form>
                </div>
              )}

              {/* Status Timeline */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                  Aktivitas Pengiriman
                </span>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                  {/* Step 1: Processing */}
                  <div className="relative">
                    <div className={`absolute -left-6 top-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                      order.status !== 'pending_payment' ? 'bg-emerald-500 text-white' : 'bg-stone-300'
                    }`}>
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-stone-900">Pesanan Diterima & Disiapkan Toko</h5>
                      <p className="text-[11px] text-stone-500">Petugas minimarket sedang memilih produk berkualitas dan mengecek tanggal expired.</p>
                    </div>
                  </div>

                  {/* Step 2: Picking */}
                  <div className="relative">
                    <div className={`absolute -left-6 top-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                      order.status === 'picking' || order.status === 'delivering' || order.status === 'completed'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-stone-300'
                    }`}>
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-stone-900">Quality Control & Packing Higienis</h5>
                      <p className="text-[11px] text-stone-500">Item telah dipindai barcode kasir dan dikemas rapi.</p>
                    </div>
                  </div>

                  {/* Step 3: Delivering */}
                  <div className="relative">
                    <div className={`absolute -left-6 top-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                      order.status === 'delivering' || order.status === 'completed'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-stone-300'
                    }`}>
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-stone-900">
                        {order.deliveryType === 'delivery' ? 'Kurir Dalam Perjalanan' : 'Siap Diambil di Kasir Toko'}
                      </h5>
                      <p className="text-[11px] text-stone-500">
                        {order.deliveryType === 'delivery'
                          ? 'Driver membawa pesanan menggunakan tas pendingin khusus.'
                          : 'Tunjukkan nomor pesanan ke kasir saat mengambil.'}
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Completed */}
                  <div className="relative">
                    <div className={`absolute -left-6 top-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                      order.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-stone-300'
                    }`}>
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-stone-900">Pesanan Selesai</h5>
                      <p className="text-[11px] text-stone-500">Terima kasih telah berbelanja di NusaMart Express!</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulation Controller Action */}
              {order.status !== 'completed' && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-900">Simulasi Progres Pengiriman:</span>
                  </div>
                  <button
                    onClick={handleNextStatus}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-transform active:scale-95"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Lanjutkan Status Berikutnya</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Digital e-Receipt Tab */
            <div className="space-y-3 max-w-lg mx-auto">
              {/* Receipt Management & Print Toolbar */}
              <div className="flex items-center justify-between gap-2 bg-stone-100 p-2.5 rounded-2xl border border-stone-200">
                <div className="flex items-center gap-1.5 text-xs text-stone-700 font-bold">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <span>Struk Digital Transaksi</span>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenReceiptManager && (
                    <button
                      type="button"
                      onClick={onOpenReceiptManager}
                      className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                      title="Ubah info toko, header brand, alamat, dan nomor telepon struk"
                    >
                      <Settings className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ubah Info Struk</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Struk</span>
                  </button>
                </div>
              </div>

              {/* Thermal Receipt Card */}
              <div className="bg-stone-50 border border-stone-300 rounded-3xl p-6 shadow-sm font-sans space-y-4">
                {/* Receipt Header */}
                <div className="text-center pb-4 border-b border-dashed border-stone-300 space-y-1">
                  <div className="font-black text-xl text-blue-900 tracking-tight">
                    {resolvedReceipt.headerBrand || 'NUSA MART EXPRESS'}
                  </div>
                  {resolvedReceipt.subHeader && (
                    <p className="text-[10px] text-stone-500 font-medium italic">
                      {resolvedReceipt.subHeader}
                    </p>
                  )}
                  <p className="text-xs text-stone-700 font-bold">
                    {resolvedReceipt.storeName || order.store.name}
                  </p>
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    {cleanReceiptText(resolvedReceipt.address || order.store.address)}
                    {cleanReceiptText(resolvedReceipt.city) ? `, ${cleanReceiptText(resolvedReceipt.city)}` : ''}
                    {resolvedReceipt.phone ? ` • Telp: ${resolvedReceipt.phone}` : (order.store.phone ? ` • Telp: ${order.store.phone}` : '')}
                  </p>

                  {(resolvedReceipt.taxIdOrNpwp || resolvedReceipt.websiteOrSocial) && (
                    <p className="text-[9px] text-stone-400 font-mono pt-0.5">
                      {resolvedReceipt.taxIdOrNpwp} {resolvedReceipt.taxIdOrNpwp && resolvedReceipt.websiteOrSocial ? '•' : ''} {resolvedReceipt.websiteOrSocial}
                    </p>
                  )}

                  <div className="mt-2 text-[11px] font-mono text-stone-600 flex items-center justify-center gap-2">
                    <span>No: {order.orderNumber}</span>
                    <span>•</span>
                    <span>{formatDateTime(order.createdAt)}</span>
                  </div>

                  {resolvedReceipt.cashierName && (
                    <p className="text-[10px] font-mono text-stone-400">
                      {resolvedReceipt.cashierName}
                    </p>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-2 text-xs text-stone-800 pb-3 border-b border-dashed border-stone-300">
                  {order.items.map((item, idx) => {
                    const itemPrice = item.unitPrice || item.product.price;
                    const itemUnit = item.selectedUnit || item.product.unit;
                    const isConverted = item.conversionMultiplier && item.conversionMultiplier > 1;
                    const totalBaseQty = item.quantity * (item.conversionMultiplier || 1);
                    return (
                      <div key={idx} className="flex justify-between items-start">
                        <div className="flex-1 pr-2">
                          <div className="font-semibold text-stone-900">{item.product.name}</div>
                          <div className="text-[10px] text-stone-600">
                            {item.quantity} {itemUnit} × {formatRupiah(itemPrice)}
                            {isConverted && (
                              <span className="text-blue-700 font-bold ml-1">
                                (= {totalBaseQty} {item.product.unit} Satuan Dasar)
                              </span>
                            )}
                          </div>
                          {item.conversionDescription && (
                            <div className="text-[9px] text-stone-400 italic mt-0.5">
                              {item.conversionDescription}
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-stone-900">{formatRupiah(itemPrice * item.quantity)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing breakdown */}
                <div className="space-y-1 text-xs text-stone-600 pb-3 border-b border-dashed border-stone-300">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatRupiah(order.subtotal)}</span>
                  </div>
                  {order.deliveryType === 'delivery' && (
                    <div className="flex justify-between">
                      <span>Biaya Ongkir</span>
                      <span>{formatRupiah(order.deliveryFee)}</span>
                    </div>
                  )}
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Diskon Voucher</span>
                      <span>-{formatRupiah(order.discountAmount)}</span>
                    </div>
                  )}
                  {order.pointsUsed > 0 && (
                    <div className="flex justify-between text-amber-800 font-semibold">
                      <span>Potongan Poin Member</span>
                      <span>-{formatRupiah(order.pointsUsed)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-stone-900 pt-1">
                    <span>TOTAL BAYAR</span>
                    <span className="text-base text-blue-900">{formatRupiah(order.total)}</span>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="text-xs text-stone-600 space-y-1 pb-3 border-b border-dashed border-stone-300">
                  <div className="flex justify-between">
                    <span>Metode Pembayaran:</span>
                    <span className="font-bold text-stone-800 uppercase">{order.paymentMethod.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Poin Diperoleh:</span>
                    <span className="font-bold text-amber-700">+{order.pointsEarned} Poin Member</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Layanan:</span>
                    <span className="font-semibold text-stone-800">{order.deliveryType === 'delivery' ? 'Antar Kurir Instan' : 'Ambil di Toko'}</span>
                  </div>
                </div>

                {/* Barcode & Footer Messages */}
                <div className="text-center pt-2 flex flex-col items-center space-y-1.5">
                  {resolvedReceipt.showBarcode !== false && (
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-48 bg-stone-900 flex items-center justify-center text-white text-[10px] font-mono tracking-widest rounded select-none">
                        ||| | | |||| | ||| |||| |
                      </div>
                      <span className="text-[10px] font-mono text-stone-500 mt-1">{order.orderNumber}</span>
                    </div>
                  )}

                  <p className="text-[10px] text-stone-500 font-medium max-w-xs text-center leading-relaxed">
                    {resolvedReceipt.footerMessage1 || 'Struk ini adalah bukti pembayaran sah dari NusaMart Express.'}
                  </p>

                  {resolvedReceipt.footerMessage2 && (
                    <p className="text-[9px] text-stone-400 max-w-xs text-center leading-tight">
                      {resolvedReceipt.footerMessage2}
                    </p>
                  )}

                  {resolvedReceipt.csHotline && (
                    <p className="text-[9px] text-stone-400 font-semibold pt-0.5">
                      Layanan Pelanggan: <strong className="text-stone-600">{resolvedReceipt.csHotline}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Butuh bantuan? Hubungi CS 24 Jam: <strong>1500-888</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
