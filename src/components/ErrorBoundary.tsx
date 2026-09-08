import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.removeItem('kuickmart_admin_user');
      localStorage.removeItem('pos_current_user');
    } catch (e) {
      console.error(e);
    }
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div id="error-boundary-container" className="min-h-[360px] p-6 sm:p-8 flex items-center justify-center bg-stone-50 border border-stone-200 rounded-3xl m-4 shadow-sm">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-extrabold text-lg text-stone-900">
                {this.props.fallbackTitle || 'Terjadi Kendala Memuat Modul'}
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Sistem mendeteksi galat saat memproses tampilan atau data sesi. Anda dapat memuat ulang tampilan atau mereset sesi untuk kembali normal.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl text-left text-[11px] font-mono text-red-800 max-h-24 overflow-y-auto">
                <div className="font-bold flex items-center gap-1 text-red-900 mb-0.5">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  <span>Detail Galat:</span>
                </div>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                id="btn-error-boundary-reload"
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang Halaman</span>
              </button>

              <button
                id="btn-error-boundary-reset"
                type="button"
                onClick={this.handleResetSession}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-stone-600" />
                <span>Reset Sesi Login</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
