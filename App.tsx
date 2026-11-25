/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  ChevronRight,
  FolderOpen,
  Kanban,
  LayoutDashboard,
  ListVideo,
  LogOut,
  Map as MapIcon,
  Megaphone,
  Menu,
  Monitor,
  PanelLeft,
  Search,
  Sparkles,
  Tv,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  Advertiser,
  AndroidDevice,
  AuthUser,
  CampaignItem,
  ClientAccess,
  CrmStage,
  DeviceCommand,
  DeviceCommandType,
  DeviceSettings,
  DynamicCategory,
  DynamicContentItem,
  ExternalApiSettings,
  MediaAsset,
  MediaFitMode,
  MediaQrCodeConfig,
  NavSection,
  PlaybackMode,
  Playlist,
  PlaylistItem,
  ScreenDevice,
  ScreenOrientation,
} from './types';
import { apiFetch, setAuthToken } from './lib/api';
import { AuthScreen } from './components/AuthScreen';
import { CrmKanban } from './components/CrmKanban';
import { LibraryModule } from './components/LibraryModule';
import { DynamicContentModule } from './components/DynamicContentModule';
import { PlaylistsModule } from './components/PlaylistsModule';
import { isScreenOnline, ScreensModule } from './components/ScreensModule';
import { CommandPalette } from './components/CommandPalette';
import {
  CampaignsModule,
  ClientAccessModule,
  DashboardView,
  MapModule,
  ReportsModule,
} from './components/WorkspaceModules';
import { PlayerApp } from './components/PlayerApp';

interface NavGroup {
  title: string;
  items: Array<{
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    highlighted?: boolean;
  }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Gestão Comercial',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'acessos', label: 'Acessos de clientes', icon: UserCheck },
      { id: 'crm', label: 'CRM', icon: Kanban, highlighted: true },
    ],
  },
  {
    title: 'Programação & Mídia',
    items: [
      { id: 'biblioteca', label: 'Biblioteca', icon: FolderOpen },
      { id: 'conteudos', label: 'Conteúdos Dinâmicos', icon: Sparkles },
      { id: 'playlists', label: 'Playlists', icon: ListVideo },
      { id: 'campanhas', label: 'Campanhas', icon: Megaphone },
    ],
  },
  {
    title: 'Operação & Rede',
    items: [
      { id: 'telas', label: 'Telas', icon: Monitor },
      { id: 'mapa', label: 'Mapa', icon: MapIcon },
      { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    ],
  },
];

const NAV_LABELS: Record<NavSection, { label: string; hint: string }> = {
  dashboard: { label: 'Dashboard', hint: 'Indicadores gerais e fluxo rápido' },
  acessos: { label: 'Acessos de clientes', hint: 'Contas e permissões de parceiros' },
  crm: { label: 'CRM', hint: 'Funil comercial em Kanban' },
  biblioteca: { label: 'Biblioteca', hint: 'Bucket público midias (JPG, PNG e MP4)' },
  conteudos: { label: 'Conteúdos Dinâmicos', hint: 'Templates 16:9 ao vivo para TVs' },
  playlists: { label: 'Playlists', hint: 'Grades de exibição e tempos' },
  campanhas: { label: 'Campanhas', hint: 'Veiculação contratada por período' },
  telas: { label: 'Telas', hint: 'Terminais e pareamento APK Android' },
  mapa: { label: 'Mapa', hint: 'Cobertura regional das telas' },
  relatorios: { label: 'Relatórios', hint: 'Receita, exibições e exportação CSV' },
};

export default function App() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasUsers, setHasUsers] = useState(false);

  // Tela principal após login: CRM
  const [activeSection, setActiveSection] = useState<NavSection>('crm');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Application state loaded from backend
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [midias, setMidias] = useState<MediaAsset[]>([]);
  const [dynamicContents, setDynamicContents] = useState<DynamicContentItem[]>(
    []
  );
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [screens, setScreens] = useState<ScreenDevice[]>([]);
  const [devices, setDevices] = useState<AndroidDevice[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [clientAccesses, setClientAccesses] = useState<ClientAccess[]>([]);
  const [externalApiSettings, setExternalApiSettings] =
    useState<ExternalApiSettings | null>(null);
  const [externalStorageTarget, setExternalStorageTarget] = useState<
    'supabase' | 'local'
  >('local');

  const loadWorkspaceData = useCallback(async () => {
    const [adv, mid, dyn, pl, scr, dev, cmp, acc, extApis] = await Promise.all([
      apiFetch<Advertiser[]>('/api/advertisers'),
      apiFetch<MediaAsset[]>('/api/midias'),
      apiFetch<DynamicContentItem[]>('/api/dynamic-contents'),
      apiFetch<Playlist[]>('/api/playlists'),
      apiFetch<ScreenDevice[]>('/api/screens'),
      apiFetch<AndroidDevice[]>('/api/devices'),
      apiFetch<CampaignItem[]>('/api/campaigns'),
      apiFetch<ClientAccess[]>('/api/client-accesses'),
      apiFetch<{
        settings: ExternalApiSettings;
        storageTarget: 'supabase' | 'local';
      }>('/api/external-apis'),
    ]);
    setAdvertisers(adv);
    setMidias(mid);
    setDynamicContents(dyn);
    setPlaylists(pl);
    setScreens(scr);
    setDevices(dev);
    setCampaigns(cmp);
    setClientAccesses(acc);
    setExternalApiSettings(extApis.settings);
    setExternalStorageTarget(extApis.storageTarget);
  }, []);

  // Verify session on mount
  useEffect(() => {
    let active = true;
    async function checkSession() {
      try {
        const res = await apiFetch<{
          user: AuthUser | null;
          hasUsers: boolean;
        }>('/api/auth/me');
        if (!active) return;
        setHasUsers(res.hasUsers);
        if (res.user) {
          setUser(res.user);
          await loadWorkspaceData();
        }
      } catch {
        // Ignore initial check error
      } finally {
        if (active) setAuthChecking(false);
      }
    }
    checkSession();
    return () => {
      active = false;
    };
  }, [loadWorkspaceData]);

  // Refresh screen & device heartbeats every 15s when monitoring screens
  useEffect(() => {
    if (!user) return;
    if (!['telas', 'dashboard', 'mapa', 'relatorios'].includes(activeSection)) return;
    const timer = window.setInterval(() => {
      Promise.all([
        apiFetch<ScreenDevice[]>('/api/screens').then(setScreens),
        apiFetch<AndroidDevice[]>('/api/devices').then(setDevices),
      ]).catch(() => {});
    }, 15000);
    return () => window.clearInterval(timer);
  }, [user, activeSection]);

  // Keyboard shortcuts: Cmd/Ctrl + K for Command Palette, Escape for mobile drawer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  // If path is /player or /player/:codigo, render the dedicated TV Player app directly
  if (
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/player')
  ) {
    return <PlayerApp />;
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Tv className="h-8 w-8 text-purple-800 animate-pulse" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-600">
            Carregando painel Tá On Mídia...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        initialHasUsers={hasUsers}
        onAuthenticated={async (authenticatedUser) => {
          setUser(authenticatedUser);
          setActiveSection('crm');
          await loadWorkspaceData();
        }}
      />
    );
  }

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setAuthToken(null);
    setUser(null);
  };

  // CRM Handlers
  const handleCreateAdvertiser = async (payload: {
    companyName: string;
    segment: string;
    contactName: string;
    whatsapp: string;
    monthlyValue: number;
    stage: CrmStage;
    notes?: string;
  }) => {
    const created = await apiFetch<Advertiser>('/api/advertisers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAdvertisers((prev) => [created, ...prev]);
  };

  const handleUpdateAdvertiser = async (
    id: string,
    payload: {
      companyName: string;
      segment: string;
      contactName: string;
      whatsapp: string;
      monthlyValue: number;
      stage: CrmStage;
      notes?: string;
    }
  ) => {
    const updated = await apiFetch<Advertiser>(
      `/api/advertisers/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    setAdvertisers((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const handleMoveStage = async (id: string, nextStage: CrmStage) => {
    setAdvertisers((prev) =>
      prev.map((a) => (a.id === id ? { ...a, stage: nextStage } : a))
    );
    await apiFetch<Advertiser>(`/api/advertisers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ stage: nextStage }),
    });
  };

  const handleDeleteAdvertiser = async (id: string) => {
    setAdvertisers((prev) => prev.filter((a) => a.id !== id));
    await apiFetch(`/api/advertisers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  };

  // Biblioteca Handlers
  const handleUploadMidia = async (
    file: File,
    durationSeconds: number,
    meta?: { widthPx?: number; heightPx?: number; fitMode?: MediaFitMode }
  ) => {
    const headers: Record<string, string> = {
      'Content-Type': file.type,
      'x-file-name': encodeURIComponent(file.name),
      'x-duration-seconds': String(durationSeconds),
    };
    if (meta?.widthPx && meta.widthPx > 0) {
      headers['x-media-width'] = String(Math.round(meta.widthPx));
    }
    if (meta?.heightPx && meta.heightPx > 0) {
      headers['x-media-height'] = String(Math.round(meta.heightPx));
    }
    if (meta?.fitMode) {
      headers['x-media-fit-mode'] = meta.fitMode;
    }

    const created = await apiFetch<MediaAsset>('/api/midias/upload', {
      method: 'POST',
      headers,
      body: file,
    });
    setMidias((prev) => [created, ...prev]);
  };

  const handleUpdateMidia = async (
    id: string,
    payload: {
      fitMode?: MediaFitMode;
      durationSeconds?: number;
      qrCode?: MediaQrCodeConfig | null;
    }
  ) => {
    const updated = await apiFetch<MediaAsset>(
      `/api/midias/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    setMidias((prev) => prev.map((m) => (m.id === id ? updated : m)));
  };

  const handleDeleteMidia = async (id: string) => {
    setMidias((prev) => prev.filter((m) => m.id !== id));
    await apiFetch(`/api/midias/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  };

  // Conteúdos Dinâmicos Handlers
  const handleAddDynamicContent = async (payload: {
    category: DynamicCategory;
    title: string;
    subtitle: string;
    body: string;
    imageUrl: string;
    meta: Record<string, unknown>;
  }) => {
    const created = await apiFetch<DynamicContentItem>('/api/dynamic-contents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setDynamicContents((prev) => [created, ...prev]);
  };

  const handleSaveExternalApis = async (
    payload: Partial<ExternalApiSettings>
  ) => {
    const res = await apiFetch<{
      settings: ExternalApiSettings;
      savedToSupabase: boolean;
      storageTarget: 'supabase' | 'local';
    }>('/api/external-apis', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setExternalApiSettings(res.settings);
    setExternalStorageTarget(res.storageTarget);
    return res;
  };

  // Playlists Handlers
  const handleCreatePlaylist = async (payload: {
    name: string;
    description: string;
    playbackMode: PlaybackMode;
    items: PlaylistItem[];
  }) => {
    const created = await apiFetch<Playlist>('/api/playlists', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setPlaylists((prev) => [created, ...prev]);
  };

  const handleUpdatePlaylist = async (
    id: string,
    payload: {
      name?: string;
      description?: string;
      playbackMode?: PlaybackMode;
      items?: PlaylistItem[];
    }
  ) => {
    const updated = await apiFetch<Playlist>(
      `/api/playlists/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
    setPlaylists((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const handlePublishPlaylist = async (id: string) => {
    const published = await apiFetch<Playlist>(
      `/api/playlists/${encodeURIComponent(id)}/publish`,
      { method: 'POST' }
    );
    setPlaylists((prev) => prev.map((p) => (p.id === id ? published : p)));
  };

  const handleDeletePlaylist = async (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    await apiFetch(`/api/playlists/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  };

  // Screens Handlers
  const handleCreateScreen = async (payload: {
    name: string;
    location: string;
    city: string;
    state: string;
    uniqueCode: string;
    orientation: ScreenOrientation;
    playlistId: string | null;
  }) => {
    const created = await apiFetch<ScreenDevice>('/api/screens', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setScreens((prev) => [created, ...prev]);
  };

  const handleAssignPlaylist = async (
    screenId: string,
    playlistId: string | null
  ) => {
    const updated = await apiFetch<ScreenDevice>(
      `/api/screens/${encodeURIComponent(screenId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ playlistId }),
      }
    );
    setScreens((prev) => prev.map((s) => (s.id === screenId ? updated : s)));
  };

  const handleUpdateOrientation = async (
    screenId: string,
    orientation: ScreenOrientation
  ) => {
    const updated = await apiFetch<ScreenDevice>(
      `/api/screens/${encodeURIComponent(screenId)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ orientation }),
      }
    );
    setScreens((prev) => prev.map((s) => (s.id === screenId ? updated : s)));
    apiFetch<AndroidDevice[]>('/api/devices').then(setDevices).catch(() => {});
  };

  const handleAssignDevice = async (
    screenId: string,
    deviceId: string | null
  ) => {
    const res = await apiFetch<{
      screen: ScreenDevice;
      devices: AndroidDevice[];
    }>(`/api/screens/${encodeURIComponent(screenId)}/device`, {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    });
    setScreens((prev) =>
      prev.map((s) => {
        if (s.id === screenId) return res.screen;
        if (deviceId && s.deviceId === deviceId) return { ...s, deviceId: null };
        return s;
      })
    );
    setDevices(res.devices);
  };

  const handleAddSchedule = async (
    screenId: string,
    payload: {
      playlistId: string;
      startsAt: string;
      endsAt: string;
      priority: number;
    }
  ) => {
    const updated = await apiFetch<ScreenDevice>(
      `/api/screens/${encodeURIComponent(screenId)}/schedules`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    setScreens((prev) => prev.map((s) => (s.id === screenId ? updated : s)));
  };

  const handleDeleteSchedule = async (screenId: string, scheduleId: string) => {
    const updated = await apiFetch<ScreenDevice>(
      `/api/screens/${encodeURIComponent(screenId)}/schedules/${encodeURIComponent(
        scheduleId
      )}`,
      { method: 'DELETE' }
    );
    setScreens((prev) => prev.map((s) => (s.id === screenId ? updated : s)));
  };

  const handleDeleteScreen = async (screenId: string) => {
    setScreens((prev) => prev.filter((s) => s.id !== screenId));
    await apiFetch(`/api/screens/${encodeURIComponent(screenId)}`, {
      method: 'DELETE',
    });
    apiFetch<AndroidDevice[]>('/api/devices').then(setDevices).catch(() => {});
  };

  // Android Devices Handlers
  const handleCreateDevice = async (payload: {
    deviceId: string;
    name: string;
    screenId: string | null;
  }) => {
    const created = await apiFetch<AndroidDevice>('/api/devices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setDevices((prev) => [created, ...prev]);
    if (payload.screenId) {
      apiFetch<ScreenDevice[]>('/api/screens').then(setScreens).catch(() => {});
    }
  };

  const handleGeneratePairingCode = async (deviceId: string) => {
    const res = await apiFetch<{
      deviceId: string;
      pairingCode: string;
      expiresAt: string;
    }>(`/api/devices/${encodeURIComponent(deviceId)}/pairing-code`, {
      method: 'POST',
    });
    apiFetch<AndroidDevice[]>('/api/devices').then(setDevices).catch(() => {});
    return res;
  };

  const handleUpdateDeviceSettings = async (
    deviceId: string,
    settings: Partial<DeviceSettings>
  ) => {
    const updated = await apiFetch<AndroidDevice>(
      `/api/devices/${encodeURIComponent(deviceId)}/settings`,
      {
        method: 'PATCH',
        body: JSON.stringify(settings),
      }
    );
    setDevices((prev) =>
      prev.map((d) => (d.deviceId === deviceId ? updated : d))
    );
  };

  const handleSendDeviceCommand = async (
    deviceId: string,
    command: DeviceCommandType
  ) => {
    const res = await apiFetch<{
      command: DeviceCommand;
      device: AndroidDevice;
    }>(`/api/devices/${encodeURIComponent(deviceId)}/commands`, {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
    setDevices((prev) =>
      prev.map((d) => (d.deviceId === deviceId ? res.device : d))
    );
    return res.command;
  };

  const handleToggleDeviceBlock = async (deviceId: string, blocked: boolean) => {
    const updated = await apiFetch<AndroidDevice>(
      `/api/devices/${encodeURIComponent(deviceId)}/block`,
      {
        method: 'POST',
        body: JSON.stringify({ blocked }),
      }
    );
    setDevices((prev) =>
      prev.map((d) => (d.deviceId === deviceId ? updated : d))
    );
  };

  const handleDeleteDevice = async (deviceId: string) => {
    setDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
    await apiFetch(`/api/devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
    });
    apiFetch<ScreenDevice[]>('/api/screens').then(setScreens).catch(() => {});
  };

  // Campaigns & Client Accesses
  const handleCreateCampaign = async (payload: {
    name: string;
    advertiserId: string;
    advertiserName: string;
    screenCount: number;
  }) => {
    const created = await apiFetch<CampaignItem>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setCampaigns((prev) => [created, ...prev]);
  };

  const handleCreateAccess = async (payload: {
    company: string;
    contactName: string;
    email: string;
    screensCount: number;
    permission: ClientAccess['permission'];
  }) => {
    const created = await apiFetch<ClientAccess>('/api/client-accesses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setClientAccesses((prev) => [created, ...prev]);
  };

  const handleToggleAccessStatus = async (id: string) => {
    const updated = await apiFetch<ClientAccess>(
      `/api/client-accesses/${encodeURIComponent(id)}`,
      { method: 'PATCH' }
    );
    setClientAccesses((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const onlineScreensCount = screens.filter((s) =>
    isScreenOnline(s.lastSeenAt)
  ).length;

  const navCounters: Partial<Record<NavSection, string>> = {
    crm: String(advertisers.length),
    biblioteca: String(midias.length),
    playlists: String(playlists.length),
    telas: `${onlineScreensCount}/${screens.length}`,
  };

  const currentMeta = NAV_LABELS[activeSection];

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-slate-900 flex">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar (Dark/Purple Theme, Grouped, Collapsible & Responsive) */}
      <aside
        aria-label="Menu principal"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#160F26] text-slate-200 border-r border-purple-950/60 transition-[transform,width] duration-200 ease-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'lg:w-[76px]' : 'w-64'}`}
      >
        {/* Brand Header */}
        <div
          className={`h-14 flex items-center border-b border-white/10 shrink-0 ${
            sidebarCollapsed
              ? 'lg:justify-center lg:px-3 px-4 justify-between'
              : 'px-4 justify-between'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setActiveSection('crm');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2.5 text-left rounded-lg focus-visible:outline-2 focus-visible:outline-purple-400"
          >
            <span className="h-8 w-8 rounded-lg bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Tv className="h-4 w-4" aria-hidden="true" />
            </span>
            <span
              className={`font-semibold text-base tracking-tight text-white whitespace-nowrap ${
                sidebarCollapsed ? 'lg:hidden' : ''
              }`}
            >
              Tá On Mídia
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu"
            className="lg:hidden h-10 w-10 inline-flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              {!sidebarCollapsed && (
                <p className="px-3 pb-1 text-[11px] font-medium text-purple-200/50">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const isCrmHighlighted = item.highlighted;
                const counter = navCounters[item.id];

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    title={sidebarCollapsed ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full min-h-[42px] lg:min-h-[38px] flex items-center rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                      sidebarCollapsed
                        ? 'lg:justify-center lg:px-0 px-3 justify-between gap-2'
                        : 'px-3 justify-between gap-2'
                    } ${
                      isCrmHighlighted
                        ? isActive
                          ? 'bg-purple-800 text-white border border-purple-400/50 shadow-sm'
                          : 'bg-purple-950/90 text-purple-100 border border-purple-700/60 hover:bg-purple-900'
                        : isActive
                        ? 'bg-purple-700/80 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-white/8'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span
                        className={`truncate ${
                          sidebarCollapsed ? 'lg:hidden' : ''
                        }`}
                      >
                        {item.label}
                      </span>
                    </span>
                    {counter && !sidebarCollapsed && (
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          isActive || isCrmHighlighted
                            ? 'text-purple-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {counter}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="border-t border-white/10 p-3 shrink-0 flex items-center justify-between gap-2">
          <div
            className={`flex items-center gap-2.5 min-w-0 ${
              sidebarCollapsed ? 'lg:hidden' : ''
            }`}
          >
            <span className="h-8 w-8 rounded-lg bg-purple-800/80 text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {user.name}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user.role}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sair da conta"
            aria-label="Sair da conta"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 shrink-0"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top Bar */}
        <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu"
              className="lg:hidden h-10 w-10 -ml-2 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={
                sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'
              }
              className="hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <PanelLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-sm min-w-0"
            >
              <button
                type="button"
                onClick={() => setActiveSection('dashboard')}
                className="text-slate-500 hover:text-slate-900 transition-colors hidden sm:inline whitespace-nowrap"
              >
                Tá On Mídia
              </button>
              <ChevronRight
                className="h-4 w-4 text-slate-400 hidden sm:inline shrink-0"
                aria-hidden="true"
              />
              <span className="font-semibold text-slate-900 truncate">
                {currentMeta.label}
              </span>
              <span className="hidden xl:inline text-xs text-slate-400 ml-2 truncate">
                · {currentMeta.hint}
              </span>
            </nav>
          </div>

          {/* Right: Quick Navigation / Command Palette Trigger */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-purple-300 text-xs font-medium text-slate-600 inline-flex items-center gap-2.5 transition-colors whitespace-nowrap"
            >
              <Search className="h-3.5 w-3.5 text-purple-700" aria-hidden="true" />
              <span className="hidden sm:inline">Navegação rápida...</span>
              <span className="sm:hidden">Buscar</span>
              <kbd className="hidden md:inline-block font-mono text-[10px] text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            </button>
          </div>
        </header>

        {/* Active Section Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:py-8">
          <div
            key={activeSection}
            className="max-w-[1320px] mx-auto w-full animate-tv-enter"
          >
            {activeSection === 'dashboard' && (
              <DashboardView
                advertisers={advertisers}
                screens={screens}
                devices={devices}
                campaigns={campaigns}
                midias={midias}
                playlists={playlists}
                onNavigate={setActiveSection}
              />
            )}

            {activeSection === 'acessos' && (
              <ClientAccessModule
                accesses={clientAccesses}
                onCreateAccess={handleCreateAccess}
                onToggleStatus={handleToggleAccessStatus}
              />
            )}

            {activeSection === 'crm' && (
              <CrmKanban
                advertisers={advertisers}
                onCreateAdvertiser={handleCreateAdvertiser}
                onUpdateAdvertiser={handleUpdateAdvertiser}
                onMoveStage={handleMoveStage}
                onDeleteAdvertiser={handleDeleteAdvertiser}
              />
            )}

            {activeSection === 'biblioteca' && (
              <LibraryModule
                midias={midias}
                onUploadFile={handleUploadMidia}
                onUpdateMidia={handleUpdateMidia}
                onDeleteMidia={handleDeleteMidia}
              />
            )}

            {activeSection === 'conteudos' && (
              <DynamicContentModule
                dynamicContents={dynamicContents}
                onAddDynamicContent={handleAddDynamicContent}
                externalApiSettings={externalApiSettings}
                externalStorageTarget={externalStorageTarget}
                onSaveExternalApis={handleSaveExternalApis}
              />
            )}

            {activeSection === 'playlists' && (
              <PlaylistsModule
                playlists={playlists}
                midias={midias}
                dynamicContents={dynamicContents}
                onCreatePlaylist={handleCreatePlaylist}
                onUpdatePlaylist={handleUpdatePlaylist}
                onPublishPlaylist={handlePublishPlaylist}
                onDeletePlaylist={handleDeletePlaylist}
              />
            )}

            {activeSection === 'campanhas' && (
              <CampaignsModule
                campaigns={campaigns}
                advertisers={advertisers}
                onCreateCampaign={handleCreateCampaign}
              />
            )}

            {activeSection === 'telas' && (
              <ScreensModule
                screens={screens}
                devices={devices}
                playlists={playlists}
                onCreateScreen={handleCreateScreen}
                onAssignPlaylist={handleAssignPlaylist}
                onUpdateOrientation={handleUpdateOrientation}
                onAssignDevice={handleAssignDevice}
                onAddSchedule={handleAddSchedule}
                onDeleteSchedule={handleDeleteSchedule}
                onDeleteScreen={handleDeleteScreen}
                onCreateDevice={handleCreateDevice}
                onGeneratePairingCode={handleGeneratePairingCode}
                onUpdateDeviceSettings={handleUpdateDeviceSettings}
                onSendDeviceCommand={handleSendDeviceCommand}
                onToggleDeviceBlock={handleToggleDeviceBlock}
                onDeleteDevice={handleDeleteDevice}
              />
            )}

            {activeSection === 'mapa' && (
              <MapModule
                screens={screens}
                onNavigateTelas={() => setActiveSection('telas')}
              />
            )}

            {activeSection === 'relatorios' && (
              <ReportsModule
                advertisers={advertisers}
                campaigns={campaigns}
                devices={devices}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Quick-Nav Bar (<= 56px height) */}
      <nav
        aria-label="Navegação rápida mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white border-t border-slate-200 px-2 grid grid-cols-5 items-center"
      >
        {(
          [
            { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
            { id: 'crm', label: 'CRM', icon: Kanban },
            { id: 'conteudos', label: 'TV 16:9', icon: Sparkles },
            { id: 'telas', label: 'Telas', icon: Monitor },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`h-11 flex flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                active ? 'text-purple-800' : 'text-slate-500'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="h-11 flex flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium text-slate-500"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
          <span>Menu</span>
        </button>
      </nav>

      {/* Command Palette (Cmd/Ctrl + K) */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(section) => setActiveSection(section)}
        screens={screens}
        advertisers={advertisers}
        playlists={playlists}
      />
    </div>
  );
}
