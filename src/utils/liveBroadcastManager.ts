import { useEffect, useState } from 'react';

export interface HostBroadcastState {
  status: 'idle' | 'starting' | 'live' | 'error';
  isBroadcasting: boolean;
  slug: string;
  hostId: string;
  stream: MediaStream | null;
  facingMode: 'user' | 'environment';
  isMicMuted: boolean;
  isCameraMuted: boolean;
  viewersCount: number;
  error: string | null;
  wsConnected: boolean;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

type StateListener = (state: HostBroadcastState) => void;

const listeners = new Set<StateListener>();

let currentState: HostBroadcastState = {
  status: 'idle',
  isBroadcasting: false,
  slug: 'default',
  hostId: 'host_' + Math.random().toString(36).slice(2, 10),
  stream: null,
  facingMode: 'user',
  isMicMuted: false,
  isCameraMuted: false,
  viewersCount: 0,
  error: null,
  wsConnected: false,
};

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let frameTimer: ReturnType<typeof setInterval> | null = null;
let hiddenVideoEl: HTMLVideoElement | null = null;
let hiddenCanvasEl: HTMLCanvasElement | null = null;
let isHttpFrameUploading = false;
let lastHttpUploadAt = 0;

const peerConnections = new Map<string, RTCPeerConnection>();
const pendingIceByViewer = new Map<string, RTCIceCandidateInit[]>();

function emitState(partial: Partial<HostBroadcastState>) {
  currentState = { ...currentState, ...partial };
  listeners.forEach((cb) => {
    try {
      cb(currentState);
    } catch {}
  });
}

export function getHostBroadcastSnapshot(): HostBroadcastState {
  return currentState;
}

export function subscribeHostBroadcast(listener: StateListener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

export function useHostBroadcast(): HostBroadcastState {
  const [state, setState] = useState<HostBroadcastState>(() => getHostBroadcastSnapshot());
  useEffect(() => subscribeHostBroadcast(setState), []);
  return state;
}

function sendWs(payload: any): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function closePeer(viewerId: string) {
  const pc = peerConnections.get(viewerId);
  if (pc) {
    try {
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
    } catch {}
    peerConnections.delete(viewerId);
  }
  pendingIceByViewer.delete(viewerId);
}

function closeAllPeers() {
  Array.from(peerConnections.keys()).forEach((vid) => closePeer(vid));
}

async function createOfferForViewer(viewerId: string) {
  if (!currentState.isBroadcasting || !currentState.stream) return;

  // Recreate cleanly if viewer rejoined
  closePeer(viewerId);

  try {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnections.set(viewerId, pc);

    currentState.stream.getTracks().forEach((track) => {
      try {
        pc.addTrack(track, currentState.stream!);
      } catch {}
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendWs({
          type: 'rtc:ice',
          viewerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closePeer(viewerId);
      }
    };

    const offer = await pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    await pc.setLocalDescription(offer);

    sendWs({
      type: 'rtc:offer',
      viewerId,
      sdp: pc.localDescription,
    });
  } catch (err) {
    console.warn('[LiveBroadcast] Gagal membuat WebRTC offer:', err);
  }
}

async function handleViewerAnswer(viewerId: string, sdp: RTCSessionDescriptionInit) {
  const pc = peerConnections.get(viewerId);
  if (!pc || !sdp) return;
  try {
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const queued = pendingIceByViewer.get(viewerId);
    if (queued && queued.length > 0) {
      for (const cand of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch {}
      }
      pendingIceByViewer.delete(viewerId);
    }
  } catch (err) {
    console.warn('[LiveBroadcast] Gagal setRemoteDescription viewer:', err);
  }
}

async function handleViewerIce(viewerId: string, candidate: RTCIceCandidateInit) {
  const pc = peerConnections.get(viewerId);
  if (!pc || !candidate) return;
  if (!pc.remoteDescription) {
    const q = pendingIceByViewer.get(viewerId) || [];
    q.push(candidate);
    pendingIceByViewer.set(viewerId, q);
    return;
  }
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch {}
}

function connectHostSocket(slug: string) {
  if (typeof window === 'undefined' || !currentState.isBroadcasting) return;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/live-stream?slug=${encodeURIComponent(
    slug
  )}&role=host&clientId=${encodeURIComponent(currentState.hostId)}`;

  try {
    const socket = new WebSocket(wsUrl);
    ws = socket;

    socket.onopen = () => {
      emitState({ wsConnected: true });
      sendWs({
        type: 'host:start',
        hostId: currentState.hostId,
        facingMode: currentState.facingMode,
        isCameraMuted: currentState.isCameraMuted,
        isMicMuted: currentState.isMicMuted,
      });
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg || typeof msg.type !== 'string') return;

        if (msg.type === 'viewer:join' && msg.viewerId) {
          if (typeof msg.viewersCount === 'number') {
            emitState({ viewersCount: msg.viewersCount });
          }
          createOfferForViewer(msg.viewerId);
        } else if (msg.type === 'viewer:leave' && msg.viewerId) {
          closePeer(msg.viewerId);
          if (typeof msg.viewersCount === 'number') {
            emitState({ viewersCount: msg.viewersCount });
          }
        } else if (msg.type === 'rtc:answer' && msg.viewerId && msg.sdp) {
          handleViewerAnswer(msg.viewerId, msg.sdp);
        } else if (msg.type === 'rtc:ice' && msg.viewerId && msg.candidate) {
          handleViewerIce(msg.viewerId, msg.candidate);
        }
      } catch {}
    };

    socket.onerror = () => {
      emitState({ wsConnected: false });
    };

    socket.onclose = () => {
      if (ws === socket) {
        ws = null;
      }
      emitState({ wsConnected: false });
      if (currentState.isBroadcasting) {
        reconnectTimer = setTimeout(() => {
          connectHostSocket(currentState.slug);
        }, 2500);
      }
    };
  } catch {
    emitState({ wsConnected: false });
  }
}

function setupCapturePipeline(stream: MediaStream) {
  if (typeof document === 'undefined') return;

  if (!hiddenVideoEl) {
    hiddenVideoEl = document.createElement('video');
    hiddenVideoEl.muted = true;
    hiddenVideoEl.playsInline = true;
    hiddenVideoEl.autoplay = true;
  }

  hiddenVideoEl.srcObject = stream;
  hiddenVideoEl.play().catch(() => {});

  if (!hiddenCanvasEl) {
    hiddenCanvasEl = document.createElement('canvas');
  }

  if (frameTimer) {
    clearInterval(frameTimer);
  }

  frameTimer = setInterval(() => {
    if (!currentState.isBroadcasting || !hiddenVideoEl || !hiddenCanvasEl) return;
    if (currentState.isCameraMuted) return;

    const vw = hiddenVideoEl.videoWidth;
    const vh = hiddenVideoEl.videoHeight;
    if (!vw || !vh) return;

    // Skala ringan untuk siaran cepat di jaringan 4G (~360px sisi terpendek)
    const targetWidth = vw > vh ? 480 : 360;
    const targetHeight = Math.round((vh / vw) * targetWidth);

    if (hiddenCanvasEl.width !== targetWidth || hiddenCanvasEl.height !== targetHeight) {
      hiddenCanvasEl.width = targetWidth;
      hiddenCanvasEl.height = targetHeight;
    }

    const ctx = hiddenCanvasEl.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(hiddenVideoEl, 0, 0, targetWidth, targetHeight);
    const frameDataUrl = hiddenCanvasEl.toDataURL('image/jpeg', 0.6);

    const wsOpen = ws && ws.readyState === WebSocket.OPEN;
    if (wsOpen && ws!.bufferedAmount < 256 * 1024) {
      sendWs({
        type: 'live:frame',
        frame: frameDataUrl,
        ts: Date.now(),
      });
    } else if (!wsOpen) {
      // Fallback HTTP upload ~4 fps apabila WS terblokir proxy
      const now = Date.now();
      if (!isHttpFrameUploading && now - lastHttpUploadAt >= 230) {
        isHttpFrameUploading = true;
        lastHttpUploadAt = now;
        fetch('/api/live-stream-frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: currentState.slug,
            hostId: currentState.hostId,
            frame: frameDataUrl,
            facingMode: currentState.facingMode,
            isCameraMuted: currentState.isCameraMuted,
            isMicMuted: currentState.isMicMuted,
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (typeof d?.viewersCount === 'number') {
              emitState({ viewersCount: d.viewersCount });
            }
          })
          .catch(() => {})
          .finally(() => {
            isHttpFrameUploading = false;
          });
      }
    }
  }, 125); // ~8 FPS real-time frame relay
}

async function acquireCameraStream(facingMode: 'user' | 'environment'): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser ini tidak mendukung akses kamera atau harus dibuka melalui HTTPS.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode,
        width: { ideal: 720 },
        height: { ideal: 1280 },
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });
    } catch {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
    }
  }
}

export async function startHostBroadcast(options?: {
  slug?: string;
  facingMode?: 'user' | 'environment';
}): Promise<boolean> {
  const normSlug = (options?.slug || currentState.slug || 'default').toLowerCase().trim() || 'default';
  const facing = options?.facingMode || currentState.facingMode || 'user';

  if (currentState.isBroadcasting && currentState.stream && currentState.slug === normSlug) {
    return true;
  }

  // Stop existing stream if switching tenant slug
  if (currentState.stream) {
    currentState.stream.getTracks().forEach((t) => t.stop());
  }
  closeAllPeers();

  emitState({
    status: 'starting',
    error: null,
    slug: normSlug,
    facingMode: facing,
  });

  try {
    const stream = await acquireCameraStream(facing);

    // Ensure mute toggles match state
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !currentState.isMicMuted;
    });
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !currentState.isCameraMuted;
    });

    emitState({
      status: 'live',
      isBroadcasting: true,
      slug: normSlug,
      stream,
      facingMode: facing,
      error: null,
    });

    setupCapturePipeline(stream);
    connectHostSocket(normSlug);

    // Send immediate HTTP start ping so viewers polling HTTP notice instantly
    fetch('/api/live-stream-frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: normSlug,
        hostId: currentState.hostId,
        facingMode: facing,
        isCameraMuted: currentState.isCameraMuted,
        isMicMuted: currentState.isMicMuted,
      }),
    }).catch(() => {});

    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (!currentState.isBroadcasting) return;
      if (!sendWs({ type: 'host:ping' })) {
        fetch('/api/live-stream-frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: currentState.slug,
            hostId: currentState.hostId,
            facingMode: currentState.facingMode,
            isCameraMuted: currentState.isCameraMuted,
            isMicMuted: currentState.isMicMuted,
          }),
        }).catch(() => {});
      }
    }, 4500);

    return true;
  } catch (err: any) {
    let friendly = 'Gagal menyalakan kamera perangkat. Pastikan izin kamera & mikrofon diizinkan pada browser.';
    const msg = String(err?.name || err?.message || '');
    if (msg.includes('NotAllowed') || msg.includes('Permission')) {
      friendly = 'Izin kamera ditolak. Ketuk ikon gembok di address bar browser lalu izinkan Kamera & Mikrofon.';
    } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
      friendly = 'Kamera atau webcam tidak ditemukan di perangkat ini.';
    } else if (msg.includes('HTTPS')) {
      friendly = msg;
    }

    emitState({
      status: 'error',
      isBroadcasting: false,
      stream: null,
      error: friendly,
    });
    return false;
  }
}

export function stopHostBroadcast() {
  if (frameTimer) {
    clearInterval(frameTimer);
    frameTimer = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  sendWs({ type: 'host:stop' });

  const prevSlug = currentState.slug;
  const prevHostId = currentState.hostId;

  closeAllPeers();

  if (currentState.stream) {
    currentState.stream.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {}
    });
  }

  if (hiddenVideoEl) {
    hiddenVideoEl.srcObject = null;
  }

  if (ws) {
    try {
      ws.close(1000, 'Host stopped broadcast');
    } catch {}
    ws = null;
  }

  emitState({
    status: 'idle',
    isBroadcasting: false,
    stream: null,
    viewersCount: 0,
    error: null,
    wsConnected: false,
  });

  if (typeof fetch !== 'undefined') {
    fetch('/api/live-stream-broadcast-stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: prevSlug, hostId: prevHostId }),
    }).catch(() => {});
  }
}

export function toggleHostMic(): boolean {
  const nextMuted = !currentState.isMicMuted;
  if (currentState.stream) {
    currentState.stream.getAudioTracks().forEach((t) => {
      t.enabled = !nextMuted;
    });
  }
  emitState({ isMicMuted: nextMuted });
  sendWs({
    type: 'host:state',
    isMicMuted: nextMuted,
    isCameraMuted: currentState.isCameraMuted,
    facingMode: currentState.facingMode,
  });
  return nextMuted;
}

export function toggleHostCamera(): boolean {
  const nextMuted = !currentState.isCameraMuted;
  if (currentState.stream) {
    currentState.stream.getVideoTracks().forEach((t) => {
      t.enabled = !nextMuted;
    });
  }
  emitState({ isCameraMuted: nextMuted });
  sendWs({
    type: 'host:state',
    isMicMuted: currentState.isMicMuted,
    isCameraMuted: nextMuted,
    facingMode: currentState.facingMode,
  });
  return nextMuted;
}

export async function flipHostCamera(): Promise<void> {
  const nextFacing = currentState.facingMode === 'user' ? 'environment' : 'user';
  emitState({ facingMode: nextFacing });

  if (!currentState.isBroadcasting) return;

  try {
    const oldStream = currentState.stream;
    if (oldStream) {
      oldStream.getVideoTracks().forEach((t) => t.stop());
    }

    const newStream = await acquireCameraStream(nextFacing);
    newStream.getAudioTracks().forEach((t) => {
      t.enabled = !currentState.isMicMuted;
    });
    newStream.getVideoTracks().forEach((t) => {
      t.enabled = !currentState.isCameraMuted;
    });

    const newVideoTrack = newStream.getVideoTracks()[0];
    const newAudioTrack = newStream.getAudioTracks()[0];

    peerConnections.forEach((pc) => {
      const senders = pc.getSenders();
      if (newVideoTrack) {
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(newVideoTrack).catch(() => {});
        }
      }
      if (newAudioTrack) {
        const audioSender = senders.find((s) => s.track?.kind === 'audio');
        if (audioSender) {
          audioSender.replaceTrack(newAudioTrack).catch(() => {});
        }
      }
    });

    if (oldStream) {
      oldStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
    }

    emitState({ stream: newStream, facingMode: nextFacing });
    setupCapturePipeline(newStream);
    sendWs({
      type: 'host:state',
      facingMode: nextFacing,
      isMicMuted: currentState.isMicMuted,
      isCameraMuted: currentState.isCameraMuted,
    });
  } catch (err) {
    console.warn('[LiveBroadcast] Gagal membalik kamera:', err);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (currentState.isBroadcasting) {
      try {
        navigator.sendBeacon?.(
          '/api/live-stream-broadcast-stop',
          new Blob([JSON.stringify({ slug: currentState.slug, hostId: currentState.hostId })], {
            type: 'application/json',
          })
        );
      } catch {}
    }
  });
}
