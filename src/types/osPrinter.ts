export type OsPrinterInterfaceType = 
  | 'os_spooler' 
  | 'serial_com' 
  | 'usb_direct' 
  | 'bluetooth' 
  | 'network_ip' 
  | 'local_agent';

export interface DiscoveredOsPrinter {
  id: string;
  name: string;
  interfaceType: OsPrinterInterfaceType;
  description: string;
  status: 'online' | 'ready' | 'needs_permission' | 'offline';
  isDefault?: boolean;
  port?: string; // e.g. "COM3", "USB001", "192.168.1.100:9100"
  manufacturer?: string; // e.g. "Epson", "Star", "Generic"
  paperType: '70mm_dotmatrix' | '80mm_thermal' | '58mm_thermal' | 'a4_continuous';
  details?: {
    vendorId?: string;
    productId?: string;
    baudRate?: number;
    ipAddress?: string;
    rawPort?: number;
    osDriverName?: string;
    supportsRawEscPos?: boolean;
    systemDriver?: string;
  };
}

export interface ClientOsEnvironment {
  osName: string; // e.g. "Windows 11", "Windows 10", "Linux POS", "macOS", "Android"
  osPlatform: string;
  browserName: string; // e.g. "Google Chrome", "Microsoft Edge", "Firefox", "Safari"
  browserVersion?: string;
  deviceType: 'Desktop PC Kasir' | 'Laptop' | 'Tablet POS' | 'Smartphone POS';
  isSecureContext: boolean;
  supportsWebSerial: boolean;
  supportsWebUsb: boolean;
  supportsWebBluetooth: boolean;
  supportsWindowPrint: boolean;
  userHost: string;
  userAgentString: string;
}
