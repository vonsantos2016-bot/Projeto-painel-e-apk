import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  Flame,
  Lightbulb,
  Minus,
  Newspaper,
  Plus,
  RotateCcw,
  Sparkles,
  Sun,
  Timer,
  Trophy,
  Utensils,
  Wind,
} from 'lucide-react';
import type {
  DynamicContentItem,
  DynamicTemplateKey,
  NewsArticle,
  SportsMatch,
  StandingRow,
  WeatherForecast,
} from '../types';
import { describeWeatherCode } from '../lib/api';

const NEWS_FALLBACK_IMG = '/src/assets/images/tv_news_studio_1795621649869.jpg';
const WEATHER_IMG = '/src/assets/images/tv_weather_sky_1795621650388.jpg';

const CLUB_META: Record<
  string,
  { short: string; primary: string; secondary: string; pattern: 'stripes' | 'sash' | 'circle' | 'solid' }
> = {
  Bahia: { short: 'BAH', primary: '#004A9F', secondary: '#E11D48', pattern: 'stripes' },
  Coritiba: { short: 'CFC', primary: '#006B3F', secondary: '#FFFFFF', pattern: 'circle' },
  Chapecoense: { short: 'ACF', primary: '#068443', secondary: '#FFFFFF', pattern: 'circle' },
  Cruzeiro: { short: 'CRU', primary: '#0038A8', secondary: '#FFFFFF', pattern: 'circle' },
  'Athletico-PR': { short: 'CAP', primary: '#B91C1C', secondary: '#111827', pattern: 'sash' },
  Remo: { short: 'REM', primary: '#0F172A', secondary: '#E2E8F0', pattern: 'circle' },
  Palmeiras: { short: 'PAL', primary: '#006437', secondary: '#FFFFFF', pattern: 'circle' },
  Flamengo: { short: 'FLA', primary: '#C8102E', secondary: '#111827', pattern: 'stripes' },
  Botafogo: { short: 'BOT', primary: '#111827', secondary: '#FFFFFF', pattern: 'stripes' },
  'Atlético-MG': { short: 'CAM', primary: '#111827', secondary: '#F8FAFC', pattern: 'stripes' },
  'São Paulo': { short: 'SAO', primary: '#DC2626', secondary: '#111827', pattern: 'stripes' },
  Internacional: { short: 'INT', primary: '#C8102E', secondary: '#FFFFFF', pattern: 'circle' },
  Fortaleza: { short: 'FOR', primary: '#1D4ED8', secondary: '#DC2626', pattern: 'stripes' },
  Corinthians: { short: 'COR', primary: '#18181B', secondary: '#FFFFFF', pattern: 'circle' },
};

export function ClubCrest({
  team,
  size = 'md',
}: {
  team: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const meta = CLUB_META[team] || {
    short: team.slice(0, 3).toUpperCase(),
    primary: '#06AA48',
    secondary: '#FFFFFF',
    pattern: 'solid' as const,
  };

  const dims =
    size === 'xs'
      ? 'h-5 w-5 text-[7px]'
      : size === 'sm'
      ? 'h-7 w-7 text-[9px]'
      : size === 'lg'
      ? 'h-12 w-12 sm:h-16 sm:w-16 text-xs sm:text-sm'
      : 'h-9 w-9 text-[10px]';

  return (
    <div
      className={`relative shrink-0 rounded-full flex items-center justify-center font-extrabold tracking-tight shadow-sm ring-1 ring-black/10 overflow-hidden select-none ${dims}`}
      style={{ backgroundColor: meta.primary, color: '#FFFFFF' }}
      aria-hidden="true"
    >
      {meta.pattern === 'stripes' && (
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 28%, ${meta.secondary} 28%, ${meta.secondary} 46%)`,
          }}
        />
      )}
      {meta.pattern === 'sash' && (
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage: `linear-gradient(135deg, transparent 36%, ${meta.secondary} 36%, ${meta.secondary} 62%, transparent 62%)`,
          }}
        />
      )}
      {meta.pattern === 'circle' && (
        <div
          className="absolute inset-[2px] rounded-full border opacity-60"
          style={{ borderColor: meta.secondary }}
        />
      )}
      <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.65)]">
        {meta.short}
      </span>
    </div>
  );
}

export const DEFAULT_MATCHES: SportsMatch[] = [
  // Rodada 35
  {
    id: 'r35-m1',
    round: 'Rodada 35',
    roundNumber: 35,
    dateLabel: 'Qua 18/11 · Maracanã · 21:30',
    homeTeam: 'Flamengo',
    awayTeam: 'Botafogo',
    homeScore: 1,
    awayScore: 1,
    status: 'Encerrado',
    kickoff: '21:30',
    stadium: 'Maracanã',
  },
  {
    id: 'r35-m2',
    round: 'Rodada 35',
    roundNumber: 35,
    dateLabel: 'Qui 19/11 · Allianz Parque · 20:00',
    homeTeam: 'Palmeiras',
    awayTeam: 'São Paulo',
    homeScore: 2,
    awayScore: 0,
    status: 'Encerrado',
    kickoff: '20:00',
    stadium: 'Allianz Parque',
  },
  {
    id: 'r35-m3',
    round: 'Rodada 35',
    roundNumber: 35,
    dateLabel: 'Qui 19/11 · Mineirão · 19:00',
    homeTeam: 'Cruzeiro',
    awayTeam: 'Bahia',
    homeScore: 2,
    awayScore: 1,
    status: 'Encerrado',
    kickoff: '19:00',
    stadium: 'Mineirão',
  },
  // Rodada 36 (Espelhada do Simulador GE 2026)
  {
    id: 'r36-m1',
    round: 'Rodada 36',
    roundNumber: 36,
    dateLabel: 'Sáb 21/11 · Arena Fonte Nova · 18:30',
    homeTeam: 'Bahia',
    awayTeam: 'Coritiba',
    homeScore: 0,
    awayScore: 1,
    status: 'Simulado',
    kickoff: '18:30',
    stadium: 'Arena Fonte Nova',
  },
  {
    id: 'r36-m2',
    round: 'Rodada 36',
    roundNumber: 36,
    dateLabel: 'Sáb 21/11 · Arena Condá · 21:00',
    homeTeam: 'Chapecoense',
    awayTeam: 'Cruzeiro',
    homeScore: 1,
    awayScore: 2,
    status: 'Destaque',
    kickoff: '21:00',
    stadium: 'Arena Condá',
  },
  {
    id: 'r36-m3',
    round: 'Rodada 36',
    roundNumber: 36,
    dateLabel: 'Dom 22/11 · Ligga Arena · 16:00',
    homeTeam: 'Athletico-PR',
    awayTeam: 'Remo',
    homeScore: 4,
    awayScore: 2,
    status: 'Simulado',
    kickoff: '16:00',
    stadium: 'Ligga Arena',
  },
  {
    id: 'r36-m4',
    round: 'Rodada 36',
    roundNumber: 36,
    dateLabel: 'Dom 22/11 · Allianz Parque · 18:30',
    homeTeam: 'Palmeiras',
    awayTeam: 'Flamengo',
    homeScore: 2,
    awayScore: 1,
    status: 'Simulado',
    kickoff: '18:30',
    stadium: 'Allianz Parque',
  },
  {
    id: 'r36-m5',
    round: 'Rodada 36',
    roundNumber: 36,
    dateLabel: 'Dom 22/11 · Nilton Santos · 20:00',
    homeTeam: 'Botafogo',
    awayTeam: 'Atlético-MG',
    homeScore: 1,
    awayScore: 0,
    status: 'Simulado',
    kickoff: '20:00',
    stadium: 'Nilton Santos',
  },
  // Rodada 37
  {
    id: 'r37-m1',
    round: 'Rodada 37',
    roundNumber: 37,
    dateLabel: 'Sáb 28/11 · Morumbis · 19:00',
    homeTeam: 'São Paulo',
    awayTeam: 'Internacional',
    homeScore: 1,
    awayScore: 1,
    status: 'Próxima',
    kickoff: '19:00',
    stadium: 'Morumbis',
  },
  {
    id: 'r37-m2',
    round: 'Rodada 37',
    roundNumber: 37,
    dateLabel: 'Dom 29/11 · Castelão · 16:00',
    homeTeam: 'Fortaleza',
    awayTeam: 'Palmeiras',
    homeScore: 0,
    awayScore: 1,
    status: 'Próxima',
    kickoff: '16:00',
    stadium: 'Castelão',
  },
  {
    id: 'r37-m3',
    round: 'Rodada 37',
    roundNumber: 37,
    dateLabel: 'Dom 29/11 · Mineirão · 18:30',
    homeTeam: 'Cruzeiro',
    awayTeam: 'Corinthians',
    homeScore: 2,
    awayScore: 0,
    status: 'Próxima',
    kickoff: '18:30',
    stadium: 'Mineirão',
  },
];

export const DEFAULT_STANDINGS: StandingRow[] = [
  { pos: 1, team: 'Palmeiras', points: 73, played: 35, wins: 22, gd: 30, zone: 'libertadores' },
  { pos: 2, team: 'Botafogo', points: 71, played: 35, wins: 21, gd: 27, zone: 'libertadores' },
  { pos: 3, team: 'Cruzeiro', points: 68, played: 35, wins: 20, gd: 22, zone: 'libertadores' },
  { pos: 4, team: 'Flamengo', points: 66, played: 35, wins: 19, gd: 20, zone: 'libertadores' },
  { pos: 5, team: 'Bahia', points: 61, played: 35, wins: 18, gd: 14, zone: 'pre' },
  { pos: 6, team: 'Fortaleza', points: 59, played: 35, wins: 17, gd: 12, zone: 'pre' },
  { pos: 7, team: 'Athletico-PR', points: 55, played: 35, wins: 15, gd: 8, zone: 'sulamericana' },
  { pos: 8, team: 'Internacional', points: 53, played: 35, wins: 14, gd: 6, zone: 'sulamericana' },
];

function WeatherIcon({
  code,
  className,
}: {
  code: number;
  className?: string;
}) {
  if (code === 0) return <Sun className={className} aria-hidden="true" />;
  if (code >= 1 && code <= 3)
    return <CloudSun className={className} aria-hidden="true" />;
  if (code >= 51 && code <= 82)
    return <CloudRain className={className} aria-hidden="true" />;
  if (code >= 95)
    return <CloudLightning className={className} aria-hidden="true" />;
  return <Cloud className={className} aria-hidden="true" />;
}

export function NewsTemplate({
  article,
  durationSeconds = 12,
  compact = false,
}: {
  article: NewsArticle;
  durationSeconds?: number;
  compact?: boolean;
}) {
  const [imgSrc, setImgSrc] = useState(article.imageUrl || NEWS_FALLBACK_IMG);

  useEffect(() => {
    setImgSrc(article.imageUrl || NEWS_FALLBACK_IMG);
  }, [article]);

  return (
    <div className="relative w-full aspect-video overflow-hidden bg-slate-950 text-white select-none animate-tv-enter">
      <img
        src={imgSrc}
        onError={() => setImgSrc(NEWS_FALLBACK_IMG)}
        referrerPolicy="no-referrer"
        alt={article.title}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-slate-950/30" />

      <div
        className={`relative z-10 h-full flex flex-col justify-between ${
          compact ? 'p-5' : 'p-8 sm:p-12'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-wide text-purple-200">
            <Newspaper className="h-5 w-5 text-purple-400" aria-hidden="true" />
            <span>{article.source}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-xs text-slate-300 tabular-nums">
              {article.publishedAt}
            </span>
          </div>
          <span className="text-xs font-medium text-slate-300 tracking-wide">
            Notícias em Tempo Real
          </span>
        </div>

        <div className="flex items-end justify-between gap-6 sm:gap-10">
          <div className="max-w-3xl flex flex-col gap-3">
            <h2
              className={`font-bold leading-[1.12] tracking-tight text-white [text-wrap:balance] ${
                compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-4xl lg:text-[42px]'
              }`}
            >
              {article.title}
            </h2>
            <p
              className={`text-slate-200 leading-relaxed max-w-2xl ${
                compact ? 'text-xs sm:text-sm line-clamp-2' : 'text-base sm:text-xl line-clamp-3'
              }`}
            >
              {article.summary}
            </p>
          </div>

          <div
            className={`bg-white text-slate-900 rounded-xl shadow-xl shrink-0 flex flex-col items-center text-center ${
              compact ? 'p-2.5 w-24' : 'p-3.5 sm:p-4 w-32 sm:w-40'
            }`}
          >
            <QRCodeSVG
              value={article.link}
              size={compact ? 64 : 104}
              level="M"
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
            <span
              className={`font-semibold text-slate-800 leading-tight mt-2 ${
                compact ? 'text-[10px]' : 'text-xs'
              }`}
            >
              Leia no celular
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Time Bar */}
      <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/15">
        <div
          key={article.id}
          className="h-full bg-purple-500 origin-left"
          style={{
            animation: `tvProgress ${durationSeconds}s linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

export function SportsTemplate({
  matches = DEFAULT_MATCHES,
  standings = DEFAULT_STANDINGS,
  durationSeconds = 12,
  compact = false,
  initialRound = 36,
  initialMatchId = 'r36-m2',
  autoCycle = false,
  onSimulatedMatchesChange,
}: {
  matches?: SportsMatch[];
  standings?: StandingRow[];
  durationSeconds?: number;
  compact?: boolean;
  initialRound?: number;
  initialMatchId?: string;
  autoCycle?: boolean;
  onSimulatedMatchesChange?: (editedCount: number) => void;
}) {
  const rounds = useMemo(() => {
    const unique = Array.from(
      new Set(matches.map((m) => m.roundNumber ?? 36))
    ).sort((a, b) => a - b);
    return unique.length > 0 ? unique : [36];
  }, [matches]);

  const [activeRound, setActiveRound] = useState<number>(
    rounds.includes(initialRound) ? initialRound : rounds[0]
  );
  const [viewMode, setViewMode] = useState<'simulador' | 'classificacao'>(
    'simulador'
  );
  const [simulatedScores, setSimulatedScores] = useState<
    Record<string, { home: number; away: number }>
  >({});

  useEffect(() => {
    if (rounds.includes(initialRound)) {
      setActiveRound(initialRound);
    }
  }, [initialRound, rounds]);

  const roundMatches = useMemo(
    () => matches.filter((m) => (m.roundNumber ?? 36) === activeRound),
    [matches, activeRound]
  );

  const [selectedMatchId, setSelectedMatchId] = useState<string>(initialMatchId);

  useEffect(() => {
    setSelectedMatchId(initialMatchId);
  }, [initialMatchId]);

  useEffect(() => {
    if (
      roundMatches.length > 0 &&
      !roundMatches.some((m) => m.id === selectedMatchId)
    ) {
      setSelectedMatchId(roundMatches[0].id);
    }
  }, [roundMatches, selectedMatchId]);

  // Auto-rotate featured match on TV preview when enabled
  useEffect(() => {
    if (!autoCycle || compact || roundMatches.length <= 1) return;
    const timer = window.setInterval(() => {
      setSelectedMatchId((prev) => {
        const idx = roundMatches.findIndex((m) => m.id === prev);
        const nextIdx = (idx + 1) % roundMatches.length;
        return roundMatches[nextIdx].id;
      });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [autoCycle, compact, roundMatches]);

  const editedCount = Object.keys(simulatedScores).length;
  useEffect(() => {
    onSimulatedMatchesChange?.(editedCount);
  }, [editedCount, onSimulatedMatchesChange]);

  const getScore = (m: SportsMatch) => {
    const override = simulatedScores[m.id];
    if (override) return override;
    return {
      home: m.homeScore ?? 0,
      away: m.awayScore ?? 0,
    };
  };

  const adjustGoal = (
    match: SportsMatch,
    side: 'home' | 'away',
    delta: number
  ) => {
    const current = getScore(match);
    const nextHome =
      side === 'home' ? Math.max(0, Math.min(9, current.home + delta)) : current.home;
    const nextAway =
      side === 'away' ? Math.max(0, Math.min(9, current.away + delta)) : current.away;
    setSimulatedScores((prev) => ({
      ...prev,
      [match.id]: { home: nextHome, away: nextAway },
    }));
  };

  const resetSimulation = () => {
    setSimulatedScores({});
  };

  // Compute live standings applying simulated Rodada 36/37 results
  const computedStandings = useMemo(() => {
    const map = new Map<string, StandingRow>();
    standings.forEach((row) => {
      map.set(row.team, { ...row });
    });

    Object.entries(simulatedScores).forEach(([matchId, score]) => {
      const m = matches.find((item) => item.id === matchId);
      if (!m) return;
      const baseHome = m.homeScore ?? 0;
      const baseAway = m.awayScore ?? 0;

      const calcPts = (gf: number, ga: number) =>
        gf > ga ? 3 : gf === ga ? 1 : 0;
      const calcWin = (gf: number, ga: number) => (gf > ga ? 1 : 0);

      const homeRow = map.get(m.homeTeam);
      if (homeRow) {
        homeRow.points += calcPts(score.home, score.away) - calcPts(baseHome, baseAway);
        homeRow.wins += calcWin(score.home, score.away) - calcWin(baseHome, baseAway);
        homeRow.gd += (score.home - score.away) - (baseHome - baseAway);
      }

      const awayRow = map.get(m.awayTeam);
      if (awayRow) {
        awayRow.points += calcPts(score.away, score.home) - calcPts(baseAway, baseHome);
        awayRow.wins += calcWin(score.away, score.home) - calcWin(baseAway, baseHome);
        awayRow.gd += (score.away - score.home) - (baseAway - baseHome);
      }
    });

    const sorted = Array.from(map.values()).sort(
      (a, b) => b.points - a.points || b.wins - a.wins || b.gd - a.gd
    );

    return sorted.map((row, index) => ({
      ...row,
      pos: index + 1,
      zone:
        index < 4
          ? ('libertadores' as const)
          : index < 6
          ? ('pre' as const)
          : ('sulamericana' as const),
    }));
  }, [standings, simulatedScores, matches]);

  const activeMatchIndex = Math.max(
    0,
    roundMatches.findIndex((m) => m.id === selectedMatchId)
  );
  const featuredMatch = roundMatches[activeMatchIndex] ?? roundMatches[0];
  const featuredScore = featuredMatch
    ? getScore(featuredMatch)
    : { home: 0, away: 0 };

  const visibleStripMatches = useMemo(() => {
    if (roundMatches.length <= 3) return roundMatches;
    const start = Math.max(
      0,
      Math.min(activeMatchIndex - 1, roundMatches.length - 3)
    );
    return roundMatches.slice(start, start + 3);
  }, [roundMatches, activeMatchIndex]);

  const currentRoundIdx = rounds.indexOf(activeRound);
  const canPrevRound = currentRoundIdx > 0;
  const canNextRound = currentRoundIdx < rounds.length - 1;

  const stepMatch = (dir: -1 | 1) => {
    if (roundMatches.length === 0) return;
    const nextIdx =
      (activeMatchIndex + dir + roundMatches.length) % roundMatches.length;
    setSelectedMatchId(roundMatches[nextIdx].id);
  };

  return (
    <div className="relative w-full aspect-video overflow-hidden bg-[#F4F6F8] text-slate-900 select-none animate-tv-enter flex flex-col">
      {/* GE-style Emerald Top Navigation Bar */}
      <header
        className={`bg-[#06AA48] text-white shrink-0 flex items-center justify-between gap-4 border-b border-[#058C3B] ${
          compact ? 'px-4 py-2' : 'px-6 sm:px-8 py-2.5 sm:py-3'
        }`}
      >
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <span
            className={`font-black tracking-tighter leading-none ${
              compact ? 'text-lg' : 'text-2xl sm:text-[26px]'
            }`}
          >
            ge
          </span>
          <span className="h-4 w-px bg-white/30" aria-hidden="true" />
          <div className="flex items-center gap-1.5">
            <Trophy
              className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-white/95`}
              aria-hidden="true"
            />
            <span
              className={`font-bold tracking-wide uppercase ${
                compact ? 'text-[11px]' : 'text-xs sm:text-sm'
              }`}
            >
              Brasileirão Série A
            </span>
          </div>
        </div>

        {/* Sub-nav Mode Tabs (Classificação / Simulador) */}
        <nav
          className={`flex items-center ${compact ? 'gap-3' : 'gap-5 sm:gap-7'}`}
          aria-label="Modo do painel esportivo"
        >
          <button
            type="button"
            onClick={() => setViewMode('classificacao')}
            className={`font-semibold transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
              compact ? 'text-[11px]' : 'text-xs sm:text-sm'
            } ${
              viewMode === 'classificacao'
                ? 'text-white border-white'
                : 'text-emerald-100/85 border-transparent hover:text-white'
            }`}
          >
            classificação
          </button>
          <button
            type="button"
            onClick={() => setViewMode('simulador')}
            className={`font-semibold transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
              compact ? 'text-[11px]' : 'text-xs sm:text-sm'
            } ${
              viewMode === 'simulador'
                ? 'text-white border-white'
                : 'text-emerald-100/85 border-transparent hover:text-white'
            }`}
          >
            simulador
          </button>
        </nav>

        <div
          className={`font-mono font-semibold text-emerald-50 tabular-nums whitespace-nowrap shrink-0 ${
            compact ? 'text-[10px]' : 'text-xs sm:text-sm'
          }`}
        >
          {activeRound}/38
        </div>
      </header>

      {/* Main 16:9 Light Dashboard Body */}
      <div
        className={`flex-1 min-h-0 grid grid-cols-12 items-stretch ${
          compact ? 'gap-2.5 p-2.5' : 'gap-4 sm:gap-5 p-4 sm:p-6'
        }`}
      >
        {/* Left Column: Round Strip + Featured Match / Simulador */}
        <div
          className={`${
            viewMode === 'classificacao' && !compact
              ? 'col-span-5'
              : 'col-span-7'
          } bg-white border border-slate-200 rounded-2xl flex flex-col justify-between min-h-0 ${
            compact ? 'p-2.5' : 'p-4 sm:p-5'
          }`}
        >
          {/* Round Selector Row (< Rodada 36 >) */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <span
              className={`font-extrabold tracking-tight text-[#06AA48] ${
                compact ? 'text-xs' : 'text-sm sm:text-base'
              }`}
            >
              {viewMode === 'simulador' ? 'Simulador 2026' : 'Jogos da Rodada'}
            </span>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                disabled={!canPrevRound}
                onClick={() =>
                  canPrevRound && setActiveRound(rounds[currentRoundIdx - 1])
                }
                aria-label="Rodada anterior"
                className="h-7 w-7 rounded-md inline-flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span
                className={`font-bold text-slate-900 tabular-nums whitespace-nowrap ${
                  compact ? 'text-xs' : 'text-sm sm:text-base'
                }`}
              >
                Rodada {activeRound}
              </span>
              <button
                type="button"
                disabled={!canNextRound}
                onClick={() =>
                  canNextRound && setActiveRound(rounds[currentRoundIdx + 1])
                }
                aria-label="Próxima rodada"
                className="h-7 w-7 rounded-md inline-flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
              Série A
            </span>
          </div>

          {/* Horizontal Strip of Mini Match Cards */}
          <div
            className={`grid grid-cols-3 shrink-0 ${
              compact ? 'gap-1.5 my-1.5' : 'gap-2.5 my-2.5'
            }`}
          >
            {visibleStripMatches.map((m) => {
              const sc = getScore(m);
              const isSelected = featuredMatch?.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMatchId(m.id)}
                  className={`rounded-xl border transition-all flex items-center justify-between gap-1.5 ${
                    compact ? 'px-1.5 py-1.5' : 'px-2.5 py-2 sm:px-3 sm:py-2.5'
                  } ${
                    isSelected
                      ? 'border-2 border-[#06AA48] bg-emerald-50/45 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <ClubCrest team={m.homeTeam} size={compact ? 'xs' : 'sm'} />
                  <span
                    className={`font-mono font-bold tabular-nums whitespace-nowrap ${
                      compact ? 'text-[11px]' : 'text-xs sm:text-sm'
                    } ${isSelected ? 'text-[#06AA48]' : 'text-slate-900'}`}
                  >
                    {sc.home} - {sc.away}
                  </span>
                  <ClubCrest team={m.awayTeam} size={compact ? 'xs' : 'sm'} />
                </button>
              );
            })}
          </div>

          {/* Featured Match Card (Date · Stadium · Time + Big Crests + Score Boxes + +/- Simulator) */}
          {featuredMatch && (
            <div className="flex-1 min-h-0 flex flex-col justify-center items-center border-t border-slate-100 pt-2">
              <p
                className={`text-slate-500 font-medium text-center truncate max-w-full ${
                  compact ? 'text-[10px] mb-1.5' : 'text-xs sm:text-sm mb-3'
                }`}
              >
                {featuredMatch.dateLabel ||
                  `${featuredMatch.round} · ${featuredMatch.stadium} · ${featuredMatch.kickoff}`}
              </p>

              <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
                {!compact && (
                  <button
                    type="button"
                    onClick={() => stepMatch(-1)}
                    aria-label="Jogo anterior da rodada"
                    className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 shrink-0"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}

                {/* Home Team */}
                <div className="flex-1 flex flex-col items-center text-center min-w-0">
                  <ClubCrest
                    team={featuredMatch.homeTeam}
                    size={compact ? 'md' : 'lg'}
                  />
                  <span
                    className={`font-bold text-slate-800 truncate max-w-full mt-1.5 ${
                      compact ? 'text-[11px]' : 'text-xs sm:text-base'
                    }`}
                  >
                    {featuredMatch.homeTeam}
                  </span>
                </div>

                {/* Score Boxes with + / - Simulador Controls */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {/* Home Score Column */}
                  <div className="flex flex-col items-center gap-1.5">
                    {!compact && viewMode === 'simulador' && (
                      <button
                        type="button"
                        onClick={() => adjustGoal(featuredMatch, 'home', 1)}
                        aria-label={`Somar gol para ${featuredMatch.homeTeam}`}
                        className="h-7 w-7 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-[#06AA48] inline-flex items-center justify-center transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                    <div
                      className={`rounded-xl border border-slate-200 bg-white flex items-center justify-center font-mono font-bold text-slate-800 tabular-nums shadow-xs ${
                        compact
                          ? 'h-9 w-9 text-lg'
                          : 'h-12 w-12 sm:h-14 sm:w-14 text-2xl sm:text-3xl'
                      }`}
                    >
                      {featuredScore.home}
                    </div>
                    {!compact && viewMode === 'simulador' && (
                      <button
                        type="button"
                        onClick={() => adjustGoal(featuredMatch, 'home', -1)}
                        aria-label={`Remover gol de ${featuredMatch.homeTeam}`}
                        className="h-7 w-7 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-600 inline-flex items-center justify-center transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  <span className="text-slate-400 font-bold text-lg sm:text-2xl">
                    –
                  </span>

                  {/* Away Score Column */}
                  <div className="flex flex-col items-center gap-1.5">
                    {!compact && viewMode === 'simulador' && (
                      <button
                        type="button"
                        onClick={() => adjustGoal(featuredMatch, 'away', 1)}
                        aria-label={`Somar gol para ${featuredMatch.awayTeam}`}
                        className="h-7 w-7 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-[#06AA48] inline-flex items-center justify-center transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                    <div
                      className={`rounded-xl border border-slate-200 bg-white flex items-center justify-center font-mono font-bold text-slate-800 tabular-nums shadow-xs ${
                        compact
                          ? 'h-9 w-9 text-lg'
                          : 'h-12 w-12 sm:h-14 sm:w-14 text-2xl sm:text-3xl'
                      }`}
                    >
                      {featuredScore.away}
                    </div>
                    {!compact && viewMode === 'simulador' && (
                      <button
                        type="button"
                        onClick={() => adjustGoal(featuredMatch, 'away', -1)}
                        aria-label={`Remover gol de ${featuredMatch.awayTeam}`}
                        className="h-7 w-7 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-600 inline-flex items-center justify-center transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Away Team */}
                <div className="flex-1 flex flex-col items-center text-center min-w-0">
                  <ClubCrest
                    team={featuredMatch.awayTeam}
                    size={compact ? 'md' : 'lg'}
                  />
                  <span
                    className={`font-bold text-slate-800 truncate max-w-full mt-1.5 ${
                      compact ? 'text-[11px]' : 'text-xs sm:text-base'
                    }`}
                  >
                    {featuredMatch.awayTeam}
                  </span>
                </div>

                {!compact && (
                  <button
                    type="button"
                    onClick={() => stepMatch(1)}
                    aria-label="Próximo jogo da rodada"
                    className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 shrink-0"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bottom Summary Bar (1-0 | 0-0 | 0-1 | 36/38) */}
          <div
            className={`border-t border-slate-100 flex items-center justify-between gap-2 shrink-0 ${
              compact ? 'pt-1.5 text-[10px]' : 'pt-2.5 text-xs'
            }`}
          >
            <button
              type="button"
              onClick={resetSimulation}
              disabled={editedCount === 0}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{editedCount > 0 ? 'Limpar simulação' : 'Oficial'}</span>
            </button>

            <div className="flex items-center gap-3 sm:gap-5 font-mono text-slate-400 tabular-nums">
              {roundMatches.slice(0, 3).map((m) => {
                const s = getScore(m);
                return (
                  <span key={m.id}>
                    {s.home}-{s.away}
                  </span>
                );
              })}
            </div>

            <span className="font-mono font-semibold text-slate-700 tabular-nums">
              {activeRound}/38
            </span>
          </div>
        </div>

        {/* Right Column: Classificação Brasileirão Série A */}
        <div
          className={`${
            viewMode === 'classificacao' && !compact
              ? 'col-span-7'
              : 'col-span-5'
          } bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden min-h-0`}
        >
          <div
            className={`border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 ${
              compact ? 'px-3 py-2' : 'px-4 py-3'
            }`}
          >
            <span
              className={`font-bold text-slate-900 ${
                compact ? 'text-[11px]' : 'text-xs sm:text-sm'
              }`}
            >
              Classificação · Série A
            </span>
            <span className="text-[11px] font-medium text-[#06AA48] whitespace-nowrap">
              {editedCount > 0 ? 'Simulação ao vivo' : 'Tabela Oficial'}
            </span>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            {/* Table Header */}
            <div
              className={`grid grid-cols-12 items-center border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider shrink-0 ${
                compact
                  ? 'px-2.5 py-1 text-[9px]'
                  : 'px-4 py-1.5 text-[10px] sm:text-[11px]'
              }`}
            >
              <span className="col-span-1">#</span>
              <span className="col-span-6">Clube</span>
              <span className="col-span-2 text-right">P</span>
              <span className="col-span-1 text-right">J</span>
              <span className="col-span-1 text-right">V</span>
              <span className="col-span-1 text-right">SG</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-100 flex-1 overflow-hidden">
              {computedStandings.slice(0, compact ? 6 : 8).map((row) => {
                const posColor =
                  row.zone === 'libertadores'
                    ? 'text-[#06AA48]'
                    : row.zone === 'pre'
                    ? 'text-sky-600'
                    : 'text-amber-600';

                return (
                  <div
                    key={row.team}
                    className={`grid grid-cols-12 items-center ${
                      compact
                        ? 'px-2.5 py-1 text-[10px]'
                        : 'px-4 py-1.5 sm:py-2 text-xs sm:text-sm'
                    }`}
                  >
                    <span
                      className={`col-span-1 font-mono font-bold tabular-nums ${posColor}`}
                    >
                      {row.pos}
                    </span>
                    <div className="col-span-6 flex items-center gap-2 min-w-0">
                      <ClubCrest team={row.team} size="xs" />
                      <span className="font-semibold text-slate-800 truncate">
                        {row.team}
                      </span>
                    </div>
                    <span className="col-span-2 text-right font-mono font-bold text-slate-950 tabular-nums">
                      {row.points}
                    </span>
                    <span className="col-span-1 text-right font-mono text-slate-500 tabular-nums">
                      {row.played}
                    </span>
                    <span className="col-span-1 text-right font-mono text-slate-500 tabular-nums">
                      {row.wins}
                    </span>
                    <span className="col-span-1 text-right font-mono text-slate-600 tabular-nums">
                      {row.gd > 0 ? `+${row.gd}` : row.gd}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {!compact && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
              <span>1º–4º Libertadores · 5º–6º Pré-Lib · 7º–8º Sul-Americana</span>
              <span className="font-mono tabular-nums">ge · Série A</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom GE Emerald Progress Bar */}
      <div className="absolute bottom-0 inset-x-0 h-1.5 bg-slate-200">
        <div
          className="h-full bg-[#06AA48] origin-left"
          style={{
            animation: `tvProgress ${durationSeconds}s linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

export function WeatherTemplate({
  weather,
  durationSeconds = 10,
  compact = false,
}: {
  weather: WeatherForecast;
  durationSeconds?: number;
  compact?: boolean;
}) {
  return (
    <div className="relative w-full aspect-video overflow-hidden bg-slate-950 text-white select-none animate-tv-enter">
      <img
        src={WEATHER_IMG}
        referrerPolicy="no-referrer"
        alt={`Previsão do tempo para ${weather.city}`}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/55 to-slate-950/35" />

      <div
        className={`relative z-10 h-full flex flex-col justify-between ${
          compact ? 'p-5' : 'p-8 sm:p-12'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-sky-200 tracking-wide">
              Previsão do Tempo · Open-Meteo
            </p>
            <h2
              className={`font-bold text-white tracking-tight ${
                compact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'
              }`}
            >
              {weather.city}
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-200 tabular-nums">
            Atualizado {weather.updatedAt}
          </span>
        </div>

        <div className="flex items-center justify-between gap-6 my-auto">
          <div className="flex items-center gap-5 sm:gap-7">
            <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
              <WeatherIcon
                code={weather.weatherCode}
                className={`${
                  compact ? 'h-10 w-10' : 'h-16 w-16 sm:h-20 sm:w-20'
                } text-amber-300 animate-pulse`}
              />
            </div>
            <div>
              <div
                className={`font-bold tracking-tighter text-white tabular-nums leading-none ${
                  compact ? 'text-4xl sm:text-5xl' : 'text-6xl sm:text-8xl'
                }`}
              >
                {weather.temperature}°C
              </div>
              <p
                className={`text-sky-100 font-medium mt-1.5 ${
                  compact ? 'text-xs' : 'text-lg sm:text-2xl'
                }`}
              >
                {describeWeatherCode(weather.weatherCode)}
              </p>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 gap-2.5 text-right ${
              compact ? 'text-xs' : 'text-sm sm:text-base'
            }`}
          >
            <div className="inline-flex items-center justify-end gap-2 text-slate-200 tabular-nums">
              <span className="text-slate-300">Mín / Máx:</span>
              <span className="font-semibold text-white">
                {weather.minTemp}° / {weather.maxTemp}°
              </span>
            </div>
            <div className="inline-flex items-center justify-end gap-2 text-slate-200 tabular-nums">
              <Droplets className="h-4 w-4 text-sky-300" aria-hidden="true" />
              <span>Umidade {weather.humidity}%</span>
            </div>
            <div className="inline-flex items-center justify-end gap-2 text-slate-200 tabular-nums">
              <Wind className="h-4 w-4 text-sky-300" aria-hidden="true" />
              <span>Vento {weather.windSpeed} km/h</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {weather.daily.map((day) => (
            <div
              key={day.date}
              className={`bg-white/12 backdrop-blur-sm border border-white/15 rounded-xl flex items-center justify-between ${
                compact ? 'px-2.5 py-2' : 'px-4 py-3'
              }`}
            >
              <div>
                <p className="text-xs font-medium text-slate-200 capitalize">
                  {day.date}
                </p>
                <p className="text-sm sm:text-base font-semibold text-white tabular-nums mt-0.5">
                  {day.min}° · {day.max}°
                </p>
              </div>
              <WeatherIcon
                code={day.code}
                className="h-5 w-5 sm:h-6 sm:w-6 text-amber-200 shrink-0"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/15">
        <div
          className="h-full bg-sky-400 origin-left"
          style={{
            animation: `tvProgress ${durationSeconds}s linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

export function EntertainmentTemplate({
  item,
  durationSeconds = 10,
  compact = false,
}: {
  item: DynamicContentItem;
  durationSeconds?: number;
  compact?: boolean;
}) {
  const categoryConfig: Record<
    string,
    { label: string; accentBar: string; icon: React.ReactNode }
  > = {
    curiosidades: {
      label: 'Curiosidades',
      accentBar: 'bg-purple-500',
      icon: <Sparkles className="h-5 w-5 text-purple-300" aria-hidden="true" />,
    },
    dicas: {
      label: 'Dicas de Saúde & Bem-Estar',
      accentBar: 'bg-emerald-400',
      icon: <Lightbulb className="h-5 w-5 text-emerald-300" aria-hidden="true" />,
    },
    receitas: {
      label: 'Cozinha & Receitas',
      accentBar: 'bg-amber-400',
      icon: <Utensils className="h-5 w-5 text-amber-300" aria-hidden="true" />,
    },
    horoscopo: {
      label: 'Horóscopo do Dia',
      accentBar: 'bg-indigo-400',
      icon: <Compass className="h-5 w-5 text-indigo-300" aria-hidden="true" />,
    },
  };

  const cfg = categoryConfig[item.category] || categoryConfig.curiosidades;

  return (
    <div className="relative w-full aspect-video overflow-hidden bg-slate-950 text-white select-none animate-tv-enter">
      <img
        src={item.imageUrl}
        referrerPolicy="no-referrer"
        alt={item.title}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-slate-950/30" />

      <div
        className={`relative z-10 h-full flex flex-col justify-between ${
          compact ? 'p-5' : 'p-8 sm:p-12'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2.5 text-sm font-semibold text-white">
            {cfg.icon}
            <span>{cfg.label}</span>
            <span className="text-slate-400" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-300 font-normal">{item.subtitle}</span>
          </div>

          {item.category === 'horoscopo' && item.meta.luckyNumber && (
            <div className="text-xs sm:text-sm font-mono text-indigo-200 tabular-nums">
              Elemento {item.meta.element} · Sorte {item.meta.luckyNumber}
            </div>
          )}

          {item.category === 'receitas' && item.meta.prepTime && (
            <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono text-amber-200 tabular-nums">
              <Flame className="h-4 w-4" aria-hidden="true" />
              <span>
                {item.meta.prepTime} · {item.meta.servings}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 max-w-4xl">
          <h2
            className={`font-bold leading-[1.12] tracking-tight text-white [text-wrap:balance] ${
              compact ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-5xl'
            }`}
          >
            {item.title}
          </h2>
          <p
            className={`text-slate-200 leading-relaxed max-w-3xl ${
              compact ? 'text-xs sm:text-sm' : 'text-lg sm:text-2xl'
            }`}
          >
            {item.body}
          </p>

          {item.category === 'receitas' &&
            item.meta.ingredients &&
            item.meta.ingredients.length > 0 && (
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-2 text-xs sm:text-base text-amber-100/90">
                {item.meta.ingredients.map((ing) => (
                  <span key={ing} className="inline-flex items-center gap-1.5">
                    <span className="text-amber-300" aria-hidden="true">
                      •
                    </span>
                    <span>{ing}</span>
                  </span>
                ))}
              </div>
            )}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/15">
        <div
          key={item.id}
          className={`h-full ${cfg.accentBar} origin-left`}
          style={{
            animation: `tvProgress ${durationSeconds}s linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

export function QuizTemplate({
  item,
  compact = false,
  autoReplay = true,
  onRestart,
}: {
  item: DynamicContentItem;
  compact?: boolean;
  autoReplay?: boolean;
  onRestart?: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    setSecondsLeft(10);
    setSelectedOption(null);
  }, [item.id]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 0) {
          if (autoReplay) {
            return 10;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [autoReplay, item.id]);

  // Destaca a resposta correta em verde nos últimos 4 segundos (4, 3, 2, 1, 0)
  const revealCorrect = secondsLeft <= 4;
  const correctIdx = item.meta.correctIndex ?? 0;
  const options = item.meta.options ?? [];
  const progressPercent = (secondsLeft / 10) * 100;

  return (
    <div className="relative w-full aspect-video overflow-hidden bg-slate-950 text-white select-none animate-tv-enter">
      <img
        src={item.imageUrl}
        referrerPolicy="no-referrer"
        alt={item.title}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/75" />

      <div
        className={`relative z-10 h-full flex flex-col justify-between ${
          compact ? 'p-5' : 'p-8 sm:p-11'
        }`}
      >
        {/* Top Row with 10s Countdown */}
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2.5 text-sm font-semibold text-purple-200">
            <Timer className="h-5 w-5 text-purple-400" aria-hidden="true" />
            <span>Quiz Interativo</span>
            <span className="text-slate-400" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-300 font-normal">{item.subtitle}</span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`px-3.5 py-1.5 rounded-lg font-mono font-bold tabular-nums border ${
                revealCorrect
                  ? 'bg-emerald-600/90 border-emerald-400 text-white'
                  : 'bg-purple-900/80 border-purple-400/50 text-white'
              } ${compact ? 'text-sm' : 'text-lg sm:text-xl'}`}
            >
              {revealCorrect ? `Resposta: ${secondsLeft}s` : `${secondsLeft}s`}
            </div>
            {!compact && (
              <button
                type="button"
                onClick={() => {
                  setSecondsLeft(10);
                  setSelectedOption(null);
                  onRestart?.();
                }}
                title="Reiniciar contagem de 10s"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Question + 4 Options */}
        <div className="flex flex-col gap-4 sm:gap-6 my-auto">
          <h2
            className={`font-bold leading-[1.15] tracking-tight text-white [text-wrap:balance] ${
              compact ? 'text-lg sm:text-2xl' : 'text-2xl sm:text-4xl'
            }`}
          >
            {item.title}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {options.map((opt, idx) => {
              const isCorrect = idx === correctIdx;
              const isSelected = selectedOption === idx;
              const showGreen = revealCorrect && isCorrect;
              const showMutedWrong = revealCorrect && !isCorrect;

              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSelectedOption(idx)}
                  className={`text-left rounded-xl border transition-all duration-300 flex items-center justify-between gap-3 ${
                    compact ? 'px-3.5 py-2.5' : 'px-5 py-4'
                  } ${
                    showGreen
                      ? 'bg-emerald-600 border-emerald-300 text-white shadow-lg'
                      : showMutedWrong
                      ? 'bg-white/5 border-white/10 text-slate-400'
                      : isSelected
                      ? 'bg-purple-700/80 border-purple-400 text-white'
                      : 'bg-white/10 border-white/15 text-white hover:bg-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`font-mono font-bold rounded-md flex items-center justify-center shrink-0 ${
                        compact ? 'h-6 w-6 text-xs' : 'h-8 w-8 text-sm'
                      } ${
                        showGreen
                          ? 'bg-emerald-800 text-white'
                          : 'bg-white/15 text-white'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span
                      className={`font-medium truncate ${
                        compact ? 'text-xs sm:text-sm' : 'text-base sm:text-xl'
                      }`}
                    >
                      {opt.text}
                    </span>
                  </div>
                  {showGreen && (
                    <CheckCircle2
                      className="h-5 w-5 text-white shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Countdown Progress Bar */}
        <div className="flex items-center justify-between gap-4 text-xs text-slate-300">
          <span>
            {revealCorrect
              ? 'Alternativa correta destacada em verde.'
              : 'Resposta será revelada nos últimos 4 segundos.'}
          </span>
          <span className="font-mono tabular-nums">{secondsLeft}/10s</span>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-2 bg-white/15">
        <div
          className={`h-full transition-all duration-500 ${
            revealCorrect ? 'bg-emerald-400' : 'bg-purple-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

export function renderDynamicTemplateByKey(
  key: DynamicTemplateKey,
  deps: {
    article: NewsArticle;
    weather: WeatherForecast;
    dynamicContents: DynamicContentItem[];
    durationSeconds?: number;
    compact?: boolean;
  }
) {
  const { article, weather, dynamicContents, durationSeconds = 12, compact } = deps;
  if (key === 'noticias') {
    return (
      <NewsTemplate
        article={article}
        durationSeconds={durationSeconds}
        compact={compact}
      />
    );
  }
  if (key === 'esportes') {
    return (
      <SportsTemplate durationSeconds={durationSeconds} compact={compact} />
    );
  }
  if (key === 'clima') {
    return (
      <WeatherTemplate
        weather={weather}
        durationSeconds={durationSeconds}
        compact={compact}
      />
    );
  }
  if (key === 'quiz') {
    const quizList = dynamicContents.filter((c) => c.category === 'quiz');
    const chosen = quizList[0] ?? dynamicContents[0];
    if (!chosen) return null;
    return <QuizTemplate item={chosen} compact={compact} />;
  }

  const list = dynamicContents.filter((c) => c.category === key);
  const chosen = list[0] ?? dynamicContents[0];
  if (!chosen) return null;
  return (
    <EntertainmentTemplate
      item={chosen}
      durationSeconds={durationSeconds}
      compact={compact}
    />
  );
}
