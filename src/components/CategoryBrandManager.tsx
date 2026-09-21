import React, { useState, useMemo } from 'react';
import { 
  Category, 
  BrandItem, 
  Product 
} from '../types';
import { 
  Tag, 
  Sparkles, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Boxes, 
  Filter, 
  Layers, 
  Bookmark, 
  Zap, 
  Wheat, 
  Coffee, 
  Cookie, 
  Apple, 
  Home, 
  Baby, 
  Store, 
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
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

interface CategoryBrandManagerProps {
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
  brands: BrandItem[];
  onUpdateBrands: (brands: BrandItem[]) => void;
  products: Product[];
  onUpdateProducts?: (products: Product[]) => void;
  canEdit?: boolean;
}

// Map of available icons for categories
export const AVAILABLE_CATEGORY_ICONS: { name: string; label: string; component: React.FC<{ className?: string }> }[] = [
  { name: 'Store', label: 'Toko Umum', component: Store },
  { name: 'Wheat', label: 'Gandum / Sembako', component: Wheat },
  { name: 'Coffee', label: 'Kopi / Minuman', component: Coffee },
  { name: 'Cookie', label: 'Snack / Makanan Ringan', component: Cookie },
  { name: 'Apple', label: 'Buah / Produk Segar', component: Apple },
  { name: 'Sparkles', label: 'Perawatan Diri / Kosmetik', component: Sparkles },
  { name: 'Home', label: 'Rumah Tangga / Kebersihan', component: Home },
  { name: 'Baby', label: 'Ibu & Bayi', component: Baby },
  { name: 'Cigarette', label: 'Rokok & Tembakau', component: Cigarette },
  { name: 'Pill', label: 'Obat & Farmasi', component: Pill },
  { name: 'Utensils', label: 'Resto & Masakan', component: Utensils },
  { name: 'ShoppingBag', label: 'Belanjaan', component: ShoppingBag },
  { name: 'Zap', label: 'Promo Kilat / Flash Sale', component: Zap },
  { name: 'Flame', label: 'Produk Terlaris / Hot', component: Flame },
  { name: 'Tag', label: 'Label Diskon', component: Tag },
  { name: 'Gift', label: 'Bingkisan & Hadiah', component: Gift },
  { name: 'ShieldCheck', label: 'Produk Bergaransi', component: ShieldCheck },
  { name: 'Truck', label: 'Grosir / Pasokan', component: Truck },
  { name: 'Heart', label: 'Kesehatan & Favorit', component: Heart },
  { name: 'Star', label: 'Premium & Pilihan', component: Star },
];

export const COLOR_OPTIONS = [
  { value: 'amber', label: 'Kuning / Amber', bgClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'blue', label: 'Biru', bgClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'red', label: 'Merah', bgClass: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'emerald', label: 'Hijau / Zamrud', bgClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'orange', label: 'Oranye', bgClass: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'pink', label: 'Merah Muda / Pink', bgClass: 'bg-pink-100 text-pink-800 border-pink-300' },
  { value: 'purple', label: 'Ungu', bgClass: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'indigo', label: 'Nila / Indigo', bgClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { value: 'teal', label: 'Biru Kehijauan / Teal', bgClass: 'bg-teal-100 text-teal-800 border-teal-300' },
  { value: 'stone', label: 'Abu-abu / Netral', bgClass: 'bg-stone-100 text-stone-800 border-stone-300' },
];

export const CategoryBrandManager: React.FC<CategoryBrandManagerProps> = ({
  categories,
  onUpdateCategories,
  brands,
  onUpdateBrands,
  products,
  onUpdateProducts,
  canEdit = true,
}) => {
  // Main subtab: 'categories' | 'brands'
  const [activeSubTab, setActiveSubTab] = useState<'categories' | 'brands'>('categories');

  // Notification feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter
  const [catSearch, setCatSearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [brandCategoryFilter, setBrandCategoryFilter] = useState('all');

  // Modal states for Categories
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catDeleteTarget, setCatDeleteTarget] = useState<Category | null>(null);

  // Category form fields
  const [catFormName, setCatFormName] = useState('');
  const [catFormSlug, setCatFormSlug] = useState('');
  const [catFormIcon, setCatFormIcon] = useState('Store');
  const [catFormBadge, setCatFormBadge] = useState('');
  const [catFormColor, setCatFormColor] = useState('blue');
  const [catSyncProducts, setCatSyncProducts] = useState(true);

  // Modal states for Brands
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [brandDeleteTarget, setBrandDeleteTarget] = useState<BrandItem | null>(null);

  // Brand form fields
  const [brandFormName, setBrandFormName] = useState('');
  const [brandFormCode, setBrandFormCode] = useState('');
  const [brandFormCategorySlug, setBrandFormCategorySlug] = useState('');
  const [brandFormDescription, setBrandFormDescription] = useState('');
  const [brandFormIsActive, setBrandFormIsActive] = useState(true);
  const [brandSyncProducts, setBrandSyncProducts] = useState(true);

  // Auto-dismiss feedback
  const triggerFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // Helper to render Category icon
  const renderCategoryIcon = (iconName: string, className = "w-4 h-4") => {
    const found = AVAILABLE_CATEGORY_ICONS.find(i => i.name.toLowerCase() === iconName.toLowerCase());
    if (found) {
      const Component = found.component;
      return <Component className={className} />;
    }
    return <Store className={className} />;
  };

  // ----------------------------------------------------
  // CATEGORIES LOGIC
  // ----------------------------------------------------
  const filteredCategories = useMemo(() => {
    return categories.filter(c => 
      c.name.toLowerCase().includes(catSearch.toLowerCase()) ||
      c.slug.toLowerCase().includes(catSearch.toLowerCase())
    );
  }, [categories, catSearch]);

  const productCountPerCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatFormName('');
    setCatFormSlug('');
    setCatFormIcon('Tag');
    setCatFormBadge('');
    setCatFormColor('blue');
    setCatSyncProducts(true);
    setIsCatModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatFormName(cat.name);
    setCatFormSlug(cat.slug);
    setCatFormIcon(cat.icon || 'Store');
    setCatFormBadge(cat.badge || '');
    setCatFormColor(cat.color || 'blue');
    setCatSyncProducts(true);
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormName.trim()) {
      triggerFeedback('error', 'Nama kategori tidak boleh kosong.');
      return;
    }

    const cleanSlug = (catFormSlug.trim() || catFormName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    
    // Check duplicate slug
    const duplicate = categories.find(c => c.slug === cleanSlug && (!editingCategory || c.id !== editingCategory.id));
    if (duplicate) {
      triggerFeedback('error', `Slug URL "${cleanSlug}" sudah dipakai oleh kategori lain.`);
      return;
    }

    if (editingCategory) {
      const oldSlug = editingCategory.slug;
      const updatedCat: Category = {
        ...editingCategory,
        name: catFormName.trim(),
        slug: cleanSlug,
        icon: catFormIcon,
        badge: catFormBadge.trim() || undefined,
        color: catFormColor,
      };

      const newCategories = categories.map(c => c.id === editingCategory.id ? updatedCat : c);
      onUpdateCategories(newCategories);

      // If slug changed and sync requested, update products
      if (oldSlug !== cleanSlug && catSyncProducts && onUpdateProducts) {
        const updatedProds = products.map(p => {
          if (p.category === oldSlug) {
            return { ...p, category: cleanSlug };
          }
          return p;
        });
        onUpdateProducts(updatedProds);
      }

      triggerFeedback('success', `Kategori "${updatedCat.name}" berhasil diperbarui.`);
    } else {
      const newCat: Category = {
        id: `cat_${Date.now()}`,
        name: catFormName.trim(),
        slug: cleanSlug,
        icon: catFormIcon,
        badge: catFormBadge.trim() || undefined,
        color: catFormColor,
      };

      onUpdateCategories([...categories, newCat]);
      triggerFeedback('success', `Kategori "${newCat.name}" berhasil ditambahkan.`);
    }

    setIsCatModalOpen(false);
  };

  const handleConfirmDeleteCategory = () => {
    if (!catDeleteTarget) return;

    if (catDeleteTarget.slug === 'all') {
      triggerFeedback('error', 'Kategori "Semua Produk" adalah kategori sistem dan tidak boleh dihapus.');
      setCatDeleteTarget(null);
      return;
    }

    const targetSlug = catDeleteTarget.slug;
    const targetName = catDeleteTarget.name;

    const remainingCategories = categories.filter(c => c.id !== catDeleteTarget.id);
    onUpdateCategories(remainingCategories);

    // Reassign products with this category to fallback ('sembako' or 'all')
    if (onUpdateProducts) {
      const fallbackCat = remainingCategories.find(c => c.slug === 'sembako')?.slug || remainingCategories[0]?.slug || 'all';
      const updatedProds = products.map(p => {
        if (p.category === targetSlug) {
          return { ...p, category: fallbackCat };
        }
        return p;
      });
      onUpdateProducts(updatedProds);
    }

    triggerFeedback('success', `Kategori "${targetName}" berhasil dihapus.`);
    setCatDeleteTarget(null);
  };

  // ----------------------------------------------------
  // BRANDS LOGIC
  // ----------------------------------------------------
  const filteredBrands = useMemo(() => {
    return brands.filter(b => {
      const matchSearch = 
        b.name.toLowerCase().includes(brandSearch.toLowerCase()) ||
        (b.code && b.code.toLowerCase().includes(brandSearch.toLowerCase())) ||
        (b.description && b.description.toLowerCase().includes(brandSearch.toLowerCase()));
      
      const matchCat = brandCategoryFilter === 'all' || b.categorySlug === brandCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [brands, brandSearch, brandCategoryFilter]);

  const productCountPerBrand = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const brandKey = (p.brand || '').trim().toLowerCase();
      if (brandKey) {
        counts[brandKey] = (counts[brandKey] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const handleOpenAddBrand = () => {
    setEditingBrand(null);
    setBrandFormName('');
    setBrandFormCode('');
    setBrandFormCategorySlug(categories[1]?.slug || 'sembako');
    setBrandFormDescription('');
    setBrandFormIsActive(true);
    setBrandSyncProducts(true);
    setIsBrandModalOpen(true);
  };

  const handleOpenEditBrand = (brand: BrandItem) => {
    setEditingBrand(brand);
    setBrandFormName(brand.name);
    setBrandFormCode(brand.code || '');
    setBrandFormCategorySlug(brand.categorySlug || '');
    setBrandFormDescription(brand.description || '');
    setBrandFormIsActive(brand.isActive !== false);
    setBrandSyncProducts(true);
    setIsBrandModalOpen(true);
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandFormName.trim()) {
      triggerFeedback('error', 'Nama merk / brand tidak boleh kosong.');
      return;
    }

    const trimmedName = brandFormName.trim();
    const autoCode = (brandFormCode.trim() || trimmedName.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, ''));

    // Check duplicate
    const duplicate = brands.find(b => 
      b.name.toLowerCase() === trimmedName.toLowerCase() && 
      (!editingBrand || b.id !== editingBrand.id)
    );
    if (duplicate) {
      triggerFeedback('error', `Merk "${trimmedName}" sudah terdaftar.`);
      return;
    }

    if (editingBrand) {
      const oldName = editingBrand.name;
      const updatedBrand: BrandItem = {
        ...editingBrand,
        name: trimmedName,
        code: autoCode,
        categorySlug: brandFormCategorySlug || undefined,
        description: brandFormDescription.trim() || undefined,
        isActive: brandFormIsActive,
        updatedAt: new Date().toISOString(),
      };

      const newBrands = brands.map(b => b.id === editingBrand.id ? updatedBrand : b);
      onUpdateBrands(newBrands);

      // If name changed and sync requested, update products in catalog
      if (oldName.toLowerCase() !== trimmedName.toLowerCase() && brandSyncProducts && onUpdateProducts) {
        const updatedProds = products.map(p => {
          if ((p.brand || '').trim().toLowerCase() === oldName.trim().toLowerCase()) {
            return { ...p, brand: trimmedName };
          }
          return p;
        });
        onUpdateProducts(updatedProds);
      }

      triggerFeedback('success', `Merk "${updatedBrand.name}" berhasil diperbarui.`);
    } else {
      const newBrand: BrandItem = {
        id: `brd_${Date.now()}`,
        name: trimmedName,
        code: autoCode,
        categorySlug: brandFormCategorySlug || undefined,
        description: brandFormDescription.trim() || undefined,
        isActive: brandFormIsActive,
        createdAt: new Date().toISOString(),
      };

      onUpdateBrands([...brands, newBrand]);
      triggerFeedback('success', `Merk "${newBrand.name}" berhasil ditambahkan.`);
    }

    setIsBrandModalOpen(false);
  };

  const handleConfirmDeleteBrand = () => {
    if (!brandDeleteTarget) return;

    const targetName = brandDeleteTarget.name;
    const remainingBrands = brands.filter(b => b.id !== brandDeleteTarget.id);
    onUpdateBrands(remainingBrands);

    triggerFeedback('success', `Merk "${targetName}" berhasil dihapus.`);
    setBrandDeleteTarget(null);
  };

  // One-click auto-extract all brands from current catalog
  const handleAutoExtractBrands = () => {
    const existingBrandNames = new Set(brands.map(b => b.name.trim().toLowerCase()));
    const newExtracted: BrandItem[] = [];

    products.forEach(p => {
      const bName = (p.brand || '').trim();
      if (bName && !existingBrandNames.has(bName.toLowerCase())) {
        existingBrandNames.add(bName.toLowerCase());
        newExtracted.push({
          id: `brd_ext_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: bName,
          code: bName.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, ''),
          categorySlug: p.category,
          description: `Merk diekstrak otomatis dari produk: ${p.name}`,
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      }
    });

    if (newExtracted.length === 0) {
      triggerFeedback('success', 'Semua merk dari produk katalog sudah terdaftar lengkap.');
      return;
    }

    onUpdateBrands([...brands, ...newExtracted]);
    triggerFeedback('success', `Berhasil menemukan & mendaftarkan ${newExtracted.length} merk baru dari katalog.`);
  };

  return (
    <div className="space-y-4">
      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
            : 'bg-rose-50 text-rose-950 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-700 text-xs px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Subtab Switcher */}
      <div className="bg-white border border-stone-200 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                <span>Kelola Kategori & Merk Barang</span>
                <span className="text-[10px] bg-pink-50 text-pink-700 border border-pink-200 font-bold px-2 py-0.5 rounded-full">
                  Master Data
                </span>
              </h3>
              <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                Atur master kategori etalase dan brand minimarket yang dapat ditambah, diedit, dan dihapus secara fleksibel.
              </p>
            </div>
          </div>

          {/* Subtab Buttons */}
          <div className="flex items-center bg-stone-100 p-1 rounded-2xl self-start sm:self-auto border border-stone-200/80">
            <button
              type="button"
              onClick={() => setActiveSubTab('categories')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'categories'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Kategori Barang</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeSubTab === 'categories' ? 'bg-blue-100 text-blue-700' : 'bg-stone-200 text-stone-600'
              }`}>
                {categories.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('brands')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'brands'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-purple-600" />
              <span>Merk / Brand</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeSubTab === 'brands' ? 'bg-purple-100 text-purple-700' : 'bg-stone-200 text-stone-600'
              }`}>
                {brands.length}
              </span>
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* VIEW: KATEGORI BARANG                                */}
        {/* ---------------------------------------------------- */}
        {activeSubTab === 'categories' && (
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={catSearch}
                  onChange={e => setCatSearch(e.target.value)}
                  placeholder="Cari nama kategori atau slug..."
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 font-medium"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleOpenAddCategory}
                    className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Kategori Baru</span>
                  </button>
                )}
              </div>
            </div>

            {/* Categories Table */}
            <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-h-[55vh]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-100 text-stone-600 font-bold border-b border-stone-200 sticky top-0 z-10">
                      <th className="p-3 w-12 text-center">Ikon</th>
                      <th className="p-3">Nama Kategori</th>
                      <th className="p-3">Slug URL</th>
                      <th className="p-3">Badge & Tema</th>
                      <th className="p-3 text-center">Produk Terkait</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredCategories.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-stone-400">
                          Tidak ada kategori yang sesuai pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredCategories.map(cat => {
                        const linkedCount = productCountPerCategory[cat.slug] || 0;
                        const isSystemAll = cat.slug === 'all';
                        return (
                          <tr key={cat.id} className="hover:bg-blue-50/40 transition-colors">
                            <td className="p-3 text-center">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto ${
                                cat.color === 'red' ? 'bg-red-100 text-red-700' :
                                cat.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                                cat.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                                cat.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                cat.color === 'pink' ? 'bg-pink-100 text-pink-700' :
                                cat.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                                cat.color === 'indigo' ? 'bg-indigo-100 text-indigo-700' :
                                cat.color === 'teal' ? 'bg-teal-100 text-teal-700' :
                                cat.color === 'stone' ? 'bg-stone-200 text-stone-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {renderCategoryIcon(cat.icon)}
                              </div>
                            </td>
                            <td className="p-3 font-bold text-stone-900">
                              <div className="flex items-center gap-1.5">
                                <span>{cat.name}</span>
                                {isSystemAll && (
                                  <span className="text-[9px] bg-stone-200 text-stone-600 font-bold px-1.5 py-0.2 rounded">
                                    Sistem
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-stone-500">
                              <span className="bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                                {cat.slug}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {cat.badge && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200">
                                    {cat.badge}
                                  </span>
                                )}
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-600 capitalize">
                                  {cat.color || 'blue'}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                linkedCount > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-stone-100 text-stone-500'
                              }`}>
                                <Boxes className="w-3 h-3" />
                                <span>{linkedCount} Produk</span>
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditCategory(cat)}
                                    className="p-1.5 rounded-lg text-stone-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                    title="Edit Kategori"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canEdit && !isSystemAll && (
                                  <button
                                    type="button"
                                    onClick={() => setCatDeleteTarget(cat)}
                                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Hapus Kategori"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW: MERK / BRAND BARANG                           */}
        {/* ---------------------------------------------------- */}
        {activeSubTab === 'brands' && (
          <div className="space-y-4">
            {/* Action & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={brandSearch}
                    onChange={e => setBrandSearch(e.target.value)}
                    placeholder="Cari merk atau kode..."
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-100 font-medium"
                  />
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-stone-400" />
                  <select
                    value={brandCategoryFilter}
                    onChange={e => setBrandCategoryFilter(e.target.value)}
                    className="px-2.5 py-2 border border-stone-300 rounded-xl bg-stone-50 text-xs font-semibold text-stone-700"
                  >
                    <option value="all">Semua Kategori</option>
                    {categories.filter(c => c.slug !== 'all').map(c => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleAutoExtractBrands}
                  className="flex-1 sm:flex-none px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                  title="Deteksi semua nama brand yang ada di produk katalog dan daftarkan otomatis"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Sinkron Merk Katalog</span>
                </button>

                {canEdit && (
                  <button
                    type="button"
                    onClick={handleOpenAddBrand}
                    className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Merk Baru</span>
                  </button>
                )}
              </div>
            </div>

            {/* Brands Table */}
            <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-h-[55vh]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-100 text-stone-600 font-bold border-b border-stone-200 sticky top-0 z-10">
                      <th className="p-3 w-16">Kode</th>
                      <th className="p-3">Nama Merk / Brand</th>
                      <th className="p-3">Kategori Terkait</th>
                      <th className="p-3">Deskripsi / Distributor</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Produk Terkait</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredBrands.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-stone-400">
                          Tidak ada data merk barang yang sesuai.
                        </td>
                      </tr>
                    ) : (
                      filteredBrands.map(b => {
                        const linkedCount = productCountPerBrand[b.name.trim().toLowerCase()] || 0;
                        const linkedCat = categories.find(c => c.slug === b.categorySlug);

                        return (
                          <tr key={b.id} className="hover:bg-purple-50/40 transition-colors">
                            <td className="p-3 font-mono font-bold text-stone-600">
                              <span className="bg-stone-100 px-2 py-0.5 rounded border border-stone-200 text-[10px]">
                                {b.code || '---'}
                              </span>
                            </td>
                            <td className="p-3 font-extrabold text-stone-900">
                              {b.name}
                            </td>
                            <td className="p-3">
                              {linkedCat ? (
                                <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 w-fit">
                                  {renderCategoryIcon(linkedCat.icon, "w-3 h-3 text-stone-500")}
                                  <span>{linkedCat.name}</span>
                                </span>
                              ) : (
                                <span className="text-stone-400 text-[10px] italic">Umum / Semua</span>
                              )}
                            </td>
                            <td className="p-3 text-stone-600 max-w-xs truncate text-[11px]">
                              {b.description || '-'}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                b.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                              }`}>
                                {b.isActive !== false ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                linkedCount > 0 ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-stone-100 text-stone-500'
                              }`}>
                                <Boxes className="w-3 h-3" />
                                <span>{linkedCount} Produk</span>
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditBrand(b)}
                                    className="p-1.5 rounded-lg text-stone-500 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                                    title="Edit Merk"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => setBrandDeleteTarget(b)}
                                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Hapus Merk"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD / EDIT CATEGORY                           */}
      {/* ---------------------------------------------------- */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>{editingCategory ? 'Edit Kategori Barang' : 'Tambah Kategori Barang Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCatModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nama Kategori <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catFormName}
                  onChange={e => {
                    const val = e.target.value;
                    setCatFormName(val);
                    if (!editingCategory) {
                      setCatFormSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }
                  }}
                  placeholder="Contoh: Bumbu & Masakan Dapur"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-semibold text-stone-900 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Slug URL / Kode Unik <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catFormSlug}
                  onChange={e => setCatFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="contoh: bumbu-dapur"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-mono text-stone-800 focus:ring-2 focus:ring-blue-100"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  Digunakan untuk URL filter dan pengelompokan produk.
                </span>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  Pilih Ikon Visual:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1 border border-stone-200 rounded-xl bg-stone-50">
                  {AVAILABLE_CATEGORY_ICONS.map(ic => {
                    const isSelected = catFormIcon.toLowerCase() === ic.name.toLowerCase();
                    const IconComp = ic.component;
                    return (
                      <button
                        key={ic.name}
                        type="button"
                        onClick={() => setCatFormIcon(ic.name)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                        title={ic.label}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[9px] font-semibold truncate w-full text-center">
                          {ic.label.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Label / Badge Promo (Opsional):
                  </label>
                  <input
                    type="text"
                    value={catFormBadge}
                    onChange={e => setCatFormBadge(e.target.value)}
                    placeholder="Contoh: HOT, BARU, DISKON"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Tema Warna:
                  </label>
                  <select
                    value={catFormColor}
                    onChange={e => setCatFormColor(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                  >
                    {COLOR_OPTIONS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {editingCategory && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="catSync"
                    checked={catSyncProducts}
                    onChange={e => setCatSyncProducts(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600"
                  />
                  <label htmlFor="catSync" className="text-[11px] text-blue-950 font-medium cursor-pointer">
                    Perbarui otomatis semua produk yang menggunakan kategori ini jika slug diubah.
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs cursor-pointer"
                >
                  {editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD / EDIT BRAND                              */}
      {/* ---------------------------------------------------- */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-purple-600" />
                <span>{editingBrand ? 'Edit Merk Barang' : 'Tambah Merk Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBrandModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">
                    Nama Merk / Brand <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={brandFormName}
                    onChange={e => {
                      const val = e.target.value;
                      setBrandFormName(val);
                      if (!editingBrand) {
                        setBrandFormCode(val.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, ''));
                      }
                    }}
                    placeholder="Contoh: Indomie / Bimoli"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-semibold text-stone-900 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Kode Singkat Brand:
                  </label>
                  <input
                    type="text"
                    value={brandFormCode}
                    onChange={e => setBrandFormCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="Contoh: IDM, BML"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-mono text-stone-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Kategori Utama:
                  </label>
                  <select
                    value={brandFormCategorySlug}
                    onChange={e => setBrandFormCategorySlug(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                  >
                    <option value="">Umum (Lintas Kategori)</option>
                    {categories.filter(c => c.slug !== 'all').map(c => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Deskripsi / Produsen / Distributor (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={brandFormDescription}
                  onChange={e => setBrandFormDescription(e.target.value)}
                  placeholder="Contoh: PT Indofood CBP Sukses Makmur Tbk"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="brandActive"
                  checked={brandFormIsActive}
                  onChange={e => setBrandFormIsActive(e.target.checked)}
                  className="rounded text-purple-600"
                />
                <label htmlFor="brandActive" className="font-bold text-stone-700 cursor-pointer">
                  Merk Aktif & Dapat Digunakan pada Produk
                </label>
              </div>

              {editingBrand && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="brandSync"
                    checked={brandSyncProducts}
                    onChange={e => setBrandSyncProducts(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600"
                  />
                  <label htmlFor="brandSync" className="text-[11px] text-purple-950 font-medium cursor-pointer">
                    Perbarui otomatis nama merk pada seluruh produk katalog yang memiliki merk "{editingBrand.name}".
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-2xs cursor-pointer"
                >
                  {editingBrand ? 'Simpan Perubahan' : 'Tambah Merk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* DIALOG: CONFIRM DELETE CATEGORY                      */}
      {/* ---------------------------------------------------- */}
      {catDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-stone-900 text-sm">Hapus Kategori "{catDeleteTarget.name}"?</h4>
                <p className="text-[11px] text-stone-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            {productCountPerCategory[catDeleteTarget.slug] > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Perhatian:</strong> Terdapat {productCountPerCategory[catDeleteTarget.slug]} produk dalam kategori ini. Produk tersebut akan dialihkan secara aman ke kategori cadangan.
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCatDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-2xs cursor-pointer"
              >
                Ya, Hapus Kategori
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* DIALOG: CONFIRM DELETE BRAND                         */}
      {/* ---------------------------------------------------- */}
      {brandDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-stone-900 text-sm">Hapus Merk "{brandDeleteTarget.name}"?</h4>
                <p className="text-[11px] text-stone-500">Merk akan dihapus dari daftar master merk.</p>
              </div>
            </div>

            {productCountPerBrand[brandDeleteTarget.name.trim().toLowerCase()] > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Informasi:</strong> Ada {productCountPerBrand[brandDeleteTarget.name.trim().toLowerCase()]} produk yang saat ini menggunakan merk ini di katalog.
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => setBrandDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBrand}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-2xs cursor-pointer"
              >
                Ya, Hapus Merk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
