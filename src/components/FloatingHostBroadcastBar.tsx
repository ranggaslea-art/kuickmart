import React from 'react';
import { Mic, MicOff, RefreshCw, Square, Users } from 'lucide-react';
import {
  useHostBroadcast,
  stopHostBroadcast,
  toggleHostMic,
  flipHostCamera,
} from '../utils/liveBroadcastManager';

export const FloatingHostBroadcastBar: React.FC = () => {
  const hostState = useHostBroadcast();

  if (!hostState.isBroadcasting || hostState.isFullscreenPlayerOpen) {
    return null;
  }

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9995] max-w-[94vw] animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/95 backdrop-blur-md border border-red-500/60 text-white shadow-2xl shadow-red-900/30">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600 text-[10px] font-black uppercase tracking-wider animate-pulse shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          ON AIR
        </span>

        <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1 shrink-0">
          <Users className="w-3 h-3" />
          <span>{hostState.viewersCount}</span>
        </span>

        <span className="hidden sm:inline text-[11px] text-white/75 truncate max-w-[160px]">
          Kamera Host Live
        </span>

        <div className="flex items-center gap-1 pl-1 border-l border-white/15">
          <button
            type="button"
            onClick={() => toggleHostMic()}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              hostState.isMicMuted ? 'bg-red-600 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title={hostState.isMicMuted ? 'Nyalakan Mic Host' : 'Bisukan Mic Host'}
          >
            {hostState.isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={() => flipHostCamera()}
            className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            title="Putar Kamera Depan/Belakang"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => stopHostBroadcast()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white text-[10px] font-black transition-colors cursor-pointer shrink-0"
            title="Hentikan Siaran Kamera Host"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
