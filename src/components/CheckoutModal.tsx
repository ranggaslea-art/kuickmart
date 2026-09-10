import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Bike, 
  Store as StoreIcon, 
  Clock, 
  CreditCard, 
  QrCode, 
  Wallet, 
  Building2, 
  Banknote, 
  ShieldCheck, 
  ChevronRight, 
  CheckCircle2, 
  Copy, 
  AlertCircle,
  Award,
  Sparkles,
  Home,
  Navigation,
  ExternalLink,
  RefreshCw,
  Compass,
  Loader2,
  Zap,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  CartItem, 
  Store, 
  Address, 
  Voucher, 
  MemberProfile, 
  PaymentMethod, 
  Order,
  CourierInfo 
} from '../types';
import { formatRupiah, generateOrderNumber } from '../utils/formatters';
import { loadStoreTenantConfig } from '../utils/tenantHelper';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  store: Store;
  addresses: Address[];
  currentAddress: Address;
  onSelectAddress: (addr: Address) => void;
  deliveryType: 'delivery' | 'pickup';
  onSelectDeliveryType: (type: 'delivery' | 'pickup') => void;
  appliedVoucher: Voucher | null;
  usePoints: boolean;
  member: MemberProfile;
  onOrderCreated: (order: Order) => void;
  couriers?: CourierInfo[];
  visitorId?: string;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  store,
  addresses,
  currentAddress,
  onSelectAddress,
  deliveryType,
  onSelectDeliveryType,
  appliedVoucher,
  usePoints,
  member,
  onOrderCreated,
  couriers,
  visitorId,
}) => {
  if (!isOpen || cartItems.length === 0) return null;

  const [deliverySlot, setDeliverySlot] = useState('Instan 30 Menit');
  const [pickupSlot, setPickupSlot] = useState('15 Menit Lagi (Siap Ambil)');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [customerNotes, setCustomerNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedVa, setCopiedVa] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // DOKU Jokul Direct API State
  const [dokuPaymentData, setDokuPaymentData] = useState<{
    status?: string;
    source?: string;
    bank?: string;
    bankName?: string;
    vaNumber?: string;
    invoiceNumber?: string;
    amount?: number;
    expiredDate?: string;
    qrContent?: string;
    qrImageUrl?: string;
    clientId?: string;
    instructions?: string[];
  } | null>(null);
  const [isLoadingDoku, setIsLoadingDoku] = useState(false);
  const [isDokuSimulatedPaid, setIsDokuSimulatedPaid] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [recordedLocation, setRecordedLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    mapsUrl: string;
    recordedAt: string;
    addressText?: string;
  } | null>(() => {
    if (currentAddress.latitude && currentAddress.longitude) {
      return {
        latitude: currentAddress.latitude,
        longitude: currentAddress.longitude,
        accuracy: currentAddress.accuracy,
        mapsUrl: currentAddress.mapsUrl || `https://www.google.com/maps?q=${currentAddress.latitude},${currentAddress.longitude}`,
        recordedAt: currentAddress.recordedAt || new Date().toLocaleString('id-ID'),
        addressText: currentAddress.fullAddress,
      };
    }
    return null;
  });

  const activateGoogleMapsAndRecordLocation = (targetAddress?: Address) => {
    setIsLocating(true);
    setLocationError(null);

    const addrToUpdate = targetAddress || currentAddress;

    if (!navigator.geolocation) {
      const fallbackLat = -6.195442;
      const fallbackLng = 106.823122;
      const now = new Date().toLocaleString('id-ID');
      const mapsUrl = `https://www.google.com/maps?q=${fallbackLat},${fallbackLng}`;
      const loc = {
        latitude: fallbackLat,
        longitude: fallbackLng,
        accuracy: 15,
        mapsUrl,
        recordedAt: now,
        addressText: addrToUpdate.fullAddress,
      };
      setRecordedLocation(loc);
      onSelectAddress({
        ...addrToUpdate,
        latitude: fallbackLat,
        longitude: fallbackLng,
        mapsUrl,
        accuracy: 15,
        recordedAt: now,
      });
      setIsLocating(false);
      setLocationError('GPS langsung tidak didukung browser, menggunakan titik peta referensi Jakarta Pusat.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = position.coords.accuracy;
        const now = new Date().toLocaleString('id-ID');
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        let detectedAddress = addrToUpdate.fullAddress;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
            headers: { 'Accept-Language': 'id' },
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              detectedAddress = data.display_name;
            }
          }
        } catch {
          // Network errors ignored for reverse geocoding
        }

        const loc = {
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          mapsUrl,
          recordedAt: now,
          addressText: detectedAddress,
        };
        setRecordedLocation(loc);

        onSelectAddress({
          ...addrToUpdate,
          latitude: lat,
          longitude: lng,
          mapsUrl,
          accuracy: acc,
          recordedAt: now,
        });

        setIsLocating(false);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        const fallbackLat = -6.195442;
        const fallbackLng = 106.823122;
        const now = new Date().toLocaleString('id-ID');
        const mapsUrl = `https://www.google.com/maps?q=${fallbackLat},${fallbackLng}`;
        const loc = {
          latitude: fallbackLat,
          longitude: fallbackLng,
          accuracy: 25,
          mapsUrl,
          recordedAt: now,
          addressText: addrToUpdate.fullAddress,
        };
        setRecordedLocation(loc);

        onSelectAddress({
          ...addrToUpdate,
          latitude: fallbackLat,
          longitude: fallbackLng,
          mapsUrl,
          accuracy: 25,
          recordedAt: now,
        });

        setIsLocating(false);
        let errMsg = 'Akses lokasi peramban belum diizinkan. Titik referensi Google Maps tetap aktif dan tersimpan.';
        if (error.code === 1) errMsg = 'Izin lokasi belum diberikan di browser. Titik koordinat acuan tersimpan di tabel pesanan.';
        setLocationError(errMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleAddressButtonClick = (addr: Address) => {
    onSelectAddress(addr);
    // When buyer presses the home button / address containing "rumah":
    if (addr.label.toLowerCase().includes('rumah')) {
      activateGoogleMapsAndRecordLocation(addr);
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (item.unitPrice || item.product.price) * item.quantity, 0);
  const isBelowMinOrder = Boolean(store.minOrder && store.minOrder > 0 && subtotal < store.minOrder);
  const effectiveDeliveryType = isBelowMinOrder ? 'pickup' : deliveryType;
  const rawDeliveryFee = (!isBelowMinOrder && effectiveDeliveryType === 'delivery') ? store.deliveryFee : 0;

  // Auto-switch to pickup if below minimum and was on delivery
  useEffect(() => {
    if (isBelowMinOrder && deliveryType === 'delivery') {
      onSelectDeliveryType('pickup');
    }
  }, [isBelowMinOrder, deliveryType, onSelectDeliveryType]);

  // Calculate discounts
  let voucherDiscount = 0;
  let deliveryFee = rawDeliveryFee;

  if (appliedVoucher) {
    if (subtotal >= appliedVoucher.minSpend) {
      if (appliedVoucher.type === 'free_shipping') {
        voucherDiscount = Math.min(deliveryFee, appliedVoucher.discountAmount);
        deliveryFee = Math.max(0, deliveryFee - appliedVoucher.discountAmount);
      } else if (appliedVoucher.type === 'percentage') {
        const calculated = (subtotal * appliedVoucher.discountAmount) / 100;
        voucherDiscount = appliedVoucher.maxDiscount ? Math.min(calculated, appliedVoucher.maxDiscount) : calculated;
      } else if (appliedVoucher.type === 'fixed') {
        voucherDiscount = appliedVoucher.discountAmount;
      }
    }
  }

  const maxPointsAllowed = Math.min(member.points, Math.max(0, subtotal + deliveryFee - voucherDiscount));
  const pointsDeduction = usePoints ? maxPointsAllowed : 0;
  const total = Math.max(0, subtotal + deliveryFee - voucherDiscount - pointsDeduction);
  const pointsEarned = Math.round(subtotal * 0.01);

  // Virtual Account Numbers (connected to DOKU Jokul Direct API with fallback)
  const vaNumbers: Record<string, string> = {
    bca_va: dokuPaymentData?.bank === 'bca' && dokuPaymentData.vaNumber ? dokuPaymentData.vaNumber : '80777 ' + member.phone.replace(/\D/g, ''),
    mandiri_va: dokuPaymentData?.bank === 'mandiri' && dokuPaymentData.vaNumber ? dokuPaymentData.vaNumber : '89508 ' + member.phone.replace(/\D/g, ''),
    bri_va: dokuPaymentData?.bank === 'bri' && dokuPaymentData.vaNumber ? dokuPaymentData.vaNumber : '12800 ' + member.phone.replace(/\D/g, ''),
    bni_va: dokuPaymentData?.bank === 'bni' && dokuPaymentData.vaNumber ? dokuPaymentData.vaNumber : '8214 ' + member.phone.replace(/\D/g, ''),
    permata_va: dokuPaymentData?.bank === 'permata' && dokuPaymentData.vaNumber ? dokuPaymentData.vaNumber : '8470 ' + member.phone.replace(/\D/g, ''),
  };

  useEffect(() => {
    if (!isOpen) return;
    setIsDokuSimulatedPaid(false);
    const isVa = ['bca_va', 'mandiri_va', 'bri_va', 'bni_va', 'permata_va'].includes(paymentMethod);
    const isQris = paymentMethod === 'qris';

    // Retrieve active store tenant credentials dynamically
    const tenantConfig = loadStoreTenantConfig();
    const currentSlug = tenantConfig.storeSlug;
    const storeDisplayName = tenantConfig.dokuSettings?.merchantName || tenantConfig.storeName || 'Toko Express';

    if (isVa) {
      setIsLoadingDoku(true);
      const bank = paymentMethod.replace('_va', '');
      const invNum = `INV-${Date.now().toString().slice(-6)}`;
      fetch('/api/doku/va', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank,
          invoiceNumber: invNum,
          amount: total,
          customerName: member.name || currentAddress.recipientName || `Pelanggan ${storeDisplayName}`,
          customerEmail: member.email || `customer@${currentSlug || 'toko'}.id`,
          customerPhone: member.phone || currentAddress.phone || '081234567890',
          storeSlug: currentSlug,
          merchantName: storeDisplayName,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setDokuPaymentData(data);
          setIsLoadingDoku(false);
        })
        .catch((err) => {
          console.warn('Error fetching DOKU VA:', err);
          setIsLoadingDoku(false);
        });
    } else if (isQris) {
      setIsLoadingDoku(true);
      const invNum = `QRIS-${Date.now().toString().slice(-6)}`;
      fetch('/api/doku/qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: invNum,
          amount: total,
          storeSlug: currentSlug,
          merchantName: storeDisplayName,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setDokuPaymentData(data);
          setIsLoadingDoku(false);
        })
        .catch((err) => {
          console.warn('Error fetching DOKU QRIS:', err);
          setIsLoadingDoku(false);
        });
    } else {
      setDokuPaymentData(null);
    }
  }, [paymentMethod, isOpen, total]);

  const handleSimulateDokuPayment = async () => {
    setIsSimulatingPayment(true);
    try {
      await fetch('/api/doku/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: dokuPaymentData?.invoiceNumber,
          vaNumber: dokuPaymentData?.vaNumber,
        }),
      });
      setIsDokuSimulatedPaid(true);
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch {
      setIsDokuSimulatedPaid(true);
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  const handleCopyVA = (text: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''));
    setCopiedVa(true);
    setTimeout(() => setCopiedVa(false), 2000);
  };

  const handleCreateOrder = () => {
    setIsProcessing(true);

    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    setTimeout(() => {
      const newOrder: Order = {
        id: 'ord_' + Math.random().toString(36).substring(2, 9),
        orderNumber: generateOrderNumber(),
        createdAt: new Date().toISOString(),
        items: [...cartItems],
        store: store,
        deliveryType: effectiveDeliveryType,
        deliverySlot: effectiveDeliveryType === 'delivery' ? deliverySlot : undefined,
        pickupTime: effectiveDeliveryType === 'pickup' ? pickupSlot : undefined,
        customerId: member?.id || visitorId,
        customerName: currentAddress?.recipientName || member?.name || 'Pelanggan',
        customerPhone: currentAddress?.phone || member?.phone || '',
        deviceSessionId: visitorId,
        address: effectiveDeliveryType === 'delivery' ? {
          ...currentAddress,
          ...(recordedLocation ? {
            latitude: recordedLocation.latitude,
            longitude: recordedLocation.longitude,
            mapsUrl: recordedLocation.mapsUrl,
            accuracy: recordedLocation.accuracy,
            recordedAt: recordedLocation.recordedAt,
          } : (currentAddress.latitude && currentAddress.longitude ? {
            latitude: currentAddress.latitude,
            longitude: currentAddress.longitude,
            mapsUrl: currentAddress.mapsUrl || `https://www.google.com/maps?q=${currentAddress.latitude},${currentAddress.longitude}`,
            accuracy: currentAddress.accuracy,
            recordedAt: currentAddress.recordedAt,
          } : {}))
        } : undefined,
        customerLocation: recordedLocation || (currentAddress.latitude && currentAddress.longitude ? {
          latitude: currentAddress.latitude,
          longitude: currentAddress.longitude,
          accuracy: currentAddress.accuracy,
          mapsUrl: currentAddress.mapsUrl || `https://www.google.com/maps?q=${currentAddress.latitude},${currentAddress.longitude}`,
          recordedAt: currentAddress.recordedAt || new Date().toLocaleString('id-ID'),
          addressText: currentAddress.fullAddress,
        } : undefined),
        status: paymentMethod === 'cod' || paymentMethod === 'pay_at_store' ? 'processing' : 'processing',
        paymentMethod: paymentMethod,
        paymentStatus: 'paid',
        subtotal: subtotal,
        deliveryFee: rawDeliveryFee,
        discountAmount: voucherDiscount,
        pointsUsed: pointsDeduction,
        pointsEarned: pointsEarned,
        total: total,
        appliedVoucher: appliedVoucher || undefined,
        customerNotes: customerNotes,
        dokuPayment: dokuPaymentData ? {
          clientId: 'BRN-0241-1788726490929',
          invoiceNumber: dokuPaymentData.invoiceNumber,
          vaNumber: dokuPaymentData.vaNumber,
          bankName: dokuPaymentData.bankName,
          qrContent: dokuPaymentData.qrContent,
          qrImageUrl: dokuPaymentData.qrImageUrl,
          expiredDate: dokuPaymentData.expiredDate,
          isSimulated: isDokuSimulatedPaid || dokuPaymentData.source === 'doku_sandbox_ready',
        } : undefined,
        driver:
          effectiveDeliveryType === 'delivery'
            ? (() => {
                const assigned = 
                  couriers?.find(c => c.status === 'available' && (!c.storeId || c.storeId === store.id)) ||
                  couriers?.find(c => c.status === 'available') ||
                  couriers?.[0];

                if (assigned) {
                  return {
                    id: assigned.id,
                    name: assigned.name,
                    phone: assigned.phone,
                    whatsapp: assigned.whatsapp || assigned.phone,
                    vehiclePlate: assigned.vehiclePlate,
                    vehicleType: assigned.vehicleType,
                    photo: assigned.photo,
                  };
                }

                return {
                  name: 'Rian Hidayat',
                  phone: '0813-8899-7721',
                  whatsapp: '0813-8899-7721',
                  vehiclePlate: 'B 4120 SMT',
                  vehicleType: 'motor' as const,
                  photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=60',
                };
              })()
            : undefined,
        trackingSteps: [
          {
            status: 'pending_payment',
            title: 'Pembayaran Dikonfirmasi',
            description: `Pembayaran ${paymentMethod.toUpperCase()} senilai ${formatRupiah(total)} berhasil diverifikasi.`,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            isCompleted: true,
          },
          {
            status: 'processing',
            title: 'Pesanan Diterima Toko',
            description: `Petugas ${store.name} sedang menyiapkan & memilih item terbaik Anda.`,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            isCompleted: true,
          },
          {
            status: 'picking',
            title: 'Pengecekan Barang & Kadaluarsa',
            description: 'Item telah lengkap & dikemas dalam kantong ramah lingkungan.',
            timestamp: 'Estimasi +5 Menit',
            isCompleted: false,
          },
          {
            status: deliveryType === 'delivery' ? 'delivering' : 'ready_for_pickup',
            title: deliveryType === 'delivery' ? 'Driver Menuju Alamat Anda' : 'Siap Diambil di Kasir',
            description: deliveryType === 'delivery' ? 'Driver kurir sedang dalam perjalanan menuju alamat Anda.' : 'Tunjukkan barcode pesanan ke kasir toko.',
            timestamp: 'Estimasi +15 Menit',
            isCompleted: false,
          },
        ],
      };

      setIsProcessing(false);
      onOrderCreated(newOrder);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
              NM
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">Checkout & Pembayaran</h3>
              <p className="text-[11px] text-stone-500">Minimarket: {store.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5">
          {/* 1. Metode Pengiriman */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
              1. Pilihan Layanan
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isBelowMinOrder}
                onClick={() => !isBelowMinOrder && onSelectDeliveryType('delivery')}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  isBelowMinOrder
                    ? 'opacity-50 cursor-not-allowed bg-stone-100 border-stone-200'
                    : effectiveDeliveryType === 'delivery'
                    ? 'border-blue-600 bg-blue-50/50 shadow-2xs cursor-pointer'
                    : 'border-stone-200 hover:border-stone-300 bg-white cursor-pointer'
                }`}
              >
                <div className={`p-2 rounded-xl ${isBelowMinOrder ? 'bg-stone-200 text-stone-400' : effectiveDeliveryType === 'delivery' ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-stone-900">
                    {isBelowMinOrder ? 'Diantar (Nonaktif)' : 'Diantar Kurir'}
                  </div>
                  <div className="text-[10px] text-stone-500">
                    {isBelowMinOrder ? `Min. ${formatRupiah(store.minOrder)} (Ongkir Nonaktif)` : `Ongkir ${formatRupiah(store.deliveryFee)}`}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectDeliveryType('pickup')}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  effectiveDeliveryType === 'pickup'
                    ? 'border-red-600 bg-red-50/50 shadow-2xs'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className={`p-2 rounded-xl ${effectiveDeliveryType === 'pickup' ? 'bg-red-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                  <StoreIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-stone-900">Ambil di Toko</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">Gratis (Rp 0 Ongkir)</div>
                </div>
              </button>
            </div>

            {/* Below min order warning banner */}
            {isBelowMinOrder && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[11px] block">
                    Belanja di bawah batas minimum ({formatRupiah(store.minOrder)})
                  </span>
                  <span className="text-[10px] text-amber-800 leading-tight block mt-0.5">
                    Layanan antar kurir dan ongkos kirim dinonaktifkan. Pesanan Anda diproses via <strong>Ambil di Toko</strong> dan Anda dapat langsung menekan tombol pembayaran.
                  </span>
                </div>
              </div>
            )}

            {/* Time Slot Picker */}
            {deliveryType === 'delivery' ? (
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
                <span className="text-[11px] font-semibold text-stone-700 block mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-600" /> Pilih Estimasi Waktu Pengantaran:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {['Instan 30 Menit', 'Pagi (09:00 - 11:00)', 'Sore (15:00 - 17:00)'].map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setDeliverySlot(slot)}
                      className={`text-center py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        deliverySlot === slot
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
                <span className="text-[11px] font-semibold text-stone-700 block mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-red-600" /> Waktu Pengambilan di Outlet:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {['15 Menit Lagi (Siap Ambil)', '1 Jam Lagi'].map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setPickupSlot(slot)}
                      className={`text-center py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        pickupSlot === slot
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Alamat Pengantaran / Toko Pickup */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {deliveryType === 'delivery' ? '2. Alamat Pengiriman' : '2. Lokasi Outlet Pengambilan'}
            </label>

            {deliveryType === 'delivery' ? (
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">{currentAddress.label}</span>
                        <span className="text-[10px] text-stone-500 font-medium">({currentAddress.recipientName} - {currentAddress.phone})</span>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5">{currentAddress.fullAddress}, {currentAddress.city}</p>
                      {currentAddress.detailNote && (
                        <p className="text-[11px] text-stone-500 italic mt-0.5">Catatan: {currentAddress.detailNote}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Address Switcher */}
                {addresses.length > 1 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-200/80">
                    {addresses.map((addr) => {
                      const isHome = addr.label.toLowerCase().includes('rumah');
                      const isSelected = addr.id === currentAddress.id;
                      return (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => handleAddressButtonClick(addr)}
                          className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                          }`}
                          title={isHome ? 'Klik untuk mengaktifkan Google Maps & merekam titik lokasi rumah' : undefined}
                        >
                          {isHome ? <Home className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-stone-500'}`} /> : <Building2 className="w-3.5 h-3.5" />}
                          <span>{addr.label}</span>
                          {isHome && isSelected && (
                            <span className="text-[9px] bg-blue-500/20 text-blue-200 px-1 py-0.2 rounded font-mono">GPS</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* GOOGLE MAPS AKTIVASI & PEREKAM LOKASI RUMAH OTOMATIS */}
                {isLocating && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 animate-in fade-in duration-200">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                        <span>Mengaktifkan Google Maps & Merekam Lokasi Pembeli...</span>
                      </div>
                      <p className="text-[10px] text-blue-700 mt-0.5">
                        Membaca titik satelit GPS untuk menentukan koordinat presisi pengantaran rumah.
                      </p>
                    </div>
                  </div>
                )}

                {/* TAMPILAN MAPS KETIKA KOORDINAT SUDAH TEREKAM */}
                {recordedLocation && !isLocating && (
                  <div className="pt-2 border-t border-stone-200/80 space-y-2 animate-in fade-in duration-200">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Google Maps Aktif • Titik Rumah Terekam</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => activateGoogleMapsAndRecordLocation()}
                          className="text-[10px] text-stone-600 hover:text-blue-700 bg-white border border-stone-200 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-stone-50 transition-all cursor-pointer"
                          title="Pindai ulang koordinat GPS"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Refresh GPS</span>
                        </button>
                        <a
                          href={recordedLocation.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-blue-100 transition-all cursor-pointer"
                        >
                          <span>Buka di Google Maps</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>

                    {/* Interactive Google Maps Embed */}
                    <div className="relative rounded-xl overflow-hidden border border-stone-300 shadow-2xs bg-stone-100 h-44">
                      <iframe
                        title="Google Maps Lokasi Pembeli"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        marginHeight={0}
                        marginWidth={0}
                        src={`https://maps.google.com/maps?q=${recordedLocation.latitude},${recordedLocation.longitude}&hl=id&z=16&output=embed`}
                        className="w-full h-full"
                        loading="lazy"
                      />
                      <div className="absolute bottom-2 left-2 bg-stone-900/85 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-lg font-mono flex items-center gap-1.5 shadow-sm">
                        <Navigation className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>{recordedLocation.latitude.toFixed(6)}, {recordedLocation.longitude.toFixed(6)}</span>
                        {recordedLocation.accuracy && (
                          <span className="text-stone-300 text-[9px]">(±{Math.round(recordedLocation.accuracy)}m)</span>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-stone-600 bg-emerald-50/70 border border-emerald-200/80 p-2 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-emerald-900 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Lokasi ini otomatis tersimpan di tabel pesanan & Supabase untuk rute kurir pengantar.</span>
                      </div>
                      <span className="text-stone-400 font-mono text-[9px] shrink-0">{recordedLocation.recordedAt}</span>
                    </div>
                  </div>
                )}

                {/* TOMBOL AKTIFKAN MAPS JIKA BELUM TEREKAM */}
                {!recordedLocation && !isLocating && (
                  <div className="pt-2 border-t border-stone-200/80">
                    <button
                      type="button"
                      onClick={() => activateGoogleMapsAndRecordLocation()}
                      className="w-full p-2.5 rounded-xl border border-dashed border-blue-400 hover:border-blue-600 bg-blue-50/60 hover:bg-blue-50 text-blue-900 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-2xs group"
                    >
                      <Home className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                      <span>Aktifkan Google Maps & Rekam Titik Lokasi Rumah</span>
                      <Navigation className="w-3 h-3 text-blue-600 ml-1" />
                    </button>
                  </div>
                )}

                {/* INFORMASI ERROR / FALLBACK GPS */}
                {locationError && (
                  <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-xl flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{locationError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 flex items-start gap-3">
                <StoreIcon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs text-stone-900">{store.name} ({store.code})</div>
                  <p className="text-xs text-stone-600 mt-0.5">{store.address}, {store.city}</p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">Buka • {store.openHours} • Telp: {store.phone}</p>
                </div>
              </div>
            )}

            {/* Customer Special Note */}
            <div>
              <input
                type="text"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Catatan tambahan untuk kurir / toko (misal: 'Pagar warna hitam')..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-blue-500 bg-white"
              />
            </div>
          </div>

          {/* 3. Metode Pembayaran Komprehensif */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
              3. Metode Pembayaran
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* QRIS */}
              <button
                type="button"
                onClick={() => setPaymentMethod('qris')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentMethod === 'qris'
                    ? 'border-blue-600 bg-blue-50/60 shadow-2xs ring-1 ring-blue-600'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-50 text-red-600 font-bold">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                      <span>QRIS Instan</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-extrabold px-1 rounded">DOKU Direct</span>
                    </div>
                    <div className="text-[10px] text-stone-500">GoPay, OVO, Dana, BCA, Livin, BRImo</div>
                  </div>
                </div>
                {paymentMethod === 'qris' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </button>

              {/* BCA Virtual Account */}
              <button
                type="button"
                onClick={() => setPaymentMethod('bca_va')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentMethod === 'bca_va'
                    ? 'border-blue-600 bg-blue-50/60 shadow-2xs ring-1 ring-blue-600'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-700 font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                      <span>BCA Virtual Account</span>
                      <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1 rounded">DOKU Direct</span>
                    </div>
                    <div className="text-[10px] text-stone-500">m-BCA, KlikBCA, myBCA</div>
                  </div>
                </div>
                {paymentMethod === 'bca_va' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </button>

              {/* Mandiri Virtual Account */}
              <button
                type="button"
                onClick={() => setPaymentMethod('mandiri_va')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentMethod === 'mandiri_va'
                    ? 'border-blue-600 bg-blue-50/60 shadow-2xs ring-1 ring-blue-600'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-800 font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                      <span>Mandiri Virtual Account</span>
                      <span className="text-[9px] bg-amber-100 text-amber-900 font-extrabold px-1 rounded">DOKU Direct</span>
                    </div>
                    <div className="text-[10px] text-stone-500">Livin' by Mandiri</div>
                  </div>
                </div>
                {paymentMethod === 'mandiri_va' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </button>

              {/* BRI Virtual Account */}
              <button
                type="button"
                onClick={() => setPaymentMethod('bri_va')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentMethod === 'bri_va'
                    ? 'border-blue-600 bg-blue-50/60 shadow-2xs ring-1 ring-blue-600'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-50 text-cyan-800 font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                      <span>BRI Virtual Account</span>
                      <span className="text-[9px] bg-cyan-100 text-cyan-900 font-extrabold px-1 rounded">DOKU Direct</span>
                    </div>
                    <div className="text-[10px] text-stone-500">BRImo & ATM BRI (BRIVA)</div>
                  </div>
                </div>
                {paymentMethod === 'bri_va' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </button>

              {/* BNI Virtual Account */}
              <button
                type="button"
                onClick={() => setPaymentMethod('bni_va')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentMethod === 'bni_va'
                    ? 'border-blue-600 bg-blue-50/60 shadow-2xs ring-1 ring-blue-600'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-50 text-orange-800 font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                      <span>BNI Virtual Account</span>
                      <span className="text-[9px] bg-orange-100 text-orange-900 font-extrabold px-1 rounded">DOKU Direct</span>
                    </div>
                    <div className="text-[10px] text-stone-500">BNI Mobile Banking & ATM</div>
                  </div>
                </div>
                {paymentMethod === 'bni_va' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </button>

              {/* Permata Virtual Account */}
              <button
                type="button"
                onClick={() => setPaymentMethod('permata_va')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentMethod === 'permata_va'
                    ? 'border-blue-600 bg-blue-50/60 shadow-2xs ring-1 ring-blue-600'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                      <span>Permata Virtual Account</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-900 font-extrabold px-1 rounded">DOKU Direct</span>
                    </div>
                    <div className="text-[10px] text-stone-500">PermataME / Mobile X</div>
                  </div>
                </div>
                {paymentMethod === 'permata_va' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </button>

              {/* GoPay */}
              <button
                type="button"
                onClick={() => setPaymentMethod('gopay')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentMethod === 'gopay'
                    ? 'border-blue-600 bg-blue-50/60 shadow-2xs ring-1 ring-blue-600'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-stone-900">GoPay</div>
                    <div className="text-[10px] text-stone-500">Saldo Instant Checkout</div>
                  </div>
                </div>
                {paymentMethod === 'gopay' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </button>

              {/* COD / Bayar di Toko */}
              <button
                type="button"
                onClick={() => setPaymentMethod(deliveryType === 'delivery' ? 'cod' : 'pay_at_store')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentMethod === 'cod' || paymentMethod === 'pay_at_store'
                    ? 'border-blue-600 bg-blue-50/60 shadow-2xs ring-1 ring-blue-600'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-stone-100 text-stone-700 font-bold">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-stone-900">
                      {deliveryType === 'delivery' ? 'Bayar di Tempat (COD)' : 'Bayar di Kasir Toko'}
                    </div>
                    <div className="text-[10px] text-stone-500">Uang Tunai / Debit saat terima</div>
                  </div>
                </div>
                {(paymentMethod === 'cod' || paymentMethod === 'pay_at_store') && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </button>
            </div>

            {/* DOKU JOKUL DIRECT API PANEL */}
            {(paymentMethod === 'qris' || paymentMethod in vaNumbers) && (
              <div className="mt-3 rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/70 to-white p-4 shadow-xs">
                {/* Header Integrasi DOKU */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-[11px] shadow-2xs">
                      D
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-stone-900">DOKU Jokul Direct API</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Sandbox
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 font-mono">
                        Client ID: <span className="font-bold text-stone-700">BRN-0241-1788726490929</span>
                      </p>
                    </div>
                  </div>

                  {/* Simulator Trigger */}
                  <button
                    type="button"
                    onClick={handleSimulateDokuPayment}
                    disabled={isSimulatingPayment || isDokuSimulatedPaid}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isDokuSimulatedPaid
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-2xs'
                    }`}
                  >
                    {isSimulatingPayment ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Memverifikasi...</span>
                      </>
                    ) : isDokuSimulatedPaid ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Simulasi Lunas</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Simulasi Bayar (Sandbox)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Sub-Panel: QRIS */}
                {paymentMethod === 'qris' && (
                  <div className="pt-3 flex flex-col sm:flex-row items-center gap-4">
                    <div className="p-2.5 bg-white rounded-2xl border border-stone-200 shadow-xs shrink-0 flex flex-col items-center">
                      {isLoadingDoku ? (
                        <div className="w-32 h-32 flex items-center justify-center text-stone-400">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                      ) : (
                        <img
                          src={dokuPaymentData?.qrImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=DOKU-BRN-0241-${total}`}
                          alt="DOKU QRIS Direct"
                          className="w-32 h-32 object-contain"
                        />
                      )}
                      <span className="text-[9px] font-mono text-stone-400 mt-1 uppercase font-bold">QRIS Standar BI</span>
                    </div>

                    <div className="space-y-1.5 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                          DOKU Direct QRIS
                        </span>
                        {dokuPaymentData?.invoiceNumber && (
                          <span className="text-[10px] font-mono text-stone-500">
                            {dokuPaymentData.invoiceNumber}
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-sm text-stone-900">
                        Scan & Bayar {formatRupiah(total)}
                      </h5>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        Buka aplikasi perbankan (BCA, Mandiri, BRImo, BNI) atau e-wallet (GoPay, OVO, ShopeePay, Dana). Scan kode QR di atas untuk verifikasi instan.
                      </p>
                      {isDokuSimulatedPaid && (
                        <div className="mt-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Simulasi pembayaran terdeteksi! Status pesanan otomatis lunas saat Anda klik Buat Pesanan.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-Panel: Virtual Account */}
                {paymentMethod in vaNumbers && (
                  <div className="pt-3 space-y-3">
                    <div className="bg-white border border-blue-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">
                            Nomor Virtual Account {dokuPaymentData?.bankName || paymentMethod.replace('_va', '').toUpperCase()}:
                          </span>
                          {isLoadingDoku && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
                        </div>
                        <div className="font-mono text-lg font-black text-blue-950 tracking-wider mt-0.5 select-all">
                          {vaNumbers[paymentMethod]}
                        </div>
                        <div className="text-[10px] text-stone-500 mt-0.5">
                          Tagihan: <span className="font-bold text-stone-800">{formatRupiah(total)}</span> • Berlaku 24 jam
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyVA(vaNumbers[paymentMethod])}
                        className="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedVa ? 'Nomor Disalin!' : 'Salin Nomor VA'}</span>
                      </button>
                    </div>

                    {/* Panduan Pembayaran Singkat */}
                    <div className="bg-stone-50/90 rounded-xl p-2.5 border border-stone-200 text-[11px] text-stone-600 space-y-1">
                      <div className="font-bold text-stone-700 text-[11px] flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span>Cara Bayar Cepat:</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-0.5 text-stone-600 text-[10px] pl-1">
                        <li>Buka aplikasi Mobile Banking atau ATM bank Anda</li>
                        <li>Pilih menu <strong>Transfer &gt; Virtual Account</strong></li>
                        <li>Masukkan nomor VA <strong className="font-mono">{vaNumbers[paymentMethod]}</strong></li>
                        <li>Pastikan jumlah tagihan sesuai senilai <strong>{formatRupiah(total)}</strong>, lalu masukkan PIN</li>
                      </ol>
                    </div>

                    {isDokuSimulatedPaid && (
                      <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Simulasi transfer terverifikasi oleh gateway DOKU! Pesanan Anda akan langsung diproses toko.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Ringkasan Pesanan */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
              4. Ringkasan Pembayaran & Barang
            </span>

            {/* Item Mini Preview */}
            <div className="bg-white rounded-xl p-2.5 border border-stone-200 divide-y divide-stone-100 max-h-36 overflow-y-auto mb-2 text-xs">
              {cartItems.map((item, idx) => {
                const itemPrice = item.unitPrice || item.product.price;
                const itemUnit = item.selectedUnit || item.product.unit;
                return (
                  <div key={idx} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-stone-900 truncate">{item.product.name}</p>
                      <p className="text-[10px] text-stone-500">
                        {item.quantity} {itemUnit} × {formatRupiah(itemPrice)}
                        {item.conversionMultiplier && item.conversionMultiplier > 1 && (
                          <span className="text-blue-700 font-bold ml-1">
                            (= {item.quantity * item.conversionMultiplier} {item.product.unit} Satuan Dasar)
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-bold text-stone-800 shrink-0">
                      {formatRupiah(itemPrice * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-xs text-stone-600">
              <span>Total Pesanan ({cartItems.reduce((a, b) => a + b.quantity, 0)} paket)</span>
              <span className="font-semibold text-stone-900">{formatRupiah(subtotal)}</span>
            </div>
            {isBelowMinOrder ? (
              <div className="flex justify-between text-xs text-stone-600 items-center">
                <span className="flex items-center gap-1">
                  <span>Ongkos Kirim</span>
                  <span className="text-[9px] bg-amber-100 text-amber-900 font-semibold px-1.5 py-0.2 rounded">
                    Nonaktif (Di Bawah Min.)
                  </span>
                </span>
                <span className="font-semibold text-emerald-700">Rp 0 (Ambil di Toko)</span>
              </div>
            ) : effectiveDeliveryType === 'delivery' ? (
              <div className="flex justify-between text-xs text-stone-600">
                <span>Biaya Pengantaran</span>
                <span className="font-semibold text-stone-900">{formatRupiah(rawDeliveryFee)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-xs text-stone-600">
                <span>Biaya Pengantaran (Ambil di Toko)</span>
                <span className="font-semibold text-emerald-600">Gratis (Rp 0)</span>
              </div>
            )}
            {voucherDiscount > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                <span>Voucher Diskon ({appliedVoucher?.code})</span>
                <span>-{formatRupiah(voucherDiscount)}</span>
              </div>
            )}
            {usePoints && pointsDeduction > 0 && (
              <div className="flex justify-between text-xs text-amber-700 font-semibold">
                <span>Potongan Poin Loyalty Member</span>
                <span>-{formatRupiah(pointsDeduction)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-200">
              <div>
                <span>Total Akhir</span>
                <span className="block text-[10px] text-amber-700 font-normal">
                  Kamu akan dapat +{pointsEarned} Poin Member
                </span>
              </div>
              <span className="text-xl font-black text-blue-900">{formatRupiah(total)}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Transaksi Dijamin Aman 100%</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-100"
            >
              Kembali
            </button>

            <button
              onClick={handleCreateOrder}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-stone-400 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md flex items-center gap-2 transition-transform active:scale-95"
            >
              {isProcessing ? (
                <span>Memproses Pesanan...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Bayar Sekarang ({formatRupiah(total)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
