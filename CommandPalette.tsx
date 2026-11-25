import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  FolderOpen,
  Kanban,
  LayoutDashboard,
  ListVideo,
  Map as MapIcon,
  Megaphone,
  Monitor,
  Search,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import type { Advertiser, NavSection, Playlist, ScreenDevice } from '../types';

interface PaletteAction {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onNavigate,
  screens,
  advertisers,
  playlists,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (section: NavSection) => void;
  screens: ScreenDevice[];
  advertisers: Advertiser[];
  playlists: Playlist[];
}) {
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlightedIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const actions = useMemo<PaletteAction[]>(() => {
    const navItems: Array<{
      id: NavSection;
      label: string;
      desc: string;
      icon: React.ComponentType<{ className?: string }>;
    }> = [
      { id: 'crm', label: 'CRM Comercial', desc: 'Quadro Kanban de anunciantes', icon: Kanban },
      { id: 'dashboard', label: 'Dashboard', desc: 'Resumo executivo e métricas', icon: LayoutDashboard },
      { id: 'biblioteca', label: 'Biblioteca', desc: 'Upload e bucket público midias', icon: FolderOpen },
      { id: 'conteudos', label: 'Conteúdos Dinâmicos', desc: 'Notícias, Clima, Esportes e Quiz 16:9', icon: Sparkles },
      { id: 'playlists', label: 'Playlists', desc: 'Grade de programação e duração', icon: ListVideo },
      { id: 'telas', label: 'Telas', desc: 'Terminais TV e pareamento APK Android', icon: Monitor },
      { id: 'campanhas', label: 'Campanhas', desc: 'Veiculações ativas e agendadas', icon: Megaphone },
      { id: 'acessos', label: 'Acessos de clientes', desc: 'Contas e permissões de parceiros', icon: UserCheck },
      { id: 'mapa', label: 'Mapa', desc: 'Distribuição geográfica de telas', icon: MapIcon },
      { id: 'relatorios', label: 'Relatórios', desc: 'Faturamento e exportação CSV', icon: BarChart3 },
    ];

    const list: PaletteAction[] = navItems.map((n) => ({
      id: `nav-${n.id}`,
      group: 'Módulos',
      title: n.label,
      subtitle: n.desc,
      icon: n.icon,
      onSelect: () => {
        onNavigate(n.id);
        onClose();
      },
    }));

    screens.forEach((s) => {
      list.push({
        id: `scr-${s.id}`,
        group: 'Telas Android',
        title: `${s.name} (${s.uniqueCode})`,
        subtitle: `${s.location} · ${s.city}/${s.state}`,
        icon: Monitor,
        onSelect: () => {
          onNavigate('telas');
          onClose();
        },
      });
    });

    advertisers.slice(0, 8).forEach((a) => {
      list.push({
        id: `adv-${a.id}`,
        group: 'Anunciantes no CRM',
        title: a.companyName,
        subtitle: `${a.stage} · ${a.segment} · ${a.contactName}`,
        icon: Kanban,
        onSelect: () => {
          onNavigate('crm');
          onClose();
        },
      });
    });

    playlists.forEach((p) => {
      list.push({
        id: `pl-${p.id}`,
        group: 'Playlists',
        title: p.name,
        subtitle: `${p.items.length} blocos na grade`,
        icon: ListVideo,
        onSelect: () => {
          onNavigate('playlists');
          onClose();
        },
      });
    });

    return list;
  }, [screens, advertisers, playlists, onNavigate, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions.slice(0, 12);
    return actions
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.subtitle.toLowerCase().includes(q) ||
          a.group.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [actions, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[highlightedIndex]) {
      e.preventDefault();
      filtered[highlightedIndex].onSelect();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] p-4 bg-slate-950/45 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Navegação rápida"
    >
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 h-13 border-b border-slate-200">
          <Search className="h-4 w-4 text-purple-700 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ir para módulo, tela Android, playlist ou anunciante..."
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca rápida"
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Nenhum resultado para &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const active = idx === highlightedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={item.onSelect}
                  className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors ${
                    active ? 'bg-purple-50 text-purple-950' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        active
                          ? 'bg-purple-800 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {item.group} · {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className={`h-4 w-4 shrink-0 ${
                      active ? 'text-purple-700' : 'text-slate-300'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Use ↑ ↓ para navegar e Enter para abrir</span>
          <span className="font-mono">ESC para fechar</span>
        </div>
      </div>
    </div>
  );
}
