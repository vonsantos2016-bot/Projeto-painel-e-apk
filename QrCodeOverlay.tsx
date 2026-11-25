import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';
import type {
  MediaQrCodeConfig,
  QrCodePosition,
  QrCodeSizePercent,
} from '../types';

export const DEFAULT_QR_CODE_CONFIG: MediaQrCodeConfig = {
  enabled: false,
  url: '',
  ctaText: 'Aponte a câmera',
  position: 'bottom-right',
  sizePercent: 15,
};

export function sanitizeQrUrl(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) return '';
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : /^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)
    ? `https://${trimmed}`
    : '';
  if (!withScheme) return '';
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

export function QrCodeOverlay({
  qrCode,
}: {
  qrCode?: MediaQrCodeConfig | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [heightPx, setHeightPx] = useState<number>(180);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setHeightPx(h);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setHeightPx(entry.contentRect.height);
        }
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!qrCode || !qrCode.enabled) return null;
  const safeUrl = sanitizeQrUrl(qrCode.url);
  if (!safeUrl) return null;

  const sizePercent: QrCodeSizePercent =
    qrCode.sizePercent === 12 || qrCode.sizePercent === 18
      ? qrCode.sizePercent
      : 15;
  const qrSize = Math.max(10, Math.round(heightPx * (sizePercent / 100)));
  const padPx = Math.max(2, Math.round(qrSize * 0.14));
  const radiusPx = Math.max(3, Math.round(qrSize * 0.16));
  const marginPx = Math.max(3, Math.round(heightPx * 0.035));
  const showCta = heightPx >= 76 && Boolean(qrCode.ctaText?.trim());
  const ctaFontPx = Math.max(7, Math.min(20, Math.round(qrSize * 0.165)));
  const gapPx = Math.max(2, Math.round(qrSize * 0.08));

  const posStyle: React.CSSProperties = {};
  if (qrCode.position === 'top-left' || qrCode.position === 'top-right') {
    posStyle.top = `${marginPx}px`;
  } else {
    posStyle.bottom = `${marginPx}px`;
  }
  if (qrCode.position === 'top-left' || qrCode.position === 'bottom-left') {
    posStyle.left = `${marginPx}px`;
  } else {
    posStyle.right = `${marginPx}px`;
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden z-20"
    >
      <div
        style={{
          ...posStyle,
          padding: `${padPx}px`,
          borderRadius: `${radiusPx}px`,
          gap: showCta ? `${gapPx}px` : undefined,
          maxWidth: `${qrSize + padPx * 2 + 12}px`,
        }}
        className="absolute bg-white text-slate-950 shadow-lg ring-1 ring-black/15 flex flex-col items-center text-center"
      >
        <QRCodeSVG
          value={safeUrl}
          size={qrSize}
          level="M"
          bgColor="#FFFFFF"
          fgColor="#0F172A"
        />
        {showCta && (
          <span
            style={{
              fontSize: `${ctaFontPx}px`,
              lineHeight: 1.15,
            }}
            className="font-bold tracking-tight text-slate-900 break-words w-full"
          >
            {qrCode.ctaText.trim()}
          </span>
        )}
      </div>
    </div>
  );
}

const POSITION_OPTIONS: Array<{ value: QrCodePosition; label: string }> = [
  { value: 'top-left', label: 'Superior Esquerdo' },
  { value: 'top-right', label: 'Superior Direito' },
  { value: 'bottom-left', label: 'Inferior Esquerdo' },
  { value: 'bottom-right', label: 'Inferior Direito' },
];

const SIZE_OPTIONS: Array<{ value: QrCodeSizePercent; label: string }> = [
  { value: 12, label: 'Pequeno (12%)' },
  { value: 15, label: 'Médio (15%)' },
  { value: 18, label: 'Grande (18%)' },
];

const CTA_PRESETS = [
  'Aponte a câmera',
  'Resgate seu cupom',
  'Chame no WhatsApp',
  'Ver cardápio',
];

export function QrCodeConfigPanel({
  value,
  onChange,
  compact = false,
  isInherited = false,
  onResetInherited,
  saving = false,
}: {
  value: MediaQrCodeConfig;
  onChange: (next: MediaQrCodeConfig, commitImmediately?: boolean) => void;
  compact?: boolean;
  isInherited?: boolean;
  onResetInherited?: () => void;
  saving?: boolean;
}) {
  const rawUrl = value.url || '';
  const hasInvalidUrl =
    value.enabled && rawUrl.trim().length > 0 && sanitizeQrUrl(rawUrl) === '';

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/75 p-3.5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-7 w-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
            <QrCode className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-slate-900 truncate">
              QR Code Interativo (Opcional)
            </h4>
            <p className="text-[11px] text-slate-500 truncate">
              {isInherited
                ? 'Herdando configuração da Biblioteca'
                : saving
                ? 'Salvando alterações...'
                : 'Escala proporcionalmente na TV sem distorcer a mídia'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isInherited && onResetInherited && (
            <button
              type="button"
              onClick={onResetInherited}
              className="text-[11px] font-medium text-purple-800 hover:underline whitespace-nowrap"
            >
              Usar da Biblioteca
            </button>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={value.enabled}
            aria-label="Ativar ou desativar QR Code Interativo"
            onClick={() =>
              onChange({ ...value, enabled: !value.enabled }, true)
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-purple-700 ${
              value.enabled ? 'bg-purple-800' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                value.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {value.enabled && (
        <div className="flex flex-col gap-2.5 pt-1 border-t border-slate-200/80">
          {/* Link de destino + Texto de chamada */}
          <div
            className={`grid gap-2.5 ${
              compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Link de destino (WhatsApp, Instagram, Cardápio ou Site)
              </label>
              <input
                type="url"
                value={value.url}
                onChange={(e) =>
                  onChange({ ...value, url: e.target.value }, false)
                }
                onBlur={() => onChange(value, true)}
                placeholder="https://wa.me/5511999999999"
                className={`w-full h-9 px-2.5 text-xs bg-white border rounded-lg focus:outline-none ${
                  hasInvalidUrl
                    ? 'border-rose-400 focus:border-rose-600'
                    : 'border-slate-200 focus:border-purple-700'
                }`}
              />
              {hasInvalidUrl && (
                <p className="text-[11px] text-rose-600 mt-1">
                  Informe um link válido (ex: https://wa.me/... ou instagram.com/...).
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Texto curto de chamada
              </label>
              <input
                type="text"
                maxLength={40}
                value={value.ctaText}
                onChange={(e) =>
                  onChange({ ...value, ctaText: e.target.value }, false)
                }
                onBlur={() => onChange(value, true)}
                placeholder="Aponte a câmera"
                className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {CTA_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      onChange({ ...value, ctaText: preset }, true)
                    }
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                      value.ctaText === preset
                        ? 'bg-purple-800 border-purple-800 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Posição nos 4 cantos + Tamanho adaptativo */}
          <div
            className={`grid gap-2.5 ${
              compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            <div>
              <span className="block text-[11px] font-medium text-slate-700 mb-1">
                Posição na mídia (4 cantos)
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {POSITION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      onChange({ ...value, position: opt.value }, true)
                    }
                    className={`h-8 px-2 rounded-lg text-[11px] font-medium border transition-colors text-center truncate ${
                      value.position === opt.value
                        ? 'bg-purple-800 border-purple-800 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-medium text-slate-700 mb-1">
                Tamanho adaptativo (altura da tela)
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      onChange({ ...value, sizePercent: opt.value }, true)
                    }
                    className={`h-8 px-2 rounded-lg text-[11px] font-medium border transition-colors whitespace-nowrap ${
                      value.sizePercent === opt.value
                        ? 'bg-purple-800 border-purple-800 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
