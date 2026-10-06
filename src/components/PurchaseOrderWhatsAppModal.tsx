import React, { useState } from 'react';
import { PurchaseOrder, Store, Supplier } from '../types';
import { formatPurchaseOrderForWhatsApp, createWhatsAppUrl } from '../utils/purchaseExport';
import { Copy, Check, MessageSquare, ExternalLink, X, Building2 } from 'lucide-react';

interface PurchaseOrderWhatsAppModalProps {
  po: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
  stores?: Store[];
  suppliers?: Supplier[];
}

export const PurchaseOrderWhatsAppModal: React.FC<PurchaseOrderWhatsAppModalProps> = ({
  po,
  isOpen,
  onClose,
  stores = [],
  suppliers = [],
}) => {
  if (!isOpen || !po) return null;

  const targetStore = stores.find(s => s.id === po.storeId) || stores[0];
  const targetSupplier = suppliers.find(s => s.id === po.supplierId);

  const [phone, setPhone] = useState(targetSupplier?.phone || '');
  const [copied, setCopied] = useState(false);

  const messageText = formatPurchaseOrderForWhatsApp(po, targetStore, targetSupplier);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const url = createWhatsAppUrl(phone, messageText);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-80 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-base">Kirim Pesanan PO via WhatsApp</h3>
              <p className="text-xs text-stone-500">Format teks rapi siap kirim langsung ke sales/agen supplier</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* RECIPIENT PHONE NUMBER */}
        <div className="space-y-1.5 text-xs">
          <label className="block font-semibold text-stone-700">
            Nomor WhatsApp Supplier ({po.supplierName}):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contoh: 08123456789 atau 628123456789"
              className="flex-1 px-3 py-2 border border-stone-200 rounded-xl font-mono text-xs bg-stone-50 focus:bg-white"
            />
            {targetSupplier?.contactPerson && (
              <span className="text-[11px] text-stone-500">a/n {targetSupplier.contactPerson}</span>
            )}
          </div>
        </div>

        {/* MESSAGE PREVIEW */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-stone-700">Preview Teks Pesanan:</label>
            <span className="text-[11px] text-stone-400 font-mono">{po.items?.length || 0} Macam Barang</span>
          </div>
          <textarea
            readOnly
            rows={10}
            value={messageText}
            className="w-full p-3 font-mono text-[11px] bg-stone-50 border border-stone-200 rounded-2xl resize-none text-stone-800 focus:outline-hidden"
          />
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
          <button
            type="button"
            onClick={handleCopy}
            className={`px-4 py-2.5 rounded-xl font-bold border transition-colors flex items-center gap-1.5 ${
              copied
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-stone-500" />}
            <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Teks WhatsApp'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Buka Chat WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
