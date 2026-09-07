import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Star, 
  Plus, 
  Minus, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Barcode, 
  Award, 
  ShoppingBag,
  CheckCircle2,
  Boxes,
  Sparkles
} from 'lucide-react';
import { Product } from '../types';
import { formatRupiah } from '../utils/formatters';
import { getProductUnitOptions, formatStockBreakdown } from '../utils/unitConversion';
import { formatImageUrl, getProductFallbackImage } from '../utils/imageHelper';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  quantityInCart: number;
  onAddToCart: (
    product: Product, 
    quantity: number, 
    notes?: string,
    unitOption?: { unitName: string; price: number; multiplier: number; breakdownText: string }
  ) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  quantityInCart,
  onAddToCart,
}) => {
  if (!product) return null;

  const unitOptions = useMemo(() => getProductUnitOptions(product), [product]);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number>(0);
  const selectedOption = unitOptions[selectedUnitIndex] || unitOptions[0];

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isAdded, setIsAdded] = useState(false);

  // Maximum allowed order based on base stock converted to this unit
  const maxStockForSelectedUnit = Math.max(1, Math.floor(product.stock / (selectedOption.multiplier || 1)));

  const currentPrice = selectedOption.price;
  const currentOriginalPrice = selectedOption.originalPrice;
  const pointsEarned = Math.round(currentPrice * 0.01 * quantity);

  const [imgSrc, setImgSrc] = useState<string>(() => formatImageUrl(product.image));
  const [hasFallback, setHasFallback] = useState(false);

  useEffect(() => {
    setImgSrc(formatImageUrl(product.image));
    setHasFallback(false);
  }, [product.image]);

  const handleImgError = () => {
    if (!hasFallback) {
      setHasFallback(true);
      setImgSrc(getProductFallbackImage(product.name, product.category));
    }
  };

  const stockInfo = useMemo(() => {
    return formatStockBreakdown(product.stock, product.unit, product.unitConversions);
  }, [product]);

  const handleAdd = () => {
    onAddToCart(product, quantity, notes, selectedOption);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
              {product.brand}
            </span>
            <span className="text-xs text-stone-500 font-mono flex items-center gap-1">
              <Barcode className="w-3.5 h-3.5" />
              {selectedOption.barcode || product.barcode}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
          {/* Image & Guarantee */}
          <div>
            <div className="aspect-square rounded-2xl bg-stone-50 border border-stone-100 overflow-hidden relative mb-4">
              <img
                src={imgSrc}
                alt={product.name}
                onError={handleImgError}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              {selectedOption.savingsPercent && selectedOption.savingsPercent > 0 ? (
                <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm">
                  HEMAT {selectedOption.savingsPercent}% (GROSIR)
                </span>
              ) : null}
            </div>

            <div className="space-y-2 text-xs text-stone-600 bg-stone-50 p-3 rounded-2xl border border-stone-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Produk Original Minimarket</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Pengiriman Cepat 30 Menit / Ambil di Toko</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Garansi Segar & Kadaluarsa Panjang</span>
              </div>
            </div>
          </div>

          {/* Details & Action */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{product.rating}</span>
                </div>
                <span className="text-xs text-stone-400">• Terjual {product.soldCount.toLocaleString('id-ID')}</span>
              </div>

              <h2 className="text-lg font-bold text-stone-900 leading-snug mb-2">
                {product.name}
              </h2>

              {/* Multi-Unit Selection Pills */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pilih Satuan Pembelian:</span>
                  </label>
                  {unitOptions.length > 1 && (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      Tersedia {unitOptions.length} Satuan
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {unitOptions.map((opt, idx) => {
                    const isSelected = selectedUnitIndex === idx;
                    return (
                      <button
                        key={opt.unitName + idx}
                        type="button"
                        onClick={() => {
                          setSelectedUnitIndex(idx);
                          setQuantity(1);
                        }}
                        className={`p-2.5 rounded-xl text-left border transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/80 shadow-xs ring-1 ring-blue-600'
                            : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-xs ${isSelected ? 'text-blue-900' : 'text-stone-800'}`}>
                            {opt.unitName}
                          </span>
                          {opt.savingsPercent ? (
                            <span className="text-[9px] font-extrabold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                              -{opt.savingsPercent}%
                            </span>
                          ) : opt.isBase ? (
                            <span className="text-[9px] font-semibold bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded">
                              Eceran
                            </span>
                          ) : null}
                        </div>
                        <div className="font-extrabold text-xs text-blue-800 mt-1">
                          {formatRupiah(opt.price)}
                        </div>
                        <div className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                          {opt.breakdownText}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conversion Formula Breakdown Card */}
              {product.unitConversions && product.unitConversions.length > 0 && (
                <div className="mb-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Rumus Konversi Satuan Bertingkat:</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-amber-950 font-medium">
                    {product.unitConversions.map((conv, cIdx) => (
                      <div key={conv.id || cIdx} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{conv.description || `1 ${conv.unitName} = ${conv.containsQty} ${conv.containsUnit}`}</span>
                        {conv.price && (
                          <span className="text-[10px] text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded font-semibold ml-auto shrink-0">
                            {formatRupiah(conv.price)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Stock inventory in terms of packages */}
                  <div className="mt-2 pt-2 border-t border-amber-200/60 text-[10px] text-amber-800 flex items-center justify-between">
                    <span>Total Stok Gudang:</span>
                    <strong className="font-bold">{stockInfo.text}</strong>
                  </div>
                </div>
              )}

              {/* Price Display */}
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 mb-4">
                {currentOriginalPrice && currentOriginalPrice > currentPrice && (
                  <div className="text-xs text-stone-400 line-through">
                    {formatRupiah(currentOriginalPrice)}
                  </div>
                )}
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-blue-900">
                      {formatRupiah(currentPrice)}
                    </span>
                    <span className="text-xs text-stone-500 font-medium ml-1">
                      / {selectedOption.unitName}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-600" /> +{pointsEarned} Poin Member
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase text-stone-400 tracking-wider mb-1">Deskripsi Produk</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Picker Notes */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Catatan untuk Kasir / Petugas Toko (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Pilih kemasan utuh, kardus tersegel rapi..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-blue-500 bg-stone-50"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-stone-100">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <span className="text-xs font-bold text-stone-700 block">Jumlah ({selectedOption.unitName}):</span>
                  <span className="text-[10px] text-stone-400">
                    Stok tersisa: {maxStockForSelectedUnit} {selectedOption.unitName}
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-stone-100 p-1 rounded-xl border border-stone-200">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-stone-50 text-stone-800 disabled:opacity-40 flex items-center justify-center shadow-2xs font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-sm min-w-[20px] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(maxStockForSelectedUnit, quantity + 1))}
                    disabled={quantity >= maxStockForSelectedUnit}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-stone-50 text-stone-800 disabled:opacity-40 flex items-center justify-center shadow-2xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-stone-500 block font-medium">
                    Total: <strong className="text-stone-800">{quantity} {selectedOption.unitName}</strong>
                    {selectedOption.multiplier > 1 && (
                      <span className="text-blue-700 font-bold ml-1">
                        (= {quantity * selectedOption.multiplier} {product.unit})
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-black text-blue-900">{formatRupiah(currentPrice * quantity)}</span>
                </div>

                <button
                  onClick={handleAdd}
                  disabled={isAdded || maxStockForSelectedUnit <= 0}
                  className={`flex-1 py-3 px-6 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
                    isAdded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Berhasil Masuk Keranjang!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>
                        + Masukkan Keranjang ({quantity} {selectedOption.unitName}
                        {selectedOption.multiplier > 1 ? ` = ${quantity * selectedOption.multiplier} ${product.unit}` : ''})
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
