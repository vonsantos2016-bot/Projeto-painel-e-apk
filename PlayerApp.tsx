import React, { useEffect, useState, useRef } from 'react';
import { Tv, Wifi, WifiOff, RefreshCw, AlertCircle, Smartphone } from 'lucide-react';
import type { Playlist, PlaylistItem, MediaAsset, DynamicContentItem, ScreenDevice, MediaFitMode } from '../types';
import { QrCodeOverlay } from '../components/QrCodeOverlay';

export function PlayerApp() {
  const [screenCode, setScreenCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [screen, setScreen] = useState<ScreenDevice | null>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [dynamicContents, setDynamicContents] = useState<DynamicContentItem[]>([]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(10);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [cursorHidden, setCursorHidden] = useState<boolean>(false);

  const cursorTimerRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  // Initialize or read pairing code from localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    // Path can be /player or /player/:codigo
    let code = params.get('codigo') || params.get('code');
    if (!code && pathSegments.length >= 2 && pathSegments[0] === 'player') {
      code = pathSegments[1];
    }

    if (code) {
      const upper = code.trim().toUpperCase();
      setScreenCode(upper);
      localStorage.setItem('taonmidia_player_code', upper);
    } else {
      const saved = localStorage.getItem('taonmidia_player_code');
      if (saved) {
        setScreenCode(saved);
      } else {
        // Generate a random clean pairing code e.g. TV-8492
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const generated = `TV-${randomNum}`;
        setScreenCode(generated);
        localStorage.setItem('taonmidia_player_code', generated);
      }
    }
  }, []);

  // Hide cursor after 3s of inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setCursorHidden(false);
      if (cursorTimerRef.current) window.clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = window.setTimeout(() => {
        setCursorHidden(true);
      }, 3000);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (cursorTimerRef.current) window.clearTimeout(cursorTimerRef.current);
    };
  }, []);

  // Fetch playlist data from backend
  const fetchPlayerData = async (code: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/player/${encodeURIComponent(code)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setScreen(null);
          setPlaylist(null);
          setError('Aguardando pareamento no painel Tá On Mídia.');
          return;
        }
        throw new Error('Erro ao carregar dados da tela');
      }
      const data = (await res.json()) as {
        screen: ScreenDevice;
        playlist: Playlist | null;
        mediaAssets: MediaAsset[];
        dynamicContents: DynamicContentItem[];
      };
      setScreen(data.screen);
      setPlaylist(data.playlist);
      setMediaAssets(data.mediaAssets || []);
      setDynamicContents(data.dynamicContents || []);
      setIsOfflineMode(false);

      // Save to localStorage cache for offline mode
      try {
        localStorage.setItem(`taonmidia_cache_${code}`, JSON.stringify(data));
      } catch {
        // Storage quota exceeded fallback
      }
    } catch {
      setIsOfflineMode(true);
      // Try loading from cache
      try {
        const cached = localStorage.getItem(`taonmidia_cache_${code}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setScreen(parsed.screen);
          setPlaylist(parsed.playlist);
          setMediaAssets(parsed.mediaAssets || []);
          setDynamicContents(parsed.dynamicContents || []);
        } else {
          setError('Sem conexão com o servidor e sem cache local.');
        }
      } catch {
        setError('Falha na conexão com o painel.');
      }
    }
  };

  // Periodic polling & heartbeat when screenCode is set
  useEffect(() => {
    if (!screenCode) return;
    fetchPlayerData(screenCode);

    // Heartbeat every 60s
    heartbeatTimerRef.current = window.setInterval(async () => {
      try {
        await fetch(`/api/player/${encodeURIComponent(screenCode)}/heartbeat`, {
          method: 'POST',
        });
      } catch {
        // Ignore offline heartbeat errors
      }
    }, 60000);

    // Poll for updates every 20s
    pollTimerRef.current = window.setInterval(() => {
      fetchPlayerData(screenCode);
    }, 20000);

    return () => {
      if (heartbeatTimerRef.current) window.clearInterval(heartbeatTimerRef.current);
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, [screenCode]);

  const activeItems = playlist?.items?.filter((it) => it.enabled !== false) || [];

  // Playlist timer ticker
  useEffect(() => {
    if (activeItems.length === 0) return;
    const currentItem = activeItems[currentIndex] || activeItems[0];
    const duration = currentItem?.durationSeconds || 10;
    setRemainingSeconds(duration);

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setCurrentIndex((idx) => (idx + 1) % activeItems.length);
          return duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentIndex, playlist?.id, activeItems.length]);

  const handleManualPairSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    const upper = inputCode.trim().toUpperCase();
    setScreenCode(upper);
    localStorage.setItem('taonmidia_player_code', upper);
    setInputCode('');
    window.history.replaceState({}, '', `/player/${upper}`);
    fetchPlayerData(upper);
  };

  // If screen is not paired or not found, show pairing screen
  if (!screen || !playlist || activeItems.length === 0) {
    return (
      <div className={`fixed inset-0 bg-[#0A0712] text-white flex flex-col items-center justify-center p-6 select-none ${cursorHidden ? 'cursor-none' : 'cursor-default'}`}>
        <div className="max-w-md w-full bg-[#160F26] border border-purple-900/60 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-purple-800 text-white flex items-center justify-center shadow-lg">
            <Tv className="h-8 w-8 animate-pulse" aria-hidden="true" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Tá On Mídia · Player
            </h1>
            <p className="text-xs text-purple-200/70 mt-1">
              Sistema de Sinalização Digital &amp; TV Indoor
            </p>
          </div>

          <div className="bg-black/40 border border-purple-900/50 rounded-2xl p-5 w-full flex flex-col items-center gap-2">
            <p className="text-[11px] font-mono text-purple-300 uppercase tracking-widest">
              Código de Pareamento da Tela
            </p>
            <p className="text-3xl font-mono font-extrabold text-white tracking-wider">
              {screenCode || 'TV-0000'}
            </p>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Cadastre este código exato na aba <strong className="text-white">Telas</strong> do seu painel e vincule uma Playlist.
            </p>
          </div>

          {error && (
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleManualPairSubmit} className="w-full flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Digite outro código (ex: TV-01)"
              className="flex-1 h-10 px-3 bg-black/60 border border-purple-900/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-mono"
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-xs font-semibold text-white transition-colors"
            >
              Conectar
            </button>
          </form>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {isOfflineMode ? (
              <span className="inline-flex items-center gap-1 text-amber-400">
                <WifiOff className="h-3 w-3" aria-hidden="true" />
                <span>Modo Offline (Tentando reconectar...)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Wifi className="h-3 w-3" aria-hidden="true" />
                <span>Aguardando sinal do painel...</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentItem = activeItems[currentIndex] || activeItems[0];
  const matchedMedia = currentItem.itemType === 'media' ? mediaAssets.find((m) => m.id === currentItem.refId) : null;
  const matchedDyn = currentItem.itemType === 'dynamic' ? dynamicContents.find((d) => d.id === currentItem.refId) : null;

  return (
    <div className={`fixed inset-0 bg-black overflow-hidden select-none flex flex-col justify-between ${cursorHidden ? 'cursor-none' : 'cursor-default'}`}>
      {/* Main Content Viewport */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        {currentItem.itemType === 'media' && matchedMedia && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {matchedMedia.mediaType === 'video' ? (
              <video
                src={matchedMedia.url}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain"
                onEnded={() => setCurrentIndex((idx) => (idx + 1) % activeItems.length)}
              />
            ) : (
              <img
                src={matchedMedia.url}
                alt={matchedMedia.name}
                className="w-full h-full object-contain"
              />
            )}

            {/* Optional Interactive QR Code Overlay */}
            {matchedMedia.qrCode && matchedMedia.qrCode.enabled && (
              <QrCodeOverlay qrCode={matchedMedia.qrCode} />
            )}
          </div>
        )}

        {currentItem.itemType === 'dynamic' && matchedDyn && (
          <div className="relative w-full h-full flex flex-col bg-[#160F26] text-white overflow-hidden">
            {matchedDyn.imageUrl && (
              <div className="absolute inset-0 opacity-30">
                <img src={matchedDyn.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="relative z-10 flex-1 p-12 lg:p-20 flex flex-col justify-between bg-gradient-to-t from-black/90 via-black/50 to-transparent">
              <div className="flex items-center justify-between">
                <span className="px-3.5 py-1.5 rounded-full bg-purple-600 text-white font-mono text-xs uppercase tracking-wider font-bold">
                  {matchedDyn.category}
                </span>
                <span className="font-mono text-xs text-purple-200">
                  {screen.name} · Tá On Mídia
                </span>
              </div>
              <div className="max-w-4xl">
                <h2 className="text-3xl lg:text-5xl font-bold tracking-tight leading-tight text-white">
                  {matchedDyn.title}
                </h2>
                {matchedDyn.subtitle && (
                  <p className="text-lg lg:text-xl text-purple-200 mt-2 font-medium">
                    {matchedDyn.subtitle}
                  </p>
                )}
                {matchedDyn.body && (
                  <p className="text-base lg:text-lg text-slate-300 mt-4 leading-relaxed line-clamp-4">
                    {matchedDyn.body}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-4">
                <span>Atualizado ao vivo via IA / API Externa</span>
                <span className="font-mono">{remainingSeconds}s</span>
              </div>
            </div>
          </div>
        )}

        {!matchedMedia && !matchedDyn && (
          <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
            <Tv className="h-10 w-10 animate-pulse" aria-hidden="true" />
            <p className="text-sm font-medium">Exibindo item de mídia...</p>
          </div>
        )}
      </div>

      {/* Discreta barra de rodapé opcional */}
      <footer className="relative z-20 h-12 bg-black/70 backdrop-blur-md px-6 flex items-center justify-between text-xs text-white/80 border-t border-white/10">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-purple-300">{screen.name}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">{screen.location} ({screen.city}/{screen.state})</span>
        </div>

        <div className="flex items-center gap-4 font-mono">
          <span>Playlist: {playlist.name}</span>
          <span>·</span>
          <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          {isOfflineMode && (
            <span className="text-amber-400 inline-flex items-center gap-1">
              <WifiOff className="h-3 w-3" aria-hidden="true" />
              <span>Offline</span>
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
