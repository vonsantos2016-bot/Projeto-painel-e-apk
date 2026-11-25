import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Monitor,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { NetworkAlert } from '../types';

function formatAlertTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Agora';
  }
}

export function NetworkAlertsBell({
  alerts,
  pushPermission,
  onRequestPushPermission,
  onCheckNow,
  onMarkRead,
  onMarkAllRead,
  onDeleteAlert,
  onNavigateScreens,
  checking,
}: {
  alerts: NetworkAlert[];
  pushPermission: NotificationPermission | 'unsupported';
  onRequestPushPermission: () => Promise<void>;
  onCheckNow: () => Promise<void>;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onDeleteAlert: (id: string) => Promise<void>;
  onNavigateScreens: () => void;
  checking: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeOfflineCount = alerts.filter(
    (a) => a.type === 'SCREEN_OFFLINE' && !a.resolvedAt
  ).length;
  const unreadCount = alerts.filter((a) => !a.read).length;

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (
        open &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Alertas de telas (${unreadCount} não lidos)`}
        aria-expanded={open}
        className={`relative h-9 px-2.5 rounded-xl border text-xs font-medium inline-flex items-center gap-2 transition-colors ${
          activeOfflineCount > 0
            ? 'border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100'
            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-purple-300'
        }`}
      >
        {activeOfflineCount > 0 ? (
          <BellRing className="h-4 w-4 text-rose-600" aria-hidden="true" />
        ) : (
          <Bell className="h-4 w-4 text-slate-600" aria-hidden="true" />
        )}
        <span className="hidden md:inline">
          {activeOfflineCount > 0
            ? `${activeOfflineCount} ${
                activeOfflineCount === 1 ? 'tela offline' : 'telas offline'
              }`
            : 'Alertas'}
        </span>
        {unreadCount > 0 && (
          <span className="h-5 min-w-5 px-1 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold flex items-center justify-center tabular-nums">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Central de Alertas Preventivos"
          className="fixed sm:absolute right-3 sm:right-0 left-3 sm:left-auto top-16 sm:top-11 sm:w-[410px] z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/70">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Alertas Preventivos da Rede
              </h2>
              <p className="text-[11px] text-slate-500">
                {activeOfflineCount > 0
                  ? `${activeOfflineCount} tela(s) exigindo atenção técnica`
                  : 'Todas as telas ativas operando normalmente'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onCheckNow}
                disabled={checking}
                title="Verificar telas agora"
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700 inline-flex items-center gap-1"
              >
                <RefreshCw
                  className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>Verificar</span>
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  title="Marcar todas como lidas"
                  className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Browser Push Notification Bar */}
          <div className="px-4 py-2.5 border-b border-slate-100 bg-purple-50/60 flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-700 truncate">
              {pushPermission === 'granted'
                ? 'Notificações Push ativas neste navegador'
                : pushPermission === 'denied'
                ? 'Push bloqueado nas permissões do navegador'
                : pushPermission === 'unsupported'
                ? 'Alertas em tempo real ativos no painel'
                : 'Receba alertas push mesmo em outra aba'}
            </span>
            {pushPermission === 'default' && (
              <button
                type="button"
                onClick={onRequestPushPermission}
                className="px-2.5 py-1 rounded-md bg-purple-800 hover:bg-purple-900 text-white text-[11px] font-medium whitespace-nowrap shrink-0"
              >
                Ativar Push
              </button>
            )}
          </div>

          {/* Alerts List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {alerts.length === 0 ? (
              <div className="p-8 text-center">
                <Wifi
                  className="h-7 w-7 text-emerald-600 mx-auto mb-2"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-slate-900">
                  Nenhum alerta registrado
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Você será notificado automaticamente se alguma tela perder sinal.
                </p>
              </div>
            ) : (
              alerts.slice(0, 20).map((alert) => {
                const isOffline =
                  alert.type === 'SCREEN_OFFLINE' && !alert.resolvedAt;
                const isResolved =
                  alert.type === 'SCREEN_RECOVERED' || Boolean(alert.resolvedAt);

                return (
                  <div
                    key={alert.id}
                    className={`p-3.5 transition-colors flex items-start gap-3 ${
                      !alert.read
                        ? isOffline
                          ? 'bg-rose-50/55'
                          : 'bg-purple-50/35'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isOffline
                          ? alert.severity === 'critical'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isOffline ? (
                        <WifiOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Wifi className="h-4 w-4" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {alert.screenName}
                        </p>
                        <span className="font-mono text-[10px] text-slate-400 tabular-nums shrink-0">
                          {formatAlertTime(alert.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 truncate">
                        {alert.screenCode} · {alert.city}
                        {alert.deviceId ? ` · ${alert.deviceId}` : ''}
                      </p>
                      <p className="text-xs text-slate-700 mt-1 leading-snug">
                        {alert.message}
                      </p>

                      <div className="flex items-center gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!alert.read) void onMarkRead(alert.id);
                            setOpen(false);
                            onNavigateScreens();
                          }}
                          className="text-[11px] font-semibold text-purple-800 hover:underline inline-flex items-center gap-1"
                        >
                          <Monitor className="h-3 w-3" aria-hidden="true" />
                          <span>Abrir em Telas</span>
                        </button>

                        {!alert.read && (
                          <button
                            type="button"
                            onClick={() => void onMarkRead(alert.id)}
                            className="text-[11px] font-medium text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" aria-hidden="true" />
                            <span>Marcar lida</span>
                          </button>
                        )}

                        {isResolved && (
                          <button
                            type="button"
                            onClick={() => void onDeleteAlert(alert.id)}
                            aria-label="Remover alerta resolvido"
                            className="ml-auto text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function NetworkOfflineBanner({
  offlineAlerts,
  onNavigateScreens,
  onCheckNow,
  onDismissBanner,
  checking,
}: {
  offlineAlerts: NetworkAlert[];
  onNavigateScreens: () => void;
  onCheckNow: () => Promise<void>;
  onDismissBanner: () => void;
  checking: boolean;
}) {
  if (offlineAlerts.length === 0) return null;

  const first = offlineAlerts[0];
  const criticalCount = offlineAlerts.filter(
    (a) => a.severity === 'critical'
  ).length;

  return (
    <div
      role="alert"
      className={`mb-5 rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
        criticalCount > 0
          ? 'bg-rose-50 border-rose-200 text-rose-950'
          : 'bg-amber-50 border-amber-200 text-amber-950'
      }`}
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <span
          className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
            criticalCount > 0
              ? 'bg-rose-100 text-rose-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold">
            Manutenção Preventiva:{' '}
            {offlineAlerts.length === 1
              ? `1 tela offline (${first.screenName} · ${first.screenCode})`
              : `${offlineAlerts.length} telas offline na rede`}
          </p>
          <p className="text-xs opacity-85 truncate mt-0.5">
            {offlineAlerts.length === 1
              ? `${first.city} — ${first.message}`
              : offlineAlerts
                  .slice(0, 3)
                  .map((a) => `${a.screenName} (${a.screenCode})`)
                  .join(' · ')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <button
          type="button"
          onClick={onCheckNow}
          disabled={checking}
          className="h-8 px-3 rounded-lg bg-white/90 hover:bg-white border border-black/10 text-xs font-medium inline-flex items-center gap-1.5"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>Verificar</span>
        </button>
        <button
          type="button"
          onClick={onNavigateScreens}
          className={`h-8 px-3 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5 ${
            criticalCount > 0
              ? 'bg-rose-700 hover:bg-rose-800'
              : 'bg-amber-700 hover:bg-amber-800'
          }`}
        >
          <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Ver Telas</span>
        </button>
        <button
          type="button"
          onClick={onDismissBanner}
          aria-label="Ocultar aviso temporariamente"
          className="h-8 w-8 rounded-lg inline-flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function NetworkAlertToasts({
  toasts,
  onDismissToast,
  onNavigateScreens,
}: {
  toasts: NetworkAlert[];
  onDismissToast: (id: string) => void;
  onNavigateScreens: () => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-16 lg:bottom-5 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)]"
    >
      {toasts.map((toast) => {
        const isOffline = toast.type === 'SCREEN_OFFLINE';
        return (
          <div
            key={toast.id}
            className={`rounded-xl border shadow-xl p-3.5 bg-white flex items-start gap-3 animate-tv-enter ${
              isOffline ? 'border-rose-300' : 'border-emerald-300'
            }`}
          >
            <span
              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                isOffline
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {isOffline ? (
                <WifiOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Wifi className="h-4 w-4" aria-hidden="true" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900">
                {isOffline
                  ? `Tela offline: ${toast.screenName}`
                  : `Tela reconectada: ${toast.screenName}`}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                {toast.screenCode} · {toast.city} — {toast.message}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onDismissToast(toast.id);
                    onNavigateScreens();
                  }}
                  className="text-[11px] font-semibold text-purple-800 hover:underline"
                >
                  Inspecionar Tela
                </button>
                <button
                  type="button"
                  onClick={() => onDismissToast(toast.id)}
                  className="text-[11px] text-slate-400 hover:text-slate-700"
                >
                  Dispensar
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDismissToast(toast.id)}
              aria-label="Fechar notificação"
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
