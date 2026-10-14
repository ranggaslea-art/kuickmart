import { Expedition } from '../types';

export const INITIAL_EXPEDITIONS: Expedition[] = [
  {
    id: 'exp_jne',
    name: 'JNE Express',
    code: 'JNE',
    logo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120&auto=format&fit=crop&q=60',
    color: '#003399',
    isActive: true,
    trackingUrlPattern: 'https://www.jne.co.id/id/tracking/trace/{resi}',
    phone: '021-29278888',
    notes: 'Jaringan luas mencakup seluruh kecamatan di Indonesia. Layanan jemput paket setiap hari.',
    services: [
      {
        id: 'srv_jne_reg',
        serviceCode: 'REG',
        serviceName: 'Layanan Reguler',
        etd: '1-2 Hari',
        rateType: 'per_kg',
        baseRate: 12000,
        ratePerKg: 10000,
        minWeightKg: 1,
        description: 'Layanan pengiriman reguler ke seluruh kota besar dan kabupaten di Indonesia.',
        isActive: true,
      },
      {
        id: 'srv_jne_yes',
        serviceCode: 'YES',
        serviceName: 'Yakin Esok Sampai (YES)',
        etd: 'Besok Sampai (24 Jam)',
        rateType: 'per_kg',
        baseRate: 24000,
        ratePerKg: 18000,
        minWeightKg: 1,
        description: 'Garansi kirim 1 hari sampai ke alamat tujuan atau uang ongkos kirim kembali.',
        isActive: true,
      },
      {
        id: 'srv_jne_oke',
        serviceCode: 'OKE',
        serviceName: 'Ongkos Kirim Ekonomis (OKE)',
        etd: '2-4 Hari',
        rateType: 'per_kg',
        baseRate: 9000,
        ratePerKg: 8000,
        minWeightKg: 1,
        description: 'Tarif super hemat untuk pengiriman fleksibel non-urgent.',
        isActive: true,
      },
      {
        id: 'srv_jne_jtr',
        serviceCode: 'JTR',
        serviceName: 'JNE Trucking / Kargo (JTR)',
        etd: '3-5 Hari',
        rateType: 'per_kg',
        baseRate: 35000,
        ratePerKg: 4000,
        minWeightKg: 5,
        description: 'Solusi hemat pengiriman paket barang berat & besar via armada truk darat.',
        isActive: true,
      },
    ],
  },
  {
    id: 'exp_jnt',
    name: 'J&T Express',
    code: 'JNT',
    logo: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=120&auto=format&fit=crop&q=60',
    color: '#e60012',
    isActive: true,
    trackingUrlPattern: 'https://jet.co.id/track?awb={resi}',
    phone: '021-80661888',
    notes: 'Operasional 365 hari tanpa libur, pick-up kilat dan tracking real-time akurat.',
    services: [
      {
        id: 'srv_jnt_ez',
        serviceCode: 'EZ',
        serviceName: 'J&T EZ (Reguler)',
        etd: '1-2 Hari',
        rateType: 'per_kg',
        baseRate: 11000,
        ratePerKg: 10000,
        minWeightKg: 1,
        description: 'Layanan standar cepat operasional setiap hari termasuk hari libur nasional.',
        isActive: true,
      },
      {
        id: 'srv_jnt_super',
        serviceCode: 'SUPER',
        serviceName: 'J&T Super (Next Day)',
        etd: 'Besok Sampai (1 Hari)',
        rateType: 'per_kg',
        baseRate: 22000,
        ratePerKg: 16000,
        minWeightKg: 1,
        description: 'Layanan premium prioritas kecepatan dengan jaminan pengantaran esok hari.',
        isActive: true,
      },
      {
        id: 'srv_jnt_cargo',
        serviceCode: 'J&T CARGO',
        serviceName: 'J&T Kargo Murah',
        etd: '3-4 Hari',
        rateType: 'per_kg',
        baseRate: 30000,
        ratePerKg: 3500,
        minWeightKg: 5,
        description: 'Pengiriman muatan besar / grosir dengan armada kargo spesialis.',
        isActive: true,
      },
    ],
  },
  {
    id: 'exp_sicepat',
    name: 'SiCepat Ekspres',
    code: 'SICEPAT',
    logo: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=120&auto=format&fit=crop&q=60',
    color: '#d90429',
    isActive: true,
    trackingUrlPattern: 'https://www.sicepat.com/checkAwb/{resi}',
    phone: '021-50200050',
    notes: 'Pelopor timbangan akurat dan jemput paket gratis.',
    services: [
      {
        id: 'srv_sicepat_reg',
        serviceCode: 'REG',
        serviceName: 'SiUntung / Reguler',
        etd: '1-2 Hari',
        rateType: 'per_kg',
        baseRate: 11500,
        ratePerKg: 9500,
        minWeightKg: 1,
        description: 'Tarif standar terjangkau untuk pengiriman seluruh pulau Jawa dan sekitarnya.',
        isActive: true,
      },
      {
        id: 'srv_sicepat_best',
        serviceCode: 'BEST',
        serviceName: 'BEST (Besok Sampai Tujuan)',
        etd: '1 Hari (Besok Sampai)',
        rateType: 'per_kg',
        baseRate: 21000,
        ratePerKg: 15000,
        minWeightKg: 1,
        description: 'Kirim hari ini sampai besok di kota-kota besar.',
        isActive: true,
      },
      {
        id: 'srv_sicepat_gokil',
        serviceCode: 'GOKIL',
        serviceName: 'GOKIL (Cargo Kilat)',
        etd: '3-5 Hari',
        rateType: 'per_kg',
        baseRate: 28000,
        ratePerKg: 3000,
        minWeightKg: 10,
        description: 'Cargo Kilat ongkir gila-gilaan murah untuk pesanan grosiran.',
        isActive: true,
      },
    ],
  },
  {
    id: 'exp_pos',
    name: 'POS Indonesia (PosAja!)',
    code: 'POS',
    logo: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=120&auto=format&fit=crop&q=60',
    color: '#ff6600',
    isActive: true,
    trackingUrlPattern: 'https://www.posindonesia.co.id/id/tracking/{resi}',
    phone: '1500161',
    notes: 'BUMN jasa kurir tertua & terlengkap di Indonesia hingga pelosok pulau terluar.',
    services: [
      {
        id: 'srv_pos_reg',
        serviceCode: 'POS REGULER',
        serviceName: 'Pos Reguler Nusantara',
        etd: '2-3 Hari',
        rateType: 'per_kg',
        baseRate: 10000,
        ratePerKg: 8500,
        minWeightKg: 1,
        description: 'Jangkauan terluas hingga pelosok desa dan kepulauan di seluruh nusantara.',
        isActive: true,
      },
      {
        id: 'srv_pos_nextday',
        serviceCode: 'POS NEXTDAY',
        serviceName: 'Pos Kilat Next Day',
        etd: '1 Hari Kerja',
        rateType: 'per_kg',
        baseRate: 20000,
        ratePerKg: 14000,
        minWeightKg: 1,
        description: 'Layanan kurir ekspres prioritas Pos Indonesia antarkota.',
        isActive: true,
      },
    ],
  },
  {
    id: 'exp_tiki',
    name: 'TIKI (Titipan Kilat)',
    code: 'TIKI',
    logo: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=120&auto=format&fit=crop&q=60',
    color: '#0055a5',
    isActive: true,
    trackingUrlPattern: 'https://www.tiki.id/id/tracking/{resi}',
    phone: '1500125',
    notes: 'Jasa kurir legendaris dengan jaringan cabang dan sub-agen di seluruh tanah air.',
    services: [
      {
        id: 'srv_tiki_reg',
        serviceCode: 'REG',
        serviceName: 'Regular Service (REG)',
        etd: '2-3 Hari',
        rateType: 'per_kg',
        baseRate: 11000,
        ratePerKg: 9500,
        minWeightKg: 1,
        description: 'Pengiriman reguler terpercaya dengan jaminan keamanan paket.',
        isActive: true,
      },
      {
        id: 'srv_tiki_ons',
        serviceCode: 'ONS',
        serviceName: 'Over Night Services (ONS)',
        etd: '1 Hari (Besok Sampai)',
        rateType: 'per_kg',
        baseRate: 23000,
        ratePerKg: 17000,
        minWeightKg: 1,
        description: 'Hanya butuh 1 hari untuk mengantarkan kiriman penting Anda.',
        isActive: true,
      },
    ],
  },
  {
    id: 'exp_anteraja',
    name: 'Anteraja',
    code: 'ANTERAJA',
    logo: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=120&auto=format&fit=crop&q=60',
    color: '#e02874',
    isActive: true,
    trackingUrlPattern: 'https://anteraja.id/tracking?awb={resi}',
    phone: '021-50603333',
    notes: 'Satria Anteraja siap menjemput dan mengantar dengan teknologi canggih.',
    services: [
      {
        id: 'srv_anteraja_reg',
        serviceCode: 'REG',
        serviceName: 'Anteraja Reguler',
        etd: '1-2 Hari',
        rateType: 'per_kg',
        baseRate: 11000,
        ratePerKg: 9000,
        minWeightKg: 1,
        description: 'Layanan terpercaya dengan kurir Satria ramah dan profesional.',
        isActive: true,
      },
      {
        id: 'srv_anteraja_next',
        serviceCode: 'ND',
        serviceName: 'Anteraja Next Day',
        etd: 'Besok Sampai (1 Hari)',
        rateType: 'per_kg',
        baseRate: 20000,
        ratePerKg: 15000,
        minWeightKg: 1,
        description: 'Paket tiba keesokan harinya di alamat penerima.',
        isActive: true,
      },
    ],
  },
];

/**
 * Hitung tarif ongkir berdasarkan berat barang (kg) dan layanan ekspedisi
 */
export function calculateExpeditionRate(
  service: { rateType: 'flat' | 'per_kg'; baseRate: number; ratePerKg?: number; minWeightKg?: number },
  weightKg: number = 1
): number {
  if (service.rateType === 'flat') {
    return service.baseRate;
  }
  const effectiveWeight = Math.max(service.minWeightKg || 1, Math.ceil(weightKg));
  const additionalKg = Math.max(0, effectiveWeight - 1);
  const extraRate = (service.ratePerKg || service.baseRate) * additionalKg;
  return service.baseRate + extraRate;
}

/**
 * Estimasi berat belanja dari item keranjang (kg)
 */
export function estimateCartWeightKg(
  cartItems: { quantity: number; product: { name: string; unit: string; conversionMultiplier?: number } }[]
): number {
  let totalKg = 0;
  for (const item of cartItems) {
    const qty = item.quantity;
    const unitLower = (item.product.unit || '').toLowerCase();
    const nameLower = (item.product.name || '').toLowerCase();

    let itemWeightKg = 0.3; // Default 300 gram per item

    if (unitLower.includes('kg') || unitLower.includes('kilo')) {
      itemWeightKg = 1.0;
    } else if (unitLower.includes('gr') || unitLower.includes('gram')) {
      const match = nameLower.match(/(\d+)\s*(?:g|gr|gram)/);
      if (match) {
        itemWeightKg = Math.max(0.1, parseInt(match[1], 10) / 1000);
      } else {
        itemWeightKg = 0.25;
      }
    } else if (nameLower.includes('1 kg') || nameLower.includes('1kg')) {
      itemWeightKg = 1.0;
    } else if (nameLower.includes('5 kg') || nameLower.includes('5kg') || nameLower.includes('beras')) {
      itemWeightKg = 5.0;
    } else if (nameLower.includes('2 kg') || nameLower.includes('2kg')) {
      itemWeightKg = 2.0;
    } else if (nameLower.includes('dus') || nameLower.includes('box') || nameLower.includes('karton')) {
      itemWeightKg = 3.5;
    } else if (nameLower.includes('minyak') || nameLower.includes('liter') || nameLower.includes('1l')) {
      itemWeightKg = 1.0;
    } else if (nameLower.includes('air') || nameLower.includes('galon')) {
      itemWeightKg = 19.0;
    }

    totalKg += itemWeightKg * qty;
  }
  return Math.max(1, Math.round(totalKg * 10) / 10);
}
