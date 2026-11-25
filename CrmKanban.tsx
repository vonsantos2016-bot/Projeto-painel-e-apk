import React, { useMemo, useState } from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { CRM_STAGES } from '../types';
import type { Advertiser, CrmStage } from '../types';

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

const STAGE_TOP_ACCENT: Record<CrmStage, string> = {
  'Novo Contato': 'border-t-slate-400',
  Negociação: 'border-t-blue-500',
  'Proposta Enviada': 'border-t-amber-500',
  Fechado: 'border-t-purple-600',
  Ativo: 'border-t-emerald-500',
};

export function CrmKanban({
  advertisers,
  onCreateAdvertiser,
  onUpdateAdvertiser,
  onMoveStage,
  onDeleteAdvertiser,
}: {
  advertisers: Advertiser[];
  onCreateAdvertiser: (payload: {
    companyName: string;
    segment: string;
    contactName: string;
    whatsapp: string;
    monthlyValue: number;
    stage: CrmStage;
    notes?: string;
  }) => Promise<void>;
  onUpdateAdvertiser: (
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
  ) => Promise<void>;
  onMoveStage: (id: string, nextStage: CrmStage) => Promise<void>;
  onDeleteAdvertiser: (id: string) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<CrmStage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [segment, setSegment] = useState('');
  const [contactName, setContactName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [monthlyValue, setMonthlyValue] = useState('1800');
  const [initialStage, setInitialStage] = useState<CrmStage>('Novo Contato');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return advertisers;
    return advertisers.filter(
      (a) =>
        a.companyName.toLowerCase().includes(q) ||
        a.segment.toLowerCase().includes(q) ||
        a.contactName.toLowerCase().includes(q) ||
        a.whatsapp.toLowerCase().includes(q)
    );
  }, [advertisers, search]);

  const metrics = useMemo(() => {
    const activeItems = advertisers.filter((a) => a.stage === 'Ativo');
    const activeMrr = activeItems.reduce((s, a) => s + a.monthlyValue, 0);
    const totalPipeline = advertisers.reduce((s, a) => s + a.monthlyValue, 0);
    const conversion =
      advertisers.length > 0
        ? Math.round((activeItems.length / advertisers.length) * 100)
        : 0;
    return {
      totalCount: advertisers.length,
      activeCount: activeItems.length,
      activeMrr,
      totalPipeline,
      conversion,
    };
  }, [advertisers]);

  const openCreateModal = () => {
    setEditingId(null);
    setCompanyName('');
    setSegment('');
    setContactName('');
    setWhatsapp('');
    setMonthlyValue('1800');
    setInitialStage('Novo Contato');
    setNotes('');
    setModalOpen(true);
  };

  const openEditModal = (card: Advertiser) => {
    setEditingId(card.id);
    setCompanyName(card.companyName);
    setSegment(card.segment);
    setContactName(card.contactName);
    setWhatsapp(card.whatsapp);
    setMonthlyValue(String(card.monthlyValue));
    setInitialStage(card.stage);
    setNotes(card.notes || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !segment.trim() || !contactName.trim() || !whatsapp.trim()) {
      return;
    }
    setSaving(true);
    try {
      const payload = {
        companyName: companyName.trim(),
        segment: segment.trim(),
        contactName: contactName.trim(),
        whatsapp: whatsapp.trim(),
        monthlyValue: Number(monthlyValue) || 0,
        stage: initialStage,
        notes: notes.trim(),
      };
      if (editingId) {
        await onUpdateAdvertiser(editingId, payload);
      } else {
        await onCreateAdvertiser(payload);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            CRM Comercial
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Arraste os cartões entre colunas ou use os seletores para avançar cada anunciante no funil.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-68">
            <Search
              className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar empresa, segmento ou responsável..."
              aria-label="Buscar anunciante no CRM"
              className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-700"
            />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>+ Novo Anunciante</span>
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total no Funil</p>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {metrics.totalCount}
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            Conversão ativa: {metrics.conversion}%
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Anunciantes Ativos</p>
          <p className="text-2xl font-semibold text-purple-900 tabular-nums mt-1">
            {metrics.activeCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Em veiculação nas TVs</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Receita Ativa (MRR)</p>
          <p className="text-2xl font-semibold text-emerald-700 tabular-nums mt-1">
            {formatBRL(metrics.activeMrr)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Faturamento mensal</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Potencial Total</p>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {formatBRL(metrics.totalPipeline)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Soma das 5 colunas</p>
        </div>
      </div>

      {/* Horizontal Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-5 gap-4 min-w-[1160px]">
          {CRM_STAGES.map((stage, stageIdx) => {
            const stageCards = filtered.filter((a) => a.stage === stage);
            const stageTotal = stageCards.reduce(
              (sum, card) => sum + card.monthlyValue,
              0
            );
            const isOver = dragOverStage === stage;

            return (
              <div
                key={stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const id = e.dataTransfer.getData('text/plain') || draggedId;
                  if (id) {
                    await onMoveStage(id, stage);
                    setDraggedId(null);
                  }
                }}
                className={`flex flex-col rounded-xl border transition-colors min-h-[500px] ${
                  isOver
                    ? 'bg-purple-50/75 border-purple-400'
                    : 'bg-slate-100/75 border-slate-200'
                }`}
              >
                {/* Column Header with subtle 2px stage top accent */}
                <div
                  className={`px-3.5 py-3 border-b border-t-2 border-slate-200 bg-white rounded-t-xl ${STAGE_TOP_ACCENT[stage]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-slate-900 truncate">
                      {stage}
                    </h2>
                    <span className="font-mono text-xs font-semibold text-purple-800 tabular-nums">
                      {stageCards.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                    {formatBRL(stageTotal)}/mês
                  </p>
                </div>

                {/* Cards Stack */}
                <div className="p-2.5 flex flex-col gap-2.5 flex-1">
                  {stageCards.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-4 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg">
                      Arraste um card para {stage}
                    </div>
                  ) : (
                    stageCards.map((card) => {
                      const prevStage =
                        stageIdx > 0 ? CRM_STAGES[stageIdx - 1] : null;
                      const nextStage =
                        stageIdx < CRM_STAGES.length - 1
                          ? CRM_STAGES[stageIdx + 1]
                          : null;

                      return (
                        <article
                          key={card.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedId(card.id);
                            e.dataTransfer.setData('text/plain', card.id);
                          }}
                          onDragEnd={() => {
                            setDraggedId(null);
                            setDragOverStage(null);
                          }}
                          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing flex flex-col gap-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(card)}
                              className="min-w-0 text-left group"
                            >
                              <p className="text-[11px] font-medium text-slate-500">
                                {card.segment}
                              </p>
                              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-purple-800 leading-snug mt-0.5 transition-colors">
                                {card.companyName}
                              </h3>
                            </button>
                            <GripVertical
                              className="h-4 w-4 text-slate-300 shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                          </div>

                          <div className="flex flex-col gap-1 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1.5 truncate">
                              <User
                                className="h-3.5 w-3.5 text-slate-400 shrink-0"
                                aria-hidden="true"
                              />
                              <span className="truncate">{card.contactName}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-mono tabular-nums truncate">
                              <Phone
                                className="h-3.5 w-3.5 text-slate-400 shrink-0"
                                aria-hidden="true"
                              />
                              <span>{card.whatsapp}</span>
                            </span>
                          </div>

                          {card.notes && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                              {card.notes}
                            </p>
                          )}

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="font-mono text-sm font-semibold text-purple-900 tabular-nums">
                              {formatBRL(card.monthlyValue)}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(card)}
                                aria-label={`Editar ${card.companyName}`}
                                className="p-1.5 rounded text-slate-400 hover:text-purple-800 hover:bg-purple-50 transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteAdvertiser(card.id)}
                                aria-label={`Remover ${card.companyName}`}
                                className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          {/* Stage Quick Selector + Step Arrows */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={!prevStage}
                              onClick={() =>
                                prevStage && onMoveStage(card.id, prevStage)
                              }
                              aria-label={`Voltar ${card.companyName} para ${prevStage || ''}`}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 shrink-0"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>

                            <select
                              aria-label={`Mover ${card.companyName} para coluna`}
                              value={card.stage}
                              onChange={(e) =>
                                onMoveStage(card.id, e.target.value as CrmStage)
                              }
                              className="flex-1 min-w-0 h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-purple-700"
                            >
                              {CRM_STAGES.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              disabled={!nextStage}
                              onClick={() =>
                                nextStage && onMoveStage(card.id, nextStage)
                              }
                              aria-label={`Avançar ${card.companyName} para ${nextStage || ''}`}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 shrink-0"
                            >
                              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: + Novo / Editar Anunciante */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-advertiser-title"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-800" aria-hidden="true" />
                <h2
                  id="new-advertiser-title"
                  className="text-base font-semibold text-slate-900"
                >
                  {editingId ? 'Editar Anunciante' : 'Novo Anunciante'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Fechar janela"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Clínica Vida Plena"
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Segmento
                  </label>
                  <input
                    type="text"
                    required
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Ex: Saúde, Varejo"
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Responsável
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nome do contato"
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 99999-0000"
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Valor Mensal (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={monthlyValue}
                    onChange={(e) => setMonthlyValue(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg font-mono tabular-nums focus:outline-none focus:border-purple-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Etapa do Funil
                </label>
                <select
                  value={initialStage}
                  onChange={(e) => setInitialStage(e.target.value as CrmStage)}
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                >
                  {CRM_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalhes da proposta, telas desejadas ou próximos passos..."
                  className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-800 hover:bg-purple-900 rounded-lg disabled:opacity-60"
                >
                  {saving
                    ? 'Salvando...'
                    : editingId
                    ? 'Salvar Alterações'
                    : 'Salvar Anunciante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
