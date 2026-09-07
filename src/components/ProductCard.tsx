import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Minus, Star, Zap, Award, Sparkles, Boxes, ImageOff } from 'lucide-react';
import { Product } from '../types';
import { formatRupiah } from '../utils/formatters';
import { getProductUnitOptions } from '../utils/unitConversion';
import { formatImageUrl, getProductFallbackImage } from '../utils/imageHelper';

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onAddToCart: (
    product: Product, 
    quantity?: number, 
    notes?: string, 
    unitOption?: { unitName: string; price: number; multiplier: number; breakdownText: string }
  ) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onOpenDetail: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantityInCart,
  onAddToCart,
  onUpdateQuantity,
  onOpenDetail,
}) => {
  const unitOptions = useMemo(() => getProductUnitOptions(product), [product]);
  const [selectedUnitIdx, setSelectedUnitIdx] = useState(0);
  const selectedOption = unitOptions[selectedUnitIdx] || unitOptions[0];

  const currentPrice = selectedOption.price;
  const currentOriginalPrice = selectedOption.originalPrice;
  const pointsEarned = Math.round(currentPrice * 0.01);

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

  return (
    <div className="bg-white rounded-2xl border border-stone-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      {/* Product Image & Badges */}
      <div 
        onClick={() => onOpenDetail(product)} 
        className="relative bg-stone-50 cursor-pointer aspect-square overflow-hidden flex items-center justify-center p-3"
      >
        <img
          src={imgSrc}
          alt={product.name}
          onError={handleImgError}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {product.discountPercent && product.discountPercent > 0 ? (
            <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
              HEMAT {product.discountPercent}%
            </span>
          ) : null}

          {product.unitConversions && product.unitConversions.length > 0 && (
            <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1">
              <Boxes className="w-2.5 h-2.5" /> Grosir/Multi-Satuan
            </span>
          )}

          {product.tags?.map((tag, idx) => {
            if (tag === 'JSM') {
              return (
                <span key={idx} className="bg-amber-500 text-amber-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5 fill-amber-950" /> JSM
                </span>
              );
            }
            if (tag === 'Beli 1 Gratis 1') {
              return (
                <span key={idx} className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                  Beli 2 Dpt 3
                </span>
              );
            }
            if (tag === 'Fresh') {
              return (
                <span key={idx} className="bg-teal-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                  Segar Tiap Hari
                </span>
              );
            }
            return null;
          })}
        </div>

        {/* Stock warning */}
        {product.stock < 10 && (
          <span className="absolute bottom-2 right-2 bg-stone-900/80 backdrop-blur-xs text-white text-[9px] font-medium px-1.5 py-0.5 rounded">
            Sisa {product.stock}
          </span>
        )}
      </div>

      {/* Product Content */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          <div onClick={() => onOpenDetail(product)} className="cursor-pointer">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {product.brand}
              </span>
              <div className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-500">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{product.rating}</span>
                <span className="text-[10px] text-stone-400 font-normal">({product.soldCount})</span>
              </div>
            </div>

            <h4 className="text-xs sm:text-sm font-semibold text-stone-900 line-clamp-2 min-h-[2.5rem] leading-snug group-hover:text-blue-700 transition-colors mb-1">
              {product.name}
            </h4>
          </div>

          {/* Unit selector badges (if multiple units available) */}
          {unitOptions.length > 1 ? (
            <div className="flex flex-wrap gap-1 mb-2">
              {unitOptions.map((opt, oIdx) => (
                <button
                  key={oIdx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUnitIdx(oIdx);
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border transition-all ${
                    selectedUnitIdx === oIdx
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {opt.unitName}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-stone-500 mb-2">{product.unit}</p>
          )}

          {/* Formula subtext if conversion tier selected */}
          {selectedOption.breakdownText && !selectedOption.isBase && (
            <p className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mb-2 line-clamp-1">
              {selectedOption.breakdownText}
            </p>
          )}
        </div>

        {/* Price & Cart Actions */}
        <div className="pt-2 border-t border-stone-100 mt-auto">
          {/* Strike-through price */}
          {currentOriginalPrice && currentOriginalPrice > currentPrice ? (
            <div className="text-[11px] text-stone-400 line-through leading-none mb-0.5">
              {formatRupiah(currentOriginalPrice)}
            </div>
          ) : (
            <div className="h-[14px]" />
          )}

          <div className="flex items-end justify-between gap-1 mb-2.5">
            <div>
              <span className="font-extrabold text-sm sm:text-base text-blue-900">
                {formatRupiah(currentPrice)}
              </span>
              <span className="text-[10px] text-stone-400 ml-1">
                /{selectedOption.unitName}
              </span>
            </div>
            <div className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
              <Award className="w-2.5 h-2.5" /> +{pointsEarned} Poin
            </div>
          </div>

          {/* Add / Stepper Button */}
          {quantityInCart === 0 ? (
            <button
              onClick={() => onAddToCart(product, 1, undefined, selectedOption)}
              className="w-full bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Beli ({selectedOption.unitName})</span>
            </button>
          ) : (
            <div className="flex items-center justify-between bg-blue-600 text-white rounded-xl p-1 shadow-xs">
              <button
                onClick={() => onUpdateQuantity(product.id, quantityInCart - 1)}
                className="w-7 h-7 rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center transition-colors"
                aria-label="Kurangi"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-xs px-2">{quantityInCart}</span>
              <button
                onClick={() => onUpdateQuantity(product.id, quantityInCart + 1)}
                disabled={quantityInCart >= product.stock}
                className="w-7 h-7 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white flex items-center justify-center transition-colors"
                aria-label="Tambah"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
