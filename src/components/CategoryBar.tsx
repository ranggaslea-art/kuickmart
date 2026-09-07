import React from 'react';
import { 
  Store, 
  Zap, 
  Wheat, 
  Coffee, 
  Cookie, 
  Apple, 
  Sparkles, 
  Home, 
  Baby, 
  Tag 
} from 'lucide-react';
import { Category } from '../types';

interface CategoryBarProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
  productCountByCategory: Record<string, number>;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  productCountByCategory,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="w-4 h-4 text-red-500" />;
      case 'Wheat':
        return <Wheat className="w-4 h-4 text-amber-600" />;
      case 'Coffee':
        return <Coffee className="w-4 h-4 text-blue-500" />;
      case 'Cookie':
        return <Cookie className="w-4 h-4 text-orange-500" />;
      case 'Apple':
        return <Apple className="w-4 h-4 text-emerald-500" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-pink-500" />;
      case 'Home':
        return <Home className="w-4 h-4 text-indigo-500" />;
      case 'Baby':
        return <Baby className="w-4 h-4 text-purple-500" />;
      default:
        return <Store className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className="w-full min-w-full px-3 sm:px-6 lg:px-8 py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-blue-600" />
          <span>Kategori Pilihan</span>
        </h3>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.slug;
          const count = productCountByCategory[cat.slug] || 0;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-white/20 text-white' : 'bg-stone-100'}`}>
                {getIcon(cat.icon)}
              </div>
              <span>{cat.name}</span>
              {cat.badge && (
                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                  isActive ? 'bg-amber-400 text-amber-950' : 'bg-red-100 text-red-700'
                }`}>
                  {cat.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
