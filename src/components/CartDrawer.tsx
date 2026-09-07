import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  Ticket, 
  Award, 
  ArrowRight, 
  Truck, 
  ShoppingBag, 
  AlertCircle, 
  Check,
  Percent
} from 'lucide-react';
import { CartItem, Voucher, MemberProfile, Store } from '../types';
import { formatRupiah } from '../utils/formatters';
import { formatImageUrl, getProductFallbackImage } from '../utils/imageHelper';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  member: MemberProfile;
  appliedVoucher: Voucher | null;
  onApplyVoucher: (voucher: Voucher | null) => void;
  availableVouchers: Voucher[];
  usePoints: boolean;
  onToggleUsePoints: (use: boolean) => void;
  onProceedToCheckout: () => void;
  store: Store;
  deliveryType: 'delivery' | 'pickup';
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  member,
  appliedVoucher,
  onApplyVoucher,
  availableVouchers,
  usePoints,
  onToggleUsePoints,
  onProceedToCheckout,
  store,
  deliveryType,
}) => {
  if (!isOpen) return null;

  const [customCouponInput, setCustomCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [showVoucherList, setShowVoucherList] = useState(false);

  const subtotal = cartItems.reduce((acc, item) => acc + (item.unitPrice || item.product.price) * item.quantity, 0);
  const rawDeliveryFee = deliveryType === 'delivery' ? store.deliveryFee : 0;

  // Free shipping threshold
  const freeShippingThreshold = 30000;
  const progressToFreeShipping = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  // Voucher Calculation
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

  // Member Points Calculation (1 point = Rp 1)
  const maxPointsAllowed = Math.min(member.points, Math.max(0, subtotal + deliveryFee - voucherDiscount));
  const pointsDeduction = usePoints ? maxPointsAllowed : 0;

  const total = Math.max(0, subtotal + deliveryFee - voucherDiscount - pointsDeduction);
  const pointsEarned = Math.round(subtotal * 0.01);

  const handleApplyCustomCode = () => {
    setCouponError('');
    const code = customCouponInput.trim().toUpperCase();
    if (!code) return;

    const matched = availableVouchers.find((v) => v.code.toUpperCase() === code);
    if (matched) {
      if (subtotal < matched.minSpend) {
        setCouponError(`Min. belanja untuk kode ini adalah ${formatRupiah(matched.minSpend)}`);
        return;
      }
      onApplyVoucher(matched);
      setCustomCouponInput('');
      setShowVoucherList(false);
    } else {
      setCouponError('Kode voucher tidak ditemukan atau sudah kadaluarsa.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/60 backdrop-blur-xs flex justify-end">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-stone-900">
              Keranjang Belanja ({cartItems.reduce((a, b) => a + b.quantity, 0)})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {cartItems.length > 0 && (
              <button
                onClick={onClearCart}
                className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1"
              >
                Kosongkan
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Free Shipping Progress Bar */}
        {deliveryType === 'delivery' && (
          <div className="bg-gradient-to-r from-blue-50 to-emerald-50 px-4 py-2.5 border-b border-stone-100">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-800 mb-1.5">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                {remainingForFreeShipping === 0 ? (
                  <span className="text-emerald-700 font-bold">Selamat! Kamu Mendapat Gratis Ongkir</span>
                ) : (
                  <span>Tambah <strong className="text-blue-700">{formatRupiah(remainingForFreeShipping)}</strong> lagi untuk Gratis Ongkir</span>
                )}
              </div>
              <span className="text-[11px] text-stone-500 font-mono">{Math.round(progressToFreeShipping)}%</span>
            </div>
            <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${progressToFreeShipping}%` }}
              />
            </div>
          </div>
        )}

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mb-3">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-stone-800 mb-1">Keranjangmu Masih Kosong</h4>
              <p className="text-xs text-stone-500 max-w-xs mb-4">
                Yuk jelajahi produk kebutuhan dapur, promo JSM, dan cemilan favoritmu!
              </p>
              <button
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-xs"
              >
                Mulai Belanja Sekarang
              </button>
            </div>
          ) : (
            cartItems.map((item) => {
              const itemKey = item.cartItemId || item.product.id;
              const displayPrice = item.unitPrice || item.product.price;
              const displayUnit = item.selectedUnit || item.product.unit;
              return (
                <div
                  key={itemKey}
                  className="bg-white border border-stone-200 rounded-2xl p-3 flex items-center gap-3 shadow-2xs"
                >
                  <img
                    src={formatImageUrl(item.product.image)}
                    alt={item.product.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getProductFallbackImage(item.product.name, item.product.category);
                    }}
                    className="w-14 h-14 object-cover rounded-xl bg-stone-50 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-stone-900 truncate">{item.product.name}</h5>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                        {displayUnit}
                      </span>
                      <span className="text-xs font-black text-blue-900">{formatRupiah(displayPrice)}</span>
                    </div>

                    {item.conversionMultiplier && item.conversionMultiplier > 1 ? (
                      <div className="mt-1">
                        <div className="text-[10px] font-bold text-blue-800 bg-blue-50/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <span>
                            {item.quantity} {displayUnit} = Total <strong>{item.quantity * item.conversionMultiplier} {item.product.unit}</strong>
                          </span>
                        </div>
                        {item.conversionDescription && (
                          <p className="text-[9px] text-stone-500 line-clamp-1 mt-0.5 pl-0.5">
                            {item.conversionDescription}
                          </p>
                        )}
                      </div>
                    ) : (
                      item.conversionDescription && (
                        <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                          {item.conversionDescription}
                        </p>
                      )
                    )}

                    {item.notes && (
                      <p className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 truncate">
                        Catatan: {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      onClick={() => onRemoveItem(itemKey)}
                      className="text-stone-400 hover:text-red-600 p-1 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                      <button
                        onClick={() => onUpdateQuantity(itemKey, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-white text-stone-700 hover:bg-stone-50 flex items-center justify-center text-xs font-bold shadow-2xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold px-1.5">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(itemKey, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="w-6 h-6 rounded bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 flex items-center justify-center text-xs font-bold shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Section: Vouchers, Loyalty, Breakdown, and Checkout Button */}
        {cartItems.length > 0 && (
          <div className="p-4 border-t border-stone-200 bg-stone-50/70 space-y-3">
            {/* Voucher Selector Accordion */}
            <div className="bg-white rounded-xl border border-stone-200 p-2.5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowVoucherList(!showVoucherList)}
                  className="flex items-center gap-2 text-xs font-bold text-stone-800 text-left flex-1"
                >
                  <Ticket className="w-4 h-4 text-red-500 shrink-0" />
                  <div className="truncate">
                    {appliedVoucher ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> {appliedVoucher.code} ({appliedVoucher.title})
                      </span>
                    ) : (
                      <span>Gunakan Voucher Promo / Diskon</span>
                    )}
                  </div>
                </button>
                {appliedVoucher ? (
                  <button
                    onClick={() => onApplyVoucher(null)}
                    className="text-[11px] text-red-600 font-semibold hover:underline shrink-0 ml-2"
                  >
                    Batal
                  </button>
                ) : (
                  <button
                    onClick={() => setShowVoucherList(!showVoucherList)}
                    className="text-[11px] text-blue-600 font-semibold hover:underline shrink-0 ml-2"
                  >
                    {showVoucherList ? 'Tutup' : 'Pilih'}
                  </button>
                )}
              </div>

              {/* Voucher Input & List */}
              {showVoucherList && (
                <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={customCouponInput}
                      onChange={(e) => setCustomCouponInput(e.target.value)}
                      placeholder="Masukkan kode kupon..."
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 focus:outline-hidden uppercase font-mono"
                    />
                    <button
                      onClick={handleApplyCustomCode}
                      className="bg-stone-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-black"
                    >
                      Terapkan
                    </button>
                  </div>
                  {couponError && <p className="text-[10px] text-red-600 font-medium">{couponError}</p>}

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                    {availableVouchers.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => {
                          if (subtotal >= v.minSpend) {
                            onApplyVoucher(v);
                            setShowVoucherList(false);
                          }
                        }}
                        className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          appliedVoucher?.id === v.id
                            ? 'border-emerald-500 bg-emerald-50/50'
                            : subtotal >= v.minSpend
                            ? 'border-stone-200 hover:border-blue-300 bg-white'
                            : 'border-stone-100 bg-stone-100 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-stone-800">
                          <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{v.code}</span>
                          <span className="text-[10px] text-stone-500">Min. {formatRupiah(v.minSpend)}</span>
                        </div>
                        <p className="text-[11px] text-stone-600 mt-0.5">{v.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Member Points Toggle */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-amber-950">
                    Tukar Poin Member ({member.points.toLocaleString('id-ID')} Poin)
                  </div>
                  <div className="text-[10px] text-amber-800">
                    Gunakan {formatRupiah(maxPointsAllowed)} untuk hemat belanja
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={usePoints}
                  onChange={(e) => onToggleUsePoints(e.target.checked)}
                  disabled={member.points === 0}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-1 text-xs text-stone-600 pt-1">
              <div className="flex justify-between">
                <span>Subtotal Produk</span>
                <span className="font-semibold text-stone-900">{formatRupiah(subtotal)}</span>
              </div>
              {deliveryType === 'delivery' && (
                <div className="flex justify-between">
                  <span>Ongkos Kirim ({store.distanceKm} km)</span>
                  <span className="font-semibold text-stone-900">{formatRupiah(rawDeliveryFee)}</span>
                </div>
              )}
              {voucherDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Diskon Voucher ({appliedVoucher?.code})</span>
                  <span>-{formatRupiah(voucherDiscount)}</span>
                </div>
              )}
              {usePoints && pointsDeduction > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span>Potongan Poin Member</span>
                  <span>-{formatRupiah(pointsDeduction)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-900 font-bold text-sm pt-2 border-t border-stone-200">
                <div>
                  <span>Total Pembayaran</span>
                  <span className="block text-[10px] text-amber-700 font-normal flex items-center gap-1">
                    <Award className="w-3 h-3" /> Dapat +{pointsEarned} Poin
                  </span>
                </div>
                <span className="text-lg font-black text-blue-900">{formatRupiah(total)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={onProceedToCheckout}
              disabled={subtotal < store.minOrder}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 text-white font-bold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98"
            >
              <span>Lanjut ke Pembayaran</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {subtotal < store.minOrder && (
              <p className="text-[10px] text-red-600 text-center font-medium">
                Minimal belanja di toko ini adalah {formatRupiah(store.minOrder)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
