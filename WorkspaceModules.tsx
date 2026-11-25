import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Download,
  FolderOpen,
  Kanban,
  ListVideo,
  MapPin,
  Monitor,
  Plus,
  RefreshCw,
  Smartphone,
  Tv,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type {
  Advertiser,
  AndroidDevice,
  CampaignItem,
  ClientAccess,
  DevicePlaybackSummary,
  MediaAsset,
  NavSection,
  Playlist,
  ScreenDevice,
} from '../types';
import { CRM_STAGES } from '../types';
import { apiFetch, getAuthToken } from '../lib/api';
import { isScreenOnline } from './ScreensModule';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function DashboardView({
  advertisers,
  screens,
  devices,
  campaigns,
  midias,
  playlists,
  onNavigate,
}: {
  advertisers: Advertiser[];
  screens: ScreenDevice[];
  devices: AndroidDevice[];
  campaigns: CampaignItem[];
  midias: MediaAsset[];
  playlists: Playlist[];
  onNavigate: (sec: NavSection) => void;
}) {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  const handleDownloadDeployZip = async () => {
    setDownloadingZip(true);
    setZipError(null);
    try {
      const token = getAuthToken();
      const headers = new Headers({ 'X-Requested-With': 'XMLHttpRequest' });
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const res = await fetch('/api/system/deploy-zip', {
        credentials: 'include',
        headers,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body && typeof body.error === 'string' && body.error) ||
            'Não foi possível baixar o ZIP de deploy.'
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ta-on-midia-deploy.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setZipError(
        err instanceof Error
          ? err.message
          : 'Erro ao baixar o arquivo ZIP.'
      );
    } finally {
      setDownloadingZip(false);
    }
  };

  const onlineScreens = screens.filter((s) => isScreenOnline(s.lastSeenAt)).length;
  const onlineDevices = devices.filter((d) => isScreenOnline(d.lastSeenAt)).length;
  const publishedPlaylists = playlists.filter((p) => p.status === 'PUBLISHED').length;
  const activeAdvertisers = advertisers.filter((a) => a.stage === 'Ativo');
  const activeMrr = activeAdvertisers.reduce((s, a) => s + a.monthlyValue, 0);
  const liveCampaigns = campaigns.filter((c) => c.status === 'No Ar').length;
  const maxStageValue = Math.max(
    1,
    ...CRM_STAGES.map((stage) =>
      advertisers
        .filter((a) => a.stage === stage)
        .reduce((sum, item) => sum + item.monthlyValue, 0)
    )
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Dashboard Executivo
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Visão geral da rede de TV Indoor, dispositivos Android TV Box e funil comercial.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {import.meta.env.DEV && (
            <>
              <button
                type="button"
                onClick={handleDownloadDeployZip}
                disabled={downloadingZip}
                className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 transition-colors disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5 text-purple-800" aria-hidden="true" />
                <span>{downloadingZip ? 'Gerando ZIP...' : 'Baixar ZIP do Site'}</span>
              </button>
              <a
                href="/api/system/android-zip"
                download="ta-on-midia-android-capacitor.zip"
                className="h-9 px-3.5 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-xs font-medium text-purple-900 inline-flex items-center gap-1.5 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-purple-800" aria-hidden="true" />
                <span>Baixar Projeto Android (APK)</span>
              </a>
            </>
          )}
          <button
            type="button"
            onClick={() => onNavigate('crm')}
            className="h-9 px-3.5 rounded-lg bg-purple-800 hover:bg-purple-900 text-xs font-medium text-white transition-colors"
          >
            Abrir CRM Kanban
          </button>
          <button
            type="button"
            onClick={() => onNavigate('conteudos')}
            className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
          >
            Conteúdos Dinâmicos
          </button>
        </div>
      </div>

      {zipError && (
        <div
          role="alert"
          className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center justify-between gap-2"
        >
          <span>{zipError}</span>
          <button
            type="button"
            onClick={() => setZipError(null)}
            className="text-rose-700 hover:text-rose-950"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Telas &amp; TV Boxes Online</p>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {onlineScreens}/{screens.length}
          </p>
          <p className="text-xs text-emerald-700 mt-1 tabular-nums">
            {onlineDevices}/{devices.length} APKs ativos nos últimos 10m
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Receita Mensal Ativa</p>
          <p className="text-2xl font-semibold text-purple-900 tabular-nums mt-1">
            {formatBRL(activeMrr)}
          </p>
          <p className="text-xs text-slate-500 tabular-nums mt-1">
            {activeAdvertisers.length} anunciantes ativos
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Grades &amp; Campanhas</p>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {publishedPlaylists}/{playlists.length}
          </p>
          <p className="text-xs text-slate-500 tabular-nums mt-1">
            {liveCampaigns} campanhas · {midias.length} mídias
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Leads no Funil CRM</p>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {advertisers.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">5 etapas ativas</p>
        </div>
      </div>

      {/* Quick Workflow Shortcuts */}
      <section aria-label="Fluxo rápido de operação" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            step: '01',
            title: 'Captar Anunciantes',
            desc: 'Gerencie leads no Kanban comercial',
            section: 'crm' as NavSection,
            icon: Kanban,
          },
          {
            step: '02',
            title: 'Enviar Mídias',
            desc: 'Imagens JPG/PNG e vídeos MP4',
            section: 'biblioteca' as NavSection,
            icon: FolderOpen,
          },
          {
            step: '03',
            title: 'Montar Grades',
            desc: 'Misture anúncios e cards 16:9',
            section: 'playlists' as NavSection,
            icon: ListVideo,
          },
          {
            step: '04',
            title: 'Parear APK Android',
            desc: 'Vincule códigos às TVs físicas',
            section: 'telas' as NavSection,
            icon: Monitor,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.step}
              type="button"
              onClick={() => onNavigate(card.section)}
              className="group bg-white border border-slate-200 hover:border-purple-400 rounded-xl p-4 text-left transition-all flex items-start gap-3"
            >
              <span className="h-9 w-9 rounded-lg bg-purple-50 text-purple-800 group-hover:bg-purple-800 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-mono text-slate-400 tabular-nums">
                  Passo {card.step}
                </p>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {card.title}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {card.desc}
                </p>
              </div>
            </button>
          );
        })}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Funnel Summary with progress bars */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Resumo por Etapa do CRM
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('crm')}
              className="text-xs font-medium text-purple-800 inline-flex items-center gap-1"
            >
              <span>Gerenciar Kanban</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {CRM_STAGES.map((stage) => {
              const items = advertisers.filter((a) => a.stage === stage);
              const total = items.reduce((s, a) => s + a.monthlyValue, 0);
              const pct = Math.round((total / maxStageValue) * 100);
              return (
                <div
                  key={stage}
                  className="px-5 py-3.5 flex flex-col gap-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-900">{stage}</span>
                      <span className="text-xs text-slate-500 tabular-nums ml-2">
                        · {items.length} anunciantes
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatBRL(total)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-700 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Screens Monitor */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Monitor Rápido de Telas
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('telas')}
              className="text-xs font-medium text-purple-800 inline-flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {screens.slice(0, 5).map((scr) => {
              const online = isScreenOnline(scr.lastSeenAt);
              return (
                <div
                  key={scr.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {scr.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {scr.uniqueCode} · {scr.city}/{scr.state}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        online ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {online ? (
                        <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{online ? 'Online' : 'Offline'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('telas')}
                      aria-label={`Gerenciar tela ${scr.uniqueCode}`}
                      className="p-1.5 rounded-md text-purple-800 hover:bg-purple-50"
                    >
                      <Smartphone className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export function ClientAccessModule({
  accesses,
  onCreateAccess,
  onToggleStatus,
}: {
  accesses: ClientAccess[];
  onCreateAccess: (payload: {
    company: string;
    contactName: string;
    email: string;
    screensCount: number;
    permission: ClientAccess['permission'];
  }) => Promise<void>;
  onToggleStatus: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [screensCount, setScreensCount] = useState('4');
  const [permission, setPermission] =
    useState<ClientAccess['permission']>('Visualização');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateAccess({
      company: company.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      screensCount: Number(screensCount) || 1,
      permission,
    });
    setCompany('');
    setContactName('');
    setEmail('');
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Acessos de Clientes
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie permissões de anunciantes e parceiros que acompanham suas telas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-purple-800 hover:bg-purple-900 text-sm font-medium text-white self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>+ Novo Acesso</span>
        </button>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="py-3 px-5">Empresa / Responsável</th>
                <th className="py-3 px-4">E-mail</th>
                <th className="py-3 px-4">Permissão</th>
                <th className="py-3 px-4 text-right">Telas</th>
                <th className="py-3 px-4">Último Acesso</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {accesses.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-5">
                    <p className="font-medium text-slate-900">{acc.company}</p>
                    <p className="text-xs text-slate-500">{acc.contactName}</p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{acc.email}</td>
                  <td className="py-3.5 px-4 text-slate-700">{acc.permission}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                    {acc.screensCount}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {acc.lastLogin}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(acc.id)}
                      className={`px-3 py-1 rounded-md text-xs font-medium border ${
                        acc.status === 'Ativo'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      {acc.status}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Conceder Acesso ao Cliente
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3.5">
              <input
                type="text"
                required
                placeholder="Empresa"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-10 px-3 text-sm border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                required
                placeholder="Responsável"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="h-10 px-3 text-sm border border-slate-200 rounded-lg"
              />
              <input
                type="email"
                required
                placeholder="E-mail de acesso"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 px-3 text-sm border border-slate-200 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="1"
                  value={screensCount}
                  onChange={(e) => setScreensCount(e.target.value)}
                  className="h-10 px-3 text-sm border border-slate-200 rounded-lg font-mono"
                />
                <select
                  value={permission}
                  onChange={(e) =>
                    setPermission(e.target.value as ClientAccess['permission'])
                  }
                  className="h-10 px-3 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="Visualização">Visualização</option>
                  <option value="Gestor de Mídia">Gestor de Mídia</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-800 rounded-lg"
                >
                  Criar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function CampaignsModule({
  campaigns,
  advertisers,
  onCreateCampaign,
}: {
  campaigns: CampaignItem[];
  advertisers: Advertiser[];
  onCreateCampaign: (payload: {
    name: string;
    advertiserId: string;
    advertiserName: string;
    screenCount: number;
  }) => Promise<void>;
}) {
  const [filter, setFilter] = useState<'Todas' | CampaignItem['status']>('Todas');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [advId, setAdvId] = useState(advertisers[0]?.id || '');
  const [screenCount, setScreenCount] = useState('5');

  const visible = campaigns.filter(
    (c) => filter === 'Todas' || c.status === filter
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const adv = advertisers.find((a) => a.id === advId) || advertisers[0];
    await onCreateCampaign({
      name: name.trim(),
      advertiserId: adv?.id || 'adv-1',
      advertiserName: adv?.companyName || 'Anunciante',
      screenCount: Number(screenCount) || 4,
    });
    setName('');
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Campanhas Publicitárias
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Controle de veiculação, períodos contratados e total de impressões em telas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-purple-800 hover:bg-purple-900 text-sm font-medium text-white self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>+ Nova Campanha</span>
        </button>
      </div>

      <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
        {(['Todas', 'No Ar', 'Agendada', 'Encerrada'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === tab
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="py-3 px-5">Campanha</th>
                <th className="py-3 px-4">Anunciante</th>
                <th className="py-3 px-4">Vigência</th>
                <th className="py-3 px-4 text-right">Telas</th>
                <th className="py-3 px-4 text-right">Exibições</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {visible.map((cmp) => (
                <tr key={cmp.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-5 font-medium text-slate-900">
                    {cmp.name}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {cmp.advertiserName}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-slate-500 tabular-nums">
                    {cmp.startDate} – {cmp.endDate}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                    {cmp.screenCount}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                    {cmp.impressions.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3.5 px-5 text-right text-xs font-medium text-purple-900">
                    {cmp.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Nova Campanha
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3.5">
              <input
                type="text"
                required
                placeholder="Nome da campanha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 px-3 text-sm border border-slate-200 rounded-lg"
              />
              <select
                value={advId}
                onChange={(e) => setAdvId(e.target.value)}
                className="h-10 px-3 text-sm border border-slate-200 rounded-lg"
              >
                {advertisers.map((adv) => (
                  <option key={adv.id} value={adv.id}>
                    {adv.companyName}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={screenCount}
                onChange={(e) => setScreenCount(e.target.value)}
                placeholder="Quantidade de telas"
                className="h-10 px-3 text-sm border border-slate-200 rounded-lg font-mono"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-800 rounded-lg"
                >
                  Lançar Campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function MapModule({
  screens,
  onNavigateTelas,
}: {
  screens: ScreenDevice[];
  onNavigateTelas: () => void;
}) {
  const [selectedScreenId, setSelectedScreenId] = useState(screens[0]?.id || '');

  const cities = useMemo(() => {
    const map = new Map<string, ScreenDevice[]>();
    for (const s of screens) {
      const key = `${s.city}/${s.state}`;
      map.set(key, [...(map.get(key) || []), s]);
    }
    return Array.from(map.entries());
  }, [screens]);

  const activeScreen =
    screens.find((s) => s.id === selectedScreenId) || screens[0] || null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Mapa da Rede de Telas
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Distribuição geográfica dos pontos de TV Indoor instalados por praça.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Cobertura Regional
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {cities.length} praças · {screens.length} telas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {screens.map((scr) => {
              const online = isScreenOnline(scr.lastSeenAt);
              const selected = activeScreen?.id === scr.id;
              return (
                <button
                  key={scr.id}
                  type="button"
                  onClick={() => setSelectedScreenId(scr.id)}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    selected
                      ? 'bg-purple-50 border-purple-500'
                      : 'bg-slate-50/70 border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-900">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {scr.city}/{scr.state}
                      </span>
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        online ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mt-1.5">
                    {scr.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {scr.location}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          {activeScreen ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                  <Tv className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {activeScreen.name}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    {activeScreen.uniqueCode} · {activeScreen.resolution}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 text-sm flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Endereço</span>
                  <span className="font-medium text-slate-900 text-right">
                    {activeScreen.location}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cidade / UF</span>
                  <span className="font-medium text-slate-900">
                    {activeScreen.city}/{activeScreen.state}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Coordenadas</span>
                  <span className="font-mono text-xs text-slate-700 tabular-nums">
                    {activeScreen.lat.toFixed(4)}, {activeScreen.lng.toFixed(4)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onNavigateTelas}
                className="mt-2 h-10 px-4 rounded-lg bg-purple-800 hover:bg-purple-900 text-sm font-medium text-white inline-flex items-center justify-center gap-2"
              >
                <Smartphone className="h-4 w-4" aria-hidden="true" />
                <span>Parear APK na aba Telas</span>
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Selecione uma tela.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatSecondsHuman(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs}s`;
}

export function ReportsModule({
  advertisers,
  campaigns,
  devices,
}: {
  advertisers: Advertiser[];
  campaigns: CampaignItem[];
  devices: AndroidDevice[];
}) {
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [summaries, setSummaries] = useState<DevicePlaybackSummary[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const loadPlaybackSummary = async () => {
    setLoadingSummary(true);
    try {
      const params = new URLSearchParams();
      if (selectedDeviceId) params.set('deviceId', selectedDeviceId);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      params.set('limit', '50');
      const data = await apiFetch<DevicePlaybackSummary[]>(
        `/api/reports/playback-summary?${params.toString()}`
      );
      setSummaries(data);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadPlaybackSummary().catch(() => {});
  }, [selectedDeviceId, fromDate, toDate]);

  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const activeRevenue = advertisers
    .filter((a) => a.stage === 'Ativo')
    .reduce((s, a) => s + a.monthlyValue, 0);

  const handleExportCsv = () => {
    const header = ['Empresa', 'Segmento', 'Responsável', 'Etapa', 'Valor Mensal'];
    const rows = advertisers.map((a) => [
      a.companyName,
      a.segment,
      a.contactName,
      a.stage,
      String(a.monthlyValue),
    ]);
    const csv = [header, ...rows]
      .map((line) =>
        line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio-tv-indoor-crm.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Relatórios Comerciais &amp; Telemetria de Exibição
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Consolidado de receita contratada, tempo exibido por TV Box Android e exportação CSV.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-purple-800 hover:bg-purple-900 text-sm font-medium text-white self-start sm:self-auto"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>Exportar CSV CRM</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Receita Mensal Ativa</p>
          <p className="text-2xl font-semibold text-purple-900 tabular-nums mt-1">
            {formatBRL(activeRevenue)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Impressões Registradas</p>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {totalImpressions.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Ticket Médio Ativo</p>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {formatBRL(
              activeRevenue /
                Math.max(
                  advertisers.filter((a) => a.stage === 'Ativo').length,
                  1
                )
            )}
          </p>
        </div>
      </div>

      {/* Playback Summary by Device (GET /api/reports/playback-summary per Degree Midia 3.8) */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-800" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Auditoria de Reprodução por Dispositivo (APK)
              </h2>
              <p className="text-xs text-slate-500">
                Dispositivos com heartbeat nos últimos 10 minutos são marcados como ativos.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              aria-label="Filtrar por dispositivo"
              className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="">Todos os dispositivos</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.deviceId} · {d.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="Data inicial"
              className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="Data final"
              className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
            />
            <button
              type="button"
              onClick={loadPlaybackSummary}
              disabled={loadingSummary}
              className="h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loadingSummary ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="py-3 px-5">Dispositivo / Tela</th>
                <th className="py-3 px-4">Estado (10 min)</th>
                <th className="py-3 px-4 text-right">Tempo Total</th>
                <th className="py-3 px-4 text-right">Tempo Ativo</th>
                <th className="py-3 px-4 text-right">Eventos / Concluídos</th>
                <th className="py-3 px-5 text-right">Última Exibição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {summaries.map((row) => (
                <tr key={row.deviceId} className="hover:bg-slate-50">
                  <td className="py-3.5 px-5">
                    <p className="font-semibold text-slate-900">
                      <span className="font-mono text-purple-900 mr-1.5">
                        {row.deviceId}
                      </span>
                      {row.deviceName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.screenName || 'Sem tela vinculada'}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-xs font-medium ${
                        row.isActiveRecently ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {row.isActiveRecently ? 'Ativo recentemente' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900">
                    {formatSecondsHuman(row.totalPlayedSeconds)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-purple-900 font-semibold">
                    {formatSecondsHuman(row.activePlayedSeconds)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {row.totalEvents} / {row.completedEvents}
                  </td>
                  <td className="py-3.5 px-5 text-right text-xs font-mono text-slate-500 tabular-nums">
                    {row.lastPlaybackAt
                      ? new Date(row.lastPlaybackAt).toLocaleString('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : 'Sem eventos'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Receita Recorrente por Anunciante (CRM)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                <th className="py-3 px-5">Anunciante</th>
                <th className="py-3 px-4">Segmento</th>
                <th className="py-3 px-4">Etapa</th>
                <th className="py-3 px-5 text-right">Valor Mensal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {advertisers.map((adv) => (
                <tr key={adv.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-5 font-medium text-slate-900">
                    {adv.companyName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{adv.segment}</td>
                  <td className="py-3.5 px-4 text-slate-700">{adv.stage}</td>
                  <td className="py-3.5 px-5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {formatBRL(adv.monthlyValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
