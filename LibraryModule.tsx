import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Film,
  Image as ImageIcon,
  Maximize2,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { MediaAsset, MediaFitMode, MediaQrCodeConfig } from '../types';
import {
  DEFAULT_QR_CODE_CONFIG,
  QrCodeConfigPanel,
  QrCodeOverlay,
} from './QrCodeOverlay';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readLocalMediaDimensions(
  file: File
): Promise<{ widthPx?: number; heightPx?: number; videoDuration?: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    if (file.type.startsWith('image/')) {
      return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () =>
          resolve({ widthPx: img.naturalWidth, heightPx: img.naturalHeight });
        img.onerror = () => resolve({});
        img.src = objectUrl;
      });
    }
    if (file.type.startsWith('video/')) {
      return await new Promise((resolve) => {
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.onloadedmetadata = () =>
          resolve({
            widthPx: vid.videoWidth || undefined,
            heightPx: vid.videoHeight || undefined,
            videoDuration:
              Number.isFinite(vid.duration) && vid.duration > 0
                ? Math.round(vid.duration)
                : undefined,
          });
        vid.onerror = () => resolve({});
        vid.src = objectUrl;
      });
    }
    return {};
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  }
}

function getQualityAssessment(asset: MediaAsset): {
  status: 'optimal' | 'ratio' | 'lowres';
  label: string;
} {
  const w = asset.widthPx || Number(asset.resolution.split('x')[0]) || 1920;
  const h = asset.heightPx || Number(asset.resolution.split('x')[1]) || 1080;
  const minSide = Math.min(w, h);
  const maxSide = Math.max(w, h);
  if (maxSide < 1280 || minSide < 720) {
    return {
      status: 'lowres',
      label: 'Baixa resolução · Evitar ampliar para não embaçar',
    };
  }
  const ratio = w / h;
  const is16by9 =
    Math.abs(ratio - 16 / 9) < 0.06 || Math.abs(ratio - 9 / 16) < 0.06;
  if (!is16by9) {
    return {
      status: 'ratio',
      label: 'Proporção diferente · APK exibirá inteiro sem cortar/esticar',
    };
  }
  return {
    status: 'optimal',
    label: 'Nítida · Sem corte, esticar ou esfumaçar',
  };
}

function MediaLibraryCard({
  asset,
  onUpdateMidia,
  onDeleteMidia,
  onOpenPreview,
}: {
  asset: MediaAsset;
  onUpdateMidia: (
    id: string,
    payload: {
      fitMode?: MediaFitMode;
      durationSeconds?: number;
      qrCode?: MediaQrCodeConfig | null;
    }
  ) => Promise<void>;
  onDeleteMidia: (id: string) => Promise<void>;
  onOpenPreview: (asset: MediaAsset) => void;
}) {
  const quality = getQualityAssessment(asset);
  const activeFit: MediaFitMode = asset.fitMode || 'FIT_NO_CROP';

  const [draftQr, setDraftQr] = useState<MediaQrCodeConfig>(
    asset.qrCode || DEFAULT_QR_CODE_CONFIG
  );
  const [savingQr, setSavingQr] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (asset.qrCode) {
      setDraftQr(asset.qrCode);
    }
  }, [asset.qrCode]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const persistQr = async (next: MediaQrCodeConfig) => {
    setSavingQr(true);
    try {
      await onUpdateMidia(asset.id, { qrCode: next });
    } finally {
      setSavingQr(false);
    }
  };

  const handleQrChange = (
    next: MediaQrCodeConfig,
    commitImmediately = false
  ) => {
    setDraftQr(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (commitImmediately) {
      void persistQr(next);
    } else {
      debounceRef.current = window.setTimeout(() => {
        void persistQr(next);
      }, 500);
    }
  };

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
      {/* Left: 16:9 Mini-Preview with live proportional QR Code + Info */}
      <div className="md:col-span-5 flex flex-col gap-3">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-200">
          {asset.mediaType === 'video' ? (
            <video
              src={asset.url}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
            />
          ) : (
            <img
              src={asset.url}
              alt={asset.name}
              className="h-full w-full object-contain"
            />
          )}
          <QrCodeOverlay qrCode={draftQr} />
          <button
            type="button"
            onClick={() => onOpenPreview({ ...asset, qrCode: draftQr })}
            aria-label={`Visualizar ${asset.name}`}
            className="absolute inset-0 z-30 bg-slate-950/0 hover:bg-slate-950/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 text-white"
          >
            <span className="px-3 py-1.5 rounded-lg bg-slate-950/85 text-xs font-medium inline-flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Preview Real TV</span>
            </span>
          </button>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 truncate">
            {asset.name}
          </h3>
          <p className="text-xs text-slate-500 font-mono tabular-nums mt-1 flex flex-wrap items-center gap-1.5">
            {asset.mediaType === 'video' ? (
              <Film className="h-3.5 w-3.5 text-purple-700" aria-hidden="true" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5 text-purple-700" aria-hidden="true" />
            )}
            <span>
              {asset.mediaType === 'video'
                ? 'MP4'
                : asset.mimeType === 'image/png'
                ? 'PNG'
                : 'JPG'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{asset.resolution}</span>
            <span aria-hidden="true">·</span>
            <span>{formatBytes(asset.sizeBytes)}</span>
            <span aria-hidden="true">·</span>
            <span>{asset.durationSeconds}s</span>
          </p>

          <p
            className={`text-[11px] font-medium mt-1.5 inline-flex items-center gap-1 ${
              quality.status === 'optimal'
                ? 'text-emerald-700'
                : quality.status === 'ratio'
                ? 'text-sky-700'
                : 'text-amber-700'
            }`}
          >
            {quality.status === 'optimal' ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{quality.label}</span>
          </p>
        </div>

        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 min-w-0">
            <Maximize2 className="h-3 w-3 text-purple-700 shrink-0" aria-hidden="true" />
            <select
              value={activeFit}
              onChange={(e) =>
                onUpdateMidia(asset.id, {
                  fitMode: e.target.value as MediaFitMode,
                })
              }
              aria-label={`Enquadramento no APK para ${asset.name}`}
              className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[11px] font-medium text-slate-800 focus:outline-none focus:border-purple-700 max-w-full"
            >
              <option value="FIT_NO_CROP">APK: FIT_CENTER (Sem corte)</option>
              <option value="NATIVE_NO_UPSCALE">APK: Nativa (Sem ampliar)</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => onDeleteMidia(asset.id)}
            aria-label={`Excluir ${asset.name}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Excluir</span>
          </button>
        </div>
      </div>

      {/* Right: QR Code Interativo (Opcional) right next to the mini-preview */}
      <div className="md:col-span-7">
        <QrCodeConfigPanel
          value={draftQr}
          onChange={handleQrChange}
          compact
          saving={savingQr}
        />
      </div>
    </article>
  );
}

export function LibraryModule({
  midias,
  onUploadFile,
  onUpdateMidia,
  onDeleteMidia,
}: {
  midias: MediaAsset[];
  onUploadFile: (
    file: File,
    durationSeconds: number,
    meta?: { widthPx?: number; heightPx?: number; fitMode?: MediaFitMode }
  ) => Promise<void>;
  onUpdateMidia: (
    id: string,
    payload: {
      fitMode?: MediaFitMode;
      durationSeconds?: number;
      qrCode?: MediaQrCodeConfig | null;
    }
  ) => Promise<void>;
  onDeleteMidia: (id: string) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [previewFallback, setPreviewFallback] = useState<MediaAsset | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [defaultDuration, setDefaultDuration] = useState(12);
  const [defaultFitMode, setDefaultFitMode] =
    useState<MediaFitMode>('FIT_NO_CROP');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return midias.filter((m) => {
      const matchesType = filterType === 'all' || m.mediaType === filterType;
      const matchesQuery = q === '' || m.name.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [midias, filterType, search]);

  const activePreviewAsset = useMemo(() => {
    if (!previewAssetId) return null;
    return midias.find((m) => m.id === previewAssetId) || previewFallback;
  }, [midias, previewAssetId, previewFallback]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const valid = ['image/jpeg', 'image/png', 'video/mp4'].includes(file.type);
        if (!valid) {
          setUploadError(
            'Formato inválido. Envie apenas imagens JPG/PNG ou vídeos MP4.'
          );
          continue;
        }
        const dims = await readLocalMediaDimensions(file);
        const duration =
          file.type === 'video/mp4' && dims.videoDuration
            ? Math.min(300, Math.max(2, dims.videoDuration))
            : defaultDuration;
        await onUploadFile(file, duration, {
          widthPx: dims.widthPx,
          heightPx: dims.heightPx,
          fitMode: defaultFitMode,
        });
      }
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Erro ao enviar arquivo para o bucket midias.'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Biblioteca de Mídias
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Bucket público <span className="font-mono text-slate-700">midias</span> · Configure enquadramento sem cortes e QR Code Interativo em tempo real ao lado de cada mídia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 h-10">
            <span>Enquadramento:</span>
            <select
              value={defaultFitMode}
              onChange={(e) => setDefaultFitMode(e.target.value as MediaFitMode)}
              aria-label="Enquadramento padrão no player"
              className="font-medium text-slate-900 bg-transparent focus:outline-none"
            >
              <option value="FIT_NO_CROP">Inteira (Sem corte/esticar)</option>
              <option value="NATIVE_NO_UPSCALE">Nativa (Sem ampliar/embaçar)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 h-10">
            <span>Duração:</span>
            <input
              type="number"
              min="3"
              max="120"
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(Number(e.target.value) || 12)}
              aria-label="Duração padrão em segundos"
              className="w-10 text-center font-mono font-medium text-slate-900 focus:outline-none"
            />
            <span>s</span>
          </div>

          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-purple-800 hover:bg-purple-900 disabled:opacity-60 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>{uploading ? 'Enviando...' : 'Enviar Mídia'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.mp4,image/jpeg,image/png,video/mp4"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-purple-600 bg-purple-50/70'
            : 'border-slate-300 bg-white hover:border-purple-400'
        }`}
      >
        <Upload
          className="h-6 w-6 text-purple-700 mx-auto mb-2"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-slate-900">
          Arraste imagens (JPG/PNG) ou vídeos (MP4) para o bucket{' '}
          <span className="font-mono text-purple-800">midias</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Ideal 1920×1080 (Horizontal) ou 1080×1920 (Vertical) · O painel instrui o APK a nunca cortar, esticar ou esfumaçar.
        </p>
      </div>

      {uploadError && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700"
        >
          {uploadError}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
          {(
            [
              { id: 'all', label: 'Todas' },
              { id: 'image', label: 'Imagens (JPG/PNG)' },
              { id: 'video', label: 'Vídeos (MP4)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar arquivos..."
            aria-label="Filtrar mídias"
            className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-purple-700"
          />
        </div>
      </div>

      {/* Media Grid (side-by-side mini-preview + QR Code Interativo) */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-slate-900">
            Nenhuma mídia encontrada
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Envie um arquivo JPG, PNG ou MP4 acima para começar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
          {filtered.map((asset) => (
            <MediaLibraryCard
              key={asset.id}
              asset={asset}
              onUpdateMidia={onUpdateMidia}
              onDeleteMidia={onDeleteMidia}
              onOpenPreview={(snapshot) => {
                setPreviewFallback(snapshot);
                setPreviewAssetId(snapshot.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Lightbox Modal: Preview Real TV with proportional QR Code */}
      {activePreviewAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-4xl bg-slate-950 border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between text-white">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold truncate">
                  {activePreviewAsset.name}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {activePreviewAsset.resolution} (
                  {activePreviewAsset.aspectRatio || '16:9'}) ·{' '}
                  {formatBytes(activePreviewAsset.sizeBytes)} · Enquadramento{' '}
                  {activePreviewAsset.fitMode === 'NATIVE_NO_UPSCALE'
                    ? 'CENTER_INSIDE (Nativa)'
                    : 'FIT_CENTER (Sem corte/esticar/blur)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewAssetId(null);
                  setPreviewFallback(null);
                }}
                aria-label="Fechar visualização"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="relative aspect-video bg-black overflow-hidden">
              {activePreviewAsset.mediaType === 'video' ? (
                <video
                  src={activePreviewAsset.url}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <img
                  src={activePreviewAsset.url}
                  alt={activePreviewAsset.name}
                  className="h-full w-full object-contain"
                />
              )}
              <QrCodeOverlay qrCode={activePreviewAsset.qrCode} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
