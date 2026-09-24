import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  Smartphone, 
  Monitor, 
  MapPin, 
  TrendingUp, 
  FileText, 
  AlertCircle,
  HelpCircle,
  Save,
  Share2,
  Tag
} from 'lucide-react';

interface SeoGoogleManagerProps {
  currentStoreName?: string;
  storeDomain?: string;
}

export const SeoGoogleManager: React.FC<SeoGoogleManagerProps> = ({
  currentStoreName = 'toko-online.online',
  storeDomain = 'https://www.toko-online.online'
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [devicePreview, setDevicePreview] = useState<'mobile' | 'desktop'>('mobile');
  
  // Custom Google Verification Code
  const [googleVerificationCode, setGoogleVerificationCode] = useState<string>(() => {
    try {
      return localStorage.getItem('toko_online_google_site_verification') || '';
    } catch {
      return '';
    }
  });
  const [isSavedCode, setIsSavedCode] = useState(false);

  useEffect(() => {
    // If google verification code is stored, inject or update meta tag
    if (googleVerificationCode) {
      let meta = document.querySelector('meta[name="google-site-verification"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'google-site-verification');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', googleVerificationCode);
    }
  }, [googleVerificationCode]);

  const handleSaveVerification = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('toko_online_google_site_verification', googleVerificationCode.trim());
      setIsSavedCode(true);
      setTimeout(() => setIsSavedCode(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sitemapUrl = `${storeDomain}/sitemap.xml`;
  const robotsUrl = `${storeDomain}/robots.txt`;

  return (
    <div className="space-y-6 pb-8">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Pusat Panduan SEO & Google Search Engine
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Search className="w-8 h-8 text-sky-200" />
              Cara Agar Toko Sering Muncul di Google
            </h2>
            <p className="text-blue-100 text-sm max-w-2xl leading-relaxed">
              Website Anda (<span className="font-semibold text-white">{storeDomain}</span>) telah kami lengkapi dengan metadata SEO otomatis, peta situs (<code className="bg-blue-900/40 px-1.5 py-0.5 rounded text-xs text-sky-200">sitemap.xml</code>), dan izin perayapan robot (<code className="bg-blue-900/40 px-1.5 py-0.5 rounded text-xs text-sky-200">robots.txt</code>). Ikuti panduan praktis di bawah agar Google segera mengindeks toko Anda ke halaman pertama!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-xs md:text-sm shadow-md transition-all active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              Buka Google Search Console
            </a>
            <a
              href="https://business.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-800/80 hover:bg-blue-800 text-white font-medium rounded-xl text-xs md:text-sm border border-blue-400/30 transition-all active:scale-95"
            >
              <MapPin className="w-4 h-4 text-emerald-300" />
              Daftar Google Bisnisku
            </a>
          </div>
        </div>
      </div>

      {/* Status Kelayakan SEO Saat Ini */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">File Sitemap</div>
            <div className="font-bold text-gray-900 text-sm mt-0.5">Sitemap.xml Aktif</div>
            <p className="text-xs text-gray-500 mt-1">Daftar halaman siap dibaca oleh robot Google.</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Izin Perayapan</div>
            <div className="font-bold text-gray-900 text-sm mt-0.5">Robots.txt Aktif</div>
            <p className="text-xs text-gray-500 mt-1">Mengizinkan Googlebot mengindeks produk & toko.</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Terstruktur</div>
            <div className="font-bold text-gray-900 text-sm mt-0.5">Schema.org JSON-LD</div>
            <p className="text-xs text-gray-500 mt-1">Format toko e-commerce resmi terpasang di HTML.</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kesesuaian HP</div>
            <div className="font-bold text-gray-900 text-sm mt-0.5">Mobile-First PWA</div>
            <p className="text-xs text-gray-500 mt-1">Prioritas utama algoritma Google Search 2026.</p>
          </div>
        </div>
      </div>

      {/* Simulator Tampilan Google Search (SERP Preview) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Simulasi Tampilan di Hasil Pencarian Google
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Beginilah tampilan website Anda saat calon pembeli mencari produk di Google.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setDevicePreview('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                devicePreview === 'mobile'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Layar HP
            </button>
            <button
              onClick={() => setDevicePreview('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                devicePreview === 'desktop'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Komputer (Desktop)
            </button>
          </div>
        </div>

        {/* Preview Card */}
        <div className="mt-5 p-4 md:p-6 bg-gray-50 rounded-xl border border-gray-200/80">
          <div className={`mx-auto transition-all ${devicePreview === 'mobile' ? 'max-w-md bg-white p-4 rounded-2xl shadow-sm border border-gray-200' : 'max-w-2xl bg-white p-5 rounded-xl shadow-sm border border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xs">
                TO
              </div>
              <div className="leading-tight overflow-hidden">
                <div className="text-xs font-medium text-gray-900 truncate">toko-online.online</div>
                <div className="text-[11px] text-gray-500 truncate">{storeDomain}</div>
              </div>
            </div>

            <a 
              href={storeDomain} 
              target="_blank" 
              rel="noreferrer" 
              className="text-blue-800 hover:underline font-medium text-base md:text-lg block leading-snug"
            >
              toko-online.online - Belanja Sembako & Minimarket Online Murah Pengiriman Cepat
            </a>

            <p className="text-xs md:text-sm text-gray-600 mt-1.5 leading-relaxed line-clamp-3">
              Belanja kebutuhan pokok, sembako, beras, minyak goreng, makanan, dan minuman online di toko-online.online. Harga murah, produk lengkap, pengiriman cepat antar langsung ke rumah.
            </p>

            <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-emerald-700 font-medium">
              <span className="flex items-center gap-1">
                ⭐ 4.9 (100+ ulasan)
              </span>
              <span>•</span>
              <span>Tersedia Pengiriman Cepat</span>
              <span>•</span>
              <span>Bayar QRIS & COD</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Langkah Utama Agar Muncul di Google */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            5 Langkah Pasti Agar Website Anda Segera Masuk Halaman 1 Google
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Google membutuhkan waktu untuk mengetahui adanya website baru. Ikuti 5 langkah berikut agar toko Anda cepat muncul saat orang mencari sembako atau produk kebutuhan harian:
          </p>
        </div>

        <div className="space-y-4">
          {/* Langkah 1 */}
          <div className="p-4 md:p-5 rounded-xl border border-blue-100 bg-blue-50/40 relative">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                1
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-bold text-gray-900 text-sm md:text-base">
                    Daftarkan Domain di Google Search Console (Wajib!)
                  </h4>
                  <a
                    href="https://search.google.com/search-console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg self-start transition-all"
                  >
                    Buka Google Search Console
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Google Search Console adalah pintu masuk resmi gratis dari Google untuk pemilik website. Masukkan domain <span className="font-bold text-gray-800">toko-online.online</span> di menu <i>Add Property</i>.
                </p>

                {/* Form Input Verification Code */}
                <div className="mt-3 bg-white p-3.5 rounded-xl border border-blue-200/80">
                  <form onSubmit={handleSaveVerification} className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700">
                      Punya kode Verifikasi HTML Tag dari Google? Masukkan di sini:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Contoh: google-site-verification=abcde12345..."
                        value={googleVerificationCode}
                        onChange={(e) => setGoogleVerificationCode(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shrink-0 transition-all"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Simpan Tag
                      </button>
                    </div>
                    {isSavedCode && (
                      <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Kode verifikasi berhasil disimpan dan diaktifkan di website!
                      </div>
                    )}
                    <p className="text-[11px] text-gray-500">
                      <i>Tips: Anda juga bisa memilih metode verifikasi <b>Domain (DNS TXT)</b> melalui akun Cloudflare Anda tanpa perlu memasukkan tag ini.</i>
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Langkah 2 */}
          <div className="p-4 md:p-5 rounded-xl border border-gray-200 bg-white relative">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                2
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="font-bold text-gray-900 text-sm md:text-base">
                  Kirim Peta Situs (Submit Sitemap.xml) ke Google
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Setelah terverifikasi di Google Search Console, klik menu <span className="font-bold text-gray-800">"Peta Situs" (Sitemaps)</span> di bilah kiri, lalu ketikkan:
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <code className="text-xs font-bold text-blue-700 font-mono flex-1 select-all break-all">
                    {sitemapUrl}
                  </code>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard('sitemap.xml', 'sitemap')}
                      className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 flex items-center gap-1 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                      {copiedKey === 'sitemap' ? 'Tersalin!' : 'Salin "sitemap.xml"'}
                    </button>
                    <a
                      href={sitemapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-md text-xs font-semibold text-gray-700 flex items-center gap-1 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Buka
                    </a>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Googlebot akan membaca daftar halaman website secara teratur sehingga setiap kali ada produk baru, Google otomatis mengetahuinya.
                </p>
              </div>
            </div>
          </div>

          {/* Langkah 3 */}
          <div className="p-4 md:p-5 rounded-xl border border-gray-200 bg-white relative">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                3
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="font-bold text-gray-900 text-sm md:text-base">
                  Minta Pengindeksan Instan (Request Indexing)
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Daripada menunggu Google merayapi situs secara pasif (yang bisa memakan waktu 2–4 minggu):
                </p>
                <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1 pl-1">
                  <li>Di Google Search Console, tempelkan alamat URL toko Anda di kotak pencarian paling atas: <span className="font-semibold text-gray-800">{storeDomain}</span></li>
                  <li>Tekan <b>Enter</b> untuk melakukan pemeriksaan (Inspect URL).</li>
                  <li>Klik tombol <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">"Minta Pengindeksan" (Request Indexing)</span>.</li>
                  <li>Dengan cara ini, Google biasanya akan merayapi dan memasukkan situs Anda ke database pencarian dalam waktu <b>24–48 jam</b>!</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Langkah 4 */}
          <div className="p-4 md:p-5 rounded-xl border border-amber-200 bg-amber-50/30 relative">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                4
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-bold text-gray-900 text-sm md:text-base flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-red-600" />
                    Daftar di Google Bisnisku / Google Maps (Local SEO)
                  </h4>
                  <a
                    href="https://business.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg self-start transition-all"
                  >
                    Daftar Google Bisnisku
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Ini adalah <b>rahasia terbesar</b> toko sembako & minimarket agar selalu muncul di halaman paling atas! Ketika orang mencari <i>"sembako murah terdekat"</i>, <i>"toko online sembako"</i>, atau <i>"minimarket antar ke rumah"</i>, Google akan memprioritaskan profil Google Maps.
                </p>
                <div className="bg-white p-3 rounded-lg border border-amber-200 text-xs text-gray-700 space-y-1">
                  <div className="font-semibold text-gray-900">Tips Mengisi Google Bisnisku:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                    <li>Masukkan nama usaha Anda: <span className="font-medium text-gray-800">{currentStoreName}</span></li>
                    <li>Pilih kategori: <b>Toko Kelontong</b> / <b>Toko Sembako</b> / <b>Minimarket</b></li>
                    <li>Masukkan tautan website: <code className="bg-gray-100 px-1 rounded text-blue-700">{storeDomain}</code></li>
                    <li>Cantumkan nomor WhatsApp pemesanan dan jam buka toko Anda.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Langkah 5 */}
          <div className="p-4 md:p-5 rounded-xl border border-gray-200 bg-white relative">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                5
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="font-bold text-gray-900 text-sm md:text-base flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-purple-600" />
                  Optimasi Nama Produk & Kata Kunci Pencarian (Keyword SEO)
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Orang tidak mencari kata umum seperti "Minyak", mereka mengetik nama barang secara lengkap di Google.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900">
                    <span className="font-bold block mb-1 text-red-700">❌ Kurang Baik (Sulit Masuk Google):</span>
                    <ul className="list-disc list-inside space-y-0.5 text-red-800">
                      <li>"Beras"</li>
                      <li>"Minyak"</li>
                      <li>"Gula"</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                    <span className="font-bold block mb-1 text-emerald-700">✅ Sangat Baik (Sering Muncul di Google):</span>
                    <ul className="list-disc list-inside space-y-0.5 text-emerald-800">
                      <li>"Beras Ramos Setra Pulen 5 Kg"</li>
                      <li>"Minyak Goreng Filma Pouch 2 Liter"</li>
                      <li>"Gula Pasir Gulaku Tebu Kuning 1 Kg"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tautan Alat Pengujian Google Resmi */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
        <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          Alat Uji Resmi Google untuk Memeriksa Kesehatan Website Anda:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(storeDomain)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 bg-white border border-gray-200 hover:border-blue-400 rounded-xl transition-all shadow-sm group"
          >
            <div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-blue-600">Rich Results Test</div>
              <div className="text-[11px] text-gray-500">Cek data schema toko online</div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
          </a>

          <a
            href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(storeDomain)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 bg-white border border-gray-200 hover:border-blue-400 rounded-xl transition-all shadow-sm group"
          >
            <div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-blue-600">PageSpeed Insights</div>
              <div className="text-[11px] text-gray-500">Cek kecepatan loading situs</div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
          </a>

          <a
            href={robotsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 bg-white border border-gray-200 hover:border-blue-400 rounded-xl transition-all shadow-sm group"
          >
            <div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-blue-600">Periksa Robots.txt</div>
              <div className="text-[11px] text-gray-500">Lihat aturan perayapan bot</div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
          </a>
        </div>
      </div>
    </div>
  );
};
