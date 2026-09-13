import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  Search, 
  Check, 
  X, 
  RefreshCw, 
  Cpu, 
  Usb, 
  Radio, 
  Globe, 
  Laptop, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  Download, 
  Copy, 
  ExternalLink, 
  FileText, 
  Trash2,
  HelpCircle,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { DiscoveredOsPrinter, ClientOsEnvironment, OsPrinterInterfaceType } from '../types/osPrinter';
import { 
  detectClientOsEnvironment, 
  getDefaultKnownOsPrinters, 
  getSavedSelectedPrinter, 
  saveSelectedPrinter, 
  getCustomPrinters, 
  addCustomPrinter, 
  removeCustomPrinter, 
  scanSerialPorts, 
  requestOsSerialPort, 
  requestOsUsbDevice, 
  requestOsBluetoothPrinter, 
  checkLocalhostPrintAgent,
  generatePrinterDiagnosticTestHtml,
  executeTestPrint
} from '../utils/osPrinterDiscovery';

interface OsPrinterSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrinter?: (printer: DiscoveredOsPrinter) => void;
  currentSelectedPrinter?: DiscoveredOsPrinter | null;
}

export const OsPrinterSearchModal: React.FC<OsPrinterSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectPrinter,
  currentSelectedPrinter
}) => {
  // 1. Environment State
  const [osEnv, setOsEnv] = useState<ClientOsEnvironment>(() => detectClientOsEnvironment());
  
  // 2. Printers State
  const [printers, setPrinters] = useState<DiscoveredOsPrinter[]>(() => {
    const known = getDefaultKnownOsPrinters();
    const custom = getCustomPrinters();
    return [...custom, ...known];
  });

  const [activeSelectedPrinter, setActiveSelectedPrinter] = useState<DiscoveredOsPrinter>(() => {
    return currentSelectedPrinter || getSavedSelectedPrinter() || getDefaultKnownOsPrinters()[0];
  });

  // 3. UI State
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [testPrintFeedback, setTestPrintFeedback] = useState<string | null>(null);
  const [previewTestPage, setPreviewTestPage] = useState<boolean>(false);

  // Manual IP Add form state
  const [showAddIpForm, setShowAddIpForm] = useState(false);
  const [manualIp, setManualIp] = useState('192.168.1.200');
  const [manualPort, setManualPort] = useState('9100');
  const [manualName, setManualName] = useState('Epson TM-U220 / TM-T82 LAN');

  // Refresh environment on open
  useEffect(() => {
    if (isOpen) {
      const detected = detectClientOsEnvironment();
      setOsEnv(detected);
      
      const saved = currentSelectedPrinter || getSavedSelectedPrinter();
      if (saved) {
        setActiveSelectedPrinter(saved);
      }

      // Auto-scan serial ports if supported
      if (detected.supportsWebSerial) {
        scanSerialPorts().then(serialPorts => {
          if (serialPorts.length > 0) {
            setPrinters(prev => {
              const ids = new Set(prev.map(p => p.id));
              const newItems = serialPorts.filter(p => !ids.has(p.id));
              return [...newItems, ...prev];
            });
          }
        }).catch(() => {});
      }

      // Auto-check localhost print agent
      checkLocalhostPrintAgent().then(agent => {
        if (agent) {
          setPrinters(prev => {
            if (!prev.some(p => p.id === agent.id)) {
              return [agent, ...prev];
            }
            return prev;
          });
        }
      }).catch(() => {});
    }
  }, [isOpen, currentSelectedPrinter]);

  // Notifications helper
  const showFeedback = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setScanFeedback({ type, message });
    setTimeout(() => setScanFeedback(null), 4500);
  };

  // Select a printer
  const handleSelectPrinter = (printer: DiscoveredOsPrinter) => {
    setActiveSelectedPrinter(printer);
    saveSelectedPrinter(printer);
    if (onSelectPrinter) {
      onSelectPrinter(printer);
    }
    showFeedback(`Printer "${printer.name}" berhasil ditetapkan sebagai printer aktif kasir!`, 'success');
  };

  // Trigger test print
  const handleTestPrint = async (printer: DiscoveredOsPrinter) => {
    setTestPrintFeedback(`Mengirim halaman uji coba diagnostik ke ${printer.name}...`);
    try {
      const success = await executeTestPrint(printer, osEnv);
      if (success) {
        setTestPrintFeedback(`✅ Halaman tes berhasil dikirim ke printer "${printer.name}"!`);
      } else {
        setTestPrintFeedback(`⚠️ Perintah cetak dikirim. Silakan periksa jendela spooler cetak OS.`);
      }
    } catch (err: any) {
      setTestPrintFeedback(`❌ Gagal mengirim perintah cetak: ${err.message || 'Error tidak diketahui'}`);
    }
    setTimeout(() => setTestPrintFeedback(null), 5000);
  };

  // Trigger OS Print Dialog Picker
  const handleTriggerOsPrintSpoolerPicker = () => {
    showFeedback('Membuka antarmuka Spooler Sistem Operasi untuk memilih printer terpasang di OS...', 'info');
    handleTestPrint(activeSelectedPrinter);
  };

  // Search COM Serial Port
  const handleScanSerialPort = async () => {
    setIsScanning(true);
    try {
      const newPrinter = await requestOsSerialPort();
      if (newPrinter) {
        setPrinters(prev => [newPrinter, ...prev]);
        handleSelectPrinter(newPrinter);
        showFeedback(`Port Serial hardware "${newPrinter.name}" berhasil terhubung ke OS!`, 'success');
      } else {
        showFeedback('Pemilihan port serial dibatalkan oleh pengguna.', 'info');
      }
    } catch (err: any) {
      showFeedback(err.message || 'Gagal mengakses port serial pada sistem operasi.', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Search USB Printer
  const handleScanUsbDevice = async () => {
    setIsScanning(true);
    try {
      const newPrinter = await requestOsUsbDevice();
      if (newPrinter) {
        setPrinters(prev => [newPrinter, ...prev]);
        handleSelectPrinter(newPrinter);
        showFeedback(`Printer USB "${newPrinter.name}" berhasil ditambahkan dari sistem operasi!`, 'success');
      } else {
        showFeedback('Pemilihan perangkat USB dibatalkan oleh pengguna.', 'info');
      }
    } catch (err: any) {
      showFeedback(err.message || 'Gagal mengakses perangkat USB printer pada OS.', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Search Bluetooth POS
  const handleScanBluetooth = async () => {
    setIsScanning(true);
    try {
      const newPrinter = await requestOsBluetoothPrinter();
      if (newPrinter) {
        setPrinters(prev => [newPrinter, ...prev]);
        handleSelectPrinter(newPrinter);
        showFeedback(`Printer Bluetooth "${newPrinter.name}" berhasil dipasangkan!`, 'success');
      } else {
        showFeedback('Pemilihan Bluetooth dibatalkan.', 'info');
      }
    } catch (err: any) {
      showFeedback(err.message || 'Gagal mencari printer Bluetooth.', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Add Manual Network Printer
  const handleAddManualIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;

    const newPrinter: DiscoveredOsPrinter = {
      id: `net-ip-${manualIp.replace(/\./g, '-')}-${manualPort}`,
      name: manualName.trim() || `Network Printer (${manualIp})`,
      interfaceType: 'network_ip',
      description: `Printer jaringan LAN/Ethernet pada alamat IP ${manualIp}:${manualPort} (RAW Socket 9100).`,
      status: 'ready',
      port: `${manualIp}:${manualPort}`,
      paperType: '70mm_dotmatrix',
      manufacturer: 'Network POS Printer',
      details: {
        ipAddress: manualIp,
        rawPort: parseInt(manualPort, 10) || 9100,
        supportsRawEscPos: true,
      },
    };

    addCustomPrinter(newPrinter);
    setPrinters(prev => [newPrinter, ...prev]);
    handleSelectPrinter(newPrinter);
    setShowAddIpForm(false);
    showFeedback(`Printer jaringan ${manualIp} berhasil ditambahkan!`, 'success');
  };

  // Remove custom printer
  const handleRemovePrinter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCustomPrinter(id);
    setPrinters(prev => prev.filter(p => p.id !== id));
    showFeedback('Printer berhasil dihapus dari daftar lokal.', 'info');
  };

  // Filtered printers list
  const filteredPrinters = useMemo(() => {
    return printers.filter(p => {
      // Filter type
      if (filterType !== 'all') {
        if (filterType === 'spooler' && p.interfaceType !== 'os_spooler') return false;
        if (filterType === 'serial' && p.interfaceType !== 'serial_com') return false;
        if (filterType === 'usb' && p.interfaceType !== 'usb_direct') return false;
        if (filterType === 'wireless' && (p.interfaceType !== 'bluetooth' && p.interfaceType !== 'network_ip')) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.port && p.port.toLowerCase().includes(q)) ||
          (p.manufacturer && p.manufacturer.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [printers, filterType, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200">
        {/* ============================================================ */}
        {/* 1. HEADER MODAL & OS MEDIA BADGES                            */}
        {/* ============================================================ */}
        <header className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg text-white">
                  Pencarian Printer Sistem Operasi
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[10px] font-mono font-bold">
                  OS Discovery Engine
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Deteksi printer terpasang di media perangkat kasir (Windows, Linux, macOS, Android POS)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick OS Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-stone-800 rounded-xl text-xs font-medium text-stone-300 border border-stone-700">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>{osEnv.osName}</span>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              title="Tutup Pencarian Printer [Esc]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Feedback / Notification Banner */}
        {scanFeedback && (
          <div className={`px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0 shadow-2xs ${
            scanFeedback.type === 'success' 
              ? 'bg-emerald-600 text-white' 
              : scanFeedback.type === 'error' 
              ? 'bg-rose-600 text-white' 
              : 'bg-sky-600 text-white'
          }`}>
            <div className="flex items-center gap-2">
              {scanFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Info className="w-4 h-4" />}
              <span>{scanFeedback.message}</span>
            </div>
            <button onClick={() => setScanFeedback(null)} className="text-white hover:opacity-80 p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {testPrintFeedback && (
          <div className="px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0 bg-amber-500 text-stone-950 shadow-2xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>{testPrintFeedback}</span>
            </div>
            <button onClick={() => setTestPrintFeedback(null)} className="p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. MEDIA DIAGNOSTIC & HARDWARE CAPABILITIES CARD            */}
        {/* ============================================================ */}
        <div className="bg-stone-50 border-b border-stone-200 p-3 sm:px-5 sm:py-3 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {/* Box 1: OS Detected */}
            <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Laptop className="w-3 h-3 text-stone-500" />
                <span>Sistem Operasi</span>
              </div>
              <div className="font-bold text-stone-900 truncate mt-0.5" title={osEnv.osName}>
                {osEnv.osName}
              </div>
              <div className="text-[10px] text-stone-500">{osEnv.deviceType}</div>
            </div>

            {/* Box 2: Browser & Spooler */}
            <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Globe className="w-3 h-3 text-stone-500" />
                <span>Peramban & Spooler</span>
              </div>
              <div className="font-bold text-stone-900 truncate mt-0.5">
                {osEnv.browserName}
              </div>
              <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>OS Spooler Aktif</span>
              </div>
            </div>

            {/* Box 3: Web Serial (COM TM-U220) */}
            <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Cpu className="w-3 h-3 text-stone-500" />
                <span>Port Serial (COM)</span>
              </div>
              <div className="font-bold text-stone-900 truncate mt-0.5">
                {osEnv.supportsWebSerial ? 'Didukung (Hardware COM)' : 'Memerlukan Chrome/Edge'}
              </div>
              <div className={`text-[10px] font-medium flex items-center gap-1 ${osEnv.supportsWebSerial ? 'text-emerald-600' : 'text-amber-600'}`}>
                {osEnv.supportsWebSerial ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                <span>{osEnv.supportsWebSerial ? 'Siap scan TM-U220 Serial' : 'Gunakan driver OS Spooler'}</span>
              </div>
            </div>

            {/* Box 4: WebUSB & Bluetooth */}
            <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Usb className="w-3 h-3 text-stone-500" />
                <span>Direct USB / BT</span>
              </div>
              <div className="font-bold text-stone-900 truncate mt-0.5">
                {osEnv.supportsWebUsb ? 'WebUSB Aktif' : 'USB Spooler'}
              </div>
              <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Plug & Play POS Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. DISCOVERY ACTION BAR: SCAN BUTTONS & TRIGGER OS DIALOG    */}
        {/* ============================================================ */}
        <div className="p-3 sm:px-5 border-b border-stone-200 bg-white shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Button 1: Buka Dialog Spooler OS */}
              <button
                type="button"
                onClick={handleTriggerOsPrintSpoolerPicker}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                title="Buka daftar printer terpasang di sistem operasi melalui Spooler Dialog"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-200" />
                <span>Buka Spooler Printer OS</span>
              </button>

              {/* Button 2: Scan Port Serial (COM) */}
              <button
                type="button"
                disabled={!osEnv.supportsWebSerial || isScanning}
                onClick={handleScanSerialPort}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  osEnv.supportsWebSerial
                    ? 'bg-stone-900 hover:bg-stone-800 text-white border-stone-800 active:scale-95'
                    : 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                }`}
                title="Pindai port serial COM1-COM4 yang terpasang di OS (misal TM-U220 Serial)"
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>+ Pindai Port COM Serial</span>
              </button>

              {/* Button 3: Scan USB Direct */}
              <button
                type="button"
                disabled={!osEnv.supportsWebUsb || isScanning}
                onClick={handleScanUsbDevice}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  osEnv.supportsWebUsb
                    ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300 active:scale-95'
                    : 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                }`}
                title="Pindai printer USB yang terpasang langsung di OS (Epson, Star, Xprinter)"
              >
                <Usb className="w-3.5 h-3.5 text-stone-600" />
                <span>+ Pindai USB Langsung</span>
              </button>

              {/* Button 4: Scan Bluetooth */}
              {osEnv.supportsWebBluetooth && (
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={handleScanBluetooth}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-stone-300 transition-all cursor-pointer active:scale-95"
                  title="Pindai printer nirkabel Bluetooth yang terhubung ke OS"
                >
                  <Radio className="w-3.5 h-3.5 text-blue-600" />
                  <span>+ Pindai Bluetooth</span>
                </button>
              )}

              {/* Button 5: Tambah IP Network */}
              <button
                type="button"
                onClick={() => setShowAddIpForm(!showAddIpForm)}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-stone-300 transition-all cursor-pointer"
                title="Tambah printer jaringan lokal IP LAN (Port 9100)"
              >
                <Globe className="w-3.5 h-3.5 text-stone-600" />
                <span>+ Tambah IP LAN</span>
              </button>
            </div>

            {/* Quick Preview Toggle */}
            <button
              type="button"
              onClick={() => setPreviewTestPage(!previewTestPage)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                previewTestPage 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-400' 
                  : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{previewTestPage ? 'Tutup Pratinjau Tes' : 'Pratinjau Halaman Tes'}</span>
            </button>
          </div>

          {/* Form Tambah Printer IP Jaringan (Accordion) */}
          {showAddIpForm && (
            <form onSubmit={handleAddManualIp} className="mt-3 p-3 bg-stone-100/80 rounded-2xl border border-stone-300 animate-slideDown flex flex-wrap items-end gap-2.5">
              <div className="flex-1 min-w-[180px]">
                <label className="text-[10px] font-bold uppercase text-stone-600 block mb-1">Nama Printer Jaringan</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Contoh: Epson TM-U220 Dapur / Kasir"
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-medium focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              <div className="w-40">
                <label className="text-[10px] font-bold uppercase text-stone-600 block mb-1">Alamat IP (LAN)</label>
                <input
                  type="text"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  placeholder="192.168.1.200"
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-medium focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              <div className="w-24">
                <label className="text-[10px] font-bold uppercase text-stone-600 block mb-1">Port RAW</label>
                <input
                  type="number"
                  value={manualPort}
                  onChange={(e) => setManualPort(e.target.value)}
                  placeholder="9100"
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-medium focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Simpan Printer IP
              </button>
              <button
                type="button"
                onClick={() => setShowAddIpForm(false)}
                className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
            </form>
          )}
        </div>

        {/* ============================================================ */}
        {/* 4. MAIN BODY: PRINTERS LIST & LIVE PREVIEW TEST PAGE         */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone-200 min-h-0">
          
          {/* LEFT: DISCOVERED PRINTERS LIST (7 or 12 cols) */}
          <div className={`${previewTestPage ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col min-h-0 overflow-hidden bg-stone-50/50`}>
            {/* Search & Filter Header */}
            <div className="p-3 border-b border-stone-200 bg-white flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari printer terpasang di OS (misal: TM-U220, Spooler, COM)..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Tabs filter */}
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filterType === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  Semua ({printers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('spooler')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filterType === 'spooler' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  Spooler OS
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('serial')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filterType === 'serial' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  Serial COM
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('usb')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filterType === 'usb' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  USB Direct
                </button>
              </div>
            </div>

            {/* Scrollable Printers List */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
              {filteredPrinters.length === 0 ? (
                <div className="py-16 text-center text-stone-400">
                  <Printer className="w-10 h-10 mx-auto mb-2 opacity-30 text-stone-400" />
                  <p className="text-sm font-bold text-stone-600">Tidak ada printer yang cocok dengan kriteria.</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Gunakan tombol "Buka Spooler Printer OS" atau "+ Pindai Port COM Serial" untuk menambahkan printer dari sistem operasi Anda.
                  </p>
                </div>
              ) : (
                filteredPrinters.map((printer) => {
                  const isCurrent = activeSelectedPrinter.id === printer.id;
                  const isCustom = printer.id.startsWith('net-ip-') || printer.id.startsWith('usb-device-') || printer.id.startsWith('serial-com-');

                  return (
                    <div
                      key={printer.id}
                      onClick={() => handleSelectPrinter(printer)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                        isCurrent
                          ? 'bg-emerald-50/90 border-emerald-400 shadow-xs ring-2 ring-emerald-200'
                          : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            isCurrent 
                              ? 'bg-emerald-600 text-white shadow-xs' 
                              : printer.interfaceType === 'serial_com'
                              ? 'bg-stone-800 text-emerald-400'
                              : 'bg-stone-100 text-stone-600'
                          }`}>
                            <Printer className="w-5 h-5" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-xs sm:text-sm text-stone-900">
                                {printer.name}
                              </h3>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                                  <Check className="w-3 h-3" />
                                  <span>Printer Aktif Kasir</span>
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 text-[10px] font-mono uppercase font-bold">
                                {printer.interfaceType.replace('_', ' ')}
                              </span>
                            </div>

                            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                              {printer.description}
                            </p>

                            <div className="flex items-center gap-2.5 mt-2 text-[11px] text-stone-500 font-mono">
                              <span>Port: <strong className="text-stone-700">{printer.port || 'Sistem Spooler'}</strong></span>
                              <span>•</span>
                              <span>Kertas: <strong className="text-stone-700">{printer.paperType === '70mm_dotmatrix' ? '70mm Dot Matrix (Roll 76mm)' : printer.paperType}</strong></span>
                              {printer.details?.baudRate && (
                                <>
                                  <span>•</span>
                                  <span>Baudrate: <strong className="text-stone-700">{printer.details.baudRate} bps</strong></span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleTestPrint(printer)}
                            className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                            title="Kirim halaman uji coba (test print) ke printer ini"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden sm:inline">Uji Coba</span>
                          </button>

                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleSelectPrinter(printer)}
                              className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold cursor-pointer transition-all"
                            >
                              Pilih
                            </button>
                          )}

                          {isCustom && (
                            <button
                              type="button"
                              onClick={(e) => handleRemovePrinter(printer.id, e)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus printer ini dari daftar lokal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary in Left List */}
            <div className="p-3 border-t border-stone-200 bg-white flex items-center justify-between text-xs text-stone-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Printer Terpilih: <strong className="text-stone-900">{activeSelectedPrinter.name}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => handleTestPrint(activeSelectedPrinter)}
                className="text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Test Cetak Printer Aktif</span>
              </button>
            </div>
          </div>

          {/* RIGHT: LIVE TEST PAGE PREVIEW (5 cols, only shown if previewTestPage is true) */}
          {previewTestPage && (
            <div className="lg:col-span-5 p-4 flex flex-col min-h-0 bg-stone-100 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-xs text-stone-800 uppercase tracking-wider">
                    Pratinjau Halaman Tes Diagnostik
                  </span>
                </div>
                <span className="text-[10px] font-mono text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                  {activeSelectedPrinter.paperType === '70mm_dotmatrix' ? '70mm Dot Matrix' : activeSelectedPrinter.paperType}
                </span>
              </div>

              {/* White Receipt Slip Simulation */}
              <div className="bg-white rounded-2xl p-4 shadow-md border border-stone-300 font-mono text-[11px] leading-tight text-stone-900 select-all max-w-[320px] mx-auto w-full">
                <div className="text-center font-black text-xs mb-1">*** UJI COBA PRINTER OS ***</div>
                <div className="text-center text-[9.5px] text-stone-500 mb-2">DIAGNOSTIK SISTEM KASIR POS</div>
                <div className="border-t-2 border-stone-900 my-2"></div>

                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>PRINTER:</span>
                    <strong className="truncate max-w-[160px]">{activeSelectedPrinter.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>INTERFACE:</span>
                    <span>{activeSelectedPrinter.interfaceType.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PORT:</span>
                    <strong>{activeSelectedPrinter.port || 'Sistem Spooler'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>STATUS:</span>
                    <strong className="text-emerald-700">[ SIAP / READY ]</strong>
                  </div>
                </div>

                <div className="border-t border-dashed border-stone-400 my-2"></div>
                <div className="text-center font-bold text-[9.5px] text-stone-600">INFORMASI MEDIA SISTEM OPERASI</div>
                <div className="border-t border-dashed border-stone-400 my-2"></div>

                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>OS MEDIA:</span>
                    <strong>{osEnv.osName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>DEVICE:</span>
                    <span>{osEnv.deviceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PERAMBAN:</span>
                    <span>{osEnv.browserName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>HOST:</span>
                    <span>{osEnv.userHost}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-stone-400 my-2"></div>
                <div className="font-bold text-[9.5px]">TEST HEAD / PIN DOT MATRIX:</div>
                <div className="bg-stone-900 text-white font-mono font-bold tracking-widest text-center py-1 my-1 text-[9px]">
                  ||||||||||||||||||||||||||||||||||||||||
                </div>

                <div className="border border-stone-800 p-1.5 my-2 text-center text-[9px]">
                  [+] KOTAK ALIGNMENT 70MM [+]<br/>
                  Batas cetak presisi TM-U220
                </div>

                <div className="border-t border-dashed border-stone-400 my-2"></div>
                <div className="text-center font-black text-[10px] text-emerald-800">
                  HASIL TEST: TERKONEKSI!
                </div>
                <div className="border-t-2 border-stone-900 my-2"></div>
                <div className="text-center text-[9px] text-stone-400">--- SOBEK KERTAS DISINI ---</div>
              </div>

              {/* Action Buttons for Preview */}
              <div className="mt-4 space-y-2 max-w-[320px] mx-auto w-full">
                <button
                  type="button"
                  onClick={() => handleTestPrint(activeSelectedPrinter)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4 text-emerald-200" />
                  <span>CETAK HALAMAN TEST INI KE OS</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ============================================================ */}
        {/* 5. MODAL BOTTOM FOOTER                                       */}
        {/* ============================================================ */}
        <footer className="px-5 py-3 border-t border-stone-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-stone-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Printer yang Anda pilih akan digunakan sebagai tujuan cetak nota dan struk kasir Epson TM-U220.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs"
            >
              Selesai & Tutup
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
