import React, { useState } from 'react';
import {
  Ban,
  CalendarClock,
  Check,
  Copy,
  Cpu,
  Eraser,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  Link2,
  Monitor,
  Plus,
  Power,
  RectangleHorizontal,
  RectangleVertical,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sliders,
  Smartphone,
  Trash2,
  Tv,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import type {
  AndroidDevice,
  DeviceCommand,
  DeviceCommandType,
  DeviceSettings,
  MediaFitMode,
  Playlist,
  ScreenDevice,
  ScreenOrientation,
} from '../types';

export function isScreenOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  return diffMs <= 10 * 60 * 1000;
}

function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return 'Aguardando APK';
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 1000)
  );
  if (diffSec < 60) return `Há ${diffSec}s`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `Há ${mins} min`;
  return new Date(lastSeenAt).toLocaleDateString('pt-BR');
}

function formatFreeStorage(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function formatCacheSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes === 0) return '0 MB (limpo)';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

const COMMAND_LABELS: Record<DeviceCommandType, string> = {
  CLEAR_CACHE: 'Limpar Cache de Mídias',
  FORCE_LAUNCH_BOOT: 'Forçar Abertura no Boot / Kiosk',
  IDENTIFY_HARDWARE: 'Reconhecer Hardware',
  FORCE_SYNC: 'Sincronizar Grade Agora',
  RESTART_APP: 'Reiniciar APK Player',
  REBOOT_DEVICE: 'Reiniciar Dispositivo',
};

const COMMAND_STATUS_LABELS: Record<
  DeviceCommand['status'],
  { label: string; cls: string }
> = {
  PENDING: { label: 'Pendente', cls: 'text-amber-700' },
  DELIVERED: { label: 'Entregue ao APK', cls: 'text-sky-700' },
  EXECUTED: { label: 'Executado', cls: 'text-emerald-700' },
  FAILED: { label: 'Falhou', cls: 'text-rose-700' },
};

export function ScreensModule({
  screens,
  devices,
  playlists,
  onCreateScreen,
  onAssignPlaylist,
  onUpdateOrientation,
  onAssignDevice,
  onAddSchedule,
  onDeleteSchedule,
  onDeleteScreen,
  onCreateDevice,
  onGeneratePairingCode,
  onUpdateDeviceSettings,
  onSendDeviceCommand,
  onToggleDeviceBlock,
  onDeleteDevice,
}: {
  screens: ScreenDevice[];
  devices: AndroidDevice[];
  playlists: Playlist[];
  onCreateScreen: (payload: {
    name: string;
    location: string;
    city: string;
    state: string;
    uniqueCode: string;
    orientation: ScreenOrientation;
    playlistId: string | null;
  }) => Promise<void>;
  onAssignPlaylist: (screenId: string, playlistId: string | null) => Promise<void>;
  onUpdateOrientation: (
    screenId: string,
    orientation: ScreenOrientation
  ) => Promise<void>;
  onAssignDevice: (screenId: string, deviceId: string | null) => Promise<void>;
  onAddSchedule: (
    screenId: string,
    payload: {
      playlistId: string;
      startsAt: string;
      endsAt: string;
      priority: number;
    }
  ) => Promise<void>;
  onDeleteSchedule: (screenId: string, scheduleId: string) => Promise<void>;
  onDeleteScreen: (screenId: string) => Promise<void>;
  onCreateDevice: (payload: {
    deviceId: string;
    name: string;
    screenId: string | null;
  }) => Promise<void>;
  onGeneratePairingCode: (deviceId: string) => Promise<{
    deviceId: string;
    pairingCode: string;
    expiresAt: string;
  }>;
  onUpdateDeviceSettings: (
    deviceId: string,
    settings: Partial<DeviceSettings>
  ) => Promise<void>;
  onSendDeviceCommand: (
    deviceId: string,
    command: DeviceCommandType
  ) => Promise<DeviceCommand>;
  onToggleDeviceBlock: (deviceId: string, blocked: boolean) => Promise<void>;
  onDeleteDevice: (deviceId: string) => Promise<void>;
}) {
  const [subTab, setSubTab] = useState<'screens' | 'devices'>('screens');
  const [screenModalOpen, setScreenModalOpen] = useState(false);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [scheduleScreen, setScheduleScreen] = useState<ScreenDevice | null>(null);
  const [settingsDevice, setSettingsDevice] = useState<AndroidDevice | null>(null);
  const [controlDeviceId, setControlDeviceId] = useState<string | null>(null);
  const [commandBusyKey, setCommandBusyKey] = useState<string | null>(null);
  const [confirmRebootId, setConfirmRebootId] = useState<string | null>(null);
  const [commandBanner, setCommandBanner] = useState<string | null>(null);
  const [apkSpecModal, setApkSpecModal] = useState<{
    screenCode: string;
    deviceId?: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // One-time revealed pairing codes keyed by deviceId (hidden/masked by default!)
  const [generatedCodes, setGeneratedCodes] = useState<
    Record<string, { code: string; expiresAt: string; visible: boolean }>
  >({});

  // New Screen form
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [stateUf, setStateUf] = useState('SP');
  const [uniqueCode, setUniqueCode] = useState(
    `TV-BR-${String(screens.length + 10).padStart(3, '0')}`
  );
  const [orientation, setOrientation] = useState<ScreenOrientation>('LANDSCAPE');
  const [playlistId, setPlaylistId] = useState<string>(playlists[0]?.id || '');
  const [savingScreen, setSavingScreen] = useState(false);

  // New Device form
  const [newDeviceId, setNewDeviceId] = useState(
    `TVBOX-${String(devices.length + 1).padStart(2, '0')}`
  );
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceScreenId, setNewDeviceScreenId] = useState('');
  const [savingDevice, setSavingDevice] = useState(false);

  // Schedule form
  const [schPlaylistId, setSchPlaylistId] = useState(playlists[0]?.id || '');
  const [schStartsAt, setSchStartsAt] = useState('18:00');
  const [schEndsAt, setSchEndsAt] = useState('22:00');
  const [schPriority, setSchPriority] = useState('10');

  // Device settings draft
  const [settingsDraft, setSettingsDraft] = useState<DeviceSettings | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCreateScreenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim() || !city.trim() || !uniqueCode.trim()) {
      return;
    }
    setSavingScreen(true);
    try {
      await onCreateScreen({
        name: name.trim(),
        location: location.trim(),
        city: city.trim(),
        state: stateUf.trim().toUpperCase() || 'SP',
        uniqueCode: uniqueCode.trim().toUpperCase(),
        orientation,
        playlistId: playlistId || null,
      });
      setName('');
      setLocation('');
      setUniqueCode(`TV-BR-${String(screens.length + 11).padStart(3, '0')}`);
      setScreenModalOpen(false);
    } finally {
      setSavingScreen(false);
    }
  };

  const handleCreateDeviceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceId.trim() || !newDeviceName.trim()) return;
    setSavingDevice(true);
    try {
      await onCreateDevice({
        deviceId: newDeviceId.trim().toUpperCase(),
        name: newDeviceName.trim(),
        screenId: newDeviceScreenId || null,
      });
      setNewDeviceId(`TVBOX-${String(devices.length + 2).padStart(2, '0')}`);
      setNewDeviceName('');
      setNewDeviceScreenId('');
      setDeviceModalOpen(false);
    } finally {
      setSavingDevice(false);
    }
  };

  const handleGenerateCode = async (deviceId: string) => {
    const res = await onGeneratePairingCode(deviceId);
    setGeneratedCodes((prev) => ({
      ...prev,
      [deviceId]: {
        code: res.pairingCode,
        expiresAt: res.expiresAt,
        visible: false,
      },
    }));
  };

  const toggleCodeVisibility = (deviceId: string) => {
    setGeneratedCodes((prev) => {
      const current = prev[deviceId];
      if (!current) return prev;
      return {
        ...prev,
        [deviceId]: { ...current, visible: !current.visible },
      };
    });
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleScreen || !schPlaylistId) return;
    await onAddSchedule(scheduleScreen.id, {
      playlistId: schPlaylistId,
      startsAt: schStartsAt,
      endsAt: schEndsAt,
      priority: Number(schPriority) || 10,
    });
  };

  const openDeviceSettings = (dev: AndroidDevice) => {
    setSettingsDevice(dev);
    setSettingsDraft({ ...dev.settings });
  };

  const saveDeviceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsDevice || !settingsDraft) return;
    await onUpdateDeviceSettings(settingsDevice.deviceId, settingsDraft);
    setSettingsDevice(null);
    setSettingsDraft(null);
  };

  const triggerRemoteCommand = async (
    deviceId: string,
    command: DeviceCommandType
  ) => {
    const busyKey = `${deviceId}:${command}`;
    setCommandBusyKey(busyKey);
    setConfirmRebootId(null);
    try {
      await onSendDeviceCommand(deviceId, command);
      setCommandBanner(
        `Comando "${COMMAND_LABELS[command]}" enviado na fila do dispositivo ${deviceId}.`
      );
      window.setTimeout(() => setCommandBanner(null), 4000);
    } finally {
      setCommandBusyKey(null);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const activeScheduleScreen =
    screens.find((s) => s.id === scheduleScreen?.id) || null;
  const activeControlDevice =
    devices.find((d) => d.deviceId === controlDeviceId) || null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Telas &amp; Dispositivos Android TV Box
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie orientação Horizontal/Vertical, agendamentos por horário, pareamento seguro por código de 6 dígitos e configurações Kiosk do APK.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setDeviceModalOpen(true)}
            className="h-10 px-3.5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-800 transition-colors whitespace-nowrap"
          >
            <Cpu className="h-4 w-4 text-purple-800" aria-hidden="true" />
            <span>+ Novo Dispositivo</span>
          </button>
          <button
            type="button"
            onClick={() => setScreenModalOpen(true)}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-sm font-medium text-white transition-colors whitespace-nowrap shadow-xs"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>+ Nova Tela</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl self-start">
        <button
          type="button"
          onClick={() => setSubTab('screens')}
          className={`px-4 py-1.5 text-xs font-medium rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
            subTab === 'screens'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Monitor className="h-3.5 w-3.5 text-purple-800" aria-hidden="true" />
          <span>Telas Lógicas ({screens.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('devices')}
          className={`px-4 py-1.5 text-xs font-medium rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
            subTab === 'devices'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smartphone className="h-3.5 w-3.5 text-purple-800" aria-hidden="true" />
          <span>Dispositivos TV Box ({devices.length})</span>
        </button>
      </div>

      {/* TAB 1: LOGICAL SCREENS */}
      {subTab === 'screens' && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                  <th className="py-3 px-5">Tela &amp; Local</th>
                  <th className="py-3 px-4">Orientação</th>
                  <th className="py-3 px-4">TV Box Pareada (1:1)</th>
                  <th className="py-3 px-4">Playlist Padrão</th>
                  <th className="py-3 px-4">Agenda / Status</th>
                  <th className="py-3 px-5 text-right">Ações APK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {screens.map((screen) => {
                  const online = isScreenOnline(screen.lastSeenAt);
                  return (
                    <tr
                      key={screen.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {screen.name}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(`code-${screen.id}`, screen.uniqueCode)
                            }
                            title="Copiar código da tela"
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-purple-800 hover:underline"
                          >
                            <span>{screen.uniqueCode}</span>
                            {copiedKey === `code-${screen.id}` ? (
                              <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                            ) : (
                              <Copy className="h-3 w-3 text-slate-400" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {screen.location} · {screen.city}/{screen.state}
                        </p>
                      </td>

                      {/* Orientation buttons (Horizontal / Vertical) per Degree Midia 4.3 */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateOrientation(screen.id, 'LANDSCAPE')
                            }
                            title="Paisagem (Horizontal 1920×1080)"
                            className={`px-2 py-1 rounded-md text-[11px] font-medium inline-flex items-center gap-1 transition-colors ${
                              screen.orientation === 'LANDSCAPE'
                                ? 'bg-white text-purple-900 shadow-xs'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            <RectangleHorizontal className="h-3 w-3" aria-hidden="true" />
                            <span>Horiz</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateOrientation(screen.id, 'PORTRAIT')
                            }
                            title="Retrato (Vertical 1080×1920)"
                            className={`px-2 py-1 rounded-md text-[11px] font-medium inline-flex items-center gap-1 transition-colors ${
                              screen.orientation === 'PORTRAIT'
                                ? 'bg-white text-purple-900 shadow-xs'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            <RectangleVertical className="h-3 w-3" aria-hidden="true" />
                            <span>Vert</span>
                          </button>
                        </div>
                      </td>

                      {/* Linked Physical Android Device (1:1) */}
                      <td className="py-3.5 px-4">
                        <select
                          value={screen.deviceId || ''}
                          onChange={(e) =>
                            onAssignDevice(screen.id, e.target.value || null)
                          }
                          aria-label={`Dispositivo para ${screen.name}`}
                          className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-purple-700 font-mono"
                        >
                          <option value="">Sem dispositivo</option>
                          {devices.map((dev) => (
                            <option key={dev.deviceId} value={dev.deviceId}>
                              {dev.deviceId} ({dev.name})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Default Playlist */}
                      <td className="py-3.5 px-4">
                        <select
                          value={screen.playlistId || ''}
                          onChange={(e) =>
                            onAssignPlaylist(screen.id, e.target.value || null)
                          }
                          aria-label={`Playlist para ${screen.name}`}
                          className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-purple-700"
                        >
                          <option value="">Sem playlist</option>
                          {playlists.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.name} {pl.status === 'DRAFT' ? '(Rascunho)' : ''}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Schedule count + Online Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          {online ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
                              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Online · {formatLastSeen(screen.lastSeenAt)}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
                              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Offline · {formatLastSeen(screen.lastSeenAt)}</span>
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setScheduleScreen(screen)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-800 hover:underline self-start"
                          >
                            <CalendarClock className="h-3 w-3" aria-hidden="true" />
                            <span>
                              {screen.schedules.length > 0
                                ? `${screen.schedules.length} regra(s) de horário`
                                : '+ Agendar horário'}
                            </span>
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setApkSpecModal({
                                screenCode: screen.uniqueCode,
                                deviceId: screen.deviceId || undefined,
                              })
                            }
                            className="h-8 px-3 rounded-lg bg-purple-800 hover:bg-purple-900 text-xs font-medium text-white inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Contrato APK</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteScreen(screen.id)}
                            aria-label={`Excluir tela ${screen.name}`}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: PHYSICAL ANDROID DEVICES / TV BOXES */}
      {subTab === 'devices' && (
        <div className="flex flex-col gap-4">
          {commandBanner && (
            <div
              role="status"
              className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex items-center justify-between gap-2"
            >
              <span>{commandBanner}</span>
              <button
                type="button"
                onClick={() => setCommandBanner(null)}
                className="text-emerald-700 hover:text-emerald-950"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {devices.map((dev) => {
              const linkedScreen = screens.find((s) => s.id === dev.screenId);
              const codeInfo = generatedCodes[dev.deviceId];
              const online = isScreenOnline(dev.lastSeenAt);
              const hw = dev.hardware;
              const lastCmd = dev.recentCommands?.[0];
              const isBlocked = dev.status === 'BLOCKED';

              return (
                <article
                  key={dev.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 justify-between"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-purple-900">
                            {dev.deviceId}
                          </span>
                          <span
                            className={`text-[11px] font-medium ${
                              isBlocked
                                ? 'text-rose-700'
                                : online
                                ? 'text-emerald-700'
                                : 'text-slate-500'
                            }`}
                          >
                            · {isBlocked ? 'Bloqueado' : online ? 'Online' : dev.status}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 truncate mt-0.5">
                          {dev.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {hw?.manufacturer ? `${hw.manufacturer} ` : ''}
                          {hw?.model || dev.deviceModel || 'Android TV Box'} ·{' '}
                          {dev.osVersion || 'Android'} · APK v{dev.appVersion || '1.0.1'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteDevice(dev.deviceId)}
                        aria-label={`Remover dispositivo ${dev.deviceId}`}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Hardware & Operational Telemetry */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-col gap-1.5">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Hardware / CPU</span>
                        <span className="font-mono text-slate-800 truncate max-w-[190px] text-right">
                          {hw?.board || 'Aguardando leitura'}
                          {hw?.ramTotalMb
                            ? ` · ${(hw.ramTotalMb / 1024).toFixed(0)}GB RAM`
                            : ''}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Tela associada</span>
                        <span className="font-medium text-slate-900 truncate max-w-[180px]">
                          {linkedScreen ? linkedScreen.name : 'Não associada'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Disco / Cache APK</span>
                        <span className="font-mono text-slate-700 tabular-nums">
                          {formatFreeStorage(dev.storageFreeBytes)} livres · Cache{' '}
                          {formatCacheSize(dev.cacheBytes)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Início / Boot</span>
                        <span className="font-mono text-slate-700">
                          {dev.settings.startOnBoot ? 'Auto-Boot' : 'Manual'} ·{' '}
                          {dev.settings.kioskMode ? 'Kiosk' : 'Janela'} ·{' '}
                          {dev.settings.watchdogEnabled !== false
                            ? 'Watchdog'
                            : 'Sem Watchdog'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Tela / Nitidez</span>
                        <span className="font-mono text-emerald-700">
                          {dev.settings.mediaFitMode === 'NATIVE_NO_UPSCALE'
                            ? 'CENTER_INSIDE'
                            : 'FIT_CENTER'}{' '}
                          · Sem corte/blur
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Comunicação APK</span>
                        <span className="font-mono text-slate-700 tabular-nums">
                          {dev.settings.fastSyncEnabled !== false ? 'SSE + ' : ''}
                          {dev.settings.syncIntervalSeconds}s · {formatLastSeen(dev.lastSeenAt)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Remote Control Actions on TV Box */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        disabled={commandBusyKey === `${dev.deviceId}:CLEAR_CACHE`}
                        onClick={() =>
                          triggerRemoteCommand(dev.deviceId, 'CLEAR_CACHE')
                        }
                        className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-300 text-[11px] font-medium text-slate-800 inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Eraser className="h-3.5 w-3.5 text-purple-800 shrink-0" aria-hidden="true" />
                        <span>Limpar Cache</span>
                      </button>

                      <button
                        type="button"
                        disabled={
                          commandBusyKey === `${dev.deviceId}:FORCE_LAUNCH_BOOT`
                        }
                        onClick={() =>
                          triggerRemoteCommand(dev.deviceId, 'FORCE_LAUNCH_BOOT')
                        }
                        className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-300 text-[11px] font-medium text-slate-800 inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Zap className="h-3.5 w-3.5 text-purple-800 shrink-0" aria-hidden="true" />
                        <span>Forçar Boot/Kiosk</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setControlDeviceId(dev.deviceId)}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-300 text-[11px] font-medium text-slate-800 inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <HardDrive className="h-3.5 w-3.5 text-purple-800 shrink-0" aria-hidden="true" />
                        <span>Hardware &amp; Ações</span>
                      </button>

                      {confirmRebootId === dev.deviceId ? (
                        <button
                          type="button"
                          onClick={() =>
                            triggerRemoteCommand(dev.deviceId, 'REBOOT_DEVICE')
                          }
                          className="h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-[11px] font-semibold text-white inline-flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Power className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>Confirmar Reboot</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRebootId(dev.deviceId)}
                          className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-[11px] font-medium text-rose-800 inline-flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Power className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>Reiniciar Box</span>
                        </button>
                      )}
                    </div>

                    {lastCmd && (
                      <div className="text-[11px] text-slate-500 flex items-center justify-between gap-2 px-0.5">
                        <span className="truncate">
                          Último: {COMMAND_LABELS[lastCmd.command]}
                        </span>
                        <span
                          className={`font-semibold shrink-0 ${
                            COMMAND_STATUS_LABELS[lastCmd.status].cls
                          }`}
                        >
                          {COMMAND_STATUS_LABELS[lastCmd.status].label}
                        </span>
                      </div>
                    )}

                    {/* Pairing Code Box (Hidden/Masked by default per Degree Midia 4.3 & 9.4) */}
                    {codeInfo ? (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-medium text-purple-800">
                            Código temporário (expira em 10 min)
                          </p>
                          <p className="font-mono text-lg font-bold tracking-widest text-purple-950 mt-0.5">
                            {codeInfo.visible ? codeInfo.code : '••••••'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleCodeVisibility(dev.deviceId)}
                            aria-label={
                              codeInfo.visible
                                ? 'Ocultar código de pareamento'
                                : 'Revelar código de pareamento'
                            }
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white border border-purple-200 text-purple-900"
                          >
                            {codeInfo.visible ? (
                              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(`devcode-${dev.deviceId}`, codeInfo.code)
                            }
                            aria-label="Copiar código"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white border border-purple-200 text-purple-900"
                          >
                            {copiedKey === `devcode-${dev.deviceId}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                        <span>
                          {dev.pairingStatus === 'PAIRED'
                            ? 'Dispositivo pareado por token seguro.'
                            : 'Gere um código de 6 dígitos para parear a TV Box.'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateCode(dev.deviceId)}
                      className="h-8 px-3 rounded-lg bg-purple-800 hover:bg-purple-900 text-xs font-medium text-white inline-flex items-center gap-1.5"
                    >
                      <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Gerar Código 6 Dígitos</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openDeviceSettings(dev)}
                        title="Configurações Kiosk e Sync"
                        aria-label={`Configurar ${dev.deviceId}`}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                      >
                        <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Ajustes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setApkSpecModal({
                            screenCode: linkedScreen?.uniqueCode || 'TV-SP-001',
                            deviceId: dev.deviceId,
                          })
                        }
                        title="Endpoints da API para APK"
                        className="h-8 w-8 rounded-lg border border-slate-200 text-purple-800 hover:bg-purple-50 inline-flex items-center justify-center"
                      >
                        <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      )}

      {/* Modal: + Nova Tela */}
      {screenModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tv className="h-4 w-4 text-purple-800" aria-hidden="true" />
                <h2 className="text-base font-semibold text-slate-900">
                  Cadastrar Nova Tela
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setScreenModalOpen(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleCreateScreenSubmit} className="p-5 flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome da TV / Ponto
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Hall Elevador Torre B"
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Local / Endereço
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Av. Paulista, 1000 · Térreo"
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    UF
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    required
                    value={stateUf}
                    onChange={(e) => setStateUf(e.target.value)}
                    className="w-full h-10 px-3 text-sm uppercase border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Código Único
                  </label>
                  <input
                    type="text"
                    required
                    value={uniqueCode}
                    onChange={(e) => setUniqueCode(e.target.value.toUpperCase())}
                    className="w-full h-10 px-3 text-sm font-mono uppercase border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Orientação
                  </label>
                  <select
                    value={orientation}
                    onChange={(e) =>
                      setOrientation(e.target.value as ScreenOrientation)
                    }
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                  >
                    <option value="LANDSCAPE">Horizontal (Landscape)</option>
                    <option value="PORTRAIT">Vertical (Portrait)</option>
                    <option value="AUTO">Automática</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Playlist Padrão
                </label>
                <select
                  value={playlistId}
                  onChange={(e) => setPlaylistId(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                >
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScreenModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingScreen}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-800 hover:bg-purple-900 rounded-lg"
                >
                  {savingScreen ? 'Cadastrando...' : 'Salvar Tela'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: + Novo Dispositivo Android / TV Box */}
      {deviceModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-800" aria-hidden="true" />
                <h2 className="text-base font-semibold text-slate-900">
                  Novo Dispositivo TV Box / Android
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDeviceModalOpen(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleCreateDeviceSubmit} className="p-5 flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Device ID Operacional
                </label>
                <input
                  type="text"
                  required
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value.toUpperCase())}
                  placeholder="Ex: TVBOX-04"
                  className="w-full h-10 px-3 text-sm font-mono uppercase border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome do Equipamento
                </label>
                <input
                  type="text"
                  required
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="Ex: TV Box Recepção Shopping Sul"
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Associar à Tela (opcional)
                </label>
                <select
                  value={newDeviceScreenId}
                  onChange={(e) => setNewDeviceScreenId(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                >
                  <option value="">Associar depois</option>
                  {screens.map((scr) => (
                    <option key={scr.id} value={scr.id}>
                      {scr.name} ({scr.uniqueCode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeviceModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDevice}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-800 hover:bg-purple-900 rounded-lg"
                >
                  {savingDevice ? 'Criando...' : 'Criar Dispositivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Agendamentos por Horário e Prioridade (ScreenPlaylist) */}
      {activeScheduleScreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-purple-800" aria-hidden="true" />
                <h2 className="text-base font-semibold text-slate-900">
                  Agendamento · {activeScheduleScreen.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setScheduleScreen(null)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <p className="text-xs text-slate-500">
                Quando uma janela de horário estiver ativa (fuso America/Sao_Paulo), a playlist de maior prioridade substitui automaticamente a playlist padrão da tela.
              </p>

              <form
                onSubmit={handleScheduleSubmit}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
              >
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Playlist
                  </label>
                  <select
                    value={schPlaylistId}
                    onChange={(e) => setSchPlaylistId(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    {playlists.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Início
                  </label>
                  <input
                    type="time"
                    value={schStartsAt}
                    onChange={(e) => setSchStartsAt(e.target.value)}
                    className="w-full h-9 px-2 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Fim
                  </label>
                  <input
                    type="time"
                    value={schEndsAt}
                    onChange={(e) => setSchEndsAt(e.target.value)}
                    className="w-full h-9 px-2 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-3 flex gap-1.5">
                  <div className="w-16">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Prior.
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={schPriority}
                      onChange={(e) => setSchPriority(e.target.value)}
                      className="w-full h-9 px-2 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-9 px-3 rounded-lg bg-purple-800 hover:bg-purple-900 text-xs font-medium text-white self-end"
                  >
                    Adicionar
                  </button>
                </div>
              </form>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {activeScheduleScreen.schedules.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-500">
                    Nenhum agendamento configurado. A tela usa a playlist padrão o dia todo.
                  </p>
                ) : (
                  activeScheduleScreen.schedules.map((sch) => {
                    const pl = playlists.find((p) => p.id === sch.playlistId);
                    return (
                      <div
                        key={sch.id}
                        className="px-4 py-3 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {pl?.name || sch.playlistId}
                          </p>
                          <p className="font-mono text-slate-500 mt-0.5 tabular-nums">
                            {sch.startsAt} – {sch.endsAt} · Prioridade {sch.priority}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onDeleteSchedule(activeScheduleScreen.id, sch.id)
                          }
                          aria-label="Remover agendamento"
                          className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: DeviceSettings (Kiosk, Boot, Sync Intervals, Audio) */}
      {settingsDevice && settingsDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-purple-800" aria-hidden="true" />
                <h2 className="text-base font-semibold text-slate-900">
                  DeviceSettings · {settingsDevice.deviceId}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSettingsDevice(null)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={saveDeviceSettings} className="p-5 flex flex-col gap-3.5 text-sm max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sync Playlist (seg)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="86400"
                    value={settingsDraft.syncIntervalSeconds}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        syncIntervalSeconds: Number(e.target.value) || 30,
                      })
                    }
                    className="w-full h-9 px-3 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Heartbeat (seg)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="3600"
                    value={settingsDraft.heartbeatIntervalSeconds}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        heartbeatIntervalSeconds: Number(e.target.value) || 30,
                      })
                    }
                    className="w-full h-9 px-3 text-xs font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Volume ({settingsDraft.volume}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settingsDraft.volume}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        volume: Number(e.target.value),
                      })
                    }
                    className="w-full accent-purple-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Orientação Fallback
                  </label>
                  <select
                    value={settingsDraft.screenOrientation}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        screenOrientation: e.target.value as ScreenOrientation,
                      })
                    }
                    className="w-full h-9 px-2.5 text-xs border border-slate-200 rounded-lg"
                  >
                    <option value="LANDSCAPE">LANDSCAPE</option>
                    <option value="PORTRAIT">PORTRAIT</option>
                    <option value="AUTO">AUTO</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1 text-xs text-slate-700">
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span>Modo Kiosk (startLockTask / Imersivo)</span>
                  <input
                    type="checkbox"
                    checked={settingsDraft.kioskMode}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        kioskMode: e.target.checked,
                      })
                    }
                    className="accent-purple-800 h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span>Iniciar automaticamente no Boot (BootReceiver)</span>
                  <input
                    type="checkbox"
                    checked={settingsDraft.startOnBoot}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        startOnBoot: e.target.checked,
                      })
                    }
                    className="accent-purple-800 h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span>Watchdog (Forçar reabertura se sair do app)</span>
                  <input
                    type="checkbox"
                    checked={settingsDraft.watchdogEnabled !== false}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        watchdogEnabled: e.target.checked,
                      })
                    }
                    className="accent-purple-800 h-4 w-4"
                  />
                </label>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span>Atraso após Boot (segundos)</span>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={settingsDraft.autoLaunchDelaySeconds ?? 3}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        autoLaunchDelaySeconds: Math.max(
                          0,
                          Math.min(60, Number(e.target.value) || 0)
                        ),
                      })
                    }
                    className="w-16 h-7 px-2 text-xs font-mono text-right bg-white border border-slate-200 rounded"
                  />
                </div>
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span>Cache Offline Transacional (documentDirectory + SHA-256)</span>
                  <input
                    type="checkbox"
                    checked={settingsDraft.offlineModeEnabled}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        offlineModeEnabled: e.target.checked,
                      })
                    }
                    className="accent-purple-800 h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span>Silenciar áudio (Muted)</span>
                  <input
                    type="checkbox"
                    checked={settingsDraft.muted}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        muted: e.target.checked,
                      })
                    }
                    className="accent-purple-800 h-4 w-4"
                  />
                </label>

                <div className="mt-2 pt-3 border-t border-slate-200 flex flex-col gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-900">
                    Enquadramento &amp; Nitidez no APK (Anti-Corte / Anti-Esticar)
                  </p>
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-purple-50/50 border border-purple-200">
                    <span className="font-medium text-slate-800">Modo de Escala APK</span>
                    <select
                      value={settingsDraft.mediaFitMode || 'FIT_NO_CROP'}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          mediaFitMode: e.target.value as MediaFitMode,
                        })
                      }
                      className="h-8 px-2 text-xs bg-white border border-purple-200 rounded-lg font-medium text-slate-900"
                    >
                      <option value="FIT_NO_CROP">FIT_CENTER / RESIZE_MODE_FIT</option>
                      <option value="NATIVE_NO_UPSCALE">CENTER_INSIDE (Sem ampliar)</option>
                    </select>
                  </div>
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span>Proibir corte nas bordas (preventCrop)</span>
                    <input
                      type="checkbox"
                      checked={settingsDraft.preventCrop !== false}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          preventCrop: e.target.checked,
                        })
                      }
                      className="accent-purple-800 h-4 w-4"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span>Proibir esticar imagem/vídeo (preventStretch)</span>
                    <input
                      type="checkbox"
                      checked={settingsDraft.preventStretch !== false}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          preventStretch: e.target.checked,
                        })
                      }
                      className="accent-purple-800 h-4 w-4"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span>Proibir fundo esfumaçado / blur (preventBlurBackdrop)</span>
                    <input
                      type="checkbox"
                      checked={settingsDraft.preventBlurBackdrop !== false}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          preventBlurBackdrop: e.target.checked,
                        })
                      }
                      className="accent-purple-800 h-4 w-4"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span>Evitar ampliar mídia menor (evita embaçar)</span>
                    <input
                      type="checkbox"
                      checked={settingsDraft.preventUpscaleBlur !== false}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          preventUpscaleBlur: e.target.checked,
                        })
                      }
                      className="accent-purple-800 h-4 w-4"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span>Comunicação instantânea SSE + Delta Rápido</span>
                    <input
                      type="checkbox"
                      checked={settingsDraft.fastSyncEnabled !== false}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          fastSyncEnabled: e.target.checked,
                        })
                      }
                      className="accent-purple-800 h-4 w-4"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettingsDevice(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-800 hover:bg-purple-900 rounded-lg"
                >
                  Salvar Ajustes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Controle Remoto Total & Hardware Reconhecido */}
      {activeControlDevice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sliders className="h-4 w-4 text-purple-800" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Controle Total &amp; Hardware · {activeControlDevice.deviceId}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {activeControlDevice.name} ·{' '}
                    {activeControlDevice.lastIpAddress || 'IP não informado'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setControlDeviceId(null)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-5 max-h-[82vh] overflow-y-auto">
              {/* Hardware Recognition Sheet */}
              <section className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Hardware Reconhecido pelo APK
                  </h3>
                  <button
                    type="button"
                    disabled={
                      commandBusyKey ===
                      `${activeControlDevice.deviceId}:IDENTIFY_HARDWARE`
                    }
                    onClick={() =>
                      triggerRemoteCommand(
                        activeControlDevice.deviceId,
                        'IDENTIFY_HARDWARE'
                      )
                    }
                    className="h-7 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-xs font-medium text-purple-900 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    <span>Atualizar Leitura Hardware</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {[
                    {
                      label: 'Fabricante / Marca',
                      val: `${
                        activeControlDevice.hardware?.manufacturer || 'Não lido'
                      }${
                        activeControlDevice.hardware?.brand
                          ? ` (${activeControlDevice.hardware.brand})`
                          : ''
                      }`,
                    },
                    {
                      label: 'Modelo / Board',
                      val: `${
                        activeControlDevice.hardware?.model ||
                        activeControlDevice.deviceModel ||
                        '—'
                      }${
                        activeControlDevice.hardware?.board
                          ? ` · ${activeControlDevice.hardware.board}`
                          : ''
                      }`,
                    },
                    {
                      label: 'CPU / Arquitetura',
                      val: `${activeControlDevice.hardware?.cpuAbi || '—'}${
                        activeControlDevice.hardware?.cpuCores
                          ? ` · ${activeControlDevice.hardware.cpuCores} núcleos`
                          : ''
                      }`,
                    },
                    {
                      label: 'Memória RAM',
                      val: activeControlDevice.hardware?.ramTotalMb
                        ? `${activeControlDevice.hardware.ramTotalMb} MB (${(
                            activeControlDevice.hardware.ramTotalMb / 1024
                          ).toFixed(1)} GB)`
                        : '—',
                    },
                    {
                      label: 'Armazenamento',
                      val: `${formatFreeStorage(
                        activeControlDevice.storageFreeBytes
                      )} / ${formatFreeStorage(
                        activeControlDevice.hardware?.storageTotalBytes
                      )}`,
                    },
                    {
                      label: 'Display / Android SDK',
                      val: `${
                        activeControlDevice.hardware?.screenWidthPx &&
                        activeControlDevice.hardware?.screenHeightPx
                          ? `${activeControlDevice.hardware.screenWidthPx}×${activeControlDevice.hardware.screenHeightPx}`
                          : '—'
                      } · SDK ${
                        activeControlDevice.hardware?.androidSdk || '—'
                      }`,
                    },
                    {
                      label: 'MAC / Serial',
                      val: `${
                        activeControlDevice.hardware?.macAddress || '—'
                      }`,
                    },
                    {
                      label: 'Serial Fingerprint',
                      val:
                        activeControlDevice.hardware?.serialFingerprint || '—',
                    },
                    {
                      label: 'Privilégio MDM / Root',
                      val: activeControlDevice.hardware?.isDeviceOwner
                        ? 'Device Owner Ativo (Kiosk/Reboot)'
                        : 'App Padrão (Sem Device Owner)',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <p className="text-[11px] text-slate-500">{item.label}</p>
                      <p className="font-mono font-semibold text-slate-900 truncate mt-0.5">
                        {item.val}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Remote Control Commands Grid */}
              <section className="flex flex-col gap-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Comandos Remotos para o Dispositivo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <button
                    type="button"
                    disabled={
                      commandBusyKey ===
                      `${activeControlDevice.deviceId}:CLEAR_CACHE`
                    }
                    onClick={() =>
                      triggerRemoteCommand(
                        activeControlDevice.deviceId,
                        'CLEAR_CACHE'
                      )
                    }
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-purple-400 hover:bg-purple-50/40 text-left flex items-start gap-3 transition-colors"
                  >
                    <Eraser className="h-4 w-4 text-purple-800 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-slate-900">
                        Limpar Cache de Mídias
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Atual: {formatCacheSize(activeControlDevice.cacheBytes)} · Purga vídeos/imagens e força novo download SHA-256.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={
                      commandBusyKey ===
                      `${activeControlDevice.deviceId}:FORCE_LAUNCH_BOOT`
                    }
                    onClick={() =>
                      triggerRemoteCommand(
                        activeControlDevice.deviceId,
                        'FORCE_LAUNCH_BOOT'
                      )
                    }
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-purple-400 hover:bg-purple-50/40 text-left flex items-start gap-3 transition-colors"
                  >
                    <Zap className="h-4 w-4 text-purple-800 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-slate-900">
                        Forçar Abertura no Boot &amp; Kiosk
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Ativa BootReceiver, Modo Kiosk e Watchdog para abrir o APK ao ligar a TV Box.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={
                      commandBusyKey ===
                      `${activeControlDevice.deviceId}:FORCE_SYNC`
                    }
                    onClick={() =>
                      triggerRemoteCommand(
                        activeControlDevice.deviceId,
                        'FORCE_SYNC'
                      )
                    }
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-purple-400 hover:bg-purple-50/40 text-left flex items-start gap-3 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 text-purple-800 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-slate-900">
                        Sincronizar Playlist Agora
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Ignora o intervalo padrão e baixa imediatamente a grade publicada mais recente.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={
                      commandBusyKey ===
                      `${activeControlDevice.deviceId}:RESTART_APP`
                    }
                    onClick={() =>
                      triggerRemoteCommand(
                        activeControlDevice.deviceId,
                        'RESTART_APP'
                      )
                    }
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-purple-400 hover:bg-purple-50/40 text-left flex items-start gap-3 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4 text-purple-800 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-slate-900">
                        Reiniciar APK Player
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Reinicia o aplicativo Tá On Mídia Player sem desligar o sistema operacional Android.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={
                      commandBusyKey ===
                      `${activeControlDevice.deviceId}:REBOOT_DEVICE`
                    }
                    onClick={() =>
                      triggerRemoteCommand(
                        activeControlDevice.deviceId,
                        'REBOOT_DEVICE'
                      )
                    }
                    className="p-3 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-left flex items-start gap-3 transition-colors"
                  >
                    <Power className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-rose-900">
                        Reiniciar Dispositivo (Reboot)
                      </p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        Envia reinicialização completa do sistema Android TV Box (Device Owner / Reboot).
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onToggleDeviceBlock(
                        activeControlDevice.deviceId,
                        activeControlDevice.status !== 'BLOCKED'
                      )
                    }
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left flex items-start gap-3 transition-colors"
                  >
                    <Ban className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {activeControlDevice.status === 'BLOCKED'
                          ? 'Desbloquear Dispositivo'
                          : 'Bloquear Acesso do Dispositivo'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {activeControlDevice.status === 'BLOCKED'
                          ? 'Reativa o token de sincronização da TV Box.'
                          : 'Suspende imediatamente a autenticação Bearer deste aparelho.'}
                      </p>
                    </div>
                  </button>
                </div>
              </section>

              {/* Command Execution History */}
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Fila e Histórico de Comandos ({activeControlDevice.recentCommands?.length || 0})
                </h3>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 max-h-48 overflow-y-auto">
                  {!activeControlDevice.recentCommands ||
                  activeControlDevice.recentCommands.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-500">
                      Nenhum comando remoto enviado ainda para este dispositivo.
                    </p>
                  ) : (
                    activeControlDevice.recentCommands.map((cmd) => (
                      <div
                        key={cmd.id}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {COMMAND_LABELS[cmd.command]}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            Por {cmd.requestedBy} ·{' '}
                            {new Date(cmd.createdAt).toLocaleString('pt-BR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                            {cmd.resultMessage ? ` · ${cmd.resultMessage}` : ''}
                          </p>
                        </div>
                        <span
                          className={`font-mono text-[11px] font-semibold shrink-0 ${
                            COMMAND_STATUS_LABELS[cmd.status].cls
                          }`}
                        >
                          {COMMAND_STATUS_LABELS[cmd.status].label}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Modal: APK Android Endpoints & Offline-First Spec */}
      {apkSpecModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-purple-800" aria-hidden="true" />
                <h2 className="text-base font-semibold text-slate-900">
                  Contrato API Player Android ({apkSpecModal.deviceId || apkSpecModal.screenCode})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setApkSpecModal(null)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3 text-xs max-h-[82vh] overflow-y-auto">
              <p className="text-slate-600 leading-relaxed">
                Protocolo <strong>Tá On Mídia v2</strong>: comunicação direta, rápida e objetiva em 1 chamada (<code className="font-mono">/sync</code>) + push em tempo real (<code className="font-mono">/stream</code>) com diretivas rígidas para nunca cortar, esticar, embaçar ou esfumaçar as mídias na TV:
              </p>

              {[
                {
                  key: 'sync',
                  title: '1. Sync Rápido Unificado + Diretiva de Tela (GET — Bearer)',
                  url: `${origin}/api/devices/${apkSpecModal.deviceId || 'TVBOX-01'}/sync?v=0`,
                },
                {
                  key: 'stream',
                  title: '2. Push Instantâneo SSE <100ms (GET text/event-stream — Bearer)',
                  url: `${origin}/api/devices/${apkSpecModal.deviceId || 'TVBOX-01'}/stream`,
                },
                {
                  key: 'pair',
                  title: '3. Pareamento Seguro + Hardware (POST)',
                  url: `${origin}/api/devices/pair`,
                },
                {
                  key: 'hb',
                  title: '4. Heartbeat + Hardware + Receber Comandos (POST — Bearer)',
                  url: `${origin}/api/devices/${apkSpecModal.deviceId || 'TVBOX-01'}/heartbeat`,
                },
                {
                  key: 'cmd',
                  title: '5. Fila de Comandos Remotos & ACK (GET pending / POST ack)',
                  url: `${origin}/api/devices/${apkSpecModal.deviceId || 'TVBOX-01'}/commands/pending`,
                },
                {
                  key: 'ev',
                  title: '6. Eventos de Reprodução / Fila Offline (POST — Bearer)',
                  url: `${origin}/api/devices/${apkSpecModal.deviceId || 'TVBOX-01'}/playback-events`,
                },
              ].map((ep) => (
                <div
                  key={ep.key}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800">{ep.title}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(ep.key, ep.url)}
                      className="text-purple-800 inline-flex items-center gap-1 font-medium"
                    >
                      {copiedKey === ep.key ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{copiedKey === ep.key ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <code className="font-mono text-slate-700 break-all">{ep.url}</code>
                </div>
              ))}

              <div className="p-3 bg-slate-950 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed">
                <p className="text-emerald-400 font-semibold mb-1">
                  Diretiva objetiva enviada no campo &quot;display&quot; do /sync:
                </p>
                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(
                  {
                    fitMode: 'FIT_NO_CROP',
                    exoResizeMode: 'RESIZE_MODE_FIT',
                    imageScaleType: 'FIT_CENTER',
                    preventCrop: true,
                    preventStretch: true,
                    preventBlurBackdrop: true,
                    preventUpscaleBlur: true,
                    backgroundColor: '#000000',
                  },
                  null,
                  2
                )}</pre>
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-purple-950">
                <p className="font-semibold mb-1">Comandos Remotos &amp; Hardware</p>
                <p className="leading-relaxed">
                  Envie <code className="font-mono">hardware</code> e <code className="font-mono">cacheBytes</code> no heartbeat. Quando receber evento <code className="font-mono">sync-now</code> ou <code className="font-mono">command</code> via SSE (<code className="font-mono">/stream</code>), chame <code className="font-mono">/sync?v=ATUAL</code> imediatamente e confirme comandos em <code className="font-mono">POST /commands/:id/ack</code>.
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setApkSpecModal(null)}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-800 hover:bg-purple-900 rounded-lg"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
