import React, { useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Store,
  Zap,
  Wheat,
  Coffee,
  Cookie,
  Apple,
  Sparkles,
  Home,
  Baby,
  Tag,
  Cigarette,
  Pill,
  Utensils,
  ShoppingBag,
  Truck,
  Gift,
  ShieldCheck,
  Flame,
  Heart,
  Star,
  ArrowRight,
} from 'lucide-react';
import { Product, Category, CartItem } from '../types';
import { ProductCard } from './ProductCard';

interface CategoryProductSectionsProps {
  products: Product[];
  categories: Category[];
  cartItems: CartItem[];
  onAddToCart: (
    product: Product,
    quantity?: number,
    notes?: string,
    unitOption?: { unitName: string; price: number; multiplier: number; breakdownText: string }
  ) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onOpenDetail: (product: Product) => void;
  onSelectCategory: (slug: string) => void;
}

interface CategoryGroup {
  slug: string;
  name: string;
  icon: string;
  products: Product[];
}

function normalizeCategorySlug(value: string): string {
  return (value || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/^cat_/, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatCategoryTitle(raw: string): string {
  const clean = (raw || '')
    .replace(/^cat_/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  if (!clean) return 'Produk Lainnya';
  return clean.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function renderCategoryIcon(iconName: string) {
  switch (iconName) {
    case 'Zap':
      return <Zap className="w-4 h-4 text-red-600" />;
    case 'Wheat':
      return <Wheat className="w-4 h-4 text-amber-600" />;
    case 'Coffee':
      return <Coffee className="w-4 h-4 text-blue-600" />;
    case 'Cookie':
      return <Cookie className="w-4 h-4 text-orange-600" />;
    case 'Apple':
      return <Apple className="w-4 h-4 text-emerald-600" />;
    case 'Sparkles':
      return <Sparkles className="w-4 h-4 text-pink-600" />;
    case 'Home':
      return <Home className="w-4 h-4 text-indigo-600" />;
    case 'Baby':
      return <Baby className="w-4 h-4 text-purple-600" />;
    case 'Cigarette':
      return <Cigarette className="w-4 h-4 text-stone-600" />;
    case 'Pill':
      return <Pill className="w-4 h-4 text-teal-600" />;
    case 'Utensils':
      return <Utensils className="w-4 h-4 text-amber-600" />;
    case 'ShoppingBag':
      return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
    case 'Truck':
      return <Truck className="w-4 h-4 text-blue-600" />;
    case 'Gift':
      return <Gift className="w-4 h-4 text-pink-600" />;
    case 'ShieldCheck':
      return <ShieldCheck className="w-4 h-4 text-teal-600" />;
    case 'Flame':
      return <Flame className="w-4 h-4 text-rose-600" />;
    case 'Heart':
      return <Heart className="w-4 h-4 text-rose-600" />;
    case 'Star':
      return <Star className="w-4 h-4 text-amber-600" />;
    case 'Tag':
      return <Tag className="w-4 h-4 text-blue-600" />;
    default:
      return <Store className="w-4 h-4 text-blue-600" />;
  }
}

const MAX_ITEMS_PER_SHELF = 12;

export const CategoryProductSections: React.FC<CategoryProductSectionsProps> = ({
  products,
  categories,
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  onOpenDetail,
  onSelectCategory,
}) => {
  const shelfRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const categoryGroups: CategoryGroup[] = useMemo(() => {
    const groups: CategoryGroup[] = [];
    const assignedProductIds = new Set<string>();

    // 1. Kelompukkan berdasarkan daftar kategori resmi toko (mengikuti urutan CategoryBar)
    (categories || []).forEach((cat) => {
      if (!cat || !cat.slug || cat.slug === 'all' || cat.slug === 'jsm-promo') return;

      const catNorm = normalizeCategorySlug(cat.slug);
      const idNorm = normalizeCategorySlug(cat.id);

      const matched = products.filter((p) => {
        if (!p || assignedProductIds.has(p.id)) return false;
        const pNorm = normalizeCategorySlug(p.category);
        return (
          p.category === cat.slug ||
          p.category === cat.id ||
          p.category === `cat_${cat.slug}` ||
          pNorm === catNorm ||
          (idNorm && pNorm === idNorm)
        );
      });

      if (matched.length > 0) {
        matched.forEach((p) => assignedProductIds.add(p.id));
        groups.push({
          slug: cat.slug,
          name: cat.name,
          icon: cat.icon || 'Store',
          products: matched,
        });
      }
    });

    // 2. Jika masih ada produk dengan kategori baru (misal hasil import Excel), kelompokkan per kategori
    const extraBucket = new Map<string, Product[]>();
    products.forEach((p) => {
      if (!p || assignedProductIds.has(p.id)) return;
      const slug = normalizeCategorySlug(p.category) || 'lainnya';
      const list = extraBucket.get(slug) || [];
      list.push(p);
      extraBucket.set(slug, list);
    });

    extraBucket.forEach((items, slug) => {
      groups.push({
        slug,
        name: formatCategoryTitle(slug),
        icon: 'Tag',
        products: items,
      });
    });

    return groups;
  }, [products, categories]);

  const scrollShelf = (slug: string, direction: 'left' | 'right') => {
    const container = shelfRefs.current[slug];
    if (!container) return;
    const distance = Math.max(320, Math.round(container.clientWidth * 0.75));
    container.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  if (categoryGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-5">
      {categoryGroups.map((group) => {
        const shelfProducts = group.products.slice(0, MAX_ITEMS_PER_SHELF);
        const hasMore = group.products.length > MAX_ITEMS_PER_SHELF;

        return (
          <section
            key={group.slug}
            aria-label={`Kategori ${group.name}`}
            className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-3.5 sm:p-5"
          >
            {/* Header Kategori (Gaya KlikIndomaret / Shopee) */}
            <div className="flex items-center justify-between gap-3 pb-3 mb-3.5 border-b border-stone-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  {renderCategoryIcon(group.icon)}
                </div>
                <div className="flex items-baseline gap-2 min-w-0">
                  <h4 className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight truncate">
                    {group.name}
                  </h4>
                  <span className="text-xs text-stone-500 font-medium whitespace-nowrap shrink-0 tabular-nums">
                    · {group.products.length} produk
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollShelf(group.slug, 'left')}
                    className="w-7 h-7 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label={`Geser kiri ${group.name}`}
                    title="Geser ke kiri"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollShelf(group.slug, 'right')}
                    className="w-7 h-7 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label={`Geser kanan ${group.name}`}
                    title="Geser ke kanan"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCategory(group.slug)}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Lihat Semua</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Rak Produk Horizontal per Kategori */}
            <div
              ref={(el) => {
                shelfRefs.current[group.slug] = el;
              }}
              className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto pb-1 scrollbar-none scroll-smooth snap-x snap-mandatory"
            >
              {shelfProducts.map((product) => {
                const inCart = cartItems.find((item) => item.product.id === product.id);
                const qty = inCart ? inCart.quantity : 0;

                return (
                  <div
                    key={product.id}
                    className="w-[164px] xs:w-[178px] sm:w-[198px] lg:w-[214px] shrink-0 snap-start flex [&>*]:w-full"
                  >
                    <ProductCard
                      product={product}
                      quantityInCart={qty}
                      onAddToCart={(p, q = 1, n, opt) => onAddToCart(p, q, n, opt)}
                      onUpdateQuantity={onUpdateQuantity}
                      onOpenDetail={onOpenDetail}
                    />
                  </div>
                );
              })}

              {hasMore && (
                <button
                  type="button"
                  onClick={() => onSelectCategory(group.slug)}
                  className="w-[140px] sm:w-[160px] shrink-0 snap-start rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 hover:bg-blue-50 text-blue-700 flex flex-col items-center justify-center gap-2 p-4 text-center transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-blue-700" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-extrabold">Lihat Semua</div>
                    <div className="text-[11px] text-blue-600 font-medium tabular-nums">
                      {group.products.length} item {group.name}
                    </div>
                  </div>
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};
