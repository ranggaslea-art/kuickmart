import React, { useState } from 'react';
import { 
  X, 
  QrCode, 
  Barcode, 
  Award, 
  Gift, 
  Sparkles, 
  CheckCircle2, 
  Copy, 
  ShieldCheck,
  Star,
  ChevronRight
} from 'lucide-react';
import { MemberProfile, Voucher } from '../types';
import { formatRupiah } from '../utils/formatters';

interface MemberCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberProfile;
  vouchers: Voucher[];
  onClaimVoucher: (voucherId: string) => void;
}

export const MemberCardModal: React.FC<MemberCardModalProps> = ({
  isOpen,
  onClose,
  member,
  vouchers,
  onClaimVoucher,
}) => {
  if (!isOpen) return null;

  const [copiedMemberId, setCopiedMemberId] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(member.barcode);
    setCopiedMemberId(true);
    setTimeout(() => setCopiedMemberId(false), 2000);
  };

  const stampTargets = [1, 2, 3, 4, 5];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base text-stone-900">Kartu Member & Poin Loyalty</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5">
          {/* Virtual Digital Member Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-700 to-yellow-500 text-white p-5 shadow-lg flex flex-col justify-between min-h-[190px]">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-sm">
                  KM
                </div>
                <div className="leading-tight">
                  <div className="font-extrabold text-sm tracking-tight">KUICK MEMBER</div>
                  <div className="text-[10px] text-amber-200 font-medium">Prioritas Minimarket Digital</div>
                </div>
              </div>
              <span className="text-xs font-black uppercase tracking-widest bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/30">
                {member.tier} TIER
              </span>
            </div>

            <div className="my-3">
              <div className="text-[10px] uppercase text-amber-200 font-bold tracking-wider">Nama Anggota</div>
              <div className="font-black text-lg tracking-wide">{member.name}</div>
              <div className="text-xs font-mono opacity-90">{member.memberNumber}</div>
            </div>

            <div className="flex items-end justify-between pt-2 border-t border-white/20">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-amber-200 font-bold">Saldo Poin Anda</div>
                <div className="text-xl font-black text-white">{member.points.toLocaleString('id-ID')} Poin</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-wider text-amber-200 font-bold">Koleksi Stamp</div>
                <div className="text-lg font-black text-white">{member.stamps} / 5 Stamp</div>
              </div>
            </div>
          </div>

          {/* Barcode Scanner Box for Cashier */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-center space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-stone-700">Tunjukkan Barcode ke Kasir Toko:</span>
              <button
                onClick={handleCopy}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedMemberId ? 'Disalin!' : 'Salin Nomor'}</span>
              </button>
            </div>

            <div className="bg-white p-3 rounded-xl border border-stone-200 flex flex-col items-center">
              {/* Barcode simulation */}
              <div className="h-12 w-full max-w-[280px] bg-stone-900 flex items-center justify-center text-white text-xs font-mono tracking-widest rounded">
                ||| | |||| | ||| || |||| | | |||
              </div>
              <span className="text-xs font-mono font-bold text-stone-800 tracking-wider mt-1.5">
                {member.barcode}
              </span>
            </div>
            <p className="text-[10px] text-stone-500">
              Dapat digunakan di seluruh kasir NusaMart & Indomaret/Alfamart mitra.
            </p>
          </div>

          {/* Stamp Card Game */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-blue-950">Stamp Hadiah Spesial Bulan Ini</h4>
              </div>
              <span className="text-[10px] bg-blue-200/80 text-blue-900 font-extrabold px-2 py-0.5 rounded">
                Koleksi {member.stamps}/5
              </span>
            </div>

            <p className="text-[11px] text-blue-800">
              Kumpulkan 5 stamp belanja (1 stamp tiap min. belanja Rp 50.000) untuk klaim Minyak Bimoli 2L Gratis!
            </p>

            <div className="grid grid-cols-5 gap-2 pt-1">
              {stampTargets.map((num) => {
                const isAchieved = num <= member.stamps;
                return (
                  <div
                    key={num}
                    className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center text-xs font-bold transition-all ${
                      isAchieved
                        ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                        : 'border-dashed border-stone-300 bg-white text-stone-400'
                    }`}
                  >
                    {isAchieved ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span>#{num}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Member Exclusive Vouchers */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Voucher & Kupon Belanja Member
            </h4>

            <div className="space-y-2">
              {vouchers.map((v) => (
                <div
                  key={v.id}
                  className="bg-white border border-stone-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs hover:border-blue-200"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {v.code}
                      </span>
                      <span className="text-[10px] text-stone-500">s.d. {v.validUntil}</span>
                    </div>
                    <h5 className="font-bold text-xs text-stone-900 mt-1">{v.title}</h5>
                    <p className="text-[11px] text-stone-500 mt-0.5">{v.description}</p>
                  </div>

                  <button
                    onClick={() => onClaimVoucher(v.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      v.isClaimed
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                    }`}
                  >
                    {v.isClaimed ? 'Tersimpan' : 'Klaim'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-black"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
