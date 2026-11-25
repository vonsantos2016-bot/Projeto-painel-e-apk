import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  ListOrdered,
  Maximize2,
  Plus,
  QrCode,
  Rocket,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react';
import type {
  DynamicContentItem,
  DynamicTemplateKey,
  MediaAsset,
  MediaQrCodeConfig,
  NewsArticle,
  PlaybackMode,
  Playlist,
  PlaylistItem,
  WeatherForecast,
} from '../types';
import { renderDynamicTemplateByKey } from './DynamicTemplates';
import {
  DEFAULT_QR_CODE_CONFIG,
  QrCodeConfigPanel,
  QrCodeOverlay,
} from './QrCodeOverlay';

const DYNAMIC_WIDGET_CATALOG: Array<{
  refId: string;
  templateKey: DynamicTemplateKey;
  label: string;
  defaultDuration: number;
}> = [
  { refId: 'tpl-noticias', templateKey: 'noticias', label: 'Notícias em Tempo Real (G1/CNN + QR)', defaultDuration: 12 },
  { refId: 'tpl-esportes', templateKey: 'esportes', label: 'Brasileirão & Esportes', defaultDuration: 12 },
  { refId: 'tpl-clima', templateKey: 'clima', label: 'Previsão do Tempo (Open-Meteo)', defaultDuration: 10 },
  { refId: 'tpl-curiosidades', templateKey: 'curiosidades', label: 'Curiosidades do Dia', defaultDuration: 10 },
  { refId: 'tpl-dicas', templateKey: 'dicas', label: 'Dicas de Saúde & Bem-Estar', defaultDuration: 10 },
  { refId: 'tpl-receitas', templateKey: 'receitas', label: 'Receitas & Cozinha', defaultDuration: 12 },
  { refId: 'tpl-horoscopo', templateKey: 'horoscopo', label: 'Horóscopo do Dia', defaultDuration: 10 },
  { refId: 'tpl-quiz', templateKey: 'quiz', label: 'Quiz Interativo (10s)', defaultDuration: 12 },
];

const PREVIEW_ARTICLE: NewsArticle = {
  id: 'preview-news',
  source: 'G1',
  title: 'Brasil acelera expansão de redes digitais em pontos comerciais de alto fluxo',
  summary:
    'Conteúdos dinâmicos ao vivo aumentam atenção do público em recepções e lojas.',
  link: 'https://g1.globo.com/',
  imageUrl: '/src/assets/images/tv_news_studio_1795621649869.jpg',
  publishedAt: 'Ao vivo',
};

const PREVIEW_WEATHER: WeatherForecast = {
  city: 'São Paulo, SP',
  temperature: 26,
  apparentTemperature: 27,
  humidity: 58,
  windSpeed: 14,
  weatherCode: 2,
  minTemp: 19,
  maxTemp: 28,
  daily: [
    { date: 'Hoje', min: 19, max: 28, code: 2 },
    { date: 'Amanhã', min: 20, max: 29, code: 1 },
    { date: 'Sex', min: 18, max: 26, code: 61 },
    { date: 'Sáb', min: 17, max: 25, code: 0 },
  ],
  updatedAt: 'Agora',
};

function resolveTemplateKey(item: PlaylistItem): DynamicTemplateKey {
  if (item.templateKey) return item.templateKey;
  const raw = item.refId.replace(/^tpl-/, '');
  if (
    raw === 'noticias' ||
    raw === 'esportes' ||
    raw === 'clima' ||
    raw === 'curiosidades' ||
    raw === 'dicas' ||
    raw === 'receitas' ||
    raw === 'horoscopo' ||
    raw === 'quiz'
  ) {
    return raw;
  }
  return 'noticias';
}

function MiniVisualPreview({
  itemType,
  mediaAsset,
  templateKey,
  qrCode,
  dynamicContents,
  size = 'md',
  onOpenPreview,
}: {
  itemType: 'media' | 'dynamic';
  mediaAsset?: MediaAsset;
  templateKey?: DynamicTemplateKey;
  qrCode?: MediaQrCodeConfig | null;
  dynamicContents: DynamicContentItem[];
  size?: 'sm' | 'md';
  onOpenPreview?: () => void;
}) {
  // Exact 16:9 container scaled from a 640x360 virtual TV canvas
  const boxClass = size === 'sm' ? 'w-20 h-[45px]' : 'w-24 h-[54px]';
  const scaleClass =
    size === 'sm' ? 'scale-[0.125]' : 'scale-[0.15]';

  const content =
    itemType === 'media' ? (
      mediaAsset ? (
        <>
          {mediaAsset.mediaType === 'video' ? (
            <video
              src={mediaAsset.url}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-contain bg-black"
            />
          ) : (
            <img
              src={mediaAsset.url}
              alt={mediaAsset.name}
              className="h-full w-full object-contain bg-black"
            />
          )}
          <QrCodeOverlay qrCode={qrCode} />
        </>
      ) : (
        <div className="h-full w-full bg-slate-800 flex items-center justify-center text-slate-400">
          <ImageIcon className="h-4 w-4" aria-hidden="true" />
        </div>
      )
    ) : (
      <div
        className={`w-[640px] h-[360px] origin-top-left pointer-events-none select-none ${scaleClass}`}
      >
        {renderDynamicTemplateByKey(templateKey || 'noticias', {
          article: PREVIEW_ARTICLE,
          weather: PREVIEW_WEATHER,
          dynamicContents,
          durationSeconds: 12,
          compact: true,
        })}
      </div>
    );

  if (onOpenPreview) {
    return (
      <button
        type="button"
        onClick={onOpenPreview}
        title="Expandir pré-visualização 16:9"
        aria-label="Expandir pré-visualização 16:9"
        className={`group relative ${boxClass} rounded-lg overflow-hidden border border-slate-200 bg-slate-950 shrink-0 text-left`}
      >
        {content}
        <span className="absolute inset-0 z-30 bg-slate-950/0 group-hover:bg-slate-950/45 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 text-white">
          <Maximize2 className="h-3.5 w-3.5 drop-shadow" aria-hidden="true" />
        </span>
      </button>
    );
  }

  return (
    <div
      className={`relative ${boxClass} rounded-lg overflow-hidden border border-slate-200 bg-slate-950 shrink-0`}
    >
      {content}
    </div>
  );
}

type PreviewTarget =
  | { kind: 'media'; asset: MediaAsset; qrCode?: MediaQrCodeConfig | null }
  | { kind: 'dynamic'; templateKey: DynamicTemplateKey; label: string; durationSeconds: number };

function PlaylistItemQrEditor({
  item,
  asset,
  onSaveItemQr,
}: {
  item: PlaylistItem;
  asset?: MediaAsset;
  onSaveItemQr: (qrCode: MediaQrCodeConfig | null) => Promise<void>;
}) {
  const inheritedQr = asset?.qrCode || DEFAULT_QR_CODE_CONFIG;
  const [draftQr, setDraftQr] = useState<MediaQrCodeConfig>(
    item.qrCode ?? inheritedQr
  );
  const [saving, setSaving] = useState(false);
  const debounceRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setDraftQr(item.qrCode ?? asset?.qrCode ?? DEFAULT_QR_CODE_CONFIG);
  }, [item.id, item.qrCode, asset?.qrCode]);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const commit = async (next: MediaQrCodeConfig | null) => {
    setSaving(true);
    try {
      await onSaveItemQr(next);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    next: MediaQrCodeConfig,
    commitImmediately = false
  ) => {
    setDraftQr(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (commitImmediately) {
      void commit(next);
    } else {
      debounceRef.current = window.setTimeout(() => {
        void commit(next);
      }, 500);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
      {/* Live 16:9 mini-preview right next to QR Code settings */}
      <div className="md:col-span-5 flex flex-col gap-1.5">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-200">
          {asset ? (
            asset.mediaType === 'video' ? (
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
            )
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">
              Mídia não encontrada
            </div>
          )}
          <QrCodeOverlay qrCode={draftQr} />
        </div>
        <p className="text-[11px] text-slate-500">
          Pré-visualização em tempo real · Sem cortes ou distorção
        </p>
      </div>

      {/* QR Code Interativo (Opcional) side panel */}
      <div className="md:col-span-7">
        <QrCodeConfigPanel
          value={draftQr}
          onChange={handleChange}
          compact
          isInherited={!item.qrCode}
          onResetInherited={
            item.qrCode
              ? () => {
                  setDraftQr(inheritedQr);
                  void commit(null);
                }
              : undefined
          }
          saving={saving}
        />
      </div>
    </div>
  );
}

export function PlaylistsModule({
  playlists,
  midias,
  dynamicContents = [],
  onCreatePlaylist,
  onUpdatePlaylist,
  onPublishPlaylist,
  onDeletePlaylist,
}: {
  playlists: Playlist[];
  midias: MediaAsset[];
  dynamicContents?: DynamicContentItem[];
  onCreatePlaylist: (payload: {
    name: string;
    description: string;
    playbackMode: PlaybackMode;
    items: PlaylistItem[];
  }) => Promise<void>;
  onUpdatePlaylist: (
    id: string,
    payload: {
      name?: string;
      description?: string;
      playbackMode?: PlaybackMode;
      items?: PlaylistItem[];
    }
  ) => Promise<void>;
  onPublishPlaylist: (id: string) => Promise<void>;
  onDeletePlaylist: (id: string) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string>(playlists[0]?.id || '');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newMode, setNewMode] = useState<PlaybackMode>('SEQUENTIAL');
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const mediaMap = useMemo(() => {
    const map = new Map<string, MediaAsset>();
    midias.forEach((m) => map.set(m.id, m));
    return map;
  }, [midias]);

  const selectedPlaylist = useMemo(() => {
    return playlists.find((p) => p.id === selectedId) || playlists[0] || null;
  }, [playlists, selectedId]);

  const totalDuration = useMemo(() => {
    if (!selectedPlaylist) return 0;
    return selectedPlaylist.items
      .filter((item) => item.enabled !== false)
      .reduce((sum, item) => sum + (item.durationSeconds || 10), 0);
  }, [selectedPlaylist]);

  const enabledCount = useMemo(() => {
    if (!selectedPlaylist) return 0;
    return selectedPlaylist.items.filter((i) => i.enabled !== false).length;
  }, [selectedPlaylist]);

  const handleAddMedia = async (asset: MediaAsset) => {
    if (!selectedPlaylist) return;
    const nextItem: PlaylistItem = {
      id: `pi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemType: 'media',
      refId: asset.id,
      label: asset.name,
      durationSeconds: Math.max(2, asset.durationSeconds || 12),
      position: selectedPlaylist.items.length,
      enabled: true,
    };
    await onUpdatePlaylist(selectedPlaylist.id, {
      items: [...selectedPlaylist.items, nextItem],
    });
  };

  const handleAddDynamic = async (
    widget: (typeof DYNAMIC_WIDGET_CATALOG)[number]
  ) => {
    if (!selectedPlaylist) return;
    const nextItem: PlaylistItem = {
      id: `pi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemType: 'dynamic',
      refId: widget.refId,
      label: widget.label,
      durationSeconds: widget.defaultDuration,
      position: selectedPlaylist.items.length,
      enabled: true,
      templateKey: widget.templateKey,
    };
    await onUpdatePlaylist(selectedPlaylist.id, {
      items: [...selectedPlaylist.items, nextItem],
    });
  };

  const handleMoveItem = async (index: number, direction: -1 | 1) => {
    if (!selectedPlaylist) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= selectedPlaylist.items.length) return;
    const next = [...selectedPlaylist.items];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    await onUpdatePlaylist(selectedPlaylist.id, { items: next });
  };

  const handleUpdateDuration = async (itemId: string, seconds: number) => {
    if (!selectedPlaylist) return;
    const clamped = Math.max(2, Math.min(300, seconds || 10));
    const next = selectedPlaylist.items.map((item) =>
      item.id === itemId ? { ...item, durationSeconds: clamped } : item
    );
    await onUpdatePlaylist(selectedPlaylist.id, { items: next });
  };

  const handleToggleItemEnabled = async (itemId: string) => {
    if (!selectedPlaylist) return;
    const next = selectedPlaylist.items.map((item) =>
      item.id === itemId ? { ...item, enabled: item.enabled === false } : item
    );
    await onUpdatePlaylist(selectedPlaylist.id, { items: next });
  };

  const handleUpdateItemQr = async (
    itemId: string,
    qrCode: MediaQrCodeConfig | null
  ) => {
    if (!selectedPlaylist) return;
    const next = selectedPlaylist.items.map((item) =>
      item.id === itemId ? { ...item, qrCode } : item
    );
    await onUpdatePlaylist(selectedPlaylist.id, { items: next });
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedPlaylist) return;
    const next = selectedPlaylist.items.filter((item) => item.id !== itemId);
    if (editingItemId === itemId) setEditingItemId(null);
    await onUpdatePlaylist(selectedPlaylist.id, { items: next });
  };

  const handleModeChange = async (mode: PlaybackMode) => {
    if (!selectedPlaylist || selectedPlaylist.playbackMode === mode) return;
    await onUpdatePlaylist(selectedPlaylist.id, { playbackMode: mode });
  };

  const handlePublish = async () => {
    if (!selectedPlaylist) return;
    setPublishingId(selectedPlaylist.id);
    try {
      await onPublishPlaylist(selectedPlaylist.id);
    } finally {
      setPublishingId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await onCreatePlaylist({
        name: newName.trim(),
        description: newDesc.trim() || 'Grade personalizada de TV Indoor.',
        playbackMode: newMode,
        items: [],
      });
      setNewName('');
      setNewDesc('');
      setNewMode('SEQUENTIAL');
      setCreateOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Playlists &amp; Grade de Programação
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Edite blocos com mini visualização 16:9 ao lado de cada mídia e conteúdo dinâmico antes de publicar para os APKs Android.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-purple-800 hover:bg-purple-900 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>+ Nova Playlist</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Playlists Selector */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Grades Cadastradas ({playlists.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {playlists.map((pl) => {
              const active = selectedPlaylist?.id === pl.id;
              const secs = pl.items
                .filter((i) => i.enabled !== false)
                .reduce((s, i) => s + i.durationSeconds, 0);
              const isPublished = pl.status === 'PUBLISHED';

              return (
                <div
                  key={pl.id}
                  className={`p-4 transition-colors flex items-start justify-between gap-2 ${
                    active ? 'bg-purple-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(pl.id)}
                    className="text-left flex-1 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-sm font-semibold truncate ${
                          active ? 'text-purple-950' : 'text-slate-900'
                        }`}
                      >
                        {pl.name}
                      </p>
                      <span
                        className={`text-[11px] font-medium shrink-0 ${
                          isPublished ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {isPublished ? 'Publicada' : 'Rascunho'} · v{pl.version}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                      {pl.description}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 tabular-nums mt-1.5">
                      {pl.items.length} itens · {secs}s ·{' '}
                      {pl.playbackMode === 'RANDOM' ? 'Aleatório' : 'Sequencial'}
                    </p>
                  </button>
                  {playlists.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeletePlaylist(pl.id)}
                      aria-label={`Excluir playlist ${pl.name}`}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center + Right: Active Playlist Timeline + Add Blocks */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {selectedPlaylist && (
            <>
              {/* Active Timeline */}
              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base font-semibold text-slate-900">
                          {selectedPlaylist.name}
                        </h2>
                        <span
                          className={`text-xs font-mono font-semibold ${
                            selectedPlaylist.status === 'PUBLISHED'
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {selectedPlaylist.status === 'PUBLISHED'
                            ? `Publicada (v${selectedPlaylist.version})`
                            : `Rascunho v${selectedPlaylist.version} — Aguardando publicação`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedPlaylist.publishedAt
                          ? `Última publicação em ${new Date(
                              selectedPlaylist.publishedAt
                            ).toLocaleString('pt-BR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}`
                          : 'Edições locais exigem clicar em Publicar Grade para distribuir às TV Boxes.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={publishingId === selectedPlaylist.id}
                      className={`h-9 px-3.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                        selectedPlaylist.status === 'PUBLISHED'
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          : 'bg-purple-800 hover:bg-purple-900 text-white'
                      }`}
                    >
                      {selectedPlaylist.status === 'PUBLISHED' ? (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {publishingId === selectedPlaylist.id
                          ? 'Publicando...'
                          : selectedPlaylist.status === 'PUBLISHED'
                          ? 'Republicar Grade'
                          : 'Publicar Grade'}
                      </span>
                    </button>
                  </div>

                  {/* Controls Bar: Playback Mode + Duration Summary */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleModeChange('SEQUENTIAL')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                          selectedPlaylist.playbackMode === 'SEQUENTIAL'
                            ? 'bg-white text-purple-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Sequencial</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModeChange('RANDOM')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                          selectedPlaylist.playbackMode === 'RANDOM'
                            ? 'bg-white text-purple-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Aleatório</span>
                      </button>
                    </div>

                    <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-purple-900 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg tabular-nums">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        Loop ativo: {totalDuration}s ({enabledCount}/{selectedPlaylist.items.length} ativos)
                      </span>
                    </div>
                  </div>
                </div>

                {selectedPlaylist.items.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    Esta playlist está vazia. Adicione mídias ou widgets dinâmicos abaixo.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {selectedPlaylist.items.map((item, idx) => {
                      const isEnabled = item.enabled !== false;
                      const linkedAsset =
                        item.itemType === 'media' ? mediaMap.get(item.refId) : undefined;
                      const tplKey =
                        item.itemType === 'dynamic'
                          ? resolveTemplateKey(item)
                          : undefined;
                      const resolvedQr = item.qrCode ?? linkedAsset?.qrCode ?? null;
                      const isEditingQr =
                        item.itemType === 'media' && editingItemId === item.id;

                      return (
                        <li
                          key={item.id}
                          className={`px-4 sm:px-5 py-3 transition-colors ${
                            isEnabled ? 'hover:bg-slate-50/70' : 'bg-slate-50/70 opacity-70'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-mono text-xs text-slate-400 tabular-nums w-5 shrink-0">
                                {String(idx + 1).padStart(2, '0')}
                              </span>

                              <MiniVisualPreview
                                itemType={item.itemType}
                                mediaAsset={linkedAsset}
                                templateKey={tplKey}
                                qrCode={resolvedQr}
                                dynamicContents={dynamicContents}
                                size="md"
                                onOpenPreview={() => {
                                  if (item.itemType === 'media' && linkedAsset) {
                                    setPreviewTarget({
                                      kind: 'media',
                                      asset: linkedAsset,
                                      qrCode: resolvedQr,
                                    });
                                  } else if (tplKey) {
                                    setPreviewTarget({
                                      kind: 'dynamic',
                                      templateKey: tplKey,
                                      label: item.label,
                                      durationSeconds: item.durationSeconds,
                                    });
                                  }
                                }}
                              />

                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {item.label}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {item.itemType === 'dynamic'
                                    ? 'Conteúdo Dinâmico 16:9'
                                    : linkedAsset
                                    ? `${
                                        linkedAsset.mediaType === 'video'
                                          ? 'Vídeo MP4'
                                          : 'Imagem'
                                      } · ${linkedAsset.resolution} · Sem corte`
                                    : 'Mídia da Biblioteca'}
                                  {resolvedQr?.enabled && resolvedQr.url
                                    ? ' · QR Code ativo'
                                    : ''}
                                  {!isEnabled && ' · Pausado na grade'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.itemType === 'media' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingItemId((prev) =>
                                      prev === item.id ? null : item.id
                                    )
                                  }
                                  className={`h-7 px-2.5 rounded-md text-[11px] font-medium inline-flex items-center gap-1 border transition-colors ${
                                    isEditingQr
                                      ? 'bg-purple-800 border-purple-800 text-white'
                                      : resolvedQr?.enabled
                                      ? 'bg-purple-50 border-purple-200 text-purple-900'
                                      : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300'
                                  }`}
                                >
                                  <QrCode className="h-3 w-3" aria-hidden="true" />
                                  <span>QR Code</span>
                                </button>
                              )}

                              <label className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 rounded-md px-2 py-1">
                                <input
                                  type="number"
                                  min="2"
                                  max="300"
                                  value={item.durationSeconds}
                                  onChange={(e) =>
                                    handleUpdateDuration(
                                      item.id,
                                      Number(e.target.value)
                                    )
                                  }
                                  aria-label={`Segundos para ${item.label}`}
                                  className="w-11 bg-transparent font-mono font-semibold text-slate-900 text-right focus:outline-none tabular-nums"
                                />
                                <span>s</span>
                              </label>

                              <button
                                type="button"
                                onClick={() => handleToggleItemEnabled(item.id)}
                                title={isEnabled ? 'Desativar item temporariamente' : 'Reativar item'}
                                aria-label={isEnabled ? 'Desativar item' : 'Ativar item'}
                                className="p-1.5 rounded text-slate-500 hover:bg-slate-200"
                              >
                                {isEnabled ? (
                                  <Eye className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMoveItem(idx, -1)}
                                disabled={idx === 0}
                                aria-label="Mover para cima"
                                className="p-1.5 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                              >
                                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveItem(idx, 1)}
                                disabled={idx === selectedPlaylist.items.length - 1}
                                aria-label="Mover para baixo"
                                className="p-1.5 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                              >
                                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                aria-label="Remover item da playlist"
                                className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          {isEditingQr && (
                            <PlaylistItemQrEditor
                              item={item}
                              asset={linkedAsset}
                              onSaveItemQr={(qr) =>
                                handleUpdateItemQr(item.id, qr)
                              }
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Quick Pickers: Biblioteca + Conteúdos Dinâmicos with 16:9 Mini Previews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Adicionar da Biblioteca
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      {midias.length} mídias
                    </span>
                  </div>
                  <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto">
                    {midias.map((asset) => (
                      <div
                        key={asset.id}
                        className="px-3.5 py-2.5 hover:bg-purple-50/40 transition-colors flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MiniVisualPreview
                            itemType="media"
                            mediaAsset={asset}
                            qrCode={asset.qrCode}
                            dynamicContents={dynamicContents}
                            size="sm"
                            onOpenPreview={() =>
                              setPreviewTarget({
                                kind: 'media',
                                asset,
                                qrCode: asset.qrCode,
                              })
                            }
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-800 truncate">
                              {asset.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono tabular-nums inline-flex items-center gap-1 mt-0.5">
                              {asset.mediaType === 'video' ? (
                                <Film className="h-3 w-3 text-purple-700" aria-hidden="true" />
                              ) : (
                                <ImageIcon className="h-3 w-3 text-purple-700" aria-hidden="true" />
                              )}
                              <span>
                                {asset.mediaType === 'video' ? 'MP4' : 'IMG'} ·{' '}
                                {asset.resolution} · {asset.durationSeconds}s
                              </span>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddMedia(asset)}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-[11px] font-semibold text-purple-900 transition-colors shrink-0 whitespace-nowrap"
                        >
                          + Adicionar
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Adicionar Conteúdo Dinâmico
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      {DYNAMIC_WIDGET_CATALOG.length} templates
                    </span>
                  </div>
                  <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto">
                    {DYNAMIC_WIDGET_CATALOG.map((widget) => (
                      <div
                        key={widget.refId}
                        className="px-3.5 py-2.5 hover:bg-purple-50/40 transition-colors flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MiniVisualPreview
                            itemType="dynamic"
                            templateKey={widget.templateKey}
                            dynamicContents={dynamicContents}
                            size="sm"
                            onOpenPreview={() =>
                              setPreviewTarget({
                                kind: 'dynamic',
                                templateKey: widget.templateKey,
                                label: widget.label,
                                durationSeconds: widget.defaultDuration,
                              })
                            }
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-800 truncate">
                              {widget.label}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                              Widget 16:9 · {widget.defaultDuration}s
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddDynamic(widget)}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-[11px] font-semibold text-purple-900 transition-colors shrink-0 whitespace-nowrap"
                        >
                          + {widget.defaultDuration}s
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 16:9 Expanded Mini Preview Modal */}
      {previewTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-4xl bg-slate-950 border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between text-white">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold truncate">
                  {previewTarget.kind === 'media'
                    ? previewTarget.asset.name
                    : previewTarget.label}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {previewTarget.kind === 'media'
                    ? `${previewTarget.asset.resolution} · ${previewTarget.asset.durationSeconds}s`
                    : `Conteúdo Dinâmico 16:9 · ${previewTarget.durationSeconds}s`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTarget(null)}
                aria-label="Fechar pré-visualização"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="relative aspect-video bg-black overflow-hidden">
              {previewTarget.kind === 'media' ? (
                <>
                  {previewTarget.asset.mediaType === 'video' ? (
                    <video
                      src={previewTarget.asset.url}
                      controls
                      autoPlay
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <img
                      src={previewTarget.asset.url}
                      alt={previewTarget.asset.name}
                      className="h-full w-full object-contain"
                    />
                  )}
                  <QrCodeOverlay qrCode={previewTarget.qrCode} />
                </>
              ) : (
                renderDynamicTemplateByKey(previewTarget.templateKey, {
                  article: PREVIEW_ARTICLE,
                  weather: PREVIEW_WEATHER,
                  dynamicContents,
                  durationSeconds: previewTarget.durationSeconds,
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal New Playlist */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Nova Playlist
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome da Playlist
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Circuito Elevadores Corporativos"
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Resumo do perfil de público e horários"
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Modo de Reprodução
                </label>
                <select
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value as PlaybackMode)}
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                >
                  <option value="SEQUENTIAL">Sequencial (Ordem fixa da grade)</option>
                  <option value="RANDOM">Aleatório (Embaralha ao fim do ciclo)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-800 hover:bg-purple-900 rounded-lg"
                >
                  {saving ? 'Criando...' : 'Criar Playlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
