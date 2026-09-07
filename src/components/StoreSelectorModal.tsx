import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Search, 
  Store as StoreIcon, 
  Clock, 
  Phone, 
  Check, 
  Bike,
  Sparkles
} from 'lucide-react';
import { Store } from '../types';
import { formatRupiah } from '../utils/formatters';

interface StoreSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: Store[];
  currentStore: Store;
  onSelectStore: (store: Store) => void;
}

export const StoreSelectorModal: React.FC<StoreSelectorModalProps> = ({
  isOpen,
  onClose,
  stores,
  currentStore,
  onSelectStore,
}) => {
  if (!isOpen) return null;

  const [search, setSearch] = useState('');

  const filteredStores = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StoreIcon className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-bold text-base text-stone-900">Pilih Outlet Minimarket Terdekat</h3>
              <p className="text-[11px] text-stone-500">Pilihan toko menentukan stok & kecepatan pengiriman</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-stone-100 bg-stone-50">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama cabang toko, jalan, atau kelurahan..."
              className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-blue-500"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Stores list */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
          {filteredStores.map((s) => {
            const isSelected = s.id === currentStore.id;

            return (
              <div
                key={s.id}
                onClick={() => {
                  onSelectStore(s);
                  onClose();
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 shadow-2xs'
                    : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className={`p-2 rounded-xl mt-0.5 ${isSelected ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-700'}`}>
                      <StoreIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-stone-900">{s.name}</h4>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-mono">
                          {s.code}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-1">{s.address}, {s.city}</p>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-stone-500">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {s.openHours}
                        </span>
                        <span>•</span>
                        <span className="text-blue-700 font-semibold flex items-center gap-1">
                          <Bike className="w-3 h-3" /> Ongkir {formatRupiah(s.deliveryFee)}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-stone-700">{s.distanceKm} km dari lokasimu</span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-black"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
